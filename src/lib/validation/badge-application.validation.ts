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
