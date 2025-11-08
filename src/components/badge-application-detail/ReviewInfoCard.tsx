/**
 * ReviewInfoCard Component
 *
 * Displays review information for accepted/rejected applications.
 * Shows reviewer, review date, and decision note.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ReviewInfoCardProps } from "@/types";
import { CheckCircle, XCircle, User, Calendar, FileText } from "lucide-react";
import { BadgeApplicationStatus } from "@/types";

/**
 * Format timestamp to readable format
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReviewInfoCard({ status, reviewedBy, reviewedAt, decisionNote, isVisible }: ReviewInfoCardProps) {
  if (!isVisible) {
    return null;
  }

  const isAccepted = status === BadgeApplicationStatus.Accepted;
  const Icon = isAccepted ? CheckCircle : XCircle;
  const iconColor = isAccepted ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          Review Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Reviewer */}
          {reviewedBy && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Reviewed By
              </div>
              <p className="text-sm text-foreground pl-6">{reviewedBy}</p>
            </div>
          )}

          {/* Review Date */}
          {reviewedAt && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Review Date
              </div>
              <p className="text-sm text-foreground pl-6">{formatTimestamp(reviewedAt)}</p>
            </div>
          )}

          {/* Decision Note */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Decision Note
            </div>
            {decisionNote ? (
              <div className="text-sm text-foreground border rounded-md p-3 bg-muted/30 whitespace-pre-wrap break-words">
                {decisionNote}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-6">No note provided</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
