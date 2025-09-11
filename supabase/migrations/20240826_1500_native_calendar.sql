-- Native Calendar Migration
-- This migration adds the events and user_settings tables for native calendar functionality

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

-- Create trigger for updated_at
create trigger trg_events_updated_at
before update on public.events
for each row execute procedure set_updated_at();

-- Indexes for events
create index if not exists idx_events_timerange on public.events (start_at, end_at);
create index if not exists idx_events_created_by on public.events (created_by);
create index if not exists idx_events_deal_company on public.events (deal_id, company_id);
create index if not exists idx_events_google_event_id on public.events (google_event_id);

-- User settings (for calendar preferences)
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null, -- auth.users.id
  calendar_show_google boolean default false,
  calendar_default_sync boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create trigger for updated_at
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute procedure set_updated_at();
