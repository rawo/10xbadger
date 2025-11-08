import React from "react";
import type { ApplicationsListProps } from "@/types";
import { ApplicationRow } from "./ApplicationRow";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ApplicationsList Component
 *
 * Renders the list of badge applications or an empty state if no applications exist.
 * Shows loading skeletons during data fetching.
 */
export function ApplicationsList(props: ApplicationsListProps) {
  const { applications, isLoading, onEdit, onView, onDelete, userId, isAdmin } = props;

  // =========================================================================
  // Loading State
  // =========================================================================

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // =========================================================================
  // Empty State
  // =========================================================================

  if (applications.length === 0) {
    // Check if there are any active filters
    // This would need to be passed as a prop, but for now we'll assume no filters
    return <EmptyState hasFilters={false} onCreate={() => (window.location.href = "/catalog")} />;
  }

  // =========================================================================
  // Applications List
  // =========================================================================

  return (
    <div className="space-y-4" role="list" aria-label="Badge applications">
      {applications.map((application) => (
        <ApplicationRow
          key={application.id}
          application={application}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          isOwner={application.applicant_id === userId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
