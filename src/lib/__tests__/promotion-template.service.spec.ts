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

describe("PromotionTemplateService.deactivatePromotionTemplate", () => {
  it("deactivates template successfully when it exists", async () => {
    const templateId = "template-123";
    const mockTemplate = {
      id: templateId,
      name: "Test Template",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [{ category: "technical", level: "gold", count: 1 }],
      is_active: true,
      created_by: "admin-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create mock that supports both select and update
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    // Return existing active template
                    return {
                      data: mockTemplate,
                      error: null,
                    };
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
                        // Return updated template with is_active = false
                        return {
                          data: { ...mockTemplate, ...updateData },
                          error: null,
                        };
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

    const service = new PromotionTemplateService(supabase);

    // Should not throw and return the deactivated template
    const result = await service.deactivatePromotionTemplate(templateId);
    expect(result).toBeDefined();
    expect(result.id).toBe(templateId);
    expect(result.is_active).toBe(false);
  });

  it("updates updated_at timestamp when deactivating", async () => {
    const templateId = "template-123";
    let capturedUpdateData: Record<string, unknown> | null = null;
    const mockTemplate = {
      id: templateId,
      name: "Test Template",
      is_active: true,
      created_by: "admin-id",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return { data: mockTemplate, error: null };
                  },
                };
              },
            };
          },
          update(updateData: Record<string, unknown>) {
            capturedUpdateData = updateData;
            return {
              eq() {
                return {
                  select() {
                    return {
                      async single() {
                        return { data: { ...mockTemplate, ...updateData }, error: null };
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

    const service = new PromotionTemplateService(supabase);
    await service.deactivatePromotionTemplate(templateId);

    expect(capturedUpdateData).not.toBeNull();
    expect(capturedUpdateData).toHaveProperty("is_active", false);
    expect(capturedUpdateData).toHaveProperty("updated_at");
    expect(typeof capturedUpdateData?.updated_at).toBe("string");
  });

  it("throws error with 'not found' message when template does not exist", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    // Simulate PostgREST "no rows" error
                    return { data: null, error: { code: "PGRST116", message: "No rows found" } };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return {
                  select() {
                    return {
                      async single() {
                        return { data: null, error: { code: "PGRST116", message: "No rows found" } };
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

    const service = new PromotionTemplateService(supabase);

    await expect(service.deactivatePromotionTemplate("non-existent-id")).rejects.toThrow("TEMPLATE_NOT_FOUND");
  });

  it("throws error on database failure", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    // Simulate database error
                    return { data: null, error: { code: "DB_ERROR", message: "Connection timeout" } };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return {
                  select() {
                    return {
                      async single() {
                        return { data: null, error: { code: "DB_ERROR", message: "Connection timeout" } };
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

    const service = new PromotionTemplateService(supabase);

    await expect(service.deactivatePromotionTemplate("template-id")).rejects.toThrow("Failed to fetch");
  });

  it("sets is_active to false when deactivating", async () => {
    const templateId = "template-123";
    let capturedUpdateData: Record<string, unknown> | null = null;
    const mockTemplate = {
      id: templateId,
      name: "Test Template",
      is_active: true,
      created_by: "admin-id",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return { data: mockTemplate, error: null };
                  },
                };
              },
            };
          },
          update(updateData: Record<string, unknown>) {
            capturedUpdateData = updateData;
            return {
              eq() {
                return {
                  select() {
                    return {
                      async single() {
                        return { data: { ...mockTemplate, ...updateData }, error: null };
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

    const service = new PromotionTemplateService(supabase);
    await service.deactivatePromotionTemplate(templateId);

    expect(capturedUpdateData).toHaveProperty("is_active", false);
  });

  it("handles already deactivated template (idempotent)", async () => {
    const templateId = "template-123";
    const alreadyDeactivated = {
      id: templateId,
      name: "Test Template",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [],
      is_active: false,
      created_by: "admin-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return { data: alreadyDeactivated, error: null };
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
                        return { data: { ...alreadyDeactivated, ...updateData }, error: null };
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

    const service = new PromotionTemplateService(supabase);

    // Should throw because template is already inactive
    await expect(service.deactivatePromotionTemplate(templateId)).rejects.toThrow("TEMPLATE_ALREADY_INACTIVE");
  });
});
