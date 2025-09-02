import { test, expect } from '@playwright/test';

test.describe('Quote to Order Conversion', () => {
    test('should create order when quote status is changed to accepted', async ({ page }) => {
        // Navigate to quotes page
        await page.goto('/quotes');

        // Create a new quote (assuming there's a create quote button)
        await page.click('[data-testid="create-quote-button"]');

        // Fill in quote details
        await page.fill('[data-testid="quote-company-select"]', 'Test Company');
        await page.fill('[data-testid="quote-description"]', 'Test Quote');
        await page.fill('[data-testid="quote-amount"]', '1000');

        // Add line items
        await page.click('[data-testid="add-line-item"]');
        await page.fill('[data-testid="line-description"]', 'Test Product');
        await page.fill('[data-testid="line-quantity"]', '2');
        await page.fill('[data-testid="line-unit-price"]', '500');

        // Save quote
        await page.click('[data-testid="save-quote"]');

        // Wait for quote to be created and navigate to it
        await page.waitForSelector('[data-testid="quote-detail"]');
        const quoteId = await page.locator('[data-testid="quote-id"]').textContent();

        // Change status to accepted
        await page.selectOption('[data-testid="quote-status-select"]', 'accepted');

        // Wait for success toast
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="toast-success"]')).toContainText('Order Created');

        // Navigate to orders page to verify order was created
        await page.goto('/orders');

        // Check that the order exists and has the correct quote_id
        await expect(page.locator(`[data-testid="order-quote-id-${quoteId}"]`)).toBeVisible();

        // Open the order and verify line items match
        await page.click(`[data-testid="order-quote-id-${quoteId}"]`);
        await page.waitForSelector('[data-testid="order-detail"]');

        // Verify line items match the quote
        await expect(page.locator('[data-testid="line-description"]')).toContainText('Test Product');
        await expect(page.locator('[data-testid="line-quantity"]')).toContainText('2');
        await expect(page.locator('[data-testid="line-unit-price"]')).toContainText('500');
    });

    test('should not create duplicate orders when status is changed to accepted multiple times', async ({ page }) => {
        // Navigate to an existing quote
        await page.goto('/quotes');
        await page.click('[data-testid="quote-item"]');

        // Change status to accepted
        await page.selectOption('[data-testid="quote-status-select"]', 'accepted');

        // Wait for success toast
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

        // Change status to something else
        await page.selectOption('[data-testid="quote-status-select"]', 'sent');

        // Change status back to accepted
        await page.selectOption('[data-testid="quote-status-select"]', 'accepted');

        // Should not show another success toast (idempotency)
        await expect(page.locator('[data-testid="toast-success"]')).not.toBeVisible();

        // Navigate to orders and verify only one order exists
        await page.goto('/orders');
        const orderCount = await page.locator('[data-testid="order-item"]').count();
        expect(orderCount).toBe(1);
    });

    test('should handle conversion errors gracefully', async ({ page }) => {
        // This test would require mocking the API to simulate failures
        // For now, we'll just verify the UI handles errors properly

        // Navigate to quotes page
        await page.goto('/quotes');
        await page.click('[data-testid="quote-item"]');

        // Mock API failure (this would need to be set up in the test environment)
        await page.evaluate(() => {
            // Mock the ensureOrderForQuote function to throw an error
            window.ensureOrderForQuote = async () => {
                throw new Error('API Error');
            };
        });

        // Change status to accepted
        await page.selectOption('[data-testid="quote-status-select"]', 'accepted');

        // Should show error toast
        await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="toast-error"]')).toContainText('Order Creation Failed');

        // Status should still be updated to accepted (no rollback)
        await expect(page.locator('[data-testid="quote-status-select"]')).toHaveValue('accepted');
    });
});
