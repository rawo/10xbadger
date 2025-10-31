import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { PUT } from "../promotion-templates/[id]";

function createMockSupabase() {
  const templates: Record<string, Record<string, unknown>> = {
    "11111111-1111-4111-8111-111111111111": {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Old",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [],
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  return {
    from(table: string) {
      if (table === "promotion_templates") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    const id = Object.keys(templates)[0];
                    if (!id) return { data: null, error: { code: "PGRST116", message: "No rows" } };
                    return { data: templates[id], error: null };
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
                        const id = Object.keys(templates)[0];
                        templates[id] = { ...(templates[id] || {}), ...(updateData as Record<string, unknown>) };
                        return { data: templates[id], error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      // error_logs insert
      return {
        insert(payload: unknown) {
          return Promise.resolve({ data: payload, error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("PUT /api/promotion-templates/:id", () => {
  it("returns 200 and updated template for valid request", async () => {
    const body = { name: "New Name" };
    const req = new Request("http://localhost/api/promotion-templates/tpl-1", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    interface RouteContext {
      request: Request;
      params: Record<string, string>;
      locals: { supabase: SupabaseClient };
    }

    const context = {
      request: req,
      params: { id: "11111111-1111-4111-8111-111111111111" },
      locals: { supabase: createMockSupabase() },
    } as unknown as any;

    const res = await PUT(context as unknown as any);
    if (res.status !== 200) {
      // Log response for debugging
      // eslint-disable-next-line no-console
      console.error("PUT response status", res.status, "body:", await res.json());
    }
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id", "11111111-1111-4111-8111-111111111111");
    expect(data.name).toBe(body.name);
  });

  it("returns 400 for invalid body (empty)", async () => {
    const body = {};
    const req = new Request("http://localhost/api/promotion-templates/tpl-1", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const context = {
      request: req,
      params: { id: "11111111-1111-4111-8111-111111111111" },
      locals: { supabase: createMockSupabase() },
    } as unknown as any;

    const res = await PUT(context as unknown as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error", "validation_error");
  });
});
