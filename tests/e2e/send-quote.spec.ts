import { test, expect } from '@playwright/test';

test.describe('Send Quote Dialog', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to quotes page
        await page.goto('/quotes');

        // Wait for quotes to load
        await page.waitForSelector('[data-testid="quotes-list"]', { timeout: 10000 });

        // Click on first quote to open it
        const firstQuote = page.locator('[data-testid="quote-card"]').first();
        await firstQuote.click();

        // Wait for quote editor to load
        await page.waitForSelector('[data-testid="quote-editor"]', { timeout: 10000 });
    });

    test('should display Gmail connection status', async ({ page }) => {
        // Click send button to open dialog
        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for dialog to open
        await page.waitForSelector('[data-testid="send-quote-dialog"]', { timeout: 10000 });

        // Check for Gmail status section
        const gmailStatus = page.locator('text=Gmail');
        await expect(gmailStatus).toBeVisible();

        // Check for either connected or not connected status
        const connectedStatus = page.locator('text=Gmail Connected');
        const notConnectedStatus = page.locator('text=Gmail not connected');

        // One of these should be visible
        await expect(connectedStatus.or(notConnectedStatus)).toBeVisible();
    });

    test('should show connect Gmail button when not connected', async ({ page }) => {
        // Click send button to open dialog
        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for dialog to open
        await page.waitForSelector('[data-testid="send-quote-dialog"]', { timeout: 10000 });

        // Look for connect Gmail button (only visible when not connected)
        const connectButton = page.locator('button:has-text("Connect Gmail")');

        // If connect button exists, it means we're not connected
        if (await connectButton.isVisible()) {
            await expect(connectButton).toBeVisible();

            // Click connect button should navigate to settings
            await connectButton.click();
            await expect(page).toHaveURL(/\/settings/);
        }
    });

    test('should show Gmail email when connected', async ({ page }) => {
        // Click send button to open dialog
        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for dialog to open
        await page.waitForSelector('[data-testid="send-quote-dialog"]', { timeout: 10000 });

        // Look for Gmail email badge (only visible when connected)
        const emailBadge = page.locator('[data-testid="gmail-email-badge"]');

        // If email badge exists, it means we're connected
        if (await emailBadge.isVisible()) {
            await expect(emailBadge).toBeVisible();

            // Should contain an email address
            const emailText = await emailBadge.textContent();
            expect(emailText).toMatch(/@/);
        }
    });

    test('should send quote and log email activity', async ({ page }) => {
        // Click send button to open dialog
        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for dialog to open
        await page.waitForSelector('[data-testid="send-quote-dialog"]', { timeout: 10000 });

        // Fill in email details
        await page.fill('[data-testid="email-to"]', 'test@example.com');
        await page.fill('[data-testid="email-subject"]', 'Test Quote');
        await page.fill('[data-testid="email-body"]', 'Please find attached your quote.');

        // Click send button
        const sendEmailButton = page.locator('button:has-text("Send Quote")');
        await sendEmailButton.click();

        // Should show success toast
        await expect(page.locator('text=Quote Sent')).toBeVisible();

        // Close dialog
        await page.locator('button:has-text("Cancel")').click();

        // Check that email log was added
        const emailLogs = page.locator('[data-testid="email-logs"]');
        await expect(emailLogs).toBeVisible();

        // Should show the sent email
        await expect(page.locator('text=test@example.com')).toBeVisible();
        await expect(page.locator('text=Test Quote')).toBeVisible();
    });

    test('should handle email not connected error gracefully', async ({ page }) => {
        // Click send button to open dialog
        const sendButton = page.locator('button:has-text("Send")');
        await sendButton.click();

        // Wait for dialog to open
        await page.waitForSelector('[data-testid="send-quote-dialog"]', { timeout: 10000 });

        // Look for Gmail not connected status
        const notConnectedStatus = page.locator('text=Gmail not connected');

        if (await notConnectedStatus.isVisible()) {
            // Try to send email (should show error)
            await page.fill('[data-testid="email-to"]', 'test@example.com');
            await page.fill('[data-testid="email-subject"]', 'Test Quote');

            const sendEmailButton = page.locator('button:has-text("Send Quote")');
            await sendEmailButton.click();

            // Should show error about Gmail not connected
            await expect(page.locator('text=Gmail is not connected')).toBeVisible();
        }
    });
});
