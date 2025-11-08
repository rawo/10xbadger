/**
 * CatalogEmptyState Component
 *
 * Displayed when no badges are found in the catalog
 */

import { Button } from "@/components/ui/button";

export function CatalogEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h2 className="text-2xl font-semibold text-foreground mb-2">No badges found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        No badges match your current filters. Try adjusting your search criteria or clearing filters.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = "/catalog";
        }}
      >
        Clear Filters
      </Button>
    </div>
  );
}
