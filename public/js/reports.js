/**
 * Reports Module
 * Handles report generation, table rendering, and Excel/PDF exporting
 */
const InventoryReports = (function () {
  let currentReportData = [];
  let currentReportTitle = 'Daily Stock Report';

  function init() {
    bindEvents();
  }

  function bindEvents() {
    const reportTypeSelect = document.getElementById('report-type-select');
    const generateBtn = document.getElementById('btn-generate-report');
    const exportExcelBtn = document.getElementById('btn-export-excel');
    const exportPdfBtn = document.getElementById('btn-export-pdf');

    if (generateBtn) {
      generateBtn.addEventListener('click', generateReport);
    }

    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', exportToExcel);
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', exportToPDF);
    }
  }

  async function generateReport() {
    const typeSelect = document.getElementById('report-type-select');
    const type = typeSelect ? typeSelect.value : 'daily';

    const products = await DB.getProducts();
    const categories = await DB.getCategories();
    const sales = await DB.getSales();

    let filtered = [];
    const now = new Date();

    switch (type) {
      case 'daily':
        currentReportTitle = `Daily Inventory & Stock Movement Report (${now.toLocaleDateString()})`;
        filtered = products.map(p => {
          const todaySales = sales
            .filter(s => s.product_id == p.id && isSameDay(new Date(s.date), now))
            .reduce((sum, s) => sum + s.quantity_sold, 0);
          return {
            ID: p.id,
            Product: p.product_name,
            Category: p.category_name,
            Stock: p.quantity,
            Unit: p.unit,
            SoldToday: todaySales,
            Status: p.quantity === 0 ? 'Out of Stock' : (p.quantity <= p.min_stock_level ? 'Low Stock' : 'In Stock')
          };
        });
        break;

      case 'weekly':
        currentReportTitle = 'Weekly Stock Summary Report';
        filtered = products.map(p => {
          const weekSales = sales
            .filter(s => s.product_id == p.id && isWithinDays(new Date(s.date), 7))
            .reduce((sum, s) => sum + s.quantity_sold, 0);
          return {
            ID: p.id,
            Product: p.product_name,
            Category: p.category_name,
            Stock: p.quantity,
            Unit: p.unit,
            SoldLast7Days: weekSales,
            Valuation: `₹${(p.quantity * p.selling_price).toFixed(2)}`
          };
        });
        break;

      case 'monthly':
        currentReportTitle = 'Monthly Inventory Valuation Report';
        filtered = products.map(p => ({
          ID: p.id,
          Product: p.product_name,
          Category: p.category_name,
          PurchasePrice: `₹${p.purchase_price.toFixed(2)}`,
          SellingPrice: `₹${p.selling_price.toFixed(2)}`,
          StockQty: `${p.quantity} ${p.unit}`,
          TotalValue: `₹${(p.quantity * p.purchase_price).toFixed(2)}`,
          PotentialRevenue: `₹${(p.quantity * p.selling_price).toFixed(2)}`
        }));
        break;

      case 'category':
        currentReportTitle = 'Category-wise Stock Breakdown';
        const categoryMap = {};
        categories.forEach(c => {
          categoryMap[c.category_name] = { count: 0, stock: 0, items: [] };
        });
        products.forEach(p => {
          const catName = p.category_name || 'General';
          if (!categoryMap[catName]) categoryMap[catName] = { count: 0, stock: 0, items: [] };
          categoryMap[catName].count += 1;
          categoryMap[catName].stock += p.quantity;
        });

        filtered = Object.keys(categoryMap).map(cName => ({
          Category: cName,
          TotalProducts: categoryMap[cName].count,
          TotalStockUnits: categoryMap[cName].stock
        }));
        break;

      case 'low_stock':
        currentReportTitle = 'Low Stock Warning Report';
        filtered = products
          .filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level)
          .map(p => ({
            ID: p.id,
            Product: p.product_name,
            Category: p.category_name,
            CurrentStock: `${p.quantity} ${p.unit}`,
            MinThreshold: `${p.min_stock_level} ${p.unit}`,
            Supplier: p.supplier
          }));
        break;

      case 'out_of_stock':
        currentReportTitle = 'Out of Stock Alert Report';
        filtered = products
          .filter(p => p.quantity === 0)
          .map(p => ({
            ID: p.id,
            Product: p.product_name,
            Category: p.category_name,
            Status: 'OUT OF STOCK (0)',
            Supplier: p.supplier,
            ActionNeeded: 'Reorder Immediately'
          }));
        break;
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
      thead.innerHTML = '<tr><th>No Data</th></tr>';
      tbody.innerHTML = '<tr><td class="text-center">No records match the report criteria</td></tr>';
      return;
    }

    // Generate table headers
    const keys = Object.keys(data[0]);
    thead.innerHTML = `<tr>${keys.map(k => `<th>${k.replace(/([A-Z])/g, ' $1')}</th>`).join('')}</tr>`;

    // Generate rows
    tbody.innerHTML = data.map(row => {
      return `<tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>`;
    }).join('');
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

    // Print styled report window
    const printWin = window.open('', '_blank');
    const tableHTML = document.getElementById('report-table-container').innerHTML;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentReportTitle}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #1e293b; }
          h2 { color: #16a34a; margin-bottom: 5px; }
          p { color: #64748b; font-size: 14px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h2>Grocery Shop Inventory Calculator</h2>
        <p>${currentReportTitle}</p>
        ${tableHTML}
        <div class="footer">Generated on ${new Date().toLocaleString()} | Official Inventory Record</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  function isWithinDays(d, days) {
    const diff = (new Date().getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= days;
  }

  return {
    init,
    generateReport
  };
})();
