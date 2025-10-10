# Deal Stage Automation System

## Overview

The Deal Stage Automation System automatically updates deal stages based on related entity actions (quotes, orders, invoices). This ensures the Kanban board always reflects the current state of deals without manual intervention.

## Problem Solved

**Before**: When converting quotes to orders or creating invoices, deals remained in their current stage (e.g., "Proposal") even though they should have moved to "Closed Won".

**After**: Deals automatically progress through stages based on business logic, keeping the Kanban board accurate and up-to-date.

## Automation Rules

### Default Stage Flow
```
Prospecting → Qualified → Proposal → (Quote Accepted → Converts to Order) → Closed Won
                                                      ↓
                                                 (Quote Declined) → Closed Lost
```

### Automation Triggers

| Trigger | Condition | Action | Target Stage |
|---------|-----------|--------|--------------|
| `quote_created` | Deal in "Prospecting" | Move to "Proposal" | Proposal |
| `quote_declined` | Any stage | Move to "Closed Lost" | Closed Lost |
| `order_created` | Any stage | Move to "Closed Won" | Closed Won |
| `order_cancelled` | Any stage | Move to "Negotiation" | Negotiation |
| `invoice_created` | Any stage | Move to "Closed Won" | Closed Won |
| `invoice_paid` | Any stage | Move to "Closed Won" | Closed Won |

**Note**: `quote_accepted` is handled by the quote-to-order conversion flow, which automatically triggers `order_created` automation.

## Implementation Details

### Core Service: `dealStageAutomation.ts`

- **`automateDealStage()`**: Main automation function
- **`triggerDealStageAutomation()`**: Helper for triggering from other services
- **`useAutomateDealStage()`**: React Query hook
- **`batchAutomateDealStages()`**: Bulk automation for data migration

### Integration Points

#### 1. Quote Creation (`conversions.ts`)
```typescript
// When creating quote from deal
await triggerDealStageAutomation('quote_created', dealId, quote);
```

#### 2. Quote Status Changes (`quotes.ts`)
```typescript
// When quote status changes to declined (accepted is handled by order conversion)
if (patch.status === 'declined') {
    await triggerDealStageAutomation('quote_declined', dealId, quote);
}
// Note: quote acceptance automatically converts to order, which triggers order_created automation
```

#### 3. Quote to Order Conversion (`conversions.ts`)
```typescript
// When quote is converted to order
await triggerDealStageAutomation('order_created', dealId, order);
```

#### 4. Order to Invoice Conversion (`conversions.ts`)
```typescript
// When order is converted to invoice
await triggerDealStageAutomation('invoice_created', dealId, invoice);
```

#### 5. Invoice Status Changes (`invoices.ts`)
```typescript
// When invoice is marked as paid
if (payload.status === 'paid') {
    await triggerDealStageAutomation('invoice_paid', dealId, invoice);
}
```

## Business Logic Examples

### Scenario 1: Complete Sales Flow
1. **Deal created** → Starts in "Prospecting"
2. **Quote created** → Automatically moves to "Proposal"
3. **Quote accepted** → **Automatically converts to order and moves to "Closed Won"** ✅
4. **Order converted to invoice** → Stays in "Closed Won" (already correct)

### Scenario 2: Quote Rejection
1. **Deal in "Proposal"** with quote
2. **Quote declined** → Automatically moves to "Closed Lost"

### Scenario 3: Direct Order Creation
1. **Deal in "Prospecting"**
2. **Order created directly** → Automatically moves to "Closed Won"

## Error Handling

- **Graceful Degradation**: Automation failures don't break the main flow
- **Logging**: All automation attempts are logged for debugging
- **User Feedback**: Success/failure toasts inform users of automation results
- **Activity Logging**: Stage changes are recorded in deal activity timeline

## Configuration

### Customizing Rules

The automation rules can be customized by modifying `DEFAULT_STAGE_RULES` in `dealStageAutomation.ts`:

```typescript
export const DEFAULT_STAGE_RULES: DealStageRule[] = [
  {
    trigger: 'quote_created',
    fromStage: 'prospecting', // Optional: only apply if in this stage
    toStage: 'proposal',
    condition: (deal, quote) => quote.total_minor > 10000 // Optional: custom condition
  },
  // ... more rules
];
```

### Adding New Triggers

1. Add new trigger type to `DealStageRule['trigger']`
2. Add rule to `DEFAULT_STAGE_RULES`
3. Integrate trigger calls in relevant services

## Testing

### Manual Testing Scenarios

1. **Create deal** → Verify starts in "Prospecting"
2. **Create quote from deal** → Verify moves to "Proposal"
3. **Accept quote** → Verify moves to "Negotiation"
4. **Convert quote to order** → Verify moves to "Closed Won"
5. **Decline quote** → Verify moves to "Closed Lost"

### Automated Testing

The system includes comprehensive error handling and logging to ensure reliability:

- Database transaction safety
- Rollback on failures
- Activity logging for audit trails
- User notification system

## Benefits

1. **Accurate Pipeline**: Kanban board always reflects true deal status
2. **Reduced Manual Work**: No need to manually update deal stages
3. **Consistent Process**: Standardized stage progression across all deals
4. **Better Analytics**: Accurate pipeline metrics and forecasting
5. **User Experience**: Seamless workflow without interruptions

## Future Enhancements

- **Custom Rules**: User-configurable automation rules
- **Conditional Logic**: More complex conditions (deal value, company type, etc.)
- **Notifications**: Email/SMS alerts for stage changes
- **Analytics**: Stage transition metrics and optimization
- **Bulk Operations**: Mass stage updates for data migration

## Files Modified

- `src/services/dealStageAutomation.ts` (new)
- `src/services/conversions.ts` (updated)
- `src/services/quotes.ts` (updated)
- `src/services/invoices.ts` (updated)

## Dependencies

- React Query for state management
- Supabase for database operations
- Activity logging system
- Toast notification system
