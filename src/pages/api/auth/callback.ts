/**
 * OAuth Callback Endpoint
 *
 * Handles the callback from Google OAuth after user authentication.
 * This is a placeholder implementation that will be replaced with actual
 * callback handling when authentication backend is implemented.
 *
 * TODO: Implement OAuth callback handling
 * - Validate authorization code
 * - Exchange code for session with Supabase
 * - Validate email domain
 * - Create/update user record
 * - Set session cookie
 * - Redirect to intended destination
 */

export const prerender = false;

import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
  const code = context.url.searchParams.get("code");

  if (!code) {
    return context.redirect("/login?error=invalid_code");
  }

  // TODO: Implement actual OAuth callback handling
  // For now, redirect to login with error
  return context.redirect("/login?error=auth_failed");
}
