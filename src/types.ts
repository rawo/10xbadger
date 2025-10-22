/**
 * DTO (Data Transfer Object) and Command Model Type Definitions
 *
 * This file contains all type definitions for API requests and responses,
 * derived from the database schema and aligned with the REST API plan.
 *
 * Organization:
 * 1. Database type aliases
 * 2. Enums and constants
 * 3. Nested object types
 * 4. Entity DTOs
 * 5. Command Models
 * 6. Response types
 */

import type { Tables } from "./db/database.types";

// =============================================================================
// Database Type Aliases
// =============================================================================

export type UserRow = Tables<"users">;
export type CatalogBadgeRow = Tables<"catalog_badges">;
export type BadgeApplicationRow = Tables<"badge_applications">;
export type PromotionTemplateRow = Tables<"promotion_templates">;
export type PromotionRow = Tables<"promotions">;
export type PromotionBadgeRow = Tables<"promotion_badges">;
export type AuditLogRow = Tables<"audit_logs">;
export type SettingRow = Tables<"settings">;

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Badge categories as defined in the catalog
 */
export const BadgeCategory = {
  Technical: "technical",
  Organizational: "organizational",
  Softskilled: "softskilled",
} as const;

export type BadgeCategoryType = (typeof BadgeCategory)[keyof typeof BadgeCategory];

/**
 * Badge levels (gold, silver, bronze)
 */
export const BadgeLevel = {
  Gold: "gold",
  Silver: "silver",
  Bronze: "bronze",
} as const;

export type BadgeLevelType = (typeof BadgeLevel)[keyof typeof BadgeLevel];

/**
 * Catalog badge statuses
 */
export const CatalogBadgeStatus = {
  Active: "active",
  Inactive: "inactive",
} as const;

export type CatalogBadgeStatusType = (typeof CatalogBadgeStatus)[keyof typeof CatalogBadgeStatus];

/**
 * Badge application statuses
 */
export const BadgeApplicationStatus = {
  Draft: "draft",
  Submitted: "submitted",
  Accepted: "accepted",
  Rejected: "rejected",
  UsedInPromotion: "used_in_promotion",
} as const;

export type BadgeApplicationStatusType = (typeof BadgeApplicationStatus)[keyof typeof BadgeApplicationStatus];

/**
 * Career paths for promotions
 */
export const PromotionPath = {
  Technical: "technical",
  Financial: "financial",
  Management: "management",
} as const;

export type PromotionPathType = (typeof PromotionPath)[keyof typeof PromotionPath];

/**
 * Promotion statuses
 */
export const PromotionStatus = {
  Draft: "draft",
  Submitted: "submitted",
  Approved: "approved",
  Rejected: "rejected",
} as const;

export type PromotionStatusType = (typeof PromotionStatus)[keyof typeof PromotionStatus];

// =============================================================================
// Nested Object Types
// =============================================================================

/**
 * Rule definition for promotion templates
 * Specifies required badge counts by category and level
 */
export interface PromotionTemplateRule {
  category: BadgeCategoryType | "any";
  level: BadgeLevelType;
  count: number;
}

/**
 * Summary of a catalog badge (for nested responses)
 */
export interface CatalogBadgeSummary {
  id: string;
  title: string;
  category: BadgeCategoryType;
  level: BadgeLevelType;
}

/**
 * Detailed catalog badge information (for nested responses)
 */
export interface CatalogBadgeDetail extends CatalogBadgeSummary {
  description: string | null;
  version: number;
}

/**
 * Summary of a promotion template (for nested responses)
 */
export interface PromotionTemplateSummary {
  id: string;
  name: string;
}

/**
 * Detailed promotion template with typed rules (for nested responses)
 */
export interface PromotionTemplateDetail {
  id: string;
  name: string;
  path: string;
  from_level: string;
  to_level: string;
  rules: PromotionTemplateRule[];
  is_active: boolean;
}

/**
 * Summary of a user (for nested responses)
 */
export interface UserSummary {
  id: string;
  display_name: string;
  email: string;
}

/**
 * Badge application with catalog badge details (for nested in promotion detail)
 */
export interface BadgeApplicationWithBadge {
  id: string;
  catalog_badge_id: string;
  catalog_badge: CatalogBadgeSummary;
  date_of_fulfillment: string | null;
  status: BadgeApplicationStatusType;
}

// =============================================================================
// User DTOs
// =============================================================================

/**
 * User DTO - returned from GET /api/me and nested in other responses
 */
export type UserDto = UserRow;

// =============================================================================
// Catalog Badge DTOs
// =============================================================================

/**
 * Catalog badge DTO with typed rules field
 * Used for list and detail responses
 */
export type CatalogBadgeDto = CatalogBadgeRow;

/**
 * List item for catalog badges (GET /api/catalog-badges)
 */
export type CatalogBadgeListItemDto = CatalogBadgeDto;

/**
 * Detail response for a single catalog badge (GET /api/catalog-badges/:id)
 */
export type CatalogBadgeDetailDto = CatalogBadgeDto;

// =============================================================================
// Badge Application DTOs
// =============================================================================

/**
 * Badge application list item with nested catalog badge summary
 * Used for GET /api/badge-applications
 */
export interface BadgeApplicationListItemDto extends BadgeApplicationRow {
  catalog_badge: CatalogBadgeSummary;
}

/**
 * Badge application detail with full catalog badge and applicant info
 * Used for GET /api/badge-applications/:id
 */
export interface BadgeApplicationDetailDto extends BadgeApplicationRow {
  catalog_badge: CatalogBadgeDetail;
  applicant: UserSummary;
}

// =============================================================================
// Promotion Template DTOs
// =============================================================================

/**
 * Promotion template with typed rules field
 * Database stores rules as JSONB, we type it as PromotionTemplateRule[]
 */
export interface PromotionTemplateDto extends Omit<PromotionTemplateRow, "rules"> {
  rules: PromotionTemplateRule[];
}

/**
 * List item for promotion templates (GET /api/promotion-templates)
 */
export type PromotionTemplateListItemDto = PromotionTemplateDto;

/**
 * Detail response for a single promotion template (GET /api/promotion-templates/:id)
 */
export type PromotionTemplateDetailDto = PromotionTemplateDto;

// =============================================================================
// Promotion DTOs
// =============================================================================

/**
 * Promotion list item with badge count and template summary
 * Used for GET /api/promotions
 */
export interface PromotionListItemDto extends PromotionRow {
  badge_count: number;
  template: PromotionTemplateSummary;
}

/**
 * Promotion detail with full template, badge applications, and creator info
 * Used for GET /api/promotions/:id
 */
export interface PromotionDetailDto extends PromotionRow {
  template: PromotionTemplateDetail;
  badge_applications: BadgeApplicationWithBadge[];
  creator: UserSummary;
}

// =============================================================================
// Command Models - Catalog Badges
// =============================================================================

/**
 * Create catalog badge command (POST /api/catalog-badges)
 */
export interface CreateCatalogBadgeCommand {
  title: string;
  description?: string;
  category: BadgeCategoryType;
  level: BadgeLevelType;
  metadata?: Record<string, unknown>;
}

/**
 * Update catalog badge command (PUT /api/catalog-badges/:id)
 */
export interface UpdateCatalogBadgeCommand {
  title?: string;
  description?: string;
  category?: BadgeCategoryType;
  level?: BadgeLevelType;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Command Models - Badge Applications
// =============================================================================

/**
 * Create badge application command (POST /api/badge-applications)
 */
export interface CreateBadgeApplicationCommand {
  catalog_badge_id: string;
  date_of_application: string; // ISO date string (YYYY-MM-DD)
  date_of_fulfillment?: string; // ISO date string (YYYY-MM-DD)
  reason?: string;
}

/**
 * Update badge application command (PUT /api/badge-applications/:id)
 */
export interface UpdateBadgeApplicationCommand {
  date_of_application?: string; // ISO date string (YYYY-MM-DD)
  date_of_fulfillment?: string; // ISO date string (YYYY-MM-DD)
  reason?: string;
}

/**
 * Review badge application command (POST /api/badge-applications/:id/accept or /reject)
 */
export interface ReviewBadgeApplicationCommand {
  review_reason?: string; // Optional for accept, required for reject
}

// =============================================================================
// Command Models - Promotion Templates
// =============================================================================

/**
 * Create promotion template command (POST /api/promotion-templates)
 */
export interface CreatePromotionTemplateCommand {
  name: string;
  path: PromotionPathType;
  from_level: string;
  to_level: string;
  rules: PromotionTemplateRule[];
}

/**
 * Update promotion template command (PUT /api/promotion-templates/:id)
 */
export interface UpdatePromotionTemplateCommand {
  name?: string;
  rules?: PromotionTemplateRule[];
}

// =============================================================================
// Command Models - Promotions
// =============================================================================

/**
 * Create promotion command (POST /api/promotions)
 */
export interface CreatePromotionCommand {
  template_id: string;
}

/**
 * Add badges to promotion command (POST /api/promotions/:id/badges)
 */
export interface AddPromotionBadgesCommand {
  badge_application_ids: string[];
}

/**
 * Remove badges from promotion command (DELETE /api/promotions/:id/badges)
 */
export interface RemovePromotionBadgesCommand {
  badge_application_ids: string[];
}

/**
 * Reject promotion command (POST /api/promotions/:id/reject)
 */
export interface RejectPromotionCommand {
  reject_reason: string;
}

// =============================================================================
// Validation Response Types
// =============================================================================

/**
 * Single requirement in promotion validation response
 */
export interface PromotionRequirement {
  category: BadgeCategoryType | "any";
  level: BadgeLevelType;
  required: number;
  current: number;
  satisfied: boolean;
}

/**
 * Missing badge information in validation response
 */
export interface MissingBadge {
  category: BadgeCategoryType | "any";
  level: BadgeLevelType;
  count: number;
}

/**
 * Promotion validation response (GET /api/promotions/:id/validation)
 */
export interface PromotionValidationResponse {
  promotion_id: string;
  is_valid: boolean;
  requirements: PromotionRequirement[];
  missing: MissingBadge[];
}

// =============================================================================
// Pagination Types
// =============================================================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMetadata {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Validation error detail (field-level error)
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
}

/**
 * Reservation conflict error (HTTP 409)
 * Returned when a badge application is already reserved by another promotion
 */
export interface ReservationConflictError extends ApiError {
  conflict_type: "badge_already_reserved";
  badge_application_id: string;
  owning_promotion_id: string;
}

/**
 * Invalid status transition error (HTTP 409)
 */
export interface InvalidStatusError extends ApiError {
  current_status: string;
}

/**
 * Validation failed error (HTTP 409)
 * Returned when promotion doesn't meet template requirements
 */
export interface ValidationFailedError extends ApiError {
  missing: MissingBadge[];
}

/**
 * Badge application invalid error (HTTP 400)
 */
export interface InvalidBadgeApplicationError extends ApiError {
  badge_application_id: string;
}

// =============================================================================
// Position Levels Types
// =============================================================================

/**
 * Badge requirement for a position level
 */
export interface PositionLevelBadgeRequirement {
  level: BadgeLevelType;
  count: number;
}

/**
 * Position level definition from configuration
 */
export interface PositionLevel {
  next_level?: string;
  required_badges: Record<BadgeCategoryType | "any", PositionLevelBadgeRequirement[]>;
}

/**
 * Position levels configuration response (GET /api/position-levels)
 */
export interface PositionLevelsResponse {
  positions: Record<PromotionPathType, Record<string, PositionLevel>>;
}

// =============================================================================
// Audit Log Types
// =============================================================================

/**
 * Audit log entry DTO
 */
export type AuditLogDto = AuditLogRow;

/**
 * Audit log event types
 */
export const AuditEventType = {
  AuthFailure: "auth.failure",
  ReservationConflict: "reservation.conflict",
  BadgeApplicationCreated: "badge_application.created",
  BadgeApplicationSubmitted: "badge_application.submitted",
  BadgeApplicationAccepted: "badge_application.accepted",
  BadgeApplicationRejected: "badge_application.rejected",
  PromotionCreated: "promotion.created",
  PromotionSubmitted: "promotion.submitted",
  PromotionApproved: "promotion.approved",
  PromotionRejected: "promotion.rejected",
} as const;

export type AuditEventTypeType = (typeof AuditEventType)[keyof typeof AuditEventType];
