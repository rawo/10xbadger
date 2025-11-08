/**
 * BadgeActions Component
 *
 * Displays action buttons for the badge:
 * - Apply (all users, when badge is active)
 * - Edit (admin only)
 * - Deactivate (admin only, when badge is active)
 *
 * Actions are displayed in a sticky card on desktop.
 */

import { Edit, Ban, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BadgeActionsProps {
  active: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  isAdmin: boolean;
}

export function BadgeActions(props: BadgeActionsProps) {
  const { active, onApply, onEdit, onDeactivate, isAdmin } = props;

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Apply button - visible to all users */}
        <Button
          onClick={onApply}
          disabled={!active}
          size="lg"
          className="w-full"
          aria-label={active ? "Apply for this badge" : "Badge is inactive and cannot be applied for"}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {active ? "Apply for Badge" : "Unavailable"}
        </Button>

        {active && (
          <p className="text-xs text-muted-foreground">Click to start a new badge application for this badge</p>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <>
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Admin Actions</p>

              {/* Edit button */}
              <Button onClick={onEdit} variant="outline" size="default" className="w-full mb-2">
                <Edit className="h-4 w-4 mr-2" />
                Edit Badge
              </Button>

              {/* Deactivate button */}
              {active ? (
                <Button
                  onClick={onDeactivate}
                  variant="destructive"
                  size="default"
                  className="w-full"
                  aria-label="Deactivate this badge"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Deactivate Badge
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground italic p-2 text-center bg-muted rounded">
                  Badge is inactive
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Deactivating prevents new applications but preserves existing ones
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
