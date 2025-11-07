/**
 * useApplicationEditor Hook
 *
 * Centralized state management for badge application editor.
 * Handles form data, validation, autosave, and API interactions.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import type {
  ApplicationFormData,
  ValidationErrors,
  AutosaveState,
  CatalogBadgeDetailDto,
  BadgeApplicationDetailDto,
} from "@/types";
import {
  createBadgeApplication,
  updateBadgeApplication,
  submitBadgeApplication,
} from "@/lib/api/badge-applications-api";
import { validateApplicationField, validateApplicationForm } from "@/lib/validation/application-validation";

interface UseApplicationEditorProps {
  mode: "create" | "edit";
  catalogBadge: CatalogBadgeDetailDto;
  existingApplication?: BadgeApplicationDetailDto;
  userId: string;
}

interface UseApplicationEditorReturn {
  formData: ApplicationFormData;
  errors: ValidationErrors;
  autosaveState: AutosaveState;
  isSubmitting: boolean;
  applicationId?: string;
  isDirty: boolean;

  updateField: (field: keyof ApplicationFormData, value: string) => void;
  handleBlur: (field: keyof ApplicationFormData) => void;
  saveDraft: () => Promise<void>;
  submitForReview: () => Promise<void>;
}

/**
 * Debounce utility function
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

// Validation is now handled by Zod schemas imported from @/lib/validation/application-validation

/**
 * useApplicationEditor Hook
 */
export function useApplicationEditor({
  mode,
  catalogBadge,
  existingApplication,
  userId,
}: UseApplicationEditorProps): UseApplicationEditorReturn {
  // =========================================================================
  // State Variables
  // =========================================================================

  // Form data state
  const [formData, setFormData] = useState<ApplicationFormData>(() => {
    if (mode === "edit" && existingApplication) {
      return {
        catalog_badge_id: existingApplication.catalog_badge_id,
        date_of_application: existingApplication.date_of_application || "",
        date_of_fulfillment: existingApplication.date_of_fulfillment || "",
        reason: existingApplication.reason || "",
      };
    }
    return {
      catalog_badge_id: catalogBadge.id,
      date_of_application: "",
      date_of_fulfillment: "",
      reason: "",
    };
  });

  // Validation errors
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Autosave state
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    status: "idle",
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Application ID (for create mode, stores ID after first save)
  const [applicationId, setApplicationId] = useState<string | undefined>(
    mode === "edit" && existingApplication ? existingApplication.id : undefined
  );

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false);

  // Track initial load
  const isInitialMount = useRef(true);

  // =========================================================================
  // Field Update Handler
  // =========================================================================

  const updateField = useCallback((field: keyof ApplicationFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);

    // Clear error for this field when user starts typing (only for validatable fields)
    if (field !== "catalog_badge_id") {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  }, []);

  // =========================================================================
  // Field Blur Handler (Validation)
  // =========================================================================

  const handleBlur = useCallback(
    (field: keyof ApplicationFormData) => {
      // Skip validation for catalog_badge_id (not user-editable)
      if (field === "catalog_badge_id") return;

      const error = validateApplicationField(
        field as "date_of_application" | "date_of_fulfillment" | "reason",
        formData[field],
        formData
      );
      if (error && !error.includes("warning")) {
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof ValidationErrors];
          return newErrors;
        });
      }
    },
    [formData]
  );

  // =========================================================================
  // Save Draft Function
  // =========================================================================

  const saveDraft = useCallback(async () => {
    setAutosaveState({ status: "saving" });

    try {
      if (mode === "create" && !applicationId) {
        // First save - create draft
        const response = await createBadgeApplication({
          catalog_badge_id: formData.catalog_badge_id,
          date_of_application: formData.date_of_application,
          date_of_fulfillment: formData.date_of_fulfillment || undefined,
          reason: formData.reason || undefined,
        });
        setApplicationId(response.id);
        setAutosaveState({ status: "saved", lastSavedAt: new Date() });
        setIsDirty(false);
      } else if (applicationId) {
        // Subsequent saves - update draft
        await updateBadgeApplication(applicationId, {
          date_of_application: formData.date_of_application,
          date_of_fulfillment: formData.date_of_fulfillment || undefined,
          reason: formData.reason || undefined,
        });
        setAutosaveState({ status: "saved", lastSavedAt: new Date() });
        setIsDirty(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setAutosaveState({ status: "error", error: message });
      toast.error("Failed to save draft", {
        description: message,
      });
      console.error("Save error:", error);
    }
  }, [mode, applicationId, formData]);

  // =========================================================================
  // Debounced Autosave
  // =========================================================================

  const debouncedSave = useMemo(() => debounce(saveDraft, 2000), [saveDraft]);

  // Trigger autosave when form changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isDirty && formData.date_of_application) {
      // Only autosave if we have at least the required field
      debouncedSave();
    }
  }, [formData, isDirty, debouncedSave]);

  // =========================================================================
  // Submit For Review Function
  // =========================================================================

  const submitForReview = useCallback(async () => {
    // Validate form using Zod schemas
    const validationErrors = validateApplicationForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors as ValidationErrors);
      // Focus first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element instanceof HTMLElement) {
        element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // First, ensure draft is saved
      if (isDirty) {
        await saveDraft();
      }

      // Then submit for review
      if (applicationId) {
        await submitBadgeApplication(applicationId);
        toast.success("Application submitted successfully!", {
          description: "Your application has been sent for admin review.",
        });
        // Redirect to detail page on success after a short delay
        setTimeout(() => {
          window.location.href = `/applications/${applicationId}`;
        }, 1000);
      } else {
        throw new Error("Cannot submit: application not yet created");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit";
      toast.error("Submission failed", {
        description: message,
      });
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isDirty, applicationId, saveDraft]);

  // =========================================================================
  // Return Hook Interface
  // =========================================================================

  return {
    formData,
    errors,
    autosaveState,
    isSubmitting,
    applicationId,
    isDirty,
    updateField,
    handleBlur,
    saveDraft,
    submitForReview,
  };
}
