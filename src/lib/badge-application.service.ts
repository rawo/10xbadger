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
import type {
  ListBadgeApplicationsQuery,
  CreateBadgeApplicationCommand,
  UpdateBadgeApplicationCommand,
} from "./validation/badge-application.validation";

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

  /**
   * Creates a new badge application in draft status
   *
   * This method:
   * 1. Validates that the catalog badge exists and is active
   * 2. Captures the catalog badge version for historical integrity
   * 3. Creates the application in 'draft' status
   * 4. Sets the applicant_id from the authenticated user
   *
   * @param command - The create command with badge application data
   * @param userId - The authenticated user's ID (applicant)
   * @returns The created badge application with full details
   * @throws Error with specific message if catalog badge not found or inactive
   * @throws Error if database insert fails
   */
  async createBadgeApplication(
    command: CreateBadgeApplicationCommand,
    userId: string
  ): Promise<BadgeApplicationDetailDto> {
    // =========================================================================
    // Step 1: Validate Catalog Badge Exists and is Active
    // =========================================================================
    const { data: catalogBadge, error: catalogError } = await this.supabase
      .from("catalog_badges")
      .select("id, title, description, category, level, version, status")
      .eq("id", command.catalog_badge_id)
      .single();

    if (catalogError) {
      if (catalogError.code === "PGRST116") {
        throw new Error("CATALOG_BADGE_NOT_FOUND");
      }
      throw new Error(`Failed to fetch catalog badge: ${catalogError.message}`);
    }

    // Check if catalog badge is active
    if (catalogBadge.status !== "active") {
      throw new Error("CATALOG_BADGE_INACTIVE");
    }

    // =========================================================================
    // Step 2: Prepare Insert Data
    // =========================================================================
    const insertData = {
      applicant_id: userId,
      catalog_badge_id: command.catalog_badge_id,
      catalog_badge_version: catalogBadge.version,
      date_of_application: command.date_of_application,
      date_of_fulfillment: command.date_of_fulfillment || null,
      reason: command.reason || null,
      status: "draft" as const,
    };

    // =========================================================================
    // Step 3: Insert Badge Application
    // =========================================================================
    const { data: insertedData, error: insertError } = await this.supabase
      .from("badge_applications")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create badge application: ${insertError.message}`);
    }

    // =========================================================================
    // Step 4: Fetch Full Details (with joins)
    // =========================================================================
    // Use the existing method to fetch the complete application with nested data
    const fullApplication = await this.getBadgeApplicationById(insertedData.id);

    if (!fullApplication) {
      throw new Error("Failed to retrieve created badge application");
    }

    return fullApplication;
  }

  /**
   * Updates an existing badge application.
   * - Enforces ownership rules: non-admins can only update their own drafts
   * - Validates catalog badge when changed and captures its version
   * - Validates date invariants and status transitions
   */
  async updateBadgeApplication(
    id: string,
    command: UpdateBadgeApplicationCommand,
    userId: string,
    isAdmin: boolean
  ): Promise<BadgeApplicationDetailDto> {
    // Fetch existing application
    const { data: existing, error: fetchError } = await this.supabase
      .from("badge_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new Error("NOT_FOUND");
      }
      throw new Error(`Failed to fetch badge application: ${fetchError.message}`);
    }

    // Authorization: owners can edit drafts; admins can edit for review
    if (!isAdmin && existing.applicant_id !== userId) {
      throw new Error("FORBIDDEN");
    }

    if (!isAdmin && existing.status !== "draft") {
      // Owners may only edit drafts
      throw new Error("FORBIDDEN");
    }

    const updateData: Record<string, unknown> = {};

    // Catalog badge change: validate existence and activity, capture version
    if (command.catalog_badge_id) {
      const { data: catalogBadge, error: catalogError } = await this.supabase
        .from("catalog_badges")
        .select("id, version, status")
        .eq("id", command.catalog_badge_id)
        .single();

      if (catalogError) {
        if (catalogError.code === "PGRST116") {
          throw new Error("CATALOG_BADGE_NOT_FOUND");
        }
        throw new Error(`Failed to fetch catalog badge: ${catalogError.message}`);
      }

      if (catalogBadge.status !== "active") {
        throw new Error("CATALOG_BADGE_INACTIVE");
      }

      updateData.catalog_badge_id = command.catalog_badge_id;
      updateData.catalog_badge_version = catalogBadge.version;
    }

    // Dates and reason
    if (command.date_of_application) updateData.date_of_application = command.date_of_application;
    if (command.date_of_fulfillment) updateData.date_of_fulfillment = command.date_of_fulfillment;
    if (command.reason !== undefined) updateData.reason = command.reason;

    // Status transitions
    if (command.status) {
      const newStatus = command.status;
      const currentStatus = existing.status;

      // Owner can submit draft -> submitted
      if (!isAdmin) {
        if (currentStatus === "draft" && newStatus === "submitted") {
          updateData.status = "submitted";
          updateData.submitted_at = new Date().toISOString();
        } else if (newStatus !== currentStatus) {
          throw new Error("INVALID_STATUS_TRANSITION");
        }
      } else {
        // Admin may perform review actions
        if (newStatus === "accepted" || newStatus === "rejected") {
          updateData.status = newStatus;
          updateData.reviewed_by = userId;
          updateData.reviewed_at = new Date().toISOString();
          if (command.review_reason) updateData.review_reason = command.review_reason;
        } else {
          // allow admin to set other statuses too
          updateData.status = newStatus;
        }
      }
    }

    // Additional validations
    if (updateData.date_of_application && updateData.date_of_fulfillment) {
      if ((updateData.date_of_fulfillment as string) < (updateData.date_of_application as string)) {
        throw new Error("VALIDATION_ERROR");
      }
    }

    // Prevent changing reviewer fields by non-admins via DB policy; earlier guard ensures this

    // Execute update
    const { error: updateError } = await this.supabase
      .from("badge_applications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update badge application: ${updateError.message}`);
    }

    // Return full details
    const full = await this.getBadgeApplicationById(id);
    if (!full) throw new Error("NOT_FOUND");

    // Best-effort: record audit log for submission
    try {
      await this.supabase.from("audit_logs").insert({
        action: "submit_badge_application",
        resource: "badge_applications",
        resource_id: id,
        requester_id: requesterId || null,
        meta: { catalog_badge_id: row.catalog_badge_id },
      });
    } catch (e) {
      // Do not block submission on audit failure
      // eslint-disable-next-line no-console
      console.error("Failed to write audit log for submitBadgeApplication:", e);
    }

    // Best-effort: enqueue async event for notifications/workers
    try {
      await this.supabase.from("events").insert({
        type: "badge_application.submitted",
        resource: "badge_applications",
        resource_id: id,
        payload: { id, action: "submitted" },
      });
    } catch (e) {
      // best-effort
      // eslint-disable-next-line no-console
      console.error("Failed to enqueue event for submitBadgeApplication:", e);
    }

    return full;
  }

  /**
   * Deletes a single badge application after performing ownership and reference checks.
   * - Owners may delete their own draft applications
   * - Admins may delete applications (subject to business rules)
   * @throws Error with codes: NOT_FOUND, FORBIDDEN, REFERENCED_BY_PROMOTION, or generic on DB failures
   */
  async deleteBadgeApplication(id: string, requesterId?: string, isAdmin = false): Promise<{ id: string }> {
    // Fetch minimal row for checks
    const { data: row, error: fetchErr } = await this.supabase
      .from("badge_applications")
      .select("id, applicant_id, status")
      .eq("id", id)
      .single();

    if (fetchErr) {
      const fetchErrWithCode = fetchErr as { code?: string; message?: string };
      if (fetchErrWithCode.code === "PGRST116") {
        throw new Error("NOT_FOUND");
      }
      throw new Error(`Failed to fetch badge application: ${fetchErrWithCode.message ?? String(fetchErr)}`);
    }

    // Ownership/authorization checks
    if (!isAdmin) {
      if (!requesterId || row.applicant_id !== requesterId) {
        throw new Error("FORBIDDEN");
      }

      // Owners may only delete drafts
      if (row.status !== "draft") {
        throw new Error("FORBIDDEN");
      }
    }

    // Dependency checks: ensure not referenced by promotion submissions
    const { data: refs, error: refsError } = await this.supabase
      .from("promotion_submissions")
      .select("id")
      .eq("badge_application_id", id)
      .limit(1);

    if (refsError) {
      throw new Error(`Failed to check references: ${refsError.message}`);
    }

    if (refs && (refs as unknown[]).length > 0) {
      throw new Error("REFERENCED_BY_PROMOTION");
    }

    // Attempt delete
    const { error: delError } = await this.supabase.from("badge_applications").delete().eq("id", id).single();

    if (delError) {
      const msg = delError.message || String(delError);
      if (msg.toLowerCase().includes("foreign") || msg.toLowerCase().includes("constraint")) {
        throw new Error("REFERENCED_BY_PROMOTION");
      }
      throw new Error(`Failed to delete badge application: ${delError.message}`);
    }

    return { id };
  }

  /**
   * Submit a badge application: validate preconditions and set status -> 'submitted'
   * - Only owners may submit their own drafts; admins may submit per business rules
   * - Validates catalog badge exists and is active and captures its version
   */
  async submitBadgeApplication(id: string, requesterId?: string, isAdmin = false): Promise<BadgeApplicationDetailDto> {
    // Fetch minimal application row for checks
    const { data: row, error: fetchErr } = await this.supabase
      .from("badge_applications")
      .select("id, applicant_id, status, catalog_badge_id, date_of_application, date_of_fulfillment, reason")
      .eq("id", id)
      .single();

    if (fetchErr) {
      const fetchErrWithCode = fetchErr as { code?: string; message?: string };
      if (fetchErrWithCode.code === "PGRST116") throw new Error("NOT_FOUND");
      throw new Error(`Failed to fetch badge application: ${fetchErrWithCode.message ?? String(fetchErr)}`);
    }

    // Authorization: owner or admin
    if (!isAdmin) {
      if (!requesterId || row.applicant_id !== requesterId) throw new Error("FORBIDDEN");
    }

    // Only allow submitting from 'draft'
    if (row.status !== "draft") {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    // Validate required fields for submission
    if (!row.catalog_badge_id) {
      throw new Error("VALIDATION_ERROR");
    }

    // Validate catalog badge exists and is active, capture version
    const { data: catalogBadge, error: catalogError } = await this.supabase
      .from("catalog_badges")
      .select("id, version, status")
      .eq("id", row.catalog_badge_id)
      .single();

    if (catalogError) {
      if ((catalogError as { code?: string }).code === "PGRST116") throw new Error("CATALOG_BADGE_NOT_FOUND");
      throw new Error(
        `Failed to fetch catalog badge: ${(catalogError as { message?: string }).message ?? String(catalogError)}`
      );
    }

    if (catalogBadge.status !== "active") {
      throw new Error("CATALOG_BADGE_INACTIVE");
    }

    const updateData: Record<string, unknown> = {
      status: "submitted",
      submitted_at: new Date().toISOString(),
      catalog_badge_version: catalogBadge.version,
    };

    // Execute update
    const { error: updateError } = await this.supabase
      .from("badge_applications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to submit badge application: ${updateError.message}`);
    }

    // Return full details
    const full = await this.getBadgeApplicationById(id);
    if (!full) throw new Error("NOT_FOUND");
    return full;
  }
}
