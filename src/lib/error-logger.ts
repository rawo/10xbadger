import type { SupabaseClient } from "@/db/supabase.client";

export async function logError(
  supabase: SupabaseClient,
  entry: {
    route: string;
    error_code: string;
    message: string;
    payload?: unknown;
    requester_id?: string | null;
  }
) {
  try {
    // Best-effort: attempt to persist to error_logs table if it exists
    await supabase.from("error_logs").insert({
      route: entry.route,
      error_code: entry.error_code,
      message: entry.message,
      payload: entry.payload ? JSON.stringify(entry.payload) : null,
      requester_id: entry.requester_id || null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to write to error_logs:", e);
  }
}
