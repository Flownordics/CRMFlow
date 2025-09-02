import { test, expect } from '@playwright/test';

test.describe('Settings - Branding & Numbering', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to settings page
        await page.goto('/settings');
        // Wait for the branding tab to be visible
        await page.waitForSelector('[data-testid="branding-tab"]');
    });

    test('should display email template fields', async ({ page }) => {
        // Check that email template fields are visible
        await expect(page.getByLabel('Quote Email Template (HTML)')).toBeVisible();
        await expect(page.getByLabel('Quote Email Template (Text)')).toBeVisible();
    });

    test('should save and load email template values', async ({ page }) => {
        const htmlTemplate = '<h1>Thank you for your quote request</h1>';
        const textTemplate = 'Thank you for your quote request';

        // Fill in email templates
        await page.getByLabel('Quote Email Template (HTML)').fill(htmlTemplate);
        await page.getByLabel('Quote Email Template (Text)').fill(textTemplate);

        // Save settings
        await page.getByRole('button', { name: 'Save changes' }).click();

        // Wait for success message
        await expect(page.getByText('Settings updated successfully')).toBeVisible();

        // Reload page to verify persistence
        await page.reload();
        await page.waitForSelector('[data-testid="branding-tab"]');

        // Check that values are still there
        await expect(page.getByLabel('Quote Email Template (HTML)')).toHaveValue(htmlTemplate);
        await expect(page.getByLabel('Quote Email Template (Text)')).toHaveValue(textTemplate);
    });

    test('should display organization name field', async ({ page }) => {
        await expect(page.getByLabel('Organization Name')).toBeVisible();
    });

    test('should display default currency selector', async ({ page }) => {
        await expect(page.getByLabel('Default Currency')).toBeVisible();
        await expect(page.getByText('DKK (Danish Krone)')).toBeVisible();
        await expect(page.getByText('EUR (Euro)')).toBeVisible();
        await expect(page.getByText('USD (US Dollar)')).toBeVisible();
    });

    test('should display default tax percentage field', async ({ page }) => {
        await expect(page.getByLabel('Default Tax %')).toBeVisible();
    });

    test('should display number prefix field', async ({ page }) => {
        await expect(page.getByLabel('Number Prefix')).toBeVisible();
    });

    test('should display number pad field', async ({ page }) => {
        await expect(page.getByLabel('Number Pad')).toBeVisible();
    });

    test('should display year infix toggle', async ({ page }) => {
        await expect(page.getByLabel('Include year in document numbers')).toBeVisible();
    });

    test('should display PDF footer field', async ({ page }) => {
        await expect(page.getByLabel('PDF Footer')).toBeVisible();
    });
});
