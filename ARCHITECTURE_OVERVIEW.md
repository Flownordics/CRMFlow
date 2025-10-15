# CRMFlow - Arkitektur og Multi-Tenancy Overblik

**Dato**: 15. oktober 2025  
**Status**: Produktionsklar CRM-system med single-tenant arkitektur

---

## 📋 Executive Summary

CRMFlow er et **single-tenant CRM-system** designet til **én virksomhed med flere brugere**. Alle autentificerede brugere deler samme datasæt (virksomheder, deals, kontakter), men visse data er personlige for den enkelte bruger (kalenderevents, brugerindstillinger, integrationer).

**Arkitektur-model**: Shared Database, Single Tenant per Instance  
**Database**: Supabase (PostgreSQL)  
**Sikkerhedsmodel**: Row Level Security (RLS) med `auth.role() = 'authenticated'`

---

## 🏗️ Multi-Tenancy Arkitektur

### Nuværende Model: Single-Tenant med Delt Data

```
┌─────────────────────────────────────────────────┐
│           CRMFlow Instance (1 virksomhed)       │
├─────────────────────────────────────────────────┤
│  Bruger 1   │  Bruger 2   │  Bruger 3          │
│  (Sales)    │  (Manager)  │  (Support)         │
├─────────────────────────────────────────────────┤
│                                                 │
│         DELTE DATA (Alle har adgang)           │
│  • Companies                                    │
│  • People (Contacts)                            │
│  • Deals                                        │
│  • Quotes, Orders, Invoices                     │
│  • Pipelines & Stages                           │
│  • Documents                                    │
│  • Company Tags & Notes                         │
│  • Tasks (kan tildeles andre)                   │
│  • Activity Log                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│      PERSONLIGE DATA (Isoleret per bruger)     │
│  • Calendar Events (created_by)                 │
│  • User Settings (preferences)                  │
│  • User Integrations (Google OAuth)             │
│  • Call Lists (kan deles valgfrit)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Hvad betyder dette i praksis?

**✅ DELT mellem alle brugere:**
- **Companies**: Alle kan se og redigere alle virksomheder
- **Deals**: Alle kan se alle deals (men kan filtrere på owner)
- **Contacts (People)**: Alle kan se og redigere alle kontakter
- **Quotes/Orders/Invoices**: Alle har fuld adgang
- **Pipelines & Stages**: Delt struktur for hele organisationen
- **Documents**: Alle kan uploade og se dokumenter
- **Tasks**: Kan tildeles til andre brugere, alle kan se alle tasks

**🔒 PERSONLIGT for hver bruger:**
- **Calendar Events**: Kun synlige for brugeren der oprettede dem
- **User Settings**: Kalender-præferencer, sync-indstillinger
- **User Integrations**: Google OAuth tokens (Gmail, Calendar)
- **Call Lists**: Ejes af én bruger, men kan deles med andre (`is_shared`)

---

## 🔐 Row Level Security (RLS) Implementation

### Sikkerhedsmodel

CRMFlow bruger Supabase Row Level Security med to hovedstrategier:

#### 1. **Shared Data Pattern** (Mest almindelig)

```sql
-- Eksempel: Companies, Deals, Quotes, etc.
CREATE POLICY "Allow authenticated users to manage companies" 
  ON public.companies 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
```

**Betydning**: Alle autentificerede brugere kan læse, oprette, opdatere og slette data.

**Anvendes på:**
- ✅ `companies` - Alle virksomheder
- ✅ `people` - Alle kontakter
- ✅ `deals` - Alle deals
- ✅ `quotes`, `orders`, `invoices` - Alle salgsdokumenter
- ✅ `line_items` - Alle linjeemner
- ✅ `payments` - Alle betalinger
- ✅ `activities` - Alle aktiviteter
- ✅ `documents` - Alle dokumenter
- ✅ `tasks` - Alle opgaver
- ✅ `call_lists` - Alle call lists (med is_shared flag)
- ✅ `activity_log` - Alle aktiviteter på companies
- ✅ `workspace_settings` - Global indstillinger

#### 2. **User-Isolated Data Pattern**

```sql
-- Eksempel: Events (personlige kalenderevents)
CREATE POLICY "events_select_own" 
  ON public.events 
  FOR SELECT 
  USING (created_by = auth.uid());
```

**Betydning**: Kun brugeren der oprettede data kan se og redigere dem.

**Anvendes på:**
- 🔒 `events` - Kun egne kalenderevents
- 🔒 `user_settings` - Kun egne præferencer
- 🔒 `user_integrations` - Kun egne Google OAuth connections

#### 3. **Ingen RLS** ⚠️ (Sikkerhedsproblem)

Følgende tabeller mangler RLS:
- ❌ `pipelines` - Ingen beskyttelse
- ❌ `stages` - Ingen beskyttelse  
- ❌ `deal_integrations` - Ingen beskyttelse
- ❌ `stage_probabilities` - Ingen beskyttelse
- ❌ `numbering_counters` - Ingen beskyttelse
- ❌ `company_tags` - Ingen beskyttelse
- ❌ `company_tag_assignments` - Ingen beskyttelse
- ❌ `company_notes` - Ingen beskyttelse

**Risiko**: Disse tabeller er åbne for alle autentificerede brugere uden RLS-validering.

---

## 📊 Database Schema Oversigt

### Core Entities (Delt Data)

| Tabel | Formål | RLS | Ejerkolonne | Delt/Personlig |
|-------|--------|-----|-------------|----------------|
| `companies` | Virksomheder | ✅ | `created_by` | ✅ Delt |
| `people` | Kontaktpersoner | ✅ | `created_by` | ✅ Delt |
| `deals` | Sales opportunities | ✅ | `owner_user_id`, `created_by` | ✅ Delt |
| `quotes` | Tilbud | ✅ | `created_by` | ✅ Delt |
| `orders` | Ordrer | ✅ | `created_by` | ✅ Delt |
| `invoices` | Fakturaer | ✅ | `created_by` | ✅ Delt |
| `payments` | Betalinger | ✅ | `created_by` | ✅ Delt |
| `tasks` | Opgaver | ✅ | `user_id`, `assigned_to` | ✅ Delt |
| `documents` | Filer/uploads | ✅ | `created_by` | ✅ Delt |
| `activity_log` | Company timeline | ✅ | `user_id` | ✅ Delt |

### Structure (Systemdata)

| Tabel | Formål | RLS | Delt/Personlig |
|-------|--------|-----|----------------|
| `pipelines` | Sales pipelines | ❌ | ✅ Delt |
| `stages` | Deal stages | ❌ | ✅ Delt |
| `stage_probabilities` | Win probability per stage | ❌ | ✅ Delt |
| `workspace_settings` | Branding, prefixes, valuta | ✅ | ✅ Delt |

### User-Specific Data (Personlig)

| Tabel | Formål | RLS | Isolation | Delt/Personlig |
|-------|--------|-----|-----------|----------------|
| `events` | Kalenderevents | ✅ | `created_by` | 🔒 Personlig |
| `user_settings` | User preferences | ✅ | `user_id` | 🔒 Personlig |
| `user_integrations` | OAuth tokens | ✅ | `user_id` | 🔒 Personlig |
| `call_lists` | Call lists | ✅ | `owner_user_id` + `is_shared` | 🔄 Valgfrit delt |

### Supporting Tables

| Tabel | Formål | RLS | Delt/Personlig |
|-------|--------|-----|----------------|
| `line_items` | Linjeemner (quotes/orders/invoices) | ✅ | ✅ Delt |
| `activities` | Deal timeline | ✅ | ✅ Delt |
| `deal_integrations` | Google Calendar sync | ❌ | ✅ Delt |
| `email_logs` | Email sending log | ✅ | ✅ Delt |
| `company_tags` | Tags for kategorisering | ❌ | ✅ Delt |
| `company_notes` | Rich text notes | ❌ | ✅ Delt |
| `idempotency_keys` | Prevent duplicate operations | ✅ | ✅ Delt |

---

## 🎯 Typiske Use Cases

### Scenarie 1: Sales Rep arbejder med Deals

**Bruger**: Sarah (Sales Rep)

1. **Logger ind** → Supabase Auth verificerer identity
2. **Ser Deals oversigt** → Får ALLE deals (ikke kun hendes egne)
3. **Filtrerer på "Mine deals"** → Frontend filtrerer på `owner_user_id = sarah.id`
4. **Opretter nyt Deal** → `owner_user_id` sættes til sarah.id, men andre kan stadig se det
5. **Tilføjer kalender event** → Kun Sarah kan se dette event (`events.created_by = sarah.id`)

**Vigtig pointe**: Selvom Sarah er "owner" af et deal, kan alle andre brugere se og redigere det.

### Scenarie 2: Manager ser Team Performance

**Bruger**: John (Manager)

1. **Logger ind** → Supabase Auth verificerer identity
2. **Går til Dashboard** → Ser ALLE deals for hele teamet
3. **Ser pipeline** → Delt pipeline-struktur som alle bruger
4. **Ser activity log** → Kan se alle aktiviteter på alle companies
5. **Kan IKKE se** → Andres kalenderevents, brugerindstillinger, OAuth tokens

### Scenarie 3: Call Lists (Hybrid Model)

**Bruger**: Emma (Sales)

1. **Opretter Call List** → `owner_user_id = emma.id`, `is_shared = false`
2. **Kun Emma kan se den** → Frontend filtrerer på `owner_user_id`
3. **Deler listen** → Sætter `is_shared = true`
4. **Nu kan alle se den** → Men kun Emma kan redigere (owner check i frontend)

**Note**: RLS tillader stadig alle at se listen, men frontend respekterer `is_shared` flag.

---

## 🚨 Kritiske Observationer og Anbefalinger

### ❌ Problem 1: Manglende Multi-Tenant Isolation

**Status Quo:**
```sql
-- NUVÆRENDE: Alle autentificerede brugere deler ALT
CREATE POLICY "Allow authenticated users to manage companies" 
  ON public.companies FOR ALL 
  USING (auth.role() = 'authenticated');
```

**Problem**: 
- Hvis to forskellige virksomheder bruger samme Supabase instance, kan de se hinandens data
- Ingen `organization_id` eller `workspace_id` kolonne til at isolere data

**Anbefaling**:
```sql
-- ANBEFALET: Tilføj workspace_id til alle tabeller
ALTER TABLE companies ADD COLUMN workspace_id UUID NOT NULL;

-- Opdater RLS policies
CREATE POLICY "Users can only see own workspace companies"
  ON companies FOR ALL
  USING (workspace_id = (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));
```

**Påvirkning**: Alle core tabeller skal have `workspace_id`:
- companies, people, deals, quotes, orders, invoices
- pipelines, stages
- tasks, documents, activity_log

### ❌ Problem 2: Manglende RLS på 8+ Tabeller

**Status**: Følgende tabeller har INGEN RLS aktiveret:

```sql
-- KRITISK: Ingen beskyttelse!
pipelines                  -- ❌ Ingen RLS
stages                     -- ❌ Ingen RLS
deal_integrations          -- ❌ Ingen RLS
stage_probabilities        -- ❌ Ingen RLS
numbering_counters         -- ❌ Ingen RLS
company_tags               -- ❌ Ingen RLS
company_tag_assignments    -- ❌ Ingen RLS
company_notes              -- ❌ Ingen RLS
```

**Risiko**: 
- Alle autentificerede brugere kan ændre pipeline-struktur
- Ingen audit trail på ændringer
- Potentiel data corruption

**Anbefaling**:
```sql
-- Aktiver RLS på alle tabeller
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
-- ... osv

-- Tilføj policies
CREATE POLICY "Allow authenticated users to manage pipelines"
  ON pipelines FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
```

### ⚠️ Problem 3: Performance Issues med RLS

**Status**: Alle RLS policies evalueres for hver række:

```sql
-- ❌ DÅRLIGT: Re-evaluerer for hver række
USING (auth.role() = 'authenticated')

-- ✅ BEDRE: Evalueres én gang per query
USING ((SELECT auth.role()) = 'authenticated')
```

**Påvirkning**: 33+ tabeller påvirket

**Anbefaling**: Kør migration `20250111000003_optimize_rls_policies.sql`

### ⚠️ Problem 4: Ingen RBAC (Role-Based Access Control)

**Status**: Alle autentificerede brugere har samme rettigheder

**Use Cases der mangler**:
- ❌ Admin kan slette deals, men Sales Rep kan ikke
- ❌ Manager kan se alle rapporter, men Sales Rep kun egne
- ❌ Support kan ikke redigere quotes
- ❌ Kun Admin kan ændre workspace settings

**Anbefaling**:
```sql
-- Tilføj user_roles tabel
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'sales', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opdater RLS policies
CREATE POLICY "Admins can delete deals"
  ON deals FOR DELETE
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin');
```

### ⚠️ Problem 5: Manglende Audit Trail

**Status**: 
- ✅ `activities` tabel for deals
- ✅ `task_activities` for tasks
- ❌ Ingen audit trail for: companies, people, quotes, orders, invoices, payments

**Anbefaling**:
```sql
-- Generisk audit_log tabel
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for alle tabeller
CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE
  ON companies FOR EACH ROW EXECUTE FUNCTION log_audit();
```

### ⚠️ Problem 6: Function Security Issues

**Status**: 8 PL/pgSQL funktioner mangler `SET search_path`

**Risiko**: Privilege escalation attacks

**Funktioner påvirket**:
```sql
set_updated_at()
line_item_parent_exists()
next_doc_number()
update_tasks_updated_at()
create_task_activity()
compute_activity_status()
update_company_activity_status()
trg_update_company_activity()
```

**Anbefaling**:
```sql
-- Tilføj til alle funktioner
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Anbefalede Arkitektur-forbedringer

### Option A: Multi-Tenant Architecture (Anbefalet for SaaS)

**Hvis I planlægger at sælge CRMFlow til flere virksomheder:**

```
┌──────────────────────────────────────────────┐
│          Supabase Instance                    │
├──────────────────────────────────────────────┤
│  Workspace 1        │  Workspace 2           │
│  (Company A)        │  (Company B)           │
│  • 5 users          │  • 3 users             │
│  • 50 companies     │  • 30 companies        │
│  • 200 deals        │  • 150 deals           │
└──────────────────────────────────────────────┘
```

**Implementering**:

1. **Tilføj workspace_id til alle tabeller**
```sql
ALTER TABLE companies ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id);
ALTER TABLE deals ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id);
-- ... for alle core tabeller
```

2. **Opret workspaces og user_workspaces tabeller**
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',  -- free, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_workspaces (
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  role TEXT DEFAULT 'member',
  PRIMARY KEY (user_id, workspace_id)
);
```

3. **Opdater alle RLS policies**
```sql
CREATE POLICY "Users can only see own workspace companies"
  ON companies FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM user_workspaces 
      WHERE user_id = auth.uid()
    )
  );
```

**Fordele**:
- ✅ Fuld data isolation mellem virksomheder
- ✅ SaaS-ready
- ✅ Kan fakturere per workspace

**Ulemper**:
- ❌ Stor migration (påvirker alle tabeller)
- ❌ Performance overhead (workspace check i hver query)

### Option B: Keep Single-Tenant + Add RBAC (Anbefalet for intern brug)

**Hvis CRMFlow kun bruges af én virksomhed:**

Behold nuværende arkitektur, men tilføj roller:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'sales', 'support', 'viewer');

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role user_role DEFAULT 'sales',
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opdater RLS policies med rolle-checks
CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  USING ((SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Sales can only update own deals"
  ON deals FOR UPDATE
  USING (
    owner_user_id = auth.uid() 
    OR (SELECT role FROM user_profiles WHERE user_id = auth.uid()) IN ('admin', 'manager')
  );
```

**Fordele**:
- ✅ Simpel at implementere
- ✅ Minimal migration
- ✅ Tilstrækkelig for én virksomhed

**Ulemper**:
- ❌ Ikke multi-tenant (kan ikke sælges som SaaS)

---

## 📈 Data Flow Eksempel

### Deal Creation Flow

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ 1. User creates deal
       ↓
┌──────────────────┐
│ Supabase Client  │
│ - Has JWT token  │
└──────┬───────────┘
       │ 2. INSERT INTO deals (...)
       ↓
┌───────────────────────────────────────┐
│        Supabase Database              │
│  ┌─────────────────────────────────┐  │
│  │  RLS Policy Evaluation          │  │
│  │  - Check: auth.role() = 'auth'? │  │
│  │  - ✅ Allow INSERT              │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Triggers                        │  │
│  │  - set_updated_at()             │  │
│  │  - Auto-set position            │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Insert to deals table          │  │
│  │  - owner_user_id = auth.uid()   │  │
│  │  - created_by = auth.uid()      │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
       │ 3. Return new deal
       ↓
┌──────────────────┐
│   Frontend       │
│   - Update UI    │
│   - Show success │
└──────────────────┘
```

### Data Visibility Example

```
User A creates:
  - Deal #1 (owner: User A)
  - Event #1 (created_by: User A)

User B logs in and sees:
  ✅ Deal #1 (because all deals are shared)
  ❌ Event #1 (because events are user-isolated)

User B creates:
  - Deal #2 (owner: User B)

User A can now see:
  ✅ Deal #1 (owns it)
  ✅ Deal #2 (all deals are shared)
```

---

## 🔍 Testing & Verification

### Verify RLS is Working

```sql
-- Test 1: Verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test 2: Check which policies exist
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 3: Test as specific user
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-id-here';
SELECT * FROM companies;  -- Should only see allowed data
RESET ROLE;
```

### Frontend Testing Checklist

- [ ] User A cannot see User B's calendar events
- [ ] User A CAN see User B's deals
- [ ] User A cannot modify User B's user_settings
- [ ] User A CAN modify deals owned by User B
- [ ] Unauthenticated users cannot access any data
- [ ] Deleted deals (soft delete) are not visible

---

## 📚 Nyttige Ressourcer

### Supabase Dokumentation
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
- [Multi-tenancy Guide](https://supabase.com/docs/guides/database/multi-tenancy)

### CRMFlow Interne Docs
- `database/RLS_EVENTS_USER_SETTINGS_README.md` - RLS for events
- `docs/INTEGRATIONS_README.md` - User integrations
- `COMPLETE DATABASE AUDIT - CRMFlow Supaba.ini` - Fuld database audit

---

## 🎯 Konklusion

**Nuværende Arkitektur**:
- ✅ Fungerer godt for **én virksomhed med flere brugere**
- ✅ Simple RLS policies (alle deler data)
- ❌ **IKKE multi-tenant** (kan ikke isolere forskellige virksomheder)
- ❌ Manglende granulær adgangskontrol (RBAC)
- ❌ Flere sikkerhedsproblemer (manglende RLS på 8 tabeller)

**Primære Handlingspunkter**:

1. **KRITISK**: Aktiver RLS på alle tabeller (pipelines, stages, etc.)
2. **KRITISK**: Fix function search paths
3. **HØJTPRIORITERET**: Implementer RBAC (roller) hvis flere brugertyper
4. **MEDIUM**: Optimer RLS policies for performance
5. **LAVERE**: Overvej multi-tenant migration hvis SaaS-plans

**For SaaS**: Implementer Option A (Multi-tenant)  
**For intern brug**: Implementer Option B (RBAC only)

---

*Dokumenteret af: Sovereign Architect*  
*Senest opdateret: 15. oktober 2025*

