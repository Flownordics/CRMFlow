-- Order numbering trigger
-- This trigger automatically generates simple order numbers

-- Create trigger function for order numbering
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year int := EXTRACT(year FROM NOW());
    next_number int;
    order_number text;
BEGIN
    -- Only generate number if it's not already set
    IF NEW.number IS NULL OR NEW.number = '' THEN
        -- Get the next number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 'ORD-' || current_year || '-(.*)') AS int)), 0) + 1
        INTO next_number
        FROM orders 
        WHERE number LIKE 'ORD-' || current_year || '-%';
        
        -- Generate the order number
        order_number := 'ORD-' || current_year || '-' || LPAD(next_number::text, 4, '0');
        NEW.number := order_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order numbering
DROP TRIGGER IF EXISTS trg_order_number ON public.orders;
CREATE TRIGGER trg_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Update existing orders that don't have numbers
-- First, create a temporary sequence for each year
DO $$
DECLARE
    order_record RECORD;
    current_year int;
    year_counter int;
BEGIN
    -- Loop through each year that has orders without numbers
    FOR current_year IN 
        SELECT DISTINCT EXTRACT(year FROM created_at)::int as year
        FROM orders 
        WHERE number IS NULL OR number = ''
        ORDER BY year
    LOOP
        year_counter := 1;
        
        -- Update orders for this year
        FOR order_record IN 
            SELECT id 
            FROM orders 
            WHERE (number IS NULL OR number = '') 
            AND EXTRACT(year FROM created_at) = current_year
            ORDER BY created_at
        LOOP
            UPDATE orders 
            SET number = 'ORD-' || current_year || '-' || LPAD(year_counter::text, 4, '0')
            WHERE id = order_record.id;
            
            year_counter := year_counter + 1;
        END LOOP;
    END LOOP;
END $$;



