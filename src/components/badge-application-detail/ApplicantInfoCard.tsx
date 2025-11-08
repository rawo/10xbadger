/**
 * ApplicantInfoCard Component
 *
 * Displays information about the applicant (admin only view).
 * Shows applicant name and email address.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ApplicantInfoCardProps } from "@/types";
import { User, Mail } from "lucide-react";

export function ApplicantInfoCard({ applicant, isVisible }: ApplicantInfoCardProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Applicant Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Applicant Name */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Name
            </div>
            <p className="text-sm text-foreground pl-6">{applicant.display_name}</p>
          </div>

          {/* Applicant Email */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </div>
            <p className="text-sm text-foreground pl-6">{applicant.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
