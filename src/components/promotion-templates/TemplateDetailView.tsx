import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { TemplateDetailViewProps, PromotionTemplateDetailDto, TemplateFormData, ApiError } from "@/types";
import { TemplateDetailHeader } from "./TemplateDetailHeader";
import { TemplateOverviewCard } from "./TemplateOverviewCard";
import { TemplateRulesDetailCard } from "./TemplateRulesDetailCard";
import { UseTemplateCard } from "./UseTemplateCard";
import { TemplateFormModal } from "./TemplateFormModal";
import { ConfirmDeactivateModal } from "./ConfirmDeactivateModal";

export function TemplateDetailView(props: TemplateDetailViewProps) {
  const { initialTemplate, isAdmin } = props;

  // State
  const [template, setTemplate] = useState<PromotionTemplateDetailDto>(initialTemplate);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleEditClick = useCallback(() => setIsEditModalOpen(true), []);
  const handleDeactivateClick = useCallback(() => setIsDeactivateModalOpen(true), []);
  const handleEditModalClose = useCallback(() => setIsEditModalOpen(false), []);
  const handleDeactivateModalClose = useCallback(() => setIsDeactivateModalOpen(false), []);

  const handleUseTemplate = useCallback(() => {
    const PROMOTIONS_ENABLED = true;
    if (!PROMOTIONS_ENABLED) {
      toast.info("Promotions feature coming soon! Check back later.");
      return;
    }
    window.location.href = `/promotions/new?template_id=${template.id}`;
  }, [template.id]);

  const handleEditSubmit = useCallback(
    async (data: TemplateFormData) => {
      setIsLoading(true);
      try {
        const updateData = {
          name: data.name,
          rules: data.rules,
        };

        const response = await fetch(`/api/promotion-templates/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData: ApiError = await response
            .json()
            .catch(() => ({ message: "Failed to update template" }) as any);
          if (response.status === 404) {
            toast.error("Template not found. It may have been deleted.");
            setIsEditModalOpen(false);
            return;
          }
          if (response.status === 400 && errorData.details) {
            const err = new Error(errorData.message || "Validation failed");
            (err as any).details = errorData.details;
            (err as any).status = 400;
            throw err;
          }
          throw new Error(errorData.message || "Failed to update template");
        }

        const updatedTemplate: PromotionTemplateDetailDto = await response.json();
        setTemplate(updatedTemplate);
        toast.success("Template updated successfully");
        setIsEditModalOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update template";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [template.id]
  );

  const handleDeactivateConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/promotion-templates/${template.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData: ApiError = await response
          .json()
          .catch(() => ({ message: "Failed to deactivate template" }) as any);
        if (response.status === 404) {
          toast.error("Template not found. It may have been deleted.");
          setIsDeactivateModalOpen(false);
          return;
        }
        throw new Error(errorData.message || "Failed to deactivate template");
      }

      setTemplate((prev) => ({
        ...prev,
        is_active: false,
        deactivated_at: new Date().toISOString(),
      }));

      toast.success("Template deactivated successfully");
      setIsDeactivateModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to deactivate template";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [template.id]);

  useEffect(() => {
    if (isEditModalOpen) {
      // Delay slightly to allow modal DOM to render
      const t = setTimeout(() => focusFirstInDialog(), 50);
      return () => clearTimeout(t);
    }
    // No action when closing
    return;
  }, [isEditModalOpen]);

  useEffect(() => {
    if (isDeactivateModalOpen) {
      const t = setTimeout(() => focusFirstInDialog(), 50);
      return () => clearTimeout(t);
    }
    return;
  }, [isDeactivateModalOpen]);

  // Render
  return (
    <div className="container mx-auto px-4 py-8 space-y-6" aria-busy={isLoading}>
      <TemplateDetailHeader
        templateName={template.name}
        isAdmin={isAdmin}
        isActive={template.is_active}
        onEditClick={handleEditClick}
        onDeactivateClick={handleDeactivateClick}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TemplateOverviewCard template={template} />
          <TemplateRulesDetailCard rules={template.rules} />
        </div>

        <div className="lg:col-span-1">
          <UseTemplateCard
            templateId={template.id}
            templateName={template.name}
            templatePath={template.path as any}
            fromLevel={template.from_level}
            toLevel={template.to_level}
            rulesCount={template.rules.length}
            isActive={template.is_active}
            isLoading={isLoading}
            onUseTemplate={handleUseTemplate}
          />
        </div>
      </div>

      <TemplateFormModal
        isOpen={isEditModalOpen}
        mode="edit"
        template={template}
        onClose={handleEditModalClose}
        onSubmit={handleEditSubmit}
      />

      <ConfirmDeactivateModal
        isOpen={isDeactivateModalOpen}
        template={template}
        onConfirm={handleDeactivateConfirm}
        onCancel={handleDeactivateModalClose}
      />
    </div>
  );
}

// Focus management: when a modal opens, ensure first focusable element inside dialog receives focus.
// Rely on role="dialog" markup from modal components; this is a best-effort enhancement.
function focusFirstInDialog() {
  try {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;
    const focusable = dialog.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      focusable.focus();
    }
  } catch (err) {
    // swallow
  }
}
