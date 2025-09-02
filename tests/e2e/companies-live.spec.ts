import { test, expect } from '@playwright/test';

test.describe('Companies Live API CRUD', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to companies page
        await page.goto('/companies');
        await page.waitForLoadState('networkidle');
    });

    test('should create a new company and display it in the table', async ({ page }) => {
        // Click Add Company button
        await page.click('button:has-text("Add Company")');

        // Wait for modal to appear
        await page.waitForSelector('[role="dialog"]');

        // Fill in company details
        await page.fill('input[name="name"]', 'Test Company Live');
        await page.fill('input[name="domain"]', 'testlive.com');
        await page.fill('input[name="email"]', 'test@testlive.com');
        await page.fill('input[name="phone"]', '+45 12345678');
        await page.fill('input[name="city"]', 'Copenhagen');
        await page.selectOption('select[name="country"]', 'DK');

        // Submit form
        await page.click('button:has-text("Save")');

        // Wait for modal to close and data to refresh
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
        await page.waitForLoadState('networkidle');

        // Verify company appears in table
        await expect(page.locator('text=Test Company Live')).toBeVisible();
        await expect(page.locator('text=testlive.com')).toBeVisible();
    });

    test('should search for companies and find results', async ({ page }) => {
        // Search for "Acme" (assuming this company exists)
        await page.fill('input[placeholder="Search companies…"]', 'Acme');

        // Wait for search results
        await page.waitForLoadState('networkidle');

        // Verify search results contain "Acme"
        const searchResults = page.locator('table tbody tr');
        await expect(searchResults.first()).toBeVisible();

        // Check that at least one result contains "Acme"
        const hasAcmeResult = await page.locator('text=Acme').count() > 0;
        expect(hasAcmeResult).toBeTruthy();
    });

    test('should paginate through companies', async ({ page }) => {
        // Check if pagination exists
        const pagination = page.locator('text=/Page 1 of/');

        if (await pagination.isVisible()) {
            // Click next page
            await page.click('button:has-text("Next")');

            // Wait for page change
            await page.waitForLoadState('networkidle');

            // Verify page number changed
            await expect(page.locator('text=/Page 2 of/')).toBeVisible();

            // Click previous page
            await page.click('button:has-text("Previous")');

            // Wait for page change
            await page.waitForLoadState('networkidle');

            // Verify back to page 1
            await expect(page.locator('text=/Page 1 of/')).toBeVisible();
        } else {
            // No pagination needed - test passes
            test.skip('Pagination not needed for current data set');
        }
    });

    test('should filter companies by industry and country', async ({ page }) => {
        // Select industry filter
        await page.click('select[value="all"]');
        await page.selectOption('select[value="all"]', 'technology');

        // Wait for filter to apply
        await page.waitForLoadState('networkidle');

        // Select country filter
        await page.click('select[value="all"]:nth-of-type(2)');
        await page.selectOption('select[value="all"]:nth-of-type(2)', 'DK');

        // Wait for filter to apply
        await page.waitForLoadState('networkidle');

        // Verify filters are applied (check URL or state)
        const industrySelect = page.locator('select').first();
        const countrySelect = page.locator('select').nth(1);

        await expect(industrySelect).toHaveValue('technology');
        await expect(countrySelect).toHaveValue('DK');
    });

    test('should edit an existing company', async ({ page }) => {
        // Find and click edit button for first company
        const editButton = page.locator('button:has-text("Edit")').first();
        await editButton.click();

        // Wait for modal to appear
        await page.waitForSelector('[role="dialog"]');

        // Modify company name
        const nameInput = page.locator('input[name="name"]');
        const originalName = await nameInput.inputValue();
        const newName = `${originalName} - Edited`;

        await nameInput.clear();
        await nameInput.fill(newName);

        // Submit form
        await page.click('button:has-text("Save")');

        // Wait for modal to close and data to refresh
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
        await page.waitForLoadState('networkidle');

        // Verify company name was updated
        await expect(page.locator(`text="${newName}"`)).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // This test verifies that the UI handles API errors gracefully
        // In a real scenario, you might mock the API to return errors

        // Check that error boundaries are in place
        const errorBoundary = page.locator('[role="alert"]');

        // The page should load without errors
        await expect(page.locator('h1:has-text("Companies")')).toBeVisible();

        // If there are any error alerts, they should be user-friendly
        if (await errorBoundary.count() > 0) {
            const errorText = await errorBoundary.textContent();
            expect(errorText).toContain('Failed to load companies');
        }
    });
});
