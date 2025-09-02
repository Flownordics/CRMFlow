import { test, expect } from "@playwright/test";

test.describe("Companies Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to companies page
    await page.goto("/companies");
    await page.waitForLoadState("networkidle");
  });

  test("should render companies list with table or empty state", async ({ page }) => {
    // Check if we're on the companies page
    await expect(page).toHaveURL(/\/companies$/);

    // Verify page header exists
    await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();

    // Check for "Add Company" button
    await expect(page.getByRole("button", { name: "Add Company" })).toBeVisible();

    // Check for search input
    await expect(page.getByPlaceholder("Search companies…")).toBeVisible();

    // Check if table exists or empty state
    const table = page.locator("table");
    const emptyState = page.getByText("No companies found");

    // Either table should be visible or empty state
    await expect(table.or(emptyState)).toBeVisible();
  });

  test("should create company via modal and display in table", async ({ page }) => {
    // Click "Add Company" button
    await page.getByRole("button", { name: "Add Company" }).click();

    // Wait for modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Company" })).toBeVisible();

    // Fill in company details
    const companyName = `Test Company ${Date.now()}`;
    await page.getByLabel("Company Name *").fill(companyName);
    await page.getByLabel("Domain").fill("testcompany.com");
    await page.getByLabel("Phone").fill("+45 12345678");
    await page.getByLabel("City").fill("Copenhagen");
    await page.getByLabel("Country").fill("Denmark");

    // Submit the form
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify success toast appears
    await expect(page.getByText("Company created successfully")).toBeVisible();

    // Verify company appears in the table
    await expect(page.getByText(companyName)).toBeVisible();

    // Verify other details are visible
    await expect(page.getByText("testcompany.com")).toBeVisible();
    await expect(page.getByText("Copenhagen, Denmark")).toBeVisible();
  });

  test("should create company with invoice email and verify it works end-to-end", async ({ page }) => {
    // Click "Add Company" button
    await page.getByRole("button", { name: "Add Company" }).click();

    // Wait for modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Company" })).toBeVisible();

    // Fill in company details including invoice email
    const companyName = `Invoice Email Company ${Date.now()}`;
    await page.getByLabel("Company Name *").fill(companyName);
    await page.getByLabel("Email").fill("contact@invoicecompany.com");
    await page.getByLabel("Invoice Email").fill("invoices@invoicecompany.com");
    await page.getByLabel("Domain").fill("invoicecompany.com");
    await page.getByLabel("Phone").fill("+45 87654321");
    await page.getByLabel("City").fill("Aarhus");
    await page.getByLabel("Country").fill("Denmark");

    // Submit the form
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify success toast appears
    await expect(page.getByText("Company created successfully")).toBeVisible();

    // Verify company appears in the table
    await expect(page.getByText(companyName)).toBeVisible();

    // Click on the company to view details
    await page.getByText(companyName).first().click();

    // Wait for company detail page to load
    await page.waitForLoadState("networkidle");

    // Verify we're on the company detail page
    await expect(page.getByRole("heading", { name: companyName })).toBeVisible();

    // Verify invoice email is displayed in the company overview
    await expect(page.getByText("invoices@invoicecompany.com")).toBeVisible();

    // Click edit button to test editing
    await page.getByRole("button", { name: "Edit Company" }).click();

    // Wait for edit modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Company" })).toBeVisible();

    // Verify invoice email field is populated
    await expect(page.getByLabel("Invoice Email")).toHaveValue("invoices@invoicecompany.com");

    // Update the invoice email
    await page.getByLabel("Invoice Email").clear();
    await page.getByLabel("Invoice Email").fill("newinvoices@invoicecompany.com");

    // Save changes
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify success toast
    await expect(page.getByText("Company updated successfully")).toBeVisible();

    // Verify updated invoice email is displayed
    await expect(page.getByText("newinvoices@invoicecompany.com")).toBeVisible();
  });

  test("should validate invoice email format", async ({ page }) => {
    // Click "Add Company" button
    await page.getByRole("button", { name: "Add Company" }).click();

    // Wait for modal to open
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill in company details with invalid invoice email
    const companyName = `Invalid Email Company ${Date.now()}`;
    await page.getByLabel("Company Name *").fill(companyName);
    await page.getByLabel("Invoice Email").fill("invalid-email");

    // Try to submit the form
    await page.getByRole("button", { name: "Save" }).click();

    // Verify validation error appears
    await expect(page.getByText("Invalid email")).toBeVisible();

    // Fix the email format
    await page.getByLabel("Invoice Email").clear();
    await page.getByLabel("Invoice Email").fill("valid@email.com");

    // Submit the form
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify success toast appears
    await expect(page.getByText("Company created successfully")).toBeVisible();
  });

  test("should search companies", async ({ page }) => {
    // First create a company to search for
    await page.getByRole("button", { name: "Add Company" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const searchCompanyName = `Search Company ${Date.now()}`;
    await page.getByLabel("Company Name *").fill(searchCompanyName);
    await page.getByLabel("Domain").fill("searchcompany.com");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Search for the company
    await page.getByPlaceholder("Search companies…").fill(searchCompanyName);

    // Verify the company appears in search results
    await expect(page.getByText(searchCompanyName)).toBeVisible();

    // Clear search and verify all companies are visible again
    await page.getByPlaceholder("Search companies…").clear();
    await expect(page.getByText(searchCompanyName)).toBeVisible();
  });

  test("should edit company", async ({ page }) => {
    // First create a company to edit
    await page.getByRole("button", { name: "Add Company" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const originalName = `Edit Company ${Date.now()}`;
    await page.getByLabel("Company Name *").fill(originalName);
    await page.getByLabel("Domain").fill("editcompany.com");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Click edit button for the company
    await page.getByText(originalName).first().click();
    await page.getByRole("button", { name: "Edit" }).first().click();

    // Wait for edit modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Company" })).toBeVisible();

    // Update company name
    const updatedName = `${originalName} Updated`;
    await page.getByLabel("Company Name *").clear();
    await page.getByLabel("Company Name *").fill(updatedName);

    // Save changes
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify success toast
    await expect(page.getByText("Company updated successfully")).toBeVisible();

    // Verify updated name appears in table
    await expect(page.getByText(updatedName)).toBeVisible();
  });
});
