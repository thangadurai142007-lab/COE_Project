/**
 * Dashboard Charts Module (Chart.js Integration)
 * Renders Pie Chart for Categories, Bar Chart for Stock Levels, Line Chart for Monthly Trends
 */
const AppCharts = (function () {
  let pieChartInstance = null;
  let barChartInstance = null;
  let lineChartInstance = null;

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderCharts(products, categories, sales) {
    renderCategoryPieChart(products, categories);
    renderStockLevelBarChart(products);
    renderMonthlyMovementLineChart(sales);
  }

  function renderCategoryPieChart(products, categories) {
    const canvas = document.getElementById('categoryPieChart');
    if (!canvas) return;

    const categoryValuations = {};
    categories.forEach(c => { categoryValuations[c.category_name] = 0; });
    products.forEach(p => {
      const catName = p.category_name || 'Other';
      categoryValuations[catName] = (categoryValuations[catName] || 0) + (p.quantity * p.selling_price);
    });

    const labels = Object.keys(categoryValuations);
    const data = Object.values(categoryValuations);

    const colors = [
      '#16a34a', '#22c55e', '#0284c7', '#38bdf8', '#a855f7',
      '#c084fc', '#f59e0b', '#fbbf24', '#ef4444', '#f87171'
    ];

    if (pieChartInstance) pieChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    pieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: 'transparent'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return ` ${label}: ${formatINR(value)}`;
              }
            }
          }
        }
      }
    });
  }

  function renderStockLevelBarChart(products) {
    const canvas = document.getElementById('stockBarChart');
    if (!canvas) return;

    const sorted = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 8);
    const labels = sorted.map(p => p.product_name.length > 15 ? p.product_name.substring(0, 14) + '...' : p.product_name);
    const quantities = sorted.map(p => p.quantity);
    const minLevels = sorted.map(p => p.min_stock_level);

    if (barChartInstance) barChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Current Stock (Units)',
            data: quantities,
            backgroundColor: '#16a34a',
            borderRadius: 6
          },
          {
            label: 'Min Warning Threshold',
            data: minLevels,
            backgroundColor: '#f59e0b',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(226, 232, 240, 0.4)' }, beginAtZero: true }
        }
      }
    });
  }

  function renderMonthlyMovementLineChart(sales) {
    const canvas = document.getElementById('movementLineChart');
    if (!canvas) return;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = Array(12).fill(0);
    const monthlyStockIn = [15000, 22000, 28000, 24000, 31000, 35000, 39000, 42000, 48000, 52000, 58000, 65000];

    sales.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === currentYear) {
        monthlyRevenue[d.getMonth()] += (s.total_price || 0);
      }
    });

    if (lineChartInstance) lineChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    lineChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthNames,
        datasets: [
          {
            label: 'Target Inventory Stock In (\u20B9)',
            data: monthlyStockIn,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Actual Sales Revenue (\u20B9)',
            data: monthlyRevenue,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${formatINR(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(226, 232, 240, 0.4)' }, beginAtZero: true }
        }
      }
    });
  }

  return {
    renderCharts
  };
})();
