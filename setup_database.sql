-- CRMFlow Database Setup Script
-- Run this in the Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    CREATE TYPE quote_status AS ENUM ('draft','sent','accepted','declined','expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','overdue');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('bank','card','cash','other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_parent_type') THEN
    CREATE TYPE doc_parent_type AS ENUM ('quote','order','invoice');
  END IF;
END$$;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS trg_people_updated_at ON public.people;
DROP TRIGGER IF EXISTS trg_deals_updated_at ON public.deals;
DROP TRIGGER IF EXISTS trg_quotes_updated_at ON public.quotes;
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS trg_line_items_updated_at ON public.line_items;
DROP TRIGGER IF EXISTS trg_workspace_settings_updated_at ON public.workspace_settings;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON public.people;
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
DROP POLICY IF EXISTS "Allow authenticated users to manage pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Allow authenticated users to manage stages" ON public.stages;
DROP POLICY IF EXISTS "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities;
DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow authenticated users to manage line_items" ON public.line_items;
DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON public.workspace_settings;

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  domain text,
  vat text,
  phone text,
  address text,
  city text,
  country text,
  industry text,
  website text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- People table
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  title text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pipelines table
CREATE TABLE IF NOT EXISTS public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0
);

-- Stages table
CREATE TABLE IF NOT EXISTS public.stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0
);

-- Stage probabilities table (this was missing!)
CREATE TABLE IF NOT EXISTS public.stage_probabilities (
  stage_id uuid PRIMARY KEY REFERENCES public.stages(id) ON DELETE CASCADE,
  probability numeric(4,3) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  stage_id uuid NOT NULL REFERENCES public.stages(id) ON DELETE RESTRICT,
  position int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DKK',
  expected_value_minor int NOT NULL DEFAULT 0 CHECK (expected_value_minor >= 0),
  close_date date,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  status quote_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'DKK',
  issue_date date,
  valid_until date,
  notes text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  subtotal_minor int NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  tax_minor int NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor int NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  currency text NOT NULL DEFAULT 'DKK',
  order_date date,
  notes text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  subtotal_minor int NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  tax_minor int NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor int NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  status invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'DKK',
  issue_date date,
  due_date date,
  notes text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  subtotal_minor int NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  tax_minor int NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor int NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Line Items table
CREATE TABLE IF NOT EXISTS public.line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type doc_parent_type NOT NULL,
  parent_id uuid NOT NULL,
  sku text,
  description text NOT NULL,
  qty numeric(12,2) NOT NULL CHECK (qty >= 0),
  unit_minor int NOT NULL CHECK (unit_minor >= 0),
  tax_rate_pct numeric(5,2) NOT NULL DEFAULT 25 CHECK (tax_rate_pct >= 0 AND tax_rate_pct <= 100),
  discount_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  position int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workspace settings table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL DEFAULT 'Your Company',
  logo_url text,
  pdf_footer text,
  color_primary text,
  quote_prefix text NOT NULL DEFAULT 'QUOTE',
  order_prefix text NOT NULL DEFAULT 'ORDER',
  invoice_prefix text NOT NULL DEFAULT 'INV',
  pad int NOT NULL DEFAULT 4,
  year_infix boolean NOT NULL DEFAULT true,
  default_currency text NOT NULL DEFAULT 'DKK',
  default_tax_pct numeric(5,2) NOT NULL DEFAULT 25,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create triggers
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_line_items_updated_at
  BEFORE UPDATE ON public.line_items
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies (lower(name));
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies (lower(domain));
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies (country);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON public.companies (updated_at desc);

CREATE INDEX IF NOT EXISTS idx_people_company ON public.people (company_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON public.people (lower(last_name), lower(first_name));
CREATE INDEX IF NOT EXISTS idx_people_updated_at ON public.people (updated_at desc);

CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON public.stages (pipeline_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_stage_pipeline_position ON public.stages (pipeline_id, position);

CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals (stage_id, position);
CREATE INDEX IF NOT EXISTS idx_deals_company ON public.deals (company_id);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON public.deals (updated_at desc);
CREATE INDEX IF NOT EXISTS idx_deals_title ON public.deals (lower(title));
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON public.deals (close_date);

CREATE INDEX IF NOT EXISTS idx_quotes_deal ON public.quotes (deal_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes (company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_updated_at ON public.quotes (updated_at desc);

CREATE INDEX IF NOT EXISTS idx_orders_deal ON public.orders (deal_id);
CREATE INDEX IF NOT EXISTS idx_orders_company ON public.orders (company_id);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON public.orders (updated_at desc);

CREATE INDEX IF NOT EXISTS idx_invoices_deal ON public.invoices (deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON public.invoices (updated_at desc);

CREATE INDEX IF NOT EXISTS idx_line_items_parent ON public.line_items (parent_type, parent_id, position);

-- Enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_probabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all authenticated users for now)
CREATE POLICY "Allow authenticated users to manage people" ON public.people 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage companies" ON public.companies 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage deals" ON public.deals 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage pipelines" ON public.pipelines 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage stages" ON public.stages 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage quotes" ON public.quotes 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage orders" ON public.orders 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage invoices" ON public.invoices 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage line_items" ON public.line_items 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage workspace_settings" ON public.workspace_settings 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert seed data
INSERT INTO public.pipelines (id, name, position)
VALUES (gen_random_uuid(), 'Default Pipeline', 0)
ON CONFLICT DO NOTHING;

-- Insert stages
WITH p AS (
  SELECT id FROM public.pipelines WHERE name = 'Default Pipeline' LIMIT 1
)
INSERT INTO public.stages (id, pipeline_id, name, position)
SELECT gen_random_uuid(), p.id, s.name, s.pos
FROM p
CROSS JOIN (VALUES
  ('Prospecting', 0),
  ('Proposal',    1),
  ('Negotiation', 2),
  ('Won',         3),
  ('Lost',        4)
) AS s(name, pos)
ON CONFLICT DO NOTHING;

-- Insert stage probabilities
INSERT INTO public.stage_probabilities (stage_id, probability)
SELECT st.id, x.prob
FROM public.stages st
JOIN (
  VALUES
    ('Prospecting', 0.10),
    ('Proposal',    0.50),
    ('Negotiation', 0.70),
    ('Won',         1.00),
    ('Lost',        0.00)
) AS x(name, prob) ON lower(st.name) = lower(x.name)
ON CONFLICT (stage_id) DO UPDATE SET probability = excluded.probability;

-- Insert workspace settings
INSERT INTO public.workspace_settings (org_name, pdf_footer)
VALUES ('CRMFlow', 'Thank you for your business.')
ON CONFLICT DO NOTHING;

-- Insert demo companies
INSERT INTO public.companies (id, name, domain, country)
VALUES
  (gen_random_uuid(), 'Acme A/S', 'acme.com', 'DK'),
  (gen_random_uuid(), 'Globex ApS', 'globex.com', 'DK')
ON CONFLICT DO NOTHING;

-- Insert demo people
INSERT INTO public.people (company_id, first_name, last_name, email, title)
SELECT c.id, 'Peter','Gibbons','peter@acme.com','Manager'
FROM public.companies c WHERE c.name = 'Acme A/S'
ON CONFLICT DO NOTHING;

INSERT INTO public.people (company_id, first_name, last_name, email, title)
SELECT c.id, 'Homer','Simpson','homer@globex.com','Operator'
FROM public.companies c WHERE c.name = 'Globex ApS'
ON CONFLICT DO NOTHING;

-- Insert demo deal
INSERT INTO public.deals (title, company_id, contact_id, stage_id, currency, expected_value_minor, close_date)
SELECT 'Website redesign', c.id, p.id, st.id, 'DKK', 1500000, current_date + 14
FROM public.companies c
JOIN public.people p ON p.company_id = c.id AND p.email = 'peter@acme.com'
JOIN public.stages st ON lower(st.name) = 'prospecting'
WHERE c.name = 'Acme A/S'
ON CONFLICT DO NOTHING;
