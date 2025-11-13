/**
 * RulesList Component
 *
 * Displays a list of promotion template rules with color-coded badges
 * for categories and levels. Supports both compact and detailed display modes.
 */

import { Badge } from "@/components/ui/badge";
import type { RulesListProps, PromotionTemplateRule } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Get category badge color class
 */
function getCategoryColorClass(category: string): string {
  switch (category) {
    case "technical":
      return "border-primary/50 text-primary bg-primary/5";
    case "organizational":
      return "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950";
    case "softskilled":
      return "border-secondary/50 text-secondary bg-secondary/5";
    default:
      return "border-gray-400 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900";
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
      return "border-accent/50 text-accent bg-accent/5";
    default:
      return "border-gray-400 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900";
  }
}

/**
 * Format category label
 */
function formatCategory(category: string): string {
  if (category === "softskilled") return "Soft Skilled";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Format level label
 */
function formatLevel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function RulesList({ rules, isCompact = false, className }: RulesListProps) {
  // If no rules, show empty state
  if (!rules || rules.length === 0) {
    return <div className={cn("text-sm text-muted-foreground", className)}>No rules defined for this template.</div>;
  }

  // Compact mode: display as inline badges
  if (isCompact) {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {rules.map((rule: PromotionTemplateRule, index: number) => (
          <Badge
            key={index}
            variant="outline"
            className={cn("text-xs", getCategoryColorClass(rule.category))}
            title={`${rule.minimum_required}x ${formatCategory(rule.category)} ${formatLevel(rule.level)}`}
          >
            {rule.minimum_required}x {formatCategory(rule.category)} {formatLevel(rule.level)}
          </Badge>
        ))}
      </div>
    );
  }

  // Detailed mode: display as list with separate badges
  return (
    <div className={cn("space-y-2", className)}>
      {rules.map((rule: PromotionTemplateRule, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{rule.minimum_required}×</span>
          <Badge variant="outline" className={cn("capitalize", getCategoryColorClass(rule.category))}>
            {formatCategory(rule.category)}
          </Badge>
          <Badge variant="outline" className={cn("capitalize", getLevelColorClass(rule.level))}>
            {formatLevel(rule.level)}
          </Badge>
        </div>
      ))}
    </div>
  );
}
