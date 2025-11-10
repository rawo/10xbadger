/**
 * PromotionsTable Component
 *
 * Table structure for displaying promotions with sortable columns.
 * Renders PromotionRow components for each promotion item.
 */

import { PromotionRow } from "./PromotionRow";
import { EmptyState } from "./EmptyState";
import { PromotionsTableSkeleton } from "./PromotionsTableSkeleton";
import type { PromotionListItemDto } from "@/types";

export interface PromotionsTableProps {
  promotions: PromotionListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  userId: string;
  hasFilters: boolean;
  onRowClick: (id: string) => void;
  onDelete: (promotion: PromotionListItemDto) => void;
  onApprove?: (promotion: PromotionListItemDto) => void;
  onReject?: (promotion: PromotionListItemDto) => void;
  onClearFilters: () => void;
  onCreatePromotion: () => void;
}

export function PromotionsTable({
  promotions,
  isLoading,
  isAdmin,
  userId,
  hasFilters,
  onRowClick,
  onDelete,
  onApprove,
  onReject,
  onClearFilters,
  onCreatePromotion,
}: PromotionsTableProps) {
  if (isLoading) {
    return <PromotionsTableSkeleton rows={5} isAdmin={isAdmin} />;
  }

  if (promotions.length === 0) {
    return <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} onCreatePromotion={onCreatePromotion} />;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left p-4 font-medium text-sm text-foreground">Template</th>
              <th className="text-left p-4 font-medium text-sm text-foreground">Path</th>
              <th className="text-left p-4 font-medium text-sm text-foreground">Status</th>
              <th className="text-left p-4 font-medium text-sm text-foreground">Badges</th>
              <th className="text-left p-4 font-medium text-sm text-foreground">Created</th>
              {isAdmin && <th className="text-left p-4 font-medium text-sm text-foreground">Creator</th>}
              <th className="text-right p-4 font-medium text-sm text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion) => (
              <PromotionRow
                key={promotion.id}
                promotion={promotion}
                isAdmin={isAdmin}
                userId={userId}
                onClick={() => onRowClick(promotion.id)}
                onDelete={() => onDelete(promotion)}
                onApprove={onApprove ? () => onApprove(promotion) : undefined}
                onReject={onReject ? () => onReject(promotion) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
