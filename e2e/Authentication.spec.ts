import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { login, logout, isLoggedIn } from "./helpers/auth";
import { TEST_USERS, TEST_TIMEOUTS } from "./test-config";

/**
 * E2E Tests for Authentication Flow
 *
 * Tests cover user authentication scenarios including login, logout,
 * and access control as specified in the test plan.
 *
 * Test Plan Reference: Section 4.1 - Authentication and Authorization
 * - AUTH-01: Login using correct credentials
 * - AUTH-02: Login using incorrect password
 * - AUTH-03: Access protected page without authentication
 * - AUTH-04: Access admin panel as regular user
 * - AUTH-05: Logout from the system
 *
 * Prerequisites:
 * - Test users must be set up in the test database
 * - Application must be running at BASE_URL
 *
 * To run: pnpm test:e2e --grep "Authentication"
 */

test.describe("Authentication Flow", () => {
  let loginPage: LoginPage;

  test.describe("AUTH-01: Successful Login", () => {
    test("should log in with valid credentials and redirect to dashboard", async ({
      page,
    }) => {
      loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Login with valid credentials
      await loginPage.login(
        TEST_USERS.standardUser.email,
        TEST_USERS.standardUser.password
      );

      // Should redirect to dashboard
      await page.waitForURL("/", { timeout: TEST_TIMEOUTS.navigation });
      expect(page.url()).toContain("/");

      // Should see dashboard heading
      await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible({
        timeout: TEST_TIMEOUTS.navigation,
      });
    });
  });

  test.describe("AUTH-02: Failed Login", () => {
    test("should show error message with incorrect password", async ({
      page,
    }) => {
      loginPage = new LoginPage(page);

      await loginPage.goto();

      // Attempt login with wrong password
      await loginPage.login(
        TEST_USERS.standardUser.email,
        "WrongPassword123!"
      );

      // Should redirect back to login with error parameter
      await page.waitForURL(/\/login\?error=/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Should display error message
      await expect(page.locator('[role="alert"]')).toBeVisible({
        timeout: TEST_TIMEOUTS.formSubmission,
      });
    });

    test("should show error message with non-existent user", async ({
      page,
    }) => {
      loginPage = new LoginPage(page);

      await loginPage.goto();

      // Attempt login with non-existent user
      await loginPage.login("nonexistent@example.com", "SomePassword123!");

      // Should redirect back to login with error parameter
      await page.waitForURL(/\/login\?error=/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Should display error message
      await expect(page.locator('[role="alert"]')).toBeVisible({
        timeout: TEST_TIMEOUTS.formSubmission,
      });
    });
  });

  test.describe("AUTH-03: Protected Routes", () => {
    test("should redirect to login when accessing protected page without authentication", async ({
      page,
    }) => {
      // Try to access dashboard without being logged in
      await page.goto("/");

      // Should redirect to login page
      await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.navigation });
      expect(page.url()).toContain("/login");

      // Should see login form
      await expect(page.locator("h1:has-text('10xbadger')")).toBeVisible();
    });

    test("should redirect to login when accessing applications page without authentication", async ({
      page,
    }) => {
      // Try to access applications page without being logged in
      await page.goto("/applications");

      // Should redirect to login page
      await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.navigation });
      expect(page.url()).toContain("/login");
    });

    test("should redirect to login when accessing catalog without authentication", async ({
      page,
    }) => {
      // Try to access catalog page without being logged in
      await page.goto("/catalog");

      // Should redirect to login page
      await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.navigation });
      expect(page.url()).toContain("/login");
    });
  });

  test.describe("AUTH-04: Admin Access Control", () => {
    test("should deny access to admin panel for regular user", async ({
      page,
    }) => {
      // Login as regular user
      await login(page, TEST_USERS.standardUser.email, TEST_USERS.standardUser.password);

      // Try to access admin review page
      await page.goto("/admin/review");

      // Should redirect to unauthorized page or show error
      await page.waitForLoadState("networkidle");

      // Check if redirected to unauthorized page
      const url = page.url();
      const isUnauthorized =
        url.includes("/unauthorized") ||
        url.includes("/login") ||
        (await page.locator("text=/unauthorized|forbidden|access denied/i").count()) > 0;

      expect(isUnauthorized).toBeTruthy();
    });

    test("should allow access to admin panel for admin user", async ({
      page,
    }) => {
      // Skip this test if admin user is not set up
      // Remove .skip once admin user is configured

      // Login as admin user
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Navigate to admin review page
      await page.goto("/admin/review");
      await page.waitForLoadState("networkidle");

      // Should be on admin review page
      expect(page.url()).toContain("/admin/review");

      // Should see admin interface
      await expect(
        page.locator("h1:has-text('Review')")
      ).toBeVisible();
    });
  });

  test.describe("AUTH-05: Logout", () => {
    test("should logout successfully and redirect to login page", async ({
      page,
    }) => {
      // First, login
      await login(page, TEST_USERS.standardUser.email, TEST_USERS.standardUser.password);

      // Verify we're logged in
      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(true);

      // Logout
      await logout(page);

      // Should be redirected to login page
      expect(page.url()).toContain("/login");

      // Should see success message
      await expect(page.locator('[role="status"]')).toBeVisible({
        timeout: TEST_TIMEOUTS.formSubmission,
      });

      // Should no longer be able to access protected pages
      await page.goto("/");
      await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.navigation });
      expect(page.url()).toContain("/login");
    });

    test("should clear session after logout", async ({ page }) => {
      // Login
      await login(page, TEST_USERS.standardUser.email, TEST_USERS.standardUser.password);

      // Navigate to dashboard
      await page.goto("/");
      await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();

      // Logout
      await logout(page);

      // Try to navigate back to dashboard
      await page.goto("/");

      // Should be redirected to login
      await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.navigation });
      expect(page.url()).toContain("/login");
    });
  });
});
