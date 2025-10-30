# API Endpoint Implementation Plan: POST /api/badge-applications/:id/reject

## 1. Endpoint Overview

- Purpose: Mark a badge application as rejected, record the rejection reason, reviewer, and timestamp, persist the change, and record an audit/event entry. Notification to applicant is optional and handled asynchronously.
- HTTP Method: POST
- URL: `/api/badge-applications/:id/reject`

## 2. Request Details

- HTTP Method: POST
- URL Structure: `/api/badge-applications/:id/reject`
- Parameters:
  - Required:
    - `id` (path param) — UUID of the badge application to reject
  - Optional (request body):
    - `reason` (string) — human-friendly rejection reason; max length 2000 chars
    - `notifyApplicant` (boolean) — whether to send a notification to the applicant (default: true)
    - `metadata` (object) — optional extra context, shallow object only

- Request Body (JSON example):

```json
{
  "reason": "Does not meet criteria X",
  "notifyApplicant": true,
  "metadata": { "reviewRound": 1 }
}
```

## 3. Used Types

- `RejectBadgeApplicationRequestDTO` (incoming HTTP DTO)
  - `reason?: string`
  - `notifyApplicant?: boolean`
  - `metadata?: Record<string, any>`

- `RejectBadgeApplicationCommand` (service command)
  - `applicationId: string`
  - `rejectionReason?: string`
  - `rejectedBy?: string | null` (populated by auth later)
  - `notifyApplicant: boolean`
  - `metadata?: Record<string, any>`

- `BadgeApplicationDTO` (existing domain DTO) — at minimum includes `id`, `status`, `rejection_reason`, `rejected_at`, `reviewer_id`, `updated_at`.

- `BadgeApplicationEvent` / `AuditEvent` model for history records (fields: `id`, `application_id`, `event_type`, `payload`, `created_at`, `actor_id`).

## 4. Response Details

- Successful response (200):
  - Body: updated `BadgeApplicationDTO` (or minimal success envelope with `id`, `status`, `rejected_at`, `rejection_reason`).

- Status codes:
  - 200 OK — rejection succeeded and updated resource returned
  - 201 Not used (no resource created)
  - 400 Bad Request — invalid input (bad UUID, invalid body schema, too-long reason)
  - 401 Unauthorized — reserved for auth (not implemented now)
  - 404 Not Found — application not found
  - 409 Conflict — application already in terminal state or concurrent state change
  - 500 Internal Server Error — unexpected failure

## 5. Data Flow

1. Handler receives `POST /api/badge-applications/:id/reject`.
2. Handler parses and validates:
   - `id` is present and is a valid UUID.
   - Request body conforms to `RejectBadgeApplicationRequestDTO` (types, lengths).
3. Map DTO → `RejectBadgeApplicationCommand` (set `notifyApplicant` default true).
4. Call `BadgeApplicationService.rejectApplication(command)`.
   - Service loads application row by id.
   - Validate business rules (exists, current status allows rejection).
   - Start DB transaction.
     - Update `badge_applications`:
       - `status` → `'rejected'` (use canonical enum value)
       - `rejection_reason` → command.rejectionReason (nullable)
       - `rejected_at` → now()
       - `reviewer_id` → command.rejectedBy (nullable)
       - `updated_at` → now()
     - Insert `badge_application_events` row: `event_type='rejected'`, payload includes `{ reason, metadata }`, actor id and timestamp.
   - Commit transaction.
   - If `notifyApplicant` true, enqueue notification via `NotificationService` / background job (non-blocking for the request response).
5. Service returns updated application DTO to handler.
6. Handler responds 200 with updated DTO.

Notes on DB interactions:
- Use parameterized queries or ORM transaction APIs provided by existing DB layer (Supabase/pg client or ORM) to prevent injection.
- Consider optimistic locking: check `updated_at` or `version` to detect concurrent modifications; if mismatch, return 409.

## 6. Security Considerations

- Authentication & Authorization: out of scope for implementation now, but the design must keep a `rejectedBy` field in the command and DB and enforce later.
- IDOR risk: when auth is added, ensure the caller has permission to reject the specific application (same org/team).
- SQL injection: use parameterized queries / ORM only.
- Payload size limits: cap `reason` length and `metadata` size; validate types strictly.
- Concurrency: guard against concurrent approve/reject by checking current status in transaction and returning 409 on mismatch.
- Rate limiting & abuse: ensure upstream rate limiting prevents mass rejections.

## 7. Error Handling

- Validation errors (400): return JSON with `error` and `details` (e.g., field errors). Example: invalid UUID, invalid `notifyApplicant` type, `reason` too long.
- Not Found (404): when application id does not exist.
- Conflict (409): when application is in terminal state or concurrent update detected.
- Server errors (500): on DB errors or unexpected exceptions — log error (stack + context) into `errors` table and return generic message to client.

Error logging to `errors` table (if available):
- Fields to write: `context` ("reject-badge-application"), `reference_id` (application id), `actor_id` (if available), `message`, `stack` (truncate), `payload` (truncated input DTO), `created_at`.
- Only log full stack for unexpected server errors. For domain errors like 404 or 409, log a concise record (info level) but avoid noise.

## 8. Performance Considerations

- Transactions are minimal and update small rows — should be fast.
- Insert into events table is cheap but consider batching or partitioning if event volume is high.
- Notification sending must be asynchronous to avoid blocking request; use job queue or background worker.
- Indexes: ensure `badge_applications.id` is primary key and `badge_application_events.application_id` is indexed for audit queries.

## 9. Implementation Steps (developer checklist)

1. Add DTOs/types:
   - `RejectBadgeApplicationRequestDTO` (HTTP layer)
   - `RejectBadgeApplicationCommand` (service layer)

2. Add service method:
   - Create or extend `src/lib/services/badgeApplicationService.ts` (or similar) with `async rejectApplication(command)` implementing DB transaction and event insert.

3. Add handler/controller:
   - Create endpoint `src/pages/api/badge-applications/[id]/reject.ts` (or match project routing conventions).
   - Parse path param `id`, parse & validate body, map to command, call service, return 200 with DTO.

4. Validation:
   - Add request validation using existing validation utilities (or zod) with clear error messages and length limits.

5. DB migrations (if schema changes needed):
   - Confirm `badge_applications` has fields: `rejection_reason TEXT NULL`, `rejected_at TIMESTAMP NULL`, `reviewer_id UUID NULL`.
   - Ensure `badge_application_events` exists with `event_type`, `payload` (jsonb), `actor_id`, and `created_at`.

6. Notifications:
   - Wire to existing `NotificationService` or queue; make notification enqueue non-blocking.

7. Error logging:
   - Use existing `ErrorsRepository` or write to `errors` table on server errors with context.

8. Tests:
   - Unit tests for service: success path, invalid state, non-existent id, concurrent update (simulate conflict).
   - Integration test for endpoint: 400 on invalid input, 404 not found, 200 success with DB assertions, 409 conflict.

9. Lint & run lints: ensure no new linter errors.

10. Documentation: update API docs (`/docs` or README) and change-log.

## 10. Example Pseudocode (handler → service)

Handler (outline):

```ts
// parse id
// validate body
const cmd = { applicationId: id, rejectionReason: body.reason, notifyApplicant: body.notifyApplicant ?? true };
const updated = await badgeApplicationService.rejectApplication(cmd);
res.status(200).json(updated);
```

Service transaction (outline):

```ts
await db.transaction(async (tx) => {
  const app = await tx('badge_applications').where({ id: command.applicationId }).first();
  if (!app) throw NotFoundError;
  if (!canBeRejected(app.status)) throw ConflictError;
  await tx('badge_applications').where({ id }).update({ status: 'rejected', rejection_reason: command.rejectionReason, rejected_at: now(), reviewer_id: command.rejectedBy, updated_at: now() });
  await tx('badge_application_events').insert({ application_id: id, event_type: 'rejected', payload: { reason: command.rejectionReason, metadata: command.metadata }, actor_id: command.rejectedBy, created_at: now() });
});
if (command.notifyApplicant) enqueueNotification(...);
```

## 11. Notes / Assumptions

- Assumed DB tables/columns: `badge_applications` (id PK, status, rejection_reason, rejected_at, reviewer_id, updated_at) and `badge_application_events` (id, application_id, event_type, payload jsonb, actor_id, created_at).
- Auth is out of scope; `rejectedBy` is currently nullable and will be wired when authentication/authorization is added.
- Use existing project conventions for services, repositories, validation, errors, and background jobs.

---

Implementors should follow this plan, adapt names to existing code conventions, and confirm DB schema before coding. All changes should include unit and integration tests and avoid introducing linter errors.


