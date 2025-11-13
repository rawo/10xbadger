import type { APIRoute } from "astro";
import { BadgeApplicationService } from "@/lib/badge-application.service";
import { uuidParamSchema } from "@/lib/validation/catalog-badge.validation";
import { updateBadgeApplicationSchema } from "@/lib/validation/badge-application.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/badge-applications/:id
 *
 * Retrieves a single badge application with full details.
 *
 * Path Parameters:
 * - id: Badge application UUID (required)
 *
 * Authorization:
 * - Non-admin users: Can only view their own badge applications
 * - Admin users: Can view any badge application
 *
 * @returns 200 OK with badge application details
 * @returns 401 Unauthorized if not authenticated
 * @returns 403 Forbidden if non-owner non-admin tries to access
 * @returns 404 Not Found if badge application doesn't exist
 * @returns 400 Bad Request if invalid UUID format
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
    // Step 3: Validate Path Parameter
    // =========================================================================
    const id = context.params.id as string;

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

export const PUT: APIRoute = async (context) => {
  try {
    // Authentication Check
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

    // Get User Info (Admin Status)
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

    // Validate path parameter
    const id = context.params.id as string;
    const idValidation = uuidParamSchema.safeParse({ id });
    if (!idValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge application ID format",
        details: idValidation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Parse body
    let body;
    try {
      body = await context.request.json();
    } catch {
      const error: ApiError = { error: "validation_error", message: "Invalid JSON in request body" };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const validation = updateBadgeApplicationSchema.safeParse(body);
    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid request body",
        details: validation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const command = validation.data;
    const service = new BadgeApplicationService(context.locals.supabase);

    try {
      const updated = await service.updateBadgeApplication(id, command, userId, isAdmin);
      return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          const error: ApiError = { error: "not_found", message: "Badge application not found" };
          return new Response(JSON.stringify(error), { status: 404, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "FORBIDDEN") {
          const error: ApiError = {
            error: "forbidden",
            message: "You do not have permission to update this badge application",
          };
          return new Response(JSON.stringify(error), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "CATALOG_BADGE_NOT_FOUND") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "The specified catalog badge does not exist",
            details: [{ field: "catalog_badge_id", message: "Catalog badge not found" }],
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (err.message === "CATALOG_BADGE_INACTIVE") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "The specified catalog badge is not active",
            details: [{ field: "catalog_badge_id", message: "Catalog badge is not active" }],
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (err.message === "INVALID_STATUS_TRANSITION" || err.message === "VALIDATION_ERROR") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "Invalid status transition or validation error",
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Unexpected
      // eslint-disable-next-line no-console
      console.error("Error in PUT /api/badge-applications/:id:", err);
      const apiError: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while updating the badge application",
      };
      return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in PUT /api/badge-applications/:id:", error);
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while updating the badge application",
    };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    // Authentication Check
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

    // Get User Info (Admin Status)
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

    // Validate path parameter
    const id = context.params.id as string;
    const idValidation = uuidParamSchema.safeParse({ id });
    if (!idValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge application ID format",
        details: idValidation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const service = new BadgeApplicationService(context.locals.supabase);

    try {
      const result = await service.deleteBadgeApplication(id, userId, isAdmin);
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          const error: ApiError = { error: "not_found", message: "Badge application not found" };
          return new Response(JSON.stringify(error), { status: 404, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "FORBIDDEN") {
          const error: ApiError = {
            error: "forbidden",
            message: "You do not have permission to delete this badge application",
          };
          return new Response(JSON.stringify(error), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "REFERENCED_BY_PROMOTION") {
          const apiError: ApiError = {
            error: "conflict",
            message: "Cannot delete: application is referenced by other resources",
          };
          return new Response(JSON.stringify(apiError), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Unexpected
      // eslint-disable-next-line no-console
      console.error("Error in DELETE /api/badge-applications/:id:", err);
      const apiError: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while deleting the badge application",
      };
      return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /api/badge-applications/:id:", error);
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while deleting the badge application",
    };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
