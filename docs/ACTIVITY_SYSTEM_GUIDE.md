# Activity System - Komplet Guide

## 📊 Overview

CRMFlow har et komplet aktivitetstracking system der automatisk holder styr på alle interaktioner med virksomheder og opdaterer deres status baseret på hvor nyligt de er blevet kontaktet.

---

## 🎯 **Formål**

Aktivitetssystemet gør det muligt at:
1. **Tracke alle interaktioner** med virksomheder (calls, emails, meetings, deals, quotes, orders, etc.)
2. **Automatisk beregne aktivitetsstatus** (🟢 Grøn, 🟡 Gul, 🔴 Rød)
3. **Prioritere opfølgning** via Call Lists systemet
4. **Se komplet historik** for hver virksomhed

---

## 🗄️ **Database Struktur**

### **`activity_log` Tabel**

```sql
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'call', 'email', 'meeting', 'note', 'task',
    'deal', 'quote', 'order', 'invoice', 'payment'
  )),
  outcome TEXT,  -- For calls: 'completed', 'voicemail', 'no_answer', etc.
  notes TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  related_type TEXT CHECK (related_type IN ('deal','quote','order','invoice','payment')),
  related_id UUID,  -- Link to related entity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### **Aktivitetstyper:**

| Type | Beskrivelse | Kræver Outcome | Related Entity |
|------|-------------|----------------|----------------|
| **call** | Telefonopkald | Ja | - |
| **email** | Email sendt/modtaget | Nej | - |
| **meeting** | Fysisk/virtual møde | Nej | - |
| **note** | Intern note | Nej | - |
| **task** | Opgave relateret til virksomhed | Nej | - |
| **deal** | Deal oprettet | - | deal_id |
| **quote** | Tilbud oprettet | - | quote_id |
| **order** | Ordre oprettet | - | order_id |
| **invoice** | Faktura oprettet | - | invoice_id |
| **payment** | Betaling modtaget | - | invoice_id |

### **Call Outcomes:**

**Opdaterer Activity Status (Reel Kontakt):**
- ✅ `completed` - Gennemført samtale
- ✅ `voicemail` - Besked efterladt (HAR kontaktet virksomheden)
- ✅ `busy` - Telefonen var optaget (telefonen virker, de er aktive)
- ✅ `scheduled_followup` - Opfølgning planlagt

**Opdaterer IKKE Status (Ingen Kontakt):**
- ❌ `no_answer` - Ingen svarede (ingen reel kontakt)
- ❌ `wrong_number` - Forkert nummer (skal opdateres)

---

## 🎨 **Activity Status Beregning**

### **Automatisk Trigger:**

Når en aktivitet logges, køres automatisk denne trigger:

```sql
CREATE TRIGGER trg_activity_log_update_company
AFTER INSERT ON public.activity_log
FOR EACH ROW EXECUTE PROCEDURE trg_update_company_activity();
```

Triggeren:
1. Finder seneste aktivitet for virksomheden
2. Beregner ny status via `compute_activity_status()`
3. Opdaterer `companies.activity_status` og `companies.last_activity_at`

### **Status Logik:**

```sql
FUNCTION compute_activity_status(p_last_activity_at TIMESTAMPTZ)
RETURNS TEXT

Logik:
- NULL eller >180 dage → 🔴 'red'
- 91-180 dage → 🟡 'yellow'
- ≤90 dage → 🟢 'green'
```

---

## 💻 **UI Integration**

### **1. Company Page - Activity Tab**

`/companies/:id` → Activity Tab

Komponenten: `CompanyActivityTimeline`

**Features:**
- ✅ Viser alle aktiviteter i kronologisk rækkefølge (nyeste først)
- ✅ "Log Aktivitet" knap til at tilføje nye aktiviteter
- ✅ Ikoner for hver aktivitetstype
- ✅ Link til relaterede deals/quotes/orders
- ✅ Outcome badges (gennemført, voicemail, etc.)
- ✅ Relative tidsstempler ("5 dage siden")

### **2. Company Overview - Activity Status Card**

Viser:
- **Status badge** med farve (🟢🟡🔴) og label
- **Sidst kontaktet** med antal dage
- **"Ring ikke" advarsel** hvis markeret

### **3. Companies List - Status Column**

- Farvet cirkel viser status
- Kan filtreres på status (grøn/gul/rød)
- Bruges til at identificere virksomheder der skal kontaktes

### **4. Call Lists - Auto-Generate**

Prioritering baseret på activity_status:
1. 🔴 **Røde** først (ældste først)
2. 🟡 **Gule** (hvis plads)
3. 🟢 **Grønne** (hvis stadig plads)

---

## 🔧 **Programmatisk Brug**

### **Log Manuel Aktivitet:**

```typescript
import { useLogCompanyActivity } from "@/services/activityLog";

const logActivity = useLogCompanyActivity(companyId);

// Log opkald
await logActivity.mutateAsync({
  companyId: "...",
  type: "call",
  outcome: "completed",
  notes: "Drøftede nyt projekt"
});
```

### **Auto-Log ved Document Creation:**

```typescript
import { logDealCreated, logQuoteCreated } from "@/services/activityLog";

// Efter deal oprettes
await logDealCreated(companyId, dealId, dealTitle);

// Efter quote oprettes
await logQuoteCreated(companyId, quoteId, quoteNumber);
```

### **Helper Funktioner:**

```typescript
// Simple helpers
logCall(companyId, "completed", "Godt møde");
logEmail(companyId, "completed", "Sendt kontrakt");
logMeeting(companyId, "scheduled_followup", "Næste møde om 2 uger");
logNote(companyId, "Virksomheden udvider til Sverige");

// Auto-logging
logDealCreated(companyId, dealId, "Nyt enterprise deal");
logQuoteCreated(companyId, quoteId, "QUOTE-2025-0042");
logOrderCreated(companyId, orderId, "ORDER-2025-0123");
logInvoiceCreated(companyId, invoiceId, "INV-2025-0099");
logPaymentReceived(companyId, invoiceId, 50000000); // 500,000 DKK
```

---

## 🔗 **Integration Points**

### **Hvor aktiviteter SKAL logges automatisk:**

1. **✅ Når et Deal oprettes** → `type: 'deal'`
2. **✅ Når et Quote sendes** → `type: 'quote'`
3. **✅ Når en Order konverteres** → `type: 'order'`
4. **✅ Når en Invoice sendes** → `type: 'invoice'`
5. **✅ Når en Payment registreres** → `type: 'payment'`
6. **✅ Via Call Lists** → `type: 'call'` med outcome

### **Hvor brugeren logger manuelt:**

1. **Company Activity Tab** - "Log Aktivitet" knap
2. **Call Lists** - Efter hvert opkald
3. **(Future)** Quick actions i Company Overview

---

## 🧪 **Test Scenarios**

### **1. Test Activity Logging:**
```
1. Gå til Companies → Vælg virksomhed
2. Gå til Activity tab
3. Klik "Log Aktivitet"
4. Vælg type (Call)
5. Vælg outcome (Gennemført)
6. Tilføj note
7. Gem
→ Aktivitet vises øverst
→ Activity status opdateres automatisk
```

### **2. Test Auto-Logging:**
```
1. Opret et nyt deal for virksomhed
2. Gå til virksomhedens Activity tab
→ "Deal oprettet" aktivitet vises
→ Link til deal fungerer
→ Activity status opdateret
```

### **3. Test Call List Integration:**
```
1. Gå til Call Lists
2. Opret auto-ringeliste
→ Røde virksomheder vises først
3. Gennemfør call flow
4. Log aktivitet med outcome
→ Virksomhedens status opdateres
→ Næste gang de er grønne/gule
```

---

## 📈 **Performance Optimering**

### **Database Indexes:**

```sql
-- Activity logs per company (fast lookup)
CREATE INDEX idx_activity_log_company 
ON activity_log (company_id, created_at DESC);

-- Activity status filtering (for Call Lists)
CREATE INDEX idx_companies_activity_status 
ON companies (activity_status, last_activity_at NULLS LAST);

-- Related entities lookup
CREATE INDEX idx_activity_log_related 
ON activity_log (related_type, related_id);
```

### **React Query Caching:**

- Activity logs cachet per company
- Automatisk invalidering ved nye aktiviteter
- Company liste invalideres ved status ændring

---

## 🚀 **Fremtidige Forbedringer**

### **Potentielle Features:**

1. **Email Integration**
   - Auto-log når emails sendes via Gmail integration
   - Sync email historik

2. **Calendar Integration**
   - Auto-log møder fra Google Calendar
   - Link calendar events til aktiviteter

3. **Activity Templates**
   - Gem ofte brugte noter
   - Quick actions (ex. "Follow-up call")

4. **Activity Reminders**
   - Notifikationer for opfølgning
   - "Ring igen om X dage"

5. **Activity Analytics**
   - Rapporter over kontakthyppighed
   - Sales aktivitetsmål
   - Team performance metrics

---

## 🎯 **Bedste Praksis**

### **For Sælgere:**

1. **Log ALTID aktiviteter** - Det holder status opdateret
2. **Brug outcomes** - Gør det lettere at følge op
3. **Tilføj noter** - Kontekst er guld værd næste gang
4. **Brug Call Lists** - Lad systemet prioritere for dig

### **For Administratorer:**

1. **Markér "Ring ikke"** virksomheder korrekt
2. **Sørg for telefonnumre** er tilføjet
3. **Monitor røde virksomheder** - De risikerer at blive glemt
4. **Brug aktivitets-filter** i Companies listen

---

## 📝 **API Reference**

### **Fetch Activities:**
```typescript
const { data } = useCompanyActivityLogs(companyId);
```

### **Log Activity:**
```typescript
const logActivity = useLogCompanyActivity(companyId);

await logActivity.mutateAsync({
  companyId: "uuid",
  type: "call",
  outcome: "completed",
  notes: "Note text",
  relatedType: "deal", // optional
  relatedId: "deal-uuid" // optional
});
```

### **Helper Functions:**
```typescript
logCall(companyId, outcome, notes?)
logEmail(companyId, outcome, notes?)
logMeeting(companyId, outcome, notes?)
logNote(companyId, notes)
logDealCreated(companyId, dealId, title)
logQuoteCreated(companyId, quoteId, number)
logOrderCreated(companyId, orderId, number)
logInvoiceCreated(companyId, invoiceId, number)
logPaymentReceived(companyId, invoiceId, amount)
```

---

## ✅ **Summary**

Activity systemet er nu fuldt integreret og klar til brug:

- ✅ Database setup komplet
- ✅ Automatiske triggers fungerer
- ✅ UI komponenter klar
- ✅ Call Lists integration
- ✅ Test data oprettet
- ✅ Helper funktioner tilgængelige

**Næste skridt:** Test systemet grundigt og tilføj auto-logging til alle relevante document creation flows.

