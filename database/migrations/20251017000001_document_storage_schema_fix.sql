-- =========================================
-- Fix documents table schema to match frontend expectations
-- =========================================

-- Rename columns to match frontend schema
ALTER TABLE public.documents 
  RENAME COLUMN name TO file_name;

ALTER TABLE public.documents 
  RENAME COLUMN size TO size_bytes;

ALTER TABLE public.documents 
  RENAME COLUMN type TO mime_type;

ALTER TABLE public.documents 
  RENAME COLUMN storage_key TO storage_path;

-- Drop url column (not needed with Supabase Storage)
ALTER TABLE public.documents 
  DROP COLUMN IF EXISTS url;

-- Enable Row Level Security on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
-- Allow authenticated users to view all documents
CREATE POLICY "Allow authenticated users to view documents"
ON public.documents
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

-- Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated users to upload documents"
ON public.documents
FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- Allow users to update their own documents
CREATE POLICY "Allow users to update own documents"
ON public.documents
FOR UPDATE
USING (created_by = auth.uid());

-- Allow users to delete their own documents
CREATE POLICY "Allow users to delete own documents"
ON public.documents
FOR DELETE
USING (created_by = auth.uid());

-- Create storage bucket for documents (if not exists)
-- Note: This is SQL for reference, actual storage bucket creation happens via Supabase Dashboard or CLI

-- Add comment to table
COMMENT ON TABLE public.documents IS 'Stores document metadata with files in Supabase Storage';
COMMENT ON COLUMN public.documents.file_name IS 'Original filename';
COMMENT ON COLUMN public.documents.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN public.documents.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN public.documents.size_bytes IS 'File size in bytes';

