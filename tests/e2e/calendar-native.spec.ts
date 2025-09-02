import { test, expect } from '@playwright/test';

test.describe('Native Calendar', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to calendar page
        await page.goto('/calendar');
    });

    test('should show native calendar without Google connection', async ({ page }) => {
        // Should show native calendar ready state
        await expect(page.getByText('Native Calendar Ready')).toBeVisible();
        await expect(page.getByText('Your native calendar is working!')).toBeVisible();

        // Should have create event button
        await expect(page.getByRole('button', { name: 'Create Event' })).toBeVisible();

        // Should have connect Google button
        await expect(page.getByRole('button', { name: 'Connect Google Calendar' })).toBeVisible();
    });

    test('should create native event successfully', async ({ page }) => {
        // Click create event button
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Fill in event details
        await page.getByLabel('Event Title *').fill('Test Native Event');
        await page.getByLabel('Description').fill('This is a test native event');
        await page.getByLabel('Location').fill('Test Office');

        // Set start date (tomorrow)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        await page.getByLabel('Start Date *').fill(tomorrowStr);
        await page.getByLabel('Start Time').fill('10:00');

        // Set end date
        await page.getByLabel('End Date *').fill(tomorrowStr);
        await page.getByLabel('End Time').fill('11:00');

        // Set event type
        await page.getByLabel('Event Type').selectOption('meeting');

        // Submit form
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Should show success message
        await expect(page.getByText('Event created successfully')).toBeVisible();

        // Should close dialog
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Should show the event in the list
        await expect(page.getByText('Test Native Event')).toBeVisible();
        await expect(page.getByText('Native')).toBeVisible(); // Source badge
    });

    test('should create all-day event', async ({ page }) => {
        // Click create event button
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Fill in event details
        await page.getByLabel('Event Title *').fill('All Day Event');

        // Check all-day checkbox
        await page.getByLabel('All Day').check();

        // Set dates
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        await page.getByLabel('Start Date *').fill(tomorrowStr);
        await page.getByLabel('End Date *').fill(tomorrowStr);

        // Time fields should be disabled
        await expect(page.getByLabel('Start Time')).toBeDisabled();
        await expect(page.getByLabel('End Time')).toBeDisabled();

        // Submit form
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Should show success message
        await expect(page.getByText('Event created successfully')).toBeVisible();

        // Should show the event
        await expect(page.getByText('All Day Event')).toBeVisible();
    });

    test('should filter events by type', async ({ page }) => {
        // Create a meeting event first
        await page.getByRole('button', { name: 'Create Event' }).click();
        await page.getByLabel('Event Title *').fill('Meeting Event');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        await page.getByLabel('Start Date *').fill(tomorrowStr);
        await page.getByLabel('End Date *').fill(tomorrowStr);
        await page.getByLabel('Event Type').selectOption('meeting');

        await page.getByRole('button', { name: 'Create Event' }).click();
        await expect(page.getByText('Event created successfully')).toBeVisible();

        // Create a call event
        await page.getByRole('button', { name: 'Create Event' }).click();
        await page.getByLabel('Event Title *').fill('Call Event');
        await page.getByLabel('Start Date *').fill(tomorrowStr);
        await page.getByLabel('End Date *').fill(tomorrowStr);
        await page.getByLabel('Event Type').selectOption('call');

        await page.getByRole('button', { name: 'Create Event' }).click();
        await expect(page.getByText('Event created successfully')).toBeVisible();

        // Should show both events
        await expect(page.getByText('Meeting Event')).toBeVisible();
        await expect(page.getByText('Call Event')).toBeVisible();

        // Filter by meeting type
        await page.getByRole('button', { name: 'Meeting' }).click();

        // Should only show meeting event
        await expect(page.getByText('Meeting Event')).toBeVisible();
        await expect(page.getByText('Call Event')).not.toBeVisible();

        // Clear filters
        await page.getByRole('button', { name: 'Clear filters' }).click();

        // Should show both events again
        await expect(page.getByText('Meeting Event')).toBeVisible();
        await expect(page.getByText('Call Event')).toBeVisible();
    });

    test('should show validation errors for required fields', async ({ page }) => {
        // Click create event button
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Try to submit without required fields
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Should show validation error
        await expect(page.getByText('Please fill in all required fields')).toBeVisible();

        // Dialog should still be open
        await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should navigate to settings when clicking connect Google', async ({ page }) => {
        // Click connect Google button
        await page.getByRole('button', { name: 'Connect Google Calendar' }).click();

        // Should navigate to settings page
        await expect(page).toHaveURL('/settings');
    });

    test('should show KPIs for events', async ({ page }) => {
        // Create an event for today
        await page.getByRole('button', { name: 'Create Event' }).click();
        await page.getByLabel('Event Title *').fill('Today Event');

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        await page.getByLabel('Start Date *').fill(todayStr);
        await page.getByLabel('End Date *').fill(todayStr);

        await page.getByRole('button', { name: 'Create Event' }).click();
        await expect(page.getByText('Event created successfully')).toBeVisible();

        // Should show KPI with 1 event today
        await expect(page.getByText('1')).toBeVisible(); // Events today count
    });
});
