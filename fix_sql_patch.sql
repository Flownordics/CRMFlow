-- Add missing invoice_email column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_email citext;

-- Add constraint with proper PostgreSQL syntax (drop first if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'companies_invoice_email_chk' 
        AND table_name = 'companies'
    ) THEN
        ALTER TABLE public.companies ADD CONSTRAINT companies_invoice_email_chk 
            CHECK (invoice_email IS NULL OR invoice_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$');
    END IF;
END $$;

COMMENT ON COLUMN public.companies.invoice_email IS 'Email used for sending invoices for this company';

-- Create missing email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_logs (
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

-- Create indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_type_related_id ON public.email_logs (related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at);

-- Create missing user_integrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null check (provider in ('google')),
  kind text not null check (kind in ('gmail','calendar')),
  access_token text not null,
  refresh_token text,
  email text,
  account_id text,
  expires_at timestamptz,
  scopes text[],
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider, kind)
);

-- Create indexes for user_integrations
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider_kind ON public.user_integrations (provider, kind);

-- Create missing idempotency_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,
  external_key text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now(),
  unique (purpose, external_key)
);

-- Create indexes for idempotency_keys
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_purpose ON public.idempotency_keys (purpose);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_external ON public.idempotency_keys (external_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_entity ON public.idempotency_keys (entity_type, entity_id);

-- Add updated_at trigger for user_integrations
CREATE OR REPLACE FUNCTION set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_user_integrations_updated_at ON public.user_integrations;
CREATE TRIGGER trg_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Add missing RLS policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own events" ON public.events;
CREATE POLICY "Users can manage their own events" ON public.events
  FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;
CREATE POLICY "Users can manage their own integrations" ON public.user_integrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add missing email_logs policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
CREATE POLICY "Users can view their own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own email logs" ON public.email_logs;
CREATE POLICY "Users can insert their own email logs" ON public.email_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add missing idempotency_keys policies
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Authenticated users can manage idempotency keys" ON public.idempotency_keys
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_integrations TO authenticated;
GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT SELECT, INSERT ON public.idempotency_keys TO authenticated;

-- Ensure activities table exists for email logging
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  deal_id uuid references public.deals(id) on delete cascade,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Add RLS for activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own activities" ON public.activities;
CREATE POLICY "Users can manage their own activities" ON public.activities
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT ON public.activities TO authenticated;
