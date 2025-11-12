import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Login Page
 *
 * This class encapsulates all interactions with the login page,
 * following the Page Object Model pattern for maintainable E2E tests.
 *
 * Usage:
 * const loginPage = new LoginPage(page);
 * await loginPage.goto();
 * await loginPage.login('user@example.com', 'password123');
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly showPasswordButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly appTitle: Locator;
  readonly cardTitle: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Locators for form elements
    this.emailInput = page.locator("input#email");
    this.passwordInput = page.locator("input#password");
    this.submitButton = page.locator('button[type="submit"]');
    this.showPasswordButton = page.locator('button[aria-label*="password"]');

    // Locators for navigation links
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.registerLink = page.locator('a[href="/register"]');

    // Locators for page content
    this.appTitle = page.locator('h1:has-text("10xbadger")');
    this.cardTitle = page.locator("text=Welcome Back");
    this.validationError = page.locator('[role="alert"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill in the email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in the password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with email and password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Navigate to forgot password page
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Navigate to registration page
   */
  async clickRegister() {
    await this.registerLink.click();
  }

  /**
   * Check if the page loaded correctly
   */
  async assertPageLoaded() {
    await expect(this.appTitle).toBeVisible();
    await expect(this.cardTitle).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Get the current URL
   */
  async getUrl() {
    return this.page.url();
  }

  /**
   * Check if validation error is visible
   */
  async assertValidationErrorVisible(errorText?: string) {
    await expect(this.validationError).toBeVisible();
    if (errorText) {
      await expect(this.validationError).toContainText(errorText);
    }
  }

  /**
   * Check if URL error parameter is present
   */
  async assertUrlHasError(errorCode: string) {
    const url = new URL(this.page.url());
    expect(url.searchParams.get("error")).toBe(errorCode);
  }

  /**
   * Check if URL message parameter is present
   */
  async assertUrlHasMessage(message: string) {
    const url = new URL(this.page.url());
    expect(url.searchParams.get("message")).toBe(message);
  }

  /**
   * Get the password input type (to verify password visibility toggle)
   */
  async getPasswordInputType() {
    return await this.passwordInput.getAttribute("type");
  }

  /**
   * Check if submit button is disabled
   */
  async assertSubmitButtonDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Check if submit button is enabled
   */
  async assertSubmitButtonEnabled() {
    await expect(this.submitButton).toBeEnabled();
  }
}
