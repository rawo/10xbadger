import { describe, it, expect } from "vitest";
import { PromotionService } from "../promotion.service";
import type { SupabaseClient } from "@/db/supabase.client";
import type { RemovePromotionBadgesCommand } from "@/types";

/**
 * Creates a mock Supabase client for testing PromotionService.removeBadgesFromPromotion
 */
function createMockSupabase(options: {
  promotion?: Record<string, unknown> | null;
  currentBadges?: { badge_application_id: string }[] | null;
  shouldReturnPromotionError?: boolean;
  shouldReturnVerifyError?: boolean;
  shouldReturnDeleteError?: boolean;
  promotionErrorCode?: string;
}) {
  const {
    promotion = null,
    currentBadges = null,
    shouldReturnPromotionError = false,
    shouldReturnVerifyError = false,
    shouldReturnDeleteError = false,
    promotionErrorCode = "PGRST116",
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
                    if (shouldReturnPromotionError) {
                      return {
                        data: null,
                        error: { code: promotionErrorCode, message: "Promotion not found" },
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

      if (table === "promotion_badges") {
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      async then(callback: (result: { data: unknown; error: unknown }) => void) {
                        if (shouldReturnVerifyError) {
                          return callback({
                            data: null,
                            error: { message: "Failed to verify badge assignments" },
                          });
                        }
                        return callback({ data: currentBadges, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
          delete() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      async then(callback: (result: { error: unknown | null }) => void) {
                        if (shouldReturnDeleteError) {
                          return callback({
                            error: { message: "Failed to remove badges from promotion" },
                          });
                        }
                        return callback({ error: null });
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

describe("PromotionService.removeBadgesFromPromotion", () => {
  describe("Success Cases", () => {
    it("removes single badge from draft promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockCurrentBadges = [{ badge_application_id: "badge-1" }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      const result = await service.removeBadgesFromPromotion("promo-123", command, "user-123");

      expect(result).toEqual({ removed_count: 1 });
    });

    it("removes multiple badges from draft promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockCurrentBadges = [
        { badge_application_id: "badge-1" },
        { badge_application_id: "badge-2" },
        { badge_application_id: "badge-3" },
      ];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1", "badge-2", "badge-3"],
      };

      const result = await service.removeBadgesFromPromotion("promo-123", command, "user-123");

      expect(result).toEqual({ removed_count: 3 });
    });
  });

  describe("Promotion Not Found Cases", () => {
    it("throws error when promotion does not exist", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnPromotionError: true,
        promotionErrorCode: "PGRST116",
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("nonexistent-id", command, "user-123")).rejects.toThrow(
        "Promotion not found: nonexistent-id"
      );
    });

    it("throws error when fetch returns null data", async () => {
      const mockSupabase = createMockSupabase({
        promotion: null,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Promotion not found: promo-123"
      );
    });
  });

  describe("Authorization Cases", () => {
    it("throws error when user does not own promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "different-user-456",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "User does not own promotion: promo-123"
      );
    });

    it("throws error when promotion is not in draft status - submitted", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "submitted",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Promotion is not in draft status: promo-123 (current: submitted)"
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

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Promotion is not in draft status: promo-123 (current: approved)"
      );
    });

    it("throws error when promotion is rejected", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "rejected",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Promotion is not in draft status: promo-123 (current: rejected)"
      );
    });
  });

  describe("Badge Assignment Validation Cases", () => {
    it("throws error when badge is not in promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      // No badges currently in promotion
      const mockCurrentBadges: { badge_application_id: string }[] = [];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-not-in-promotion"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Badge application not in promotion: badge-not-in-promotion (promotion: promo-123)"
      );
    });

    it("throws error when some badges are not in promotion", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      // Only badge-1 is in promotion
      const mockCurrentBadges = [{ badge_application_id: "badge-1" }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1", "badge-2", "badge-3"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Badge application not in promotion:"
      );
    });

    it("throws error when verification query returns null", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: null,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Badge application not in promotion: badge-1 (promotion: promo-123)"
      );
    });
  });

  describe("Validation Order", () => {
    it("checks promotion existence before ownership", async () => {
      const mockSupabase = createMockSupabase({
        shouldReturnPromotionError: true,
        promotionErrorCode: "PGRST116",
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      // Should throw "not found" error, not ownership error
      await expect(service.removeBadgesFromPromotion("nonexistent-id", command, "wrong-user")).rejects.toThrow(
        "Promotion not found"
      );
    });

    it("checks ownership before status", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "submitted",
        created_by: "different-user-456",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      // Should throw ownership error first, not status error
      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "User does not own promotion"
      );
    });

    it("checks status before badge assignment verification", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "approved",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: [], // No badges
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      // Should throw status error first, not badge verification error
      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "not in draft status"
      );
    });
  });

  describe("Error Handling", () => {
    it("throws error when verification query fails", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        shouldReturnVerifyError: true,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Failed to verify badge assignments"
      );
    });

    it("throws error when database delete fails", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockCurrentBadges = [{ badge_application_id: "badge-1" }];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
        shouldReturnDeleteError: true,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1"],
      };

      await expect(service.removeBadgesFromPromotion("promo-123", command, "user-123")).rejects.toThrow(
        "Failed to remove badges from promotion"
      );
    });
  });

  describe("Batch Operations", () => {
    it("verifies all badges in single query", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      const mockCurrentBadges = [
        { badge_application_id: "badge-1" },
        { badge_application_id: "badge-2" },
        { badge_application_id: "badge-3" },
        { badge_application_id: "badge-4" },
        { badge_application_id: "badge-5" },
      ];

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: ["badge-1", "badge-2", "badge-3", "badge-4", "badge-5"],
      };

      const result = await service.removeBadgesFromPromotion("promo-123", command, "user-123");

      expect(result.removed_count).toBe(5);
    });

    it("handles large batch of badges (edge case)", async () => {
      const mockPromotion = {
        id: "promo-123",
        status: "draft",
        created_by: "user-123",
      };

      // Create 50 badges
      const mockCurrentBadges = Array.from({ length: 50 }, (_, i) => ({
        badge_application_id: `badge-${i + 1}`,
      }));

      const mockSupabase = createMockSupabase({
        promotion: mockPromotion,
        currentBadges: mockCurrentBadges,
      });

      const service = new PromotionService(mockSupabase);

      const command: RemovePromotionBadgesCommand = {
        badge_application_ids: Array.from({ length: 50 }, (_, i) => `badge-${i + 1}`),
      };

      const result = await service.removeBadgesFromPromotion("promo-123", command, "user-123");

      expect(result.removed_count).toBe(50);
    });
  });
});
