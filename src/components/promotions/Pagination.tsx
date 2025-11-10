/**
 * Pagination Component
 *
 * Reusable pagination controls with page navigation and info display.
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMetadata } from "@/types";

export interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { total, limit, offset, has_more } = pagination;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startItem = offset + 1;
  const endItem = Math.min(offset + limit, total);

  const handlePrevious = () => {
    if (offset > 0) {
      onPageChange(Math.max(0, offset - limit));
    }
  };

  const handleNext = () => {
    if (has_more) {
      onPageChange(offset + limit);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Info Text */}
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
        <span className="font-medium text-foreground">{endItem}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> results
      </p>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrevious} disabled={offset === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground px-2">
          Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>

        <Button variant="outline" size="sm" onClick={handleNext} disabled={!has_more} className="gap-1">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
