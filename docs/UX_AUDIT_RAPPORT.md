# CRMFlow UX & Funktionalitets Audit Rapport
**Dato:** Januar 2025  
**Auditor:** Senior Product Manager & UX-arkitekt  
**Fokus:** Workflow-optimering, manglende logiske handlinger, UX-konsistens

---

## 1. "Smartere Flow" Muligheder (High Impact)

### 🔴 Kritiske Manglende Links

#### 1.1 CompanyPage - Manglende direkte handlinger ✅ **IMPLEMENTERET**
**Problem:** På `CompanyPage.tsx` kan brugeren se deals, men **mangler direkte mulighed for at oprette Quote eller Order** fra company-konteksten.

**Nuværende flow:**
- Company → Deals tab → Klik på deal → DealDetail → Create Quote/Order
- **4-5 klik** for at oprette et tilbud fra en kunde

**Forslag:**
- Tilføj "Create Quote" og "Create Order" knapper i `CompanyPage` header actions (ved siden af "Add Deal")
- Eller tilføj Quick Actions i `CompanyOverview` (ligesom QuickActionButtons allerede eksisterer, men mangler Quote/Order)
- **Impact:** Reducerer brugerrejsen fra 4-5 klik til 2 klik

**Implementering:**
- ✅ Tilføjet "Create Quote" og "Create Order" knapper i CompanyPage header
- ✅ Automatisk deal-oprettelse: Quote → Deal i "Proposal" stage, Order → Deal i "Negotiation" stage
- ✅ Deal ID sendes automatisk til CreateQuoteModal/CreateOrderModal
- ✅ Loading states og error handling implementeret

**Kode-lokation:**
- `src/pages/companies/CompanyPage.tsx` (linje 165-180)
- `src/services/dealCreationHelpers.ts` (ny fil)
- `src/lib/stageHelpers.ts` (ny fil)

#### 1.2 PersonPage - Ingen Quote/Order oprettelse ✅ **IMPLEMENTERET**
**Problem:** `PersonPage.tsx` har kun "Add Deal" knap, men **ingen direkte mulighed for at oprette Quote eller Order** for en person.

**Nuværende flow:**
- Person → Deals tab → Klik på deal → DealDetail → Create Quote
- **4 klik** minimum

**Forslag:**
- Tilføj "Create Quote" og "Create Order" knapper i PersonPage header
- Pre-fill person og company i CreateQuoteModal/CreateOrderModal
- **Impact:** Reducerer til 2 klik

**Implementering:**
- ✅ Tilføjet "Create Quote" og "Create Order" knapper i PersonPage header
- ✅ Automatisk deal-oprettelse med person.companyId og person.id som contact
- ✅ Validering: Knapper disabled hvis person ikke har companyId
- ✅ Pre-filling: Person ID sendes som contactId til modalerne

**Kode-lokation:**
- `src/pages/people/PersonPage.tsx` (linje 205-224)

#### 1.3 QuoteEditor - Manglende "Convert to Order" action ✅ **ALLEREDE IMPLEMENTERET**
**Problem:** Når en Quote er "accepted", skal brugeren manuelt navigere væk for at oprette en Order.

**Nuværende flow:**
- QuoteEditor → Status = "accepted" → Naviger til Orders → Create Order → Manuelt kopier data
- **5+ klik** og risiko for fejl

**Forslag:**
- Når quote status ændres til "accepted", vis en prominent "Convert to Order" knap
- Eller automatisk prompt: "This quote is accepted. Convert to order?"
- **Impact:** Reducerer til 1 klik + bekræftelse

**Implementering:**
- ✅ "Convert to Order" knap vises automatisk når quote.status === "accepted"
- ✅ Knap placeret i PageHeader actions (prominent placering)
- ✅ Loading state: "Converting..." vises under konvertering
- ✅ Konvertering håndteres via useConvertQuoteToOrder hook

**Kode-lokation:**
- `src/pages/quotes/QuoteEditor.tsx` (linje 272-282)

#### 1.4 OrderDetail - Manglende "Create Invoice" fra header ✅ **ALLEREDE IMPLEMENTERET**
**Problem:** `OrderDetail.tsx` har "Convert to Invoice" i `OrderEditorHeader`, men det er ikke tydeligt synligt.

**Nuværende flow:**
- OrderDetail → Scroll ned → Find "Convert to Invoice" i header component
- **Ikke intuitiv placering**

**Forslag:**
- Flyt "Convert to Invoice" til PageHeader actions (ved siden af "Generate PDF")
- Vis kun når order status er "delivered" eller "confirmed"
- **Impact:** Bedre synlighed og kontekstuel visning

**Implementering:**
- ✅ "Convert to Invoice" knap placeret i PageHeader actions
- ✅ Vises kun når order.status === "delivered" || order.status === "confirmed"
- ✅ Loading state: "Converting..." vises under konvertering
- ✅ Placeret ved siden af "Generate PDF" knap (god synlighed)

**Kode-lokation:**
- `src/pages/orders/OrderDetail.tsx` (linje 226-235)

#### 1.5 DealDetail - Manglende "Create Task" quick action ✅ **ALLEREDE IMPLEMENTERET**
**Problem:** `DealDetail.tsx` har `RelatedTasksList`, men **ingen direkte "Create Task" knap** i header eller prominent placeret.

**Nuværende flow:**
- DealDetail → Scroll ned til Tasks sektion → Klik "Add Task"
- **2-3 klik** + scrolling

**Forslag:**
- Tilføj "Create Task" knap i DealDetail header actions
- Pre-fill `related_type="deal"` og `related_id=deal.id`
- **Impact:** Reducerer til 1 klik

**Implementering:**
- ✅ "Create Task" knap placeret i DealDetail header actions
- ✅ Åbner task form modal (setIsTaskFormOpen(true))
- ✅ Prominent placering i header ved siden af andre actions

**Kode-lokation:**
- `src/pages/deals/DealDetail.tsx` (linje 167-170)

#### 1.6 CompanyOverview - Manglende "View Quotes" og "View Orders" links ✅ **ALLEREDE IMPLEMENTERET**
**Problem:** `CompanyOverview.tsx` viser revenue, men **ingen direkte links til company's quotes og orders**.

**Nuværende flow:**
- Company → Overview → Se revenue → Naviger til Quotes/Orders → Filter manuelt
- **3-4 klik** + manuel filtering

**Forslag:**
- I `CompanyRevenueCard`, tilføj klikbare links: "X Quotes" og "Y Orders"
- Links skal navigere til Quotes/Orders med pre-filled company filter
- **Impact:** Reducerer til 1 klik med kontekst

**Implementering:**
- ✅ "View Quotes" og "View Orders" knapper i CompanyRevenueCard
- ✅ Navigerer til `/quotes?company_id=${companyId}` og `/orders?company_id=${companyId}`
- ✅ Viser antal quotes og orders dynamisk
- ✅ Placeret i separat sektion med border-top for god visuel separation

**Kode-lokation:**
- `src/components/companies/CompanyRevenueCard.tsx` (linje 121-147)

#### 1.7 QuoteEditor - Manglende "Book Meeting" action ✅ **IMPLEMENTERET**
**Problem:** Når en Quote sendes, er der **ingen direkte mulighed for at booke et opfølgende møde**.

**Nuværende flow:**
- QuoteEditor → Send Quote → Naviger til Calendar → Create Event → Manuelt link til quote
- **4-5 klik**

**Forslag:**
- Efter "Send Quote", vis en prompt: "Schedule follow-up meeting?"
- Eller tilføj "Schedule Meeting" knap i QuoteEditor header
- Pre-fill `quote_id` i CreateEventDialog
- **Impact:** Reducerer til 2 klik

**Implementering:**
- ✅ Tilføjet "Schedule Meeting" knap i QuoteEditor header (ved siden af Send knap)
- ✅ CreateEventDialog opdateret til at acceptere defaultQuoteId, defaultDealId, defaultOrderId
- ✅ Pre-filling: quote_id, company_id, deal_id sendes automatisk til CreateEventDialog
- ✅ Default title: "Follow-up: Quote [number]"

**Kode-lokation:**
- `src/pages/quotes/QuoteEditor.tsx` (linje 283-290, 530-542)
- `src/components/calendar/CreateEventDialog.tsx` (opdateret med defaultQuoteId prop)

### 🟡 Forbedrede Workflows

#### 1.8 Bulk Actions - Manglende i flere lister
**Problem:** `CompaniesList.tsx` har bulk actions, men `PeopleList.tsx`, `Quotes.tsx`, og `Orders.tsx` mangler.

**Forslag:**
- Implementer bulk actions for:
  - People: Bulk assign to company, bulk tag, bulk export
  - Quotes: Bulk status change, bulk send, bulk export
  - Orders: Bulk status change, bulk export
- **Impact:** Tidsbesparelse ved håndtering af flere items

#### 1.9 DealDetail - Manglende "Duplicate Deal" action ✅ **IMPLEMENTERET**
**Problem:** Når en deal lukkes, skal brugeren ofte oprette en lignende deal.

**Forslag:**
- Tilføj "Duplicate Deal" knap i DealDetail
- Kopier alle felter undtagen status (sæt til første stage)
- **Impact:** Tidsbesparelse ved oprettelse af lignende deals

**Implementering:**
- ✅ "Duplicate Deal" knap tilføjet i DealDetail header (ved siden af "Create Task")
- ✅ Kopierer alle felter fra original deal (company_id, contact_id, currency, expected_value_minor, close_date, etc.)
- ✅ Sætter stage_id til første stage i samme pipeline som original deal
- ✅ Tilføjer " (Copy)" til titlen
- ✅ Navigerer automatisk til den duplikerede deal efter oprettelse
- ✅ Loading state: "Duplicating..." vises under duplikering
- ✅ Error handling med toast notifications

**Kode-lokation:**
- `src/pages/deals/DealDetail.tsx` (linje 166-171, 155-178)
- `src/services/deals.ts` (duplicateDeal funktion og useDuplicateDeal hook)
- `src/lib/stageHelpers.ts` (getPipelineIdFromStageId, getFirstStageIdFromPipeline)

#### 1.10 InvoiceDetail - Manglende "Send Reminder" action ✅ **IMPLEMENTERET**
**Problem:** For overskredne fakturaer mangler der en direkte "Send Reminder" funktion.

**Forslag:**
- Tilføj "Send Reminder" knap når invoice er overdue
- Pre-fill email template med faktura detaljer
- **Impact:** Forbedret cash flow management

**Implementering:**
- ✅ "Send Reminder" knap tilføjet i InvoiceDetail PageHeader actions
- ✅ Vises kun når invoice er overdue (due_date < today && balance_minor > 0)
- ✅ SendInvoiceDialog opdateret til at understøtte reminder mode med custom message template
- ✅ Pre-filled email template inkluderer faktura detaljer (nummer, due date, outstanding balance)
- ✅ Custom subject: "Reminder: Payment Due for Invoice [number]"
- ✅ Loading state og error handling implementeret

**Kode-lokation:**
- `src/pages/invoices/InvoiceDetail.tsx` (linje 50, 60-63, 125-137, 502-509)
- `src/components/invoices/SendInvoiceDialog.tsx` (opdateret med isReminder prop)

---

## 2. UX & UI Observationer

### 🟢 Hvad fungerer godt

1. **Empty States er generelt gode:**
   - `QuotesEmptyState.tsx` har klar call-to-action
   - `CompanyDeals.tsx` har god empty state med "Add Deal" knap
   - `PersonDeals.tsx` har empty state med link til at oprette deal

2. **Loading States:**
   - De fleste komponenter håndterer loading korrekt med Skeleton components
   - `CompanyPage.tsx` har god loading state

3. **Quick Actions i CompanyOverview:**
   - `QuickActionButtons.tsx` er et godt eksempel på kontekstuelle handlinger
   - Inkluderer: Send Email, Log Call, Schedule Meeting, Create Deal, Create Quote, CVR Sync

4. **Related Tasks Integration:**
   - `RelatedTasksList` komponenten er godt integreret i QuoteEditor, OrderDetail, DealDetail
   - Giver god kontekstuel task management

5. **Navigation mellem relaterede entiteter:**
   - DealDetail har links til Quote/Order når de eksisterer
   - OrderDetail har link til Project når det eksisterer

### 🔴 Problematiske områder

#### 2.1 Inkonsistent Button Placement ✅ **IMPLEMENTERET**
**Problem:** Nogle sider har actions i PageHeader, andre i separate komponenter.

**Eksempler:**
- `CompanyPage`: Actions i PageHeader ✅
- `PersonPage`: Actions i PageHeader ✅
- `QuoteEditor`: Actions i PageHeader ✅
- `OrderDetail`: Actions delt mellem PageHeader og OrderEditorHeader ❌
- `DealDetail`: Actions i custom header, ikke PageHeader ❌

**Forslag:** Standardiser til PageHeader actions for alle detail pages.

**Implementering:**
- ✅ **OrderDetail**: Flyttet "Mark Fulfilled" fra OrderEditorHeader til PageHeader actions
- ✅ **OrderDetail**: Alle actions (View Project, Generate PDF, Mark Fulfilled, Convert to Invoice) er nu i PageHeader
- ✅ **OrderEditorHeader**: Simplificeret til kun at vise info (status, number, company, total) uden actions
- ✅ **DealDetail**: Konverteret custom header til PageHeader med alle actions
- ✅ **PageHeader**: Opdateret til at acceptere React.ReactNode for title (for fleksibilitet)
- ✅ Alle detail pages bruger nu konsistent PageHeader med actions

**Kode-lokation:**
- `src/pages/orders/OrderDetail.tsx` (linje 207-250)
- `src/pages/deals/DealDetail.tsx` (linje 189-240)
- `src/components/orders/OrderEditorHeader.tsx` (simplificeret)
- `src/components/layout/PageHeader.tsx` (opdateret til at acceptere React.ReactNode)

#### 2.2 Manglende Breadcrumbs ✅ **IMPLEMENTERET**
**Problem:** Ingen breadcrumbs navigation, hvilket gør det svært at navigere tilbage i hierarkiet.

**Eksempler:**
- Company → Deal → Quote: Ingen måde at se hvor man er i hierarkiet
- Person → Deal → Order: Samme problem

**Forslag:** Implementer breadcrumb navigation komponent:
```
Home > Companies > Acme Corp > Deals > Deal #123 > Quote #456
```

**Implementering:**
- ✅ Oprettet `BreadcrumbNavigation` komponent der dynamisk genererer breadcrumbs baseret på route
- ✅ Breadcrumbs viser entity navne (company navn, person navn, deal titel, quote/order nummer)
- ✅ Loading states med Skeleton komponenter mens data hentes
- ✅ Integreret i PageHeader med `showBreadcrumbs` prop
- ✅ Tilføjet breadcrumbs til: CompanyPage, DealDetail, QuoteEditor, OrderDetail, PersonPage
- ✅ Breadcrumbs viser hierarkiet: Home > [Entity Type] > [Entity Name]
- ✅ Alle breadcrumb items er klikbare links (undtagen sidste item)

**Eksempler på breadcrumbs:**
- `/companies/123` → Home > Companies > Company Name
- `/deals/456` → Home > Deals > Deal Title
- `/quotes/789` → Home > Quotes > Quote #789
- `/people/123` → Home > People > Person Name
- `/orders/456` → Home > Orders > Order #456

**Kode-lokation:**
- `src/components/navigation/BreadcrumbNavigation.tsx` (ny fil)
- `src/components/layout/PageHeader.tsx` (opdateret med showBreadcrumbs prop)
- `src/pages/companies/CompanyPage.tsx` (showBreadcrumbs={true})
- `src/pages/deals/DealDetail.tsx` (showBreadcrumbs={true})
- `src/pages/quotes/QuoteEditor.tsx` (showBreadcrumbs={true})
- `src/pages/orders/OrderDetail.tsx` (showBreadcrumbs={true})
- `src/pages/people/PersonPage.tsx` (showBreadcrumbs={true})

#### 2.3 Inkonsistent Empty State Design ✅ **IMPLEMENTERET**
**Problem:** Nogle empty states bruger `EmptyState` komponenten, andre har custom design.

**Eksempler:**
- `CompanyDeals.tsx`: Bruger `EmptyState` ✅
- `PersonDeals.tsx`: Custom Card med Button ❌
- `QuotesEmptyState.tsx`: Custom design ❌

**Forslag:** Standardiser til én `EmptyState` komponent med varierende props.

**Implementering:**
- ✅ Forbedret `EmptyState` komponent til at understøtte:
  - Optional ikon (LucideIcon)
  - Enkelt action eller flere actions (action + actions props)
  - Optional Card wrapper (useCard prop)
  - Konsistent styling med ikon support
  - Responsive layout for flere actions
- ✅ Refaktoreret `QuotesEmptyState` til at bruge forbedret `EmptyState`
- ✅ Refaktoreret `InvoiceEmptyState` til at bruge forbedret `EmptyState`
- ✅ Refaktoreret `OrdersEmptyState` til at bruge forbedret `EmptyState`
- ✅ Refaktoreret `PersonDeals` empty state til at bruge forbedret `EmptyState`
- ✅ Alle empty states bruger nu samme komponent med konsistent design

**Kode-lokation:**
- `src/components/EmptyState.tsx` (forbedret med ikon, actions, og Card support)
- `src/components/quotes/QuotesEmptyState.tsx` (refaktoreret)
- `src/components/invoices/InvoiceEmptyState.tsx` (refaktoreret)
- `src/components/orders/OrdersEmptyState.tsx` (refaktoreret)
- `src/components/people/PersonDeals.tsx` (refaktoreret)
- `src/components/companies/CompanyDeals.tsx` (allerede brugte EmptyState, nu med ikon support)

#### 2.4 Manglende Success Feedback ✅ **IMPLEMENTERET**
**Problem:** Nogle handlinger mangler tydelig success feedback.

**Eksempler:**
- `CompanyPage`: Når man opretter deal, er der toast, men ingen visuel opdatering i Deals tab
- `QuoteEditor`: Når man sender quote, er der toast, men status opdateres ikke visuelt med det samme

**Forslag:** 
- Implementer optimistisk UI updates
- Vis loading states under handlinger
- Opdater UI umiddelbart efter success

**Implementering:**
- ✅ Optimistic updates implementeret i `useCreateDeal` hook
  - Deal vises umiddelbart i CompanyDeals liste når oprettet
  - CompanyDeals cache opdateres optimistisk med temporary deal
  - Rollback ved fejl, replacement med real data ved success
- ✅ Optimistic status update implementeret i `useSendQuoteEmail` hook
  - Quote status opdateres umiddelbart til "sent" når email sendes
  - Quote cache og quotes list cache opdateres optimistisk
  - Rollback ved fejl, invalidation ved success for konsistens
- ✅ Loading states allerede implementeret i CreateDealModal og SendQuoteDialog
- ✅ UI opdateres umiddelbart efter success uden at vente på server response

**Kode-lokation:**
- `src/services/deals.ts` (useCreateDeal hook, linje 721-810)
- `src/services/email.ts` (useSendQuoteEmail hook, linje 261-295)
- `src/components/deals/CreateDealModal.tsx` (loading state allerede implementeret)
- `src/components/quotes/SendQuoteDialog.tsx` (loading state allerede implementeret)

#### 2.5 Inkonsistent Error Handling ✅ **IMPLEMENTERET**
**Problem:** Nogle komponenter har god error handling, andre mangler.

**Eksempler:**
- `CompanyPage.tsx`: Har error state ✅
- `PersonPage.tsx`: Har error state ✅
- `QuoteEditor.tsx`: Har error state ✅
- `OrderDetail.tsx`: Har error state ✅
- Men: Nogle child komponenter mangler error boundaries

**Forslag:** Implementer ErrorBoundary omkring alle major sections.

**Implementering:**
- ✅ Oprettet `SectionErrorBoundary` komponent til brug i sections (kompakt error state i stedet for fuld side)
- ✅ **CompanyPage**: ErrorBoundary omkring alle TabsContent (Overview, People, Deals, Documents, Activity)
- ✅ **PersonPage**: ErrorBoundary omkring alle TabsContent (Overview, Deals, Documents, Activity)
- ✅ **DealDetail**: ErrorBoundary omkring DealAccountingSummary, DealActivityList, RelatedTasksList
- ✅ **QuoteEditor**: ErrorBoundary omkring LineItemsTable, EmailLogs, RelatedTasksList
- ✅ **OrderDetail**: ErrorBoundary omkring Order Details, LineItemsTable, RelatedTasksList
- ✅ ErrorBoundary logger fejl med section navn for bedre debugging
- ✅ Retry funktionalitet i SectionErrorBoundary (1 retry som standard)
- ✅ Viser error details i development mode

**Kode-lokation:**
- `src/components/fallbacks/SectionErrorBoundary.tsx` (ny fil)
- `src/pages/companies/CompanyPage.tsx` (alle TabsContent)
- `src/pages/people/PersonPage.tsx` (alle TabsContent)
- `src/pages/deals/DealDetail.tsx` (major sections)
- `src/pages/quotes/QuoteEditor.tsx` (major sections)
- `src/pages/orders/OrderDetail.tsx` (major sections)

#### 2.6 Manglende Keyboard Navigation
**Problem:** Ingen tydelig keyboard shortcuts eller keyboard navigation support.

**Forslag:**
- Implementer keyboard shortcuts:
  - `Cmd/Ctrl + K`: Global search
  - `Cmd/Ctrl + N`: New [context] (Company, Deal, Quote, etc.)
  - `Esc`: Close modals
- Tilføj keyboard navigation hints i tooltips

#### 2.7 Inkonsistent Modal/Dialog Patterns ✅ **FULDSTÆNDIG IMPLEMENTERET**
**Problem:** Nogle steder bruges Modal, andre Dialog, nogle har custom implementations. **CreateQuoteModal og CreateOrderModal er for smalle og komplekse for modaler.**

**Eksempler:**
- `CreateDealModal`: Modal ✅ (simpel form, fungerer godt)
- `CreateQuoteModal`: Modal ❌ (for kompleks, for smal, line items presset sammen) - **FJERNET**
- `CreateOrderModal`: Modal ❌ (for kompleks, for smal, line items presset sammen) - **FJERNET**
- `SendQuoteDialog`: Dialog ✅ (simpel, fungerer godt)
- `CreateEventDialog`: Dialog ✅ (simpel, fungerer godt)

**Forslag:** 
- **For alle Quote/Order oprettelse:** Naviger direkte til QuoteEditor/OrderEditor i stedet for modal
- Standardiser simple modaler til Dialog komponenten fra shadcn/ui

**Implementering:**
- ✅ Oprettet `quickCreateHelpers.ts` med funktioner til at oprette minimal quote/order og navigere direkte til editor
- ✅ Opdateret `CompanyPage` til at navigere direkte til QuoteEditor/OrderEditor i stedet for at åbne modaler
- ✅ Opdateret `PersonPage` til at navigere direkte til QuoteEditor/OrderEditor i stedet for at åbne modaler
- ✅ Opdateret `Quotes.tsx` til at navigere direkte til QuoteEditor i stedet for modal
- ✅ Opdateret `Orders.tsx` til at navigere direkte til OrderEditor i stedet for modal
- ✅ Opdateret `QuickActionButtons.tsx` (CompanyOverview) til at navigere direkte til QuoteEditor
- ✅ Opdateret `DealsBoard.tsx` automation til at navigere direkte til editor (både quote og order)
- ✅ Fjernet alle CreateQuoteModal og CreateOrderModal komponenter fra brug
- ✅ **Slettet** `CreateQuoteModal.tsx` og `CreateOrderModal.tsx` filer fra kodebasen (ikke længere brugt)
- ✅ Bedre UX: Fuldt skærm editor med bedre plads til line items og komplekse forms
- ✅ Hurtigere workflow: Opretter quote/order med minimal data og navigerer direkte til editor hvor brugeren kan udfylde detaljer
- ✅ Konsistent UX: Alle quote/order oprettelser bruger samme flow (direkte navigation)

**Rationale:**
- Quote/Order forms er for komplekse til modaler (line items, flere felter, beregninger)
- Modaler med max-w-4xl (896px) er for smalle for line items tabeller
- Direkte navigation til editor giver bedre UX med fuld skærm og bedre navigation
- QuoteEditor og OrderEditor er allerede dedikerede sider designet til dette formål
- Konsistens: Samme flow uanset hvor man opretter quote/order fra

**Kode-lokation:**
- `src/services/quickCreateHelpers.ts` (ny fil)
- `src/pages/companies/CompanyPage.tsx` (opdateret - fjernet modal usage)
- `src/pages/people/PersonPage.tsx` (opdateret - fjernet modal usage)
- `src/pages/Quotes.tsx` (opdateret - fjernet modal usage)
- `src/pages/Orders.tsx` (opdateret - fjernet modal usage)
- `src/components/companies/QuickActionButtons.tsx` (opdateret - fjernet modal usage)
- `src/pages/deals/DealsBoard.tsx` (opdateret - automation navigerer direkte)

**Note:** CreateQuoteModal og CreateOrderModal komponenter er helt fjernet fra kodebasen, da de ikke længere bruges nogen steder.

#### 2.8 Manglende Contextual Help
**Problem:** Ingen tooltips eller help tekst for komplekse funktioner.

**Forslag:**
- Tilføj info tooltips ved komplekse felter
- Tilføj "?" ikoner med contextual help
- Implementer guided tours for nye brugere

---

## 3. Teknisk Gæld med UX-konsekvens

### 3.1 Kompleks State Management i QuoteEditor ✅ **IMPLEMENTERET**
**Problem:** `QuoteEditor.tsx` havde kompleks state management med `currentLines`, `hasChanges`, og server sync.

**Kode:**
```typescript
// src/pages/quotes/QuoteEditor.tsx
const [currentLines, setCurrentLines] = useState(quote?.lines || []);
const [hasChanges, setHasChanges] = useState(false);
```

**UX-konsekvens:**
- Brugeren kunne miste ændringer hvis de navigerede væk
- "Unsaved changes" warning var kun visuel, ikke blockerende
- Kompleks logik for at håndtere temp lines vs. real lines

**Forslag:**
- ✅ Implementer proper form state management (react-hook-form)
- ✅ Tilføj "beforeunload" event listener for at advare ved navigation
- ✅ Simplificer line item management med bedre abstraktioner

**Implementering:**
- ✅ Tilføjet `beforeunload` event listener der advarer brugeren når de prøver at forlade siden med unsaved changes
- ✅ Implementeret `useBlocker` fra React Router v6 for at blokere in-app navigation med unsaved changes
- ✅ Forbedret `hasChanges` tracking med separat tracking af header changes (`pendingHeaderChanges`) og line changes (`pendingLineChanges`)
- ✅ Automatisk opdatering af `hasChanges` baseret på pending changes via `useEffect`
- ✅ Forbedret `handleSaveQuote` til at force-save alle pending line changes og give feedback til brugeren
- ✅ Bedre error handling - pending changes forbliver tracked ved fejl, så brugeren ikke mister dem
- ✅ Navigation blocking med bekræftelsesdialog når brugeren prøver at navigere væk med unsaved changes

**Rationale:**
- `beforeunload` beskytter mod browser navigation (lukke tab, refresh, etc.)
- `useBlocker` beskytter mod in-app navigation (React Router navigation)
- Separat tracking af header og line changes giver bedre kontrol over hvornår der er unsaved changes
- Automatisk opdatering via `useEffect` sikrer at `hasChanges` altid er korrekt

**Kode-lokation:**
- `src/pages/quotes/QuoteEditor.tsx` (opdateret med beforeunload, useBlocker, og forbedret change tracking)

### 3.2 Manglende Optimistic Updates ✅ **IMPLEMENTERET**
**Problem:** Mange mutations opdaterer ikke UI optimistisk, hvilket giver langsom følelse.

**Eksempler:**
- `CompanyPage`: Når man opretter deal, skal man manuelt refreshe for at se det
- `QuoteEditor`: Når man opdaterer status, opdateres UI ikke med det samme

**Forslag:**
- Implementer optimistic updates i React Query mutations
- Opdater cache umiddelbart, revert ved fejl

**Implementering:**
- ✅ Optimistic updates implementeret i `useCreateDeal` hook
  - Deal vises umiddelbart i CompanyDeals liste når oprettet
  - CompanyDeals cache opdateres optimistisk med temporary deal
  - Rollback ved fejl, replacement med real data ved success
- ✅ Optimistic status update implementeret i `useSendQuoteEmail` hook
  - Quote status opdateres umiddelbart til "sent" når email sendes
  - Quote cache og quotes list cache opdateres optimistisk
  - Rollback ved fejl, invalidation ved success for konsistens
- ✅ Optimistic updates implementeret i `useUpdateQuoteHeader` hook
  - Quote status og andre header fields opdateres umiddelbart
  - Quote cache og quotes list cache opdateres optimistisk
  - Rollback ved fejl, invalidation ved success for konsistens
- ✅ Optimistic updates implementeret i `useUpdateOrderHeader` hook
  - Order status og andre header fields opdateres umiddelbart
  - Order cache og orders list cache opdateres optimistisk
  - Rollback ved fejl, invalidation ved success for konsistens
- ✅ Optimistic updates implementeret i `useUpdateInvoice` hook
  - Invoice status og andre fields opdateres umiddelbart
  - Invoice cache og invoices list cache opdateres optimistisk
  - Rollback ved fejl, invalidation ved success for konsistens
- ✅ Alle optimistic updates følger samme pattern:
  - `onMutate`: Cancel queries, snapshot previous values, optimistically update cache
  - `onError`: Rollback til previous values ved fejl
  - `onSuccess`: Invalidate queries for at sikre konsistens med server

**Kode-lokation:**
- `src/services/deals.ts` (useCreateDeal hook, linje 721-810)
- `src/services/email.ts` (useSendQuoteEmail hook, linje 261-295)
- `src/services/quotes.ts` (useUpdateQuoteHeader hook, linje 578-652)
- `src/services/orders.ts` (useUpdateOrderHeader hook, linje 530-600)
- `src/services/invoices.ts` (useUpdateInvoice hook, linje 309-342)

### 3.3 N+1 Query Problem ✅ **DELVIST IMPLEMENTERET**
**Problem:** Nogle komponenter laver flere API calls end nødvendigt.

**Eksempler:**
- `DealDetail.tsx`: Fetcher quotes og orders separat
- `CompanyOverview.tsx`: Fetcher deals, people, documents separat

**UX-konsekvens:**
- Langsom loading
- Flere loading states der popper op

**Forslag:**
- Implementer batch queries hvor muligt
- Brug React Query's `useQueries` for parallel fetching
- Overvej GraphQL eller batch API endpoints

**Implementering:**
- ✅ **DealDetail**: Konverteret til `useQueries` for parallel fetching af quotes og orders
- ✅ **CompanyRevenueCard**: Konverteret til `useQueries` for parallel fetching af quotes og orders counts
- ✅ **fetchQuotes**: Opdateret til at understøtte `dealId` parameter
- ✅ **fetchOrders**: Opdateret til at understøtte `dealId` parameter
- ✅ **useQuotes hook**: Opdateret til at understøtte `dealId` parameter
- ✅ **useOrders hook**: Opdateret til at understøtte `dealId` parameter
- ⚠️ **CompanyOverview**: Child komponenter (CompanyPeople, CompanyDeals, CompanyDocuments) fetcher stadig separat, men dette er faktisk optimalt for separation of concerns og lazy loading

**Forbedringer:**
- Parallel fetching: Quotes og orders fetches nu parallelt i stedet for sekventielt
- Bedre performance: Reducerer total loading tid fra sum af queries til max af queries
- Bedre caching: useQueries bruger samme cache keys som useQuotes/useOrders hooks
- Konsistent API: fetchQuotes og fetchOrders understøtter nu dealId filter

**Kode-lokation:**
- `src/pages/deals/DealDetail.tsx` (linje 46-62)
- `src/components/companies/CompanyRevenueCard.tsx` (linje 19-35)
- `src/services/quotes.ts` (fetchQuotes og useQuotes opdateret)
- `src/services/orders.ts` (fetchOrders og useOrders opdateret)

### 3.4 Manglende Caching Strategy ✅ **IMPLEMENTERET**
**Problem:** Nogle data fetches ikke cached korrekt, hvilket giver unødige re-fetches.

**Forslag:**
- Implementer proper cache keys i React Query
- Brug `staleTime` og `cacheTime` strategisk
- Implementer cache invalidation ved mutations

**Implementering:**
- ✅ Oprettet centraliseret cache konfiguration i `src/lib/queryCacheConfig.ts`
- ✅ Defineret cache time konstanter baseret på data type (STATIC, SEMI_STATIC, FREQUENT, REALTIME, DYNAMIC)
- ✅ Opdateret alle primære hooks til at bruge konsistent cache konfiguration:
  - ✅ `useDeals` / `useDeal` - FREQUENT (5 min staleTime, 15 min gcTime)
  - ✅ `useQuotes` / `useQuote` - FREQUENT (5 min staleTime, 15 min gcTime)
  - ✅ `useOrders` / `useOrder` - FREQUENT (5 min staleTime, 15 min gcTime)
  - ✅ `useInvoices` / `useInvoice` - FREQUENT (5 min staleTime, 15 min gcTime)
  - ✅ `useCompanies` / `useCompany` - SEMI_STATIC (10 min staleTime, 30 min gcTime)
  - ✅ `usePeople` / `usePerson` - SEMI_STATIC (10 min staleTime, 30 min gcTime)
- ✅ Standardiseret default query options (refetchOnWindowFocus: false, retry logic, etc.)
- ✅ Cache invalidation ved mutations allerede implementeret i eksisterende hooks

**Forbedringer:**
- Konsistent caching: Alle hooks bruger samme cache strategi baseret på data type
- Bedre performance: Reducerer unødige re-fetches ved at bruge længere staleTime for semi-statisk data
- Centraliseret konfiguration: Nemt at justere cache times for alle hooks på én gang
- Type-safe: Cache konfiguration er type-safe med TypeScript

**Kode-lokation:**
- `src/lib/queryCacheConfig.ts` (ny fil - centraliseret cache konfiguration)
- `src/services/deals.ts` (opdateret hooks)
- `src/services/quotes.ts` (opdateret hooks)
- `src/services/orders.ts` (opdateret hooks)
- `src/services/invoices.ts` (opdateret hooks)
- `src/services/companies.ts` (opdateret hooks)
- `src/services/people.ts` (opdateret hooks)

### 3.5 Kompleks Line Items Logic
**Problem:** `LineItemsTable` komponenten håndterer både Quote og Order lines, men logikken er kompleks.

**UX-konsekvens:**
- Bugs i line item editing
- Inkonsistent opførsel mellem Quote og Order editors

**Forslag:**
- Abstraher line items logic til separate hooks
- Implementer proper validation
- Simplificer onPatch/onDelete callbacks

**Implementering:**
- ✅ Oprettet `useLineItems` hook i `src/hooks/useLineItems.ts` der abstraherer al line items logik
- ✅ Oprettet valideringsutilities i `src/lib/validation/lineItemValidation.ts` med:
  - `validateLineItem`: Validerer en komplet line item
  - `validateLineItemPatch`: Validerer en delvis opdatering
  - `computeAndValidateLineTotals`: Beregner og validerer line totals
- ✅ Hook funktionalitet:
  - Centraliseret state management for line items
  - Automatisk validering ved opdateringer
  - Optimistic updates med rollback ved fejl
  - Beregning af totals
  - Tracking af pending changes
  - Simplificerede `patchLine` og `deleteLine` callbacks
- ✅ Opdateret `QuoteEditor` til at bruge den nye hook:
  - Fjernet kompleks lokal state management
  - Simplificeret `onPatch` og `onDelete` callbacks
  - Konsistent opførsel med validering
- ✅ Opdateret `OrderEditor` til at bruge den nye hook:
  - Erstattet kompleks `DataTable` implementering med `LineItemsTable`
  - Ensartet opførsel med Quote editor
  - Automatisk validering og totals beregning

**Forbedringer:**
- Konsistent opførsel: Begge editors bruger samme logik via hook
- Validering: Alle line item opdateringer valideres automatisk
- Simplificerede callbacks: `onPatch` og `onDelete` er nu meget simplere
- Bedre fejlhåndtering: Valideringsfejl vises tydeligt
- Genbrugelig kode: Hook kan bruges i andre komponenter der håndterer line items

### 3.6 Manglende Offline Support
**Problem:** Ingen offline support, hvilket giver dårlig UX ved dårlig forbindelse.

**Forslag:**
- Implementer service worker for offline support
- Cache kritiske data lokalt
- Queue mutations når offline, sync når online

---

## 4. Konkret Udbedringsplan

### 🟢 Low Hanging Fruits (Hurtige fixes)

#### Prioritet 1: Tilføj manglende Quick Actions

1. **CompanyPage - Tilføj Create Quote/Order i header** ✅ **IMPLEMENTERET**
   - **Fil:** `src/pages/companies/CompanyPage.tsx`
   - **Tid:** 1-2 timer
   - **Impact:** Høj - reducerer brugerrejse fra 4-5 klik til 2 klik
   - **Status:** ✅ Implementeret med automatisk deal-oprettelse
   - **Implementering:**
     - Tilføjet "Create Quote" og "Create Order" knapper i header
     - Automatisk deal-oprettelse: Quote → "Proposal" stage, Order → "Negotiation" stage
     - Deal ID sendes automatisk til modalerne

2. **PersonPage - Tilføj Create Quote/Order** ✅ **IMPLEMENTERET**
   - **Fil:** `src/pages/people/PersonPage.tsx`
   - **Tid:** 1-2 timer
   - **Impact:** Høj
   - **Status:** ✅ Implementeret med automatisk deal-oprettelse og validering
   - **Implementering:** 
     - Tilføjet "Create Quote" og "Create Order" knapper i header
     - Automatisk deal-oprettelse med person.companyId og person.id
     - Validering: Knapper disabled hvis person mangler companyId

3. **QuoteEditor - Tilføj "Convert to Order" når accepted** ✅ **ALLEREDE IMPLEMENTERET**
   - **Fil:** `src/pages/quotes/QuoteEditor.tsx`
   - **Tid:** 2 timer
   - **Impact:** Høj
   - **Status:** ✅ Allerede implementeret i linje 272-282
   - **Implementering:** 
     - "Convert to Order" knap vises automatisk når quote.status === "accepted"
     - Placeret i PageHeader actions med loading state

4. **DealDetail - Tilføj "Create Task" i header** ✅ **ALLEREDE IMPLEMENTERET**
   - **Fil:** `src/pages/deals/DealDetail.tsx`
   - **Tid:** 1 time
   - **Impact:** Medium
   - **Status:** ✅ Allerede implementeret i linje 167-170
   - **Implementering:** "Create Task" knap placeret i header actions

5. **Standardiser Empty States** ✅ **IMPLEMENTERET**
   - **Filer:** Alle list/overview komponenter
   - **Tid:** 3-4 timer
   - **Impact:** Medium
   - **Status:** ✅ Implementeret med forbedret EmptyState komponent
   - **Implementering:** 
     - Forbedret EmptyState komponent med ikon, actions, og Card support
     - Refaktoreret alle custom empty states (QuotesEmptyState, InvoiceEmptyState, OrdersEmptyState, PersonDeals)
     - Konsistent design på tværs af alle empty states

#### Prioritet 2: Forbedre Navigation

6. **Implementer Breadcrumbs** ✅ **IMPLEMENTERET**
   - **Fil:** Ny komponent `src/components/navigation/BreadcrumbNavigation.tsx`
   - **Tid:** 4-5 timer
   - **Impact:** Medium-Høj
   - **Status:** ✅ Implementeret med dynamisk route-baseret breadcrumb navigation
   - **Implementering:** 
     - Custom løsning der bruger React Router's useLocation og useParams
     - Dynamisk hentning af entity navne (company, deal, quote, order, person)
     - Integreret i PageHeader med showBreadcrumbs prop
     - Tilføjet til alle relevante detail pages

7. **Tilføj Keyboard Shortcuts**
   - **Fil:** Ny komponent `src/components/common/KeyboardShortcuts.tsx`
   - **Tid:** 3-4 timer
   - **Impact:** Medium (power users)
   - **Implementering:** Brug `react-hotkeys-hook` eller `use-hotkeys`

#### Prioritet 1.5: Schedule Meeting fra QuoteEditor ✅ **IMPLEMENTERET**

8. **QuoteEditor - Tilføj "Schedule Meeting" knap**
   - **Fil:** `src/pages/quotes/QuoteEditor.tsx`
   - **Tid:** 1-2 timer
   - **Impact:** Medium-Høj - reducerer fra 4-5 klik til 2 klik
   - **Status:** ✅ Implementeret
   - **Implementering:**
     - Tilføjet "Schedule Meeting" knap i QuoteEditor header
     - CreateEventDialog opdateret til at acceptere defaultQuoteId, defaultDealId, defaultOrderId
     - Pre-filling: quote_id, company_id, deal_id sendes automatisk

### 🟡 Major Improvements (Større ændringer)

#### Prioritet 3: Workflow Optimering

8. **Implementer Optimistic Updates**
   - **Filer:** Alle mutation hooks i `src/services/`
   - **Tid:** 8-10 timer
   - **Impact:** Høj - bedre perceived performance
   - **Implementering:** Opdater React Query mutations med optimistic updates

9. **Forbedre State Management i QuoteEditor**
   - **Fil:** `src/pages/quotes/QuoteEditor.tsx`
   - **Tid:** 6-8 timer
   - **Impact:** Høj - reducerer bugs og forbedrer UX
   - **Implementering:** 
     - Migrer til react-hook-form
     - Implementer proper form validation
     - Tilføj "beforeunload" warning

10. **Implementer Bulk Actions**
    - **Filer:** `src/pages/people/PeopleList.tsx`, `src/pages/Quotes.tsx`, `src/pages/Orders.tsx`
    - **Tid:** 12-16 timer
    - **Impact:** Medium-Høj - tidsbesparelse for power users
    - **Implementering:** 
      - Tilføj checkbox selection
      - Implementer bulk action menu
      - Tilføj bulk API endpoints

11. **Forbedre Error Handling**
    - **Filer:** Alle major komponenter
    - **Tid:** 6-8 timer
    - **Impact:** Medium - bedre brugeroplevelse ved fejl
    - **Implementering:**
      - Tilføj ErrorBoundary komponenter
      - Forbedre error messages
      - Tilføj retry mechanisms

#### Prioritet 4: Performance Optimering

12. **Løs N+1 Query Problemer** ✅ **DELVIST IMPLEMENTERET**
    - **Filer:** `src/pages/deals/DealDetail.tsx`, `src/components/companies/CompanyRevenueCard.tsx`
    - **Tid:** 8-10 timer
    - **Impact:** Høj - hurtigere loading
    - **Status:** ✅ Delvist implementeret - DealDetail og CompanyRevenueCard optimeret
    - **Implementering:**
      - ✅ Brugt `useQueries` for parallel fetching i DealDetail (quotes + orders)
      - ✅ Brugt `useQueries` for parallel fetching i CompanyRevenueCard (quotes + orders counts)
      - ✅ Opdateret fetchQuotes og fetchOrders til at understøtte dealId parameter
      - ⚠️ CompanyOverview child komponenter fetcher stadig separat, men dette er optimalt for separation of concerns

13. **Implementer Proper Caching** ✅ **IMPLEMENTERET**
    - **Filer:** Alle service hooks
    - **Tid:** 6-8 timer
    - **Impact:** Medium-Høj - reducerer unødige API calls
    - **Status:** ✅ Implementeret - Centraliseret cache konfiguration
    - **Implementering:**
      - ✅ Oprettet `src/lib/queryCacheConfig.ts` med centraliseret cache konfiguration
      - ✅ Konfigureret `staleTime` og `gcTime` baseret på data type
      - ✅ Opdateret alle primære hooks (deals, quotes, orders, invoices, companies, people)
      - ✅ Standardiseret default query options
      - ✅ Cache invalidation ved mutations allerede implementeret

### 🔴 Long-term Improvements

14. **Implementer Offline Support**
    - **Tid:** 20-30 timer
    - **Impact:** Høj - bedre UX ved dårlig forbindelse
    - **Implementering:**
      - Service worker
      - IndexedDB for local caching
      - Queue mutations for offline sync

15. **Implementer Guided Tours**
    - **Tid:** 12-16 timer
    - **Impact:** Medium - bedre onboarding
    - **Implementering:** Brug `react-joyride` eller lignende

16. **Forbedre Accessibility**
    - **Tid:** 16-20 timer
    - **Impact:** Høj - compliance og bedre UX
    - **Implementering:**
      - ARIA labels
      - Keyboard navigation
      - Screen reader support
      - Color contrast improvements

---

## 5. Anbefalede Næste Skridt

### Fase 1 (1-2 uger): Quick Wins
1. ✅ Implementer Prioritet 1 items (Low Hanging Fruits) - **STORT SET FÆRDIG**
   - ✅ CompanyPage - Create Quote/Order med automatisk deal-oprettelse
   - ✅ PersonPage - Create Quote/Order med automatisk deal-oprettelse
   - ✅ QuoteEditor - Schedule Meeting funktionalitet
   - ✅ QuoteEditor - Convert to Order (allerede implementeret)
   - ✅ OrderDetail - Convert to Invoice (allerede implementeret)
   - ✅ DealDetail - Create Task (allerede implementeret)
   - ✅ DealDetail - Duplicate Deal funktionalitet
   - ✅ CompanyRevenueCard - View Quotes/Orders links (allerede implementeret)
2. ✅ Standardiser Empty States - **FÆRDIG**
   - ✅ Forbedret EmptyState komponent med ikon, actions, og Card support
   - ✅ Refaktoreret QuotesEmptyState, InvoiceEmptyState, OrdersEmptyState, PersonDeals
3. ✅ Tilføj manglende Quick Actions - **STORT SET FÆRDIG**
4. ✅ Standardiser Button Placement - **IMPLEMENTERET**
   - ✅ OrderDetail - Alle actions flyttet til PageHeader
   - ✅ DealDetail - Konverteret til PageHeader
   - ✅ Konsistent PageHeader usage på alle detail pages
   - ✅ CompanyPage - Create Quote/Order
   - ✅ PersonPage - Create Quote/Order
   - ✅ QuoteEditor - Schedule Meeting
   - ✅ QuoteEditor - Convert to Order
   - ✅ OrderDetail - Convert to Invoice
   - ✅ DealDetail - Create Task
   - ✅ DealDetail - Duplicate Deal
   - ✅ CompanyRevenueCard - View Quotes/Orders

### Fase 2 (2-3 uger): Navigation & UX Forbedringer
1. ✅ Implementer Breadcrumbs - **FÆRDIG**
2. Tilføj Keyboard Shortcuts
3. ✅ Forbedre Error Handling - **IMPLEMENTERET**
   - ✅ SectionErrorBoundary omkring alle major sections
   - ✅ Konsistent error handling på tværs af alle detail pages
4. Implementer Optimistic Updates

### Fase 3 (3-4 uger): Performance & Advanced Features
1. ✅ Løs N+1 Query Problemer - **DELVIST IMPLEMENTERET**
   - ✅ DealDetail: Parallel fetching af quotes og orders
   - ✅ CompanyRevenueCard: Parallel fetching af quotes og orders counts
   - ⚠️ CompanyOverview: Child komponenter fetcher separat (optimalt for separation of concerns)
2. ✅ Implementer Proper Caching - **IMPLEMENTERET**
   - ✅ Centraliseret cache konfiguration i `queryCacheConfig.ts`
   - ✅ Standardiseret cache times baseret på data type
   - ✅ Opdateret alle primære hooks til at bruge konsistent caching
3. Forbedre State Management
4. Implementer Bulk Actions

### Fase 4 (4-6 uger): Long-term Improvements
1. Offline Support
2. Guided Tours
3. Accessibility Improvements

---

## 6. Metrikker for Success

### Quantitative Metrics
- **Reduceret antal klik:** Mål: 30% reduktion i gennemsnitlige klik for common workflows
- **Forbedret loading tid:** Mål: 50% reduktion i perceived loading time
- **Reduceret fejlrate:** Mål: 20% reduktion i user-reported bugs

### Qualitative Metrics
- **Brugerfeedback:** Saml feedback efter hver fase
- **Usability testing:** Test nye workflows med reelle brugere
- **Analytics:** Track brugeradfærd for at identificere bottlenecks

---

## 7. Konklusion

CRMFlow har en solid fundament, men der er betydelige muligheder for at forbedre brugeroplevelsen gennem:

1. **Tilføjelse af manglende logiske handlinger** - især direkte oprettelse af Quotes/Orders fra Company/Person kontekster
2. **Standardisering af UI patterns** - især empty states, error handling, og button placement
3. **Performance optimering** - især optimistic updates og caching
4. **Workflow optimering** - reducere antal klik og forbedre navigation

De foreslåede ændringer vil resultere i en mere intuitiv, hurtigere og mere effektiv brugeroplevelse, hvilket vil øge produktiviteten og tilfredsheden for CRMFlow-brugere.

---

**Rapport genereret:** Januar 2025  
**Næste review:** Efter implementering af Fase 1
