/**
 * GET /api/promotions/:id/validation
 *
 * Validates a promotion against its template requirements
 * Returns detailed eligibility status with requirement breakdown
 *
 * Request:
 *   - Path Parameter: id (UUID) - Promotion ID
 *
 * Response (200 OK):
 *   - promotion_id: string - Promotion UUID
 *   - is_valid: boolean - Whether all requirements are satisfied
 *   - requirements: Array of requirement details (category, level, required, current, satisfied)
 *   - missing: Array of unsatisfied requirements with deficit counts
 *
 * Error Responses:
 *   - 400 Bad Request: Invalid promotion ID format
 *   - 404 Not Found: Promotion not found or user not authorized
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
// GET Handler
// =============================================================================

/**
 * GET /api/promotions/:id/validation
 *
 * Validates promotion against template requirements and returns eligibility status
 */
export const GET: APIRoute = async (context) => {
  // ===================================================================
  // Development Mode: Use test user credentials
  // ===================================================================
  // TODO: Replace with actual authentication when enabled
  // In production: Extract from context.locals.user
  const userId = "550e8400-e29b-41d4-a716-446655440100"; // Test user
  const isAdmin = false;

  // ===================================================================
  // Step 1: Validate Promotion ID Format
  // ===================================================================
  const validation = promotionIdSchema.safeParse({ id: context.params.id });

  if (!validation.success) {
    const errorMessage = validation.error.errors[0]?.message || "Invalid promotion ID format";
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
  // Step 2: Validate Promotion via Service
  // ===================================================================
  try {
    const promotionService = new PromotionService(context.locals.supabase);
    const result = await promotionService.validatePromotion(promotionId, userId, isAdmin);

    // Handle promotion not found or forbidden (403/404)
    // Service returns null if promotion doesn't exist or user not authorized
    if (!result) {
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

    // ===================================================================
    // Step 3: Return Validation Result
    // ===================================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ===================================================================
    // Step 4: Handle Unexpected Errors
    // ===================================================================
    // eslint-disable-next-line no-console
    console.error("Error validating promotion:", error);

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
