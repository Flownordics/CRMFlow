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
        const { type, data } = JSON.parse(event.body || '{}');

        if (!type || !data || !data.id) {
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
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        
        // Set content and wait for fonts/images to load
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded']
        });

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
        console.error('PDF generation error:', error);
        
        // Ensure browser is closed on error
        if (browser) {
            try {
                await browser.close();
            } catch (closeErr) {
                console.error('Error closing browser:', closeErr);
            }
        }

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }),
        };
    }
};

