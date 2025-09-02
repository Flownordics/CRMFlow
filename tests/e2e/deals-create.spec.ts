import { test, expect } from "@playwright/test";

test.describe("Deal Creation with Inline Company/Person Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to deals page
    await page.goto("/deals");
    await page.waitForLoadState("networkidle");
  });

  test("should create deal with inline company and person creation", async ({ page }) => {
    // Check if we're on the deals page
    await expect(page).toHaveURL(/\/deals$/);
    
    // Verify page header exists
    await expect(page.getByRole("heading", { name: "Deals" })).toBeVisible();
    
    // Click "Add Deal" button
    await page.getByRole("button", { name: "Add Deal" }).click();
    
    // Wait for deal creation modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Deal" })).toBeVisible();
    
    // Fill in deal title
    const dealTitle = `Test Deal ${Date.now()}`;
    await page.getByPlaceholder("Deal title").fill(dealTitle);
    
    // Create company inline
    await page.getByRole("combobox", { name: "Search company..." }).click();
    const newCompanyName = `New Company ${Date.now()}`;
    await page.getByPlaceholder("Search company...").fill(newCompanyName);
    
    // Click "Create" button for company
    await page.getByRole("button", { name: `Create "${newCompanyName}"` }).click();
    
    // Wait for company modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Company" })).toBeVisible();
    
    // Verify company name is pre-filled
    await expect(page.getByLabel("Company Name *")).toHaveValue(newCompanyName);
    
    // Fill in company details
    await page.getByLabel("Domain").fill("newcompany.com");
    await page.getByLabel("Phone").fill("+45 87654321");
    await page.getByLabel("City").fill("Aarhus");
    await page.getByLabel("Country").fill("Denmark");
    
    // Save company
    await page.getByRole("button", { name: "Save" }).click();
    
    // Wait for company modal to close and verify success
    await expect(page.getByText("Company created")).toBeVisible();
    
    // Verify company is selected in deal modal
    await expect(page.getByRole("combobox", { name: "Search company..." })).toContainText(newCompanyName);
    
    // Create person inline
    await page.getByRole("combobox", { name: "Search contact..." }).click();
    const newPersonName = `New Person ${Date.now()}`;
    await page.getByPlaceholder("Search contact...").fill(newPersonName);
    
    // Click "Create" button for person
    await page.getByRole("button", { name: `Create "${newPersonName}"` }).click();
    
    // Wait for person modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Person" })).toBeVisible();
    
    // Verify person name is pre-filled and company is selected
    const nameParts = newPersonName.split(' ');
    await expect(page.getByLabel("First Name *")).toHaveValue(nameParts[0]);
    if (nameParts.length > 1) {
      await expect(page.getByLabel("Last Name *")).toHaveValue(nameParts.slice(1).join(' '));
    }
    await expect(page.getByRole("combobox", { name: "Company *" })).toContainText(newCompanyName);
    
    // Fill in person details
    await page.getByLabel("Email").fill("newperson@newcompany.com");
    await page.getByLabel("Phone").fill("+45 11223344");
    await page.getByLabel("Title").fill("Manager");
    
    // Save person
    await page.getByRole("button", { name: "Save" }).click();
    
    // Wait for person modal to close and verify success
    await expect(page.getByText("Person created")).toBeVisible();
    
    // Verify person is selected in deal modal
    await expect(page.getByRole("combobox", { name: "Search contact..." })).toContainText(newPersonName);
    
    // Fill in remaining deal details
    await page.getByPlaceholder("50000").fill("75000");
    await page.getByRole("combobox", { name: "Currency" }).click();
    await page.getByRole("option", { name: "EUR" }).click();
    await page.getByLabel("Tax %").fill("20");
    
    // Set close date
    await page.getByRole("button", { name: "Pick a date" }).click();
    await page.getByRole("gridcell", { name: "15" }).click();
    
    // Create the deal
    await page.getByRole("button", { name: "Create" }).click();
    
    // Wait for deal modal to close and verify success
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Deal created")).toBeVisible();
    
    // Verify deal appears in the deals board
    await expect(page.getByText(dealTitle)).toBeVisible();
  });

  test("should handle company creation with duplicate detection", async ({ page }) => {
    // Click "Add Deal" button
    await page.getByRole("button", { name: "Add Deal" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    // Fill in deal title
    const dealTitle = `Duplicate Test Deal ${Date.now()}`;
    await page.getByPlaceholder("Deal title").fill(dealTitle);
    
    // Try to create a company with a name that might already exist
    await page.getByRole("combobox", { name: "Search company..." }).click();
    await page.getByPlaceholder("Search company...").fill("Acme");
    
    // Check if duplicate hint appears
    const duplicateHint = page.getByText("Existing: Acme");
    if (await duplicateHint.isVisible()) {
      // If duplicate exists, select the existing company
      await page.getByRole("option", { name: "Acme" }).click();
    } else {
      // If no duplicate, create new company
      await page.getByRole("button", { name: 'Create "Acme"' }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByLabel("Domain").fill("acme.com");
      await page.getByLabel("City").fill("Copenhagen");
      await page.getByLabel("Country").fill("Denmark");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Company created")).toBeVisible();
    }
    
    // Verify company is selected
    await expect(page.getByRole("combobox", { name: "Search company..." })).toContainText("Acme");
  });

  test("should handle person creation with company requirement", async ({ page }) => {
    // Click "Add Deal" button
    await page.getByRole("button", { name: "Add Deal" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    // Fill in deal title
    const dealTitle = `Person Test Deal ${Date.now()}`;
    await page.getByPlaceholder("Deal title").fill(dealTitle);
    
    // Try to create person without selecting company first
    await page.getByRole("combobox", { name: "Search contact..." }).click();
    
    // Verify person select is disabled when no company is selected
    await expect(page.getByPlaceholder("Select company first")).toBeVisible();
    
    // Select a company first
    await page.getByRole("combobox", { name: "Search company..." }).click();
    await page.getByPlaceholder("Search company...").fill("Acme");
    await page.getByRole("option", { name: "Acme" }).click();
    
    // Now person select should be enabled
    await page.getByRole("combobox", { name: "Search contact..." }).click();
    await expect(page.getByPlaceholder("Search contact...")).toBeVisible();
    
    // Create a new person
    const newPersonName = `Test Person ${Date.now()}`;
    await page.getByPlaceholder("Search contact...").fill(newPersonName);
    await page.getByRole("button", { name: `Create "${newPersonName}"` }).click();
    
    // Fill in person details
    await page.getByLabel("Email").fill("test@acme.com");
    await page.getByLabel("Title").fill("Developer");
    await page.getByRole("button", { name: "Save" }).click();
    
    // Verify person is created and selected
    await expect(page.getByText("Person created")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Search contact..." })).toContainText(newPersonName);
  });

  test("should create deal with existing company and person", async ({ page }) => {
    // Click "Add Deal" button
    await page.getByRole("button", { name: "Add Deal" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    // Fill in deal title
    const dealTitle = `Existing Test Deal ${Date.now()}`;
    await page.getByPlaceholder("Deal title").fill(dealTitle);
    
    // Select existing company
    await page.getByRole("combobox", { name: "Search company..." }).click();
    await page.getByPlaceholder("Search company...").fill("Acme");
    await page.getByRole("option", { name: "Acme" }).click();
    
    // Select existing person
    await page.getByRole("combobox", { name: "Search contact..." }).click();
    await page.getByPlaceholder("Search contact...").fill("John");
    await page.getByRole("option", { name: "John Smith" }).click();
    
    // Fill in deal details
    await page.getByPlaceholder("50000").fill("100000");
    await page.getByLabel("Tax %").fill("25");
    
    // Create the deal
    await page.getByRole("button", { name: "Create" }).click();
    
    // Verify deal is created
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Deal created")).toBeVisible();
    await expect(page.getByText(dealTitle)).toBeVisible();
  });
});
