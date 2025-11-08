import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { listPromotionsQuerySchema } from "@/lib/validation/promotion.validation";
import { UUID_REGEX } from "@/lib/validation/uuid";
import type { ApiError, CreatePromotionCommand } from "@/types";
import { z } from "zod";

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

// =============================================================================
// Request Body Validation Schema for POST
// =============================================================================

const createPromotionSchema = z.object({
  template_id: z.string().min(1, "Invalid template ID format"),
});

/**
 * POST /api/promotions
 *
 * Creates a new promotion in draft status based on a promotion template.
 * Associates the promotion with the authenticated user as creator.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Request Body:
 * - template_id: UUID of promotion template (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses first available user ID from database
 *
 * Production Authorization (when enabled):
 * - Authenticated users can create promotions for themselves
 * - created_by is forced to current user ID (cannot be overridden)
 *
 * @returns 201 Created with promotion object
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 404 Not Found if template doesn't exist or is inactive
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
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
    // Step 2: Parse and Validate Request Body
    // =========================================================================
    let requestBody: unknown;
    try {
      requestBody = await context.request.json();
    } catch {
      const error: ApiError = {
        error: "validation_error",
        message: "Request body is required and must be valid JSON",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validation = createPromotionSchema.safeParse(requestBody);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Validation failed",
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

    const command: CreatePromotionCommand = validation.data;

    // Additional format validation: accept either UUID or legacy template-<id> format.
    const templateId = command.template_id;
    // Accept either a UUID-like string (lenient hex format) or legacy template-<id>
    const uuidCheck = UUID_REGEX.test(String(templateId));
    const legacyCheck = /^template-[\w-]+$/.test(String(templateId));
    if (!uuidCheck && !legacyCheck) {
      const error: ApiError = {
        error: "validation_error",
        message: "Validation failed",
        details: [{ field: "template_id", message: "Invalid template ID format" }],
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 3: Create Promotion via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const promotion = await service.createPromotion(command, userId);

    // =========================================================================
    // Step 4: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(promotion), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/promotions:", error);

    // Handle template not found (service throws error with "not found" message)
    if (error instanceof Error && error.message.includes("Template not found")) {
      const apiError: ApiError = {
        error: "not_found",
        message: "Promotion template not found",
      };
      return new Response(JSON.stringify(apiError), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to create promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
