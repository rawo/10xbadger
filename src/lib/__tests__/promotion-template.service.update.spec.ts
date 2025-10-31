import { describe, it, expect } from "vitest";
import { PromotionTemplateService } from "../promotion-template.service";
import type { SupabaseClient } from "../../db/supabase.client";

function createMockSupabaseForPromotion(existing: Record<string, unknown> | null) {
  return {
    from(table: string) {
      if (table !== "promotion_templates") {
        return {
          select() {
            return { eq: () => ({ single: async () => ({ data: null, error: null }) }) };
          },
        };
      }

      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  if (!existing) return { data: null, error: { code: "PGRST116", message: "No rows" } };
                  return { data: existing, error: null };
                },
              };
            },
          };
        },
        update(updateData: unknown) {
          return {
            eq() {
              return {
                select() {
                  return {
                    async single() {
                      const updated = { ...(existing || {}), ...(updateData as Record<string, unknown>) };
                      return { data: updated, error: null };
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
}

describe("PromotionTemplateService.updatePromotionTemplate", () => {
  it("updates an existing template and returns updated DTO", async () => {
    const existing = {
      id: "tpl-1",
      name: "Old",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [],
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mock = createMockSupabaseForPromotion(existing);
    const svc = new PromotionTemplateService(mock);
    const updated = await svc.updatePromotionTemplate("tpl-1", { name: "New Name" }, "actor-1");
    expect(updated.id).toBe(existing.id);
    expect(updated.name).toBe("New Name");
  });

  it("throws not_found when template does not exist", async () => {
    const mock = createMockSupabaseForPromotion(null);
    const svc = new PromotionTemplateService(mock);
    await expect(svc.updatePromotionTemplate("missing", { name: "X" })).rejects.toHaveProperty("code", "not_found");
  });
});
