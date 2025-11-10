import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { TemplateOverviewCardProps } from "@/types";

export function TemplateOverviewCard({ template }: TemplateOverviewCardProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getPathBadgeColor = (path: string) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <div>
            <Badge variant={template.is_active ? "default" : "destructive"}>
              {template.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Career Path</span>
          <div>
            <Badge className={getPathBadgeColor(template.path)}>
              {template.path.charAt(0).toUpperCase() + template.path.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Level Progression</span>
          <div className="flex items-center gap-2 text-base font-medium text-foreground">
            <span>{template.from_level}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span>{template.to_level}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Created</span>
          <span className="text-base font-medium text-foreground">{formatDate((template as any).created_at)}</span>
        </div>

        {(template as any).updated_at && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
            <span className="text-base font-medium text-foreground">{formatDate((template as any).updated_at)}</span>
          </div>
        )}

        {(template as any).deactivated_at && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Deactivated</span>
            <span className="text-base font-medium text-destructive">
              {formatDate((template as any).deactivated_at)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
