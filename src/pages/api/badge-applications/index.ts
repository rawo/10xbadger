import type { APIRoute } from "astro";
import { BadgeApplicationService } from "@/lib/badge-application.service";
import {
  listBadgeApplicationsQuerySchema,
  createBadgeApplicationSchema,
} from "@/lib/validation/badge-application.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/badge-applications
 *
 * Lists badge applications with filtering, sorting, and pagination.
 *
 * Query Parameters:
 * - status: Filter by application status (draft, submitted, accepted, rejected, used_in_promotion)
 * - applicant_id: Filter by applicant ID (UUID) - admin only
 * - catalog_badge_id: Filter by catalog badge ID (UUID)
 * - sort: Sort field (created_at, submitted_at) - default: created_at
 * - order: Sort order (asc, desc) - default: desc
 * - limit: Page size (1-100) - default: 20
 * - offset: Page offset (>= 0) - default: 0
 *
 * Authorization:
 * - Non-admin users: Can only view their own badge applications
 * - Admin users: Can view all badge applications and filter by any applicant
 *
 * @returns 200 OK with paginated badge applications
 * @returns 401 Unauthorized if not authenticated
 * @returns 403 Forbidden if non-admin tries to use applicant_id filter
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Authentication Check
    // =========================================================================
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

/**
 * POST /api/badge-applications
 *
 * Creates a new badge application in draft status.
 *
 * Request Body (JSON):
 * - catalog_badge_id: UUID of the catalog badge (required)
 * - date_of_application: Date in YYYY-MM-DD format (required)
 * - date_of_fulfillment: Date in YYYY-MM-DD format (optional, must be >= date_of_application)
 * - reason: Text description (optional, max 2000 characters)
 *
 * Authorization:
 * - Must be authenticated
 * - User becomes the applicant_id
 * - Badge application is created in draft status
 *
 * Business Rules:
 * - Application is created in 'draft' status
 * - Catalog badge must exist and be 'active'
 * - catalog_badge_version is captured from the catalog badge at creation time
 * - date_of_fulfillment must be >= date_of_application (if provided)
 *
 * @returns 201 Created with badge application details
 * @returns 401 Unauthorized if not authenticated
 * @returns 400 Bad Request if validation fails or catalog badge is inactive/not found
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Authentication Check
    // =========================================================================
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

    const userId = user.id;

    // =========================================================================
    // Step 2: Parse and Validate Request Body
    // =========================================================================
    let body;
    try {
      body = await context.request.json();
    } catch {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid JSON in request body",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validation = createBadgeApplicationSchema.safeParse(body);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid request body",
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

    const command = validation.data;

    // =========================================================================
    // Step 3: Execute Service Method
    // =========================================================================
    const service = new BadgeApplicationService(context.locals.supabase);

    let badgeApplication;
    try {
      badgeApplication = await service.createBadgeApplication(command, userId);
    } catch (error) {
      // Handle specific business logic errors from service
      if (error instanceof Error) {
        if (error.message === "CATALOG_BADGE_NOT_FOUND") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "The specified catalog badge does not exist",
            details: [
              {
                field: "catalog_badge_id",
                message: "Catalog badge not found",
              },
            ],
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (error.message === "CATALOG_BADGE_INACTIVE") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "The specified catalog badge is not active",
            details: [
              {
                field: "catalog_badge_id",
                message: "Catalog badge is not active",
              },
            ],
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Re-throw for the outer catch to handle
      throw error;
    }

    // =========================================================================
    // Step 4: Return Successful Response (201 Created)
    // =========================================================================
    return new Response(JSON.stringify(badgeApplication), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/badge-applications:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while creating the badge application",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
