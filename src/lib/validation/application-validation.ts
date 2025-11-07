/**
 * Client-Side Validation for Badge Applications
 *
 * Zod schemas for validating badge application data on the client side.
 */

import { z } from "zod";

/**
 * Schema for date_of_application field
 * - Required
 * - Must be valid date format (YYYY-MM-DD)
 * - Soft warning if in the future (not blocking)
 */
export const dateOfApplicationSchema = z
  .string()
  .min(1, "Application date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date");

/**
 * Schema for date_of_fulfillment field
 * - Optional
 * - Must be valid date format if provided
 */
export const dateOfFulfillmentSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(val);
    },
    {
      message: "Please enter a valid date",
    }
  );

/**
 * Schema for reason field
 * - Optional
 * - Max 2000 characters
 */
export const reasonSchema = z.string().max(2000, "Reason must be 2000 characters or less").optional();

/**
 * Complete application form schema
 */
export const applicationFormSchema = z
  .object({
    catalog_badge_id: z.string().uuid(),
    date_of_application: dateOfApplicationSchema,
    date_of_fulfillment: z.string(),
    reason: z.string(),
  })
  .refine(
    (data) => {
      // If both dates are provided, fulfillment must be >= application
      if (data.date_of_fulfillment && data.date_of_application) {
        return data.date_of_fulfillment >= data.date_of_application;
      }
      return true;
    },
    {
      message: "Fulfillment date cannot be before application date",
      path: ["date_of_fulfillment"],
    }
  );

/**
 * Validates a single field from the application form
 *
 * @param field - Field name to validate
 * @param value - Value to validate
 * @param formData - Complete form data (for cross-field validation)
 * @returns Error message if validation fails, undefined otherwise
 */
export function validateApplicationField(
  field: "date_of_application" | "date_of_fulfillment" | "reason",
  value: string,
  formData: { date_of_application: string; date_of_fulfillment: string; reason: string }
): string | undefined {
  try {
    switch (field) {
      case "date_of_application": {
        dateOfApplicationSchema.parse(value);
        // Soft validation: check if date is in the future
        const appDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (appDate > today) {
          return "Application date should not be in the future (warning)";
        }
        return undefined;
      }

      case "date_of_fulfillment": {
        dateOfFulfillmentSchema.parse(value);
        // Cross-field validation: must be >= date_of_application
        if (value && formData.date_of_application && value < formData.date_of_application) {
          return "Fulfillment date cannot be before application date";
        }
        return undefined;
      }

      case "reason": {
        reasonSchema.parse(value);
        return undefined;
      }

      default:
        return undefined;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message;
    }
    return "Validation error";
  }
}

/**
 * Validates the entire application form
 *
 * @param formData - Complete form data
 * @returns Object with field names as keys and error messages as values
 */
export function validateApplicationForm(formData: {
  catalog_badge_id: string;
  date_of_application: string;
  date_of_fulfillment: string;
  reason: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  try {
    applicationFormSchema.parse(formData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((err: z.ZodIssue) => {
        const field = err.path[0];
        if (field && typeof field === "string" && !err.message.includes("warning")) {
          errors[field] = err.message;
        }
      });
    }
  }

  return errors;
}
