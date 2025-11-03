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
  CreatePromotionCommand,
  PromotionRow,
  AddPromotionBadgesCommand,
  RemovePromotionBadgesCommand,
  PromotionValidationResponse,
  PromotionRequirement,
  MissingBadge,
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

  /**
   * Creates a new promotion in draft status
   *
   * Validates that the template exists and is active, then creates a promotion
   * record with template metadata copied for denormalized queries.
   *
   * @param command - Promotion creation command with template_id
   * @param userId - Current authenticated user ID (promotion creator)
   * @returns Created promotion with all fields
   * @throws Error if template doesn't exist, is inactive, or database operation fails
   */
  async createPromotion(command: CreatePromotionCommand, userId: string): Promise<PromotionRow> {
    // =========================================================================
    // Step 1: Validate Template Exists and Is Active
    // =========================================================================
    const { data: template, error: templateError } = await this.supabase
      .from("promotion_templates")
      .select("id, path, from_level, to_level, is_active")
      .eq("id", command.template_id)
      .single();

    // Handle template not found
    if (templateError || !template) {
      throw new Error(`Template not found: ${command.template_id}`);
    }

    // Handle template inactive (throw same error type for security)
    if (!template.is_active) {
      throw new Error(`Template not found: ${command.template_id}`);
    }

    // =========================================================================
    // Step 2: Create Promotion Record
    // =========================================================================
    const { data: promotion, error: createError } = await this.supabase
      .from("promotions")
      .insert({
        template_id: command.template_id,
        created_by: userId,
        path: template.path,
        from_level: template.from_level,
        to_level: template.to_level,
        status: "draft",
        executed: false,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create promotion: ${createError.message}`);
    }

    if (!promotion) {
      throw new Error("Promotion creation returned no data");
    }

    return promotion as PromotionRow;
  }

  /**
   * Deletes a draft promotion
   *
   * Validates that the promotion exists, is in draft status, and belongs to the
   * current user. Deletion cascades to promotion_badges, unlocking badge applications.
   *
   * @param promotionId - ID of promotion to delete
   * @param userId - Current authenticated user ID (for ownership check)
   * @throws Error if promotion not found, not draft, or not owned by user
   */
  async deletePromotion(promotionId: string, userId: string): Promise<void> {
    // =========================================================================
    // Step 1: Fetch Promotion and Validate
    // =========================================================================
    const { data: promotion, error: fetchError } = await this.supabase
      .from("promotions")
      .select("id, status, created_by")
      .eq("id", promotionId)
      .single();

    // Handle promotion not found
    if (fetchError || !promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    // Handle status validation
    if (promotion.status !== "draft") {
      throw new Error(`Only draft promotions can be deleted. Current status: ${promotion.status}`);
    }

    // Handle ownership validation
    if (promotion.created_by !== userId) {
      throw new Error("You do not have permission to delete this promotion");
    }

    // =========================================================================
    // Step 2: Delete Promotion (CASCADE to promotion_badges)
    // =========================================================================
    const { error: deleteError } = await this.supabase.from("promotions").delete().eq("id", promotionId);

    if (deleteError) {
      throw new Error(`Failed to delete promotion: ${deleteError.message}`);
    }

    // Cascade delete to promotion_badges happens automatically via ON DELETE CASCADE
    // Badge applications are now unlocked and available for other promotions
  }

  /**
   * Adds badge applications to a promotion draft
   *
   * Validates promotion ownership, status, and badge application validity.
   * Creates reservation records in promotion_badges junction table.
   * Handles concurrent reservation conflicts with structured error.
   *
   * @param promotionId - Promotion UUID
   * @param command - Badge application IDs to add
   * @param userId - Current authenticated user ID
   * @returns Success result with added count
   * @throws Error with specific messages for different failure scenarios:
   *   - "Promotion not found: {id}" - Promotion doesn't exist
   *   - "User does not own promotion: {id}" - Not authorized
   *   - "Promotion is not in draft status: {id} (current: {status})" - Wrong status
   *   - "Badge application not found: {id}" - Badge doesn't exist
   *   - "Badge application not accepted: {id}" - Badge not in accepted status
   *   - "Badge already reserved: {badgeId} by promotion {promotionId}" - Conflict
   */
  async addBadgesToPromotion(
    promotionId: string,
    command: AddPromotionBadgesCommand,
    userId: string
  ): Promise<{ promotion_id: string; added_count: number; badge_application_ids: string[] }> {
    // =========================================================================
    // Step 1: Fetch and Validate Promotion
    // =========================================================================
    const { data: promotion, error: promotionError } = await this.supabase
      .from("promotions")
      .select("id, created_by, status")
      .eq("id", promotionId)
      .single();

    if (promotionError || !promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    // Validate ownership
    if (promotion.created_by !== userId) {
      throw new Error(`User does not own promotion: ${promotionId}`);
    }

    // Validate status
    if (promotion.status !== "draft") {
      throw new Error(`Promotion is not in draft status: ${promotionId} (current: ${promotion.status})`);
    }

    // =========================================================================
    // Step 2: Validate All Badge Applications (Batch Query)
    // =========================================================================
    const { data: badgeApplications, error: badgeError } = await this.supabase
      .from("badge_applications")
      .select("id, status")
      .in("id", command.badge_application_ids);

    if (badgeError) {
      throw new Error(`Failed to fetch badge applications: ${badgeError.message}`);
    }

    // Check all badges were found
    if (!badgeApplications || badgeApplications.length !== command.badge_application_ids.length) {
      const foundIds = badgeApplications?.map((ba) => ba.id) || [];
      const missingIds = command.badge_application_ids.filter((id) => !foundIds.includes(id));
      throw new Error(`Badge application not found: ${missingIds[0]}`);
    }

    // Check all badges are accepted
    const notAcceptedBadge = badgeApplications.find((ba) => ba.status !== "accepted");
    if (notAcceptedBadge) {
      throw new Error(`Badge application not accepted: ${notAcceptedBadge.id}`);
    }

    // =========================================================================
    // Step 3: Insert Promotion Badges (Batch Insert)
    // =========================================================================
    const promotionBadges = command.badge_application_ids.map((badgeAppId) => ({
      promotion_id: promotionId,
      badge_application_id: badgeAppId,
      assigned_by: userId,
      consumed: false,
    }));

    const { error: insertError } = await this.supabase.from("promotion_badges").insert(promotionBadges);

    if (insertError) {
      // =========================================================================
      // Step 4: Handle Unique Constraint Violation (Reservation Conflict)
      // =========================================================================
      // Check for unique constraint violation (PostgreSQL error code 23505)
      // This occurs when a badge is already reserved by another promotion
      if (insertError.code === "23505") {
        // Find which badge is conflicting by checking existing reservations
        // We need to query to find the owning promotion
        let conflictingBadgeId: string | null = null;
        let owningPromotionId: string | null = null;

        // Check each badge application to find which one is already reserved
        for (const badgeAppId of command.badge_application_ids) {
          const { data: existingReservation } = await this.supabase
            .from("promotion_badges")
            .select("promotion_id, badge_application_id")
            .eq("badge_application_id", badgeAppId)
            .eq("consumed", false)
            .single();

          if (existingReservation) {
            conflictingBadgeId = badgeAppId;
            owningPromotionId = existingReservation.promotion_id;
            break;
          }
        }

        if (conflictingBadgeId && owningPromotionId) {
          throw new Error(`Badge already reserved: ${conflictingBadgeId} by promotion ${owningPromotionId}`);
        }

        // Fallback if we couldn't identify specific badge
        throw new Error("Badge reservation conflict");
      }

      // Other database errors
      throw new Error(`Failed to add badges to promotion: ${insertError.message}`);
    }

    // =========================================================================
    // Step 5: Return Success Result
    // =========================================================================
    return {
      promotion_id: promotionId,
      added_count: command.badge_application_ids.length,
      badge_application_ids: command.badge_application_ids,
    };
  }

  /**
   * Removes badge applications from a promotion draft
   *
   * Validates promotion ownership, status, and badge assignment.
   * Deletes reservation records from promotion_badges junction table.
   * Optionally reverts badge application status to 'accepted'.
   *
   * @param promotionId - Promotion UUID
   * @param command - Badge application IDs to remove
   * @param userId - Current authenticated user ID
   * @returns Success result with removed count
   * @throws Error with specific messages for different failure scenarios:
   *   - "Promotion not found: {id}" - Promotion doesn't exist
   *   - "User does not own promotion: {id}" - Not authorized
   *   - "Promotion is not in draft status: {id} (current: {status})" - Wrong status
   *   - "Badge application not in promotion: {id} (promotion: {promotionId})" - Badge not assigned
   */
  async removeBadgesFromPromotion(
    promotionId: string,
    command: RemovePromotionBadgesCommand,
    userId: string
  ): Promise<{ removed_count: number }> {
    // =========================================================================
    // Step 1: Fetch and Validate Promotion
    // =========================================================================
    const { data: promotion, error: promotionError } = await this.supabase
      .from("promotions")
      .select("id, created_by, status")
      .eq("id", promotionId)
      .single();

    if (promotionError || !promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    // Validate ownership
    if (promotion.created_by !== userId) {
      throw new Error(`User does not own promotion: ${promotionId}`);
    }

    // Validate status
    if (promotion.status !== "draft") {
      throw new Error(`Promotion is not in draft status: ${promotionId} (current: ${promotion.status})`);
    }

    // =========================================================================
    // Step 2: Verify All Badge Applications Are in Promotion (Batch Query)
    // =========================================================================
    const { data: currentBadges, error: verifyError } = await this.supabase
      .from("promotion_badges")
      .select("badge_application_id")
      .eq("promotion_id", promotionId)
      .in("badge_application_id", command.badge_application_ids);

    if (verifyError) {
      throw new Error(`Failed to verify badge assignments: ${verifyError.message}`);
    }

    // Check all requested badges are in the promotion
    if (!currentBadges || currentBadges.length !== command.badge_application_ids.length) {
      const foundIds = currentBadges?.map((b) => b.badge_application_id) || [];
      const missingIds = command.badge_application_ids.filter((id) => !foundIds.includes(id));
      throw new Error(`Badge application not in promotion: ${missingIds[0]} (promotion: ${promotionId})`);
    }

    // =========================================================================
    // Step 3: Delete Promotion Badges Records (Batch Delete)
    // =========================================================================
    const { error: deleteError } = await this.supabase
      .from("promotion_badges")
      .delete()
      .eq("promotion_id", promotionId)
      .in("badge_application_id", command.badge_application_ids);

    if (deleteError) {
      throw new Error(`Failed to remove badges from promotion: ${deleteError.message}`);
    }

    // =========================================================================
    // Step 4: (Optional) Revert Badge Application Status to 'accepted'
    // =========================================================================
    // This step is optional depending on business logic
    // Uncomment if you want to revert status immediately
    /*
    const { error: updateError } = await this.supabase
      .from("badge_applications")
      .update({ status: "accepted" })
      .in("id", command.badge_application_ids)
      .eq("status", "used_in_promotion");

    if (updateError) {
      throw new Error(`Failed to update badge status: ${updateError.message}`);
    }
    */

    // =========================================================================
    // Step 5: Return Success Result
    // =========================================================================
    return {
      removed_count: command.badge_application_ids.length,
    };
  }

  /**
   * Validates a promotion against its template requirements
   *
   * Counts badge applications in the promotion by category and level,
   * then compares against template rules. Returns detailed validation
   * result showing which requirements are satisfied and which are missing.
   *
   * Uses exact-match logic: gold ≠ silver ≠ bronze (no level equivalence)
   * Handles "any" category rules that match badges of all categories
   *
   * @param promotionId - Promotion UUID to validate
   * @param userId - Current user ID (for authorization)
   * @param isAdmin - Whether current user is admin
   * @returns Validation result if found and authorized, null otherwise
   * @throws Error if database query fails
   */
  async validatePromotion(
    promotionId: string,
    userId?: string,
    isAdmin = false
  ): Promise<PromotionValidationResponse | null> {
    // =========================================================================
    // Step 1: Fetch Promotion with Template (Including Rules)
    // =========================================================================
    let query = this.supabase
      .from("promotions")
      .select(
        `
        id,
        created_by,
        promotion_templates!inner(
          id,
          rules
        )
      `
      )
      .eq("id", promotionId);

    // Apply authorization filter for non-admin users
    if (!isAdmin && userId) {
      query = query.eq("created_by", userId);
    }

    const { data: promotion, error: promotionError } = await query.single();

    // Handle not found or unauthorized
    if (promotionError) {
      if (promotionError.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch promotion: ${promotionError.message}`);
    }

    if (!promotion) {
      return null;
    }

    // Extract template rules with type casting
    const templateRules = promotion.promotion_templates.rules as unknown as PromotionTemplateRule[];

    // =========================================================================
    // Step 2: Fetch Badge Applications in Promotion
    // =========================================================================
    const { data: badgeData, error: badgeError } = await this.supabase
      .from("promotion_badges")
      .select(
        `
        badge_applications!inner(
          catalog_badges!inner(
            category,
            level
          )
        )
      `
      )
      .eq("promotion_id", promotionId);

    if (badgeError) {
      throw new Error(`Failed to fetch badge applications: ${badgeError.message}`);
    }

    // =========================================================================
    // Step 3: Count Badges by Category and Level
    // =========================================================================
    // Build map: { "category:level": count }
    const badgeCounts = new Map<string, number>();

    if (badgeData) {
      for (const item of badgeData) {
        const badge = item.badge_applications?.catalog_badges;
        if (badge) {
          const key = `${badge.category}:${badge.level}`;
          badgeCounts.set(key, (badgeCounts.get(key) || 0) + 1);
        }
      }
    }

    // =========================================================================
    // Step 4: Helper Function to Count Badges for a Rule
    // =========================================================================
    const countBadgesForRule = (rule: PromotionTemplateRule): number => {
      if (rule.category === "any") {
        // Sum all badges with matching level (any category)
        let count = 0;
        for (const [key, value] of badgeCounts) {
          const [, level] = key.split(":");
          if (level === rule.level) {
            count += value;
          }
        }
        return count;
      } else {
        // Count badges with matching category AND level
        const key = `${rule.category}:${rule.level}`;
        return badgeCounts.get(key) || 0;
      }
    };

    // =========================================================================
    // Step 5: Validate Against Template Rules
    // =========================================================================
    const requirements: PromotionRequirement[] = [];
    const missing: MissingBadge[] = [];

    for (const rule of templateRules) {
      const currentCount = countBadgesForRule(rule);
      const satisfied = currentCount >= rule.count;

      // Build requirement object
      requirements.push({
        category: rule.category as BadgeCategoryType | "any",
        level: rule.level,
        required: rule.count,
        current: currentCount,
        satisfied,
      });

      // Add to missing list if not satisfied
      if (!satisfied) {
        missing.push({
          category: rule.category as BadgeCategoryType | "any",
          level: rule.level,
          count: rule.count - currentCount,
        });
      }
    }

    // =========================================================================
    // Step 6: Determine Overall Validity
    // =========================================================================
    const isValid = requirements.every((req) => req.satisfied);

    // =========================================================================
    // Step 7: Return Validation Result
    // =========================================================================
    return {
      promotion_id: promotionId,
      is_valid: isValid,
      requirements,
      missing,
    };
  }
}
