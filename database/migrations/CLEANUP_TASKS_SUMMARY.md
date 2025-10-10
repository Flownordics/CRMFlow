# ✅ Cleanup Tasks - Complete Documentation

## 📋 Overview

Alle cleanup opgaver er nu dokumenteret med konkrete, klar-til-brug SQL scripts. Disse er **optional** forbedringer som kan implementeres efter de kritiske fixes er verificeret stabile.

---

## 📁 Genererede Filer

### Dokumentation
- ✅ `CLEANUP_TASKS.md` - Komplet guide til alle cleanup opgaver
- ✅ `CLEANUP_TASKS_SUMMARY.md` - Dette dokument (executive summary)

### SQL Scripts (OPTIONAL)
- ✅ `OPTIONAL_cleanup_unused_indexes.sql` - Index cleanup efter verification
- ✅ `OPTIONAL_add_soft_deletes.sql` - Soft delete implementation  
- ✅ `OPTIONAL_add_generic_audit_trail.sql` - Generisk audit trail

---

## 🗂️ Opgave 1: Unused Index Cleanup

### Status: ⏳ VENT 1-2 UGER

**Situation:**
- 🔴 90 indexes viser 0 usage
- Men 9 af dem tilføjede vi i DAG (behøver tid til at blive brugt)
- ~15-20 er system indexes (unique constraints - skal beholdes)
- **~60-70 kan potentielt droppes**

### Hvad Skal Gøres:

#### Uge 1: Monitor
1. Lad de nye indexes arbejde
2. Observér application usage patterns
3. Kør ingen cleanup endnu

#### Uge 2-3: Analyse
```sql
-- Kør denne query efter 2 uger
SELECT * FROM database/migrations/OPTIONAL_cleanup_unused_indexes.sql
```

#### Efter Verification: Cleanup
Drop bekræftede ubrugte indexes (estimeret 60-70 stk)

### Forventet Gevinst:
- 💾 Disk space: ~500-600 KB frigjort
- ⚡ Write performance: 5-10% forbedring
- 🧹 Maintenance: Mindre vacuum/analyze tid

### Risiko: **LAV**
- Alle drops kan rulles tilbage
- Test i staging først

---

## 🗑️ Opgave 2: Soft Delete Implementation

### Status: 📝 KLAR TIL DEPLOYMENT

**Problem:**  
Hvis en bruger sletter en deal, company eller invoice ved et uheld, er det væk for evigt.

**Løsning:**  
Soft deletes - tilføj `deleted_at` kolonne og "skjul" i stedet for at slette.

### Tabeller at Implementere På:

**Høj Prioritet:**
- ✅ companies
- ✅ people  
- ✅ deals
- ✅ quotes
- ✅ orders
- ✅ invoices

**Medium Prioritet:**
- documents
- activities
- tasks

### Hvad Scriptet Gør:

1. Tilføjer `deleted_at TIMESTAMPTZ` kolonne
2. Opretter indexes for hurtige queries
3. Opretter views (`active_companies`, etc.) der auto-filtrerer
4. Tilføjer helper functions:
   - `soft_delete(table, id)` - Soft delete record
   - `restore_deleted(table, id)` - Restore record
   - `permanently_delete_old(table, days)` - Cleanup gamle records

### Application Changes Påkrævet:

```typescript
// BEFORE:
await supabase.from('companies').delete().eq('id', id)

// AFTER:
await supabase.from('companies')
  .update({ deleted_at: new Date() })
  .eq('id', id)

// Or use helper function:
await supabase.rpc('soft_delete', { 
  p_table_name: 'companies', 
  p_record_id: id 
})
```

### UI Features to Add:

1. **"Recently Deleted" View:**
   ```sql
   SELECT * FROM companies 
   WHERE deleted_at > NOW() - INTERVAL '30 days'
   ORDER BY deleted_at DESC
   ```

2. **"Restore" Button:** 
   Call `restore_deleted(table, id)`

3. **Auto-filter Deleted:**
   Add `WHERE deleted_at IS NULL` to alle queries
   Or brug `active_*` views

### Forventet Gevinst:
- ✅ Kan restore slettede records
- ✅ "Trash bin" funktion i UI
- ✅ Bedre audit trail
- ✅ Compliance med data retention

### Trade-offs:
- ⚠️ Alle queries skal filtrere deleted
- ⚠️ Database size stiger lidt
- ⚠️ Skal have cleanup job

### Deployment:
```bash
# Apply migration
supabase db execute -f database/migrations/OPTIONAL_add_soft_deletes.sql

# Update application queries
# Add UI for "Recently Deleted"
```

---

## 📝 Opgave 3: Generic Audit Trail

### Status: 📝 KLAR TIL DEPLOYMENT

**Problem:**  
Du kan ikke se hvem der ændrede company info, invoice amount, eller quote status.

**Løsning:**  
Generisk `audit_trail` tabel der tracker ALLE ændringer til kritiske data.

### Hvad Trackes:

**Automatisk via triggers:**
- companies ✅
- people ✅
- deals ✅
- quotes ✅
- orders ✅
- invoices ✅
- payments ✅
- line_items ✅

### Data Captured:

For hver ændring gemmes:
- 📍 **Hvad:** Table name + record ID
- 👤 **Hvem:** User ID + email
- ⏰ **Hvann:** Timestamp
- 🔄 **Type:** INSERT / UPDATE / DELETE
- 📊 **Detaljer:** Old values, new values, hvilke felter ændret
- 🌐 **Context:** IP, user agent, request ID (optional)

### Hvad Scriptet Gør:

1. Opretter `audit_trail` tabel med JSONB kolonner
2. Tilføjer indexes for hurtige queries
3. Opretter trigger function `log_audit_trail()`
4. Tilføjer triggers til alle vigtige tabeller
5. Opretter nyttige views:
   - `recent_audit_changes` - Seneste ændringer
   - `user_audit_activity` - User aktivitet
6. Cleanup function for gamle audit records

### Use Cases:

```sql
-- Se alle ændringer til en company
SELECT * FROM audit_trail
WHERE table_name = 'companies' AND record_id = 'uuid'
ORDER BY changed_at DESC;

-- Se hvem der ændrede invoice amount
SELECT 
  u.email,
  changed_at,
  old_values->>'total_minor' AS old_amount,
  new_values->>'total_minor' AS new_amount
FROM audit_trail a
JOIN auth.users u ON a.user_id = u.id
WHERE table_name = 'invoices' 
AND record_id = 'uuid'
AND 'total_minor' = ANY(changed_fields);

-- Find hvem der slettede en deal
SELECT u.email, changed_at, old_values
FROM audit_trail a
JOIN auth.users u ON a.user_id = u.id
WHERE table_name = 'deals' 
AND record_id = 'uuid'
AND operation = 'DELETE';
```

### UI Features to Add:

1. **"View History" Button:** 
   Vis audit trail for record

2. **"Last Modified" Label:**
   ```
   Last modified by john@company.com on Jan 11, 2025
   ```

3. **"Changes" Tab:**
   Timeline af alle ændringer med diff view

### Forventet Gevinst:
- ✅ Komplet change history
- ✅ Compliance & security requirements
- ✅ Debug data issues
- ✅ Recover from mistakes
- ✅ "Who changed what when" reporting

### Trade-offs:
- ⚠️ Database size stiger (2-5x audited tables)
- ⚠️ Write performance: ~5-10% overhead
- ⚠️ Skal have cleanup job

### Deployment:
```bash
# Apply migration
supabase db execute -f database/migrations/OPTIONAL_add_generic_audit_trail.sql

# No application changes needed! Triggers run automatically

# Optional: Add "View History" UI feature
```

---

## 📊 Summary & Prioritering

### Timeline:

#### Nu → Uge 1:
- ⏳ **Monitor nye indexes** (ingen action)
- ✅ **Verificer kritiske fixes** er stabile

#### Uge 2-3:
- 🗂️ **Analyse unused indexes**
- 🗑️ **Implementer soft deletes** (hvis ønsket)
- 📝 **Implementer audit trail** (hvis ønsket)

#### Uge 4+:
- 🧹 **Drop bekræftede unused indexes**
- 🔍 **Add full-text search** (hvis search feature bygges)

### Anbefalet Prioritering:

1. **FIRST** (Efter 2 uger): 🗑️ **Soft Deletes**
   - Størst værdi
   - Mindst kompleksitet
   - Beskytter mod accidents

2. **SECOND** (Efter 3 uger): 📝 **Audit Trail**
   - God for compliance
   - Nyttig for debugging
   - Større database impact

3. **THIRD** (Efter 4 uger): 🗂️ **Index Cleanup**
   - Mindst kritisk
   - Kræver grundig verification
   - Beskeden gevinst

### Estimeret Effort:

| Opgave | Development | Testing | Total |
|--------|------------|---------|-------|
| Soft Deletes | 4-6 timer | 2-3 timer | 6-9 timer |
| Audit Trail | 2-3 timer | 1-2 timer | 3-5 timer |
| Index Cleanup | 1-2 timer | 2-3 timer | 3-5 timer |
| **Total** | **7-11 timer** | **5-8 timer** | **12-19 timer** |

---

## 🎯 Success Metrics

### Soft Deletes:
- ✅ < 5 user complaints about accidental deletes
- ✅ > 90% of deletes are soft deletes
- ✅ Restore feature used successfully

### Audit Trail:
- ✅ All critical changes logged
- ✅ < 10% write performance impact
- ✅ Audit queries < 100ms response time

### Index Cleanup:
- ✅ 60+ unused indexes dropped
- ✅ No query performance degradation
- ✅ 5-10% write performance improvement

---

## 🔗 Resources

- [Full Cleanup Guide](./CLEANUP_TASKS.md)
- [Index Cleanup Script](./OPTIONAL_cleanup_unused_indexes.sql)
- [Soft Delete Script](./OPTIONAL_add_soft_deletes.sql)
- [Audit Trail Script](./OPTIONAL_add_generic_audit_trail.sql)
- [Database Audit Report](../../COMPLETE%20DATABASE%20AUDIT%20-%20CRMFlow%20Supaba.ini)

---

## ✅ Konklusion

Alle cleanup opgaver er nu:
- ✅ **Dokumenteret** med detaljerede guides
- ✅ **Implementeret** som klar-til-brug SQL scripts
- ✅ **Prioriteret** med clear timeline
- ✅ **Estimeret** for effort og impact

**Næste skridt:**  
Afvent 1-2 uger for verification af kritiske fixes, derefter start med soft deletes implementation.

---

*Completed: 2025-01-11*  
*Status: Ready for implementation after verification period*  
*Estimated Total Value: High - significant improvements to data safety, auditability, and performance*

