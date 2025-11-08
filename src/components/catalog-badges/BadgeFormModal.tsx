/**
 * BadgeFormModal Component
 *
 * Modal dialog for creating new badges or editing existing ones.
 * Includes form validation and API integration.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BadgeFormModalProps, BadgeFormData, ValidationErrors, BadgeCategoryType, BadgeLevelType } from "@/types";

export function BadgeFormModal({ isOpen, mode, badge, onClose, onSuccess }: BadgeFormModalProps) {
  const [formData, setFormData] = useState<BadgeFormData>({
    title: "",
    description: "",
    category: "",
    level: "",
    metadata: undefined,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when badge changes (edit mode)
  useEffect(() => {
    if (mode === "edit" && badge) {
      setFormData({
        title: badge.title,
        description: badge.description || "",
        category: badge.category,
        level: badge.level,
        metadata: badge.metadata,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "",
        level: "",
        metadata: undefined,
      });
    }
    setErrors({});
  }, [mode, badge, isOpen]);

  /**
   * Validate a single field
   */
  const validateField = (field: keyof BadgeFormData, value: string): string | undefined => {
    switch (field) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.length > 200) return "Title must be 200 characters or less";
        break;
      case "description":
        if (value.length > 2000) return "Description must be 2000 characters or less";
        break;
      case "category":
        if (!value) return "Category is required";
        break;
      case "level":
        if (!value) return "Level is required";
        break;
    }
    return undefined;
  };

  /**
   * Handle field change
   */
  const handleChange = (field: keyof BadgeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handle field blur (validate)
   */
  const handleBlur = (field: keyof BadgeFormData) => {
    const value = formData[field];
    const error = validateField(field, value as string);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  /**
   * Validate all fields
   */
  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {};

    const titleError = validateField("title", formData.title);
    if (titleError) newErrors.title = titleError;

    const descError = validateField("description", formData.description);
    if (descError) newErrors.description = descError;

    const catError = validateField("category", formData.category);
    if (catError) newErrors.category = catError;

    const levelError = validateField("level", formData.level);
    if (levelError) newErrors.level = levelError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category as BadgeCategoryType,
        level: formData.level as BadgeLevelType,
        metadata: formData.metadata,
      };

      if (mode === "create") {
        const response = await fetch("/api/catalog-badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create badge");
        }
      } else if (mode === "edit" && badge) {
        const response = await fetch(`/api/catalog-badges/${badge.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update badge");
        }
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setErrors({ title: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.values(errors).some((error) => error !== undefined);
  const isFormValid = formData.title && formData.category && formData.level && !hasErrors;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Badge" : "Edit Badge"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new badge to the catalog. Fill in all required fields."
              : "Update the badge information below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Field */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
              maxLength={200}
              className={`flex h-10 w-full rounded-md border ${
                errors.title ? "border-destructive" : "border-input"
              } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              placeholder="e.g., Kubernetes Expert"
              required
            />
            {errors.title && (
              <p className="text-sm text-destructive" role="alert">
                {errors.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{formData.title.length} / 200 characters</p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              maxLength={2000}
              rows={4}
              className={`flex min-h-[80px] w-full rounded-md border ${
                errors.description ? "border-destructive" : "border-input"
              } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              placeholder="Describe the badge requirements..."
            />
            {errors.description && (
              <p className="text-sm text-destructive" role="alert">
                {errors.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{formData.description.length} / 2000 characters</p>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              onBlur={() => handleBlur("category")}
              className={`flex h-10 w-full rounded-md border ${
                errors.category ? "border-destructive" : "border-input"
              } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              required
            >
              <option value="">Select a category</option>
              <option value="technical">Technical</option>
              <option value="organizational">Organizational</option>
              <option value="softskilled">Soft Skilled</option>
            </select>
            {errors.category && (
              <p className="text-sm text-destructive" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          {/* Level Field */}
          <div className="space-y-2">
            <label htmlFor="level" className="text-sm font-medium text-foreground">
              Level <span className="text-destructive">*</span>
            </label>
            <select
              id="level"
              value={formData.level}
              onChange={(e) => handleChange("level", e.target.value)}
              onBlur={() => handleBlur("level")}
              className={`flex h-10 w-full rounded-md border ${
                errors.level ? "border-destructive" : "border-input"
              } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              required
            >
              <option value="">Select a level</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
            {errors.level && (
              <p className="text-sm text-destructive" role="alert">
                {errors.level}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Badge" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
