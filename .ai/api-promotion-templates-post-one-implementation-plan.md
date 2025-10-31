## API Endpoint Implementation Plan: POST /api/promotion-templates

### 1) Short status
I'll validate incoming request body with Zod, add a service method to insert a promotion template, persist an audit entry and use the existing `logError` helper for server-side errors. I'll save the plan to `.ai/api-promotion-templates-get-one-implementation-plan.md`.

<analysis>
1. Key points of the API specification
- Purpose: create a new promotion template used to drive promotion creation/validation.
- Route: `POST /api/promotion-templates`.
- Primary payload fields (from `CreatePromotionTemplateCommand` in `src/types.ts`):
  - `name` (string)
  - `path` (enum: `technical|financial|management`)
  - `from_level` (string)
  - `to_level` (string)
  - `rules` (array of `{ category: BadgeCategoryType | "any", level: BadgeLevelType, count: number }`)

2. Required and optional parameters
- Required (request body): `name`, `path`, `from_level`, `to_level`, `rules`.
- Optional (DB-level/implementation): `is_active` (DB insert allows it), `created_by` (set later when auth is added).

3. DTOs and Command Models to use
- `CreatePromotionTemplateCommand` (input).
- `PromotionTemplateDto` / `PromotionTemplateDetailDto` (response).
- `PromotionTemplateRule` (typed rules array in body and DB JSONB).

4. Service extraction
- Add `createPromotionTemplate(command: CreatePromotionTemplateCommand, actorId?: string)` to `src/lib/promotion-template.service.ts`.
  - Validate uniqueness constraints (optional business rule): avoid duplicate templates for same `path/from_level/to_level` and `name`.
  - Insert into `promotion_templates` using Supabase client from `context.locals.supabase`.
  - Convert `rules` to JSON and ensure types match DB JSONB.
  - Insert an `audit_logs` row with event type `promotion.created` (use `AuditEventType.PromotionCreated`) and payload `{ id, name, path, from_level, to_level }`.

5. Input validation
- Use Zod to create `createPromotionTemplateSchema` in `src/lib/validation/promotion-template.validation.ts` (or new file alongside). Validation rules:
  - `name`: string, trim, min 1, max 200.
  - `path`: enum `technical|financial|management`.
  - `from_level` and `to_level`: non-empty strings (max e.g. 20 chars).
  - `rules`: array, min 1, max (configurable, e.g., 50), each rule:
    - `category`: enum `technical|organizational|softskilled` or literal `any`.
    - `level`: enum `gold|silver|bronze`.
    - `count`: integer >= 1 and reasonably bounded (e.g., <= 100).
  - Additional checks: no duplicate rule entries with identical `category`+`level`.

6. Error logging
- For unexpected server/database errors call `logError(context.locals.supabase, { route: '/api/promotion-templates', error_code, message, payload, requester_id })`.
- Insert audit event for successful creation into `audit_logs` (table exists in DB types).

7. Potential security threats
- Malformed JSON or overly large payloads (DoS). Mitigation: size limits and rules array length cap.
- Injection via unvalidated text fields (e.g., SQL injection): Supabase client uses parameterized queries; still validate and sanitize strings.
- Unauthorized creation (out of scope now): later require admin check; currently the route runs in dev mode without auth — document TODO to add auth and admin check.

8. Error scenarios and HTTP status mapping
- 201 Created: template created.
- 400 Bad Request: validation errors (Zod), malformed JSON.
- 409 Conflict: duplicate template or business-rule conflict (if enforced).
- 500 Internal Server Error: DB failures or unexpected exceptions — log and return sanitized error.
</analysis>

## Implementation Plan (Markdown)

## 1. Endpoint Overview
- **Purpose**: Create a promotion template used by the promotions subsystem to validate badge sets and build promotion payloads.
- **Route**: `POST /api/promotion-templates`.
- **Behavior summary**: Validate request body, persist a new `promotion_templates` row (rules stored as JSONB), write an audit event, return the created template DTO.

## 2. Request Details
- **HTTP Method**: POST
- **URL**: `/api/promotion-templates`
- **Headers**: `Content-Type: application/json`
- **Parameters**: none in path/query. Payload only.
- **Request Body (JSON)**: conforms to `CreatePromotionTemplateCommand`:

```json
{
  "name": "Senior Engineer Promotion Template",
  "path": "technical",
  "from_level": "S2",
  "to_level": "S3",
  "rules": [
    { "category": "technical", "level": "gold", "count": 2 },
    { "category": "any", "level": "silver", "count": 3 }
  ]
}
```

## 3. Used Types
- Input: `CreatePromotionTemplateCommand` (from `src/types.ts`).
- Rules item: `PromotionTemplateRule`.
- Output: `PromotionTemplateDto` / `PromotionTemplateDetailDto` (include `rules` typed array).
- DB row mapping: `promotion_templates` table (JSONB `rules` column).

## 4. Response Details
- **201 Created**: success — returns the created `PromotionTemplateDto` (full record including `id`, `created_at`, and typed `rules`).
  - Content-Type: `application/json`
  - Body:

```json
{ "id": "uuid", "name": "...", "path": "...", "from_level": "...", "to_level": "...", "rules": [...], "is_active": true, "created_by": null, "created_at": "...", "updated_at": "..." }
```

- **400 Bad Request**: validation failed.
  - Body: `ApiError` with `details` array of `{ field, message }`.

- **409 Conflict**: duplicate or business rule violation (optional).
  - Body: `ApiError` with `error: 'conflict'` and message describing the conflict.

- **500 Internal Server Error**: unexpected DB or service failure.

## 5. Data Flow
1. Route handler (`src/pages/api/promotion-templates/index.ts`) receives request.
2. Parse JSON body. Early guard: reject non-JSON with 400.
3. Validate body using `createPromotionTemplateSchema.safeParse()`.
   - On failure: return 400 with structured validation errors.
4. Construct command: `CreatePromotionTemplateCommand`.
5. Instantiate `PromotionTemplateService(context.locals.supabase)` and call `createPromotionTemplate(command, actorId?)`.
   - The service:
     - Optional pre-check: find existing template matching same `path/from_level/to_level` and `name` (return 409 if business rules say so).
     - Insert into `promotion_templates` with fields { name, path, from_level, to_level, rules: JSON, is_active: true }.
     - Insert `audit_logs` entry with `event_type: AuditEventType.PromotionCreated` and payload `{ id, name, path, from_level, to_level }`.
     - Return the inserted row as `PromotionTemplateDto` (cast rules JSONB to typed `PromotionTemplateRule[]`).
6. Route responds with 201 and the created DTO.
7. On unexpected errors, the route calls `logError(...)` and returns 500.

## 6. Security Considerations
- **Authentication/Authorization**: currently disabled in dev. Add TODO to verify requester's identity and check admin role if creation should be admin-only.
- **Input validation**: strict Zod schema and size limits on `rules` and string lengths.
- **Payload limits**: enforce a maximum request body size at framework/server level (e.g., 1MB) and cap `rules` length (e.g., max 50).
- **Audit logging**: write `audit_logs` entries for creation events for traceability.
- **Least privilege**: ensure the Supabase service role used by server has only required DB permissions in production.

## 7. Error Handling
- Validation failure (400): `createPromotionTemplateSchema` errors. Return `ApiError` with `details` list.
- Duplicate template (409): If business rule forbids duplicate templates, detect and return `ApiError` with `error: 'conflict'`.
- Database insertion error (500): call `logError` and return sanitized message.
- Audit log write failure: non-fatal — log to console and continue (audit write should be best-effort), but call `logError` for observability.

## 8. Performance Considerations
- JSONB conversion: Supabase/pg handles JSONB; keep `rules` small and validate size.
- Indexing: recommend DB index on `path, from_level, to_level` (composite index) if templates are frequently queried by these fields.
- Bulk operations: creation is single-row; no heavy performance risk. Ensure route is non-blocking and not performing unnecessary cross-table scans.

## 9. Implementation Steps (developer checklist)
1. Add Zod schema `createPromotionTemplateSchema` to `src/lib/validation/promotion-template.validation.ts` (or split into new file) and export a TypeScript type.
   - Ensure schema includes de-duplication check helper for `rules`.
2. Add method to `PromotionTemplateService` in `src/lib/promotion-template.service.ts`:
   - `async createPromotionTemplate(command: CreatePromotionTemplateCommand, actorId?: string): Promise<PromotionTemplateDto>`
   - Implementation details:
     - Optional pre-check for duplicate template (SELECT with `.eq` calls).
     - Insert to `promotion_templates` via `this.supabase.from('promotion_templates').insert({...}).select().single()`.
     - Insert audit log to `audit_logs` with `event_type: AuditEventType.PromotionCreated`.
     - Return typed DTO.
   - Error handling: translate Supabase error to thrown Error with clear message for the route.
3. Update route file `src/pages/api/promotion-templates/index.ts` to implement `export const POST: APIRoute = async (context) => { ... }`:
   - Steps in handler:
     - Guard: verify Content-Type is `application/json` and parse body with `await context.request.json()` inside try/catch.
     - Validate with `createPromotionTemplateSchema.safeParse(body)`.
     - On validation error return 400 with `ApiError` and `details` mapping Zod issues to `{ field, message }`.
     - Create service and call `createPromotionTemplate`.
     - On success respond 201 with JSON body of created DTO.
     - On errors:
       - If it's a business conflict return 409
       - Otherwise call `logError(context.locals.supabase, {...})` and return 500.
4. Unit tests & integration tests
   - Add Zod schema unit tests (invalid rules, duplicate rules, missing fields).
   - Add service tests mocking `context.locals.supabase` (see existing `src/lib/__tests__/utils/supabase-mock.ts`).
   - Add route endpoint tests under `src/pages/api/__tests__` following patterns in project for other endpoints.
5. Lint and run `read_lints` for edited files and fix any issues.
6. Documentation: update API plan docs and OpenAPI if present.

## 10. Example Error Responses
- Validation error (400):

```json
{ "error": "validation_error", "message": "Invalid request body", "details": [{ "field": "rules[0].count", "message": "Number must be >= 1" }] }
```

- Conflict (409):

```json
{ "error": "conflict", "message": "Promotion template already exists for path/from_level/to_level" }
```

- Internal error (500):

```json
{ "error": "internal_error", "message": "An unexpected error occurred while creating promotion template" }
```

## 11. TODOs / Follow-ups
- Add authentication & admin checks before enabling in production.
- Consider adding DB uniqueness constraint or a named index to enforce no-duplicates at DB level (preferred for correctness).
- Add OpenAPI spec entry and client SDK generation if used.

---

End of implementation plan for `POST /api/promotion-templates`.


