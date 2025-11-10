/**
 * ConfirmDeactivateModal Component
 *
 * Confirmation dialog for deactivating promotion templates.
 * Shows warning and requires explicit confirmation.
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import type { TemplateConfirmDeactivateModalProps } from "@/types";

export function ConfirmDeactivateModal({ isOpen, template, onConfirm, onCancel }: TemplateConfirmDeactivateModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!template) return;

    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Template?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to deactivate <span className="font-semibold">{template?.name}</span>?
            </p>
            <p className="text-muted-foreground">
              This template will no longer be available for new promotions. Existing promotions using this template will
              not be affected.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isConfirming}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            aria-busy={isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Deactivate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
