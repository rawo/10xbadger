/**
 * POST /api/promotions/:id/approve
 *
 * Approves a submitted promotion (admin only)
 * Consumes badge reservations and marks promotion as executed
 *
 * Request:
 *   - Path Parameter: id (UUID) - Promotion ID
 *   - No request body required
 *   - Authentication: Required (admin only)
 *
 * Response (200 OK):
 *   - Full promotion record with status='approved' and approval metadata
 *
 * Error Responses:
 *   - 400 Bad Request: Invalid promotion ID format
 *   - 401 Unauthorized: Not authenticated
 *   - 403 Forbidden: User is not admin
 *   - 404 Not Found: Promotion not found
 *   - 409 Conflict: Promotion not in submitted status
 *   - 500 Internal Server Error: Database or unexpected error
 *
 * NOTE: Authentication is currently disabled for development.
 *       Using test admin user ID: 550e8400-e29b-41d4-a716-446655440100 (admin@goodcompany.com)
 */

import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { logError } from "@/lib/error-logger";
import { z } from "zod";

// =============================================================================
// Validation Schema
// =============================================================================

/**
 * Schema for validating promotion ID parameter
 * Ensures ID is a valid UUID format
 */
const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

// =============================================================================
// POST Handler
// =============================================================================

/**
 * POST /api/promotions/:id/approve
 *
 * Approves a submitted promotion (admin only)
 * Transitions status to approved and marks all badge applications as consumed
 */
export const POST: APIRoute = async (context) => {
  // ===================================================================
  // Development Mode: Use test admin user credentials
  // ===================================================================
  // TODO: Replace with actual authentication when enabled
  // In production: Extract from context.locals.user and check is_admin
  const adminUserId = "550e8400-e29b-41d4-a716-446655440100"; // Test admin user (admin@goodcompany.com)

  // TODO: In production, check admin status here:
  // const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
  // if (authError || !user) return 401;
  // const { data: userData } = await context.locals.supabase.from('users').select('is_admin').eq('id', user.id).single();
  // if (!userData?.is_admin) return 403;

  // ===================================================================
  // Step 1: Validate Promotion ID Format
  // ===================================================================
  const validation = promotionIdSchema.safeParse({ id: context.params.id });

  if (!validation.success) {
    const errorMessage = validation.error.issues[0]?.message || "Invalid promotion ID format";
    return new Response(
      JSON.stringify({
        error: "validation_error",
        message: errorMessage,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const promotionId = validation.data.id;

  // ===================================================================
  // Step 2: Approve Promotion via Service
  // ===================================================================
  try {
    const promotionService = new PromotionService(context.locals.supabase);
    const result = await promotionService.approvePromotion(promotionId, adminUserId);

    // ===================================================================
    // Step 3: Return Success Response
    // ===================================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ===================================================================
    // Step 4: Handle Errors Based on Error Message
    // ===================================================================
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Not found (404)
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Promotion not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Invalid status - not submitted (409)
    if (errorMessage.includes("Current status")) {
      const statusMatch = errorMessage.match(/Current status: (\w+)/);
      const currentStatus = statusMatch ? statusMatch[1] : "unknown";

      return new Response(
        JSON.stringify({
          error: "invalid_status",
          message: "Only submitted promotions can be approved",
          current_status: currentStatus,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Race condition - promotion already processed (409)
    if (errorMessage.includes("already processed")) {
      return new Response(
        JSON.stringify({
          error: "conflict",
          message: "Promotion has already been processed",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Unexpected error (500)
    // eslint-disable-next-line no-console
    console.error("Error approving promotion:", error);

    // Log error to database for monitoring and debugging
    try {
      await logError(context.locals.supabase, {
        route: "/api/promotions/:id/approve",
        error_code: "APPROVAL_FAILED",
        message: errorMessage,
        payload: {
          promotion_id: promotionId,
          admin_user_id: adminUserId,
          error_details: error instanceof Error ? error.stack : String(error),
        },
        requester_id: adminUserId,
      });
    } catch (logErr) {
      // Best-effort logging, don't fail if logging fails
      // eslint-disable-next-line no-console
      console.error("Failed to log error to database:", logErr);
    }

    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "An unexpected error occurred while approving the promotion",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
