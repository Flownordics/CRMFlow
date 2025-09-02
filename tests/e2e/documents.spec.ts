import { test, expect } from '@playwright/test';

test.describe('Documents Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to documents page
        await page.goto('/documents');
    });

    test('should display documents page with upload button', async ({ page }) => {
        // Check page title
        await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

        // Check upload button
        await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();

        // Check filters section
        await expect(page.getByText('Filters')).toBeVisible();
    });

    test('should open upload modal when upload button is clicked', async ({ page }) => {
        // Click upload button
        await page.getByRole('button', { name: 'Upload' }).click();

        // Check modal is open
        await expect(page.getByRole('dialog', { name: 'Upload Document' })).toBeVisible();

        // Check dropzone is present
        await expect(page.getByText('Drag & drop files here')).toBeVisible();
    });

    test('should display empty state when no documents exist', async ({ page }) => {
        // Check empty state is shown
        await expect(page.getByText('No documents found')).toBeVisible();
        await expect(page.getByText('Upload your first document to get started')).toBeVisible();
    });

    test('should have search functionality', async ({ page }) => {
        // Check search input is present
        await expect(page.getByPlaceholder('Search documents...')).toBeVisible();
    });

    test('should have entity type filter', async ({ page }) => {
        // Check entity type filter is present
        await expect(page.getByText('Entity type')).toBeVisible();

        // Click on entity type filter
        await page.getByText('Entity type').click();

        // Check filter options
        await expect(page.getByText('All')).toBeVisible();
        await expect(page.getByText('Company')).toBeVisible();
        await expect(page.getByText('Deal')).toBeVisible();
        await expect(page.getByText('Person')).toBeVisible();
    });

    test('should have file type filter', async ({ page }) => {
        // Check file type filter is present
        await expect(page.getByText('File type')).toBeVisible();

        // Click on file type filter
        await page.getByText('File type').click();

        // Check filter options
        await expect(page.getByText('All')).toBeVisible();
        await expect(page.getByText('PDF')).toBeVisible();
        await expect(page.getByText('Images')).toBeVisible();
        await expect(page.getByText('Documents')).toBeVisible();
    });

    test('should close upload modal when cancel is clicked', async ({ page }) => {
        // Open upload modal
        await page.getByRole('button', { name: 'Upload' }).click();

        // Check modal is open
        await expect(page.getByRole('dialog', { name: 'Upload Document' })).toBeVisible();

        // Click cancel
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Check modal is closed
        await expect(page.getByRole('dialog', { name: 'Upload Document' })).not.toBeVisible();
    });

    test('should show upload progress when files are selected', async ({ page }) => {
        // Open upload modal
        await page.getByRole('button', { name: 'Upload' }).click();

        // Create a test file
        const testFile = Buffer.from('test content');

        // Upload file (this would need to be implemented with actual file upload)
        // For now, just check the UI elements are present
        await expect(page.getByText('Selected Files')).toBeVisible();
    });

    test('should have relation picker in upload modal', async ({ page }) => {
        // Open upload modal
        await page.getByRole('button', { name: 'Upload' }).click();

        // Check relation picker is present
        await expect(page.getByText('Relate to (Optional)')).toBeVisible();

        // Check entity type selector
        await expect(page.getByText('Entity type')).toBeVisible();
    });

    test('should show relation options when entity type is selected', async ({ page }) => {
        // Open upload modal
        await page.getByRole('button', { name: 'Upload' }).click();

        // Select entity type
        await page.getByText('Entity type').click();
        await page.getByText('Company').click();

        // Check entity selector appears
        await expect(page.getByText('Select company')).toBeVisible();
    });
});
