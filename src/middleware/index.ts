import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
  // Create a Supabase client with Astro cookie adapter
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Astro doesn't have getAll(), so we need to get all cookies from the request
        const cookieHeader = context.request.headers.get("cookie");
        if (!cookieHeader) return [];

        // Parse cookie header into the format Supabase expects
        return cookieHeader.split(";").map((cookie) => {
          const [name, ...rest] = cookie.trim().split("=");
          const value = rest.join("=");
          return { name, value };
        });
      },
      setAll(cookiesToSet) {
        // Set each cookie using Astro's API
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });

  // Attach the Supabase client to Astro.locals for use in pages and API routes
  context.locals.supabase = supabase;

  // Call the next middleware/route handler
  return next();
});
