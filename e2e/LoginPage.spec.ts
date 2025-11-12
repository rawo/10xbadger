import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

/**
 * E2E Tests for Login Page
 *
 * These tests verify the login functionality using the Page Object Model pattern.
 * The tests cover page rendering, form validation, and user interactions.
 *
 * To run: pnpm test:e2e
 * To run with UI: pnpm test:e2e:ui
 * To debug: pnpm test:e2e:debug
 */

test.describe("Login Page", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe("Page Rendering", () => {
    test("should load and display all login page elements", async () => {
      // Verify all key elements are visible
      await loginPage.assertPageLoaded();

      // Verify navigation links are present
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.registerLink).toBeVisible();

      // Verify form is interactive
      await loginPage.assertSubmitButtonEnabled();
    });

    test("should have correct page title", async ({ page }) => {
      await expect(page).toHaveTitle(/Sign In.*10xbadger/);
    });

    test("should display correct URL", async () => {
      const url = await loginPage.getUrl();
      expect(url).toContain("/login");
    });
  });

  test.describe("Form Validation", () => {
    test("should show validation error for empty email", async () => {
      // Leave email empty, fill password, and submit
      await loginPage.fillPassword("password123");
      await loginPage.submit();

      // Browser's built-in validation should prevent submission
      // The form should still be on the login page
      const url = await loginPage.getUrl();
      expect(url).toContain("/login");
    });

    test("should show validation error for invalid email format", async () => {
      // Fill invalid email format
      await loginPage.fillEmail("not-an-email");
      await loginPage.fillPassword("password123");
      await loginPage.submit();

      // Should show validation error or stay on page
      const url = await loginPage.getUrl();
      expect(url).toContain("/login");
    });

    test("should show validation error when both fields are empty", async () => {
      await loginPage.submit();

      // Should stay on login page
      const url = await loginPage.getUrl();
      expect(url).toContain("/login");
    });
  });

  test.describe("Password Visibility Toggle", () => {
    test("should toggle password visibility when clicking show/hide button", async () => {
      // Initially password should be hidden
      let passwordType = await loginPage.getPasswordInputType();
      expect(passwordType).toBe("password");

      // Click to show password
      await loginPage.togglePasswordVisibility();
      passwordType = await loginPage.getPasswordInputType();
      expect(passwordType).toBe("text");

      // Click to hide password again
      await loginPage.togglePasswordVisibility();
      passwordType = await loginPage.getPasswordInputType();
      expect(passwordType).toBe("password");
    });

    test("should have accessible aria-label for password toggle button", async () => {
      const ariaLabel = await loginPage.showPasswordButton.getAttribute("aria-label");
      expect(ariaLabel).toMatch(/password/i);
    });
  });

  test.describe("Form Interactions", () => {
    test("should allow typing in email field", async () => {
      const testEmail = "user@example.com";
      await loginPage.fillEmail(testEmail);

      const emailValue = await loginPage.emailInput.inputValue();
      expect(emailValue).toBe(testEmail);
    });

    test("should allow typing in password field", async () => {
      const testPassword = "mySecurePassword123";
      await loginPage.fillPassword(testPassword);

      const passwordValue = await loginPage.passwordInput.inputValue();
      expect(passwordValue).toBe(testPassword);
    });

    test("should have proper input attributes for accessibility", async () => {
      // Check email input attributes
      await expect(loginPage.emailInput).toHaveAttribute("type", "email");
      await expect(loginPage.emailInput).toHaveAttribute("required");
      await expect(loginPage.emailInput).toHaveAttribute("autocomplete", "email");

      // Check password input attributes
      await expect(loginPage.passwordInput).toHaveAttribute("required");
      await expect(loginPage.passwordInput).toHaveAttribute("autocomplete", "current-password");
    });
  });

  test.describe("Navigation Links", () => {
    test("should navigate to forgot password page", async ({ page }) => {
      await loginPage.clickForgotPassword();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/forgot-password");
    });

    test("should navigate to registration page", async ({ page }) => {
      await loginPage.clickRegister();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/register");
    });
  });

  test.describe("Error Handling", () => {
    test("should display error message from URL parameter", async ({ page }) => {
      // Navigate with error parameter
      await page.goto("/login?error=invalid_credentials");
      await page.waitForLoadState("networkidle");

      // Should display error alert
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test("should display success message from URL parameter", async ({ page }) => {
      // Navigate with message parameter
      await page.goto("/login?message=logged_out");
      await page.waitForLoadState("networkidle");

      // Should display success message
      await expect(page.locator('[role="status"]')).toBeVisible();
    });
  });

  // Note: Actual login flow test would require valid test credentials
  // and proper backend setup. This is commented out for reference:
  /*
  test.describe("Login Flow", () => {
    test("should successfully log in with valid credentials", async ({ page }) => {
      await loginPage.login("test@example.com", "validPassword123");

      // Wait for redirect after successful login
      await page.waitForURL("/", { timeout: 5000 });

      // Should redirect to home page
      expect(page.url()).toContain("/");
    });

    test("should show error with invalid credentials", async ({ page }) => {
      await loginPage.login("invalid@example.com", "wrongPassword");

      // Should redirect back to login with error
      await page.waitForURL(/login\?error=/, { timeout: 5000 });

      // Should display error message
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });
  });
  */
});
