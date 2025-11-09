import React from "react";
import type { ReviewListProps } from "@/types";

/**
 * ReviewList Component
 *
 * Displays the list of badge applications in the review queue.
 * Shows application details and admin action buttons.
 *
 * TODO: Implement in next iteration
 */
export function ReviewList(props: ReviewListProps) {
  const { applications, isLoading, onAccept, onReject, onView } = props;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No applications to review</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          ReviewList component - {applications.length} applications
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          TODO: Implement ReviewRow components with accept/reject actions
        </p>
      </div>
    </div>
  );
}

