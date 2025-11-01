import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { listPromotionsQuerySchema } from "@/lib/validation/promotion.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/promotions
 *
 * Lists promotions with filtering, sorting, and pagination.
 * Non-admin users see only their own promotions.
 * Admin users can see all promotions and filter by user.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Query Parameters:
 * - status: Filter by promotion status (optional)
 * - created_by: Filter by creator ID - admin only (optional)
 * - path: Filter by career path (optional)
 * - template_id: Filter by template (optional)
 * - sort: Sort field - created_at or submitted_at (default: created_at)
 * - order: Sort order - asc or desc (default: desc)
 * - limit: Page size (default: 20, max: 100)
 * - offset: Page offset (default: 0)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - No admin check performed
 * - All promotions visible (behaves as admin)
 *
 * Production Authorization (when enabled):
 * - Authenticated users see only their own promotions
 * - Admin users can see all and filter by user
 *
 * @returns 200 OK with paginated promotions
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // For now, we skip auth checks and return all promotions

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
    // Step 3: Validate Query Parameters
    // =========================================================================
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listPromotionsQuerySchema.safeParse(queryParams);

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
    // Step 4: Fetch Promotions from Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const result = await service.listPromotions(query, userId, isAdmin);

    // =========================================================================
    // Step 5: Return Successful Response
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
    console.error("Error in GET /api/promotions:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching promotions",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
