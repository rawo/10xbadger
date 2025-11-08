/**
 * ApplicationInfoCard Component
 *
 * Displays core application information including application dates, fulfillment dates,
 * reason/evidence text, and timestamps. This card shows the primary data that the
 * applicant provided.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ApplicationInfoCardProps } from "@/types";
import { Calendar, FileText, Clock } from "lucide-react";

/**
 * Format date string to readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format timestamp to readable format with time
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

export function ApplicationInfoCard({
  dateOfApplication,
  dateOfFulfillment,
  reason,
  createdAt,
  submittedAt,
}: ApplicationInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Application Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date of Application */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date of Application
            </div>
            <p className="text-sm text-foreground pl-6">{formatDate(dateOfApplication)}</p>
          </div>

          {/* Date of Fulfillment */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date of Fulfillment
            </div>
            <p className="text-sm text-foreground pl-6">
              {dateOfFulfillment ? (
                formatDate(dateOfFulfillment)
              ) : (
                <span className="text-muted-foreground italic">Not specified</span>
              )}
            </p>
          </div>

          {/* Reason / Evidence */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Reason / Evidence</div>
            {reason ? (
              <div className="space-y-1">
                <div className="text-sm text-foreground border rounded-md p-3 bg-muted/30 min-h-[80px] max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
                  {reason}
                </div>
                <p className="text-xs text-muted-foreground text-right">{reason.length} / 2000 characters</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-3">Not provided</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Created: {formatTimestamp(createdAt)}</span>
            </div>
            {submittedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Submitted: {formatTimestamp(submittedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
