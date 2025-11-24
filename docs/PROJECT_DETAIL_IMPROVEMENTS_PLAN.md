# Projects Pages - Forbedringsplan

## 🎯 Mål
Forbedre både Project Detail og Projects List siderne til at være komplette projektstyring værktøjer med fokus på redigering, tracking, bedre task management og overblik.

---

## 📋 Prioriterede Forbedringer

### 📊 Projects List Page Forbedringer

#### 11. Analytics/KPI Cards (Høj Prioritet)
**Problem:** Mangler overblik over projekt status og metrics
**Løsning:**
- Tilføj AnalyticsCardGrid med KPIs: Total Projects, Active Projects, On Hold, Completed
- Project Health Score distribution chart
- Task completion rate overview
- Financial overview (total invoice value across projects)

**Filer:**
- `src/pages/projects/ProjectsList.tsx` (opdater)
- `src/components/projects/ProjectAnalyticsCards.tsx` (ny)

---

#### 12. Enhanced Project Cards (Høj Prioritet)
**Problem:** Project cards mangler vigtig information
**Løsning:**
- Vis Project Health Score i card
- Vis task completion progress bar
- Vis total tasks count og completed count
- Vis owner avatar/name
- Vis upcoming deadlines (fra tasks)
- Color-coded health indicator

**Filer:**
- `src/pages/projects/ProjectsList.tsx` (opdater ProjectCard komponent)

---

#### 13. Advanced Filtering (Medium Prioritet)
**Problem:** Kun status filter, mangler company, owner, date range
**Løsning:**
- Tilføj Company filter dropdown
- Tilføj Owner filter dropdown
- Tilføj Date range filter (start_date, end_date)
- Tilføj Health Score filter (excellent/good/needs attention)

**Filer:**
- `src/pages/projects/ProjectsList.tsx` (opdater)
- `src/services/projects.ts` (opdater ProjectFilters interface)

---

#### 14. View Mode Toggle (Medium Prioritet)
**Problem:** Kun card view, mangler table view
**Løsning:**
- Tilføj view mode toggle (table/grid) som i CompaniesList
- Table view med kolonner: Name, Status, Health, Tasks, Owner, Dates, Actions
- Sortable kolonner

**Filer:**
- `src/pages/projects/ProjectsList.tsx` (opdater)
- `src/components/projects/ProjectsTable.tsx` (ny)

---

#### 15. Pagination (Medium Prioritet)
**Problem:** Alle projekter vises på én side
**Løsning:**
- Implementer pagination (20 per page)
- Opdater `useProjects` hook til at supporte pagination
- Vis total count og page info

**Filer:**
- `src/pages/projects/ProjectsList.tsx` (opdater)
- `src/services/projects.ts` (opdater getProjects til at returnere paginated response)

---

#### 16. Export Functionality (Lav Prioritet)
**Problem:** Ingen måde at eksportere projekt liste
**Løsning:**
- Tilføj "Export" button (CSV/Excel)
- Eksporter: Name, Status, Health Score, Tasks, Owner, Dates, Company

**Filer:**
- `src/pages/projects/ProjectsList.tsx` (opdater)
- `src/services/export/projectsExport.ts` (ny)

---

### 📄 Project Detail Page Forbedringer

### 🔴 Høj Prioritet (Sprint 1)

#### 1. Edit Project Funktionalitet
**Problem:** Ingen måde at redigere projekt navn, beskrivelse, dates
**Løsning:**
- Tilføj "Edit" button i header (ved siden af status dropdown)
- Opret `EditProjectDialog` komponent (lignende `CreateProjectDialog`)
- Support for: name, description, start_date, end_date, owner_user_id
- Integrer `useUpdateProject` hook

**Filer:**
- `src/components/projects/EditProjectDialog.tsx` (ny)
- `src/pages/projects/ProjectDetail.tsx` (opdater)

---

#### 2. Activity Timeline
**Problem:** Mangler activity feed som i DealDetail
**Løsning:**
- Tilføj `DealActivityList` komponent til ProjectDetail
- Vis activities fra linked deal
- Placer efter Project Information sektion

**Filer:**
- `src/pages/projects/ProjectDetail.tsx` (opdater)
- Brug eksisterende `src/components/deals/DealActivityList.tsx`

---

#### 3. Task Filtering & Sorting
**Problem:** Alle tasks vises uden filter/sort muligheder
**Løsning:**
- Tilføj filter bar i `RelatedTasksList` header
- Filter: Status (pending/in_progress/completed), Priority, Assignee
- Sort: Priority, Due Date, Created Date
- Vis filter state i URL query params (optional)

**Filer:**
- `src/components/tasks/RelatedTasksList.tsx` (opdater)
- Tilføj filter state og UI controls

---

#### 4. Time Tracking Overview
**Problem:** Tasks har estimated/actual hours, men ingen aggregeret visning
**Løsning:**
- Tilføj "Time Tracking" card i ProjectAnalytics eller separat sektion
- Vis: Total Estimated Hours, Total Actual Hours, Variance
- Progress bar for completion rate
- Liste over tasks med time tracking data

**Filer:**
- `src/components/projects/ProjectAnalytics.tsx` (opdater)
- Eller ny `src/components/projects/ProjectTimeTracking.tsx`

---

### 🟡 Medium Prioritet (Sprint 2)

#### 5. Team Members Sektion
**Problem:** Ingen visning af team members eller resource allocation
**Løsning:**
- Aggreger alle assigned users fra tasks
- Vis "Team Members" card med user avatars og task counts
- Link til user profiles

**Filer:**
- `src/components/projects/ProjectTeam.tsx` (ny)
- `src/pages/projects/ProjectDetail.tsx` (opdater)

---

#### 6. Budget Tracking
**Problem:** Financial overview viser invoice totals, men ingen budget vs actual
**Løsning:**
- Tilføj `budget_minor` field til projects tabel (migration)
- Vis "Budget vs Actual" card i ProjectAnalytics
- Progress bar og variance visning

**Filer:**
- `supabase/migrations/XXXX_add_budget_to_projects.sql` (ny)
- `src/components/projects/ProjectAnalytics.tsx` (opdater)
- `src/services/projects.ts` (opdater types)

---

#### 7. Quick Actions Menu
**Problem:** Mangler quick actions for almindelige opgaver
**Løsning:**
- Tilføj dropdown menu i header med actions:
  - "Add Milestone" (placeholder for fremtidig feature)
  - "Export Project Report" (PDF/CSV export)
  - "Duplicate Project" (optional)
  - "Archive Project"

**Filer:**
- `src/pages/projects/ProjectDetail.tsx` (opdater)
- Brug eksisterende DropdownMenu komponent

---

### 🟢 Lav Prioritet (Sprint 3)

#### 8. Milestones
**Problem:** Ingen milestone tracking
**Løsning:**
- Opret `milestones` tabel (name, date, status, project_id)
- Milestones sektion i ProjectDetail
- Integration med project timeline

**Filer:**
- `supabase/migrations/XXXX_create_milestones_table.sql` (ny)
- `src/components/projects/ProjectMilestones.tsx` (ny)
- `src/services/milestones.ts` (ny)

---

#### 9. Timeline/Gantt View
**Problem:** Ingen visuel tidslinje
**Løsning:**
- Simple timeline view med tasks og milestones
- Kan bruge eksisterende calendar komponenter eller ny timeline library

**Filer:**
- `src/components/projects/ProjectTimeline.tsx` (ny)

---

#### 10. Document Attachments
**Problem:** Links til documents, men ingen file attachments
**Løsning:**
- Integrer med eksisterende document system
- "Project Files" sektion

**Filer:**
- `src/components/projects/ProjectFiles.tsx` (ny)
- Integration med `src/services/documents.ts`

---

## 🏗️ Implementeringsplan

### Sprint 1 (Høj Prioritet)
**Project Detail:**
1. ✅ Edit Project Dialog
2. ✅ Activity Timeline
3. ✅ Task Filtering & Sorting
4. ✅ Time Tracking Overview

**Projects List:**
11. ✅ Analytics/KPI Cards
12. ✅ Enhanced Project Cards

**Estimeret tid:** 3-4 dage

### Sprint 2 (Medium Prioritet)
**Project Detail:**
5. ✅ Team Members Sektion
6. ✅ Budget Tracking
7. ✅ Quick Actions Menu

**Projects List:**
13. ✅ Advanced Filtering
14. ✅ View Mode Toggle
15. ✅ Pagination

**Estimeret tid:** 3-4 dage

### Sprint 3 (Lav Prioritet)
**Project Detail:**
8. ✅ Milestones
9. ✅ Timeline/Gantt View
10. ✅ Document Attachments

**Projects List:**
16. ✅ Export Functionality

**Estimeret tid:** 3-4 dage

---

## 📝 Noter

- Alle features skal følge eksisterende design patterns
- Brug eksisterende UI komponenter (Card, Dialog, Select, etc.)
- Test hver feature individuelt før næste sprint
- Dokumenter nye komponenter i kommentarer

---

## ✅ Definition of Done

Hver feature er færdig når:
- [ ] Komponent er implementeret og testet
- [ ] Integration i ProjectDetail/ProjectsList er færdig
- [ ] Ingen linter errors
- [ ] TypeScript types er korrekte
- [ ] Responsive design virker på mobile
- [ ] Dark mode support
- [ ] Følger eksisterende design patterns fra andre list pages

