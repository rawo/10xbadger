import React from "react";
import type { DashboardViewProps } from "@/types";
import { useDashboardData } from "@/hooks/useDashboardData";
import { StatisticsGrid } from "./StatisticsGrid";
import { QuickActions } from "./QuickActions";
import { BadgeApplicationsOverview } from "./BadgeApplicationsOverview";
import { PromotionsOverview } from "./PromotionsOverview";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { toast } from "sonner";

/**
 * DashboardView Component
 *
 * Main client-side interactive container for the dashboard.
 * Manages dashboard state and coordinates child components.
 *
 * Features:
 * - Displays statistics grid with key metrics
 * - Shows badge applications organized by status
 * - Lists promotions with status indicators
 * - Provides quick action buttons
 * - Handles data refresh and error states
 */
export function DashboardView({ initialData, userId }: DashboardViewProps) {
  const { data, isRefreshing, error, refetch } = useDashboardData(userId, initialData);

  // Show skeleton during refresh
  if (isRefreshing && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of your badge applications and promotions</p>
        </div>
        <button
          onClick={refetch}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-10 px-4 py-2"
        >
          {isRefreshing ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-destructive mr-2 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content with opacity transition during refresh */}
      <div
        className={
          isRefreshing
            ? "opacity-50 pointer-events-none transition-opacity duration-200"
            : "opacity-100 transition-opacity duration-200"
        }
      >
        {/* Quick Actions */}
        <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <QuickActions />
        </div>

        <div className="mt-6 space-y-6">
          {/* Statistics Grid */}
          <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <StatisticsGrid statistics={data.statistics} />
          </div>

          {/* Badge Applications Overview */}
          <div className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
            <BadgeApplicationsOverview applications={data.badgeApplications} />
          </div>

          {/* Promotions Overview */}
          <div className="animate-in slide-in-from-bottom-4 duration-500 delay-[400ms]">
            <PromotionsOverview promotions={data.promotions} />
          </div>
        </div>
      </div>
    </div>
  );
}
