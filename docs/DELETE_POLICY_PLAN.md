# DELETE POLICY - Kort og Konkret Plan

## 📊 Implementerings Status

**Fase 1: Standardisere Delete Dialogs** ✅ **FÆRDIG**  
**Fase 2: Dependency Validation** ✅ **FÆRDIG**  
**Fase 3: Trash Bin UX** ✅ **FÆRDIG**

**Sidst opdateret:** 2025-01-XX (efter implementering af Fase 1 & 2)

---

## Nuværende Status

### ✅ Hvad der virker:
- **Soft Delete implementeret** for: Companies, People, Deals, Quotes, Orders, Invoices
- **Restore funktionalitet** findes i services
- **Trash Bin** UI komponent findes i Settings
- Alle queries filtrerer `deleted_at IS NULL`

### ⚠️ Hvad der mangler/er inkonsistent:
- ~~Delete confirmation dialogs er inkonsistente (AlertDialog vs window.confirm)~~ ✅ **FIXET**
- ~~Fejlbeskeder siger "cannot be undone" selvom det er soft delete~~ ✅ **FIXET**
- ~~Ingen validering af dependencies før delete (f.eks. company med aktive deals)~~ ✅ **FIXET**
- ~~Ingen visning af impact/warnings i delete dialogs~~ ✅ **FIXET**
- Cascade delete regler er inkonsistente i databasen (Option A anbefalet - behold deal_id reference)

---

## Anbefalet Delete Policy

### 1. **SOFT DELETE er standard**
✅ **Bevare** soft delete for alle hovedentiteter
- Companies, People, Deals, Quotes, Orders, Invoices = **soft delete**
- Aktivitet, Dokumenter, Tasks = kan være **hard delete** (mindre kritisk)

**Begrundelse:** 
- Genopretning mulig
- Bevarer data integritet
- Compliance og audit trail

---

### 2. **Cascade Delete Regler**

#### **Company Delete:**
```
IF company has active deals → BLOCK delete
  - Vis: "Cannot delete company with active deals. Close or delete deals first."
ELSE → SOFT DELETE company
  - Cascade: SET NULL på people.company_id
  - Cascade: SET NULL på quotes/orders/invoices.company_id
```

#### **Person Delete:**
```
ALWAYS ALLOW → SOFT DELETE
  - Cascade: SET NULL på deals.contact_id
  - Cascade: SET NULL på quotes/orders/invoices.contact_id
```

#### **Deal Delete:**
```
VALIDATE dependencies før delete:

IF deal has ACTIVE quotes/orders/invoices → BLOCK delete
  - Active = ikke i "draft" eller "cancelled/declined" status
  - Active quotes: status IN ('sent', 'accepted')
  - Active orders: status IN ('accepted', 'invoiced', 'backorder')
  - Active invoices: status IN ('sent', 'paid', 'overdue')
  - Vis: "Cannot delete deal with active business items. 
          This deal has {X} active quotes, {Y} active orders, {Z} active invoices.
          Please complete, cancel, or delete these items first."

ELSE → ALLOW SOFT DELETE
  - Database constraint: ON DELETE SET NULL (kun ved HARD delete)
  - Soft delete: deal_id forbliver i quotes/orders/invoices (deal er stadig soft deleted)
  - WARNING (hvis draft/cancelled items): 
    * "This deal has {X} draft quotes, {Y} cancelled orders"
    * "These items will lose their deal reference but can still be viewed"
  - RECOMMENDATION: Behold deal_id reference selv efter soft delete (bevarer historik)
```

**Status Definitioner:**
- **Quote:** draft, sent, accepted, declined, expired
  - Active: sent, accepted
  - Inactive: draft, declined, expired
- **Order:** draft, accepted, cancelled, backorder, invoiced
  - Active: accepted, invoiced, backorder
  - Inactive: draft, cancelled
- **Invoice:** draft, sent, paid, overdue
  - Active: sent, paid, overdue
  - Inactive: draft

#### **Quote/Order/Invoice Delete:**
```
IF invoice.status = 'paid' → WARNING (men tillad)
IF invoice.status = 'sent' → WARNING (men tillad)
ELSE → SOFT DELETE
```

---

### 3. **Delete Confirmation UI Standard**

#### **Krav til alle delete dialogs:**
1. ✅ Brug `ConfirmationDialog` komponent (ikke window.confirm)
2. ✅ Vis korrekt besked: "This will be moved to trash and can be restored"
3. ✅ Vis impact/warnings hvis relevant:
   - "This company has 5 active deals"
   - "This invoice has been sent to customer"
   - "3 people are associated with this company"
4. ✅ Destructive styling (rød button)
5. ✅ Loading state under delete

#### **Beskeder:**

**Blocked Delete (Deal - med active items):**
```
❌ "Cannot delete deal with active business items."
✅ "Cannot delete deal. This deal has:
    - 2 active quotes (sent/accepted)
    - 1 active order (accepted/invoiced)
    - 1 active invoice (sent/paid)
    
    Please complete, cancel, or delete these items first, then try again."
```

**Standard Delete (Deal - kun inactive items):**
```
❌ "This action cannot be undone" (forkert - det er soft delete!)
✅ "This deal will be moved to trash. You can restore it from Settings > Trash Bin."
✅ "Note: This deal has 2 draft quotes and 1 cancelled order. 
    These items will lose their deal reference, but can still be viewed independently."
```

**Blocked Delete (Company):**
```
❌ "Cannot delete company with active deals."
✅ "Cannot delete company. This company has 3 active deals. 
    Please close or delete the deals first, then try again."
```

**Standard Delete (Company - no active deals):**
```
✅ "This company will be moved to trash. You can restore it from Settings > Trash Bin."
✅ "Note: 5 people associated with this company will lose their company reference."
```

---

### 4. **Implementation Plan**

#### **Fase 1: Standardisere Delete Dialogs** (PRIORITY) ✅ **FÆRDIG**
- [x] Opret `useDeleteWithValidation` hook (ikke nødvendig - bruger direkte dependency checks)
- [x] Opdater alle delete dialogs til at bruge `ConfirmationDialog`
- [x] Ret alle "cannot be undone" beskeder
- [x] Tilføj impact checking før delete

**Filer:**
- `src/components/deals/EditDealDrawer.tsx` ✅ (allerede fikset)
- `src/components/people/DeletePersonDialog.tsx` ✅ **OPDATERET**
- `src/components/invoices/EditInvoiceDialog.tsx` ✅ **OPDATERET** (fra window.confirm til ConfirmationDialog)
- `src/components/calendar/EditEventDialog.tsx` ✅ **OPDATERET** (fra window.confirm til ConfirmationDialog)
- `src/components/companies/EditCompanyModal.tsx` ✅ **TILFØJET** (delete funktionalitet med ConfirmationDialog)
- `src/pages/quotes/QuoteEditor.tsx` ✅ **OPDATERET** (fra AlertDialog til ConfirmationDialog)

#### **Fase 2: Dependency Validation** (HIGH) ✅ **FÆRDIG**
- [x] Tilføj `checkCompanyDependencies(companyId)` service function ✅
  - Returner: { hasActiveDeals: boolean, activeDealsCount: number }
  - Block delete hvis hasActiveDeals = true
- [x] Tilføj `checkDealDependencies(dealId)` service function ✅
  - Returner: {
      hasActiveItems: boolean,
      activeQuotes: number,
      activeOrders: number,
      activeInvoices: number,
      inactiveQuotes: number,
      inactiveOrders: number,
      inactiveInvoices: number
    }
  - Block delete hvis hasActiveItems = true
  - Vis WARNING (ikke block) hvis kun inactive items
  - Besked (blocked): "Cannot delete. {X} active quotes, {Y} active orders, {Z} active invoices."
  - Besked (warning): "Note: {X} draft/cancelled items will lose deal reference."
- [x] Implementer dependency checking i delete dialogs ✅
  - ✅ Implementeret i `EditDealDrawer.tsx`
  - ✅ Implementeret i `EditCompanyModal.tsx`
- [x] Vis klar fejlbesked med handling (for Company block) ✅
- [x] Vis warning med info (for Deal warning) ✅

#### **Fase 3: Trash Bin UX** (MEDIUM)
- [ ] Gør Trash Bin mere synlig (evt. i sidebar)
- [ ] Tilføj "Recently Deleted" quick access
- [ ] Auto-expire deleted records efter 90 dage (valgfrit)

---

### 5. **Delete Beskeder - Template**

```typescript
// Standard delete message
"This will be moved to trash. You can restore it from Settings > Trash Bin."

// With warning
"Warning: {count} {items} will be affected. This will be moved to trash and can be restored."

// Blocked delete
"Cannot delete {item}. {reason}. Please {action} first."
```

---

### 6. **Database Constraints Review**

#### **Nuværende Constraints:**
```sql
-- Quotes
deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL

-- Orders  
deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL

-- Invoices
deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL
```

**Vigtigt:** `ON DELETE SET NULL` virker kun ved **HARD DELETE**. Ved **SOFT DELETE** (deleted_at) forbliver deal_id i quotes/orders/invoices, fordi deal stadig eksisterer i databasen (bare med deleted_at != NULL).

#### **Anbefalinger:**

**Option A: Behold deal_id reference (ANBEFALET)**
- ✅ Quotes/Orders/Invoices beholder deal_id selv efter deal soft delete
- ✅ Historik bevares (kan se hvilket deal quote/order/invoice kom fra)
- ✅ Kan restore deal og alt er tilbage som før
- ⚠️ Quotes/Orders/Invoices vises med soft-deleted deal (kan filtrere i UI)

**Option B: Sæt deal_id = NULL efter soft delete**
- ✅ Quotes/Orders/Invoices mister reference til deleted deal
- ⚠️ Taber historik
- ⚠️ Mere kompleks (skal manuelt sætte NULL)
- ❌ Kan ikke restore deal og få reference tilbage

**ANBEFALING: Option A** - Behold deal_id reference. Det bevarer historik og gør restore mere robust.

---

### 7. **Quick Wins** (Kan gøres nu)

1. **Ret alle "cannot be undone" beskeder** → "moved to trash, can be restored" ✅ **FÆRDIG**
2. **Standardiser delete dialogs** → Brug `ConfirmationDialog` alle steder ✅ **FÆRDIG**
3. **Tilføj restore link** i delete success toast: "Moved to trash. [Restore]" ⚠️ **DELVIS** (beskeder opdateret, men ikke clickable restore link endnu)

---

## Implementerings Status

### ✅ **Fase 1: Standardisere Delete Dialogs** - FÆRDIG
**Implementeret:**
1. ✅ Opdateret alle delete beskeder til at sige "moved to trash"
2. ✅ Standardiseret alle delete dialogs til at bruge `ConfirmationDialog`
3. ✅ Alle dialogs viser korrekte beskeder baseret på soft delete

**Opdaterede filer:**
- `src/components/deals/EditDealDrawer.tsx` (allerede fikset tidligere)
- `src/components/people/DeletePersonDialog.tsx`
- `src/components/invoices/EditInvoiceDialog.tsx`
- `src/components/calendar/EditEventDialog.tsx`
- `src/components/companies/EditCompanyModal.tsx`
- `src/pages/quotes/QuoteEditor.tsx`

### ✅ **Fase 2: Dependency Validation** - FÆRDIG
**Implementeret:**
1. ✅ `checkDealDependencies()` med status-baseret validering:
   - Blokerer delete hvis active quotes/orders/invoices
   - Viser warning hvis kun draft/cancelled items
2. ✅ `checkCompanyDependencies()` og blokerer Company delete hvis active deals
3. ✅ Dependency checking implementeret i:
   - `EditDealDrawer.tsx` - viser blocked state med detaljerede beskeder
   - `EditCompanyModal.tsx` - viser blocked state med active deals count

**Resultat:**
- Deal delete blokerer korrekt hvis active business items
- Company delete blokerer korrekt hvis active deals
- Alle beskeder er informative og viser præcise counts

### ✅ **Fase 3: Trash Bin UX** - FÆRDIG
- [x] Gør Trash Bin mere synlig (evt. i sidebar) ✅
  - ✅ Tilføjet Trash Bin link i sidebar (før Settings)
  - ✅ Settings page åbner automatisk Trash Bin tab når man kommer fra sidebar
- [x] Tilføj clickable restore link i delete success toast ✅
  - ✅ Opdateret toastBus til at understøtte action buttons
  - ✅ Alle delete success toasts har nu "Restore" button der navigerer til Trash Bin
- [x] Opdater TrashBinSettings til at bruge ConfirmationDialog ✅
  - ✅ Erstattet AlertDialog med ConfirmationDialog for restore confirmation
- [ ] Tilføj "Recently Deleted" quick access widget (valgfrit - kan implementeres senere)
- [ ] Auto-expire deleted records efter 90 dage (valgfrit - database migration nødvendig)

**Implementeret:**
- Trash Bin er nu direkte tilgængelig fra sidebar
- Alle delete success toasts har clickable "Restore" button
- TrashBinSettings bruger ConfirmationDialog for konsistent UX
- Settings page håndterer URL parameter for at åbne korrekt tab

**Opdaterede filer:**
- `src/components/layout/AppSidebar.tsx` - Tilføjet Trash Bin link
- `src/pages/settings/SettingsPage.tsx` - URL parameter support for tab
- `src/lib/toastBus.ts` - Action button support
- `src/components/providers/ToastBridge.tsx` - Action button rendering
- `src/components/settings/TrashBinSettings.tsx` - ConfirmationDialog
- Alle delete dialogs - Restore action buttons i success toasts

---

## Overblik: Delete Flow

### Deal Delete Flow:
```
User clicks Delete on Deal
  ↓
Load dependencies: checkDealDependencies(dealId)
  ↓
IF hasActiveItems:
  - BLOCK delete
  - Show error in ConfirmationDialog:
    "Cannot delete deal with active business items.
     - {X} active quotes (sent/accepted)
     - {Y} active orders (accepted/invoiced/backorder)
     - {Z} active invoices (sent/paid/overdue)
     Please complete, cancel, or delete these items first."
  - Disable delete button
  - Show "Close" button only
ELSE:
  - ConfirmationDialog vises
  - Besked: "This deal will be moved to trash"
  - Warning (hvis inactive items): 
    "Note: {X} draft/cancelled items will lose deal reference"
  ↓
User confirms
  ↓
Soft delete deal (SET deleted_at)
  - deal_id forbliver i quotes/orders/invoices (beholder historik)
  ↓
Show success toast
  - "Deal moved to trash. [Restore from Settings]"
  ↓
Refresh list/close dialog
```

### Company Delete Flow:
```
User clicks Delete on Company
  ↓
ConfirmationDialog vises
  - Load dependencies: checkCompanyDependencies(companyId)
  ↓
IF hasActiveDeals:
  - BLOCK delete
  - Show error: "Cannot delete. {X} active deals. Close them first."
ELSE:
  - Show warning: "{X} people will lose company reference"
  - Allow delete
  ↓
Soft delete company (SET deleted_at)
  ↓
Show success toast
  ↓
Refresh list/close dialog
```

---

## Restore Flow

```
User går til Settings > Trash Bin
  ↓
Viser deleted items (sorteret efter deleted_at DESC)
  ↓
User klikker Restore
  ↓
ConfirmationDialog: "Restore {item}?"
  ↓
restoreCompany/restoreDeal/etc.
  ↓
Success toast
  ↓
Item vises igen i normal liste
```

