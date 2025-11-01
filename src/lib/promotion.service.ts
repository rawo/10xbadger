import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PromotionListItemDto,
  PromotionDetailDto,
  PaginatedResponse,
  PaginationMetadata,
  PromotionTemplateSummary,
  PromotionTemplateRule,
  BadgeApplicationStatusType,
  BadgeCategoryType,
  BadgeLevelType,
} from "../types";
import type { ListPromotionsQuery } from "./validation/promotion.validation";

/**
 * Service class for promotion operations
 *
 * Handles business logic for promotions including:
 * - Listing promotions with filters, sorting, and pagination
 * - Fetching single promotion with full details
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

  /**
   * Retrieves a single promotion by ID with full details
   *
   * Includes template details with typed rules, badge applications with catalog badges,
   * and creator information. Non-admin users can only access their own promotions.
   *
   * @param id - Promotion UUID
   * @param userId - Current user ID (for authorization)
   * @param isAdmin - Whether current user is admin
   * @returns Promotion detail if found and authorized, null otherwise
   * @throws Error if database query fails
   */
  async getPromotionById(id: string, userId?: string, isAdmin = false): Promise<PromotionDetailDto | null> {
    // Build query with all necessary joins using Supabase nested select
    let query = this.supabase
      .from("promotions")
      .select(
        `
        *,
        promotion_templates(*),
        users!created_by(id, display_name, email),
        promotion_badges(
          badge_applications(
            id,
            catalog_badge_id,
            date_of_fulfillment,
            status,
            catalog_badges(id, title, category, level)
          )
        )
      `
      )
      .eq("id", id);

    // Apply authorization filter for non-admin users
    // This ensures users can only access their own promotions
    if (!isAdmin && userId) {
      query = query.eq("created_by", userId);
    }

    // Execute query with single() to get one result or error
    const { data, error } = await query.single();

    if (error) {
      // Handle "not found" vs actual errors
      // PGRST116 is PostgREST error code for no rows returned
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch promotion: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Transform to DTO with nested objects
    const promotion: PromotionDetailDto = {
      // All promotion fields from PromotionRow
      id: data.id,
      template_id: data.template_id,
      created_by: data.created_by,
      path: data.path,
      from_level: data.from_level,
      to_level: data.to_level,
      status: data.status,
      created_at: data.created_at,
      submitted_at: data.submitted_at,
      approved_at: data.approved_at,
      approved_by: data.approved_by,
      rejected_at: data.rejected_at,
      rejected_by: data.rejected_by,
      reject_reason: data.reject_reason,
      executed: data.executed,

      // Nested template details with typed rules array
      template: {
        id: data.promotion_templates.id,
        name: data.promotion_templates.name,
        path: data.promotion_templates.path,
        from_level: data.promotion_templates.from_level,
        to_level: data.promotion_templates.to_level,
        rules: data.promotion_templates.rules as unknown as PromotionTemplateRule[],
        is_active: data.promotion_templates.is_active,
      },

      // Nested badge applications with catalog badge details
      badge_applications: (data.promotion_badges || []).map((pb: { badge_applications: Record<string, unknown> }) => ({
        id: pb.badge_applications.id as string,
        catalog_badge_id: pb.badge_applications.catalog_badge_id as string,
        date_of_fulfillment: pb.badge_applications.date_of_fulfillment as string | null,
        status: pb.badge_applications.status as BadgeApplicationStatusType,
        catalog_badge: {
          id: (pb.badge_applications.catalog_badges as Record<string, unknown>).id as string,
          title: (pb.badge_applications.catalog_badges as Record<string, unknown>).title as string,
          category: (pb.badge_applications.catalog_badges as Record<string, unknown>).category as BadgeCategoryType,
          level: (pb.badge_applications.catalog_badges as Record<string, unknown>).level as BadgeLevelType,
        },
      })),

      // Creator information
      creator: {
        id: data.users?.id ?? "",
        display_name: data.users?.display_name ?? "",
        email: data.users?.email ?? "",
      },
    };

    return promotion;
  }
}
