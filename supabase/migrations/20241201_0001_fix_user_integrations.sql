-- =========================================
-- CRMFlow – Fix User Integrations Table
-- =========================================

-- Drop existing table if it exists (to fix schema issues)
drop table if exists public.user_integrations cascade;

-- Create user_integrations table with correct schema
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  kind text not null check (kind in ('gmail','calendar')),
  email text,
  account_id text,
  -- OAuth tokens (only what we need to store)
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider, kind)
);

-- Create indexes
create index if not exists idx_user_integrations_user_id on public.user_integrations (user_id);
create index if not exists idx_user_integrations_provider_kind on public.user_integrations (provider, kind);

-- Create updated_at trigger
create trigger set_user_integrations_updated_at
  before update on public.user_integrations
  for each row
  execute function set_updated_at();

-- Enable RLS (Row Level Security)
alter table public.user_integrations enable row level security;

-- Create RLS policies
drop policy if exists "Users can view their own integrations" on public.user_integrations;
create policy "Users can view their own integrations"
  on public.user_integrations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own integrations" on public.user_integrations;
create policy "Users can insert their own integrations"
  on public.user_integrations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own integrations" on public.user_integrations;
create policy "Users can update their own integrations"
  on public.user_integrations
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own integrations" on public.user_integrations;
create policy "Users can delete their own integrations"
  on public.user_integrations
  for delete
  using (auth.uid() = user_id);

-- Grant necessary permissions
grant select, insert, update, delete on public.user_integrations to authenticated;

-- Verify table creation
select 
  schemaname,
  tablename,
  rowsecurity,
  case when rowsecurity then 'RLS Enabled' else 'RLS Disabled' end as status
from pg_tables 
where tablename = 'user_integrations';

-- Test policy enforcement
-- This should only return integrations for the current user
select count(*) as user_integrations_count 
from public.user_integrations 
where user_id = auth.uid();
