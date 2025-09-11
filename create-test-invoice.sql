-- Create the missing invoice for testing
INSERT INTO public.invoices (
    id,
    number,
    status,
    currency,
    issue_date,
    due_date,
    notes,
    company_id,
    contact_id,
    deal_id,
    subtotal_minor,
    tax_minor,
    total_minor,
    created_at,
    updated_at
) VALUES (
    'a66da07b-a815-42ed-a0f0-d4daa74d4ffb',
    'INV-2025-001',
    'draft',
    'DKK',
    '2025-09-08',
    '2025-10-08',
    'Test invoice for PDF generation',
    (SELECT id FROM public.companies LIMIT 1), -- Use first company
    (SELECT id FROM public.people LIMIT 1),    -- Use first person
    NULL,
    10000, -- 100.00 DKK
    2500,  -- 25.00 DKK (25% tax)
    12500, -- 125.00 DKK total
    NOW(),
    NOW()
);

-- Verify the invoice was created
SELECT * FROM public.invoices WHERE id = 'a66da07b-a815-42ed-a0f0-d4daa74d4ffb';

-- Verify the line item exists
SELECT * FROM public.line_items WHERE parent_id = 'a66da07b-a815-42ed-a0f0-d4daa74d4ffb';
