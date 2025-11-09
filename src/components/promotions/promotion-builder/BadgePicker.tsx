import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { BadgeApplicationListItemDto } from "@/types";

interface Props {
  onAdd: (badgeApplicationIds: string[]) => Promise<void>;
  isAdding?: boolean;
}

export function BadgePicker({ onAdd, isAdding }: Props) {
  const [available, setAvailable] = useState<BadgeApplicationListItemDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/badge-applications?status=accepted&limit=100");
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Failed to load badges" }));
          throw new Error(err.message || "Failed to load badges");
        }
        const data = await res.json();
        setAvailable(data.data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load badges";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailable();
  }, []);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      toast.info("Select at least one badge to add");
      return;
    }
    await onAdd(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading available badges…</p>
      ) : available.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accepted badges available.</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {available.map((b) => (
            <li key={b.id} className="flex items-center gap-3 p-2 rounded-md border">
              <input type="checkbox" checked={selectedIds.includes(b.id)} onChange={() => toggle(b.id)} />
              <div className="flex-1">
                <div className="font-medium">{b.catalog_badge.title}</div>
                <div className="text-xs text-muted-foreground">
                  {b.catalog_badge.category} • {b.catalog_badge.level}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{b.date_of_fulfillment || b.date_of_application}</div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={isAdding || selectedIds.length === 0}>
          {isAdding ? "Adding…" : `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
        </Button>
        <Button variant="outline" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
          Clear
        </Button>
      </div>
    </div>
  );
}


