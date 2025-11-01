import { describe, it, expect } from "vitest";
import { PromotionService } from "../promotion.service";
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Creates a mock Supabase client for testing PromotionService.deletePromotion
 */
function createMockSupabase(options: {
  promotion?: Record<string, unknown> | null;
  shouldReturnFetchError?: boolean;
  shouldReturnDeleteError?: boolean;
  fetchErrorCode?: string;
}) {
  const {
    promotion = null,
    shouldReturnFetchError = false,
    shouldReturnDeleteError = false,
    fetchErrorCode = "PGRST116",
  } = options;

  return {
    from(table: string) {
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

describe("PromotionService.deletePromotion", () => {
  describe("Success Cases", () => {
    it("deletes draft promotion owned by user", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      // Should not throw
      await expect(service.deletePromotion("promo-123", "user-123")).resolves.toBeUndefined();
    });
  });

  describe("Not Found Cases", () => {
    it("throws error when promotion does not exist", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnFetchError: true,
        fetchErrorCode: "PGRST116",
      });

      const service = new PromotionService(mockSupabase);

      await expect(service.deletePromotion("nonexistent-id", "user-123")).rejects.toThrow(
        "Promotion not found: nonexistent-id"
      );
    });

    it("throws error when fetch returns null data", async () => {
      const mockSupabase = createMockSupabase({
        promotion: null,
      });

      const service = new PromotionService(mockSupabase);

      await expect(service.deletePromotion("promo-123", "user-123")).rejects.toThrow("Promotion not found: promo-123");
    });
  });

  describe("Authorization Cases", () => {
    it("throws error when promotion is not in draft status", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "submitted",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      await expect(service.deletePromotion("promo-123", "user-123")).rejects.toThrow(
        "Only draft promotions can be deleted. Current status: submitted"
      );
    });

    it("throws error when promotion is approved", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "approved",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      await expect(service.deletePromotion("promo-123", "user-123")).rejects.toThrow(
        "Only draft promotions can be deleted. Current status: approved"
      );
    });

    it("throws error when promotion is not owned by user", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "different-user-456",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      await expect(service.deletePromotion("promo-123", "user-123")).rejects.toThrow(
        "You do not have permission to delete this promotion"
      );
    });
  });

  describe("Validation Order", () => {
    it("checks existence before status", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnFetchError: true,
        fetchErrorCode: "PGRST116",
      });

      const service = new PromotionService(mockSupabase);

      // Should throw "not found" error, not status error
      await expect(service.deletePromotion("nonexistent-id", "user-123")).rejects.toThrow("Promotion not found");
    });

    it("checks status before ownership", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "approved",
        created_by: "different-user-456",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      // Should throw status error first, not ownership error
      await expect(service.deletePromotion("promo-123", "user-123")).rejects.toThrow(
        "Only draft promotions can be deleted"
      );
    });
  });

  describe("Error Handling", () => {
    it("throws error when database delete fails", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        shouldReturnDeleteError: true,
      });

      const service = new PromotionService(mockSupabase);

      await expect(service.deletePromotion("promo-123", "user-123")).rejects.toThrow("Failed to delete promotion");
    });
  });

  describe("CASCADE Behavior", () => {
    it("relies on database CASCADE for promotion_badges deletion", async () => {
      // This test documents that CASCADE happens at database level
      // The service method does not explicitly delete promotion_badges
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      // Delete should succeed and CASCADE will handle related records
      await expect(service.deletePromotion("promo-123", "user-123")).resolves.toBeUndefined();

      // In real database, promotion_badges with promotion_id=promo-123 would be deleted
      // automatically via ON DELETE CASCADE foreign key constraint
    });
  });
});
