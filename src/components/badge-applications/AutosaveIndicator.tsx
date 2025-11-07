/**
 * AutosaveIndicator Component
 *
 * Visual indicator showing autosave status (idle, saving, saved, error)
 */

import type { AutosaveIndicatorProps } from "@/types";

export function AutosaveIndicator({ state }: AutosaveIndicatorProps) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
      {state.status === "saving" && (
        <>
          <svg
            className="h-4 w-4 animate-spin text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {state.status === "saved" && (
        <>
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-muted-foreground">
            Saved
            {state.lastSavedAt && (
              <span className="ml-1">
                {new Date(state.lastSavedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </span>
        </>
      )}
      {state.status === "error" && (
        <>
          <svg
            className="h-4 w-4 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-destructive">{state.error || "Failed to save"}</span>
        </>
      )}
    </div>
  );
}
