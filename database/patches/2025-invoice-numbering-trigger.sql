-- Invoice numbering trigger
-- This trigger automatically generates simple invoice numbers

-- Create trigger function for invoice numbering
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year int := EXTRACT(year FROM NOW());
    next_number int;
    invoice_number text;
BEGIN
    -- Only generate number if it's not already set
    IF NEW.number IS NULL OR NEW.number = '' THEN
        -- Get the next number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 'INV-' || current_year || '-(.*)') AS int)), 0) + 1
        INTO next_number
        FROM invoices 
        WHERE number LIKE 'INV-' || current_year || '-%';
        
        -- Generate the invoice number
        invoice_number := 'INV-' || current_year || '-' || LPAD(next_number::text, 4, '0');
        NEW.number := invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice numbering
DROP TRIGGER IF EXISTS trg_invoice_number ON public.invoices;
CREATE TRIGGER trg_invoice_number
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- Update existing invoices that don't have numbers
-- First, create a temporary sequence for each year
DO $$
DECLARE
    invoice_record RECORD;
    current_year int;
    year_counter int;
BEGIN
    -- Loop through each year that has invoices without numbers
    FOR current_year IN 
        SELECT DISTINCT EXTRACT(year FROM created_at)::int as year
        FROM invoices 
        WHERE number IS NULL OR number = ''
        ORDER BY year
    LOOP
        year_counter := 1;
        
        -- Update invoices for this year
        FOR invoice_record IN 
            SELECT id 
            FROM invoices 
            WHERE (number IS NULL OR number = '') 
            AND EXTRACT(year FROM created_at) = current_year
            ORDER BY created_at
        LOOP
            UPDATE invoices 
            SET number = 'INV-' || current_year || '-' || LPAD(year_counter::text, 4, '0')
            WHERE id = invoice_record.id;
            
            year_counter := year_counter + 1;
        END LOOP;
    END LOOP;
END $$;
