import React from "react";
import type { EmptyStateProps } from "@/types";
import { Button } from "@/components/ui/button";

/**
 * EmptyState Component
 *
 * Displays when no applications match current filters or user has no applications.
 * Provides context-specific messaging and call-to-action buttons.
 */
export function EmptyState(props: EmptyStateProps) {
  const { hasFilters, onClearFilters, onCreate } = props;

  return (
    <div className="rounded-lg border border-border bg-card p-12">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon */}
        <div className="rounded-full bg-muted p-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Title and Description */}
        {hasFilters ? (
          <>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No applications found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No applications match your current filters. Try adjusting your search criteria.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {onClearFilters && (
                <Button variant="outline" onClick={onClearFilters}>
                  Clear Filters
                </Button>
              )}
              {onCreate && <Button onClick={onCreate}>Create New Application</Button>}
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No applications yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You haven&apos;t created any badge applications yet. Start by browsing the badge catalog.
              </p>
            </div>

            {/* Action */}
            {onCreate && <Button onClick={onCreate}>Browse Badge Catalog</Button>}
          </>
        )}
      </div>
    </div>
  );
}
