import type { APIRoute } from "astro";
import { CatalogBadgeService } from "@/lib/catalog-badge.service";
import { listCatalogBadgesQuerySchema } from "@/lib/validation/catalog-badge.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/catalog-badges
 *
 * Lists catalog badges with filtering, search, sorting, and pagination.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Query Parameters:
 * - category: Filter by badge category (technical, organizational, softskilled)
 * - level: Filter by badge level (gold, silver, bronze)
 * - q: Full-text search on badge title (max 200 chars)
 * - status: Filter by status (active, inactive) - admin only (currently disabled in dev)
 * - sort: Sort field (created_at, title) - default: created_at
 * - order: Sort order (asc, desc) - default: desc
 * - limit: Page size (1-100) - default: 20
 * - offset: Page offset (>= 0) - default: 0
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user is non-admin (can only view active badges)
 * - To test admin features, change `isAdmin = true` in the code
 *
 * Production Authorization (when enabled):
 * - Non-admin users: Can only view active badges
 * - Admin users: Can view all badges and filter by any status
 *
 * @returns 200 OK with paginated catalog badges
 * @returns 403 Forbidden if non-admin tries to use status filter
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks
    // and use a default non-admin user for development purposes.

    const isAdmin = false; // Default to non-admin user for development

    // =========================================================================
    // PRODUCTION CODE (Currently Disabled)
    // =========================================================================
    // Uncomment the code below when authentication is ready:
    /*
    // Step 1: Authentication Check
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      const error: ApiError = {
        error: "unauthorized",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Get User Info (Admin Status)
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      const error: ApiError = {
        error: "unauthorized",
        message: "User not found",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAdmin = userData.is_admin;
    */

    // =========================================================================
    // Step 3: Parse and Validate Query Parameters
    // =========================================================================
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listCatalogBadgesQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid query parameters",
        details: validation.error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = validation.data;

    // =========================================================================
    // Step 4: Authorization Check (Status Filter for Non-Admin)
    // =========================================================================
    // In development mode, this check will prevent non-admin from filtering by status
    // In production, this works together with actual user authentication
    if (query.status && !isAdmin) {
      const error: ApiError = {
        error: "forbidden",
        message: "Only administrators can filter by status",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 5: Execute Service Method
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const result = await service.listCatalogBadges(query, isAdmin);

    // =========================================================================
    // Step 6: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/catalog-badges:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching catalog badges",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
