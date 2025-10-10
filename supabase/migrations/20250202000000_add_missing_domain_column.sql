-- Add missing domain column to companies table if it doesn't exist
alter table public.companies 
  add column if not exists domain text;

-- Recreate the index now that the column exists
create index if not exists idx_companies_domain on public.companies (lower(domain));


