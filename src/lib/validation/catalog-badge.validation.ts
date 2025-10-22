import { z } from "zod";
import { BadgeCategory, BadgeLevel, CatalogBadgeStatus } from "@/types";

/**
 * Validation schema for GET /api/catalog-badges query parameters
 *
 * Validates all query parameters including filters, search, sorting, and pagination.
 * Uses Zod for runtime type checking and validation.
 */
export const listCatalogBadgesQuerySchema = z.object({
  // Filter by badge category
  category: z.enum([BadgeCategory.Technical, BadgeCategory.Organizational, BadgeCategory.Softskilled]).optional(),

  // Filter by badge level
  level: z.enum([BadgeLevel.Gold, BadgeLevel.Silver, BadgeLevel.Bronze]).optional(),

  // Full-text search query (max 200 characters)
  q: z.string().max(200).optional(),

  // Filter by badge status (admin only - enforced at route level)
  status: z.enum([CatalogBadgeStatus.Active, CatalogBadgeStatus.Inactive]).optional(),

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
