/**
 * BadgeInfoSection Component
 *
 * Read-only display of selected catalog badge information
 */

import type { BadgeInfoSectionProps } from "@/types";

export function BadgeInfoSection({ catalogBadge }: BadgeInfoSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Selected Badge</h2>
      <div className="space-y-3">
        <div>
          <h3 className="text-xl font-bold text-foreground">{catalogBadge.title}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary capitalize">
              {catalogBadge.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Level:</span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-accent text-accent-foreground capitalize">
              {catalogBadge.level}
            </span>
          </div>
        </div>
        {catalogBadge.description && <p className="text-sm text-muted-foreground mt-2">{catalogBadge.description}</p>}
      </div>
    </div>
  );
}
