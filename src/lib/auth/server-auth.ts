import type { AstroGlobal } from "astro";

import type { UserDto } from "@/types";

/**
 * Server-side authentication helpers
 * These functions run on the server and handle authentication checks for Astro pages.
 */

/**
 * Get the currently authenticated user
 * Returns null if user is not authenticated or session is invalid
 */
export async function getAuthenticatedUser(Astro: AstroGlobal): Promise<UserDto | null> {
  const supabase = Astro.locals.supabase;
  const userData = await supabase.auth.getUser();
  return userData.data?.user || null;
}

/**
 * Require authentication for a page
 * Redirects to login if user is not authenticated
 * Returns the authenticated user
 */
export async function requireAuth(Astro: AstroGlobal): Promise<UserDto | Response> {
  const user = await getAuthenticatedUser(Astro);

  if (user == null) {
    const redirectUrl = encodeURIComponent(Astro.url.pathname + Astro.url.search);
    return Astro.redirect(`/login?redirect=${redirectUrl}`);
  }
  return user;
}

/**
 * Require admin role for a page
 * Redirects to unauthorized page if user is not an admin
 * Returns the authenticated admin user
 */
export async function requireAdmin(Astro: AstroGlobal): Promise<UserDto | Response> {
  const user = await requireAuth(Astro);

  if (user instanceof Response) {
    return user;
  }
  if (!user.is_admin) {
    return Astro.redirect("/unauthorized");
  }
  return user;
}
