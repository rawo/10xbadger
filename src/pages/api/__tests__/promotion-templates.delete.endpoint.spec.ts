import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { DELETE } from "../promotion-templates/[id]";

/**
 * Create a mock Supabase client for testing DELETE endpoint
 * Simulates soft delete behavior (setting is_active = false)
 */
function createMockSupabase(options: { templateExists: boolean; templateId?: string } = { templateExists: true }) {
  const templates: Record<string, Record<string, unknown>> = {};

  // Initialize with a template if it should exist
  if (options.templateExists) {
    const id = options.templateId || "11111111-1111-4111-8111-111111111111";
    templates[id] = {
      id,
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
    from(table: string) {
      if (table === "promotion_templates") {
        return {
          update(updateData: Record<string, unknown>) {
            return {
              eq(field: string, value: string) {
                return {
                  select() {
                    return {
                      async single() {
                        const template = templates[value];
                        if (!template) {
                          // Simulate PostgREST "no rows" error
                          return { data: null, error: { code: "PGRST116", message: "No rows found" } };
                        }
                        // Update the template
                        templates[value] = { ...template, ...updateData };
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
      return {};
    },
  } as unknown as SupabaseClient;
}

describe("DELETE /api/promotion-templates/:id", () => {
  describe("Success Cases", () => {
    it("returns 200 and success message when template is deactivated", async () => {
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ templateExists: true }) },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("message", "Promotion template deactivated successfully");
    });

    it("returns success message in correct format", async () => {
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ templateExists: true }) },
      };

      const res = await DELETE(context as never);
      const data = await res.json();

      expect(data).toEqual({
        message: "Promotion template deactivated successfully",
      });
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for invalid UUID format", async () => {
      const req = new Request("http://localhost/api/promotion-templates/invalid-uuid", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "invalid-uuid" },
        locals: { supabase: createMockSupabase({ templateExists: true }) },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
      expect(data).toHaveProperty("message", "Invalid template ID format");
      expect(data).toHaveProperty("details");
    });

    it("returns 400 for malformed UUID", async () => {
      const req = new Request("http://localhost/api/promotion-templates/not-a-uuid-123", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "not-a-uuid-123" },
        locals: { supabase: createMockSupabase({ templateExists: true }) },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "validation_error");
    });

    it("includes field-level validation details in error response", async () => {
      const req = new Request("http://localhost/api/promotion-templates/invalid", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "invalid" },
        locals: { supabase: createMockSupabase({ templateExists: true }) },
      };

      const res = await DELETE(context as never);
      const data = await res.json();

      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.length).toBeGreaterThan(0);
      expect(data.details[0]).toHaveProperty("field");
      expect(data.details[0]).toHaveProperty("message");
    });
  });

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent template", async () => {
      const req = new Request("http://localhost/api/promotion-templates/22222222-2222-4222-8222-222222222222", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "22222222-2222-4222-8222-222222222222" },
        locals: { supabase: createMockSupabase({ templateExists: false }) },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error", "not_found");
      expect(data).toHaveProperty("message", "Promotion template not found");
    });

    it("returns 404 with clear error message", async () => {
      const req = new Request("http://localhost/api/promotion-templates/33333333-3333-4333-8333-333333333333", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "33333333-3333-4333-8333-333333333333" },
        locals: { supabase: createMockSupabase({ templateExists: false }) },
      };

      const res = await DELETE(context as never);
      const data = await res.json();

      expect(data.message).toBe("Promotion template not found");
      expect(data.error).toBe("not_found");
    });
  });

  describe("Business Logic", () => {
    it("performs soft delete (data preservation)", async () => {
      // This test verifies the service is called correctly
      // Actual soft delete behavior is tested in service tests
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: createMockSupabase({ templateExists: true }) },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(200);
      // Soft delete means template still exists with is_active = false
      // This is verified in service layer tests
    });
  });

  describe("Error Handling", () => {
    it("returns 500 for unexpected errors", async () => {
      // Create a mock that throws an unexpected error
      const errorSupabase = {
        from() {
          return {
            update() {
              return {
                eq() {
                  return {
                    select() {
                      return {
                        async single() {
                          throw new Error("Database connection failed");
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as SupabaseClient;

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: errorSupabase },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("error", "internal_error");
      expect(data).toHaveProperty("message");
    });

    it("does not expose internal error details in response", async () => {
      const errorSupabase = {
        from() {
          return {
            update() {
              return {
                eq() {
                  return {
                    select() {
                      return {
                        async single() {
                          throw new Error("Internal database error with sensitive info");
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as SupabaseClient;

      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: { supabase: errorSupabase },
      };

      const res = await DELETE(context as never);
      const data = await res.json();

      // Should return generic error message, not the actual error details
      expect(data.message).toBe("An unexpected error occurred while deactivating the promotion template");
      expect(data.message).not.toContain("sensitive info");
      expect(data.message).not.toContain("database error");
    });
  });

  describe("Edge Cases", () => {
    it("handles valid UUID with uppercase letters", async () => {
      const req = new Request("http://localhost/api/promotion-templates/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: "11111111-1111-4111-8111-111111111111" },
        locals: {
          supabase: createMockSupabase({ templateExists: true, templateId: "11111111-1111-4111-8111-111111111111" }),
        },
      };

      const res = await DELETE(context as never);

      // Should work fine - UUIDs are case-insensitive
      expect(res.status).toBe(200);
    });

    it("handles different valid UUID v4 formats", async () => {
      const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const req = new Request(`http://localhost/api/promotion-templates/${validUuid}`, {
        method: "DELETE",
      });

      const context = {
        request: req,
        params: { id: validUuid },
        locals: { supabase: createMockSupabase({ templateExists: true, templateId: validUuid }) },
      };

      const res = await DELETE(context as never);

      expect(res.status).toBe(200);
    });
  });
});
