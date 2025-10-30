import { z } from "zod";

/**
 * Validation schema for GET /api/badge-applications query parameters
 *
 * Validates all query parameters including filters, sorting, and pagination.
 * Uses Zod for runtime type checking and validation.
 */
export const listBadgeApplicationsQuerySchema = z.object({
  // Filter by application status
  status: z.enum(["draft", "submitted", "accepted", "rejected", "used_in_promotion"]).optional(),

  // Filter by applicant ID (admin only - enforced at route level)
  applicant_id: z.string().uuid("Invalid applicant ID format").optional(),

  // Filter by catalog badge ID
  catalog_badge_id: z.string().uuid("Invalid catalog badge ID format").optional(),

  // Sort field
  sort: z.enum(["created_at", "submitted_at"]).default("created_at"),

  // Sort order
  order: z.enum(["asc", "desc"]).default("desc"),

  // Pagination: items per page (1-100, default 20)
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // Pagination: offset (non-negative, default 0)
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Inferred TypeScript type from the Zod schema
 */
export type ListBadgeApplicationsQuery = z.infer<typeof listBadgeApplicationsQuerySchema>;

/**
 * Validation schema for POST /api/badge-applications request body
 *
 * Validates the JSON body for creating a new badge application.
 * - catalog_badge_id: Must be a valid UUID
 * - date_of_application: Must be in YYYY-MM-DD format
 * - date_of_fulfillment: Optional, must be in YYYY-MM-DD format, must be >= date_of_application
 * - reason: Optional, max 2000 characters
 */
export const createBadgeApplicationSchema = z
  .object({
    catalog_badge_id: z.string().uuid("Invalid catalog badge ID format"),
    date_of_application: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
    date_of_fulfillment: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .optional(),
    reason: z.string().max(2000, "Reason must be at most 2000 characters").optional(),
  })
  .refine(
    (data) => {
      // If date_of_fulfillment is provided, it must be >= date_of_application
      if (!data.date_of_fulfillment) return true;
      return data.date_of_fulfillment >= data.date_of_application;
    },
    {
      message: "Date of fulfillment must be on or after date of application",
      path: ["date_of_fulfillment"],
    }
  );

/**
 * Inferred TypeScript type for the create command
 */
export type CreateBadgeApplicationCommand = z.infer<typeof createBadgeApplicationSchema>;
