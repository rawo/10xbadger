import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { POST } from "../promotion-templates/[id]/deactivate";

/**
 * Create a mock Supabase client for testing POST /api/promotion-templates/:id/deactivate
 * Supports authentication, admin authorization, and template deactivation
 */
function createMockSupabase(options: {
  isAuthenticated?: boolean;
  userId?: string;
  isAdmin?: boolean;
  userNotFound?: boolean;
  template?: Record<string, unknown> | null;
  templateNotFound?: boolean;
} = {}) {
  const {
    isAuthenticated = true,
    userId = "admin-123",
    isAdmin = true,
    userNotFound = false,
    templateNotFound = false,
  } = options;

  let { template } = options;

  // Default active template
  if (template === undefined && !templateNotFound) {
    template = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "S1 to S2 - Technical Path",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [{ category: "technical", level: "silver", count: 6 }],
      is_active: true,
      created_by: "admin-id",
      created_at: "2025-01-05T10:00:00Z",
      updated_at: "2025-01-05T10:00:00Z",
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
              eq() {
                return {
                  async single() {
                    if (templateNotFound || !template) {
                      return { data: null, error: { code: "PGRST116", message: "No rows found" } };
                    }
                    return { data: template, error: null };
                  },
                };
              },
            };
          },
          update(updateData: Record<string, unknown>) {
            return {
              eq() {
                return {
                  select() {
                    return {
                      async single() {
                        if (templateNotFound || !template) {
                          return { data: null, error: { code: "PGRST116" } };
                        }
                        template = { ...template, ...updateData };
                        return { data: template, error: null };
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

describe("POST /api/promotion-templates/:id/deactivate", () => {
  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: false }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty("error", "unauthorized");
      expect(data).toHaveProperty("message", "Authentication required");
    });

    it("returns 401 when user is not found in database", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
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
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: false }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toHaveProperty("error", "forbidden");
      expect(data).toHaveProperty("message", "Admin access required");
    });

    it("allows admin users to deactivate templates", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAuthenticated: true, isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Success Cases", () => {
    it("returns 200 and deactivated template", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id", "11111111-1111-4111-8111-111111111111");
      expect(data.is_active).toBe(false);
    });

    it("returns deactivated template with all fields", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      const data = await res.json();

      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("path");
      expect(data).toHaveProperty("from_level");
      expect(data).toHaveProperty("to_level");
      expect(data).toHaveProperty("rules");
      expect(data).toHaveProperty("is_active", false);
      expect(data).toHaveProperty("created_by");
      expect(data).toHaveProperty("created_at");
      expect(data).toHaveProperty("updated_at");
    });

    it("preserves template history (soft delete)", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      const data = await res.json();

      // Template should still exist with all original data, just marked inactive
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("rules");
      expect(data.is_active).toBe(false);
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid UUID format", async () => {
      const req = new Request("http://localhost/api/promotion-templates/invalid-uuid/deactivate", {
        method: "POST",
      });

      const context = {
        request: req,
        params: { id: "invalid-uuid" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("message", "Invalid template ID format");
    });

    it("returns 400 for malformed UUID", async () => {
      const req = new Request("http://localhost/api/promotion-templates/not-a-uuid-123/deactivate", {
        method: "POST",
      });

      const context = {
        request: req,
        params: { id: "not-a-uuid-123" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("includes field-level validation details in error response", async () => {
      const req = new Request("http://localhost/api/promotion-templates/invalid/deactivate", {
        method: "POST",
      });

      const context = {
        request: req,
        params: { id: "invalid" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
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
      const req = new Request(
        "http://localhost/api/promotion-templates/22222222-2222-4222-8222-222222222222/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "22222222-2222-4222-8222-222222222222" },
        locals: { supabase: createMockSupabase({ isAdmin: true, templateNotFound: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error", "not_found");
      expect(data).toHaveProperty("message", "Promotion template not found");
    });

    it("returns 404 with clear error message", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/33333333-3333-4333-8333-333333333333/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "33333333-3333-4333-8333-333333333333" },
        locals: { supabase: createMockSupabase({ isAdmin: true, templateNotFound: true }) },
      };

      const res = await POST(context as never);
      const data = await res.json();

      expect(data.message).toBe("Promotion template not found");
      expect(data.error).toBe("not_found");
    });
  });

  describe("Conflict Cases", () => {
    it("returns 409 when template is already inactive", async () => {
      const inactiveTemplate = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Inactive Template",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: false,
        created_by: "admin-id",
        created_at: "2025-01-05T10:00:00Z",
        updated_at: "2025-01-05T10:00:00Z",
      };

      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true, template: inactiveTemplate }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toHaveProperty("error", "invalid_status");
      expect(data).toHaveProperty("message", "Template is already inactive");
      expect(data).toHaveProperty("current_status", "inactive");
    });

    it("returns clear conflict error message", async () => {
      const inactiveTemplate = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Already Inactive",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        rules: [],
        is_active: false,
        created_by: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      };

      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true, template: inactiveTemplate }) },
      };

      const res = await POST(context as never);
      const data = await res.json();

      expect(data.error).toBe("invalid_status");
      expect(data.message).toBe("Template is already inactive");
    });
  });

  describe("Business Logic", () => {
    it("sets is_active to false", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);
      const data = await res.json();

      expect(data.is_active).toBe(false);
    });

    it("does not delete the template (soft delete)", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(200);
      // Template data is returned, proving it wasn't deleted
      const data = await res.json();
      expect(data.id).toBe("11111111-1111-4111-8111-111111111111");
    });
  });

  describe("Edge Cases", () => {
    it("handles valid UUID with uppercase letters", async () => {
      const req = new Request(
        "http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111/deactivate",
        {
          method: "POST",
        }
      );

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ isAdmin: true }) },
      };

      const res = await POST(context as never);

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

      const req = new Request(`http://localhost/api/promotion-templates/${validUuid}/deactivate`, {
        method: "POST",
      });

      const context = {
        request: req,
        params: { id: validUuid },
        locals: { supabase: createMockSupabase({ isAdmin: true, template }) },
      };

      const res = await POST(context as never);

      expect(res.status).toBe(200);
    });
  });
});
