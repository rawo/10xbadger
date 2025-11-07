/**
 * EditorHeader Component
 *
 * Displays page title, breadcrumbs, and current status badge
 */

import type { EditorHeaderProps } from "@/types";

export function EditorHeader({ mode, status, catalogBadgeTitle }: EditorHeaderProps) {
  return (
    <div className="border-b border-border pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {mode === "create" ? "New Badge Application" : "Edit Badge Application"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === "create"
              ? "Apply for a badge by providing details about your achievement"
              : "Update your draft badge application"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Badge: <span className="font-medium text-foreground">{catalogBadgeTitle}</span>
          </p>
        </div>
        {status && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground capitalize">
              {status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
