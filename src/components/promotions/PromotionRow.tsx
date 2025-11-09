/**
 * PromotionRow Component
 *
 * Individual table row displaying promotion details and actions.
 * Shows status badge, badge count, dates, and context menu for actions.
 * 
 * Keyboard Navigation:
 * - Enter or Space: Open promotion detail
 * - Delete: Remove draft promotion (if owner)
 * 
 * Accessibility:
 * - Focusable with tabIndex
 * - ARIA role="button" for screen readers
 * - Visual focus indicator with ring
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, XCircle } from "lucide-react";
import type { PromotionListItemDto } from "@/types";

export interface PromotionRowProps {
  promotion: PromotionListItemDto;
  isAdmin: boolean;
  userId: string;
  onClick: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function PromotionRow({
  promotion,
  isAdmin,
  userId,
  onClick,
  onDelete,
  onApprove,
  onReject,
}: PromotionRowProps) {
  const isOwner = promotion.created_by === userId;
  const canDelete = promotion.status === "draft" && isOwner;
  const canApprove = isAdmin && promotion.status === "submitted";
  const canReject = isAdmin && promotion.status === "submitted";

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    // Enter key - open promotion detail
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }

    // Delete key - delete draft promotion if allowed
    if (e.key === "Delete" && canDelete) {
      e.preventDefault();
      e.stopPropagation();
      onDelete();
    }
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "submitted":
        return "default";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Get status color classes
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "submitted":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Get path badge color
  const getPathColor = (path: string) => {
    switch (path) {
      case "technical":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "financial":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "management":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <tr
      className="border-b hover:bg-muted/50 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View promotion: ${promotion.template.name}`}
    >
      {/* Template Name */}
      <td className="p-4">
        <div className="font-medium text-foreground">{promotion.template.name}</div>
      </td>

      {/* Path */}
      <td className="p-4">
        <Badge className={getPathColor(promotion.path)} variant="secondary">
          {promotion.path.charAt(0).toUpperCase() + promotion.path.slice(1)}
        </Badge>
      </td>

      {/* Status */}
      <td className="p-4">
        <Badge className={getStatusColor(promotion.status)} variant={getStatusVariant(promotion.status)}>
          {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
        </Badge>
      </td>

      {/* Badge Count */}
      <td className="p-4">
        <span className="text-sm text-muted-foreground">{promotion.badge_count} badges</span>
      </td>

      {/* Created Date */}
      <td className="p-4">
        <span className="text-sm text-muted-foreground">{formatDate(promotion.created_at)}</span>
      </td>

      {/* Creator (Admin Only) */}
      {isAdmin && (
        <td className="p-4">
          <span className="text-sm text-muted-foreground">
            {promotion.created_by === userId ? "You" : "Other User"}
          </span>
        </td>
      )}

      {/* Actions */}
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Admin Actions */}
          {canApprove && onApprove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
              title="Approve promotion"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {canReject && onReject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              title="Reject promotion"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}

          {/* Delete Action */}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete draft"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {/* No Actions Available */}
          {!canDelete && !canApprove && !canReject && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

