-- Migration: Add status column to orders table
-- This allows tracking order status (draft, accepted, invoiced, etc.)
-- Author: CRMFlow
-- Date: 2025-10-16

-- Create order_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('draft', 'accepted', 'cancelled', 'backorder', 'invoiced');
  END IF;
END$$;

-- Add status column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS status order_status NOT NULL DEFAULT 'draft';

-- Add index for efficient status lookups
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- Add comment
COMMENT ON COLUMN public.orders.status IS 'Current status of the order (draft, accepted, invoiced, etc.)';

