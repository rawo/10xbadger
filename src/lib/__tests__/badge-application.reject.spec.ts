import { describe, it, expect } from "vitest";
import { BadgeApplicationService } from "../badge-application.service";
import { createMockSupabase } from "./utils/supabase-mock";
import type { SupabaseClient } from "@/db/supabase.client";

describe("BadgeApplicationService.rejectBadgeApplication", () => {
  it("rejects a submitted application successfully", async () => {
    const id = "aaaaaaa1-1111-1111-1111-111111111111";
    const initialRow = {
      id,
      applicant_id: "applicant-1",
      catalog_badge_id: "badge-1",
      catalog_badge_version: 1,
      date_of_application: "2025-01-01",
      status: "submitted",
      submitted_at: new Date().toISOString(),
      // full details to return from getBadgeApplicationById
      catalog_badge: { id: "badge-1", title: "B1", description: "desc", category: "cat", level: "L1", version: 1 },
      applicant: { id: "applicant-1", display_name: "Test User", email: "test@example.com" },
    };

    const mockSupabase = createMockSupabase({ badgeApplications: { [id]: initialRow } });
    const service = new BadgeApplicationService(mockSupabase as unknown as SupabaseClient);

    const result = await service.rejectBadgeApplication(id, "reviewer-1", "Doesn't meet criteria");

    expect(result).toBeDefined();
    expect(result.id).toBe(id);
    expect(result.status).toBe("rejected");
    expect(result.reviewed_by).toBe("reviewer-1");
    expect(result.review_reason).toBe("Doesn't meet criteria");
  });

  it("throws NOT_FOUND when application does not exist", async () => {
    const id = "bbbbbbb2-2222-2222-2222-222222222222";
    const mockSupabase = createMockSupabase({ badgeApplications: {}, shouldFetchErrorForId: id });
    const service = new BadgeApplicationService(mockSupabase as unknown as SupabaseClient);

    await expect(service.rejectBadgeApplication(id, "reviewer-1")).rejects.toThrow("NOT_FOUND");
  });

  it("throws INVALID_STATUS_TRANSITION when application not in submitted state", async () => {
    const id = "ccccccc3-3333-3333-3333-333333333333";
    const initialRow = { id, status: "draft", catalog_badge_id: "badge-2" };
    const mockSupabase = createMockSupabase({ badgeApplications: { [id]: initialRow } });
    const service = new BadgeApplicationService(mockSupabase as unknown as SupabaseClient);

    await expect(service.rejectBadgeApplication(id, "reviewer-1")).rejects.toThrow("INVALID_STATUS_TRANSITION");
  });
});
