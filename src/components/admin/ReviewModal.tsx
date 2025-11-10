import React, { useState } from "react";
import type { ReviewModalProps } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * ReviewModal Component
 *
 * Modal dialog for confirming accept/reject actions with optional decision note.
 * Shows application summary and allows admin to enter feedback for the applicant.
 */
export function ReviewModal(props: ReviewModalProps) {
  const { isOpen, mode, application, onConfirm, onCancel, isProcessing } = props;

  const [decisionNote, setDecisionNote] = useState("");

  const maxLength = 2000;
  const remaining = maxLength - decisionNote.length;
  const isValid = decisionNote.length <= maxLength;

  const handleConfirm = async () => {
    if (!application || !isValid) return;

    try {
      await onConfirm(application.id, decisionNote || undefined);
      setDecisionNote(""); // Reset on success
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleCancel = () => {
    setDecisionNote("");
    onCancel();
  };

  if (!application) return null;

  const isAccept = mode === "accept";
  const title = isAccept ? "Accept Application" : "Reject Application";
  const confirmLabel = isAccept ? "Accept" : "Reject";
  const Icon = isAccept ? CheckCircle : XCircle;
  const iconColor = isAccept ? "text-green-500" : "text-red-500";
  const buttonVariant = isAccept ? "default" : "destructive";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${iconColor}`} />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            {isAccept
              ? "This application will be marked as accepted and the badge will be available for promotions."
              : "This application will be rejected. Please provide feedback to help the applicant improve."}
          </DialogDescription>
        </DialogHeader>

        {/* Application Summary */}
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Badge</p>
            <p className="font-medium">{application.catalog_badge.title}</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-background border">{application.catalog_badge.category}</span>
            <span className="px-2 py-1 rounded-md bg-background border">{application.catalog_badge.level}</span>
          </div>
        </div>

        {/* Decision Note Field */}
        <div className="space-y-2">
          <Label htmlFor="decision-note">Decision Note {isAccept ? "(Optional)" : "(Recommended)"}</Label>
          <textarea
            id="decision-note"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            maxLength={maxLength}
            placeholder={
              isAccept
                ? "Provide feedback for the applicant... (optional)"
                : "Explain why this application is being rejected..."
            }
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={isProcessing}
          />
          <p className={`text-xs ${remaining < 100 ? "text-orange-500" : "text-muted-foreground"}`}>
            {remaining} characters remaining
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="button" variant={buttonVariant} onClick={handleConfirm} disabled={!isValid || isProcessing}>
            {isProcessing ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
