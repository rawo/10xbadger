import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { POST } from "../promotions/index";

/**
 * Type for test context to avoid 'any' usage
 */
interface TestContext {
  request: Request;
  params: Record<string, string>;
  locals: { supabase: SupabaseClient };
}

/**
 * Creates a mock Supabase client for testing POST /api/promotions endpoint
 */
function createMockSupabase(options: {
  testUser?: { id: string } | null;
  template?: Record<string, unknown> | null;
  createdPromotion?: Record<string, unknown> | null;
  shouldReturnUserError?: boolean;
  shouldReturnTemplateError?: boolean;
  shouldReturnCreateError?: boolean;
  templateErrorCode?: string;
}) {
  const {
    testUser = { id: "test-user-123" },
    template = null,
    createdPromotion = null,
    shouldReturnUserError = false,
    shouldReturnTemplateError = false,
    shouldReturnCreateError = false,
    templateErrorCode = "PGRST116",
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

      // Mock promotion_templates table query (for template validation)
      if (table === "promotion_templates") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    if (shouldReturnTemplateError) {
                      return {
                        data: null,
                        error: { code: templateErrorCode, message: "Template not found" },
                      };
                    }
                    return { data: template, error: null };
                  },
                };
              },
            };
          },
        };
      }

      // Mock promotions table query (for creating promotion)
      if (table === "promotions") {
        return {
          insert() {
            return {
              select() {
                return {
                  async single() {
                    if (shouldReturnCreateError) {
                      return {
                        data: null,
                        error: { message: "Failed to create promotion" },
                      };
                    }
                    return { data: createdPromotion, error: null };
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

describe("POST /api/promotions", () => {
  describe("Success Cases", () => {
    it("returns 201 with created promotion when valid template_id provided", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        is_active: true,
      };

      const mockCreatedPromotion = {
        id: "promotion-123",
        template_id: "template-123",
        created_by: "test-user-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T18:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
        createdPromotion: mockCreatedPromotion,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedPromotion);
      expect(data.status).toBe("draft");
      expect(data.executed).toBe(false);
    });

    it("creates promotion with status = draft", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        is_active: true,
      };

      const mockCreatedPromotion = {
        id: "promotion-123",
        template_id: "template-123",
        created_by: "test-user-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T18:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
        createdPromotion: mockCreatedPromotion,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(data.status).toBe("draft");
    });

    it("copies path, from_level, and to_level from template", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "management",
        from_level: "M1",
        to_level: "M2",
        is_active: true,
      };

      const mockCreatedPromotion = {
        id: "promotion-123",
        template_id: "template-123",
        created_by: "test-user-123",
        path: "management",
        from_level: "M1",
        to_level: "M2",
        status: "draft",
        created_at: "2025-01-22T18:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
        createdPromotion: mockCreatedPromotion,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(data.path).toBe("management");
      expect(data.from_level).toBe("M1");
      expect(data.to_level).toBe("M2");
    });
  });

  describe("Validation Errors", () => {
    it("returns 400 for missing request body", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toContain("required");
    });

    it("returns 400 for empty request body", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("Validation failed");
    });

    it("returns 400 for invalid UUID format", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "invalid-uuid" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.details).toBeDefined();
      expect(data.details[0].field).toBe("template_id");
      expect(data.details[0].message).toContain("Invalid template ID format");
    });

    it("returns 400 for malformed JSON", async () => {
      const mockSupabase = createMockSupabase({});

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: "{ invalid json",
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
      expect(data.message).toContain("valid JSON");
    });
  });

  describe("Not Found Cases", () => {
    it("returns 404 for non-existent template", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnTemplateError: true,
        templateErrorCode: "PGRST116",
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({
            template_id: "550e8400-0000-0000-0000-000000000000",
          }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
      expect(data.message).toBe("Promotion template not found");
    });

    it("returns 404 for inactive template", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        is_active: false, // Inactive template
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
      expect(data.message).toBe("Promotion template not found");
    });
  });

  describe("Error Handling", () => {
    it("returns 500 when test user not found (development mode)", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnUserError: true,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
      expect(data.message).toContain("Test user not found");
    });

    it("returns 500 for database creation errors", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        is_active: true,
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
        shouldReturnCreateError: true,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
      expect(data.message).toBe("Failed to create promotion");
    });

    it("does not expose internal error details", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        is_active: true,
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
        shouldReturnCreateError: true,
      });

      const context: TestContext = {
        request: new Request("http://localhost:3000/api/promotions", {
          method: "POST",
          body: JSON.stringify({ template_id: "template-123" }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        locals: { supabase: mockSupabase },
      };

      const response = await POST(context);
      const data = await response.json();

      // Should not include stack trace or detailed database error
      expect(data.message).not.toContain("stack");
      expect(data.message).not.toContain("query");
      expect(data.message).not.toContain("database");
    });
  });
});
