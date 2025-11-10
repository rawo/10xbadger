import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, AlertTriangle, Loader2 } from "lucide-react";
import type { UseTemplateCardProps } from "@/types";

export function UseTemplateCard({
  templateId,
  templateName,
  templatePath,
  fromLevel,
  toLevel,
  rulesCount,
  isActive,
  onUseTemplate,
  isLoading,
}: UseTemplateCardProps) {
  const formatPath = (path: string) => path.charAt(0).toUpperCase() + path.slice(1);

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>Ready to Apply for Promotion?</CardTitle>
        <CardDescription>Use this template to start building your promotion submission.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">This template includes:</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• {formatPath(templatePath)}</li>
            <li>
              • Promotion from {fromLevel} to {toLevel}
            </li>
            <li>
              • {rulesCount} badge {rulesCount === 1 ? "requirement" : "requirements"} to fulfill
            </li>
          </ul>
        </div>

        {!isActive && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive"
          >
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">This template has been deactivated and cannot be used for new promotions.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          You'll be able to select specific badges and review before submitting.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onUseTemplate}
          disabled={!isActive || Boolean(isLoading)}
          className="w-full"
          size="lg"
          aria-busy={Boolean(isLoading)}
        >
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
          Use This Template
        </Button>
      </CardFooter>
    </Card>
  );
}
