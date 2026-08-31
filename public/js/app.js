/**
 * Main Application Controller & UI State Router
 * Handles navigation, modals, notifications, dark mode, product CRUD, and auth state
 */
const App = (function () {
  let products = [];
  let categories = [];
  let suppliers = [];
  let sales = [];
  let currentUser = { username: 'admin' }; // default logged-in session

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

    document.getElementById('stat-total-products').textContent = totalProds;
    document.getElementById('stat-total-categories').textContent = totalCats;
    document.getElementById('stat-total-stock').textContent = Math.round(totalStockQty);
    document.getElementById('stat-low-stock').textContent = lowStockCount;
    document.getElementById('stat-out-stock').textContent = outOfStockCount;

    // Badges in header
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

    // Spec categories inventory summary
    const requiredCats = ['Rice', 'Oil', 'Biscuits', 'Beverages', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Cleaning Products', 'Personal Care'];

    grid.innerHTML = requiredCats.map(catName => {
      const catProducts = products.filter(p => (p.category_name || '').toLowerCase() === catName.toLowerCase());
      const totalStock = catProducts.reduce((sum, p) => sum + p.quantity, 0);
      const itemsCount = catProducts.length;

      return `
        <div class="cat-card">
          <div class="cat-card-name">${catName}</div>
          <div class="cat-card-stats">
            <div>Total Stock: <strong>${Math.round(totalStock)} units</strong></div>
            <div>Products: <strong>${itemsCount} items</strong></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderProductTable(filterText = '', catFilter = '') {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;

    let items = [...products];

    if (filterText) {
      const q = filterText.toLowerCase();
      items = items.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q))
      );
    }

    if (catFilter) {
      items = items.filter(p => p.category_name === catFilter);
    }

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 2rem; color: var(--text-muted);">No products found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(p => {
      let statusBadge = `<span class="badge badge-in-stock"><i class="fa-solid fa-circle-check"></i> In Stock</span>`;
      if (p.quantity === 0) {
        statusBadge = `<span class="badge badge-out-stock"><i class="fa-solid fa-triangle-exclamation"></i> Out of Stock</span>`;
      } else if (p.quantity <= p.min_stock_level) {
        statusBadge = `<span class="badge badge-low-stock"><i class="fa-solid fa-circle-exclamation"></i> Low Stock</span>`;
      }

      return `
        <tr>
          <td>#${p.id}</td>
          <td>
            <div class="product-cell">
              <img src="${p.image_url}" class="product-img-thumb" alt="${p.product_name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'">
              <div>
                <div style="font-weight: 600;">${p.product_name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">Barcode: ${p.barcode}</div>
              </div>
            </div>
          </td>
          <td><span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color);">${p.category_name}</span></td>
          <td>${p.brand || 'N/A'}</td>
          <td>₹${p.purchase_price.toFixed(2)} / ₹${p.selling_price.toFixed(2)}</td>
          <td><strong>${p.quantity}</strong> ${p.unit}</td>
          <td>${p.expiry_date || 'N/A'}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openEditProductModal(${p.id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderCategoryTable() {
    const tbody = document.getElementById('category-table-body');
    const selectFilter = document.getElementById('product-category-filter');
    const selectForm = document.getElementById('product-form-category');
    if (!tbody) return;

    if (selectFilter) {
      selectFilter.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${c.category_name}">${c.category_name}</option>`).join('');
    }

    if (selectForm) {
      selectForm.innerHTML = categories.map(c => `<option value="${c.id}">${c.category_name}</option>`).join('');
    }

    tbody.innerHTML = categories.map(c => {
      const prodCount = products.filter(p => p.category_id == c.id).length;
      return `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${c.category_name}</strong></td>
          <td>${c.description || 'No description'}</td>
          <td>${prodCount} products</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="App.openEditCategoryModal(${c.id})"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteCategory(${c.id})"><i class="fa-solid fa-trash"></i> Delete</button>
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
          <button class="btn btn-danger btn-sm" onclick="App.deleteSupplier(${s.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  function renderSalesHistoryTable() {
    const tbody = document.getElementById('sales-history-table-body');
    if (!tbody) return;

    if (sales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem; color: var(--text-muted);">No sales recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sales.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td><strong>${s.product_name}</strong></td>
        <td>${s.category_name}</td>
        <td>${s.quantity_sold}</td>
        <td>₹${s.unit_price.toFixed(2)}</td>
        <td><strong style="color:var(--primary-color);">₹${s.total_price.toFixed(2)}</strong></td>
        <td>${new Date(s.date).toLocaleString()}</td>
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
            <strong>${p.product_name}</strong> is completely out of stock!
            <div style="font-size:0.72rem; color:var(--text-muted);">Supplier: ${p.supplier}</div>
          </div>
        </div>
      `;
    });

    lowStock.forEach(p => {
      itemsHTML += `
        <div class="notification-item">
          <div class="notification-icon low-stock"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            Low Stock Warning: <strong>${p.product_name}</strong> (${p.quantity} ${p.unit} remaining)
            <div style="font-size:0.72rem; color:var(--text-muted);">Min Level: ${p.min_stock_level} ${p.unit}</div>
          </div>
        </div>
      `;
    });

    if (itemsHTML === '') {
      list.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.83rem;">All products healthy & in stock!</div>';
    } else {
      list.innerHTML = itemsHTML;
    }
  }

  function setupEventListeners() {
    // Navigation routing
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabTarget = item.getAttribute('data-tab');
        if (!tabTarget) return;

        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => pane.classList.remove('active'));

        const targetPane = document.getElementById(tabTarget);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleDarkMode);
    }

    // Notifications toggle
    const notifBtn = document.getElementById('notification-btn');
    const notifMenu = document.getElementById('notification-menu');
    if (notifBtn && notifMenu) {
      notifBtn.addEventListener('click', () => {
        notifMenu.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!notifBtn.contains(e.target) && !notifMenu.contains(e.target)) {
          notifMenu.classList.remove('show');
        }
      });
    }

    // Header & Table Search
    const mainSearch = document.getElementById('main-search-input');
    const productSearch = document.getElementById('product-table-search');
    const catFilter = document.getElementById('product-category-filter');

    if (mainSearch) {
      mainSearch.addEventListener('input', (e) => {
        renderProductTable(e.target.value);
      });
    }

    if (productSearch) {
      productSearch.addEventListener('input', (e) => {
        renderProductTable(e.target.value, catFilter ? catFilter.value : '');
      });
    }

    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        renderProductTable(productSearch ? productSearch.value : '', e.target.value);
      });
    }

    // Product Form Modal Submission
    const prodForm = document.getElementById('product-form');
    if (prodForm) {
      prodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('product-edit-id').value;

        const pData = {
          product_name: document.getElementById('product-form-name').value,
          category_id: document.getElementById('product-form-category').value,
          brand: document.getElementById('product-form-brand').value,
          purchase_price: parseFloat(document.getElementById('product-form-purchase').value) || 0,
          selling_price: parseFloat(document.getElementById('product-form-selling').value) || 0,
          quantity: parseFloat(document.getElementById('product-form-qty').value) || 0,
          min_stock_level: parseFloat(document.getElementById('product-form-min-stock').value) || 10,
          unit: document.getElementById('product-form-unit').value,
          supplier: document.getElementById('product-form-supplier').value,
          expiry_date: document.getElementById('product-form-expiry').value,
          barcode: document.getElementById('product-form-barcode').value || BarcodeModule.generateRandomBarcode(),
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
          refreshAllData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Category Form Modal Submission
    const catForm = document.getElementById('category-form');
    if (catForm) {
      catForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('category-edit-id').value;
        const catData = {
          category_name: document.getElementById('category-form-name').value,
          description: document.getElementById('category-form-desc').value
        };

        if (editId) {
          await DB.updateCategory(editId, catData);
          showToast('Category updated!', 'success');
        } else {
          await DB.addCategory(catData);
          showToast('New category added!', 'success');
        }
        closeModal('category-modal');
        refreshAllData();
      });
    }

    // Supplier Form Modal Submission
    const supForm = document.getElementById('supplier-form');
    if (supForm) {
      supForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supData = {
          name: document.getElementById('supplier-form-name').value,
          phone: document.getElementById('supplier-form-phone').value,
          email: document.getElementById('supplier-form-email').value,
          address: document.getElementById('supplier-form-address').value
        };

        await DB.addSupplier(supData);
        showToast('Supplier added!', 'success');
        closeModal('supplier-modal');
        refreshAllData();
      });
    }

    // Restore File Upload
    const restoreInput = document.getElementById('restore-file-input');
    if (restoreInput) {
      restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            DB.restoreFullData(data);
            showToast('Database restored successfully!', 'success');
            refreshAllData();
          } catch (err) {
            showToast('Failed to parse backup JSON file', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Auth Login
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('auth-username').value;
        const p = document.getElementById('auth-password').value;

        if (u === 'admin' && (p === 'password123' || p === 'admin123')) {
          const authOverlay = document.getElementById('auth-overlay');
          if (authOverlay) authOverlay.style.display = 'none';
          showToast('Welcome back, Admin!', 'success');
        } else {
          showToast('Invalid Username or Password', 'error');
        }
      });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const authOverlay = document.getElementById('auth-overlay');
        if (authOverlay) authOverlay.style.display = 'flex';
        showToast('Logged out successfully', 'info');
      });
    }
  }

  function initDarkMode() {
    const saved = localStorage.getItem('grocery_theme');
    if (saved === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    }
  }

  function toggleDarkMode() {
    const current = document.body.getAttribute('data-theme');
    if (current === 'dark') {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('grocery_theme', 'light');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('grocery_theme', 'dark');
    }
  }

  function openAddProductModal() {
    document.getElementById('product-edit-id').value = '';
    document.getElementById('product-form').reset();
    document.getElementById('product-form-barcode').value = BarcodeModule.generateRandomBarcode();
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
    document.getElementById('product-form-supplier').value = p.supplier;
    document.getElementById('product-form-expiry').value = p.expiry_date || '';
    document.getElementById('product-form-barcode').value = p.barcode || '';
    document.getElementById('product-form-image').value = p.image_url || '';

    document.getElementById('product-modal-title').textContent = 'Edit Product Details';
    openModal('product-modal');
  }

  async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      await DB.deleteProduct(id);
      showToast('Product deleted', 'success');
      refreshAllData();
    }
  }

  function openAddCategoryModal() {
    document.getElementById('category-edit-id').value = '';
    document.getElementById('category-form').reset();
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
      showToast('Category deleted', 'success');
      refreshAllData();
    }
  }

  function openAddSupplierModal() {
    document.getElementById('supplier-form').reset();
    openModal('supplier-modal');
  }

  function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('show');
  }

  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('show');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  return {
    init,
    refreshAllData,
    openAddProductModal,
    openEditProductModal,
    deleteProduct,
    openAddCategoryModal,
    openEditCategoryModal,
    deleteCategory,
    openAddSupplierModal,
    openModal,
    closeModal,
    showToast
  };
})();

// Document Ready Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
