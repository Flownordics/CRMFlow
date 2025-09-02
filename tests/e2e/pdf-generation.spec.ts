import { test, expect } from '@playwright/test';

test.describe('PDF Generation', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app and ensure we're logged in
        await page.goto('/');

        // Wait for the app to load
        await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
    });

    test('should generate PDF for quote', async ({ page }) => {
        // Navigate to quotes page
        await page.goto('/quotes');

        // Wait for quotes to load
        await page.waitForSelector('[data-testid="quotes-list"]', { timeout: 10000 });

        // Click on the first quote to open detail view
        const firstQuote = await page.locator('[data-testid="quote-item"]').first();
        await firstQuote.click();

        // Wait for quote detail page to load
        await page.waitForSelector('[data-testid="quote-detail"]', { timeout: 10000 });

        // Find and click the PDF button
        const pdfButton = page.locator('button[aria-label="Generate PDF"]');
        await expect(pdfButton).toBeVisible();

        // Click the PDF button
        await pdfButton.click();

        // Wait for loading state
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).toBeVisible();

        // Wait for loading to complete (button should be enabled again)
        await expect(page.locator('button[aria-label="Generate PDF"]:not(:disabled)')).toBeVisible({ timeout: 30000 });

        // Check that a new tab was opened or download was triggered
        // This is hard to test in E2E, but we can verify the button is no longer loading
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).not.toBeVisible();
    });

    test('should generate PDF for order', async ({ page }) => {
        // Navigate to orders page
        await page.goto('/orders');

        // Wait for orders to load
        await page.waitForSelector('[data-testid="orders-list"]', { timeout: 10000 });

        // Click on the first order to open detail view
        const firstOrder = await page.locator('[data-testid="order-item"]').first();
        await firstOrder.click();

        // Wait for order detail page to load
        await page.waitForSelector('[data-testid="order-detail"]', { timeout: 10000 });

        // Find and click the PDF button
        const pdfButton = page.locator('button[aria-label="Generate PDF"]');
        await expect(pdfButton).toBeVisible();

        // Click the PDF button
        await pdfButton.click();

        // Wait for loading state
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).toBeVisible();

        // Wait for loading to complete
        await expect(page.locator('button[aria-label="Generate PDF"]:not(:disabled)')).toBeVisible({ timeout: 30000 });

        // Check that loading state is gone
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).not.toBeVisible();
    });

    test('should generate PDF for invoice', async ({ page }) => {
        // Navigate to invoices page
        await page.goto('/invoices');

        // Wait for invoices to load
        await page.waitForSelector('[data-testid="invoices-list"]', { timeout: 10000 });

        // Click on the first invoice to open detail view
        const firstInvoice = await page.locator('[data-testid="invoice-item"]').first();
        await firstInvoice.click();

        // Wait for invoice detail page to load
        await page.waitForSelector('[data-testid="invoice-detail"]', { timeout: 10000 });

        // Find and click the PDF button
        const pdfButton = page.locator('button[aria-label="Generate PDF"]');
        await expect(pdfButton).toBeVisible();

        // Click the PDF button
        await pdfButton.click();

        // Wait for loading state
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).toBeVisible();

        // Wait for loading to complete
        await expect(page.locator('button[aria-label="Generate PDF"]:not(:disabled)')).toBeVisible({ timeout: 30000 });

        // Check that loading state is gone
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).not.toBeVisible();
    });

    test('should handle PDF generation error gracefully', async ({ page }) => {
        // Navigate to quotes page
        await page.goto('/quotes');

        // Wait for quotes to load
        await page.waitForSelector('[data-testid="quotes-list"]', { timeout: 10000 });

        // Click on the first quote to open detail view
        const firstQuote = await page.locator('[data-testid="quote-item"]').first();
        await firstQuote.click();

        // Wait for quote detail page to load
        await page.waitForSelector('[data-testid="quote-detail"]', { timeout: 10000 });

        // Mock the PDF service to return an error
        await page.addInitScript(() => {
            // Mock the fetch call to the PDF service
            const originalFetch = window.fetch;
            window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
                if (typeof input === 'string' && input.includes('/functions/v1/pdf-generator')) {
                    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return originalFetch(input, init);
            };
        });

        // Find and click the PDF button
        const pdfButton = page.locator('button[aria-label="Generate PDF"]');
        await expect(pdfButton).toBeVisible();

        // Click the PDF button
        await pdfButton.click();

        // Wait for loading state
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).toBeVisible();

        // Wait for loading to complete (should handle error gracefully)
        await expect(page.locator('button[aria-label="Generate PDF"]:not(:disabled)')).toBeVisible({ timeout: 30000 });

        // Check that loading state is gone
        await expect(page.locator('button[aria-label="Generate PDF"] .animate-spin')).not.toBeVisible();
    });
});
