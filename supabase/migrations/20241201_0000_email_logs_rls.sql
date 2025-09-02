-- =========================================
-- CRMFlow – Email Logs RLS Policies
-- =========================================

-- Enable RLS on email_logs table
alter table public.email_logs enable row level security;

-- Reset policies (idempotent)
drop policy if exists "Users can view their own email logs" on public.email_logs;
drop policy if exists "Users can insert their own email logs" on public.email_logs;

-- Minimal secure policies
create policy "Users can view their own email logs"
  on public.email_logs for select
  using (user_id = auth.uid());

create policy "Users can insert their own email logs"
  on public.email_logs for insert
  with check (user_id = auth.uid());

grant select, insert on public.email_logs to authenticated;

-- Verify RLS is enabled
select 
  schemaname,
  tablename,
  rowsecurity,
  case when rowsecurity then 'RLS Enabled' else 'RLS Disabled' end as status
from pg_tables 
where tablename = 'email_logs';

-- Test policy enforcement
-- This should only return logs for the current user
select count(*) as user_email_logs_count 
from public.email_logs 
where user_id = auth.uid();
