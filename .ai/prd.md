# Product Requirements Document (PRD) - Badger (MVP)
## 1. Product Overview
Badger is a web application designed to replace legacy Excel and Confluence-based badge tracking with a single system for cataloging badges, submitting badge applications, and building promotion submissions. The MVP focuses on core flows for engineers and administrators: catalog browsing and search, badge application drafting and submission, administrative review, promotion building and submission, and basic role-based access via Google Workspace SSO.

## 2. User Problem
A software-house currently maintains badge definitions in Confluence and badge issuance in Excel, which is inconvenient to use and hard to maintain. Engineers lack a central, searchable catalog and a straightforward way to apply badges toward promotions. Administrators lack an organized review workflow and a reliable way to manage the badge catalog and promotion submissions. Badger aims to centralize these processes, reduce manual work, and increase transparency.

## 3. Functional Requirements
FR-001 Authentication and Authorization
- Use Google Workspace SSO (OIDC/SAML) restricted to the company domain (e.g., `@goodcompany.com`). No manual account creation. Admin accounts seeded at deploy for MVP.
- Roles: `administrator` and `standard user (engineer)`; administrators also have standard user capabilities.
- All endpoints must validate the authenticated user's domain claim and role for access control.

FR-002 Badge Catalog
- Catalog badge model: `id (UUID)`, `title`, `description`, `category` (technical, organizational, softskilled), `level` (gold, silver, bronze), `createdAt`, `createdBy`, `deactivatedAt`, `status` (`active`/`inactive`), `pathsAllowed` (optional; default `all`).
- Admin capabilities: create, edit, deactivate catalog badges. Deactivated badges are read-only and not available for new applications.
- Catalog search (MVP): filter by `category`, `level`, full-text title search, and `createdAt`. Only `active` badges returned.

FR-003 Badge Application (badge application = applicant applies for acceptance)
- Badge application model: `id (UUID)`, `catalogBadgeId`, `catalogBadgeVersion`, `applicantId`, `dateOfApplication`, `dateOfFulfillment`, `reason` (free-text), `createdAt`, `status` (`draft`, `submitted`, `accepted`, `rejected`, `used_in_promotion`).
- Engineers can draft (save) and edit badge applications. Drafts are persisted server-side (save draft button in MVP).
- Engineers submit applications for admin review. Submitted applications become read-only for the applicant.
- Admin can accept or reject an application. Admin records `approvedBy`/`approvedAt` or `rejectedBy`/`rejectedAt` and `rejectReason`.

FR-004 Promotion Templates and Validation
- Promotion templates (per path + level) stored in DB: `id`, `path` (technical/financial/management), `level` (e.g., S3), and a list of required badge counts by `category` and `level` (e.g., {technical:silver:6, any:gold:1, any:silver:4}).
- Promotion submissions must target the immediate next level only (configured path-level sequence).
- Validation: exact-match counts required. No level equivalence (e.g., gold does not count as silver).

FR-005 Promotion Builder and Submission
- Promotion model: `id (UUID)`, `applicantId`, `path`, `targetLevel`, `createdAt`, `createdBy`, `status` (`draft`, `submitted`, `approved`, `rejected`), `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectReason`.
- Engineers build promotion drafts by adding accepted and unused badge instances. Only badges with status `accepted` and not `used_in_promotion` are addable.
- Real-time eligibility preview in UI: shows satisfied and missing counts; `Submit` is disabled until validation passes.
- On submit, server validates exact template compliance and reserves badge instances atomically.

FR-006 Reservation and Concurrency
- Use optimistic reservation with a DB uniqueness constraint to prevent double reservation of the same badge instance.
- On conflict, return structured error (HTTP 409) with `conflictType` and `owningPromotionId` so UI can show `Badge already assigned to promotion in draft` modal with link.

FR-007 Admin Review Workflows
- Admin can review submitted badge applications and promotions and accept/reject each. No bulk approvals in MVP.
- Rejection unlocks any reserved badges used in the promotion. Approval consumes badges (cannot be reused).

FR-008 Logging and Monitoring
- Application logs for authentication failures and reservation conflicts. Basic monitoring for error spikes. Audit logs, notifications, and advanced monitoring are out of scope.

FR-009 Data Models and IDs
- Use UUIDs for primary IDs. Include `catalogBadgeVersion` on badge instances to maintain historical references when catalog changes.

FR-010 Import and Migration
- Import from legacy Excel/Confluence is out of scope for MVP (manual processes will be used).

## 4. Product Boundaries
Out of scope for MVP:
- Mobile application
- File attachments on badge applications
- Notifications (in-app, email)
- Audit/history and detailed change logs
- Bulk approvals
- Comments, likes, or social features
- Automatic import/migration tooling (Excel/Confluence import)
- Fine-grained admin role hierarchy and multitenancy
- Data residency and production NFRs (to be defined later)

## 5. User Stories
This section lists all user stories required for MVP implementation. Each story includes acceptance criteria.

US-001
Title: User Authentication via Google Workspace SSO
Description: As a user, I want to sign in with my company Google account so that access is restricted to employees.
Acceptance Criteria:
- Login flow supports Google SSO (OIDC/SAML).
- Only emails from the configured company domain can sign in.
- Admin accounts are seeded at deploy.
- Unauthorized domain emails receive a clear error message.

US-002
Title: View Badge Catalog (standard user)
Description: As an engineer, I want to browse the badge catalog to find badges I can apply for.
Acceptance Criteria:
- Catalog shows only `active` badges.
- User can filter by category and level, search by title, and sort/filter by `createdAt`.
- Each badge lists title, category, level, and short description.

US-003
Title: Admin Catalog Management
Description: As an administrator, I want to create, edit, and deactivate catalog badges.
Acceptance Criteria:
- Admin UI allows creating/editing badges with fields defined in FR-002.
- Admin can deactivate a badge; it becomes read-only and is excluded from new applications.
- Deactivating a catalog badge does not invalidate existing accepted badge instances.

US-004
Title: Draft Badge Application
Description: As an engineer, I want to draft a badge application and save it.
Acceptance Criteria:
- User can select a catalog badge and create a draft application with `dateOfApplication`, `dateOfFulfillment`, and `reason`.
- Drafts are saved server-side and visible under My Badges.
- Drafts can be edited or deleted by their owner.

US-005
Title: Submit Badge Application
Description: As an engineer, I want to submit a drafted badge application for admin review.
Acceptance Criteria:
- User can submit a draft, after which the application becomes `submitted` and read-only to the applicant.
- Server records `createdAt` and `applicantId`.
- Admins can view submitted applications in an admin queue.

US-006
Title: Admin Review Badge Application
Description: As an administrator, I want to accept or reject submitted badge applications.
Acceptance Criteria:
- Admin can accept or reject an application and must provide `approvedBy`/`approvedAt` or `rejectedBy`/`rejectedAt` and `rejectReason`.
- Accepted application transitions to `accepted` and is available for promotion composition.
- Rejected application is `rejected` and visible to the applicant.

US-007
Title: Create Promotion Draft
Description: As an engineer, I want to create a promotion draft and add accepted badges to it.
Acceptance Criteria:
- User can create a draft promotion specifying `path` and `targetLevel` (only immediate next level allowed).
- User can add only `accepted` and `unused` badge instances; attempts to add reserved/used badges produce a conflict modal linking to the owning draft.
- Drafts can be saved and edited by the owner.

US-008
Title: Eligibility Preview and Submit Promotion
Description: As an engineer, I want to see which template requirements are satisfied and submit only if all requirements are met.
Acceptance Criteria:
- UI displays live counts for each requirement and missing counts.
- The `Submit` button is disabled until template validation passes.
- On submit, server validates exact-match and reserves badge instances. Reservation conflicts return 409 with owningPromotionId.

US-009
Title: Admin Review Promotion
Description: As an administrator, I want to review submitted promotions and record approval or rejection.
Acceptance Criteria:
- Admin can view promotion details including associated badge instances and applicant information.
- Admin records `approvedBy`/`approvedAt` or `rejectedBy`/`rejectedAt` and `rejectReason`.
- If rejected, reserved badges are unlocked. If approved, badges are consumed (cannot be reused).

US-010
Title: Reservation Conflict Handling
Description: As a user attempting to add a badge already reserved elsewhere, I want to be informed and linked to the owning draft.
Acceptance Criteria:
- Server returns structured conflict error with owningPromotionId when reservation fails.
- UI shows modal: `Badge already assigned to promotion in draft` with a link to the owning draft and refresh CTA.

US-011
Title: Admin Context Controls
Description: As an administrator, I want admin controls available in the UI so I can manage catalog and review queues.
Acceptance Criteria:
- Admin sees context-specific controls on catalog and queues.
- Admin actions include create/edit/deactivate badge and view submitted badge and promotion queues.

US-012
Title: My Badges and Promotions View
Description: As an engineer, I want a consolidated view of my drafts, submitted badge applications, accepted badges, and promotion drafts.
Acceptance Criteria:
- My Badges lists drafts, submitted applications with statuses, accepted badges, and promotions.
- Each item links to the detail page.

US-013
Title: Data Integrity and IDs
Description: As a developer, I want stable unique identifiers and catalog versioning to preserve historical references.
Acceptance Criteria:
- All primary models use UUIDs.
- Badge application stores `catalogBadgeVersion`.

US-014
Title: Logging
Description: As an operator, I want application logs for auth failures and reservation conflicts for triage.
Acceptance Criteria:
- Auth failures and reservation conflicts are logged with timestamps and relevant contextual fields.
- Logs are accessible to dev/ops.

## 6. Success Metrics
SM-001 Adoption Rate
- Target: Registered users / total employees ≥ 90% within 2 months of launch.
- Measurement: instrument `user_registered` and compare to the HR-provided employee list (baseline provided manually by company admin).

SM-002 Badge Application Usage
- Target: 100% of engineers use the badge application feature (no new entries in legacy Excel/Confluence for submitted promotions).
- Measurement: designated person will compare legacy system counts vs new submissions at baseline and after 60 days.

SM-003 Operational Metrics (recommended)
- Events to instrument: `badge_application_created`, `badge_application_submitted`, `badge_application_accepted`, `promotion_draft_created`, `promotion_submitted`, `promotion_approved`, `promotion_rejected`.
- Monitor reservation conflict rate and auth failure rate.

## Appendix: Data Models (concise)
- User: { id: UUID, email, name, role }
- CatalogBadge: { id: UUID, title, description, category, level, pathsAllowed, createdAt, createdBy, deactivatedAt, status }
- BadgeApplication: { id: UUID, catalogBadgeId, catalogBadgeVersion, applicantId, dateOfApplication, dateOfFulfillment, reason, createdAt, status }
- PromotionTemplate: { id, path, level, requirements: [{category, level, count}] }
- Promotion: { id: UUID, applicantId, path, targetLevel, badgeApplicationIds[], createdAt, createdBy, status, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectReason }

---

Saved PRD to .ai/prd.md
