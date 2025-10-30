import type { APIRoute } from "astro";
import { BadgeApplicationService } from "@/lib/badge-application.service";
import { uuidParamSchema } from "@/lib/validation/catalog-badge.validation";
import type { ApiError } from "@/types";
import { logError } from "@/lib/error-logger";

export const POST: APIRoute = async (context) => {
  try {
    // Authentication: retrieve user from Supabase auth
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      const error: ApiError = { error: "unauthorized", message: "Authentication required" };
      return new Response(JSON.stringify(error), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // Fetch user record to determine admin status
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      const error: ApiError = { error: "unauthorized", message: "User not found" };
      return new Response(JSON.stringify(error), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const isAdmin = userData.is_admin;
    const requesterId = user.id;

    // Validate path parameter
    const id = context.params.id as string;
    const idValidation = uuidParamSchema.safeParse({ id });
    if (!idValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge application ID format",
        details: idValidation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const service = new BadgeApplicationService(context.locals.supabase);

    try {
      const updated = await service.submitBadgeApplication(id, requesterId, isAdmin);
      return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          const error: ApiError = { error: "not_found", message: "Badge application not found" };
          return new Response(JSON.stringify(error), { status: 404, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "FORBIDDEN") {
          const error: ApiError = {
            error: "forbidden",
            message: "You do not have permission to submit this badge application",
          };
          return new Response(JSON.stringify(error), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "INVALID_STATUS_TRANSITION" || err.message === "VALIDATION_ERROR") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "Invalid status or validation error for submission",
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (err.message === "CATALOG_BADGE_NOT_FOUND") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "The specified catalog badge does not exist",
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (err.message === "CATALOG_BADGE_INACTIVE") {
          const apiError: ApiError = {
            error: "validation_error",
            message: "The specified catalog badge is not active",
          };
          return new Response(JSON.stringify(apiError), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Unexpected server error: log and return 500
      // eslint-disable-next-line no-console
      console.error("Error in POST /api/badge-applications/:id/submit:", err);
      try {
        await logError(context.locals.supabase, {
          route: "/api/badge-applications/:id/submit",
          error_code: "INTERNAL_ERROR",
          message: String(err),
          payload: { id },
          requester_id: requesterId,
        });
      } catch {
        // best-effort
      }

      const apiError: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while submitting the badge application",
      };
      return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/badge-applications/:id/submit:", error);
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while submitting the badge application",
    };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
