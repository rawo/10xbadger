import type { APIRoute } from "astro";
import { CatalogBadgeService } from "@/lib/catalog-badge.service";
import { uuidParamSchema } from "@/lib/validation/catalog-badge.validation";
import type { ApiError, InvalidStatusError } from "@/types";

/**
 * POST /api/catalog-badges/:id/deactivate
 *
 * Deactivates a catalog badge (admin only).
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of the catalog badge to deactivate
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user is admin (can deactivate badges)
 *
 * Production Authorization (when enabled):
 * - Admin users only can deactivate badges
 *
 * @returns 200 OK with deactivated badge details
 * @returns 400 Bad Request if badge ID is invalid UUID
 * @returns 401 Unauthorized if not authenticated (production)
 * @returns 403 Forbidden if not admin (production)
 * @returns 404 Not Found if badge doesn't exist
 * @returns 409 Conflict if badge is already inactive
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const validation = uuidParamSchema.safeParse({ id: context.params.id });

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge ID format",
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

    const { id } = validation.data;

    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks
    // and assume admin access for development purposes.

    // =========================================================================
    // PRODUCTION CODE (Currently Disabled)
    // =========================================================================
    // Uncomment the code below when authentication is ready:
    /*
    // Step 2: Authentication Check
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

    // Step 3: Get User Info (Admin Status)
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

    // Step 4: Authorization Check (Admin Only)
    if (!userData.is_admin) {
      const error: ApiError = {
        error: "forbidden",
        message: "Admin access required",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    */

    // =========================================================================
    // Step 5: Deactivate Badge via Service
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const badge = await service.deactivateCatalogBadge(id);

    // Handle not found
    if (!badge) {
      const error: ApiError = {
        error: "not_found",
        message: "Catalog badge not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 6: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badge), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Business Logic Errors
    // =========================================================================

    // Handle "already inactive" conflict
    if (error instanceof Error && error.message === "BADGE_ALREADY_INACTIVE") {
      const conflictError: InvalidStatusError = {
        error: "invalid_status",
        message: "Badge is already inactive",
        current_status: "inactive",
      };
      return new Response(JSON.stringify(conflictError), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/catalog-badges/:id/deactivate:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while deactivating the catalog badge",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
