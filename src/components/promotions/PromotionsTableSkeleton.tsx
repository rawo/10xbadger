/**
 * PromotionsTableSkeleton Component
 *
 * Loading skeleton for the promotions table to improve perceived performance.
 */

import { Skeleton } from "@/components/ui/skeleton";

export interface PromotionsTableSkeletonProps {
  rows?: number;
  isAdmin?: boolean;
}

export function PromotionsTableSkeleton({ rows = 5, isAdmin = false }: PromotionsTableSkeletonProps) {
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
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="border-b">
                {/* Template Name */}
                <td className="p-4">
                  <Skeleton className="h-5 w-48" />
                </td>

                {/* Path Badge */}
                <td className="p-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>

                {/* Status Badge */}
                <td className="p-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>

                {/* Badge Count */}
                <td className="p-4">
                  <Skeleton className="h-4 w-16" />
                </td>

                {/* Created Date */}
                <td className="p-4">
                  <Skeleton className="h-4 w-24" />
                </td>

                {/* Creator (Admin Only) */}
                {isAdmin && (
                  <td className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </td>
                )}

                {/* Actions */}
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end">
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
