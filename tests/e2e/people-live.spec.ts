import { test, expect } from '@playwright/test';

test.describe('People Live API CRUD', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to people page
        await page.goto('/people');
        await page.waitForLoadState('networkidle');
    });

    test('should filter people by company and show subset', async ({ page }) => {
        // Wait for companies to load
        await page.waitForSelector('select[value="all"]');

        // Select a specific company from the filter
        const companySelect = page.locator('select[value="all"]');
        await companySelect.click();

        // Get the first available company option (skip "All companies")
        const companyOptions = page.locator('select[value="all"] option');
        const optionCount = await companyOptions.count();

        if (optionCount > 1) {
            // Select the first actual company (index 1, since 0 is "All companies")
            await companySelect.selectOption({ index: 1 });

            // Wait for filter to apply
            await page.waitForLoadState('networkidle');

            // Verify that the filter is applied
            const selectedValue = await companySelect.inputValue();
            expect(selectedValue).not.toBe('all');

            // Verify that people are filtered (table should show some results)
            const peopleRows = page.locator('table tbody tr');
            await expect(peopleRows.first()).toBeVisible();
        } else {
            // No companies available for filtering
            test.skip('No companies available for filtering');
        }
    });

    test('should search people with @ symbol', async ({ page }) => {
        // Search for people with @ symbol (email search)
        await page.fill('input[placeholder="Search people…"]', '@');

        // Wait for search results
        await page.waitForLoadState('networkidle');

        // Verify search results are displayed
        const searchResults = page.locator('table tbody tr');
        await expect(searchResults.first()).toBeVisible();

        // Check that search results contain email addresses (with @ symbol)
        const hasEmailResults = await page.locator('text=@').count() > 0;
        expect(hasEmailResults).toBeTruthy();
    });

    test('should edit a person and persist changes', async ({ page }) => {
        // Find and click edit button for first person
        const editButton = page.locator('button:has-text("Edit")').first();
        await editButton.click();

        // Wait for modal to appear
        await page.waitForSelector('[role="dialog"]');

        // Modify person's title
        const titleInput = page.locator('input[name="title"]');
        const originalTitle = await titleInput.inputValue();
        const newTitle = `${originalTitle} - Updated`;

        await titleInput.clear();
        await titleInput.fill(newTitle);

        // Submit form
        await page.click('button:has-text("Save")');

        // Wait for modal to close and data to refresh
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
        await page.waitForLoadState('networkidle');

        // Verify person's title was updated in the table
        await expect(page.locator(`text="${newTitle}"`)).toBeVisible();

        // Refresh page to verify persistence
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify the change persists after refresh
        await expect(page.locator(`text="${newTitle}"`)).toBeVisible();
    });

    test('should filter people by title', async ({ page }) => {
        // Wait for title filter to be available
        await page.waitForSelector('select[value="all"]:nth-of-type(2)');

        // Select a specific title from the filter
        const titleSelect = page.locator('select[value="all"]:nth-of-type(2)');
        await titleSelect.click();

        // Select "Manager" title
        await titleSelect.selectOption('Manager');

        // Wait for filter to apply
        await page.waitForLoadState('networkidle');

        // Verify that the filter is applied
        const selectedValue = await titleSelect.inputValue();
        expect(selectedValue).toBe('Manager');

        // Verify that people are filtered by title
        const peopleRows = page.locator('table tbody tr');
        await expect(peopleRows.first()).toBeVisible();
    });

    test('should create a new person', async ({ page }) => {
        // Click Add Person button
        await page.click('button:has-text("Add Person")');

        // Wait for modal to appear
        await page.waitForSelector('[role="dialog"]');

        // Fill in person details
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe Live');
        await page.fill('input[name="email"]', 'john.doe@testlive.com');
        await page.fill('input[name="phone"]', '+45 87654321');
        await page.fill('input[name="title"]', 'Developer');

        // Select company if available
        const companySelect = page.locator('select[name="companyId"]');
        if (await companySelect.isVisible()) {
            const companyOptions = page.locator('select[name="companyId"] option');
            const optionCount = await companyOptions.count();

            if (optionCount > 1) {
                // Select the first actual company (index 1, since 0 might be placeholder)
                await companySelect.selectOption({ index: 1 });
            }
        }

        // Submit form
        await page.click('button:has-text("Save")');

        // Wait for modal to close and data to refresh
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
        await page.waitForLoadState('networkidle');

        // Verify person appears in table
        await expect(page.locator('text=John Doe Live')).toBeVisible();
        await expect(page.locator('text=john.doe@testlive.com')).toBeVisible();
    });

    test('should handle pagination correctly', async ({ page }) => {
        // Check if pagination exists
        const pagination = page.locator('text=/Page 1 of/');

        if (await pagination.isVisible()) {
            // Click next page
            await page.click('button:has-text("Next")');

            // Wait for page change
            await page.waitForLoadState('networkidle');

            // Verify page number changed
            await expect(page.locator('text=/Page 2 of/')).toBeVisible();

            // Verify that different people are shown on page 2
            const page2People = page.locator('table tbody tr');
            await expect(page2People.first()).toBeVisible();

            // Go back to page 1
            await page.click('button:has-text("Previous")');
            await page.waitForLoadState('networkidle');

            // Verify back to page 1
            await expect(page.locator('text=/Page 1 of/')).toBeVisible();
        } else {
            // No pagination needed - test passes
            test.skip('Pagination not needed for current data set');
        }
    });

    test('should display company information correctly', async ({ page }) => {
        // Wait for people and companies to load
        await page.waitForSelector('table tbody tr');

        // Check that company names are displayed as links
        const companyLinks = page.locator('table tbody tr a[href*="/companies/"]');

        if (await companyLinks.count() > 0) {
            // Verify company links are clickable
            await expect(companyLinks.first()).toBeVisible();

            // Click on a company link
            await companyLinks.first().click();

            // Should navigate to company detail page
            await page.waitForURL('**/companies/**');

            // Go back to people page
            await page.goBack();
            await page.waitForLoadState('networkidle');
        } else {
            // No company links available
            test.skip('No company links available for testing');
        }
    });
});
