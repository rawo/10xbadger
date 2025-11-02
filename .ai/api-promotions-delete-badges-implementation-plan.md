# API Endpoint Implementation Plan: DELETE /api/promotions/:id/badges

## 1. Endpoint Overview

This endpoint removes badge applications from a promotion draft and releases their reservations, making the badges available for use in other promotions. It is the inverse operation of `POST /api/promotions/:id/badges` and is essential for users to adjust their promotion composition before submission.

**Key Features**:
- Remove multiple badge applications from a promotion in one request
- Delete reservation records from `promotion_badges` junction table
- Release badge reservations, making badges available again
- Optionally revert badge application status from 'used_in_promotion' to 'accepted'
- Validate promotion ownership and draft status
- Return success message with removal count

**Business Context**:
This endpoint is used for:
- Adjusting promotion composition during draft phase
- Removing incorrectly added badges
- Releasing badge reservations when changing promotion strategy
- Managing badge allocation across multiple draft promotions

**Key Business Rules**:
- Promotion must exist and be owned by current user
- Promotion must be in 'draft' status (cannot modify submitted/approved/rejected promotions)
- Each badge application ID must currently be assigned to this promotion
- Only unconsumed badge reservations can be removed (consumed = false)
- Deletion from `promotion_badges` releases the reservation
- Badge application status optionally reverts from 'used_in_promotion' to 'accepted' (implementation choice)

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/promotions/:id/badges`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: User can only remove badges from promotions they own AND promotion must be in draft status

### Path Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format, must exist | Promotion ID |

### Request Body

#### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `badge_application_ids` | array of strings | Non-empty array, each element valid UUID, min length 1, max length 100 | Badge application IDs to remove |

#### Request Body Schema (Zod)

```typescript
const removePromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot remove more than 100 badges at once"),
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
// Line 371-373
export interface RemovePromotionBadgesCommand {
  badge_application_ids: string[];
}
```

**Base Types**:
```typescript
// Line 26
export type PromotionRow = Tables<"promotions">;

// Line 27
export type PromotionBadgeRow = Tables<"promotion_badges">;
```

**Error Types**:
```typescript
// Line 453-457
export interface ApiError {
  error: string;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
}
```

### Validation Schema

```typescript
import { z } from "zod";

const removePromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot remove more than 100 badges at once"),
});

type RemovePromotionBadgesInput = z.infer<typeof removePromotionBadgesSchema>;
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "message": "2 badge(s) removed successfully"
}
```

**Response Field Descriptions**:
- `message`: Success message indicating how many badges were removed

**Alternative Detailed Response** (optional enhancement):
```json
{
  "promotion_id": "850e8400-e29b-41d4-a716-446655440030",
  "removed_count": 2,
  "badge_application_ids": [
    "650e8400-e29b-41d4-a716-446655440010",
    "650e8400-e29b-41d4-a716-446655440011"
  ],
  "message": "2 badge(s) removed successfully"
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
      "field": "badge_application_ids.0",
      "message": "Invalid badge application ID format"
    }
  ]
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

#### 404 Not Found

**Promotion Not Found**:
```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

**Badge Not in Promotion**:
```json
{
  "error": "not_found",
  "message": "Badge application 650e8400-e29b-41d4-a716-446655440010 is not assigned to this promotion"
}
```

**Note**: This error occurs when trying to remove a badge that isn't currently in the promotion.

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "Failed to remove badges from promotion"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ DELETE /api/promotions/:id/badges
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
       │ RemovePromotionBadgesCommand
       ▼
┌─────────────────────────────────────────────────────┐
│              PromotionService                       │
│        src/lib/promotion.service.ts                 │
│                                                      │
│  removeBadgesFromPromotion(promotionId, command,    │
│                            userId)                   │
│                                                      │
│  1. Fetch promotion by ID                           │
│  2. Validate promotion exists                       │
│  3. Validate ownership (created_by = userId)        │
│  4. Validate status = 'draft'                       │
│  5. Verify all badge application IDs are currently  │
│     assigned to this promotion:                     │
│     - Query promotion_badges WHERE promotion_id     │
│       AND badge_application_id IN (...)             │
│     - Check all requested badges found              │
│  6. Begin transaction:                              │
│     a. DELETE FROM promotion_badges                 │
│        WHERE promotion_id = ? AND                   │
│        badge_application_id IN (...)                │
│     b. (Optional) UPDATE badge_applications         │
│        SET status = 'accepted'                      │
│        WHERE id IN (...) AND                        │
│        status = 'used_in_promotion'                 │
│  7. Return success with removal count               │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Transaction:                                       │
│  1. SELECT from promotions WHERE id = $1            │
│                                                      │
│  2. SELECT from promotion_badges                    │
│     WHERE promotion_id = $1 AND                     │
│     badge_application_id IN ($2, $3, ...)           │
│     (Verify all requested badges are in promotion)  │
│                                                      │
│  3. DELETE FROM promotion_badges                    │
│     WHERE promotion_id = $1 AND                     │
│     badge_application_id IN ($2, $3, ...)           │
│                                                      │
│  4. (Optional) UPDATE badge_applications            │
│     SET status = 'accepted'                         │
│     WHERE id IN ($2, $3, ...) AND                   │
│     status = 'used_in_promotion'                    │
│                                                      │
│  5. Return affected row count                       │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  Tables:                                            │
│  - promotions (validate existence, status)          │
│  - promotion_badges (delete records)                │
│  - badge_applications (optionally update status)    │
│                                                      │
│  Effects:                                           │
│  - Deletes promotion_badges records                 │
│  - Releases unique constraint on badge_application  │
│  - Makes badges available for other promotions      │
│  - Optionally reverts badge status to 'accepted'    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Success or Error
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Receive result from service                     │
│  2. If success: Return 200 with message             │
│  3. If error: Map to appropriate status             │
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
  - User can ONLY remove badges from their own promotions
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

- **Badge Assignment Validation**:
  - Verify each badge application is currently in the promotion
  - Query promotion_badges to confirm assignment
  - Return clear error message for badges not in promotion
  - Prevents removal of non-existent assignments

### Data Integrity

- **Atomic Operations**:
  - All deletions happen in single transaction
  - If any operation fails, entire transaction rolls back
  - Ensures data consistency

- **Constraint Preservation**:
  - Deleting from promotion_badges releases unique constraint
  - Makes badge available for other promotions immediately
  - No orphaned records created

### SQL Injection Prevention

- **Mitigation**:
  - Use Supabase query builder exclusively (parameterized queries)
  - UUID validation prevents injection attempts
  - No string concatenation in queries
  - Array of UUIDs passed as parameters, not concatenated

### OWASP Top 10 Considerations

1. **A01:2021 - Broken Access Control**:
   - Mitigated by ownership validation (created_by check)
   - Mitigated by status validation (draft only)
   - Cannot modify other users' promotions

2. **A03:2021 - Injection**:
   - Mitigated by UUID validation and parameterized queries
   - Zod validation prevents malformed input

3. **A04:2021 - Insecure Design**:
   - Status validation prevents modification of locked resources
   - Ownership checks prevent unauthorized access

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
| Badge not in promotion | 404 | `not_found` | Verify badge assignment |
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
   - Service throws error if badge not in promotion
   - Route handler catches and returns 404
   - Messages: "Promotion not found" or "Badge application not assigned to this promotion"

5. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include promotion_id and badge_application_ids in logs

6. **Unexpected Errors (500)**:
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

class BadgeNotInPromotionError extends Error {
  badgeApplicationId: string;
  promotionId: string;

  constructor(badgeApplicationId: string, promotionId: string) {
    super(`Badge application ${badgeApplicationId} is not assigned to promotion ${promotionId}`);
    this.name = 'BadgeNotInPromotionError';
    this.badgeApplicationId = badgeApplicationId;
    this.promotionId = promotionId;
  }
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Badge Assignment Verification**: Query to verify all badges are in promotion
2. **Multiple Deletes**: DELETE operation with IN clause
3. **Optional Status Updates**: UPDATE on badge_applications table
4. **Transaction Overhead**: Transaction setup and commit time

### Optimization Strategies

1. **Batch Badge Verification**:
   - Single query with `WHERE promotion_id = ? AND badge_application_id IN (...)`
   - Check returned count matches requested count
   - Efficient index usage on `(promotion_id, badge_application_id)`

   ```sql
   SELECT badge_application_id
   FROM promotion_badges
   WHERE promotion_id = $1 AND badge_application_id IN ($2, $3, ...);
   ```

2. **Batch Delete**:
   - Use DELETE with IN clause instead of multiple statements
   - Single DELETE statement with multiple values
   - Database processes in one operation

   ```sql
   DELETE FROM promotion_badges
   WHERE promotion_id = $1
     AND badge_application_id IN ($2, $3, $4, ...);
   ```

3. **Optional Batch Update**:
   - If reverting badge status, use single UPDATE with IN clause
   - Only update badges that have status = 'used_in_promotion'
   - Avoids unnecessary updates

   ```sql
   UPDATE badge_applications
   SET status = 'accepted'
   WHERE id IN ($1, $2, $3, ...)
     AND status = 'used_in_promotion';
   ```

4. **Database Optimization**:
   - **Indexes Required** (should already exist):
     - `promotion_badges(promotion_id)` - For filtering by promotion
     - `promotion_badges(badge_application_id)` - For verification
     - `badge_applications(id)` - Primary key
     - `promotions(id)` - Primary key

5. **Transaction Efficiency**:
   - Use Supabase transaction API if available
   - Keep transaction short: validate → delete → (optional update) → commit
   - Don't perform external operations within transaction

### Expected Performance

**Assumptions**:
- Removing 5 badges on average
- Proper indexes in place
- Local database connection

**Query Breakdown**:
- Promotion fetch: ~5-10ms (indexed on id)
- Badge verification: ~5-10ms (indexed, IN clause)
- Batch delete: ~10-15ms (single statement)
- Optional status update: ~10-15ms (if implemented)
- **Total typical request**: ~20-40ms ✅
- **99th Percentile**: ~60ms

**Performance is excellent** for MVP use case.

### Performance Monitoring

- Log slow requests (> 100ms) with badge count
- Track response times by badge count (1, 5, 10, 50)
- Monitor database query execution times
- Set up alerts for degraded performance (> 200ms)

### Load Considerations

- Badge removal is infrequent (users adjust drafts occasionally)
- Not a high-traffic endpoint
- Current approach is sufficient for MVP
- Consider connection pooling for production

## 9. Implementation Steps

### Step 1: Update PromotionService

**File**: `src/lib/promotion.service.ts`

**Purpose**: Add method to remove badges from a promotion

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { RemovePromotionBadgesCommand } from "@/types";

export class PromotionService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Removes badge applications from a promotion draft
   *
   * Validates promotion ownership, status, and badge assignment.
   * Deletes reservation records from promotion_badges junction table.
   * Optionally reverts badge application status to 'accepted'.
   *
   * @param promotionId - Promotion UUID
   * @param command - Badge application IDs to remove
   * @param userId - Current authenticated user ID
   * @returns Success result with removed count
   * @throws PromotionNotFoundError if promotion doesn't exist
   * @throws PromotionNotOwnedError if user doesn't own promotion
   * @throws PromotionNotDraftError if promotion is not in draft status
   * @throws BadgeNotInPromotionError if badge is not assigned to promotion
   * @throws Error on database errors
   */
  async removeBadgesFromPromotion(
    promotionId: string,
    command: RemovePromotionBadgesCommand,
    userId: string
  ): Promise<{ removed_count: number }> {
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

    // Step 2: Verify all badge applications are currently in the promotion
    const { data: currentBadges, error: verifyError } = await this.supabase
      .from("promotion_badges")
      .select("badge_application_id")
      .eq("promotion_id", promotionId)
      .in("badge_application_id", command.badge_application_ids);

    if (verifyError) {
      throw new Error(`Failed to verify badge assignments: ${verifyError.message}`);
    }

    // Check all requested badges are in the promotion
    if (!currentBadges || currentBadges.length !== command.badge_application_ids.length) {
      const foundIds = currentBadges?.map((b) => b.badge_application_id) || [];
      const missingIds = command.badge_application_ids.filter((id) => !foundIds.includes(id));
      throw new Error(
        `Badge application not in promotion: ${missingIds[0]} (promotion: ${promotionId})`
      );
    }

    // Step 3: Delete promotion_badges records
    const { error: deleteError } = await this.supabase
      .from("promotion_badges")
      .delete()
      .eq("promotion_id", promotionId)
      .in("badge_application_id", command.badge_application_ids);

    if (deleteError) {
      throw new Error(`Failed to remove badges from promotion: ${deleteError.message}`);
    }

    // Step 4: (Optional) Revert badge application status to 'accepted'
    // This step is optional depending on your business logic
    // Uncomment if you want to revert status immediately
    /*
    const { error: updateError } = await this.supabase
      .from("badge_applications")
      .update({ status: "accepted" })
      .in("id", command.badge_application_ids)
      .eq("status", "used_in_promotion");

    if (updateError) {
      throw new Error(`Failed to update badge status: ${updateError.message}`);
    }
    */

    // Step 5: Return success result
    return {
      removed_count: command.badge_application_ids.length,
    };
  }
}
```

**Key Points**:
- Validate promotion existence, ownership, and status first
- Verify all requested badges are currently in the promotion
- Delete promotion_badges records in batch
- Optional: Revert badge application status to 'accepted'
- Return removal count

**Error Handling**:
- Clear error messages with context (IDs, status values)
- Throw errors for route handler to catch and map to HTTP status
- No special conflict handling needed (unlike POST)

### Step 2: Create API Route Handler

**File**: `src/pages/api/promotions/[id]/badges.ts` (modify existing file)

**Purpose**: Add DELETE handler to existing file (POST handler should already exist)

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import type { ApiError, RemovePromotionBadgesCommand } from "@/types";
import { z } from "zod";

// Request body validation schema for DELETE
const removePromotionBadgesSchema = z.object({
  badge_application_ids: z
    .array(z.string().uuid("Invalid badge application ID format"))
    .min(1, "At least one badge application ID is required")
    .max(100, "Cannot remove more than 100 badges at once"),
});

/**
 * DELETE /api/promotions/:id/badges
 *
 * Removes badge applications from a promotion draft and releases reservations.
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
 * - Each badge application must be currently assigned to this promotion
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses hardcoded test user ID
 *
 * Production Authorization (when enabled):
 * - User can only remove badges from their own promotions
 * - Promotion must be in draft status
 *
 * @returns 200 OK with success message
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not owner or promotion not draft
 * @returns 404 Not Found if promotion doesn't exist or badge not in promotion
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
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

    const validation = removePromotionBadgesSchema.safeParse(requestBody);

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

    const command: RemovePromotionBadgesCommand = validation.data;

    // =========================================================================
    // Step 4: Remove Badges via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const result = await service.removeBadgesFromPromotion(
      promotionId,
      command,
      userId
    );

    // =========================================================================
    // Step 5: Return Success Response
    // =========================================================================
    const response = {
      message: `${result.removed_count} badge(s) removed successfully`,
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
    console.error("Error in DELETE /api/promotions/:id/badges:", error);

    // Handle specific error types
    if (error instanceof Error) {
      // Promotion not found
      if (error.message.includes("Promotion not found")) {
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

      // Badge not in promotion
      if (error.message.includes("not in promotion")) {
        const badgeIdMatch = error.message.match(/[0-9a-f-]{36}/);
        const badgeId = badgeIdMatch ? badgeIdMatch[0] : "unknown";

        const apiError: ApiError = {
          error: "not_found",
          message: `Badge application ${badgeId} is not assigned to this promotion`,
        };
        return new Response(JSON.stringify(apiError), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to remove badges from promotion",
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
- Return simple success message with removal count

### Step 3: Manual Testing

**Prerequisites**:
- Supabase running locally: `npx supabase start`
- Development server running: `pnpm dev`
- Sample data imported (users, promotions, badge applications)
- Some badges already added to a promotion via POST endpoint

**Test Scenarios**:

**1. Remove Single Badge from Promotion**:
```bash
# First, add a badge to a promotion
PROMOTION_ID=$(curl -s 'http://localhost:3000/api/promotions?status=draft' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

BADGE_APP_ID=$(curl -s 'http://localhost:3000/api/badge-applications?status=accepted' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

# Add badge first
curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}"

# Now remove it
curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}"
```
**Expected**: 200 OK with message "1 badge(s) removed successfully"

**2. Remove Multiple Badges**:
```bash
# Add multiple badges first
BADGE_IDS=$(curl -s 'http://localhost:3000/api/badge-applications?status=accepted&limit=3' | \
  python3 -c "import json,sys; ids=[b['id'] for b in json.load(sys.stdin)['data']]; print(json.dumps(ids))")

curl -X POST "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": $BADGE_IDS}"

# Remove them
curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": $BADGE_IDS}"
```
**Expected**: 200 OK with message "3 badge(s) removed successfully"

**3. Missing Request Body**:
```bash
curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json'
```
**Expected**: 400 Bad Request with validation error

**4. Empty badge_application_ids Array**:
```bash
curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": []}'
```
**Expected**: 400 Bad Request with "At least one badge application ID is required"

**5. Invalid UUID Format**:
```bash
curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["invalid-uuid"]}'
```
**Expected**: 400 Bad Request with "Invalid badge application ID format"

**6. Invalid Promotion ID**:
```bash
curl -X DELETE 'http://localhost:3000/api/promotions/invalid-uuid/badges' \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["650e8400-e29b-41d4-a716-446655440010"]}'
```
**Expected**: 400 Bad Request with "Invalid promotion ID format"

**7. Promotion Not Found**:
```bash
curl -X DELETE 'http://localhost:3000/api/promotions/850e8400-0000-0000-0000-000000000000/badges' \
  -H 'Content-Type: application/json' \
  -d '{"badge_application_ids": ["650e8400-e29b-41d4-a716-446655440010"]}'
```
**Expected**: 404 Not Found with "Promotion not found"

**8. Badge Not in Promotion**:
```bash
# Try to remove a badge that was never added
RANDOM_BADGE=$(curl -s 'http://localhost:3000/api/badge-applications?status=accepted&offset=10' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$RANDOM_BADGE\"]}"
```
**Expected**: 404 Not Found with "Badge application not assigned to this promotion"

**9. Non-Draft Promotion**:
```bash
# Change promotion status
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "UPDATE promotions SET status = 'submitted' WHERE id = '$PROMOTION_ID';"

curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}"

# Restore status
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "UPDATE promotions SET status = 'draft' WHERE id = '$PROMOTION_ID';"
```
**Expected**: 403 Forbidden with "Only draft promotions can be modified"

**10. Verify Database State**:
```bash
# After removing badges, verify they're gone
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "SELECT COUNT(*) FROM promotion_badges WHERE promotion_id = '$PROMOTION_ID';"
```
**Expected**: 0 rows (or fewer if some remain)

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
**Expected**: No type errors in new code

### Step 5: Performance Testing

**Actions**:

1. **Measure Response Time (Single Badge)**:
```bash
curl -w "\nTime: %{time_total}s\n" -s -X DELETE \
  "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": [\"$BADGE_APP_ID\"]}" \
  > /dev/null
```
**Expected**: < 50ms

2. **Measure Response Time (10 Badges)**:
```bash
curl -w "\nTime: %{time_total}s\n" -s -X DELETE \
  "http://localhost:3000/api/promotions/$PROMOTION_ID/badges" \
  -H 'Content-Type: application/json' \
  -d "{\"badge_application_ids\": $BADGE_IDS_10}" \
  > /dev/null
```
**Expected**: < 100ms

3. **Verify Database Indexes**:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "SELECT tablename, indexname, indexdef
   FROM pg_indexes
   WHERE tablename IN ('promotions', 'promotion_badges')
   ORDER BY tablename, indexname;"
```
**Expected**: Required indexes exist

## 10. Future Enhancements

### 1. Badge Status Reversion

**Why**: Immediately mark removed badges as 'accepted' again
**Implementation**: Uncomment the UPDATE statement in service method
**Benefit**: Clearer badge state, easier to track availability
**Trade-off**: Additional query, need to handle edge cases
**Priority**: Medium (clarifies badge lifecycle)

### 2. Partial Success Handling

**Why**: Remove some badges even if others fail validation
**Implementation**: Process each badge individually, collect successes and failures
**Benefit**: User sees partial progress
**Trade-off**: More complex error handling, transaction considerations
**Priority**: Low (all-or-nothing is simpler for MVP)

### 3. Audit Logging

**Why**: Track who removes badges and when
**Implementation**: Insert into audit_logs table with event type 'promotion.badge_removed'
**Payload**: `{ promotion_id, badge_application_ids, user_id }`
**Priority**: Low (useful for analytics, not critical for MVP)

### 4. Webhook/Notification

**Why**: Notify user when badges removed (e.g., undo functionality)
**Implementation**: Trigger webhook after successful delete
**Use Case**: Real-time UI update in other tabs/devices
**Priority**: Very Low (out of MVP scope)

### 5. Bulk Operations Optimization

**Why**: Optimize for removing many badges at once
**Implementation**: Use PostgreSQL's RETURNING clause to get deleted records
**Benefit**: Single query for delete + status update
**Priority**: Low (current batch approach is efficient)

### 6. Undo Functionality

**Why**: Allow users to undo badge removal
**Implementation**: Soft delete with 'removed_at' timestamp, cleanup after 24h
**Benefit**: Better UX, prevents mistakes
**Priority**: Low (nice-to-have feature)

---

## Notes & Assumptions

- Authentication is disabled for development and will be implemented later
- Test user ID is fetched from database for development testing
- Simple success message response for MVP
- Badge application status reversion is optional (implementation choice)
  - Can be done immediately (uncomment code in service)
  - Or done later when promotion is deleted/rejected
- Deleting from promotion_badges automatically releases unique constraint
- Batch delete for performance (single DELETE with IN clause)
- Batch verification for performance (single SELECT with IN clause)
- Database foreign keys prevent invalid deletions
- No transaction needed for single DELETE operation (atomic by default)
- Service layer throws errors, route handler maps to HTTP status codes
- Error messages include IDs for debugging
- Performance is excellent due to batch operations and proper indexes (< 50ms for typical requests)
- Maximum 100 badges per request to prevent resource exhaustion

---

**End of Implementation Plan**
