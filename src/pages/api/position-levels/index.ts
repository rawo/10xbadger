import type { APIRoute } from "astro";
import positionLevelsConfig from "@/config/position-levels.json";

/**
 * GET /api/position-levels
 *
 * Returns position levels configuration used for promotion template validation
 * and level progression logic.
 *
 * This endpoint serves static configuration data bundled with the application.
 * No database queries are performed. The configuration is loaded at build time
 * and returned as-is.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Development Mode Behavior:
 * - No authentication required
 * - All users can access position levels configuration
 *
 * Production Authorization (when enabled):
 * - Available to all authenticated users (no role restrictions)
 * - Position levels are public reference data needed for career planning
 *
 * **Response Structure**:
 * ```json
 * {
 *   "positions": {
 *     "technical": { "J1": { "next_level": "J2", "required_badges": {...} } },
 *     "financial": { "J1": { "next_level": "J2", "required_badges": {...} } },
 *     "management": { "M1": { "next_level": "M2", "required_badges": {...} } }
 *   }
 * }
 * ```
 *
 * **Success Response**: 200 OK with position levels configuration
 *
 * **Error Responses**:
 * - 401 Unauthorized: Not authenticated (production only, currently disabled)
 * - 500 Internal Server Error: Configuration load failed (deployment issue)
 *
 * @returns Complete position levels configuration
 *
 * @example
 * ```typescript
 * // Fetch position levels
 * const response = await fetch('/api/position-levels');
 * const { positions } = await response.json();
 *
 * // Access technical path levels
 * const technicalLevels = positions.technical;
 * console.log(technicalLevels.J1.next_level); // "J2"
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET: APIRoute = async (_context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks.
    //
    // PRODUCTION CODE (Currently Disabled):
    // if (import.meta.env.PROD) {
    //   const {
    //     data: { user },
    //     error,
    //   } = await _context.locals.supabase.auth.getUser();
    //
    //   if (error || !user) {
    //     console.warn(
    //       "Unauthorized access attempt to /api/position-levels:",
    //       error?.message || "No user session"
    //     );
    //
    //     return new Response(
    //       JSON.stringify({
    //         error: "unauthorized",
    //         message: "Authentication required",
    //       }),
    //       {
    //         status: 401,
    //         headers: { "Content-Type": "application/json" },
    //       }
    //     );
    //   }
    // }

    // =========================================================================
    // Validate Configuration
    // =========================================================================
    // Ensure configuration exists and is well-formed
    // This should never fail in production as config is bundled at build time,
    // but we check defensively for deployment issues
    if (!positionLevelsConfig || !positionLevelsConfig.positions) {
      // eslint-disable-next-line no-console
      console.error("Position levels configuration is missing or invalid:", positionLevelsConfig);

      return new Response(
        JSON.stringify({
          error: "internal_error",
          message: "Failed to load position levels configuration",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // =========================================================================
    // Return Configuration
    // =========================================================================
    // Return static configuration bundled at build time
    // No file I/O or database queries required
    return new Response(JSON.stringify(positionLevelsConfig), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log unexpected errors with full context for debugging
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/position-levels:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return generic error response (don't expose internal details to client)
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Failed to load position levels configuration",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
// Ensures dynamic behavior (e.g., authentication checks) works correctly
export const prerender = false;
