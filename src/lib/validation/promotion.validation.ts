import { z } from "zod";

/**
 * Validation schema for UUID path parameter
 * Reusable for any endpoint that requires a promotion ID
 */
export const promotionIdParamSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

/**
 * Validation schema for GET /api/promotions query parameters
 *
 * All parameters are optional. Defaults are applied for sort, order, limit, and offset.
 * Enums enforce valid values for status, path, sort, and order.
 * UUIDs are validated for created_by and template_id.
 */
export const listPromotionsQuerySchema = z.object({
  // Filter by promotion status
  status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),

  // Filter by creator ID (admin only - enforced in route handler)
  created_by: z.string().uuid("Invalid user ID format").optional(),

  // Filter by career path
  path: z.enum(["technical", "financial", "management"]).optional(),

  // Filter by promotion template
  template_id: z.string().uuid("Invalid template ID format").optional(),

  // Sort field - defaults to created_at
  sort: z.enum(["created_at", "submitted_at"]).default("created_at"),

  // Sort order - defaults to desc (newest first)
  order: z.enum(["asc", "desc"]).default("desc"),

  // Page size - defaults to 20, max 100
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20),

  // Page offset - defaults to 0
  offset: z.coerce.number().int().min(0, "Offset must be non-negative").default(0),
});

/**
 * Inferred TypeScript type from validation schema
 * Used in service layer for type-safe parameter handling
 */
export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;
