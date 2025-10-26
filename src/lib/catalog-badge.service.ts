import type { SupabaseClient } from "@/db/supabase.client";
import type { CatalogBadgeListItemDto, CatalogBadgeDetailDto, PaginatedResponse, PaginationMetadata } from "@/types";
import type { ListCatalogBadgesQuery } from "./validation/catalog-badge.validation";

/**
 * Service class for catalog badge operations
 *
 * Handles business logic for catalog badges including:
 * - Listing badges with filters, search, sorting, and pagination
 * - Role-based filtering (admin vs non-admin access)
 */
export class CatalogBadgeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists catalog badges with filtering, search, sorting, and pagination
   *
   * @param query - Query parameters for filtering, search, sorting, and pagination
   * @param isAdmin - Whether the requesting user is an admin
   * @returns Paginated response with catalog badges and pagination metadata
   * @throws Error if database query fails
   */
  async listCatalogBadges(
    query: ListCatalogBadgesQuery,
    isAdmin: boolean
  ): Promise<PaginatedResponse<CatalogBadgeListItemDto>> {
    // Build base query for data
    let dataQuery = this.supabase.from("catalog_badges").select("*");

    // Build base query for count (exact count with no data)
    let countQuery = this.supabase.from("catalog_badges").select("*", { count: "exact", head: true });

    // Apply status filter based on user role
    // Non-admin users can only see active badges
    // Admin users can filter by status or see all if no status specified
    if (query.status && isAdmin) {
      // Admin with explicit status filter
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    } else if (!isAdmin) {
      // Non-admin users always see only active badges
      dataQuery = dataQuery.eq("status", "active");
      countQuery = countQuery.eq("status", "active");
    }
    // If admin and no status specified, show all badges (no filter applied)

    // Apply category filter if provided
    if (query.category) {
      dataQuery = dataQuery.eq("category", query.category);
      countQuery = countQuery.eq("category", query.category);
    }

    // Apply level filter if provided
    if (query.level) {
      dataQuery = dataQuery.eq("level", query.level);
      countQuery = countQuery.eq("level", query.level);
    }

    // Apply full-text search on title if search query provided
    // Uses PostgreSQL GIN index on to_tsvector('simple', title)
    if (query.q) {
      dataQuery = dataQuery.textSearch("title", query.q, {
        type: "plain",
        config: "simple",
      });
      countQuery = countQuery.textSearch("title", query.q, {
        type: "plain",
        config: "simple",
      });
    }

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === "asc" });

    // Execute count query first to get total count
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count catalog badges: ${countError.message}`);
    }

    // Apply pagination using range
    // Supabase uses inclusive range, so we calculate from/to indices
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      throw new Error(`Failed to fetch catalog badges: ${dataError.message}`);
    }

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
      data: data as CatalogBadgeListItemDto[],
      pagination,
    };
  }

  /**
   * Retrieves a single catalog badge by ID
   *
   * @param id - Badge UUID
   * @returns Catalog badge if found, null otherwise
   * @throws Error if database query fails
   */
  async getCatalogBadgeById(id: string): Promise<CatalogBadgeDetailDto | null> {
    const { data, error } = await this.supabase.from("catalog_badges").select("*").eq("id", id).single();

    if (error) {
      // Handle "not found" vs actual errors
      if (error.code === "PGRST116") {
        // PostgREST error code for no rows returned
        return null;
      }
      throw new Error(`Failed to fetch catalog badge: ${error.message}`);
    }

    return data as CatalogBadgeDetailDto;
  }
}
