/**
 * AdminActionModal Component
 *
 * Modal for admin to approve or reject a submitted promotion.
 * For reject action, requires a reason to be provided.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { PromotionListItemDto } from "@/types";

export interface AdminActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: PromotionListItemDto | null;
  action: "approve" | "reject" | null;
  onConfirm: (action: "approve" | "reject", reason?: string) => Promise<void>;
}

export function AdminActionModal({ isOpen, onClose, promotion, action, onConfirm }: AdminActionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!action || !promotion) return;

    // Validate reject reason
    if (action === "reject" && !reason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirm(action, action === "reject" ? reason : undefined);
      handleClose();
    } catch (err) {
      // Error handling is done in parent component
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  if (!promotion || !action) return null;

  const isApprove = action === "approve";
  const title = isApprove ? "Approve Promotion?" : "Reject Promotion?";
  const description = isApprove
    ? "Are you sure you want to approve this promotion? The user will be notified of the approval."
    : "Please provide a reason for rejecting this promotion. The user will see this feedback.";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{description}</p>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium text-foreground">{promotion.template.name}</p>
              <p className="text-sm text-muted-foreground">
                {promotion.badge_count} badge{promotion.badge_count !== 1 ? "s" : ""} assigned
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Reject Reason Field */}
        {!isApprove && (
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this promotion is being rejected..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              aria-invalid={!!error}
              aria-describedby={error ? "reject-reason-error" : undefined}
            />
            {error && (
              <p id="reject-reason-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} variant={isApprove ? "default" : "destructive"}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApprove ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
