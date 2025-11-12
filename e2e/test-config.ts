/**
 * E2E Test Configuration
 *
 * This file contains configuration for E2E tests including test user credentials
 * and test data identifiers.
 *
 * NOTE: These credentials should be set up in your test database/environment.
 * In production, use environment variables for sensitive data.
 */

export const TEST_USERS = {
  // Regular user credentials
  standardUser: {
    email: process.env.TEST_USER_EMAIL || "testuser@example.com",
    password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
    displayName: "Test User",
  },

  // Admin user credentials
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@example.com",
    password: process.env.TEST_ADMIN_PASSWORD || "AdminPassword123!",
    displayName: "Test Admin",
  },

  // Second standard user for multi-user scenarios
  standardUser2: {
    email: process.env.TEST_USER2_EMAIL || "testuser2@example.com",
    password: process.env.TEST_USER2_PASSWORD || "TestPassword123!",
    displayName: "Test User 2",
  },
};

export const TEST_DATA = {
  // Test badge IDs (should exist in test database)
  badges: {
    technicalGold: process.env.TEST_BADGE_TECHNICAL_GOLD || "badge-tech-gold-001",
    technicalSilver: process.env.TEST_BADGE_TECHNICAL_SILVER || "badge-tech-silver-001",
    organizationalBronze: process.env.TEST_BADGE_ORG_BRONZE || "badge-org-bronze-001",
  },

  // Test promotion template IDs
  promotionTemplates: {
    seniorEngineer: process.env.TEST_TEMPLATE_SENIOR || "template-senior-001",
  },
};

export const TEST_TIMEOUTS = {
  // Navigation timeout
  navigation: 10000,

  // API call timeout
  apiCall: 5000,

  // Form submission timeout
  formSubmission: 5000,

  // Modal animation timeout
  modalAnimation: 1000,
};

export const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
