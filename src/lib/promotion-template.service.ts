import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PromotionTemplateListItemDto,
  PromotionTemplateDetailDto,
  PromotionTemplateRow,
  PromotionTemplateDto,
  CreatePromotionTemplateCommand,
  PaginatedResponse,
  PaginationMetadata,
  PromotionTemplateRule,
} from "../types";
import type { ListPromotionTemplatesQuery } from "./validation/promotion-template.validation";
import { AuditEventType } from "../types";

/**
 * Service class for promotion template operations
 *
 * Handles business logic for promotion templates including:
 * - Listing templates with filters, sorting, and pagination
 * - Fetching single template by ID
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

  /**
   * Creates a new promotion template
   * @param command - CreatePromotionTemplateCommand
   * @param actorId - optional actor performing the creation
   * @returns created PromotionTemplateDto
   */
  async createPromotionTemplate(
    command: CreatePromotionTemplateCommand,
    actorId?: string
  ): Promise<PromotionTemplateDto> {
    // Optional uniqueness check: ensure there isn't an identical template
    const { data: existing, error: existingError } = await this.supabase
      .from("promotion_templates")
      .select("id")
      .eq("path", command.path)
      .eq("from_level", command.from_level)
      .eq("to_level", command.to_level)
      .limit(1);

    if (existingError) {
      throw new Error(`Failed to check existing templates: ${existingError.message}`);
    }

    if (Array.isArray(existing) && existing.length > 0) {
      const conflict = Object.assign(new Error("Promotion template already exists for path/from_level/to_level"), {
        code: "conflict",
      });
      throw conflict as Error & { code: string };
    }

    // Insert template
    const insertPayload = {
      name: command.name,
      path: command.path,
      from_level: command.from_level,
      to_level: command.to_level,
      rules: command.rules as unknown as Json,
      is_active: true,
      created_by: actorId ?? null,
    };

    const { data, error } = await this.supabase.from("promotion_templates").insert(insertPayload).select().single();

    if (error) {
      throw new Error(`Failed to create promotion template: ${error.message}`);
    }

    // Best-effort audit log
    try {
      await this.supabase.from("audit_logs").insert({
        event_type: AuditEventType.PromotionCreated,
        actor_id: actorId ?? null,
        payload: {
          id: data.id,
          name: data.name,
          path: data.path,
          from_level: data.from_level,
          to_level: data.to_level,
        },
      });
    } catch (e) {
      // swallow audit errors - non-fatal
      // eslint-disable-next-line no-console
      console.error("Failed to write audit log for promotion template creation:", e);
    }

    // Return typed DTO
    return {
      id: data.id,
      name: data.name,
      path: data.path,
      from_level: data.from_level,
      to_level: data.to_level,
      rules: data.rules as unknown as PromotionTemplateRule[],
      is_active: data.is_active,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Retrieves a single promotion template by ID
   *
   * @param id - Template UUID
   * @returns Promotion template if found, null otherwise
   * @throws Error if database query fails
   */
  async getPromotionTemplateById(id: string): Promise<PromotionTemplateDetailDto | null> {
    const { data, error } = await this.supabase.from("promotion_templates").select("*").eq("id", id).single();

    if (error) {
      // Handle "not found" vs actual errors
      if (error.code === "PGRST116") {
        // PostgREST error code for no rows returned
        return null;
      }
      throw new Error(`Failed to fetch promotion template: ${error.message}`);
    }

    // Transform JSONB rules to typed array
    return {
      id: data.id,
      name: data.name,
      path: data.path,
      from_level: data.from_level,
      to_level: data.to_level,
      rules: data.rules as unknown as PromotionTemplateRule[], // Type assertion for JSONB
      is_active: data.is_active,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}
