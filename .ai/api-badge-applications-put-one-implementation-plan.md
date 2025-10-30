# API Endpoint Implementation Plan: PUT /api/badge-applications/:id

## 1. Endpoint Overview
The endpoint updates an existing badge application identified by `:id`. It supports partial updates to application fields (e.g., dates, reason), status transitions (e.g., `draft` -> `submitted`, admin review actions), and catalog badge changes (capturing version snapshot). The implementation focuses on development-mode behavior (authentication disabled) but enforces ownership and role-based rules consistent with DB policies.

## 2. Request Details
- **HTTP Method**: PUT
- **URL Structure**: `/api/badge-applications/:id`
- **Parameters**:
  - **Required**: `id` (path) — UUID of the badge application
  - **Optional**: none in path/query
- **Request Body (JSON)**: Partial object matching `UpdateBadgeApplicationCommand` (see Used Types). Fields allowed:
  - `catalog_badge_id` (UUID, optional)
  - `date_of_application` (YYYY-MM-DD, optional)
  - `date_of_fulfillment` (YYYY-MM-DD, optional)
  - `reason` (string, optional)
  - `status` (enum: draft | submitted | accepted | rejected | used_in_promotion) (optional)
  - `review_reason` (string, optional; used by admins when approving/rejecting)

Behaviour notes:
- The endpoint performs partial updates; absent fields are left unchanged.
- If `catalog_badge_id` is provided, the catalog badge must exist and be `active`; the service captures the `catalog_badge_version` at update time.
- Date validation: if both `date_of_application` and `date_of_fulfillment` are present, `date_of_fulfillment` must be >= `date_of_application`.
- Status transitions are validated to prevent invalid transitions. Owner can submit (`draft` -> `submitted`); admin handles review transitions (e.g., `submitted` -> `accepted`/`rejected`).

## 3. Used Types
- `UpdateBadgeApplicationCommand` (DTO) — partial fields allowed for update.
- `BadgeApplicationDetailDto` — response DTO (full application details with nested catalog and applicant info).
- `ApiError` — standard error response shape used across routes.

## 4. Response Details
- **200 OK**: Successfully updated; returns full `BadgeApplicationDetailDto` JSON.
- **400 Bad Request**: Validation failure or invalid business rule (e.g., catalog badge inactive, invalid date ordering, invalid status transition).
- **403 Forbidden**: Authorization failure (non-owner/non-admin trying to modify, or owner attempting disallowed action such as editing non-draft).
- **404 Not Found**: Application not found.
- **500 Internal Server Error**: Unexpected server error.

## 5. Data Flow
1. Route handler validates path `id` (UUID) and request body using Zod `updateBadgeApplicationSchema`.
2. Route constructs `UpdateBadgeApplicationCommand` and calls `BadgeApplicationService.updateBadgeApplication(id, command, userId, isAdmin)`.
3. Service fetches existing application, enforces authorization rules, validates catalog badge if changing, enforces status transition rules and date invariants, computes derived fields (e.g., `catalog_badge_version`, `submitted_at`, `reviewed_at`, `reviewed_by`), and writes update to DB.
4. Service returns the updated full application via `getBadgeApplicationById(id)`, which route returns to caller.
5. Route maps service errors to appropriate HTTP responses.

## 6. Security Considerations
- Authentication is out-of-scope for this development task, but code must honor ownership checks (owner vs admin) using `userId` and `isAdmin` flags (development defaults used until auth is implemented).
- Use parameterized Supabase client calls (no string interpolation) and validate all inputs with Zod to prevent injection and malformed data.
- Enforce DB RLS assumptions: owners may only edit drafts, admins may perform review actions; ensure route and service checks match database policies to avoid inconsistent behavior when auth is wired up.

## 7. Error Handling
- Map service error codes/messages to API responses:
  - `NOT_FOUND` -> 404
  - `FORBIDDEN` -> 403
  - `CATALOG_BADGE_NOT_FOUND` -> 400 (validation error with `catalog_badge_id` field detail)
  - `CATALOG_BADGE_INACTIVE` -> 400
  - `INVALID_STATUS_TRANSITION` -> 400
  - Generic DB errors -> 500
- Log unexpected errors server-side using `console.error` (or integrate with the app's audit/logging service later). Consider inserting audit log rows for admin review actions.

## 8. Performance
- Single-row reads/updates; ensure updates use `.eq('id', id)` and return the updated row with `.select().single()` to avoid extra round-trips where possible.
- When validating catalog badge existence, fetch only required fields (`id`, `version`, `status`) to minimize payload.

## 9. Implementation Steps
1. Add `updateBadgeApplicationSchema` and `UpdateBadgeApplicationCommand` to `src/lib/validation/badge-application.validation.ts`.
2. Add `updateBadgeApplication` method to `src/lib/badge-application.service.ts` with the following behavior:
   - Fetch existing application; throw `NOT_FOUND` if missing.
   - Authorization: If not admin and `applicant_id !== userId` -> throw `FORBIDDEN`.
   - If not admin and `status` of existing application !== 'draft' -> throw `FORBIDDEN` (owners may only edit drafts).
   - If `catalog_badge_id` provided -> validate existence and `status === 'active'`; capture `catalog_badge_version`.
   - Validate `date_of_fulfillment >= date_of_application` when both present.
   - Validate status transitions: allow `draft`->`submitted` by owner and admin-review transitions by admins; set `submitted_at`, `reviewed_by`, `reviewed_at` appropriately.
   - Perform `update` via Supabase and return full application details using `getBadgeApplicationById`.
3. Implement `PUT` handler in `src/pages/api/badge-applications/[id].ts`:
   - Validate path `id` (UUID) using `uuidParamSchema`.
   - Parse JSON body, validate with `updateBadgeApplicationSchema`.
   - Call `service.updateBadgeApplication(...)` and handle known errors, returning appropriate status codes.
4. Add unit/integration tests (future): test ownership restrictions, catalog badge validation, status transitions, and date validation.
5. Run linter and fix any style/type issues.

---

Saved as `.ai/api-badge-applications-put-one-implementation-plan.md`.
