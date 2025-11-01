import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { GET } from "../promotions/[id]";

/**
 * Type for test context to avoid 'any' usage
 */
interface TestContext {
  request: Request;
  params: Record<string, string>;
  locals: { supabase: SupabaseClient };
}

/**
 * Creates a mock Supabase client for testing GET /api/promotions/:id endpoint
 */
function createMockSupabase(options: {
  promotion?: Record<string, unknown> | null;
  shouldReturnError?: boolean;
  errorCode?: string;
}) {
  const { promotion = null, shouldReturnError = false, errorCode = "PGRST116" } = options;

  return {
    from(table: string) {
      if (table === "promotions") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (shouldReturnError) {
                      return {
                        data: null,
                        error: { code: errorCode, message: "Error occurred" },
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
      return {};
    },
  } as unknown as SupabaseClient;
}

describe("GET /api/promotions/:id", () => {
  describe("Success Cases", () => {
    it("returns 200 with promotion details when valid ID provided", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "submitted",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: "2025-01-22T16:30:00Z",
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "S1 to S2 - Technical Path",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [
            { category: "technical", level: "silver", count: 6 },
            { category: "any", level: "gold", count: 1 },
          ],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "John Doe",
          email: "john.doe@example.com",
        },
        promotion_badges: [
          {
            badge_applications: {
              id: "44444444-4444-4444-8444-444444444444",
              catalog_badge_id: "55555555-5555-4555-8555-555555555555",
              date_of_fulfillment: "2025-01-15",
              status: "used_in_promotion",
              catalog_badges: {
                id: "55555555-5555-4555-8555-555555555555",
                title: "React Expert",
                category: "technical",
                level: "silver",
              },
            },
          },
        ],
      };

      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ promotion: mockPromotion }) },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty("id", "11111111-1111-4111-8111-111111111111");
      expect(data).toHaveProperty("template");
      expect(data).toHaveProperty("badge_applications");
      expect(data).toHaveProperty("creator");
    });

    it("includes template details with typed rules array", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [{ category: "technical", level: "gold", count: 2 }],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Jane Smith",
          email: "jane@example.com",
        },
        promotion_badges: [],
      };

      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ promotion: mockPromotion }) },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.template).toBeDefined();
      expect(data.template.rules).toBeInstanceOf(Array);
      expect(data.template.rules).toHaveLength(1);
      expect(data.template.rules[0]).toHaveProperty("category");
      expect(data.template.rules[0]).toHaveProperty("level");
      expect(data.template.rules[0]).toHaveProperty("count");
    });

    it("includes badge applications with catalog badge summaries", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "John Doe",
          email: "john@example.com",
        },
        promotion_badges: [
          {
            badge_applications: {
              id: "44444444-4444-4444-8444-444444444444",
              catalog_badge_id: "55555555-5555-4555-8555-555555555555",
              date_of_fulfillment: "2025-01-15",
              status: "used_in_promotion",
              catalog_badges: {
                id: "55555555-5555-4555-8555-555555555555",
                title: "React Expert",
                category: "technical",
                level: "silver",
              },
            },
          },
          {
            badge_applications: {
              id: "66666666-6666-4666-8666-666666666666",
              catalog_badge_id: "77777777-7777-4777-8777-777777777777",
              date_of_fulfillment: "2025-01-20",
              status: "used_in_promotion",
              catalog_badges: {
                id: "77777777-7777-4777-8777-777777777777",
                title: "TypeScript Master",
                category: "technical",
                level: "gold",
              },
            },
          },
        ],
      };

      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ promotion: mockPromotion }) },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.badge_applications).toBeInstanceOf(Array);
      expect(data.badge_applications).toHaveLength(2);
      expect(data.badge_applications[0]).toHaveProperty("catalog_badge");
      expect(data.badge_applications[0].catalog_badge).toHaveProperty("id");
      expect(data.badge_applications[0].catalog_badge).toHaveProperty("title");
      expect(data.badge_applications[0].catalog_badge).toHaveProperty("category");
      expect(data.badge_applications[0].catalog_badge).toHaveProperty("level");
    });

    it("includes creator information", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "approved",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: "2025-01-22T16:30:00Z",
        approved_at: "2025-01-23T09:00:00Z",
        approved_by: "88888888-8888-4888-8888-888888888888",
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Alice Johnson",
          email: "alice.johnson@example.com",
        },
        promotion_badges: [],
      };

      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ promotion: mockPromotion }) },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.creator).toBeDefined();
      expect(data.creator).toHaveProperty("id", "33333333-3333-4333-8333-333333333333");
      expect(data.creator).toHaveProperty("display_name", "Alice Johnson");
      expect(data.creator).toHaveProperty("email", "alice.johnson@example.com");
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid UUID format", async () => {
      const req = new Request("http://localhost/api/promotions/invalid-uuid", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "invalid-uuid" },
        locals: { supabase: createMockSupabase({}) },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("message", "Invalid promotion ID format");
      expect(data).toHaveProperty("details");
      expect(data.details).toBeInstanceOf(Array);
    });

    it("returns 400 for malformed UUID", async () => {
      const req = new Request("http://localhost/api/promotions/123", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "123" },
        locals: { supabase: createMockSupabase({}) },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });
  });

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent promotion", async () => {
      const req = new Request("http://localhost/api/promotions/99999999-9999-4999-8999-999999999999", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "99999999-9999-4999-8999-999999999999" },
        locals: {
          supabase: createMockSupabase({
            promotion: null,
            shouldReturnError: true,
            errorCode: "PGRST116",
          }),
        },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data).toHaveProperty("error", "not_found");
      expect(data).toHaveProperty("message", "Promotion not found");
    });

    it("returns 404 when authorization filter prevents access", async () => {
      // In production, this would happen when a non-admin user tries to access
      // another user's promotion. The service returns null, and we return 404
      // to avoid information disclosure.
      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: {
          supabase: createMockSupabase({
            promotion: null,
            shouldReturnError: true,
            errorCode: "PGRST116",
          }),
        },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data).toHaveProperty("error", "not_found");
      expect(data).toHaveProperty("message", "Promotion not found");
    });
  });

  describe("Error Handling", () => {
    it("returns 500 for database connection errors", async () => {
      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: {
          supabase: createMockSupabase({
            shouldReturnError: true,
            errorCode: "CONNECTION_ERROR",
          }),
        },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data).toHaveProperty("error", "internal_error");
      expect(data).toHaveProperty("message");
    });

    it("does not expose internal error details", async () => {
      const req = new Request("http://localhost/api/promotions/11111111-1111-4111-8111-111111111111", {
        method: "GET",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: {
          supabase: createMockSupabase({
            shouldReturnError: true,
            errorCode: "DB_INTERNAL_ERROR",
          }),
        },
      } as unknown as TestContext;

      const res = await GET(context as never);
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data).toHaveProperty("error", "internal_error");
      expect(data.message).not.toContain("database");
      expect(data.message).not.toContain("query");
      expect(data).not.toHaveProperty("stack");
    });
  });
});
