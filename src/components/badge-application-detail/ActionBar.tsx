/**
 * ActionBar Component
 *
 * Displays action buttons based on application status and user permissions.
 * Manages all primary user actions (edit, delete, submit, accept, reject, back).
 */

import { Button } from "@/components/ui/button";
import type { ActionBarProps } from "@/types";
import { Edit, Trash2, Send, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export function ActionBar({
  status,
  isOwner,
  isAdmin,
  isLoading,
  onEdit,
  onDelete,
  onSubmit,
  onAccept,
  onReject,
  onBack,
}: ActionBarProps) {
  // Permission derivation
  const canEdit = status === "draft" && isOwner;
  const canDelete = status === "draft" && isOwner;
  const canSubmit = status === "draft" && isOwner;
  const canReview = status === "submitted" && isAdmin;

  return (
    <div className="flex flex-wrap items-center gap-3 pt-6 border-t">
      {/* Owner Actions (Draft) */}
      {canEdit && (
        <Button onClick={onEdit} disabled={isLoading} variant="default">
          <Edit />
          Edit Application
        </Button>
      )}

      {canSubmit && (
        <Button onClick={onSubmit} disabled={isLoading} variant="default">
          <Send />
          Submit for Review
        </Button>
      )}

      {canDelete && (
        <Button onClick={onDelete} disabled={isLoading} variant="destructive">
          <Trash2 />
          Delete
        </Button>
      )}

      {/* Admin Actions (Submitted) */}
      {canReview && (
        <>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            variant="default"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            <CheckCircle />
            Accept Application
          </Button>
          <Button onClick={onReject} disabled={isLoading} variant="destructive">
            <XCircle />
            Reject Application
          </Button>
        </>
      )}

      {/* Back Button (Always Visible) */}
      <Button onClick={onBack} variant="outline" className="ml-auto">
        <ArrowLeft />
        Back to Applications
      </Button>
    </div>
  );
}
