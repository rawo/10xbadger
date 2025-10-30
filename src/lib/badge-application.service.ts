import type { SupabaseClient } from "@/db/supabase.client";
import type {
  BadgeApplicationListItemDto,
  BadgeApplicationDetailDto,
  PaginatedResponse,
  PaginationMetadata,
  CatalogBadgeSummary,
  CatalogBadgeDetail,
  UserSummary,
  BadgeApplicationRow,
} from "@/types";
import type { ListBadgeApplicationsQuery } from "./validation/badge-application.validation";

/**
 * Type for badge application query result with joined catalog badge (summary)
 */
interface BadgeApplicationWithCatalogBadge extends BadgeApplicationRow {
  catalog_badge: CatalogBadgeSummary;
}

/**
 * Type for badge application query result with full catalog badge and applicant details
 */
interface BadgeApplicationWithFullDetails extends BadgeApplicationRow {
  catalog_badge: CatalogBadgeDetail;
  applicant: UserSummary;
}

/**
 * Service class for badge application operations
 *
 * Handles business logic for badge applications including:
 * - Listing applications with filters, sorting, and pagination
 * - Role-based filtering (users see only their own, admins see all)
 * - Nested catalog badge information
 */
export class BadgeApplicationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists badge applications with filtering, sorting, and pagination
   *
   * Non-admin users can only see their own applications.
   * Admin users can see all applications and filter by any applicant.
   *
   * @param query - Query parameters for filtering, sorting, and pagination
   * @param userId - Current user's ID for authorization filtering
   * @param isAdmin - Whether the requesting user is an admin
   * @returns Paginated response with badge applications and pagination metadata
   * @throws Error if database query fails
   */
  async listBadgeApplications(
    query: ListBadgeApplicationsQuery,
    userId: string,
    isAdmin: boolean
  ): Promise<PaginatedResponse<BadgeApplicationListItemDto>> {
    // Build base query for data with catalog badge join
    // Select all badge application fields plus nested catalog badge summary
    let dataQuery = this.supabase.from("badge_applications").select(
      `
        *,
        catalog_badge:catalog_badges!catalog_badge_id (
          id,
          title,
          category,
          level
        )
      `
    );

    // Build base query for count (exact count with no data)
    let countQuery = this.supabase.from("badge_applications").select("*", { count: "exact", head: true });

    // Apply authorization filter based on user role
    // Non-admin users can only see their own applications
    if (!isAdmin) {
      dataQuery = dataQuery.eq("applicant_id", userId);
      countQuery = countQuery.eq("applicant_id", userId);
    }

    // Apply status filter if provided
    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    // Apply catalog_badge_id filter if provided
    if (query.catalog_badge_id) {
      dataQuery = dataQuery.eq("catalog_badge_id", query.catalog_badge_id);
      countQuery = countQuery.eq("catalog_badge_id", query.catalog_badge_id);
    }

    // Apply applicant_id filter if provided (admin only, enforced at route level)
    if (query.applicant_id && isAdmin) {
      dataQuery = dataQuery.eq("applicant_id", query.applicant_id);
      countQuery = countQuery.eq("applicant_id", query.applicant_id);
    }

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === "asc" });

    // Execute count query first to get total count
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count badge applications: ${countError.message}`);
    }

    // Apply pagination using range
    // Supabase uses inclusive range, so we calculate from/to indices
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      throw new Error(`Failed to fetch badge applications: ${dataError.message}`);
    }

    // Transform data to DTO format with proper typing
    // The join returns an array with catalog_badge object
    const applications: BadgeApplicationListItemDto[] = (data || []).map((app: BadgeApplicationWithCatalogBadge) => ({
      id: app.id,
      applicant_id: app.applicant_id,
      catalog_badge_id: app.catalog_badge_id,
      catalog_badge_version: app.catalog_badge_version,
      date_of_application: app.date_of_application,
      date_of_fulfillment: app.date_of_fulfillment,
      reason: app.reason,
      status: app.status,
      submitted_at: app.submitted_at,
      reviewed_by: app.reviewed_by,
      reviewed_at: app.reviewed_at,
      review_reason: app.review_reason,
      created_at: app.created_at,
      updated_at: app.updated_at,
      catalog_badge: app.catalog_badge,
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
      data: applications,
      pagination,
    };
  }

  /**
   * Retrieves a single badge application by ID with full details
   *
   * Includes nested catalog badge details (with description and version)
   * and applicant user information.
   *
   * @param id - Badge application UUID
   * @returns Badge application with nested data if found, null otherwise
   * @throws Error if database query fails
   */
  async getBadgeApplicationById(id: string): Promise<BadgeApplicationDetailDto | null> {
    // Build query with joins for catalog badge and applicant user
    const { data, error } = await this.supabase
      .from("badge_applications")
      .select(
        `
        *,
        catalog_badge:catalog_badges!catalog_badge_id (
          id,
          title,
          description,
          category,
          level,
          version
        ),
        applicant:users!applicant_id (
          id,
          display_name,
          email
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      // Handle "not found" vs actual errors
      if (error.code === "PGRST116") {
        // PostgREST error code for no rows returned
        return null;
      }
      throw new Error(`Failed to fetch badge application: ${error.message}`);
    }

    // Type the response as BadgeApplicationWithFullDetails for proper type checking
    const typedData = data as unknown as BadgeApplicationWithFullDetails;

    // Transform to proper DTO type
    return {
      id: typedData.id,
      applicant_id: typedData.applicant_id,
      catalog_badge_id: typedData.catalog_badge_id,
      catalog_badge_version: typedData.catalog_badge_version,
      date_of_application: typedData.date_of_application,
      date_of_fulfillment: typedData.date_of_fulfillment,
      reason: typedData.reason,
      status: typedData.status,
      submitted_at: typedData.submitted_at,
      reviewed_by: typedData.reviewed_by,
      reviewed_at: typedData.reviewed_at,
      review_reason: typedData.review_reason,
      created_at: typedData.created_at,
      updated_at: typedData.updated_at,
      catalog_badge: typedData.catalog_badge,
      applicant: typedData.applicant,
    } as BadgeApplicationDetailDto;
  }
}
