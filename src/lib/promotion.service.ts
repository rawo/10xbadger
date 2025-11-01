import type { SupabaseClient } from "@/db/supabase.client";
import type { PromotionListItemDto, PaginatedResponse, PaginationMetadata, PromotionTemplateSummary } from "../types";
import type { ListPromotionsQuery } from "./validation/promotion.validation";

/**
 * Service class for promotion operations
 *
 * Handles business logic for promotions including:
 * - Listing promotions with filters, sorting, and pagination
 * - Role-based data access (users see own, admins see all)
 * - Badge counting and template summary aggregation
 */
export class PromotionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists promotions with filtering, sorting, and pagination
   *
   * Non-admin users see only their own promotions (automatic filtering by created_by).
   * Admin users can see all promotions and optionally filter by specific user.
   *
   * @param query - Validated query parameters (filters, sorting, pagination)
   * @param userId - Current user ID (for non-admin filtering)
   * @param isAdmin - Whether current user is admin (controls data access)
   * @returns Paginated response with promotions and metadata
   * @throws Error if database query fails
   */
  async listPromotions(
    query: ListPromotionsQuery,
    userId?: string,
    isAdmin = false
  ): Promise<PaginatedResponse<PromotionListItemDto>> {
    // Build base query for data with template join
    let dataQuery = this.supabase.from("promotions").select(`
        *,
        promotion_templates!inner(id, name)
      `);

    // Build base query for count (exact count with no data)
    let countQuery = this.supabase.from("promotions").select("*", { count: "exact", head: true });

    // =========================================================================
    // Apply Role-Based Filtering
    // =========================================================================
    // Non-admin users: Force filter by their own user ID (security)
    if (!isAdmin && userId) {
      dataQuery = dataQuery.eq("created_by", userId);
      countQuery = countQuery.eq("created_by", userId);
    }
    // Admin users: Apply created_by filter if provided in query
    else if (isAdmin && query.created_by) {
      dataQuery = dataQuery.eq("created_by", query.created_by);
      countQuery = countQuery.eq("created_by", query.created_by);
    }

    // =========================================================================
    // Apply Optional Filters
    // =========================================================================

    // Filter by status if provided
    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    // Filter by path if provided
    if (query.path) {
      dataQuery = dataQuery.eq("path", query.path);
      countQuery = countQuery.eq("path", query.path);
    }

    // Filter by template_id if provided
    if (query.template_id) {
      dataQuery = dataQuery.eq("template_id", query.template_id);
      countQuery = countQuery.eq("template_id", query.template_id);
    }

    // =========================================================================
    // Execute Count Query
    // =========================================================================
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count promotions: ${countError.message}`);
    }

    // =========================================================================
    // Apply Sorting
    // =========================================================================
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === "asc" });

    // =========================================================================
    // Apply Pagination
    // =========================================================================
    // Supabase uses inclusive range, so calculate from/to indices
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // =========================================================================
    // Execute Data Query
    // =========================================================================
    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      throw new Error(`Failed to fetch promotions: ${dataError.message}`);
    }

    // =========================================================================
    // Count Badges for Each Promotion
    // =========================================================================
    // Note: This uses separate queries for badge counting
    // TODO: Optimize with PostgreSQL function or aggregation for better performance
    const promotionsWithBadges = await Promise.all(
      (data || []).map(async (promotion) => {
        // Count promotion_badges for this promotion
        const { count: badgeCount } = await this.supabase
          .from("promotion_badges")
          .select("*", { count: "exact", head: true })
          .eq("promotion_id", promotion.id);

        // Transform to DTO with badge count and template summary
        return {
          ...promotion,
          badge_count: badgeCount || 0,
          template: {
            id: promotion.promotion_templates.id,
            name: promotion.promotion_templates.name,
          } as PromotionTemplateSummary,
        } as PromotionListItemDto;
      })
    );

    // =========================================================================
    // Build Pagination Metadata
    // =========================================================================
    const total = count ?? 0;
    const pagination: PaginationMetadata = {
      total,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + query.limit < total,
    };

    // =========================================================================
    // Return Paginated Response
    // =========================================================================
    return {
      data: promotionsWithBadges,
      pagination,
    };
  }
}
