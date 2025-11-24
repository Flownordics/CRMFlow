-- Create task templates table
-- Templates can be used to auto-suggest tasks based on deal stage, entity type, etc.
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  title TEXT NOT NULL,
  task_description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  estimated_hours DECIMAL(5,2),
  tags TEXT[] DEFAULT '{}',
  
  -- Template matching criteria
  trigger_type TEXT CHECK (trigger_type IN ('deal_stage', 'entity_type', 'manual')) NOT NULL,
  trigger_value TEXT, -- e.g., 'qualified' for deal_stage, 'quote' for entity_type
  
  -- Optional: specific company or person context
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_trigger ON public.task_templates(trigger_type, trigger_value);
CREATE INDEX IF NOT EXISTS idx_task_templates_company ON public.task_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON public.task_templates(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_templates_updated_at
    BEFORE UPDATE ON public.task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_task_templates_updated_at();

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow authenticated users)
CREATE POLICY "Allow authenticated users to manage task templates" ON public.task_templates 
    FOR ALL 
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.task_templates TO authenticated;

