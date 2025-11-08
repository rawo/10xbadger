/**
 * CatalogBadgeDetail Component
 *
 * Main container component for the catalog badge detail view.
 * Manages the layout and coordinates all child components.
 */

import { useState } from "react";
import { useCatalogBadge } from "@/hooks/useCatalogBadge";
import { useUser } from "@/hooks/useUser";
import { DetailHeader } from "./DetailHeader";
import { BadgeOverviewCard } from "./BadgeOverviewCard";
import { BadgeMetadata } from "./BadgeMetadata";
import { BadgeRequirementsList } from "./BadgeRequirementsList";
import { BadgeActions } from "./BadgeActions";
import { ConfirmDeactivateModal } from "./ConfirmDeactivateModal";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeFormModal } from "./BadgeFormModal";
import type { CatalogBadgeDto } from "@/types";

interface CatalogBadgeDetailProps {
  badge: CatalogBadgeDto;
  userId: string;
  isAdmin: boolean;
}

export function CatalogBadgeDetail(props: CatalogBadgeDetailProps) {
  const { badge: initialBadge, isAdmin } = props;

  // State management via custom hook
  const { badge, isLoading, error, refresh, deactivate } = useCatalogBadge({
    badgeId: initialBadge.id,
    initialBadge,
  });

  // Determine admin flag: prefer prop if provided, else use client-side auth
  const user = useUser();
  const isAdminFinal = typeof isAdmin !== "undefined" ? isAdmin : user.isAdmin;

  // Local component state
  const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedBadge, setSelectedBadge] = useState<CatalogBadgeDto | undefined>(undefined);

  // Handle apply action
  const handleApply = () => {
    if (badge) {
      window.location.href = `/apply/new?catalog_badge_id=${badge.id}`;
    }
  };

  // Handle edit action (admin only)
  const handleEdit = () => {
    setIsFormModalOpen(true);
    setFormMode("edit");
    setSelectedBadge(badge || undefined);
  };

  // Handle deactivate action (admin only)
  const handleDeactivate = () => {
    setIsConfirmDeactivateOpen(true);
  };

  // Confirm deactivate
  const handleConfirmDeactivate = async (badgeId: string) => {
    try {
      // If badge ids mismatch, refresh to ensure consistency
      if (badge && badge.id !== badgeId) {
        await refresh();
        return;
      }

      await deactivate();
      setIsConfirmDeactivateOpen(false);
    } catch {
      // Error already handled by hook
    }
  };

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Badge</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading && !badge) {
    return <LoadingSkeleton />;
  }

  // Handle no badge state (shouldn't happen but be defensive)
  if (!badge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-muted bg-muted/10 p-6">
          <p className="text-muted-foreground">Badge not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DetailHeader title={badge.title} active={badge.active} badgeId={badge.id} onApply={handleApply} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Card */}
            <BadgeOverviewCard
              title={badge.title}
              description={badge.description}
              category={badge.category}
              level={badge.level}
              iconUrl={badge.icon_url}
            />

            {/* Metadata */}
            <BadgeMetadata
              category={badge.category}
              level={badge.level}
              positionLevels={badge.position_levels}
              tags={badge.tags}
              createdAt={badge.created_at}
              updatedAt={badge.updated_at}
            />

            {/* Requirements */}
            {badge.requirements && badge.requirements.length > 0 && (
              <BadgeRequirementsList requirements={badge.requirements} />
            )}
          </div>

          {/* Right column - Actions */}
          <div className="lg:col-span-1">
            <BadgeActions
              active={badge.active}
              onApply={handleApply}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              isAdmin={isAdminFinal}
            />
          </div>
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      <ConfirmDeactivateModal
        isOpen={isConfirmDeactivateOpen}
        badge={badge}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setIsConfirmDeactivateOpen(false)}
      />
      <BadgeFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        badge={selectedBadge}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedBadge(undefined);
        }}
        onSuccess={async () => {
          await refresh();
          setIsFormModalOpen(false);
          setSelectedBadge(undefined);
        }}
      />
    </div>
  );
}

/**
 * Loading skeleton for badge detail view
 */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
