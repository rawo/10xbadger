import { test, expect } from "@playwright/test";

/**
 * Example E2E test demonstrating basic Playwright usage
 * This test verifies the login page is accessible
 *
 * To run: pnpm test:e2e
 * To run with UI: pnpm test:e2e:ui
 */

test.describe("Example E2E Test", () => {
  test("should load the login page", async ({ page }) => {
    // Navigate to the login page
    await page.goto("/login");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check if the page title or a key element is present
    // TODO: Update these assertions based on your actual login page
    await expect(page).toHaveURL(/.*login/);
  });

  // Additional test example with Page Object Model
  // Uncomment and adapt as needed
  /*
  test("should display error on invalid login", async ({ page }) => {
    await page.goto("/login");

    // Fill in the login form
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit the form
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
  */
});
