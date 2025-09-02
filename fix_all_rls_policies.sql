-- Fix RLS policies for all tables
-- This script fixes the common issue where RLS policies prevent creation of records

-- Companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
CREATE POLICY "Allow authenticated users to manage companies" ON public.companies 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- People table
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON public.people;
CREATE POLICY "Allow authenticated users to manage people" ON public.people 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Deals table
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
CREATE POLICY "Allow authenticated users to manage deals" ON public.deals 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Quotes table
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON public.quotes;
CREATE POLICY "Allow authenticated users to manage quotes" ON public.quotes 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
CREATE POLICY "Allow authenticated users to manage orders" ON public.orders 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage invoices" ON public.invoices;
CREATE POLICY "Allow authenticated users to manage invoices" ON public.invoices 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Line items table
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage line_items" ON public.line_items;
CREATE POLICY "Allow authenticated users to manage line_items" ON public.line_items 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Activities table
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage activities" ON public.activities;
CREATE POLICY "Allow authenticated users to manage activities" ON public.activities 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage documents" ON public.documents;
CREATE POLICY "Allow authenticated users to manage documents" ON public.documents 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage payments" ON public.payments;
CREATE POLICY "Allow authenticated users to manage payments" ON public.payments 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Email logs table
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage email_logs" ON public.email_logs;
CREATE POLICY "Allow authenticated users to manage email_logs" ON public.email_logs 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- User integrations table
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage user_integrations" ON public.user_integrations;
CREATE POLICY "Allow authenticated users to manage user_integrations" ON public.user_integrations 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Workspace settings table
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON public.workspace_settings;
CREATE POLICY "Allow authenticated users to manage workspace_settings" ON public.workspace_settings 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);

-- Idempotency keys table
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage idempotency_keys" ON public.idempotency_keys;
CREATE POLICY "Allow authenticated users to manage idempotency_keys" ON public.idempotency_keys 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);
