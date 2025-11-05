import { useState, useCallback } from "react";
import { toast } from "sonner";
import type {
  DashboardViewModel,
  DashboardStatistics,
  PaginatedResponse,
  BadgeApplicationListItemDto,
  PromotionListItemDto,
} from "@/types";

/**
 * Custom hook for managing dashboard data fetching and state
 *
 * Provides:
 * - Initial data from SSR
 * - Manual refetch functionality
 * - Loading and error states
 * - Parallel API calls for optimal performance
 *
 * @param userId - Current user ID (for future use)
 * @param initialData - Pre-fetched data from server-side rendering
 * @returns Object containing data, loading state, error, and refetch function
 */
export function useDashboardData(userId: string, initialData: DashboardViewModel) {
  const [data, setData] = useState<DashboardViewModel>(initialData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches fresh dashboard data from all endpoints in parallel
   */
  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Fetch all data in parallel for optimal performance
      const [
        draftAppsResponse,
        submittedAppsResponse,
        acceptedAppsResponse,
        rejectedAppsResponse,
        draftPromosResponse,
        submittedPromosResponse,
        approvedPromosResponse,
        rejectedPromosResponse,
      ] = await Promise.all([
        fetch("/api/badge-applications?status=draft&limit=10&sort=created_at&order=desc").then(
          (r) => {
            if (!r.ok) throw new Error(`Failed to fetch draft applications: ${r.status}`);
            return r.json() as Promise<PaginatedResponse<BadgeApplicationListItemDto>>;
          }
        ),
        fetch(
          "/api/badge-applications?status=submitted&limit=10&sort=submitted_at&order=desc"
        ).then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch submitted applications: ${r.status}`);
          return r.json() as Promise<PaginatedResponse<BadgeApplicationListItemDto>>;
        }),
        fetch("/api/badge-applications?status=accepted&limit=10&sort=created_at&order=desc").then(
          (r) => {
            if (!r.ok) throw new Error(`Failed to fetch accepted applications: ${r.status}`);
            return r.json() as Promise<PaginatedResponse<BadgeApplicationListItemDto>>;
          }
        ),
        fetch("/api/badge-applications?status=rejected&limit=10&sort=created_at&order=desc").then(
          (r) => {
            if (!r.ok) throw new Error(`Failed to fetch rejected applications: ${r.status}`);
            return r.json() as Promise<PaginatedResponse<BadgeApplicationListItemDto>>;
          }
        ),
        fetch("/api/promotions?status=draft&limit=10&sort=created_at&order=desc").then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch draft promotions: ${r.status}`);
          return r.json() as Promise<PaginatedResponse<PromotionListItemDto>>;
        }),
        fetch("/api/promotions?status=submitted&limit=10&sort=submitted_at&order=desc").then(
          (r) => {
            if (!r.ok) throw new Error(`Failed to fetch submitted promotions: ${r.status}`);
            return r.json() as Promise<PaginatedResponse<PromotionListItemDto>>;
          }
        ),
        fetch("/api/promotions?status=approved&limit=10&sort=created_at&order=desc").then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch approved promotions: ${r.status}`);
          return r.json() as Promise<PaginatedResponse<PromotionListItemDto>>;
        }),
        fetch("/api/promotions?status=rejected&limit=10&sort=created_at&order=desc").then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch rejected promotions: ${r.status}`);
          return r.json() as Promise<PaginatedResponse<PromotionListItemDto>>;
        }),
      ]);

      // Calculate statistics from pagination totals
      const statistics: DashboardStatistics = {
        draftApplicationsCount: draftAppsResponse.pagination.total,
        submittedApplicationsCount: submittedAppsResponse.pagination.total,
        acceptedBadgesCount: acceptedAppsResponse.pagination.total,
        rejectedApplicationsCount: rejectedAppsResponse.pagination.total,
        draftPromotionsCount: draftPromosResponse.pagination.total,
        submittedPromotionsCount: submittedPromosResponse.pagination.total,
        approvedPromotionsCount: approvedPromosResponse.pagination.total,
        rejectedPromotionsCount: rejectedPromosResponse.pagination.total,
      };

      // Transform into DashboardViewModel
      const newData: DashboardViewModel = {
        badgeApplications: {
          draft: draftAppsResponse.data,
          submitted: submittedAppsResponse.data,
          accepted: acceptedAppsResponse.data,
          rejected: rejectedAppsResponse.data,
        },
        promotions: {
          draft: draftPromosResponse.data,
          submitted: submittedPromosResponse.data,
          approved: approvedPromosResponse.data,
          rejected: rejectedPromosResponse.data,
        },
        statistics,
      };

      setData(newData);
      toast.success("Dashboard refreshed successfully");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to refresh dashboard data");
      setError(error);
      console.error("Error refreshing dashboard:", error);
      toast.error("Failed to refresh dashboard", {
        description: error.message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    data,
    isRefreshing,
    error,
    refetch,
  };
}
