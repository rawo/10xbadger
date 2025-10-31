import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { POST } from "../promotion-templates/index";
import { createMockSupabase } from "../../../lib/__tests__/utils/supabase-mock";

describe("POST /api/promotion-templates", () => {
  it("returns 201 for valid request", async () => {
    const body = {
      name: "Integration Template",
      path: "technical",
      from_level: "S1",
      to_level: "S2",
      rules: [{ category: "technical", level: "gold", count: 1 }],
    };

    const req = new Request("http://localhost/api/promotion-templates", {
      method: "POST",
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
      params: {},
      locals: { supabase: createMockSupabase({}) },
    } as unknown as RouteContext;

    const res = await POST(context);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty("id", "test-uuid");
    expect(data.name).toBe(body.name);
  });

  it("returns 400 for invalid body", async () => {
    const body = { name: "", path: "unknown", rules: [] };
    const req = new Request("http://localhost/api/promotion-templates", {
      method: "POST",
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
      params: {},
      locals: { supabase: createMockSupabase({}) },
    } as unknown as RouteContext;
    const res = await POST(context);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error", "validation_error");
  });
});
