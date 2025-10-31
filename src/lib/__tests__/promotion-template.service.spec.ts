import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreatePromotionTemplateCommand } from "../../types";
import { PromotionTemplateService } from "../promotion-template.service";
import { createMockSupabase } from "./utils/supabase-mock";

describe("PromotionTemplateService.createPromotionTemplate", () => {
  it("creates template when none exists", async () => {
    const supabase = createMockSupabase({});
    const service = new PromotionTemplateService(supabase as unknown as SupabaseClient);

    const command = {
      name: "Test Template",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [{ category: "technical", level: "gold", count: 1 }],
    } as CreatePromotionTemplateCommand;

    const created = await service.createPromotionTemplate(command, "actor-1");

    expect(created).toBeDefined();
    expect(created.id).toBe("test-uuid");
    expect(created.name).toBe(command.name);
    expect(created.rules).toHaveLength(1);
    expect(created.created_by).toBe("actor-1");
  });

  it("throws conflict error when existing template found", async () => {
    const supabase = createMockSupabase({});

    // stub select to return existing row for this test
    // @ts-expect-error - override mock implementation for this test
    supabase.from = () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [{ id: "existing-id" }], error: null }) }) }),
        }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
    });

    const service = new PromotionTemplateService(supabase as unknown as SupabaseClient);
    const command: CreatePromotionTemplateCommand = {
      name: "Test Template",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [{ category: "technical", level: "gold", count: 1 }],
    };

    await expect(service.createPromotionTemplate(command)).rejects.toThrow();
  });
});
