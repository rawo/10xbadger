import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RulesList } from "./RulesList";
import type { TemplateRulesDetailCardProps } from "@/types";

export function TemplateRulesDetailCard({ rules }: TemplateRulesDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge Requirements</CardTitle>
        <CardDescription>
          The following badges are required to use this template for a promotion submission:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RulesList rules={rules} isCompact={false} />
      </CardContent>
    </Card>
  );
}


