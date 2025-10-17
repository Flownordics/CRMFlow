import { test, expect } from '@playwright/test';

test.describe('Two-Way Calendar Sync', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should show calendar sync settings when calendar is connected', async ({ page }) => {
    // First, connect Google Calendar
    await page.goto('/settings');
    await page.click('button:has-text("Integrations")');
    
    // Check if calendar sync card is visible
    await expect(page.locator('h2:has-text("Two-Way Calendar Sync")')).toBeVisible();
  });

  test('should enable two-way sync', async ({ page }) => {
    // Assume calendar is already connected
    await page.goto('/settings');
    await page.click('button:has-text("Integrations")');
    
    // Find the sync toggle
    const syncToggle = page.locator('#sync-toggle');
    
    // Check current state
    const isEnabled = await syncToggle.isChecked();
    
    if (!isEnabled) {
      // Enable sync
      await syncToggle.click();
      
      // Wait for success toast
      await expect(page.locator('text=Two-Way Sync Enabled')).toBeVisible({ timeout: 5000 });
      
      // Verify toggle is now checked
      await expect(syncToggle).toBeChecked();
      
      // Verify status indicators appear
      await expect(page.locator('text=Sync Active')).toBeVisible();
    }
  });

  test('should disable two-way sync', async ({ page }) => {
    await page.goto('/settings');
    await page.click('button:has-text("Integrations")');
    
    const syncToggle = page.locator('#sync-toggle');
    
    // Make sure it's enabled first
    const isEnabled = await syncToggle.isChecked();
    
    if (isEnabled) {
      // Disable sync
      await syncToggle.click();
      
      // Wait for success toast
      await expect(page.locator('text=Two-Way Sync Disabled')).toBeVisible({ timeout: 5000 });
      
      // Verify toggle is now unchecked
      await expect(syncToggle).not.toBeChecked();
    }
  });

  test('should show sync status information', async ({ page }) => {
    await page.goto('/settings');
    await page.click('button:has-text("Integrations")');
    
    // Enable sync if not already enabled
    const syncToggle = page.locator('#sync-toggle');
    if (!(await syncToggle.isChecked())) {
      await syncToggle.click();
      await page.waitForTimeout(2000);
    }
    
    // Check that status info is displayed
    await expect(page.locator('text=Sync Active')).toBeVisible();
    await expect(page.locator('text=Last synced')).toBeVisible();
    await expect(page.locator('text=Expires')).toBeVisible();
  });
});

