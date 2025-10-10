// Netlify Function - Modern HTML-to-PDF Generator using Puppeteer
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { generateQuoteHTML, generateInvoiceHTML, generateOrderHTML } from './templates.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    let browser = null;

    try {
        console.log('PDF generation request started');
        const { type, data } = JSON.parse(event.body || '{}');
        console.log('Request type:', type, 'ID:', data?.id);

        if (!type || !data || !data.id) {
            console.error('Missing required parameters:', { type, dataId: data?.id });
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing type or data.id' }),
            };
        }

        // Validate type
        if (!['quote', 'order', 'invoice'].includes(type)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: `Unsupported type: ${type}` }),
            };
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing Supabase configuration' }),
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Determine table name
        const tableName = type === 'quote' ? 'quotes' : type === 'order' ? 'orders' : 'invoices';

        // Fetch document data
        const { data: docData, error: docErr } = await supabase
            .from(tableName)
            .select(`*, company:companies(*), person:people(*), deal:deals(*)`)
            .eq('id', data.id)
            .single();

        if (docErr || !docData) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
                    details: docErr?.message 
                }),
            };
        }

        // Fetch line items
        const { data: items = [] } = await supabase
            .from('line_items')
            .select('*')
            .eq('parent_type', type)
            .eq('parent_id', data.id)
            .order('position');

        // Generate HTML based on type
        let html;
        switch (type) {
            case 'quote':
                html = generateQuoteHTML(docData, items);
                break;
            case 'order':
                html = generateOrderHTML(docData, items);
                break;
            case 'invoice':
                html = generateInvoiceHTML(docData, items);
                break;
        }

        // Launch Puppeteer with Chromium
        console.log('Starting Chromium initialization...');
        const executablePath = await chromium.executablePath();
        console.log('Chromium executable path:', executablePath);
        
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        console.log('Chromium launched successfully');

        const page = await browser.newPage();
        console.log('New page created');
        
        // Set content and wait for fonts/images to load
        await page.setContent(html, {
            waitUntil: ['domcontentloaded'], // Changed from networkidle0 to avoid timeout
            timeout: 20000 // 20 second timeout for content loading
        });
        console.log('HTML content set successfully');

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        });
        console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

        await browser.close();
        browser = null;

        // Determine filename
        const docNumber = docData.number || docData.invoice_number || docData.order_number || docData.id.slice(-6);
        const filename = `${type}-${docNumber}.pdf`;

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
            body: pdfBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error('PDF generation error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        // Ensure browser is closed on error
        if (browser) {
            try {
                await browser.close();
            } catch (closeErr) {
                console.error('Error closing browser:', closeErr);
            }
        }

        // Determine if it's a Chromium-specific error
        const isChromiumError = error.message?.includes('chromium') || 
                                error.message?.includes('browser') ||
                                error.message?.includes('executable');

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'PDF generation failed',
                details: error.message,
                errorType: error.name,
                isChromiumError,
                hint: isChromiumError ? 'Check Netlify function logs for Chromium initialization issues' : undefined,
                stack: error.stack
            }),
        };
    }
};

