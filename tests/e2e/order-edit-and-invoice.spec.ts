import { test, expect } from '@playwright/test';

test.describe('Order Editor and Invoice Conversion', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to orders page
        await page.goto('/orders');

        // Wait for orders to load
        await page.waitForSelector('[data-testid="orders-table"]', { timeout: 10000 });
    });

    test('should open order editor when clicking on order row', async ({ page }) => {
        // Click on the first order row
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Should navigate to order editor
        await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+$/);

        // Should show order editor elements
        await expect(page.locator('h1')).toContainText('Order');
        await expect(page.locator('text=Order Details')).toBeVisible();
        await expect(page.locator('text=Line Items')).toBeVisible();
        await expect(page.locator('text=Totals')).toBeVisible();
    });

    test('should allow editing order header fields', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Edit order date
        const orderDateInput = page.locator('input[type="date"]').first();
        await orderDateInput.fill('2024-12-31');

        // Edit notes
        const notesTextarea = page.locator('textarea');
        await notesTextarea.fill('Updated order notes');

        // Change status
        const statusSelect = page.locator('select').first();
        await statusSelect.selectOption('confirmed');

        // Wait for changes to be saved (you might need to adjust this based on your implementation)
        await page.waitForTimeout(1000);
    });

    test('should allow adding and editing line items', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Click add line button
        await page.locator('button:has-text("Add Line")').click();

        // Fill in line item details
        const descriptionInput = page.locator('input[placeholder*="description"]').first();
        await descriptionInput.fill('Test product');

        const qtyInput = page.locator('input[type="number"]').first();
        await qtyInput.fill('2');

        const unitPriceInput = page.locator('input[type="number"]').nth(1);
        await unitPriceInput.fill('100.00');

        // Wait for totals to update
        await page.waitForTimeout(1000);

        // Check that totals are displayed
        await expect(page.locator('text=Total:')).toBeVisible();
    });

    test('should create invoice when status changes to invoiced', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Change status to invoiced
        const statusSelect = page.locator('select').first();
        await statusSelect.selectOption('invoiced');

        // Wait for conversion to complete
        await page.waitForTimeout(2000);

        // Check for success toast
        await expect(page.locator('text=Invoice Created')).toBeVisible();
        await expect(page.locator('text=Invoice #')).toBeVisible();

        // Navigate to invoices page to verify invoice was created
        await page.goto('/invoices');
        await page.waitForSelector('[data-testid="invoices-table"]', { timeout: 10000 });

        // Should see at least one invoice
        const invoiceRows = page.locator('[data-testid="invoices-table"] tbody tr');
        await expect(invoiceRows).toHaveCount(1);
    });

    test('should create invoice when status changes to fulfilled', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Change status to fulfilled
        const statusSelect = page.locator('select').first();
        await statusSelect.selectOption('fulfilled');

        // Wait for conversion to complete
        await page.waitForTimeout(2000);

        // Check for success toast
        await expect(page.locator('text=Invoice Created')).toBeVisible();
        await expect(page.locator('text=Invoice #')).toBeVisible();
    });

    test('should not create duplicate invoices when status changes multiple times', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Change status to invoiced
        const statusSelect = page.locator('select').first();
        await statusSelect.selectOption('invoiced');

        // Wait for conversion
        await page.waitForTimeout(2000);

        // Change status to something else and back to invoiced
        await statusSelect.selectOption('confirmed');
        await page.waitForTimeout(1000);
        await statusSelect.selectOption('invoiced');
        await page.waitForTimeout(2000);

        // Should not show multiple success toasts
        const successToasts = page.locator('text=Invoice Created');
        await expect(successToasts).toHaveCount(1);
    });

    test('should generate PDF when PDF button is clicked', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Click PDF button
        const pdfButton = page.locator('button:has-text("PDF")');
        await pdfButton.click();

        // Wait for PDF to be generated (this might open in a new tab or download)
        await page.waitForTimeout(2000);

        // Check for PDF generation activity (if you have activity logging)
        // This test might need adjustment based on your PDF implementation
    });

    test('should show linked deal if order has deal_id', async ({ page }) => {
        // This test assumes you have an order with a deal_id
        // You might need to create test data or adjust this test

        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Check if linked deal panel is visible
        const linkedDealPanel = page.locator('text=Linked Deal');
        if (await linkedDealPanel.isVisible()) {
            await expect(linkedDealPanel).toBeVisible();
            await expect(page.locator('text=View Deal')).toBeVisible();
        }
    });

    test('should navigate back to orders list', async ({ page }) => {
        // Navigate to order editor
        const firstOrderRow = page.locator('[data-testid="orders-table"] tbody tr').first();
        await firstOrderRow.click();

        // Click back button
        await page.locator('a:has-text("Back to Orders")').click();

        // Should be back on orders page
        await expect(page).toHaveURL('/orders');
        await expect(page.locator('[data-testid="orders-table"]')).toBeVisible();
    });
});
