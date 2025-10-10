// Simple Chromium Diagnostic Function
// This tests if Chromium can be initialized in Netlify environment

export const handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {},
        chromium: {},
        puppeteer: {},
        errors: []
    };

    try {
        // Step 1: Check environment
        console.log('Step 1: Checking environment...');
        diagnostics.environment = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown',
            tmpDir: process.env.TMPDIR || '/tmp',
            hasWriteAccess: false
        };

        // Test write access to /tmp
        try {
            const fs = await import('fs');
            const testFile = '/tmp/test-write.txt';
            fs.promises.writeFile(testFile, 'test');
            await fs.promises.unlink(testFile);
            diagnostics.environment.hasWriteAccess = true;
        } catch (err) {
            diagnostics.errors.push({
                step: 'environment',
                error: 'No write access to /tmp',
                message: err.message
            });
        }

        // Step 2: Try to import @sparticuz/chromium
        console.log('Step 2: Importing @sparticuz/chromium...');
        let chromium;
        try {
            chromium = await import('@sparticuz/chromium');
            diagnostics.chromium.imported = true;
            diagnostics.chromium.version = chromium.default?.version || 'unknown';
        } catch (err) {
            diagnostics.chromium.imported = false;
            diagnostics.errors.push({
                step: 'chromium-import',
                error: 'Failed to import @sparticuz/chromium',
                message: err.message,
                stack: err.stack
            });
            throw err;
        }

        // Step 3: Try to get executable path
        console.log('Step 3: Getting Chromium executable path...');
        try {
            const executablePath = await chromium.default.executablePath();
            diagnostics.chromium.executablePath = executablePath;
            diagnostics.chromium.executablePathFound = true;
            
            // Check if file exists
            const fs = await import('fs');
            try {
                await fs.promises.access(executablePath);
                diagnostics.chromium.executableExists = true;
            } catch {
                diagnostics.chromium.executableExists = false;
                diagnostics.errors.push({
                    step: 'chromium-binary',
                    error: 'Executable path returned but file does not exist',
                    path: executablePath
                });
            }
        } catch (err) {
            diagnostics.chromium.executablePathFound = false;
            diagnostics.errors.push({
                step: 'chromium-path',
                error: 'Failed to get Chromium executable path',
                message: err.message,
                stack: err.stack
            });
            throw err;
        }

        // Step 4: Try to import puppeteer-core
        console.log('Step 4: Importing puppeteer-core...');
        let puppeteer;
        try {
            puppeteer = await import('puppeteer-core');
            diagnostics.puppeteer.imported = true;
            diagnostics.puppeteer.version = puppeteer.default?.version || 'unknown';
        } catch (err) {
            diagnostics.puppeteer.imported = false;
            diagnostics.errors.push({
                step: 'puppeteer-import',
                error: 'Failed to import puppeteer-core',
                message: err.message,
                stack: err.stack
            });
            throw err;
        }

        // Step 5: Try to launch browser (THE CRITICAL TEST)
        console.log('Step 5: Attempting to launch Chromium...');
        let browser;
        const launchStartTime = Date.now();
        try {
            browser = await puppeteer.default.launch({
                args: [
                    ...chromium.default.args,
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process',
                    '--no-zygote',
                ],
                defaultViewport: chromium.default.defaultViewport,
                executablePath: diagnostics.chromium.executablePath,
                headless: chromium.default.headless,
                ignoreHTTPSErrors: true,
            });
            
            const launchDuration = Date.now() - launchStartTime;
            diagnostics.puppeteer.launched = true;
            diagnostics.puppeteer.launchDuration = `${launchDuration}ms`;
            
            // Try to create a page
            console.log('Step 6: Creating page...');
            const page = await browser.newPage();
            diagnostics.puppeteer.pageCreated = true;
            
            // Try to set content
            console.log('Step 7: Setting page content...');
            await page.setContent('<html><body><h1>Test</h1></body></html>');
            diagnostics.puppeteer.contentSet = true;
            
            // Try to generate PDF
            console.log('Step 8: Generating PDF...');
            const pdfStartTime = Date.now();
            const pdfBuffer = await page.pdf({ format: 'A4' });
            const pdfDuration = Date.now() - pdfStartTime;
            
            diagnostics.puppeteer.pdfGenerated = true;
            diagnostics.puppeteer.pdfDuration = `${pdfDuration}ms`;
            diagnostics.puppeteer.pdfSize = `${pdfBuffer.length} bytes`;
            
            await browser.close();
            diagnostics.puppeteer.closed = true;
            
        } catch (err) {
            diagnostics.puppeteer.launched = false;
            diagnostics.errors.push({
                step: 'puppeteer-launch',
                error: 'Failed to launch Chromium browser',
                message: err.message,
                stack: err.stack
            });
            
            if (browser) {
                try {
                    await browser.close();
                } catch (closeErr) {
                    diagnostics.errors.push({
                        step: 'browser-close',
                        error: 'Failed to close browser',
                        message: closeErr.message
                    });
                }
            }
            throw err;
        }

        // Success!
        diagnostics.success = true;
        diagnostics.message = '✅ All tests passed! Chromium works on this Netlify environment.';

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(diagnostics, null, 2)
        };

    } catch (error) {
        diagnostics.success = false;
        diagnostics.message = '❌ Chromium initialization failed';
        diagnostics.finalError = {
            message: error.message,
            stack: error.stack,
            name: error.name
        };

        return {
            statusCode: 200, // Return 200 so we can see the diagnostics
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(diagnostics, null, 2)
        };
    }
};

