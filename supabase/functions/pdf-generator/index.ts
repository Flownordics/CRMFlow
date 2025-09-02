import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PDFRequest {
    type: 'quote' | 'order' | 'invoice'
    id: string
}

interface Document {
    id: string
    number: string | null
    status: string
    currency: string
    issue_date: string | null
    valid_until?: string | null
    due_date?: string | null
    notes: string | null
    company_id: string | null
    contact_id: string | null
    deal_id: string | null
    subtotal_minor: number
    tax_minor: number
    total_minor: number
    created_at: string
}

interface Company {
    id: string
    name: string
    email: string | null
    invoice_email: string | null
    domain: string | null
    vat: string | null
    phone: string | null
    address: string | null
    city: string | null
    country: string | null
    website: string | null
}

interface Person {
    id: string
    name: string
    email: string | null
    phone: string | null
    title: string | null
}

interface LineItem {
    id: string
    sku: string | null
    description: string
    qty: number
    unit_minor: number
    tax_rate_pct: number
    discount_pct: number
    position: number
}

interface WorkspaceSettings {
    id: string
    org_name: string
    logo_url: string | null
    pdf_footer: string | null
    color_primary: string | null
    quote_prefix: string
    order_prefix: string
    invoice_prefix: string
    default_currency: string
    default_tax_pct: number
}

/**
 * Format currency amount from minor units (cents) to display format
 */
function formatCurrency(amountMinor: number, currency: string): string {
    const amount = amountMinor / 100;
    return new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Format date to Danish locale
 */
function formatDate(dateString: string | null): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('da-DK');
}

/**
 * Generate HTML template for PDF
 */
function generateHTML(
    document: Document,
    company: Company | null,
    contact: Person | null,
    lineItems: LineItem[],
    settings: WorkspaceSettings,
    type: 'quote' | 'order' | 'invoice'
): string {
    const documentType = type.charAt(0).toUpperCase() + type.slice(1);
    const documentNumber = document.number || `${settings[`${type}_prefix`]}-${document.id.slice(0, 8)}`;

    const html = `
<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentType} ${documentNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 40px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .document-info {
            text-align: right;
        }
        
        .document-title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .document-number {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        .document-date {
            font-size: 14px;
            color: #6b7280;
        }
        
        .client-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        
        .bill-to {
            flex: 1;
        }
        
        .bill-to-label {
            font-weight: bold;
            margin-bottom: 8px;
            color: #374151;
        }
        
        .client-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .client-details {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        .contact-info {
            flex: 1;
            text-align: right;
        }
        
        .contact-label {
            font-weight: bold;
            margin-bottom: 8px;
            color: #374151;
        }
        
        .contact-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .contact-details {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        .line-items {
            margin-bottom: 40px;
        }
        
        .line-items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .line-items-table th {
            background: #f9fafb;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .line-items-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .line-items-table tr:nth-child(even) {
            background: #fafafa;
        }
        
        .description {
            width: 40%;
        }
        
        .qty, .unit-price, .discount, .tax, .total {
            width: 12%;
            text-align: right;
        }
        
        .totals {
            margin-left: auto;
            width: 300px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .total-row.grand-total {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #1f2937;
            margin-top: 8px;
            padding-top: 16px;
        }
        
        .notes {
            margin-top: 40px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }
        
        .notes h3 {
            margin-bottom: 8px;
            color: #374151;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
        
        @media print {
            body {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <div class="company-name">${settings.org_name}</div>
            ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo" style="max-height: 60px; margin-top: 10px;">` : ''}
        </div>
        <div class="document-info">
            <div class="document-title">${documentType}</div>
            <div class="document-number">${documentNumber}</div>
            <div class="document-date">${formatDate(document.issue_date)}</div>
            ${type === 'quote' && document.valid_until ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Gyldig til: ${formatDate(document.valid_until)}</div>` : ''}
            ${type === 'invoice' && document.due_date ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Forfalder: ${formatDate(document.due_date)}</div>` : ''}
        </div>
    </div>
    
    <div class="client-info">
        <div class="bill-to">
            <div class="bill-to-label">Faktureres til:</div>
            ${company ? `
                <div class="client-name">${company.name}</div>
                <div class="client-details">
                    ${company.address ? `${company.address}<br>` : ''}
                    ${company.city && company.country ? `${company.city}, ${company.country}<br>` : ''}
                    ${company.vat ? `CVR: ${company.vat}<br>` : ''}
                    ${company.email ? `Email: ${company.email}<br>` : ''}
                    ${company.phone ? `Tlf: ${company.phone}` : ''}
                </div>
            ` : '<div style="color: #6b7280;">Ingen virksomhed valgt</div>'}
        </div>
        ${contact ? `
            <div class="contact-info">
                <div class="contact-label">Kontaktperson:</div>
                <div class="contact-name">${contact.name}</div>
                <div class="contact-details">
                    ${contact.title ? `${contact.title}<br>` : ''}
                    ${contact.email ? `Email: ${contact.email}<br>` : ''}
                    ${contact.phone ? `Tlf: ${contact.phone}` : ''}
                </div>
            </div>
        ` : ''}
    </div>
    
    <div class="line-items">
        <table class="line-items-table">
            <thead>
                <tr>
                    <th class="description">Beskrivelse</th>
                    <th class="qty">Antal</th>
                    <th class="unit-price">Pris</th>
                    <th class="discount">Rabat</th>
                    <th class="tax">Moms</th>
                    <th class="total">Total</th>
                </tr>
            </thead>
            <tbody>
                ${lineItems.map(item => {
        const lineTotal = (item.qty * item.unit_minor * (1 - item.discount_pct / 100));
        const lineTax = lineTotal * (item.tax_rate_pct / 100);
        return `
                        <tr>
                            <td class="description">${item.description}</td>
                            <td class="qty">${item.qty.toLocaleString('da-DK')}</td>
                            <td class="unit-price">${formatCurrency(item.unit_minor, document.currency)}</td>
                            <td class="discount">${item.discount_pct > 0 ? `${item.discount_pct}%` : '-'}</td>
                            <td class="tax">${formatCurrency(lineTax, document.currency)}</td>
                            <td class="total">${formatCurrency(lineTotal + lineTax, document.currency)}</td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(document.subtotal_minor, document.currency)}</span>
            </div>
            <div class="total-row">
                <span>Moms:</span>
                <span>${formatCurrency(document.tax_minor, document.currency)}</span>
            </div>
            <div class="total-row grand-total">
                <span>Total:</span>
                <span>${formatCurrency(document.total_minor, document.currency)}</span>
            </div>
        </div>
    </div>
    
    ${document.notes ? `
        <div class="notes">
            <h3>Noter</h3>
            <p>${document.notes.replace(/\n/g, '<br>')}</p>
        </div>
    ` : ''}
    
    ${settings.pdf_footer ? `
        <div class="footer">
            ${settings.pdf_footer}
        </div>
    ` : ''}
</body>
</html>`;

    return html;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request body
        const { type, id }: PDFRequest = await req.json()

        if (!type || !id) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: type and id' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        if (!['quote', 'order', 'invoice'].includes(type)) {
            return new Response(
                JSON.stringify({ error: 'Invalid type. Must be quote, order, or invoice' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Create Supabase client with service role key
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch document data
        const { data: document, error: documentError } = await supabase
            .from(type + 's')
            .select('*')
            .eq('id', id)
            .single()

        if (documentError || !document) {
            return new Response(
                JSON.stringify({ error: `${type} not found` }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Fetch company data
        let company: Company | null = null
        if (document.company_id) {
            const { data: companyData } = await supabase
                .from('companies')
                .select('*')
                .eq('id', document.company_id)
                .single()
            company = companyData
        }

        // Fetch contact data
        let contact: Person | null = null
        if (document.contact_id) {
            const { data: contactData } = await supabase
                .from('people')
                .select('*')
                .eq('id', document.contact_id)
                .single()
            contact = contactData
        }

        // Fetch line items
        const { data: lineItems = [] } = await supabase
            .from('line_items')
            .select('*')
            .eq('parent_type', type)
            .eq('parent_id', id)
            .order('position')

        // Fetch workspace settings
        const { data: settings = {} as WorkspaceSettings } = await supabase
            .from('workspace_settings')
            .select('*')
            .limit(1)
            .single()

        // Generate HTML
        const html = generateHTML(document, company, contact, lineItems, settings, type)

        // Convert HTML to PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })

        const pdf = await page.pdf({
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            },
            printBackground: true
        })

        await browser.close()

        // Return PDF as response
        const filename = `${type}-${document.number || id}.pdf`

        return new Response(pdf, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdf.length.toString()
            }
        })

    } catch (error) {
        console.error('PDF generation error:', error)

        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
