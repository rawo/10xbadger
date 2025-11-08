/**
 * Custom hook for managing catalog badges state and operations
 *
 * Handles:
 * - Badge list state management
 * - Filtering, sorting, and pagination
 * - URL synchronization
 * - CRUD operations (create, update, deactivate)
 * - API calls and error handling
 */

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type {
  CatalogBadgeListItemDto,
  CatalogBadgeFilters,
  PaginatedResponse,
  PaginationMetadata,
  CreateCatalogBadgeCommand,
  UpdateCatalogBadgeCommand,
  CatalogBadgeDto,
  ApiError,
} from "@/types";

interface UseCatalogBadgesProps {
  initialData: PaginatedResponse<CatalogBadgeListItemDto>;
  isAdmin: boolean;
}

interface UseCatalogBadgesReturn {
  badges: CatalogBadgeListItemDto[];
  pagination: PaginationMetadata;
  filters: CatalogBadgeFilters;
  isLoading: boolean;
  error: string | null;

  updateFilters: (filters: Partial<CatalogBadgeFilters>) => void;
  goToPage: (offset: number) => void;
  refetch: () => Promise<void>;
  createBadge: (data: CreateCatalogBadgeCommand) => Promise<void>;
  updateBadge: (id: string, data: UpdateCatalogBadgeCommand) => Promise<void>;
  deactivateBadge: (id: string) => Promise<void>;
}

export function useCatalogBadges(props: UseCatalogBadgesProps): UseCatalogBadgesReturn {
  const { initialData, isAdmin } = props;

  const [badges, setBadges] = useState<CatalogBadgeListItemDto[]>(initialData.data);
  const [pagination, setPagination] = useState<PaginationMetadata>(initialData.pagination);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL on mount
  const [filters, setFilters] = useState<CatalogBadgeFilters>(() => {
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
      category: (urlParams.get("category") as CatalogBadgeFilters["category"]) || undefined,
      level: (urlParams.get("level") as CatalogBadgeFilters["level"]) || undefined,
      status: (urlParams.get("status") as CatalogBadgeFilters["status"]) || undefined,
      search: urlParams.get("q") || undefined,
      sort: (urlParams.get("sort") as CatalogBadgeFilters["sort"]) || "created_at",
      order: (urlParams.get("order") as CatalogBadgeFilters["order"]) || "desc",
      limit: parseInt(urlParams.get("limit") || "20", 10),
      offset: parseInt(urlParams.get("offset") || "0", 10),
    };
  });

  /**
   * Fetch badges from API with current filters
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.level) params.set("level", filters.level);
      if (filters.status && isAdmin) params.set("status", filters.status);
      if (filters.search) params.set("q", filters.search);
      params.set("sort", filters.sort);
      params.set("order", filters.order);
      params.set("limit", filters.limit.toString());
      params.set("offset", filters.offset.toString());

      const response = await fetch(`/api/catalog-badges?${params.toString()}`);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to load badges");
      }

      const data: PaginatedResponse<CatalogBadgeListItemDto> = await response.json();
      setBadges(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load badges";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isAdmin]);

  /**
   * Update URL query parameters to match current filters
   */
  const updateURL = useCallback((newFilters: CatalogBadgeFilters) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    if (newFilters.category) params.set("category", newFilters.category);
    if (newFilters.level) params.set("level", newFilters.level);
    if (newFilters.status) params.set("status", newFilters.status);
    if (newFilters.search) params.set("q", newFilters.search);
    if (newFilters.sort !== "created_at") params.set("sort", newFilters.sort);
    if (newFilters.order !== "desc") params.set("order", newFilters.order);
    if (newFilters.limit !== 20) params.set("limit", newFilters.limit.toString());
    if (newFilters.offset !== 0) params.set("offset", newFilters.offset.toString());

    const newURL = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newURL);
  }, []);

  /**
   * Update filters and refetch data
   * Resets offset to 0 when filters change (return to first page)
   */
  const updateFilters = useCallback(
    (newFilters: Partial<CatalogBadgeFilters>) => {
      const updatedFilters: CatalogBadgeFilters = {
        ...filters,
        ...newFilters,
        // Reset to first page when filters change (except when only offset changes)
        offset: "offset" in newFilters && newFilters.offset !== undefined ? newFilters.offset : 0,
      };

      setFilters(updatedFilters);
      updateURL(updatedFilters);
    },
    [filters, updateURL]
  );

  /**
   * Navigate to a specific page (update offset)
   */
  const goToPage = useCallback(
    (offset: number) => {
      updateFilters({ offset });
    },
    [updateFilters]
  );

  /**
   * Create a new badge (admin only)
   */
  const createBadge = useCallback(
    async (data: CreateCatalogBadgeCommand) => {
      try {
        const response = await fetch("/api/catalog-badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.message || "Failed to create badge");
        }

        const badge: CatalogBadgeDto = await response.json();
        toast.success("Badge created successfully");
        await refetch();
        return badge;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create badge";
        toast.error(message);
        throw err;
      }
    },
    [refetch]
  );

  /**
   * Update an existing badge (admin only)
   */
  const updateBadge = useCallback(
    async (id: string, data: UpdateCatalogBadgeCommand) => {
      try {
        const response = await fetch(`/api/catalog-badges/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.message || "Failed to update badge");
        }

        const badge: CatalogBadgeDto = await response.json();
        toast.success("Badge updated successfully");
        await refetch();
        return badge;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update badge";
        toast.error(message);
        throw err;
      }
    },
    [refetch]
  );

  /**
   * Deactivate a badge (admin only)
   */
  const deactivateBadge = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/catalog-badges/${id}/deactivate`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData: ApiError = await response.json();
          if (response.status === 409) {
            throw new Error("Badge is already inactive");
          }
          throw new Error(errorData.message || "Failed to deactivate badge");
        }

        toast.success("Badge deactivated successfully");
        await refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to deactivate badge";
        toast.error(message);
        throw err;
      }
    },
    [refetch]
  );

  // Refetch when filters change
  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  return {
    badges,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    goToPage,
    refetch,
    createBadge,
    updateBadge,
    deactivateBadge,
  };
}
