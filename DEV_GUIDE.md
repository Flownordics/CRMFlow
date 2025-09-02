# 🧭 Cursor Developer Guide for CRMFlow

Denne guide definerer **kvalitetsstandarder, konventioner og designprincipper**, som hele teamet (og Cursor) skal følge.  
Alt nyt kode skal valideres op imod denne guide, så vi sikrer en **konsistent, skalerbar og professionel** kodebase.

---

## 🧱 Projektets Formål

CRMFlow er et moderne CRM-inspireret webapp, designet til små teams, som skal kunne:

- Oprette og håndtere **Companies** og **People**
- Arbejde med **Deals** (kanban)
- Generere **Quotes → Orders → Invoices** med PDF
- Synkronisere med **Google Calendar**
- Uploade og dele **Documents**
- Se overblik i et **Accounting Dashboard**

Fokus: **brugervenlighed, ensartet design, høj kodekvalitet.**

---

## 🖥️ Tech Stack

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + `shadcn/ui` (Radix under motorhjelmen)
- **State Management**: React Query (server data) + Zustand (UI-state)
- **Auth/Backend**: Supabase (Email/password + Google OAuth)
- **Icons**: `lucide-react`
- **Testing**: Vitest + Playwright (E2E)
- **Lint/Format**: ESLint + Prettier

---

## 🎨 Design- og Stylingprincipper

- **Farver**: Brug Tailwinds CSS-variabler + CRMFlow tema (defineret i `tailwind.config.ts`).
- **Dark/Light mode**: Skal virke gnidningsfrit.
- **Komponentbibliotek**: Brug shadcn/ui først – ingen custom CSS uden grund.
- **Layout**: Card-baseret, tabbed navigation på detail-sider, sticky action bars.
- **Spacing**: Konsistent padding/margin (min. Tailwind `p-4`).
- **Ikoner**: Altid fra `lucide-react`, ensartet størrelse (`w-4 h-4` i knapper).
- **Responsivitet**: Mobile-first, test i mobil breakpoints.

---

## 📁 Projektstruktur

src/
├─ pages/ # Route-based pages
│ ├─ companies/
│ │ ├─ CompaniesList.tsx
│ │ └─ CompanyDetail.tsx
│ ├─ deals/
│ │ ├─ DealsBoard.tsx
│ │ └─ DealDetail.tsx
│ └─ ...
├─ components/ # Reusable components
│ ├─ layout/ # Layout elements (Header, Sidebar, CRMLayout)
│ ├─ ui/ # shadcn-generated UI components
│ └─ [feature]/ # Feature-specific components
├─ lib/ # Helpers (api.ts, pdf.ts, hooks/)
├─ stores/ # Zustand state slices
└─ assets/ # Static files

---

## 📐 Kodestandarder

- **TypeScript**: Alt kode i TS med `"strict": true`.
- **Navngivning**:
  - Komponenter: PascalCase (`CompanyDetail.tsx`)
  - Hooks: `useSomething.ts`
  - Zustand stores: `[feature]Store.ts`
- **Imports**: Brug alias `@/` fra `tsconfig.json`.
- **Async kode**: Brug `async/await`. Axios instance i `lib/api.ts`.
- **Forms**: Altid med `react-hook-form` + `zod` schemas.

---

## 🗂️ Sidekonventioner

- **List pages**: Brug `shadcn/ui` `table` m. søgning, filter, pagination.
- **Detail pages**: Brug tab-layout (Overview, Timeline, Documents).
- **Kanban**: Deals board bruger drag-and-drop + realtime updates.
- **Quotes/Orders/Invoices**: Editor med line items, PDF preview, statusbadge.
- **Documents**: File upload via presigned URL (stub nu).
- **Calendar**: Google sync, men start med read-only stub.

---

## 🧠 Best Practices

- **Genbrug alt**: Lav genbrugelige hooks (`useSearch`, `usePagination`, `usePDFPreview`).
- **Designsystem først**: Tilføj aldrig inline styles → brug Tailwind + shadcn.
- **Consistent UX**: Samme knapper, badges og modaler overalt.
- **Activity timeline**: Alle større actions (deal stage change, quote sent, payment) bliver logget som event.
- **Deal-first data flow**: Alle kommercielle data (kunde, kontakt, valuta, moms, line items) defineres på Deal. Quote/Order/Invoice oprettes kun via konvertering fra Deal og arver felter som snapshot. Ingen duplikatindtastning. Dokumenter opdateres ikke automatisk, men kan synkroniseres manuelt fra Deal.
- **Env vars**: Brug `import.meta.env.*`. Alle nye vars dokumenteres i `.env.example`.

---

## ✅ Definition of Done (DoD)

En feature er **færdig**, når:

1. UI følger denne guide (styling + komponenter).
2. TypeScript compiler kører uden fejl (strict mode).
3. Der findes mindst 1 unit test (eller e2e, hvis flow).
4. Der er en dokumenteret route (i `App.tsx`).
5. `.env.example` er opdateret, hvis der bruges nye miljøvariabler.

---

## 🚀 Ekstra noter for Cursor

- Når du genererer kode:
  - **Split UI fra logik** (hooks i `lib/hooks`, UI i `components`).
  - **Kommentér komplekse funktioner**.
  - **Skriv semantisk JSX** (aria labels, roles).
- Sæt altid `TODO:` kommentarer, når noget er stub.
- Generer kun kode, der overholder denne guide – hellere simpelt men konsistent.

## 🔧 Environment Variables

For at undgå 404 fejl fra activity API i development, tilføj til din `.env` fil:

```bash
VITE_DISABLE_ACTIVITY_LOGGING=true
```

Dette deaktiverer activity logging helt i development mode.

---

## 🎨 Design System

For detaljerede design tokens, komponenter og styling guidelines, se:

- **`DESIGN_SYSTEM.md`** - Komplet design system dokumentation
- **`src/components/ui/`** - shadcn/ui komponenter
- **`src/components/layout/`** - Layout komponenter (PageHeader, etc.)
- **`src/components/tables/`** - Table wrapper komponenter
- **`src/components/forms/** - Form layout komponenter

**Vigtigt**: Brug altid design system komponenter i stedet for custom styling:

- `PageHeader` for side headers
- `StatusBadge` for status indikatorer
- `DataTable` for tabel layouts
- `EmptyState` for tomme tilstande
- `FormRow` for form layouts
