// PDF Diagnostics Function
// Tests the entire PDF generation pipeline step by step

import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    const diagnostics = {
        timestamp: new Date().toISOString(),
        steps: [],
        errors: [],
        success: false
    };

    const addStep = (name, data) => {
        console.log(`✅ ${name}:`, data);
        diagnostics.steps.push({ name, data, success: true });
    };

    const addError = (name, error) => {
        console.error(`❌ ${name}:`, error);
        diagnostics.errors.push({ 
            step: name, 
            message: error.message, 
            stack: error.stack 
        });
        diagnostics.steps.push({ name, error: error.message, success: false });
    };

    let browser = null;

    try {
        // Step 1: Check environment variables
        addStep('Environment Check', {
            hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY || !!process.env.SUPABASE_ANON_KEY,
            nodeVersion: process.version,
            platform: process.platform
        });

        // Step 2: Initialize Supabase
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        addStep('Supabase Client', { initialized: true });

        // Step 3: Test Supabase connection
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('id')
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                throw error;
            }
            addStep('Supabase Connection', { connected: true, hasData: !!data });
        } catch (err) {
            addError('Supabase Connection', err);
        }

        // Step 4: Check Chromium
        try {
            const executablePath = await chromium.executablePath();
            addStep('Chromium Executable', { path: executablePath });
        } catch (err) {
            addError('Chromium Executable', err);
            throw err;
        }

        // Step 5: Launch Chromium
        try {
            const launchStart = Date.now();
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process',
                    '--no-zygote',
                ],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
            const launchDuration = Date.now() - launchStart;
            addStep('Chromium Launch', { duration: `${launchDuration}ms` });
        } catch (err) {
            addError('Chromium Launch', err);
            throw err;
        }

        // Step 6: Create page
        try {
            const page = await browser.newPage();
            addStep('Page Creation', { created: true });

            // Step 7: Set simple content
            await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test.</p></body></html>');
            addStep('Set Content', { set: true });

            // Step 8: Generate PDF
            const pdfStart = Date.now();
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
            const pdfDuration = Date.now() - pdfStart;
            addStep('PDF Generation', { 
                duration: `${pdfDuration}ms`,
                size: `${pdfBuffer.length} bytes`
            });

            // Step 9: Convert to base64
            const base64Start = Date.now();
            const base64Pdf = pdfBuffer.toString('base64');
            const base64Duration = Date.now() - base64Start;
            addStep('Base64 Conversion', {
                duration: `${base64Duration}ms`,
                length: base64Pdf.length,
                first50: base64Pdf.substring(0, 50),
                last50: base64Pdf.substring(base64Pdf.length - 50)
            });

            // Step 10: Validate base64
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            const isValidBase64 = base64Regex.test(base64Pdf);
            addStep('Base64 Validation', { 
                valid: isValidBase64,
                hasInvalidChars: !isValidBase64
            });

            // Step 11: Test JSON encoding
            const jsonTest = JSON.stringify({
                success: true,
                pdf: base64Pdf,
                filename: 'test.pdf',
                size: pdfBuffer.length
            });
            addStep('JSON Encoding', { 
                size: jsonTest.length,
                canParse: true
            });

            // Step 12: Test JSON parsing
            const parsed = JSON.parse(jsonTest);
            addStep('JSON Parsing', {
                success: parsed.success,
                hasPdf: !!parsed.pdf,
                pdfLength: parsed.pdf?.length
            });

            await browser.close();
            browser = null;
            addStep('Browser Closed', { closed: true });

            diagnostics.success = true;
            diagnostics.message = '✅ All diagnostics passed! PDF generation should work.';

        } catch (err) {
            addError('PDF Pipeline', err);
            throw err;
        }

    } catch (error) {
        diagnostics.success = false;
        diagnostics.message = `❌ Diagnostics failed at step: ${diagnostics.steps[diagnostics.steps.length - 1]?.name || 'unknown'}`;
        diagnostics.finalError = {
            message: error.message,
            stack: error.stack
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (err) {
                addError('Browser Cleanup', err);
            }
        }
    }

    return {
        statusCode: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(diagnostics, null, 2)
    };
};

