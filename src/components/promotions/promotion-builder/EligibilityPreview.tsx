/**
 * EligibilityPreview Component
 *
 * Displays real-time validation status showing which template requirements
 * are satisfied and which are missing. Updates automatically when badges
 * are added/removed.
 */

import React from "react";
import type { EligibilityPreviewProps } from "@/types";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function EligibilityPreview({ validationResult, isLoading }: EligibilityPreviewProps) {
  // =========================================================================
  // Loading State
  // =========================================================================
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Validating eligibility...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // No Validation Data
  // =========================================================================
  if (!validationResult) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Validation data not available</div>
      </div>
    );
  }

  // =========================================================================
  // Display Validation Results
  // =========================================================================
  const isValid = validationResult.is_valid;

  return (
    <div className="space-y-3">
      {/* Overall Status */}
      <div className="flex items-center gap-2 text-sm mb-2">
        {isValid ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-600">Eligible for Submission</span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-600">Missing Requirements</span>
          </>
        )}
      </div>

      {/* Requirements List */}
      <ul className="space-y-2 text-sm">
        {validationResult.requirements.map((req, idx) => (
          <li
            key={idx}
            className={`flex items-center justify-between p-2 rounded-md border ${
              req.satisfied
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
            }`}
          >
            <div className="flex-1">
              <div className="font-medium text-foreground">
                {req.required}× {req.category === "any" ? "Any Category" : req.category} • {req.level}
              </div>
              <div className="text-xs text-muted-foreground">
                {req.current} / {req.required} assigned
              </div>
            </div>
            <div className="ml-2">
              {req.satisfied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Missing Badges Summary */}
      {!isValid && validationResult.missing && validationResult.missing.length > 0 && (
        <div className="mt-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Still Needed:</div>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            {validationResult.missing.map((m, idx) => (
              <li key={idx}>
                • {m.count}× {m.category === "any" ? "Any Category" : m.category} • {m.level}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
