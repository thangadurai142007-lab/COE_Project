/**
 * Fresh Supermart - Product Movement Analysis Module
 * Categorizes inventory into Fast-Moving 🔥, Slow-Moving 🐢, and Non-Moving ⚠️
 * With time filters (Today, 7 days, 30 days, 3 months) and movement charts
 */
const ProductMovement = (function () {
  let fastChartInstance = null;
  let slowChartInstance = null;
  let currentPeriod = '30d'; // 'today', '7d', '30d', '3m'

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function renderMovementAnalysis(period = '30d') {
    currentPeriod = period;
    const products = await DB.getProducts();
    const sales = await DB.getSales();

    const cutoffDate = getCutoffDate(period);
    const filteredSales = sales.filter(s => new Date(s.date) >= cutoffDate);

    // Aggregate sales per product
    const salesAgg = {};
    products.forEach(p => {
      salesAgg[p.id] = {
        product_id: p.id,
        product_name: p.product_name,
        category_name: p.category_name,
        current_stock: p.quantity,
        unit: p.unit,
        units_sold: 0,
        revenue: 0
      };
    });

    filteredSales.forEach(s => {
      if (salesAgg[s.product_id]) {
        salesAgg[s.product_id].units_sold += (s.quantity_sold || 0);
        salesAgg[s.product_id].revenue += (s.total_price || 0);
      }
    });

    const analysisList = Object.values(salesAgg);

    // Classify:
    // Fast Moving: units_sold >= 15 (or >= 5 if today/7d)
    // Slow Moving: units_sold > 0 && units_sold < 15
    // Non-Moving: units_sold === 0
    const fastThreshold = period === 'today' ? 3 : (period === '7d' ? 8 : 15);

    analysisList.forEach(item => {
      if (item.units_sold >= fastThreshold) {
        item.status = 'fast';
        item.statusLabel = '🔥 Fast Moving';
        item.badgeClass = 'badge-in-stock';
      } else if (item.units_sold > 0) {
        item.status = 'slow';
        item.statusLabel = '🐢 Slow Moving';
        item.badgeClass = 'badge-low-stock';
      } else {
        item.status = 'non_moving';
        item.statusLabel = '⚠️ Non-Moving';
        item.badgeClass = 'badge-out-stock';
      }
    });

    renderMovementTable(analysisList);
    renderMovementCharts(analysisList);
  }

  function getCutoffDate(period) {
    const now = new Date();
    if (period === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7d') {
      return new Date(now.getTime() - 7 * 86400000);
    } else if (period === '30d') {
      return new Date(now.getTime() - 30 * 86400000);
    } else if (period === '3m') {
      return new Date(now.getTime() - 90 * 86400000);
    }
    return new Date(now.getTime() - 30 * 86400000);
  }

  function renderMovementTable(list) {
    const tbody = document.getElementById('movement-table-body');
    if (!tbody) return;

    // Sort by units sold descending
    const sorted = [...list].sort((a, b) => b.units_sold - a.units_sold);

    tbody.innerHTML = sorted.map(item => `
      <tr>
        <td><strong>${item.product_name}</strong></td>
        <td><span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color);">${item.category_name}</span></td>
        <td><strong style="color:var(--primary-color); font-size:1rem;">${item.units_sold}</strong> ${item.unit}</td>
        <td><strong>${item.current_stock}</strong> ${item.unit}</td>
        <td><strong style="color:var(--text-primary);">${formatINR(item.revenue)}</strong></td>
        <td><span class="badge ${item.badgeClass}">${item.statusLabel}</span></td>
      </tr>
    `).join('');
  }

  function renderMovementCharts(list) {
    // Top 5 Fast Moving
    const fastItems = [...list].filter(i => i.units_sold > 0).sort((a, b) => b.units_sold - a.units_sold).slice(0, 5);
    const slowItems = [...list].filter(i => i.units_sold > 0).sort((a, b) => a.units_sold - b.units_sold).slice(0, 5);

    const fastCanvas = document.getElementById('topFastMovingChart');
    if (fastCanvas && typeof Chart !== 'undefined') {
      if (fastChartInstance) fastChartInstance.destroy();
      const ctx = fastCanvas.getContext('2d');
      fastChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: fastItems.map(i => i.product_name.length > 16 ? i.product_name.slice(0, 15) + '...' : i.product_name),
          datasets: [{
            label: 'Units Sold',
            data: fastItems.map(i => i.units_sold),
            backgroundColor: '#16a34a',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    const slowCanvas = document.getElementById('topSlowMovingChart');
    if (slowCanvas && typeof Chart !== 'undefined') {
      if (slowChartInstance) slowChartInstance.destroy();
      const ctx = slowCanvas.getContext('2d');
      slowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: slowItems.map(i => i.product_name.length > 16 ? i.product_name.slice(0, 15) + '...' : i.product_name),
          datasets: [{
            label: 'Units Sold',
            data: slowItems.map(i => i.units_sold),
            backgroundColor: '#f59e0b',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }

  return {
    renderMovementAnalysis
  };
})();
