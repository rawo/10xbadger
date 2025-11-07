/**
 * ActionBar Component
 *
 * Bottom action bar with save, submit buttons and autosave status indicator
 */

import type { ActionBarProps } from "@/types";
import { AutosaveIndicator } from "./AutosaveIndicator";

export function ActionBar({ autosaveState, canSubmit, isSubmitting, onSaveDraft, onSubmit, onCancel }: ActionBarProps) {
  return (
    <div className="sticky bottom-0 border-t border-border bg-card p-4 shadow-lg">
      <div className="container mx-auto max-w-4xl flex items-center justify-between">
        {/* Autosave Indicator */}
        <AutosaveIndicator state={autosaveState} />

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={autosaveState.status === "saving"}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            aria-label="Save draft application"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            title={!canSubmit ? "Please fix validation errors before submitting" : ""}
            aria-label="Submit application for review"
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
