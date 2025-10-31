import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PromotionTemplateListItemDto,
  PromotionTemplateRow,
  PaginatedResponse,
  PaginationMetadata,
  PromotionTemplateRule,
} from "@/types";
import type { ListPromotionTemplatesQuery } from "./validation/promotion-template.validation";

/**
 * Service class for promotion template operations
 *
 * Handles business logic for promotion templates including:
 * - Listing templates with filters, sorting, and pagination
 * - JSONB rules field conversion to typed TypeScript array
 */
export class PromotionTemplateService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists promotion templates with filtering, sorting, and pagination
   *
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated response with promotion templates and pagination metadata
   * @throws Error if database query fails
   */
  async listPromotionTemplates(
    query: ListPromotionTemplatesQuery
  ): Promise<PaginatedResponse<PromotionTemplateListItemDto>> {
    // Build base query for data
    let dataQuery = this.supabase.from("promotion_templates").select("*");

    // Build base query for count (exact count with no data)
    let countQuery = this.supabase.from("promotion_templates").select("*", { count: "exact", head: true });

    // Apply path filter if provided
    if (query.path) {
      dataQuery = dataQuery.eq("path", query.path);
      countQuery = countQuery.eq("path", query.path);
    }

    // Apply from_level filter if provided
    if (query.from_level) {
      dataQuery = dataQuery.eq("from_level", query.from_level);
      countQuery = countQuery.eq("from_level", query.from_level);
    }

    // Apply to_level filter if provided
    if (query.to_level) {
      dataQuery = dataQuery.eq("to_level", query.to_level);
      countQuery = countQuery.eq("to_level", query.to_level);
    }

    // Apply is_active filter (default is true from validation schema)
    dataQuery = dataQuery.eq("is_active", query.is_active);
    countQuery = countQuery.eq("is_active", query.is_active);

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === "asc" });

    // Execute count query first to get total count
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count promotion templates: ${countError.message}`);
    }

    // Apply pagination using range
    // Supabase uses inclusive range, so we calculate from/to indices
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      throw new Error(`Failed to fetch promotion templates: ${dataError.message}`);
    }

    // Transform data to DTO format
    // JSONB rules field is automatically parsed by Supabase, we just need type assertion
    const templates: PromotionTemplateListItemDto[] = (data || []).map((template: PromotionTemplateRow) => ({
      id: template.id,
      name: template.name,
      path: template.path,
      from_level: template.from_level,
      to_level: template.to_level,
      rules: template.rules as unknown as PromotionTemplateRule[], // Type assertion for JSONB
      is_active: template.is_active,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
    }));

    // Build pagination metadata
    const total = count ?? 0;
    const pagination: PaginationMetadata = {
      total,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + query.limit < total,
    };

    // Return paginated response
    return {
      data: templates,
      pagination,
    };
  }
}
