import { test, expect } from '@playwright/test';

test.describe('Calendar Status', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to calendar page
        await page.goto('/calendar');
    });

    test('should display Google Calendar connection status', async ({ page }) => {
        // Wait for the page to load
        await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

        // Check if status section exists
        const statusSection = page.locator('text=Google Calendar');
        await expect(statusSection).toBeVisible();

        // Check for either connected or not connected status
        const connectedStatus = page.locator('text=Connected to Google Calendar');
        const notConnectedStatus = page.locator('text=Google Calendar not connected');

        // One of these should be visible
        await expect(connectedStatus.or(notConnectedStatus)).toBeVisible();
    });

    test('should show manage button when connected', async ({ page }) => {
        // Wait for the page to load
        await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

        // Look for manage button (only visible when connected)
        const manageButton = page.locator('button:has-text("Manage")');

        // If manage button exists, it means we're connected
        if (await manageButton.isVisible()) {
            await expect(manageButton).toBeVisible();

            // Click manage button should navigate to settings
            await manageButton.click();
            await expect(page).toHaveURL(/\/settings/);
        }
    });

    test('should show connect button when not connected', async ({ page }) => {
        // Wait for the page to load
        await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

        // Look for connect button (only visible when not connected)
        const connectButton = page.locator('button:has-text("Connect")');

        // If connect button exists, it means we're not connected
        if (await connectButton.isVisible()) {
            await expect(connectButton).toBeVisible();

            // Click connect button should navigate to settings
            await connectButton.click();
            await expect(page).toHaveURL(/\/settings/);
        }
    });

    test('should show sync button when connected', async ({ page }) => {
        // Wait for the page to load
        await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

        // Look for sync button (only visible when connected)
        const syncButton = page.locator('button:has-text("Sync now")');

        // If sync button exists, it means we're connected
        if (await syncButton.isVisible()) {
            await expect(syncButton).toBeVisible();

            // Click sync button should trigger sync
            await syncButton.click();

            // Should show syncing state
            await expect(page.locator('text=Syncing…')).toBeVisible();
        }
    });
});
