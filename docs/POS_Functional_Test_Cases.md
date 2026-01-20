# POS Functional Test Cases

## Document Info
- **Version:** 1.0
- **Created:** 2026-01-20
- **Application:** Techsonance POS
- **Total Test Cases:** 100

---

## 1. LOGIN & ROLES MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-LR-001 | Valid login with admin credentials | App launched, user not logged in | Email: admin@test.com, Pass: Admin@123 | 1. Enter email 2. Enter password 3. Click Login | User redirected to dashboard with admin access | High | Positive | Yes |
| TC-LR-002 | Valid login with cashier credentials | App launched, user not logged in | Email: cashier@test.com, Pass: Cash@123 | 1. Enter email 2. Enter password 3. Click Login | User redirected to POS screen with limited access | High | Positive | Yes |
| TC-LR-003 | Login with invalid email format | App launched | Email: invalidformat, Pass: Test@123 | 1. Enter invalid email 2. Enter password 3. Click Login | Error: "Please enter a valid email address" | High | Negative | Yes |
| TC-LR-004 | Login with incorrect password | App launched | Email: admin@test.com, Pass: WrongPass | 1. Enter correct email 2. Enter wrong password 3. Click Login | Error: "Invalid credentials" | High | Negative | Yes |
| TC-LR-005 | Login with empty credentials | App launched | Email: empty, Pass: empty | 1. Leave fields empty 2. Click Login | Error: "Email and password are required" | High | Negative | Yes |
| TC-LR-006 | Account lockout after 5 failed attempts | App launched | Invalid credentials x5 | 1. Enter wrong password 5 times | Account locked, message: "Account locked. Contact admin" | High | Security | Yes |
| TC-LR-007 | Session timeout after inactivity | User logged in, idle for 30 min | Session timeout: 30 mins | 1. Login 2. Stay idle for 30 mins | Auto logout with message "Session expired" | High | Security | Yes |
| TC-LR-008 | Admin can access user management | Admin logged in | Admin account | 1. Navigate to Settings 2. Click User Management | User management page loads successfully | High | Positive | Yes |
| TC-LR-009 | Cashier cannot access user management | Cashier logged in | Cashier account | 1. Try to navigate to User Management | Access denied or menu not visible | High | Negative | Yes |
| TC-LR-010 | Password field masked | App launched | Password: Test@123 | 1. Enter password in field | Password displayed as dots/asterisks | Medium | Positive | Yes |
| TC-LR-011 | Remember me functionality | App launched | Valid credentials with Remember Me | 1. Check Remember Me 2. Login 3. Close app 4. Reopen | User auto-logged in | Medium | Positive | Yes |
| TC-LR-012 | Logout functionality | User logged in | Active session | 1. Click Logout | User logged out, redirected to login page | High | Positive | Yes |

---

## 2. PRODUCT SEARCH & SCAN BARCODE MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-PS-001 | Search product by name | User logged in, products exist | Product: "Coca Cola" | 1. Enter "Coca Cola" in search 2. Press Enter | Product(s) matching name displayed | High | Positive | Yes |
| TC-PS-002 | Search product by SKU | User logged in, products exist | SKU: "SKU-001234" | 1. Enter SKU in search 2. Press Enter | Exact product displayed | High | Positive | Yes |
| TC-PS-003 | Search product by barcode manually | User logged in | Barcode: "8901234567890" | 1. Enter barcode in search 2. Press Enter | Matching product displayed | High | Positive | Yes |
| TC-PS-004 | Scan barcode with scanner | Scanner connected, products exist | Valid barcode product | 1. Focus on search field 2. Scan barcode | Product auto-added to cart | High | Positive | No |
| TC-PS-005 | Search non-existent product | User logged in | Product: "InvalidProduct123" | 1. Enter non-existent product name 2. Search | Message: "No products found" | Medium | Negative | Yes |
| TC-PS-006 | Scan invalid/unregistered barcode | Scanner connected | Invalid barcode | 1. Scan unregistered barcode | Error: "Product not found" | High | Negative | No |
| TC-PS-007 | Search with special characters | User logged in | Search: "@#$%^&*" | 1. Enter special characters 2. Search | Handled gracefully, no crash | Medium | Boundary | Yes |
| TC-PS-008 | Search performance under 2 seconds | 10000+ products in database | Product name | 1. Search for product | Results displayed within 2 seconds | High | Performance | Yes |
| TC-PS-009 | Barcode scan speed test | Scanner connected | 10 barcodes | 1. Scan 10 products consecutively | All products added within 5 seconds total | High | Performance | No |
| TC-PS-010 | Partial product name search | User logged in | Product partial: "Coc" | 1. Enter "Coc" in search | All products containing "Coc" displayed | Medium | Positive | Yes |
| TC-PS-011 | Category filter after search | User logged in | Category: "Beverages" | 1. Search product 2. Apply category filter | Only filtered category products shown | Medium | Positive | Yes |
| TC-PS-012 | Search empty string | User logged in | Search: "" | 1. Click search with empty field | All products displayed or prompt message | Low | Boundary | Yes |

---

## 3. CART / BILLING MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-CB-001 | Add product to cart | User logged in, product exists | Product: Cola $2.50 | 1. Search product 2. Click Add to Cart | Product added, cart shows 1 item @ $2.50 | High | Positive | Yes |
| TC-CB-002 | Add multiple quantities | Product in cart | Qty: 5 | 1. Update quantity to 5 | Cart shows 5 items, total updated | High | Positive | Yes |
| TC-CB-003 | Remove product from cart | Product in cart | - | 1. Click remove button on item | Item removed, total recalculated | High | Positive | Yes |
| TC-CB-004 | Increase quantity with + button | Product in cart | Starting qty: 1 | 1. Click + button | Quantity increases to 2, total updated | High | Positive | Yes |
| TC-CB-005 | Decrease quantity with - button | Product in cart, qty: 3 | Starting qty: 3 | 1. Click - button twice | Quantity decreases to 1, total updated | High | Positive | Yes |
| TC-CB-006 | Quantity cannot go below 1 | Product in cart, qty: 1 | Qty: 1 | 1. Click - button | Quantity stays at 1 or item removed | Medium | Boundary | Yes |
| TC-CB-007 | Maximum quantity limit | Product in cart | Qty: 999999 | 1. Enter very large quantity | Error or limit enforced (e.g., max 999) | Medium | Boundary | Yes |
| TC-CB-008 | Cart total calculation | Multiple products | 3x$10 + 2x$5 | 1. Add products | Total = $40 (before tax) | High | Positive | Yes |
| TC-CB-009 | Empty cart message | User logged in | Empty cart | 1. View cart with no items | Message: "Cart is empty" | Medium | Positive | Yes |
| TC-CB-010 | Clear entire cart | Multiple items in cart | - | 1. Click "Clear Cart" | All items removed, cart empty | High | Positive | Yes |
| TC-CB-011 | Add out-of-stock product | Product with 0 inventory | OOS Product | 1. Try to add out of stock product | Error: "Product out of stock" | High | Negative | Yes |
| TC-CB-012 | Negative quantity input | Product in cart | Qty: -5 | 1. Enter -5 in quantity field | Error or value rejected | High | Negative | Yes |
| TC-CB-013 | Cart persists during session | Items in cart | Multiple items | 1. Navigate away 2. Return to cart | Cart items still present | Medium | Positive | Yes |
| TC-CB-014 | Apply customer to order | Cart has items | Customer: John Doe | 1. Click Add Customer 2. Select customer | Customer attached to order | Medium | Positive | Yes |

---

## 4. DISCOUNTS & PROMOTIONS MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-DP-001 | Apply percentage discount | Items in cart ($100) | Discount: 10% | 1. Click Apply Discount 2. Enter 10% | Total reduced to $90 | High | Positive | Yes |
| TC-DP-002 | Apply fixed amount discount | Items in cart ($100) | Discount: $15 | 1. Apply $15 discount | Total reduced to $85 | High | Positive | Yes |
| TC-DP-003 | Apply valid coupon code | Items in cart | Code: "SAVE20" | 1. Enter coupon code 2. Apply | 20% discount applied | High | Positive | Yes |
| TC-DP-004 | Apply invalid/expired coupon | Items in cart | Code: "EXPIRED123" | 1. Enter invalid code 2. Apply | Error: "Invalid or expired coupon" | High | Negative | Yes |
| TC-DP-005 | Discount exceeds cart total | Cart total $10 | Discount: $50 | 1. Try to apply $50 discount | Error or limited to cart total | High | Boundary | Yes |
| TC-DP-006 | Discount requires manager approval | Cart $100, discount > 20% | Discount: 50% | 1. Apply 50% discount | Prompt for manager PIN/approval | High | Positive | Yes |
| TC-DP-007 | BOGO promotion auto-applied | Eligible product in cart | Buy 1 Get 1 Free product | 1. Add 2 qualifying products | Second product automatically free | High | Positive | Yes |
| TC-DP-008 | Loyalty points discount | Customer with 500 points | Redeem 100 points | 1. Add customer 2. Redeem points | Points deducted, discount applied | Medium | Positive | Yes |
| TC-DP-009 | Cashier applies unauthorized discount | Cashier logged in | Discount > threshold | 1. Apply high discount | Access denied or requires approval | High | Security | Yes |
| TC-DP-010 | Multiple discounts stacking | Items in cart | 10% off + coupon | 1. Apply 10% 2. Apply coupon | Both applied correctly or error if not allowed | Medium | Positive | Yes |
| TC-DP-011 | Audit log for discount approval | Manager approves discount | Approval data | 1. Apply discount 2. Manager approves | Audit log records approver, time, amount | High | Positive | Yes |
| TC-DP-012 | Remove applied discount | Discount applied | - | 1. Click remove discount | Discount removed, total recalculated | Medium | Positive | Yes |

---

## 5. TAXES MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-TX-001 | Tax calculated on subtotal | Items $100, Tax 8% | Tax rate: 8% | 1. Add items to cart | Tax = $8, Total = $108 | High | Positive | Yes |
| TC-TX-002 | Tax-exempt product | Exempt product in cart | Essential goods | 1. Add tax-exempt item | No tax applied to item | High | Positive | Yes |
| TC-TX-003 | Tax-exempt customer | Exempt customer | Tax ID verified | 1. Add exempt customer 2. Checkout | No tax on entire order | High | Positive | Yes |
| TC-TX-004 | Multiple tax rates | Products with different taxes | 5% and 18% GST items | 1. Add both items | Each taxed correctly, total accurate | High | Positive | Yes |
| TC-TX-005 | Tax on discounted amount | $100 item, 10% discount, 8% tax | After discount | 1. Apply discount 2. Check tax | Tax = 8% of $90 = $7.20 | High | Positive | Yes |
| TC-TX-006 | Tax display on receipt | Completed transaction | - | 1. Complete sale 2. View receipt | Tax amount clearly displayed | High | Positive | Yes |
| TC-TX-007 | CGST/SGST split display | GST applicable | 9% CGST + 9% SGST | 1. Add item 2. Check breakdown | CGST and SGST shown separately | Medium | Positive | Yes |
| TC-TX-008 | Tax rounding precision | Items causing fractional tax | Tax = $7.876 | 1. Calculate tax | Properly rounded to 2 decimals | High | Boundary | Yes |

---

## 6. PAYMENTS MODULE

### 6.1 CASH PAYMENTS

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-PC-001 | Pay exact cash amount | Cart total $50 | Cash: $50 | 1. Select Cash 2. Enter $50 3. Complete | Payment successful, no change | High | Positive | Yes |
| TC-PC-002 | Pay with extra cash (change due) | Cart total $45.50 | Cash: $50 | 1. Select Cash 2. Enter $50 3. Complete | Change: $4.50 displayed | High | Positive | Yes |
| TC-PC-003 | Insufficient cash amount | Cart total $50 | Cash: $40 | 1. Select Cash 2. Enter $40 | Error: "Insufficient amount" | High | Negative | Yes |
| TC-PC-004 | Quick cash buttons | Cart total $47 | Button: $50 | 1. Click $50 quick button | Amount auto-filled, change calculated | Medium | Positive | Yes |
| TC-PC-005 | Cash drawer opens on cash payment | Cash payment completed | - | 1. Complete cash payment | Cash drawer opens automatically | High | Positive | No |

### 6.2 CARD PAYMENTS

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-PD-001 | Successful card payment | Cart total $100 | Valid card | 1. Select Card 2. Process payment | Payment approved, receipt generated | High | Positive | No |
| TC-PD-002 | Card declined | Cart total $100 | Declined card | 1. Select Card 2. Process | Error: "Card declined" | High | Negative | No |
| TC-PD-003 | Card terminal disconnected | Terminal offline | - | 1. Attempt card payment | Error: "Terminal not connected" | High | Negative | No |
| TC-PD-004 | Card payment timeout | Cart ready | Slow terminal | 1. Initiate payment 2. Wait | Timeout error after 60 seconds | Medium | Negative | No |

### 6.3 UPI/WALLET PAYMENTS

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-PU-001 | Successful UPI payment | Cart total $25 | Valid UPI | 1. Select UPI 2. Generate QR 3. Customer scans | Payment confirmed | High | Positive | No |
| TC-PU-002 | UPI payment timeout | QR displayed | No scan for 5 min | 1. Display QR 2. Wait 5 min | QR expires, option to regenerate | Medium | Negative | Yes |
| TC-PU-003 | Wallet payment (store credit) | Customer has $50 credit | Use credit | 1. Select Wallet 2. Apply credit | Credit deducted, balance shown | Medium | Positive | Yes |

### 6.4 SPLIT PAYMENTS

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-SP-001 | Split between cash and card | Total $100 | $50 cash + $50 card | 1. Click Split 2. Enter $50 cash 3. Process $50 card | Both payments recorded | High | Positive | No |
| TC-SP-002 | Split between 3 payment methods | Total $90 | $30 cash + $30 card + $30 UPI | 1. Split three ways | All three payments completed | Medium | Positive | No |
| TC-SP-003 | Split payment incomplete | Total $100 | Only $50 paid | 1. Start split 2. Only enter $50 | Remaining $50 shown, cannot complete | High | Negative | Yes |
| TC-SP-004 | Split payment overpayment | Total $100 | $60 + $60 | 1. Enter payments totaling $120 | Error or change calculated | Medium | Boundary | Yes |

---

## 7. RECEIPT MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-RC-001 | Print receipt after sale | Sale completed | - | 1. Complete sale 2. Click Print | Receipt printed with all details | High | Positive | No |
| TC-RC-002 | Email receipt to customer | Sale completed, customer email | Email: test@test.com | 1. Complete sale 2. Click Email Receipt | Email sent successfully | High | Positive | Yes |
| TC-RC-003 | SMS receipt to customer | Sale completed, customer phone | Phone: +1234567890 | 1. Complete sale 2. Click SMS Receipt | SMS sent with receipt link | Medium | Positive | Yes |
| TC-RC-004 | Reprint receipt | Completed transaction | Receipt ID | 1. Go to transaction history 2. Click Reprint | Same receipt printed again | High | Positive | No |
| TC-RC-005 | Receipt contains required info | Sale completed | - | 1. Review receipt | Shows: store name, items, prices, tax, total, payment, date/time | High | Positive | Yes |
| TC-RC-006 | Printer offline error | Printer disconnected | - | 1. Try to print | Error: "Printer not connected" | High | Negative | No |
| TC-RC-007 | Receipt for split payment | Split payment completed | - | 1. Complete split payment | Receipt shows all payment methods | Medium | Positive | Yes |
| TC-RC-008 | Email with invalid address | Sale completed | Email: invalid | 1. Enter invalid email 2. Send | Error: "Invalid email address" | Medium | Negative | Yes |

---

## 8. RETURNS / REFUNDS / EXCHANGE MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-RF-001 | Process full refund | Original sale exists | Receipt #12345 | 1. Search receipt 2. Select all items 3. Process refund | Full amount refunded, inventory updated | High | Positive | Yes |
| TC-RF-002 | Process partial refund | Original sale exists | 1 of 3 items | 1. Search receipt 2. Select 1 item 3. Process | Partial amount refunded | High | Positive | Yes |
| TC-RF-003 | Refund to original payment method | Card payment sale | - | 1. Process refund | Refund goes to original card | High | Positive | No |
| TC-RF-004 | Refund requires manager approval | Refund > threshold | Refund > $100 | 1. Process large refund | Manager PIN required | High | Security | Yes |
| TC-RF-005 | Refund without receipt | No receipt | Item description | 1. Click Refund Without Receipt 2. Search item | Manager approval required | High | Positive | Yes |
| TC-RF-006 | Exchange product (same price) | Original sale | Same price item | 1. Return item 2. Add new item | No money exchanged | Medium | Positive | Yes |
| TC-RF-007 | Exchange product (price difference) | Original sale | Higher price item | 1. Return $20 item 2. Add $30 item | Customer pays $10 difference | Medium | Positive | Yes |
| TC-RF-008 | Refund beyond return window | Sale > 30 days | Old receipt | 1. Try to refund | Error: "Return window expired" | High | Negative | Yes |
| TC-RF-009 | Refund non-refundable item | Non-refundable product | Final sale item | 1. Try to refund | Error: "Item not refundable" | High | Negative | Yes |
| TC-RF-010 | Audit log for refund | Refund processed | - | 1. Process refund 2. Check logs | Log shows: employee, time, reason, amount | High | Positive | Yes |

---

## 9. VOID / CANCEL TRANSACTION MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-VD-001 | Void item from active transaction | Items in cart | Item to void | 1. Click void on item | Item removed, total recalculated | High | Positive | Yes |
| TC-VD-002 | Void entire transaction before payment | Active cart with items | - | 1. Click Void Transaction | All items cleared, cart reset | High | Positive | Yes |
| TC-VD-003 | Void completed transaction | Just completed sale | Receipt ID | 1. Search transaction 2. Void | Transaction voided, inventory restored | High | Positive | Yes |
| TC-VD-004 | Void requires manager approval | Completed sale | - | 1. Try to void | Manager PIN/approval required | High | Security | Yes |
| TC-VD-005 | Void reason required | Voiding transaction | - | 1. Void transaction | Prompt for void reason | High | Positive | Yes |
| TC-VD-006 | Audit log for void | Void processed | - | 1. Void transaction 2. Check logs | Log shows: employee, approver, reason, time | High | Positive | Yes |
| TC-VD-007 | Cannot void old transaction | Transaction > 24 hours | Old receipt | 1. Try to void | Error: "Transaction too old to void" | Medium | Negative | Yes |

---

## 10. INVENTORY UPDATE MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-IN-001 | Inventory decreases after sale | Product qty: 50 | Sell 5 units | 1. Complete sale of 5 units | Inventory now 45 | High | Positive | Yes |
| TC-IN-002 | Inventory increases after refund | Product qty: 45 | Refund 5 units | 1. Process refund | Inventory now 50 | High | Positive | Yes |
| TC-IN-003 | Low stock alert | Product qty: 10, alert at 10 | - | 1. View product | Low stock warning displayed | Medium | Positive | Yes |
| TC-IN-004 | Cannot sell more than stock | Stock: 3 | Sell 5 | 1. Try to add 5 to cart | Error: "Only 3 available" | High | Negative | Yes |
| TC-IN-005 | Inventory sync after void | Void 3 items | - | 1. Void transaction | Inventory restored for 3 items | High | Positive | Yes |
| TC-IN-006 | Real-time inventory update | Multiple terminals | Same product | 1. Sell on Terminal 1 | Terminal 2 sees updated stock | High | Positive | Yes |

---

## 11. OFFLINE MODE & SYNC MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-OF-001 | POS operates offline | Internet disconnected | - | 1. Disconnect network 2. Make sale | Sale completes using local data | High | Positive | No |
| TC-OF-002 | Offline sales sync when online | Offline sales exist | - | 1. Reconnect network | All offline sales sync to server | High | Positive | No |
| TC-OF-003 | Offline mode indicator | Network down | - | 1. Disconnect network | "Offline Mode" indicator visible | High | Positive | No |
| TC-OF-004 | Cash only in offline mode | Network down | - | 1. Try card payment offline | Only cash payment available | High | Positive | No |
| TC-OF-005 | Product search works offline | Network down | Cached products | 1. Search product | Products found from local cache | High | Positive | No |
| TC-OF-006 | Sync conflict resolution | Same product edited online/offline | - | 1. Make offline edit 2. Reconnect | Conflict resolved (server wins or merge) | High | Positive | No |
| TC-OF-007 | Offline queue display | Multiple offline sales | - | 1. Check pending sync | List of pending transactions shown | Medium | Positive | No |

---

## 12. REPORTS MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-RP-001 | Daily sales report | Sales exist | Today's date | 1. Go to Reports 2. Select Daily Sales | Report shows all sales, totals | High | Positive | Yes |
| TC-RP-002 | Cash drawer report | Shift data exists | - | 1. Generate cash drawer report | Shows opening/closing, cash in/out | High | Positive | Yes |
| TC-RP-003 | Refund report | Refunds processed | Date range | 1. Generate refund report | All refunds listed with details | High | Positive | Yes |
| TC-RP-004 | Export report to CSV | Report generated | - | 1. Click Export CSV | CSV file downloaded | Medium | Positive | Yes |
| TC-RP-005 | Export report to PDF | Report generated | - | 1. Click Export PDF | PDF file downloaded | Medium | Positive | Yes |
| TC-RP-006 | Date range filter | Reports available | Custom range | 1. Select start/end date 2. Generate | Report shows only selected range | High | Positive | Yes |
| TC-RP-007 | Invalid date range | Reports page | End before start | 1. Select end date before start | Error: "Invalid date range" | Medium | Negative | Yes |
| TC-RP-008 | Sales by payment method | Sales exist | - | 1. Generate payment method report | Breakdown by cash/card/UPI | Medium | Positive | Yes |
| TC-RP-009 | Hourly sales breakdown | Day's data exists | - | 1. Generate hourly report | Sales shown by hour | Medium | Positive | Yes |
| TC-RP-010 | Cashier-restricted report access | Cashier logged in | - | 1. Try to access reports | Access denied or limited reports | High | Security | Yes |

---

## 13. CASH DRAWER MODULE

| ID | Title | Preconditions | Test Data | Steps | Expected Result | Priority | Type | Auto |
|----|-------|---------------|-----------|-------|-----------------|----------|------|------|
| TC-CD-001 | Open shift with starting cash | Beginning of day | Starting: $200 | 1. Click Open Shift 2. Enter $200 | Shift opened, starting amount recorded | High | Positive | Yes |
| TC-CD-002 | Close shift with reconciliation | Shift active | - | 1. Click Close Shift 2. Enter counted cash | Shift closed, variance calculated | High | Positive | Yes |
| TC-CD-003 | Cash in (paid in) | Shift active | Amount: $50 | 1. Click Cash In 2. Enter $50, reason | Cash added, recorded in drawer log | High | Positive | Yes |
| TC-CD-004 | Cash out (paid out) | Shift active | Amount: $20 | 1. Click Cash Out 2. Enter $20, reason | Cash removed, recorded in drawer log | High | Positive | Yes |
| TC-CD-005 | Cash drawer opens manually | Shift active | - | 1. Click Open Drawer (with PIN) | Drawer opens, logged | Medium | Positive | No |
| TC-CD-006 | Cash variance alert | Expected: $500, Counted: $480 | Variance: -$20 | 1. Close shift with $480 | Warning: "$20 shortage" | High | Positive | Yes |
| TC-CD-007 | Cannot sell without open shift | Shift not opened | - | 1. Try to make sale | Error: "Please open shift first" | High | Negative | Yes |
| TC-CD-008 | Cash in/out requires reason | Cash operation | Empty reason | 1. Cash in without reason | Error: "Reason required" | Medium | Negative | Yes |
| TC-CD-009 | Multiple shift handover | Current shift active | New cashier | 1. Close shift 2. New cashier opens | Both shifts logged correctly | Medium | Positive | Yes |
| TC-CD-010 | Audit log for drawer operations | Operations performed | - | 1. Review drawer audit log | All open/close/in/out logged with times | High | Positive | Yes |

---

## Summary

| Module | Test Cases | Coverage |
|--------|------------|----------|
| Login & Roles | 12 | Authentication, Authorization, Security |
| Product Search & Barcode | 12 | Search, Scan, Performance |
| Cart / Billing | 14 | CRUD operations, Calculations |
| Discounts & Promotions | 12 | Discounts, Coupons, Approvals |
| Taxes | 8 | Tax calculations, Exemptions |
| Payments - Cash | 5 | Cash transactions |
| Payments - Card | 4 | Card transactions |
| Payments - UPI/Wallet | 3 | Digital payments |
| Payments - Split | 4 | Split payments |
| Receipt | 8 | Print, Email, SMS, Reprint |
| Returns/Refunds/Exchange | 10 | Returns, Refunds, Exchanges |
| Void/Cancel | 7 | Void operations |
| Inventory Update | 6 | Stock management |
| Offline Mode & Sync | 7 | Offline functionality |
| Reports | 10 | Reporting |
| Cash Drawer | 10 | Shift management |
| **Total** | **100** | All modules covered |

---

## Test Case Distribution

| Type | Count |
|------|-------|
| Positive | 65 |
| Negative | 25 |
| Boundary | 6 |
| Security | 6 |
| Performance | 3 |

| Priority | Count |
|----------|-------|
| High | 70 |
| Medium | 27 |
| Low | 3 |

| Automation Feasibility | Count |
|------------------------|-------|
| Yes | 75 |
| No | 25 |
