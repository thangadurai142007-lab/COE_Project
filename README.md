# Grocery Shop Inventory Calculator & Management Web Application

A modern, responsive, full-featured **Grocery Shop Inventory Calculator and Management System** built with Node.js, Express, HTML5, Vanilla CSS, JavaScript, Chart.js, SheetJS, and jsPDF.

---

## 🌟 Key Features

### 📊 1. Modern Admin Dashboard
- **Live Statistics Cards**: Total Products, Total Categories, Total Stock Quantity, Low Stock Alert Count, Out of Stock Count.
- **Inventory Summary by Category**: Live summary cards for spec categories (**Rice, Oil, Biscuits, Beverages, Vegetables, Fruits, Dairy, Snacks, Cleaning Products, Personal Care**).
- **Responsive Charts (Chart.js)**:
  - 🍕 **Pie Chart**: Category distribution breakdown.
  - 📊 **Bar Chart**: Stock level comparison against warning thresholds.
  - 📈 **Line Chart**: Monthly stock inflow vs quantity sold trend lines.

### 🧮 2. Interactive Stock Calculator
- Real-time stock computation when entering quantity sold or restocked.
- Displays:
  - Initial Stock
  - Remaining Stock
  - Stock Availability status badge
  - Visual Percentage Progress Bar
  - Low Stock warning when remaining stock drops below minimum threshold.
- *Example*: `Rice initial = 150 kg`, `Sold = 25 kg` $\rightarrow$ `Remaining = 125 kg (83% capacity, In Stock)`.

### 📦 3. Product & Category Management
- Auto Product ID, Product Name, Category, Brand, Purchase Price, Selling Price, Quantity, Unit (`Kg`, `Gram`, `Litre`, `ml`, `Packet`, `Bottle`, `Piece`), Barcode (auto-generated / custom), Expiry Date, Supplier Name, and Image preview.
- Category CRUD operations with pre-populated grocery categories.

### 🛒 4. POS & Quick Sales Counter
- Interactive product catalog & search.
- Live Cart builder with subtotal, tax (0%), and grand total calculations.
- Automatic stock deduction upon checkout.

### 📋 5. Report Generation & Export
- Generates:
  - Daily Stock Movement Report
  - Weekly Report
  - Monthly Valuation Report
  - Category-wise Breakdown Report
  - Low Stock Report
  - Out of Stock Report
- **1-Click Excel Export**: Downloads clean `.xlsx` spreadsheet using SheetJS.
- **1-Click PDF Export**: Clean printable PDF document layout.

### 🔔 6. Notifications & Theme
- Real-time notification badge for low stock items and out of stock warnings.
- Seamless **Light / Dark Mode Toggle** with CSS custom properties.

### 💾 7. Database Backup & Restore
- Download complete database as a formatted `JSON` backup file.
- Restore inventory state anytime by uploading a backup file.

---

## 🚀 How to Run the Application

### Option A: Running via Node.js Express Server
1. Open terminal in the project directory:
   ```bash
   npm install
   npm start
   ```
2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

### Option B: Running Standalone in Any Browser (Zero Node.js Dependency)
- Simply double-click or open `public/index.html` directly in any modern browser! The built-in LocalStorage fallback handles all data persistence automatically.

---

## 🔐 Default Admin Credentials
- **Username**: `DST`
- **Password**: `1234` (or `1234`)

---

## 📁 Project Structure

```
PST/
├── package.json               # Node.js configuration
├── server.js                  # Express REST API backend server
├── db_storage.json            # Auto-generated JSON database
├── README.md                  # System documentation
└── public/
    ├── index.html             # Main Single Page Application UI
    ├── css/
    │   └── style.css          # Grocery Green & White Theme & Dark mode styles
    └── js/
        ├── db.js              # REST API + LocalStorage sync layer
        ├── calculator.js      # Stock Calculator module
        ├── charts.js          # Chart.js visualization engine
        ├── reports.js         # Report generator (PDF & Excel export)
        ├── pos.js             # POS sales checkout module
        ├── barcode.js         # Barcode generator & scanner module
        └── app.js             # Main application controller
```
