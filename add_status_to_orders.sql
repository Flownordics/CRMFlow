-- Add status field to orders table for order lifecycle management
-- This enables Order → Invoice conversion based on status changes

-- Add status column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'confirmed', 'processing', 'fulfilled', 'shipped', 'cancelled', 'backorder', 'invoiced'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_status
ON public.orders (status);
