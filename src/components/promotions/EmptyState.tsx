/**
 * EmptyState Component
 *
 * Display component for empty promotions list with contextual messaging
 * and action buttons based on filter state.
 */

import { Button } from "@/components/ui/button";
import { FileText, Filter } from "lucide-react";

export interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreatePromotion: () => void;
}

export function EmptyState({ hasFilters, onClearFilters, onCreatePromotion }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        {hasFilters ? (
          <>
            <div className="rounded-full bg-muted p-3 mb-4">
              <Filter className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No promotions found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              No promotions match your current filters. Try adjusting your search criteria or clear all filters.
            </p>
            <Button variant="outline" onClick={onClearFilters}>
              Clear All Filters
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-3 mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No promotions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Get started by creating your first promotion. Select a template and add your badges to begin.
            </p>
            <Button onClick={onCreatePromotion}>Create Your First Promotion</Button>
          </>
        )}
      </div>
    </div>
  );
}
