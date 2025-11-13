/**
 * ConfirmSubmitModal Component
 *
 * Confirmation dialog for submitting a draft badge application for review.
 * Warns user that they won't be able to edit after submission.
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { ConfirmSubmitModalProps } from "@/types";
import { Send, AlertCircle } from "lucide-react";

export function ConfirmSubmitModal({ isOpen, applicationTitle, onConfirm, onCancel }: ConfirmSubmitModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch (error) {
      // Error is handled by parent component
      // eslint-disable-next-line no-console
      console.error("Submit modal error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Application for Review?
          </AlertDialogTitle>
          <AlertDialogDescription>{applicationTitle}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-4 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">Important</p>
              <p className="text-yellow-800 dark:text-yellow-300">
                Once submitted, you will no longer be able to edit this application. An administrator will review your
                submission and make a decision.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
