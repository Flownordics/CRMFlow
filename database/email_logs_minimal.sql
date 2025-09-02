-- =========================================
-- CRMFlow – Email Logs Table (Minimal)
-- =========================================

-- Create email_logs table for tracking outbound emails
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  related_type text not null check (related_type in ('quote','order','invoice')),
  related_id uuid not null,
  to_email text not null,
  cc_emails text[] default '{}',
  subject text not null,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('queued','sent','error')),
  error_message text,
  created_at timestamptz not null default now()
);

-- Create basic indexes
create index if not exists idx_email_logs_user_id on public.email_logs (user_id);
create index if not exists idx_email_logs_related_type_related_id on public.email_logs (related_type, related_id);

-- Grant basic permissions
grant select, insert on public.email_logs to authenticated;

-- Verify table creation
select 'Email logs table created successfully' as status;
