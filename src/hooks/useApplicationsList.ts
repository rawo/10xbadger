import { useState, useEffect, useCallback } from "react";
import type {
  ApplicationListFilters,
  BadgeApplicationListItemDto,
  PaginatedResponse,
  PaginationMetadata,
  ApiError,
} from "@/types";
import { toast } from "sonner";

/**
 * Props for useApplicationsList hook
 */
interface UseApplicationsListProps {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  userId: string;
  isAdmin: boolean;
}

/**
 * Return type for useApplicationsList hook
 */
interface UseApplicationsListReturn {
  applications: BadgeApplicationListItemDto[];
  pagination: PaginationMetadata;
  filters: ApplicationListFilters;
  isLoading: boolean;
  error: string | null;

  updateFilters: (filters: Partial<ApplicationListFilters>) => void;
  goToPage: (offset: number) => void;
  refetch: () => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
}

/**
 * Custom hook for managing applications list state, filtering, pagination, and API calls
 *
 * Handles:
 * - Filter state management with URL synchronization
 * - Pagination state
 * - API calls for fetching and deleting applications
 * - Loading and error states
 *
 * @param props - Hook props including initial data and user info
 * @returns Hook interface with state and actions
 */
export function useApplicationsList(props: UseApplicationsListProps): UseApplicationsListReturn {
  const { initialData } = props;

  // =========================================================================
  // State Variables
  // =========================================================================

  const [applications, setApplications] = useState<BadgeApplicationListItemDto[]>(initialData.data);

  const [pagination, setPagination] = useState<PaginationMetadata>(initialData.pagination);

  const [filters, setFilters] = useState<ApplicationListFilters>(() => {
    // Initialize from URL on mount
    if (typeof window === "undefined") {
      return {
        sort: "created_at",
        order: "desc",
        limit: 20,
        offset: 0,
      };
    }

    const urlParams = new URLSearchParams(window.location.search);
    return {
      status: (urlParams.get("status") as ApplicationListFilters["status"]) || undefined,
      catalog_badge_id: urlParams.get("catalog_badge_id") || undefined,
      sort: (urlParams.get("sort") as ApplicationListFilters["sort"]) || "created_at",
      order: (urlParams.get("order") as ApplicationListFilters["order"]) || "desc",
      limit: parseInt(urlParams.get("limit") || "20", 10),
      offset: parseInt(urlParams.get("offset") || "0", 10),
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // URL Synchronization
  // =========================================================================

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.catalog_badge_id) params.set("catalog_badge_id", filters.catalog_badge_id);
    params.set("sort", filters.sort);
    params.set("order", filters.order);
    params.set("limit", filters.limit.toString());
    params.set("offset", filters.offset.toString());

    const newUrl = `/applications?${params.toString()}`;
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
      if (filters.catalog_badge_id) params.set("catalog_badge_id", filters.catalog_badge_id);
      params.set("sort", filters.sort);
      params.set("order", filters.order);
      params.set("limit", filters.limit.toString());
      params.set("offset", filters.offset.toString());

      const response = await fetch(`/api/badge-applications?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
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

  // =========================================================================
  // Filter and Pagination Actions
  // =========================================================================

  /**
   * Updates filters and resets to first page
   */
  const updateFilters = useCallback((newFilters: Partial<ApplicationListFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Reset to first page when filters change (unless offset is explicitly provided)
      offset: newFilters.offset !== undefined ? newFilters.offset : 0,
    }));
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
   * Deletes an application by ID
   */
  const deleteApplication = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/badge-applications/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }

          const errorData: ApiError = await response.json();
          throw new Error(errorData.message || "Failed to delete application");
        }

        toast.success("Application deleted successfully");

        // If we deleted the last item on the page and we're not on page 1, go to previous page
        if (applications.length === 1 && filters.offset > 0) {
          updateFilters({ offset: Math.max(0, filters.offset - filters.limit) });
        } else {
          // Otherwise just refetch current page
          await refetch();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete application";

        toast.error("Error deleting application", {
          description: errorMessage,
        });
      }
    },
    [applications.length, filters.offset, filters.limit, refetch, updateFilters]
  );

  // =========================================================================
  // Refetch on Filter Changes
  // =========================================================================

  useEffect(() => {
    // Skip the initial mount since we already have initialData
    // Only refetch when filters actually change
    const isInitialState =
      filters.offset === initialData.pagination.offset &&
      filters.limit === initialData.pagination.limit &&
      !filters.status &&
      !filters.catalog_badge_id &&
      filters.sort === "created_at" &&
      filters.order === "desc";

    if (!isInitialState) {
      refetch();
    }
  }, [filters, refetch, initialData.pagination.offset, initialData.pagination.limit]);

  // =========================================================================
  // Return Hook Interface
  // =========================================================================

  return {
    applications,
    pagination,
    filters,
    isLoading,
    error,

    updateFilters,
    goToPage,
    refetch,
    deleteApplication,
  };
}
