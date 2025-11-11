import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Browser-side Supabase client
 * This client automatically handles session management via cookies in the browser.
 * Used for client-side React components.
 */
export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabaseClient;
