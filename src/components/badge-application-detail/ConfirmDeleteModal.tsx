/**
 * ConfirmDeleteModal Component
 *
 * Confirmation dialog for deleting a draft badge application.
 * Warns user that this action cannot be undone.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConfirmDeleteModalProps } from "@/types";
import { Trash2, AlertTriangle } from "lucide-react";

export function ConfirmDeleteModal({ isOpen, applicationTitle, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      // Error is handled by parent component
      // eslint-disable-next-line no-console
      console.error("Delete modal error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Application?
          </DialogTitle>
          <DialogDescription>{applicationTitle}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-4 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-red-900 dark:text-red-200 mb-1">Warning</p>
              <p className="text-red-800 dark:text-red-300">
                This action cannot be undone. This will permanently delete the application and all associated data.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onCancel} variant="outline" disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isDeleting} variant="destructive">
            {isDeleting ? "Deleting..." : "Delete Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
