import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewModal } from "../ReviewModal";
import type { BadgeApplicationListItemDto } from "@/types";

describe("ReviewModal", () => {
  const mockApplication: BadgeApplicationListItemDto = {
    id: "app-1",
    applicant_id: "user-1",
    catalog_badge_id: "badge-1",
    catalog_badge_version: 1,
    date_of_application: "2024-01-15",
    date_of_fulfillment: "2024-01-20",
    reason: "Test reason",
    status: "submitted",
    submitted_at: "2024-01-22T10:00:00Z",
    reviewed_by: null,
    reviewed_at: null,
    review_reason: null,
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2024-01-22T10:00:00Z",
    catalog_badge: {
      id: "badge-1",
      title: "Senior Backend Developer",
      category: "technical",
      level: "gold",
    },
  };

  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Accept Mode", () => {
    it("should render accept modal with correct title", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(screen.getByText("Accept Application")).toBeInTheDocument();
      expect(
        screen.getByText(/This application will be marked as accepted/)
      ).toBeInTheDocument();
    });

    it("should render application summary", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(screen.getByText("Senior Backend Developer")).toBeInTheDocument();
      expect(screen.getByText("technical")).toBeInTheDocument();
      expect(screen.getByText("gold")).toBeInTheDocument();
    });

    it("should show decision note field as optional", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(screen.getByText(/Decision Note.*Optional/)).toBeInTheDocument();
    });

    it("should call onConfirm with note when Accept is clicked", async () => {
      mockOnConfirm.mockResolvedValueOnce(undefined);

      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Provide feedback/);
      fireEvent.change(textarea, { target: { value: "Great work!" } });

      const acceptButton = screen.getByRole("button", { name: "Accept" });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith("app-1", "Great work!");
      });
    });
  });

  describe("Reject Mode", () => {
    it("should render reject modal with correct title", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="reject"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(screen.getByText("Reject Application")).toBeInTheDocument();
      expect(
        screen.getByText(/This application will be rejected/)
      ).toBeInTheDocument();
    });

    it("should show decision note field as recommended", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="reject"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(screen.getByText(/Decision Note.*Recommended/)).toBeInTheDocument();
    });

    it("should call onConfirm when Reject is clicked", async () => {
      mockOnConfirm.mockResolvedValueOnce(undefined);

      render(
        <ReviewModal
          isOpen={true}
          mode="reject"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Explain why/);
      fireEvent.change(textarea, { target: { value: "Needs more detail" } });

      const rejectButton = screen.getByRole("button", { name: "Reject" });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith("app-1", "Needs more detail");
      });
    });
  });

  describe("Common Behavior", () => {
    it("should call onCancel when Cancel is clicked", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("should show character counter", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(screen.getByText("2000 characters remaining")).toBeInTheDocument();
    });

    it("should update character counter as user types", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Hello" } });

      expect(screen.getByText("1995 characters remaining")).toBeInTheDocument();
    });

    it("should disable buttons when processing", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={true}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /Processing/ });
      const cancelButton = screen.getByRole("button", { name: "Cancel" });

      expect(acceptButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it("should enforce max length of 2000 characters", () => {
      render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("maxLength", "2000");
    });

    it("should not render when application is null", () => {
      const { container } = render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should reset note when modal closes", async () => {
      const { rerender } = render(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Test note" } });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      rerender(
        <ReviewModal
          isOpen={true}
          mode="accept"
          application={mockApplication}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isProcessing={false}
        />
      );

      const newTextarea = screen.getByRole("textbox");
      expect(newTextarea).toHaveValue("");
    });
  });
});

