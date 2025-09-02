# Order Totals Fix

## Problem
The Orders list was showing "0,00 kr." in the Total column for all orders, even though the orders had line items with actual values when viewed individually.

## Root Cause
The issue was that the `total_minor`, `subtotal_minor`, and `tax_minor` fields in the `orders` table were not being automatically calculated from the associated line items. When orders were created, the totals were calculated correctly in the frontend, but there was no database mechanism to recalculate these totals when line items were added, updated, or deleted.

## Solution
Created database functions and triggers to automatically calculate and maintain order totals:

### 1. Database Functions Created

#### `calculate_order_totals(order_id UUID)`
- Calculates subtotal, tax, and total for an order based on its line items
- Handles quantity, unit price, discount percentage, and tax rate
- Returns the calculated values as a table

#### `update_order_totals(order_id UUID)`
- Updates the order record with the calculated totals
- Calls `calculate_order_totals()` and updates the order's `subtotal_minor`, `tax_minor`, and `total_minor` fields

#### `trigger_update_order_totals()`
- Trigger function that automatically recalculates totals when line items change
- Handles INSERT, UPDATE, and DELETE operations on line items
- Only triggers for line items with `parent_type = 'order'`

### 2. Database Trigger Created

#### `trg_line_items_update_order_totals`
- Automatically fires when line items are inserted, updated, or deleted
- Ensures order totals are always up-to-date
- Only processes line items that belong to orders

### 3. Data Migration
- Updated all existing orders to have correct totals calculated from their line items

## Files Created

1. **`supabase/migrations/20250101_1000_calculate_order_totals.sql`** - Migration file for Supabase
2. **`fix_order_totals.sql`** - Standalone script that can be run directly on the database
3. **`database/calculate_order_totals.sql`** - Database functions and triggers

## How to Apply the Fix

### Option 1: Using Supabase CLI (Recommended)
```bash
supabase db push
```

### Option 2: Run the standalone script
```bash
psql -h your-host -p your-port -U your-user -d your-database -f fix_order_totals.sql
```

### Option 3: Copy and paste the SQL
Copy the contents of `fix_order_totals.sql` and run it in your database management tool.

## Verification

After applying the fix, you can verify it's working by:

1. **Check existing orders**: The Orders list should now show correct totals instead of "0,00 kr."
2. **Test new orders**: Create a new order with line items and verify the total is calculated correctly
3. **Test line item changes**: Add, update, or delete line items from an existing order and verify the total updates automatically

## Technical Details

### Calculation Logic
- **Line Subtotal**: `qty × unit_minor × (1 - discount_pct/100)`
- **Line Tax**: `line_subtotal × tax_rate_pct/100`
- **Order Subtotal**: Sum of all line subtotals
- **Order Tax**: Sum of all line taxes
- **Order Total**: `subtotal + tax`

### Performance Considerations
- The trigger only fires for line items belonging to orders
- Calculations are done in the database for consistency
- The trigger updates the order's `updated_at` timestamp

## Future Maintenance

The system will now automatically maintain correct order totals. No additional manual intervention is required unless:

1. Line items are modified directly in the database (bypassing the application)
2. The calculation logic needs to be updated
3. New order types are added that require different calculation rules

## Related Files

- `src/pages/Orders.tsx` - Orders list view (line 257 shows the total display)
- `src/services/orders.ts` - Order service functions
- `src/components/orders/CreateOrderModal.tsx` - Order creation with total calculation
- `src/lib/money.ts` - Money formatting and calculation utilities
