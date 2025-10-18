You are a database architect whose task is to create a PostgreSQL database schema based on information provided from planning sessions, a Product Requirements Document (PRD), and the tech stack. Your goal is to design an efficient and scalable database structure that meets project requirements.

1.
<prd>
@prd.md
</prd>

This is the Product Requirements Document that specifies features, functionalities, and project requirements.

2.
<session_notes>
<conversation_summary>
<decisions>
Promotion rules are fixed templates composed of badge counts by category and level (e.g., 6 silver technical, 1 gold any, 4 silver any); promotions target the immediate next level only.
Catalog badge lifecycle: active / inactive. Inactive catalog badges are read-only and cannot be used for new submissions.
Badge application lifecycle: users can draft an application, submit it for admin review; application states include new/draft, submitted, accepted, rejected, used in promotion. Only accepted badges may be used in promotions.
Role model: two roles only—administrator and standard user (engineer). Administrators are also standard users (dual contexts). Admin accounts are seeded at deploy for MVP.
Authentication: Google Workspace SSO only, restricted to the company domain (e.g., @goodcompany.com). No manual account creation.
Promotions: states are draft, submitted, approved, rejected. An administrator manually records the final approved or rejected outcome (fields persisted: approvedBy/approvedAt or rejectedBy/rejectedAt/rejectReason). Rejected promotions unlock badges for reuse; approved/executed promotions permanently consume badges.
Reservation & concurrency: optimistic reservation with a DB uniqueness constraint; conflict returns structured error and the UI shows a modal linking to the owning draft (Badge already assigned to promotion in draft {link}).
Search & catalog: MVP search by category, level, full-text search on badge title, and createdAt. Only active catalog badges are visible.
Promotion submission validation: strict exact-match validation of promotion templates (no level equivalence). The UI shows a real-time eligibility preview and disables Submit until all requirements are met.
Scope exclusions for MVP: file attachments, audit/history, notifications, import/migration tooling, bulk approvals, comments/likes, detailed NFRs and data residency, and external meeting recording are out of scope.
</decisions>
<matched_recommendations>
Define a machine-readable promotion rule model and admin UI to manage rules — Accepted and required; promotion templates will be stored in DB and validated on submit.
Implement simple RBAC with administrator and engineer and allow future expansion — Accepted; admin list is seeded at deploy for MVP.
Use Google Workspace SSO and enforce company-domain claim — Accepted and mandated for MVP.
Enforce server-side strict validation for promotion eligibility and show client-side preview — Accepted (exact-match policy; UI preview + disabled Submit).
Use optimistic locking / DB constraints and return structured conflict errors (HTTP 409 with owningPromotionId) — Accepted (UI modal linking to owning draft).
Keep MVP storage simple: no file uploads or attachment support, limit data retained to minimal metadata fields — Accepted (attachments out of scope).
Use UUIDs for primary keys and track catalogBadgeVersion on instances to preserve historical references — Accepted (user: "Use recommendation").
Provide contextual admin controls on shared pages rather than separate admin-only pages — Accepted (admin actions available in UI screens).
Automate basic application logs and monitoring for conflicts/auth errors (no audit logs yet) — Partially accepted: application logs only for MVP; audit logs out of scope.
Create an admin UI to author promotion templates per path+level rather than config files — Accepted (recommendation to store templates in DB and expose admin editing).
</matched_recommendations>
<prd_planning_summary>
Main functional requirements (MVP)
User authentication: Google Workspace SSO restricted to company domain.
Roles: administrator and standard user (engineer). Admins seeded at deploy.
Catalog management (admin): create/edit/deactivate catalog badges (active/inactive), view/search catalog. Catalog badge metadata: createdAt, createdBy, deactivatedAt, status.
Badge application (engineer): browse catalog, draft badge applications (provide dateOfApplication, dateOfFulfillment, free-text reason), save draft, submit for admin review. Badge application metadata: createdAt, createdBy, status (draft/new, submitted, accepted, rejected, used in promotion), reference to catalog badge. No file attachments.
Admin review (admin): review submitted badge applications and accept or reject. Admin records decisions (persist approvedBy/approvedAt or rejectedBy/rejectedAt/rejectReason). No bulk actions in MVP.
Promotion builder (engineer): create promotion drafts, add/remove accepted & unused badges, run server-side exact-match validation against stored promotion templates, see real-time eligibility preview, and submit when requirements are met.
Promotion review (admin): review submitted promotions and record approved or rejected. If rejected, previously reserved badges are unlocked; if approved/executed, badges are consumed and no longer reusable. Promotion metadata: createdAt, createdBy, approvedAt, rejectedAt, approvedBy, rejectedBy, rejectReason.
Concurrency/reservation: prevent double-reservation of the same accepted badge using optimistic uniqueness constraints and user-facing conflict responses (modal with link to owning draft).
Search: filter catalog by category and level, full-text search on title, and createdAt. Only active badges returned.
Minimal logging: application logs for auth failures and reservation conflicts. No audits or notifications in MVP.
Key user stories and usage paths
Engineer: Authenticate via company Google SSO → Browse badge catalog → Draft badge application → Save draft → Edit reason and dates → Submit application → Track My Badges status → Once application is accepted, include badge in a promotion draft → Use eligibility preview to fill missing counts → Submit promotion when exact template rules are satisfied.
Administrator: Authenticate via Google SSO → Use admin-seeded account → Switch to admin context (UI controls visible) → Review submitted badge applications → Accept/reject badge applications (record decision) → Review submitted promotions → Approve/reject promotions (record decision) → Create/edit/deactivate catalog badges → Search catalog and submitted queues.
Conflict flow: Engineer A views accepted badge → adds it to promotion draft; Engineer B attempts to add same badge → system returns conflict → UI shows modal with link to Engineer A's draft.
Success criteria and measurement
Adoption target: Registered users / total employees ≥ 90% within 2 months after launch. Measurement: instrument user_registered event and compare against HR-provided employee list (baseline provided manually by company admin).
Legacy usage stop: No new entries into legacy Excel/Confluence for submitted promotions. Measurement: tracked manually by a designated person comparing legacy counts vs new system submissions at baseline and at 60 days.
Functional metrics to instrument (recommended): badge_application_created, badge_application_submitted, badge_application_accepted, promotion_draft_created, promotion_submitted, promotion_approved, promotion_rejected. Use these for the 2-month evaluation.
Unresolved issues / items requiring further clarification
Promotion execution: the concept of an additional executed state (after approved) and who flips it was discussed but the canonical MVP state machine ends at approved (administrators record approved/rejected). Clarify whether approved implies complete execution or if a separate executed transition is required by HR/ops.
Owner for manual adoption reporting: a named owner outside the app will perform legacy-vs-new comparisons; confirm who (product/HR) will be responsible operationally.
Exact fields and UI copy for the admin "record decision" action (e.g., whether to include an optional meeting notes field) — meeting recording is out of scope, but a minimal rejectReason field is required.
Data retention, export and compliance rules were explicitly out of scope for MVP and will need specification before production rollout.
Nonfunctional requirements (latency, uptime, data residency) were deferred—decide minimal NFRs prior to hosting/ops implementation.
</prd_planning_summary>
<unresolved_issues>
Confirm whether approved promotions require an additional executed transition and who is responsible for executing promotions operationally.
Confirm the named owner responsible for running the manual legacy-vs-new adoption comparison at day 0 and day 60.
Finalize the precise admin UI fields for recording promotion decisions (confirm whether a meeting notes free-text field is wanted).
Specify data retention, export and compliance requirements for production (out of scope for MVP but required for later stages).
Decide minimal non-functional requirements (latency, uptime, data residency) before production deployment.
</unresolved_issues>
</conversation_summary>
</session_notes>

These are notes from the database schema planning session. They may contain important decisions, considerations, and specific requirements discussed during the meeting.

3.
<tech_stack>
@tech-stack.md
</tech_stack>

Describes the technology stack that will be used in the project, which may influence database design decisions.

Follow these steps to create the database schema:

1. Carefully analyze session notes, identifying key entities, attributes, and relationships discussed during the planning session.
2. Review the PRD to ensure that all required features and functionalities are supported by the database schema.
3. Analyze the tech stack and ensure that the database design is optimized for the chosen technologies.

4. Create a comprehensive database schema that includes:
   a. Tables with appropriate column names and data types
   b. Primary keys and foreign keys
   c. Indexes to improve query performance
   d. Any necessary constraints (e.g., uniqueness, not null)

5. Define relationships between tables, specifying cardinality (one-to-one, one-to-many, many-to-many) and any junction tables required for many-to-many relationships.

6. Develop PostgreSQL policies for row-level security (RLS), if applicable, based on requirements specified in session notes or the PRD.

7. Ensure the schema follows database design best practices, including normalization to the appropriate level (typically 3NF, unless denormalization is justified for performance reasons).

The final output should have the following structure:
```markdown
1. List of tables with their columns, data types, and constraints
2. Relationships between tables
3. Indexes
4. PostgreSQL policies (if applicable)
5. Any additional notes or explanations about design decisions
```

Your response should provide only the final database schema in markdown format, which you will save in the file .ai/db-plan.md without including the thinking process or intermediate steps. Ensure the schema is comprehensive, well-organized, and ready to use as a basis for creating database migrations.
