import { test, expect } from "@playwright/test";
import { CatalogPage } from "./pages/CatalogPage";
import { ApplicationPage } from "./pages/ApplicationPage";
import { ApplicationsListPage } from "./pages/ApplicationsListPage";
import { loginAsUser } from "./helpers/auth";
import { TEST_TIMEOUTS } from "./test-config";

/**
 * E2E Tests for Badge Application Lifecycle
 *
 * Tests cover the complete badge application flow from creation to submission
 * as specified in the test plan.
 *
 * Test Plan Reference: Section 4.2 - Badge Application Lifecycle
 * - BA-01: Create and save a draft application
 * - BA-02: Edit and submit a draft for review
 * - BA-03: Admin accepts application (requires admin user)
 * - BA-04: Admin rejects application (requires admin user)
 * - BA-05: Attempt to edit non-draft application
 * - BA-06: Non-accepted badges not visible in promotion builder
 *
 * Prerequisites:
 * - Test user must be set up (see e2e/SETUP.md)
 * - At least one active badge in the catalog
 * - Application must be running at BASE_URL
 *
 * To run: pnpm test:e2e --grep "Badge Application"
 */

test.describe("Badge Application Lifecycle", () => {
  let catalogPage: CatalogPage;
  let applicationPage: ApplicationPage;
  let listPage: ApplicationsListPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    applicationPage = new ApplicationPage(page);
    listPage = new ApplicationsListPage(page);
  });

  test.describe("BA-01: Create and Save Draft", () => {
    test.skip("should create a new badge application and save as draft", async ({ page }) => {
      // Login as standard user
      await loginAsUser(page);

      // Navigate to catalog
      await catalogPage.goto();
      await catalogPage.assertPageLoaded();

      // Get first badge ID
      let badgeId: string;
      try {
        badgeId = await catalogPage.getFirstBadgeId();
      } catch {
        // If we can't get ID from button, click the apply button directly
        await catalogPage.clickApplyOnFirstBadge();
        badgeId = ""; // We'll get it from URL later
      }

      // If we have the badge ID, navigate directly
      if (badgeId) {
        await applicationPage.gotoNew(badgeId);
      }

      // Verify we're on the application editor page
      await applicationPage.assertEditorPageLoaded();

      // Fill application form
      const today = new Date().toISOString().split("T")[0];
      await applicationPage.fillApplication({
        level: "gold",
        reason: "E2E Test: Created draft application for testing purposes",
        dateOfApplication: today,
      });

      // Save as draft
      await applicationPage.saveDraft();

      // Wait for save confirmation (toast or navigation)
      await page.waitForTimeout(TEST_TIMEOUTS.formSubmission);

      // Should have an application ID in URL or be redirected
      const applicationId = applicationPage.getIdFromUrl();

      // Verify we can navigate to applications list and see the draft
      await listPage.goto();
      await listPage.assertPageLoaded();

      // Filter by draft status
      await listPage.filterByStatus("draft");

      // Should see at least one draft application
      const draftCount = await listPage.getApplicationCount();
      expect(draftCount).toBeGreaterThan(0);
    });
  });

  test.describe("BA-02: Edit and Submit Draft", () => {
    test.skip("should edit a draft application and submit for review", async ({ page }) => {
      // Login as standard user
      await loginAsUser(page);

      // Navigate to applications list
      await listPage.goto();
      await listPage.filterByStatus("draft");

      // Click on first draft application
      await listPage.clickFirstApplication();

      // Verify we're on detail page
      await applicationPage.assertDetailPageLoaded();
      await applicationPage.assertStatus("draft");

      // Click edit button
      await applicationPage.clickEdit();

      // Verify we're on edit page
      await applicationPage.assertEditorPageLoaded();

      // Update the reason
      await applicationPage.fillApplication({
        reason: "E2E Test: Updated draft and submitting for review",
      });

      // Submit the application
      await applicationPage.submit();

      // Wait for submission
      await page.waitForTimeout(TEST_TIMEOUTS.formSubmission);

      // Should be redirected to detail page or see success message
      await page.waitForLoadState("networkidle");

      // Verify status changed to submitted
      const url = page.url();
      if (url.includes("/applications/")) {
        await applicationPage.assertStatus("submitted");
      }

      // Navigate back to list and verify status
      await listPage.goto();
      await listPage.filterByStatus("submitted");

      // Should see at least one submitted application
      const submittedCount = await listPage.getApplicationCount();
      expect(submittedCount).toBeGreaterThan(0);
    });
  });

  test.describe("BA-05: Prevent Editing Non-Draft Applications", () => {
    test.skip("should not allow editing a submitted application", async ({ page }) => {
      // Login as standard user
      await loginAsUser(page);

      // Navigate to submitted applications
      await listPage.goto();
      await listPage.filterByStatus("submitted");

      // Check if there are any submitted applications
      const submittedCount = await listPage.getApplicationCount();

      if (submittedCount === 0) {
        test.skip();
        return;
      }

      // Click on first submitted application
      await listPage.clickFirstApplication();

      // Verify we're on detail page
      await applicationPage.assertDetailPageLoaded();
      await applicationPage.assertStatus("submitted");

      // Edit button should NOT be visible for submitted applications
      await applicationPage.assertEditButtonNotVisible();
    });

    test.skip("should not allow editing an accepted application", async ({ page }) => {
      // Login as standard user
      await loginAsUser(page);

      // Navigate to accepted applications
      await listPage.goto();
      await listPage.filterByStatus("accepted");

      // Check if there are any accepted applications
      const acceptedCount = await listPage.getApplicationCount();

      if (acceptedCount === 0) {
        test.skip();
        return;
      }

      // Click on first accepted application
      await listPage.clickFirstApplication();

      // Verify we're on detail page
      await applicationPage.assertDetailPageLoaded();
      await applicationPage.assertStatus("accepted");

      // Edit button should NOT be visible for accepted applications
      await applicationPage.assertEditButtonNotVisible();
    });

    test.skip("should not allow editing a rejected application", async ({ page }) => {
      // Login as standard user
      await loginAsUser(page);

      // Navigate to rejected applications
      await listPage.goto();
      await listPage.filterByStatus("rejected");

      // Check if there are any rejected applications
      const rejectedCount = await listPage.getApplicationCount();

      if (rejectedCount === 0) {
        test.skip();
        return;
      }

      // Click on first rejected application
      await listPage.clickFirstApplication();

      // Verify we're on detail page
      await applicationPage.assertDetailPageLoaded();
      await applicationPage.assertStatus("rejected");

      // Edit button should NOT be visible for rejected applications
      await applicationPage.assertEditButtonNotVisible();
    });
  });

  test.describe("BA-03 & BA-04: Admin Review (Accept/Reject)", () => {
    test.skip("BA-03: admin should accept a submitted application", async ({ page }) => {
      // This test requires admin user - see e2e/SETUP.md
      // TODO: Implement after admin user is set up
      test.skip();
    });

    test.skip("BA-04: admin should reject a submitted application with reason", async ({ page }) => {
      // This test requires admin user - see e2e/SETUP.md
      // TODO: Implement after admin user is set up
      test.skip();
    });
  });

  test.describe("BA-06: Badge Availability for Promotions", () => {
    test.skip("should only show accepted badges in promotion builder", async ({ page }) => {
      // This test requires:
      // 1. User with accepted badges
      // 2. Access to promotion builder
      // TODO: Implement after promotion builder is accessible
      test.skip();
    });
  });
});
