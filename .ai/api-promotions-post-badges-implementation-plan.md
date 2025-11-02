# API Endpoint Implementation Plan: POST /api/promotions/:id/badges

## 1. Endpoint Overview

This endpoint adds accepted badge applications to a promotion draft, creating reservations that prevent the same badge from being used in multiple promotions simultaneously. It implements optimistic concurrency control through database constraints and returns structured conflict information when badges are already reserved.

**Key Features**:
- Add multiple badge applications to a promotion in one request
- Create reservation records in `promotion_badges` junction table
- Enforce reservation through unique partial index (one unconsumed badge per promotion)
- Validate promotion ownership and draft status
- Validate badge applications are accepted and available
- Handle concurrent reservation conflicts with structured 409 response
- Optionally update badge application status to 'used_in_promotion'
- Return updated promotion with nested badge application details

**Business Context**:
This endpoint is used for:
- Building a promotion by collecting required badges
- Reserving accepted badge applications for a specific promotion
- Preventing double-use of badges across multiple promotions
- Validating badge availability in real-time during promotion construction

**Key Business Rules**:
- Promotion must exist and be owned by current user
- Promotion must be in 'draft' status (cannot modify submitted/approved promotions)
- Each badge application must exist and have status = 'accepted'
- Badge applications cannot be reserved by another unconsumed promotion (enforced by unique constraint)
- Unique constraint: `UNIQUE (badge_application_id) WHERE consumed = FALSE`
- On conflict (SQLSTATE 23505), return 409 with owning promotion ID
- Track who assigned badges with `assigned_by` field
- Badge application status optionally changes to 'used_in_promotion' (implementation choice)

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/promotions/:id/badges`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: User can only add badges to promotions they own AND promotion must be in draft status

### Path Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format, must exist | Promotion ID |

### Request Body

#### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `badge_application_ids` | array of strings | Non-empty array, each element valid UUID, min length 1, max length 100 | Badge application IDs to add |

#### Request Body Schema (Zod)

```typescript
const addPromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot add more than 100 badges at once"),
});
```

### Request Examples

**Valid Request - Single Badge**:
```json
{
  "badge_application_ids": [
    "650e8400-e29b-41d4-a716-446655440010"
  ]
}
```

**Valid Request - Multiple Badges**:
```json
{
  "badge_application_ids": [
    "650e8400-e29b-41d4-a716-446655440010",
    "650e8400-e29b-41d4-a716-446655440011",
    "650e8400-e29b-41d4-a716-446655440012"
  ]
}
```

**Invalid - Empty Array**:
```json
{
  "badge_application_ids": []
}
```
Expected: 400 Bad Request with validation error

**Invalid - Invalid UUID**:
```json
{
  "badge_application_ids": [
    "invalid-uuid"
  ]
}
```
Expected: 400 Bad Request with validation error

**Invalid - Missing Field**:
```json
{}
```
Expected: 400 Bad Request with validation error

## 3. Used Types

### From `src/types.ts`

**Command Model**:
```typescript
// Line 364-366
interface AddPromotionBadgesCommand {
  badge_application_ids: string[];
}
```

**Response Types**:
```typescript
// Line 26
export type PromotionRow = Tables<"promotions">;

// Line 265-269
export interface PromotionDetailDto extends PromotionRow {
  template: PromotionTemplateDetail;
  badge_applications: BadgeApplicationWithBadge[];
  creator: UserSummary;
}

// Line 168-174
export interface BadgeApplicationWithBadge {
  id: string;
  catalog_badge_id: string;
  catalog_badge: CatalogBadgeSummary;
  date_of_fulfillment: string | null;
  status: BadgeApplicationStatusType;
}

// Line 120-125
export interface CatalogBadgeSummary {
  id: string;
  title: string;
  category: BadgeCategoryType;
  level: BadgeLevelType;
}
```

**Error Types**:
```typescript
// Line 463-467
export interface ReservationConflictError extends ApiError {
  conflict_type: "badge_already_reserved";
  badge_application_id: string;
  owning_promotion_id: string;
}

// Line 487-489
export interface InvalidBadgeApplicationError extends ApiError {
  badge_application_id: string;
}

// Line 453-457
export interface ApiError {
  error: string;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
}
```

### Database Types

```typescript
export type PromotionBadgeRow = Tables<"promotion_badges">;
export type BadgeApplicationRow = Tables<"badge_applications">;
```

### Validation Schema

```typescript
import { z } from "zod";

const addPromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot add more than 100 badges at once"),
});

type AddPromotionBadgesInput = z.infer<typeof addPromotionBadgesSchema>;
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "status": "draft",
  "badge_applications": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440010",
      "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
      "catalog_badge": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "PostgreSQL Expert",
        "category": "technical",
        "level": "silver"
      },
      "date_of_fulfillment": "2025-01-20",
      "status": "accepted"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440011",
      "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440002",
      "catalog_badge": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "title": "React Advanced",
        "category": "technical",
        "level": "gold"
      },
      "date_of_fulfillment": "2025-01-18",
      "status": "accepted"
    }
  ],
  "message": "2 badge(s) added successfully"
}
```

**Response Field Descriptions**:
- `id`: Promotion UUID
- `template_id`: Reference to promotion template
- `status`: Current promotion status (should be "draft")
- `badge_applications`: Array of badge applications with nested catalog badge details
- `message`: Success message with count of badges added

**Simplified Response Structure**:
For MVP, we can return a simplified response without full promotion details:
```json
{
  "promotion_id": "850e8400-e29b-41d4-a716-446655440030",
  "added_count": 2,
  "badge_application_ids": [
    "650e8400-e29b-41d4-a716-446655440010",
    "650e8400-e29b-41d4-a716-446655440011"
  ],
  "message": "2 badge(s) added successfully"
}
```

### Error Responses

#### 400 Bad Request - Validation Error

**Missing Request Body**:
```json
{
  "error": "validation_error",
  "message": "Request body is required"
}
```

**Empty Array**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "badge_application_ids",
      "message": "At least one badge application ID is required"
    }
  ]
}
```

**Invalid UUID Format**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "badge_application_ids[0]",
      "message": "Invalid badge application ID format"
    }
  ]
}
```

**Badge Application Not Found**:
```json
{
  "error": "invalid_badge_application",
  "message": "Badge application 650e8400-e29b-41d4-a716-446655440010 not found",
  "badge_application_id": "650e8400-e29b-41d4-a716-446655440010"
}
```

**Badge Application Not Accepted**:
```json
{
  "error": "invalid_badge_application",
  "message": "Badge application 650e8400-e29b-41d4-a716-446655440010 is not in accepted status",
  "badge_application_id": "650e8400-e29b-41d4-a716-446655440010"
}
```

#### 401 Unauthorized (when auth enabled)

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden - Not Owner or Not Draft

**User doesn't own promotion**:
```json
{
  "error": "forbidden",
  "message": "You do not have permission to modify this promotion"
}
```

**Promotion not in draft status**:
```json
{
  "error": "forbidden",
  "message": "Only draft promotions can be modified"
}
```

#### 404 Not Found - Promotion Not Found

```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

#### 409 Conflict - Badge Already Reserved

```json
{
  "error": "reservation_conflict",
  "message": "Badge application is already assigned to another promotion",
  "conflict_type": "badge_already_reserved",
  "badge_application_id": "650e8400-e29b-41d4-a716-446655440010",
  "owning_promotion_id": "850e8400-e29b-41d4-a716-446655440031"
}
```

**Note**: The `owning_promotion_id` allows the UI to display a link to the conflicting promotion.

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "Failed to add badges to promotion"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/promotions/:id/badges
       │ Body: { badge_application_ids: ["650e8400..."] }
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│   src/pages/api/promotions/[id]/badges.ts          │
│                                                      │
│  1. Parse path parameter (promotion ID)             │
│  2. Validate promotion ID is valid UUID             │
│  3. Parse request body                              │
│  4. Validate with Zod schema                        │
│  5. (Future) Get user from auth session             │
│  6. Extract userId for authorization                │
└──────┬──────────────────────────────────────────────┘
       │ AddPromotionBadgesCommand
       ▼
┌─────────────────────────────────────────────────────┐
│              PromotionService                       │
│        src/lib/promotion.service.ts                 │
│                                                      │
│  addBadgesToPromotion(promotionId, command, userId) │
│                                                      │
│  1. Fetch promotion by ID                           │
│  2. Validate promotion exists                       │
│  3. Validate ownership (created_by = userId)        │
│  4. Validate status = 'draft'                       │
│  5. Validate all badge applications:                │
│     - Fetch each badge application                  │
│     - Check exists                                  │
│     - Check status = 'accepted'                     │
│  6. Begin transaction:                              │
│     a. Insert promotion_badges records              │
│        (promotion_id, badge_application_id,         │
│         assigned_by, consumed=false)                │
│     b. Catch unique constraint violation            │
│     c. If conflict: Query owning promotion          │
│     d. If conflict: Throw ReservationConflictError  │
│     e. (Optional) Update badge_applications.status  │
│        to 'used_in_promotion'                       │
│  7. Fetch updated promotion with badge details      │
│  8. Return promotion data                           │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Transaction:                                       │
│  1. SELECT from promotions WHERE id = $1            │
│                                                      │
│  2. SELECT from badge_applications                  │
│     WHERE id IN ($2, $3, ...)                       │
│                                                      │
│  3. INSERT INTO promotion_badges                    │
│     (promotion_id, badge_application_id,            │
│      assigned_by, assigned_at, consumed)            │
│     VALUES ($1, $2, $3, NOW(), false)               │
│     (Repeat for each badge)                         │
│                                                      │
│     Constraint Check:                               │
│     UNIQUE (badge_application_id)                   │
│     WHERE consumed = FALSE                          │
│                                                      │
│     On Violation:                                   │
│     - Rollback transaction                          │
│     - SELECT promotion_id from promotion_badges     │
│       WHERE badge_application_id = $conflicting     │
│       AND consumed = false                          │
│                                                      │
│  4. (Optional) UPDATE badge_applications            │
│     SET status = 'used_in_promotion'                │
│     WHERE id IN (...)                               │
│                                                      │
│  5. SELECT promotion with nested badge details      │
│     JOIN badge_applications, catalog_badges         │
│     WHERE promotion_id = $1                         │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  Tables:                                            │
│  - promotions (validate existence, status)          │
│  - badge_applications (validate status)             │
│  - promotion_badges (insert reservations)           │
│  - catalog_badges (join for response)               │
│                                                      │
│  Constraints:                                       │
│  - UNIQUE (badge_application_id)                    │
│    WHERE consumed = FALSE                           │
│  - FK promotion_id REFERENCES promotions            │
│  - FK badge_application_id REFERENCES               │
│    badge_applications                               │
│  - FK assigned_by REFERENCES users                  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Success or Error
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Receive result from service                     │
│  2. If success: Return 200 with promotion data      │
│  3. If ReservationConflictError: Return 409         │
│  4. If other error: Map to appropriate status       │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

## 6. Security Considerations

### Authentication

- **Requirement**: User must be authenticated via session
- **Implementation**: Ignored for development per instructions
- **Production**: Will check `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized if no valid session

### Authorization

- **Ownership Validation**:
  - Fetch promotion and check `promotion.created_by === current_user.id`
  - User can ONLY add badges to their own promotions
  - Return 403 Forbidden if ownership check fails
  - Server-side enforcement prevents privilege escalation

- **Status Validation**:
  - Promotion must be in 'draft' status
  - Cannot modify submitted, approved, or rejected promotions
  - Return 403 Forbidden if status is not 'draft'
  - Prevents modification of locked promotions

### Input Validation

- **Path Parameter Validation**:
  - Validate promotion ID is valid UUID format
  - Prevents SQL injection through path parameter
  - Use Astro's path parameter parsing with validation

- **Request Body Validation**:
  - Use Zod schema to validate structure
  - Reject missing required fields with 400
  - Reject invalid UUID formats with 400
  - Enforce array length constraints (min: 1, max: 100)
  - Prevents resource exhaustion attacks

- **Badge Application Validation**:
  - Verify each badge application exists
  - Verify each badge application has status = 'accepted'
  - Return clear error message for invalid badges
  - Prevents referencing non-existent or unavailable badges

### Concurrency Control

- **Optimistic Locking**:
  - Database enforces unique constraint: `UNIQUE (badge_application_id) WHERE consumed = FALSE`
  - Prevents race conditions where two users reserve same badge
  - Constraint violation returns SQLSTATE 23505
  - Catch constraint error and return structured 409 response

- **Conflict Information**:
  - Query `promotion_badges` to find owning promotion ID
  - Return `owning_promotion_id` in 409 error response
  - Allows UI to link to conflicting promotion
  - Acceptable information disclosure per spec

### Data Exposure

- **Prevent Information Leakage**:
  - Don't expose internal error details to client
  - Log detailed errors server-side only
  - Return generic error messages for 500 errors
  - Badge reservation conflicts are intentionally exposed (per spec)

- **Sensitive Data**:
  - Response contains promotion ID and badge application IDs
  - All fields are safe to expose to authorized user
  - created_by field verifies ownership

### SQL Injection Prevention

- **Mitigation**:
  - Use Supabase query builder exclusively (parameterized queries)
  - UUID validation prevents injection attempts
  - No string concatenation in queries
  - Array of UUIDs passed as parameters, not concatenated

### Transaction Integrity

- **ACID Properties**:
  - All inserts happen in single transaction
  - If any insert fails, entire operation rolls back
  - Prevents partial badge assignments
  - Ensures data consistency

### OWASP Top 10 Considerations

1. **A01:2021 - Broken Access Control**:
   - Mitigated by ownership validation (created_by check)
   - Mitigated by status validation (draft only)
   - Cannot modify other users' promotions

2. **A03:2021 - Injection**:
   - Mitigated by UUID validation and parameterized queries
   - Zod validation prevents malformed input

3. **A04:2021 - Insecure Design**:
   - Optimistic locking prevents race conditions
   - Unique constraint enforces business rule at database level

4. **A05:2021 - Security Misconfiguration**:
   - Return generic error messages for internal errors
   - No debug information in production responses

5. **A07:2021 - Identification and Authentication Failures**:
   - Handled by Supabase auth (when enabled)

### Additional Security Measures

- **Resource Limits**:
  - Max 100 badge applications per request
  - Prevents resource exhaustion attacks
  - Reasonable limit for legitimate use cases

- **Rate Limiting**: Consider at infrastructure level (future)
- **Request Size Limits**: Handled by Astro framework
- **CORS**: Configure appropriately for frontend domain

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Missing request body | 400 | `validation_error` | Check body exists before parsing |
| Empty badge_application_ids | 400 | `validation_error` | Validate with Zod min(1) |
| Invalid UUID in array | 400 | `validation_error` | Validate each UUID with Zod |
| Too many badges (>100) | 400 | `validation_error` | Validate with Zod max(100) |
| Invalid promotion ID | 400 | `validation_error` | Validate path parameter UUID |
| Not authenticated | 401 | `unauthorized` | Check auth session (when enabled) |
| Not promotion owner | 403 | `forbidden` | Check created_by field |
| Promotion not draft | 403 | `forbidden` | Check status field |
| Promotion not found | 404 | `not_found` | Check service response |
| Badge application not found | 400 | `invalid_badge_application` | Check badge exists |
| Badge not accepted | 400 | `invalid_badge_application` | Check badge status |
| Badge already reserved | 409 | `reservation_conflict` | Catch SQLSTATE 23505 |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Unexpected exception | 500 | `internal_error` | Catch all, log, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Parse path parameter with UUID validation
   - Parse request body with error handling
   - Validate with Zod schema
   - Return structured error response with field-level details
   - Fail fast before calling service layer

2. **Authentication Errors (401)**:
   - Check user session via Supabase auth (when enabled)
   - Return early if not authenticated
   - Clear error message: "Authentication required"

3. **Authorization Errors (403)**:
   - Service validates promotion ownership
   - Service validates promotion status = 'draft'
   - Throw specific errors for each case
   - Route handler returns 403 Forbidden
   - Clear messages distinguish between ownership and status issues

4. **Not Found Errors (404)**:
   - Service throws error if promotion not found
   - Route handler catches and returns 404
   - Message: "Promotion not found"

5. **Badge Validation Errors (400)**:
   - Service validates each badge application exists
   - Service validates each badge application status = 'accepted'
   - Throw error with badge_application_id for clarity
   - Return structured error with badge ID

6. **Reservation Conflict (409)**:
   - Database throws unique constraint violation (SQLSTATE 23505)
   - Service catches PostgresError with code '23505'
   - Service queries `promotion_badges` to find owning promotion
   - Service throws ReservationConflictError with owning_promotion_id
   - Route handler returns 409 with structured error
   - Log conflict event to audit_logs table

7. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include promotion_id and badge_application_ids in logs

8. **Unexpected Errors (500)**:
   - Wrap entire handler in try-catch
   - Log unexpected errors with full stack trace
   - Return generic error message
   - Consider alerting for production errors

### Error Response Format

All errors follow this structure:
```typescript
{
  error: string;           // Machine-readable error code
  message: string;         // Human-readable error message
  details?: Array<{        // Optional validation details
    field: string;
    message: string;
  }> | Record<string, unknown>;
}
```

### Custom Error Classes

Define in service layer:
```typescript
class PromotionNotFoundError extends Error {
  constructor(promotionId: string) {
    super(`Promotion ${promotionId} not found`);
    this.name = 'PromotionNotFoundError';
  }
}

class PromotionNotOwnedError extends Error {
  constructor(promotionId: string, userId: string) {
    super(`User ${userId} does not own promotion ${promotionId}`);
    this.name = 'PromotionNotOwnedError';
  }
}

class PromotionNotDraftError extends Error {
  constructor(promotionId: string, currentStatus: string) {
    super(`Promotion ${promotionId} is not in draft status (current: ${currentStatus})`);
    this.name = 'PromotionNotDraftError';
  }
}

class BadgeApplicationNotFoundError extends Error {
  badgeApplicationId: string;

  constructor(badgeApplicationId: string) {
    super(`Badge application ${badgeApplicationId} not found`);
    this.name = 'BadgeApplicationNotFoundError';
    this.badgeApplicationId = badgeApplicationId;
  }
}

class BadgeApplicationNotAcceptedError extends Error {
  badgeApplicationId: string;

  constructor(badgeApplicationId: string) {
    super(`Badge application ${badgeApplicationId} is not in accepted status`);
    this.name = 'BadgeApplicationNotAcceptedError';
    this.badgeApplicationId = badgeApplicationId;
  }
}

class BadgeReservationConflictError extends Error {
  badgeApplicationId: string;
  owningPromotionId: string;

  constructor(badgeApplicationId: string, owningPromotionId: string) {
    super(`Badge ${badgeApplicationId} is already reserved by promotion ${owningPromotionId}`);
    this.name = 'BadgeReservationConflictError';
    this.badgeApplicationId = badgeApplicationId;
    this.owningPromotionId = owningPromotionId;
  }
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Multiple Badge Validation**: N+1 query problem when validating badges
2. **Multiple Inserts**: One INSERT per badge application
3. **Transaction Overhead**: Transaction setup and commit time
4. **Conflict Detection**: Extra query when constraint violated
5. **Final Query**: Complex JOIN to fetch promotion with badge details

### Optimization Strategies

1. **Batch Badge Validation**:
   - Single query with `WHERE id IN (...)` instead of N queries
   - Fetch all badge applications at once
   - Validate in memory after fetch
   - Reduces round trips significantly

   ```sql
   SELECT id, status FROM badge_applications
   WHERE id IN ($1, $2, $3, ...);
   ```

2. **Batch Inserts**:
   - Use Supabase `.insert([...])` with array
   - Single INSERT statement with multiple values
   - Database processes in one operation
   - Much faster than N individual INSERTs

   ```sql
   INSERT INTO promotion_badges
   (promotion_id, badge_application_id, assigned_by, consumed)
   VALUES
   ($1, $2, $3, false),
   ($1, $4, $3, false),
   ($1, $5, $3, false);
   ```

3. **Database Optimization**:
   - **Indexes Required** (should already exist):
     - `promotions(id)` - Primary key
     - `badge_applications(id)` - Primary key
     - `badge_applications(status)` - For filtering accepted badges
     - `promotion_badges(badge_application_id) WHERE consumed = FALSE` - Unique partial index
     - `promotion_badges(promotion_id)` - For listing badges in promotion

4. **Transaction Efficiency**:
   - Use Supabase transaction API if available
   - Otherwise, rely on implicit transaction per request
   - Keep transaction short: validate → insert → commit
   - Don't perform external API calls within transaction

5. **Response Optimization**:
   - Return simplified response (promotion_id, added_count, message)
   - Client can fetch full promotion details separately if needed
   - Avoids complex JOIN query after insert
   - Trade-off: Additional client request for details vs. immediate data

   **Simplified Response** (recommended for MVP):
   ```json
   {
     "promotion_id": "...",
     "added_count": 2,
     "badge_application_ids": ["...", "..."],
     "message": "2 badge(s) added successfully"
   }
   ```

   **Full Response** (more convenient but slower):
   ```json
   {
     "id": "...",
     "status": "draft",
     "badge_applications": [...],
     "message": "..."
   }
   ```

### Expected Performance

**Assumptions**:
- Adding 5 badges on average
- Proper indexes in place
- Local database connection

**Query Breakdown**:
- Promotion fetch: ~5ms
- Badge applications fetch (batch): ~5ms
- Batch insert: ~10ms
- Conflict query (if needed): ~5ms
- Simplified response: ~1ms
- **Total**: ~25-30ms (no conflict)
- **99th Percentile**: ~50ms

**With Full Response**:
- Add complex JOIN query: +15-20ms
- **Total**: ~40-50ms
- **99th Percentile**: ~80ms

**Performance is good** for MVP use case (occasional badge additions).

### Performance Monitoring

- Log slow requests (> 100ms) with badge count
- Track response times by badge count (1, 5, 10, 50)
- Monitor database query execution times
- Set up alerts for degraded performance (> 200ms)
- Track reservation conflict rate

### Load Considerations

- Badge addition is infrequent (users add 5-10 badges per promotion draft)
- Not a high-traffic endpoint
- Conflict rate expected to be low (< 1% of requests)
- Current approach is sufficient for MVP
- Consider connection pooling for production

## 9. Implementation Steps

### Step 1: Update PromotionService

**File**: `src/lib/promotion.service.ts`

**Purpose**: Add method to add badges to a promotion

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { AddPromotionBadgesCommand } from "@/types";

export class PromotionService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Adds badge applications to a promotion draft
   *
   * Validates promotion ownership, status, and badge application validity.
   * Creates reservation records in promotion_badges junction table.
   * Handles concurrent reservation conflicts with structured error.
   *
   * @param promotionId - Promotion UUID
   * @param command - Badge application IDs to add
   * @param userId - Current authenticated user ID
   * @returns Success result with added count
   * @throws PromotionNotFoundError if promotion doesn't exist
   * @throws PromotionNotOwnedError if user doesn't own promotion
   * @throws PromotionNotDraftError if promotion is not in draft status
   * @throws BadgeApplicationNotFoundError if badge doesn't exist
   * @throws BadgeApplicationNotAcceptedError if badge is not accepted
   * @throws BadgeReservationConflictError if badge is already reserved
   * @throws Error on database errors
   */
  async addBadgesToPromotion(
    promotionId: string,
    command: AddPromotionBadgesCommand,
    userId: string
  ): Promise<{ promotion_id: string; added_count: number; badge_application_ids: string[] }> {
    // Step 1: Fetch and validate promotion
    const { data: promotion, error: promotionError } = await this.supabase
      .from("promotions")
      .select("id, created_by, status")
      .eq("id", promotionId)
      .single();

    if (promotionError || !promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    // Validate ownership
    if (promotion.created_by !== userId) {
      throw new Error(`User does not own promotion: ${promotionId}`);
    }

    // Validate status
    if (promotion.status !== "draft") {
      throw new Error(
        `Promotion is not in draft status: ${promotionId} (current: ${promotion.status})`
      );
    }

    // Step 2: Validate all badge applications exist and are accepted
    const { data: badgeApplications, error: badgeError } = await this.supabase
      .from("badge_applications")
      .select("id, status")
      .in("id", command.badge_application_ids);

    if (badgeError) {
      throw new Error(`Failed to fetch badge applications: ${badgeError.message}`);
    }

    // Check all badges were found
    if (!badgeApplications || badgeApplications.length !== command.badge_application_ids.length) {
      const foundIds = badgeApplications?.map((ba) => ba.id) || [];
      const missingIds = command.badge_application_ids.filter((id) => !foundIds.includes(id));
      throw new Error(`Badge application not found: ${missingIds[0]}`);
    }

    // Check all badges are accepted
    const notAcceptedBadge = badgeApplications.find((ba) => ba.status !== "accepted");
    if (notAcceptedBadge) {
      throw new Error(`Badge application not accepted: ${notAcceptedBadge.id}`);
    }

    // Step 3: Insert promotion_badges records
    const promotionBadges = command.badge_application_ids.map((badgeAppId) => ({
      promotion_id: promotionId,
      badge_application_id: badgeAppId,
      assigned_by: userId,
      consumed: false,
    }));

    const { error: insertError } = await this.supabase
      .from("promotion_badges")
      .insert(promotionBadges);

    if (insertError) {
      // Check for unique constraint violation (SQLSTATE 23505)
      // In Supabase/PostgreSQL, the error code is '23505' for unique_violation
      if (insertError.code === "23505") {
        // Find which badge is conflicting
        // The error message typically contains the constraint name and conflicting value
        // We need to query to find the owning promotion

        // Try to find the conflicting badge by attempting individual inserts
        // (This is a fallback approach; ideally parse error message)
        let conflictingBadgeId: string | null = null;
        let owningPromotionId: string | null = null;

        for (const badgeAppId of command.badge_application_ids) {
          const { data: existingReservation } = await this.supabase
            .from("promotion_badges")
            .select("promotion_id, badge_application_id")
            .eq("badge_application_id", badgeAppId)
            .eq("consumed", false)
            .single();

          if (existingReservation) {
            conflictingBadgeId = badgeAppId;
            owningPromotionId = existingReservation.promotion_id;
            break;
          }
        }

        if (conflictingBadgeId && owningPromotionId) {
          throw new Error(
            `Badge already reserved: ${conflictingBadgeId} by promotion ${owningPromotionId}`
          );
        }

        // Fallback if we couldn't identify specific badge
        throw new Error("Badge reservation conflict");
      }

      throw new Error(`Failed to add badges to promotion: ${insertError.message}`);
    }

    // Step 4: Return success result
    return {
      promotion_id: promotionId,
      added_count: command.badge_application_ids.length,
      badge_application_ids: command.badge_application_ids,
    };
  }
}
```

**Key Points**:
- Validate promotion existence, ownership, and status first
- Batch fetch all badge applications in single query
- Validate all badges exist and are accepted
- Batch insert all promotion_badges records
- Handle unique constraint violation (23505) for conflicts
- Query to find owning promotion on conflict
- Return simplified response (promotion_id, added_count)

**Error Handling**:
- Clear error messages with context (IDs, status values)
- Throw errors for route handler to catch and map to HTTP status
- Special handling for unique constraint violations (409)

### Step 2: Create API Route Handler

**File**: `src/pages/api/promotions/[id]/badges.ts` (new file)

**Purpose**: Handle HTTP request/response for adding badges to promotion

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import type { ApiError, AddPromotionBadgesCommand, ReservationConflictError } from "@/types";
import { z } from "zod";

// Request body validation schema
const addPromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot add more than 100 badges at once"),
});

/**
 * POST /api/promotions/:id/badges
 *
 * Adds accepted badge applications to a promotion draft, creating reservations.
 * Implements optimistic concurrency control via unique database constraint.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of promotion (required)
 *
 * Request Body:
 * - badge_application_ids: Array of badge application UUIDs (required, min 1, max 100)
 *
 * Business Rules:
 * - Promotion must exist and be owned by current user
 * - Promotion must be in 'draft' status
 * - Each badge application must exist and have status = 'accepted'
 * - Badge applications cannot be reserved by another promotion
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses hardcoded test user ID
 *
 * Production Authorization (when enabled):
 * - User can only add badges to their own promotions
 * - Promotion must be in draft status
 *
 * @returns 200 OK with success message and badge count
 * @returns 400 Bad Request if validation fails or badges invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not owner or promotion not draft
 * @returns 404 Not Found if promotion doesn't exist
 * @returns 409 Conflict if badge already reserved
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const promotionId = context.params.id;

    if (!promotionId) {
      const error: ApiError = {
        error: "validation_error",
        message: "Promotion ID is required",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate promotion ID is a valid UUID
    const uuidSchema = z.string().uuid();
    const promotionIdValidation = uuidSchema.safeParse(promotionId);

    if (!promotionIdValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we use a test user ID.

    // =========================================================================
    // PRODUCTION CODE (Currently Disabled)
    // =========================================================================
    // Uncomment the code below when authentication is ready:
    /*
    // Step 2: Authentication Check
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      const error: ApiError = {
        error: "unauthorized",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    */

    // Development mode: Use test user ID
    // TODO: Replace with actual user ID from auth session
    // For now, fetch first user from database for testing
    const { data: testUser, error: userError } = await context.locals.supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();

    if (userError || !testUser) {
      const error: ApiError = {
        error: "internal_error",
        message: "Test user not found. Please ensure sample data is imported.",
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = testUser.id;

    // =========================================================================
    // Step 3: Parse and Validate Request Body
    // =========================================================================
    let requestBody: unknown;
    try {
      requestBody = await context.request.json();
    } catch {
      const error: ApiError = {
        error: "validation_error",
        message: "Request body is required and must be valid JSON",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validation = addPromotionBadgesSchema.safeParse(requestBody);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Validation failed",
        details: validation.error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const command: AddPromotionBadgesCommand = validation.data;

    // =========================================================================
    // Step 4: Add Badges via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const result = await service.addBadgesToPromotion(
      promotionId,
      command,
      userId
    );

    // =========================================================================
    // Step 5: Return Success Response
    // =========================================================================
    const response = {
      ...result,
      message: `${result.added_count} badge(s) added successfully`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/promotions/:id/badges:", error);

    // Handle specific error types
    if (error instanceof Error) {
      // Promotion not found
      if (error.message.includes("not found")) {
        const apiError: ApiError = {
          error: "not_found",
          message: "Promotion not found",
        };
        return new Response(JSON.stringify(apiError), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // User doesn't own promotion
      if (error.message.includes("does not own")) {
        const apiError: ApiError = {
          error: "forbidden",
          message: "You do not have permission to modify this promotion",
        };
        return new Response(JSON.stringify(apiError), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Promotion not in draft status
      if (error.message.includes("not in draft status")) {
        const apiError: ApiError = {
          error: "forbidden",
          message: "Only draft promotions can be modified",
        };
        return new Response(JSON.stringify(apiError), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge application not found
      if (error.message.includes("Badge application not found")) {
        const badgeIdMatch = error.message.match(/[0-9a-f-]{36}/);
        const badgeId = badgeIdMatch ? badgeIdMatch[0] : "unknown";

        const apiError: ApiError = {
          error: "invalid_badge_application",
          message: `Badge application ${badgeId} not found`,
          details: { badge_application_id: badgeId },
        };
        return new Response(JSON.stringify(apiError), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge application not accepted
      if (error.message.includes("not accepted")) {
        const badgeIdMatch = error.message.match(/[0-9a-f-]{36}/);
        const badgeId = badgeIdMatch ? badgeIdMatch[0] : "unknown";

        const apiError: ApiError = {
          error: "invalid_badge_application",
          message: `Badge application ${badgeId} is not in accepted status`,
          details: { badge_application_id: badgeId },
        };
        return new Response(JSON.stringify(apiError), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Badge already reserved (conflict)
      if (error.message.includes("already reserved")) {
        // Extract badge ID and owning promotion ID from error message
        const matches = error.message.match(/[0-9a-f-]{36}/g);
        const badgeId = matches?.[0] || "unknown";
        const owningPromotionId = matches?.[1] || "unknown";

        const conflictError: ReservationConflictError = {
          error: "reservation_conflict",
          message: "Badge application is already assigned to another promotion",
          conflict_type: "badge_already_reserved",
          badge_application_id: badgeId,
          owning_promotion_id: owningPromotionId,
        };
        return new Response(JSON.stringify(conflictError), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to add badges to promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

**Key Points**:
- Validate path parameter (promotion ID) as UUID
- Parse and validate request body with Zod
- Use service layer for business logic
- Map service errors to appropriate HTTP status codes
- Handle reservation conflicts with structured 409 response
- Return success message with badge count

### Step 3: Manual Testing

**Prerequisites**:
- Supabase running locally: `npx supabase start`
- Development server running: `pnpm dev`
- Sample data imported (users, promotions, badge applications)

**Test Scenarios**:

**1. Add Single Badge to Promotion**:
```bash
# Get a draft promotion ID and an accepted badge application ID
PROMOTION_ID=$(curl -s 'http://localhost:3000/api/promotions?status=draft' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

BADGE_APP_ID=$(curl -s 'http://localhost:3000/api/badge-applications?status=accepted' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

# Add badge to promotion
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{
    \"badge_application_ids\": [\"$BADGE_APP_ID\"]
  }"
```
**Expected**: 200 OK with success message "1 badge(s) added successfully"

**2. Add Multiple Badges**:
```bash
# Get multiple accepted badge application IDs
BADGE_IDS=$(curl -s 'http://localhost:3000/api/badge-applications?status=accepted&limit=3' | \
  python3 -c "import json,sys; ids=[b['id'] for b in json.load(sys.stdin)['data']]; print(json.dumps(ids))")

curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": $BADGE_IDS}"
```
**Expected**: 200 OK with message "3 badge(s) added successfully"

**3. Missing Request Body**:
```bash
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json'
```
**Expected**: 400 Bad Request with validation error

**4. Empty badge_application_ids Array**:
```bash
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": []}'
```
**Expected**: 400 Bad Request with "At least one badge application ID is required"

**5. Invalid UUID Format**:
```bash
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["invalid-uuid"]}'
```
**Expected**: 400 Bad Request with "Invalid badge application ID format"

**6. Invalid Promotion ID**:
```bash
curl -X POST 'http://localhost:3000/api/promotions/invalid-uuid/badges' \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["650e8400-e29b-41d4-a716-446655440010"]}'
```
**Expected**: 400 Bad Request with "Invalid promotion ID format"

**7. Promotion Not Found**:
```bash
curl -X POST 'http://localhost:3000/api/promotions/850e8400-0000-0000-0000-000000000000/badges' \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["650e8400-e29b-41d4-a716-446655440010"]}'
```
**Expected**: 404 Not Found with "Promotion not found"

**8. Badge Application Not Found**:
```bash
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["650e8400-0000-0000-0000-000000000000"]}'
```
**Expected**: 400 Bad Request with "Badge application not found"

**9. Badge Application Not Accepted** (use a draft badge):
```bash
# Get a draft badge application
DRAFT_BADGE_ID=$(curl -s 'http://localhost:3000/api/badge-applications?status=draft' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$DRAFT_BADGE_ID\"]}"
```
**Expected**: 400 Bad Request with "Badge application is not in accepted status"

**10. Badge Already Reserved** (add same badge twice):
```bash
# Add badge once
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}"

# Try to add same badge to another promotion
PROMOTION_ID_2=$(curl -s 'http://localhost:3000/api/promotions?status=draft&limit=2' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][1]['id'])")

curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID_2/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}"
```
**Expected**: 409 Conflict with structured error including `owning_promotion_id`

**11. Verify Response Structure**:
```bash
curl -s -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}" | \
  python3 -m json.tool
```
**Expected**:
```json
{
  "promotion_id": "...",
  "added_count": 1,
  "badge_application_ids": ["..."],
  "message": "1 badge(s) added successfully"
}
```

**12. Verify Database Records**:
```bash
# Add badges
curl -s -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}"

# Query database
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT promotion_id, badge_application_id, assigned_by, consumed
      FROM promotion_badges
      WHERE promotion_id = '$PROMOTION_ID';"
```
**Expected**: Records exist with consumed = false

**13. Test Batch Addition (10 badges)**:
```bash
# Get 10 accepted badges
BADGE_IDS=$(curl -s 'http://localhost:3000/api/badge-applications?status=accepted&limit=10' | \
  python3 -c "import json,sys; ids=[b['id'] for b in json.load(sys.stdin)['data']]; print(json.dumps(ids))")

curl -w "\nTime: %{time_total}s\n" -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": $BADGE_IDS}"
```
**Expected**: 200 OK in < 100ms

### Step 4: Verify Build and Linting

**Actions**:

1. **Run Linter**:
```bash
pnpm lint
```
**Expected**: No errors

2. **Fix Linting Issues** (if any):
```bash
pnpm lint:fix
```

3. **Run Build**:
```bash
pnpm build
```
**Expected**: Successful build

4. **Type Check**:
```bash
pnpm exec tsc --noEmit
```
**Expected**: No type errors

### Step 5: Performance Testing

**Actions**:

1. **Measure Response Time (Single Badge)**:
```bash
curl -w "\nTime: %{time_total}s\n" -s -X POST \
  "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}" \
  > /dev/null
```
**Expected**: < 50ms

2. **Measure Response Time (10 Badges)**:
```bash
curl -w "\nTime: %{time_total}s\n" -s -X POST \
  "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": $BADGE_IDS_10}" \
  > /dev/null
```
**Expected**: < 100ms

3. **Verify Database Indexes**:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('promotions', 'badge_applications', 'promotion_badges')
      ORDER BY tablename, indexname;"
```
**Expected**: Unique partial index on promotion_badges exists

4. **Verify Unique Constraint**:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT conname, contype, conrelid::regclass, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'promotion_badges'::regclass
      AND contype = 'u';"
```
**Expected**: Unique constraint on badge_application_id WHERE consumed = false

## 10. Future Enhancements

### 1. Full Response with Badge Details

**Why**: Avoid additional client request to fetch promotion details
**Implementation**: Add JOIN query after insert to fetch badge applications with catalog badge details
**Benefit**: Single request for all data
**Trade-off**: Slower response (~20ms additional), more complex query
**Priority**: Medium (nice for UX, but not critical)

### 2. Bulk Conflict Detection

**Why**: Return all conflicting badges in single response
**Implementation**: Attempt all inserts, collect all conflicts, return array
**Benefit**: User sees all conflicts at once
**Trade-off**: More complex error handling, transaction rollback on any conflict
**Priority**: Low (conflicts expected to be rare)

### 3. Badge Application Status Update

**Why**: Mark badge as 'used_in_promotion' immediately on add
**Implementation**: UPDATE badge_applications SET status = 'used_in_promotion' after insert
**Benefit**: Clearer badge state, easier to query "available" badges
**Trade-off**: Additional query, need to revert on promotion deletion
**Priority**: Medium (clarifies badge lifecycle)

### 4. Audit Logging

**Why**: Track who adds badges and when
**Implementation**: Insert into audit_logs table with event type 'promotion.badge_added'
**Payload**: `{ promotion_id, badge_application_ids, user_id }`
**Priority**: Low (useful for analytics, not critical for MVP)

### 5. Webhook/Notification

**Why**: Notify user when badges added to promotion
**Implementation**: Trigger webhook after successful insert
**Use Case**: Real-time UI update in other tabs/devices
**Priority**: Very Low (out of MVP scope)

### 6. Rate Limiting

**Why**: Prevent abuse (adding badges repeatedly)
**Implementation**: Limit requests per promotion per minute
**Example**: Max 10 badge additions per promotion per minute
**Priority**: Low (not a high-risk endpoint)

### 7. Optimistic UI Feedback

**Why**: Instant UI feedback before server response
**Implementation**: Client-side optimistic update, revert on error
**Benefit**: Better UX, feels faster
**Priority**: Low (frontend concern)

### 8. Badge Reservation Expiry

**Why**: Auto-release badges from abandoned draft promotions
**Implementation**: Add `reserved_at` timestamp, expire after 30 days
**Benefit**: Prevents indefinite reservation of badges
**Priority**: Medium (prevents resource lock-up)

---

## Notes & Assumptions

- Authentication is disabled for development and will be implemented later
- Test user ID is fetched from database for development testing
- Simplified response structure (promotion_id, added_count) for MVP performance
- Full promotion details can be fetched separately via GET /api/promotions/:id
- Badge application status remains 'accepted' after adding to promotion (implementation choice)
  - Alternative: Update to 'used_in_promotion' immediately
- Unique constraint on promotion_badges enforces one unconsumed badge per promotion
- Conflict detection requires query to find owning promotion (acceptable for MVP)
- Batch insert for performance (single INSERT with multiple values)
- Batch validation for performance (single SELECT with IN clause)
- Database foreign keys prevent referencing non-existent promotions or badges
- Transaction ensures all-or-nothing insert (if any fails, all roll back)
- Service layer throws errors, route handler maps to HTTP status codes
- Error messages include IDs for debugging and structured conflict responses
- Performance is excellent due to batch operations and proper indexes (< 50ms for 5 badges)
- Maximum 100 badges per request to prevent resource exhaustion
