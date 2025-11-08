import React from "react";
import { StatCard } from "./StatCard";
import type { DashboardStatistics } from "@/types";
import { cn } from "@/lib/utils";

/**
 * StatisticsGrid Component
 *
 * Grid layout displaying key dashboard statistics as clickable cards.
 * Each card links to a filtered view of the relevant data.
 *
 * Features:
 * - Responsive grid (2x2 on mobile, 4 columns on desktop)
 * - Links to filtered list views
 * - Consistent spacing and alignment
 * - Accessible navigation
 *
 * @param statistics - Aggregated counts for all dashboard statistics
 * @param className - Additional CSS classes
 */
interface StatisticsGridProps {
  statistics: DashboardStatistics;
  className?: string;
}

export function StatisticsGrid({ statistics, className }: StatisticsGridProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {/* Draft Applications Card */}
      <StatCard
        label="Draft Applications"
        value={statistics.draftApplicationsCount}
        link="/applications?status=draft"
        variant="default"
        icon={
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        }
      />

      {/* Submitted Applications Card */}
      <StatCard
        label="Submitted"
        value={statistics.submittedApplicationsCount}
        link="/applications?status=submitted"
        variant="warning"
        icon={
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      {/* Accepted Badges Card */}
      <StatCard
        label="Accepted Badges"
        value={statistics.acceptedBadgesCount}
        link="/applications?status=accepted"
        variant="success"
        icon={
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      {/* Draft Promotions Card */}
      <StatCard
        label="Draft Promotions"
        value={statistics.draftPromotionsCount}
        link="/promotions?status=draft"
        variant="default"
        icon={
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />
    </div>
  );
}
