/**
 * TemplateEmptyState Component
 *
 * Displayed when no promotion templates are found.
 * Shows different messages based on whether filters are active and user role.
 */

import { Button } from "@/components/ui/button";
import type { TemplateEmptyStateProps } from "@/types";

export function TemplateEmptyState({ hasFilters, isAdmin, onCreateClick, onClearFilters }: TemplateEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <svg
        className="h-24 w-24 text-muted-foreground mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      {/* Title and Description */}
      {hasFilters ? (
        <>
          <h2 className="text-2xl font-semibold text-foreground mb-2">No templates found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            No promotion templates match your current filters. Try adjusting your search criteria or clearing filters.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-semibold text-foreground mb-2">No templates available</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {isAdmin
              ? "Get started by creating your first promotion template."
              : "No promotion templates have been created yet. Please contact an administrator."}
          </p>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {hasFilters && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}

        {!hasFilters && isAdmin && onCreateClick && <Button onClick={onCreateClick}>Create Template</Button>}
      </div>
    </div>
  );
}
