import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "../FilterBar";
import type { AdminReviewFilters } from "@/types";

describe("FilterBar", () => {
  const mockFilters: AdminReviewFilters = {
    status: "submitted",
    sort: "submitted_at",
    order: "desc",
    limit: 20,
    offset: 0,
  };

  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render status tabs", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={false} />
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("should render sort controls", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={false} />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Newest")).toBeInTheDocument();
  });

  it("should render result count", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={15} hasActiveFilters={false} />
    );

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText(/applications/)).toBeInTheDocument();
  });

  it("should call onFilterChange when status tab is clicked", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={false} />
    );

    const acceptedTab = screen.getByText("Accepted");
    fireEvent.click(acceptedTab);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      status: "accepted",
      offset: 0,
    });
  });

  it("should call onFilterChange when sort is changed", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={false} />
    );

    const sortSelect = screen.getByRole("combobox");
    fireEvent.change(sortSelect, { target: { value: "created_at" } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      sort: "created_at",
      offset: 0,
    });
  });

  it("should toggle sort order when order button is clicked", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={false} />
    );

    const orderButton = screen.getByRole("button", { name: /sort/i });
    fireEvent.click(orderButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      order: "asc",
      offset: 0,
    });
  });

  it("should show clear filters button when filters are active", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={true} />
    );

    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("should not show clear filters button when no active filters", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={false} />
    );

    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
  });

  it("should call onFilterChange with reset values when clear filters is clicked", () => {
    render(
      <FilterBar filters={mockFilters} onFilterChange={mockOnFilterChange} resultCount={10} hasActiveFilters={true} />
    );

    const clearButton = screen.getByText("Clear filters");
    fireEvent.click(clearButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      status: "submitted",
      applicant_id: undefined,
      catalog_badge_id: undefined,
      sort: "submitted_at",
      order: "desc",
      offset: 0,
    });
  });

  it("should show active filter badges", () => {
    const filtersWithBadges: AdminReviewFilters = {
      ...mockFilters,
      applicant_id: "user-123",
      catalog_badge_id: "badge-456",
    };

    render(
      <FilterBar
        filters={filtersWithBadges}
        onFilterChange={mockOnFilterChange}
        resultCount={10}
        hasActiveFilters={true}
      />
    );

    expect(screen.getByText(/Applicant:/)).toBeInTheDocument();
    expect(screen.getByText(/Badge:/)).toBeInTheDocument();
  });

  it("should remove individual filter when badge close is clicked", () => {
    const filtersWithBadges: AdminReviewFilters = {
      ...mockFilters,
      applicant_id: "user-123",
    };

    render(
      <FilterBar
        filters={filtersWithBadges}
        onFilterChange={mockOnFilterChange}
        resultCount={10}
        hasActiveFilters={true}
      />
    );

    const closeButtons = screen.getAllByLabelText(/Remove.*filter/);
    fireEvent.click(closeButtons[0]);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      applicant_id: undefined,
      offset: 0,
    });
  });
});
