/**
 * CatalogPageHeader Component
 *
 * Page header with breadcrumb navigation and conditional "Create Badge" button for admins
 */

import { Button } from "@/components/ui/button";
import type { CatalogPageHeaderProps } from "@/types";

export function CatalogPageHeader({ title, isAdmin, onCreateClick }: CatalogPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
          <a href="/" className="hover:text-foreground transition-colors">
            Home
          </a>
          <span>/</span>
          <span className="text-foreground">Catalog</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      </div>

      {/* Create Badge Button (Admin Only) */}
      {isAdmin && (
        <Button onClick={onCreateClick} size="default">
          Create Badge
        </Button>
      )}
    </div>
  );
}
