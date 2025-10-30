# API Endpoint Implementation Plan: DELETE /api/badge-applications/:id

## 1. Endpoint Overview

- Purpose: Permanently delete a badge application by its UUID. This endpoint removes the `badge_applications` row and ensures related integrity constraints are respected (e.g., preventing deletion if referenced by promotion submissions or other critical relations). It enforces ownership and role rules at the service layer (owners can delete their drafts; admins can delete any application unless blocked by business rules).
- Method: DELETE
- Route: `/api/badge-applications/:id`

## 2. Request Details

- HTTP Method: DELETE
- URL Structure: `/api/badge-applications/:id`

- Parameters:
  - Required:
    - `id` (path) — UUID of the badge application to delete
  - Optional:
    - None in current spec. (Query params not accepted)

- Request Body: None

## 3. Used Types

- `BadgeApplicationRow` (DB row type)
- `BadgeApplicationDetailDto` (for pre-deletion checks / responses when needed)
- `DeleteBadgeApplicationCommand` (internal command model — simple wrapper with `id: string` and `requesterId?: string` and `isAdmin?: boolean`)

Note: `DeleteBadgeApplicationCommand` will be an internal TypeScript type used by the service — not a request payload type since the endpoint uses path param.

## 4. Response Details

- 200 OK
  - When deletion succeeds. Return minimal JSON payload: `{ "id": "<deleted-id>", "deleted": true }` or 204 No Content (team choice). Per existing project patterns, return 200 with JSON for clarity.
- 400 Bad Request
  - When `id` is missing or invalid UUID format.
- 401 Unauthorized
  - (Ignored for now per user instruction; wire for future.)
- 403 Forbidden
  - When the user is not the owner and not an admin (enforce later when auth added). Also for business-rule-forbidden deletions (e.g., cannot delete a submitted/accepted application when policy forbids).
- 404 Not Found
  - When the `id` does not exist.
- 409 Conflict
  - When the application cannot be deleted because it's referenced by other resources (e.g., already used in a promotion) — alternatively 400/422; prefer 409 for concurrency/foreign-key semantics.
- 500 Internal Server Error
  - Unexpected DB failures or unhandled exceptions

Response JSON schema (200):

{
  "id": "string",
  "deleted": true
}

## 5. Data Flow

1. Route handler extracts `id` from path and validates UUID format.
2. Handler constructs `DeleteBadgeApplicationCommand` with `id`, `requesterId` (if available from request context), and `isAdmin` flag (false for now).
3. Handler calls `BadgeApplicationService.deleteBadgeApplication(command)`.
4. Service performs:
   - Fetch existing application by `id` (via `getBadgeApplicationById` or direct select). If not found, throw `NOT_FOUND`.
   - Business-rule checks:
     - If non-admin and requester is not owner -> throw `FORBIDDEN`.
     - If application status is not deletable (e.g., `submitted`, `accepted`, or `used_in_promotion`) -> throw `FORBIDDEN` or `CONFLICT` depending on rule.
     - Check for dependent references (e.g., `promotion_submissions` or other relations). If references exist, throw `CONFLICT` (or provide guidance).
   - Perform deletion using Supabase: `.from('badge_applications').delete().eq('id', id).single()` within a transaction if multiple DB operations are required.
   - If delete returns a DB error indicating FK violation, translate to 409 CONFLICT with a clear message.
5. Handler maps service result to HTTP response.
6. If applicable, log deletion event to `audit`/`events` table (recommended) and/or write to `error_logs` on failure.

Transaction notes:
- If the deletion requires cascading business logic (e.g., updating counters, removing attachments), perform in a DB transaction or serially with compensating rollback on error.

## 6. Security Considerations

- Authentication/authorization: currently excluded; design the handler to accept `requesterId` and `isAdmin` from `context.locals` when auth is added.
- Input validation: strictly validate `id` as UUID using Zod or a lightweight UUID regex to prevent SQL injection and accidental bad queries.
- Principle of least privilege: ensure DB role used by Supabase has only necessary permissions; rely on DB RLS for fine-grained control when auth integrated.
- Race conditions: Use DB-level checks (e.g., `DELETE ... WHERE id = $1 AND ...`) to prevent deleting an application that changed state between fetch and delete; prefer single-statement conditional delete where possible and check affected rows.
- Logging: Do not log PII such as applicant email. Log identifiers and error codes only.

## 7. Error Handling

- Map service error strings/exceptions to HTTP codes:
  - `NOT_FOUND` -> 404
  - `FORBIDDEN` -> 403
  - `CATALOG_BADGE_INACTIVE` / `INVALID_STATUS_TRANSITION` -> 400 (not directly relevant to delete but keep mapping)
  - `REFERENCED_BY_PROMOTION` -> 409
  - DB error with FK violation -> 409
  - Validation/Zod errors -> 400
  - Any other thrown Error -> 500 and log to error table

- Logging strategy:
  - Structured error logging to console and to an `error_logs` table with columns: `id`, `created_at`, `route`, `error_code`, `message`, `payload` (JSON), `requester_id`.
  - On DB-level failures, include Supabase error message but scrub sensitive DB details.

## 8. Performance Considerations

- The deletion operation is single-row and should be cheap.
- Avoid fetching heavy nested data unnecessarily — use a targeted select for ownership/status checks instead of full DTO unless needed.
- For checks against dependent tables, use `EXISTS` style queries rather than full joins to minimize data transfer.
- If deletions are frequent, consider an asynchronous soft-delete pattern (mark `deleted_at`) and background job for hard cleanup to reduce contention and preserve audit trail.

## 9. Implementation Steps

1. Route handler
   - File: `src/pages/api/badge-applications/[id].ts` (exists; add DELETE handler alongside GET/PUT)
   - Extract `id` from `params` and validate UUID using `z.string().uuid()` or `validateUuid()` helper.
   - Prepare context values: `const supabase = context.locals.supabase; const requesterId = context.locals.user?.id ?? null; const isAdmin = context.locals.user?.isAdmin ?? false;` (placeholders until auth added).
   - Call `BadgeApplicationService.deleteBadgeApplication(id, requesterId, isAdmin)` and map returned result to HTTP 200.
   - Catch thrown errors and convert to HTTP responses as per mapping above.

2. Service method
   - Add new method to `src/lib/badge-application.service.ts`:
     ```ts
     async deleteBadgeApplication(id: string, requesterId?: string, isAdmin = false): Promise<{ id: string }>
     ```
   - Implementation outline:
     - Perform a minimal select: `select('id, applicant_id, status')` where `id`.
     - If no row -> throw `NOT_FOUND`.
     - If not isAdmin and `applicant_id !== requesterId` -> throw `FORBIDDEN`.
     - If business rule prevents deletion (status !== 'draft' etc.) -> throw `FORBIDDEN` or `REFERENCED_BY_PROMOTION`.
     - Check for external references: e.g., `promotion_submissions` table: `select('id').from('promotion_submissions').eq('badge_application_id', id).limit(1)`; if exists throw `REFERENCED_BY_PROMOTION`.
     - Attempt delete: `this.supabase.from('badge_applications').delete().eq('id', id).single()`.
     - If DB returns FK error or other error, translate to domain error.
     - Return `{ id }` on success.

3. Validation
   - Add a small Zod schema in `src/lib/validation/` or reuse an existing helper for UUID validation.
   - Validate `id` in the route before calling service; return 400 on invalid UUID.

4. Logging and Errors
   - Add `try/catch` in service to wrap Supabase calls. On unexpected errors, log structured entry and rethrow a generic Error.
   - Add a small utility in `src/lib/utils.ts` to write to `error_logs` table if it exists; call when catching 500-level errors.

5. Tests (manual/unit)
   - Unit-test the service method with mocked Supabase client for scenarios: found & deleted, not found, forbidden, referenced by promotion, DB error.
   - Integration test hitting the route with router (if test infra available).

6. Documentation
   - Update API spec doc (`@api-plan.md`) to include DELETE route behavior, allowed statuses for deletion, and response examples.

7. Todo & cleanup
   - If team prefers soft-delete: implement `deleted_at` timestamp update instead of hard delete and update all checks accordingly.

## 10. Error Scenarios and Status Codes (detailed)

- Invalid UUID: 400
  - Message: `"Invalid id format; expected UUID"`
- Not found: 404
  - Message: `"Badge application not found"`
- Forbidden (ownership or business rule): 403
  - Message examples: `"Forbidden: only owner or admin can delete"`, `"Cannot delete submitted/accepted application"`
- Conflict (referenced by promotion or FK violation): 409
  - Message: `"Cannot delete: application referenced by promotion submission"`
- DB failure / unexpected: 500
  - Message: `"Internal server error"` and log details server-side

## Appendix: Example Implementation Snippets (pseudo)

- Handler (simplified):

```ts
// src/pages/api/badge-applications/[id].ts
import { z } from 'zod';
export async function del({ params, context }) {
  const idSchema = z.string().uuid();
  try {
    const id = idSchema.parse(params.id);
    const service = new BadgeApplicationService(context.locals.supabase);
    const result = await service.deleteBadgeApplication(id, context.locals.user?.id, context.locals.user?.isAdmin);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    // map errors -> response codes
  }
}
```

- Service (simplified):

```ts
async deleteBadgeApplication(id: string, requesterId?: string, isAdmin = false) {
  const { data: row, error: fetchErr } = await this.supabase.from('badge_applications').select('id, applicant_id, status').eq('id', id).single();
  if (fetchErr) if (fetchErr.code === 'PGRST116') throw new Error('NOT_FOUND'); else throw fetchErr;

  if (!isAdmin && row.applicant_id !== requesterId) throw new Error('FORBIDDEN');
  if (row.status !== 'draft') throw new Error('FORBIDDEN');

  // check references
  const { data: refs } = await this.supabase.from('promotion_submissions').select('id').eq('badge_application_id', id).limit(1);
  if (refs && refs.length) throw new Error('REFERENCED_BY_PROMOTION');

  const { error: delErr } = await this.supabase.from('badge_applications').delete().eq('id', id).single();
  if (delErr) {
    // map FK violation -> CONFLICT
    throw new Error(`Failed to delete: ${delErr.message}`);
  }
  return { id };
}
```

---

File created: `.ai/api-badge-applications-delete-one-implementation-plan.md`
