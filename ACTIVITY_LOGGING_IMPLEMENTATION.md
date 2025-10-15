# Activity Logging - Implementation Complete ✅

## Oversigt

Alle aktiviteter på virksomhedsprofiler logges nu automatisk og vises i "Activity" fanen.

## Hvad Logger Vi Nu?

### 🤖 Automatisk Logging (Via Database Triggers)

#### Deals
✅ **Deal Creation** - Når en deal oprettes
✅ **Deal Stage Change** - Når en deal flytter mellem stages  
✅ **Deal Value Change** - Når deal værdi ændres >10%

#### Tasks
✅ **Task Creation** - Når en task oprettes med company_id
✅ **Task Completion** - Når en task markeres som completed

### 📝 Manuel Logging (Via UI)
✅ **Call Logging** - Med outcome (completed, voicemail, no answer, etc.)
✅ **Email Logging** - Email sent/received
✅ **Meeting Logging** - Møder afholdt/planlagt
✅ **Notes** - Generelle noter
✅ **Tasks** - Task aktiviteter

### 📄 Document Creation (Via Service Layer)
✅ **Quote Creation** - Når quote oprettes uden deal
✅ **Order Creation** - Når order oprettes uden deal  
✅ **Invoice Creation** - Via triggers når invoice oprettes
✅ **Payment Received** - Betalinger modtaget

## Database Changes

### 1. Tasks Table
```sql
ALTER TABLE tasks 
    ADD COLUMN company_id uuid REFERENCES companies(id);
```
Nu kan tasks linkes direkte til companies og logger automatisk til activity timeline.

### 2. Database Triggers

#### Deal Activity Trigger
```sql
CREATE TRIGGER trg_log_deal_activity
    AFTER INSERT OR UPDATE ON deals
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL)
    EXECUTE FUNCTION log_deal_to_company_activity();
```

**Logger:**
- Deal creation → activity_log
- Stage changes → activity_log  
- Value changes >10% → activity_log

#### Task Activity Trigger
```sql
CREATE TRIGGER trg_log_task_activity
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL)
    EXECUTE FUNCTION log_task_to_company_activity();
```

**Logger:**
- Task creation → activity_log (hvis company_id er sat)
- Task completion → activity_log

## Frontend Changes

### Services Updated

#### `src/services/quotes.ts`
```typescript
// useCreateQuote hook now logs to company when NO deal
if (!quote.deal_id && quote.company_id) {
    await logQuoteCreated(quote.company_id, quote.id, quote.number);
}
```

#### `src/services/orders.ts`
```typescript
// useCreateOrder hook now logs to company when NO deal
if (!order.deal_id && order.company_id) {
    await logOrderCreated(order.company_id, order.id, order.number);
}
```

### Helper Functions (Already Existed)

`src/services/activityLog.ts` provides:
- `logDealCreated(companyId, dealId, dealTitle)`
- `logQuoteCreated(companyId, quoteId, quoteNumber)`
- `logOrderCreated(companyId, orderId, orderNumber)`
- `logInvoiceCreated(companyId, invoiceId, invoiceNumber)`
- `logPaymentReceived(companyId, invoiceId, amountMinor)`

## Hvordan Det Virker

### Scenario 1: Deal Oprettes
```
User → Creates Deal
      ↓
Database Trigger Fires
      ↓
log_deal_to_company_activity()
      ↓
INSERT INTO activity_log (
    company_id, 
    type: 'deal',
    notes: 'Deal created: [title]',
    related_type: 'deal',
    related_id: [deal_id],
    meta: { action: 'created', ... }
)
      ↓
Company activity_status updates automatically
      ↓
Timeline on CompanyPage shows new activity
```

### Scenario 2: Standalone Quote Oprettes
```
User → Creates Quote (without deal)
      ↓
useCreateQuote onSuccess
      ↓
logQuoteCreated(companyId, quoteId, quoteNumber)
      ↓
INSERT INTO activity_log (
    company_id,
    type: 'quote',
    notes: 'Tilbud oprettet: [number]',
    related_type: 'quote',
    related_id: [quote_id]
)
      ↓
Timeline shows quote creation
```

### Scenario 3: Task med Company
```
User → Creates Task with company_id
      ↓
Database Trigger Fires
      ↓
log_task_to_company_activity()
      ↓
INSERT INTO activity_log (
    company_id,
    type: 'task',
    notes: 'Task created: [title]',
    related_type: 'task',
    related_id: [task_id],
    meta: { action: 'created', dueDate, priority }
)
      ↓
Timeline shows task activity
```

## Company Activity Timeline

På virksomhedsprofilen under "Activity" fanen vises nu:

```
Acme Corp - Activity Timeline
├─ 🤝 Deal created: "Website Redesign" - 2 hours ago
│  └─ Link to deal →
├─ 📄 Quote sent: Q-2025-001 - 5 hours ago  
│  └─ Link to quote →
├─ 📞 Call: Completed - 1 day ago
│  └─ Notes: "Discussed pricing and timeline"
├─ ✅ Task completed: "Send proposal" - 2 days ago
│  └─ Link to task →
├─ 🤝 Deal stage changed: "Website Redesign" - 3 days ago
│  └─ Moved to Negotiation
└─ 💰 Payment received: 125,000 DKK - 1 week ago
   └─ Link to invoice →
```

### Activity Icons
- 🤝 Deal - Deal aktiviteter
- 📄 Quote - Tilbud
- 🛒 Order - Ordrer
- 💰 Invoice/Payment - Fakturer og betalinger
- ✅ Task - Opgaver
- 📞 Call - Opkald
- 📧 Email - Emails
- 📅 Meeting - Møder
- 📝 Note - Noter

## Activity Status Indicators

Virksomheder får automatisk opdateret `activity_status`:
- 🟢 **Green** - Aktivitet inden for 90 dage (3 måneder)
- 🟡 **Yellow** - Aktivitet 90-180 dage siden (3-6 måneder)
- 🔴 **Red** - Aktivitet >180 dage siden (6+ måneder) eller ingen aktivitet

Dette opdateres automatisk via trigger når ny aktivitet logges.

## Migration Details

**Migration:** `20251015000001_add_company_activities_tracking.sql`

**Ændringer:**
1. ✅ Tilføjet `company_id` til tasks table
2. ✅ Oprettet `log_deal_to_company_activity()` function
3. ✅ Oprettet `log_task_to_company_activity()` function
4. ✅ Oprettet triggers på deals og tasks tables
5. ✅ Tilføjet indexes for performance

## Testing

### Manual Test
1. Opret en ny deal → Skal vises på virksomhedens activity timeline
2. Flyt deal til nyt stage → Skal logge "stage changed"
3. Opret quote uden deal → Skal vises på virksomhedens activity timeline
4. Opret task med company → Skal vises på activity timeline
5. Marker task som completed → Skal logge "completed"

### Expected Behavior
- Alle aktiviteter vises i kronologisk rækkefølge (nyeste først)
- Links til related entities virker (deals, quotes, orders, tasks)
- Activity status opdateres automatisk (grøn/gul/rød)
- Manuel logging via "Log Activity" knap virker stadig

## Performance Considerations

### Indexes Added
```sql
-- Tasks company lookup
CREATE INDEX idx_tasks_company 
    ON tasks (company_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Activity log queries (already existed)
CREATE INDEX idx_activity_log_company 
    ON activity_log (company_id, created_at DESC);
```

### Trigger Performance
- Triggers kører AFTER INSERT/UPDATE, så de blokerer ikke writes
- Triggers er SECURITY DEFINER med explicit search_path for sikkerhed
- Kun significant changes logges (f.eks. value change >10%)

## Future Enhancements

### Potential Additions
1. **Calendar Events** - Log møder fra kalender automatisk
2. **Email Integration** - Log emails sendt via integration
3. **Deal Won/Lost** - Special logging for deal outcomes
4. **Activity Feed** - Global activity feed på dashboard
5. **Activity Analytics** - Metrics om team aktivitet

### Configuration Options
```typescript
// I activityLog.ts kunne man tilføje:
export const ACTIVITY_CONFIG = {
    dealValueChangeThreshold: 0.10, // 10% change triggers log
    enableAutoLogging: true,
    logDetailLevel: 'standard', // 'minimal' | 'standard' | 'detailed'
};
```

## Troubleshooting

### Aktiviteter Vises Ikke
1. ✅ Check at triggers er enabled:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name IN ('trg_log_deal_activity', 'trg_log_task_activity');
   ```

2. ✅ Check at company_id er sat korrekt på entity
3. ✅ Check at entity ikke er soft-deleted (deleted_at IS NULL)

### Performance Issues
1. ✅ Verify indexes exist
2. ✅ Check activity_log row count - arkiver gamle entries hvis >100k
3. ✅ Consider partitioning activity_log by created_at

## Summary

✅ **Komplet activity tracking** på alle virksomheder
✅ **Automatisk logging** via database triggers
✅ **Manual logging** via UI
✅ **Cross-referenced** til deals, quotes, orders, invoices, tasks
✅ **Activity indicators** (grøn/gul/rød) opdateres automatisk
✅ **Performance optimized** med proper indexes
✅ **Scalable solution** der vokser med systemet

**Systemet logger nu ALT der sker på en virksomhed - både automatisk og manuelt!** 🎉


