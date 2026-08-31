/**
 * Dashboard Charts Module (Chart.js Integration)
 * Renders Pie Chart for Categories, Bar Chart for Stock Levels, Line Chart for Monthly Trends
 */
const AppCharts = (function () {
  let pieChartInstance = null;
  let barChartInstance = null;
  let lineChartInstance = null;

  function renderCharts(products, categories, sales) {
    renderCategoryPieChart(products, categories);
    renderStockLevelBarChart(products);
    renderMonthlyMovementLineChart(sales);
  }

  function renderCategoryPieChart(products, categories) {
    const canvas = document.getElementById('categoryPieChart');
    if (!canvas) return;

    // Group product counts by category
    const categoryCounts = {};
    categories.forEach(c => { categoryCounts[c.category_name] = 0; });
    products.forEach(p => {
      const catName = p.category_name || 'Other';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

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
          }
        }
      }
    });
  }

  function renderStockLevelBarChart(products) {
    const canvas = document.getElementById('stockBarChart');
    if (!canvas) return;

    // Sort products by stock quantity (Top 8)
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
            label: 'Current Stock',
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
          y: { grid: { color: '#e2e8f0' }, beginAtZero: true }
        }
      }
    });
  }

  function renderMonthlyMovementLineChart(sales) {
    const canvas = document.getElementById('movementLineChart');
    if (!canvas) return;

    // Aggregate sales data per month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlySales = Array(12).fill(0);
    const monthlyStockIn = [120, 150, 180, 140, 200, 220, 190, 210, 250, 230, 280, 300]; // Stock inflow baseline trend

    sales.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === currentYear) {
        monthlySales[d.getMonth()] += s.quantity_sold;
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
            label: 'Total Stock Inflow',
            data: monthlyStockIn,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Quantity Sold',
            data: monthlySales,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            fill: true,
            tension: 0.3
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
          y: { grid: { color: '#e2e8f0' }, beginAtZero: true }
        }
      }
    });
  }

  return {
    renderCharts
  };
})();
