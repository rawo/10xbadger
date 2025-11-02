import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import type {
  ApiError,
  AddPromotionBadgesCommand,
  RemovePromotionBadgesCommand,
  ReservationConflictError,
} from "@/types";
import { z } from "zod";

// Request body validation schema for POST
const addPromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot add more than 100 badges at once"),
});

// Request body validation schema for DELETE
const removePromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot remove more than 100 badges at once"),
});

/**
 * POST /api/promotions/:id/badges
 *
 * Adds accepted badge applications to a promotion draft, creating reservations.
 * Implements optimistic concurrency control via unique database constraint.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of promotion (required)
 *
 * Request Body:
 * - badge_application_ids: Array of badge application UUIDs (required, min 1, max 100)
 *
 * Business Rules:
 * - Promotion must exist and be owned by current user
 * - Promotion must be in 'draft' status
 * - Each badge application must exist and have status = 'accepted'
 * - Badge applications cannot be reserved by another promotion
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses hardcoded test user ID
 *
 * Production Authorization (when enabled):
 * - User can only add badges to their own promotions
 * - Promotion must be in draft status
 *
 * @returns 200 OK with success message and badge count
 * @returns 400 Bad Request if validation fails or badges invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not owner or promotion not draft
 * @returns 404 Not Found if promotion doesn't exist
 * @returns 409 Conflict if badge already reserved
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const promotionId = context.params.id;

    if (!promotionId) {
      const error: ApiError = {
        error: "validation_error",
        message: "Promotion ID is required",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate promotion ID is a valid UUID
    const uuidSchema = z.string().uuid();
    const promotionIdValidation = uuidSchema.safeParse(promotionId);

    if (!promotionIdValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    // Step 3: Parse and Validate Request Body
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

    const validation = addPromotionBadgesSchema.safeParse(requestBody);

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

    const command: AddPromotionBadgesCommand = validation.data;

    // =========================================================================
    // Step 4: Add Badges via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const result = await service.addBadgesToPromotion(promotionId, command, userId);

    // =========================================================================
    // Step 5: Return Success Response
    // =========================================================================
    const response = {
      ...result,
      message: `${result.added_count} badge(s) added successfully`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/promotions/:id/badges:", error);

    // Handle specific error types
    if (error instanceof Error) {
      // Promotion not found
      if (error.message.includes("Promotion not found")) {
        const apiError: ApiError = {
          error: "not_found",
          message: "Promotion not found",
        };
        return new Response(JSON.stringify(apiError), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // User doesn't own promotion
      if (error.message.includes("does not own")) {
        const apiError: ApiError = {
          error: "forbidden",
          message: "You do not have permission to modify this promotion",
        };
        return new Response(JSON.stringify(apiError), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Promotion not in draft status
      if (error.message.includes("not in draft status")) {
        const apiError: ApiError = {
          error: "forbidden",
          message: "Only draft promotions can be modified",
        };
        return new Response(JSON.stringify(apiError), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge application not found
      if (error.message.includes("Badge application not found")) {
        const badgeIdMatch = error.message.match(/[0-9a-f-]{36}/);
        const badgeId = badgeIdMatch ? badgeIdMatch[0] : "unknown";

        const apiError: ApiError = {
          error: "invalid_badge_application",
          message: `Badge application ${badgeId} not found`,
          details: { badge_application_id: badgeId },
        };
        return new Response(JSON.stringify(apiError), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge application not accepted
      if (error.message.includes("not accepted")) {
        const badgeIdMatch = error.message.match(/[0-9a-f-]{36}/);
        const badgeId = badgeIdMatch ? badgeIdMatch[0] : "unknown";

        const apiError: ApiError = {
          error: "invalid_badge_application",
          message: `Badge application ${badgeId} is not in accepted status`,
          details: { badge_application_id: badgeId },
        };
        return new Response(JSON.stringify(apiError), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge already reserved (conflict)
      if (error.message.includes("already reserved")) {
        // Extract badge ID and owning promotion ID from error message
        const matches = error.message.match(/[0-9a-f-]{36}/g);
        const badgeId = matches?.[0] || "unknown";
        const owningPromotionId = matches?.[1] || "unknown";

        const conflictError: ReservationConflictError = {
          error: "reservation_conflict",
          message: "Badge application is already assigned to another promotion",
          conflict_type: "badge_already_reserved",
          badge_application_id: badgeId,
          owning_promotion_id: owningPromotionId,
        };
        return new Response(JSON.stringify(conflictError), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to add badges to promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/promotions/:id/badges
 *
 * Removes badge applications from a promotion draft and releases reservations.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of promotion (required)
 *
 * Request Body:
 * - badge_application_ids: Array of badge application UUIDs (required, min 1, max 100)
 *
 * Business Rules:
 * - Promotion must exist and be owned by current user
 * - Promotion must be in 'draft' status
 * - Each badge application must be currently assigned to this promotion
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses hardcoded test user ID
 *
 * Production Authorization (when enabled):
 * - User can only remove badges from their own promotions
 * - Promotion must be in draft status
 *
 * @returns 200 OK with success message
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not owner or promotion not draft
 * @returns 404 Not Found if promotion doesn't exist or badge not in promotion
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const promotionId = context.params.id;

    if (!promotionId) {
      const error: ApiError = {
        error: "validation_error",
        message: "Promotion ID is required",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate promotion ID is a valid UUID
    const uuidSchema = z.string().uuid();
    const promotionIdValidation = uuidSchema.safeParse(promotionId);

    if (!promotionIdValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    // Step 3: Parse and Validate Request Body
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

    const validation = removePromotionBadgesSchema.safeParse(requestBody);

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

    const command: RemovePromotionBadgesCommand = validation.data;

    // =========================================================================
    // Step 4: Remove Badges via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const result = await service.removeBadgesFromPromotion(promotionId, command, userId);

    // =========================================================================
    // Step 5: Return Success Response
    // =========================================================================
    const response = {
      message: `${result.removed_count} badge(s) removed successfully`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /api/promotions/:id/badges:", error);

    // Handle specific error types
    if (error instanceof Error) {
      // Promotion not found
      if (error.message.includes("Promotion not found")) {
        const apiError: ApiError = {
          error: "not_found",
          message: "Promotion not found",
        };
        return new Response(JSON.stringify(apiError), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // User doesn't own promotion
      if (error.message.includes("does not own")) {
        const apiError: ApiError = {
          error: "forbidden",
          message: "You do not have permission to modify this promotion",
        };
        return new Response(JSON.stringify(apiError), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Promotion not in draft status
      if (error.message.includes("not in draft status")) {
        const apiError: ApiError = {
          error: "forbidden",
          message: "Only draft promotions can be modified",
        };
        return new Response(JSON.stringify(apiError), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge not in promotion
      if (error.message.includes("not in promotion")) {
        const badgeIdMatch = error.message.match(/[0-9a-f-]{36}/);
        const badgeId = badgeIdMatch ? badgeIdMatch[0] : "unknown";

        const apiError: ApiError = {
          error: "not_found",
          message: `Badge application ${badgeId} is not assigned to this promotion`,
        };
        return new Response(JSON.stringify(apiError), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to remove badges from promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
