# PROJECT REVIEW – 2 REPORT

**Project Title:** Fresh Supermart – Grocery Inventory, POS & Online Shopping Management System  
**Review Stage:** Review – 2  
**Project Progress:** Approximately 70% Completed  
**Live Application:** [https://coe-project-flax.vercel.app/](https://coe-project-flax.vercel.app/)  
**GitHub Repository:** [https://github.com/thangadurai142007-lab/COE_Project](https://github.com/thangadurai142007-lab/COE_Project)  

---

## 1. Introduction

**Fresh Supermart** is a web-based supermarket management system developed to manage inventory, sales, billing, online orders, suppliers, and customer shopping in a single platform. The project combines a **Shop Management Console** with a **Customer Online Store** to deliver a unified, synchronized omnichannel retail experience for Indian grocery stores.

---

## 2. Review 1 Feedback

During Review 1, the following improvements were suggested by the evaluation panel:

1. **Improve UPI payment verification**: Transition away from static QR image assumptions.
2. **Prevent unverified order confirmation**: Require proof of payment before order fulfillment.
3. **Avoid stock errors during simultaneous sales**: Eliminate race conditions between POS billing and online checkout.
4. **Improve cancellation and stock restoration**: Ensure cancelled/refunded orders atomically return items to inventory.
5. **Add user validation and usability testing**: Implement human-centered field feedback and structured testing protocols.

---

## 3. Improvements Implemented in Review 2

### 1. Server-Side UPI Verification
A server-side payment verification system was added (`POST /api/payments/verify`). Customers submitting orders via UPI must submit their 12-digit numeric Bank Reference (UTR) number, and the system validates the payment details before confirming the order. An isolated, clearly labeled **🧪 Mock Payment Sandbox** was also introduced for college project defense demonstrations.

### 2. Duplicate Payment Protection
Duplicate UTR numbers and repeated payment events are actively verified against historical database records. Repeated submissions of the same UTR are rejected to prevent replay attacks and fraudulent order confirmation.

### 3. Webhook and Idempotency Support
A payment webhook endpoint (`POST /api/payments/webhook`) was added with idempotency handling. Webhook notification payloads are processed such that repeated delivery of the same transaction event does not trigger duplicate state transitions or duplicate stock adjustments.

### 4. Atomic Inventory Transactions
An atomic transaction mechanism (`withAtomicTransaction` / `withTransactionLock`) was implemented using an asynchronous mutex queue. All items in a shopping cart are validated against available stock simultaneously before any deduction occurs. If any item is insufficient, the transaction performs a complete rollback without side effects.

### 5. POS and Online Order Synchronization
Both POS sales counter operations and online customer orders run through the unified atomic transaction locking pipeline. This guarantees that simultaneous checkout attempts never cause negative stock or inventory discrepancies.

### 6. Order Cancellation and Stock Restoration
When an order is cancelled or refunded via the Admin Console (`POST /api/orders/:id/refund`), the purchased quantities of all line items are automatically and atomically credited back to inventory stock.

### 7. Concurrency Testing Module
A live interactive concurrency test module was added (`POST /api/inventory/test-concurrency` and UI runner in the Validation tab). The module simulates 5 simultaneous sales requests competing for limited stock, demonstrating real-time lock acquisition, safe rejection of excess requests, and non-negative stock invariants.

### 8. Customer & Shopkeeper Feedback System
A dedicated feedback module was added to collect real-world user experience data, evaluating:
- Ease of POS billing under rush hours
- Clarity of UPI QR payment reconciliation
- Accuracy of low-stock alerts and inventory tracking
- Friction points, qualitative comments, and feature suggestions

### 9. Usability Testing Module
A structured usability testing system was built containing a **10-Task Usability Testing Protocol** with a live stopwatch timer. Evaluators and participants can record task completion times (in seconds), rate task difficulty, record qualitative notes, and export benchmark data to **CSV** or **JSON**.

---

## 4. Existing Features Maintained

All existing core operational features were strictly preserved without regression:

- **Dashboard & Sales Analytics**: Real-time KPI metric cards, Chart.js visualizations, and smart reorder insights.
- **Product & Category Management**: 20 realistic Indian grocery seed items with batch numbers, expiry tracking, and category tags.
- **Inventory Management**: Real-time stock counts, safety thresholds, and health status indicators.
- **Stock Calculator**: Interactive unit and margin calculator for store staff.
- **POS Billing System**: Rapid item lookup, quantity adjustments, and cashier attribution.
- **Barcode Support**: Barcode lookup simulation and dynamic barcode rendering via JsBarcode.
- **GST & Discount Calculation**: Automatic CGST/SGST tax calculation and coupon engine (`FRESH10`).
- **Customer Online Shopping**: Responsive storefront, category filter chips, search highlights, and slide-over cart drawer.
- **Online Order Management**: Dedicated admin view with 7-stage visual order tracking stepper (`ORD-XXXX`).
- **Supplier Management & Purchase Orders**: Supplier directory, dynamic PO creation, and 1-click inventory receiving.
- **Sales History**: Auditable historical log of completed POS transactions and web orders.
- **Reports & Data Export**: Tabular reports with instant export to Excel (`.xlsx`) and printable PDF format.
- **Notifications**: Automated alert badge and dropdown for low stock items and pending orders.
- **Backup & Restore**: Full JSON database export, migration, and disaster recovery restore.
- **Printable Bills & Receipts**: Professional printable tax invoices with GSTIN, customer details, and store UPI QR code.

---

## 5. Review 1 Feedback vs Review 2 Implementation

| Review 1 Issue | Review 2 Improvement | Status |
|---|---|:---:|
| Static QR payment | Server-side UPI verification & UTR tracking | ✅ Resolved |
| Unverified orders | Payment reconciliation & pending status workflow | ✅ Resolved |
| Duplicate payments | UTR uniqueness check & webhook idempotency | ✅ Resolved |
| Stock race conditions | Queue-based atomic transaction mutex | ✅ Resolved |
| Negative stock | Pre-commit stock validation with rollback | ✅ Resolved |
| Cancellation stock errors | Automatic atomic stock restoration on refund | ✅ Resolved |
| No concurrency testing | Real-time 5-request concurrency stress test simulator | ✅ Resolved |
| Limited user validation | Shopkeeper field feedback survey modal | ✅ Resolved |
| No usability testing | 10-Task Usability Protocol with stopwatch & CSV/JSON export | ✅ Resolved |

---

## 6. Technical Stack & Architecture

- **Backend**: Node.js & Express.js REST API with Vercel Serverless Function entry point (`api/index.js`).
- **Frontend**: Responsive Single-Page Application (SPA) using HTML5, CSS3 (CSS Variables, Dark/Light mode), and Vanilla JavaScript (ES6+).
- **Concurrency & State Management**: Custom asynchronous mutex lock queue (`withTransactionLock`) and localStorage persistence with backward migration.
- **Visualization & Libraries**: Chart.js 4.4, SheetJS XLSX 0.18, JsBarcode 3.11, Font Awesome 6.4.
- **Deployment**: Vercel CI/CD pipeline integrated directly with GitHub `main` branch.

---

## 7. Current Status

The project has successfully progressed from a basic supermarket management application to a robust, enterprise-grade, integrated retail management platform. All critical architectural flaws flagged during Review 1 have been systematically resolved through payment reconciliation, atomic concurrency protection, cancellation handling, stress testing, and structured field usability testing.

**Current completion rate:** **Approximately 70%**.

---

## 8. Remaining Work (Stage 3 Roadmap)

The final 30% of the project will focus on:

1. **Real-World Shopkeeper / User Testing**: Field testing with local retail kirana store owners to gather additional evaluation responses.
2. **Production Payment Gateway Integration**: Optional live mode configuration for Razorpay / Cashfree / PayU in addition to the sandbox.
3. **Cryptographic Webhook Signature Verification**: HMAC-SHA256 signature verification for external gateway webhooks.
4. **Security Hardening**: Rate limiting (`express-rate-limit`), CORS security headers (`helmet`), and input sanitization.
5. **Database-Level Transaction Support**: Migration script and adapter for PostgreSQL / MongoDB multi-document ACID transactions.
6. **Performance & Stress Profiling**: Lighthouse optimization, asset minification, and latency benchmarking.
7. **Final UI/UX Refinements**: Polished mobile navigation gestures and offline indicator.
8. **Final Defense Preparation & Documentation**: Final thesis report, user manuals, and presentation slide deck.

---

## 9. Conclusion

During Review 2, **Fresh Supermart** was substantially upgraded based on the evaluation feedback from Review 1. The system now provides dependable payment verification, atomic inventory concurrency protection, automated order cancellation handling, live concurrency stress testing, and structured usability evaluation tools. With all major functional modules completed and validated, the project is well-positioned for the final stage of development, field validation, and final project defense.
