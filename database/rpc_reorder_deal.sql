-- =========================================
-- CRMFlow – RPC Functions
-- =========================================

-- Function to reorder deals within and between stages
-- This handles both reordering within the same stage and moving between stages
create or replace function public.reorder_deal(
  p_deal uuid,
  p_new_stage uuid,
  p_new_index int
) returns void language plpgsql as $$
declare
  v_old_stage uuid;
  v_old_pos int;
begin
  -- Get current deal position and stage with row lock to prevent race conditions
  select stage_id, position into v_old_stage, v_old_pos 
  from public.deals 
  where id = p_deal 
  for update;

  if v_old_stage is null then
    raise exception 'deal not found';
  end if;

  if v_old_stage = p_new_stage then
    -- Reordering within the same stage
    -- Shift positions to make room for the new position
    update public.deals
      set position = position + case when position >= p_new_index then 1 else 0 end
      where stage_id = p_new_stage and id <> p_deal;

    -- Update the deal to its new position
    update public.deals 
      set position = p_new_index, stage_id = p_new_stage 
      where id = p_deal;
  else
    -- Moving to a different stage
    -- Remove the hole in the old stage by shifting positions down
    update public.deals
      set position = position - 1
      where stage_id = v_old_stage and position > v_old_pos;

    -- Make room in the new stage by shifting positions up
    update public.deals
      set position = position + 1
      where stage_id = p_new_stage and position >= p_new_index;

    -- Move the deal to the new stage and position
    update public.deals 
      set stage_id = p_new_stage, position = p_new_index 
      where id = p_deal;
  end if;
end; $$;

-- Grant execute permission to authenticated users
grant execute on function public.reorder_deal(uuid, uuid, int) to authenticated;

-- =========================================
-- CRMFlow – User Integrations Migration
-- =========================================

-- Create user_integrations table for Gmail Mail + Calendar integrations
create table if not exists public.user_integrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  kind text not null check (kind in ('gmail','calendar')),
  email text,
  account_id text,
  -- User's Google OAuth credentials
  google_client_id text not null,
  google_client_secret text not null,
  -- OAuth tokens
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

-- Note: set_updated_at() function not available, skipping trigger creation
-- The updated_at column will be managed manually or through application logic

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

-- =========================================
-- CRMFlow – Idempotency Keys Table
-- =========================================

-- Create idempotency_keys table for preventing duplicate operations
create table if not exists public.idempotency_keys (
  id uuid primary key default uuid_generate_v4(),
  purpose text not null,
  external_key text not null unique,
  entity_type text,
  entity_id uuid,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Add expires_at column if it doesn't exist (for existing tables)
alter table public.idempotency_keys 
  add column if not exists expires_at timestamptz default (now() + interval '24 hours');

-- Create indexes
create index if not exists idx_idempotency_keys_purpose on public.idempotency_keys (purpose);
create index if not exists idx_idempotency_keys_external_key on public.idempotency_keys (external_key);
create index if not exists idx_idempotency_keys_expires_at on public.idempotency_keys (expires_at);

-- Enable RLS (Row Level Security)
alter table public.idempotency_keys enable row level security;

-- Create RLS policies (allow all authenticated users to manage idempotency keys)
drop policy if exists "Authenticated users can manage idempotency keys" on public.idempotency_keys;
create policy "Authenticated users can manage idempotency keys"
  on public.idempotency_keys
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Grant necessary permissions
grant select, insert, update, delete on public.idempotency_keys to authenticated;

-- Create function to clean up expired idempotency keys
create or replace function public.cleanup_expired_idempotency_keys()
returns void language plpgsql as $$
begin
  delete from public.idempotency_keys 
  where expires_at < now();
end; $$;

-- Grant execute permission
grant execute on function public.cleanup_expired_idempotency_keys() to authenticated;

-- =========================================
-- CRMFlow – Email Logs Table
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

-- =========================================
-- CRMFlow – Email Templates for Workspace Settings
-- =========================================

-- Add email template columns to workspace_settings table
alter table public.workspace_settings
  add column if not exists email_template_quote_html text,
  add column if not exists email_template_quote_text text;

-- Seed default simple templates if null
update public.workspace_settings 
set 
  email_template_quote_html = coalesce(
    email_template_quote_html,
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quote {{quote.number}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Quote {{quote.number}}</h2>
        
        <p>Dear {{contact.name}},</p>
        
        <p>Thank you for your interest in our services. Please find attached your quote <strong>{{quote.number}}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Quote Details:</strong></p>
            <p style="margin: 5px 0;">Total Amount: {{quote.total_minor}} {{quote.currency}}</p>
            <p style="margin: 5px 0;">Valid Until: {{quote.valid_until}}</p>
        </div>
        
        <p>You can also view this quote online at: <a href="{{appUrl}}/quotes/{{quote.id}}" style="color: #2563eb;">{{appUrl}}/quotes/{{quote.id}}</a></p>
        
        <p>If you have any questions or need clarification, please don''t hesitate to contact us.</p>
        
        <p>Best regards,<br>
        <strong>{{workspace.org_name}}</strong></p>
        
        {{#if workspace.pdf_footer}}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 14px; color: #6b7280;">{{workspace.pdf_footer}}</p>
        {{/if}}
    </div>
</body>
</html>'
  ),
  email_template_quote_text = coalesce(
    email_template_quote_text,
    'Quote {{quote.number}}

Dear {{contact.name}},

Thank you for your interest in our services. Please find attached your quote {{quote.number}}.

Quote Details:
- Total Amount: {{quote.total_minor}} {{quote.currency}}
- Valid Until: {{quote.valid_until}}

You can also view this quote online at: {{appUrl}}/quotes/{{quote.id}}

If you have any questions or need clarification, please don''t hesitate to contact us.

Best regards,
{{workspace.org_name}}

{{#if workspace.pdf_footer}}
{{workspace.pdf_footer}}
{{/if}}'
  )
where email_template_quote_html is null or email_template_quote_text is null;
