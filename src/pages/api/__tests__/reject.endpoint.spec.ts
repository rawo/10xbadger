import { describe, it, expect } from "vitest";
import { POST } from "../badge-applications/[id]/reject";

function createMockContext({ id, badgeApplications = {}, isAdmin = true } = {}) {
  const badgeApps = { ...(badgeApplications || {}) };
  const supabaseClient = {
    auth: {
      async getUser() {
        return { data: { user: { id: "reviewer-1" } }, error: null };
      },
    },
    from(table: string) {
      return {
        select(selectStr?: string) {
          return {
            eq(column: string, value: unknown) {
              return {
                async single() {
                  if (table === "users") {
                    return { data: { is_admin: isAdmin }, error: null };
                  }
                  if (table === "badge_applications") {
                    const idStr = String(value);
                    const row = badgeApps[idStr];
                    if (!row) return { error: { code: "PGRST116", message: "No rows" } };
                    if (selectStr && selectStr.includes("catalog_badge")) return { data: row };
                    return { data: { id: row.id, status: row.status, catalog_badge_id: row.catalog_badge_id } };
                  }
                  return { data: null };
                },
              };
            },
          };
        },
        update(updateData: unknown) {
          return {
            eq(column: string, value: unknown) {
              return {
                select() {
                  return {
                    async single() {
                      const idStr = String(value);
                      const existing = badgeApps[idStr];
                      if (!existing) return { error: { message: "no rows" } };
                      badgeApps[idStr] = { ...existing, ...(updateData as Record<string, unknown>) };
                      return { data: badgeApps[idStr] };
                    },
                  };
                },
              };
            },
          };
        },
        insert(payload: unknown) {
          return { data: payload, error: null };
        },
      };
    },
  };

  return {
    params: { id },
    request: { json: async () => ({}) },
    locals: { supabase: supabaseClient },
  };
}

describe("POST /api/badge-applications/:id/reject endpoint", () => {
  it("returns 400 for invalid UUID", async () => {
    const ctx = createMockContext({ id: "not-a-uuid" });
    // @ts-expect-error - mocked context does not match APIRoute type
    const res = await POST(ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when application not found", async () => {
    // Use a valid UUID (version/variant bits) for the test
    const id = "22222222-2222-1222-8222-222222222222";
    const ctx = createMockContext({ id });
    // @ts-expect-error - mocked context does not match APIRoute type
    const res = await POST(ctx);
    expect(res.status).toBe(404);
  });

  it("returns 409 when application in invalid state", async () => {
    // Use a valid UUID (version/variant bits) for the test
    const id = "33333333-3333-1333-8333-333333333333";
    const badgeApplications = {
      [id]: { id, status: "draft", catalog_badge_id: "badge-1" },
    };
    const ctx = createMockContext({ id, badgeApplications });
    // @ts-expect-error - mocked context does not match APIRoute type
    const res = await POST(ctx);
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful rejection", async () => {
    const id = "88888888-8888-8888-8888-888888888888";
    const badgeApplications = {
      [id]: {
        id,
        status: "submitted",
        catalog_badge_id: "badge-1",
        catalog_badge: { id: "badge-1", title: "B1", description: "desc", category: "cat", level: "L1", version: 1 },
        applicant: { id: "applicant-1", display_name: "A", email: "a@example.com" },
      },
    };
    const ctx = createMockContext({ id, badgeApplications });
    // Provide a body with decisionNote
    ctx.request.json = async () => ({ decisionNote: "Nope", notifyApplicants: true });
    // @ts-expect-error - mocked context does not match APIRoute type
    const res = await POST(ctx);
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.id).toBe(id);
    expect(body.status).toBe("rejected");
  });
});
