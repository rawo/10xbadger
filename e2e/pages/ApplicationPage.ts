import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Badge Application Pages
 *
 * Handles interactions with application creation, editing, and viewing pages.
 * Covers /apply/new, /applications/[id]/edit, and /applications/[id] routes.
 *
 * Usage:
 * const appPage = new ApplicationPage(page);
 * await appPage.gotoNew(badgeId);
 * await appPage.fillApplication({ level: 'gold', reason: 'Test reason' });
 * await appPage.saveDraft();
 */
export class ApplicationPage {
  readonly page: Page;

  // Form fields
  readonly levelSelect: Locator;
  readonly reasonTextarea: Locator;
  readonly dateOfApplicationInput: Locator;
  readonly dateOfFulfillmentInput: Locator;

  // Action buttons
  readonly saveDraftButton: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  // Status and info
  readonly statusBadge: Locator;
  readonly badgeTitle: Locator;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form fields - using flexible selectors
    this.levelSelect = page.locator('select[name="level"], [aria-label*="Level"]').first();
    this.reasonTextarea = page.locator('textarea[name="reason"], textarea[placeholder*="reason"]').first();
    this.dateOfApplicationInput = page.locator('input[name="date_of_application"], input[type="date"]').first();
    this.dateOfFulfillmentInput = page.locator('input[name="date_of_fulfillment"], input[type="date"]').nth(1);

    // Action buttons
    this.saveDraftButton = page.locator('button:has-text("Save Draft"), button:has-text("Save as Draft")');
    this.submitButton = page.locator('button:has-text("Submit"), button[type="submit"]:has-text("Submit")');
    this.cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")');
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete")');

    // Status and info
    this.statusBadge = page.locator('[data-testid="status-badge"], .badge, [class*="status"]').first();
    this.badgeTitle = page.locator("h1, h2").first();
    this.pageHeading = page.locator("h1").first();
  }

  /**
   * Navigate to new application page for a specific badge
   */
  async gotoNew(catalogBadgeId: string) {
    await this.page.goto(`/apply/new?catalog_badge_id=${catalogBadgeId}`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to application detail page
   */
  async gotoDetail(applicationId: string) {
    await this.page.goto(`/applications/${applicationId}`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to application edit page
   */
  async gotoEdit(applicationId: string) {
    await this.page.goto(`/applications/${applicationId}/edit`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to applications list page
   */
  async gotoList() {
    await this.page.goto("/applications");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill application form fields
   */
  async fillApplication(data: {
    level?: string;
    reason?: string;
    dateOfApplication?: string;
    dateOfFulfillment?: string;
  }) {
    if (data.level) {
      await this.levelSelect.selectOption(data.level);
      await this.page.waitForTimeout(500); // Wait for any onChange handlers
    }

    if (data.reason) {
      await this.reasonTextarea.fill(data.reason);
      await this.page.waitForTimeout(500);
    }

    if (data.dateOfApplication) {
      await this.dateOfApplicationInput.fill(data.dateOfApplication);
      await this.page.waitForTimeout(500);
    }

    if (data.dateOfFulfillment) {
      await this.dateOfFulfillmentInput.fill(data.dateOfFulfillment);
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Save application as draft
   */
  async saveDraft() {
    await this.saveDraftButton.click();
    // Wait for save operation
    await this.page.waitForTimeout(2000);
  }

  /**
   * Submit application for review
   */
  async submit() {
    // Click submit button
    await this.submitButton.click();

    // Handle confirmation dialog if it appears
    this.page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Wait for submission
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click edit button
   */
  async clickEdit() {
    await this.editButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click delete button
   */
  async clickDelete() {
    // Handle confirmation dialog
    this.page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await this.deleteButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click cancel button
   */
  async clickCancel() {
    // Handle unsaved changes dialog if it appears
    this.page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await this.cancelButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get current application status
   */
  async getStatus(): Promise<string> {
    const statusText = await this.statusBadge.textContent();
    return statusText?.toLowerCase().trim() || "";
  }

  /**
   * Get application ID from URL
   */
  getIdFromUrl(): string | null {
    const url = this.page.url();
    const match = url.match(/\/applications\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Assert we're on the application editor page
   */
  async assertEditorPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
    await expect(this.levelSelect).toBeVisible({ timeout: 5000 });
    await expect(this.reasonTextarea).toBeVisible({ timeout: 5000 });
  }

  /**
   * Assert we're on the application detail page
   */
  async assertDetailPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
    await expect(this.statusBadge).toBeVisible({ timeout: 5000 });
  }

  /**
   * Assert edit button is visible
   */
  async assertEditButtonVisible() {
    await expect(this.editButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Assert edit button is NOT visible
   */
  async assertEditButtonNotVisible() {
    await expect(this.editButton).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Assert status matches expected value
   */
  async assertStatus(expectedStatus: string) {
    const status = await this.getStatus();
    expect(status).toContain(expectedStatus.toLowerCase());
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout = 5000) {
    const toastLocator = message
      ? this.page.locator(`[role="status"]:has-text("${message}"), .toast:has-text("${message}")`)
      : this.page.locator('[role="status"], .toast').first();

    await expect(toastLocator).toBeVisible({ timeout });
  }

  /**
   * Get form field value
   */
  async getReasonValue(): Promise<string> {
    return await this.reasonTextarea.inputValue();
  }

  /**
   * Get selected level
   */
  async getSelectedLevel(): Promise<string> {
    return await this.levelSelect.inputValue();
  }
}
