import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { POST } from "../promotion-templates/index";

/**
 * Create a mock Supabase client for testing POST /api/promotion-templates
 * Supports authentication, admin authorization, and template creation
 */
function createMockSupabase(options: {
  isAuthenticated?: boolean;
  userId?: string;
  isAdmin?: boolean;
  userNotFound?: boolean;
  templateConflict?: boolean;
} = {}) {
  const {
    isAuthenticated = true,
    userId = "admin-123",
    isAdmin = true,
    userNotFound = false,
    templateConflict = false,
  } = options;

  return {
    auth: {
      async getUser() {
        if (!isAuthenticated) {
          return { data: { user: null }, error: { message: "Not authenticated" } };
        }
        return {
          data: { user: { id: userId, email: "admin@example.com" } },
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
                    if (userNotFound) {
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
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          async limit() {
                            // Check for existing template (conflict)
                            if (templateConflict) {
                              return { data: [{ id: "existing-id" }], error: null };
                            }
                            return { data: [], error: null };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          insert(payload: unknown) {
            return {
              select() {
                return {
                  async single() {
                    if (templateConflict) {
                      return { data: null, error: { message: "Duplicate" } };
                    }
                    return {
                      data: {
                        id: "test-uuid",
                        ...((payload as Record<string, unknown>) || {}),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      // audit_logs table
      if (table === "audit_logs") {
        return {
          insert() {
            return Promise.resolve({ data: {}, error: null });
          },
        };
      }

      return {};
    },
  } as unknown as SupabaseClient;
}

describe("POST /api/promotion-templates", () => {
  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      const body = {
        name: "Test Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: false }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "Authentication required");
    });

    it("returns 401 when user is not found in database", async () => {
      const body = {
        name: "Test Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: true, userNotFound: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "User not found");
    });
  });

  describe("Authorization", () => {
    it("returns 403 when user is not admin", async () => {
      const body = {
        name: "Test Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: false }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toHaveProperty("error", "forbidden");
      expect(data).toHaveProperty("message", "Admin access required");
    });

    it("allows admin users to create templates", async () => {
      const body = {
        name: "Test Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(201);
    });
  });

  describe("Success Cases", () => {
    it("returns 201 for valid request", async () => {
      const body = {
        name: "Integration Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("id", "test-uuid");
      expect(data.name).toBe(body.name);
    });

    it("returns created template with all fields", async () => {
      const body = {
        name: "S1 to S2 - Technical Path",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [
          { category: "technical", level: "gold", count: 2 },
          { category: "organizational", level: "silver", count: 3 },
        ],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      const data = await res.json();

      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name", body.name);
      expect(data).toHaveProperty("path", body.path);
      expect(data).toHaveProperty("from_level", body.from_level);
      expect(data).toHaveProperty("to_level", body.to_level);
      expect(data).toHaveProperty("rules");
      expect(data).toHaveProperty("is_active");
      expect(data).toHaveProperty("created_by");
      expect(data).toHaveProperty("created_at");
      expect(data).toHaveProperty("updated_at");
    });

    it("accepts financial path templates", async () => {
      const body = {
        name: "F1 to F2",
        path: "financial",
        from_level: "F1",
        to_level: "F2",
        rules: [{ category: "organizational", level: "silver", count: 5 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(201);
    });

    it("accepts management path templates", async () => {
      const body = {
        name: "M1 to M2",
        path: "management",
        from_level: "M1",
        to_level: "M2",
        rules: [{ category: "organizational", level: "gold", count: 2 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(201);
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid body", async () => {
      const body = { name: "", path: "unknown", rules: [] };
      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("returns 400 for missing required fields", async () => {
      const body = { name: "Test" };
      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("details");
    });

    it("returns 400 for invalid path value", async () => {
      const body = {
        name: "Test",
        path: "invalid_path",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty rules array", async () => {
      const body = {
        name: "Test",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: "invalid json {",
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data.message).toContain("JSON");
    });
  });

  describe("Conflict Errors", () => {
    it("returns 409 when template already exists", async () => {
      const body = {
        name: "Duplicate Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [{ category: "technical", level: "gold", count: 1 }],
      };

      const req = new Request("http://localhost/api/promotion-templates", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: {},
        locals: { supabase: createMockSupabase({ isAdmin: true, templateConflict: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toHaveProperty("error", "conflict");
    });
  });
});
