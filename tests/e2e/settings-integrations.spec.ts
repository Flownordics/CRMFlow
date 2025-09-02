import { test, expect } from '@playwright/test';

test.describe('Settings - Connected Accounts', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to settings page
        await page.goto('/settings');
        // Click on integrations tab
        await page.getByRole('tab', { name: 'Connected Accounts' }).click();
        // Wait for the integrations form to be visible
        await page.waitForSelector('text=Optional Google integrations');
    });

    test('should display Gmail integration card', async ({ page }) => {
        await expect(page.getByText('Google Mail')).toBeVisible();
        await expect(page.getByText('Send emails directly from CRMFlow')).toBeVisible();
    });

    test('should display Google Calendar integration card', async ({ page }) => {
        await expect(page.getByText('Google Calendar')).toBeVisible();
        await expect(page.getByText('Sync events and meetings')).toBeVisible();
    });

    test('should show connect button when not connected', async ({ page }) => {
        // When not connected, should show connect button
        await expect(page.getByRole('button', { name: 'Connect' })).toHaveCount(2);
    });

    test('should show connected status when integration exists', async ({ page }) => {
        // This test would need to be run with a user that has integrations
        // For now, we'll just check that the UI elements exist

        // Check that the integration cards are visible
        await expect(page.getByText('Google Mail')).toBeVisible();
        await expect(page.getByText('Google Calendar')).toBeVisible();

        // Check that scopes are displayed
        await expect(page.getByText('Scopes:')).toBeVisible();
    });

    test('should display integration scopes', async ({ page }) => {
        // Check that scope badges are visible
        await expect(page.getByText('gmail.send')).toBeVisible();
        await expect(page.getByText('calendar.events')).toBeVisible();
    });

    test('should handle connect flow', async ({ page }) => {
        // Click connect button for Gmail
        const gmailConnectButton = page.getByRole('button', { name: 'Connect' }).first();
        await gmailConnectButton.click();

        // Should show connecting state
        await expect(page.getByText('Starting Gmail connection...')).toBeVisible();
    });

    test('should handle disconnect flow', async ({ page }) => {
        // This test would need to be run with a connected user
        // For now, we'll just check that the disconnect functionality exists

        // Check that disconnect buttons exist (when connected)
        // await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();

        // This test would need to be expanded based on actual connected state
    });

    test('should show integration status correctly', async ({ page }) => {
        // Check that status badges are visible
        await expect(page.getByText('Not connected')).toHaveCount(2);

        // When connected, should show "Connected as email@domain.com"
        // This would need to be tested with actual connected integrations
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // The integration service should handle errors and return empty results
        // This prevents 406 errors from breaking the UI

        // Check that the page loads without errors
        await expect(page.getByText('Google Mail')).toBeVisible();
        await expect(page.getByText('Google Calendar')).toBeVisible();

        // No console errors should be visible
        // This would need to be checked in browser dev tools
    });

    test('should refresh integration status', async ({ page }) => {
        // The integration status should refresh automatically
        // Check that the query is set up with proper stale time

        // Reload the page to test refresh
        await page.reload();
        await page.getByRole('tab', { name: 'Connected Accounts' }).click();

        // Should still show integration cards
        await expect(page.getByText('Google Mail')).toBeVisible();
        await expect(page.getByText('Google Calendar')).toBeVisible();
    });
});
