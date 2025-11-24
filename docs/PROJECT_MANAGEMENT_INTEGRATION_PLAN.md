# Projektstyring Integration Plan

## 📊 Status Overview

### ✅ Gennemført

**Sprint 1 & 2: Tasks Integration** ✅
- RelatedTasksList komponent implementeret
- Tasks integration i alle detail views (Deal, Quote, Order, Invoice)
- useRelatedTasks hook implementeret

**Sprint 3: Task Enhancements** ✅
- Task statistics (progress bar, status counts, overdue/upcoming)
- Quick actions (status toggle buttons)
- Deadline warnings (overdue, upcoming)
- Forbedrede empty/loading states

**Sprint 4: Project Concept** ✅
- Projects tabel migration anvendt
- ProjectsList og ProjectDetail pages
- Project creation fra DealDetail
- Project linking i Quote/Order/Invoice views
- Navigation integration

### ⏳ Fremtidig

**Sprint 5: Advanced Features**
- Task templates
- Task dependencies
- Team visibility
- Project analytics og reporting

---

## 🎯 Problem Statement

Systemet manglede en integreret måde at håndtere projektstyring på tværs af salgsflowet (Deal → Quote → Order → Invoice). Brugere skal kunne:

- Oprette opgaver knyttet til deals, quotes, orders eller invoices
- Tildele opgaver til brugere
- Sætte deadlines der integrerer med todo system
- Følge op på opgaver direkte fra den relevante "sag"
- Oprette projekter knyttet til deals for bedre projektstyring

---

## 🏗️ Implementeret Arkitektur

### Tasks System

**Database**: `tasks` tabel med `related_type` og `related_id` felter
- Support for: `deal`, `quote`, `order`, `invoice`, `company`, `person`
- Features: Assignment, deadlines, status, priority, tags, comments

**Komponenter**:
- `RelatedTasksList.tsx` - Hovedkomponent til visning af tasks
- `TaskCard.tsx` - Enkelt task card med quick actions og deadline warnings
- `TaskStatistics.tsx` - Statistics (progress, status counts, overdue/upcoming)
- `TaskForm.tsx` - Create/edit task form
- `TaskDetailView.tsx` - Fuld task detail view

**Services**: `src/services/tasks.ts`
- `useRelatedTasks()` - Hook til at hente tasks for en entitet
- `useCreateTask()`, `useUpdateTask()`, `useDeleteTask()` - Mutations

**Integration Points**:
- ✅ `DealDetail.tsx` - Tasks sektion efter Activity timeline
- ✅ `QuoteEditor.tsx` - Tasks sektion
- ✅ `OrderDetail.tsx` - Tasks sektion efter Linked Deal
- ✅ `InvoiceDetail.tsx` - Tasks sektion efter Linked Deal

### Projects System

**Database**: `projects` tabel (1-til-1 med deals)
- Migration: `supabase/migrations/20250224_0001_create_projects_table.sql` ✅ APPLIED
- Schema: `deal_id` (UNIQUE), `name`, `description`, `status`, `company_id`, `owner_user_id`, dates
- RLS: Authenticated users kan se/redigere projekter

**Komponenter**:
- `ProjectsList.tsx` - Liste over alle projekter
- `ProjectDetail.tsx` - Detaljeret projekt view med linked deal, related entities, aggregated tasks
- `CreateProjectDialog.tsx` - Dialog til at oprette projekt fra deal

**Services**: `src/services/projects.ts`
- `useProjects()`, `useProject()`, `useProjectFromDeal()` - Query hooks
- `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()` - Mutations

**Navigation**:
- ✅ Sidebar: Projects mellem Deals og Quotes
- ✅ Routes: `/projects` (list), `/projects/:id` (detail)

**Integration Points**:
- ✅ `DealDetail.tsx` - "Create Project" / "View Project" button i header
- ✅ `QuoteEditor.tsx` - "View Project" button (hvis deal har projekt)
- ✅ `OrderDetail.tsx` - "View Project" button + Linked Project section
- ✅ `InvoiceDetail.tsx` - "View Project" button + Linked Project section

---

## 📋 Design Principper

### Projects Design

**1-til-1 Relation**: Et projekt = en deal
- Projekter kan KUN oprettes fra deals
- Projekt følger deal gennem hele salgsflowet
- Ingen standalone projekt creation
- Ingen bulk linking af flere deals til samme projekt

**Projekt Linking**:
- Projekt findes via `deal_id` (ikke direkte `project_id` på quotes/orders/invoices)
- Alle entities (quote, order, invoice) har `deal_id`
- Query pattern: `SELECT * FROM projects WHERE deal_id = ?`

**Tasks Linking**:
- Tasks bruger `related_type` og `related_id` (ikke `project_id`)
- Tasks forbliver knyttet til original entitet ved conversion
- Historik bevares - tasks kopieres IKKE automatisk

---

## 🔄 Projekt Linking ved Konverteringer

### Automatisk Projekt Linking

**Princip**: Projekt følger automatisk med via `deal_id`

**Flow**:
```
Deal (id: ABC) → Projekt oprettes (deal_id: ABC)
  ↓ createQuoteFromDeal
Quote (deal_id: ABC) → Find projekt: WHERE deal_id = ABC ✅
  ↓ ensureOrderForQuote
Order (deal_id: ABC) → Find projekt: WHERE deal_id = ABC ✅
  ↓ ensureInvoiceForOrder
Invoice (deal_id: ABC) → Find projekt: WHERE deal_id = ABC ✅
```

**Implementation**: Ingen ændringer nødvendige - projekt linking sker automatisk via `deal_id`

### Tasks ved Konvertering

**Beslutning**: Tasks overføres IKKE automatisk
- Tasks forbliver knyttet til original entitet
- Brugere kan manuelt oprette nye tasks for den nye entitet
- Historik bevares (kan se tasks fra tidligere faser)

**Eksempel**:
```
Deal (tasks: ["Follow up", "Prepare proposal"])
  ↓ createQuoteFromDeal
Quote (tasks: []) ← Tasks forbliver på Deal
  ↓ User creates quote-specific tasks
Quote (tasks: ["Review pricing", "Send to customer"])
```

---

## 📁 Implementerede Filer

### Tasks
- `src/components/tasks/RelatedTasksList.tsx` ✅
- `src/components/tasks/TaskCard.tsx` ✅
- `src/components/tasks/TaskStatistics.tsx` ✅
- `src/components/tasks/TaskForm.tsx` ✅
- `src/components/tasks/TaskDetailView.tsx` ✅
- `src/services/tasks.ts` (useRelatedTasks hook) ✅

### Projects
- `supabase/migrations/20250224_0001_create_projects_table.sql` ✅ APPLIED
- `src/services/projects.ts` ✅
- `src/pages/projects/ProjectsList.tsx` ✅
- `src/pages/projects/ProjectDetail.tsx` ✅
- `src/components/projects/CreateProjectDialog.tsx` ✅

### Integration
- `src/pages/deals/DealDetail.tsx` (tasks + project creation) ✅
- `src/pages/quotes/QuoteEditor.tsx` (tasks + project linking) ✅
- `src/pages/orders/OrderDetail.tsx` (tasks + project linking) ✅
- `src/pages/invoices/InvoiceDetail.tsx` (tasks + project linking) ✅
- `src/components/layout/AppSidebar.tsx` (Projects navigation) ✅
- `src/App.tsx` (Projects routes) ✅
- `src/lib/queryKeys.ts` (Projects + Task Templates query keys) ✅

### Sprint 5 Features
- `supabase/migrations/20250224_0002_add_task_dependencies.sql` ✅ APPLIED
- `supabase/migrations/20250224_0003_create_task_templates.sql` ✅ APPLIED
- `src/services/taskTemplates.ts` ✅
- `src/components/tasks/TaskTemplateSuggestions.tsx` ✅
- `src/components/projects/ProjectAnalytics.tsx` ✅

---

## ✅ Sprint 5: Advanced Features (COMPLETED)

### ✅ Task Templates - COMPLETED
- ✅ `task_templates` tabel oprettet med trigger_type (deal_stage, entity_type, manual)
- ✅ Task template service med matching logic
- ✅ UI komponent `TaskTemplateSuggestions` til at foreslå tasks baseret på entity type
- ✅ Integration i `TaskForm` til at auto-fylde task data fra templates
- Filer:
  - `supabase/migrations/20250224_0003_create_task_templates.sql` ✅ APPLIED
  - `src/services/taskTemplates.ts` ✅
  - `src/components/tasks/TaskTemplateSuggestions.tsx` ✅

### ✅ Task Dependencies - COMPLETED
- ✅ `depends_on_task_id` kolonne tilføjet til tasks tabel
- ✅ Dependency checking i `TaskCard` - kan ikke complete hvis dependency ikke er færdig
- ✅ Dependency visning i `TaskCard` med blocking status
- ✅ Dependency select i `TaskForm` til at vælge hvilken task denne afhænger af
- ✅ Service funktioner: `getTaskDependencies`, `getTaskDependency`, `canCompleteTask`
- Filer:
  - `supabase/migrations/20250224_0002_add_task_dependencies.sql` ✅ APPLIED
  - `src/services/tasks.ts` (opdateret med dependency funktionalitet) ✅
  - `src/components/tasks/TaskCard.tsx` (opdateret med dependency visning) ✅
  - `src/components/tasks/TaskForm.tsx` (opdateret med dependency select) ✅

### ✅ Team Visibility - COMPLETED
- ✅ RLS policy sikrer at alle authenticated users kan se alle projekter (ingen begrænsninger)
- ✅ Policy: `"Allow authenticated users to manage projects"` - giver fuld adgang til alle authenticated users
- Fil: `supabase/migrations/20250224_0001_create_projects_table.sql` ✅ (allerede korrekt konfigureret)

### ✅ Project Analytics - COMPLETED
- ✅ `ProjectAnalytics` komponent med aggregated metrics:
  - Project Health Score (baseret på task completion, project status, document progression)
  - Task metrics (total, completed, in progress, pending, completion rate)
  - Document metrics (quotes, orders, invoices counts)
  - Financial overview (total invoice value, paid/unpaid invoices)
  - Warnings for attention needed (low completion rate, unpaid invoices, on hold status)
- ✅ Integration i `ProjectDetail` side
- Filer:
  - `src/components/projects/ProjectAnalytics.tsx` ✅
  - `src/pages/projects/ProjectDetail.tsx` (opdateret) ✅
- RLS policies opdatering for team visibility

### Project Analytics
- Project Dashboard med aggregated task view
- Project timeline, resource allocation, budget tracking
- Progress metrics

---

## 🧪 Testing

### Unit Tests
- RelatedTasksList komponent rendering
- useRelatedTasks hook data fetching
- Task filtering logic

### Integration Tests
- Task creation fra DealDetail
- Task updates og status changes
- Project creation fra DealDetail
- Project linking i Quote/Order/Invoice views

### E2E Tests
- Complete flow: Create deal → Create task → Assign → Complete
- Project flow: Create deal → Create project → View project → Create tasks

---

## ⚠️ Risiko og Overvejelser

### Tekniske Risici
1. **RLS Complexity**: Team visibility kræver RLS policies opdatering
2. **Performance**: Mange tasks kan påvirke performance - overvej pagination
3. **Data Consistency**: Tasks bevares når entities slettes (soft delete)

### UX Overvejelser
1. **Information Overload**: Mange tasks kan gøre detail views rodede
   - Løsning: Collapsible sektion, pagination, eller separate tab
2. **Mobile Experience**: Responsive design, touch-friendly actions

### Business Logic
1. **Task Lifecycle**: Hvad sker der med tasks når deal moves til "Closed Won"?
   - Forslag: Auto-archive completed tasks, keep active tasks
2. **Task Ownership**: Nuværende: User-based. Fremtidig: Team-based

---

## 📚 Referencer

- Task system: `src/services/tasks.ts`
- Task komponenter: `src/components/tasks/`
- Projects system: `src/services/projects.ts`
- Projects komponenter: `src/components/projects/`
- Database schema: `supabase/migrations/20250224_0001_create_projects_table.sql`
- Tasks schema: `database/migrations/20250110000000_create_tasks_table.sql`

---

## 📝 Noter

- Alle implementerede features er testet og build kompilerer uden fejl
- Migration er anvendt via Supabase MCP
- Dokumentation opdateret med faktisk status
- Sprint 5 (Advanced Features) er komplet implementeret og klar til test

## ✅ Status Oversigt

### ✅ Sprint 1: Core Task Components - COMPLETED
- Task komponenter, service hooks, database integration

### ✅ Sprint 2: Task Integration - COMPLETED  
- Task integration i Deal, Quote, Order, Invoice detail views

### ✅ Sprint 3: Task Enhancements - COMPLETED
- Task statistics, quick actions, deadline warnings, empty/loading states

### ✅ Sprint 4: Project Concept - COMPLETED
- Projects tabel, service, list/detail pages, project linking

### ✅ Sprint 5: Advanced Features - COMPLETED
- Task templates, task dependencies, team visibility, project analytics

**Alle sprints er nu komplet implementeret og klar til test!** 🎉
