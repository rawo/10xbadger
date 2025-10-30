import type { SupabaseClient } from "@/db/supabase.client";

interface SupabaseResult {
  data?: unknown;
  error?: { code?: string; message?: string };
}

export function createMockSupabase(options: {
  badgeApplications?: Record<string, unknown>;
  shouldFetchErrorForId?: string;
}) {
  const badgeApplications = options.badgeApplications || {};

  const client = {
    from(table: string) {
      const callerTable = table;
      return {
        select(selectStr?: string) {
          return {
            eq(column: string, value: unknown) {
              return {
                async single(): Promise<SupabaseResult> {
                  // Simulate fetch for badge_applications by id
                  if (callerTable === "badge_applications") {
                    const id = String(value);
                    if (options.shouldFetchErrorForId === id) {
                      return { error: { code: "PGRST116", message: "No rows" } };
                    }

                    // If select string includes nested joins, return detailed full object
                    if (selectStr && selectStr.includes("catalog_badge")) {
                      const row = badgeApplications[id];
                      if (!row) return { error: { code: "PGRST116" } };
                      return { data: row };
                    }

                    // Minimal select (id, status, catalog_badge_id)
                    const row = badgeApplications[id] as Record<string, unknown> | undefined;
                    if (!row) return { error: { code: "PGRST116" } };
                    return {
                      data: {
                        id: String(row["id"]),
                        status: String(row["status"]),
                        catalog_badge_id: String(row["catalog_badge_id"]),
                      },
                    };
                  }

                  // default
                  return { data: null };
                },
              };
            },
          };
        },
        // Support update chain used in service: from(...).update(...).eq(...).select().single()
        update(updateData: unknown) {
          return {
            eq(column: string, value: unknown) {
              return {
                select() {
                  return {
                    async single(): Promise<SupabaseResult> {
                      if (callerTable === "badge_applications") {
                        const id = String(value);
                        const existing = badgeApplications[id] as Record<string, unknown> | undefined;
                        if (!existing) return { error: { message: "no rows" } };
                        badgeApplications[id] = { ...existing, ...(updateData as Record<string, unknown>) };
                        return { data: badgeApplications[id] };
                      }
                      return { data: null };
                    },
                  };
                },
              };
            },
          };
        },
        // Support insert used for audit_logs/events
        insert(payload: unknown) {
          return { data: payload, error: null };
        },
      };
    },
  };

  return client as unknown as SupabaseClient;
}
