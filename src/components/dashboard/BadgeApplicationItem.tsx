import React from "react";
import { Badge } from "@/components/ui/badge";
import type { BadgeApplicationListItemDto, BadgeApplicationStatusType } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * BadgeApplicationItem Component
 *
 * List item displaying summary information for a single badge application.
 * Shows status indicator, badge details, and provides navigation to detail view.
 *
 * Features:
 * - Status badge with color coding
 * - Category and level badges
 * - Hover effects
 * - Click navigation to detail view
 * - Responsive layout
 *
 * @param application - Badge application data to display
 * @param onNavigate - Optional callback when item is clicked
 * @param className - Additional CSS classes
 */
interface BadgeApplicationItemProps {
  application: BadgeApplicationListItemDto;
  onNavigate?: (id: string) => void;
  className?: string;
}

/**
 * Get status badge variant based on application status
 */
function getStatusVariant(status: BadgeApplicationStatusType): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case BadgeApplicationStatus.Draft:
      return "secondary";
    case BadgeApplicationStatus.Submitted:
      return "default";
    case BadgeApplicationStatus.Accepted:
      return "outline";
    case BadgeApplicationStatus.Rejected:
      return "destructive";
    case BadgeApplicationStatus.UsedInPromotion:
      return "outline";
    default:
      return "secondary";
  }
}

/**
 * Get status badge color classes
 */
function getStatusColorClass(status: BadgeApplicationStatusType): string {
  switch (status) {
    case BadgeApplicationStatus.Draft:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case BadgeApplicationStatus.Submitted:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case BadgeApplicationStatus.Accepted:
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700";
    case BadgeApplicationStatus.Rejected:
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    case BadgeApplicationStatus.UsedInPromotion:
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-700";
    default:
      return "";
  }
}

/**
 * Format status text for display
 */
function formatStatus(status: BadgeApplicationStatusType): string {
  switch (status) {
    case BadgeApplicationStatus.Draft:
      return "Draft";
    case BadgeApplicationStatus.Submitted:
      return "Submitted";
    case BadgeApplicationStatus.Accepted:
      return "Accepted";
    case BadgeApplicationStatus.Rejected:
      return "Rejected";
    case BadgeApplicationStatus.UsedInPromotion:
      return "In Promotion";
    default:
      return status;
  }
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

export function BadgeApplicationItem({ application, onNavigate, className }: BadgeApplicationItemProps) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(application.id);
    } else {
      window.location.href = `/applications/${application.id}`;
    }
  };

  // Determine which date to display based on status
  const displayDate =
    application.status === BadgeApplicationStatus.Submitted && application.submitted_at
      ? application.submitted_at
      : application.created_at;

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
          {/* Badge Title */}
          <p className="font-medium text-sm truncate">{application.catalog_badge.title}</p>

          {/* Category and Level */}
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-xs capitalize">
              {application.catalog_badge.category}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                application.catalog_badge.level === "gold" && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                application.catalog_badge.level === "silver" && "border-gray-400 text-gray-700 dark:text-gray-300",
                application.catalog_badge.level === "bronze" && "border-orange-500 text-orange-700 dark:text-orange-400"
              )}
            >
              {application.catalog_badge.level}
            </Badge>
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground mt-1.5">
            {application.status === BadgeApplicationStatus.Submitted
              ? `Submitted ${formatDate(displayDate)}`
              : `Created ${formatDate(displayDate)}`}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <Badge
            variant={getStatusVariant(application.status as BadgeApplicationStatusType)}
            className={getStatusColorClass(application.status as BadgeApplicationStatusType)}
          >
            {formatStatus(application.status as BadgeApplicationStatusType)}
          </Badge>
        </div>
      </div>
    </button>
  );
}
