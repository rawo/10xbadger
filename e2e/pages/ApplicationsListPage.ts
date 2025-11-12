import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Applications List Page
 *
 * Handles interactions with the applications list page at /applications
 *
 * Usage:
 * const listPage = new ApplicationsListPage(page);
 * await listPage.goto();
 * await listPage.filterByStatus('draft');
 */
export class ApplicationsListPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly applicationCards: Locator;
  readonly statusFilter: Locator;
  readonly newApplicationButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page elements
    this.pageHeading = page.locator("h1:has-text('Applications'), h1:has-text('My Applications')");
    this.applicationCards = page.locator('[data-testid="application-card"], article, .application-item');
    this.statusFilter = page.locator('select[name="status"], [aria-label*="Status"]');
    this.newApplicationButton = page.locator('a:has-text("New Application"), button:has-text("New Application")');
  }

  /**
   * Navigate to applications list page
   */
  async goto() {
    await this.page.goto("/applications");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Filter applications by status
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get application card by title or ID
   */
  getApplicationByTitle(title: string): Locator {
    return this.page.locator(`article:has-text("${title}"), [data-testid="application-card"]:has-text("${title}")`);
  }

  /**
   * Click on an application to view details
   */
  async clickApplication(title: string) {
    const card = this.getApplicationByTitle(title);
    await card.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get count of visible applications
   */
  async getApplicationCount(): Promise<number> {
    await this.page.waitForTimeout(1000);
    return await this.applicationCards.count();
  }

  /**
   * Assert page is loaded
   */
  async assertPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the first application card
   */
  async getFirstApplication(): Promise<Locator> {
    await this.applicationCards.first().waitFor({ state: "visible", timeout: 10000 });
    return this.applicationCards.first();
  }

  /**
   * Click first application
   */
  async clickFirstApplication() {
    const firstApp = await this.getFirstApplication();
    await firstApp.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Assert application with title exists
   */
  async assertApplicationExists(title: string) {
    const app = this.getApplicationByTitle(title);
    await expect(app).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get application status from card
   */
  async getApplicationStatus(title: string): Promise<string> {
    const card = this.getApplicationByTitle(title);
    const statusBadge = card.locator('[data-testid="status-badge"], .badge, [class*="status"]').first();
    const statusText = await statusBadge.textContent();
    return statusText?.toLowerCase().trim() || "";
  }
}
