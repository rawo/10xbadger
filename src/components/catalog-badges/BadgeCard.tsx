/**
 * BadgeCard Component
 *
 * Individual badge display card with category/level indicators and admin action menu
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BadgeCardProps } from "@/types";

export function BadgeCard({ badge, isAdmin, onClick, onEdit, onDeactivate }: BadgeCardProps) {
  const isInactive = badge.status === "inactive";

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-primary/10 text-primary";
      case "organizational":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "softskilled":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "gold":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "silver":
        return "bg-gray-400/10 text-gray-700 dark:text-gray-400";
      case "bronze":
        return "bg-accent/10 text-accent";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const handleCardClick = () => {
    if (!isInactive) {
      onClick(badge.id);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !isInactive) {
      e.preventDefault();
      onClick(badge.id);
    }
  };

  return (
    <Card
      role="listitem"
      className={`p-6 hover:shadow-md transition-shadow ${!isInactive ? "cursor-pointer" : "opacity-60"} relative`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={isInactive ? -1 : 0}
    >
      {/* Status indicator for inactive badges */}
      {isInactive && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Inactive
          </Badge>
        </div>
      )}

      {/* Admin Action Menu */}
      {isAdmin && (
        <div className="absolute top-4 right-4 flex gap-2" role="group" aria-label="Badge actions">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(badge);
            }}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeactivate(badge.id);
            }}
            disabled={isInactive}
          >
            Deactivate
          </Button>
        </div>
      )}

      {/* Badge Title */}
      <h3 className="text-xl font-bold text-foreground mb-2 pr-24">{badge.title}</h3>

      {/* Badge Description */}
      {badge.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{badge.description}</p>}

      {/* Category and Level Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge className={`${getCategoryColor(badge.category)} capitalize`}>{badge.category}</Badge>
        <Badge className={`${getLevelColor(badge.level)} capitalize`}>{badge.level}</Badge>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Created: {new Date(badge.created_at).toLocaleDateString()}</div>
        <div>Version: {badge.version}</div>
      </div>
    </Card>
  );
}
