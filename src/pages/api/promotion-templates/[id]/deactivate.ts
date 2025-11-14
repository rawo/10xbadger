import type { APIRoute } from "astro";
import { PromotionTemplateService } from "@/lib/promotion-template.service";
import type { ApiError, InvalidStatusError } from "@/types";
import { z } from "zod";

// UUID validation schema
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
});

/**
 * POST /api/promotion-templates/:id/deactivate
 *
 * Deactivates a promotion template (admin only).
 * Sets is_active = false while preserving template history.
 * Existing promotions using this template remain valid.
 * Requires authentication and admin privileges.
 *
 * Path Parameters:
 * - id: UUID of the promotion template to deactivate
 *
 * Authorization:
 * - User must be authenticated
 * - User must have admin role (is_admin = true)
 *
 * @returns 200 OK with deactivated template details
 * @returns 400 Bad Request if template ID is invalid UUID
 * @returns 401 Unauthorized if not authenticated
 * @returns 403 Forbidden if not admin
 * @returns 404 Not Found if template doesn't exist
 * @returns 409 Conflict if template is already inactive
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const validation = uuidParamSchema.safeParse({ id: context.params.id });

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid template ID format",
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
    // Step 2: Authentication Check
    // =========================================================================
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

    // =========================================================================
    // Step 3: Get User Info (Admin Status)
    // =========================================================================
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      const error: ApiError = {
        error: "unauthorized",
        message: "User not found",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 4: Authorization Check (Admin Only)
    // =========================================================================
    if (!userData.is_admin) {
      const error: ApiError = {
        error: "forbidden",
        message: "Admin access required",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 5: Deactivate Template via Service
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);
    const template = await service.deactivatePromotionTemplate(id);

    // =========================================================================
    // Step 6: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(template), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Business Logic Errors
    // =========================================================================

    // Handle "not found" error
    if (error instanceof Error && error.message === "TEMPLATE_NOT_FOUND") {
      const notFoundError: ApiError = {
        error: "not_found",
        message: "Promotion template not found",
      };
      return new Response(JSON.stringify(notFoundError), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle "already inactive" conflict
    if (error instanceof Error && error.message === "TEMPLATE_ALREADY_INACTIVE") {
      const conflictError: InvalidStatusError = {
        error: "invalid_status",
        message: "Template is already inactive",
        current_status: "inactive",
      };
      return new Response(JSON.stringify(conflictError), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/promotion-templates/:id/deactivate:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while deactivating the promotion template",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
