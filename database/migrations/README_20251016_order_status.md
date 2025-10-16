# Migration: Add status to Orders Table

**Date:** 2025-10-16  
**Status:** ✅ Applied  
**Migration File:** `20251016_add_status_to_orders.sql`

## Problem

The application was failing with a **400 Bad Request** error when trying to update order status after converting to invoice. The error occurred because:

1. The `orders.ts` service expected orders to have a `status` field
2. The TypeScript schema defined: `status: z.enum(["draft", "accepted", "cancelled", "backorder", "invoiced"])`
3. The `orders` table did not have a `status` column
4. Supabase rejected PATCH requests with `status` field as invalid

### Error Details

```
PATCH /rest/v1/orders?id=eq.{uuid}
Body: { status: "invoiced" }
=> 400 (Bad Request)

at updateOrderHeader (orders.ts:402)
at onClick (Orders.tsx:339)
```

## Solution

Added `status` column to the `orders` table with an enum type matching the application's expectations.

### Changes Made

1. **Created Enum Type:**
   - `order_status` enum with values: `'draft'`, `'accepted'`, `'cancelled'`, `'backorder'`, `'invoiced'`
   - Matches TypeScript schema in `orders.ts`

2. **Added Column:**
   - `status order_status` - NOT NULL with default 'draft'
   - All existing orders automatically set to 'draft'
   - New orders default to 'draft' unless specified

3. **Added Index:**
   - `idx_orders_status` on `orders(status)`
   - Improves query performance for status-based filters

4. **Added Comment:**
   - Documents the purpose and valid values

## Database Changes

```sql
-- Create enum
CREATE TYPE order_status AS ENUM ('draft', 'accepted', 'cancelled', 'backorder', 'invoiced');

-- Add column
ALTER TABLE public.orders 
ADD COLUMN status order_status NOT NULL DEFAULT 'draft';

-- Add index
CREATE INDEX idx_orders_status ON public.orders (status);
```

## Status Values Explained

- **`draft`** - Initial state when order is created
- **`accepted`** - Order has been accepted by customer
- **`cancelled`** - Order has been cancelled
- **`backorder`** - Order is waiting for items to be in stock
- **`invoiced`** - Order has been converted to invoice (final state)

## Impact

- **Backward Compatible:** ✅ Yes - all existing orders set to 'draft'
- **Existing Data:** ✅ Safe - existing orders remain valid with 'draft' status
- **Application Code:** ✅ No changes needed - code already expected this column
- **Performance:** ✅ Improved - added index for efficient status queries

## Verification

Run this query to verify the migration:

```sql
-- Check column exists
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'status';

-- Check enum values
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'order_status' 
ORDER BY enumsortorder;

-- Check index
SELECT indexname FROM pg_indexes 
WHERE tablename = 'orders' AND indexname = 'idx_orders_status';
```

## Related Files

- `src/services/orders.ts` - TypeScript schema and status handling
- `src/services/conversions.ts` - Sets status to 'invoiced' after conversion
- `src/pages/Orders.tsx` - Updates status in UI
- `database/schema.sql` - Updated with status column and enum

## Testing

After applying this migration, you should be able to:

1. Create orders with default status 'draft' ✅
2. Update order status to any valid enum value ✅
3. Filter orders by status ✅
4. Convert order to invoice and set status to 'invoiced' ✅
5. See existing orders with status 'draft' ✅

## Order Lifecycle Example

```
draft → accepted → invoiced
  ↓
cancelled
  ↓
backorder → accepted → invoiced
```

