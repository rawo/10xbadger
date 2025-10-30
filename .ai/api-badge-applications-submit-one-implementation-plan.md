# API Endpoint Implementation Plan: POST /api/badge-applications/:id/submit

## 1. Endpoint Overview

- Purpose: Transition a badge application from a draft state to submitted, record submission metadata (timestamp, submitted_by if applicable), and enforce business rules and validation before submitting. The endpoint performs ownership checks, ensures the application is in a deletable/submit-able state (e.g., `draft`), validates required fields for submission, and triggers any side-effects (audit event, notifications).
- Method: POST
- Route: `/api/badge-applications/:id/submit`

## 2. Request Details

- HTTP Method: POST
- URL Structure: `/api/badge-applications/:id/submit`

- Parameters:
  - Required:
    - `id` (path) — UUID of the badge application to submit
  - Optional:
    - None in the current spec. (No query params or request body expected; server uses stored application data.)

- Request Body: none (submission is an action applied to an existing resource)

## 3. Used Types

- `BadgeApplicationRow` — DB row shape for `badge_applications`
- `BadgeApplicationDetailDto` — returned full DTO for the application (optional as response)
- `SubmitBadgeApplicationCommand` (internal command model):
  - `id: string` (path)
  - `requesterId?: string` (from context.locals for future auth)
  - `isAdmin?: boolean` (from context.locals)

- Error codes: use domain errors thrown by service: `NOT_FOUND`, `FORBIDDEN`, `INVALID_STATUS_TRANSITION`, `VALIDATION_ERROR`, and `DB_ERROR` / generic errors.

## 4. Response Details

- 200 OK
  - Returned when the submission succeeds. Response body contains the updated application DTO (full details) or a minimal success payload: `{ "id": "<uuid>", "status": "submitted", "submitted_at": "<iso>" }`.
- 400 Bad Request
  - When input validation fails (invalid UUID, missing required application fields for submission).
- 403 Forbidden
  - When the requester is not allowed to submit the application (not owner and not admin), or when business rules disallow submission for the current status.
- 404 Not Found
  - When the application with given `id` does not exist.
- 500 Internal Server Error
  - For unexpected server/database errors.

Response example (200):

{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "submitted",
  "submitted_at": "2025-10-30T12:34:56.000Z"
}

## 5. Data Flow

1. Route handler receives POST `/api/badge-applications/:id/submit`.
2. Validate `id` path param as UUID using existing `uuidParamSchema` (Zod).
3. Construct `SubmitBadgeApplicationCommand` with `id` and development `requesterId` / `isAdmin` defaults; when auth is added, populate from `context.locals`.
4. Call `BadgeApplicationService.submitBadgeApplication(id, requesterId, isAdmin)`.
5. Service flow:
   - Fetch minimal application row: `id, applicant_id, status, catalog_badge_id, date_of_application, date_of_fulfillment, reason` (as needed for validation).
   - If not found -> throw `NOT_FOUND`.
   - Authorization: if not `isAdmin` and `applicant_id !== requesterId` -> throw `FORBIDDEN`.
   - Validate current status: only allow submission when `status === 'draft'` (business rule). If not, throw `INVALID_STATUS_TRANSITION`.
   - Validate required fields for submission (e.g., `catalog_badge_id` exists and is active, `date_of_application` present and valid). Use existing `catalog_badges` check like in `createBadgeApplication`/`updateBadgeApplication` to verify `catalog_badge_id` and its `status` and capture `catalog_badge_version` if needed.
   - Set `status = 'submitted'`, set `submitted_at = new Date().toISOString()`.
   - Update DB row using Supabase: `.from('badge_applications').update(updateData).eq('id', id).select().single()`.
   - If DB update returns error, map to domain error or throw generic.
   - Fetch full application details using `getBadgeApplicationById(id)` and return to caller.
6. Handler maps domain errors to HTTP responses and returns 200 with updated DTO on success.
7. Side effects:
   - Insert an audit/event row in `audit_logs` or `events` (recommended) with action `submit_badge_application` and metadata.
   - Optionally, enqueue a notification (email/slack) via events table or background worker.

Transaction notes:
- Prefer single UPDATE call to change status and set `submitted_at` to minimize race windows. If additional checks need to be atomic (e.g., verifying catalog badge activity and update), wrap in transaction or perform safe conditional checks and re-validate after update as necessary.

## 6. Security Considerations

- Authentication/authorization: currently disabled for development. Design to accept `requesterId` and `isAdmin` from `context.locals` so auth can be added later.
- Input validation: strictly validate `id` as UUID using Zod `uuidParamSchema`.
- Ownership checks: owners can submit their own drafts; admins can submit any application (subject to business rules).
- State transition safety: enforce server-side checks to avoid invalid transitions and race conditions; rely on DB where possible.
- Data exposure: return only non-sensitive fields; avoid including PII like applicant email in success payloads unless required.
- Logging: do not log sensitive user info; record only IDs and non-sensitive metadata.

## 7. Error Handling

- Domain-to-HTTP mapping:
  - `NOT_FOUND` -> 404
  - `FORBIDDEN` -> 403
  - `INVALID_STATUS_TRANSITION` -> 400 (or 409 depending on team preference; use 400 for validation semantics)
  - `VALIDATION_ERROR` -> 400
  - DB constraint/failure -> 500 (log to `error_logs`)

- Logging strategy:
  - For expected domain errors, return structured JSON error and do not write to `error_logs`.
  - For unexpected server errors, write structured log to `error_logs` using `logError(supabase, { route, error_code, message, payload, requester_id })`.
  - Keep logs minimal and scrub any PII.

## 8. Performance Considerations

- The operation is low-cost (single-row read + update). Use minimal selects to reduce payload.
- Avoid fetching full DTO unless returning it; use `getBadgeApplicationById` after update only if full DTO is required in response.
- If submit triggers heavy side-effects (notifications), push them to an asynchronous job or insert into an `events` table for background processing.

## 9. Implementation Steps

1. Add new service method
   - File: `src/lib/badge-application.service.ts`
   - Add:
     ```ts
     async submitBadgeApplication(id: string, requesterId?: string, isAdmin = false): Promise<BadgeApplicationDetailDto> { ... }
     ```
   - Implementation details:
     - Minimal select to fetch `id, applicant_id, status, catalog_badge_id, date_of_application, date_of_fulfillment, reason`.
     - Throw `NOT_FOUND` if no row.
     - If not admin and `applicant_id !== requesterId`, throw `FORBIDDEN`.
     - If `status !== 'draft'`, throw `INVALID_STATUS_TRANSITION`.
     - Validate required submission fields:
       - If `catalog_badge_id` missing -> throw `VALIDATION_ERROR` with details.
       - Verify `catalog_badge` exists and `status === 'active'` (reuse existing logic from `createBadgeApplication`). If missing/inactive -> throw `VALIDATION_ERROR` with code `CATALOG_BADGE_NOT_FOUND` or `CATALOG_BADGE_INACTIVE`.
     - Prepare update: `{ status: 'submitted', submitted_at: new Date().toISOString() }` and include `catalog_badge_version` if capturing version at submit time.
     - Execute update via Supabase `.update(updateData).eq('id', id).select().single()`.
     - On update error, map or throw generic error.
     - Fetch full details using `getBadgeApplicationById(id)` and return.
     - Insert audit/event: `.from('audit_logs').insert({ action: 'submit_badge_application', resource: 'badge_applications', resource_id: id, requester_id: requesterId, meta: {...} })` (best-effort).

2. Add route handler
   - File: `src/pages/api/badge-applications/[id]/submit.ts` (create new file to mirror route)
   - Handler: `export const POST: APIRoute = async (context) => { ... }`
   - Steps in handler:
     - Development defaults: `isAdmin = false`, `requesterId = default-dev-id`.
     - Validate `id` with `uuidParamSchema.safeParse({ id })`.
     - Call service: `await new BadgeApplicationService(context.locals.supabase).submitBadgeApplication(id, requesterId, isAdmin)`.
     - Map errors to HTTP responses per mapping above.
     - On success, return 200 with updated DTO or minimal success payload.

3. Input validation
   - Use existing `uuidParamSchema` from `src/lib/validation/catalog-badge.validation.ts`.
   - In service, validate any required application fields and catalog badge existence.

4. Logging and error persistence
   - Use `src/lib/error-logger.ts` `logError` helper to persist unexpected errors.
   - For unexpected errors, call `await logError(context.locals.supabase, { route: '/api/badge-applications/:id/submit', error_code: 'INTERNAL_ERROR', message: String(err), payload: { id }, requester_id: requesterId })`.

5. Tests
   - Unit tests for `submitBadgeApplication` with mocked Supabase client to cover:
     - Success path (draft -> submitted)
     - Not found
     - Forbidden (not owner)
     - Invalid status
     - Catalog badge not found/inactive
     - DB error
   - Integration test for POST route that exercises validation and response mapping.

6. Documentation
   - Update API docs (`@api-plan.md`) to include the new POST route, required preconditions for submission, and sample responses.

7. Optional: Soft-submit vs hard submit
   - If team prefers to keep submission reversible or audit-friendly, consider adding `submitted_by` and `submitted_at` and keeping the row instead of an irreversible state; design accordingly.

## 10. Error Scenarios and Status Codes (concise)

- Invalid UUID -> 400
- Not found -> 404
- Forbidden (not owner) -> 403
- Invalid status transition (not draft) -> 400
- Missing/invalid catalog badge -> 400 (with `CATALOG_BADGE_NOT_FOUND` / `CATALOG_BADGE_INACTIVE`)
- DB failure / unexpected -> 500

---

Save file: `.ai/api-badge-applications-submit-one-implementation-plan.md`
