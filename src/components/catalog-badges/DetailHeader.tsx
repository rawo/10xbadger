/**
 * DetailHeader Component
 *
 * Displays the badge detail page header with:
 * - Back link to catalog
 * - Badge title
 * - Active/Inactive status pill
 * - Primary Apply button
 */

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DetailHeaderProps {
  title: string;
  active: boolean;
  badgeId: string;
  onApply?: () => void;
}

export function DetailHeader(props: DetailHeaderProps) {
  const { title, active, badgeId, onApply } = props;

  const handleApply = () => {
    if (onApply) {
      onApply();
    } else {
      window.location.href = `/apply/new?catalog_badge_id=${badgeId}`;
    }
  };

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-4 py-6">
        {/* Back link */}
        <a
          href="/catalog"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </a>

        {/* Title and status row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Badge variant={active ? "default" : "secondary"} className="w-fit">
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Apply button */}
          <Button
            onClick={handleApply}
            disabled={!active}
            size="lg"
            className="w-full sm:w-auto"
            aria-label={active ? "Apply for this badge" : "Badge is inactive and cannot be applied for"}
          >
            {active ? "Apply for Badge" : "Unavailable"}
          </Button>
        </div>
      </div>
    </div>
  );
}
