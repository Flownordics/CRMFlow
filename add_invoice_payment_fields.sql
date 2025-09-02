-- Add payment fields to invoices table for Model A minimal payments
-- This implements the minimal payment system without a separate payments table

-- Add paid_minor column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS paid_minor bigint NOT NULL DEFAULT 0 CHECK (paid_minor >= 0);

-- Add balance_minor as a generated column
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS balance_minor bigint GENERATED ALWAYS AS (GREATEST(total_minor - paid_minor, 0)) STORED;

-- Add index for balance_minor for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoices_balance_minor ON public.invoices (balance_minor);

-- Add index for paid_minor for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoices_paid_minor ON public.invoices (paid_minor);

-- Update existing invoices to have paid_minor = 0 if they don't have it
UPDATE public.invoices 
SET paid_minor = 0 
WHERE paid_minor IS NULL;

-- Add comment to document the payment system
COMMENT ON COLUMN public.invoices.paid_minor IS 'Total amount paid in minor units (e.g., øre for DKK)';
COMMENT ON COLUMN public.invoices.balance_minor IS 'Remaining balance in minor units, calculated as GREATEST(total_minor - paid_minor, 0)';
