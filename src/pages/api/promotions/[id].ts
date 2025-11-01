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

/**
 * DELETE /api/promotions/:id
 *
 * Deletes a promotion in draft status. Only the promotion creator can delete
 * their own draft promotions. Deletion cascades to promotion_badges, unlocking
 * all badge applications that were reserved for this promotion.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of promotion to delete (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses first available user ID from database
 *
 * Production Authorization (when enabled):
 * - Only promotion creator can delete
 * - Only draft promotions can be deleted
 *
 * @returns 200 OK with success message
 * @returns 400 Bad Request if invalid UUID
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not owner or not draft status
 * @returns 404 Not Found if promotion doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const paramsValidation = promotionIdParamSchema.safeParse(context.params);

    if (!paramsValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
        details: paramsValidation.error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: promotionId } = paramsValidation.data;

    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we use a test user ID.

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

    const userId = user.id;
    */

    // Development mode: Use test user ID
    // TODO: Replace with actual user ID from auth session
    // For now, fetch first user from database for testing
    const { data: testUser, error: userError } = await context.locals.supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();

    if (userError || !testUser) {
      const error: ApiError = {
        error: "internal_error",
        message: "Test user not found. Please ensure sample data is imported.",
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = testUser.id;

    // =========================================================================
    // Step 3: Delete Promotion via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    await service.deletePromotion(promotionId, userId);

    // =========================================================================
    // Step 4: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify({ message: "Promotion deleted successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /api/promotions/:id:", error);

    // Handle promotion not found
    if (error instanceof Error && error.message.includes("not found")) {
      const apiError: ApiError = {
        error: "not_found",
        message: "Promotion not found",
      };
      return new Response(JSON.stringify(apiError), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle authorization errors (not owner or not draft)
    // Use generic message for both cases to avoid information disclosure
    if (error instanceof Error && (error.message.includes("permission") || error.message.includes("Only draft"))) {
      const apiError: ApiError = {
        error: "forbidden",
        message: "You do not have permission to delete this promotion",
      };
      return new Response(JSON.stringify(apiError), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to delete promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
