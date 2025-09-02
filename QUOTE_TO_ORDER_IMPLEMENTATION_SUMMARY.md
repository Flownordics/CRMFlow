# Quote → Order Auto-Conversion Implementation Summary

## Overview
Implemented automatic order creation when a quote's status is changed to "accepted". The system ensures idempotency (one order per quote) and provides user feedback through toast notifications.

**Fixed Issue**: Orders were not appearing on the orders page after conversion due to incorrect line items creation and missing adapter functions. This has been resolved by implementing proper DB ↔ UI conversion and using the correct API endpoints.

## Files Modified/Created

### Database Changes
- **`add_quote_id_to_orders.sql`** (NEW)
  - Adds `quote_id` field to orders table
  - Creates unique index for idempotency
  - Adds performance index

### Service Layer Changes
- **`src/services/orders.ts`** (MODIFIED)
  - Added `quote_id` field to Order schema
  - Updated `createOrder` function to accept `quote_id` parameter
  - Added adapter functions for DB ↔ UI conversion (similar to quotes)
  - Fixed line items creation to use correct `/line_items` endpoint
  - Updated `fetchOrder` to fetch line items separately
  - Added `OrderLine` schema and type definitions

- **`src/services/conversions.ts`** (MODIFIED)
  - Added `ensureOrderForQuote` function
  - Implements idempotency check
  - Handles quote fetching and order creation
  - Logs activity with `order_created_from_quote` type

- **`src/services/quotes.ts`** (MODIFIED)
  - Updated `useUpdateQuoteHeader` hook
  - Triggers conversion when status changes to "accepted"
  - Shows success/error toasts
  - Handles errors gracefully without rolling back status change
  - Updated `fetchQuotes` to automatically exclude accepted quotes
  - Updated `fetchQuoteStatusCounts` to exclude accepted quotes

### UI Component Changes
- **`src/components/quotes/QuotesStatusFilters.tsx`** (MODIFIED)
  - Removed "accepted" from status filter options

- **`src/components/quotes/QuotesKpiHeader.tsx`** (MODIFIED)
  - Changed "Accepted quotes" KPI to "Draft quotes"
  - Updated "Acceptance rate" to "Success rate"
  - Adjusted calculations to exclude accepted quotes

- **`src/pages/Quotes.tsx`** (MODIFIED)
  - Added automatic filtering to exclude accepted quotes from display
  - Updated status counts to exclude accepted quotes

### Test Files
- **`src/services/__tests__/conversions.test.ts`** (NEW)
  - Unit tests for `ensureOrderForQuote` function
  - Tests idempotency, error handling, and activity logging

- **`tests/e2e/quote-to-order.spec.ts`** (NEW)
  - E2E tests for the complete conversion flow
  - Tests duplicate prevention and error handling

## Key Features Implemented

### 1. Idempotency
- Unique index on `orders.quote_id` ensures one order per quote
- Function checks for existing order before creating new one
- Returns existing order ID if found

### 2. Data Copying
**Header fields copied:**
- `company_id`, `contact_id`, `deal_id`
- `currency`, `notes`
- `subtotal_minor`, `tax_minor`, `total_minor`
- Sets `quote_id` for linking back to source

**Line items copied:**
- `description`, `qty`, `unit_minor`
- `tax_rate_pct`, `discount_pct`, `sku`

### 3. Status Management
- Order status set to "draft" (default)
- Quote status change to "accepted" triggers conversion
- Conversion failure doesn't rollback quote status

### 4. UI/UX Improvements
- **Accepted quotes automatically disappear from quotes page** - they become orders instead
- Removed "accepted" from quote status filters
- Updated KPI header to show "Draft quotes" instead of "Accepted quotes"
- Changed "Acceptance rate" to "Success rate" (based on non-declined quotes)
- API automatically excludes accepted quotes from quotes queries

### 5. Activity Logging
- Logs `order_created_from_quote` activity
- Includes metadata: `{ quoteId, orderId }`
- Graceful handling of logging failures

### 6. User Feedback
- Success toast: "Order Created" with order ID
- Error toast: "Order Creation Failed" with explanation
- Toast includes order ID for easy reference

## Database Schema Changes

```sql
-- Add quote_id field to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS orders_quote_id_key 
ON public.orders (quote_id) 
WHERE quote_id IS NOT NULL;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_orders_quote_id 
ON public.orders (quote_id);
```

## Usage Flow

1. User changes quote status to "accepted" in QuoteEditor
2. `useUpdateQuoteHeader` mutation triggers
3. Status is updated in database
4. If status is "accepted", `ensureOrderForQuote` is called
5. Function checks for existing order by `quote_id`
6. If no order exists, creates new order with copied data
7. Activity is logged
8. Success/error toast is shown to user

## Error Handling

- **Quote not found**: Throws error with descriptive message
- **Order creation fails**: Shows error toast, doesn't rollback quote status
- **Activity logging fails**: Continues without failing the conversion
- **API errors**: Graceful degradation with user feedback

## Testing

### Unit Tests
- Idempotency verification
- Data copying accuracy
- Error handling scenarios
- Activity logging verification

### E2E Tests
- Complete conversion flow
- Duplicate prevention
- Error handling in UI
- Toast notification verification

## Migration Instructions

1. Run the database migration:
   ```sql
   \i add_quote_id_to_orders.sql
   ```

2. Deploy the updated services
3. Test the conversion flow with existing quotes
4. Verify activity logging is working

## Future Enhancements

- Add "View Order" CTA in success toast
- Add conversion history in quote detail view
- Add bulk conversion for multiple quotes
- Add conversion settings (default order status, etc.)
