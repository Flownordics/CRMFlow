# Migration: Add order_id to Invoices Table

**Date:** 2025-10-16  
**Status:** ✅ Applied  
**Migration File:** `20251016_add_order_id_to_invoices.sql`

## Problem

The application was failing with a **400 Bad Request** error when trying to convert orders to invoices. The error occurred because:

1. The `conversions.ts` service was attempting to query invoices by `order_id`
2. The `invoices` table did not have an `order_id` column
3. Supabase rejected the query as invalid

### Error Details

```
GET /rest/v1/invoices?order_id=eq.{uuid}&select=id&limit=1 
=> 400 (Bad Request)
```

## Solution

Added `order_id` column to the `invoices` table to track which order an invoice was created from.

### Changes Made

1. **Added Column:**
   - `order_id uuid` - References `public.orders(id)`
   - Nullable (not all invoices are created from orders)
   - `ON DELETE SET NULL` - If order is deleted, invoice remains but loses the reference

2. **Added Index:**
   - `idx_invoices_order` on `invoices(order_id)`
   - Improves query performance for lookups by order_id

3. **Added Comment:**
   - Documents the purpose of the column for future developers

## Database Changes

```sql
ALTER TABLE public.invoices 
ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_order ON public.invoices (order_id);
```

## Impact

- **Backward Compatible:** ✅ Yes - column is nullable
- **Existing Data:** ✅ Safe - existing invoices will have NULL order_id
- **Application Code:** ✅ No changes needed - code already expected this column
- **Performance:** ✅ Improved - added index for efficient queries

## Verification

Run this query to verify the migration:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name = 'order_id';
```

Expected result: `order_id | uuid | YES`

## Related Files

- `src/services/conversions.ts` - Uses this column for order-to-invoice conversion
- `database/schema.sql` - Updated with order_id column
- `supabase/migrations/20251016_add_order_id_to_invoices.sql` - Supabase migration

## Testing

After applying this migration, you should be able to:

1. Convert an order to an invoice without errors
2. Query invoices by order_id: `GET /invoices?order_id=eq.{uuid}`
3. See the order_id field populated when creating invoices from orders

