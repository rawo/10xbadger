/**
 * DetailHeader Component
 *
 * Displays breadcrumb navigation, application title, and status badge.
 * Provides clear context about the current application and allows easy navigation
 * back to the applications list.
 */

import { Badge } from "@/components/ui/badge";
import type { DetailHeaderProps, BadgeApplicationStatusType } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronRight, ArrowLeft } from "lucide-react";

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
 * Get status badge variant
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

export function DetailHeader({ applicationId, badgeTitle, status }: DetailHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <a
          href="/applications"
          className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Applications</span>
        </a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate" title={applicationId}>
          {applicationId.slice(0, 8)}...
        </span>
      </nav>

      {/* Title and Status */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground mb-1 break-words">Badge Application: {badgeTitle}</h1>
          <p className="text-sm text-muted-foreground font-mono">{applicationId}</p>
        </div>
        <Badge
          variant={getStatusVariant(status as BadgeApplicationStatusType)}
          className={cn("text-sm px-3 py-1 flex-shrink-0", getStatusColorClass(status as BadgeApplicationStatusType))}
        >
          {formatStatus(status as BadgeApplicationStatusType)}
        </Badge>
      </div>
    </div>
  );
}
