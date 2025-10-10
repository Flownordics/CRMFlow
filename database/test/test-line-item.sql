-- Test line item for invoice a66da07b-a815-42ed-a0f0-d4daa74d4ffb
INSERT INTO public.line_items (
    parent_type,
    parent_id,
    description,
    qty,
    unit_minor,
    tax_rate_pct,
    position
) VALUES (
    'invoice',
    'a66da07b-a815-42ed-a0f0-d4daa74d4ffb',
    'Test produkt',
    1,
    10000, -- 100.00 DKK
    25,
    0
);

-- Check if the line item was created
SELECT * FROM public.line_items WHERE parent_id = 'a66da07b-a815-42ed-a0f0-d4daa74d4ffb';
