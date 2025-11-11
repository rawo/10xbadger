import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "../PageHeader";
import type { AdminReviewMetrics } from "@/types";

describe("PageHeader", () => {
  const mockMetrics: AdminReviewMetrics = {
    pendingCount: 5,
    acceptedTodayCount: 3,
    rejectedTodayCount: 1,
    totalSubmittedCount: 10,
    totalReviewedCount: 8,
  };

  it("should render title and description", () => {
    render(<PageHeader title="Test Title" metrics={mockMetrics} />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText(/Review and process badge applications/i)).toBeInTheDocument();
  });

  it("should render breadcrumb navigation", () => {
    render(<PageHeader title="Test Title" metrics={mockMetrics} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("should render all metric cards", () => {
    render(<PageHeader title="Test Title" metrics={mockMetrics} />);

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Accepted (All Time)")).toBeInTheDocument();
    expect(screen.getByText("Rejected (All Time)")).toBeInTheDocument();
  });

  it("should show warning when pending count is high", () => {
    const highPendingMetrics: AdminReviewMetrics = {
      ...mockMetrics,
      pendingCount: 15,
    };

    render(<PageHeader title="Test Title" metrics={highPendingMetrics} />);

    expect(screen.getByText("Requires attention")).toBeInTheDocument();
  });

  it("should not show warning when pending count is low", () => {
    render(<PageHeader title="Test Title" metrics={mockMetrics} />);

    expect(screen.queryByText("Requires attention")).not.toBeInTheDocument();
  });

  it("should call onMetricClick when card is clicked", () => {
    const onMetricClick = vi.fn();

    render(<PageHeader title="Test Title" metrics={mockMetrics} onMetricClick={onMetricClick} />);

    const pendingCard = screen.getByText("Pending Review").closest(".cursor-pointer");
    pendingCard?.click();

    expect(onMetricClick).toHaveBeenCalled();
  });

  it("should render with zero metrics", () => {
    const zeroMetrics: AdminReviewMetrics = {
      pendingCount: 0,
      acceptedTodayCount: 0,
      rejectedTodayCount: 0,
      totalSubmittedCount: 0,
      totalReviewedCount: 0,
    };

    render(<PageHeader title="Test Title" metrics={zeroMetrics} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
