You are an AI assistant whose task is to help plan a PostgreSQL database schema for an MVP (Minimum Viable Product) based on the provided information. Your goal is to generate a list of questions and recommendations that will be used in subsequent prompting to create the database schema, relationships, and row-level security (RLS) policies.

Please carefully review the following information:

<product_requirements>
@prd.md
</product_requirements>

<tech_stack>
@tech-stack.md
</tech_stack>

Analyze the provided information, focusing on aspects relevant to database design. Consider the following issues:

1. Identify key entities and their attributes based on product requirements.
2. Determine potential relationships between entities.
3. Consider data types and constraints that may be necessary.
4. Think about scalability and performance impact.
5. Assess security requirements and their impact on database design.
6. Consider any specific PostgreSQL features that might be beneficial for the project.

Based on your analysis, generate a list of 10 questions and recommendations in a combined form (question + recommendation). These should address any ambiguities, potential issues, or areas where more information is needed to create an effective database schema. Consider questions regarding:

1. Entity relationships and cardinality
2. Data types and constraints
3. Indexing strategies
4. Partitioning (if applicable)
5. Row-level security requirements
6. Performance considerations
7. Scalability concerns
8. Data integrity and consistency

The output should have the following structure:

<questions>
List your questions and recommendations here, numbered for clarity:

For example:
1. Should the `users` entity have a relationship with `posts`?

Recommendation: Yes, the `users` entity should have a relationship with `posts` because users can create posts.
</questions>

Remember that your goal is to provide a comprehensive list of questions and recommendations that will help create a solid PostgreSQL database schema for the MVP. Focus on clarity, relevance, and accuracy of your outputs. Do not include any additional comments or explanations beyond the specified output format.

Continue this process, generating new questions and recommendations based on the provided context and user responses, until the user explicitly requests a summary.

Remember to focus on clarity, relevance, and accuracy of outputs. Do not include any additional comments or explanations beyond the specified output format.

<questions>
Should we treat users as Google Workspace-first identities (users) and store both Google identifiers and local metadata?
Recommendation: Yes — create a users table with id UUID PRIMARY KEY, google_sub (unique), email (use citext, unique), display_name, avatar_url, domain, created_at timestamptz, and role fields; index google_sub and email and enforce uniqueness to avoid duplicate accounts from SSO.
How should the badge catalog be modeled: single badges table or versioned badge_releases?
Recommendation: Use badges for logical badge (id, slug, canonical fields) and a badge_releases (or badge_versions) table for publishable versions with badge_id FK, version, is_active, metadata JSONB, and published_at; this enables immutable published snapshots and easier rollback.
What structure should badge_applications have for drafts, submissions, reviews, and revisions?
Recommendation: Use badge_applications with id UUID, badge_release_id FK, applicant_id FK, status enum (draft, submitted, under_review, accepted, rejected), current_revision_id FK and store revision content in application_revisions (application_id FK, revision_number, data JSONB, submitted_at, author_id) to preserve history and support drafts/revisions; add created_at/updated_at and soft-delete flag.
How do promotion submissions relate to badges and applications (one-to-many, many-to-many)?
Recommendation: Model promotion_submissions that can reference multiple badge_applications via a join table promotion_application_items (many-to-many) and reference submitter/owner; keep promotion metadata as JSONB to allow flexible templates and attach status and reviewer_id fields.
What role/permission model and RLS granularity do we need for admin, reviewer, and user flows?
Recommendation: Implement roles and user_roles tables and design RLS policies on each resource: allow row owner access (applicant_id = auth.uid()), allow reviewers access when assigned or when role = reviewer, allow admins full access; store org_id (Google Workspace domain) on users/resources and use JWT claims (e.g., current_setting('jwt.claims.sub') / auth.uid()) in policies for secure enforcement.
Which data types, constraints, and indexes are required for performance and integrity?
Recommendation: Use UUID PKs (uuid_generate_v4()), timestamptz for all times, enum types for statuses, citext for emails, JSONB for flexible metadata, and strong FK constraints; add B-tree indexes on FK columns (applicant_id, badge_id), on query filters like status and created_at, and GIN indexes (or tsvector + GIN) for searchable text in badges.title and badges.description.
Should attachments and evidence be stored in the DB or external object storage, and how to track them?
Recommendation: Store files in an object store (Supabase Storage / S3) and keep an attachments table with id, object_key, owner_id FK, resource_type, resource_id, content_type, size, checksum, created_at; enforce referential integrity with ON DELETE CASCADE where appropriate and index resource_type/resource_id for lookups.
Do we need partitioning, and if so which tables and partition keys are appropriate?
Recommendation: Defer partitioning until metrics show scale, but design for it: choose badge_applications and application_revisions as candidates and partition by created_at or org_id (tenant) if high write/query volume is expected; ensure queries include partition key for performance.
What audit/history and consistency guarantees are required for reviews and decision trails?
Recommendation: Maintain immutable audit tables (application_audits or audit_log) or use application_revisions plus reviews table (id, application_id, reviewer_id, decision enum, comments, created_at); add FK constraints and GIN index on comments if searching; use DB transactions for multi-step state transitions to preserve consistency.
Which PostgreSQL-specific features should we plan to use for scalability, search, and secure RLS?
Recommendation: Use pgcrypto/uuid-ossp for UUIDs, citext extension for case-insensitive email, GIN indexes on JSONB and tsvector for full-text search, partial indexes for common filtered queries (e.g., WHERE status = 'submitted'), and implement Row-Level Security using JWT claims from Supabase/Google SSO with appropriate policies and current_setting('jwt.claims.*') or auth.uid() mappings.
</questions>


1. Yes
2. Use badges and badges_versions
3. No need for revisions for badge_applications
4. Use recommendation
5. Use recommendation
6. Use recommendation
7. No attachements. Ignore this.
8. No partitionning required. Ignore this.
9. No audit log required. Ignore this.
10. Use recommendation