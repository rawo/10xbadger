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
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Promotion template UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - All templates are visible
 *
 * Production Authorization (when enabled):
 * - All authenticated users can view templates
 * - No role-based restrictions
 *
 * @returns 200 OK with promotion template
 * @returns 400 Bad Request if UUID format is invalid
 * @returns 404 Not Found if template doesn't exist
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

    // Note: No admin check needed - all authenticated users can view templates
    */

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
 * Updates an existing promotion template. Authentication is disabled in dev mode.
 */
export const PUT: APIRoute = async (context) => {
  try {
    // Validate path param
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

    const service = new PromotionTemplateService(context.locals.supabase);

    try {
      const updated = await service.updatePromotionTemplate(
        id,
        bodyValidation.data as unknown as UpdatePromotionTemplateBody,
        undefined
      );
      return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (serviceError) {
      // Map service/domain errors to HTTP responses
      const code = (serviceError as unknown as { code?: string }).code as string | undefined;
      if (code === "not_found") {
        const err: ApiError = { error: "not_found", message: "Promotion template not found" };
        return new Response(JSON.stringify(err), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      if (code === "validation") {
        const err: ApiError = { error: "validation_error", message: (serviceError as Error).message };
        return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      // Unexpected DB or other errors: log and return 500
      await logError(context.locals.supabase, {
        route: "/api/promotion-templates/:id",
        error_code: code ?? "service_error",
        message: (serviceError as Error).message,
        payload: { id, body },
        requester_id: null,
      });
      const apiErr: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while updating the promotion template",
      };
      return new Response(JSON.stringify(apiErr), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // Catch-all unexpected errors
    // Log error and return generic 500
    // eslint-disable-next-line no-console
    console.error("Error in PUT /api/promotion-templates/:id:", error);
    try {
      await logError(context.locals.supabase, {
        route: "/api/promotion-templates/:id",
        error_code: "internal_error",
        message: (error as Error).message,
        payload: null,
        requester_id: null,
      });
    } catch {
      // swallow
    }
    const apiError: ApiError = { error: "internal_error", message: "An unexpected server error occurred" };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
