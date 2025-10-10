# Call Lists & Activity Tracking - Deployment Guide

## Quick Start

Denne guide beskriver hvordan man deployer ringeliste- og aktivitetstracking-funktionaliteten til CRMFlow.

## Prerequisites

- PostgreSQL database (Supabase)
- Node.js 18+ og npm/bun
- Eksisterende CRMFlow installation

## Deployment Steps

### 1. Database Migration

Kør SQL migration filen:

```bash
# Via Supabase CLI
supabase db push --file database/migrations/20250130000000_call_lists_activity_indicators.sql

# Eller via Supabase Dashboard
# 1. Gå til SQL Editor
# 2. Copy/paste indholdet fra migrations filen
# 3. Kør query
```

#### Verificer Migration

```sql
-- Check at tabeller er oprettet
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_lists', 'call_list_items', 'activity_log');

-- Check at companies tabellen har nye kolonner
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('last_activity_at', 'activity_status', 'do_not_call');

-- Check at funktioner er oprettet
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('compute_activity_status', 'update_company_activity_status');

-- Check at triggers er oprettet
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trg_activity_log_update_company';
```

### 2. Install Dependencies

Projektet bruger eksisterende dependencies, men verificer at alt er opdateret:

```bash
npm install
# eller
bun install
```

### 3. TypeScript Compilation

Verificer at der ikke er TypeScript errors:

```bash
npm run type-check
# eller
tsc --noEmit
```

### 4. Build Application

```bash
npm run build
# eller
bun run build
```

### 5. Run Tests

```bash
npm run test
# eller
bun test
```

Test specifikt call lists funktionalitet:

```bash
npm run test -- callLists.test.ts
```

### 6. Deploy

#### Netlify Deployment

```bash
# Build og deploy
npm run build
netlify deploy --prod

# Eller via git push (automatisk deploy)
git add .
git commit -m "feat: add call lists and activity tracking"
git push origin main
```

#### Vercel Deployment

```bash
vercel --prod
```

## Post-Deployment Verification

### 1. Database Health Check

```sql
-- Verificer at activity_status er sat for eksisterende virksomheder
SELECT 
  activity_status,
  COUNT(*) as count
FROM companies
GROUP BY activity_status;

-- Forventet output:
-- activity_status | count
-- ----------------+-------
-- red            | N
-- yellow         | M
-- green          | K
-- (null)         | 0  (Should be 0 after migration)

-- Check indekser
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('companies', 'call_lists', 'call_list_items', 'activity_log');
```

### 2. Test UI Functionality

1. **Login til applikationen**
   - Naviger til `/login`
   - Log ind med valid bruger

2. **Test Call Lists Page**
   - Naviger til `/call-lists`
   - Verificer at siden loader korrekt
   - Klik "Auto-ringeliste (20)"
   - Verificer at dialog åbner
   - Generer liste og verificer redirect til detail side

3. **Test Call Flow**
   - På detail siden, verificer at virksomhedsinfo vises
   - Test "Næste"/"Forrige" navigation
   - Vælg et udfald (fx "Gennemført")
   - Tilføj noter
   - Klik "Log aktivitet"
   - Verificer at item markeres som completed

4. **Test Activity Status**
   - Naviger til `/companies`
   - Verificer at aktivitetsstatus vises (farvet cirkel)
   - Test filtrering på rød/gul/grøn
   - Log en aktivitet på en virksomhed
   - Verificer at status opdateres (kan kræve page refresh)

5. **Test Export**
   - I en ringeliste, klik "Eksporter"
   - Verificer CSV download

### 3. Performance Check

```sql
-- Test query performance for auto-generate
EXPLAIN ANALYZE
SELECT id, name, phone, activity_status, last_activity_at
FROM companies
WHERE activity_status = 'red'
  AND do_not_call = false
  AND phone IS NOT NULL
ORDER BY last_activity_at ASC NULLS LAST
LIMIT 20;

-- Forventet: Execution time < 50ms for 100k rows med indekser
```

## Rollback Plan

Hvis der opstår problemer efter deployment:

### 1. Rollback Database

```sql
-- Drop triggers først
DROP TRIGGER IF EXISTS trg_activity_log_update_company ON activity_log;
DROP TRIGGER IF EXISTS trg_call_lists_updated_at ON call_lists;
DROP TRIGGER IF EXISTS trg_call_list_items_updated_at ON call_list_items;

-- Drop funktioner
DROP FUNCTION IF EXISTS update_company_activity_status(UUID);
DROP FUNCTION IF EXISTS trg_update_company_activity();
DROP FUNCTION IF EXISTS compute_activity_status(TIMESTAMPTZ);

-- Drop tabeller (CAUTION: Dette sletter data)
DROP TABLE IF EXISTS call_list_items CASCADE;
DROP TABLE IF EXISTS call_lists CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;

-- Fjern kolonner fra companies (CAUTION: Dette sletter data)
ALTER TABLE companies 
  DROP COLUMN IF EXISTS last_activity_at,
  DROP COLUMN IF EXISTS activity_status,
  DROP COLUMN IF EXISTS do_not_call;
```

### 2. Rollback Code

```bash
git revert HEAD
git push origin main
```

## Troubleshooting

### Issue: "Call Lists" link vises ikke i navigation

**Løsning:**
1. Check at `/src/components/layout/AppSidebar.tsx` inkluderer Call Lists item
2. Verificer at import af `Phone` icon er korrekt
3. Clear browser cache og reload

### Issue: Activity status vises ikke på virksomheder

**Løsning:**
1. Verificer at migration er kørt korrekt
2. Check at `companies` tabellen har `activity_status` kolonne
3. Kør update query:
   ```sql
   UPDATE companies 
   SET activity_status = compute_activity_status(last_activity_at)
   WHERE activity_status IS NULL;
   ```

### Issue: Auto-generering returnerer altid 0 virksomheder

**Løsning:**
1. Check at virksomheder har telefonnummer:
   ```sql
   SELECT COUNT(*) FROM companies WHERE phone IS NOT NULL;
   ```
2. Check at virksomheder har activity_status:
   ```sql
   SELECT COUNT(*) FROM companies WHERE activity_status IS NOT NULL;
   ```
3. Hvis ingen har status, kør initialization:
   ```sql
   UPDATE companies 
   SET activity_status = compute_activity_status(last_activity_at);
   ```

### Issue: TypeScript errors efter deployment

**Løsning:**
1. Verificer at alle schema filer er korrekt importeret
2. Run type check: `npm run type-check`
3. Check at `@/lib/schemas/callList.ts` eksisterer
4. Verificer at imports i services bruger korrekt paths

## Environment Variables

Ingen nye environment variables er påkrævet. Systemet bruger eksisterende Supabase konfiguration.

## Monitoring & Logging

### Key Metrics to Monitor

1. **Call List Creation Rate**
   ```sql
   SELECT COUNT(*) as lists_created_today
   FROM call_lists
   WHERE created_at::date = CURRENT_DATE;
   ```

2. **Activity Logging Rate**
   ```sql
   SELECT 
     DATE(created_at) as date,
     type,
     COUNT(*) as count
   FROM activity_log
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at), type
   ORDER BY date DESC;
   ```

3. **Activity Status Distribution**
   ```sql
   SELECT 
     activity_status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM companies
   GROUP BY activity_status;
   ```

### Error Logging

Errors logges via `@/lib/logger`. Check logs for:
- `'fetchCallLists'`
- `'createCallList'`
- `'autoGenerateCallList'`
- `'logCompanyActivity'`

## Backup Recommendations

### Before Migration

```bash
# Backup Supabase database
pg_dump -h your-db-host -U your-user -d your-db > backup_before_call_lists.sql

# Eller via Supabase Dashboard
# Settings > Database > Backup now
```

### Regular Backups

Enable automatic backups i Supabase Dashboard:
- Settings > Database > Backup schedule: Daily

## Support & Documentation

- **Implementeringsguide**: `/CALL_LISTS_AND_ACTIVITY_TRACKING.md`
- **Database schema**: `/database/migrations/20250130000000_call_lists_activity_indicators.sql`
- **API dokumentation**: Se service files i `/src/services/`

## Success Criteria

Deployment er succesfuld når:

- ✅ Database migration kørt uden errors
- ✅ Alle tests passerer
- ✅ Application bygger uden errors
- ✅ Call Lists link vises i navigation
- ✅ Auto-generering opretter liste med virksomheder
- ✅ Call flow fungerer med logging
- ✅ Activity status vises og opdateres korrekt
- ✅ Filtrering på activity status virker
- ✅ CSV export fungerer
- ✅ Performance er acceptabel (<200ms for queries)

## Post-Launch Tasks

1. **Monitor første 24 timer:**
   - Check error rates i logs
   - Monitor database performance
   - Verificer at triggers kører korrekt

2. **User Training:**
   - Opret guide til slutbrugere
   - Demo call flow til salgsteam
   - Forklar lampe-system (grøn/gul/rød)

3. **Optimering:**
   - Monitor query performance
   - Tilføj yderligere indekser hvis nødvendigt
   - Overvej database maintenance (VACUUM ANALYZE)

## Contact

For spørgsmål eller problemer under deployment, kontakt udviklingsteamet.
