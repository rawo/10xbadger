import { z } from "zod";

/**
 * Validation schema for GET /api/promotion-templates query parameters
 *
 * Validates all query parameters including filters, sorting, and pagination.
 * Uses Zod for runtime type checking and validation.
 */
export const listPromotionTemplatesQuerySchema = z.object({
  // Filter by career path
  path: z.enum(["technical", "financial", "management"]).optional(),

  // Filter by source position level (free text, e.g., "S1", "J2", "M1")
  from_level: z.string().optional(),

  // Filter by target position level (free text, e.g., "S2", "J3", "M2")
  to_level: z.string().optional(),

  // Filter by active status (default: true)
  // Transform string values ("true", "false", "1", "0") to boolean
  is_active: z
    .union([z.boolean(), z.string(), z.number()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        const lower = val.toLowerCase();
        if (lower === "true" || lower === "1") return true;
        if (lower === "false" || lower === "0") return false;
        return true; // default for invalid strings
      }
      return val !== 0; // for numbers: 0 = false, anything else = true
    })
    .default(true),

  // Sort field (default: name)
  sort: z.enum(["created_at", "name"]).default("name"),

  // Sort order (default: asc)
  order: z.enum(["asc", "desc"]).default("asc"),

  // Pagination: items per page (1-100, default 20)
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // Pagination: offset (non-negative, default 0)
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Inferred TypeScript type from the Zod schema
 */
export type ListPromotionTemplatesQuery = z.infer<typeof listPromotionTemplatesQuerySchema>;
