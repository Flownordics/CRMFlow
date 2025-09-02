-- Fix remote schema - check and create missing tables
-- Run this in Supabase SQL Editor

-- First, let's see what tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Create missing tables if they don't exist
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

-- Stage probabilities table
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
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','declined','expired')),
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
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
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
  parent_type text NOT NULL CHECK (parent_type IN ('quote','order','invoice')),
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

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
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
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
CREATE POLICY "Allow authenticated users to manage companies" ON public.companies 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON public.people;
CREATE POLICY "Allow authenticated users to manage people" ON public.people 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
CREATE POLICY "Allow authenticated users to manage deals" ON public.deals 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage pipelines" ON public.pipelines;
CREATE POLICY "Allow authenticated users to manage pipelines" ON public.pipelines 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage stages" ON public.stages;
CREATE POLICY "Allow authenticated users to manage stages" ON public.stages 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities;
CREATE POLICY "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON public.quotes;
CREATE POLICY "Allow authenticated users to manage quotes" ON public.quotes 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
CREATE POLICY "Allow authenticated users to manage orders" ON public.orders 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage invoices" ON public.invoices;
CREATE POLICY "Allow authenticated users to manage invoices" ON public.invoices 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage line_items" ON public.line_items;
CREATE POLICY "Allow authenticated users to manage line_items" ON public.line_items 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON public.workspace_settings;
CREATE POLICY "Allow authenticated users to manage workspace_settings" ON public.workspace_settings 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert seed data if not exists
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

-- Show final table list
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
