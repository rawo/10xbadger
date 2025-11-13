import React from "react";
import type { ApplicationRowProps } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * ApplicationRow Component
 *
 * Single row displaying badge application summary with status, dates, and actions.
 * Shows different actions based on application status and user permissions.
 */
export function ApplicationRow(props: ApplicationRowProps) {
  const { application, onEdit, onView, onDelete, isOwner } = props;

  // =========================================================================
  // Computed Values
  // =========================================================================

  const canEdit = application.status === BadgeApplicationStatus.Draft && isOwner;
  const canDelete = application.status === BadgeApplicationStatus.Draft && isOwner;

  // Format dates
  const createdDate = new Date(application.created_at).toLocaleDateString();
  const submittedDate = application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : null;

  // =========================================================================
  // Status Badge Styling
  // =========================================================================

  const getStatusColor = (status: string) => {
    switch (status) {
      case BadgeApplicationStatus.Draft:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      case BadgeApplicationStatus.Submitted:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case BadgeApplicationStatus.Accepted:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case BadgeApplicationStatus.Rejected:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case BadgeApplicationStatus.UsedInPromotion:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // =========================================================================
  // Category Badge Styling
  // =========================================================================

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-primary/10 text-primary";
      case "organizational":
        return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
      case "softskilled":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  // =========================================================================
  // Level Badge Styling
  // =========================================================================

  const getLevelColor = (level: string) => {
    switch (level) {
      case "gold":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
      case "silver":
        return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "bronze":
        return "bg-accent/10 text-accent";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  // =========================================================================
  // Delete Handler with Confirmation
  // =========================================================================

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this draft application? This action cannot be undone.")) {
      onDelete(application.id);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <Card
      role="listitem"
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(application.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(application.id);
        }
      }}
      tabIndex={0}
    >
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-lg">{application.catalog_badge.title}</CardTitle>
          <CardDescription>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Category Badge */}
              <Badge className={getCategoryColor(application.catalog_badge.category)}>
                {application.catalog_badge.category}
              </Badge>

              {/* Level Badge */}
              <Badge className={getLevelColor(application.catalog_badge.level)}>
                {application.catalog_badge.level}
              </Badge>

              {/* Status Badge */}
              <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
            </div>
          </CardDescription>
        </div>

        <CardAction>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView(application.id);
              }}
            >
              View
            </Button>

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(application.id);
                }}
              >
                Edit
              </Button>
            )}

            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Created: {createdDate}</div>
          {submittedDate && <div>Submitted: {submittedDate}</div>}
          {application.date_of_fulfillment && (
            <div>Fulfilled: {new Date(application.date_of_fulfillment).toLocaleDateString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
