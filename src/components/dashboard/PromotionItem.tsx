import React from "react";
import { Badge } from "@/components/ui/badge";
import type { PromotionListItemDto, PromotionStatusType } from "@/types";
import { PromotionStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * PromotionItem Component
 *
 * List item displaying summary information for a single promotion.
 * Shows status indicator, template info, badge count, and level progression.
 *
 * Features:
 * - Status badge with color coding
 * - Template name and path
 * - Level progression (from → to)
 * - Badge count indicator
 * - Hover effects
 * - Click navigation to detail view
 * - Responsive layout
 *
 * @param promotion - Promotion data to display
 * @param onNavigate - Optional callback when item is clicked
 * @param className - Additional CSS classes
 */
interface PromotionItemProps {
  promotion: PromotionListItemDto;
  onNavigate?: (id: string) => void;
  className?: string;
}

/**
 * Get status badge color classes
 */
function getStatusColorClass(status: PromotionStatusType): string {
  switch (status) {
    case PromotionStatus.Draft:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case PromotionStatus.Submitted:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case PromotionStatus.Approved:
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700";
    case PromotionStatus.Rejected:
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "";
  }
}

/**
 * Format status text for display
 */
function formatStatus(status: PromotionStatusType): string {
  switch (status) {
    case PromotionStatus.Draft:
      return "Draft";
    case PromotionStatus.Submitted:
      return "Submitted";
    case PromotionStatus.Approved:
      return "Approved";
    case PromotionStatus.Rejected:
      return "Rejected";
    default:
      return status;
  }
}

/**
 * Format path for display
 */
function formatPath(path: string): string {
  return path.charAt(0).toUpperCase() + path.slice(1);
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PromotionItem({ promotion, onNavigate, className }: PromotionItemProps) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(promotion.id);
    } else {
      window.location.href = `/promotions/${promotion.id}`;
    }
  };

  // Determine which date to display based on status
  const displayDate =
    promotion.status === PromotionStatus.Submitted && promotion.submitted_at
      ? promotion.submitted_at
      : promotion.created_at;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left p-3 border rounded-md hover:bg-accent/50 transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "hover:shadow-md hover:border-primary/30 hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Template Name */}
          <p className="font-medium text-sm truncate">{promotion.template.name}</p>

          {/* Path and Level Progression */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {formatPath(promotion.path)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {promotion.from_level} → {promotion.to_level}
            </span>
          </div>

          {/* Badge Count and Date */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>
              {promotion.badge_count} {promotion.badge_count === 1 ? "badge" : "badges"}
            </span>
            <span>•</span>
            <span>
              {promotion.status === PromotionStatus.Submitted
                ? `Submitted ${formatDate(displayDate)}`
                : `Created ${formatDate(displayDate)}`}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <Badge
            variant={promotion.status === PromotionStatus.Approved ? "outline" : "secondary"}
            className={getStatusColorClass(promotion.status as PromotionStatusType)}
          >
            {formatStatus(promotion.status as PromotionStatusType)}
          </Badge>
        </div>
      </div>
    </button>
  );
}
