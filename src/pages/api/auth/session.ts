/**
 * Session Info Endpoint
 *
 * Returns current session information for the authenticated user.
 * This is a placeholder implementation that will be replaced with actual
 * session checking when authentication backend is implemented.
 *
 * TODO: Implement session info retrieval
 * - Get session from Supabase
 * - Fetch user data from database
 * - Return user info or null
 */

export const prerender = false;

import type { APIContext } from "astro";

export async function GET(_context: APIContext): Promise<Response> {
  // TODO: Implement actual session checking
  // For now, return null (not authenticated)
  return new Response(
    JSON.stringify({
      user: null,
      authenticated: false,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
