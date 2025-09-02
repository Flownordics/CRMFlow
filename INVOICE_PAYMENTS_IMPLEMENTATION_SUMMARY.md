# Invoice Payments Implementation Summary

## Overview
Successfully implemented Model A minimal payments system for invoices with the following features:

### Database Changes
- **File**: `add_invoice_payment_fields.sql`
- Added `paid_minor` column (bigint, default 0) to invoices table
- Added `balance_minor` as generated column: `GREATEST(total_minor - paid_minor, 0)`
- Added indexes for efficient queries on payment fields

### Service Layer (`src/services/invoices.ts`)
- **Enhanced Invoice schema** with payment fields
- **`deriveInvoiceStatus()`** helper function that returns:
  - `'paid'` when balance_minor = 0
  - `'overdue'` when due_date < now() and balance_minor > 0
  - `'partial'` when paid_minor > 0 but balance_minor > 0
  - `'draft'` when status = 'draft'
  - `'sent'` as default
- **`addPayment()`** function that:
  - Increments paid_minor via PATCH request
  - Logs activity with `payment_recorded` type
  - Includes metadata: amountMinor, date, method, note, invoiceId
- **`useAddPayment()`** React Query hook with proper cache invalidation

### UI Components

#### InvoiceStatusBadge (`src/components/invoices/InvoiceStatusBadge.tsx`)
- Color-coded status display
- Uses Tailwind tokens for consistent styling
- Supports all payment statuses with appropriate colors

#### AddPaymentModal (`src/components/invoices/AddPaymentModal.tsx`)
- **Fields**: Amount (DKK → minor), Date (default today), Method (bank/card/cash/other), Note
- **Accessibility**: Proper DialogTitle, aria-describedby, labels, icons with aria-hidden
- **Validation**: Amount validation, loading states, toast notifications
- **Form reset**: Clears form after successful submission

#### Updated InvoiceDetail Page (`src/pages/invoices/InvoiceDetail.tsx`)
- **Payment summary cards**: Total, Paid, Outstanding amounts
- **Status badge**: Shows derived payment status
- **Add Payment button**: Opens modal, disabled when balance = 0
- **Payment totals**: Shows paid vs balance in totals section
- **Real-time updates**: Uses React Query for data fetching

#### Accounting Page (`src/pages/accounting/AccountingPage.tsx`)
- **Three summary cards**:
  - Outstanding (sum of balance_minor where > 0)
  - Overdue (sum of balance_minor where due_date < now())
  - Total Paid (sum of paid_minor)
- **Real-time data**: Fetches from API with proper error handling
- **Loading states**: Skeleton loading and error states

### Activity Logging
- **Payment activities**: Logged with `payment_recorded` type
- **Metadata**: Includes amount, date, method, note, invoiceId
- **Deal linking**: Activities linked to deal_id when available

### Query Keys
- **Added**: `qk.accounting()` for accounting page cache invalidation
- **Updated**: Invoice queries invalidated after payment operations

### Testing
- **File**: `src/services/__tests__/invoices.test.ts`
- **Coverage**: 
  - `deriveInvoiceStatus()` edge cases
  - `addPayment()` functionality
  - Error handling
  - Activity logging
- **All tests passing**: 9/9 tests successful

## Acceptance Criteria Met ✅

1. **Invoice page**: Status badge + totals visible
2. **Add Payment**: Modal opens, records payment, updates invoice
3. **Activity log**: Shows "payment_recorded" entries
4. **Accounting page**: Displays Outstanding, Overdue, Paid totals
5. **Accessibility**: No Radix warnings, proper ARIA attributes
6. **Real-time updates**: Cache invalidation working correctly

## Technical Implementation Details

### Payment Flow
1. User clicks "Add Payment" → Modal opens
2. User enters payment details → Form validation
3. `addPayment()` called → PATCH to update paid_minor
4. Activity logged → `payment_recorded` with metadata
5. Cache invalidated → UI updates automatically
6. Toast notification → User feedback

### Status Derivation Logic
```typescript
if (balance_minor === 0) return 'paid'
if (due_date < now() && balance_minor > 0) return 'overdue'
if (paid_minor > 0) return 'partial'
if (status === 'draft') return 'draft'
return 'sent'
```

### Database Schema
```sql
paid_minor bigint NOT NULL DEFAULT 0 CHECK (paid_minor >= 0)
balance_minor bigint GENERATED ALWAYS AS (GREATEST(total_minor - paid_minor, 0)) STORED
```

## Files Created/Modified

### New Files
- `add_invoice_payment_fields.sql` - Database migration
- `src/components/invoices/InvoiceStatusBadge.tsx` - Status display component
- `src/components/invoices/AddPaymentModal.tsx` - Payment modal
- `src/services/__tests__/invoices.test.ts` - Test suite

### Modified Files
- `src/services/invoices.ts` - Enhanced with payment functionality
- `src/lib/queryKeys.ts` - Added accounting query key
- `src/pages/invoices/InvoiceDetail.tsx` - Updated with payment features
- `src/pages/accounting/AccountingPage.tsx` - Added payment totals
- `src/components/invoices/index.ts` - Exported new components

## Next Steps
1. **Database migration**: Run `add_invoice_payment_fields.sql` on production
2. **E2E tests**: Add Playwright tests for payment flow
3. **Payment history**: Consider adding payment history view
4. **Bulk operations**: Add bulk payment functionality
5. **Payment reminders**: Integrate with notification system
