-- Fix money columns to use bigint instead of int
-- This allows for larger monetary amounts

-- Deals table
ALTER TABLE public.deals 
ALTER COLUMN expected_value_minor TYPE bigint;

-- Add probability column to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS probability numeric(4,3) CHECK (probability >= 0 AND probability <= 1);

-- Add comment to explain the column
COMMENT ON COLUMN public.deals.probability IS 'Deal-specific probability override (0-1). If NULL, uses stage_probabilities.probability as default.';

-- Quotes table
ALTER TABLE public.quotes 
ALTER COLUMN subtotal_minor TYPE bigint,
ALTER COLUMN tax_minor TYPE bigint,
ALTER COLUMN total_minor TYPE bigint;

-- Orders table
ALTER TABLE public.orders 
ALTER COLUMN subtotal_minor TYPE bigint,
ALTER COLUMN tax_minor TYPE bigint,
ALTER COLUMN total_minor TYPE bigint;

-- Line items table
ALTER TABLE public.line_items 
ALTER COLUMN unit_minor TYPE bigint;
