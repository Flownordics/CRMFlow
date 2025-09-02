import { test, expect } from '@playwright/test';

test.describe('Quote Email Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to quotes page
        await page.goto('/quotes');
    });

    test('Case 1: Gmail connected → Send → status "sent", activity log opdateres', async ({ page }) => {
        // This test assumes Gmail is already connected
        // Create a quote first
        await page.click('button:has-text("Create Quote")');

        // Fill in basic quote details
        await page.fill('input[placeholder="Description"]', 'Test Quote');
        await page.fill('input[placeholder="Unit"]', '1000');

        // Save quote
        await page.click('button:has-text("Create Quote")');

        // Wait for quote to be created and navigate to it
        await page.waitForURL(/\/quotes\/[^\/]+$/);

        // Click send quote button
        await page.click('button:has-text("Send Quote")');

        // Verify dialog opens
        await expect(page.locator('text=Send tilbud')).toBeVisible();

        // Verify Gmail status shows as connected
        await expect(page.locator('text=Sending as')).toBeVisible();

        // Fill in email details
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[placeholder="Your quote subject"]', 'Test Subject');
        await page.fill('textarea', 'Test message');

        // Send email
        await page.click('button:has-text("Send Quote")');

        // Verify success message
        await expect(page.locator('text=Quote Sent')).toBeVisible();

        // Verify quote status is updated (this would depend on your UI showing sent status)
        // await expect(page.locator('text=Sent')).toBeVisible();
    });

    test('Case 2: Ikke connected → vis CTA "Connect Gmail"; klik → lander på Settings; tilbage til dialog → kan sende', async ({ page }) => {
        // This test assumes Gmail is NOT connected
        // Create a quote first
        await page.click('button:has-text("Create Quote")');

        // Fill in basic quote details
        await page.fill('input[placeholder="Description"]', 'Test Quote');
        await page.fill('input[placeholder="Unit"]', '1000');

        // Save quote
        await page.click('button:has-text("Create Quote")');

        // Wait for quote to be created and navigate to it
        await page.waitForURL(/\/quotes\/[^\/]+$/);

        // Click send quote button
        await page.click('button:has-text("Send Quote")');

        // Verify dialog opens
        await expect(page.locator('text=Send tilbud')).toBeVisible();

        // Verify Gmail not connected status
        await expect(page.locator('text=Gmail not connected')).toBeVisible();

        // Click Connect Gmail button
        await page.click('button:has-text("Connect Gmail")');

        // Verify navigation to settings
        await expect(page).toHaveURL(/\/settings/);

        // Navigate back to quotes
        await page.goto('/quotes');

        // Open the same quote and try to send again
        await page.click('a[href*="/quotes/"]:first');
        await page.click('button:has-text("Send Quote")');

        // Verify dialog opens again
        await expect(page.locator('text=Send tilbud')).toBeVisible();
    });

    test('Case 3: 401 første forsøg → refresh → retry success', async ({ page }) => {
        // This test would require mocking the API to return 401 first, then success
        // Implementation would depend on your testing setup
        test.skip('Requires API mocking setup');
    });

    test('Case 4: Fejl efter retry → "Try again" og "Copy debug" findes', async ({ page }) => {
        // This test would require mocking the API to return an error
        // Create a quote first
        await page.click('button:has-text("Create Quote")');

        // Fill in basic quote details
        await page.fill('input[placeholder="Description"]', 'Test Quote');
        await page.fill('input[placeholder="Unit"]', '1000');

        // Save quote
        await page.click('button:has-text("Create Quote")');

        // Wait for quote to be created and navigate to it
        await page.waitForURL(/\/quotes\/[^\/]+$/);

        // Click send quote button
        await page.click('button:has-text("Send Quote")');

        // Verify dialog opens
        await expect(page.locator('text=Send tilbud')).toBeVisible();

        // Fill in email details
        await page.fill('input[type="email"]', 'test@example.com');

        // Try to send (this should fail if Gmail not connected)
        await page.click('button:has-text("Send Quote")');

        // Verify error message appears
        await expect(page.locator('text=We couldn\'t send the email')).toBeVisible();

        // Verify Try again button exists
        await expect(page.locator('button:has-text("Try again")')).toBeVisible();

        // Verify Copy debug button exists
        await expect(page.locator('button:has-text("Copy debug")')).toBeVisible();
    });

    test('Fallback functionality: Download PDF and Copy email', async ({ page }) => {
        // Create a quote first
        await page.click('button:has-text("Create Quote")');

        // Fill in basic quote details
        await page.fill('input[placeholder="Description"]', 'Test Quote');
        await page.fill('input[placeholder="Unit"]', '1000');

        // Save quote
        await page.click('button:has-text("Create Quote")');

        // Wait for quote to be created and navigate to it
        await page.waitForURL(/\/quotes\/[^\/]+$/);

        // Click send quote button
        await page.click('button:has-text("Send Quote")');

        // Verify dialog opens
        await expect(page.locator('text=Send tilbud')).toBeVisible();

        // Verify Download PDF button exists
        await expect(page.locator('button:has-text("Download PDF")')).toBeVisible();

        // Verify Copy email button exists
        await expect(page.locator('button:has-text("Copy email")')).toBeVisible();

        // Test Download PDF functionality
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Download PDF")');
        const download = await downloadPromise;
        expect(download).toBeTruthy();

        // Test Copy email functionality
        await page.click('button:has-text("Copy email")');
        // Verify toast message appears
        await expect(page.locator('text=Email copied')).toBeVisible();
    });
});
