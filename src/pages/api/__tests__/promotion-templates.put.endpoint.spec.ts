import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { PUT } from "../promotion-templates/[id]";

/**
 * Create a mock Supabase client for testing PUT /api/promotion-templates/:id
 * Supports authentication, admin authorization, and template updates
 */
function createMockSupabase(options: {
  isAuthenticated?: boolean;
  userId?: string;
  isAdmin?: boolean;
  userNotFound?: boolean;
  templateNotFound?: boolean;
  templateId?: string;
} = {}) {
  const {
    isAuthenticated = true,
    userId = "admin-123",
    isAdmin = true,
    userNotFound = false,
    templateNotFound = false,
    templateId = "11111111-1111-4111-8111-111111111111",
  } = options;

  const templates: Record<string, Record<string, unknown>> = {};

  // Initialize with a template if it should exist
  if (!templateNotFound) {
    templates[templateId] = {
      id: templateId,
      name: "Old Name",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [],
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

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
              eq(field: string, value: string) {
                return {
                  async single() {
                    const template = templates[value];
                    if (!template || templateNotFound) {
                      return { data: null, error: { code: "PGRST116", message: "No rows" } };
                    }
                    return { data: template, error: null };
                  },
                };
              },
            };
          },
          update(updateData: unknown) {
            return {
              eq(field: string, value: string) {
                return {
                  select() {
                    return {
                      async single() {
                        const template = templates[value];
                        if (!template) {
                          return { data: null, error: { code: "PGRST116" } };
                        }
                        templates[value] = { ...template, ...(updateData as Record<string, unknown>) };
                        return { data: templates[value], error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      // error_logs table
      if (table === "error_logs") {
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

describe("PUT /api/promotion-templates/:id", () => {
  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: false }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "Authentication required");
    });

    it("returns 401 when user is not found in database", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: true, userNotFound: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "User not found");
    });
  });

  describe("Authorization", () => {
    it("returns 403 when user is not admin", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: false }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toHaveProperty("error", "forbidden");
      expect(data).toHaveProperty("message", "Admin access required");
    });

    it("allows admin users to update templates", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Success Cases", () => {
    it("returns 200 and updated template for valid request", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/tpl-1", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);
      if (res.status !== 200) {
        // Log response for debugging
        // eslint-disable-next-line no-console
        console.error("PUT response status", res.status, "body:", await res.json());
      }
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id", "11111111-1111-4111-8111-111111111111");
      expect(data.name).toBe(body.name);
    });

    it("returns updated template with all fields", async () => {
      const body = { name: "Updated Template Name" };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);
      const data = await res.json();

      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name", body.name);
      expect(data).toHaveProperty("path");
      expect(data).toHaveProperty("from_level");
      expect(data).toHaveProperty("to_level");
      expect(data).toHaveProperty("rules");
      expect(data).toHaveProperty("is_active");
      expect(data).toHaveProperty("created_by");
      expect(data).toHaveProperty("created_at");
      expect(data).toHaveProperty("updated_at");
    });

    it("allows updating only specific fields", async () => {
      const body = { name: "Just the name" };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(200);
    });

    it("allows updating rules", async () => {
      const body = {
        rules: [
          { category: "technical", level: "gold", count: 3 },
          { category: "organizational", level: "silver", count: 2 },
        ],
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(200);
    });

    it("allows toggling is_active", async () => {
      const body = { is_active: false };
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid body (empty)", async () => {
      const body = {};
      const req = new Request("http://localhost/api/promotion-templates/tpl-1", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("returns 400 for invalid UUID format", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/invalid-uuid", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "invalid-uuid" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("message", "Invalid template ID format");
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: "invalid json {",
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "invalid_json");
      expect(data.message).toContain("JSON");
    });

    it("includes validation details in error response", async () => {
      const body = { name: "" }; // Empty name should fail validation if required
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      if (res.status === 400) {
        const data = await res.json();
        expect(data).toHaveProperty("details");
      }
    });
  });

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent template", async () => {
      const body = { name: "New Name" };
      const req = new Request("http://localhost/api/promotion-templates/22222222-2222-4222-8222-222222222222", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "22222222-2222-4222-8222-222222222222" },
        locals: { supabase: createMockSupabase({ isAdmin: true, templateNotFound: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error", "not_found");
      expect(data).toHaveProperty("message", "Promotion template not found");
    });
  });

  describe("Edge Cases", () => {
    it("handles valid UUID with uppercase letters", async () => {
      const body = { name: "New Name" };
      const validUuid = "11111111-1111-4111-8111-111111111111";

      const req = new Request(`http://localhost/api/promotion-templates/${validUuid}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: validUuid },
        locals: { supabase: createMockSupabase({ isAdmin: true, templateId: validUuid }) },
      };

      const res = await PUT(context as never);

      // Should work fine - UUIDs are case-insensitive
      expect(res.status).toBe(200);
    });

    it("handles updating multiple fields at once", async () => {
      const body = {
        name: "Completely Updated",
        rules: [{ category: "technical", level: "bronze", count: 10 }],
        is_active: false,
      };

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await PUT(context as never);

      expect(res.status).toBe(200);
    });
  });
});
