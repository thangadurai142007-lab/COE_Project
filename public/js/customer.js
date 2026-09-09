/**
 * Fresh Supermart - Customer Online Shopping Portal Module
 * Handles storefront catalog, category browsing, cart drawer, wishlist,
 * coupon engine, checkout with UPI QR Scan, real-time order tracking & reviews
 */
const CustomerPortal = (function () {
  let products = [];
  let categories = [];
  let cart = [];
  let wishlist = [];
  let activeCategory = 'all';
  let activeSearch = '';
  let activeSort = 'featured';
  let appliedCoupon = null; // e.g. { code: 'FRESH10', discountPercent: 10 }
  let currentOrder = null;

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function init() {
    await refreshData();
    bindEvents();
    renderCategoriesNav();
    renderProducts();
    updateCartBadges();
    updateWishlistBadge();
  }

  async function refreshData() {
    products = await DB.getProducts();
    categories = await DB.getCategories();
    wishlist = await DB.getWishlist();
  }

  function renderCategoriesNav() {
    const container = document.getElementById('customer-category-chips');
    if (!container) return;

    let html = `
      <button class="cat-chip ${activeCategory === 'all' ? 'active' : ''}" onclick="CustomerPortal.selectCategory('all')">
        <i class="fa-solid fa-border-all"></i> All Products
      </button>
    `;

    const iconMap = {
      'Rice & Grains': 'fa-wheat-awn',
      'Atta & Flour': 'fa-bowl-rice',
      'Cooking Oil': 'fa-bottle-droplet',
      'Dairy': 'fa-cow',
      'Biscuits': 'fa-cookie',
      'Snacks': 'fa-burger',
      'Beverages': 'fa-mug-hot',
      'Personal Care': 'fa-soap',
      'Household': 'fa-house',
      'Cleaning Products': 'fa-spray-can-sparkles'
    };

    categories.forEach(cat => {
      const icon = iconMap[cat.category_name] || 'fa-tag';
      const isActive = activeCategory === cat.category_name ? 'active' : '';
      html += `
        <button class="cat-chip ${isActive}" onclick="CustomerPortal.selectCategory('${cat.category_name}')">
          <i class="fa-solid ${icon}"></i> ${cat.category_name}
        </button>
      `;
    });

    container.innerHTML = html;
  }

  function selectCategory(catName) {
    activeCategory = catName;
    renderCategoriesNav();
    renderProducts();
  }

  function renderProducts() {
    const grid = document.getElementById('customer-products-grid');
    if (!grid) return;

    let items = [...products];

    // Filter by Category
    if (activeCategory !== 'all') {
      items = items.filter(p => p.category_name === activeCategory);
    }

    // Filter by Search Query
    if (activeSearch) {
      const q = activeSearch.toLowerCase().trim();
      items = items.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q))
      );
    }

    // Sort items
    if (activeSort === 'price_low') {
      items.sort((a, b) => a.selling_price - b.selling_price);
    } else if (activeSort === 'price_high') {
      items.sort((a, b) => b.selling_price - a.selling_price);
    } else if (activeSort === 'rating') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (activeSort === 'discount') {
      items.sort((a, b) => {
        const discA = a.mrp ? (a.mrp - a.selling_price) / a.mrp : 0;
        const discB = b.mrp ? (b.mrp - b.selling_price) / b.mrp : 0;
        return discB - discA;
      });
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.4;"></i>
          <h3 style="color: var(--text-primary); font-size: 1.2rem; font-weight: 700;">No groceries found</h3>
          <p style="font-size: 0.9rem; margin-top: 0.3rem;">Try changing your search terms or filter criteria</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="CustomerPortal.clearFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => {
      const isWishlisted = wishlist.includes(p.id);
      const discountPercent = p.mrp && p.mrp > p.selling_price ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100) : 0;
      const isOutOfStock = p.quantity <= 0;
      const isLowStock = p.quantity > 0 && p.quantity <= p.min_stock_level;

      let stockTag = `<span class="c-stock-tag in-stock"><i class="fa-solid fa-circle-check"></i> In Stock (${p.quantity} ${p.unit})</span>`;
      if (isOutOfStock) {
        stockTag = `<span class="c-stock-tag out-stock"><i class="fa-solid fa-circle-xmark"></i> Out of Stock</span>`;
      } else if (isLowStock) {
        stockTag = `<span class="c-stock-tag low-stock"><i class="fa-solid fa-clock"></i> Only ${p.quantity} left!</span>`;
      }

      // Check current cart quantity
      const inCartItem = cart.find(i => i.product_id === p.id);
      const cartQty = inCartItem ? inCartItem.quantity : 0;

      return `
        <div class="c-product-card">
          <div class="c-card-img-box">
            ${discountPercent > 0 ? `<span class="c-discount-badge">${discountPercent}% OFF</span>` : ''}
            <button class="c-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="CustomerPortal.toggleWishlist(${p.id}, event)" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            <img src="${p.image_url}" alt="${p.product_name}" class="c-card-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=70'" onclick="CustomerPortal.showProductDetails(${p.id})">
          </div>

          <div class="c-card-body">
            <div class="c-card-category">${p.category_name}</div>
            <h4 class="c-card-title" onclick="CustomerPortal.showProductDetails(${p.id})" title="${p.product_name}">${p.product_name}</h4>
            
            <div class="c-card-rating">
              <span class="rating-stars"><i class="fa-solid fa-star"></i> ${p.rating || 4.8}</span>
              <span class="rating-count">(${p.reviews_count || 32} reviews)</span>
            </div>

            <div class="c-card-pricing">
              <span class="c-selling-price">${formatINR(p.selling_price)}</span>
              ${p.mrp && p.mrp > p.selling_price ? `<span class="c-mrp-price">${formatINR(p.mrp)}</span>` : ''}
              <span class="c-unit-label">/ ${p.unit}</span>
            </div>

            <div style="margin: 0.5rem 0;">
              ${stockTag}
            </div>

            <div class="c-card-actions">
              ${isOutOfStock ? `
                <button class="btn btn-secondary c-add-btn" disabled style="opacity: 0.6; cursor: not-allowed; width: 100%;">
                  Out of Stock
                </button>
              ` : cartQty > 0 ? `
                <div class="c-qty-counter">
                  <button class="c-qty-btn" onclick="CustomerPortal.changeCartQty(${p.id}, -1)">-</button>
                  <span class="c-qty-val">${cartQty}</span>
                  <button class="c-qty-btn" onclick="CustomerPortal.changeCartQty(${p.id}, 1)">+</button>
                </div>
              ` : `
                <button class="btn btn-primary c-add-btn" onclick="CustomerPortal.addToCart(${p.id})">
                  <i class="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function clearFilters() {
    activeCategory = 'all';
    activeSearch = '';
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) searchInput.value = '';
    renderCategoriesNav();
    renderProducts();
  }

  // Cart Functions
  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.quantity <= 0) {
      App.showToast(`${product.product_name} is currently out of stock!`, 'error');
      return;
    }

    const existing = cart.find(item => item.product_id === productId);
    if (existing) {
      if (existing.quantity + 1 > product.quantity) {
        App.showToast(`Only ${product.quantity} ${product.unit} available in stock!`, 'warning');
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({
        product_id: product.id,
        product_name: product.product_name,
        category_name: product.category_name,
        unit_price: product.selling_price,
        unit: product.unit,
        quantity: 1,
        image_url: product.image_url,
        max_stock: product.quantity
      });
    }

    App.showToast(`Added ${product.product_name} to cart!`, 'success');
    updateCartBadges();
    renderProducts();
    renderCartDrawer();
  }

  function changeCartQty(productId, delta) {
    const itemIndex = cart.findIndex(i => i.product_id === productId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      cart.splice(itemIndex, 1);
      App.showToast(`Removed from cart`, 'info');
    } else if (newQty > item.max_stock) {
      App.showToast(`Cannot exceed stock limit (${item.max_stock} ${item.unit})!`, 'warning');
      return;
    } else {
      item.quantity = newQty;
    }

    updateCartBadges();
    renderProducts();
    renderCartDrawer();
  }

  function removeCartItem(productId) {
    cart = cart.filter(i => i.product_id !== productId);
    updateCartBadges();
    renderProducts();
    renderCartDrawer();
    App.showToast(`Item removed from cart`, 'info');
  }

  function clearCart() {
    cart = [];
    appliedCoupon = null;
    updateCartBadges();
    renderProducts();
    renderCartDrawer();
  }

  function calculateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    let discount = 0;
    if (appliedCoupon) {
      discount = (subtotal * appliedCoupon.discountPercent) / 100;
    }
    const taxableSubtotal = Math.max(0, subtotal - discount);
    const gst = taxableSubtotal * 0.05; // 5% GST
    const deliveryFee = (subtotal > 500 || subtotal === 0) ? 0 : 30; // Free delivery over ₹500
    const grandTotal = taxableSubtotal + gst + deliveryFee;

    return {
      subtotal,
      discount,
      gst,
      deliveryFee,
      grandTotal,
      totalItems: cart.reduce((sum, i) => sum + i.quantity, 0)
    };
  }

  function updateCartBadges() {
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    document.querySelectorAll('.customer-cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  function openCartDrawer() {
    renderCartDrawer();
    const drawer = document.getElementById('customer-cart-drawer');
    const overlay = document.getElementById('customer-cart-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('show');
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('customer-cart-drawer');
    const overlay = document.getElementById('customer-cart-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

  function renderCartDrawer() {
    const itemsContainer = document.getElementById('cart-drawer-items');
    const summaryContainer = document.getElementById('cart-drawer-summary');
    if (!itemsContainer || !summaryContainer) return;

    if (cart.length === 0) {
      itemsContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-basket-shopping" style="font-size: 3.5rem; opacity: 0.3; margin-bottom: 1rem; color: var(--primary-color);"></i>
          <h4 style="font-weight: 700; color: var(--text-primary); font-size: 1.1rem;">Your shopping cart is empty</h4>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Explore fresh groceries and daily essentials to fill your basket!</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 1.2rem;" onclick="CustomerPortal.closeCartDrawer()">
            Start Shopping
          </button>
        </div>
      `;
      summaryContainer.innerHTML = '';
      return;
    }

    itemsContainer.innerHTML = cart.map(item => `
      <div class="c-cart-item-row">
        <img src="${item.image_url}" alt="${item.product_name}" class="c-cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=70'">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary);">${item.product_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">
            ${formatINR(item.unit_price)} &times; ${item.quantity} ${item.unit} = <strong>${formatINR(item.unit_price * item.quantity)}</strong>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <button class="c-qty-btn" onclick="CustomerPortal.changeCartQty(${item.product_id}, -1)">-</button>
          <span style="font-weight: 700; font-size: 0.9rem; min-width: 1.4rem; text-align: center;">${item.quantity}</span>
          <button class="c-qty-btn" onclick="CustomerPortal.changeCartQty(${item.product_id}, 1)">+</button>
          <button class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; margin-left: 0.25rem;" onclick="CustomerPortal.removeCartItem(${item.product_id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    const totals = calculateCartTotals();

    summaryContainer.innerHTML = `
      <!-- Coupon Section -->
      <div style="margin-bottom: 1rem; background: var(--bg-main); padding: 0.75rem; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
        <div style="display: flex; gap: 0.5rem;">
          <input type="text" id="cart-coupon-input" class="form-control" placeholder="Promo code (e.g. FRESH10)" value="${appliedCoupon ? appliedCoupon.code : ''}" ${appliedCoupon ? 'disabled' : ''} style="font-size: 0.82rem; text-transform: uppercase;">
          ${appliedCoupon ? `
            <button class="btn btn-secondary btn-sm" onclick="CustomerPortal.removeCoupon()">Remove</button>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="CustomerPortal.applyCoupon()">Apply</button>
          `}
        </div>
        ${appliedCoupon ? `
          <div style="font-size: 0.75rem; color: #16a34a; font-weight: 600; margin-top: 0.35rem;">
            <i class="fa-solid fa-tag"></i> Coupon ${appliedCoupon.code} applied (${appliedCoupon.discountPercent}% OFF)!
          </div>
        ` : `
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">
            Use coupon <strong>FRESH10</strong> for instant 10% discount on entire cart.
          </div>
        `}
      </div>

      <!-- Bill Breakdown -->
      <div style="font-size: 0.88rem;">
        <div class="calc-summary-row">
          <span class="calc-summary-label">Items Subtotal:</span>
          <span class="calc-summary-val">${formatINR(totals.subtotal)}</span>
        </div>
        ${totals.discount > 0 ? `
          <div class="calc-summary-row" style="color: #16a34a;">
            <span class="calc-summary-label" style="color: #16a34a;">Discount Savings:</span>
            <span class="calc-summary-val">- ${formatINR(totals.discount)}</span>
          </div>
        ` : ''}
        <div class="calc-summary-row">
          <span class="calc-summary-label">GST Tax (5%):</span>
          <span class="calc-summary-val">${formatINR(totals.gst)}</span>
        </div>
        <div class="calc-summary-row">
          <span class="calc-summary-label">Delivery Charges:</span>
          <span class="calc-summary-val">${totals.deliveryFee === 0 ? '<span style="color:#16a34a; font-weight:600;">FREE</span>' : formatINR(totals.deliveryFee)}</span>
        </div>
        <div class="calc-summary-row" style="border-bottom: none; padding-top: 0.8rem; margin-top: 0.4rem; border-top: 2px solid var(--border-color);">
          <span style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">Grand Total:</span>
          <span style="font-size: 1.35rem; font-weight: 800; color: var(--primary-color);">${formatINR(totals.grandTotal)}</span>
        </div>
      </div>

      <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem;">
        <button class="btn btn-secondary" style="flex: 1;" onclick="CustomerPortal.clearCart()">Clear Cart</button>
        <button class="btn btn-primary" style="flex: 2; font-size: 0.95rem; justify-content: center;" onclick="CustomerPortal.openCheckoutModal()">
          Proceed to Checkout <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
  }

  function applyCoupon() {
    const input = document.getElementById('cart-coupon-input');
    const code = (input?.value || '').trim().toUpperCase();
    if (!code) return;

    if (code === 'FRESH10') {
      appliedCoupon = { code: 'FRESH10', discountPercent: 10 };
      App.showToast('🎉 Coupon FRESH10 applied! 10% discount added.', 'success');
      renderCartDrawer();
    } else {
      App.showToast('Invalid promo code. Try using FRESH10', 'error');
    }
  }

  function removeCoupon() {
    appliedCoupon = null;
    App.showToast('Coupon removed', 'info');
    renderCartDrawer();
  }

  // Wishlist Functions
  async function toggleWishlist(productId, event) {
    if (event) event.stopPropagation();
    const res = await DB.toggleWishlist(productId);
    wishlist = res.wishlist;
    updateWishlistBadge();
    renderProducts();
    App.showToast(res.isWishlisted ? 'Added to your Wishlist ❤️' : 'Removed from Wishlist', 'info');
  }

  function updateWishlistBadge() {
    document.querySelectorAll('.customer-wishlist-count').forEach(el => {
      el.textContent = wishlist.length;
      el.style.display = wishlist.length > 0 ? 'inline-flex' : 'none';
    });
  }

  function openWishlistModal() {
    const modal = document.getElementById('customer-wishlist-modal');
    const container = document.getElementById('wishlist-modal-items');
    if (!modal || !container) return;

    const wishlistedProds = products.filter(p => wishlist.includes(p.id));

    if (wishlistedProds.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <i class="fa-regular fa-heart" style="font-size: 3rem; opacity: 0.3; margin-bottom: 0.8rem; color: #ef4444;"></i>
          <h4 style="font-weight: 700; color: var(--text-primary);">Your Wishlist is Empty</h4>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Tap the heart icon on any product to save it for later!</p>
        </div>
      `;
    } else {
      container.innerHTML = wishlistedProds.map(p => `
        <div class="c-cart-item-row" style="border-bottom: 1px solid var(--border-color); padding: 0.75rem 0;">
          <img src="${p.image_url}" alt="${p.product_name}" class="c-cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=70'">
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">${p.product_name}</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-color); margin-top: 0.2rem;">
              ${formatINR(p.selling_price)} / ${p.unit}
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="CustomerPortal.addToCart(${p.id})">
              <i class="fa-solid fa-cart-plus"></i> Move to Cart
            </button>
            <button class="btn btn-danger btn-sm" onclick="CustomerPortal.toggleWishlist(${p.id})">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  }

  // Checkout Flow
  async function openCheckoutModal() {
    if (cart.length === 0) {
      App.showToast('Your cart is empty. Add products to checkout!', 'warning');
      return;
    }
    closeCartDrawer();
    const modal = document.getElementById('customer-checkout-modal');
    if (!modal) return;

    // Load store payment settings (including uploaded UPI QR)
    const settings = await DB.getSettings();
    const upiSettings = settings.payment_settings || {};
    const totals = calculateCartTotals();

    // Populate checkout items summary
    const summaryBox = document.getElementById('checkout-order-summary');
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.6rem; color: var(--text-primary);">
            Order Overview (${totals.totalItems} items)
          </div>
          ${cart.map(item => `
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem; color: var(--text-secondary);">
              <span>${item.product_name} &times; ${item.quantity} ${item.unit}</span>
              <span><strong>${formatINR(item.unit_price * item.quantity)}</strong></span>
            </div>
          `).join('')}
          <div style="border-top: 1px dashed var(--border-color); margin-top: 0.5rem; padding-top: 0.5rem; display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; color: var(--primary-color);">
            <span>Payable Amount:</span>
            <span id="checkout-payable-amount">${formatINR(totals.grandTotal)}</span>
          </div>
        </div>
      `;
    }

    // Populate UPI QR Code Image and UPI ID
    const qrImg = document.getElementById('checkout-upi-qr-image');
    const qrUpiIdText = document.getElementById('checkout-upi-id-display');
    const qrAmountText = document.getElementById('checkout-upi-amount-display');

    if (qrImg) qrImg.src = upiSettings.upi_qr_image;
    if (qrUpiIdText) qrUpiIdText.textContent = upiSettings.upi_id || 'freshsupermart@okaxis';
    if (qrAmountText) qrAmountText.textContent = formatINR(totals.grandTotal);

    modal.classList.add('active');
  }

  async function processOrderSubmission(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('checkout-name')?.value.trim();
    const phone = document.getElementById('checkout-phone')?.value.trim();
    const email = document.getElementById('checkout-email')?.value.trim();
    const address = document.getElementById('checkout-address')?.value.trim();
    const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value || 'Home Delivery';
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'UPI';

    if (!name || !phone) {
      App.showToast('Please fill in your name and phone number', 'warning');
      return;
    }

    if (deliveryType === 'Home Delivery' && !address) {
      App.showToast('Please provide your delivery address', 'warning');
      return;
    }

    const totals = calculateCartTotals();

    try {
      const orderPayload = {
        customer_name: name,
        phone: phone,
        email: email,
        address: deliveryType === 'Home Delivery' ? address : 'Fresh Supermart Store Pickup Counter (Main Market)',
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'UPI' ? 'Pending Verification' : (paymentMethod === 'Cash on Delivery' ? 'Pay on Delivery' : 'Paid'),
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total: item.unit_price * item.quantity
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        gst: totals.gst,
        delivery_fee: deliveryType === 'Store Pickup' ? 0 : totals.deliveryFee,
        grand_total: deliveryType === 'Store Pickup' ? (totals.grandTotal - totals.deliveryFee) : totals.grandTotal
      };

      const createdOrder = await DB.createCustomerOrder(orderPayload);
      currentOrder = createdOrder;

      // Clear checkout & cart
      cart = [];
      appliedCoupon = null;
      updateCartBadges();
      renderProducts();

      // Close checkout modal
      document.getElementById('customer-checkout-modal')?.classList.remove('active');

      // Refresh admin dashboard & POS
      await App.refreshAllData();

      // Show Order Confirmation Modal
      showOrderConfirmationModal(createdOrder);

      App.showToast(`🎉 Order ${createdOrder.order_id} placed successfully!`, 'success');

    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  function showOrderConfirmationModal(order) {
    const modal = document.getElementById('order-confirmation-modal');
    if (!modal) return;

    document.getElementById('confirm-order-id').textContent = order.order_id;
    document.getElementById('confirm-total-amount').textContent = formatINR(order.grand_total);
    document.getElementById('confirm-payment-method').textContent = `${order.payment_method} (${order.payment_status})`;
    document.getElementById('confirm-delivery-type').textContent = order.delivery_type;

    if (order.pickup_code) {
      document.getElementById('confirm-pickup-code-box').style.display = 'block';
      document.getElementById('confirm-pickup-code').textContent = order.pickup_code;
    } else {
      document.getElementById('confirm-pickup-code-box').style.display = 'none';
    }

    modal.classList.add('active');
  }

  // Order Tracking Modal & Stepper
  function openOrderTrackingModal(orderId) {
    const modal = document.getElementById('order-tracking-modal');
    if (!modal) return;

    // Fetch order details
    DB.getCustomerOrders().then(orders => {
      const order = orders.find(o => o.order_id === orderId) || currentOrder || orders[0];
      if (!order) {
        App.showToast('No orders found to track', 'info');
        return;
      }

      currentOrder = order;
      document.getElementById('track-modal-order-id').textContent = order.order_id;
      document.getElementById('track-modal-customer').textContent = `${order.customer_name} (${order.phone})`;
      document.getElementById('track-modal-amount').textContent = formatINR(order.grand_total);
      document.getElementById('track-modal-delivery').textContent = order.delivery_type;
      document.getElementById('track-modal-payment').textContent = `${order.payment_method} - ${order.payment_status}`;

      // Update 7-Stage Stepper:
      // 1: Order Placed
      // 2: Payment Confirmed
      // 3: Order Confirmed
      // 4: Preparing
      // 5: Ready for Delivery / Pickup
      // 6: Out for Delivery
      // 7: Delivered
      const statusMap = {
        'New': 1,
        'Payment Verified': 2,
        'Confirmed': 3,
        'Preparing': 4,
        'Ready': 5,
        'Out for Delivery': 6,
        'Delivered': 7
      };

      let activeStep = statusMap[order.order_status] || 1;
      if (order.payment_status === 'Verified' && activeStep < 2) activeStep = 2;

      for (let s = 1; s <= 7; s++) {
        const stepEl = document.getElementById(`track-step-${s}`);
        if (stepEl) {
          if (s < activeStep) {
            stepEl.className = 'track-step completed';
          } else if (s === activeStep) {
            stepEl.className = 'track-step current';
          } else {
            stepEl.className = 'track-step pending';
          }
        }
      }

      modal.classList.add('active');
    });
  }

  // Product Details & Reviews Modal
  async function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-details-modal');
    if (!modal) return;

    const reviews = await DB.getReviews();
    const prodReviews = reviews.filter(r => r.product_id === product.id);

    document.getElementById('detail-modal-img').src = product.image_url;
    document.getElementById('detail-modal-name').textContent = product.product_name;
    document.getElementById('detail-modal-category').textContent = product.category_name;
    document.getElementById('detail-modal-price').textContent = formatINR(product.selling_price);
    document.getElementById('detail-modal-mrp').textContent = product.mrp ? formatINR(product.mrp) : '';
    document.getElementById('detail-modal-unit').textContent = `/ ${product.unit}`;
    document.getElementById('detail-modal-stock').textContent = `${product.quantity} ${product.unit} available`;
    document.getElementById('detail-modal-batch').textContent = product.batch_no || 'N/A';
    document.getElementById('detail-modal-expiry').textContent = product.expiry_date || 'N/A';
    document.getElementById('detail-modal-rating').textContent = `${product.rating || 4.8} ★ (${prodReviews.length} reviews)`;

    const reviewsList = document.getElementById('detail-modal-reviews-list');
    if (reviewsList) {
      if (prodReviews.length === 0) {
        reviewsList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding: 1rem 0;">No reviews yet. Be the first to review this product!</p>';
      } else {
        reviewsList.innerHTML = prodReviews.map(r => `
          <div style="border-bottom: 1px dashed var(--border-color); padding: 0.6rem 0; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
              <span>${r.customer_name}</span>
              <span style="color: #f59e0b;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            </div>
            <p style="color: var(--text-secondary); margin-top: 0.2rem;">${r.comment}</p>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${r.date}</div>
          </div>
        `).join('');
      }
    }

    // Bind Add to Cart from Detail Modal
    const addBtn = document.getElementById('detail-modal-add-btn');
    if (addBtn) {
      addBtn.onclick = () => {
        addToCart(product.id);
        modal.classList.remove('active');
      };
    }

    // Bind review form submit
    const reviewForm = document.getElementById('product-review-form');
    if (reviewForm) {
      reviewForm.onsubmit = async (e) => {
        e.preventDefault();
        const reviewerName = document.getElementById('review-input-name')?.value || 'Verified Shopper';
        const reviewerRating = document.getElementById('review-input-rating')?.value || 5;
        const reviewerComment = document.getElementById('review-input-comment')?.value || '';

        await DB.addReview({
          product_id: product.id,
          customer_name: reviewerName,
          rating: reviewerRating,
          comment: reviewerComment
        });

        App.showToast('Thank you! Your review has been submitted.', 'success');
        reviewForm.reset();
        await refreshData();
        renderProducts();
        showProductDetails(product.id);
      };
    }

    modal.classList.add('active');
  }

  // Customer Invoice Generation & Print
  function printCustomerInvoice(orderId) {
    DB.getCustomerOrders().then(orders => {
      const order = orders.find(o => o.order_id === orderId) || currentOrder;
      if (!order) return;

      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${order.order_id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 25px; color: #1e293b; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 15px; margin-bottom: 15px; }
            .header h2 { margin: 0; color: #16a34a; font-size: 24px; }
            .header p { margin: 3px 0; font-size: 13px; color: #64748b; }
            .details { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px; }
            th, td { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
            th { text-align: left; color: #64748b; border-bottom: 1px solid #cbd5e1; }
            .totals { border-top: 2px dashed #cbd5e1; padding-top: 10px; font-size: 14px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .grand-total { font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 8px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
            .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>FRESH SUPERMART</h2>
            <p>Shop #14, Main Market, MG Road, Bengaluru - 560001</p>
            <p>GSTIN: 29ABCDE1234F1Z5 | Phone: +91 98765 43210</p>
          </div>
          <div class="details">
            <div>
              <strong>Order ID:</strong> ${order.order_id}<br>
              <strong>Customer:</strong> ${order.customer_name}<br>
              <strong>Phone:</strong> ${order.phone}
            </div>
            <div style="text-align: right;">
              <strong>Date:</strong> ${new Date(order.date).toLocaleString('en-IN')}<br>
              <strong>Payment:</strong> ${order.payment_method} (${order.payment_status})<br>
              <strong>Delivery:</strong> ${order.delivery_type}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td style="text-align:center;">${item.quantity}</td>
                  <td style="text-align:right;">₹${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td style="text-align:right;">₹${parseFloat(item.total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            ${order.discount > 0 ? `
              <div class="totals-row" style="color:#16a34a;">
                <span>Discount Savings:</span>
                <span>- ₹${parseFloat(order.discount).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row">
              <span>GST (5%):</span>
              <span>₹${parseFloat(order.gst).toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Delivery Charges:</span>
              <span>₹${parseFloat(order.delivery_fee).toFixed(2)}</span>
            </div>
            <div class="totals-row grand-total">
              <span>Grand Total:</span>
              <span>₹${parseFloat(order.grand_total).toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            Thank you for shopping with Fresh Supermart! 🙏<br>
            For support contact care@freshsupermart.in
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    });
  }

  function bindEvents() {
    // Search input
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeSearch = e.target.value;
        renderProducts();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('customer-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderProducts();
      });
    }

    // Delivery Type radio change (toggle address vs pickup in checkout)
    document.querySelectorAll('input[name="delivery-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const addressGroup = document.getElementById('checkout-address-group');
        const deliveryChargeRow = document.getElementById('checkout-delivery-charge-row');
        if (e.target.value === 'Store Pickup') {
          if (addressGroup) addressGroup.style.display = 'none';
        } else {
          if (addressGroup) addressGroup.style.display = 'block';
        }
      });
    });

    // Payment method change in checkout (toggle UPI QR panel)
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const upiBox = document.getElementById('checkout-upi-qr-panel');
        if (upiBox) {
          upiBox.style.display = e.target.value === 'UPI' ? 'block' : 'none';
        }
      });
    });

    // Checkout form submission
    const checkoutForm = document.getElementById('customer-checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', processOrderSubmission);
    }
  }

  return {
    init,
    refreshData,
    selectCategory,
    clearFilters,
    addToCart,
    changeCartQty,
    removeCartItem,
    clearCart,
    openCartDrawer,
    closeCartDrawer,
    applyCoupon,
    removeCoupon,
    toggleWishlist,
    openWishlistModal,
    openCheckoutModal,
    showProductDetails,
    openOrderTrackingModal,
    printCustomerInvoice
  };
})();
