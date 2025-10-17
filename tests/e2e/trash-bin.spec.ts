import { test, expect } from '@playwright/test';

test.describe('Trash Bin - Quotes and Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should restore deleted quote from trash bin', async ({ page }) => {
    // Create a quote
    await page.goto('/quotes');
    await page.click('button:has-text("New Quote")');
    
    // Fill in quote details (simplified)
    await page.fill('input[placeholder*="title"]', 'Test Quote for Restore');
    await page.click('button:has-text("Create")');
    
    // Wait for quote to be created
    await page.waitForSelector('text=Test Quote for Restore');
    
    // Delete the quote
    await page.click('button[aria-label*="Delete"]');
    await page.click('button:has-text("Delete")'); // Confirm
    
    // Go to Settings → Trash Bin
    await page.goto('/settings');
    await page.click('button:has-text("Trash Bin")');
    await page.click('button:has-text("Quotes")');
    
    // Find the deleted quote
    await expect(page.locator('text=Test Quote for Restore')).toBeVisible();
    
    // Restore it
    await page.click('button:has-text("Restore")');
    await page.click('button:has-text("Restore")'); // Confirm dialog
    
    // Verify it's restored
    await page.goto('/quotes');
    await expect(page.locator('text=Test Quote for Restore')).toBeVisible();
  });

  test('should restore deleted order from trash bin', async ({ page }) => {
    // Create an order
    await page.goto('/orders');
    await page.click('button:has-text("New Order")');
    
    // Fill in order details
    await page.fill('input[placeholder*="title"]', 'Test Order for Restore');
    await page.click('button:has-text("Create")');
    
    // Wait for order to be created
    await page.waitForSelector('text=Test Order for Restore');
    
    // Delete the order
    await page.click('button[aria-label*="Delete"]');
    await page.click('button:has-text("Delete")'); // Confirm
    
    // Go to Settings → Trash Bin
    await page.goto('/settings');
    await page.click('button:has-text("Trash Bin")');
    await page.click('button:has-text("Orders")');
    
    // Find the deleted order
    await expect(page.locator('text=Test Order for Restore')).toBeVisible();
    
    // Restore it
    await page.click('button:has-text("Restore")');
    await page.click('button:has-text("Restore")'); // Confirm dialog
    
    // Verify it's restored
    await page.goto('/orders');
    await expect(page.locator('text=Test Order for Restore')).toBeVisible();
  });

  test('should show empty state when no deleted items', async ({ page }) => {
    await page.goto('/settings');
    await page.click('button:has-text("Trash Bin")');
    await page.click('button:has-text("Quotes")');
    
    await expect(page.locator('text=No deleted quotes found')).toBeVisible();
  });
});

