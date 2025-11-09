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

// =============================================================================
// Dashboard View Types
// =============================================================================

/**
 * Dashboard statistics aggregated from badge applications and promotions
 */
export interface DashboardStatistics {
  draftApplicationsCount: number;
  submittedApplicationsCount: number;
  acceptedBadgesCount: number;
  rejectedApplicationsCount: number;
  draftPromotionsCount: number;
  submittedPromotionsCount: number;
  approvedPromotionsCount: number;
  rejectedPromotionsCount: number;
}

/**
 * Dashboard view model containing all data for the dashboard page
 */
export interface DashboardViewModel {
  badgeApplications: {
    draft: BadgeApplicationListItemDto[];
    submitted: BadgeApplicationListItemDto[];
    accepted: BadgeApplicationListItemDto[];
    rejected: BadgeApplicationListItemDto[];
  };
  promotions: {
    draft: PromotionListItemDto[];
    submitted: PromotionListItemDto[];
    approved: PromotionListItemDto[];
    rejected: PromotionListItemDto[];
  };
  statistics: DashboardStatistics;
}

/**
 * Props for StatCard component
 */
export interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  link?: string;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}

/**
 * Quick action item for dashboard navigation
 */
export interface QuickActionItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "secondary";
}

/**
 * Props for DashboardView component
 */
export interface DashboardViewProps {
  initialData: DashboardViewModel;
  userId: string;
}

// =============================================================================
// Badge Application Editor Types
// =============================================================================

/**
 * Form state representing all editable fields in the badge application
 */
export interface ApplicationFormData {
  catalog_badge_id: string;
  date_of_application: string; // YYYY-MM-DD format
  date_of_fulfillment: string; // YYYY-MM-DD format (empty string if not set)
  reason: string;
}

/**
 * Map of field names to error messages for displaying validation feedback
 */
export interface ValidationErrors {
  date_of_application?: string;
  date_of_fulfillment?: string;
  reason?: string;
}

/**
 * Autosave status values
 */
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * State object tracking autosave status and metadata
 */
export interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt?: Date;
  error?: string;
}

/**
 * Props for ApplicationEditor component
 */
export interface ApplicationEditorProps {
  mode: "create" | "edit";
  catalogBadge: CatalogBadgeDetailDto;
  existingApplication?: BadgeApplicationDetailDto;
  userId: string;
}

/**
 * Props for EditorHeader component
 */
export interface EditorHeaderProps {
  mode: "create" | "edit";
  status?: BadgeApplicationStatusType;
  catalogBadgeTitle: string;
}

/**
 * Props for BadgeInfoSection component
 */
export interface BadgeInfoSectionProps {
  catalogBadge: CatalogBadgeDetailDto;
}

/**
 * Props for ApplicationFormSection component
 */
export interface ApplicationFormSectionProps {
  formData: ApplicationFormData;
  errors: ValidationErrors;
  onChange: (field: keyof ApplicationFormData, value: string) => void;
  onBlur: (field: keyof ApplicationFormData) => void;
  disabled?: boolean;
}

/**
 * Props for ActionBar component
 */
export interface ActionBarProps {
  autosaveState: AutosaveState;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Props for AutosaveIndicator component
 */
export interface AutosaveIndicatorProps {
  state: AutosaveState;
}

// =============================================================================
// Applications List View Types
// =============================================================================

/**
 * Filter state for the applications list view
 */
export interface ApplicationListFilters {
  status?: BadgeApplicationStatusType;
  catalog_badge_id?: string;
  sort: "created_at" | "submitted_at";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

/**
 * Complete view model passed from Astro to React component
 */
export interface ApplicationsListViewModel {
  applications: PaginatedResponse<BadgeApplicationListItemDto>;
  filters: ApplicationListFilters;
  userId: string;
  isAdmin: boolean;
}

/**
 * Props for ApplicationsListView component
 */
export interface ApplicationsListViewProps {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  userId: string;
  isAdmin: boolean;
}

/**
 * Props for PageHeader component
 */
export interface PageHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: React.ReactNode;
}

/**
 * Props for FilterBar component
 */
export interface FilterBarProps {
  filters: ApplicationListFilters;
  onFilterChange: (filters: Partial<ApplicationListFilters>) => void;
  resultCount: number;
}

/**
 * Props for ApplicationsList component
 */
export interface ApplicationsListProps {
  applications: BadgeApplicationListItemDto[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  userId: string;
  isAdmin: boolean;
}

/**
 * Props for ApplicationRow component
 */
export interface ApplicationRowProps {
  application: BadgeApplicationListItemDto;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
  isAdmin: boolean;
}

/**
 * Props for BadgeSummaryCard component
 */
export interface BadgeSummaryCardProps {
  badge: CatalogBadgeSummary;
  showLink?: boolean;
}

/**
 * Props for StatusBadge component
 */
export interface StatusBadgeProps {
  status: BadgeApplicationStatusType;
  size?: "sm" | "md" | "lg";
}

/**
 * Props for ActionMenu component
 */
export interface ActionMenuProps {
  applicationId: string;
  status: BadgeApplicationStatusType;
  isOwner: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Props for Pagination component
 */
export interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
}

/**
 * Props for EmptyState component
 */
export interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onCreate?: () => void;
}

// =============================================================================
// Catalog Badges View Types
// =============================================================================

/**
 * Filter state for catalog badges view
 */
export interface CatalogBadgeFilters {
  category?: BadgeCategoryType;
  level?: BadgeLevelType;
  status?: CatalogBadgeStatusType;
  search?: string; // Search query (q parameter)
  sort: "created_at" | "title";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

/**
 * Props for CatalogBadgesView component
 */
export interface CatalogBadgesViewProps {
  initialData: PaginatedResponse<CatalogBadgeListItemDto>;
  userId: string;
  isAdmin: boolean;
}

/**
 * Form data for badge create/edit modal
 */
export interface BadgeFormData {
  title: string;
  description: string;
  category: BadgeCategoryType | "";
  level: BadgeLevelType | "";
  metadata?: Record<string, unknown>;
}

/**
 * Props for BadgeFormModal
 */
export interface BadgeFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  badge?: CatalogBadgeListItemDto;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Props for BadgeCard component
 */
export interface BadgeCardProps {
  badge: CatalogBadgeListItemDto;
  isAdmin: boolean;
  onClick: (badgeId: string) => void;
  onEdit: (badge: CatalogBadgeListItemDto) => void;
  onDeactivate: (badgeId: string) => void;
}

/**
 * Props for catalog FilterBar component
 */
export interface CatalogFilterBarProps {
  filters: CatalogBadgeFilters;
  onFilterChange: (filters: Partial<CatalogBadgeFilters>) => void;
  resultCount: number;
  isAdmin: boolean;
}

/**
 * Props for BadgeGrid component
 */
export interface BadgeGridProps {
  badges: CatalogBadgeListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  onBadgeClick: (badgeId: string) => void;
  onEditClick: (badge: CatalogBadgeListItemDto) => void;
  onDeactivateClick: (badgeId: string) => void;
}

/**
 * Props for ConfirmDeactivateModal
 */
export interface ConfirmDeactivateModalProps {
  isOpen: boolean;
  badge: CatalogBadgeListItemDto | null;
  onConfirm: (badgeId: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for catalog PageHeader component
 */
export interface CatalogPageHeaderProps {
  title: string;
  isAdmin: boolean;
  onCreateClick: () => void;
}

// =============================================================================
// Application Detail View Types
// =============================================================================

/**
 * Props for ApplicationDetailView component
 */
export interface ApplicationDetailViewProps {
  initialData: BadgeApplicationDetailDto;
  userId: string;
  isAdmin: boolean;
}

/**
 * Props for DetailHeader component
 */
export interface DetailHeaderProps {
  applicationId: string;
  badgeTitle: string;
  status: BadgeApplicationStatusType;
}

/**
 * Props for ApplicationInfoCard component
 */
export interface ApplicationInfoCardProps {
  dateOfApplication: string;
  dateOfFulfillment: string | null;
  reason: string | null;
  createdAt: string;
  submittedAt: string | null;
}

/**
 * Props for CatalogBadgeInfoCard component
 */
export interface CatalogBadgeInfoCardProps {
  badge: CatalogBadgeDetail;
}

/**
 * Props for ApplicantInfoCard component
 */
export interface ApplicantInfoCardProps {
  applicant: UserSummary;
  isVisible: boolean;
}

/**
 * Props for ReviewInfoCard component
 */
export interface ReviewInfoCardProps {
  status: BadgeApplicationStatusType;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  isVisible: boolean;
}

/**
 * Props for ActionBar component
 */
export interface ActionBarProps {
  status: BadgeApplicationStatusType;
  isOwner: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onBack: () => void;
}

/**
 * Props for ReviewModal component
 */
export interface ReviewModalProps {
  isOpen: boolean;
  mode: "accept" | "reject";
  applicationTitle: string;
  onConfirm: (decisionNote?: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for ConfirmSubmitModal component
 */
export interface ConfirmSubmitModalProps {
  isOpen: boolean;
  applicationTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for ConfirmDeleteModal component
 */
export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  applicationTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Form data for review modal
 */
export interface ReviewFormData {
  decisionNote: string;
}

// =============================================================================
// Promotion Templates List View Types
// =============================================================================

/**
 * Filter state for promotion templates list
 */
export interface TemplateFilters {
  path?: PromotionPathType;
  from_level?: string;
  to_level?: string;
  is_active: boolean;
}

/**
 * Sort options for promotion templates list
 */
export interface TemplateSortOptions {
  sort: "created_at" | "name";
  order: "asc" | "desc";
}

/**
 * Form data for creating/editing promotion templates
 */
export interface TemplateFormData {
  name: string;
  path: PromotionPathType;
  from_level: string;
  to_level: string;
  rules: PromotionTemplateRule[];
}

/**
 * Props for PromotionTemplatesView component
 */
export interface PromotionTemplatesViewProps {
  initialData: PaginatedResponse<PromotionTemplateListItemDto>;
  isAdmin: boolean;
  userId: string;
}

/**
 * Props for TemplateListHeader component
 */
export interface TemplateListHeaderProps {
  isAdmin: boolean;
  onCreateClick: () => void;
}

/**
 * Props for TemplateFilterBar component
 */
export interface TemplateFilterBarProps {
  filters: TemplateFilters;
  sortOptions: TemplateSortOptions;
  onFilterChange: (filters: TemplateFilters) => void;
  onSortChange: (sortOptions: TemplateSortOptions) => void;
}

/**
 * Props for TemplateGrid component
 */
export interface TemplateGridProps {
  templates: PromotionTemplateListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  hasFilters: boolean;
  onTemplateClick?: (id: string) => void;
  onEditClick: (template: PromotionTemplateListItemDto) => void;
  onDeactivateClick: (template: PromotionTemplateListItemDto) => void;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

/**
 * Props for TemplateCard component
 */
export interface TemplateCardProps {
  template: PromotionTemplateListItemDto;
  isAdmin: boolean;
  onClick?: (id: string) => void;
  onEdit: (template: PromotionTemplateListItemDto) => void;
  onDeactivate: (template: PromotionTemplateListItemDto) => void;
}

/**
 * Props for RulesList component
 */
export interface RulesListProps {
  rules: PromotionTemplateRule[];
  isCompact?: boolean;
  className?: string;
}

/**
 * Props for TemplateFormModal component
 */
export interface TemplateFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  template?: PromotionTemplateListItemDto;
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
}

/**
 * Props for template ConfirmDeactivateModal component
 */
export interface TemplateConfirmDeactivateModalProps {
  isOpen: boolean;
  template: PromotionTemplateListItemDto | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for TemplateEmptyState component
 */
export interface TemplateEmptyStateProps {
  hasFilters: boolean;
  isAdmin: boolean;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

/**
 * Props for Pagination component
 */
export interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
}

// =============================================================================
// Promotion Templates Detail View Types
// =============================================================================

/**
 * Props for TemplateDetailView component
 */
export interface TemplateDetailViewProps {
  initialTemplate: PromotionTemplateDetailDto;
  isAdmin: boolean;
  userId: string;
}

/**
 * Props for TemplateDetailHeader component
 */
export interface TemplateDetailHeaderProps {
  templateName: string;
  isAdmin: boolean;
  isActive: boolean;
  onEditClick: () => void;
  onDeactivateClick: () => void;
  isLoading?: boolean;
}

/**
 * Props for TemplateOverviewCard component
 */
export interface TemplateOverviewCardProps {
  template: PromotionTemplateDetailDto;
}

/**
 * Props for TemplateRulesDetailCard component
 */
export interface TemplateRulesDetailCardProps {
  rules: PromotionTemplateRule[];
}

/**
 * Props for UseTemplateCard component
 */
export interface UseTemplateCardProps {
  templateId: string;
  templateName: string;
  templatePath: PromotionPathType;
  fromLevel: string;
  toLevel: string;
  rulesCount: number;
  isActive: boolean;
  onUseTemplate: () => void;
  isLoading?: boolean;
}

// Optional prop to indicate async loading state for header/use-card actions
export interface ActionLoadingProps {
  isLoading?: boolean;
}

// =============================================================================
// Promotion Builder / Detail View Types
// =============================================================================

/**
 * Props for PromotionBuilderView component
 */
export interface PromotionBuilderViewProps {
  initialPromotion: PromotionDetailDto;
  userId: string;
  isAdmin: boolean;
}

/**
 * Props for BuilderHeader component
 */
export interface BuilderHeaderProps {
  templateName: string;
  promotionId: string;
  status: PromotionStatusType;
}

/**
 * Props for PromotionMetadataCard component
 */
export interface PromotionMetadataCardProps {
  template: PromotionTemplateDetail;
  creator: UserSummary;
  status: PromotionStatusType;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
}

/**
 * Props for EligibilityPreview component
 */
export interface EligibilityPreviewProps {
  validationResult: PromotionValidationResponse | null;
  isLoading: boolean;
}

/**
 * Props for RequirementRow component
 */
export interface RequirementRowProps {
  requirement: PromotionRequirement;
}

/**
 * Props for BadgesList component
 */
export interface BadgesListProps {
  badges: BadgeApplicationWithBadge[];
  isDraft: boolean;
  onRemoveBadge: (badgeId: string) => void;
  isRemoving: boolean;
}

/**
 * Props for BadgeListItem component
 */
export interface BadgeListItemProps {
  badge: BadgeApplicationWithBadge;
  isDraft: boolean;
  onRemove: (badgeId: string) => void;
  isRemoving: boolean;
}

/**
 * Props for BadgePicker component
 */
export interface BadgePickerProps {
  userId: string;
  existingBadgeIds: string[];
  onAddBadges: (badgeIds: string[]) => void;
  isAdding: boolean;
}

/**
 * Props for ActionBar component (promotion builder)
 */
export interface PromotionActionBarProps {
  status: PromotionStatusType;
  isValid: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onDelete: () => void;
  onBack: () => void;
  canEdit: boolean;
}

/**
 * Props for ConflictModal component
 */
export interface ConflictModalProps {
  isOpen: boolean;
  conflictError: ReservationConflictError | null;
  onRetry: () => void;
  onClose: () => void;
  onNavigateToOwner: (promotionId: string) => void;
}

