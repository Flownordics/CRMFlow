-- Create projects table
-- Projects are 1-to-1 with deals (one project per deal)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Auto-generated from deal title or user input
  description TEXT,
  status TEXT CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')) DEFAULT 'active',
  company_id UUID REFERENCES public.companies(id), -- Denormalized from deal for performance
  owner_user_id UUID REFERENCES auth.users(id), -- Denormalized from deal for performance
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT projects_deal_id_unique UNIQUE (deal_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_deal_id ON public.projects(deal_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner_user_id ON public.projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same pattern as deals - allow authenticated users)
CREATE POLICY "Allow authenticated users to manage projects" ON public.projects 
    FOR ALL 
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions to authenticated users
GRANT ALL ON public.projects TO authenticated;





