import React, { useState, useCallback } from "react";
import type { AdminReviewViewProps, BadgeApplicationListItemDto, BadgeApplicationStatusType } from "@/types";
import { useAdminReview } from "@/hooks/useAdminReview";
import { PageHeader } from "./PageHeader";
import { FilterBar } from "./FilterBar";
import { ReviewList } from "./ReviewList";
import { Pagination } from "./Pagination";
import { ReviewModal } from "./ReviewModal";

/**
 * AdminReviewView Component
 *
 * Main interactive component for the admin review queue. Displays a filterable,
 * sortable list of badge applications awaiting review (submitted status) as well as
 * previously reviewed applications (accepted/rejected).
 *
 * Admins can quickly accept or reject applications with optional decision notes.
 */
export function AdminReviewView(props: AdminReviewViewProps) {
  const { initialData, initialMetrics, adminUserId } = props;

  // =========================================================================
  // Hook Integration
  // =========================================================================

  const {
    applications,
    pagination,
    metrics,
    filters,
    isLoading,
    isProcessing,
    error,
    updateFilters,
    goToPage,
    acceptApplication,
    rejectApplication,
    refetch,
  } = useAdminReview({
    initialData,
    initialMetrics,
    adminUserId,
  });

  // =========================================================================
  // Modal State
  // =========================================================================

  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    mode: "accept" | "reject";
    application: BadgeApplicationListItemDto | null;
  }>({
    isOpen: false,
    mode: "accept",
    application: null,
  });

  // =========================================================================
  // Action Handlers
  // =========================================================================

  const handleView = useCallback((id: string) => {
    window.location.href = `/applications/${id}`;
  }, []);

  const handleAccept = useCallback(
    (id: string) => {
      const application = applications.find((app) => app.id === id);
      if (!application) return;

      setReviewModalState({
        isOpen: true,
        mode: "accept",
        application,
      });
    },
    [applications]
  );

  const handleReject = useCallback(
    (id: string) => {
      const application = applications.find((app) => app.id === id);
      if (!application) return;

      setReviewModalState({
        isOpen: true,
        mode: "reject",
        application,
      });
    },
    [applications]
  );

  const handleModalConfirm = useCallback(
    async (applicationId: string, decisionNote?: string) => {
      if (reviewModalState.mode === "accept") {
        await acceptApplication(applicationId, decisionNote);
      } else {
        await rejectApplication(applicationId, decisionNote);
      }

      // Close modal on success
      setReviewModalState({
        isOpen: false,
        mode: "accept",
        application: null,
      });
    },
    [reviewModalState.mode, acceptApplication, rejectApplication]
  );

  const handleModalCancel = useCallback(() => {
    setReviewModalState({
      isOpen: false,
      mode: "accept",
      application: null,
    });
  }, []);

  const handleMetricClick = useCallback(
    (status: string) => {
      updateFilters({ status: status as BadgeApplicationStatusType, offset: 0 });
    },
    [updateFilters]
  );

  // =========================================================================
  // Calculate Active Filters
  // =========================================================================

  const hasActiveFilters = !!(filters.status !== "submitted" || filters.applicant_id || filters.catalog_badge_id);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header with Metrics */}
      <PageHeader title="Badge Application Review Queue" metrics={metrics} onMetricClick={handleMetricClick} />

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Error loading applications</p>
          <p className="text-sm text-destructive/80">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-destructive underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilters}
        resultCount={pagination.total}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Review List */}
      <ReviewList
        applications={applications}
        isLoading={isLoading}
        onAccept={handleAccept}
        onReject={handleReject}
        onView={handleView}
        adminUserId={adminUserId}
      />

      {/* Pagination */}
      {pagination.total > 0 && <Pagination pagination={pagination} onPageChange={goToPage} />}

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalState.isOpen}
        mode={reviewModalState.mode}
        application={reviewModalState.application}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        isProcessing={isProcessing}
      />
    </div>
  );
}
