/**
 * ReviewModal Component
 *
 * Modal dialog for accepting or rejecting badge applications.
 * Allows admins to provide an optional decision note (max 2000 characters).
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
import type { ReviewModalProps } from "@/types";
import { CheckCircle, XCircle } from "lucide-react";

export function ReviewModal({ isOpen, mode, applicationTitle, onConfirm, onCancel }: ReviewModalProps) {
  const [decisionNote, setDecisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAccept = mode === "accept";
  const title = isAccept ? "Accept Application" : "Reject Application";
  const Icon = isAccept ? CheckCircle : XCircle;
  const iconColor = isAccept ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(decisionNote || undefined);
      // Reset state on success
      setDecisionNote("");
    } catch (error) {
      // Error is handled by parent component
      // eslint-disable-next-line no-console
      console.error("Review modal error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDecisionNote("");
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={iconColor} />
            {title}
          </DialogTitle>
          <DialogDescription>Application: {applicationTitle}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label htmlFor="decision-note" className="text-sm font-medium mb-2 block">
            Decision Note (Optional)
          </label>
          <textarea
            id="decision-note"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            maxLength={2000}
            placeholder="Add a note about your decision..."
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical"
            rows={5}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{decisionNote.length} / 2000 characters</p>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            variant={isAccept ? "default" : "destructive"}
            className={isAccept ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800" : ""}
          >
            {isSubmitting ? (isAccept ? "Accepting..." : "Rejecting...") : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
