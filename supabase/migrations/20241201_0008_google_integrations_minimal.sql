-- Google Calendar + Gmail (BYOG) – MINIMAL VERSION
-- Only create tables, no data operations

-- Drop existing tables if they exist (to avoid conflicts)
drop table if exists public.workspace_integrations cascade;
drop table if exists public.user_integrations cascade;

-- Workspace OAuth credentials (Client ID/Secret)
create table public.workspace_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  provider text not null check (provider in ('google')),
  kind text not null check (kind in ('gmail','calendar')),
  client_id text not null,
  client_secret text not null,
  redirect_uri text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure unique combination
  unique(workspace_id, provider, kind)
);

create index idx_workspace_integrations_ws on public.workspace_integrations(workspace_id);
alter table public.workspace_integrations enable row level security;

-- RLS Policy: Workspace can manage own OAuth credentials
create policy "Workspace can manage own oauth creds"
on public.workspace_integrations
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- User's actual integration (access/refresh tokens)
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid not null,
  provider text not null check (provider in ('google')),
  kind text not null check (kind in ('gmail','calendar')),
  email citext,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure unique combination
  unique(user_id, provider, kind)
);

create index idx_user_integrations_user on public.user_integrations(user_id);
create index idx_user_integrations_ws on public.user_integrations(workspace_id);
alter table public.user_integrations enable row level security;

-- RLS Policy: Users manage own integrations
create policy "Users manage own integrations"
on public.user_integrations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Grant permissions
grant select, insert, update, delete on public.workspace_integrations to authenticated;
grant select, insert, update, delete on public.user_integrations to authenticated;

-- Add comments for documentation
comment on table public.workspace_integrations is 'Workspace-level OAuth credentials for Google integrations (BYOG)';
comment on table public.user_integrations is 'User-specific integration tokens and status for Google services';

