# Accounting Module - Comprehensive Test Guide

## 🎯 Test Data Overview

I've created **7 test invoices** and **6 payment records** across **4 test companies** to thoroughly test all accounting features.

---

## 📊 Test Data Summary

### Test Companies Created

1. **Acme Corporation** (Copenhagen, Denmark)
   - 2 invoices: 1 overdue, 1 partially paid
   - Total outstanding: 400,000 DKK

2. **TechStart ApS** (Aarhus, Denmark)
   - 2 invoices: 1 overdue (60 days), 1 draft
   - Total outstanding: 300,000 DKK

3. **Global Industries** (Odense, Denmark)
   - 2 invoices: 1 overdue (90 days), 1 fully paid
   - Total outstanding: 300,000 DKK

4. **Nordic Solutions** (Oslo, Norway)
   - 1 invoice: Due soon (within 7 days)
   - Total outstanding: 150,000 DKK

### Test Invoices Created

| Invoice # | Company | Status | Total | Paid | Balance | Due Date | Days Overdue | Scenario |
|-----------|---------|--------|-------|------|---------|----------|--------------|----------|
| TEST-2025-001 | Acme Corp | Sent | 100k | 0 | 100k | Sep 12 | 30 | Overdue 30 days |
| TEST-2025-002 | TechStart | Sent | 200k | 0 | 200k | Aug 13 | 60 | Overdue 60 days |
| TEST-2025-003 | Global | Sent | 300k | 0 | 300k | Jul 14 | 90 | Overdue 90+ days |
| TEST-2025-004 | Acme Corp | Sent | 500k | 200k | 300k | Oct 31 | N/A | Partial Payment |
| TEST-2025-005 | Nordic | Sent | 150k | 0 | 150k | Oct 15 | N/A | Due Soon |
| TEST-2025-006 | TechStart | Draft | 100k | 0 | 100k | N/A | N/A | Draft |
| TEST-2025-007 | Global | Paid | 400k | 400k | 0 | Oct 20 | N/A | Fully Paid |

### Test Payment Records (6 payments)

- **TEST-2025-004** (Partial): 2 payments (100k + 100k = 200k paid, 300k remaining)
- **TEST-2025-007** (Full): 1 payment (400k - invoice fully paid)

---

## 🧪 Test Scenarios

### ✅ Test 1: Accounting Dashboard Overview

**What to Test:** Complete dashboard functionality

**Steps:**
1. Navigate to `http://localhost:8081/accounting`
2. Observe the 4 KPI cards at the top

**Expected Results:**
- ✅ **Outstanding**: Shows total of all unpaid invoices (~1,150,000 DKK)
- ✅ **Overdue**: Shows sum of TEST-001, 002, 003 (600,000 DKK)
- ✅ **Paid (period)**: Shows recent payments
- ✅ **Aging Analysis**: Shows breakdown by buckets

**Verify:**
- [ ] All KPIs display without errors
- [ ] Numbers make sense
- [ ] No loading spinners stuck
- [ ] Export buttons visible in header

---

### ✅ Test 2: Interactive Aging Report

**What to Test:** Drill-down aging functionality

**Steps:**
1. Stay on accounting dashboard
2. Scroll to "Aging Analysis" card (Row 3, right side)
3. Click on the **"0-30 days"** bucket

**Expected Results:**
- ✅ Modal opens with detailed invoice list
- ✅ Shows TEST-2025-001 (30 days overdue, 100k DKK)
- ✅ Table shows: Invoice #, Company, Due Date, Days Overdue, Balance
- ✅ Click on other buckets to see different invoices

**Verify:**
- [ ] 0-30 bucket: TEST-2025-001
- [ ] 31-60 bucket: TEST-2025-002
- [ ] 61-90 bucket: TEST-2025-003
- [ ] 90+ bucket: Should be empty or contain old invoices
- [ ] Each bucket shows correct totals

**Export Test:**
4. Click "Export Summary" in page header
5. CSV file should download with aging breakdown

---

### ✅ Test 3: Payment History Display

**What to Test:** Payment history on invoice detail

**Steps:**
1. Navigate to `http://localhost:8081/invoices`
2. Find and click on **TEST-2025-004** (Acme Corporation - Partial)
3. Scroll down to "Payment History" section

**Expected Results:**
- ✅ Payment History card shows "(2 payments)"
- ✅ Table displays:
  - Oct 8: Card payment - 100,000 DKK
  - Oct 5: Bank transfer - 100,000 DKK
- ✅ Payment summary cards show:
  - Total: 500,000 DKK
  - Paid: 200,000 DKK
  - Balance: 300,000 DKK
- ✅ Status badge shows "Partial" (not "Sent")

**Verify:**
- [ ] Both payments visible
- [ ] Payment methods correct (bank, card)
- [ ] Notes display properly
- [ ] Totals are accurate

---

### ✅ Test 4: Add Payment Workflow

**What to Test:** Recording a new payment

**Steps:**
1. Still on TEST-2025-004 detail page
2. Click **"Add Payment"** button
3. Enter:
   - Amount: **100000** (100k DKK)
   - Date: Today's date
   - Method: **Bank Transfer**
   - Note: "Third installment via bank"
4. Click "Add Payment"

**Expected Results:**
- ✅ Toast notification: "Payment added"
- ✅ Payment appears in Payment History table
- ✅ Paid amount updates to 300,000 DKK
- ✅ Balance updates to 200,000 DKK
- ✅ Status badge shows "Partial"
- ✅ Payment trends chart on accounting dashboard updates

**Verify:**
- [ ] Payment recorded successfully
- [ ] Payment visible in history
- [ ] Invoice totals updated
- [ ] Can see payment on accounting dashboard

---

### ✅ Test 5: Mark as Paid (Auto-payment)

**What to Test:** Smart status update with auto-payment

**Steps:**
1. Go to `http://localhost:8081/invoices`
2. Find and open **TEST-2025-001** (Acme Corp - 30 days overdue, 100k)
3. Change Status dropdown from "Sent" to **"Paid"**

**Expected Results:**
- ✅ Toast: "Invoice updated"
- ✅ Status badge changes to "Paid" (green)
- ✅ Payment History section appears
- ✅ Shows 1 payment: 100,000 DKK, method "other", note "Payment recorded via manual status change to paid"
- ✅ Balance shows 0 DKK
- ✅ No more "overdue" warning

**Verify:**
- [ ] Status updates without errors
- [ ] Payment auto-created
- [ ] Payment visible in history
- [ ] Invoice no longer shows as overdue
- [ ] Disappeared from overdue list on accounting page

---

### ✅ Test 6: Aging Report Buckets

**What to Test:** Aging categorization

**Steps:**
1. Go to `http://localhost:8081/accounting`
2. Look at "Aging Analysis" card
3. Note the distribution across buckets

**Expected Distribution (before Test 5):**
- **0-30 days**: 1 invoice (TEST-2025-001) - 100k DKK
- **31-60 days**: 1 invoice (TEST-2025-002) - 200k DKK
- **61-90 days**: 1 invoice (TEST-2025-003) - 300k DKK
- **90+ days**: Older invoices if any

**After Test 5** (marking TEST-001 as paid):
- **0-30 days**: 0 invoices (TEST-001 now paid!)
- **31-60 days**: 1 invoice
- **61-90 days**: 1 invoice

**Verify:**
- [ ] Buckets show correct counts
- [ ] Totals match invoice balances
- [ ] Clicking bucket shows detailed list
- [ ] Paid invoices don't appear in any bucket

---

### ✅ Test 7: Payment Trends Chart

**What to Test:** Visual payment timeline

**Steps:**
1. Stay on accounting dashboard
2. Look at "Payment Trends" chart (Row 2, left side)

**Expected Results:**
- ✅ Line chart shows payment activity
- ✅ Multiple data points from Sep 25 - Oct 10
- ✅ Hover over points shows:
  - Date
  - Amount in DKK
- ✅ X-axis: Dates
- ✅ Y-axis: Payment amounts

**Verify:**
- [ ] Chart renders without errors
- [ ] Shows recent payment activity
- [ ] Tooltips work on hover
- [ ] Data looks reasonable

---

### ✅ Test 8: Top Outstanding Customers

**What to Test:** Customer ranking widget

**Steps:**
1. Stay on accounting dashboard
2. Look at "Top Outstanding Customers" (Row 2, right side)

**Expected Rankings:**
1. **Acme Corporation** - 400k DKK (TEST-001: 100k + TEST-004: 300k)
2. **Global Industries** - 300k DKK (TEST-003: 300k)
3. **TechStart ApS** - 300k DKK (TEST-002: 200k + TEST-006: 100k draft)
4. **Nordic Solutions** - 150k DKK (TEST-005: 150k)

**Verify:**
- [ ] Companies ranked by outstanding balance
- [ ] Shows invoice count per company
- [ ] Link to company page works
- [ ] Total outstanding displayed

---

### ✅ Test 9: Company Accounting Summary

**What to Test:** Company page integration

**Steps:**
1. Navigate to `http://localhost:8081/companies`
2. Find and click on **Acme Corporation**
3. Look at Overview tab, right sidebar

**Expected Results:**
- ✅ "Accounting Summary" widget displays
- ✅ Shows:
  - Outstanding Balance: 400,000 DKK (highlighted)
  - Total Invoiced: 600,000 DKK
  - Total Paid: 200,000 DKK
  - 2 total invoices
- ✅ "View All" link to filtered invoices

**Verify:**
- [ ] Widget loads without errors
- [ ] Numbers are accurate
- [ ] Outstanding amount highlighted
- [ ] Link to invoices works

---

### ✅ Test 10: Overdue List Filtering

**What to Test:** Overdue invoice filtering

**Steps:**
1. Go to `http://localhost:8081/accounting`
2. Scroll to "Overdue invoices" card (Row 4, left side)

**Expected Before Test 5:**
- ✅ Shows 3+ invoices including TEST-001, 002, 003

**Expected After Test 5:**
- ✅ Shows 2 invoices (TEST-002, TEST-003)
- ✅ TEST-001 no longer appears (marked as paid)

**Verify:**
- [ ] Only unpaid overdue invoices shown
- [ ] Each shows: Number, Company, Due date, Balance
- [ ] "Open" button links to invoice detail
- [ ] "View all" links to full invoice list

---

### ✅ Test 11: Due Soon Warning

**What to Test:** Due date warnings

**Steps:**
1. Go to `http://localhost:8081/invoices`
2. Find **TEST-2025-005** (Nordic Solutions)
3. Look at the "Due Date" column

**Expected Results:**
- ✅ Shows orange/yellow "Due soon" badge
- ✅ Due date: Oct 15, 2025
- ✅ Status: "Sent" (not overdue yet)

**Verify:**
- [ ] "Due soon" badge visible
- [ ] Not marked as overdue
- [ ] Status is "Sent"

---

### ✅ Test 12: Partial Payment Display

**What to Test:** Partial payment status

**Steps:**
1. Stay on invoice list page
2. Find **TEST-2025-004** (Acme Corporation)
3. Observe status badge and amounts

**Expected Results:**
- ✅ Status badge: "Partial" (not "Sent")
- ✅ Amount column: 500,000 DKK (total)
- ✅ Balance: 300,000 DKK remaining
- ✅ No "overdue" or "due soon" badge (due Oct 31)

**Verify:**
- [ ] Shows as "Partial" status
- [ ] Not marked as overdue
- [ ] Totals are correct

---

### ✅ Test 13: CSV Export Functionality

**What to Test:** Data export capabilities

**Steps:**
1. Go to `http://localhost:8081/accounting`
2. Click **"Export Invoices"** button in header

**Expected Results:**
- ✅ CSV file downloads: `invoices_2025-10-12.csv`
- ✅ Opens in Excel/Sheets
- ✅ Contains all test invoices
- ✅ Columns: Invoice #, Company, Status, Dates, Amounts, Days Overdue
- ✅ Proper formatting (no broken data)

**Additional Export Tests:**
3. Click **"Export Summary"** 
   - Should download summary CSV with KPI metrics

4. Click on Payment History card → Export
   - Should download payments CSV

5. Click on Aging Report → Export (after implementing button)
   - Should download aging report CSV

**Verify:**
- [ ] CSV files download successfully
- [ ] Data is readable and properly formatted
- [ ] Company names resolved (not UUIDs)
- [ ] Amounts formatted correctly

---

### ✅ Test 14: Complete Payment Flow

**What to Test:** Full payment to zero balance

**Steps:**
1. Navigate to invoice **TEST-2025-004** (currently 300k balance)
2. Click "Add Payment"
3. Enter amount: **300000** (full remaining balance)
4. Date: Today
5. Method: Bank Transfer
6. Note: "Final payment - closing invoice"
7. Submit

**Expected Results:**
- ✅ Toast: "Payment added"
- ✅ Payment appears in history (now 3 payments total)
- ✅ Paid amount: 500,000 DKK
- ✅ **Balance: 0 DKK**
- ✅ **Status badge auto-changes to "Paid"** (green)
- ✅ No longer shows in overdue lists
- ✅ "Add Payment" button becomes disabled

**Verify:**
- [ ] Payment recorded
- [ ] Balance reaches 0
- [ ] Status auto-updates to "Paid"
- [ ] Database trigger working
- [ ] Invoice removed from outstanding reports

---

### ✅ Test 15: Bulk Mark as Paid (Not Yet in UI)

**What to Test:** Bulk operations (when UI is added)

**Manual Test via Browser Console:**
```javascript
// This will test the bulk operation service
// (Bulk UI not yet added to invoice list page)

// Note: For now, mark invoices individually to test the flow
// Bulk UI can be added later if needed
```

**Alternative:** Use the "Mark as Paid" dropdown on multiple invoices one by one.

---

### ✅ Test 16: Company Multi-Invoice Tracking

**What to Test:** Multiple invoices per company

**Steps:**
1. Go to company **Acme Corporation** detail page
2. Look at Accounting Summary widget (right sidebar in Overview tab)

**Expected Results:**
- ✅ Outstanding Balance: 400,000 DKK
  - TEST-2025-001: 100k (or 0 if you did Test 5)
  - TEST-2025-004: 300k (or 0 if you did Test 14)
- ✅ Total Invoiced: Shows cumulative
- ✅ Total Paid: Shows cumulative payments
- ✅ 2 total invoices

**Verify:**
- [ ] Widget displays correctly
- [ ] Aggregates multiple invoices
- [ ] Updates when payments added
- [ ] Link to company invoices works

---

### ✅ Test 17: Invoice Status Derivation

**What to Test:** Status logic based on payment state

**Steps:**
1. Go to `http://localhost:8081/invoices`
2. Observe status badges for test invoices

**Expected Status Display:**
- TEST-2025-001 (unpaid, overdue) → **"Overdue"** badge (red) OR **"Paid"** if you did Test 5
- TEST-2025-002 (unpaid, overdue) → **"Overdue"** badge (red)
- TEST-2025-003 (unpaid, overdue) → **"Overdue"** badge (red)
- TEST-2025-004 (partial) → **"Partial"** badge (secondary)
- TEST-2025-005 (unpaid, future) → **"Sent"** badge (secondary)
- TEST-2025-006 (draft) → **"Draft"** badge (outline)
- TEST-2025-007 (fully paid) → **"Paid"** badge (green)

**Verify:**
- [ ] Status badges match payment state (not just DB status)
- [ ] Paid invoices never show as overdue
- [ ] Partial payments show as "Partial"
- [ ] Overdue only when unpaid AND past due

---

### ✅ Test 18: Due Date Column Tags

**What to Test:** Overdue and due soon tags

**Steps:**
1. Stay on invoice list page
2. Look at "Due Date" column for each test invoice

**Expected Tags:**
- TEST-2025-001: **"overdue"** (red tag) OR date only if paid
- TEST-2025-002: **"overdue"** (red tag)
- TEST-2025-003: **"overdue"** (red tag)  
- TEST-2025-004: Just date (Oct 31) - no tag
- TEST-2025-005: **"due soon"** (yellow/orange tag)
- TEST-2025-006: "—" (no due date, draft)
- TEST-2025-007: Just date (Oct 20) - no tag (paid)

**Verify:**
- [ ] Overdue tags only on unpaid past-due invoices
- [ ] Due soon tags only on unpaid upcoming invoices
- [ ] Paid invoices show date only, no tags
- [ ] Color coding correct (red=danger, yellow=warning)

---

### ✅ Test 19: Payment History Widget on Dashboard

**What to Test:** Recent payments card

**Steps:**
1. Go to `http://localhost:8081/accounting`
2. Look at "Recent Payments" card (Row 3, left side)

**Expected Results:**
- ✅ Shows last 10 payments
- ✅ Displays payments from TEST-2025-004 and TEST-2025-007
- ✅ Each payment shows:
  - Invoice number (clickable link)
  - Company name
  - Date
  - Amount
  - Payment method (color-coded dot)
- ✅ Total summary at bottom

**Verify:**
- [ ] Recent payments visible
- [ ] Links to invoices work
- [ ] Payment methods color-coded
- [ ] Total calculated correctly

---

### ✅ Test 20: Complete End-to-End Flow

**What to Test:** Full invoice lifecycle

**Steps:**
1. **Create:** Invoice TEST-2025-006 is in draft
2. **Send:** Open TEST-2025-006, change status to "Sent"
3. **Age:** It won't be overdue yet (no due date set)
4. **Partial Pay:** Add a 50k payment
5. **Full Pay:** Mark as paid (auto-records final 50k payment)

**Expected Journey:**
- Draft → Sent → Partial → Paid ✅
- Each step recorded in activity log
- Payment history builds up
- Status updates automatically

**Verify:**
- [ ] Can transition through all states
- [ ] Payment history accumulates
- [ ] Status derives from payment state
- [ ] Final state is "Paid" with balance = 0

---

## 🎯 Advanced Test Scenarios

### Test 21: Cross-Module Integration

**Company Page:**
1. Visit Acme Corporation
2. Verify accounting summary shows
3. Click "View All" → Should filter invoices by company

**Deal Page:**
1. Create a test deal
2. Create invoice from deal
3. Verify deal page shows invoice in "Deal to Cash" section

---

### Test 22: Search and Filter

**Invoice List:**
1. Search for "Acme"
2. Should show TEST-2025-001 and 004
3. Filter by "Overdue" status
4. Should show only overdue test invoices

**Payment History:**
1. On accounting dashboard
2. Search payments by "bank"
3. Filter by payment method "Bank Transfer"
4. Should show filtered results

---

### Test 23: Responsive Design

**Mobile View:**
1. Resize browser to mobile width (375px)
2. Check accounting dashboard
3. Verify all widgets stack vertically
4. Check tables scroll horizontally

**Tablet View:**
1. Resize to 768px
2. Verify 1-2 column grids
3. Check all features accessible

---

## 📊 Expected Metrics (After All Tests)

### Accounting Dashboard KPIs

**Outstanding:** ~1,150,000 DKK
- TEST-2025-002: 200k
- TEST-2025-003: 300k
- TEST-2025-004: 200k (after partial payment in Test 4)
- TEST-2025-005: 150k
- TEST-2025-006: 100k (draft - may or may not count)

**Overdue:** ~500,000 DKK
- TEST-2025-002: 200k
- TEST-2025-003: 300k

**Paid (recent):** ~600,000 DKK
- TEST-2025-007: 400k
- Test payments: ~200k

### Aging Breakdown

- 0-30 days: 0 DKK (after Test 5)
- 31-60 days: 200,000 DKK
- 61-90 days: 300,000 DKK
- 90+ days: Older invoices

---

## 🚨 What to Watch For

### ✅ Good Signs
- Toast notifications on all actions
- Status badges match payment state
- Payment history populates correctly
- CSV exports download
- No console errors
- Data refreshes after actions

### ❌ Red Flags (Report if seen)
- 400 errors when updating invoices
- Paid invoices showing as overdue
- Payment history empty after adding payment
- Duplicate payment records
- Status not updating when balance reaches 0
- Overdue tags on paid invoices

---

## 📝 Test Checklist Summary

**Quick Validation (5 minutes):**
- [ ] Accounting dashboard loads
- [ ] Test invoices visible
- [ ] Can add a payment
- [ ] Can mark as paid
- [ ] Status updates correctly

**Comprehensive Testing (20 minutes):**
- [ ] All 20 test scenarios
- [ ] Cross-module integration
- [ ] Search and filters
- [ ] Responsive design
- [ ] CSV exports
- [ ] Payment trends chart
- [ ] Aging report drill-down

**Regression Testing:**
- [ ] Existing invoices still work
- [ ] No breaking changes
- [ ] All pages accessible
- [ ] No console errors

---

## 🎉 Test Data Cleanup (Optional)

After testing, if you want to remove test data:

```sql
-- Delete test invoices (will cascade to payments and line_items)
DELETE FROM public.invoices WHERE number LIKE 'TEST-%';

-- Delete test companies (will cascade to invoices)
DELETE FROM public.companies WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);
```

---

## 🚀 Start Testing!

**Ready to begin? Here's your quick start:**

1. **Refresh browser:** `Ctrl + F5`
2. **Start with Test 1:** Accounting dashboard overview
3. **Work through Tests 2-10:** Core workflows
4. **Try advanced Tests 11-20:** Edge cases and integration
5. **Report any issues:** I'll fix them immediately!

---

**Test Data Ready:** ✅ 7 invoices, 6 payments, 4 companies  
**Test Scenarios:** 20 comprehensive tests  
**Estimated Test Time:** 5-20 minutes  
**Cleanup Script:** Provided above  

**Happy Testing! 🧪** Let me know what you find!

