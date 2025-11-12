import React from "react";
import type { AdminFilterBarProps, BadgeApplicationStatusType, BadgeApplicationSortBy } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, ArrowUpDown } from "lucide-react";

/**
 * FilterBar Component
 *
 * Comprehensive filtering interface for the admin review queue.
 * Includes status tabs, sort controls, and filter management.
 */
export function FilterBar(props: AdminFilterBarProps) {
  const { filters, onFilterChange, resultCount, hasActiveFilters } = props;

  // =========================================================================
  // Status Tab Handler
  // =========================================================================

  const handleStatusChange = (value: string) => {
    if (value === "all") {
      onFilterChange({ status: undefined, offset: 0 });
    } else {
      onFilterChange({ status: value as BadgeApplicationStatusType, offset: 0 });
    }
  };

  // =========================================================================
  // Sort Handlers
  // =========================================================================

  const handleSortChange = (value: string) => {
    onFilterChange({ sort: value as BadgeApplicationSortBy, offset: 0 });
  };

  const handleOrderToggle = () => {
    onFilterChange({ order: filters.order === "asc" ? "desc" : "asc", offset: 0 });
  };

  // =========================================================================
  // Clear Filters Handler
  // =========================================================================

  const handleClearFilters = () => {
    onFilterChange({
      status: "submitted",
      applicant_id: undefined,
      catalog_badge_id: undefined,
      sort: "submitted_at",
      order: "desc",
      offset: 0,
    });
  };

  // =========================================================================
  // Current Tab Value
  // =========================================================================

  const currentTab = filters.status || "all";

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={currentTab} onValueChange={handleStatusChange} className="w-full md:w-auto">
          <TabsList className="grid w-full md:w-auto grid-cols-4">
            <TabsTrigger value="all" className="px-4">
              All
            </TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Submitted} className="px-4">
              Submitted
            </TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Accepted} className="px-4">
              Accepted
            </TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Rejected} className="px-4">
              Rejected
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={filters.sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="submitted_at">Submitted Date</option>
            <option value="created_at">Created Date</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOrderToggle}
            className="h-9 px-3"
            aria-label={`Sort ${filters.order === "asc" ? "ascending" : "descending"}`}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {filters.order === "asc" ? "Oldest" : "Newest"}
          </Button>
        </div>
      </div>

      {/* Result Count and Clear Filters */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{resultCount}</span>
          {resultCount === 1 ? " application" : " applications"}
          {filters.status && filters.status !== "all" && (
            <span>
              {" "}
              with status <span className="font-medium text-foreground">{filters.status}</span>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(filters.applicant_id || filters.catalog_badge_id) && (
        <div className="flex flex-wrap gap-2">
          {filters.applicant_id && (
            <div className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
              <span className="text-muted-foreground">Applicant:</span>
              <span className="font-medium">{filters.applicant_id.substring(0, 8)}...</span>
              <button
                onClick={() => onFilterChange({ applicant_id: undefined, offset: 0 })}
                className="ml-1 hover:text-destructive"
                aria-label="Remove applicant filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {filters.catalog_badge_id && (
            <div className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
              <span className="text-muted-foreground">Badge:</span>
              <span className="font-medium">{filters.catalog_badge_id.substring(0, 8)}...</span>
              <button
                onClick={() => onFilterChange({ catalog_badge_id: undefined, offset: 0 })}
                className="ml-1 hover:text-destructive"
                aria-label="Remove badge filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
