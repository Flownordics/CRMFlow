-- =========================================
-- RLS Policies for events & user_settings
-- =========================================

-- ========== SAFETY: ensure columns exist ==========
do $$
begin
  -- events.created_by
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='events' and column_name='created_by'
  ) then
    alter table public.events add column created_by uuid not null default auth.uid();
  end if;

  -- user_settings.user_id
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_settings' and column_name='user_id'
  ) then
    alter table public.user_settings add column user_id uuid not null default auth.uid();
    -- hvis user_settings i forvejen har en PK, så skip næste linje
    begin
      alter table public.user_settings add primary key (user_id);
    exception when others then
      -- ignore hvis PK allerede findes
      null;
    end;
  end if;
end$$;

-- ========== Enable RLS ==========
alter table public.events enable row level security;
alter table public.user_settings enable row level security;

-- ========== EVENTS policies ==========
-- Drop existing policies if they exist (to ensure clean state)
drop policy if exists "Users can manage their own events" on public.events;
drop policy if exists "events_select_own" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

-- Create comprehensive policies for events
create policy "events_select_own"
  on public.events for select
  using (created_by = auth.uid());

create policy "events_insert_own"
  on public.events for insert
  with check (created_by = auth.uid());

create policy "events_update_own"
  on public.events for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "events_delete_own"
  on public.events for delete
  using (created_by = auth.uid());

-- ========== USER_SETTINGS policies ==========
-- Drop existing policies if they exist (to ensure clean state)
drop policy if exists "Users can manage their own settings" on public.user_settings;
drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_upsert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "user_settings_delete_own" on public.user_settings;

-- Create comprehensive policies for user_settings
create policy "user_settings_select_own"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (user_id = auth.uid());

create policy "user_settings_update_own"
  on public.user_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (user_id = auth.uid());
