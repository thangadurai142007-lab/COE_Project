/**
 * Fresh Supermart - Professional POS & Billing Counter Module
 * Handles barcode scanning, quick search, item cart, discount, GST,
 * UPI QR Code Counter Display, and Printable Tax Invoices
 */
const POSModule = (function () {
  let cart = [];
  let productsList = [];
  let currentDiscount = 0; // % discount
  let paymentMethod = 'Cash';

  function init(products) {
    productsList = products;
    renderPOSGrid();
    bindEvents();
  }

  function updateProducts(products) {
    productsList = products;
    renderPOSGrid();
  }

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderPOSGrid(filterQuery = '') {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    let items = productsList.filter(p => p.quantity > 0);
    if (filterQuery) {
      const q = filterQuery.toLowerCase().trim();
      items = items.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        String(p.id).includes(q)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p style="font-weight: 600;">No available products match your search</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => `
      <div class="pos-item-card" onclick="POSModule.addToCart(${p.id})">
        <div class="pos-item-img-wrapper">
          <img src="${p.image_url}" class="pos-item-img" alt="${p.product_name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'">
          <span class="pos-item-stock-tag">${p.quantity} ${p.unit}</span>
        </div>
        <div class="pos-item-content">
          <div class="pos-item-category">${p.category_name || 'Grocery'}</div>
          <div class="pos-item-title">${p.product_name}</div>
          <div class="pos-item-price-row">
            <span class="pos-item-price">${formatINR(p.selling_price)}</span>
            <span class="pos-item-unit">/ ${p.unit}</span>
          </div>
        </div>
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
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
          <i class="fa-solid fa-cart-flatbed" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4; color: var(--primary-color);"></i>
          <p style="font-weight: 600;">Sale cart is empty</p>
          <p style="font-size: 0.8rem; margin-top: 0.25rem;">Scan barcode or click items to add to bill</p>
        </div>
      `;
      updateTotals();
      return;
    }

    container.innerHTML = cart.map((item, idx) => `
      <div class="pos-cart-item">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:0.88rem; color:var(--text-primary);">${item.product_name}</div>
          <div style="font-size:0.78rem; color:var(--text-secondary); margin-top: 0.15rem;">
            ${formatINR(item.unit_price)} &times; ${item.quantity_sold} ${item.unit} = <strong>${formatINR(item.unit_price * item.quantity_sold)}</strong>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.35rem;">
          <button class="btn btn-secondary btn-sm" onclick="POSModule.changeCartQty(${idx}, -1)">-</button>
          <span style="font-weight:700; font-size:0.9rem; min-width: 1.5rem; text-align: center;">${item.quantity_sold}</span>
          <button class="btn btn-secondary btn-sm" onclick="POSModule.changeCartQty(${idx}, 1)">+</button>
          <button class="btn btn-danger btn-sm" onclick="POSModule.removeCartItem(${idx})" title="Remove"><i class="fa-solid fa-trash"></i></button>
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
    const discountAmt = (subtotal * currentDiscount) / 100;
    const taxableSubtotal = Math.max(0, subtotal - discountAmt);
    const tax = taxableSubtotal * 0.05; // 5% GST
    const grandTotal = taxableSubtotal + tax;

    const subEl = document.getElementById('pos-subtotal');
    const taxEl = document.getElementById('pos-tax');
    const totalEl = document.getElementById('pos-total');
    const discEl = document.getElementById('pos-discount-amt');

    if (subEl) subEl.textContent = formatINR(subtotal);
    if (discEl) discEl.textContent = `- ${formatINR(discountAmt)}`;
    if (taxEl) taxEl.textContent = formatINR(tax);
    if (totalEl) totalEl.textContent = formatINR(grandTotal);
  }

  function setDiscount(percent) {
    currentDiscount = Math.max(0, Math.min(100, parseFloat(percent) || 0));
    updateTotals();
  }

  function setPaymentMethod(method) {
    paymentMethod = method;
    if (method === 'UPI / QR' && cart.length > 0) {
      openPosUpiModal();
    }
  }

  async function openPosUpiModal() {
    const subtotal = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity_sold), 0);
    const discountAmt = (subtotal * currentDiscount) / 100;
    const grandTotal = (subtotal - discountAmt) * 1.05;

    const settings = await DB.getSettings();
    const upi = settings.payment_settings || {};

    let modal = document.getElementById('pos-upi-counter-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pos-upi-counter-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 420px; text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-qrcode" style="color:var(--primary-color);"></i> Customer UPI QR Payment</h3>
          <button class="modal-close-btn" onclick="document.getElementById('pos-upi-counter-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Ask customer to scan using GPay, PhonePe, Paytm or BHIM:
          </p>
          <div style="background: white; padding: 1rem; border-radius: var(--radius-md); display: inline-block; box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
            <img src="${upi.upi_qr_image}" alt="Shopkeeper UPI QR" style="width: 200px; height: 200px; object-fit: contain;">
          </div>
          <div style="margin-top: 1rem; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
            UPI ID: <span style="color: var(--primary-color);">${upi.upi_id || 'freshsupermart@okaxis'}</span>
          </div>
          <div style="font-size: 1.35rem; font-weight: 800; color: var(--primary-color); margin-top: 0.5rem;">
            Amount: ${formatINR(grandTotal)}
          </div>
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button type="button" class="btn btn-primary" onclick="document.getElementById('pos-upi-counter-modal').classList.remove('active'); POSModule.processCheckout();">
            <i class="fa-solid fa-check"></i> Payment Received, Print Bill
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  function bindEvents() {
    const searchInput = document.getElementById('pos-search-input');
    const checkoutBtn = document.getElementById('pos-checkout-btn');
    const clearBtn = document.getElementById('pos-clear-btn');
    const discountSelect = document.getElementById('pos-discount-select');
    const paymentSelect = document.getElementById('pos-payment-method');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderPOSGrid(e.target.value);
      });
    }

    if (discountSelect) {
      discountSelect.addEventListener('change', (e) => {
        setDiscount(e.target.value);
      });
    }

    if (paymentSelect) {
      paymentSelect.addEventListener('change', (e) => {
        setPaymentMethod(e.target.value);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        cart = [];
        currentDiscount = 0;
        if (discountSelect) discountSelect.value = '0';
        renderCart();
        App.showToast('Cart cleared', 'info');
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', processCheckout);
    }
  }

  async function processCheckout() {
    if (cart.length === 0) {
      App.showToast('Cart is empty. Please add products to sell!', 'warning');
      return;
    }

    // If UPI selected and UPI counter modal not opened yet, open it
    if (paymentMethod === 'UPI / QR' && !document.getElementById('pos-upi-counter-modal')?.classList.contains('active')) {
      openPosUpiModal();
      return;
    }

    const subtotal = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity_sold), 0);
    const discountAmt = (subtotal * currentDiscount) / 100;
    const taxableSubtotal = Math.max(0, subtotal - discountAmt);
    const tax = taxableSubtotal * 0.05;
    const grandTotal = taxableSubtotal + tax;

    try {
      // Execute atomic transactional sale across all items
      const saleResult = await DB.processAtomicSale({
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_sold: item.quantity_sold,
          unit_price: item.unit_price
        })),
        payment_method: paymentMethod,
        cashier: App.getCurrentUser()?.name || 'Cashier Admin'
      });

      showReceiptModal({
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        paymentId: saleResult.payment?.payment_id || `PAY-POS-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString('en-IN'),
        cashier: App.getCurrentUser()?.name || 'Cashier Admin',
        items: [...cart],
        subtotal,
        discountAmt,
        tax,
        grandTotal,
        paymentMethod
      });

      cart = [];
      currentDiscount = 0;
      const discountSelect = document.getElementById('pos-discount-select');
      if (discountSelect) discountSelect.value = '0';
      renderCart();
      await App.refreshAllData();

    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  function showReceiptModal(receipt) {
    let receiptModal = document.getElementById('receipt-modal');
    if (!receiptModal) {
      receiptModal = document.createElement('div');
      receiptModal.id = 'receipt-modal';
      receiptModal.className = 'modal-overlay';
      document.body.appendChild(receiptModal);
    }

    receiptModal.innerHTML = `
      <div class="modal-container" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-receipt" style="color:var(--primary-color);"></i> Sales Receipt / Tax Invoice</h3>
          <button class="modal-close-btn" onclick="document.getElementById('receipt-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body" id="printable-receipt" style="font-family: inherit;">
          <div style="text-align: center; padding-bottom: 1rem; border-bottom: 2px dashed var(--border-color); margin-bottom: 1rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--primary-color); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <i class="fa-solid fa-basket-shopping"></i> FRESH SUPERMART
            </h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Shop #14, Main Market, MG Road, Bengaluru - 560001</p>
            <p style="font-size: 0.78rem; color: var(--text-muted);">GSTIN: 29ABCDE1234F1Z5 | Ph: +91 98765 43210</p>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.8rem; color: var(--text-secondary);">
            <div><strong>Invoice:</strong> ${receipt.invoiceNo}</div>
            <div><strong>Date:</strong> ${receipt.date}</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 1rem; color: var(--text-secondary);">
            <div><strong>Cashier:</strong> ${receipt.cashier || 'Admin'}</div>
            <div><strong>Payment Mode:</strong> <span class="badge" style="background: var(--primary-light); color: var(--primary-color);">${receipt.paymentMethod}</span></div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 1rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-secondary);">
                <th style="padding: 0.4rem 0;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(item => `
                <tr style="border-bottom: 1px dashed var(--border-color);">
                  <td style="padding: 0.4rem 0; font-weight: 500;">${item.product_name}</td>
                  <td style="text-align: center;">${item.quantity_sold} ${item.unit}</td>
                  <td style="text-align: right;">${formatINR(item.unit_price)}</td>
                  <td style="text-align: right; font-weight: 600;">${formatINR(item.unit_price * item.quantity_sold)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="border-top: 2px dashed var(--border-color); padding-top: 0.8rem; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span>Subtotal:</span>
              <span>${formatINR(receipt.subtotal)}</span>
            </div>
            ${receipt.discountAmt > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem; color: #16a34a;">
                <span>Discount (${currentDiscount}%):</span>
                <span>- ${formatINR(receipt.discountAmt)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
              <span>GST (5%):</span>
              <span>${formatINR(receipt.tax)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; color: var(--primary-color); border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.3rem;">
              <span>Grand Total:</span>
              <span>${formatINR(receipt.grandTotal)}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 1.5rem; font-size: 0.78rem; color: var(--text-muted);">
            Thank you for shopping with Fresh Supermart! Please visit again. 🙏
          </div>
        </div>
        <div class="modal-footer" style="gap: 0.75rem;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('receipt-modal').classList.remove('active')">Close</button>
          <button type="button" class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Invoice</button>
        </div>
      </div>
    `;

    receiptModal.classList.add('active');
    App.showToast('Sale completed successfully!', 'success');
  }

  return {
    init,
    updateProducts,
    addToCart,
    changeCartQty,
    removeCartItem,
    processCheckout
  };
})();
