import type { APIRoute } from "astro";
import { PromotionTemplateService } from "@/lib/promotion-template.service";
import { listPromotionTemplatesQuerySchema } from "@/lib/validation/promotion-template.validation";
import type { ApiError } from "@/types";

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
