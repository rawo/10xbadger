import React from "react";
import type { FilterBarProps } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

/**
 * FilterBar Component
 *
 * Contains all filtering, searching, and sorting controls for the applications list.
 * Allows users to filter by status, search by badge title, and adjust sort order.
 */
export function FilterBar(props: FilterBarProps) {
  const { filters, onFilterChange, resultCount } = props;

  // =========================================================================
  // Status Filter Handler
  // =========================================================================

  const handleStatusChange = (status: string) => {
    onFilterChange({
      status: status === "all" ? undefined : (status as typeof filters.status),
      offset: 0,
    });
  };

  // =========================================================================
  // Sort Handlers
  // =========================================================================

  const handleSortFieldChange = (sort: "created_at" | "submitted_at") => {
    onFilterChange({ sort });
  };

  const handleSortOrderToggle = () => {
    onFilterChange({
      order: filters.order === "asc" ? "desc" : "asc",
    });
  };

  // =========================================================================
  // Get Current Status Value
  // =========================================================================

  const currentStatus = filters.status || "all";

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={currentStatus} onValueChange={handleStatusChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Draft}>Draft</TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Submitted}>Submitted</TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Accepted}>Accepted</TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Rejected}>Rejected</TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.UsedInPromotion}>Used</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Result Count */}
        <div className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "application" : "applications"}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>

        {/* Sort Field Buttons */}
        <div className="flex gap-1">
          <Button
            variant={filters.sort === "created_at" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortFieldChange("created_at")}
          >
            Created Date
          </Button>
          <Button
            variant={filters.sort === "submitted_at" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortFieldChange("submitted_at")}
          >
            Submitted Date
          </Button>
        </div>

        {/* Sort Order Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSortOrderToggle}
          title={filters.order === "asc" ? "Sort descending" : "Sort ascending"}
          aria-label={
            filters.order === "asc"
              ? "Currently ascending, click to sort descending"
              : "Currently descending, click to sort ascending"
          }
        >
          {filters.order === "asc" ? "Ascending ↑" : "Descending ↓"}
        </Button>
      </div>

      {/* TODO: Add Search Input
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Search by badge title..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>
      */}
    </div>
  );
}
