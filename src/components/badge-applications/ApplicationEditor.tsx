/**
 * ApplicationEditor Component
 *
 * Main interactive editor for creating and editing badge applications.
 * Manages form state, validation, autosave, and submission.
 */

import { toast } from "sonner";
import { useApplicationEditor } from "@/hooks/useApplicationEditor";
import type { ApplicationEditorProps, BadgeApplicationStatusType } from "@/types";
import { EditorHeader } from "./EditorHeader";
import { BadgeInfoSection } from "./BadgeInfoSection";
import { ApplicationFormSection } from "./ApplicationFormSection";
import { ActionBar } from "./ActionBar";

export function ApplicationEditor({ mode, catalogBadge, existingApplication, userId }: ApplicationEditorProps) {
  const {
    formData,
    errors,
    autosaveState,
    isSubmitting,
    isDirty,
    updateField,
    handleBlur,
    saveDraft,
    submitForReview,
  } = useApplicationEditor({
    mode,
    catalogBadge,
    existingApplication,
    userId,
  });

  // =========================================================================
  // Event Handlers
  // =========================================================================

  const handleCancel = () => {
    if (isDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        window.location.href = "/applications";
      }
    } else {
      window.location.href = "/applications";
    }
  };

  const handleSubmit = async () => {
    if (confirm("Submit this application for admin review?")) {
      await submitForReview();
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      toast.success("Draft saved", {
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      // Error toast is already shown by the hook
    }
  };

  // Check if form can be submitted
  const canSubmit = Boolean(
    formData.date_of_application && !errors.date_of_application && !errors.date_of_fulfillment && !errors.reason
  );

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Editor Header */}
      <EditorHeader
        mode={mode}
        status={existingApplication?.status as BadgeApplicationStatusType | undefined}
        catalogBadgeTitle={catalogBadge.title}
      />

      {/* Badge Info Section */}
      <BadgeInfoSection catalogBadge={catalogBadge} />

      {/* Application Form Section */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <ApplicationFormSection formData={formData} errors={errors} onChange={updateField} onBlur={handleBlur} />
      </form>

      {/* Action Bar */}
      <ActionBar
        autosaveState={autosaveState}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
