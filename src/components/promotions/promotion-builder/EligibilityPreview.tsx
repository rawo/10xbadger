import React, { useMemo } from "react";
import type { PromotionTemplateRule, BadgeApplicationWithBadge } from "@/types";

interface Props {
  rules: PromotionTemplateRule[];
  assignedBadges: BadgeApplicationWithBadge[];
}

export function EligibilityPreview({ rules, assignedBadges }: Props) {
  // Build counts from assigned badges keyed by `${category}:${level}` and 'any' category
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    assignedBadges.forEach((ba) => {
      const key = `${ba.catalog_badge.category}:${ba.catalog_badge.level}`;
      map.set(key, (map.get(key) || 0) + 1);
      // also increment any:level
      const anyKey = `any:${ba.catalog_badge.level}`;
      map.set(anyKey, (map.get(anyKey) || 0) + 1);
    });
    return map;
  }, [assignedBadges]);

  const results = useMemo(() => {
    return rules.map((r) => {
      const key = `${r.category}:${r.level}`;
      const satisfied = (counts.get(key) || 0) >= r.count;
      const current = counts.get(key) || 0;
      return { rule: r, current, satisfied };
    });
  }, [rules, counts]);

  const isValid = results.every((r) => r.satisfied);

  return (
    <div className="space-y-3">
      <div className="text-sm mb-2">
        <span className="font-medium">Overall:</span>{" "}
        <span className={isValid ? "text-success" : "text-warning"}>
          {isValid ? "Requirements satisfied" : "Missing badges"}
        </span>
      </div>
      <ul className="space-y-2 text-sm">
        {results.map((res, idx) => (
          <li key={idx} className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {res.rule.count}× {res.rule.category === "any" ? "Any" : res.rule.category} • {res.rule.level}
              </div>
              <div className="text-xs text-muted-foreground">
                {res.current} / {res.rule.count} collected
              </div>
            </div>
            <div className="text-sm">{res.satisfied ? "✓" : "—"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}


