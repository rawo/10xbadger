import { z } from "zod";

/**
 * Validation schema for GET /api/catalog-badges query parameters
 *
 * Validates all query parameters including filters, search, sorting, and pagination.
 * Uses Zod for runtime type checking and validation.
 */
export const listCatalogBadgesQuerySchema = z.object({
  // Filter by badge category
  category: z.enum(["technical", "organizational", "softskilled"]).optional(),

  // Filter by badge level
  level: z.enum(["gold", "silver", "bronze"]).optional(),

  // Full-text search query (max 200 characters)
  q: z.string().max(200).optional(),

  // Filter by badge status (admin only - enforced at route level)
  status: z.enum(["active", "inactive"]).optional(),

  // Sort field
  sort: z.enum(["created_at", "title"]).default("created_at"),

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
export type ListCatalogBadgesQuery = z.infer<typeof listCatalogBadgesQuerySchema>;

/**
 * Validation schema for POST /api/catalog-badges
 *
 * Validates all fields for creating a new catalog badge.
 * Uses Zod for runtime type checking and validation.
 */
export const createCatalogBadgeSchema = z.object({
  // Required: Badge title (non-empty, max 200 chars)
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),

  // Optional: Detailed description (max 2000 chars)
  description: z.string().max(2000, "Description must be at most 2000 characters").optional(),

  // Required: Badge category (enum)
  category: z.enum(["technical", "organizational", "softskilled"]),

  // Required: Badge level (enum)
  level: z.enum(["gold", "silver", "bronze"]),

  // Optional: Metadata (JSON object, defaults to {})
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * Inferred TypeScript type from the create catalog badge schema
 */
export type CreateCatalogBadgeSchema = z.infer<typeof createCatalogBadgeSchema>;

/**
 * Validation schema for UUID path parameters
 *
 * Used for endpoints that take :id in the path (e.g., /api/catalog-badges/:id)
 * Validates that the ID is a valid UUID format.
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid badge ID format"),
});

/**
 * Inferred TypeScript type from the UUID param schema
 */
export type UuidParam = z.infer<typeof uuidParamSchema>;
