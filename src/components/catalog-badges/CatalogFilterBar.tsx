/**
 * CatalogFilterBar Component
 *
 * Filter controls for catalog badges including:
 * - Category tabs
 * - Level tabs
 * - Status tabs (admin only)
 * - Search input with debounce
 * - Sort controls
 * - Result count display
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CatalogFilterBarProps, BadgeCategoryType, BadgeLevelType, CatalogBadgeStatusType } from "@/types";

export function CatalogFilterBar({ filters, onFilterChange, resultCount, isAdmin }: CatalogFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || "")) {
        onFilterChange({ search: searchInput || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search, onFilterChange]);

  const handleCategoryChange = (value: string) => {
    onFilterChange({ category: value === "all" ? undefined : (value as BadgeCategoryType) });
  };

  const handleLevelChange = (value: string) => {
    onFilterChange({ level: value === "all" ? undefined : (value as BadgeLevelType) });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ status: value === "all" ? undefined : (value as CatalogBadgeStatusType) });
  };

  const handleSortChange = (value: "created_at" | "title") => {
    onFilterChange({ sort: value });
  };

  const handleSortOrderToggle = () => {
    onFilterChange({ order: filters.order === "asc" ? "desc" : "asc" });
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div role="group" aria-label="Category filter">
        <span className="text-sm font-medium text-foreground mb-2 block">Category</span>
        <Tabs value={filters.category || "all"} onValueChange={handleCategoryChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="organizational">Organizational</TabsTrigger>
            <TabsTrigger value="softskilled">Soft Skilled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Level Tabs */}
      <div role="group" aria-label="Level filter">
        <span className="text-sm font-medium text-foreground mb-2 block">Level</span>
        <Tabs value={filters.level || "all"} onValueChange={handleLevelChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="gold">Gold</TabsTrigger>
            <TabsTrigger value="silver">Silver</TabsTrigger>
            <TabsTrigger value="bronze">Bronze</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status Tabs (Admin Only) */}
      {isAdmin && (
        <div role="group" aria-label="Status filter">
          <span className="text-sm font-medium text-foreground mb-2 block">Status</span>
          <Tabs value={filters.status || "all"} onValueChange={handleStatusChange}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        {/* Search Input */}
        <div className="flex-1 w-full">
          <label htmlFor="search" className="text-sm font-medium text-foreground mb-2 block">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search badges by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={200}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 items-end">
          <div role="group" aria-label="Sort options">
            <span className="text-sm font-medium text-foreground mb-2 block">Sort By</span>
            <div className="flex gap-2">
              <Button
                variant={filters.sort === "created_at" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSortChange("created_at")}
              >
                Created Date
              </Button>
              <Button
                variant={filters.sort === "title" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSortChange("title")}
              >
                Title
              </Button>
            </div>
          </div>

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
      </div>

      {/* Result Count */}
      <div className="text-sm text-muted-foreground">
        {resultCount} {resultCount === 1 ? "badge" : "badges"} found
      </div>
    </div>
  );
}
