import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import type { TemplateDetailHeaderProps } from "@/types";

export function TemplateDetailHeader({
  templateName,
  isAdmin,
  isActive,
  onEditClick,
  onDeactivateClick,
  isLoading,
}: TemplateDetailHeaderProps) {
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <a href="/" className="hover:text-foreground transition-colors">
          Home
        </a>
        <span>/</span>
        <a href="/promotion-templates" className="hover:text-foreground transition-colors">
          Promotion Templates
        </a>
        <span>/</span>
        <span className="text-foreground" aria-current="page">
          {templateName}
        </span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-foreground">{templateName}</h1>
          {!isActive && <Badge variant="destructive">Inactive</Badge>}
        </div>

        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="default" onClick={onEditClick} disabled={Boolean(isLoading)}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Edit
            </Button>
            {isActive && (
              <Button variant="destructive" size="default" onClick={onDeactivateClick} disabled={Boolean(isLoading)}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Deactivate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
