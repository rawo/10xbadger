import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { GET } from "../promotion-templates/index";

/**
 * Create a mock Supabase client for testing GET /api/promotion-templates
 * Supports authentication, user lookup, and template listing with filters
 */
function createMockSupabase(
  options: {
    isAuthenticated?: boolean;
    userId?: string;
    isAdmin?: boolean;
    templates?: Record<string, unknown>[];
    totalCount?: number;
  } = {}
) {
  const {
    isAuthenticated = true,
    userId = "user-123",
    isAdmin = false,
    templates = [],
    totalCount = templates.length,
  } = options;

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
      if (table === "users") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (!isAuthenticated) {
                      return { data: null, error: { message: "User not found" } };
                    }
                    return { data: { id: userId, is_admin: isAdmin }, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "promotion_templates") {
        let filteredTemplates = [...templates];

        return {
          select(columns?: string, opts?: { count?: string; head?: boolean }) {
            // Handle count query
            if (opts?.head && opts?.count === "exact") {
              return {
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      eq: () => Promise.resolve({ count: totalCount, error: null }),
                    }),
                  }),
                }),
              };
            }

            // Return data query chain
            const chain = {
              eq(field: string, value: unknown) {
                filteredTemplates = filteredTemplates.filter((t) => t[field] === value);
                return chain;
              },
              order() {
                return chain;
              },
              range(from: number, to: number) {
                filteredTemplates = filteredTemplates.slice(from, to + 1);
                return chain;
              },
              then(resolve: (result: { data: unknown; error: null }) => void) {
                resolve({ data: filteredTemplates, error: null });
              },
            };

            return chain;
          },
        };
      }

      return {};
    },
  } as unknown as SupabaseClient;
}

describe("GET /api/promotion-templates", () => {
  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = new Request("http://localhost/api/promotion-templates");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: false }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "Authentication required");
    });

    it("returns 200 for authenticated user", async () => {
      const templates = [
        {
          id: "tpl-1",
          name: "S1 to S2",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
          created_by: "admin-1",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const req = new Request("http://localhost/api/promotion-templates");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: true, templates, totalCount: 1 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("pagination");
    });

    it("allows any authenticated user to view templates (no admin check)", async () => {
      const templates = [
        {
          id: "tpl-1",
          name: "Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
          created_by: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const req = new Request("http://localhost/api/promotion-templates");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: false, templates, totalCount: 1 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Success Cases", () => {
    it("returns paginated response with correct structure", async () => {
      const templates = [
        {
          id: "tpl-1",
          name: "S1 to S2",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [{ category: "technical", level: "silver", count: 6 }],
          is_active: true,
          created_by: "admin-1",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const req = new Request("http://localhost/api/promotion-templates");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates, totalCount: 1 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data).toHaveProperty("pagination");
      expect(data.pagination).toHaveProperty("total");
      expect(data.pagination).toHaveProperty("limit");
      expect(data.pagination).toHaveProperty("offset");
      expect(data.pagination).toHaveProperty("has_more");
    });

    it("returns empty array when no templates exist", async () => {
      const req = new Request("http://localhost/api/promotion-templates");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.has_more).toBe(false);
    });

    it("returns templates with all required fields", async () => {
      const templates = [
        {
          id: "tpl-1",
          name: "S1 to S2 - Technical",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [{ category: "technical", level: "gold", count: 3 }],
          is_active: true,
          created_by: "admin-1",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const req = new Request("http://localhost/api/promotion-templates");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates, totalCount: 1 }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data.data[0]).toHaveProperty("id");
      expect(data.data[0]).toHaveProperty("name");
      expect(data.data[0]).toHaveProperty("path");
      expect(data.data[0]).toHaveProperty("from_level");
      expect(data.data[0]).toHaveProperty("to_level");
      expect(data.data[0]).toHaveProperty("rules");
      expect(data.data[0]).toHaveProperty("is_active");
      expect(data.data[0]).toHaveProperty("created_by");
      expect(data.data[0]).toHaveProperty("created_at");
      expect(data.data[0]).toHaveProperty("updated_at");
    });
  });

  describe("Query Parameters - Filtering", () => {
    it("accepts path filter parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?path=technical");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts from_level filter parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?from_level=S1");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts to_level filter parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?to_level=S2");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts is_active filter parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?is_active=false");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts multiple filter parameters", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates?path=technical&from_level=S1&to_level=S2&is_active=true"
      );

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Query Parameters - Pagination", () => {
    it("accepts limit parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?limit=10");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts offset parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?offset=20");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("returns pagination metadata", async () => {
      const templates = Array.from({ length: 10 }, (_, i) => ({
        id: `tpl-${i}`,
        name: `Template ${i}`,
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: true,
        created_by: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }));

      const req = new Request("http://localhost/api/promotion-templates?limit=10&offset=0");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates, totalCount: 10 }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data.pagination).toHaveProperty("has_more");
      expect(data.pagination).toHaveProperty("total");
      expect(data.pagination).toHaveProperty("limit");
      expect(data.pagination).toHaveProperty("offset");
    });
  });

  describe("Query Parameters - Sorting", () => {
    it("accepts sort parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?sort=created_at");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts order parameter", async () => {
      const req = new Request("http://localhost/api/promotion-templates?order=desc");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });

    it("accepts both sort and order parameters", async () => {
      const req = new Request("http://localhost/api/promotion-templates?sort=name&order=asc");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid path value", async () => {
      const req = new Request("http://localhost/api/promotion-templates?path=invalid_path");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("message", "Invalid query parameters");
    });

    it("returns 400 for invalid limit (too high)", async () => {
      const req = new Request("http://localhost/api/promotion-templates?limit=200");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("returns 400 for invalid limit (negative)", async () => {
      const req = new Request("http://localhost/api/promotion-templates?limit=-1");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("returns 400 for invalid offset (negative)", async () => {
      const req = new Request("http://localhost/api/promotion-templates?offset=-5");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("includes validation details in error response", async () => {
      const req = new Request("http://localhost/api/promotion-templates?path=invalid&limit=1000");

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ templates: [], totalCount: 0 }) },
      };

      const res = await GET(context as never);
      const data = await res.json();

      expect(data).toHaveProperty("details");
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.length).toBeGreaterThan(0);
    });
  });
});
