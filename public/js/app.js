/**
 * Fresh Supermart - Main Application Controller & Dual-Portal Orchestrator
 * Connects Customer Storefront, Admin Management Console, Smart Insights,
 * Advanced Alerts, Expiry Tracking, Purchase Orders, UPI QR Settings & Role Auth
 */
const App = (function () {
  let products = [];
  let categories = [];
  let suppliers = [];
  let sales = [];
  let customerOrders = [];
  let purchaseOrders = [];
  let settings = {};
  let currentUser = { username: 'admin', role: 'admin', name: 'Store Owner' };
  let currentView = 'admin'; // 'customer' or 'admin'

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function init() {
    setupEventListeners();
    initDarkMode();
    await refreshAllData();

    // Initialize sub-modules
    InventoryReports.init();
    POSModule.init(products);
    StockCalculator.init(products);
    CustomerPortal.init();
    ProductMovement.renderMovementAnalysis('30d');

    // Default portal view
    switchToAdminView();
  }

  async function refreshAllData() {
    try {
      products = await DB.getProducts();
      categories = await DB.getCategories();
      suppliers = await DB.getSuppliers();
      sales = await DB.getSales();
      customerOrders = await DB.getCustomerOrders();
      purchaseOrders = await DB.getPurchaseOrders();
      settings = await DB.getSettings();

      updateDashboardStats();
      updateSmartInsights();
      updateCategorySummaryCards();
      updateSalesTargetWidget();
      renderProductTable();
      renderCategoryTable();
      renderSupplierTable();
      renderCustomerOrdersTable();
      renderPurchaseOrdersTable();
      renderSalesHistoryTable();
      checkNotifications();
      renderPaymentSettings();

      AppCharts.renderCharts(products, categories, sales, '7d');
      POSModule.updateProducts(products);
      StockCalculator.updateProducts(products);
      CustomerPortal.refreshData();
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  }

  // Dual-Portal View Switchers
  function switchToCustomerView() {
    currentView = 'customer';
    document.getElementById('portal-admin-wrapper').style.display = 'none';
    document.getElementById('portal-customer-wrapper').style.display = 'block';

    const switchBtn = document.getElementById('btn-portal-switch');
    if (switchBtn) {
      switchBtn.innerHTML = '<i class="fa-solid fa-user-shield"></i> Go to Admin Console';
      switchBtn.className = 'btn btn-secondary btn-sm';
    }

    CustomerPortal.refreshData();
  }

  function switchToAdminView() {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    currentView = 'admin';
    document.getElementById('portal-customer-wrapper').style.display = 'none';
    document.getElementById('portal-admin-wrapper').style.display = 'flex';

    const switchBtn = document.getElementById('btn-portal-switch');
    if (switchBtn) {
      switchBtn.innerHTML = '<i class="fa-solid fa-basket-shopping"></i> Customer Online Store 🛒';
      switchBtn.className = 'btn btn-primary btn-sm';
    }

    applyRolePermissions();
    refreshAllData();
  }

  function togglePortal() {
    if (currentView === 'admin') {
      switchToCustomerView();
    } else {
      switchToAdminView();
    }
  }

  // Dashboard KPI Metrics (Row 1 & Row 2)
  function updateDashboardStats() {
    const totalProds = products.length;
    const totalCats = categories.length;
    const totalStockQty = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;

    const totalValuation = products.reduce((sum, p) => sum + (p.quantity * p.selling_price), 0);
    const totalCost = products.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0);
    const expectedProfit = totalValuation - totalCost;

    // Today's Sales & Profit calculation
    const today = new Date();
    const todaySales = sales.filter(s => {
      const sd = new Date(s.date);
      return sd.getDate() === today.getDate() && sd.getMonth() === today.getMonth() && sd.getFullYear() === today.getFullYear();
    });

    const todaySalesVal = todaySales.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const todayProfitVal = todaySales.reduce((sum, s) => sum + (s.profit || (s.total_price * 0.18)), 0);

    // Expiring soon count (<= 7 days)
    const expiringSoonCount = products.filter(p => {
      if (!p.expiry_date) return false;
      const diffDays = Math.ceil((new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    // Bind DOM
    setElemText('stat-total-products', totalProds);
    setElemText('stat-total-categories', totalCats);
    setElemText('stat-total-stock', Math.round(totalStockQty));
    setElemText('stat-low-stock', lowStockCount);
    setElemText('stat-out-stock', outOfStockCount);
    setElemText('stat-total-valuation', formatINR(totalValuation));
    setElemText('stat-expected-profit', formatINR(expectedProfit));
    setElemText('stat-today-sales', formatINR(todaySalesVal));
    setElemText('stat-today-profit', formatINR(todayProfitVal));
    setElemText('stat-expiring-soon', expiringSoonCount);
  }

  // Smart Inventory Insights (Requirement 1 & 17)
  function updateSmartInsights() {
    const container = document.getElementById('smart-insights-grid');
    if (!container) return;

    const today = new Date();

    // 1. Low stock candidate
    const lowProd = products.find(p => p.quantity > 0 && p.quantity <= p.min_stock_level);
    // 2. Fast moving candidate
    const salesMap = {};
    sales.forEach(s => { salesMap[s.product_id] = (salesMap[s.product_id] || 0) + s.quantity_sold; });
    const fastProdId = Object.keys(salesMap).sort((a, b) => salesMap[b] - salesMap[a])[0];
    const fastProd = products.find(p => p.id == fastProdId);

    // 3. Expiring soon candidate
    const expiringProd = products.find(p => {
      if (!p.expiry_date) return false;
      const diff = Math.ceil((new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    });

    // 4. Reorder Calculation formula: (Avg daily sales * lead time) + safety stock
    const reorderProd = lowProd || products[0];
    const avgDailySales = 8;
    const leadTime = reorderProd.lead_time_days || 3;
    const safetyStock = reorderProd.safety_stock || 10;
    const recommendedReorderQty = (avgDailySales * leadTime) + safetyStock;

    // 5. Category sales leader
    const catSalesMap = {};
    sales.forEach(s => { catSalesMap[s.category_name] = (catSalesMap[s.category_name] || 0) + s.total_price; });
    const topCatName = Object.keys(catSalesMap).sort((a, b) => catSalesMap[b] - catSalesMap[a])[0] || 'Snacks & Beverages';

    container.innerHTML = `
      <div class="insight-card warning">
        <div class="insight-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="insight-content">
          <div class="insight-title">Low Stock Alert</div>
          <div class="insight-desc">
            ${lowProd ? `<strong>${lowProd.product_name}</strong> is running low. Only <strong>${lowProd.quantity} ${lowProd.unit}</strong> remaining (Min: ${lowProd.min_stock_level}).` : 'All inventory products have sufficient stock levels.'}
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:0.4rem; padding:0.2rem 0.6rem;" onclick="App.openPurchaseOrderModal(${lowProd ? lowProd.id : 101})">Reorder Stock</button>
        </div>
      </div>

      <div class="insight-card success">
        <div class="insight-icon"><i class="fa-solid fa-fire"></i></div>
        <div class="insight-content">
          <div class="insight-title">Fast Moving Product</div>
          <div class="insight-desc">
            ${fastProd ? `<strong>${fastProd.product_name}</strong> is a high-velocity product with <strong>${salesMap[fastProd.id]} units sold</strong> this period.` : 'Monitoring sales velocity across categories.'}
          </div>
        </div>
      </div>

      <div class="insight-card danger">
        <div class="insight-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <div class="insight-content">
          <div class="insight-title">Expiry Monitoring</div>
          <div class="insight-desc">
            ${expiringProd ? `<strong>${expiringProd.product_name}</strong> (Batch: ${expiringProd.batch_no}) expires on <strong>${expiringProd.expiry_date}</strong> (< 7 days).` : 'No items expiring in the next 7 days.'}
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:0.4rem; padding:0.2rem 0.6rem;" onclick="App.openExpiryFilterModal()">View Expiring</button>
        </div>
      </div>

      <div class="insight-card info">
        <div class="insight-icon"><i class="fa-solid fa-brain"></i></div>
        <div class="insight-content">
          <div class="insight-title">Smart Reorder Recommendation</div>
          <div class="insight-desc">
            Formula: <code>(Daily Sales ${avgDailySales} &times; Lead Time ${leadTime}d) + Safety Stock ${safetyStock}</code><br>
            Recommended purchase: <strong>${recommendedReorderQty} units</strong> of <strong>${reorderProd.product_name}</strong>.
          </div>
        </div>
      </div>

      <div class="insight-card purple">
        <div class="insight-icon"><i class="fa-solid fa-chart-pie"></i></div>
        <div class="insight-content">
          <div class="insight-title">Top Revenue Category</div>
          <div class="insight-desc">
            Your highest-grossing category is <strong>${topCatName}</strong> with strong customer repeat orders.
          </div>
        </div>
      </div>
    `;
  }

  // Daily Sales Target Tracker (Requirement 16)
  function updateSalesTargetWidget() {
    const target = settings.daily_sales_target || 10000;
    const today = new Date();
    const todaySales = sales.filter(s => {
      const sd = new Date(s.date);
      return sd.getDate() === today.getDate() && sd.getMonth() === today.getMonth() && sd.getFullYear() === today.getFullYear();
    });
    const achieved = todaySales.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const percent = Math.min(100, Math.round((achieved / target) * 100));

    setElemText('target-daily-amount', formatINR(target));
    setElemText('target-achieved-amount', formatINR(achieved));
    setElemText('target-percentage-text', `${percent}%`);

    const fill = document.getElementById('target-progress-fill');
    if (fill) fill.style.width = `${percent}%`;

    const banner = document.getElementById('target-achieved-banner');
    if (banner) {
      banner.style.display = percent >= 100 ? 'block' : 'none';
    }
  }

  function updateCategorySummaryCards() {
    const grid = document.getElementById('category-summary-grid');
    if (!grid) return;

    grid.innerHTML = categories.map(cat => {
      const catProducts = products.filter(p => p.category_id == cat.id || (p.category_name || '').toLowerCase() === cat.category_name.toLowerCase());
      const totalStock = catProducts.reduce((sum, p) => sum + p.quantity, 0);
      const itemsCount = catProducts.length;
      const catValuation = catProducts.reduce((sum, p) => sum + (p.quantity * p.selling_price), 0);

      return `
        <div class="cat-card">
          <div class="cat-card-header">
            <span class="cat-card-name">${cat.category_name}</span>
            <span class="cat-card-val">${formatINR(catValuation)}</span>
          </div>
          <div class="cat-card-stats">
            <div>Stock: <strong>${Math.round(totalStock)} units</strong></div>
            <div>Products: <strong>${itemsCount} items</strong></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Inventory Table (Requirement 8)
  function renderProductTable() {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;

    const filterText = (document.getElementById('product-table-search')?.value || '').toLowerCase().trim();
    const catFilter = document.getElementById('product-category-filter')?.value || '';
    const statusFilter = document.getElementById('product-status-filter')?.value || '';
    const expiryFilter = document.getElementById('product-expiry-filter')?.value || '';
    const sortFilter = document.getElementById('product-sort-filter')?.value || 'name_asc';

    let items = [...products];

    if (filterText) {
      items = items.filter(p =>
        p.product_name.toLowerCase().includes(filterText) ||
        (p.brand && p.brand.toLowerCase().includes(filterText)) ||
        (p.supplier && p.supplier.toLowerCase().includes(filterText)) ||
        (p.barcode && p.barcode.includes(filterText)) ||
        (p.batch_no && p.batch_no.toLowerCase().includes(filterText))
      );
    }

    if (catFilter) items = items.filter(p => p.category_name === catFilter);

    if (statusFilter === 'in_stock') items = items.filter(p => p.quantity > p.min_stock_level);
    else if (statusFilter === 'low_stock') items = items.filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level);
    else if (statusFilter === 'out_stock') items = items.filter(p => p.quantity === 0);

    const today = new Date();
    if (expiryFilter === 'expired') {
      items = items.filter(p => p.expiry_date && new Date(p.expiry_date) < today);
    } else if (expiryFilter === 'soon') {
      items = items.filter(p => {
        if (!p.expiry_date) return false;
        const d = Math.ceil((new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24));
        return d >= 0 && d <= 7;
      });
    }

    // Sorting
    items.sort((a, b) => {
      if (sortFilter === 'name_asc') return a.product_name.localeCompare(b.product_name);
      if (sortFilter === 'price_low') return a.selling_price - b.selling_price;
      if (sortFilter === 'price_high') return b.selling_price - a.selling_price;
      if (sortFilter === 'stock_low') return a.quantity - b.quantity;
      if (sortFilter === 'stock_high') return b.quantity - a.quantity;
      return 0;
    });

    // Summary metrics above table
    const prodValuation = items.reduce((sum, p) => sum + (p.quantity * p.selling_price), 0);
    const prodCost = items.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0);
    setElemText('prod-summary-valuation', formatINR(prodValuation));
    setElemText('prod-summary-profit', formatINR(prodValuation - prodCost));
    setElemText('prod-summary-count', items.length);

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 3rem; color: var(--text-muted);"><i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i><br>No products match the selected criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(p => {
      // Stock badge
      let stockBadge = `<span class="badge badge-in-stock"><i class="fa-solid fa-circle-check"></i> Healthy (${p.quantity})</span>`;
      if (p.quantity === 0) {
        stockBadge = `<span class="badge badge-out-stock"><i class="fa-solid fa-triangle-exclamation"></i> 🔴 Critical Out of Stock</span>`;
      } else if (p.quantity <= p.min_stock_level) {
        stockBadge = `<span class="badge badge-low-stock"><i class="fa-solid fa-circle-exclamation"></i> 🟠 Low Stock (${p.quantity})</span>`;
      }

      // Expiry status
      let expiryBadge = `<span style="font-size:0.8rem; color:var(--text-secondary);">${p.expiry_date || 'N/A'}</span>`;
      if (p.expiry_date) {
        const diffDays = Math.ceil((new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expiryBadge = `<span class="badge badge-out-stock"><i class="fa-solid fa-circle-xmark"></i> Expired (${p.expiry_date})</span>`;
        } else if (diffDays <= 7) {
          expiryBadge = `<span class="badge badge-out-stock"><i class="fa-solid fa-triangle-exclamation"></i> Soon (${diffDays}d left)</span>`;
        } else if (diffDays <= 30) {
          expiryBadge = `<span class="badge badge-low-stock"><i class="fa-solid fa-clock"></i> This Month (${diffDays}d)</span>`;
        }
      }

      const canDelete = currentUser?.role === 'admin';

      return `
        <tr>
          <td><strong style="color:var(--text-muted); font-size:0.82rem;">#${p.id}</strong></td>
          <td>
            <div class="product-cell">
              <img src="${p.image_url}" class="product-img-thumb" alt="${p.product_name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=70'">
              <div>
                <div style="font-weight: 700; color: var(--text-primary); font-size:0.92rem;">${p.product_name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem; display:flex; align-items:center; gap:0.4rem;">
                  <span>Barcode: ${p.barcode}</span>
                  <button class="btn btn-secondary btn-sm" style="padding: 0.05rem 0.3rem; font-size: 0.65rem;" onclick="App.showBarcodeModal('${p.product_name}', '${p.barcode}')"><i class="fa-solid fa-barcode"></i> View</button>
                </div>
              </div>
            </div>
          </td>
          <td><span class="badge" style="background:var(--primary-light); color:var(--primary-color); border:1px solid var(--primary-border);">${p.category_name}</span></td>
          <td>${p.supplier || 'N/A'}</td>
          <td>${formatINR(p.purchase_price)}</td>
          <td><strong style="color:var(--primary-color);">${formatINR(p.selling_price)}</strong></td>
          <td>
            <div style="display:flex; align-items:center; gap:0.3rem;">
              <button class="quick-stock-btn" onclick="App.quickStockAdjust(${p.id}, -1)">-</button>
              <strong style="font-size:0.95rem; min-width:2rem; text-align:center;">${p.quantity}</strong>
              <button class="quick-stock-btn" onclick="App.quickStockAdjust(${p.id}, 1)">+</button>
              <span style="font-size:0.8rem; color:var(--text-secondary);">${p.unit}</span>
            </div>
          </td>
          <td>${expiryBadge}</td>
          <td>${stockBadge}</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              ${p.quantity <= p.min_stock_level ? `
                <button class="btn btn-primary btn-sm" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="App.openPurchaseOrderModal(${p.id})" title="Reorder Now"><i class="fa-solid fa-cart-plus"></i> Reorder</button>
              ` : ''}
              <button class="btn btn-secondary btn-sm" onclick="App.openEditProductModal(${p.id})" title="Edit Product"><i class="fa-solid fa-pen"></i></button>
              ${canDelete ? `
                <button class="btn btn-danger btn-sm" onclick="App.deleteProduct(${p.id})" title="Delete Product"><i class="fa-solid fa-trash"></i></button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Customer Orders Management (Requirement 40, 41, 51)
  function renderCustomerOrdersTable() {
    const tbody = document.getElementById('customer-orders-table-body');
    if (!tbody) return;

    if (customerOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:3rem; color:var(--text-muted);"><i class="fa-solid fa-box-open" style="font-size:2.5rem; margin-bottom:0.5rem; opacity:0.4;"></i><br>No customer orders placed yet.</td></tr>';
      return;
    }

    tbody.innerHTML = customerOrders.map(o => {
      let payStatusBadge = `<span class="badge" style="background:#fef3c7; color:#d97706;"><i class="fa-solid fa-hourglass-half"></i> Pending Verification</span>`;
      if (o.payment_status === 'Verified' || o.payment_status === 'Paid') {
        payStatusBadge = `<span class="badge badge-in-stock"><i class="fa-solid fa-circle-check"></i> Verified</span>`;
      }

      return `
        <tr>
          <td><strong>${o.order_id}</strong></td>
          <td>
            <strong>${o.customer_name}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${o.phone}</div>
          </td>
          <td>${new Date(o.date).toLocaleString('en-IN')}</td>
          <td>
            <div style="font-size:0.82rem;">
              ${o.items.map(i => `<div>${i.product_name} &times; ${i.quantity}</div>`).join('')}
            </div>
          </td>
          <td><strong style="color:var(--primary-color); font-size:1rem;">${formatINR(o.grand_total)}</strong></td>
          <td>
            <div>${o.payment_method}</div>
            ${payStatusBadge}
            ${o.payment_method === 'UPI' && o.payment_status === 'Pending Verification' ? `
              <div style="margin-top:0.3rem;">
                <button class="btn btn-primary btn-sm" style="font-size:0.7rem; padding:0.15rem 0.4rem;" onclick="App.confirmOrderPayment('${o.order_id}', 'Verified')">Confirm Payment</button>
              </div>
            ` : ''}
          </td>
          <td>
            <select class="form-control" style="padding:0.3rem 0.5rem; font-size:0.8rem;" onchange="App.changeOrderStatus('${o.order_id}', this.value)">
              <option value="New" ${o.order_status === 'New' ? 'selected' : ''}>New Order</option>
              <option value="Confirmed" ${o.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Preparing" ${o.order_status === 'Preparing' ? 'selected' : ''}>Preparing</option>
              <option value="Ready" ${o.order_status === 'Ready' ? 'selected' : ''}>Ready for Delivery</option>
              <option value="Out for Delivery" ${o.order_status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            </select>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="CustomerPortal.printCustomerInvoice('${o.order_id}')" title="Print Invoice"><i class="fa-solid fa-receipt"></i> Bill</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function confirmOrderPayment(orderId, status) {
    await DB.updatePaymentStatus(orderId, status);
    showToast(`Payment for order ${orderId} marked as ${status}!`, 'success');
    refreshAllData();
  }

  async function changeOrderStatus(orderId, newStatus) {
    await DB.updateCustomerOrderStatus(orderId, newStatus);
    showToast(`Order ${orderId} status changed to ${newStatus}!`, 'info');
    refreshAllData();
  }

  // Supplier Purchase Orders (Requirement 9)
  function renderPurchaseOrdersTable() {
    const tbody = document.getElementById('purchase-orders-table-body');
    if (!tbody) return;

    if (purchaseOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:2.5rem; color:var(--text-muted);">No supplier purchase orders recorded.</td></tr>';
      return;
    }

    tbody.innerHTML = purchaseOrders.map(po => `
      <tr>
        <td><strong>${po.po_id}</strong></td>
        <td>${po.supplier_name}</td>
        <td>${new Date(po.date).toLocaleDateString('en-IN')}</td>
        <td>${po.items.map(i => `${i.product_name} (${i.quantity} units)`).join(', ')}</td>
        <td><strong>${formatINR(po.total_amount)}</strong></td>
        <td>
          ${po.status === 'Received' ? `
            <span class="badge badge-in-stock"><i class="fa-solid fa-circle-check"></i> Stock Received</span>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="App.receivePurchaseOrder('${po.po_id}')">
              <i class="fa-solid fa-truck-ramp-box"></i> Receive Stock
            </button>
          `}
        </td>
      </tr>
    `).join('');
  }

  async function receivePurchaseOrder(poId) {
    try {
      await DB.receivePurchaseOrder(poId);
      showToast(`Purchase order ${poId} stock successfully received and added to inventory!`, 'success');
      refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openPurchaseOrderModal(prefillProductId) {
    const modal = document.getElementById('purchase-order-modal');
    if (!modal) return;

    const supplierSelect = document.getElementById('po-supplier-select');
    const productSelect = document.getElementById('po-product-select');

    if (supplierSelect) {
      supplierSelect.innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    if (productSelect) {
      productSelect.innerHTML = products.map(p => `<option value="${p.id}" ${prefillProductId && p.id == prefillProductId ? 'selected' : ''}>${p.product_name} (Cost: ${formatINR(p.purchase_price)})</option>`).join('');
    }

    modal.classList.add('active');
  }

  async function submitPurchaseOrder(e) {
    e.preventDefault();
    const supId = document.getElementById('po-supplier-select')?.value;
    const prodId = document.getElementById('po-product-select')?.value;
    const qty = parseFloat(document.getElementById('po-quantity-input')?.value) || 0;

    const sup = suppliers.find(s => s.id == supId);
    const prod = products.find(p => p.id == prodId);

    if (!sup || !prod || qty <= 0) {
      showToast('Please check supplier, product and order quantity', 'warning');
      return;
    }

    const total = qty * prod.purchase_price;

    await DB.createPurchaseOrder({
      supplier_id: sup.id,
      supplier_name: sup.name,
      items: [{ product_id: prod.id, product_name: prod.product_name, quantity: qty, purchase_price: prod.purchase_price, total }],
      total_amount: total
    });

    showToast(`Created Purchase Order for ${qty} ${prod.unit} of ${prod.product_name}!`, 'success');
    document.getElementById('purchase-order-modal')?.classList.remove('active');
    refreshAllData();
  }

  // Payment Settings & UPI QR Management (Requirement 51)
  function renderPaymentSettings() {
    const upi = settings.payment_settings || {};
    const imgEl = document.getElementById('settings-qr-preview');
    const upiInput = document.getElementById('settings-upi-id-input');
    const upiCheck = document.getElementById('setting-enable-upi');
    const cashCheck = document.getElementById('setting-enable-cash');
    const cardCheck = document.getElementById('setting-enable-card');
    const codCheck = document.getElementById('setting-enable-cod');

    if (imgEl && upi.upi_qr_image) imgEl.src = upi.upi_qr_image;
    if (upiInput) upiInput.value = upi.upi_id || 'freshsupermart@okaxis';
    if (upiCheck) upiCheck.checked = upi.upi_enabled !== false;
    if (cashCheck) cashCheck.checked = upi.cash_enabled !== false;
    if (cardCheck) cardCheck.checked = upi.card_enabled !== false;
    if (codCheck) codCheck.checked = upi.cod_enabled !== false;
  }

  async function savePaymentSettings(e) {
    if (e) e.preventDefault();
    const upiId = document.getElementById('settings-upi-id-input')?.value.trim();
    const upiCheck = document.getElementById('setting-enable-upi')?.checked;
    const cashCheck = document.getElementById('setting-enable-cash')?.checked;
    const cardCheck = document.getElementById('setting-enable-card')?.checked;
    const codCheck = document.getElementById('setting-enable-cod')?.checked;

    await DB.updatePaymentSettings({
      upi_id: upiId,
      upi_enabled: upiCheck,
      cash_enabled: cashCheck,
      card_enabled: cardCheck,
      cod_enabled: codCheck
    });

    showToast('Payment settings and UPI configuration updated successfully!', 'success');
    refreshAllData();
  }

  function handleQrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/image.*/)) {
      showToast('Please select an image file (PNG, JPG, WEBP, SVG)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Img = evt.target.result;
      await DB.updatePaymentSettings({ upi_qr_image: base64Img });
      document.getElementById('settings-qr-preview').src = base64Img;
      showToast('Shopkeeper UPI QR code uploaded and saved!', 'success');
      refreshAllData();
    };
    reader.readAsDataURL(file);
  }

  // Categories & Suppliers
  function renderCategoryTable() {
    const tbody = document.getElementById('category-table-body');
    const selectFilter = document.getElementById('product-category-filter');
    const selectForm = document.getElementById('product-form-category');
    if (!tbody) return;

    if (selectFilter) {
      const currentVal = selectFilter.value;
      selectFilter.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${c.category_name}">${c.category_name}</option>`).join('');
      selectFilter.value = currentVal;
    }

    if (selectForm) {
      selectForm.innerHTML = categories.map(c => `<option value="${c.id}">${c.category_name}</option>`).join('');
    }

    tbody.innerHTML = categories.map(c => {
      const prodCount = products.filter(p => p.category_id == c.id || p.category_name === c.category_name).length;
      return `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${c.category_name}</strong></td>
          <td>${c.description || 'No description'}</td>
          <td><span class="badge" style="background:var(--primary-light); color:var(--primary-color);">${prodCount} products linked</span></td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openEditCategoryModal(${c.id})"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteCategory(${c.id})"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderSupplierTable() {
    const tbody = document.getElementById('supplier-table-body');
    const selectForm = document.getElementById('product-form-supplier');
    if (!tbody) return;

    if (selectForm) {
      selectForm.innerHTML = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }

    tbody.innerHTML = suppliers.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.phone || 'N/A'}</td>
        <td>${s.products_supplied || 'General'}</td>
        <td>${formatINR(s.total_purchases || 0)}</td>
        <td>${s.last_purchase_date || 'N/A'}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="App.openPurchaseOrderModal()"><i class="fa-solid fa-file-invoice"></i> Create PO</button>
        </td>
      </tr>
    `).join('');
  }

  function renderSalesHistoryTable() {
    const tbody = document.getElementById('sales-history-table-body');
    if (!tbody) return;

    if (sales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 3rem; color: var(--text-muted);"><i class="fa-solid fa-receipt" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4;"></i><br>No sales history recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sales.map(s => `
      <tr>
        <td><strong>#${s.id}</strong></td>
        <td><span class="badge" style="background:${s.source === 'online' ? '#e0f2fe' : '#f0fdf4'}; color:${s.source === 'online' ? '#0284c7' : '#16a34a'};">${(s.source || 'POS').toUpperCase()}</span></td>
        <td><strong>${s.product_name}</strong></td>
        <td><span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color);">${s.category_name}</span></td>
        <td><strong>${s.quantity_sold}</strong></td>
        <td>${formatINR(s.unit_price)}</td>
        <td><strong style="color:var(--primary-color);">${formatINR(s.total_price)}</strong></td>
        <td>${new Date(s.date).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');
  }

  // Notifications (Requirement 15)
  function checkNotifications() {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notif-badge');
    if (!list) return;

    const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level);
    const outStock = products.filter(p => p.quantity === 0);
    const newOrders = customerOrders.filter(o => o.order_status === 'New');
    const pendingPO = purchaseOrders.filter(p => p.status === 'Pending');

    const totalAlerts = lowStock.length + outStock.length + newOrders.length + pendingPO.length;
    if (badge) {
      badge.textContent = totalAlerts;
      badge.style.display = totalAlerts > 0 ? 'inline-flex' : 'none';
    }

    let itemsHTML = '';

    newOrders.forEach(o => {
      itemsHTML += `
        <div class="notification-item" onclick="App.navigateToTab('tab-customer-orders')">
          <div class="notification-icon" style="background:#e0f2fe; color:#0284c7;"><i class="fa-solid fa-basket-shopping"></i></div>
          <div>
            <strong>New Online Order: ${o.order_id}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${o.customer_name} - ${formatINR(o.grand_total)}</div>
          </div>
        </div>
      `;
    });

    outStock.forEach(p => {
      itemsHTML += `
        <div class="notification-item" onclick="App.navigateToTab('tab-products')">
          <div class="notification-icon out-stock"><i class="fa-solid fa-circle-xmark"></i></div>
          <div>
            <strong>${p.product_name}</strong> is out of stock!
            <div style="font-size:0.75rem; color:var(--text-muted);">Supplier: ${p.supplier}</div>
          </div>
        </div>
      `;
    });

    lowStock.forEach(p => {
      itemsHTML += `
        <div class="notification-item" onclick="App.navigateToTab('tab-products')">
          <div class="notification-icon low-stock"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            Low Stock: <strong>${p.product_name}</strong> (${p.quantity} ${p.unit} left)
            <div style="font-size:0.75rem; color:var(--text-muted);">Min: ${p.min_stock_level} ${p.unit}</div>
          </div>
        </div>
      `;
    });

    if (itemsHTML === '') {
      list.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-circle-check" style="color:var(--primary-color); font-size:1.5rem; margin-bottom:0.4rem; display:block;"></i>All operations running smoothly!</div>';
    } else {
      list.innerHTML = itemsHTML;
    }
  }

  function navigateToTab(tabId) {
    const navItem = document.querySelector(`.sidebar-nav [data-tab="${tabId}"]`);
    if (navItem) navItem.click();
    document.getElementById('notification-menu')?.classList.remove('active');
  }

  // Global Search (Requirement 20)
  function handleGlobalSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) return;

    // Search in customer orders first if invoice or order ID pattern
    if (q.startsWith('ord-') || q.startsWith('inv-')) {
      navigateToTab('tab-customer-orders');
      return;
    }

    // Default to Products tab
    navigateToTab('tab-products');
    const searchInput = document.getElementById('product-table-search');
    if (searchInput) {
      searchInput.value = q;
      renderProductTable();
    }
  }

  // Role Permissions
  function applyRolePermissions() {
    const role = currentUser?.role || 'admin';
    const roleBadge = document.getElementById('user-role-display');
    const userName = document.getElementById('user-name-display');

    if (roleBadge) roleBadge.textContent = role.toUpperCase();
    if (userName) userName.textContent = currentUser?.name || 'Admin';

    // Hide settings & backup for Staff
    const settingsTab = document.querySelector('[data-tab="tab-settings"]');
    const backupTab = document.querySelector('[data-tab="tab-backup"]');

    if (role === 'staff') {
      if (settingsTab) settingsTab.style.display = 'none';
      if (backupTab) backupTab.style.display = 'none';
    } else {
      if (settingsTab) settingsTab.style.display = 'flex';
      if (backupTab) backupTab.style.display = 'flex';
    }
  }

  function setupEventListeners() {
    // Navigation Tabs
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.getAttribute('data-tab');
        if (!tabId) return;

        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));
        const activePane = document.getElementById(tabId);
        if (activePane) activePane.classList.add('active');

        if (tabId === 'tab-movement') {
          ProductMovement.renderMovementAnalysis('30d');
        }
      });
    });

    // Toggle Sidebar
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    // Notification Dropdown
    const notifBtn = document.getElementById('notification-btn');
    const notifMenu = document.getElementById('notification-menu');
    if (notifBtn && notifMenu) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifMenu.classList.toggle('active');
      });
      document.addEventListener('click', () => {
        notifMenu.classList.remove('active');
      });
    }

    // Header Main Search
    const mainSearch = document.getElementById('main-search-input');
    if (mainSearch) {
      mainSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGlobalSearch(e.target.value);
      });
    }

    // Product Table Filters
    ['product-table-search', 'product-category-filter', 'product-status-filter', 'product-expiry-filter', 'product-sort-filter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', renderProductTable);
    });

    // Product Form
    const productForm = document.getElementById('product-form');
    if (productForm) {
      productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('product-edit-id').value;

        const pData = {
          product_name: document.getElementById('product-form-name').value,
          category_id: document.getElementById('product-form-category').value,
          brand: document.getElementById('product-form-brand').value,
          purchase_price: document.getElementById('product-form-purchase').value,
          selling_price: document.getElementById('product-form-selling').value,
          quantity: document.getElementById('product-form-qty').value,
          min_stock_level: document.getElementById('product-form-min-stock').value,
          unit: document.getElementById('product-form-unit').value,
          supplier: document.getElementById('product-form-supplier').value,
          expiry_date: document.getElementById('product-form-expiry').value,
          batch_no: document.getElementById('product-form-batch').value,
          barcode: document.getElementById('product-form-barcode').value,
          image_url: document.getElementById('product-form-image').value
        };

        try {
          if (editId) {
            await DB.updateProduct(editId, pData);
            showToast('Product updated successfully!', 'success');
          } else {
            await DB.addProduct(pData);
            showToast('New product added successfully!', 'success');
          }
          closeModal('product-modal');
          await refreshAllData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Category Form
    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
      categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('category-edit-id').value;
        const catData = {
          category_name: document.getElementById('category-form-name').value,
          description: document.getElementById('category-form-desc').value
        };

        try {
          if (editId) {
            await DB.updateCategory(editId, catData);
            showToast('Category updated!', 'success');
          } else {
            await DB.addCategory(catData);
            showToast('New category created!', 'success');
          }
          closeModal('category-modal');
          await refreshAllData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Purchase Order Form
    const poForm = document.getElementById('purchase-order-form');
    if (poForm) poForm.addEventListener('submit', submitPurchaseOrder);

    // Payment Settings Form
    const paySettingsForm = document.getElementById('payment-settings-form');
    if (paySettingsForm) paySettingsForm.addEventListener('submit', savePaymentSettings);

    const qrInput = document.getElementById('settings-qr-file-input');
    if (qrInput) qrInput.addEventListener('change', handleQrUpload);

    // Restore Backup Handler
    const restoreInput = document.getElementById('restore-file-input');
    if (restoreInput) {
      restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('Are you sure you want to restore database? Current data will be replaced.')) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            DB.restoreFullData(data);
            showToast('Database restored successfully!', 'success');
            await refreshAllData();
          } catch (err) {
            showToast('Invalid backup JSON file: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  function initDarkMode() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('grocery_app_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('grocery_app_theme', newTheme);
        updateThemeIcon(newTheme);
      });
    }
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
  }

  async function quickStockAdjust(productId, delta) {
    try {
      await DB.adjustProductStock(productId, delta);
      await refreshAllData();
      showToast('Stock level updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openAddProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('product-edit-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add New Grocery Product';
    openModal('product-modal');
  }

  function openEditProductModal(id) {
    const p = products.find(prod => prod.id == id);
    if (!p) return;

    document.getElementById('product-edit-id').value = p.id;
    document.getElementById('product-form-name').value = p.product_name;
    document.getElementById('product-form-category').value = p.category_id;
    document.getElementById('product-form-brand').value = p.brand || '';
    document.getElementById('product-form-purchase').value = p.purchase_price;
    document.getElementById('product-form-selling').value = p.selling_price;
    document.getElementById('product-form-qty').value = p.quantity;
    document.getElementById('product-form-min-stock').value = p.min_stock_level;
    document.getElementById('product-form-unit').value = p.unit;
    document.getElementById('product-form-supplier').value = p.supplier || '';
    document.getElementById('product-form-expiry').value = p.expiry_date || '';
    document.getElementById('product-form-batch').value = p.batch_no || '';
    document.getElementById('product-form-barcode').value = p.barcode || '';
    document.getElementById('product-form-image').value = p.image_url || '';

    document.getElementById('product-modal-title').textContent = `Edit Product: ${p.product_name}`;
    openModal('product-modal');
  }

  async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this grocery product?')) {
      await DB.deleteProduct(id);
      showToast('Product deleted', 'info');
      await refreshAllData();
    }
  }

  function openAddCategoryModal() {
    document.getElementById('category-form').reset();
    document.getElementById('category-edit-id').value = '';
    openModal('category-modal');
  }

  function openEditCategoryModal(id) {
    const c = categories.find(cat => cat.id == id);
    if (!c) return;

    document.getElementById('category-edit-id').value = c.id;
    document.getElementById('category-form-name').value = c.category_name;
    document.getElementById('category-form-desc').value = c.description || '';
    openModal('category-modal');
  }

  async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
      await DB.deleteCategory(id);
      showToast('Category deleted', 'info');
      await refreshAllData();
    }
  }

  function showBarcodeModal(productName, barcodeVal) {
    let modal = document.getElementById('barcode-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'barcode-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 400px; text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-barcode" style="color:var(--primary-color);"></i> Product Barcode</h3>
          <button class="modal-close-btn" onclick="document.getElementById('barcode-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
          <h4 style="font-weight:700; margin-bottom:0.5rem; color:var(--text-primary);">${productName}</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Scan with handheld POS barcode scanner</p>
          <div style="background:white; padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color); display:inline-block;">
            <svg id="modal-barcode-svg"></svg>
          </div>
        </div>
        <div class="modal-footer" style="justify-content:center;">
          <button class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Barcode Sticker</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    setTimeout(() => {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode("#modal-barcode-svg", barcodeVal, {
          format: "CODE128",
          lineColor: "#0f172a",
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 14,
          font: 'Inter'
        });
      }
    }, 100);
  }

  function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
  }

  async function loginAs(role) {
    if (role === 'admin') {
      currentUser = { username: 'admin', role: 'admin', name: 'Store Owner (Admin)' };
      showToast('Logged in as Store Owner (Admin)', 'success');
    } else {
      currentUser = { username: 'staff', role: 'staff', name: 'Cashier Staff' };
      showToast('Logged in as Cashier Staff', 'success');
    }
    document.getElementById('auth-modal')?.classList.remove('active');
    switchToAdminView();
  }

  function logout() {
    currentUser = null;
    showToast('Logged out of Admin Console', 'info');
    switchToCustomerView();
  }

  function resetDemoData() {
    if (confirm('Reset application to original presentation demo data? This will repopulate all Indian grocery products, sales, and orders.')) {
      DB.resetDemoData();
      showToast('🎉 Demo data restored successfully!', 'success');
      refreshAllData();
    }
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return {
    init,
    refreshAllData,
    switchToCustomerView,
    switchToAdminView,
    togglePortal,
    getCurrentUser: () => currentUser,
    openAddProductModal,
    openEditProductModal,
    deleteProduct,
    quickStockAdjust,
    openAddCategoryModal,
    openEditCategoryModal,
    deleteCategory,
    openPurchaseOrderModal,
    receivePurchaseOrder,
    confirmOrderPayment,
    changeOrderStatus,
    showBarcodeModal,
    navigateToTab,
    loginAs,
    logout,
    resetDemoData,
    openModal,
    closeModal,
    showToast
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
