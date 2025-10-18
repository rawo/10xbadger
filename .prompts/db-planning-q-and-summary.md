<conversation_summary>
<decisions>
1. Treat users as Google Workspace-first identities and store Google identifiers plus local metadata (`users` table with `google_sub`, `email`, `display_name`, `org_id`, timestamps).
2. Model badges with logical and versioned tables: `badges` and `badge_versions` (publishable snapshots).
3. Do NOT implement application revisions — store application content directly on `badge_applications`.
4. Model promotion submissions as recommended: `promotion_submissions` plus a join table `promotion_application_items` (many-to-many to applications).
5. Implement roles and RLS as recommended: `roles`, `user_roles`, reviewer assignment table, and RLS policies based on JWT claims / `auth.uid()`.
6. Use recommended data types and indexes: UUID PKs, `timestamptz`, `ENUM` for status, `CITEXT` for email, `JSONB` for flexible forms; B-tree and GIN indexes as appropriate.
7. Represent evidence/attachments inline in application JSON (`badge_applications.data`); do not create an `attachments` table or store files in DB.
8. Do NOT implement partitioning at MVP (defer until needed).
9. Do NOT implement a dedicated audit log or revisions for accountability at MVP.
10. Enable recommended PostgreSQL extensions and features: `pgcrypto`/`uuid-ossp`, `citext`, `GIN`/`tsvector` and plan RLS integration with auth JWT claims.
    </decisions>

<matched_recommendations>
1. Users & identity: Create `users` with `id UUID`, `google_sub` (unique), `email CITEXT` (unique), `display_name`, `avatar_url`, `org_id`, `created_at` — matched and accepted.
2. Badge versioning: `badges` + `badge_versions` with `metadata JSONB`, `published_at`, `(badge_id, version)` unique constraint — matched and accepted.
3. Applications storage: `badge_applications` with `badge_version_id`, `applicant_id`, `status` (ENUM), `data JSONB`, `created_at/updated_at` — matched and accepted (no revisions).
4. Promotion model: `promotion_submissions` + `promotion_application_items` join table (many-to-many) — matched and accepted.
5. Roles & RLS: `roles`, `user_roles`, `application_reviewers` table and RLS policies using auth claims (`auth.uid()` / `jwt.claims`) — matched and accepted.
6. Data types & indexing: Use UUIDs, `timestamptz`, `ENUM`, `CITEXT`, GIN on `JSONB` and `tsvector` for full-text, and partial indexes for hot statuses — matched and accepted.
7. Evidence handling: Embed evidence links/structured data in `badge_applications.data` JSONB (deferred attachments) — matched and accepted.
8. Partitioning: Recommendation to defer; decision: no partitioning at MVP — matched.
9. Auditing: Recommendation to keep minimal `last_modified_by` fields was proposed but the decision was NO — auditing/revision tables will not be implemented at MVP.
10. PostgreSQL features: Enable `pgcrypto`/`uuid-ossp`, `citext`, `pg_trgm` (if fuzzy search), GIN/tsvector and use JWT-based RLS — matched and accepted.
    </matched_recommendations>

<database_planning_summary>
Main requirements for the database schema
- SSO-first user identities (Google Workspace) with flexible role assignment and per-organization scoping.
- A badge catalog with versioned/publishable snapshots.
- Badge application submissions stored as single-row documents (no per-application revision history).
- Promotion submissions that can include multiple applications (many-to-many).
- Row-level security enforcing owner/reviewer/admin access based on JWT claims and role assignments.
- Flexible application content (form-like) stored in `JSONB` with search capability.
- No file attachments, partitioning, or audit logs in the MVP — those are deferred.

Key entities and relationships
- `users` (UUID PK) — stores `google_sub`, `email` (CITEXT), `display_name`, `org_id`, timestamps.
- `roles` and `user_roles(user_id, role_id)` — many-to-many for flexible permissions.
- `badges` (logical) and `badge_versions` (publishable snapshots) — `badge_versions.badge_id` FK to `badges`.
- `badge_applications` — `id UUID`, `badge_version_id FK`, `applicant_id FK`, `status ENUM`, `data JSONB`, `created_at`, `updated_at`.
- `promotion_submissions` — `id UUID`, `owner_id FK`, `status ENUM`, `metadata JSONB`.
- `promotion_application_items` — join table linking `promotion_submissions` and `badge_applications`.
- `application_reviewers` (recommended) — assign reviewers to applications to support RLS decisions and queries.
- Typical FK relationships: `badge_versions.badge_id -> badges.id`, `badge_applications.badge_version_id -> badge_versions.id`, `badge_applications.applicant_id -> users.id`, `promotion_application_items` -> (promotion_id, application_id), `user_roles.user_id -> users.id`.

Important security and scalability concerns
- Row-Level Security: Implement per-table RLS policies:
    - Owners: allow access when `applicant_id = auth.uid()`.
    - Reviewers: allow access when user has `reviewer` role OR is listed in `application_reviewers`.
    - Admins: role-based full access.
    - Scope all tenant data by `org_id` where appropriate.
- Auth mapping: Clarify how `auth.uid()` maps to `users.id` (store Google `sub` and map JWT claim to DB user).
- Least privilege: Use RLS and DB roles to ensure application server and direct DB clients have appropriate minimal access.
- Indexing: B-tree indexes on FKs and frequently filtered columns (`applicant_id`, `badge_version_id`, `status`, `created_at`). GIN indexes on `JSONB` fields used for queries and `tsvector`+GIN for full-text search on descriptive fields.
- Extensions & features: Enable `pgcrypto`/`uuid-ossp` for UUIDs, `citext` for emails, `pg_trgm` if fuzzy search required.
- Performance: Design queries to include `org_id` and indexed columns for efficient RLS and partitioning later. Avoid large unindexed JSONB scans; plan GIN keys for predictable search fields.

Schema design choices influenced by decisions
- Use `JSONB` (`badge_applications.data`) to store flexible form data and embedded evidence links, allowing the app to evolve forms without schema migrations.
- Avoid revisions/audit tables to keep MVP scope small; include created/updated timestamps for minimal operational needs.
- Defer attachments, partitioning, and audit logs to future iterations; schema includes `created_at` and `org_id` to enable easy addition later.

Migration and future-proofing notes
- Add unique constraints where needed (`badges.slug`, `(badge_id, version)` on `badge_versions`, `users.email`).
- Design with UUID PKs and FKs to simplify replication and merging.
- Keep `badge_applications.data` structured (use consistent keys) to allow efficient GIN indexes and later extraction into typed columns if needed.
- Make RLS policies explicit and test with realistic JWT claims during development.
- Plan for adding an `attachments` table and an audit/logging table later; embed minimal metadata now to support future migration.

</database_planning_summary>

<unresolved_issues>
1. Exact JWT claim mapping: confirm whether `auth.uid()` will be the Google `sub`, user `id` (UUID), or another claim — needed to implement RLS policies correctly.
2. Exact enum values for statuses and decisions (application `status`, promotion `status`, review `decision`) — finalize list for `ENUM` types.
3. Search requirements: confirm which fields require full-text search vs exact/filter queries to finalize `tsvector`/GIN index design.
4. Query patterns & expected scale: provide expected read/write volumes and common query patterns to tune indexes and decide whether to introduce partial indexes or future partition keys.
5. Reviewer workflows: clarify whether reviewers are assigned manually, automatically, or via round-robin (affects `application_reviewers` design and indexing).
6. Tenant model enforcement: confirm whether `org_id` is mandatory on all major tables and exact organization identifier format.
7. Backups, retention, and archival policy for applications and promotions — needed later for compliance and potential partitioning/archival design.
8. Decision on UUID generation strategy (`pgcrypto` vs `uuid-ossp`) and whether client or DB should generate UUIDs.
   </unresolved_issues>
   </conversation_summary>
