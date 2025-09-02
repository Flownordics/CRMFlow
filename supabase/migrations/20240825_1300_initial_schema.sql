-- Initial schema for CRMFlow
-- =========================================

-- Extensions
create extension if not exists "pgcrypto";
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

-- ---------- Core Tables ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  domain text,
  vat text,
  phone text,
  address text,
  city text,
  country text,
  industry text,
  website text,
  created_by uuid, -- auth.users.id (nullable if no RLS)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_companies_updated_at
before update on public.companies
for each row execute procedure set_updated_at();

create index if not exists idx_companies_name on public.companies (lower(name));
create index if not exists idx_companies_domain on public.companies (lower(domain));
create index if not exists idx_companies_country on public.companies (country);
create index if not exists idx_companies_updated_at on public.companies (updated_at desc);

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

-- Idempotency keys (for conversions/emails)
create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,             -- e.g. 'convert_quote','convert_order','convert_invoice','send_quote_email'
  external_key text not null,        -- header value
  entity_type text not null,         -- 'deal'|'quote'|'order'|'invoice'
  entity_id uuid,                    -- related id
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  unique (purpose, external_key)
);

-- Email logs table
create table if not exists public.email_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    related_type text NOT NULL CHECK (related_type IN ('quote','order','invoice')),
    related_id uuid NOT NULL,
    to_email text NOT NULL,
    cc_emails text[] DEFAULT '{}',
    subject text NOT NULL,
    provider text NOT NULL,
    provider_message_id text,
    status text NOT NULL CHECK (status IN ('queued','sent','error')),
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for email_logs
create index if not exists idx_email_logs_user_id on public.email_logs (user_id);
create index if not exists idx_email_logs_related_type_related_id on public.email_logs (related_type, related_id);
create index if not exists idx_email_logs_created_at on public.email_logs (created_at);
create index if not exists idx_idempotency_keys_expires_at on public.idempotency_keys (expires_at);

-- ---------- Storage bucket (public) ----------
-- Create 'documents' bucket if not exists
insert into storage.buckets (id, name, public)
values ('documents','documents', true)
on conflict (id) do nothing;

-- ---------- RLS Policies ----------
-- Enable RLS on core tables
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables (allow authenticated users)
-- People
CREATE POLICY "Allow authenticated users to manage people" ON public.people FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Companies
CREATE POLICY "Allow authenticated users to manage companies" ON public.companies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Deals
CREATE POLICY "Allow authenticated users to manage deals" ON public.deals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Quotes
CREATE POLICY "Allow authenticated users to manage quotes" ON public.quotes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Orders
CREATE POLICY "Allow authenticated users to manage orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Invoices
CREATE POLICY "Allow authenticated users to manage invoices" ON public.invoices FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Line Items
CREATE POLICY "Allow authenticated users to manage line_items" ON public.line_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Payments
CREATE POLICY "Allow authenticated users to manage payments" ON public.payments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Activities
CREATE POLICY "Allow authenticated users to manage activities" ON public.activities FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Documents
CREATE POLICY "Allow authenticated users to manage documents" ON public.documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Workspace Settings
CREATE POLICY "Allow authenticated users to manage workspace_settings" ON public.workspace_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Idempotency Keys
CREATE POLICY "Allow authenticated users to manage idempotency_keys" ON public.idempotency_keys FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Email Logs
CREATE POLICY "Allow authenticated users to manage email_logs" ON public.email_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
