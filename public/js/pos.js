/**
 * POS & Sales Management Module
 * Enables quick grocery sales, cart building, barcode lookups, and auto-updating stock levels
 */
const POSModule = (function () {
  let cart = [];
  let productsList = [];

  function init(products) {
    productsList = products;
    renderPOSGrid();
    bindEvents();
  }

  function updateProducts(products) {
    productsList = products;
    renderPOSGrid();
  }

  function renderPOSGrid(filterQuery = '') {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    let items = productsList.filter(p => p.quantity > 0);
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      items = items.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.category_name.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No matching available products in stock</div>';
      return;
    }

    grid.innerHTML = items.map(p => `
      <div class="pos-item-card" onclick="POSModule.addToCart(${p.id})">
        <img src="${p.image_url}" class="pos-item-img" alt="${p.product_name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'">
        <div class="pos-item-title">${p.product_name}</div>
        <div class="pos-item-price">₹${p.selling_price.toFixed(2)} / ${p.unit}</div>
        <span class="badge badge-in-stock" style="font-size: 0.7rem; margin-top: 0.2rem;">${p.quantity} ${p.unit} available</span>
      </div>
    `).join('');
  }

  function addToCart(productId) {
    const product = productsList.find(p => p.id == productId);
    if (!product) return;

    if (product.quantity <= 0) {
      App.showToast(`${product.product_name} is out of stock!`, 'error');
      return;
    }

    const existing = cart.find(item => item.product_id == productId);
    if (existing) {
      if (existing.quantity_sold + 1 > product.quantity) {
        App.showToast(`Cannot add more. Max stock available: ${product.quantity} ${product.unit}`, 'warning');
        return;
      }
      existing.quantity_sold += 1;
    } else {
      cart.push({
        product_id: product.id,
        product_name: product.product_name,
        unit_price: product.selling_price,
        unit: product.unit,
        quantity_sold: 1,
        max_qty: product.quantity
      });
    }

    renderCart();
  }

  function renderCart() {
    const container = document.getElementById('pos-cart-items');
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem 0;">Cart is empty.<br>Click a product to add to sale.</div>';
      updateTotals();
      return;
    }

    container.innerHTML = cart.map((item, idx) => `
      <div class="pos-cart-item">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:0.85rem;">${item.product_name}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">₹${item.unit_price.toFixed(2)} x ${item.quantity_sold} ${item.unit}</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <button class="btn btn-secondary btn-sm" onclick="POSModule.changeCartQty(${idx}, -1)">-</button>
          <span style="font-weight:700; font-size:0.85rem;">${item.quantity_sold}</span>
          <button class="btn btn-secondary btn-sm" onclick="POSModule.changeCartQty(${idx}, 1)">+</button>
          <button class="btn btn-danger btn-sm" onclick="POSModule.removeCartItem(${idx})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');

    updateTotals();
  }

  function changeCartQty(index, delta) {
    const item = cart[index];
    if (!item) return;

    const newQty = item.quantity_sold + delta;
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else if (newQty > item.max_qty) {
      App.showToast(`Stock limit reached (${item.max_qty} ${item.unit})`, 'warning');
    } else {
      item.quantity_sold = newQty;
    }
    renderCart();
  }

  function removeCartItem(index) {
    cart.splice(index, 1);
    renderCart();
  }

  function updateTotals() {
    const subtotal = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity_sold), 0);
    const tax = subtotal * 0.05; // 5% tax
    const grandTotal = subtotal + tax;

    const subEl = document.getElementById('pos-subtotal');
    const taxEl = document.getElementById('pos-tax');
    const totalEl = document.getElementById('pos-total');

    if (subEl) subEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${grandTotal.toFixed(2)}`;
  }

  function bindEvents() {
    const searchInput = document.getElementById('pos-search-input');
    const checkoutBtn = document.getElementById('pos-checkout-btn');
    const clearBtn = document.getElementById('pos-clear-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderPOSGrid(e.target.value);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        cart = [];
        renderCart();
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
          App.showToast('Cart is empty!', 'warning');
          return;
        }

        try {
          // Process all cart items into sales & update stocks
          for (const item of cart) {
            await DB.recordSale({
              product_id: item.product_id,
              quantity_sold: item.quantity_sold,
              unit_price: item.unit_price
            });
          }

          App.showToast('Checkout completed & stock levels updated!', 'success');
          cart = [];
          renderCart();
          App.refreshAllData();
        } catch (err) {
          App.showToast('Sale failed: ' + err.message, 'error');
        }
      });
    }
  }

  return {
    init,
    updateProducts,
    addToCart,
    changeCartQty,
    removeCartItem
  };
})();
