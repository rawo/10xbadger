import { describe, it, expect } from "vitest";
import { PromotionService } from "../promotion.service";
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreatePromotionCommand } from "@/types";

/**
 * Creates a mock Supabase client for testing PromotionService.createPromotion
 */
function createMockSupabase(options: {
  template?: Record<string, unknown> | null;
  createdPromotion?: Record<string, unknown> | null;
  shouldReturnTemplateError?: boolean;
  shouldReturnCreateError?: boolean;
  templateErrorCode?: string;
}) {
  const {
    template = null,
    createdPromotion = null,
    shouldReturnTemplateError = false,
    shouldReturnCreateError = false,
    templateErrorCode = "PGRST116",
  } = options;

  return {
    from(table: string) {
      // Mock promotion_templates table query
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

      // Mock promotions table query
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

describe("PromotionService.createPromotion", () => {
  describe("Success Cases", () => {
    it("creates promotion with valid template", async () => {
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
        created_by: "user-123",
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      const result = await service.createPromotion(command, "user-123");

      expect(result).toEqual(mockCreatedPromotion);
    });

    it("copies template fields to promotion", async () => {
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
        created_by: "user-123",
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      const result = await service.createPromotion(command, "user-123");

      expect(result.path).toBe("management");
      expect(result.from_level).toBe("M1");
      expect(result.to_level).toBe("M2");
    });

    it("sets status to draft", async () => {
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
        created_by: "user-123",
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      const result = await service.createPromotion(command, "user-123");

      expect(result.status).toBe("draft");
    });

    it("sets executed to false", async () => {
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
        created_by: "user-123",
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      const result = await service.createPromotion(command, "user-123");

      expect(result.executed).toBe(false);
    });

    it("sets created_by to provided userId", async () => {
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
        created_by: "specific-user-456",
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      const result = await service.createPromotion(command, "specific-user-456");

      expect(result.created_by).toBe("specific-user-456");
    });
  });

  describe("Template Validation", () => {
    it("throws error when template not found", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnTemplateError: true,
        templateErrorCode: "PGRST116",
      });

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "non-existent-template",
      };

      await expect(service.createPromotion(command, "user-123")).rejects.toThrow("Template not found");
    });

    it("throws error when template is inactive", async () => {
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      await expect(service.createPromotion(command, "user-123")).rejects.toThrow("Template not found");
    });

    it("includes template_id in error message for debugging", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnTemplateError: true,
      });

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "debug-template-789",
      };

      await expect(service.createPromotion(command, "user-123")).rejects.toThrow("debug-template-789");
    });
  });

  describe("Error Handling", () => {
    it("throws error on database failure", async () => {
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

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      await expect(service.createPromotion(command, "user-123")).rejects.toThrow("Failed to create promotion");
    });

    it("throws error if promotion creation returns no data", async () => {
      const mockTemplate = {
        id: "template-123",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        is_active: true,
      };

      const mockSupabase = createMockSupabase({
        template: mockTemplate,
        createdPromotion: null, // No data returned
      });

      const service = new PromotionService(mockSupabase);
      const command: CreatePromotionCommand = {
        template_id: "template-123",
      };

      await expect(service.createPromotion(command, "user-123")).rejects.toThrow("Promotion creation returned no data");
    });
  });
});
