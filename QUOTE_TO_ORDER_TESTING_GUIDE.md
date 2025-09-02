# Quote → Order Conversion Testing Guide

## How to Test the Feature

### 1. **Test Quote Creation and Conversion**

1. **Create a new quote:**
   - Go to Quotes page
   - Click "New Quote"
   - Fill in company, description, and add line items
   - Save the quote

2. **Convert quote to order:**
   - Open the created quote
   - Change status from "draft" to "accepted"
   - You should see:
     - Success toast: "Order Created" with order ID
     - Quote disappears from quotes page
     - Order appears on orders page

### 2. **Verify Idempotency**

1. **Try to convert the same quote again:**
   - Go back to the quote (if you can find it)
   - Change status to "accepted" again
   - Should NOT create a duplicate order
   - Should show the same order ID in toast

### 3. **Check Orders Page**

1. **Verify order appears:**
   - Go to Orders page
   - The converted order should be visible
   - Check that all line items are copied correctly
   - Verify `quote_id` field is populated

### 4. **Test Error Handling**

1. **Test with invalid data:**
   - Try to convert a quote with missing required fields
   - Should show error toast but not rollback quote status

## Expected Behavior

### ✅ **What Should Work:**

- **Quote disappears from quotes page** when status = "accepted"
- **Order appears on orders page** with all data copied
- **Line items are preserved** with correct quantities and prices
- **Activity is logged** with `order_created_from_quote` type
- **No duplicate orders** created (idempotency)
- **Success/error toasts** provide clear feedback

### ❌ **What Should NOT Happen:**

- Accepted quotes should NOT appear on quotes page
- Orders should NOT be missing from orders page
- Line items should NOT be lost during conversion
- Multiple orders should NOT be created for same quote

## Debugging

### If Orders Don't Appear:

1. **Check browser console** for errors
2. **Verify database migration** was applied:
   ```sql
   \d orders  -- Should show quote_id column
   ```
3. **Check API responses** in Network tab
4. **Verify line items** are created correctly

### If Quotes Don't Disappear:

1. **Check API filtering** in `fetchQuotes`
2. **Verify status counts** exclude accepted quotes
3. **Check UI filtering** in Quotes page

## Database Verification

```sql
-- Check if quote_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'quote_id';

-- Check unique index for idempotency
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'orders' AND indexname LIKE '%quote_id%';

-- Check for orders created from quotes
SELECT o.id, o.number, o.quote_id, q.number as quote_number
FROM orders o
LEFT JOIN quotes q ON o.quote_id = q.id
WHERE o.quote_id IS NOT NULL;
```

## Common Issues and Solutions

### Issue: Orders not appearing on orders page
**Solution:** Fixed line items creation and added proper DB ↔ UI adapters

### Issue: Accepted quotes still showing on quotes page
**Solution:** Added automatic filtering in API and UI

### Issue: Duplicate orders created
**Solution:** Added unique index on `orders.quote_id`

### Issue: Line items missing from orders
**Solution:** Fixed line items creation to use `/line_items` endpoint
