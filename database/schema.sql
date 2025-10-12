-- =========================================
-- CRMFlow – Schema (Postgres / Supabase)
-- =========================================

-- Extensions
create extension if not exists "pgcrypto"; -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- ---------- Helpers ----------
-- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Validate polymorphic parent for line_items
create or replace function line_item_parent_exists()
returns trigger as $$
declare
  exists_bool boolean;
begin
  if new.parent_type = 'quote' then
    select exists(select 1 from public.quotes where id = new.parent_id) into exists_bool;
  elsif new.parent_type = 'order' then
    select exists(select 1 from public.orders where id = new.parent_id) into exists_bool;
  elsif new.parent_type = 'invoice' then
    select exists(select 1 from public.invoices where id = new.parent_id) into exists_bool;
  else
    raise exception 'Invalid parent_type %', new.parent_type;
  end if;

  if not exists_bool then
    raise exception 'line_items parent not found: % %', new.parent_type, new.parent_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Generate/advance document numbers per type & year (prefix + [YYYY] + padded counter)
create table if not exists public.numbering_counters (
  doc_type text not null,             -- 'quote' | 'order' | 'invoice'
  year int not null,
  counter int not null default 0,
  primary key (doc_type, year)
);

create or replace function next_doc_number(
  p_doc_type text,
  p_prefix text,
  p_year_infix boolean,
  p_pad int
) returns text
language plpgsql
as $$
declare
  y int := extract(year from now())::int;
  c int;
  infix text := case when p_year_infix then '-'||y::text||'-' else '-' end;
  fmt text;
begin
  insert into public.numbering_counters (doc_type, year, counter)
  values (p_doc_type, y, 0)
  on conflict (doc_type, year) do nothing;

  update public.numbering_counters
  set counter = counter + 1
  where doc_type = p_doc_type and year = y
  returning counter into c;

  fmt := lpad(c::text, p_pad, '0');
  return p_prefix || infix || fmt;
end;
$$;

-- ---------- Enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type quote_status as enum ('draft','sent','accepted','declined','expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft','sent','paid','overdue');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('bank','card','cash','other');
  end if;
  if not exists (select 1 from pg_type where typname = 'doc_parent_type') then
    create type doc_parent_type as enum ('quote','order','invoice');
  end if;
end$$;

-- ---------- Core ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  invoice_email text,
  domain text,
  vat text,
  phone text,
  address text,
  city text,
  country text,
  industry text,
  website text,
  do_not_call boolean not null default false,
  last_activity_at timestamptz,
  activity_status text check (activity_status in ('green','yellow','red')),
  -- Enhanced fields
  employee_count integer,
  annual_revenue_range text,
  lifecycle_stage text check (lifecycle_stage in ('lead','prospect','customer','partner','inactive')),
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  description text,
  founded_date date,
  parent_company_id uuid references public.companies(id) on delete set null,
  created_by uuid, -- auth.users.id (nullable if no RLS)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_companies_updated_at
before update on public.companies
for each row execute procedure set_updated_at();

create index if not exists idx_companies_name on public.companies (lower(name));
create index if not exists idx_companies_domain on public.companies (lower(domain));
create index if not exists idx_companies_country on public.companies (country);
create index if not exists idx_companies_do_not_call on public.companies (do_not_call);
create index if not exists idx_companies_activity_status on public.companies (activity_status, last_activity_at nulls last);
create index if not exists idx_companies_updated_at on public.companies (updated_at desc);
create index if not exists idx_companies_lifecycle_stage on public.companies (lifecycle_stage);
create index if not exists idx_companies_employee_count on public.companies (employee_count);
create index if not exists idx_companies_parent on public.companies (parent_company_id);

-- Company Tags
create table if not exists public.company_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#3b82f6',
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

-- Company Notes
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

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  title text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_people_updated_at
before update on public.people
for each row execute procedure set_updated_at();

create index if not exists idx_people_company on public.people (company_id);
create index if not exists idx_people_name on public.people (lower(last_name), lower(first_name));
create index if not exists idx_people_updated_at on public.people (updated_at desc);

-- Pipelines & Stages
create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  position int not null default 0
);
create index if not exists idx_stages_pipeline on public.stages (pipeline_id);
create unique index if not exists uidx_stage_pipeline_position on public.stages (pipeline_id, position);

-- Deals
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.people(id) on delete set null,
  stage_id uuid not null references public.stages(id) on delete restrict,
  position int not null default 0, -- kanban index within stage
  currency text not null default 'DKK',
  expected_value_minor int not null default 0 check (expected_value_minor >= 0),
  close_date date,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_deals_updated_at
before update on public.deals
for each row execute procedure set_updated_at();

create index if not exists idx_deals_stage on public.deals (stage_id, position);
create index if not exists idx_deals_company on public.deals (company_id);
create index if not exists idx_deals_updated_at on public.deals (updated_at desc);
create index if not exists idx_deals_title on public.deals (lower(title));
create index if not exists idx_deals_owner on public.deals (owner_user_id);
create index if not exists idx_deals_close_date on public.deals (close_date);

-- Deal Integrations (for tracking external calendar events, etc.)
create table if not exists public.deal_integrations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  provider text not null, -- 'google', 'outlook', etc.
  kind text not null, -- 'calendar', 'email', etc.
  external_id text not null, -- ID from external provider (e.g., Google Calendar event ID)
  metadata jsonb, -- Additional provider-specific data
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(deal_id, provider, kind)
);
create trigger trg_deal_integrations_updated_at
before update on public.deal_integrations
for each row execute procedure set_updated_at();

create index if not exists idx_deal_integrations_deal on public.deal_integrations (deal_id);
create index if not exists idx_deal_integrations_provider on public.deal_integrations (provider, kind);
create index if not exists idx_deal_integrations_external on public.deal_integrations (external_id);

-- Quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  status quote_status not null default 'draft',
  currency text not null default 'DKK',
  issue_date date,
  valid_until date,
  notes text,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.people(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  subtotal_minor int not null default 0 check (subtotal_minor >= 0),
  tax_minor int not null default 0 check (tax_minor >= 0),
  total_minor int not null default 0 check (total_minor >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_quotes_updated_at
before update on public.quotes
for each row execute procedure set_updated_at();

create index if not exists idx_quotes_deal on public.quotes (deal_id);
create index if not exists idx_quotes_company on public.quotes (company_id);
create index if not exists idx_quotes_status on public.quotes (status);
create index if not exists idx_quotes_updated_at on public.quotes (updated_at desc);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  currency text not null default 'DKK',
  order_date date,
  notes text,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.people(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  subtotal_minor int not null default 0 check (subtotal_minor >= 0),
  tax_minor int not null default 0 check (tax_minor >= 0),
  total_minor int not null default 0 check (total_minor >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_orders_updated_at
before update on public.orders
for each row execute procedure set_updated_at();

create index if not exists idx_orders_deal on public.orders (deal_id);
create index if not exists idx_orders_company on public.orders (company_id);
create index if not exists idx_orders_updated_at on public.orders (updated_at desc);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  status invoice_status not null default 'draft',
  currency text not null default 'DKK',
  issue_date date,
  due_date date,
  notes text,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.people(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  subtotal_minor int not null default 0 check (subtotal_minor >= 0),
  tax_minor int not null default 0 check (tax_minor >= 0),
  total_minor int not null default 0 check (total_minor >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute procedure set_updated_at();

create index if not exists idx_invoices_deal on public.invoices (deal_id);
create index if not exists idx_invoices_company on public.invoices (company_id);
create index if not exists idx_invoices_status on public.invoices (status);
create index if not exists idx_invoices_due on public.invoices (due_date);
create index if not exists idx_invoices_updated_at on public.invoices (updated_at desc);

-- Events (Native Calendar)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  attendees jsonb default '[]'::jsonb, -- [{email,name,optional}]
  color text, -- "primary|accent|warning|success|muted"
  kind text, -- "meeting|call|deadline|other"
  -- CRM-links (nullable)
  deal_id uuid references public.deals(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  -- Google sync fields (optional)
  google_event_id text, -- nullable
  sync_state text default 'none', -- 'none' | 'pending' | 'synced' | 'error'
  -- Ownership
  created_by uuid not null, -- auth.users.id
  -- Audit
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_events_updated_at
before update on public.events
for each row execute procedure set_updated_at();

-- Indexes for events
create index if not exists idx_events_timerange on public.events (start_at, end_at);
create index if not exists idx_events_created_by on public.events (created_by);
create index if not exists idx_events_deal_company on public.events (deal_id, company_id);
create index if not exists idx_events_google_event_id on public.events (google_event_id);

-- Line Items (polymorphic)
create table if not exists public.line_items (
  id uuid primary key default gen_random_uuid(),
  parent_type doc_parent_type not null,
  parent_id uuid not null,
  sku text,
  description text not null,
  qty numeric(12,2) not null check (qty >= 0),
  unit_minor int not null check (unit_minor >= 0),
  tax_rate_pct numeric(5,2) not null default 25 check (tax_rate_pct >= 0 and tax_rate_pct <= 100),
  discount_pct numeric(5,2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  position int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_line_items_updated_at
before update on public.line_items
for each row execute procedure set_updated_at();

create trigger trg_line_items_parent_exists
before insert or update on public.line_items
for each row execute procedure line_item_parent_exists();

create index if not exists idx_line_items_parent on public.line_items (parent_type, parent_id, position);

-- Payments (per invoice)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_minor int not null check (amount_minor >= 0),
  date date not null default current_date,
  method payment_method not null default 'bank',
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payments_updated_at
before update on public.payments
for each row execute procedure set_updated_at();

create index if not exists idx_payments_invoice on public.payments (invoice_id);

-- Activities (timeline)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- e.g. "stage_changed", "doc_created", "email_sent"
  deal_id uuid references public.deals(id) on delete cascade,
  user_id uuid, -- auth.users.id if available
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_deal on public.activities (deal_id, created_at desc);

-- Documents (uploads metadata)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size bigint not null check (size >= 0),
  type text not null,
  url text not null,
  storage_key text unique, -- strongly recommended to store S3 key/path
  deal_id uuid references public.deals(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_documents_updated_at
before update on public.documents
for each row execute procedure set_updated_at();

create index if not exists idx_documents_deal on public.documents (deal_id);
create index if not exists idx_documents_company on public.documents (company_id);
create index if not exists idx_documents_person on public.documents (person_id);

-- Stage probabilities (for weighted pipeline)
create table if not exists public.stage_probabilities (
  stage_id uuid primary key references public.stages(id) on delete cascade,
  probability numeric(4,3) not null default 0 check (probability >= 0 and probability <= 1),
  updated_at timestamptz not null default now()
);

-- Workspace/branding/settings (single-tenant)
create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  org_name text not null default 'Your Company',
  logo_url text,
  pdf_footer text,
  color_primary text, -- token key, optional
  -- numbering strategy
  quote_prefix text not null default 'QUOTE',
  order_prefix text not null default 'ORDER',
  invoice_prefix text not null default 'INV',
  pad int not null default 4,
  year_infix boolean not null default true,
  -- defaults
  default_currency text not null default 'DKK',
  default_tax_pct numeric(5,2) not null default 25,
  updated_at timestamptz not null default now()
);
create trigger trg_workspace_settings_updated_at
before update on public.workspace_settings
for each row execute procedure set_updated_at();

-- User settings (for calendar preferences)
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null, -- auth.users.id
  calendar_show_google boolean default false,
  calendar_default_sync boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute procedure set_updated_at();

-- Idempotency keys (for conversions/emails)
create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,             -- e.g. 'convert_quote','convert_order','convert_invoice','send_quote_email'
  external_key text not null,        -- header value
  entity_type text not null,         -- 'deal'|'quote'|'order'|'invoice'
  entity_id uuid,                    -- related id
  created_at timestamptz not null default now(),
  unique (purpose, external_key)
);

-- ---------- Storage bucket (public) ----------
-- Create 'documents' bucket if not exists
insert into storage.buckets (id, name, public)
values ('documents','documents', true)
on conflict (id) do nothing;

-- Optional: allow public read on 'documents'
-- NOTE: Supabase Storage policies should be handled separately if you enable RLS on storage.
