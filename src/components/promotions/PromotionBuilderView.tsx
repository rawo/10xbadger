/**
 * PromotionBuilderView Component
 *
 * Main orchestration component for the promotion builder/detail view.
 * Manages state for promotion data, validation results, modal states, loading states,
 * and coordinates all child components. Handles API calls for adding/removing badges
 * and submitting promotion.
 * 
 * Features:
 * - Real-time validation against template requirements
 * - Add/remove badge applications
 * - Submit promotion for review
 * - Handle reservation conflicts (409 errors)
 * - Support both builder (draft) and detail (read-only) modes
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PromotionDetailDto,
  BadgeApplicationWithBadge,
  PromotionTemplateRule,
  PromotionValidationResponse,
  PromotionBuilderViewProps,
  ReservationConflictError,
  ApiError,
} from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BadgePicker } from "./promotion-builder/BadgePicker";
import { EligibilityPreview } from "./promotion-builder/EligibilityPreview";

export function PromotionBuilderView({ initialPromotion, userId, isAdmin }: PromotionBuilderViewProps) {
  // =========================================================================
  // State Management
  // =========================================================================

  // Promotion data
  const [promotion, setPromotion] = useState<PromotionDetailDto | null>(initialPromotion || null);

  // Validation state
  const [validationResult, setValidationResult] = useState<PromotionValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Loading states for async operations
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal states
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    error: ReservationConflictError | null;
  }>({
    isOpen: false,
    error: null,
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);

  // Sync promotion when prop changes
  useEffect(() => {
    setPromotion(initialPromotion);
  }, [initialPromotion]);

  // =========================================================================
  // Computed Values
  // =========================================================================

  const isDraft = useMemo(() => promotion?.status === "draft", [promotion]);
  const isOwner = useMemo(() => promotion?.created_by === userId, [promotion, userId]);
  const canEdit = useMemo(() => isDraft && (isOwner || isAdmin), [isDraft, isOwner, isAdmin]);
  const isValid = useMemo(() => validationResult?.is_valid || false, [validationResult]);

  // =========================================================================
  // API Integration: Fetch Validation
  // =========================================================================

  /**
   * Fetch validation status whenever promotion changes (badges added/removed)
   */
  useEffect(() => {
    let mounted = true;
    if (!promotion) return;

    const fetchValidation = async () => {
      setIsValidating(true);
      try {
        const res = await fetch(`/api/promotions/${promotion.id}/validation`);
        if (!res.ok) {
          if (mounted) setValidationResult(null);
          return;
        }
        const data: PromotionValidationResponse = await res.json();
        if (mounted) setValidationResult(data);
      } catch (error) {
        if (mounted) setValidationResult(null);
      } finally {
        if (mounted) setIsValidating(false);
      }
    };

    fetchValidation();

    return () => {
      mounted = false;
    };
  }, [promotion]);

  // =========================================================================
  // API Integration: Add Badges
  // =========================================================================

  /**
   * Add selected badge applications to the promotion
   * Handles success, conflicts (409), and other errors
   */
  const handleAddBadges = useCallback(
    async (badgeApplicationIds: string[]) => {
      if (!promotion || !canEdit) return;

      setIsAdding(true);
      try {
        const res = await fetch(`/api/promotions/${promotion.id}/badges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: badgeApplicationIds }),
        });

        if (!res.ok) {
          // Handle 409 Conflict (badge already reserved)
          if (res.status === 409) {
            const conflictError: ReservationConflictError = await res.json();
            setConflictModal({
              isOpen: true,
              error: conflictError,
            });
            return;
          }

          // Handle other errors
          const err: ApiError = await res.json().catch(() => ({ error: "unknown", message: "Failed to add badges" }));
          throw new Error(err.message || "Failed to add badges");
        }

        // Success: Refetch promotion to get updated badge list
        const updated = await (await fetch(`/api/promotions/${promotion.id}`)).json();
        setPromotion(updated);
        toast.success("Badges added to promotion");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add badges";
        toast.error(message);
      } finally {
        setIsAdding(false);
      }
    },
    [promotion, canEdit]
  );

  // =========================================================================
  // API Integration: Remove Badge
  // =========================================================================

  /**
   * Remove a badge application from the promotion
   */
  const handleRemoveBadges = useCallback(
    async (badgeApplicationIds: string[]) => {
      if (!promotion || !canEdit) return;

      setIsRemoving(true);
      try {
        const res = await fetch(`/api/promotions/${promotion.id}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: badgeApplicationIds }),
        });

        if (!res.ok) {
          const err: ApiError = await res.json().catch(() => ({ error: "unknown", message: "Failed to remove badges" }));
          throw new Error(err.message || "Failed to remove badges");
        }

        // Success: Refetch promotion to get updated badge list
        const updated = await (await fetch(`/api/promotions/${promotion.id}`)).json();
        setPromotion(updated);
        toast.success("Badges removed from promotion");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove badges";
        toast.error(message);
      } finally {
        setIsRemoving(false);
      }
    },
    [promotion, canEdit]
  );

  // =========================================================================
  // API Integration: Submit Promotion
  // =========================================================================

  /**
   * Submit promotion for admin review
   * Validates before submission, handles 409 validation errors
   */
  const handleSubmit = useCallback(async () => {
    if (!promotion || !isDraft || !isValid) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/promotions/${promotion.id}/submit`, { method: "POST" });

      if (!res.ok) {
        // Handle 409 validation failed
        if (res.status === 409) {
          const err: ApiError = await res.json();
          if (err.error === "validation_failed") {
            toast.error("Promotion validation failed. Please resolve missing requirements.");
            return;
          }
        }

        const err: ApiError = await res.json().catch(() => ({ error: "unknown", message: "Failed to submit promotion" }));
        throw new Error(err.message || "Failed to submit promotion");
      }

      toast.success("Promotion submitted successfully");
      // Redirect to promotions list
      window.location.href = "/promotions";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit promotion";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [promotion, isDraft, isValid]);

  // =========================================================================
  // API Integration: Delete Promotion
  // =========================================================================

  /**
   * Delete draft promotion (with confirmation)
   */
  const handleDelete = useCallback(async () => {
    if (!promotion || !isDraft) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/promotions/${promotion.id}`, { method: "DELETE" });

      if (!res.ok) {
        const err: ApiError = await res.json().catch(() => ({ error: "unknown", message: "Failed to delete promotion" }));
        throw new Error(err.message || "Failed to delete promotion");
      }

      toast.success("Promotion deleted successfully");
      // Redirect to promotions list
      window.location.href = "/promotions";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete promotion";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmModal(false);
    }
  }, [promotion, isDraft]);

  // =========================================================================
  // Event Handlers
  // =========================================================================

  /**
   * Navigate back to promotions list
   */
  const handleBack = useCallback(() => {
    window.location.href = "/promotions";
  }, []);

  /**
   * Handle conflict modal actions
   */
  const handleConflictRetry = useCallback(async () => {
    if (!promotion) return;
    // Refetch promotion to get updated state
    const updated = await (await fetch(`/api/promotions/${promotion.id}`)).json();
    setPromotion(updated);
    setConflictModal({ isOpen: false, error: null });
    toast.info("Promotion data refreshed");
  }, [promotion]);

  const handleConflictNavigate = useCallback((promotionId: string) => {
    window.location.href = `/promotions/${promotionId}`;
  }, []);

  const handleConflictClose = useCallback(() => {
    setConflictModal({ isOpen: false, error: null });
  }, []);

  // =========================================================================
  // Render: Error State
  // =========================================================================

  if (!promotion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Promotion not found.</p>
      </div>
    );
  }

  const templateRules = useMemo<PromotionTemplateRule[] | undefined>(() => promotion?.template?.rules, [promotion]);

  // =========================================================================
  // Render: Main View
  // =========================================================================

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <a href="/" className="hover:text-foreground transition-colors">
          Home
        </a>
        <span>/</span>
        <a href="/promotions" className="hover:text-foreground transition-colors">
          Promotions
        </a>
        <span>/</span>
        <span className="text-foreground" aria-current="page">
          Promotion {promotion.id}
        </span>
      </nav>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Badges and Badge Picker */}
        <div className="lg:col-span-2 space-y-4">
          {/* Promotion Metadata Card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h1 className="text-2xl font-bold mb-2">Promotion Draft</h1>
            <p className="text-sm text-muted-foreground mb-4">ID: {promotion.id}</p>
            <p className="text-base font-medium mb-2">Template: {promotion.template?.name || "—"}</p>
          </div>

          {/* Assigned Badges List */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-medium mt-4 mb-2">Assigned Badges</h3>
            {promotion.badge_applications && promotion.badge_applications.length > 0 ? (
              <ul className="space-y-2">
                {promotion.badge_applications.map((ba: BadgeApplicationWithBadge) => (
                  <li key={ba.id} className="flex items-center gap-3 p-2 rounded-md border">
                    <div className="flex-1">
                      <div className="font-medium">{ba.catalog_badge.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ba.catalog_badge.category} • {ba.catalog_badge.level}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBadges([ba.id])}
                        disabled={isRemoving}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No badges assigned yet.</p>
            )}
          </div>

          {/* Badge Picker (Draft Only) */}
          {canEdit && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-3">Add Badges</h2>
              <BadgePicker
                userId={userId}
                existingBadgeIds={promotion.badge_applications?.map((ba) => ba.id) || []}
                onAddBadges={handleAddBadges}
                isAdding={isAdding}
              />
            </div>
          )}
        </div>

        {/* Right Column: Eligibility and Actions */}
        <aside className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-6 sticky top-6 space-y-4">
            <h3 className="text-lg font-semibold mb-3">Eligibility Preview</h3>
            <EligibilityPreview
              validationResult={validationResult}
              isLoading={isValidating}
            />

            {/* Validation Summary */}
            <div>
              <div className="text-sm font-medium mb-2">Validation</div>
              {validationResult ? (
                <div className="text-sm">
                  <div>
                    Status:{" "}
                    <span className={validationResult.is_valid ? "text-green-600" : "text-yellow-600"}>
                      {validationResult.is_valid ? "Valid" : "Not valid"}
                    </span>
                  </div>
                  {!validationResult.is_valid && validationResult.missing && validationResult.missing.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                      {validationResult.missing.map((m, idx) => (
                        <li key={idx}>
                          {m.count}× missing: {m.category} • {m.level}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Validation not available</div>
              )}
            </div>

            {/* Action Buttons */}
            {isDraft && (
              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isValid}
                  className="w-full"
                >
                  {isSubmitting ? "Submitting…" : "Submit Promotion"}
                </Button>
                {canEdit && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmModal(true)}
                    disabled={isDeleting}
                    className="w-full"
                  >
                    {isDeleting ? "Deleting…" : "Delete Draft"}
                  </Button>
                )}
              </div>
            )}
            <Button variant="outline" onClick={handleBack} className="w-full">
              Back to Promotions
            </Button>
          </div>
        </aside>
      </div>

      {/* Conflict Modal */}
      {conflictModal.isOpen && conflictModal.error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Badge Already Reserved</h2>
            <p className="text-muted-foreground mb-4">{conflictModal.error.message}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Badge ID: {conflictModal.error.badge_application_id}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleConflictClose}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleConflictNavigate(conflictModal.error!.owning_promotion_id)}
              >
                View Owning Promotion
              </Button>
              <Button onClick={handleConflictRetry}>Refresh & Retry</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Delete Promotion?</h2>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this promotion draft? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmModal(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


