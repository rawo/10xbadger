import { type Page } from "@playwright/test";
import { TEST_USERS, TEST_TIMEOUTS } from "../test-config";

/**
 * Authentication Helper for E2E Tests
 *
 * Provides reusable functions for logging in and out during E2E tests.
 * Uses Playwright's browser contexts to maintain session state.
 */

/**
 * Login as a standard user
 */
export async function loginAsUser(page: Page): Promise<void> {
  await login(page, TEST_USERS.standardUser.email, TEST_USERS.standardUser.password);
}

/**
 * Login as an admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
}

/**
 * Login with specific credentials
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill in credentials
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);

  // Submit form
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard (successful login)
  await page.waitForURL("/", { timeout: TEST_TIMEOUTS.navigation });

  // Wait for dashboard to load
  await page.waitForLoadState("networkidle");
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to logout endpoint
  await page.goto("/logout");

  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.navigation });

  // Verify we're on the login page
  await page.waitForLoadState("networkidle");
}

/**
 * Check if user is currently logged in by checking for dashboard access
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // If redirected to login, user is not logged in
  return !page.url().includes("/login");
}

/**
 * Setup authenticated session using browser context storage
 * This can be faster than logging in via UI for every test
 */
export async function setupAuthenticatedSession(
  page: Page,
  userType: "user" | "admin" = "user"
): Promise<void> {
  const credentials =
    userType === "admin" ? TEST_USERS.admin : TEST_USERS.standardUser;

  await login(page, credentials.email, credentials.password);
}
