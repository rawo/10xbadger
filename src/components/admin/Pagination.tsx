import React from "react";
import type { PaginationProps } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination Component
 *
 * Pagination controls for navigating through pages of applications.
 * Shows page info, previous/next buttons.
 */
export function Pagination(props: PaginationProps) {
  const { pagination, onPageChange } = props;

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const isFirstPage = pagination.offset === 0;
  const isLastPage = !pagination.has_more;

  const handlePrevious = () => {
    if (!isFirstPage) {
      onPageChange(Math.max(0, pagination.offset - pagination.limit));
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(pagination.offset + pagination.limit);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {pagination.offset + 1}
        </span>
        {" - "}
        <span className="font-medium text-foreground">
          {Math.min(pagination.offset + pagination.limit, pagination.total)}
        </span>
        {" of "}
        <span className="font-medium text-foreground">{pagination.total}</span>
        {" applications"}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={isFirstPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={isLastPage}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

