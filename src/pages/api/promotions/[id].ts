import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { promotionIdParamSchema } from "@/lib/validation/promotion.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/promotions/:id
 *
 * Retrieves a single promotion with full details including template,
 * badge applications with catalog badges, and creator information.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Promotion UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - All promotions visible (behaves as admin)
 *
 * Production Authorization (when enabled):
 * - Authenticated users can view their own promotions
 * - Admin users can view all promotions
 * - Returns 404 for unauthorized access (security - don't reveal existence)
 *
 * @returns 200 OK with promotion details
 * @returns 400 Bad Request if UUID format is invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 404 Not Found if promotion doesn't exist or user not authorized
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

    // Step 2: Check Admin Status
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    const isAdmin = userData?.is_admin || false;
    const userId = user.id;
    */

    // Development mode: Set defaults
    const isAdmin = true; // In dev, behave as admin to see all data
    const userId = undefined; // No filtering in dev mode

    // =========================================================================
    // Step 3: Validate Path Parameter
    // =========================================================================
    const validation = promotionIdParamSchema.safeParse(context.params);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
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
    // Step 4: Fetch Promotion from Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const promotion = await service.getPromotionById(id, userId, isAdmin);

    // =========================================================================
    // Step 5: Handle Not Found or Unauthorized
    // =========================================================================
    // Note: Return 404 for both not found and unauthorized to avoid
    // information leakage (don't reveal existence of promotions user can't access)
    if (!promotion) {
      const error: ApiError = {
        error: "not_found",
        message: "Promotion not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 6: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(promotion), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/promotions/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
