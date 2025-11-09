/**
 * TemplateFilterBar Component
 *
 * Filter and sort controls for promotion templates including:
 * - Career path tabs
 * - From level input
 * - To level input
 * - Active status toggle
 * - Sort controls (created_at, name)
 * - Result count display
 */

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { TemplateFilterBarProps, PromotionPathType } from "@/types";

export function TemplateFilterBar({
  filters,
  sortOptions,
  onFilterChange,
  onSortChange,
  resultCount,
}: TemplateFilterBarProps & { resultCount?: number }) {
  // =========================================================================
  // Filter Handlers
  // =========================================================================

  const handlePathChange = (value: string) => {
    onFilterChange({
      ...filters,
      path: value === "all" ? undefined : (value as PromotionPathType),
    });
  };

  const handleFromLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      from_level: e.target.value || undefined,
    });
  };

  const handleToLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      to_level: e.target.value || undefined,
    });
  };

  const handleActiveChange = (checked: boolean) => {
    onFilterChange({
      ...filters,
      is_active: checked,
    });
  };

  // =========================================================================
  // Sort Handlers
  // =========================================================================

  const handleSortChange = (value: "created_at" | "name") => {
    onSortChange({
      ...sortOptions,
      sort: value,
    });
  };

  const handleSortOrderToggle = () => {
    onSortChange({
      ...sortOptions,
      order: sortOptions.order === "asc" ? "desc" : "asc",
    });
  };

  return (
    <div className="space-y-4">
      {/* Career Path Tabs */}
      <div role="group" aria-label="Career path filter">
        <span className="text-sm font-medium text-foreground mb-2 block">Career Path</span>
        <Tabs value={filters.path || "all"} onValueChange={handlePathChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Level Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* From Level */}
        <div>
          <Label htmlFor="from_level" className="text-sm font-medium text-foreground mb-2 block">
            From Level
          </Label>
          <input
            type="text"
            id="from_level"
            placeholder="e.g., Junior"
            value={filters.from_level || ""}
            onChange={handleFromLevelChange}
            maxLength={50}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* To Level */}
        <div>
          <Label htmlFor="to_level" className="text-sm font-medium text-foreground mb-2 block">
            To Level
          </Label>
          <input
            type="text"
            id="to_level"
            placeholder="e.g., Senior"
            value={filters.to_level || ""}
            onChange={handleToLevelChange}
            maxLength={50}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {/* Active Status Toggle */}
      <div className="flex items-center gap-2">
        <Switch id="is_active" checked={filters.is_active} onCheckedChange={handleActiveChange} />
        <Label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
          Show active templates only
        </Label>
      </div>

      {/* Sort Controls and Result Count */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center sm:justify-between">
        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>

          {/* Sort Field Buttons */}
          <div className="flex gap-1">
            <Button
              variant={sortOptions.sort === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("name")}
            >
              Name
            </Button>
            <Button
              variant={sortOptions.sort === "created_at" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("created_at")}
            >
              Created Date
            </Button>
          </div>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortOrderToggle}
            title={sortOptions.order === "asc" ? "Sort descending" : "Sort ascending"}
            aria-label={
              sortOptions.order === "asc"
                ? "Currently ascending, click to sort descending"
                : "Currently descending, click to sort ascending"
            }
          >
            {sortOptions.order === "asc" ? "Ascending ↑" : "Descending ↓"}
          </Button>
        </div>

        {/* Result Count */}
        {resultCount !== undefined && (
          <div className="text-sm text-muted-foreground">
            {resultCount} {resultCount === 1 ? "template" : "templates"} found
          </div>
        )}
      </div>
    </div>
  );
}
