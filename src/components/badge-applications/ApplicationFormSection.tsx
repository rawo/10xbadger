/**
 * ApplicationFormSection Component
 *
 * Main form section containing all editable fields for badge application data
 */

import type { ApplicationFormSectionProps } from "@/types";

export function ApplicationFormSection({
  formData,
  errors,
  onChange,
  onBlur,
  disabled = false,
}: ApplicationFormSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Application Details</h2>

      {/* Date of Application */}
      <div className="space-y-2">
        <label htmlFor="date_of_application" className="text-sm font-medium text-foreground">
          Application Date <span className="text-destructive">*</span>
        </label>
        <input
          type="date"
          id="date_of_application"
          name="date_of_application"
          value={formData.date_of_application}
          onChange={(e) => onChange("date_of_application", e.target.value)}
          onBlur={() => onBlur("date_of_application")}
          disabled={disabled}
          className={`flex h-10 w-full rounded-md border ${
            errors.date_of_application ? "border-destructive" : "border-input"
          } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
          required
          aria-required="true"
          aria-invalid={!!errors.date_of_application}
          aria-describedby={
            errors.date_of_application ? "date_of_application-error" : "date_of_application-description"
          }
        />
        {errors.date_of_application && (
          <p id="date_of_application-error" className="text-sm text-destructive" role="alert">
            {errors.date_of_application}
          </p>
        )}
        <p id="date_of_application-description" className="text-xs text-muted-foreground">
          When did you start working on this achievement?
        </p>
      </div>

      {/* Date of Fulfillment */}
      <div className="space-y-2">
        <label htmlFor="date_of_fulfillment" className="text-sm font-medium text-foreground">
          Fulfillment Date
        </label>
        <input
          type="date"
          id="date_of_fulfillment"
          name="date_of_fulfillment"
          value={formData.date_of_fulfillment}
          onChange={(e) => onChange("date_of_fulfillment", e.target.value)}
          onBlur={() => onBlur("date_of_fulfillment")}
          disabled={disabled}
          className={`flex h-10 w-full rounded-md border ${
            errors.date_of_fulfillment ? "border-destructive" : "border-input"
          } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
          aria-invalid={!!errors.date_of_fulfillment}
          aria-describedby={
            errors.date_of_fulfillment ? "date_of_fulfillment-error" : "date_of_fulfillment-description"
          }
        />
        {errors.date_of_fulfillment && (
          <p id="date_of_fulfillment-error" className="text-sm text-destructive" role="alert">
            {errors.date_of_fulfillment}
          </p>
        )}
        <p id="date_of_fulfillment-description" className="text-xs text-muted-foreground">
          When did you complete this achievement?
        </p>
      </div>

      {/* Reason / Evidence */}
      <div className="space-y-2">
        <label htmlFor="reason" className="text-sm font-medium text-foreground">
          Reason / Evidence
        </label>
        <textarea
          id="reason"
          name="reason"
          value={formData.reason}
          onChange={(e) => onChange("reason", e.target.value)}
          onBlur={() => onBlur("reason")}
          disabled={disabled}
          rows={6}
          className={`flex min-h-[80px] w-full rounded-md border ${
            errors.reason ? "border-destructive" : "border-input"
          } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="Describe your achievement and provide evidence..."
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? "reason-error" : "reason-description"}
        />
        <div className="flex items-center justify-between">
          {errors.reason ? (
            <p id="reason-error" className="text-sm text-destructive" role="alert">
              {errors.reason}
            </p>
          ) : (
            <p id="reason-description" className="text-xs text-muted-foreground">
              Provide details about your achievement and any supporting evidence
            </p>
          )}
          <span
            className={`text-xs ${formData.reason.length > 1900 ? "text-destructive" : "text-muted-foreground"}`}
            aria-label={`Character count: ${formData.reason.length} of 2000`}
          >
            {formData.reason.length} / 2000
          </span>
        </div>
      </div>
    </div>
  );
}
