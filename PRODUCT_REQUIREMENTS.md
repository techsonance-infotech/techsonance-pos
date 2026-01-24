# Product Requirements Document (PRD): SyncServe POS Expansion

## 1. Executive Summary
This document outlines the roadmap for evolving SyncServe POS into a comprehensive, AI-powered platform tailored for the Food & Beverage industry (Restaurants, KOTs, Cloud Kitchens). The goal is to transition from a basic single-store POS to a scalable, multi-tenant SaaS solution with tiered pricing (Basic, Pro, Enterprise) and advanced automation capabilities.

## 2. Target Audience
*   **Restaurants (Dine-in)**: Focus on table management, captain ordering, and billing.
*   **Cloud Kitchens**: Focus on aggregator integration (Zomato/Swiggy), fast KDS (Kitchen Display System), and rider tracking.
*   **Kiosks / QSR**: Focus on speed, self-service, and inventory tracking.

## 3. Pricing & Plan Structure

### **3.1 Basic Plan (Solo Entrepreneur)**
*   **Target**: Small Cafes, Single Food Trucks.
*   **Cost**: Affordable monthly subscription.
*   **Limits**:
    *   **Stores**: 1 Single Store.
    *   **Users**: Up to 3 Staff accounts.
*   **Features**:
    *   Basic Billing & Invoicing (GST compliant).
    *   Menu Management (Categories, Products, Addons).
    *   Table Management (Simple View).
    *   Offline Support (Local SQLite sync).
    *   Basic Reports (Daily Sales).

### **3.2 Pro Plan (Growth)**
*   **Target**: Multi-outlet Restaurants, Growing Cloud Kitchens.
*   **Cost**: Mid-tier subscription.
*   **Limits**:
    *   **Stores**: Up to 3 Stores.
    *   **Users**: Unlimited Staff.
*   **Features (Everything in Basic +):**
    *   **Multi-Store Dashboard**: Centralized reporting for all 3 outlets.
    *   **Inventory Management (Recipe Based)**: Track raw materials, auto-deduct stock based on orders.
    *   **Kitchen Display System (KDS)**: Digital screen for kitchen staff to see and manage tickets.
    *   **Aggregator Integration**: Direct integration with Zomato/Swiggy (via middleware or direct API).
    *   **Role-Based Access Control (RBAC)**: Fine-grained permissions (Manager, Captain, Chef, Cashier).
    *   **Customer Loyalty**: Basic points system and CRM.

### **3.3 Enterprise Plan (Scale)**
*   **Target**: Large Chains, Franchises.
*   **Cost**: Custom Dynamic Pricing (Contact Sales).
*   **Limits**:
    *   **Stores**: Unlimited (Custom Quota).
    *   **Users**: Unlimited.
*   **Features (Everything in Pro +):**
    *   **Central Kitchne Management**: Hub-and-spoke inventory model (CK to Outlet transfer).
    *   **Franchise Management**: Royalty tracking, master menu control with price overrides per region.
    *   **White Labeling**: Custom domain, branding on receipts and app.
    *   **API Access**: For custom ERP integrations (SAP, Oracle).
    *   **Dedicated Support**: SLA-backed support.
    *   **AI Suite Access**: Full access to advanced AI tools.

---

## 4. Core Modules & Functionality Details

### **4.1 Omni-Channel Service Modes**
*   **Dine-In (Table Service)**:
    *   **Interactive Table Map**: Drag-and-drop table layout. Real-time status (Occupied, Reserved, Bill Printed, Cleaning).
    *   **Captain App**: Dedicated POV for waiters. Supports "Hold & Fire" (send appetizers now, mains later).
    *   **Split Billing**: Split by seat, split by item, or split equally (Dutch).

### 4.2 QR Table Ordering (Contactless Dining)
*   **Scan & Order**: Unique QR code per table (e.g., Table 5). Parameters passed in URL open the specific table's session.
*   **Digital Menu**:
    *   **DynamicSync**: Items marked "Out of Stock" on POS instantly disappear from QR menu.
    *   **Rich Media**: High-res images and descriptions for every dish.
    *   **Dietary Filters**: Customers can filter by "Veg", "Vegan", "Gluten-Free".
*   **Cart & Checkout**:
    *   **Direct-to-Kitchen**: Confirmed orders print directly to KOT printers bar/kitchen.
    *   **Pay-at-Table**: Integration with Razorpay/PhonePe to pay bill without waiting for waiter.
*   **Service Requests**:
    *   **"Call Waiter" Button**: Triggers notification on Captain App / POS.
    *   **"Request Water/Cutlery"**: Specific quick-actions.
*   **Post-Dining**:
    *   **Feedback Form**: 5-star rating prompt after payment.
    *   **Gamification**: "Spin the Wheel" for a discount on next visit (Loyalty hook).

*   **Takeaway / QSR (Quick Service)**:
    *   **Customer Facing Display (CFD)**: Second screen showing order details and QR for payment to customer.
    *   **Self-Service Kiosks**: Tablet mode for customers to punch orders themselves.
    *   **Order Status Screen**: "Preparing" vs "Ready to Collect" TV interface for waiting areas.

*   **Delivery (Hybrid)**:
    *   **Aggregator Hub**: Manage Zomato/Swiggy/UberEats from one screen.
    *   **Own Fleet Management**: Assign orders to internal riders. Track rider location via GPS link.
    *   **Heatmaps**: Visualize which delivery zones generate most revenue.

### **4.2 Inventory & Recipe Management**
*   **Raw Material Tracking**: Define ingredients (e.g., Cheese, Dough, Tomato).
*   **Recipes**: Map Products to Ingredients (e.g., 1 Margerhita Pizza = 200g Dough + 50g Cheese).
*   **Auto-Deduction**: Real-time stock usage on every sale.
*   **Central Kitchen (CK) Module**:
    *   **Indent Management**: Outlets request stock, CK approves and dispatches.
    *   **Wastage Analysis**: Track "Spillage" vs "Yield" to find kitchen inefficiencies.
*   **Purchase Orders (PO)**: Generate POs for vendors.

### **4.3 CRM & Logic (Loyalty)**
*   **Wallet System**: Prepaid customer wallets (load ₹1000, get ₹1200).
*   **Tiered Membership**: Silver/Gold/Platinum logic based on yearly spend.

### 4.4 Table Reservation & Host Management
*   **Booking Engine**: Accept reservations via Phone, Web Widget, or directly at Host Stand.
*   **Smart Allocation**: Auto-suggests tables based on party size (e.g., Don't put a couple on a 6-top).
*   **Waitlist Management**: SMS/WhatsApp alerts to guests when their table is ready. "Your table at SyncServe is ready!"
*   **Deposit Integration**: Configuration to ask for ₹500 deposit for large groups to prevent no-shows.
*   **Guest History**: Host sees "VIP - Likes Window Seat" notes when booking.

### 4.5 Subscription & License Automation
*   **Payment Gateway Integration**:
    *   **Razorpay/Stripe**: Secure checkout for Plan Upgrades (PRO/Enterprise).
    *   **Auto-Renewal**: Recurring billing setup.
*   **Instant Provisioning Workflow**:
    1.  **Payment Success**: Webhook triggers backend.
    2.  **License Generation**: System generates a cryptographically signed License Key (valid for 1 Year/Lifetime).
    3.  **Auto-Email**: Send "Welcome to Pro" email with License Key and Invoice attached to Business Owner.
    4.  **Zero-Touch Activation**: If paying from within the app, the license is auto-applied without manual copy-paste.
*   **Grace Period Handling**: If renewal fails, downgrade to "Read-Only" mode after 7 days grace period.

---

## 5. Advanced AI & Machine Learning Suite

### **5.1 AI Menu Engineer & Recommendation Engine**
*   **Smart Upsell**: Suggests pairings to Cashier/Captain. "Customer ordered Burger? Prompt for Fries." (Market Basket Analysis).
*   **Menu Optimization**: Classification of items into:
    *   *Stars*: Keep & Promote.
    *   *Dogs*: Remove from menu.
    *   *Puzzles*: High profit but low sales (needs marketing).
*   **Dynamic Pricing (Yield Management)**: Auto-enable "Happy Hour" discounts on digital menus when occupancy drop below 20%.

### **5.2 Predictive Operations (Forecasting)**
*   **Staff Scheduling**: AI predicts footfall for "Next Friday Night" based on historical data + local events + weather, suggesting optimal staff headcount to prevent over/under-staffing.
*   **Prep Prediction**: "Thaw 20kg Chicken today because you sell ~40 Butter Chickens on Tuesdays."

### **5.3 Refund & Theft Detection (Anomaly Detection)**
*   **Sweethearting Alerts**: Flags instances where a cashier voids items frequently for specific customers (friends/family).
*   **Void Analysis**: Notifications if "Void after Print" exceeds 5% of daily sales.

### **5.4 Sentiment Intelligence (Review Management)**
*   **Aggregated Sentiment**: Scrapes Google Maps/Zomato reviews.
*   **Actionable Insights**: AI summarizes feedback (e.g., "30% of reviews this week mention 'Cold Soup' - Check Kitchen Warmer").
*   **Auto-Reply**: Drafts AI responses to reviews for Manager approval.

### **5.5 Voice & Vision AI**
*   **Phone Order Bot**: Voice AI agent to answer calls during peak hours, take simple orders, and punch them into POS.
*   **Camera Analytics**: (Future) Use CCTV to count current occupancy and expected wait times.

### 4.6 Offline Architecture (Critical)
*   **Offline-First Design**:
    *   **Local Storage**: Browser IndexedDB / Electron SQLite stores orders when offline.
    *   **Sync Queue**: Auto-retry mechanism with exponential backoff when internet returns.
    *   **Conflict Resolution**: "Server Wins" policy for pricing; "Client Wins" for new orders to prevent data loss.
*   **Performance Targets**:
    *   **POS Response**: <300ms for UI actions.
    *   **Order Completion**: <30 seconds per order.
    *   **KDS Latency**: <2 seconds from POS to Kitchen Screen.

---

## 5. Advanced AI & Machine Learning Suite (The "Smart" Layer)

### 5.1 AI/ML Product Vision
*   **Goal**: Evolve from transactional POS to intelligent operations platform.
*   **Business Impact Targets**:
    *   Reduce ingredient wastage by 10-25%.
    *   Reduce stock-outs by 30%.
    *   Increase AOV (Average Order Value) by 5-15% via upsells.

### 5.2 Phase 1: AI-Ready Foundation (Rule-Based Intelligence)
Before deploying heavy ML models, we explicitly capture clean data and provide rule-based insights:
*   **Data Pipeline (Mandatory)**: Structured logging of Orders, Kitchen Timestamps (Prep/Ready), Inventory Movements, and Refund/Void events.
*   **Smart Insights (Non-ML)**: 
    *   "Low stock risk items" (Velocity based).
    *   "High discount cashier alert" (Threshold based).
    *   "Top 10 items today" (Aggregation).

### 5.3 Phase 2: Core ML Implementation
*   **Demand Forecasting**:
    *   Predictions for Item/Outlet demand (Next 1/7/30 days).
    *   Inputs: Historical sales, Seasonality, Holidays.
    *   Output: Staff planning advice & Prep plans.
*   **Smart Inventory Replenishment**:
    *   Auto-generate Purchase Drafts (PO) based on forecast vs lead time.
    *   Safety Stock calculation to prevent stockouts.
*   **Menu Engineering**:
    *   Profitability Matrix: Classification into Stars (Keep), Plowhorses (Reprice), Puzzles (Market), Dogs (Remove).
    *   Actions: Suggest price increases or bundle offers.
*   **Fraud & Anomaly Detection**:
    *   Events: Excessive discounts, High void rate, "No-sale" drawer openings.
    *   Action: Real-time alerts to owner app.

### 5.4 Phase 3: Advanced Cognitive Features
*   **Kitchen SLA Prediction**:
    *   Predict wait times based on active queue load.
    *   Identify bottlenecks (Grill vs Fryer).
*   **Dynamic Pricing**: Yield management suggestions (e.g., Happy Hour during low occurency).
*   **Customer Churn Prediction**: RFM (Recency-Frequency-Monetary) analysis to identify at-risk VIPs.

### 5.5 AI UI/UX Requirements
*   **Explainability**: "Suggested reorder: 20kg chicken because usage is 2.8kg/day & lead time is 3 days." (Build trust).
*   **POS Upsell**: "Frequently bought together" prompts for cashiers.
*   **Offline Compatibility**: Models run on last-synced data; Recommendations cached locally.

---

## 6. Technical & Architectural Changes
*   [Retaining existing Architecture sections 6.1 - 6.2]
*   **Security Standards**:
    *   **Encryption**: TLS 1.3 for all data in transit.
    *   **Audit Trails**: Immutable logs for every financial action (Void/Refund/Discount).
    *   **Role-Based Access (RBAC)**: Granular permissions (e.g., "Can View Reports" but "Cannot Download").

---

## 7. Success Metrics (KPIs)
*   **Operational**:
    *   30% reduction in billing time.
    *   50% reduction in order errors (wrong item/table).
    *   20% reduction in inventory variance (theft/wastage).
*   **System**:
    *   99.5% Uptime Guarantee.
    *   <2 sec POS-to-KDS delivery time.

## 8. MVP Delivery Plan (Sprint Roadmap)
*   **Sprint 1-2**: Auth, Multi-Tenant Setup, Role Management, Menu Masters.
*   **Sprint 3-4**: Core POS Billing (Dine-in/Takeaway), Tax Engine, Receipt Printing.
*   **Sprint 5**: Table Management, Kitchen Printing (KOT).
*   **Sprint 6**: Omni-Channel Modes (Delivery/QR), KDS V1.
*   **Sprint 7**: Basic Inventory (Stock In/Out), Purchase Orders.
*   **Sprint 8**: Reporting Dashboard, Shift Closures.
*   **Sprint 9-10**: AI Suite Integration, Offline Sync Hardening.
*   **Sprint 11-12**: UAT, Load Testing, Subscription Gateway Integration.
