/**
 * BadgeGrid Component
 *
 * Displays a responsive grid of badge cards or shows loading/empty states
 */

import { BadgeCard } from "./BadgeCard";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { Card } from "@/components/ui/card";
import type { BadgeGridProps } from "@/types";

export function BadgeGrid({
  badges,
  isLoading,
  isAdmin,
  onBadgeClick,
  onEditClick,
  onDeactivateClick,
}: BadgeGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading badges">
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
  if (badges.length === 0) {
    return <CatalogEmptyState />;
  }

  // Badge grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Badge catalog">
      {badges.map((badge) => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          isAdmin={isAdmin}
          onClick={onBadgeClick}
          onEdit={onEditClick}
          onDeactivate={onDeactivateClick}
        />
      ))}
    </div>
  );
}
