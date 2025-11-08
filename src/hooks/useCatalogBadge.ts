/**
 * Custom hook for managing a single catalog badge detail view
 *
 * Handles:
 * - Badge detail data fetching
 * - Loading and error states
 * - Deactivate action (admin only)
 * - Data refresh after mutations
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { CatalogBadgeDto, ApiError } from "@/types";

interface UseCatalogBadgeProps {
  badgeId: string;
  initialBadge?: CatalogBadgeDto;
}

interface UseCatalogBadgeReturn {
  badge: CatalogBadgeDto | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deactivate: (reason?: string) => Promise<void>;
}

export function useCatalogBadge(props: UseCatalogBadgeProps): UseCatalogBadgeReturn {
  const { badgeId, initialBadge } = props;

  const [badge, setBadge] = useState<CatalogBadgeDto | null>(initialBadge || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch badge data from API
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/catalog-badges/${badgeId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Badge not found");
        }

        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || "Failed to load badge details");
      }

      const data: CatalogBadgeDto = await response.json();
      setBadge(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load badge details";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [badgeId]);

  /**
   * Deactivate badge (admin only)
   */
  const deactivate = useCallback(
    async (reason?: string) => {
      try {
        const response = await fetch(`/api/catalog-badges/${badgeId}/deactivate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          const errorData: ApiError = await response.json();
          if (response.status === 409) {
            throw new Error("Badge is already inactive");
          }
          throw new Error(errorData.message || "Failed to deactivate badge");
        }

        // Update local state optimistically
        if (badge) {
          setBadge({ ...badge, active: false });
        }

        toast.success("Badge deactivated successfully");
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to deactivate badge";
        toast.error(message);
        throw err;
      }
    },
    [badgeId, badge, refresh]
  );

  return {
    badge,
    isLoading,
    error,
    refresh,
    deactivate,
  };
}
