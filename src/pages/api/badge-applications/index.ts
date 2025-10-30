import type { APIRoute } from "astro";
import { BadgeApplicationService } from "@/lib/badge-application.service";
import { listBadgeApplicationsQuerySchema } from "@/lib/validation/badge-application.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/badge-applications
 *
 * Lists badge applications with filtering, sorting, and pagination.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Query Parameters:
 * - status: Filter by application status (draft, submitted, accepted, rejected, used_in_promotion)
 * - applicant_id: Filter by applicant ID (UUID) - admin only (currently disabled in dev)
 * - catalog_badge_id: Filter by catalog badge ID (UUID)
 * - sort: Sort field (created_at, submitted_at) - default: created_at
 * - order: Sort order (asc, desc) - default: desc
 * - limit: Page size (1-100) - default: 20
 * - offset: Page offset (>= 0) - default: 0
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user ID is used for filtering (non-admin sees only their own applications)
 * - Default user is non-admin
 * - To test admin features, change `isAdmin = true` in the code
 *
 * Production Authorization (when enabled):
 * - Non-admin users: Can only view their own badge applications
 * - Admin users: Can view all badge applications and filter by any applicant
 *
 * @returns 200 OK with paginated badge applications
 * @returns 403 Forbidden if non-admin tries to use applicant_id filter
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
    const userId = "550e8400-e29b-41d4-a716-446655440100"; // Default user from sample data

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
    // Step 3: Parse and Validate Query Parameters
    // =========================================================================
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listBadgeApplicationsQuerySchema.safeParse(queryParams);

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
    // Step 4: Authorization Check (applicant_id Filter for Non-Admin)
    // =========================================================================
    // In development mode, this check will prevent non-admin from filtering by applicant_id
    // In production, this works together with actual user authentication
    if (query.applicant_id && !isAdmin) {
      const error: ApiError = {
        error: "forbidden",
        message: "Only administrators can filter by applicant_id",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 5: Execute Service Method
    // =========================================================================
    const service = new BadgeApplicationService(context.locals.supabase);
    const result = await service.listBadgeApplications(query, userId, isAdmin);

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
    console.error("Error in GET /api/badge-applications:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching badge applications",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
