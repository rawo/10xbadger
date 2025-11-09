/**
 * PromotionTemplatesView Component
 *
 * Main orchestration component for the promotion templates list view.
 * Manages state, handles filtering, sorting, pagination, and coordinates
 * all child components for template management.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { TemplateListHeader } from "./TemplateListHeader";
import { TemplateFilterBar } from "./TemplateFilterBar";
import { TemplateGrid } from "./TemplateGrid";
import { Pagination } from "./Pagination";
import { TemplateFormModal } from "./TemplateFormModal";
import { ConfirmDeactivateModal } from "./ConfirmDeactivateModal";
import type {
  PromotionTemplatesViewProps,
  PromotionTemplateListItemDto,
  PaginatedResponse,
  TemplateFilters,
  TemplateSortOptions,
  PaginationMetadata,
  ApiError,
  TemplateFormData,
} from "@/types";

export function PromotionTemplatesView(props: PromotionTemplatesViewProps) {
  const { initialData, isAdmin } = props;

  // =========================================================================
  // State Management
  // =========================================================================

  // Templates and pagination
  const [templates, setTemplates] = useState<PromotionTemplateListItemDto[]>(initialData.data);
  const [pagination, setPagination] = useState<PaginationMetadata>(initialData.pagination);

  // Filters and sorting
  const [filters, setFilters] = useState<TemplateFilters>({
    is_active: true, // Default to active templates only
  });
  const [sortOptions, setSortOptions] = useState<TemplateSortOptions>({
    sort: "name",
    order: "asc",
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromotionTemplateListItemDto | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [templateToDeactivate, setTemplateToDeactivate] = useState<PromotionTemplateListItemDto | null>(null);

  // Track if we should refetch on filter/sort/pagination changes
  const [shouldRefetch, setShouldRefetch] = useState(false);

  // =========================================================================
  // API Functions
  // =========================================================================

  /**
   * Fetch templates with current filters, sort, and pagination
   */
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        is_active: filters.is_active.toString(),
        sort: sortOptions.sort,
        order: sortOptions.order,
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      if (filters.path) queryParams.set("path", filters.path);
      if (filters.from_level) queryParams.set("from_level", filters.from_level);
      if (filters.to_level) queryParams.set("to_level", filters.to_level);

      const response = await fetch(`/api/promotion-templates?${queryParams}`);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to fetch templates");
      }

      const data: PaginatedResponse<PromotionTemplateListItemDto> = await response.json();
      setTemplates(data.data);
      setPagination(data.pagination);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load templates";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortOptions, pagination.limit, pagination.offset]);

  // =========================================================================
  // Effects
  // =========================================================================

  /**
   * Refetch templates when filters, sort, or pagination changes
   */
  useEffect(() => {
    if (shouldRefetch) {
      fetchTemplates();
      setShouldRefetch(false);
    }
  }, [shouldRefetch, fetchTemplates]);

  // =========================================================================
  // Event Handlers
  // =========================================================================

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: TemplateFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, offset: 0 })); // Reset to first page
    setShouldRefetch(true);
  };

  /**
   * Handle sort changes
   */
  const handleSortChange = (newSortOptions: TemplateSortOptions) => {
    setSortOptions(newSortOptions);
    setShouldRefetch(true);
  };

  /**
   * Handle page navigation
   */
  const handlePageChange = (newOffset: number) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
    setShouldRefetch(true);
  };

  /**
   * Handle page size change
   * TODO: Wire up to Pagination when implemented
   */

  const _handlePageSizeChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, offset: 0 })); // Reset to first page
    setShouldRefetch(true);
  };

  /**
   * Handle create template click
   */
  const handleCreateClick = () => {
    setFormMode("create");
    setSelectedTemplate(null);
    setIsFormModalOpen(true);
  };

  /**
   * Handle edit template click
   */
  const handleEditClick = (template: PromotionTemplateListItemDto) => {
    setFormMode("edit");
    setSelectedTemplate(template);
    setIsFormModalOpen(true);
  };

  /**
   * Handle deactivate template click
   */
  const handleDeactivateClick = (template: PromotionTemplateListItemDto) => {
    setTemplateToDeactivate(template);
    setIsDeactivateModalOpen(true);
  };

  /**
   * Handle template card click - navigate to detail (placeholder)
   * TODO: Wire up to TemplateCard when implemented
   */

  const _handleTemplateClick = (id: string) => {
    // Navigate to the template detail page
    // Use full path so Astro SSR route handles the request
    window.location.href = `/promotion-templates/${id}`;
  };

  /**
   * Close form modal
   */
  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setFormMode(null);
    setSelectedTemplate(null);
  };

  /**
   * Handle form submit success
   */
  const handleFormSubmit = async (data: TemplateFormData) => {
    if (formMode === "create") {
      const response = await fetch("/api/promotion-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to create template");
      }
    } else if (formMode === "edit" && selectedTemplate) {
      const response = await fetch(`/api/promotion-templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to update template");
      }
    }

    await fetchTemplates();
    handleFormModalClose();
  };

  /**
   * Close deactivate modal
   */
  const handleDeactivateModalClose = () => {
    setIsDeactivateModalOpen(false);
    setTemplateToDeactivate(null);
  };

  /**
   * Handle deactivate confirm
   */
  const handleDeactivateConfirm = async () => {
    if (!templateToDeactivate) return;

    try {
      const response = await fetch(`/api/promotion-templates/${templateToDeactivate.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to deactivate template");
      }

      toast.success("Template deactivated successfully");

      // Refetch templates
      await fetchTemplates();
      handleDeactivateModalClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to deactivate template";
      toast.error(message);
    }
  };

  // =========================================================================
  // Helper Functions
  // =========================================================================

  /**
   * Check if filters are active (not default values)
   */
  const hasActiveFilters = Boolean(filters.path || filters.from_level || filters.to_level || !filters.is_active);

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilters({ is_active: true });
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setShouldRefetch(true);
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <TemplateListHeader isAdmin={isAdmin} onCreateClick={handleCreateClick} />

      {/* Filter Bar */}
      <TemplateFilterBar
        filters={filters}
        sortOptions={sortOptions}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        resultCount={pagination.total}
      />

      {/* Templates Grid */}
      <TemplateGrid
        templates={templates}
        isLoading={isLoading}
        isAdmin={isAdmin}
        hasFilters={hasActiveFilters}
        onTemplateClick={_handleTemplateClick}
        onEditClick={handleEditClick}
        onDeactivateClick={handleDeactivateClick}
        onCreateClick={handleCreateClick}
        onClearFilters={handleClearFilters}
      />

      {/* Pagination */}
      {!isLoading && templates.length > 0 && (
        <Pagination pagination={pagination} onPageChange={handlePageChange} onPageSizeChange={_handlePageSizeChange} />
      )}

      {/* Form Modal */}
      <TemplateFormModal
        isOpen={isFormModalOpen}
        mode={formMode || "create"}
        template={selectedTemplate || undefined}
        onClose={handleFormModalClose}
        onSubmit={handleFormSubmit}
      />

      {/* Deactivate Confirmation Modal */}
      <ConfirmDeactivateModal
        isOpen={isDeactivateModalOpen}
        template={templateToDeactivate}
        onConfirm={handleDeactivateConfirm}
        onCancel={handleDeactivateModalClose}
      />
    </div>
  );
}
