Question: Who is responsible for recording the external meeting outcome into Badger (who clicks the final approved/rejected), and what exact fields must be captured when they do so?
Recommendation: Require an administrator to record the decision with approvedBy, approvedAt, rejectedBy, rejectedAt, and rejectReason fields via an “Record outcome” admin UI; include a manual “attach meeting notes” text/file field for traceability.
Question: Can applicants submit a promotion request for any path and level, or must submissions target the immediate next level only?
Recommendation: Enforce target-level rules server-side and surface them in the UI: either allow free target selection with validation against requirement rules, or restrict to “next-level only” to simplify MVP.
Question: How is a badge’s allowed promotion path determined (catalog attribute, implicit by category, or free)?
Recommendation: Add an explicit pathsAllowed attribute to catalog badges (or global), and validate at application time so a badge can be accepted only for a single path as required.
Question: How should the app present and recover from DB-level uniqueness/lock exceptions when two users attempt to reserve the same accepted badge concurrently?
Recommendation: Implement a reservation API with optimistic locking and clear UI conflict messages (e.g., “Badge already reserved by another promotion — refresh to view”), plus automatic retry guidance; show lock owner if appropriate.
Question: How must SSO be enforced for @company Google accounts (auth provider-only or additional app-level checks)?
Recommendation: Integrate Google Workspace SSO (OIDC/SAML) and enforce domain claim on login; map admins by email or a small admin config UI rather than manual account creation.
Question: How should the 14 business days review SLA be surfaced and enforced for submitted promotions and badge applications?
Recommendation: Add SLA timers in admin queues (submitted time + 14 business days), visual overdue flags, and an escalation/reporting view so admins can monitor and prioritize items.
Question: Who supplies the baseline numbers for verifying the “no new entries in old excel/confluence” success metric and how will the comparison be performed?
Recommendation: Define a one-time manual baseline import (counts only) from the legacy sources and instrument events (badge_application_created, promotion_submitted) so product can produce a simple side-by-side report for the 2-month evaluation.
Question: Should the promotion builder allow adding draft or new (not-yet-accepted) badges into a draft promotion, and what validation is required on submit?
Recommendation: Allow composing promotions with drafts but block final submit unless all badges in the promotion are accepted and the target requirement rules are satisfied; show clear validation errors for missing/invalid badges.
Question: Administrators are also standard users—should role context be an explicit UI toggle and should actions be auditable by roleUsed?
Recommendation: Provide an explicit “Use as Admin / Use as User” toggle and record actedAsRole on all admin-originated changes so auditability and accidental-admin actions are minimized.
Question: When a promotion is rejected and badges are unlocked, should the system automatically allow immediate reuse, and should the applicant be notified in-app (or by email later)?
Recommendation: Automatically transition involved badges to accepted/unlocked state when a promotion is rejected, surface unlocked badges on the applicant’s My Badges page, and queue an in-app notification (email optional for later phases) informing the applicant and next steps.


1. recording of meeting is not part of the MVP and out of scope of the Badger. Administrator is responsible for clicking final approved/rejected.

2. Only immediate next level is allowed. Example levels path: J1, J2, J3, M1, M2, M3, M4, S1, S2, S3, S4, E1, E2

3. Promotion related to a specific level limits allowed bagdes to category and level.
Example: Promotion for S3 position requires badges as follows:
- 6 silver badges from category technical
- 1 gold badge from any of defined categories
- 4 silver badge from any of defined categories

4. Best would be to provide UI dialog 'Badge already assigned to a promotion in draft {link to this promotion}'

5. SSO must also include allowed company domain. 
For example: 
If company domain is 'goodcompany' then user with email john.doe@evilcompany.com is not allowed, but user with email john.doe@evilcompany.com is allowed. 

6. This is out of scope for MVP.

7. This is out of scope for MVP. This will be handled outside the Badger app.

8. No, only accepted and not used-in-promotion badges are allowed.

9. Audits are out of scope for MVP. Administrators should have additional actions available in UI screens.
For example: action to deactive badge in catalog, action to add new badge to catalog.

10. System should automaticall unlock badges. But, notifications are out of scope for MVP.