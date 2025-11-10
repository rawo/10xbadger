import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// DEVELOPMENT MODE: Use service role key to bypass RLS
// TODO: Switch to anon key and implement proper authentication before production
// Service role key bypasses Row Level Security, which is necessary for development
// since authentication is not yet implemented.
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);

export type SupabaseClient = typeof supabaseClient;
