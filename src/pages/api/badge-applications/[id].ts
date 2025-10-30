import type { APIRoute } from "astro";
import { BadgeApplicationService } from "@/lib/badge-application.service";
import { uuidParamSchema } from "@/lib/validation/catalog-badge.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/badge-applications/:id
 *
 * Retrieves a single badge application with full details.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Badge application UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user ID is used for authorization checks
 * - Default user is non-admin
 * - To test admin features, change `isAdmin = true` in the code
 *
 * Production Authorization (when enabled):
 * - Non-admin users: Can only view their own badge applications
 * - Admin users: Can view any badge application
 *
 * @returns 200 OK with badge application details
 * @returns 403 Forbidden if non-owner non-admin tries to access
 * @returns 404 Not Found if badge application doesn't exist
 * @returns 400 Bad Request if invalid UUID format
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
    const userId = "550e8400-e29b-41d4-a716-446655440101"; // Default user (John Doe)

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
    const userId = user.id;
    */

    // =========================================================================
    // Step 3: Validate Path Parameter
    // =========================================================================
    const id = context.params.id;

    // Validate UUID format
    const validation = uuidParamSchema.safeParse({ id });

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge application ID format",
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

    // =========================================================================
    // Step 4: Fetch Badge Application from Service
    // =========================================================================
    const service = new BadgeApplicationService(context.locals.supabase);
    const badgeApplication = await service.getBadgeApplicationById(id);

    // =========================================================================
    // Step 5: Handle Not Found
    // =========================================================================
    if (!badgeApplication) {
      const error: ApiError = {
        error: "not_found",
        message: "Badge application not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 6: Authorization Check
    // =========================================================================
    // Non-admin users can only view their own badge applications
    const isOwner = badgeApplication.applicant_id === userId;

    if (!isAdmin && !isOwner) {
      const error: ApiError = {
        error: "forbidden",
        message: "You do not have permission to view this badge application",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 7: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(badgeApplication), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/badge-applications/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the badge application",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
