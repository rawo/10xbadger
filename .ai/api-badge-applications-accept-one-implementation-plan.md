# API Endpoint Implementation Plan: POST /api/badge-applications/:id/accept

## 1. Endpoint Overview

- Purpose: Mark an existing badge application as "accepted" by an administrator/reviewer. This finalizes the review decision, records acceptance metadata (who accepted it, when, and an optional note), and updates any downstream state required by the system (e.g., badge ownership, progression state, or promotion submission creation where applicable).
- Scope: Implementation-level guidance for the backend route handler, validation, service extraction, database update pattern, error handling, logging, and testing. Authentication/authorization is out-of-scope for this task and will be integrated later; placeholders are included where reviewer identity is required.

## 2. Request Details

- HTTP Method: POST
- URL Structure: `/api/badge-applications/:id/accept`
- Parameters:
  - Required:
    - `id` (path param): string (UUID or numeric id as used by `badge_applications.id`) — identifies the badge application to accept.
  - Optional:
    - Request body fields (JSON):
      - `decisionNote` (string, optional): free-text note from the reviewer explaining the decision.
      - `notifyApplicants` (boolean, optional, default false): whether to trigger applicant notification immediately. (Optional feature — can be implemented later.)
- Request Body: JSON, example:

```json
{
  "decisionNote": "Clear evidence and quality meet the bar.",
  "notifyApplicants": true
}
```

- Content-Type: `application/json`

Notes about `id` format: The concrete validation will match the database primary key type. If the DB uses UUIDs, validate against UUIDv4 regex; if numeric, validate number. Use the shared types in `src/types.ts` / `src/db/database.types.ts` as the source of truth.

## 3. Used Types (DTOs and Command Models)

- Command / Request DTOs
  - `AcceptBadgeApplicationCommand` (server-side command model):
    - `applicationId: string` (path param)
    - `decisionNote?: string`
    - `notifyApplicants?: boolean`
    - `reviewerId?: string` (populated from authenticated session later)

- Service DTOs / Domain types
  - `BadgeApplicationRecord` (existing DB row typing from `database.types.ts`)
  - `BadgeApplicationAcceptResult`:
    - `success: boolean`
    - `application: BadgeApplicationRecord | null`
    - `message?: string`

- Response DTOs
  - `AcceptBadgeApplicationResponse` (200):
    - `status: 'accepted'`
    - `applicationId: string`
    - `acceptedAt: string` (ISO timestamp)
    - `acceptedBy?: string`
    - `decisionNote?: string`

- Error DTOs
  - Use consistent error shape across API, e.g.: `{ error: { code: string, message: string, details?: any } }`.

## 4. Response Details

- 200 OK
  - Use when application was successfully accepted. Returns `AcceptBadgeApplicationResponse`.
- 201 Created
  - Not applicable for marking acceptances (no new resource created). If the accept action creates a new resource (e.g., promotion submission) and the team prefers to return that as created, return 201 and include location header. Otherwise, 200 is sufficient.
- 400 Bad Request
  - Input validation failed (malformed `id`, invalid JSON, `decisionNote` too long, etc.).
- 401 Unauthorized
  - Caller not authenticated (auth not implemented now; placeholder for future enforcement).
- 404 Not Found
  - No badge application exists with supplied `id`.
- 409 Conflict
  - The application is not in an accept-able state (already accepted, rejected, withdrawn) or concurrent update prevented acceptance.
- 500 Internal Server Error
  - Unexpected server-side failure (DB unavailable, unhandled exception).

Response examples:

Success 200:

```json
{
  "status": "accepted",
  "applicationId": "123e4567-e89b-12d3-a456-426614174000",
  "acceptedAt": "2025-10-30T12:34:56.789Z",
  "acceptedBy": "reviewer@example.com",
  "decisionNote": "Clear evidence and quality meet the bar."
}
```

Error 400 example:

```json
{ "error": { "code": "invalid_input", "message": "Invalid application id format" } }
```

## 5. Data Flow

1. HTTP POST request arrives at route `src/pages/api/badge-applications/[id]/accept.ts`.
2. Route handler extracts `id` from path, parses JSON body into `AcceptBadgeApplicationCommand`.
3. Input validation is performed (id format, lengths, allowed flags).
4. Handler calls `badgeApplicationService.acceptApplication(command)` — implement/extend `src/lib/badge-application.service.ts`.
   - `acceptApplication` responsibilities:
     - Confirm application exists.
     - Check current application state allows acceptance (e.g., `status === 'submitted'` or `status === 'pending_review'`).
     - Perform an atomic update to set `status = 'accepted'`, `accepted_by = reviewerId` (or placeholder), `accepted_at = now()`, `decision_note = command.decisionNote`.
     - Return the updated application record.
     - If downstream side effects are required (e.g., creating promotion submission record, awarding badge to user, enqueueing notifications), the service should either perform them within the same transaction (preferred) or return a follow-up job to be handled asynchronously by background worker.
5. Route handler maps service result to HTTP response and returns.

Database update pattern (recommended): single conditional UPDATE with RETURNING to ensure idempotency and detect conflicts.

SQL pattern (pseudo):

```sql
UPDATE badge_applications
SET status = 'accepted', accepted_by = $1, accepted_at = now(), decision_note = $2
WHERE id = $3 AND status = 'submitted'
RETURNING *;
```

- If RETURNING returns a row → success.
- If no rows → either 404 (no row with id) or 409 (exists but not in allowed pre-status); distinguish by querying existence first or by inspecting a prior select.

Transaction considerations:
- If performing additional writes (e.g., creating related `promotion_submissions`), group these writes in a single DB transaction to maintain consistency.
- If Supabase client cannot do multi-statement transaction conveniently, implement optimistic conditional updates or use a Postgres function/RPC for atomic behavior.

## 6. Security Considerations

- Authentication / Authorization (to add later):
  - Only users with reviewer/admin roles should accept applications. The service API should accept a `reviewerId` value derived from authentication middleware in the future.

- Validation & Input Sanitization:
  - Validate `id` shape strictly (UUID or integer). Reject malformed input (400).
  - Limit `decisionNote` length (e.g., max 5000 chars) and strip or escape control characters to avoid storing unintended characters.

- Data Integrity / Concurrency:
  - Use conditional UPDATE with status check to avoid race conditions where two reviewers try to accept the same application.
  - Return 409 Conflict when another action has already changed the status.

- Injection:
  - Use parameterized DB queries via the existing DB client (Supabase or pg) to avoid SQL injection.

- Exposure of Sensitive Data:
  - Response should not leak internal-only fields (e.g., full audit logs, internal IDs) unless intentionally required.

- Logging and Audit:
  - Record acceptance events in an audit log table (if present) or in the `badge_applications` audit columns. Ensure `accepted_by`, `accepted_at`, and `decision_note` are set.

## 7. Error Handling

- Centralize error shaping in the route handler to ensure consistent error responses.
- Use the existing `src/lib/error-logger.ts` to persist unexpected exceptions into an `errors` or `error_logs` table. Log:
  - request path and method
  - request body (sanitized — do not log PII)
  - stack trace
  - user id (when auth available)
- Map exceptions to HTTP status codes:
  - ValidationError -> 400
  - NotFoundError -> 404
  - ConflictError (state mismatch/optimistic lock) -> 409
  - DatabaseError/UnexpectedError -> 500 (and log via error-logger)

Potential error scenarios and handling:
- Invalid `id` format -> 400
- Missing request body / invalid JSON -> 400
- Application not found -> 404
- Application in non-acceptable state -> 409 (or 400 if you prefer a single client error)
- Database connectivity issues -> 500 (log and return generic message)
- Concurrent accept (no rows returned from conditional UPDATE) -> 409

## 8. Performance Considerations

- The accept operation is typically light (single-row update). Ensure:
  - Use indexed `id` column on `badge_applications`.
  - Keep side-effects asynchronous: if notify email or promotion creation is heavy, offload to background queue (e.g., serverless job or worker process) instead of blocking the request.
  - Avoid SELECT * if not needed — fetch only necessary columns.
  - If the route will be hit by many concurrent reviewers, rely on conditional UPDATE and indexes to scale.

## 9. Implementation Steps (Developer Checklist)

1. Create route handler file: `src/pages/api/badge-applications/[id]/accept.ts`
   - Use existing route pattern used by `submit.ts` for consistency.
   - Parse `id` from `params` and read JSON body.
   - Validate inputs and create `AcceptBadgeApplicationCommand`.
   - Call `badgeApplicationService.acceptApplication(command)`.
   - Map returned result to HTTP response and appropriate status code.
   - On unexpected exceptions, call `errorLogger.log(error, context)` and return 500.

2. Extend `src/lib/badge-application.service.ts` (or create if missing):
   - Add `acceptApplication(command: AcceptBadgeApplicationCommand)` method.
   - Responsibilities:
     - If `reviewerId` is required later, accept it as a parameter (for now can be `null` or a placeholder).
     - Execute conditional UPDATE with status check and RETURNING.
     - If additional side-effects are required, either execute them within a DB transaction or push to an asynchronous job.
     - Return typed `BadgeApplicationAcceptResult`.
   - Ensure method throws domain-specific errors (`NotFoundError`, `ConflictError`, `ValidationError`) for the route to map.

3. Database access patterns:
   - Use the Supabase client (`src/db/supabase.client.ts`) or a low-level `pg` client if transactions are required.
   - Implement the conditional UPDATE pattern to ensure idempotency and safe concurrent behavior.
   - If the app contains an audit table or change log, insert an audit row recording who accepted it and when.

4. Input validation and types:
   - Add or reuse validation rules in `src/lib/validation/` (e.g., reuse `badge-application.validation.ts`).
   - Validate `decisionNote` length and `notifyApplicants` boolean type.

5. Error logging
   - Use `src/lib/error-logger.ts` to log unexpected errors with context: path, method, params, sanitized body.
   - For domain errors, return mapped HTTP codes without logging stack traces as errors.

6. Tests
   - Add unit tests for `acceptApplication` in `src/lib/__tests__/badge-application.accept.spec.ts`:
     - success path: transitions status and writes accepted metadata.
     - invalid id path: returns NotFound.
     - invalid state path: returns Conflict.
     - concurrent update: simulate conditional update returning 0 rows and assert Conflict.
   - Add integration test for the endpoint in `src/pages/api/__tests__` to check full route behavior.

7. Linting & types
   - Ensure TypeScript types are used for DTOs and service signatures.
   - Run linter and fix any issues.

8. Documentation
   - Add an API doc entry in internal API spec (`@api-plan.md`) describing the endpoint, parameters, and sample responses.

9. Optional: Notifications & Side-effects
   - Implement a job enqueue (e.g., `notifications.enqueueApplicationDecision`) that triggers email or Slack notifications to applicants.
   - If creating other rows (e.g., `promotion_submissions`), prefer a DB transaction. If transaction is not feasible, document eventual consistency and retry policies.

## 10. Example Code Sketches (pseudocode / guidance)

Route handler (sketch):

```ts
// src/pages/api/badge-applications/[id]/accept.ts
import { json } from 'some-astro-adapter';
import { validateAcceptCommand } from '../../../lib/validation/badge-application.validation';
import { badgeApplicationService } from '../../../lib/badge-application.service';
import { errorLogger } from '../../../lib/error-logger';

export async function post({ params, request }) {
  try {
    const applicationId = params.id;
    const body = await request.json();

    const command = { applicationId, ...body };
    const { error } = validateAcceptCommand(command);
    if (error) return json({ error: { code: 'invalid_input', message: error.message } }, { status: 400 });

    const result = await badgeApplicationService.acceptApplication(command);
    return json({ status: 'accepted', applicationId: result.application.id, acceptedAt: result.application.accepted_at, acceptedBy: result.application.accepted_by, decisionNote: result.application.decision_note }, { status: 200 });
  } catch (err) {
    await errorLogger.log(err, { path: '/api/badge-applications/:id/accept', params });
    return json({ error: { code: 'internal_error', message: 'An unexpected error occurred' } }, { status: 500 });
  }
}
```

Service conditional update (sketch):

```ts
// inside badgeApplicationService
async function acceptApplication(command) {
  // validate existence
  const updated = await db
    .from('badge_applications')
    .update({ status: 'accepted', accepted_by: command.reviewerId || null, accepted_at: new Date(), decision_note: command.decisionNote })
    .eq('id', command.applicationId)
    .eq('status', 'submitted')
    .select('*')
    .single();

  if (!updated) throw new ConflictError('Application not in an accept-able state');
  return { success: true, application: updated };
}
```

## 11. Deliverables

- New file: `src/pages/api/badge-applications/[id]/accept.ts` (route handler)
- Service extension: `src/lib/badge-application.service.ts` with `acceptApplication` method
- Validation addition: `src/lib/validation/badge-application.validation.ts` (command validation)
- Unit & integration tests under `src/lib/__tests__` and `src/pages/api/__tests__`
- API documentation entry in `@api-plan.md`

## 12. Notes & Assumptions

- Assumes `badge_applications` table has columns: `id`, `status`, `accepted_by`, `accepted_at`, `decision_note` (if not, schema must be updated).
- Assumes `src/lib/badge-application.service.ts` exists and is the correct place for domain logic. If not present, create a new service file under `src/lib`.
- Authentication and identity (reviewer id) will be added via middleware later; current implementation should accept `reviewerId` from `command` or mark as `null` but leave the field settable by middleware later.
- Prefer atomic DB conditional update rather than separate SELECT + UPDATE to reduce race conditions.

---

Please implement according to the steps above and add tests to validate both happy and unhappy paths.
