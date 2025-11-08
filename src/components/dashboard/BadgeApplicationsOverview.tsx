import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeApplicationItem } from "./BadgeApplicationItem";
import type { BadgeApplicationListItemDto, BadgeApplicationStatusType } from "@/types";
import { BadgeApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * BadgeApplicationsOverview Component
 *
 * Section displaying user's badge applications grouped by status.
 * Uses tabs for status filtering and shows a list of recent applications.
 *
 * Features:
 * - Tabbed interface for status filtering (draft, submitted, accepted, rejected)
 * - List of badge applications for selected status
 * - "View All" link to full list page
 * - Empty state handling for each tab
 * - Responsive layout
 *
 * @param applications - Badge applications grouped by status
 * @param className - Additional CSS classes
 */
interface BadgeApplicationsOverviewProps {
  applications: {
    draft: BadgeApplicationListItemDto[];
    submitted: BadgeApplicationListItemDto[];
    accepted: BadgeApplicationListItemDto[];
    rejected: BadgeApplicationListItemDto[];
  };
  className?: string;
}

export function BadgeApplicationsOverview({ applications, className }: BadgeApplicationsOverviewProps) {
  const [selectedStatus, setSelectedStatus] = useState<BadgeApplicationStatusType>(BadgeApplicationStatus.Draft);

  // Count badges for each status
  const counts = {
    draft: applications.draft.length,
    submitted: applications.submitted.length,
    accepted: applications.accepted.length,
    rejected: applications.rejected.length,
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Badge Applications</CardTitle>
          <a
            href={`/applications${selectedStatus ? `?status=${selectedStatus}` : ""}`}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          >
            View All →
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as BadgeApplicationStatusType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value={BadgeApplicationStatus.Draft} className="text-xs sm:text-sm">
              Draft {counts.draft > 0 && <span className="ml-1">({counts.draft})</span>}
            </TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Submitted} className="text-xs sm:text-sm">
              Submitted {counts.submitted > 0 && <span className="ml-1">({counts.submitted})</span>}
            </TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Accepted} className="text-xs sm:text-sm">
              Accepted {counts.accepted > 0 && <span className="ml-1">({counts.accepted})</span>}
            </TabsTrigger>
            <TabsTrigger value={BadgeApplicationStatus.Rejected} className="text-xs sm:text-sm">
              Rejected {counts.rejected > 0 && <span className="ml-1">({counts.rejected})</span>}
            </TabsTrigger>
          </TabsList>

          {/* Draft Tab Content */}
          <TabsContent value={BadgeApplicationStatus.Draft} className="mt-4">
            {applications.draft.length > 0 ? (
              <div className="space-y-2">
                {applications.draft.map((app) => (
                  <BadgeApplicationItem key={app.id} application={app} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/50"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4 text-sm text-muted-foreground">No draft applications</p>
                <a href="/apply/new" className="mt-2 inline-flex items-center text-sm text-primary hover:underline">
                  Create your first application →
                </a>
              </div>
            )}
          </TabsContent>

          {/* Submitted Tab Content */}
          <TabsContent value={BadgeApplicationStatus.Submitted} className="mt-4">
            {applications.submitted.length > 0 ? (
              <div className="space-y-2">
                {applications.submitted.map((app) => (
                  <BadgeApplicationItem key={app.id} application={app} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/50"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-sm text-muted-foreground">No submitted applications</p>
              </div>
            )}
          </TabsContent>

          {/* Accepted Tab Content */}
          <TabsContent value={BadgeApplicationStatus.Accepted} className="mt-4">
            {applications.accepted.length > 0 ? (
              <div className="space-y-2">
                {applications.accepted.map((app) => (
                  <BadgeApplicationItem key={app.id} application={app} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/50"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-sm text-muted-foreground">No accepted badges yet</p>
              </div>
            )}
          </TabsContent>

          {/* Rejected Tab Content */}
          <TabsContent value={BadgeApplicationStatus.Rejected} className="mt-4">
            {applications.rejected.length > 0 ? (
              <div className="space-y-2">
                {applications.rejected.map((app) => (
                  <BadgeApplicationItem key={app.id} application={app} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/50"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-sm text-muted-foreground">No rejected applications</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
