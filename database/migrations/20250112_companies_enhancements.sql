-- =========================================
-- CRMFlow – Companies Enhancement Migration
-- Phase 1: Tags, Enhanced Fields, Hierarchy, Notes
-- =========================================

-- 1. Company Tags System
create table if not exists public.company_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#3b82f6', -- Default blue color
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_company_tags_updated_at
before update on public.company_tags
for each row execute procedure set_updated_at();

create table if not exists public.company_tag_assignments (
  company_id uuid not null references public.companies(id) on delete cascade,
  tag_id uuid not null references public.company_tags(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (company_id, tag_id)
);

create index if not exists idx_company_tag_assignments_company on public.company_tag_assignments(company_id);
create index if not exists idx_company_tag_assignments_tag on public.company_tag_assignments(tag_id);

-- 2. Enhanced Company Fields
alter table public.companies
  add column if not exists employee_count integer,
  add column if not exists annual_revenue_range text,
  add column if not exists lifecycle_stage text check (lifecycle_stage in ('lead','prospect','customer','partner','inactive')),
  add column if not exists linkedin_url text,
  add column if not exists twitter_url text,
  add column if not exists facebook_url text,
  add column if not exists description text,
  add column if not exists founded_date date;

create index if not exists idx_companies_lifecycle_stage on public.companies(lifecycle_stage);
create index if not exists idx_companies_employee_count on public.companies(employee_count);

-- 3. Company Hierarchy
alter table public.companies
  add column if not exists parent_company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_companies_parent on public.companies(parent_company_id);

-- 4. Company Notes
create table if not exists public.company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_company_notes_updated_at
before update on public.company_notes
for each row execute procedure set_updated_at();

create index if not exists idx_company_notes_company on public.company_notes(company_id, created_at desc);
create index if not exists idx_company_notes_pinned on public.company_notes(company_id, is_pinned, created_at desc) where is_pinned = true;

-- 5. Insert default tags
insert into public.company_tags (name, color) values
  ('VIP', '#ef4444'),
  ('Lead', '#3b82f6'),
  ('Prospect', '#f59e0b'),
  ('Customer', '#10b981'),
  ('Partner', '#8b5cf6'),
  ('Inactive', '#6b7280')
on conflict (name) do nothing;

-- 6. Comments for documentation
comment on table public.company_tags is 'User-defined tags for categorizing companies';
comment on table public.company_tag_assignments is 'Many-to-many relationship between companies and tags';
comment on table public.company_notes is 'Rich text notes attached to companies, separate from activity log';
comment on column public.companies.lifecycle_stage is 'Sales lifecycle stage: lead, prospect, customer, partner, inactive';
comment on column public.companies.parent_company_id is 'Parent company for subsidiaries and company hierarchies';
comment on column public.companies.employee_count is 'Number of employees';
comment on column public.companies.annual_revenue_range is 'Annual revenue range (e.g., "0-1M", "1M-10M", "10M+")';

