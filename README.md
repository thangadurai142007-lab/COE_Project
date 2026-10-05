# Fresh Supermart – Production Grocery Inventory, POS & Online Shopping Management System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://coe-project-flax.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/thangadurai142007-lab/COE_Project)
[![Review 2 Report](https://img.shields.io/badge/Project%20Review-2%20Report%20(70%25)-orange?style=for-the-badge)](./PROJECT_REVIEW_2_REPORT.md)
[![Currency](https://img.shields.io/badge/Currency-INR%20(%E2%82%B9)-green?style=for-the-badge)](#)
[![HCD](https://img.shields.io/badge/Evaluation-Project%20Better%20Tomorrow-purple?style=for-the-badge)](#)

---

## 📋 Executive Overview & Qbee Review 1 Enhancements

Fresh Supermart is an end-to-end commercial grocery management and eCommerce platform specifically built for Indian retail supermarkets and local Kirana stores. Following the feedback from **Qbee AI Project Review 1**, the system has been upgraded to production-oriented stability:

1. **Secure UPI Payment Verification & Webhook Reconciliation**:
   - Eliminated reliance on static QR scan assumption. Customers must provide a 12-digit Bank UPI Reference (UTR), or use an explicitly labeled, isolated **🧪 Mock Payment Sandbox** for defense demonstrations.
   - Orders remain in `Pending Verification` until verified on the server or reconciled by the shopkeeper against bank statements.
   - Idempotent webhook receiver (`POST /api/payments/webhook`) prevents duplicate transaction processing.
2. **Atomic Inventory Concurrency & Race-Condition Locking**:
   - Implemented an atomic transactional mutex lock (`withAtomicTransaction` / `withTransactionLock`) preventing negative inventory when POS walk-in billing and customer online ordering compete for shared stock simultaneously.
   - Immediate rollback with clear shortage alerts: *"Sorry, only X units of [Product] are available."*
3. **Human-Centered Design ("Project Better Tomorrow")**:
   - Real-world **Shopkeeper Feedback Module** capturing store type, experience level, multi-point ratings (1–5), problems encountered, and suggestions.
   - Interactive **10-Task Usability Testing Checklist** with built-in stopwatch timer, task difficulty rating, and 1-click CSV/JSON export for academic evaluation.
   - Live **Concurrency Stress Test Simulator** proving transaction invariants.
> 📄 **Official Review Document**: Read the complete [Project Review 2 Report](./PROJECT_REVIEW_2_REPORT.md) detailing 70% milestone progress, Review 1 feedback resolution, and the Stage 3 completion roadmap.

---

## 🔑 Demo Credentials & Access

| Portal / Role | Access Method | Credentials |
|---|---|---|
| **🛍️ Customer Store** | Click **"🛍️ Customer Online Store"** in top bar | Public access (no login required) |
| **🏪 Admin Console** | Click **"🏪 Admin Console"** in top bar | **Role:** Admin / Staff<br>• Admin: `admin` / `password123`<br>• Staff: `staff` / `staff123` |
| **🔄 Reset Demo Data** | Top header: **"🔄 Reset Demo"** | Restores 20 realistic Indian grocery products, past sales, suppliers & sample orders |
| **🎟️ Discount Coupon** | Customer Cart slide-over drawer | Code: `FRESH10` (10% instant discount) |

---

## 🛠️ Architecture & System Design

```
Fresh Supermart Ecosystem
├── Public Frontend Client (public/)
│   ├── index.html             # Unified SPA hosting Customer Storefront & Admin Console
│   ├── css/style.css          # Commercial Grocery Green theme, Dark mode & responsive layouts
│   └── js/
│       ├── db.js              # Atomic transactional data engine with LocalStorage fallback
│       ├── customer.js        # Customer storefront, cart drawer, UTR checkout & 7-stage order tracking
│       ├── pos.js             # POS counter sales, barcode reader & dynamic UPI QR modal
│       ├── validation.js      # Project Better Tomorrow feedback, 10-task runner & concurrency test
│       ├── movement.js        # Fast/Slow/Non-moving product velocity analytics
│       ├── charts.js          # 5 interactive Chart.js visualizations
│       ├── reports.js         # Excel (.xlsx) and printable PDF reporting engine
│       └── app.js             # Main orchestrator, role permissions & global search
├── Server & API Layer
│   ├── server.js              # Express REST API with atomic mutex & payment reconciliation
│   ├── api/index.js           # Vercel Serverless Function entry point
│   ├── vercel.json            # Vercel deployment routing & rewrites
│   └── .env.example           # Production environment variable template
```

---

## 🔒 Security & Payment Verification Architecture

### 1. Payment Verification Flow
```
Customer Checkout ➔ Select UPI ➔ Counter QR Displayed ➔ Customer Pays in Bank App
   ➔ Enter 12-Digit Bank UTR ➔ Server-Side Format & Duplicate Check
   ➔ Payment Record Created (`PAY-XXXX`, Status: Pending)
   ➔ Reconciled via Webhook or Storekeeper Bank Audit ➔ Marked PAID
   ➔ Order Confirmed ➔ Tax Invoice Generated
```

- **Order-linked Payment Records**: Every order produces a linked `PAY-XXXX` transaction record.
- **UTR Format Enforcement**: Strict 12-digit numeric validation (`/^\d{12}$/`).
- **Duplicate Prevention**: UTRs are checked against previous paid transactions to prevent replay claims.
- **Idempotent Webhooks**: Handles payment gateway notifications without double-crediting or duplicate stock deductions.
- **🧪 Mock Payment Sandbox**: Clearly labeled demo widget (`Mock Success`, `Mock Bank Decline`, `Mock Timeout`) that is isolated from real payment processing.

---

## ⚡ Atomic Inventory Concurrency Invariants

When POS walk-in customers and web shoppers compete for limited stock:
1. **Mutex Lock Acquired**: `withAtomicTransaction(async () => ...)` locks the inventory resource.
2. **Pre-Validation**: Checks `current_stock >= requested_quantity` for **all** cart items.
3. **Commit or Rollback**:
   - If sufficient: Decrements stock atomically, creates sales and order records, commits transaction.
   - If insufficient: Aborts immediately, executes complete rollback with 0 side effects, and returns:
     > *"Sorry, only X units of [Product] are available."*
4. **Order Cancellation & Refund**: When an order is cancelled, stock is restored atomically exactly once.

---

## 📊 Human-Centered Design: 10-Task Usability Testing Checklist

The Admin **"Field Usability & HCD"** tab provides a practical testing runner for local store owners:

1. **Add a New Grocery Product** (Name, Category, Stock, Batch)
2. **Update Product Stock Level** (Using Stock Calculator or Edit modal)
3. **Search for a Product** (Barcode scan or keyword search)
4. **Create a POS Counter Bill** (Cart builder, GST, and printable tax invoice)
5. **Process a UPI Payment & Verify UTR** (QR display and 12-digit UTR reconciliation)
6. **Place a Customer Online Order** (Storefront browsing and coupon engine)
7. **Check Inventory After Sale** (Verify stock deduction without negative balance)
8. **Find Low-Stock & Expiring Products** (Dashboard alerts and < 30 days expiry countdown)
9. **Analyze Fast vs Non-Moving Products** (Product movement velocity classification)
10. **Generate & Export Sales / Stock Report** (SheetJS Excel `.xlsx` and PDF print)

Testers can record: Outcome (`Success` / `Partial` / `Failure`), Time Taken (via built-in stopwatch), User Difficulty Rating (1–5), and Feedback Notes. Results can be exported directly to **CSV** or **JSON**.

---

## 🚀 How to Run & Deploy

### Option 1: Local Development (Node.js Express)
```bash
git clone https://github.com/thangadurai142007-lab/COE_Project.git
cd COE_Project
npm install
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Live Vercel Deployment
The repository is pre-configured with `vercel.json` routing:
- Static assets served from `/public`
- Serverless API functions routed to `/api/index.js`

To deploy your own fork:
```bash
npm i -g vercel
vercel --prod
```

---

## 📄 License & Academic Attribution
Developed for college project defense and Project Better Tomorrow evaluation. Distributed under the MIT License.
