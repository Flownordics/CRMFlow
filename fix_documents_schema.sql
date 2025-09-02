-- Fix documents table schema to match expected fields
-- Create table if it doesn't exist, then add missing columns

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size bigint not null check (size >= 0),
  type text not null,
  url text not null,
  storage_key text unique, -- strongly recommended to store S3 key/path
  deal_id uuid references public.deals(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_documents_deal ON public.documents (deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_person ON public.documents (person_id);

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Add missing columns if they don't exist

-- Add file_name column if it doesn't exist (for better file name handling)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_name text;

-- Add storage_path column if it doesn't exist (for Supabase Storage path)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_path text;

-- Add mime_type column if it doesn't exist (for proper MIME type handling)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type text;

-- Add size_bytes column if it doesn't exist (for file size in bytes)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS size_bytes bigint;

-- Update existing records to populate new columns from existing data
UPDATE public.documents 
SET 
  file_name = name,
  storage_path = storage_key,
  mime_type = type,
  size_bytes = size
WHERE file_name IS NULL OR storage_path IS NULL OR mime_type IS NULL OR size_bytes IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
CREATE POLICY "documents_select_own"
ON public.documents FOR SELECT
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
CREATE POLICY "documents_insert_own"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own"
ON public.documents FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own"
ON public.documents FOR DELETE
USING (auth.uid() = created_by);

-- Ensure documents bucket exists in storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
