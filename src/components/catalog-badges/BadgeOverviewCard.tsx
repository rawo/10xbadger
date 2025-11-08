/**
 * BadgeOverviewCard Component
 *
 * Displays a visual card with badge overview information:
 * - Icon/avatar
 * - Description
 * - Key metadata highlights
 */

import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeCategoryType, BadgeLevelType } from "@/types";

interface BadgeOverviewCardProps {
  title: string;
  description: string | null;
  category: BadgeCategoryType;
  level: BadgeLevelType;
  iconUrl?: string | null;
}

export function BadgeOverviewCard(props: BadgeOverviewCardProps) {
  const { title, description, category, level, iconUrl } = props;

  // Map category to human-readable label
  const categoryLabels: Record<BadgeCategoryType, string> = {
    technical: "Technical",
    organizational: "Organizational",
    softskilled: "Soft Skilled",
  };

  // Map level to color variant
  const levelColors: Record<BadgeLevelType, string> = {
    gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    silver: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            {iconUrl ? (
              <img src={iconUrl} alt={`${title} icon`} className="w-12 h-12 object-contain" />
            ) : (
              <Award className="h-8 w-8 text-primary" />
            )}
          </div>

          {/* Title and badges */}
          <div className="flex-1 min-w-0">
            <CardTitle className="mb-2">{title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{categoryLabels[category]}</Badge>
              <Badge className={levelColors[level]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {description ? (
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        ) : (
          <p className="text-muted-foreground italic">No description available</p>
        )}
      </CardContent>
    </Card>
  );
}
