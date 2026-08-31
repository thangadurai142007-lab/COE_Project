/**
 * Main Application Controller & UI State Router
 * Handles navigation, modals, notifications, dark mode, product CRUD, and auth state
 */
const App = (function () {
  let products = [];
  let categories = [];
  let suppliers = [];
  let sales = [];
  let currentUser = { username: 'admin' };

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function init() {
    setupEventListeners();
    initDarkMode();
    await refreshAllData();
    InventoryReports.init();
    POSModule.init(products);
    StockCalculator.init(products);
  }

  async function refreshAllData() {
    try {
      products = await DB.getProducts();
      categories = await DB.getCategories();
      suppliers = await DB.getSuppliers();
      sales = await DB.getSales();

      updateDashboardStats();
      updateCategorySummaryCards();
      renderProductTable();
      renderCategoryTable();
      renderSupplierTable();
      renderSalesHistoryTable();
      checkStockNotifications();

      AppCharts.renderCharts(products, categories, sales);
      POSModule.updateProducts(products);
      StockCalculator.updateProducts(products);
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  }

  function updateDashboardStats() {
    const totalProds = products.length;
    const totalCats = categories.length;
    const totalStockQty = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;

    const totalValuation = products.reduce((sum, p) => sum + (p.quantity * p.selling_price), 0);
    const totalCost = products.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0);
    const expectedProfit = totalValuation - totalCost;

    const elTotalProds = document.getElementById('stat-total-products');
    const elTotalCats = document.getElementById('stat-total-categories');
    const elTotalStock = document.getElementById('stat-total-stock');
    const elLowStock = document.getElementById('stat-low-stock');
    const elOutStock = document.getElementById('stat-out-stock');
    const elValuation = document.getElementById('stat-total-valuation');
    const elExpectedProfit = document.getElementById('stat-expected-profit');

    if (elTotalProds) elTotalProds.textContent = totalProds;
    if (elTotalCats) elTotalCats.textContent = totalCats;
    if (elTotalStock) elTotalStock.textContent = Math.round(totalStockQty);
    if (elLowStock) elLowStock.textContent = lowStockCount;
    if (elOutStock) elOutStock.textContent = outOfStockCount;
    if (elValuation) elValuation.textContent = formatINR(totalValuation);
    if (elExpectedProfit) elExpectedProfit.textContent = formatINR(expectedProfit);

    // Header notification badge
    const notifBadge = document.getElementById('notif-badge');
    const alertCount = lowStockCount + outOfStockCount;
    if (notifBadge) {
      notifBadge.textContent = alertCount;
      notifBadge.style.display = alertCount > 0 ? 'flex' : 'none';
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

  function renderProductTable() {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;

    const filterText = (document.getElementById('product-table-search')?.value || '').toLowerCase();
    const catFilter = document.getElementById('product-category-filter')?.value || '';
    const statusFilter = document.getElementById('product-status-filter')?.value || '';
    const sortFilter = document.getElementById('product-sort-filter')?.value || 'name_asc';

    let items = [...products];

    if (filterText) {
      items = items.filter(p =>
        p.product_name.toLowerCase().includes(filterText) ||
        (p.brand && p.brand.toLowerCase().includes(filterText)) ||
        (p.supplier && p.supplier.toLowerCase().includes(filterText)) ||
        (p.barcode && p.barcode.includes(filterText))
      );
    }

    if (catFilter) {
      items = items.filter(p => p.category_name === catFilter);
    }

    if (statusFilter === 'in_stock') {
      items = items.filter(p => p.quantity > p.min_stock_level);
    } else if (statusFilter === 'low_stock') {
      items = items.filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level);
    } else if (statusFilter === 'out_stock') {
      items = items.filter(p => p.quantity === 0);
    }

    // Sort items
    items.sort((a, b) => {
      if (sortFilter === 'name_asc') return a.product_name.localeCompare(b.product_name);
      if (sortFilter === 'price_low') return a.selling_price - b.selling_price;
      if (sortFilter === 'price_high') return b.selling_price - a.selling_price;
      if (sortFilter === 'stock_low') return a.quantity - b.quantity;
      if (sortFilter === 'stock_high') return b.quantity - a.quantity;
      return 0;
    });

    // Render Product Summary Cards above table
    const prodValuation = items.reduce((sum, p) => sum + (p.quantity * p.selling_price), 0);
    const prodCost = items.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0);
    const prodProfit = prodValuation - prodCost;

    const elTotalVal = document.getElementById('prod-summary-valuation');
    const elTotalProfit = document.getElementById('prod-summary-profit');
    const elCount = document.getElementById('prod-summary-count');

    if (elTotalVal) elTotalVal.textContent = formatINR(prodValuation);
    if (elTotalProfit) elTotalProfit.textContent = formatINR(prodProfit);
    if (elCount) elCount.textContent = items.length;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 3rem; color: var(--text-muted);"><i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i><br>No products match the selected filters.</td></tr>';
      return;
    }

    const today = new Date();

    tbody.innerHTML = items.map(p => {
      let statusBadge = `<span class="badge badge-in-stock"><i class="fa-solid fa-circle-check"></i> In Stock</span>`;
      if (p.quantity === 0) {
        statusBadge = `<span class="badge badge-out-stock"><i class="fa-solid fa-triangle-exclamation"></i> Out of Stock</span>`;
      } else if (p.quantity <= p.min_stock_level) {
        statusBadge = `<span class="badge badge-low-stock"><i class="fa-solid fa-circle-exclamation"></i> Low Stock</span>`;
      }

      // Expiry status check
      let expiryBadge = `<span style="font-size: 0.8rem; color: var(--text-secondary);">${p.expiry_date || 'N/A'}</span>`;
      if (p.expiry_date) {
        const expDate = new Date(p.expiry_date);
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expiryBadge = `<span class="badge badge-out-stock" title="Expired!"><i class="fa-solid fa-circle-xmark"></i> ${p.expiry_date} (Expired)</span>`;
        } else if (diffDays <= 30) {
          expiryBadge = `<span class="badge badge-low-stock" title="Expires within 30 days!"><i class="fa-solid fa-clock"></i> ${p.expiry_date} (${diffDays}d left)</span>`;
        }
      }

      const profitPerUnit = p.selling_price - p.purchase_price;

      return `
        <tr>
          <td><strong style="color:var(--text-muted); font-size:0.82rem;">#${p.id}</strong></td>
          <td>
            <div class="product-cell">
              <img src="${p.image_url}" class="product-img-thumb" alt="${p.product_name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'">
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
          <td><span style="font-weight:500;">${p.brand || 'Generic'}</span></td>
          <td>
            <div>
              <span style="font-weight:700; color:var(--primary-color);">${formatINR(p.selling_price)}</span>
              <div style="font-size:0.72rem; color:var(--text-muted);">Cost: ${formatINR(p.purchase_price)} | Margin: +${formatINR(profitPerUnit)}</div>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:0.3rem;">
              <button class="quick-stock-btn" onclick="App.quickStockAdjust(${p.id}, -1)" title="Deduct 1 unit">-</button>
              <strong style="font-size: 0.95rem; min-width: 2rem; text-align: center;">${p.quantity}</strong>
              <button class="quick-stock-btn" onclick="App.quickStockAdjust(${p.id}, 1)" title="Add 1 unit">+</button>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">${p.unit}</span>
            </div>
          </td>
          <td>${expiryBadge}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openEditProductModal(${p.id})" title="Edit Product"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteProduct(${p.id})" title="Delete Product"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function quickStockAdjust(productId, delta) {
    try {
      await DB.adjustProductStock(productId, delta);
      await refreshAllData();
      showToast(`Stock updated!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

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
        <td>${s.email || 'N/A'}</td>
        <td>${s.address || 'N/A'}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="App.deleteSupplier(${s.id})"><i class="fa-solid fa-trash"></i> Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function renderSalesHistoryTable() {
    const tbody = document.getElementById('sales-history-table-body');
    if (!tbody) return;

    if (sales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 3rem; color: var(--text-muted);"><i class="fa-solid fa-receipt" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4;"></i><br>No sales history recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sales.map(s => `
      <tr>
        <td><strong>#${s.id}</strong></td>
        <td><strong>${s.product_name}</strong></td>
        <td><span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color);">${s.category_name}</span></td>
        <td><strong>${s.quantity_sold}</strong></td>
        <td>${formatINR(s.unit_price)}</td>
        <td><strong style="color:var(--primary-color); font-size:0.95rem;">${formatINR(s.total_price)}</strong></td>
        <td>${new Date(s.date).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');
  }

  function checkStockNotifications() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level);
    const outStock = products.filter(p => p.quantity === 0);

    let itemsHTML = '';

    outStock.forEach(p => {
      itemsHTML += `
        <div class="notification-item">
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
        <div class="notification-item">
          <div class="notification-icon low-stock"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            Low Stock: <strong>${p.product_name}</strong> (${p.quantity} ${p.unit} left)
            <div style="font-size:0.75rem; color:var(--text-muted);">Threshold: ${p.min_stock_level} ${p.unit}</div>
          </div>
        </div>
      `;
    });

    if (outStock.length === 0 && lowStock.length === 0) {
      itemsHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-circle-check" style="color:var(--primary-color); font-size:1.5rem; margin-bottom:0.4rem; display:block;"></i>All products are sufficiently stocked!</div>';
    }

    list.innerHTML = itemsHTML;
  }

  function setupEventListeners() {
    // Navigation Tabs
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.getAttribute('data-tab');

        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        const activePane = document.getElementById(tabId);
        if (activePane) activePane.classList.add('active');
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

    // Header Main Search Input
    const mainSearch = document.getElementById('main-search-input');
    if (mainSearch) {
      mainSearch.addEventListener('input', (e) => {
        const val = e.target.value;
        const prodTabBtn = document.querySelector('[data-tab="tab-products"]');
        if (prodTabBtn) prodTabBtn.click();
        const prodSearch = document.getElementById('product-table-search');
        if (prodSearch) {
          prodSearch.value = val;
          renderProductTable();
        }
      });
    }

    // Product Table Filters
    ['product-table-search', 'product-category-filter', 'product-status-filter', 'product-sort-filter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', renderProductTable);
    });

    // Forms Submit Handlers
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

    const supplierForm = document.getElementById('supplier-form');
    if (supplierForm) {
      supplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supData = {
          name: document.getElementById('supplier-form-name').value,
          phone: document.getElementById('supplier-form-phone').value,
          email: document.getElementById('supplier-form-email').value,
          address: document.getElementById('supplier-form-address').value
        };

        try {
          await DB.addSupplier(supData);
          showToast('Supplier added successfully!', 'success');
          closeModal('supplier-modal');
          await refreshAllData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Restore Backup Handler
    const restoreInput = document.getElementById('restore-file-input');
    if (restoreInput) {
      restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            DB.restoreFullData(data);
            showToast('Database restored successfully!', 'success');
            await refreshAllData();
          } catch (err) {
            showToast('Invalid backup JSON file', 'error');
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
    document.getElementById('product-form-barcode').value = p.barcode || '';
    document.getElementById('product-form-image').value = p.image_url || '';

    document.getElementById('product-modal-title').textContent = `Edit Product: ${p.product_name}`;
    openModal('product-modal');
  }

  async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
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

  function openAddSupplierModal() {
    document.getElementById('supplier-form').reset();
    openModal('supplier-modal');
  }

  async function deleteSupplier(id) {
    if (confirm('Are you sure you want to delete this supplier?')) {
      await DB.deleteSupplier(id);
      showToast('Supplier removed', 'info');
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

  return {
    init,
    refreshAllData,
    openAddProductModal,
    openEditProductModal,
    deleteProduct,
    quickStockAdjust,
    openAddCategoryModal,
    openEditCategoryModal,
    deleteCategory,
    openAddSupplierModal,
    deleteSupplier,
    showBarcodeModal,
    openModal,
    closeModal,
    showToast
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
