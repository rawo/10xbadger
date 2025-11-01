import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { DELETE } from "../promotions/[id]";

/**
 * Type for test context to avoid 'any' usage
 */
interface TestContext {
  request: Request;
  params: Record<string, string>;
  locals: { supabase: SupabaseClient };
}

/**
 * Creates a mock Supabase client for testing DELETE /api/promotions/:id endpoint
 */
function createMockSupabase(options: {
  testUser?: { id: string } | null;
  promotion?: Record<string, unknown> | null;
  shouldReturnUserError?: boolean;
  shouldReturnFetchError?: boolean;
  shouldReturnDeleteError?: boolean;
  fetchErrorCode?: string;
}) {
  const {
    testUser = { id: "test-user-123" },
    promotion = null,
    shouldReturnUserError = false,
    shouldReturnFetchError = false,
    shouldReturnDeleteError = false,
    fetchErrorCode = "PGRST116",
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
                    if (shouldReturnFetchError) {
                      return {
                        data: null,
                        error: { code: fetchErrorCode, message: "Promotion not found" },
                      };
                    }
                    return { data: promotion, error: null };
                  },
                };
              },
            };
          },
          delete() {
            return {
              eq() {
                return {
                  async then(callback: (result: { error: unknown | null }) => void) {
                    if (shouldReturnDeleteError) {
                      return callback({
                        error: { message: "Failed to delete promotion" },
                      });
                    }
                    return callback({ error: null });
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

describe("DELETE /api/promotions/:id", () => {
  describe("Success Cases", () => {
    it("returns 200 with success message when deleting draft promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: "Promotion deleted successfully" });
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid UUID format", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/invalid-uuid", {
          method: "DELETE",
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

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent promotion", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnFetchError: true,
        fetchErrorCode: "PGRST116",
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/550e8400-0000-0000-0000-000000000000", {
          method: "DELETE",
        }),
        params: { id: "550e8400-0000-0000-0000-000000000000" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
      expect(data.message).toBe("Promotion not found");
    });
  });

  describe("Authorization Cases", () => {
    it("returns 403 for non-draft promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "submitted",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
      expect(data.message).toBe("You do not have permission to delete this promotion");
    });

    it("returns 403 for promotion owned by different user", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "different-user-456",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
      expect(data.message).toBe("You do not have permission to delete this promotion");
    });

    it("uses generic error message for both ownership and status errors", async () => {
      // Test status error message
      const mockPromotionStatus = {
        id: "promo-123",
        status: "approved",
        created_by: "test-user-123",
      };

      const mockSupabaseStatus = createMockSupabase({
        promotion: mockPromotionStatus,
      });

      const contextStatus: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
        locals: { supabase: mockSupabaseStatus },
      };

      const responseStatus = await DELETE(contextStatus);
      const dataStatus = await responseStatus.json();

      // Test ownership error message
      const mockPromotionOwner = {
        id: "promo-456",
        status: "draft",
        created_by: "different-user-789",
      };

      const mockSupabaseOwner = createMockSupabase({
        promotion: mockPromotionOwner,
      });

      const contextOwner: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-456", {
          method: "DELETE",
        }),
        params: { id: "promo-456" },
        locals: { supabase: mockSupabaseOwner },
      };

      const responseOwner = await DELETE(contextOwner);
      const dataOwner = await responseOwner.json();

      // Both should return same generic message
      expect(dataStatus.message).toBe(dataOwner.message);
      expect(dataStatus.message).toBe("You do not have permission to delete this promotion");
    });
  });

  describe("Error Handling", () => {
    it("returns 500 when test user not found (development mode)", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnUserError: true,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
      expect(data.message).toContain("Test user not found");
    });

    it("returns 500 for database deletion errors", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        shouldReturnDeleteError: true,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
        locals: { supabase: mockSupabase },
      };

      const response = await DELETE(context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
      expect(data.message).toBe("Failed to delete promotion");
    });

    it("does not expose internal error details", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "test-user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        shouldReturnDeleteError: true,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions/promo-123", {
          method: "DELETE",
        }),
        params: { id: "promo-123" },
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
});
