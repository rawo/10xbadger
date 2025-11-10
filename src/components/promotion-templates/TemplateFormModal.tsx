/**
 * TemplateFormModal Component
 *
 * Modal dialog for creating new promotion templates or editing existing ones.
 * Includes dynamic rules management and form validation.
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type {
  TemplateFormModalProps,
  TemplateFormData,
  PromotionTemplateRule,
  PromotionPathType,
  BadgeCategoryType,
  BadgeLevelType,
  ValidationErrors,
} from "@/types";

export function TemplateFormModal({ isOpen, mode, template, onClose, onSubmit }: TemplateFormModalProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    path: "technical",
    from_level: "",
    to_level: "",
    rules: [],
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New rule form state
  const [newRule, setNewRule] = useState<PromotionTemplateRule>({
    category: "technical",
    level: "gold",
    minimum_required: 1,
  });

  // Initialize form data when template changes (edit mode)
  useEffect(() => {
    if (mode === "edit" && template) {
      setFormData({
        name: template.name,
        path: template.path,
        from_level: template.from_level,
        to_level: template.to_level,
        rules: template.rules,
      });
    } else {
      setFormData({
        name: "",
        path: "technical",
        from_level: "",
        to_level: "",
        rules: [],
      });
    }
    setErrors({});
  }, [mode, template, isOpen]);

  /**
   * Validate a single field
   */
  const validateField = (
    field: keyof TemplateFormData,
    value: string | PromotionTemplateRule[]
  ): string | undefined => {
    switch (field) {
      case "name":
        if (!value || (typeof value === "string" && !value.trim())) return "Name is required";
        if (typeof value === "string" && value.length > 200) return "Name must be 200 characters or less";
        break;
      case "path":
        if (!value) return "Career path is required";
        break;
      case "from_level":
        if (!value || (typeof value === "string" && !value.trim())) return "From level is required";
        if (typeof value === "string" && value.length > 50) return "From level must be 50 characters or less";
        break;
      case "to_level":
        if (!value || (typeof value === "string" && !value.trim())) return "To level is required";
        if (typeof value === "string" && value.length > 50) return "To level must be 50 characters or less";
        break;
      case "rules":
        if (Array.isArray(value) && value.length === 0) return "At least one rule is required";
        break;
    }
    return undefined;
  };

  /**
   * Handle field change
   */
  const handleChange = (field: keyof TemplateFormData, value: string | PromotionPathType) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handle field blur (validate)
   */
  const handleBlur = (field: keyof TemplateFormData) => {
    const value = formData[field];
    const error = validateField(field, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  /**
   * Add a new rule
   */
  const handleAddRule = () => {
    if (newRule.minimum_required < 1) {
      toast.error("Minimum required must be at least 1");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      rules: [...prev.rules, { ...newRule }],
    }));

    // Reset new rule form
    setNewRule({
      category: "technical",
      level: "gold",
      minimum_required: 1,
    });

    // Clear rules error if it exists
    if (errors.rules) {
      setErrors((prev) => ({ ...prev, rules: undefined }));
    }
  };

  /**
   * Remove a rule
   */
  const handleRemoveRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  /**
   * Validate all fields
   */
  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {};

    const nameError = validateField("name", formData.name);
    if (nameError) newErrors.name = nameError;

    const pathError = validateField("path", formData.path);
    if (pathError) newErrors.path = pathError;

    const fromError = validateField("from_level", formData.from_level);
    if (fromError) newErrors.from_level = fromError;

    const toError = validateField("to_level", formData.to_level);
    if (toError) newErrors.to_level = toError;

    const rulesError = validateField("rules", formData.rules);
    if (rulesError) newErrors.rules = rulesError;

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
      await onSubmit(formData);
      toast.success(mode === "create" ? "Template created successfully" : "Template updated successfully");
      onClose();
    } catch (err) {
      // Handle server-side validation errors attached by parent handler
      const errorDetails = (err as any)?.details;
      if (Array.isArray(errorDetails)) {
        const serverErrors = mapApiValidationDetails(errorDetails);
        setErrors(serverErrors);
        toast.error("Please fix validation errors");
        return;
      }

      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
      setErrors({ name: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.values(errors).some((error) => error !== undefined);
  const isFormValid =
    formData.name &&
    formData.path &&
    formData.from_level &&
    formData.to_level &&
    formData.rules.length > 0 &&
    !hasErrors;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Promotion Template" : "Edit Promotion Template"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a new promotion template with badge requirements."
              : "Update the promotion template information below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Template Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              maxLength={200}
              className={`flex h-10 w-full rounded-md border ${
                errors.name ? "border-destructive" : "border-input"
              } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              placeholder="e.g., Junior to Senior Developer"
              required
            />
            {errors.name && (
              <p className="text-sm text-destructive" role="alert">
                {errors.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{formData.name.length} / 200 characters</p>
          </div>

          {/* Career Path Field */}
          <div className="space-y-2">
            <label htmlFor="path" className="text-sm font-medium text-foreground">
              Career Path <span className="text-destructive">*</span>
            </label>
            <select
              id="path"
              value={formData.path}
              onChange={(e) => handleChange("path", e.target.value as PromotionPathType)}
              onBlur={() => handleBlur("path")}
              className={`flex h-10 w-full rounded-md border ${
                errors.path ? "border-destructive" : "border-input"
              } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              required
            >
              <option value="technical">Technical</option>
              <option value="financial">Financial</option>
              <option value="management">Management</option>
            </select>
            {errors.path && (
              <p className="text-sm text-destructive" role="alert">
                {errors.path}
              </p>
            )}
          </div>

          {/* From Level and To Level */}
          <div className="grid grid-cols-2 gap-4">
            {/* From Level */}
            <div className="space-y-2">
              <label htmlFor="from_level" className="text-sm font-medium text-foreground">
                From Level <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="from_level"
                value={formData.from_level}
                onChange={(e) => handleChange("from_level", e.target.value)}
                onBlur={() => handleBlur("from_level")}
                maxLength={50}
                className={`flex h-10 w-full rounded-md border ${
                  errors.from_level ? "border-destructive" : "border-input"
                } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder="e.g., Junior"
                required
              />
              {errors.from_level && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.from_level}
                </p>
              )}
            </div>

            {/* To Level */}
            <div className="space-y-2">
              <label htmlFor="to_level" className="text-sm font-medium text-foreground">
                To Level <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="to_level"
                value={formData.to_level}
                onChange={(e) => handleChange("to_level", e.target.value)}
                onBlur={() => handleBlur("to_level")}
                maxLength={50}
                className={`flex h-10 w-full rounded-md border ${
                  errors.to_level ? "border-destructive" : "border-input"
                } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder="e.g., Senior"
                required
              />
              {errors.to_level && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.to_level}
                </p>
              )}
            </div>
          </div>

          {/* Rules Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Badge Requirements <span className="text-destructive">*</span>
              </span>
              {errors.rules && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.rules}
                </p>
              )}
            </div>

            {/* Existing Rules */}
            {formData.rules.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-md border border-input bg-muted/30">
                    <span className="font-medium text-sm">{rule.minimum_required}×</span>
                    <Badge variant="outline" className="capitalize">
                      {rule.category}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {rule.level}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(index)}
                      className="ml-auto"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Rule Form */}
            <div className="border border-input rounded-md p-4 bg-muted/10">
              <p className="text-sm font-medium text-foreground mb-3">Add Badge Requirement</p>
              <div className="grid grid-cols-4 gap-3">
                {/* Minimum Required */}
                <div>
                  <label htmlFor="minimum_required" className="text-xs text-muted-foreground mb-1 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="minimum_required"
                    min="1"
                    value={newRule.minimum_required}
                    onChange={(e) =>
                      setNewRule((prev) => ({ ...prev, minimum_required: parseInt(e.target.value) || 1 }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="rule_category" className="text-xs text-muted-foreground mb-1 block">
                    Category
                  </label>
                  <select
                    id="rule_category"
                    value={newRule.category}
                    onChange={(e) => setNewRule((prev) => ({ ...prev, category: e.target.value as BadgeCategoryType }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="technical">Technical</option>
                    <option value="organizational">Organizational</option>
                    <option value="softskilled">Soft Skilled</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label htmlFor="rule_level" className="text-xs text-muted-foreground mb-1 block">
                    Level
                  </label>
                  <select
                    id="rule_level"
                    value={newRule.level}
                    onChange={(e) => setNewRule((prev) => ({ ...prev, level: e.target.value as BadgeLevelType }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                  </select>
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddRule} size="sm" className="w-full">
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : mode === "create" ? (
                "Create Template"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Map API validation details to the modal's ValidationErrors shape.
 * Exposed for unit testing.
 */
export function mapApiValidationDetails(details: { field: string; message: string }[]) {
  const serverErrors: ValidationErrors = {};
  details.forEach((d) => {
    const fieldKey = d.field as keyof ValidationErrors;
    serverErrors[fieldKey] = d.message;
  });
  return serverErrors;
}
