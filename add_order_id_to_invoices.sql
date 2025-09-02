-- Add order_id field to invoices table for order-to-invoice conversion
-- This enables linking invoices back to their source orders

-- Add order_id column to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- Create unique index for idempotency (one invoice per order)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_order_id_key
ON public.invoices (order_id)
WHERE order_id IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_order_id
ON public.invoices (order_id);
