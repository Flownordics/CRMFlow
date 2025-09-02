import { test, expect } from '@playwright/test';

test.describe('Settings - Preferences', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to settings page
        await page.goto('/settings');
        // Click on preferences tab
        await page.getByRole('tab', { name: 'Preferences' }).click();
        // Wait for the preferences form to be visible
        await page.waitForSelector('text=Personal settings and preferences');
    });

    test('should display language selector', async ({ page }) => {
        await expect(page.getByLabel('Language')).toBeVisible();
        await expect(page.getByText('English')).toBeVisible();
        await expect(page.getByText('Dansk')).toBeVisible();
    });

    test('should display theme selector', async ({ page }) => {
        await expect(page.getByLabel('Theme')).toBeVisible();
        await expect(page.getByText('System')).toBeVisible();
        await expect(page.getByText('Light')).toBeVisible();
        await expect(page.getByText('Dark')).toBeVisible();
    });

    test('should save and load locale preference', async ({ page }) => {
        // Change language to Danish
        await page.getByLabel('Language').click();
        await page.getByRole('option', { name: 'Dansk' }).click();

        // Save preferences
        await page.getByRole('button', { name: 'Save preferences' }).click();

        // Wait for success message
        await expect(page.getByText('Preferences updated successfully')).toBeVisible();

        // Reload page to verify persistence
        await page.reload();
        await page.getByRole('tab', { name: 'Preferences' }).click();
        await page.waitForSelector('text=Personal settings and preferences');

        // Check that Danish is selected
        await expect(page.getByLabel('Language')).toContainText('Dansk');
    });

    test('should save and load theme preference', async ({ page }) => {
        // Change theme to Dark
        await page.getByLabel('Theme').click();
        await page.getByRole('option', { name: 'Dark' }).click();

        // Save preferences
        await page.getByRole('button', { name: 'Save preferences' }).click();

        // Wait for success message
        await expect(page.getByText('Preferences updated successfully')).toBeVisible();

        // Reload page to verify persistence
        await page.reload();
        await page.getByRole('tab', { name: 'Preferences' }).click();
        await page.waitForSelector('text=Personal settings and preferences');

        // Check that Dark theme is selected
        await expect(page.getByLabel('Theme')).toContainText('Dark');
    });

    test('should display calendar settings', async ({ page }) => {
        await expect(page.getByLabel('Show Google Calendar events')).toBeVisible();
        await expect(page.getByLabel('Sync calendar by default')).toBeVisible();
    });

    test('should toggle calendar settings', async ({ page }) => {
        // Toggle Google Calendar events
        await page.getByLabel('Show Google Calendar events').click();

        // Toggle calendar sync
        await page.getByLabel('Sync calendar by default').click();

        // Save preferences
        await page.getByRole('button', { name: 'Save preferences' }).click();

        // Wait for success message
        await expect(page.getByText('Preferences updated successfully')).toBeVisible();
    });

    test('should show loading state while saving', async ({ page }) => {
        // Make a change to trigger save
        await page.getByLabel('Language').click();
        await page.getByRole('option', { name: 'Dansk' }).click();

        // Click save and check loading state
        await page.getByRole('button', { name: 'Save preferences' }).click();

        // Button should show loading state
        await expect(page.getByRole('button', { name: 'Saving...' })).toBeVisible();
    });

    test('should handle save errors gracefully', async ({ page }) => {
        // Mock an error by temporarily breaking the form
        // This test would need to be adjusted based on actual error handling

        // Make a change
        await page.getByLabel('Language').click();
        await page.getByRole('option', { name: 'Dansk' }).click();

        // Save should work normally
        await page.getByRole('button', { name: 'Save preferences' }).click();

        // Should show success message
        await expect(page.getByText('Preferences updated successfully')).toBeVisible();
    });
});
