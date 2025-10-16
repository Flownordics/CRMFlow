-- Migration: Add order_id column to invoices table
-- This allows linking invoices back to their source orders
-- Author: CRMFlow
-- Date: 2025-10-16

-- Add order_id column
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add index for efficient order_id lookups
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices (order_id);

-- Add comment
COMMENT ON COLUMN public.invoices.order_id IS 'Reference to the order that this invoice was created from';

