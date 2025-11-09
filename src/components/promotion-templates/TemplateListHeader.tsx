/**
 * TemplateListHeader Component
 *
 * Page header for promotion templates list with breadcrumb navigation
 * and conditional "Create Template" button for admins.
 */

import { Button } from "@/components/ui/button";
import type { TemplateListHeaderProps } from "@/types";
import { Plus } from "lucide-react";

export function TemplateListHeader({ isAdmin, onCreateClick }: TemplateListHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
          <a href="/" className="hover:text-foreground transition-colors">
            Home
          </a>
          <span>/</span>
          <span className="text-foreground">Promotion Templates</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-foreground mb-2">Promotion Templates</h1>

        {/* Description */}
        <p className="text-muted-foreground max-w-3xl">
          View and manage promotion templates. Templates define the badge requirements needed for promotion to specific
          position levels within different career paths.
        </p>
      </div>

      {/* Create Template Button (Admin Only) */}
      {isAdmin && (
        <Button onClick={onCreateClick} size="default" className="shrink-0">
          <Plus />
          Create Template
        </Button>
      )}
    </div>
  );
}
