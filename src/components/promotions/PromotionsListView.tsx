/**
 * PromotionsListView Component
 *
 * Main orchestration component for the promotions list view.
 * Manages state, filters, pagination, and coordinates all child components.
 * 
 * Features:
 * - Server-side initial data fetch with URL-based filters
 * - Client-side filter updates with URL persistence
 * - Pagination with offset-based navigation
 * - Loading skeletons for better perceived performance
 * - Empty states for filtered and non-filtered views
 * - Keyboard navigation support (Enter/Space to open, Delete to remove drafts)
 * - Role-based access control (admin vs user views)
 * - Optimistic UI updates for delete operations
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PromotionsHeader } from "./PromotionsHeader";
import { PromotionsFilterBar } from "./PromotionsFilterBar";
import { PromotionsTable } from "./PromotionsTable";
import { Pagination } from "./Pagination";
import { AdminActionModal } from "./AdminActionModal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type {
  PromotionListItemDto,
  PaginatedResponse,
  PaginationMetadata,
  ApiError,
} from "@/types";

export interface PromotionsListViewProps {
  initialData: PaginatedResponse<PromotionListItemDto>;
  initialFilters: PromotionFilters;
  userId: string;
  isAdmin: boolean;
}

export interface PromotionFilters {
  status?: "draft" | "submitted" | "approved" | "rejected";
  path?: "technical" | "financial" | "management";
  template_id?: string;
  sort: "created_at" | "submitted_at";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export function PromotionsListView(props: PromotionsListViewProps) {
  const { initialData, initialFilters, userId, isAdmin } = props;

  // =========================================================================
  // State Management
  // =========================================================================

  // Promotions and pagination
  const [promotions, setPromotions] = useState<PromotionListItemDto[]>(initialData.data);
  const [pagination, setPagination] = useState<PaginationMetadata>(initialData.pagination);

  // Filters
  const [filters, setFilters] = useState<PromotionFilters>(initialFilters);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<PromotionListItemDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin action modal states
  const [isAdminActionModalOpen, setIsAdminActionModalOpen] = useState(false);
  const [adminActionPromotion, setAdminActionPromotion] = useState<PromotionListItemDto | null>(null);
  const [adminAction, setAdminAction] = useState<"approve" | "reject" | null>(null);

  // Track if we should refetch on filter/pagination changes
  const [shouldRefetch, setShouldRefetch] = useState(false);

  // =========================================================================
  // API Functions
  // =========================================================================

  /**
   * Fetch promotions with current filters and pagination
   */
  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        sort: filters.sort,
        order: filters.order,
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
      });

      if (filters.status) queryParams.set("status", filters.status);
      if (filters.path) queryParams.set("path", filters.path);
      if (filters.template_id) queryParams.set("template_id", filters.template_id);

      const response = await fetch(`/api/promotions?${queryParams}`);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to fetch promotions");
      }

      const data: PaginatedResponse<PromotionListItemDto> = await response.json();
      setPromotions(data.data);
      setPagination(data.pagination);

      // Update URL to reflect filters (without page reload)
      const url = new URL(window.location.href);
      url.search = queryParams.toString();
      window.history.replaceState({}, "", url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load promotions";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // =========================================================================
  // Effects
  // =========================================================================

  /**
   * Refetch promotions when filters or pagination changes
   */
  useEffect(() => {
    if (shouldRefetch) {
      fetchPromotions();
      setShouldRefetch(false);
    }
  }, [shouldRefetch, fetchPromotions]);

  // =========================================================================
  // Event Handlers
  // =========================================================================

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: Partial<PromotionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, offset: 0 })); // Reset to first page
    setShouldRefetch(true);
  };

  /**
   * Handle pagination changes
   */
  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
    setShouldRefetch(true);
  };

  /**
   * Handle promotion row click - navigate to detail
   */
  const handlePromotionClick = (id: string) => {
    window.location.href = `/promotions/${id}`;
  };

  /**
   * Handle create new promotion
   */
  const handleCreateClick = () => {
    window.location.href = "/promotion-templates";
  };

  /**
   * Handle delete promotion click
   */
  const handleDeleteClick = (promotion: PromotionListItemDto) => {
    setPromotionToDelete(promotion);
    setIsDeleteModalOpen(true);
  };

  /**
   * Confirm delete promotion
   */
  const handleDeleteConfirm = async () => {
    if (!promotionToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/promotions/${promotionToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to delete promotion");
      }

      toast.success("Promotion deleted successfully");

      // Refetch promotions
      await fetchPromotions();
      handleDeleteModalClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete promotion";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Close delete modal
   */
  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setPromotionToDelete(null);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilters({
      sort: "created_at",
      order: "desc",
      limit: 20,
      offset: 0,
    });
    setShouldRefetch(true);
  };

  /**
   * Handle approve promotion
   */
  const handleApproveClick = (promotion: PromotionListItemDto) => {
    setAdminActionPromotion(promotion);
    setAdminAction("approve");
    setIsAdminActionModalOpen(true);
  };

  /**
   * Handle reject promotion
   */
  const handleRejectClick = (promotion: PromotionListItemDto) => {
    setAdminActionPromotion(promotion);
    setAdminAction("reject");
    setIsAdminActionModalOpen(true);
  };

  /**
   * Confirm admin action (approve or reject)
   */
  const handleAdminActionConfirm = async (action: "approve" | "reject", reason?: string) => {
    if (!adminActionPromotion) return;

    try {
      const endpoint = `/api/promotions/${adminActionPromotion.id}/${action}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: action === "reject" && reason ? JSON.stringify({ reason }) : undefined,
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || `Failed to ${action} promotion`);
      }

      toast.success(`Promotion ${action === "approve" ? "approved" : "rejected"} successfully`);

      // Refetch promotions
      await fetchPromotions();
      handleAdminActionModalClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${action} promotion`;
      toast.error(message);
      throw error; // Re-throw to keep modal open on error
    }
  };

  /**
   * Close admin action modal
   */
  const handleAdminActionModalClose = () => {
    setIsAdminActionModalOpen(false);
    setAdminActionPromotion(null);
    setAdminAction(null);
  };

  // =========================================================================
  // Helper Functions
  // =========================================================================

  /**
   * Check if filters are active (not default values)
   */
  const hasActiveFilters = Boolean(filters.status || filters.path || filters.template_id);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <PromotionsHeader isAdmin={isAdmin} onCreateClick={handleCreateClick} />

      {/* Filter Bar */}
      <PromotionsFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        resultCount={pagination.total}
      />

      {/* Promotions Table */}
      <PromotionsTable
        promotions={promotions}
        isLoading={isLoading}
        isAdmin={isAdmin}
        userId={userId}
        hasFilters={hasActiveFilters}
        onRowClick={handlePromotionClick}
        onDelete={handleDeleteClick}
        onApprove={isAdmin ? handleApproveClick : undefined}
        onReject={isAdmin ? handleRejectClick : undefined}
        onClearFilters={handleClearFilters}
        onCreatePromotion={handleCreateClick}
      />

      {/* Pagination */}
      {!isLoading && promotions.length > 0 && (
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete the promotion for{" "}
                <span className="font-semibold text-foreground">{promotionToDelete?.template.name}</span>?
              </p>
              <p className="text-muted-foreground">
                This action cannot be undone. All badges assigned to this promotion will be released.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteModalClose} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Action Modal (Approve/Reject) */}
      <AdminActionModal
        isOpen={isAdminActionModalOpen}
        onClose={handleAdminActionModalClose}
        promotion={adminActionPromotion}
        action={adminAction}
        onConfirm={handleAdminActionConfirm}
      />
    </div>
  );
}

