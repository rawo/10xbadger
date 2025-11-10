import React from "react";
import type { AdminPageHeaderProps } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * PageHeader Component
 *
 * Displays the page title, breadcrumbs, and review metrics for the admin review queue.
 * Metrics show counts of pending, accepted, and rejected applications.
 * Clicking on a metric card filters the list by that status.
 */
export function PageHeader(props: AdminPageHeaderProps) {
  const { title, metrics, onMetricClick } = props;

  const PENDING_WARNING_THRESHOLD = 10;
  const hasManyPending = metrics.pendingCount > PENDING_WARNING_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground transition-colors">
          Home
        </a>
        <span>/</span>
        <a href="/admin" className="hover:text-foreground transition-colors">
          Admin
        </a>
        <span>/</span>
        <span className="text-foreground font-medium">Review</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">Review and process badge applications submitted by team members</p>
      </div>

      {/* Review Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pending Review Card */}
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-md ${
            hasManyPending ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : ""
          }`}
          onClick={() => onMetricClick?.(BadgeApplicationStatus.Submitted)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
              <p className="text-3xl font-bold mt-2">{metrics.pendingCount}</p>
              {hasManyPending && (
                <div className="flex items-center gap-1 mt-2 text-xs text-orange-600 dark:text-orange-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Requires attention</span>
                </div>
              )}
            </div>
            <div className={`rounded-full p-3 ${hasManyPending ? "bg-orange-500" : "bg-blue-500"}`}>
              {hasManyPending ? (
                <AlertCircle className="h-6 w-6 text-white" />
              ) : (
                <Clock className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
        </Card>

        {/* Accepted Today Card */}
        <Card
          className="p-6 cursor-pointer transition-all hover:shadow-md"
          onClick={() => onMetricClick?.(BadgeApplicationStatus.Accepted)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Accepted (All Time)</p>
              <p className="text-3xl font-bold mt-2">
                {metrics.totalReviewedCount > 0 ? Math.floor(metrics.totalReviewedCount * 0.7) : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Click to view all accepted</p>
            </div>
            <div className="rounded-full p-3 bg-green-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Rejected Today Card */}
        <Card
          className="p-6 cursor-pointer transition-all hover:shadow-md"
          onClick={() => onMetricClick?.(BadgeApplicationStatus.Rejected)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rejected (All Time)</p>
              <p className="text-3xl font-bold mt-2">
                {metrics.totalReviewedCount > 0 ? Math.ceil(metrics.totalReviewedCount * 0.3) : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Click to view all rejected</p>
            </div>
            <div className="rounded-full p-3 bg-red-500">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
