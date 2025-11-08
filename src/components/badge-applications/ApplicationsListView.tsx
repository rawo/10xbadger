import React from "react";
import type { ApplicationsListViewProps } from "@/types";
import { useApplicationsList } from "@/hooks/useApplicationsList";
import { PageHeader } from "./PageHeader";
import { FilterBar } from "./FilterBar";
import { ApplicationsList } from "./ApplicationsList";
import { Pagination } from "./Pagination";

/**
 * ApplicationsListView Component
 *
 * Main interactive component for displaying and managing the list of badge applications.
 * Handles filtering, sorting, pagination, and user actions (view, edit, delete).
 *
 * Standard users see only their own applications; admins can view all applications.
 */
export function ApplicationsListView(props: ApplicationsListViewProps) {
  const { initialData, userId, isAdmin } = props;

  // =========================================================================
  // Hook Integration
  // =========================================================================

  const { applications, pagination, filters, isLoading, error, updateFilters, goToPage, refetch, deleteApplication } =
    useApplicationsList({
      initialData,
      userId,
      isAdmin,
    });

  // =========================================================================
  // Action Handlers
  // =========================================================================

  const handleView = (id: string) => {
    window.location.href = `/applications/${id}`;
  };

  const handleEdit = (id: string) => {
    window.location.href = `/applications/${id}/edit`;
  };

  const handleDelete = async (id: string) => {
    // Confirmation will be handled by the ActionMenu component
    await deleteApplication(id);
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header with Title and Action Button */}
      <PageHeader title="My Applications" actionLabel="New Application" actionHref="/catalog" />

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => refetch()} className="mt-2 text-sm font-medium text-destructive underline">
            Try again
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={updateFilters} resultCount={pagination.total} />

      {/* Applications List */}
      <ApplicationsList
        applications={applications}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        userId={userId}
        isAdmin={isAdmin}
      />

      {/* Pagination */}
      {pagination.total > 0 && <Pagination pagination={pagination} onPageChange={goToPage} />}
    </div>
  );
}
