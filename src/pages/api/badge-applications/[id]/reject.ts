import type { APIRoute } from "astro";
import { z } from "zod";
import { BadgeApplicationService } from "../../../../lib/badge-application.service";
import { uuidParamSchema } from "../../../../lib/validation/catalog-badge.validation";
import type { ApiError } from "../../../../types";
import { logError } from "../../../../lib/error-logger";

const rejectBodySchema = z.object({
  decisionNote: z.string().max(2000).optional(),
  notifyApplicants: z.boolean().optional(),
});

export const POST: APIRoute = async (context) => {
  try {
    // STEP 1: Authentication
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
    const reviewerId = user.id;

    if (!isAdmin) {
      const error: ApiError = { error: "forbidden", message: "Only admins may reject badge applications" };
      return new Response(JSON.stringify(error), { status: 403, headers: { "Content-Type": "application/json" } });
    }

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

    // Parse body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      const error: ApiError = { error: "validation_error", message: "Invalid JSON in request body" };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const validation = rejectBodySchema.safeParse(body);
    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid request body",
        details: validation.error.issues.map((err) => ({ field: err.path.join("."), message: err.message })),
      };
      return new Response(JSON.stringify(error), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { decisionNote } = validation.data;

    const service = new BadgeApplicationService(context.locals.supabase);

    try {
      const updated = await service.rejectBadgeApplication(id, reviewerId, decisionNote);

      // If notifyApplicants is true (default), enqueue a notification event with more context
      try {
        const notify = validation.data.notifyApplicants !== undefined ? validation.data.notifyApplicants : true;
        if (notify) {
          await context.locals.supabase.from("events").insert({
            type: "badge_application.rejection_notification",
            resource: "badge_applications",
            resource_id: id,
            payload: { id, action: "rejected", reason: decisionNote || null },
          });
        }
      } catch (e) {
        // best-effort: do not block response on notification enqueue failure
        // eslint-disable-next-line no-console
        console.error("Failed to enqueue rejection notification:", e);
      }

      return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          const error: ApiError = { error: "not_found", message: "Badge application not found" };
          return new Response(JSON.stringify(error), { status: 404, headers: { "Content-Type": "application/json" } });
        }
        if (err.message === "INVALID_STATUS_TRANSITION") {
          const apiError: ApiError = {
            error: "conflict",
            message: "Badge application cannot be rejected in its current state",
          };
          return new Response(JSON.stringify(apiError), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Unexpected server error: log and return 500
      // eslint-disable-next-line no-console
      console.error("Error in POST /api/badge-applications/:id/reject:", err);
      try {
        await logError(context.locals.supabase, {
          route: "/api/badge-applications/:id/reject",
          error_code: "INTERNAL_ERROR",
          message: String(err),
          payload: { id },
          requester_id: reviewerId,
        });
      } catch {
        // best-effort
      }

      const apiError: ApiError = {
        error: "internal_error",
        message: "An unexpected error occurred while rejecting the badge application",
      };
      return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/badge-applications/:id/reject:", error);
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while rejecting the badge application",
    };
    return new Response(JSON.stringify(apiError), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
