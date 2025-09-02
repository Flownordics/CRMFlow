# Test Quote → Order Conversion

## Step 1: Create a Test Quote

1. **Go to Quotes page** (http://localhost:8081/quotes)
2. **Click "New Quote"** button
3. **Fill in the form:**
   - Company: Select any company
   - Description: "Test Quote for Order Conversion"
   - Add line items:
     - Description: "Test Product"
     - Quantity: 2
     - Unit Price: 100 DKK
     - Tax Rate: 25%
4. **Save the quote**

## Step 2: Convert Quote to Order

1. **Open the created quote**
2. **Change status from "draft" to "accepted"**
3. **Check for:**
   - Success toast: "Order Created" with order ID
   - Quote disappears from quotes page
   - Order appears on orders page

## Step 3: Verify Order Creation

1. **Go to Orders page** (http://localhost:8081/orders)
2. **Look for the new order**
3. **Check that:**
   - Order has correct line items
   - Order has `quote_id` field populated
   - All data is copied correctly

## Step 4: Check Browser Console

Open browser console (F12) and look for:
- `[fetchOrders]` logs
- `[createOrder]` logs
- `[ensureOrderForQuote]` logs
- Any error messages

## Expected Console Output

When converting a quote, you should see:
```
[ensureOrderForQuote] Fetched quote [quote-id]: {...}
[ensureOrderForQuote] Creating order with payload: {...}
[createOrder] Starting with payload: {...}
[createOrder] Creating 1 line items for order [order-id]
[createOrder] Creating line item: {...}
[createOrder] Line item created: {...}
```

When viewing orders page:
```
[fetchOrders] Starting with params: {...}
[fetchOrders] Fetching from URL: /orders?offset=0&limit=20
[fetchOrders] Raw response: {...}
[fetchOrders] Final result: {...}
```

## Troubleshooting

### If no quotes appear:
- Check if there are any companies in the system
- Try creating a company first

### If orders don't appear:
- Check browser console for errors
- Verify database migration was applied
- Check if line items are created correctly

### If conversion fails:
- Check browser console for error messages
- Verify quote has required fields (company_id, etc.)
- Check if API endpoints are accessible



