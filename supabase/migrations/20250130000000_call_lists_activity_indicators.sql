-- =========================================
-- CRMFlow – Call Lists & Activity Indicators Migration
-- =========================================

-- 1. Add activity tracking fields to companies table
alter table public.companies
  add column if not exists last_activity_at timestamptz,
  add column if not exists activity_status text check (activity_status in ('green','yellow','red')),
  add column if not exists do_not_call boolean default false;

-- Create index for activity status filtering and sorting
create index if not exists idx_companies_activity_status on public.companies (activity_status, last_activity_at nulls last);
create index if not exists idx_companies_do_not_call on public.companies (do_not_call) where do_not_call = true;

-- 2. Create activity_log table for company-level activities
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('call','email','meeting','note','task')),
  outcome text, -- e.g., 'completed', 'voicemail', 'no_answer', 'scheduled_followup'
  notes text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_company on public.activity_log (company_id, created_at desc);
create index if not exists idx_activity_log_user on public.activity_log (user_id, created_at desc);
create index if not exists idx_activity_log_type on public.activity_log (type, created_at desc);

-- 3. Create call_lists table
create table if not exists public.call_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  is_shared boolean default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_call_lists_updated_at
before update on public.call_lists
for each row execute procedure set_updated_at();

create index if not exists idx_call_lists_owner on public.call_lists (owner_user_id, created_at desc);
create index if not exists idx_call_lists_shared on public.call_lists (is_shared) where is_shared = true;

-- 4. Create call_list_items table
create table if not exists public.call_list_items (
  id uuid primary key default gen_random_uuid(),
  call_list_id uuid not null references public.call_lists(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  position int not null default 0,
  locked boolean default false,
  notes text,
  status text default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(call_list_id, company_id)
);

create trigger trg_call_list_items_updated_at
before update on public.call_list_items
for each row execute procedure set_updated_at();

create index if not exists idx_call_list_items_list on public.call_list_items (call_list_id, position);
create index if not exists idx_call_list_items_company on public.call_list_items (company_id);
create index if not exists idx_call_list_items_status on public.call_list_items (status, call_list_id);

-- 5. Function to compute activity status based on last_activity_at
create or replace function compute_activity_status(p_last_activity_at timestamptz)
returns text
language plpgsql
as $$
declare
  days_since_activity int;
begin
  -- If no activity, return red
  if p_last_activity_at is null then
    return 'red';
  end if;

  -- Calculate days since last activity
  days_since_activity := extract(epoch from (now() - p_last_activity_at)) / 86400;

  -- Green: <= 90 days (3 months)
  if days_since_activity <= 90 then
    return 'green';
  -- Yellow: > 90 and <= 180 days (3-6 months)
  elsif days_since_activity <= 180 then
    return 'yellow';
  -- Red: > 180 days (6+ months)
  else
    return 'red';
  end if;
end;
$$;

-- 6. Function to update company activity status
create or replace function update_company_activity_status(p_company_id uuid)
returns void
language plpgsql
as $$
declare
  v_last_activity timestamptz;
  v_new_status text;
begin
  -- Get the latest activity timestamp for this company
  select max(created_at) into v_last_activity
  from public.activity_log
  where company_id = p_company_id;

  -- Compute new status
  v_new_status := compute_activity_status(v_last_activity);

  -- Update the company record
  update public.companies
  set 
    last_activity_at = v_last_activity,
    activity_status = v_new_status
  where id = p_company_id;
end;
$$;

-- 7. Trigger to auto-update company activity status when activity is logged
create or replace function trg_update_company_activity()
returns trigger as $$
begin
  -- Update the company's activity status
  perform update_company_activity_status(new.company_id);
  return new;
end;
$$ language plpgsql;

create trigger trg_activity_log_update_company
after insert on public.activity_log
for each row execute procedure trg_update_company_activity();

-- 8. Initialize activity_status for existing companies (one-time migration)
update public.companies
set activity_status = compute_activity_status(last_activity_at)
where activity_status is null;

-- Set default to 'red' for companies with no activity status
update public.companies
set activity_status = 'red'
where activity_status is null;

-- 9. Add helpful comment
comment on table public.call_lists is 'Call lists for organizing sales outreach';
comment on table public.call_list_items is 'Individual companies in a call list with position and status tracking';
comment on table public.activity_log is 'Company-level activity tracking for call logging, meetings, emails, etc.';
comment on column public.companies.activity_status is 'Computed status based on last_activity_at: green (<=90d), yellow (90-180d), red (>180d or null)';
comment on column public.companies.last_activity_at is 'Timestamp of most recent logged activity for this company';
comment on column public.companies.do_not_call is 'Flag to exclude company from call lists';
