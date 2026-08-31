/**
 * Reports Module
 * Handles report generation, table rendering, and Excel/PDF exporting
 */
const InventoryReports = (function () {
  let currentReportData = [];
  let currentReportTitle = 'Daily Stock Report';

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

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  function isWithinDays(d1, days) {
    const diff = Date.now() - d1.getTime();
    return diff <= (days * 86400000);
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
        currentReportTitle = `Daily Inventory & Stock Movement Report (${now.toLocaleDateString('en-IN')})`;
        filtered = products.map(p => {
          const todaySales = sales
            .filter(s => s.product_id == p.id && isSameDay(new Date(s.date), now))
            .reduce((sum, s) => sum + s.quantity_sold, 0);
          return {
            ID: `#${p.id}`,
            Product: p.product_name,
            Category: p.category_name || 'N/A',
            CurrentStock: `${p.quantity} ${p.unit}`,
            SoldToday: `${todaySales} ${p.unit}`,
            StockValuation: formatINR(p.quantity * p.selling_price),
            Status: p.quantity === 0 ? 'Out of Stock' : (p.quantity <= p.min_stock_level ? 'Low Stock' : 'In Stock')
          };
        });
        break;

      case 'weekly':
        currentReportTitle = 'Weekly Inventory Valuation & Sales Summary';
        filtered = products.map(p => {
          const weekSales = sales
            .filter(s => s.product_id == p.id && isWithinDays(new Date(s.date), 7))
            .reduce((sum, s) => sum + s.quantity_sold, 0);
          return {
            ID: `#${p.id}`,
            Product: p.product_name,
            Category: p.category_name || 'N/A',
            Stock: `${p.quantity} ${p.unit}`,
            SoldLast7Days: `${weekSales} ${p.unit}`,
            TotalValuation: formatINR(p.quantity * p.selling_price)
          };
        });
        break;

      case 'monthly':
        currentReportTitle = 'Monthly Inventory & Financial Valuation Report';
        filtered = products.map(p => ({
          ID: `#${p.id}`,
          Product: p.product_name,
          Category: p.category_name || 'N/A',
          PurchasePrice: formatINR(p.purchase_price),
          SellingPrice: formatINR(p.selling_price),
          StockQty: `${p.quantity} ${p.unit}`,
          TotalCostValue: formatINR(p.quantity * p.purchase_price),
          PotentialRevenue: formatINR(p.quantity * p.selling_price),
          ExpectedProfit: formatINR(p.quantity * (p.selling_price - p.purchase_price))
        }));
        break;

      case 'category':
        currentReportTitle = 'Category-wise Inventory & Stock Breakdown';
        const categoryMap = {};
        categories.forEach(c => {
          categoryMap[c.category_name] = { count: 0, stock: 0, costVal: 0, sellVal: 0 };
        });
        products.forEach(p => {
          const catName = p.category_name || 'General';
          if (!categoryMap[catName]) categoryMap[catName] = { count: 0, stock: 0, costVal: 0, sellVal: 0 };
          categoryMap[catName].count += 1;
          categoryMap[catName].stock += p.quantity;
          categoryMap[catName].costVal += (p.quantity * p.purchase_price);
          categoryMap[catName].sellVal += (p.quantity * p.selling_price);
        });

        filtered = Object.keys(categoryMap).map(cName => ({
          Category: cName,
          TotalProducts: categoryMap[cName].count,
          TotalStockUnits: `${Math.round(categoryMap[cName].stock)} units`,
          TotalCostValuation: formatINR(categoryMap[cName].costVal),
          TotalSellingValuation: formatINR(categoryMap[cName].sellVal)
        }));
        break;

      case 'low_stock':
        currentReportTitle = 'Low Stock Warning & Reorder Report';
        filtered = products
          .filter(p => p.quantity > 0 && p.quantity <= p.min_stock_level)
          .map(p => ({
            ID: `#${p.id}`,
            Product: p.product_name,
            Category: p.category_name || 'N/A',
            CurrentStock: `${p.quantity} ${p.unit}`,
            MinThreshold: `${p.min_stock_level} ${p.unit}`,
            Supplier: p.supplier || 'N/A',
            Action: 'Restock Required'
          }));
        break;

      case 'out_of_stock':
        currentReportTitle = 'Out of Stock Critical Alert Report';
        filtered = products
          .filter(p => p.quantity === 0)
          .map(p => ({
            ID: `#${p.id}`,
            Product: p.product_name,
            Category: p.category_name || 'N/A',
            Status: 'OUT OF STOCK (0)',
            Supplier: p.supplier || 'N/A',
            Urgency: 'CRITICAL - REORDER IMMEDIATELY'
          }));
        break;
    }

    currentReportData = filtered;
    renderReportTable(filtered);
    App.showToast(`Generated ${currentReportTitle}`, 'info');
  }

  function renderReportTable(data) {
    const titleEl = document.getElementById('report-display-title');
    const thead = document.getElementById('report-table-head');
    const tbody = document.getElementById('report-table-body');

    if (titleEl) titleEl.textContent = currentReportTitle;
    if (!thead || !tbody) return;

    if (!data || data.length === 0) {
      thead.innerHTML = '<tr><th>Status</th></tr>';
      tbody.innerHTML = '<tr><td style="text-align: center; padding: 2rem; color: var(--text-muted);">No records found for this report.</td></tr>';
      return;
    }

    const keys = Object.keys(data[0]);
    thead.innerHTML = `<tr>${keys.map(k => `<th>${k.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}</tr>`;

    tbody.innerHTML = data.map(row => {
      return `<tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>`;
    }).join('');
  }

  function exportToExcel() {
    if (!currentReportData || currentReportData.length === 0) {
      App.showToast('Please generate a report first before exporting!', 'warning');
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(currentReportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Report');

      const filename = `${currentReportTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, filename);
      App.showToast(`Exported report to Excel: ${filename}`, 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      App.showToast('Failed to export to Excel', 'error');
    }
  }

  function exportToPDF() {
    if (!currentReportData || currentReportData.length === 0) {
      App.showToast('Please generate a report first before printing!', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    const tableHTML = document.getElementById('report-table-container').outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentReportTitle}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; }
          h2 { color: #16a34a; font-size: 20px; margin-bottom: 5px; }
          p { color: #64748b; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h2>Fresh Supermart - Official Inventory Report</h2>
        <p>Report: <strong>${currentReportTitle}</strong> | Generated on: ${new Date().toLocaleString('en-IN')}</p>
        ${tableHTML}
        <div class="footer">Confidential &copy; Fresh Supermart Grocery Inventory Management System</div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  return {
    init,
    generateReport
  };
})();
