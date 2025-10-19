# Database schema plan for 10xbadger

1. List of tables with their columns, data types, and constraints

---

## 1. `users`
This table is managed by Supabase Auth.
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `email` TEXT NOT NULL UNIQUE -- company Google Workspace email
- `display_name` TEXT NOT NULL
- `is_admin` BOOLEAN NOT NULL DEFAULT FALSE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `last_seen_at` TIMESTAMPTZ
- `google_sub` TEXT NOT NULL UNIQUE -- Google subject (sub) claim

Constraints & notes:
- Enforce email domain at application layer; `google_sub` is authoritative for authentication.

---

## 2. `catalog_badges`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `title` TEXT NOT NULL
- `description` TEXT
- `category` TEXT NOT NULL -- e.g., "technical", "leadership"
- `level` TEXT NOT NULL -- e.g., "bronze", "silver", "gold"
- `metadata` JSONB DEFAULT '{}' -- freeform for future fields
- `status` TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive'))
- `created_by` UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `deactivated_at` TIMESTAMPTZ
- `version` INT NOT NULL DEFAULT 1 -- increments on edit to preserve references

Indexes & notes:
- Full-text search index on `title` (GIN on to_tsvector('simple', title)).
- Index on `(category, level)` for filter queries.
Constraints:
- Primary key from `id` and `version`

---

## 3. `badge_applications`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `applicant_id` UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `catalog_badge_id` UUID NOT NULL REFERENCES catalog_badges(id) -- badge definition referenced
- `catalog_badge_version` INT NOT NULL -- snapshot of `catalog_badges.version` at time of application
- `date_of_application` DATE NOT NULL
- `date_of_fulfillment` DATE
- `reason` TEXT
- `status` TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','accepted','rejected','used_in_promotion'))
- `submitted_at` TIMESTAMPTZ
- `reviewed_by` UUID REFERENCES users(id)
- `reviewed_at` TIMESTAMPTZ
- `review_reason` TEXT -- rejection reason or admin notes
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Constraints & notes:
- Only `accepted` applications may be added to promotions.
- Application `catalog_badge_version` preserves referential snapshot.
- Trigger to update `updated_at` on row modification.

---

## 4. `promotion_templates`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `name` TEXT NOT NULL -- e.g., "Senior Engineer -> Staff Engineer"
- `path` TEXT NOT NULL -- canonical path/role (e.g., "engineering.backend")
- `from_level` TEXT NOT NULL -- source level (e.g., "senior")
- `to_level` TEXT NOT NULL -- target level (e.g., "staff")
- `rules` JSONB NOT NULL -- machine-readable rules, e.g. [{"category":"technical","level":"silver","count":6},{"any":true,"level":"gold","count":1}]
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_by` UUID REFERENCES users(id)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Notes:
- `rules` should enforce the exact-match policy at application-level and server-side validation.
- Consider a JSON schema stored in app to validate `rules` shape.

---

## 5. `promotions`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `template_id` UUID NOT NULL REFERENCES promotion_templates(id)
- `created_by` UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL
- `path` TEXT NOT NULL -- copied from template for fast queries
- `from_level` TEXT NOT NULL
- `to_level` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected'))
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `submitted_at` TIMESTAMPTZ
- `approved_at` TIMESTAMPTZ
- `approved_by` UUID REFERENCES users(id)
- `rejected_at` TIMESTAMPTZ
- `rejected_by` UUID REFERENCES users(id)
- `reject_reason` TEXT
- `executed` BOOLEAN NOT NULL DEFAULT FALSE -- reserved for future; approval currently implies execution for MVP unless changed

Notes:
- `path/from_level/to_level` denormalized for query simplicity and immutable after creation.

---

## 6. `promotion_badges`  -- junction table between `promotions` and `badge_applications`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `promotion_id` UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE
- `badge_application_id` UUID NOT NULL REFERENCES badge_applications(id) -- only accepted and unused apps allowed
- `assigned_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `assigned_by` UUID NOT NULL REFERENCES users(id)
- `consumed` BOOLEAN NOT NULL DEFAULT FALSE -- true when promotion is approved/executed

Constraints & concurrency:
- Unique constraint: (badge_application_id) WHERE consumed = FALSE
  - This prevents the same accepted badge from being assigned to multiple active drafts/promotions.
  - Implement as: UNIQUE (badge_application_id) WHERE consumed = FALSE
- On promotion rejection, application rows referenced by promotion_badges should be unlinked or `consumed` set to FALSE.

---

## 7. `audit_logs` (minimal events for MVP)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `actor_id` UUID REFERENCES users(id)
- `event_type` TEXT NOT NULL -- e.g., 'auth.failure', 'reservation.conflict'
- `payload` JSONB
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Notes:
- Keep minimal logs required for monitoring conflicts and auth failures.

---

## 8. `settings` (simple key-value for seeded admin list and app flags)
- `key` TEXT PRIMARY KEY
- `value` JSONB
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

---

2. Relationships between tables

- `users` 1 -- * `badge_applications` (applicant_id)
- `users` 1 -- * `catalog_badges` (created_by)
- `users` 1 -- * `promotion_templates` (created_by)
- `users` 1 -- * `promotions` (created_by)
- `users` 1 -- * `promotion_badges` (assigned_by)
- `promotion_templates` 1 -- * `promotions` (template_id)
- `promotions` 1 -- * `promotion_badges` (promotion_id)
- `badge_applications` 1 -- 0..1 `promotion_badges` (badge_application_id) — badge applications may be unassigned or assigned to one promotion at a time
- `catalog_badges` 1 -- * `badge_applications` (catalog_badge_id)

Cardinalities:
- A user can create many badge applications and promotions.
- A promotion references many badge applications via `promotion_badges`.
- A badge application can be attached to at most one active promotion (enforced by unique partial index).

---

3. Indexes

General notes: use GIN indexes for JSONB and full-text search; B-Tree indexes for filtering and foreign keys.

Suggested indexes:
- `users(email)` UNIQUE B-TREE
- `catalog_badges`:
  - GIN index on to_tsvector('simple', title) for full-text search: CREATE INDEX idx_catalog_badges_title_tsv ON catalog_badges USING GIN (to_tsvector('simple', title));
  - BTREE on (category, level): CREATE INDEX idx_catalog_badges_category_level ON catalog_badges(category, level);
  - BTREE on (status, created_at) for listing active badges by recency.
- `badge_applications`:
  - BTREE on (applicant_id)
  - BTREE on (catalog_badge_id)
  - BTREE on (status)
  - BTREE on (created_at)
- `promotion_templates`:
  - BTREE on (path, from_level, to_level)
  - GIN on rules JSONB if templates are queried by rule attributes.
- `promotions`:
  - BTREE on (created_by)
  - BTREE on (status, created_at)
  - BTREE on (template_id)
- `promotion_badges`:
  - UNIQUE PARTIAL INDEX: CREATE UNIQUE INDEX ux_promotion_badges_badge_application_unconsumed ON promotion_badges(badge_application_id) WHERE consumed = FALSE;
  - BTREE on (promotion_id)
- `audit_logs`:
  - BTREE on (actor_id, event_type, created_at)

---

4. PostgreSQL policies (Row-Level Security)

Rationale: We have simple RBAC (admin + standard users). RLS will enforce that users can only modify their own drafts and view their own badge applications; admins can view and act on submitted items. RLS is optional and can be toggled per-environment; below are suggested policies.

Assumptions:
- A `current_user_id()` Postgres function or setting via session variable `app.current_user_id` will be set by the application connection/session on every request.
- A session variable `app.is_admin` boolean will be set for admin sessions.

Enable RLS per table where needed:

- Users table
  - Policy (SELECT): allow users to SELECT their own row or allow admins to SELECT any row.
  - Policy (UPDATE): allow users to update only non-admin fields on their own row; admins can update `is_admin`.

- `badge_applications`
  - Policy (SELECT): allow if `applicant_id = current_user_id()` OR `app.is_admin = true`.
  - Policy (INSERT): allow if `applicant_id = current_user_id()` (app sets applicant_id server-side)
  - Policy (UPDATE): allow if `applicant_id = current_user_id()` AND status IN ('draft') for user edits; allow admins to UPDATE status and review fields when `app.is_admin = true`.
  - Policy (DELETE): disallow or restrict to admins only; prefer soft deletes by status change.

- `promotions`
  - Policy (SELECT): allow if `created_by = current_user_id()` OR `app.is_admin = true`.
  - Policy (INSERT): allow if `created_by = current_user_id()`.
  - Policy (UPDATE): allow if `created_by = current_user_id()` AND status = 'draft' for edits by owner; allow admins to UPDATE status to `approved`/`rejected` when `app.is_admin = true`.

- `promotion_badges`
  - Policy (SELECT): allow if linked promotion `created_by = current_user_id()` OR `app.is_admin = true`.
  - Policy (INSERT): allow if the promotion referenced is owned by `current_user_id()` or `app.is_admin = true` and badge application is `accepted`.
  - Policy (UPDATE): restrict modifications similar to `promotions` (owner may remove while draft; admins can toggle `consumed`).

Implementation notes:
- RLS policies require `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and policy creation using `CREATE POLICY ...` referencing `current_setting('app.current_user_id')::uuid` and `current_setting('app.is_admin')::boolean`.
- The application must set these session variables per connection or use prepared statements with `SET LOCAL` at transaction start.

---

5. Additional notes and design decisions

- Use UUIDs (pgcrypto `gen_random_uuid()` or `uuid_generate_v4()`) for all PKs for global uniqueness and client-side generation.
- Partial unique index on `promotion_badges` enforces optimistic reservation and prevents double-assignment of the same accepted badge to multiple unconsumed promotions — aligns with requirement to return a structured conflict error with owning promotion id when violated. Application should catch unique violation (SQLSTATE 23505) and translate to HTTP 409 with owning promotion link.
- Keep `catalog_badges.version` and store `catalog_badge_version` on `badge_applications` to preserve historical references even if badge definitions change.
- Do not store file attachments or audit history beyond minimal `audit_logs`; full audit/versioning is out of scope.
- Denormalize `path`, `from_level`, and `to_level` into `promotions` for read performance and simpler validation of template exact-match rules.
- `promotion_templates.rules` is JSONB to support flexible rule composition; canonical shape must be enforced by application using a JSON schema.
- Consider triggers:
  - On promotion approval: set `consumed = TRUE` for all `promotion_badges` belonging to that promotion and record `consumed` timestamp if desired.
  - On promotion rejection: set `consumed = FALSE` and remove the link (or delete promotion_badges rows) to unlock badges.
- Timezone: use `TIMESTAMPTZ` for all timestamps.
- Index and query patterns:
  - Catalog search will primarily use `category`, `level`, `status='active'`, and full-text on `title`. Keep queries covered by indexes for fast UI search.
