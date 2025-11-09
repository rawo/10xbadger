/**
 * PromotionsFilterBar Component
 *
 * Filter and sort controls for the promotions list.
 * Provides dropdowns for status, path, and sorting options.
 */

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface PromotionsFilterBarProps {
  filters: {
    status?: "draft" | "submitted" | "approved" | "rejected";
    path?: "technical" | "financial" | "management";
    template_id?: string;
    sort: "created_at" | "submitted_at";
    order: "asc" | "desc";
  };
  onFilterChange: (filters: Partial<PromotionsFilterBarProps["filters"]>) => void;
  resultCount: number;
}

export function PromotionsFilterBar({ filters, onFilterChange, resultCount }: PromotionsFilterBarProps) {
  const hasActiveFilters = Boolean(filters.status || filters.path || filters.template_id);

  const handleClearFilters = () => {
    onFilterChange({
      status: undefined,
      path: undefined,
      template_id: undefined,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-foreground whitespace-nowrap">
              Status:
            </label>
            <select
              id="status-filter"
              value={filters.status || ""}
              onChange={(e) =>
                onFilterChange({
                  status: e.target.value as "draft" | "submitted" | "approved" | "rejected" | undefined,
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Path Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="path-filter" className="text-sm font-medium text-foreground whitespace-nowrap">
              Path:
            </label>
            <select
              id="path-filter"
              value={filters.path || ""}
              onChange={(e) =>
                onFilterChange({
                  path: e.target.value as "technical" | "financial" | "management" | undefined,
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Paths</option>
              <option value="technical">Technical</option>
              <option value="financial">Financial</option>
              <option value="management">Management</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-filter" className="text-sm font-medium text-foreground whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-filter"
              value={filters.sort}
              onChange={(e) =>
                onFilterChange({
                  sort: e.target.value as "created_at" | "submitted_at",
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="created_at">Created Date</option>
              <option value="submitted_at">Submitted Date</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <label htmlFor="order-filter" className="text-sm font-medium text-foreground whitespace-nowrap">
              Order:
            </label>
            <select
              id="order-filter"
              value={filters.order}
              onChange={(e) =>
                onFilterChange({
                  order: e.target.value as "asc" | "desc",
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="ml-auto sm:ml-0">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {resultCount === 0
            ? "No promotions found"
            : `${resultCount} promotion${resultCount === 1 ? "" : "s"} found`}
        </div>
      </div>
    </div>
  );
}

