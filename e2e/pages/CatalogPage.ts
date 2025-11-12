import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Catalog Badges Page
 *
 * Encapsulates interactions with the badge catalog including browsing,
 * filtering, and selecting badges for application.
 *
 * Usage:
 * const catalogPage = new CatalogPage(page);
 * await catalogPage.goto();
 * await catalogPage.selectFirstBadge();
 */
export class CatalogPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly badgeCards: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly levelFilter: Locator;
  readonly applyButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page elements
    this.pageHeading = page.locator("h1:has-text('Catalog')");
    this.badgeCards = page.locator('[data-testid="badge-card"], article').filter({
      hasText: /Apply|View/,
    });
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    this.categoryFilter = page.locator('select[name="category"], [aria-label*="Category"]');
    this.levelFilter = page.locator('select[name="level"], [aria-label*="Level"]');
    this.applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
  }

  /**
   * Navigate to the catalog page
   */
  async goto() {
    await this.page.goto("/catalog");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for catalog to load
   */
  async waitForLoad() {
    await this.pageHeading.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Search for badges by text
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Filter by category
   */
  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Filter by level
   */
  async filterByLevel(level: string) {
    await this.levelFilter.selectOption(level);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get the first badge card
   */
  async getFirstBadge(): Promise<Locator> {
    await this.badgeCards.first().waitFor({ state: "visible", timeout: 10000 });
    return this.badgeCards.first();
  }

  /**
   * Get badge card by title
   */
  getBadgeByTitle(title: string): Locator {
    return this.page.locator(`article:has-text("${title}"), [data-testid="badge-card"]:has-text("${title}")`);
  }

  /**
   * Click Apply button on first badge
   */
  async clickApplyOnFirstBadge() {
    const firstBadge = await this.getFirstBadge();
    const applyBtn = firstBadge.locator('button:has-text("Apply"), a:has-text("Apply")').first();
    await applyBtn.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click Apply button on specific badge
   */
  async clickApplyOnBadge(title: string) {
    const badge = this.getBadgeByTitle(title);
    const applyBtn = badge.locator('button:has-text("Apply"), a:has-text("Apply")').first();
    await applyBtn.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get badge title from first card
   */
  async getFirstBadgeTitle(): Promise<string> {
    const firstBadge = await this.getFirstBadge();
    const titleLocator = firstBadge.locator("h2, h3, [data-testid='badge-title']").first();
    return await titleLocator.textContent() || "";
  }

  /**
   * Get count of visible badges
   */
  async getBadgeCount(): Promise<number> {
    await this.page.waitForTimeout(1000); // Wait for any filtering to complete
    return await this.badgeCards.count();
  }

  /**
   * Assert catalog page is loaded
   */
  async assertPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
    await expect(this.badgeCards.first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the ID from the first badge's Apply button URL
   */
  async getFirstBadgeId(): Promise<string> {
    const firstBadge = await this.getFirstBadge();
    const applyBtn = firstBadge.locator('a:has-text("Apply"), button:has-text("Apply")').first();

    // Get the href if it's a link
    const href = await applyBtn.getAttribute("href");
    if (href) {
      const match = href.match(/catalog_badge_id=([a-f0-9-]+)/);
      if (match) {
        return match[1];
      }
    }

    // Otherwise, try to extract from onclick or data attribute
    const badgeId = await firstBadge.getAttribute("data-badge-id");
    if (badgeId) {
      return badgeId;
    }

    throw new Error("Could not extract badge ID from first badge");
  }
}
