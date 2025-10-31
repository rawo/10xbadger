# API Endpoint Implementation Plan: PUT /api/promotion-templates/:id

## 1. Endpoint Overview

- Purpose: Update an existing promotion template by id. The endpoint accepts a JSON payload with fields to update on the promotion template resource and returns the updated resource on success.
- Behavior: Validate input, check existence of the promotion template, apply changes in a database transaction, run domain-level validation (business rules), persist changes, and return the updated template. Log errors to the error table when server-side failures occur.

## 2. Request Details

- HTTP Method: PUT
- URL Structure: `/api/promotion-templates/:id`
- Path Parameters:
  - `id` (required): string UUID of the promotion template to update

- Query Parameters: None

- Request Body (JSON): Partial or full `PromotionTemplate` fields to update. Minimal required body should include at least one updatable field. Expected structure (example):

```json
{
  "name": "Senior Software Engineer Promotion",
  "description": "Template for senior promotion submissions",
  "isActive": true,
  "sections": [
    {
      "title": "Summary",
      "content": "Updated guidance..."
    }
  ]
}
```

- Required fields: `id` path param. The body must contain at least one field to update.
- Optional fields: Any updatable fields defined by the `PromotionTemplate` model (e.g., `name`, `description`, `isActive`, `sections`, `metadata`, `updatedBy`).

Validation rules for fields (implement using the existing validation utilities):
- `name`: optional, non-empty string, max length 255
- `description`: optional, string, max length 4000
- `isActive`: optional, boolean
- `sections`: optional, array of section objects; each section must have `title` (non-empty string) and `content` (string)
- `metadata`: optional, plain object with string keys and primitive values

Reject request with 400 if:
- `id` is not a valid UUID
- Request body is empty (no updatable fields)
- Any of the field-specific validation rules fail

## 3. Used Types

- DTOs / Types (to be imported from `src/types.ts` / `src/db/database.types.ts`):
  - `PromotionTemplate` (db entity shape)
  - `PromotionTemplateInsert` or `PromotionTemplateUpdate` (partial update/command shape) — define `PromotionTemplateUpdateDto` as: `Partial<PromotionTemplate>` with `id?: never` (id must be path param).
  - `PromotionTemplateSectionDto` for `sections` if sections are stored as nested records or JSON.
  - `ApiResponse<T>` generic response wrapper if the project uses it.

- Command Models:
  - `UpdatePromotionTemplateCommand`:
    - `id: string`
    - `data: PromotionTemplateUpdateDto` (validated and sanitized)
    - `performedBy?: string` (optional for later auth integration)

## 4. Response Details

- 200 OK: Successfully updated. Body contains the updated `PromotionTemplate` object.

Response example:

```json
{
  "data": {
    "id": "uuid",
    "name": "Senior Software Engineer Promotion",
    "description": "...",
    "isActive": true,
    "sections": [ ... ],
    "createdAt": "2025-10-01T12:00:00Z",
    "updatedAt": "2025-10-31T14:00:00Z"
  }
}
```

- 400 Bad Request: Invalid input or validation error. Return structured validation messages.
- 404 Not Found: No promotion template found with `id`.
- 500 Internal Server Error: Unexpected server error. Log details to error table and return a generic error message.

## 5. Data Flow

1. Controller / endpoint handler (`src/pages/api/promotion-templates/[id].ts`):
   - Parse `id` from path and JSON body.
   - Validate `id` is UUID and body has at least one updatable field.
   - Map request body to `UpdatePromotionTemplateCommand`.
   - Call `promotionTemplateService.updatePromotionTemplate(command)`.
   - On success, return 200 with updated template.
   - On expected errors (validation, not found) return 400/404 respectively.
   - On unexpected errors, log to errors table and return 500.

2. Service (`src/lib/promotion-template.service.ts`):
   - Expose method `updatePromotionTemplate(command: UpdatePromotionTemplateCommand): Promise<PromotionTemplate>`.
   - Workflow inside service:
     a. Validate the command with domain-level checks (e.g., uniqueness of name if required, section format constraints).
     b. Start a database transaction (if multiple tables/relations are affected).
     c. If sections are separate rows, upsert/delete related rows accordingly. If stored as JSON column, update JSON column.
     d. Update `updatedAt` timestamp and `updatedBy` if available.
     e. Commit transaction and return updated record.
   - Throw typed errors for known failure modes (e.g., `NotFoundError`, `ValidationError`, `ConflictError`) so controller maps to proper HTTP codes.

3. Database interactions:
   - Use the existing Supabase client utility (`src/db/supabase.client.ts`) or database helper to run queries.
   - Use parameterized queries or the Supabase SDK to prevent SQL injection.

4. Error logging:
   - On unexpected exceptions, call the existing error logger (`src/lib/error-logger.ts`) which inserts an error row in the `errors` table with context: endpoint, payload (truncated), stack trace, user id (if present), and timestamp.

## 6. Security Considerations

- Authentication: Ignored for now per instruction. When added later, ensure `performedBy` or user context is passed to the service for audit fields.
- Authorization: Restrict updates to admins or owners when implemented.
- Input validation: Strictly validate types/lengths and enforce JSON schema for nested objects to avoid malformed data.
- SQL injection: Use Supabase SDK parameter binding or prepared statements.
- Sensitive fields: If templates contain private content, ensure any logging avoids storing full sensitive content (truncate before logging).
- Rate limiting: Not in scope, but consider for write endpoints to prevent abuse.

Potential threats:
- Malicious nested JSON aiming to crash service — validate depth and size.
- Large payloads — enforce maximum body size and field length limits.
- Concurrent updates — handle via optimistic concurrency if necessary (e.g., `updatedAt` check or version column).

## 7. Error Handling

Map domain errors to HTTP codes:
- ValidationError => 400 Bad Request. Include `errors: { field: message }` payload.
- NotFoundError => 404 Not Found. Message: `PromotionTemplate not found`.
- ConflictError (e.g., unique name violation) => 400 or 409 (project uses 400 for invalid input; prefer 409 if supported).
- Unexpected exceptions => 500 Internal Server Error. Log to errors table and return a safe generic message.

Error response formats (consistent with existing API style):

```json
{ "error": { "message": "string", "details": { ... } } }
```

Logging:
- Use `error-logger.ts` to persist server exceptions into `errors` table with columns: `id`, `service`, `endpoint`, `payload`, `stack`, `createdAt`.
- Include correlation id if present for tracing.

## 8. Performance Considerations

- Batch updates for related rows (sections) inside a transaction to minimize roundtrips.
- If `sections` are stored as JSON, updating the JSON column is a single write and faster for many small changes.
- Limit the size of `sections` and `metadata` fields to prevent very large writes.
- Add appropriate DB indexes for lookup by `id` (primary key) and any fields queried frequently (e.g., `name` if uniqueness checks are performed).
- Avoid long-running synchronous computations in the request path; push heavy computations to background jobs.

## 9. Implementation Steps

1. Add DTO and Command model
   - File: `src/types.ts` or `src/lib/dtos/promotion-template.d.ts`
   - Create `PromotionTemplateUpdateDto` and `UpdatePromotionTemplateCommand`.

2. Update validation
   - File: `src/lib/validation/promotion-template.validation.ts`
   - Add a `validateUpdatePromotionTemplate(payload)` function enforcing rules described above.

3. Service method
   - File: `src/lib/promotion-template.service.ts`
   - Add `async updatePromotionTemplate(cmd: UpdatePromotionTemplateCommand)` method.
   - Implement domain checks (e.g., name uniqueness if required).
   - Use `supabase.client` to run update inside a transaction. Handle sections upsert if sections are separate table.
   - Throw typed errors for not-found and validation issues.

4. Endpoint handler
   - File: `src/pages/api/promotion-templates/[id].ts`
   - Implement `PUT` handler:
     - Parse/validate `id` and body
     - Call validation util
     - Build command and call service
     - Map errors to HTTP responses
     - Return 200 with updated template

5. Error logging
   - Ensure unexpected exceptions call `errorLogger.log({ service: 'api', endpoint: '/api/promotion-templates/:id', payload, error })`.

6. Tests
   - Add unit tests for the service method and validation functions.
   - Add integration tests for the endpoint covering success, validation failures, not found, and server errors.

7. Lint and run existing test suite
   - Fix any linting issues and ensure tests pass.

8. Documentation
   - Update API docs and openapi/README with endpoint contract.

---

Notes & Assumptions
- The plan assumes the `PromotionTemplate` model follows typical fields (id, name, description, sections JSON or related table, isActive, createdAt, updatedAt). Adjust DTOs to match exact schema in `src/db/database.types.ts` and migrations.
- Use existing `supabase.client` helpers and `error-logger.ts` for DB access and error persistence.
- Authentication and authorization are out of scope and will be added later.
