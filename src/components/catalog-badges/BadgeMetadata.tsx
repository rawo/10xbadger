/**
 * BadgeMetadata Component
 *
 * Displays structured badge metadata in a card:
 * - Category
 * - Level
 * - Position levels
 * - Tags
 * - Created/updated timestamps
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeCategoryType, BadgeLevelType } from "@/types";

interface BadgeMetadataProps {
  category: BadgeCategoryType;
  level: BadgeLevelType;
  positionLevels?: string[] | null;
  tags?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function BadgeMetadata(props: BadgeMetadataProps) {
  const { category, level, positionLevels, tags, createdAt, updatedAt } = props;

  // Map category to human-readable label
  const categoryLabels: Record<BadgeCategoryType, string> = {
    technical: "Technical",
    organizational: "Organizational",
    softskilled: "Soft Skilled",
  };

  // Format date strings
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category */}
        <div>
          <dt className="text-sm font-medium text-muted-foreground mb-1">Category</dt>
          <dd className="text-sm">
            <Badge variant="outline">{categoryLabels[category]}</Badge>
          </dd>
        </div>

        {/* Level */}
        <div>
          <dt className="text-sm font-medium text-muted-foreground mb-1">Level</dt>
          <dd className="text-sm capitalize">{level}</dd>
        </div>

        {/* Position Levels */}
        {positionLevels && positionLevels.length > 0 && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">Applicable Position Levels</dt>
            <dd className="flex flex-wrap gap-2 mt-1">
              {positionLevels.map((posLevel) => (
                <Badge key={posLevel} variant="secondary">
                  {posLevel}
                </Badge>
              ))}
            </dd>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">Tags</dt>
            <dd className="flex flex-wrap gap-2 mt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </dd>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t">
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{formatDate(createdAt)}</dd>
            </div>
            {updatedAt && updatedAt !== createdAt && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">{formatDate(updatedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
