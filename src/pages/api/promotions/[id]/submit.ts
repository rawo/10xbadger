/**
 * POST /api/promotions/:id/submit
 *
 * Submits a draft promotion for admin review
 * Validates template compliance and transitions status to submitted
 *
 * Request:
 *   - Path Parameter: id (UUID) - Promotion ID
 *   - No request body required
 *
 * Response (200 OK):
 *   - Full promotion record with status='submitted' and submitted_at timestamp
 *
 * Error Responses:
 *   - 400 Bad Request: Invalid promotion ID format
 *   - 403 Forbidden: User is not promotion creator
 *   - 404 Not Found: Promotion not found
 *   - 409 Conflict: Promotion not in draft status OR validation failed
 *   - 500 Internal Server Error: Database or unexpected error
 */

import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
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
 * POST /api/promotions/:id/submit
 *
 * Submits a draft promotion for admin review after validating template compliance
 */
export const POST: APIRoute = async (context) => {
  // ===================================================================
  // Development Mode: Use test user credentials
  // ===================================================================
  // TODO: Replace with actual authentication when enabled
  // In production: Extract from context.locals.user
  const userId = "550e8400-e29b-41d4-a716-446655440100"; // Test user

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
  // Step 2: Submit Promotion via Service
  // ===================================================================
  try {
    const promotionService = new PromotionService(context.locals.supabase);
    const result = await promotionService.submitPromotion(promotionId, userId);

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

    // Forbidden - not creator (403)
    if (errorMessage.includes("permission")) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: errorMessage,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Invalid status - not draft (409)
    if (errorMessage.includes("draft") && errorMessage.includes("Current status")) {
      const statusMatch = errorMessage.match(/Current status: (\w+)/);
      const currentStatus = statusMatch ? statusMatch[1] : "unknown";

      return new Response(
        JSON.stringify({
          error: "invalid_status",
          message: "Only draft promotions can be submitted",
          current_status: currentStatus,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validation failed (409)
    if (errorMessage.includes("Validation failed")) {
      try {
        const missingMatch = errorMessage.match(/Validation failed: (.+)/);
        const missing = missingMatch ? JSON.parse(missingMatch[1]) : [];

        return new Response(
          JSON.stringify({
            error: "validation_failed",
            message: "Promotion does not meet template requirements",
            missing,
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch {
        // Fallback if JSON parsing fails
        return new Response(
          JSON.stringify({
            error: "validation_failed",
            message: "Promotion does not meet template requirements",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Unexpected error (500)
    // eslint-disable-next-line no-console
    console.error("Error submitting promotion:", error);

    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
