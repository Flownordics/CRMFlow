-- Migration: Add quote_id column to orders table
-- This allows linking orders back to their source quotes
-- Author: CRMFlow
-- Date: 2025-02-25

-- Add quote_id column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Add index for efficient quote_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_quote ON public.orders (quote_id);

-- Add comment
COMMENT ON COLUMN public.orders.quote_id IS 'Reference to the quote that this order was created from';

