import type { APIRoute } from "astro";
import { z } from "zod";
import { CatalogBadgeService } from "@/lib/catalog-badge.service";
import type { ApiError } from "@/types";

// UUID validation schema
const uuidSchema = z.string().uuid();

/**
 * GET /api/catalog-badges/:id
 *
 * Retrieves a single catalog badge by ID.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Catalog badge UUID
 *
 * @returns 200 OK with catalog badge details
 * @returns 400 Bad Request if UUID is invalid
 * @returns 404 Not Found if badge doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Extract and Validate ID Parameter
    // =========================================================================
    const { id } = context.params;

    // Validate UUID format
    const validation = uuidSchema.safeParse(id);

    if (!validation.success) {
      const error: ApiError = {
        error: "invalid_parameter",
        message: "Invalid badge ID format. Must be a valid UUID.",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 2: Fetch Badge from Database
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const badge = await service.getCatalogBadgeById(validation.data);

    // =========================================================================
    // Step 3: Handle Not Found
    // =========================================================================
    if (!badge) {
      const error: ApiError = {
        error: "not_found",
        message: "Catalog badge not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 4: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badge), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/catalog-badges/:id:", error);

    // Return generic error to client
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the catalog badge",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
