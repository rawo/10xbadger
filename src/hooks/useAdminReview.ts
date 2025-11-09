import { useState, useEffect, useCallback } from "react";
import type {
  AdminReviewFilters,
  AdminReviewMetrics,
  BadgeApplicationListItemDto,
  PaginatedResponse,
  PaginationMetadata,
  ApiError,
} from "@/types";
import { toast } from "sonner";

/**
 * Props for useAdminReview hook
 */
interface UseAdminReviewProps {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  initialMetrics: AdminReviewMetrics;
  adminUserId: string;
}

/**
 * Return type for useAdminReview hook
 */
interface UseAdminReviewReturn {
  // Data state
  applications: BadgeApplicationListItemDto[];
  pagination: PaginationMetadata;
  metrics: AdminReviewMetrics;
  filters: AdminReviewFilters;

  // Loading states
  isLoading: boolean;
  isProcessing: boolean; // for accept/reject actions
  processingId: string | null; // ID of application being processed

  // Error state
  error: string | null;

  // Filter actions
  updateFilters: (filters: Partial<AdminReviewFilters>) => void;
  resetFilters: () => void;

  // Pagination actions
  goToPage: (offset: number) => void;
  changePageSize: (limit: number) => void;

  // Review actions
  acceptApplication: (id: string, decisionNote?: string) => Promise<void>;
  rejectApplication: (id: string, decisionNote?: string) => Promise<void>;

  // Data actions
  refetch: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

/**
 * Default filters for admin review queue
 */
const DEFAULT_FILTERS: AdminReviewFilters = {
  status: "submitted", // Show pending reviews by default
  sort: "submitted_at",
  order: "desc",
  limit: 20,
  offset: 0,
};

/**
 * Custom hook for managing admin review queue state, filtering, pagination, and API calls
 *
 * Handles:
 * - Filter state management with URL synchronization
 * - Pagination state
 * - Review metrics tracking
 * - API calls for fetching, accepting, and rejecting applications
 * - Loading and error states
 * - Optimistic UI updates
 *
 * @param props - Hook props including initial data, metrics, and admin user ID
 * @returns Hook interface with state and actions
 */
export function useAdminReview(props: UseAdminReviewProps): UseAdminReviewReturn {
  const { initialData, initialMetrics, adminUserId } = props;

  // =========================================================================
  // State Variables
  // =========================================================================

  const [applications, setApplications] = useState<BadgeApplicationListItemDto[]>(initialData.data);

  const [pagination, setPagination] = useState<PaginationMetadata>(initialData.pagination);

  const [metrics, setMetrics] = useState<AdminReviewMetrics>(initialMetrics);

  const [filters, setFilters] = useState<AdminReviewFilters>(() => {
    // Initialize from URL on mount
    if (typeof window === "undefined") {
      return DEFAULT_FILTERS;
    }

    const urlParams = new URLSearchParams(window.location.search);
    return {
      status: (urlParams.get("status") as AdminReviewFilters["status"]) || "submitted",
      applicant_id: urlParams.get("applicant_id") || undefined,
      catalog_badge_id: urlParams.get("catalog_badge_id") || undefined,
      sort: (urlParams.get("sort") as AdminReviewFilters["sort"]) || "submitted_at",
      order: (urlParams.get("order") as AdminReviewFilters["order"]) || "desc",
      limit: parseInt(urlParams.get("limit") || "20", 10),
      offset: parseInt(urlParams.get("offset") || "0", 10),
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // URL Synchronization
  // =========================================================================

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.applicant_id) params.set("applicant_id", filters.applicant_id);
    if (filters.catalog_badge_id) params.set("catalog_badge_id", filters.catalog_badge_id);
    params.set("sort", filters.sort);
    params.set("order", filters.order);
    params.set("limit", filters.limit.toString());
    params.set("offset", filters.offset.toString());

    const newUrl = `/admin/review?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [filters]);

  // =========================================================================
  // API Functions
  // =========================================================================

  /**
   * Fetches applications from API with current filters
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.applicant_id) params.set("applicant_id", filters.applicant_id);
      if (filters.catalog_badge_id) params.set("catalog_badge_id", filters.catalog_badge_id);
      params.set("sort", filters.sort);
      params.set("order", filters.order);
      params.set("limit", filters.limit.toString());
      params.set("offset", filters.offset.toString());

      const response = await fetch(`/api/badge-applications?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login?return=/admin/review";
          return;
        }

        if (response.status === 403) {
          setError("You do not have permission to access this page");
          toast.error("Access Denied", {
            description: "Admin privileges required",
          });
          return;
        }

        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to fetch applications");
      }

      const data: PaginatedResponse<BadgeApplicationListItemDto> = await response.json();

      setApplications(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);

      toast.error("Error loading applications", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Refreshes review metrics
   */
  const refreshMetrics = useCallback(async () => {
    try {
      // For MVP, we'll recalculate metrics by fetching different status counts
      // In production, this should be a dedicated endpoint for efficiency
      const [pendingRes, acceptedRes, rejectedRes] = await Promise.all([
        fetch(`/api/badge-applications?status=submitted&limit=1`),
        fetch(`/api/badge-applications?status=accepted&limit=1`),
        fetch(`/api/badge-applications?status=rejected&limit=1`),
      ]);

      if (pendingRes.ok && acceptedRes.ok && rejectedRes.ok) {
        const [pending, accepted, rejected] = await Promise.all([
          pendingRes.json(),
          acceptedRes.json(),
          rejectedRes.json(),
        ]);

        setMetrics({
          pendingCount: pending.pagination.total || 0,
          acceptedTodayCount: 0, // TODO: Implement date-based filtering
          rejectedTodayCount: 0, // TODO: Implement date-based filtering
          totalSubmittedCount: pending.pagination.total || 0,
          totalReviewedCount: (accepted.pagination.total || 0) + (rejected.pagination.total || 0),
        });
      }
    } catch (err) {
      // Silently fail metrics refresh - not critical
      console.error("Failed to refresh metrics:", err);
    }
  }, []);

  /**
   * Accepts a badge application
   */
  const acceptApplication = useCallback(
    async (id: string, decisionNote?: string) => {
      setIsProcessing(true);
      setProcessingId(id);
      setError(null);

      try {
        const response = await fetch(`/api/badge-applications/${id}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decisionNote: decisionNote || undefined,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login?return=/admin/review";
            return;
          }

          if (response.status === 403) {
            throw new Error("You do not have permission to accept applications");
          }

          if (response.status === 404) {
            throw new Error("Application not found");
          }

          if (response.status === 409) {
            throw new Error("Application cannot be accepted in its current state");
          }

          const errorData: ApiError = await response.json();
          throw new Error(errorData.message || "Failed to accept application");
        }

        toast.success("Application accepted successfully");

        // Refresh data
        await Promise.all([refetch(), refreshMetrics()]);

        // If we're on the last item of a page (and not the first page), go to previous page
        if (applications.length === 1 && filters.offset > 0) {
          updateFilters({ offset: Math.max(0, filters.offset - filters.limit) });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to accept application";
        setError(errorMessage);

        toast.error("Error accepting application", {
          description: errorMessage,
        });

        throw err; // Re-throw to allow modal to handle
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [applications.length, filters.offset, filters.limit, refetch, refreshMetrics]
  );

  /**
   * Rejects a badge application
   */
  const rejectApplication = useCallback(
    async (id: string, decisionNote?: string) => {
      setIsProcessing(true);
      setProcessingId(id);
      setError(null);

      try {
        const response = await fetch(`/api/badge-applications/${id}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decisionNote: decisionNote || undefined,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login?return=/admin/review";
            return;
          }

          if (response.status === 403) {
            throw new Error("You do not have permission to reject applications");
          }

          if (response.status === 404) {
            throw new Error("Application not found");
          }

          if (response.status === 409) {
            throw new Error("Application cannot be rejected in its current state");
          }

          const errorData: ApiError = await response.json();
          throw new Error(errorData.message || "Failed to reject application");
        }

        toast.success("Application rejected");

        // Refresh data
        await Promise.all([refetch(), refreshMetrics()]);

        // If we're on the last item of a page (and not the first page), go to previous page
        if (applications.length === 1 && filters.offset > 0) {
          updateFilters({ offset: Math.max(0, filters.offset - filters.limit) });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to reject application";
        setError(errorMessage);

        toast.error("Error rejecting application", {
          description: errorMessage,
        });

        throw err; // Re-throw to allow modal to handle
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [applications.length, filters.offset, filters.limit, refetch, refreshMetrics]
  );

  // =========================================================================
  // Filter and Pagination Actions
  // =========================================================================

  /**
   * Updates filters and resets to first page (unless offset is explicitly provided)
   */
  const updateFilters = useCallback((newFilters: Partial<AdminReviewFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Reset to first page when filters change (unless offset is explicitly provided)
      offset: newFilters.offset !== undefined ? newFilters.offset : 0,
    }));
  }, []);

  /**
   * Resets filters to defaults
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Changes to a specific page by offset
   */
  const goToPage = useCallback((offset: number) => {
    setFilters((prev) => ({
      ...prev,
      offset,
    }));
  }, []);

  /**
   * Changes the page size and resets to first page
   */
  const changePageSize = useCallback((limit: number) => {
    setFilters((prev) => ({
      ...prev,
      limit,
      offset: 0,
    }));
  }, []);

  // =========================================================================
  // Refetch on Filter Changes
  // =========================================================================

  useEffect(() => {
    // Skip the initial mount since we already have initialData
    // Only refetch when filters actually change
    const isInitialState =
      filters.offset === initialData.pagination.offset &&
      filters.limit === initialData.pagination.limit &&
      filters.status === "submitted" &&
      !filters.applicant_id &&
      !filters.catalog_badge_id &&
      filters.sort === "submitted_at" &&
      filters.order === "desc";

    if (!isInitialState) {
      refetch();
    }
  }, [filters, refetch, initialData.pagination.offset, initialData.pagination.limit]);

  // =========================================================================
  // Return Hook Interface
  // =========================================================================

  return {
    // Data state
    applications,
    pagination,
    metrics,
    filters,

    // Loading states
    isLoading,
    isProcessing,
    processingId,

    // Error state
    error,

    // Filter actions
    updateFilters,
    resetFilters,

    // Pagination actions
    goToPage,
    changePageSize,

    // Review actions
    acceptApplication,
    rejectApplication,

    // Data actions
    refetch,
    refreshMetrics,
  };
}

