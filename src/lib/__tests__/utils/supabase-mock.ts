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
        select() {
          const chain: Record<string, unknown> = {};
          chain.eq = () => chain;
          chain.order = () => chain;
          chain.range = () => chain;
          chain.limit = () => Promise.resolve({ data: [], error: null });
          chain.single = async (): Promise<SupabaseResult> => {
            // Simulate fetch for badge_applications by id
            if (callerTable === "badge_applications") {
              const keys = Object.keys(badgeApplications);
              const id = keys.length > 0 ? keys[0] : undefined;
              if (!id) return { error: { code: "PGRST116", message: "No rows" } };
              const row = badgeApplications[id];
              if (!row) return { error: { code: "PGRST116" } };
              return { data: row };
            }
            return { data: null };
          };
          return chain;
        },
        // Support update chain used in service: from(...).update(...).eq(...).select().single()
        update(updateData: unknown) {
          return {
            eq() {
              return {
                select() {
                  return {
                    async single(): Promise<SupabaseResult> {
                      if (callerTable === "badge_applications") {
                        const id = Object.keys(badgeApplications)[0];
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
        // Support insert used for audit_logs/events and inserts that call .select().single()
        insert(payload: unknown) {
          if (callerTable === "audit_logs") {
            return Promise.resolve({ data: payload, error: null });
          }
          return {
            select() {
              return {
                async single(): Promise<SupabaseResult> {
                  return {
                    data: {
                      id: "test-uuid",
                      ...((payload as unknown as Record<string, unknown>) || {}),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
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

  return client as unknown as SupabaseClient;
}
