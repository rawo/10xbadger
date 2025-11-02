import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { DELETE } from "../promotions/[id]/badges";

/**
 * Type for test context to avoid 'any' usage
 */
interface TestContext {
  request: Request;
  params: Record<string, string>;
  locals: { supabase: SupabaseClient };
}

/**
 * Creates a mock Supabase client for testing DELETE /api/promotions/:id/badges endpoint
 */
function createMockSupabase(options: {
  testUser?: { id: string } | null;
  promotion?: Record<string, unknown> | null;
  currentBadges?: { badge_application_id: string }[] | null;
  shouldReturnUserError?: boolean;
  shouldReturnPromotionError?: boolean;
  shouldReturnVerifyError?: boolean;
  shouldReturnDeleteError?: boolean;
  promotionErrorCode?: string;
}) {
  const {
    testUser = { id: "test-user-123" },
    promotion = null,
    currentBadges = null,
    shouldReturnUserError = false,
    shouldReturnPromotionError = false,
    shouldReturnVerifyError = false,
    shouldReturnDeleteError = false,
    promotionErrorCode = "PGRST116",
  } = options;

  return {
    from(table: string) {
      // Mock users table query (for getting test user)
      if (table === "users") {
        return {
          select() {
            return {
              limit() {
                return {
                  async single() {
                    if (shouldReturnUserError) {
                      return {
                        data: null,
                        error: { message: "User not found" },
                      };
                    }
                    return { data: testUser, error: null };
                  },
                };
              },
            };
          },
        };
      }

      // Mock promotions table query
      if (table === "promotions") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (shouldReturnPromotionError) {
                      return {
                        data: null,
                        error: { code: promotionErrorCode, message: "Promotion not found" },
                      };
                    }
                    return { data: promotion, error: null };
                  },
                };
              },
            };
          },
        };
      }

      // Mock promotion_badges table query
      if (table === "promotion_badges") {
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      async then(callback: (result: { data: unknown; error: unknown }) => void) {
                        if (shouldReturnVerifyError) {
                          return callback({
                            data: null,
                            error: { message: "Failed to verify badge assignments" },
                          });
                        }
                        return callback({ data: currentBadges, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
          delete() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      async then(callback: (result: { error: unknown | null }) => void) {
                        if (shouldReturnDeleteError) {
                          return callback({
                            error: { message: "Failed to remove badges from promotion" },
                          });
                        }
                        return callback({ error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      return {};
    },
  } as unknown as SupabaseClient;
}

describe("DELETE /api/promotions/:id/badges", () => {
  describe("Success Cases", () => {
    it("returns 200 with success message when removing single badge", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440001";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      const mockCurrentBadges = [{ badge_application_id: badgeId }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: "1 badge(s) removed successfully" });
    });

    it("returns 200 with success message when removing multiple badges", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440002";
      const badgeIds = [
        "650e8400-e29b-41d4-a716-446655440001",
        "650e8400-e29b-41d4-a716-446655440002",
        "650e8400-e29b-41d4-a716-446655440003",
      ];

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      const mockCurrentBadges = badgeIds.map((id) => ({ badge_application_id: id }));

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: badgeIds }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: "3 badge(s) removed successfully" });
    });
  });

  describe("Validation Errors - Path Parameter", () => {
    it("returns 400 for invalid UUID format in promotion ID", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/invalid-uuid/badges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: ["badge-1"] }),
        }),
        params: { id: "invalid-uuid" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("Invalid promotion ID format");
    });
  });

  describe("Validation Errors - Request Body", () => {
    it("returns 400 for missing request body", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-446655440000/badges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }),
        params: { id: "550e8400-e29b-41d4-a716-446655440000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toContain("Request body is required");
    });

    it("returns 400 for invalid JSON in request body", async () => {
      const mockSupabase = createMockSupabase({});

      // Create request with invalid JSON
      const request = new Request("http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-446655440000/badges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });

      const context: TestContext = {
        request,
        params: { id: "550e8400-e29b-41d4-a716-446655440000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
    });

    it("returns 400 for empty badge_application_ids array", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-446655440000/badges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [] }),
        }),
        params: { id: "550e8400-e29b-41d4-a716-446655440000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("Validation failed");
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      if (Array.isArray(data.details)) {
        expect(data.details[0].message).toContain("At least one badge application ID is required");
      }
    });

    it("returns 400 for invalid UUID format in badge_application_ids", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-446655440000/badges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: ["invalid-uuid"] }),
        }),
        params: { id: "550e8400-e29b-41d4-a716-446655440000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("Validation failed");
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      if (Array.isArray(data.details)) {
        expect(data.details[0].message).toContain("Invalid badge application ID format");
      }
    });

    it("returns 400 for missing badge_application_ids field", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-446655440000/badges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        params: { id: "550e8400-e29b-41d4-a716-446655440000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("Validation failed");
    });

    it("returns 400 for too many badges (> 100)", async () => {
      const mockSupabase = createMockSupabase({});

      // Create 101 valid UUIDs
      const tooManyBadges = Array.from(
        { length: 101 },
        (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`
      );

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-446655440000/badges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: tooManyBadges }),
        }),
        params: { id: "550e8400-e29b-41d4-a716-446655440000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("Validation failed");
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      if (Array.isArray(data.details)) {
        expect(data.details[0].message).toContain("Cannot remove more than 100 badges at once");
      }
    });
  });

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent promotion", async () => {
      const promotionId = "550e8400-0000-0000-0000-000000000000";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockSupabase = createMockSupabase({
        shouldReturnPromotionError: true,
        promotionErrorCode: "PGRST116",
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
      expect(data.message).toBe("Promotion not found");
    });

    it("returns 404 when badge is not in promotion", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440003";
      const badgeId = "650e8400-e29b-41d4-a716-446655440999";

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      // No badges currently in promotion
      const mockCurrentBadges: { badge_application_id: string }[] = [];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
      expect(data.message).toContain("is not assigned to this promotion");
    });
  });

  describe("Authorization Cases", () => {
    it("returns 403 when user does not own promotion", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440004";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "different-user-456",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
      expect(data.message).toBe("You do not have permission to modify this promotion");
    });

    it("returns 403 when promotion is not in draft status - submitted", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440005";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "submitted",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
      expect(data.message).toBe("Only draft promotions can be modified");
    });

    it("returns 403 when promotion is approved", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440006";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "approved",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
      expect(data.message).toBe("Only draft promotions can be modified");
    });

    it("returns 403 when promotion is rejected", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440007";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "rejected",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
      expect(data.message).toBe("Only draft promotions can be modified");
    });
  });

  describe("Error Handling", () => {
    it("returns 500 when test user not found (development mode)", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440008";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockSupabase = createMockSupabase({
        shouldReturnUserError: true,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
      expect(data.message).toContain("Test user not found");
    });

    it("returns 500 for database deletion errors", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440009";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      const mockCurrentBadges = [{ badge_application_id: badgeId }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
        shouldReturnDeleteError: true,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
      expect(data.message).toBe("Failed to remove badges from promotion");
    });

    it("does not expose internal error details", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440010";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      const mockCurrentBadges = [{ badge_application_id: badgeId }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
        shouldReturnDeleteError: true,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      // Should not include stack trace or detailed database error
      expect(data.message).not.toContain("stack");
      expect(data.message).not.toContain("query");
      expect(JSON.stringify(data)).not.toContain("PGRST");
    });
  });

  describe("Response Format", () => {
    it("returns proper JSON content type", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440011";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      const mockCurrentBadges = [{ badge_application_id: badgeId }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("includes proper message format in success response", async () => {
      const promotionId = "550e8400-e29b-41d4-a716-446655440012";
      const badgeIds = ["650e8400-e29b-41d4-a716-446655440001", "650e8400-e29b-41d4-a716-446655440002"];

      const mockPromotion = {
        id: promotionId,
        status: "draft",
        created_by: "test-user-123",
      };

      const mockCurrentBadges = badgeIds.map((id) => ({ badge_application_id: id }));

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: badgeIds }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(data).toHaveProperty("message");
      expect(data.message).toMatch(/^\d+ badge\(s\) removed successfully$/);
    });

    it("includes proper error format in error response", async () => {
      const promotionId = "550e8400-0000-0000-0000-000000000000";
      const badgeId = "650e8400-e29b-41d4-a716-446655440001";

      const mockSupabase = createMockSupabase({
        shouldReturnPromotionError: true,
      });

      const context: TestContext = {
        request: new Request(`http://localhost:3000/api/promotions/${promotionId}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: [badgeId] }),
        }),
        params: { id: promotionId },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("message");
      expect(typeof data.error).toBe("string");
      expect(typeof data.message).toBe("string");
    });
  });
});
