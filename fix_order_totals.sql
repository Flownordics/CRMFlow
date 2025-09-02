-- =========================================
-- Fix Order Totals - Standalone Script
-- =========================================
-- This script fixes the issue where order totals show 0 kr. in the Orders list
-- by creating functions and triggers to automatically calculate totals from line items

-- Function to calculate order totals from line items
CREATE OR REPLACE FUNCTION calculate_order_totals(order_id UUID)
RETURNS TABLE(subtotal_minor INTEGER, tax_minor INTEGER, total_minor INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    subtotal INTEGER := 0;
    tax INTEGER := 0;
    total INTEGER := 0;
    line_record RECORD;
    line_subtotal INTEGER;
    line_tax INTEGER;
BEGIN
    -- Loop through all line items for this order
    FOR line_record IN 
        SELECT 
            qty,
            unit_minor,
            tax_rate_pct,
            discount_pct
        FROM public.line_items 
        WHERE parent_type = 'order' AND parent_id = order_id
    LOOP
        -- Calculate line subtotal (after discount)
        line_subtotal := ROUND(
            line_record.qty * line_record.unit_minor * 
            (1 - COALESCE(line_record.discount_pct, 0) / 100)
        );
        
        -- Calculate line tax
        line_tax := ROUND(
            line_subtotal * COALESCE(line_record.tax_rate_pct, 25) / 100
        );
        
        -- Add to totals
        subtotal := subtotal + line_subtotal;
        tax := tax + line_tax;
    END LOOP;
    
    total := subtotal + tax;
    
    RETURN QUERY SELECT subtotal, tax, total;
END;
$$;

-- Function to update order totals
CREATE OR REPLACE FUNCTION update_order_totals(order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    totals RECORD;
BEGIN
    -- Calculate totals
    SELECT * INTO totals FROM calculate_order_totals(order_id);
    
    -- Update the order
    UPDATE public.orders 
    SET 
        subtotal_minor = totals.subtotal_minor,
        tax_minor = totals.tax_minor,
        total_minor = totals.total_minor,
        updated_at = NOW()
    WHERE id = order_id;
END;
$$;

-- Trigger function to automatically update order totals when line items change
CREATE OR REPLACE FUNCTION trigger_update_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update totals for the order
        PERFORM update_order_totals(NEW.parent_id);
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Update totals for the order
        PERFORM update_order_totals(OLD.parent_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger on line_items table
DROP TRIGGER IF EXISTS trg_line_items_update_order_totals ON public.line_items;
CREATE TRIGGER trg_line_items_update_order_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.line_items
    FOR EACH ROW
    WHEN (NEW.parent_type = 'order' OR OLD.parent_type = 'order')
    EXECUTE FUNCTION trigger_update_order_totals();

-- Update all existing orders to have correct totals
DO $$
DECLARE
    order_record RECORD;
BEGIN
    FOR order_record IN SELECT id FROM public.orders LOOP
        PERFORM update_order_totals(order_record.id);
    END LOOP;
END;
$$;

-- Verify the fix by showing some order totals
SELECT 
    o.id,
    o.number,
    o.total_minor,
    o.currency,
    COUNT(li.id) as line_item_count
FROM public.orders o
LEFT JOIN public.line_items li ON li.parent_type = 'order' AND li.parent_id = o.id
GROUP BY o.id, o.number, o.total_minor, o.currency
ORDER BY o.created_at DESC
LIMIT 10;
