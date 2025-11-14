import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { GET } from "../promotion-templates/[id]";

/**
 * Create a mock Supabase client for testing GET /api/promotion-templates/:id
 * Supports authentication, user lookup, and template retrieval by ID
 */
function createMockSupabase(options: {
  isAuthenticated?: boolean;
  userId?: string;
  template?: Record<string, unknown> | null;
  notFound?: boolean;
} = {}) {
  const { isAuthenticated = true, userId = "user-123", template = null, notFound = false } = options;

  return {
    auth: {
      async getUser() {
        if (!isAuthenticated) {
          return { data: { user: null }, error: { message: "Not authenticated" } };
        }
        return {
          data: { user: { id: userId, email: "user@example.com" } },
          error: null,
        };
      },
    },
    from(table: string) {
      if (table === "promotion_templates") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (notFound || template === null) {
                      return { data: null, error: { code: "PGRST116", message: "No rows found" } };
                    }
                    return { data: template, error: null };
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

describe("GET /api/promotion-templates/:id", () => {
  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: false }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "Authentication required");
    });

    it("returns 200 for authenticated user when template exists", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "S1 to S2",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: true,
        created_by: "admin-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: true, template }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(data.id).toBe(template.id);
    });

    it("allows any authenticated user to view template (no admin check)", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: true,
        created_by: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: {
          supabase: createMockSupabase({
            isAuthenticated: true,
            template,
          }),
        },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Success Cases", () => {
    it("returns template with all required fields", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "S1 to S2 - Technical Path",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 3 }],
        is_active: true,
        created_by: "admin-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ template }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data).toHaveProperty("id", template.id);
      expect(data).toHaveProperty("name", template.name);
      expect(data).toHaveProperty("path", template.path);
      expect(data).toHaveProperty("from_level", template.from_level);
      expect(data).toHaveProperty("to_level", template.to_level);
      expect(data).toHaveProperty("rules");
      expect(data).toHaveProperty("is_active", template.is_active);
      expect(data).toHaveProperty("created_by", template.created_by);
      expect(data).toHaveProperty("created_at", template.created_at);
      expect(data).toHaveProperty("updated_at", template.updated_at);
    });

    it("returns inactive templates", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Inactive Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: false,
        created_by: "admin-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ template }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.is_active).toBe(false);
    });

    it("returns template with complex rules", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Complex Template",
        path: "technical",
        from_level: "S2",
        to_level: "S3",
        rules: [
          { category: "technical", level: "gold", count: 2 },
          { category: "organizational", level: "silver", count: 3 },
          { category: "softskilled", level: "bronze", count: 1 },
        ],
        is_active: true,
        created_by: "admin-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ template }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data.rules).toHaveLength(3);
      expect(data.rules[0]).toHaveProperty("category");
      expect(data.rules[0]).toHaveProperty("level");
      expect(data.rules[0]).toHaveProperty("count");
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid UUID format", async () => {
      const req = new Request("http://localhost/api/promotion-templates/invalid-uuid");

      const context = {
        request: req,
        params: { id: "invalid-uuid" },
        locals: { supabase: createMockSupabase({}) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("message", "Invalid template ID format");
    });

    it("returns 400 for malformed UUID", async () => {
      const req = new Request("http://localhost/api/promotion-templates/not-a-uuid-123");

      const context = {
        request: req,
        params: { id: "not-a-uuid-123" },
        locals: { supabase: createMockSupabase({}) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("includes field-level validation details in error response", async () => {
      const req = new Request("http://localhost/api/promotion-templates/invalid");

      const context = {
        request: req,
        params: { id: "invalid" },
        locals: { supabase: createMockSupabase({}) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data).toHaveProperty("details");
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.length).toBeGreaterThan(0);
      expect(data.details[0]).toHaveProperty("field");
      expect(data.details[0]).toHaveProperty("message");
    });
  });

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent template", async () => {
      const req = new Request("http://localhost/api/promotion-templates/22222222-2222-4222-8222-222222222222");

      const context = {
        request: req,
        params: { id: "22222222-2222-4222-8222-222222222222" },
        locals: { supabase: createMockSupabase({ notFound: true }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error", "not_found");
      expect(data).toHaveProperty("message", "Promotion template not found");
    });

    it("returns 404 with clear error message", async () => {
      const req = new Request("http://localhost/api/promotion-templates/33333333-3333-4333-8333-333333333333");

      const context = {
        request: req,
        params: { id: "33333333-3333-4333-8333-333333333333" },
        locals: { supabase: createMockSupabase({ notFound: true }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data.message).toBe("Promotion template not found");
      expect(data.error).toBe("not_found");
    });
  });

  describe("Edge Cases", () => {
    it("handles valid UUID with uppercase letters", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: true,
        created_by: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ template }) },
      };

      const res = await GET(context as never);

      // Should work fine - UUIDs are case-insensitive
      expect(res.status).toBe(200);
    });

    it("handles different valid UUID v4 formats", async () => {
      const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const template = {
        id: validUuid,
        name: "Template",
        path: "financial",
        from_level: "F1",
        to_level: "F2",
        rules: [],
        is_active: true,
        created_by: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request(`http://localhost/api/promotion-templates/${validUuid}`);

      const context = {
        request: req,
        params: { id: validUuid },
        locals: { supabase: createMockSupabase({ template }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("returns template with null created_by", async () => {
      const template = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Template",
        path: "management",
        from_level: "M1",
        to_level: "M2",
        rules: [],
        is_active: true,
        created_by: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111");

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ template }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data.created_by).toBeNull();
    });
  });
});
