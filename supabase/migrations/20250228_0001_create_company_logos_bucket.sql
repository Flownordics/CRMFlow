-- Create storage bucket for company logos
-- This bucket stores downloaded logos from Clearbit to avoid calling them on every page load
-- and to prevent ad-blocker issues

-- Create the bucket (requires service_role key or admin access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true, -- Public bucket so logos can be accessed without auth
  1048576, -- 1MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- Create storage policy to allow public read access
CREATE POLICY "Public read access for company logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

-- Create storage policy to allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Create storage policy to allow authenticated users to update logos
CREATE POLICY "Authenticated users can update company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Create storage policy to allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

