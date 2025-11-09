/**
 * PromotionsHeader Component
 *
 * Page header showing title and primary action (New Promotion)
 */

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface PromotionsHeaderProps {
  isAdmin: boolean;
  onCreateClick: () => void;
}

export function PromotionsHeader({ isAdmin, onCreateClick }: PromotionsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <a href="/" className="hover:text-foreground transition-colors">
          Home
        </a>
        <span>/</span>
        <span className="text-foreground" aria-current="page">
          Promotions
        </span>
      </nav>

      {/* Header with title and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Promotions</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Manage all promotion submissions and drafts"
              : "View and manage your promotion submissions"}
          </p>
        </div>

        {/* Primary Action */}
        <div className="shrink-0">
          <Button onClick={onCreateClick} size="default">
            <Plus className="h-4 w-4 mr-2" />
            New Promotion
          </Button>
        </div>
      </div>
    </div>
  );
}

