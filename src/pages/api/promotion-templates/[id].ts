import type { APIRoute } from "astro";
import { PromotionTemplateService } from "../../../lib/promotion-template.service";
import type { ApiError } from "../../../types";
import { z } from "zod";
import {
  updatePromotionTemplateSchema,
  type UpdatePromotionTemplateBody,
} from "../../../lib/validation/promotion-template.validation";
import { logError } from "../../../lib/error-logger";

// UUID validation schema
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
});

/**
 * GET /api/promotion-templates/:id
 *
 * Retrieves a single promotion template by ID.
 * Requires authentication - all authenticated users can view templates.
 *
 * Path Parameters:
 * - id: Promotion template UUID (required)
 *
 * Authorization:
 * - All authenticated users can view templates
 * - No admin-only restrictions for viewing templates
 *
 * @returns 200 OK with promotion template
 * @returns 401 Unauthorized if not authenticated
 * @returns 400 Bad Request if UUID format is invalid
 * @returns 404 Not Found if template doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Authentication Check
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

    // Note: No admin check needed - all authenticated users can view templates

    // =========================================================================
    // Step 2: Validate Path Parameter
    // =========================================================================
    const validation = uuidParamSchema.safeParse(context.params);

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
    // Step 3: Fetch Template from Service
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);
    const template = await service.getPromotionTemplateById(id);

    // =========================================================================
    // Step 4: Handle Not Found
    // =========================================================================
    if (!template) {
      const error: ApiError = {
        error: "not_found",
        message: "Promotion template not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 5: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(template), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/promotion-templates/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the promotion template",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PUT /api/promotion-templates/:id
 *
 * Updates an existing promotion template (admin only).
 * Cannot change path, from_level, or to_level (immutable after creation).
 * Requires authentication and admin privileges.
 *
 * Path Parameters:
 * - id: Promotion template UUID (required)
 *
 * Authorization:
 * - User must be authenticated
 * - User must have admin role (is_admin = true)
 *
 * @returns 200 OK with updated template
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if not authenticated
 * @returns 403 Forbidden if not admin
 * @returns 404 Not Found if template doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const PUT: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const idValidation = uuidParamSchema.safeParse(context.params);
    if (!idValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid template ID format",
        details: idValidation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { id } = idValidation.data;

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
    // Step 5: Parse and Validate Request Body
    // =========================================================================

    // Parse JSON body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      const err: ApiError = { error: "invalid_json", message: "Request body must be valid JSON" };
      return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Validate body using Zod
    const bodyValidation = updatePromotionTemplateSchema.safeParse(body);
    if (!bodyValidation.success) {
      const err: ApiError = {
        error: "validation_error",
        message: "Invalid request body",
        details: bodyValidation.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      };
      return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // =========================================================================
    // Step 6: Update Template via Service
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);

    try {
      const updated = await service.updatePromotionTemplate(
        id,
        bodyValidation.data as unknown as UpdatePromotionTemplateBody,
        user.id
      );

      // =========================================================================
      // Step 7: Return Success Response
      // =========================================================================
      return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (serviceError) {
      // =========================================================================
      // Error Handling: Service Layer Errors
      // =========================================================================
      const code = (serviceError as unknown as { code?: string }).code as string | undefined;

      // Handle "not found" error
      if (code === "not_found") {
        const err: ApiError = { error: "not_found", message: "Promotion template not found" };
        return new Response(JSON.stringify(err), { status: 404, headers: { "Content-Type": "application/json" } });
      }

      // Handle validation errors
      if (code === "validation") {
        const err: ApiError = { error: "validation_error", message: (serviceError as Error).message };
        return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
      }

      // Unexpected service errors: log and return 500
      await logError(context.locals.supabase, {
        route: "/api/promotion-templates/:id",
        error_code: code ?? "service_error",
        message: (serviceError as Error).message,
        payload: { id, body },
        requester_id: user.id,
      });
      const apiErr: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while updating the promotion template",
      };
      return new Response(JSON.stringify(apiErr), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in PUT /api/promotion-templates/:id:", error);

    try {
      // Note: user might not be available if error occurred during authentication
      const userId = (() => {
        try {
          return (context.locals as any).user?.id ?? null;
        } catch {
          return null;
        }
      })();

      await logError(context.locals.supabase, {
        route: "/api/promotion-templates/:id",
        error_code: "internal_error",
        message: (error as Error).message,
        payload: null,
        requester_id: userId,
      });
    } catch {
      // Ignore logging errors
    }

    const apiError: ApiError = { error: "internal_error", message: "An unexpected server error occurred" };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

