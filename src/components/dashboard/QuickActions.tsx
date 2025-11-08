import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * QuickActions Component
 *
 * Displays a row of prominent action buttons for common user tasks.
 * Provides quick access to frequently used features.
 *
 * Features:
 * - Responsive grid layout
 * - Icon support for visual context
 * - Prominent CTAs
 * - Accessible navigation
 *
 * @param className - Additional CSS classes
 */
interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <div className={cn("", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Browse Catalog */}
        <a href="/catalog" className="block">
          <Button
            variant="outline"
            className="w-full h-auto py-4 px-4 flex items-start gap-3 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Browse Catalog</p>
              <p className="text-xs text-muted-foreground mt-0.5">Explore available badges</p>
            </div>
          </Button>
        </a>

        {/* Apply for Badge */}
        <a href="/apply/new" className="block">
          <Button
            variant="default"
            className="w-full h-auto py-4 px-4 flex items-start gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Apply for Badge</p>
              <p className="text-xs opacity-90 mt-0.5">Start a new application</p>
            </div>
          </Button>
        </a>

        {/* View Templates */}
        <a href="/promotion-templates" className="block">
          <Button
            variant="outline"
            className="w-full h-auto py-4 px-4 flex items-start gap-3 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">View Templates</p>
              <p className="text-xs text-muted-foreground mt-0.5">See promotion requirements</p>
            </div>
          </Button>
        </a>
      </div>
    </div>
  );
}
