/**
 * BadgePicker Component
 *
 * Component (inline section) that allows users to search and select accepted
 * badge applications to add to the promotion. Only shows badges with status
 * `accepted` that are not already in the promotion.
 */

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { BadgeApplicationListItemDto, BadgePickerProps } from "@/types";

export function BadgePicker({ userId, existingBadgeIds, onAddBadges, isAdding }: BadgePickerProps) {
  const [available, setAvailable] = useState<BadgeApplicationListItemDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // =========================================================================
  // Fetch Available Badges
  // =========================================================================
  useEffect(() => {
    const fetchAvailable = async () => {
      setIsLoading(true);
      try {
        // Fetch accepted badges for the current user
        const res = await fetch(`/api/badge-applications?status=accepted&limit=100`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Failed to load badges" }));
          throw new Error(err.message || "Failed to load badges");
        }
        const data = await res.json();
        
        // Filter out badges that are already in the promotion
        const availableBadges = (data.data || []).filter(
          (badge: BadgeApplicationListItemDto) => !existingBadgeIds.includes(badge.id)
        );
        
        setAvailable(availableBadges);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load badges";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailable();
  }, [userId, existingBadgeIds]);

  // =========================================================================
  // Filter Badges by Search Query
  // =========================================================================
  const filteredBadges = React.useMemo(() => {
    if (!searchQuery.trim()) return available;
    
    const query = searchQuery.toLowerCase();
    return available.filter((badge) => {
      const title = badge.catalog_badge.title.toLowerCase();
      const category = badge.catalog_badge.category.toLowerCase();
      const level = badge.catalog_badge.level.toLowerCase();
      
      return title.includes(query) || category.includes(query) || level.includes(query);
    });
  }, [available, searchQuery]);

  // =========================================================================
  // Event Handlers
  // =========================================================================
  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      toast.info("Select at least one badge to add");
      return;
    }
    await onAddBadges(selectedIds);
    setSelectedIds([]);
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search badges by title, category, or level..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Badge List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading available badges…</p>
      ) : filteredBadges.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {searchQuery.trim() ? "No badges match your search." : "No accepted badges available."}
        </p>
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-2">
            {filteredBadges.length} badge{filteredBadges.length !== 1 ? "s" : ""} available
          </div>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {filteredBadges.map((b) => (
              <li key={b.id} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(b.id)}
                  onChange={() => toggle(b.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <div className="flex-1">
                  <div className="font-medium">{b.catalog_badge.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.catalog_badge.category} • {b.catalog_badge.level}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.date_of_fulfillment || b.date_of_application}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={isAdding || selectedIds.length === 0}>
          {isAdding ? "Adding…" : `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : "Selected"}`}
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={selectedIds.length === 0}>
          Clear Selection
        </Button>
      </div>

      {/* Selected Count */}
      {selectedIds.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {selectedIds.length} badge{selectedIds.length !== 1 ? "s" : ""} selected
        </div>
      )}
    </div>
  );
}



