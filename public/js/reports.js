/**
 * Fresh Supermart - Professional Reports & Data Export Module
 * Generates Sales Reports, Inventory Reports, Profit Reports,
 * and Product Movement Reports with Excel (.xlsx) and PDF/Print exports
 */
const InventoryReports = (function () {
  let currentReportData = [];
  let currentReportTitle = 'Daily Sales & Movement Report';

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function init() {
    bindEvents();
  }

  function bindEvents() {
    const generateBtn = document.getElementById('btn-generate-report');
    const exportExcelBtn = document.getElementById('btn-export-excel');
    const exportPdfBtn = document.getElementById('btn-export-pdf');

    if (generateBtn) generateBtn.addEventListener('click', generateReport);
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
  }

  async function generateReport() {
    const typeSelect = document.getElementById('report-type-select');
    const type = typeSelect ? typeSelect.value : 'sales';

    const products = await DB.getProducts();
    const categories = await DB.getCategories();
    const sales = await DB.getSales();
    const customerOrders = await DB.getCustomerOrders();

    let filtered = [];
    const now = new Date();

    switch (type) {
      case 'sales': {
        currentReportTitle = `Sales Performance Audit Report (${now.toLocaleDateString('en-IN')})`;
        const totalSalesVal = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const avgBill = sales.length > 0 ? (totalSalesVal / sales.length) : 0;

        filtered = sales.map(s => ({
          TransactionID: `#${s.id}`,
          Source: s.source ? s.source.toUpperCase() : 'POS',
          Product: s.product_name,
          Category: s.category_name,
          QtySold: s.quantity_sold,
          UnitPrice: formatINR(s.unit_price),
          TotalPrice: formatINR(s.total_price),
          EstimatedProfit: formatINR(s.profit || (s.total_price * 0.18)),
          Payment: s.payment_method || 'Cash',
          DateTime: new Date(s.date).toLocaleString('en-IN')
        }));
        break;
      }

      case 'inventory': {
        currentReportTitle = 'Complete Inventory Valuation & Stock Health Report';
        filtered = products.map(p => {
          let stockStatus = 'Healthy In-Stock';
          if (p.quantity <= 0) stockStatus = 'CRITICAL: OUT OF STOCK';
          else if (p.quantity <= p.min_stock_level) stockStatus = 'LOW STOCK WARNING';

          return {
            ProductID: `#${p.id}`,
            ProductName: p.product_name,
            Category: p.category_name,
            CurrentStock: `${p.quantity} ${p.unit}`,
            MinThreshold: `${p.min_stock_level} ${p.unit}`,
            PurchasePrice: formatINR(p.purchase_price),
            SellingPrice: formatINR(p.selling_price),
            TotalValuation: formatINR(p.quantity * p.selling_price),
            Supplier: p.supplier,
            ExpiryDate: p.expiry_date || 'N/A',
            Status: stockStatus
          };
        });
        break;
      }

      case 'profit': {
        currentReportTitle = 'Gross Profit & Margin Analysis Report';
        filtered = products.map(p => {
          const marginPerUnit = p.selling_price - p.purchase_price;
          const marginPercent = p.selling_price > 0 ? ((marginPerUnit / p.selling_price) * 100).toFixed(1) + '%' : '0%';
          const potentialTotalProfit = p.quantity * marginPerUnit;

          return {
            ProductID: `#${p.id}`,
            Product: p.product_name,
            Category: p.category_name,
            CostPrice: formatINR(p.purchase_price),
            SellingPrice: formatINR(p.selling_price),
            UnitMargin: formatINR(marginPerUnit),
            MarginRate: marginPercent,
            StockInHand: `${p.quantity} ${p.unit}`,
            PotentialTotalProfit: formatINR(potentialTotalProfit)
          };
        });
        break;
      }

      case 'movement': {
        currentReportTitle = 'Product Movement Report (Fast, Slow & Non-Moving)';
        const salesAgg = {};
        products.forEach(p => {
          salesAgg[p.id] = { name: p.product_name, category: p.category_name, stock: p.quantity, unit: p.unit, sold: 0, revenue: 0 };
        });
        sales.forEach(s => {
          if (salesAgg[s.product_id]) {
            salesAgg[s.product_id].sold += (s.quantity_sold || 0);
            salesAgg[s.product_id].revenue += (s.total_price || 0);
          }
        });

        filtered = Object.values(salesAgg).map(i => {
          let classification = '⚠️ Non-Moving';
          if (i.sold >= 15) classification = '🔥 Fast Moving';
          else if (i.sold > 0) classification = '🐢 Slow Moving';

          return {
            Product: i.name,
            Category: i.category,
            UnitsSold: `${i.sold} ${i.unit}`,
            CurrentStock: `${i.stock} ${i.unit}`,
            TotalRevenue: formatINR(i.revenue),
            Classification: classification
          };
        });
        break;
      }

      case 'orders': {
        currentReportTitle = 'Customer Online Orders Log Report';
        filtered = customerOrders.map(o => ({
          OrderID: o.order_id,
          Customer: o.customer_name,
          Phone: o.phone,
          DeliveryType: o.delivery_type,
          PaymentMode: o.payment_method,
          PaymentStatus: o.payment_status,
          OrderStatus: o.order_status,
          TotalAmount: formatINR(o.grand_total),
          Date: new Date(o.date).toLocaleString('en-IN')
        }));
        break;
      }

      default:
        filtered = [];
    }

    currentReportData = filtered;
    renderReportTable(filtered);
    App.showToast(`Generated ${currentReportTitle}`, 'info');
  }

  function renderReportTable(data) {
    const titleEl = document.getElementById('report-display-title');
    if (titleEl) titleEl.textContent = currentReportTitle;

    const tbody = document.getElementById('report-table-body');
    const thead = document.getElementById('report-table-head');
    if (!tbody || !thead) return;

    if (!data || data.length === 0) {
      thead.innerHTML = '<tr><th>No Records</th></tr>';
      tbody.innerHTML = '<tr><td style="text-align: center; padding: 2rem; color: var(--text-muted);">No records found for selected report criteria.</td></tr>';
      return;
    }

    const keys = Object.keys(data[0]);
    thead.innerHTML = `<tr>${keys.map(k => `<th>${k.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}</tr>`;

    tbody.innerHTML = data.map(row => `
      <tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>
    `).join('');
  }

  function exportToExcel() {
    if (!currentReportData || currentReportData.length === 0) {
      App.showToast('No report data available to export', 'warning');
      return;
    }

    try {
      if (typeof XLSX !== 'undefined') {
        const worksheet = XLSX.utils.json_to_sheet(currentReportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        const filename = `${currentReportTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        XLSX.writeFile(workbook, filename);
        App.showToast('Excel report downloaded successfully!', 'success');
      } else {
        App.showToast('SheetJS Excel library loading...', 'info');
      }
    } catch (err) {
      App.showToast('Failed to export Excel: ' + err.message, 'error');
    }
  }

  function exportToPDF() {
    if (!currentReportData || currentReportData.length === 0) {
      App.showToast('No report data available to export', 'warning');
      return;
    }

    const printWin = window.open('', '_blank');
    const tableHTML = document.getElementById('report-table-container').innerHTML;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentReportTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1e293b; }
          h2 { color: #16a34a; margin-bottom: 5px; }
          p { color: #64748b; font-size: 14px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h2>Fresh Supermart - Official Inventory & Audit System</h2>
        <p>${currentReportTitle}</p>
        ${tableHTML}
        <div class="footer">Generated on ${new Date().toLocaleString('en-IN')} | Verified Commercial Inventory Record</div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  return {
    init,
    generateReport
  };
})();
