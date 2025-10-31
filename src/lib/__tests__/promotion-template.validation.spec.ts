import { describe, it, expect } from "vitest";
import { updatePromotionTemplateSchema } from "../validation/promotion-template.validation";

describe("updatePromotionTemplateSchema", () => {
  it("accepts valid partial payload", () => {
    const payload = { name: "Senior", is_active: false };
    const result = updatePromotionTemplateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects empty payload", () => {
    const payload = {};
    const result = updatePromotionTemplateSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("At least one field must be provided");
    }
  });
});
