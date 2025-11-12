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

    // Check card labels exist
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("Accepted (All Time)")).toBeInTheDocument();
    expect(screen.getByText("Rejected (All Time)")).toBeInTheDocument();

    // Check metric values using more specific queries
    // Pending count should be 5
    const pendingCard = screen.getByText("Pending Review").closest(".card, [class*='card'], div");
    expect(pendingCard).toHaveTextContent("5");

    // Accepted count is calculated as Math.floor(totalReviewedCount * 0.7) = Math.floor(8 * 0.7) = 5
    const acceptedCard = screen.getByText("Accepted (All Time)").closest(".card, [class*='card'], div");
    expect(acceptedCard).toHaveTextContent("5");

    // Rejected count is calculated as Math.ceil(totalReviewedCount * 0.3) = Math.ceil(8 * 0.3) = 3
    const rejectedCard = screen.getByText("Rejected (All Time)").closest(".card, [class*='card'], div");
    expect(rejectedCard).toHaveTextContent("3");
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

    // Verify all metric cards show 0
    const allZeros = screen.getAllByText("0");
    expect(allZeros.length).toBeGreaterThan(0);

    // Or verify specific cards
    const pendingCard = screen.getByText("Pending Review").closest(".card, [class*='card'], div");
    expect(pendingCard).toHaveTextContent("0");
  });
});
