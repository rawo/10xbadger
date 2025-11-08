/**
 * CatalogBadgesView Component
 *
 * Main orchestration component for the catalog badges view.
 * Manages state, modals, and coordinates all child components.
 */

import { useState } from "react";
import { useCatalogBadges } from "@/hooks/useCatalogBadges";
import { CatalogPageHeader } from "./CatalogPageHeader";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { BadgeGrid } from "./BadgeGrid";
import { Pagination } from "../badge-applications/Pagination";
import { BadgeFormModal } from "./BadgeFormModal";
import { ConfirmDeactivateModal } from "./ConfirmDeactivateModal";
import type { CatalogBadgesViewProps, CatalogBadgeListItemDto } from "@/types";

export function CatalogBadgesView(props: CatalogBadgesViewProps) {
  const { initialData, isAdmin } = props;

  const { badges, pagination, filters, isLoading, updateFilters, goToPage, refetch } = useCatalogBadges({
    initialData,
    isAdmin,
  });

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedBadge, setSelectedBadge] = useState<CatalogBadgeListItemDto | undefined>(undefined);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [badgeToDeactivate, setBadgeToDeactivate] = useState<CatalogBadgeListItemDto | null>(null);

  /**
   * Handle badge card click - navigate to application form
   */
  const handleBadgeClick = (badgeId: string) => {
    window.location.href = `/apply/new?catalog_badge_id=${badgeId}`;
  };

  /**
   * Handle create badge click - open form modal in create mode
   */
  const handleCreateClick = () => {
    setFormMode("create");
    setSelectedBadge(undefined);
    setIsFormModalOpen(true);
  };

  /**
   * Handle edit badge click - open form modal in edit mode
   */
  const handleEditClick = (badge: CatalogBadgeListItemDto) => {
    setFormMode("edit");
    setSelectedBadge(badge);
    setIsFormModalOpen(true);
  };

  /**
   * Handle deactivate badge click - open confirmation modal
   */
  const handleDeactivateClick = (badgeId: string) => {
    const badge = badges.find((b) => b.id === badgeId);
    if (badge) {
      setBadgeToDeactivate(badge);
      setIsDeactivateModalOpen(true);
    }
  };

  /**
   * Close form modal
   */
  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setSelectedBadge(undefined);
  };

  /**
   * Handle form modal success - refetch and close
   */
  const handleFormModalSuccess = async () => {
    await refetch();
    handleFormModalClose();
  };

  /**
   * Close deactivate modal
   */
  const handleDeactivateModalClose = () => {
    setIsDeactivateModalOpen(false);
    setBadgeToDeactivate(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <CatalogPageHeader title="Badge Catalog" isAdmin={isAdmin} onCreateClick={handleCreateClick} />

      {/* Filter Bar */}
      <CatalogFilterBar
        filters={filters}
        onFilterChange={updateFilters}
        resultCount={pagination.total}
        isAdmin={isAdmin}
      />

      {/* Badge Grid */}
      <BadgeGrid
        badges={badges}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onBadgeClick={handleBadgeClick}
        onEditClick={handleEditClick}
        onDeactivateClick={handleDeactivateClick}
      />

      {/* Pagination */}
      {!isLoading && badges.length > 0 && <Pagination pagination={pagination} onPageChange={goToPage} />}

      {/* Modals */}
      <BadgeFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        badge={selectedBadge}
        onClose={handleFormModalClose}
        onSuccess={handleFormModalSuccess}
      />

      <ConfirmDeactivateModal
        isOpen={isDeactivateModalOpen}
        badge={badgeToDeactivate}
        onConfirm={async () => {
          await refetch();
          handleDeactivateModalClose();
        }}
        onCancel={handleDeactivateModalClose}
      />
    </div>
  );
}
