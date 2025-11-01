import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { PromotionService } from "../promotion.service";

/**
 * Creates a mock Supabase client for testing PromotionService.getPromotionById
 */
function createMockSupabase(options: {
  promotion?: Record<string, unknown> | null;
  shouldReturnError?: boolean;
  errorCode?: string;
  userId?: string;
  filterByUserId?: boolean;
}) {
  const {
    promotion = null,
    shouldReturnError = false,
    errorCode = "PGRST116",
    userId = undefined,
    filterByUserId = false,
  } = options;

  const appliedFilters: Record<string, unknown> = {};

  return {
    from(table: string) {
      if (table === "promotions") {
        return {
          select() {
            // Return a chainable object that supports multiple .eq() calls
            const chain = {
              eq(field: string, value: unknown) {
                appliedFilters[field] = value;

                // Simulate authorization filtering
                if (filterByUserId && field === "created_by" && value !== userId) {
                  return {
                    async single() {
                      return {
                        data: null,
                        error: { code: "PGRST116", message: "No rows found" },
                      };
                    },
                  };
                }

                // Return self for chaining
                return chain;
              },
              async single() {
                if (shouldReturnError) {
                  return {
                    data: null,
                    error: { code: errorCode, message: "Error occurred" },
                  };
                }
                return { data: promotion, error: null };
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

describe("PromotionService.getPromotionById", () => {
  describe("Success Cases", () => {
    it("returns promotion with all nested details when found", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "submitted",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: "2025-01-22T16:30:00Z",
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "S1 to S2 - Technical Path",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [
            { category: "technical", level: "silver", count: 6 },
            { category: "any", level: "gold", count: 1 },
          ],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "John Doe",
          email: "john.doe@example.com",
        },
        promotion_badges: [
          {
            badge_applications: {
              id: "44444444-4444-4444-8444-444444444444",
              catalog_badge_id: "55555555-5555-4555-8555-555555555555",
              date_of_fulfillment: "2025-01-15",
              status: "used_in_promotion",
              catalog_badges: {
                id: "55555555-5555-4555-8555-555555555555",
                title: "React Expert",
                category: "technical",
                level: "silver",
              },
            },
          },
        ],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      const result = await service.getPromotionById("11111111-1111-4111-8111-111111111111");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("11111111-1111-4111-8111-111111111111");
      expect(result?.template).toBeDefined();
      expect(result?.badge_applications).toBeDefined();
      expect(result?.creator).toBeDefined();
    });

    it("includes template with typed rules array", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [
            { category: "technical", level: "gold", count: 2 },
            { category: "organizational", level: "silver", count: 3 },
          ],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Jane Smith",
          email: "jane@example.com",
        },
        promotion_badges: [],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      const result = await service.getPromotionById("11111111-1111-4111-8111-111111111111");

      expect(result).not.toBeNull();
      expect(result?.template.rules).toBeInstanceOf(Array);
      expect(result?.template.rules).toHaveLength(2);
      expect(result?.template.rules[0]).toHaveProperty("category", "technical");
      expect(result?.template.rules[0]).toHaveProperty("level", "gold");
      expect(result?.template.rules[0]).toHaveProperty("count", 2);
    });

    it("includes badge applications array", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "submitted",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: "2025-01-22T16:30:00Z",
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "John Doe",
          email: "john@example.com",
        },
        promotion_badges: [
          {
            badge_applications: {
              id: "44444444-4444-4444-8444-444444444444",
              catalog_badge_id: "55555555-5555-4555-8555-555555555555",
              date_of_fulfillment: "2025-01-15",
              status: "used_in_promotion",
              catalog_badges: {
                id: "55555555-5555-4555-8555-555555555555",
                title: "React Expert",
                category: "technical",
                level: "silver",
              },
            },
          },
          {
            badge_applications: {
              id: "66666666-6666-4666-8666-666666666666",
              catalog_badge_id: "77777777-7777-4777-8777-777777777777",
              date_of_fulfillment: "2025-01-20",
              status: "used_in_promotion",
              catalog_badges: {
                id: "77777777-7777-4777-8777-777777777777",
                title: "TypeScript Master",
                category: "technical",
                level: "gold",
              },
            },
          },
        ],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      const result = await service.getPromotionById("11111111-1111-4111-8111-111111111111");

      expect(result).not.toBeNull();
      expect(result?.badge_applications).toBeInstanceOf(Array);
      expect(result?.badge_applications).toHaveLength(2);
      expect(result?.badge_applications[0]).toHaveProperty("catalog_badge");
      expect(result?.badge_applications[0].catalog_badge).toHaveProperty("title", "React Expert");
    });

    it("includes creator information", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "approved",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: "2025-01-22T16:30:00Z",
        approved_at: "2025-01-23T09:00:00Z",
        approved_by: "88888888-8888-4888-8888-888888888888",
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Alice Johnson",
          email: "alice.johnson@example.com",
        },
        promotion_badges: [],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      const result = await service.getPromotionById("11111111-1111-4111-8111-111111111111");

      expect(result).not.toBeNull();
      expect(result?.creator).toBeDefined();
      expect(result?.creator.id).toBe("33333333-3333-4333-8333-333333333333");
      expect(result?.creator.display_name).toBe("Alice Johnson");
      expect(result?.creator.email).toBe("alice.johnson@example.com");
    });

    it("handles promotions with no badge applications", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Bob Smith",
          email: "bob@example.com",
        },
        promotion_badges: [],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      const result = await service.getPromotionById("11111111-1111-4111-8111-111111111111");

      expect(result).not.toBeNull();
      expect(result?.badge_applications).toBeInstanceOf(Array);
      expect(result?.badge_applications).toHaveLength(0);
    });
  });

  describe("Not Found Cases", () => {
    it("returns null when promotion not found", async () => {
      const supabase = createMockSupabase({
        promotion: null,
        shouldReturnError: true,
        errorCode: "PGRST116",
      });
      const service = new PromotionService(supabase);

      const result = await service.getPromotionById("11111111-0000-0000-0000-000000000000");

      expect(result).toBeNull();
    });

    it("returns null when non-admin user tries to access another user's promotion", async () => {
      // Mock returns null when non-admin tries to access another user's promotion
      const supabase = createMockSupabase({
        promotion: null,
        shouldReturnError: true,
        errorCode: "PGRST116",
      });
      const service = new PromotionService(supabase);

      // Non-admin user trying to access another user's promotion
      const result = await service.getPromotionById(
        "11111111-1111-4111-8111-111111111111",
        "99999999-9999-4999-8999-999999999999",
        false // isAdmin = false
      );

      expect(result).toBeNull();
    });
  });

  describe("Authorization", () => {
    it("allows admin to access any promotion", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "submitted",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: "2025-01-22T16:30:00Z",
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "John Doe",
          email: "john@example.com",
        },
        promotion_badges: [],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      // Admin accessing another user's promotion
      const result = await service.getPromotionById(
        "11111111-1111-4111-8111-111111111111",
        "99999999-9999-4999-8999-999999999999", // Different user ID
        true // isAdmin = true
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe("11111111-1111-4111-8111-111111111111");
    });

    it("allows user to access their own promotion", async () => {
      const mockPromotion = {
        id: "11111111-1111-4111-8111-111111111111",
        template_id: "22222222-2222-4222-8222-222222222222",
        created_by: "33333333-3333-4333-8333-333333333333",
        path: "technical",
        from_level: "S1",
        to_level: "S2",
        status: "draft",
        created_at: "2025-01-22T10:00:00Z",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        reject_reason: null,
        executed: false,
        promotion_templates: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Test Template",
          path: "technical",
          from_level: "S1",
          to_level: "S2",
          rules: [],
          is_active: true,
        },
        users: {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "John Doe",
          email: "john@example.com",
        },
        promotion_badges: [],
      };

      const supabase = createMockSupabase({ promotion: mockPromotion });
      const service = new PromotionService(supabase);

      // User accessing their own promotion
      const result = await service.getPromotionById(
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333", // Same as created_by
        false // isAdmin = false
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe("11111111-1111-4111-8111-111111111111");
    });
  });

  describe("Error Handling", () => {
    it("throws error on database failure", async () => {
      const supabase = createMockSupabase({
        shouldReturnError: true,
        errorCode: "DB_ERROR",
      });
      const service = new PromotionService(supabase);

      await expect(service.getPromotionById("11111111-1111-4111-8111-111111111111")).rejects.toThrow(
        "Failed to fetch promotion"
      );
    });

    it("throws error on connection timeout", async () => {
      const supabase = createMockSupabase({
        shouldReturnError: true,
        errorCode: "CONNECTION_TIMEOUT",
      });
      const service = new PromotionService(supabase);

      await expect(service.getPromotionById("11111111-1111-4111-8111-111111111111")).rejects.toThrow();
    });
  });
});
