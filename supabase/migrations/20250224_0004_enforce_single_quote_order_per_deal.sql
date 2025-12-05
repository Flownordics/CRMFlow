-- Enforce single quote and single order per deal
-- Multiple invoices per deal are allowed (for partial invoicing)

-- Add unique constraint on quotes.deal_id (only one quote per deal)
-- First, handle any existing duplicates by keeping only the most recent one
DO $$
DECLARE
  duplicate_deal_id UUID;
BEGIN
  -- Find deals with multiple quotes
  FOR duplicate_deal_id IN 
    SELECT deal_id 
    FROM public.quotes 
    WHERE deal_id IS NOT NULL 
    GROUP BY deal_id 
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recent quote, delete others
    DELETE FROM public.quotes
    WHERE deal_id = duplicate_deal_id
      AND id NOT IN (
        SELECT id 
        FROM public.quotes 
        WHERE deal_id = duplicate_deal_id 
        ORDER BY created_at DESC 
        LIMIT 1
      );
  END LOOP;
END $$;

-- Add unique constraint on quotes.deal_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_deal_id_unique 
ON public.quotes(deal_id) 
WHERE deal_id IS NOT NULL;

-- Add unique constraint on orders.deal_id (only one order per deal)
-- First, handle any existing duplicates by keeping only the most recent one
DO $$
DECLARE
  duplicate_deal_id UUID;
BEGIN
  -- Find deals with multiple orders
  FOR duplicate_deal_id IN 
    SELECT deal_id 
    FROM public.orders 
    WHERE deal_id IS NOT NULL 
    GROUP BY deal_id 
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recent order, delete others
    DELETE FROM public.orders
    WHERE deal_id = duplicate_deal_id
      AND id NOT IN (
        SELECT id 
        FROM public.orders 
        WHERE deal_id = duplicate_deal_id 
        ORDER BY created_at DESC 
        LIMIT 1
      );
  END LOOP;
END $$;

-- Add unique constraint on orders.deal_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_deal_id_unique 
ON public.orders(deal_id) 
WHERE deal_id IS NOT NULL;

-- Note: Invoices can have multiple per deal (for partial invoicing)
-- No constraint needed on invoices.deal_id





