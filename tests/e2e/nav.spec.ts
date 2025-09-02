import { test, expect } from "@playwright/test";

test("sidebar navigation", async ({ page }) => {
  // Navigate to the app
  await page.goto("/");

  // Wait for the page to load
  await page.waitForLoadState("networkidle");

  // Check if we're on the dashboard
  await expect(page).toHaveURL(/\/$/);

  // Test Companies navigation
  await page.getByRole("navigation").getByText("Companies").click();
  await expect(page).toHaveURL(/\/companies$/);

  // Test Deals navigation
  await page.getByRole("navigation").getByText("Deals").click();
  await expect(page).toHaveURL(/\/deals$/);

  // Test Quotes navigation
  await page.getByRole("navigation").getByText("Quotes").click();
  await expect(page).toHaveURL(/\/quotes$/);

  // Test Orders navigation
  await page.getByRole("navigation").getByText("Orders").click();
  await expect(page).toHaveURL(/\/orders$/);

  // Test Invoices navigation
  await page.getByRole("navigation").getByText("Invoices").click();
  await expect(page).toHaveURL(/\/invoices$/);
});
