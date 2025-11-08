import React from "react";
import type { PaginationProps } from "@/types";
import { Button } from "@/components/ui/button";

/**
 * Pagination Component
 *
 * Provides navigation controls for paginating through application lists.
 * Displays page information and previous/next buttons.
 */
export function Pagination(props: PaginationProps) {
  const { pagination, onPageChange } = props;

  // =========================================================================
  // Computed Values
  // =========================================================================

  const { total, limit, offset, has_more } = pagination;

  // Calculate current page range
  const startIndex = offset + 1;
  const endIndex = Math.min(offset + limit, total);
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  // Determine if buttons should be disabled
  const isPrevDisabled = offset === 0;
  const isNextDisabled = !has_more;

  // =========================================================================
  // Handlers
  // =========================================================================

  const handlePrevious = () => {
    if (!isPrevDisabled) {
      onPageChange(Math.max(0, offset - limit));
    }
  };

  const handleNext = () => {
    if (!isNextDisabled) {
      onPageChange(offset + limit);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Page Info */}
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{startIndex}</span> to{" "}
        <span className="font-medium text-foreground">{endIndex}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> applications
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={isPrevDisabled}
          aria-label="Go to previous page"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </Button>

        {/* Page Indicator */}
        <div className="text-sm text-muted-foreground px-2">
          Page {currentPage} of {totalPages}
        </div>

        {/* Next Button */}
        <Button variant="outline" size="sm" onClick={handleNext} disabled={isNextDisabled} aria-label="Go to next page">
          Next
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
