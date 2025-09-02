import { test, expect } from "@playwright/test";

test.describe("People Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to people page
    await page.goto("/people");
    await page.waitForLoadState("networkidle");
  });

  test("should render people list with search and filter", async ({ page }) => {
    // Check if we're on the people page
    await expect(page).toHaveURL(/\/people$/);
    
    // Verify page header exists
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    
    // Check for "Add Person" button
    await expect(page.getByRole("button", { name: "Add Person" })).toBeVisible();
    
    // Check for search input
    await expect(page.getByPlaceholder("Search people…")).toBeVisible();
    
    // Check for company filter dropdown
    await expect(page.getByRole("combobox", { name: "Filter by company" })).toBeVisible();
    
    // Check if table exists or empty state
    const table = page.locator("table");
    const emptyState = page.getByText("No people found");
    
    // Either table should be visible or empty state
    await expect(table.or(emptyState)).toBeVisible();
  });

  test("should create person via modal and display in table", async ({ page }) => {
    // Click "Add Person" button
    await page.getByRole("button", { name: "Add Person" }).click();
    
    // Wait for modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Person" })).toBeVisible();
    
    // Fill in person details
    const firstName = `Test`;
    const lastName = `Person ${Date.now()}`;
    await page.getByLabel("First Name *").fill(firstName);
    await page.getByLabel("Last Name *").fill(lastName);
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Phone").fill("+45 12345678");
    await page.getByLabel("Title").fill("Manager");
    
    // Select a company (required)
    await page.getByRole("combobox", { name: "Company *" }).click();
    await page.getByRole("option").first().click();
    
    // Submit the form
    await page.getByRole("button", { name: "Save" }).click();
    
    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();
    
    // Verify success toast appears
    await expect(page.getByText("Person created successfully")).toBeVisible();
    
    // Verify person appears in the table
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
    
    // Verify other details are visible
    await expect(page.getByText("test@example.com")).toBeVisible();
    await expect(page.getByText("Manager")).toBeVisible();
  });

  test("should search people", async ({ page }) => {
    // First create a person to search for
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    const searchFirstName = `Search`;
    const searchLastName = `Person ${Date.now()}`;
    await page.getByLabel("First Name *").fill(searchFirstName);
    await page.getByLabel("Last Name *").fill(searchLastName);
    await page.getByLabel("Email").fill("search@example.com");
    await page.getByLabel("Title").fill("Developer");
    
    // Select a company
    await page.getByRole("combobox", { name: "Company *" }).click();
    await page.getByRole("option").first().click();
    
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    
    // Search for the person by name
    await page.getByPlaceholder("Search people…").fill(searchFirstName);
    
    // Verify the person appears in search results
    await expect(page.getByText(`${searchFirstName} ${searchLastName}`)).toBeVisible();
    
    // Search by email
    await page.getByPlaceholder("Search people…").clear();
    await page.getByPlaceholder("Search people…").fill("search@example.com");
    await expect(page.getByText(`${searchFirstName} ${searchLastName}`)).toBeVisible();
    
    // Search by title
    await page.getByPlaceholder("Search people…").clear();
    await page.getByPlaceholder("Search people…").fill("Developer");
    await expect(page.getByText(`${searchFirstName} ${searchLastName}`)).toBeVisible();
    
    // Clear search and verify all people are visible again
    await page.getByPlaceholder("Search people…").clear();
    await expect(page.getByText(`${searchFirstName} ${searchLastName}`)).toBeVisible();
  });

  test("should filter people by company", async ({ page }) => {
    // First create a company and person to test filtering
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    const filterPersonName = `Filter Person ${Date.now()}`;
    await page.getByLabel("First Name *").fill("Filter");
    await page.getByLabel("Last Name *").fill(`Person ${Date.now()}`);
    await page.getByLabel("Email").fill("filter@example.com");
    
    // Select a company
    await page.getByRole("combobox", { name: "Company *" }).click();
    const firstCompany = page.getByRole("option").first();
    const companyName = await firstCompany.textContent();
    await firstCompany.click();
    
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    
    // Filter by the selected company
    await page.getByRole("combobox", { name: "Filter by company" }).click();
    await page.getByRole("option", { name: companyName }).click();
    
    // Verify the person appears in filtered results
    await expect(page.getByText("Filter")).toBeVisible();
    
    // Clear filter and verify all people are visible
    await page.getByRole("combobox", { name: "Filter by company" }).click();
    await page.getByRole("option", { name: "All companies" }).click();
    await expect(page.getByText("Filter")).toBeVisible();
  });

  test("should edit person", async ({ page }) => {
    // First create a person to edit
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    const originalFirstName = `Edit`;
    const originalLastName = `Person ${Date.now()}`;
    await page.getByLabel("First Name *").fill(originalFirstName);
    await page.getByLabel("Last Name *").fill(originalLastName);
    await page.getByLabel("Email").fill("edit@example.com");
    
    // Select a company
    await page.getByRole("combobox", { name: "Company *" }).click();
    await page.getByRole("option").first().click();
    
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    
    // Click edit button for the person
    await page.getByText(`${originalFirstName} ${originalLastName}`).first().click();
    await page.getByRole("button", { name: "Edit" }).first().click();
    
    // Wait for edit modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Person" })).toBeVisible();
    
    // Update person name
    const updatedFirstName = `${originalFirstName} Updated`;
    await page.getByLabel("First Name *").clear();
    await page.getByLabel("First Name *").fill(updatedFirstName);
    
    // Save changes
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    
    // Verify success toast
    await expect(page.getByText("Person updated successfully")).toBeVisible();
    
    // Verify updated name appears in table
    await expect(page.getByText(`${updatedFirstName} ${originalLastName}`)).toBeVisible();
  });
});
