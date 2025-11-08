/**
 * CatalogBadgeInfoCard Component
 *
 * Displays detailed information about the catalog badge that this application is for.
 * Shows badge title, category, level, description, and version information for historical tracking.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CatalogBadgeInfoCardProps } from "@/types";
import { Award, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Get category badge color class
 */
function getCategoryColorClass(category: string): string {
  switch (category) {
    case "technical":
      return "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950";
    case "organizational":
      return "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950";
    case "softskilled":
      return "border-purple-500 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950";
    default:
      return "";
  }
}

/**
 * Get level badge color class
 */
function getLevelColorClass(level: string): string {
  switch (level) {
    case "gold":
      return "border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950";
    case "silver":
      return "border-gray-400 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900";
    case "bronze":
      return "border-orange-500 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950";
    default:
      return "";
  }
}

/**
 * Format date string to readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CatalogBadgeInfoCard({ badge }: CatalogBadgeInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Badge Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Badge Title */}
          <div>
            <h3 className="text-xl font-bold text-foreground">{badge.title}</h3>
          </div>

          {/* Category and Level Badges */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("capitalize", getCategoryColorClass(badge.category))}>
              {badge.category}
            </Badge>
            <Badge variant="outline" className={cn("capitalize", getLevelColorClass(badge.level))}>
              {badge.level}
            </Badge>
          </div>

          {/* Description */}
          {badge.description ? (
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Description</div>
              <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30 whitespace-pre-wrap break-words">
                {badge.description}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided</p>
          )}

          {/* Badge Metadata */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Badge Version: {badge.catalog_badge_version}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Created: {formatDate(badge.created_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
