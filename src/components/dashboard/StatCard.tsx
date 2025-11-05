import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatCardProps } from "@/types";

/**
 * StatCard Component
 *
 * Reusable card component for displaying a single statistic.
 * Displays a label, numeric value, optional icon, and supports navigation.
 *
 * Features:
 * - Variant-based styling (default, success, warning, error)
 * - Optional icon display
 * - Clickable with link navigation
 * - Hover effects and animations
 * - Accessible keyboard navigation
 *
 * @param label - Display text for the statistic
 * @param value - Numeric value to display
 * @param icon - Optional React element for icon display
 * @param link - Optional URL for navigation when card is clicked
 * @param variant - Visual style variant (default, success, warning, error)
 * @param className - Additional CSS classes
 */
export function StatCard({ label, value, icon, link, variant = "default", className }: StatCardProps) {
  // Variant-specific styling
  const variantStyles = {
    default: "border-border hover:border-primary/50",
    success: "border-green-500/20 bg-green-50/50 dark:bg-green-950/20 hover:border-green-500/50",
    warning: "border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/20 hover:border-yellow-500/50",
    error: "border-red-500/20 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500/50",
  };

  const variantTextStyles = {
    default: "text-foreground",
    success: "text-green-700 dark:text-green-300",
    warning: "text-yellow-700 dark:text-yellow-300",
    error: "text-red-700 dark:text-red-300",
  };

  // Common card content
  const content = (
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div>
        <p className={cn("text-3xl font-bold", variantTextStyles[variant])}>{value}</p>
      </div>
    </CardContent>
  );

  // If link is provided, wrap in anchor tag
  if (link) {
    return (
      <a
        href={link}
        className={cn(
          "block transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
          className
        )}
      >
        <Card
          className={cn(
            "h-full cursor-pointer transition-all duration-200",
            variantStyles[variant]
          )}
        >
          {content}
        </Card>
      </a>
    );
  }

  // Otherwise, render card without link
  return (
    <Card className={cn("h-full", variantStyles[variant], className)}>
      {content}
    </Card>
  );
}
