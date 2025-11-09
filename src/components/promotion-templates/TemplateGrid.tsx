/**
 * TemplateGrid Component
 *
 * Displays a responsive grid of template cards or shows loading/empty states
 */

import { TemplateCard } from "./TemplateCard";
import { TemplateEmptyState } from "./TemplateEmptyState";
import { Card } from "@/components/ui/card";
import type { TemplateGridProps } from "@/types";

export function TemplateGrid({
  templates,
  isLoading,
  isAdmin,
  hasFilters,
  onTemplateClick,
  onEditClick,
  onDeactivateClick,
  onCreateClick,
  onClearFilters,
}: TemplateGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        role="status"
        aria-label="Loading promotion templates"
      >
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-muted rounded"></div>
              <div className="h-6 w-20 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <TemplateEmptyState
        hasFilters={hasFilters}
        isAdmin={isAdmin}
        onCreateClick={onCreateClick}
        onClearFilters={onClearFilters}
      />
    );
  }

  // Template grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Promotion templates">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isAdmin={isAdmin}
          onClick={onTemplateClick}
          onEdit={onEditClick}
          onDeactivate={onDeactivateClick}
        />
      ))}
    </div>
  );
}
