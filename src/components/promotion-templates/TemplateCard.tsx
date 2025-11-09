/**
 * TemplateCard Component
 *
 * Individual promotion template display card with path/level indicators,
 * rules list, and admin action menu.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RulesList } from "./RulesList";
import type { TemplateCardProps } from "@/types";

export function TemplateCard({ template, isAdmin, onClick, onEdit, onDeactivate }: TemplateCardProps) {
  const isInactive = !template.is_active;

  /**
   * Get career path color
   */
  const getPathColor = (path: string) => {
    switch (path) {
      case "technical":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "financial":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "management":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  /**
   * Format path label
   */
  const formatPath = (path: string): string => {
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const handleCardClick = () => {
    if (onClick && !isInactive) {
      onClick(template.id);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ") && !isInactive) {
      e.preventDefault();
      onClick(template.id);
    }
  };

  return (
    <Card
      role="listitem"
      className={`p-6 hover:shadow-md transition-shadow ${onClick && !isInactive ? "cursor-pointer" : ""} ${isInactive ? "opacity-60" : ""} relative`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={onClick && !isInactive ? 0 : -1}
    >
      {/* Status indicator for inactive templates */}
      {isInactive && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Inactive
          </Badge>
        </div>
      )}

      {/* Admin Action Menu */}
      {isAdmin && !isInactive && (
        <div className="absolute top-4 right-4 flex gap-2" role="group" aria-label="Template actions">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(template);
            }}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeactivate(template);
            }}
          >
            Deactivate
          </Button>
        </div>
      )}

      {/* Template Name */}
      <h3 className="text-xl font-bold text-foreground mb-2 pr-24">{template.name}</h3>

      {/* Career Path and Level Progression */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Badge className={`${getPathColor(template.path)} capitalize`}>{formatPath(template.path)}</Badge>
        <span className="text-sm text-muted-foreground">
          {template.from_level} → {template.to_level}
        </span>
      </div>

      {/* Rules Section */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Badge Requirements</h4>
        <RulesList rules={template.rules} isCompact={false} />
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Created: {new Date(template.created_at).toLocaleDateString()}</div>
      </div>
    </Card>
  );
}
