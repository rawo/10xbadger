Question: Who is the actor that approves and "executes" a promotion (administrator, automated rules engine, HR), and what exact state transition marks a promotion as executed?
Recommendation: Define a single promotion workflow with explicit actors and states (e.g., draft → submitted → approved → executed) and store approvedBy, approvedAt, executedBy, executedAt so promotions can be audited and rules applied deterministically.
Question: If a badge application is accepted and then added to a promotion that is later rejected or rolled back, should that badge be released for reuse or remain flagged as used?
Recommendation: Specify and implement idempotent state transitions: reserve (lock) an accepted badge when added to a promotion, release it on promotion removal/rejection, and permanently mark it usedInPromotion only after promotion is executed.
Question: Can a single accepted badge count toward promotion requirements in multiple promotion paths (technical/financial/management) or multiple promotion levels simultaneously?
Recommendation: Clarify whether promotion eligibility is path-scoped; model promotion rules with path and level scopes and enforce counting rules server-side so badges are credited only where intended.
Question: What is the expected SLA and workflow for administrators to review badge applications (e.g., within 48 hours) and are bulk approvals/rejections required?
Recommendation: Define review SLAs and build an admin review queue with sorting/filters and bulk actions to meet operational needs; surface overdue items and basic metrics for queue health.
Question: For migration: which specific Excel columns map to the catalog and issued badge model, how should duplicates be resolved, and who will validate the imported records?
Recommendation: Create a migration plan: mapping spec, de-dup rules, a test import with sample rows, validation report, and an import UI for admins to approve/rollback; limit import to core fields for MVP.
Question: How will users be authenticated and provisioned—will Badger integrate with company SSO/HR directory or rely on manual account creation?
Recommendation: Prioritize SSO/SCIM integration for production (avoids manual user management); for MVP, allow CSV sync of employees + SSO stub to reduce setup effort and ensure administrator assignment is controlled.
Question: Which exact metrics will confirm success (events and formulas): e.g., registered users / total employees ≥ 90% within 2 months, percent of engineers using "badge application" = 100% — how is "using" defined?
Recommendation: Define concrete metric event names (e.g., user_registered, badge_application_created, badge_application_accepted, promotion_executed) and measurement rules (denominators, time windows). Instrument analytics and create a basic dashboard for the 2-month evaluation.
Question: How should the system prevent and handle concurrent attempts to add the same accepted badge to different promotions at the same time?
Recommendation: Enforce DB-level uniqueness / reservation (transactional lock or status check + optimistic locking) and surface conflict errors in the UI with clear next steps for admins/engineers.
Question: What are the expected UX flows and minimum screens for MVP (engineer: catalog, apply, view status; admin: review queue, catalog management, grant admin)? Any must-have UI details?
Recommendation: Produce simple wireframes for the engineer and admin flows and prioritize building: catalog search (filters), application form, admin review list with detail modal, and promotion builder — keep UI minimal and testable within the 12-week timeline.
Question: What data retention, export, and privacy requirements apply to application evidence and personal data (e.g., must applicants be able to delete their reason text, or must data be kept for audit)?
Recommendation: Define a retention and access policy (audit retention window, who can view application reasons), support export of user/badge data (CSV), and secure sensitive fields (encrypted at rest) with an audit log for admin actions.


# Answers

1. Actor approving promotion is the administrator. However, the decision is taken outside the Badger system, during the discussion meeting driven by company's management, including team leader, HR, CTO, CEO. Result of the discussion is the decision whether to accept or reject promotion. Rejected promotion can be still reviewed by applicant.
States of promotion: draft, submitted, approved or rejected.
If promotion is rejected then badges used in this promotion are 'unlocked' and can be reused in other promotions.
metadata for promotion: createdAt, createdBy, approvedAt, rejectedAt, approvedBy, rejectedBy, reject reason.

2. It can be reused.

3. single accepted badge can be used in only one promotion path, and in only one promotion. If promotion is accepted then the badge can no longer be used.

4. No bulk approval. The time to resolve promotion into rejected or approved is 14 week days, since the promotion has been submitted.

5. The import is out of scope of MVP.

6. Company is using google accounts with a dedicated domain. Badger should use that. No manual account creation. Only this specific domain is allowed.

7. Metrics:
 - egistered users / total employees ≥ 90% within 2 months
 - using means: no new entries in old excel/confluence system for submitted promotions. The number from the old system will be provided manually.

 8. db relation one-to-one - if relation exists for the second transaction the db system should throw exception

 9. Expected UX flows for the MVP:
  - user views the badge catalog, clicks 'drafting' on selected badge and goes to 'my badges' page, sees the newly 'drafted' badge
  - user changes data of badge draft: 'reasoning of fullfiling the badge requirements' - a 'reason' attribute of badge
  - user submits drafted badge, so it can be reviewed by administrator. This badge becomes read only.
  - user can create promotion with accepted badges.
  - user can add/remove badges to/from promotion  in draft
  - user can submit promotion, but only if target position requirements are met
  - administrator can reject/accept badge submitted by user, reject/accept promotion submitted by user.
  - administrator can add new badge to the catalog, deactive existing badge in the catalog.
  - administrator can view and search the badge catalog

Screens for MVP:
 - badge catalog - standard user context
 - badge catalog - administrative context
 - my badges and promotions - standard user context
    - draft new promotion - standard user context
    - draft new badge - standard user context
 - submitted badges - administrative context
 - submitted promotions - administrative context
  

  10. audit, data retention, export are aout of scope for MVP.