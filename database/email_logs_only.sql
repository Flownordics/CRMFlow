-- =========================================
-- CRMFlow – Email Logs Table (Standalone)
-- =========================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create email_logs table for tracking outbound emails
create table if not exists public.email_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  related_type text not null check (related_type in ('quote','order','invoice')),
  related_id uuid not null,
  to_email text not null,
  cc_emails text[] default '{}',
  subject text not null,
  provider text not null,          -- 'gmail' | 'resend' | 'smtp'
  provider_message_id text,
  status text not null check (status in ('queued','sent','error')),
  error_message text,
  created_at timestamptz not null default now()
);

-- Create indexes
create index if not exists idx_email_logs_user_id on public.email_logs (user_id);
create index if not exists idx_email_logs_related_type_related_id on public.email_logs (related_type, related_id);
create index if not exists idx_email_logs_created_at on public.email_logs (created_at);

-- Enable RLS (Row Level Security)
alter table public.email_logs enable row level security;

-- Create RLS policies
drop policy if exists "Users can view their own email logs" on public.email_logs;
create policy "Users can view their own email logs"
  on public.email_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own email logs" on public.email_logs;
create policy "Users can insert their own email logs"
  on public.email_logs
  for insert
  with check (auth.uid() = user_id);

-- Grant necessary permissions
grant select, insert on public.email_logs to authenticated;

-- Verify table creation
select 'Email logs table created successfully' as status;
