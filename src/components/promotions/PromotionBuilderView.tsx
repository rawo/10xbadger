import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PromotionDetailDto, BadgeApplicationWithBadge, PromotionTemplateRule } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BadgePicker } from "./promotion-builder/BadgePicker";
import { EligibilityPreview } from "./promotion-builder/EligibilityPreview";

interface Props {
  initialPromotion: PromotionDetailDto;
}

export function PromotionBuilderView({ initialPromotion }: Props) {
  const [promotion, setPromotion] = useState<PromotionDetailDto | null>(initialPromotion || null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    setPromotion(initialPromotion);
  }, [initialPromotion]);

  const handleAddBadges = useCallback(
    async (badgeApplicationIds: string[]) => {
      if (!promotion) return;
      setIsAdding(true);
      try {
        const res = await fetch(`/api/promotions/${promotion.id}/badges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: badgeApplicationIds }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Failed to add badges" }));
          throw new Error(err.message || "Failed to add badges");
        }

        // Refetch promotion to get updated badge list
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
    [promotion]
  );

  const handleRemoveBadges = useCallback(
    async (badgeApplicationIds: string[]) => {
      if (!promotion) return;
      setIsRemoving(true);
      try {
        const res = await fetch(`/api/promotions/${promotion.id}/badges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_application_ids: badgeApplicationIds }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Failed to remove badges" }));
          throw new Error(err.message || "Failed to remove badges");
        }

        // Refetch promotion to get updated badge list
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
    [promotion]
  );

  const templateRules = useMemo<PromotionTemplateRule[] | undefined>(() => promotion?.template?.rules, [promotion]);

  // Validation state
  const [validationResult, setValidationResult] = useState<{
    is_valid: boolean;
    requirements?: any[];
    missing?: any[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch validation whenever promotion changes (or badges change)
  useEffect(() => {
    let mounted = true;
    if (!promotion) return;
    const fetchValidation = async () => {
      try {
        const res = await fetch(`/api/promotions/${promotion.id}/validation`);
        if (!res.ok) {
          setValidationResult(null);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setValidationResult(data);
      } catch {
        if (!mounted) return;
        setValidationResult(null);
      }
    };
    fetchValidation();
    return () => {
      mounted = false;
    };
  }, [promotion]);

  if (!promotion) {
    return <div className="container mx-auto px-4 py-8">Promotion not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <a href="/" className="hover:text-foreground transition-colors">Home</a>
        <span>/</span>
        <a href="/promotions" className="hover:text-foreground transition-colors">Promotions</a>
        <span>/</span>
        <span className="text-foreground" aria-current="page">Promotion {promotion.id}</span>
      </nav>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h1 className="text-2xl font-bold mb-2">Promotion Draft</h1>
            <p className="text-sm text-muted-foreground mb-4">ID: {promotion.id}</p>
            <p className="text-base font-medium mb-2">Template: {promotion.template?.name || "—"}</p>

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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBadges([ba.id])}
                      disabled={isRemoving}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No badges assigned yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-3">Add Badges</h2>
            <BadgePicker onAdd={handleAddBadges} isAdding={isAdding} />
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-6 sticky top-6 space-y-4">
            <h3 className="text-lg font-semibold mb-3">Eligibility Preview</h3>
            <EligibilityPreview rules={templateRules || []} assignedBadges={promotion.badge_applications || []} />

            {/* Validation summary */}
            <div>
              <div className="text-sm font-medium mb-2">Validation</div>
              {validationResult ? (
                <div className="text-sm">
                  <div>
                    Status:{" "}
                    <span className={validationResult.is_valid ? "text-success" : "text-warning"}>
                      {validationResult.is_valid ? "Valid" : "Not valid"}
                    </span>
                  </div>
                  {!validationResult.is_valid && validationResult.missing && validationResult.missing.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                      {validationResult.missing.map((m: any, idx: number) => (
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

            {/* Submit CTA */}
            <div>
              <Button
                onClick={async () => {
                  if (!promotion) return;
                  setIsSubmitting(true);
                  try {
                    const res = await fetch(`/api/promotions/${promotion.id}/submit`, { method: "POST" });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({ message: "Failed to submit promotion" }));
                      if (res.status === 409 && err.error === "validation_failed") {
                        const missing = err.missing || [];
                        toast.error("Promotion validation failed. Please resolve missing requirements.");
                        setValidationResult({ is_valid: false, missing });
                        setIsSubmitting(false);
                        return;
                      }
                      throw new Error(err.message || "Failed to submit promotion");
                    }

                    const updated = await res.json();
                    toast.success("Promotion submitted successfully");
                    // Navigate to promotion detail
                    window.location.href = `/promotions/${updated.id}`;
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to submit promotion";
                    toast.error(message);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting || !(validationResult && validationResult.is_valid)}
              >
                {isSubmitting ? "Submitting…" : "Submit Promotion"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


