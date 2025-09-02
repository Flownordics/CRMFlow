-- Add quote_id field to orders table for quote-to-order conversion
-- This enables linking orders back to their source quotes

-- Add quote_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Create unique index for idempotency (one order per quote)
CREATE UNIQUE INDEX IF NOT EXISTS orders_quote_id_key 
ON public.orders (quote_id) 
WHERE quote_id IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_quote_id 
ON public.orders (quote_id);
