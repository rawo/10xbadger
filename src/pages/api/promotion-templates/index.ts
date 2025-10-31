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
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
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
 * Development Mode Behavior:
 * - No authentication required
 * - All templates are visible (no role-based restrictions)
 *
 * Production Authorization (when enabled):
 * - All authenticated users can view promotion templates
 * - No admin-only restrictions for viewing templates
 *
 * @returns 200 OK with paginated promotion templates
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks.

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

    // Note: No admin check needed - all authenticated users can view templates
    */

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
 * Creates a new promotion template. Authentication/authorization is disabled for development.
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Parse request body
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

    // Step 2: Validate body
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

    // Development default created_by (sample user)
    const createdBy = "550e8400-e29b-41d4-a716-446655440100";

    // Step 3: Execute service
    const service = new PromotionTemplateService(context.locals.supabase);
    try {
      // import type for command matching CreatePromotionTemplateCommand
      // avoid `any` by asserting to the expected type from ../types
      const created = await service.createPromotionTemplate(
        command as unknown as import("../../../types").CreatePromotionTemplateCommand,
        createdBy
      );
      return new Response(JSON.stringify(created), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      const maybeErr = err as unknown as { code?: string; message?: string };
      if (maybeErr.code === "conflict") {
        const apiError: ApiError = { error: "conflict", message: maybeErr.message || "Conflict" };
        return new Response(JSON.stringify(apiError), { status: 409, headers: { "Content-Type": "application/json" } });
      }
      // Unexpected error from service - log and return 500
      await logError(context.locals.supabase, {
        route: "/api/promotion-templates",
        error_code: "create_failed",
        message: maybeErr.message ?? String(err),
        payload: { body: command },
        requester_id: createdBy,
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
