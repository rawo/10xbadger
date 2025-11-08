/**
 * ApplicationDetailView Component
 *
 * Main orchestration component for the application detail view.
 * Manages state, handles all user actions, and coordinates modal displays.
 */

import { useState } from "react";
import { toast } from "sonner";
import type { ApplicationDetailViewProps, BadgeApplicationDetailDto, ApiError } from "@/types";
import { DetailHeader } from "./DetailHeader";
import { ApplicationInfoCard } from "./ApplicationInfoCard";
import { CatalogBadgeInfoCard } from "./CatalogBadgeInfoCard";
import { ApplicantInfoCard } from "./ApplicantInfoCard";
import { ReviewInfoCard } from "./ReviewInfoCard";
import { ActionBar } from "./ActionBar";
import { ReviewModal } from "./ReviewModal";
import { ConfirmSubmitModal } from "./ConfirmSubmitModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { BadgeApplicationStatus } from "@/types";

export function ApplicationDetailView(props: ApplicationDetailViewProps) {
  const { initialData, userId, isAdmin } = props;

  // =========================================================================
  // State Management
  // =========================================================================
  const [application, setApplication] = useState<BadgeApplicationDetailDto>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"accept" | "reject" | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // =========================================================================
  // Permission Derivation
  // =========================================================================
  const isOwner = application.applicant_id === userId;

  // =========================================================================
  // API Helper Functions
  // =========================================================================

  /**
   * Delete application
   */
  async function deleteApplication() {
    try {
      const response = await fetch(`/api/badge-applications/${application.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message);
      }

      toast.success("Application deleted successfully");
      // Navigate to applications list after short delay
      setTimeout(() => {
        window.location.href = "/applications";
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete application";
      toast.error(message);
      throw err;
    }
  }

  /**
   * Submit application for review
   */
  async function submitApplication() {
    try {
      const response = await fetch(`/api/badge-applications/${application.id}/submit`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message);
      }

      const updated: BadgeApplicationDetailDto = await response.json();
      setApplication(updated);
      toast.success("Application submitted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit application";
      toast.error(message);
      throw err;
    }
  }

  /**
   * Accept application (admin only)
   */
  async function acceptApplication(decisionNote?: string) {
    try {
      const response = await fetch(`/api/badge-applications/${application.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message);
      }

      const updated: BadgeApplicationDetailDto = await response.json();
      setApplication(updated);
      toast.success("Application accepted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to accept application";
      toast.error(message);
      throw err;
    }
  }

  /**
   * Reject application (admin only)
   */
  async function rejectApplication(decisionNote?: string) {
    try {
      const response = await fetch(`/api/badge-applications/${application.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message);
      }

      const updated: BadgeApplicationDetailDto = await response.json();
      setApplication(updated);
      toast.success("Application rejected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reject application";
      toast.error(message);
      throw err;
    }
  }

  // =========================================================================
  // Action Handlers
  // =========================================================================

  const handleEdit = () => {
    window.location.href = `/applications/${application.id}/edit`;
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  const handleAccept = () => {
    setReviewMode("accept");
    setIsReviewModalOpen(true);
  };

  const handleReject = () => {
    setReviewMode("reject");
    setIsReviewModalOpen(true);
  };

  const handleBack = () => {
    window.location.href = "/applications";
  };

  // =========================================================================
  // Modal Handlers
  // =========================================================================

  const handleDeleteConfirm = async () => {
    setIsLoading(true);
    try {
      await deleteApplication();
      setIsDeleteModalOpen(false);
    } catch {
      // Error already handled in deleteApplication
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitConfirm = async () => {
    setIsLoading(true);
    try {
      await submitApplication();
      setIsSubmitModalOpen(false);
    } catch {
      // Error already handled in submitApplication
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewConfirm = async (decisionNote?: string) => {
    setIsLoading(true);
    try {
      if (reviewMode === "accept") {
        await acceptApplication(decisionNote);
      } else if (reviewMode === "reject") {
        await rejectApplication(decisionNote);
      }
      setIsReviewModalOpen(false);
      setReviewMode(null);
    } catch {
      // Error already handled in accept/reject functions
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsDeleteModalOpen(false);
    setIsSubmitModalOpen(false);
    setIsReviewModalOpen(false);
    setReviewMode(null);
  };

  // =========================================================================
  // Render
  // =========================================================================

  // Determine visibility of admin-only sections
  const showApplicantInfo = isAdmin;
  const showReviewInfo =
    (application.status === BadgeApplicationStatus.Accepted ||
      application.status === BadgeApplicationStatus.Rejected) &&
    (application.reviewed_by || application.reviewed_at || application.decision_note);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <DetailHeader
        applicationId={application.id}
        badgeTitle={application.catalog_badge.title}
        status={application.status}
      />

      {/* Two-column grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Primary information (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <ApplicationInfoCard
            dateOfApplication={application.date_of_application}
            dateOfFulfillment={application.date_of_fulfillment}
            reason={application.reason}
            createdAt={application.created_at}
            submittedAt={application.submitted_at}
          />

          <CatalogBadgeInfoCard badge={application.catalog_badge} />
        </div>

        {/* Right column - Metadata (1/3 width on large screens) */}
        <div className="lg:col-span-1 space-y-6">
          <ApplicantInfoCard applicant={application.applicant} isVisible={showApplicantInfo} />

          <ReviewInfoCard
            status={application.status}
            reviewedBy={application.reviewed_by}
            reviewedAt={application.reviewed_at}
            decisionNote={application.decision_note}
            isVisible={showReviewInfo}
          />
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar
        status={application.status}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        onAccept={handleAccept}
        onReject={handleReject}
        onBack={handleBack}
      />

      {/* Modals */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        mode={reviewMode || "accept"}
        applicationTitle={application.catalog_badge.title}
        onConfirm={handleReviewConfirm}
        onCancel={handleModalCancel}
      />

      <ConfirmSubmitModal
        isOpen={isSubmitModalOpen}
        applicationTitle={application.catalog_badge.title}
        onConfirm={handleSubmitConfirm}
        onCancel={handleModalCancel}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        applicationTitle={application.catalog_badge.title}
        onConfirm={handleDeleteConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
