/**
 * Stock Calculator Module
 * Calculates stock remaining, stock availability percentage, valuation in INR, and low stock alerts in real-time
 */
const StockCalculator = (function () {
  let productsList = [];

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function init(products) {
    productsList = products;
    populateProductDropdown();
    bindEvents();
  }

  function updateProducts(products) {
    productsList = products;
    populateProductDropdown();
    recalculate();
  }

  function populateProductDropdown() {
    const select = document.getElementById('calc-product-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select a Grocery Product --</option>';

    productsList.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.product_name} (${p.quantity} ${p.unit} in stock - ${formatINR(p.selling_price)})`;
      select.appendChild(opt);
    });

    if (currentVal && productsList.some(p => p.id == currentVal)) {
      select.value = currentVal;
    }
  }

  function bindEvents() {
    const select = document.getElementById('calc-product-select');
    const inputQty = document.getElementById('calc-sold-qty');
    const actionSelect = document.getElementById('calc-action-type');
    const applyBtn = document.getElementById('calc-apply-btn');

    if (select) select.addEventListener('change', recalculate);
    if (inputQty) inputQty.addEventListener('input', recalculate);
    if (actionSelect) actionSelect.addEventListener('change', recalculate);

    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        const prodId = select.value;
        const qtyVal = parseFloat(inputQty.value) || 0;
        const action = actionSelect ? actionSelect.value : 'sell'; // 'sell' or 'add'

        if (!prodId) {
          App.showToast('Please select a product first', 'warning');
          return;
        }

        if (qtyVal <= 0) {
          App.showToast('Please enter a valid quantity greater than 0', 'warning');
          return;
        }

        const product = productsList.find(p => p.id == prodId);
        if (!product) return;

        if (action === 'sell') {
          if (product.quantity < qtyVal) {
            App.showToast(`Cannot sell ${qtyVal} ${product.unit}. Only ${product.quantity} ${product.unit} available!`, 'error');
            return;
          }
          try {
            await DB.recordSale({
              product_id: product.id,
              quantity_sold: qtyVal,
              unit_price: product.selling_price
            });
            App.showToast(`Successfully sold ${qtyVal} ${product.unit} of ${product.product_name} for ${formatINR(qtyVal * product.selling_price)}`, 'success');
          } catch (err) {
            App.showToast(err.message, 'error');
          }
        } else {
          // Add stock
          const newQty = product.quantity + qtyVal;
          await DB.updateProduct(product.id, { quantity: newQty });
          App.showToast(`Added ${qtyVal} ${product.unit} to ${product.product_name}. New stock: ${newQty} ${product.unit}`, 'success');
        }

        inputQty.value = '';
        await App.refreshAllData();
      });
    }
  }

  function setPresetQty(val) {
    const inputQty = document.getElementById('calc-sold-qty');
    if (!inputQty) return;
    const current = parseFloat(inputQty.value) || 0;
    inputQty.value = Math.max(0, current + val);
    recalculate();
  }

  function resetDisplay() {
    const initStock = document.getElementById('calc-initial-stock');
    const unitDisp = document.getElementById('calc-unit-display');
    const unitLbl = document.getElementById('calc-unit-label');
    const remStock = document.getElementById('calc-remaining-stock');
    const pctText = document.getElementById('calc-percentage-text');
    const fillBar = document.getElementById('calc-progress-fill');
    const badge = document.getElementById('calc-status-badge');
    const valBefore = document.getElementById('calc-val-before');
    const valAfter = document.getElementById('calc-val-after');
    const profitEst = document.getElementById('calc-profit-estimate');

    if (initStock) initStock.textContent = '-';
    if (unitDisp) unitDisp.textContent = '-';
    if (unitLbl) unitLbl.textContent = 'Unit';
    if (remStock) remStock.textContent = '-';
    if (pctText) pctText.textContent = '0%';
    if (fillBar) { fillBar.style.width = '0%'; fillBar.className = 'progress-bar-fill'; }
    if (badge) { badge.className = 'badge'; badge.textContent = 'Select Product'; }
    if (valBefore) valBefore.textContent = formatINR(0);
    if (valAfter) valAfter.textContent = formatINR(0);
    if (profitEst) profitEst.textContent = formatINR(0);
  }

  function recalculate() {
    const select = document.getElementById('calc-product-select');
    const inputQty = document.getElementById('calc-sold-qty');
    const actionSelect = document.getElementById('calc-action-type');

    if (!select || !select.value) {
      resetDisplay();
      return;
    }

    const prodId = select.value;
    const product = productsList.find(p => p.id == prodId);
    if (!product) return;

    const action = actionSelect ? actionSelect.value : 'sell';
    const delta = parseFloat(inputQty ? inputQty.value : 0) || 0;

    let remaining = product.quantity;
    if (action === 'sell') {
      remaining = Math.max(0, product.quantity - delta);
    } else {
      remaining = product.quantity + delta;
    }

    const maxCapacity = Math.max(product.quantity + 50, product.min_stock_level * 5, 100);
    const stockPercentage = Math.min(100, Math.round((remaining / maxCapacity) * 100));

    // Financial calculations
    const valueBefore = product.quantity * product.selling_price;
    const valueAfter = remaining * product.selling_price;
    const unitProfit = product.selling_price - product.purchase_price;
    const estimatedTransactionProfit = delta * unitProfit;

    // Update UI fields
    const initStock = document.getElementById('calc-initial-stock');
    const unitDisp = document.getElementById('calc-unit-display');
    const unitLbl = document.getElementById('calc-unit-label');
    const remStock = document.getElementById('calc-remaining-stock');
    const pctText = document.getElementById('calc-percentage-text');
    const valBefore = document.getElementById('calc-val-before');
    const valAfter = document.getElementById('calc-val-after');
    const profitEst = document.getElementById('calc-profit-estimate');

    if (initStock) initStock.textContent = `${product.quantity} ${product.unit}`;
    if (unitDisp) unitDisp.textContent = product.unit;
    if (unitLbl) unitLbl.textContent = product.unit;
    if (remStock) remStock.textContent = `${remaining} ${product.unit}`;
    if (pctText) pctText.textContent = `${stockPercentage}%`;

    if (valBefore) valBefore.textContent = formatINR(valueBefore);
    if (valAfter) valAfter.textContent = formatINR(valueAfter);
    if (profitEst) profitEst.textContent = formatINR(estimatedTransactionProfit);

    const fillBar = document.getElementById('calc-progress-fill');
    if (fillBar) {
      fillBar.style.width = `${stockPercentage}%`;
      fillBar.className = 'progress-bar-fill';
      if (remaining <= 0) {
        fillBar.classList.add('danger');
      } else if (remaining <= product.min_stock_level) {
        fillBar.classList.add('low');
      }
    }

    // Availability & Warning Badge
    const statusBadge = document.getElementById('calc-status-badge');
    if (statusBadge) {
      if (remaining <= 0) {
        statusBadge.className = 'badge badge-out-stock';
        statusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Out of Stock';
      } else if (remaining <= product.min_stock_level) {
        statusBadge.className = 'badge badge-low-stock';
        statusBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Low Stock Warning (< ${product.min_stock_level} ${product.unit})`;
      } else {
        statusBadge.className = 'badge badge-in-stock';
        statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Stock Available & Good';
      }
    }
  }

  return {
    init,
    updateProducts,
    setPresetQty
  };
})();
