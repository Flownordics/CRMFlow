import { test, expect } from '@playwright/test';

test.describe('Deal Automation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to deals board
    await page.goto('/deals');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="deals-board"]', { timeout: 10000 });
  });

  test('should open CreateQuoteModal when deal is moved to Proposal stage', async ({ page }) => {
    // Create a test deal first
    await page.click('[data-testid="create-deal-button"]');
    await page.fill('[data-testid="deal-title-input"]', 'Test Deal for Quote');
    await page.fill('[data-testid="deal-company-select"]', 'Test Company');
    await page.fill('[data-testid="deal-value-input"]', '10000');
    await page.click('[data-testid="save-deal-button"]');
    
    // Wait for deal to be created
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 5000 });
    
    // Find the deal card and drag it to Proposal stage
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const proposalStage = page.locator('[data-testid="stage-column"]').filter({ hasText: 'Proposal' });
    
    await dealCard.dragTo(proposalStage);
    
    // Wait for CreateQuoteModal to open
    await page.waitForSelector('[data-testid="create-quote-modal"]', { timeout: 5000 });
    
    // Verify modal is open with correct prefill
    await expect(page.locator('[data-testid="create-quote-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="quote-company-select"]')).toHaveValue('Test Company');
    await expect(page.locator('[data-testid="quote-value-input"]')).toHaveValue('10000');
    
    // Submit the quote
    await page.click('[data-testid="create-quote-button"]');
    
    // Verify quote was created and modal closed
    await expect(page.locator('[data-testid="create-quote-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should open CreateOrderModal when deal is moved to Won stage', async ({ page }) => {
    // Create a test deal first
    await page.click('[data-testid="create-deal-button"]');
    await page.fill('[data-testid="deal-title-input"]', 'Test Deal for Order');
    await page.fill('[data-testid="deal-company-select"]', 'Test Company');
    await page.fill('[data-testid="deal-value-input"]', '15000');
    await page.click('[data-testid="save-deal-button"]');
    
    // Wait for deal to be created
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 5000 });
    
    // Find the deal card and drag it to Won stage
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const wonStage = page.locator('[data-testid="stage-column"]').filter({ hasText: 'Won' });
    
    await dealCard.dragTo(wonStage);
    
    // Wait for CreateOrderModal to open
    await page.waitForSelector('[data-testid="create-order-modal"]', { timeout: 5000 });
    
    // Verify modal is open with correct prefill
    await expect(page.locator('[data-testid="create-order-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-company-select"]')).toHaveValue('Test Company');
    await expect(page.locator('[data-testid="order-value-input"]')).toHaveValue('15000');
    
    // Submit the order
    await page.click('[data-testid="create-order-button"]');
    
    // Verify order was created and modal closed
    await expect(page.locator('[data-testid="create-order-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should prevent duplicate modals when rapidly dragging deals', async ({ page }) => {
    // Create a test deal
    await page.click('[data-testid="create-deal-button"]');
    await page.fill('[data-testid="deal-title-input"]', 'Test Deal for Duplicate Prevention');
    await page.fill('[data-testid="deal-company-select"]', 'Test Company');
    await page.fill('[data-testid="deal-value-input"]', '20000');
    await page.click('[data-testid="save-deal-button"]');
    
    // Wait for deal to be created
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 5000 });
    
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const proposalStage = page.locator('[data-testid="stage-column"]').filter({ hasText: 'Proposal' });
    
    // Rapidly drag the deal multiple times
    for (let i = 0; i < 3; i++) {
      await dealCard.dragTo(proposalStage);
      await page.waitForTimeout(100); // Small delay
    }
    
    // Wait a bit for any modals to open
    await page.waitForTimeout(1000);
    
    // Verify only one modal is open
    const quoteModals = page.locator('[data-testid="create-quote-modal"]');
    await expect(quoteModals).toHaveCount(1);
  });

  test('should log activities when quotes and orders are created', async ({ page }) => {
    // Create a test deal
    await page.click('[data-testid="create-deal-button"]');
    await page.fill('[data-testid="deal-title-input"]', 'Test Deal for Activity Logging');
    await page.fill('[data-testid="deal-company-select"]', 'Test Company');
    await page.fill('[data-testid="deal-value-input"]', '25000');
    await page.click('[data-testid="save-deal-button"]');
    
    // Wait for deal to be created
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 5000 });
    
    // Move to Proposal and create quote
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const proposalStage = page.locator('[data-testid="stage-column"]').filter({ hasText: 'Proposal' });
    
    await dealCard.dragTo(proposalStage);
    await page.waitForSelector('[data-testid="create-quote-modal"]', { timeout: 5000 });
    await page.click('[data-testid="create-quote-button"]');
    
    // Wait for quote to be created
    await page.waitForTimeout(2000);
    
    // Navigate to deal detail to check activities
    await dealCard.click();
    await page.waitForSelector('[data-testid="deal-activities"]', { timeout: 5000 });
    
    // Verify quote creation activity is logged
    await expect(page.locator('[data-testid="activity-item"]').filter({ hasText: 'quote_created_from_deal' })).toBeVisible();
  });
});
