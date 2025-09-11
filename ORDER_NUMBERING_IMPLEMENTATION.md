# Order Numbering Implementation

## Overview
This implementation adds automatic order numbering to replace complex UUIDs with user-friendly order numbers like `ORD-2025-0001`.

## What Was Created

### 1. Database Migration
- **File**: `database/migrations/20250109000000_order_numbering_trigger.sql`
- **Purpose**: Creates automatic order numbering system
- **Format**: `ORD-YYYY-NNNN` (e.g., `ORD-2025-0001`)

### 2. How It Works
- **Trigger Function**: `generate_order_number()` automatically generates numbers
- **Trigger**: `trg_order_number` runs before each INSERT
- **Logic**: 
  - Only generates if `number` field is NULL or empty
  - Uses year-based numbering (resets each year)
  - 4-digit zero-padded numbers (0001, 0002, etc.)
  - Updates existing orders without numbers

### 3. Frontend Integration
- **Already implemented**: UI shows `order.number` when available
- **Fallback**: Uses `generateFriendlyNumber()` for orders without numbers
- **Display**: Shows `ORD-2025-0001` instead of `281c6bf4-cab2-441f-bb77-52be7868a177`

## How to Deploy

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database/migrations/20250109000000_order_numbering_trigger.sql`
4. Click **Run** to execute the migration

### Option 2: Supabase CLI (if available)
```bash
supabase db reset
# or
supabase migration up
```

## Expected Results

### Before Migration
- Order IDs: `281c6bf4-cab2-441f-bb77-52be7868a177`
- Order Numbers: `null` or empty

### After Migration
- Order IDs: `281c6bf4-cab2-441f-bb77-52be7868a177` (unchanged)
- Order Numbers: `ORD-2025-0001`, `ORD-2025-0002`, etc.

## Testing
1. Create a new order → Should automatically get `ORD-2025-XXXX` number
2. Check existing orders → Should have retroactive numbers assigned
3. UI should display the new numbers instead of UUIDs

## Benefits
- ✅ **User-friendly**: `ORD-2025-0001` vs `281c6bf4-cab2-441f-bb77-52be7868a177`
- ✅ **Sequential**: Easy to track order sequence
- ✅ **Year-based**: Numbers reset each year
- ✅ **Automatic**: No manual intervention needed
- ✅ **Backward compatible**: Existing orders get retroactive numbers

## Similar Systems
This follows the same pattern as the existing invoice numbering system:
- **Invoices**: `INV-2025-0001`
- **Orders**: `ORD-2025-0001`
- **Quotes**: Could be extended to `QUO-2025-0001` if needed



