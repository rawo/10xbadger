/**
 * Google OAuth Initiation Endpoint
 *
 * Initiates the OAuth flow by redirecting to Google's authorization page.
 * This is a placeholder implementation that will be replaced with actual
 * OAuth logic when authentication backend is implemented.
 *
 * TODO: Implement OAuth flow with Supabase Auth
 * - Validate redirect parameter
 * - Store redirect in cookie
 * - Call supabase.auth.signInWithOAuth()
 * - Return redirect to Google
 */

export const prerender = false;

import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
  const redirectUrl = context.url.searchParams.get("redirect") || "/";

  // TODO: Implement actual OAuth initiation
  // For now, redirect back to login with an error
  return context.redirect(`/login?error=auth_failed&redirect=${encodeURIComponent(redirectUrl)}`);
}

