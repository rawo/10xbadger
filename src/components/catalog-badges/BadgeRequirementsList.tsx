/**
 * BadgeRequirementsList Component
 *
 * Displays a list of badge requirements with expandable details.
 * Each requirement can show title, description, and examples.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Requirement {
  id: string;
  title?: string | null;
  description: string;
  required?: boolean;
  examples?: string[] | null;
}

interface BadgeRequirementsListProps {
  requirements: Requirement[];
}

export function BadgeRequirementsList(props: BadgeRequirementsListProps) {
  const { requirements } = props;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Toggle requirement expansion
  const toggleRequirement = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!requirements || requirements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No explicit requirements defined</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requirements</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {requirements.map((requirement, index) => {
            const isExpanded = expandedId === requirement.id;
            const hasDetails = requirement.examples && requirement.examples.length > 0;

            return (
              <li key={requirement.id} className="border rounded-lg">
                {/* Requirement header */}
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto font-normal hover:bg-muted/50"
                  onClick={() => toggleRequirement(requirement.id)}
                  disabled={!hasDetails}
                >
                  <div className="flex items-start gap-3 text-left flex-1">
                    <span className="text-sm font-semibold text-primary min-w-[24px]">{index + 1}.</span>
                    <div className="flex-1">
                      {requirement.title && <div className="font-medium mb-1">{requirement.title}</div>}
                      <div className="text-sm text-muted-foreground">{requirement.description}</div>
                    </div>
                  </div>
                  {hasDetails && (
                    <div className="ml-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </Button>

                {/* Expanded details */}
                {isExpanded && hasDetails && (
                  <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                    <div className="pl-7">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Examples:</p>
                      <ul className="space-y-2">
                        {requirement.examples?.map((example, exampleIndex) => (
                          <li key={exampleIndex} className="text-sm flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
