import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromotionItem } from "./PromotionItem";
import type { PromotionListItemDto } from "@/types";
import { cn } from "@/lib/utils";

/**
 * PromotionsOverview Component
 *
 * Section displaying user's promotions with status indicators.
 * Shows all promotions in a single list, sorted by most recent first.
 *
 * Features:
 * - List of promotions across all statuses
 * - "View All" link to full promotions page
 * - Empty state handling
 * - Responsive layout
 *
 * @param promotions - Promotions grouped by status
 * @param className - Additional CSS classes
 */
interface PromotionsOverviewProps {
  promotions: {
    draft: PromotionListItemDto[];
    submitted: PromotionListItemDto[];
    approved: PromotionListItemDto[];
    rejected: PromotionListItemDto[];
  };
  className?: string;
}

export function PromotionsOverview({ promotions, className }: PromotionsOverviewProps) {
  // Combine all promotions into a single list
  const allPromotions = [
    ...promotions.draft,
    ...promotions.submitted,
    ...promotions.approved,
    ...promotions.rejected,
  ];

  // Sort by created_at descending (most recent first)
  const sortedPromotions = allPromotions.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  // Limit to 10 most recent for dashboard
  const displayPromotions = sortedPromotions.slice(0, 10);

  const hasPromotions = allPromotions.length > 0;
  const totalCount = allPromotions.length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Promotions</CardTitle>
            {hasPromotions && (
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount} {totalCount === 1 ? "promotion" : "promotions"}
              </p>
            )}
          </div>
          {hasPromotions && (
            <a
              href="/promotions"
              className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
            >
              View All →
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasPromotions ? (
          <div className="space-y-2">
            {displayPromotions.map((promotion) => (
              <PromotionItem key={promotion.id} promotion={promotion} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/50"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-foreground">No promotions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start building your promotion when you have accepted badges
            </p>
            <a
              href="/promotions/new"
              className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
            >
              Create your first promotion →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
