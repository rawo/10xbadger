import type { APIRoute } from "astro";
import { PromotionTemplateService } from "../../../lib/promotion-template.service";
import {
  listPromotionTemplatesQuerySchema,
  createPromotionTemplateSchema,
} from "../../../lib/validation/promotion-template.validation";
import type { ApiError } from "../../../types";
import { logError } from "../../../lib/error-logger";

/**
 * GET /api/promotion-templates
 *
 * Lists promotion templates with filtering, sorting, and pagination.
 * Requires authentication - all authenticated users can view templates.
 *
 * Query Parameters:
 * - path: Filter by career path (technical, financial, management)
 * - from_level: Filter by source position level (e.g., "S1", "J2", "M1")
 * - to_level: Filter by target position level (e.g., "S2", "J3", "M2")
 * - is_active: Filter by active status (default: true)
 * - sort: Sort field (created_at, name) - default: name
 * - order: Sort order (asc, desc) - default: asc
 * - limit: Page size (1-100) - default: 20
 * - offset: Page offset (>= 0) - default: 0
 *
 * Authorization:
 * - All authenticated users can view promotion templates
 * - No admin-only restrictions for viewing templates
 *
 * @returns 200 OK with paginated promotion templates
 * @returns 401 Unauthorized if not authenticated
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

    // Note: No admin check needed - all authenticated users can view templates

    // =========================================================================
    // Step 2: Parse and Validate Query Parameters
    // =========================================================================
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listPromotionTemplatesQuerySchema.safeParse(queryParams);

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
    // Step 3: Execute Service Method
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);
    const result = await service.listPromotionTemplates(query);

    // =========================================================================
    // Step 4: Return Successful Response
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
    console.error("Error in GET /api/promotion-templates:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching promotion templates",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/promotion-templates
 *
 * Creates a new promotion template (admin only).
 * Requires authentication and admin privileges.
 *
 * @returns 201 Created with new promotion template
 * @returns 401 Unauthorized if not authenticated
 * @returns 403 Forbidden if not admin
 * @returns 400 Bad Request if validation fails
 * @returns 409 Conflict if template already exists
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

    // =========================================================================
    // Step 2: Get User Info (Admin Status)
    // =========================================================================
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

    // =========================================================================
    // Step 3: Authorization Check (Admin Only)
    // =========================================================================
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

    // =========================================================================
    // Step 4: Parse Request Body
    // =========================================================================
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      const apiError: ApiError = {
        error: "validation_error",
        message: "Invalid JSON in request body",
      };
      return new Response(JSON.stringify(apiError), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 5: Validate Request Body
    // =========================================================================
    const validation = createPromotionTemplateSchema.safeParse(body);
    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Validation failed",
        details: validation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const command = validation.data;

    // =========================================================================
    // Step 6: Execute Service Method
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);
    try {
      const created = await service.createPromotionTemplate(
        command as unknown as import("../../../types").CreatePromotionTemplateCommand,
        user.id
      );

      // =========================================================================
      // Step 7: Return Success Response
      // =========================================================================
      return new Response(JSON.stringify(created), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      // =========================================================================
      // Error Handling: Service Layer Errors
      // =========================================================================
      const maybeErr = err as unknown as { code?: string; message?: string };

      // Handle conflict errors (template already exists)
      if (maybeErr.code === "conflict") {
        const apiError: ApiError = { error: "conflict", message: maybeErr.message || "Conflict" };
        return new Response(JSON.stringify(apiError), { status: 409, headers: { "Content-Type": "application/json" } });
      }

      // Unexpected service errors: log and return 500
      await logError(context.locals.supabase, {
        route: "/api/promotion-templates",
        error_code: "create_failed",
        message: maybeErr.message ?? String(err),
        payload: { body: command },
        requester_id: user.id,
      });
      const apiError: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while creating promotion template",
      };
      return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/promotion-templates:", error);
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while creating the promotion template",
    };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
