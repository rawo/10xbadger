import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminReview } from "../useAdminReview";
import type { PaginatedResponse, BadgeApplicationListItemDto, AdminReviewMetrics } from "@/types";

// Mock fetch globally
global.fetch = vi.fn();

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useAdminReview", () => {
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
      title: "Test Badge",
      category: "technical",
      level: "gold",
    },
  };

  const mockInitialData: PaginatedResponse<BadgeApplicationListItemDto> = {
    data: [mockApplication],
    pagination: {
      total: 1,
      limit: 20,
      offset: 0,
      has_more: false,
    },
  };

  const mockInitialMetrics: AdminReviewMetrics = {
    pendingCount: 1,
    acceptedTodayCount: 0,
    rejectedTodayCount: 0,
    totalSubmittedCount: 1,
    totalReviewedCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.history for URL synchronization
    Object.defineProperty(window, "history", {
      writable: true,
      value: {
        replaceState: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with provided data", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      expect(result.current.applications).toEqual(mockInitialData.data);
      expect(result.current.pagination).toEqual(mockInitialData.pagination);
      expect(result.current.metrics).toEqual(mockInitialMetrics);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should initialize with default filters", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      expect(result.current.filters).toEqual({
        status: "submitted",
        sort: "submitted_at",
        order: "desc",
        limit: 20,
        offset: 0,
      });
    });
  });

  describe("Filter Updates", () => {
    it("should update filters and reset offset to 0", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      result.current.updateFilters({ status: "accepted" });

      expect(result.current.filters.status).toBe("accepted");
      expect(result.current.filters.offset).toBe(0);
    });

    it("should reset filters to defaults", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      result.current.updateFilters({ status: "accepted", sort: "created_at" });
      result.current.resetFilters();

      expect(result.current.filters).toEqual({
        status: "submitted",
        sort: "submitted_at",
        order: "desc",
        limit: 20,
        offset: 0,
      });
    });

    it("should synchronize filters with URL", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      result.current.updateFilters({ status: "accepted" });

      expect(window.history.replaceState).toHaveBeenCalled();
    });
  });

  describe("Pagination", () => {
    it("should change page offset", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      result.current.goToPage(20);

      expect(result.current.filters.offset).toBe(20);
    });

    it("should change page size and reset offset", () => {
      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      result.current.changePageSize(50);

      expect(result.current.filters.limit).toBe(50);
      expect(result.current.filters.offset).toBe(0);
    });
  });

  describe("Accept Application", () => {
    it("should call accept API and refetch data", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockApplication, status: "accepted" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInitialData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pagination: { total: 0 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pagination: { total: 1 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pagination: { total: 0 } }),
        });

      global.fetch = mockFetch;

      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      await result.current.acceptApplication("app-1", "Good work!");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/badge-applications/app-1/accept",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionNote: "Good work!" }),
        })
      );
    });

    it("should handle accept errors", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: "Invalid status transition" }),
      });

      global.fetch = mockFetch;

      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      await expect(result.current.acceptApplication("app-1")).rejects.toThrow();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe("Reject Application", () => {
    it("should call reject API and refetch data", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockApplication, status: "rejected" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInitialData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pagination: { total: 0 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pagination: { total: 0 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pagination: { total: 1 } }),
        });

      global.fetch = mockFetch;

      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      await result.current.rejectApplication("app-1", "Needs more detail");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/badge-applications/app-1/reject",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionNote: "Needs more detail" }),
        })
      );
    });
  });

  describe("Processing State", () => {
    it("should set processing state during accept", async () => {
      const mockFetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockApplication,
                }),
              100
            )
          )
      );

      global.fetch = mockFetch;

      const { result } = renderHook(() =>
        useAdminReview({
          initialData: mockInitialData,
          initialMetrics: mockInitialMetrics,
          adminUserId: "admin-1",
        })
      );

      const acceptPromise = result.current.acceptApplication("app-1");

      // Should be processing immediately
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
        expect(result.current.processingId).toBe("app-1");
      });

      await acceptPromise;
    });
  });
});

