-- Cleanup script to remove duplicate company logos
-- This script identifies duplicate logos and keeps only the one referenced in companies.logo_url
-- or the most recent one if none is referenced

-- Step 1: Identify duplicates and which ones to keep
WITH logo_analysis AS (
  SELECT 
    o.name as logo_path,
    o.created_at,
    -- Extract domain from old format: logos/domain-timestamp.extension
    SPLIT_PART(SPLIT_PART(o.name, '-', 1), '/', 2) as domain_prefix,
    -- Check if this logo is referenced in companies table
    EXISTS (
      SELECT 1 
      FROM public.companies c 
      WHERE c.logo_url LIKE '%' || o.name || '%'
    ) as is_referenced
  FROM storage.objects o
  WHERE o.bucket_id = 'company-logos'
    AND o.name LIKE 'logos/%-%.%'  -- Old format: domain-timestamp.extension
),
duplicates AS (
  SELECT 
    domain_prefix,
    logo_path,
    created_at,
    is_referenced,
    ROW_NUMBER() OVER (
      PARTITION BY domain_prefix 
      ORDER BY is_referenced DESC, created_at DESC
    ) as keep_rank
  FROM logo_analysis
)
-- Select logos to delete (not the one to keep)
SELECT logo_path
FROM duplicates
WHERE keep_rank > 1
ORDER BY domain_prefix, created_at;

-- Note: The above query shows what will be deleted. 
-- To actually delete, uncomment and run the DELETE statement below:

/*
-- DELETE duplicate logos (keeping only the referenced or newest one)
WITH logo_analysis AS (
  SELECT 
    o.name as logo_path,
    o.created_at,
    SPLIT_PART(SPLIT_PART(o.name, '-', 1), '/', 2) as domain_prefix,
    EXISTS (
      SELECT 1 
      FROM public.companies c 
      WHERE c.logo_url LIKE '%' || o.name || '%'
    ) as is_referenced
  FROM storage.objects o
  WHERE o.bucket_id = 'company-logos'
    AND o.name LIKE 'logos/%-%.%'
),
duplicates AS (
  SELECT 
    logo_path,
    ROW_NUMBER() OVER (
      PARTITION BY domain_prefix 
      ORDER BY is_referenced DESC, created_at DESC
    ) as keep_rank
  FROM logo_analysis
)
DELETE FROM storage.objects
WHERE bucket_id = 'company-logos'
  AND name IN (
    SELECT logo_path 
    FROM duplicates 
    WHERE keep_rank > 1
  );
*/


