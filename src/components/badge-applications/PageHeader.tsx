import React from "react";
import type { PageHeaderProps } from "@/types";
import { Button } from "@/components/ui/button";

/**
 * PageHeader Component
 *
 * Displays the page title, breadcrumb navigation, and primary action button.
 * Provides context for the current view and quick access to create new applications.
 */
export function PageHeader(props: PageHeaderProps) {
  const { title, actionLabel, actionHref, actionIcon } = props;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left Side: Title and Breadcrumb */}
      <div className="space-y-1">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">
            Home
          </a>
          <span>/</span>
          <span className="text-foreground font-medium">Applications</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      </div>

      {/* Right Side: Action Button */}
      {actionLabel && actionHref && (
        <Button asChild>
          <a href={actionHref}>
            {actionIcon && <span className="mr-2">{actionIcon}</span>}
            {actionLabel}
          </a>
        </Button>
      )}
    </div>
  );
}
