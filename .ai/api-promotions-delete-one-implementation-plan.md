# API Endpoint Implementation Plan: DELETE /api/promotions/:id

## 1. Endpoint Overview

This endpoint deletes a promotion that is in draft status. Only the promotion creator can delete their own draft promotions. Deleting a promotion automatically cascades to the `promotion_badges` junction table, which unlocks all badge applications that were reserved for this promotion, making them available for use in other promotions.

**Key Features**:
- Delete draft promotions only
- Ownership validation (creator-only access)
- Status validation (draft-only deletion)
- Automatic cascade delete to promotion_badges
- Unlocks reserved badge applications

**Business Context**:
This endpoint is used when:
- User decides to abandon a draft promotion
- User wants to start over with a different template
- User needs to clean up unused draft promotions
- Cleaning up test or accidental promotion drafts

**Key Business Rules**:
- Only deletable if `status = 'draft'`
- Only deletable by promotion creator (`created_by = current_user.id`)
- Cascades delete to `promotion_badges` table (via ON DELETE CASCADE)
- Badge applications are automatically unlocked and become available again
- Cannot delete submitted, approved, or rejected promotions

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/promotions/:id`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: Only promotion creator can delete their draft promotions

### Path Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format, must exist | ID of promotion to delete |

### Request Body

None - DELETE operations do not have a request body.

### Request Examples

**Valid Request**:
```bash
DELETE /api/promotions/850e8400-e29b-41d4-a716-446655440030
```

**Invalid UUID Format**:
```bash
DELETE /api/promotions/invalid-uuid
```
Expected: 400 Bad Request with validation error

**Non-existent Promotion**:
```bash
DELETE /api/promotions/850e8400-0000-0000-0000-000000000000
```
Expected: 404 Not Found

**Non-draft Promotion**:
```bash
DELETE /api/promotions/{id-of-submitted-promotion}
```
Expected: 403 Forbidden

## 3. Used Types

### From `src/types.ts`

**No Command Model Needed** - DELETE operations don't have request body

**Response Types**:
```typescript
// Success response (simple message object)
interface DeletePromotionResponse {
  message: string;
}
```

**Database Types**:
```typescript
export type PromotionRow = Tables<"promotions">;
```

**Error Types**:
```typescript
interface ApiError {
  error: string;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Path Parameter Validation Schema

```typescript
import { z } from "zod";

const deletePromotionParamsSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

type DeletePromotionParams = z.infer<typeof deletePromotionParamsSchema>;
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "message": "Promotion deleted successfully"
}
```

**Response Characteristics**:
- Simple success message
- No complex object returned
- HTTP 200 OK status (standard for successful DELETE)
- Promotion and associated promotion_badges records are deleted from database
- Badge applications are unlocked automatically

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
}
```

**Trigger**: Path parameter is not a valid UUID

#### 401 Unauthorized (when auth enabled)

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**Trigger**: No valid authentication session

#### 403 Forbidden - Not Owner or Not Draft Status

**Option 1: Specific Error Messages** (current approach in API plan)
```json
{
  "error": "forbidden",
  "message": "You do not have permission to delete this promotion"
}
```
```json
{
  "error": "forbidden",
  "message": "Only draft promotions can be deleted"
}
```

**Option 2: Generic Error Message** (more secure, prevents information disclosure)
```json
{
  "error": "forbidden",
  "message": "You do not have permission to delete this promotion"
}
```

**Recommendation**: Use Option 2 (generic message) to avoid leaking promotion status to unauthorized users.

**Trigger**: User is not the creator OR promotion status is not 'draft'

#### 404 Not Found - Promotion Not Found

```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

**Trigger**: No promotion exists with the provided ID

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "Failed to delete promotion"
}
```

**Trigger**: Database errors, unexpected exceptions

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ DELETE /api/promotions/:id
       │
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│       src/pages/api/promotions/[id].ts              │
│                                                      │
│  1. Extract id from URL params                      │
│  2. Validate id is valid UUID (Zod)                 │
│  3. (Future) Get user from auth session             │
│  4. Extract userId for authorization                │
└──────┬──────────────────────────────────────────────┘
       │ promotionId, userId
       ▼
┌─────────────────────────────────────────────────────┐
│              PromotionService                       │
│        src/lib/promotion.service.ts                 │
│                                                      │
│  deletePromotion(promotionId, userId)               │
│  1. Fetch promotion by ID                           │
│  2. Check if promotion exists                       │
│  3. If not found: throw error                       │
│  4. Check if status === 'draft'                     │
│  5. If not draft: throw error                       │
│  6. Check if created_by === userId                  │
│  7. If not owner: throw error                       │
│  8. Delete promotion record                         │
│  9. CASCADE automatically deletes promotion_badges  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Transaction:                                       │
│  1. SELECT from promotions                          │
│     WHERE id = $1                                   │
│                                                      │
│  2. Validate status and ownership                   │
│                                                      │
│  3. DELETE from promotions                          │
│     WHERE id = $1                                   │
│                                                      │
│  Automatic CASCADE:                                 │
│  4. DELETE from promotion_badges                    │
│     WHERE promotion_id = $1                         │
│     (via ON DELETE CASCADE foreign key)             │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  Tables Affected:                                   │
│  - promotions (record deleted)                      │
│  - promotion_badges (cascade deleted)               │
│                                                      │
│  Badge Applications:                                │
│  - No longer have promotion_badges reference        │
│  - Available for use in other promotions            │
│  - Unique constraint no longer blocks reservation   │
│                                                      │
│  Foreign Key Constraint:                            │
│  - promotion_badges.promotion_id                    │
│    REFERENCES promotions(id) ON DELETE CASCADE      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Success
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Return 200 OK with success message              │
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

- **Ownership Enforcement**:
  - Must validate `created_by = current_user.id`
  - User cannot delete other users' promotions
  - Server-side enforcement prevents privilege escalation

- **Status Enforcement**:
  - Must validate `status = 'draft'`
  - Cannot delete submitted, approved, or rejected promotions
  - Prevents deletion of promotions in review or completed

### Input Validation

- **Path Parameter Validation**:
  - Use Zod schema to validate UUID format
  - Reject invalid UUIDs with 400
  - Example: `z.string().uuid()`

- **Promotion Validation**:
  - Verify promotion exists in database
  - Verify status is 'draft'
  - Verify created_by matches current user
  - Return appropriate error codes (404, 403)

### Data Integrity

- **Cascade Delete Safety**:
  - ON DELETE CASCADE is intentional design
  - Deleting promotion should unlock badge applications
  - No orphaned promotion_badges records
  - Badge applications remain intact (not deleted)

- **Status Restriction**:
  - Prevents deletion of promotions under review
  - Prevents deletion of approved promotions
  - Maintains data integrity for historical records

### Information Disclosure

- **Prevent Information Leakage**:
  - Consider using generic 403 message for both ownership and status errors
  - Avoids revealing promotion existence and status to unauthorized users
  - Balance security with user experience

- **Error Message Strategy**:
  - **Current Approach**: Specific messages ("not draft", "not owner")
  - **Recommended Approach**: Generic message ("no permission to delete")
  - **Trade-off**: Security vs. developer experience

### SQL Injection Prevention

- **Mitigation**:
  - Use Supabase query builder exclusively (parameterized queries)
  - UUID validation prevents injection attempts
  - No string concatenation in queries
  - Supabase client handles query escaping automatically

### OWASP Top 10 Considerations

1. **A01:2021 - Broken Access Control**:
   - Mitigated by ownership check (created_by = current_user.id)
   - Mitigated by status check (only draft deletable)
   - Cannot delete other users' promotions
   - Cannot delete non-draft promotions

2. **A03:2021 - Injection**:
   - Mitigated by using ORM/query builder and UUID validation
   - Parameterized queries prevent SQL injection
   - Zod validation prevents malformed input

3. **A04:2021 - Insecure Design**:
   - Cascade deletes are intentional (unlock badges)
   - Status restriction prevents accidental deletion
   - Ownership check prevents unauthorized deletion

4. **A05:2021 - Security Misconfiguration**:
   - Follow Astro/Supabase security best practices
   - Return generic error messages for 500 errors
   - No debug information in production responses

5. **Information Disclosure**:
   - Consider 404 vs 403 trade-off
   - Generic messages prevent enumeration
   - Don't reveal internal database details

### Additional Security Measures

- **UUID Enumeration**: Not a major concern (high entropy, ownership check)
- **Audit Trail**: Consider logging deletions for compliance
- **Soft Delete**: Consider soft delete (status='deleted') vs hard delete
- **Rate Limiting**: Consider at infrastructure level (future)

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid UUID format | 400 | `validation_error` | Validate with Zod in route handler |
| Not authenticated | 401 | `unauthorized` | Check auth session (when enabled) |
| Not owner | 403 | `forbidden` | Check created_by in service |
| Status not draft | 403 | `forbidden` | Check status in service |
| Promotion not found | 404 | `not_found` | Check existence in service |
| Foreign key violation | 500 | `internal_error` | Should not occur (CASCADE handles) |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Unexpected exception | 500 | `internal_error` | Catch all, log, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Validate path parameter with Zod schema
   - Return structured error response with field-level details
   - Don't proceed to service if validation fails

2. **Authentication Errors (401)**:
   - Check user session via Supabase auth (when enabled)
   - Return early if not authenticated
   - Clear error message: "Authentication required"

3. **Authorization Errors (403)**:
   - Service throws specific errors for ownership/status violations
   - Route handler catches and maps to 403
   - **Recommendation**: Use generic message for both cases
   - Message: "You do not have permission to delete this promotion"

4. **Not Found Errors (404)**:
   - Service throws error when promotion doesn't exist
   - Route handler returns 404
   - Message: "Promotion not found"

5. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details

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

### Custom Error Classes (Optional)

Consider creating custom error classes in service layer:
```typescript
class PromotionNotFoundError extends Error {
  constructor(promotionId: string) {
    super(`Promotion ${promotionId} not found`);
    this.name = 'PromotionNotFoundError';
  }
}

class PromotionNotDraftError extends Error {
  constructor(status: string) {
    super(`Promotion status is ${status}, only draft promotions can be deleted`);
    this.name = 'PromotionNotDraftError';
  }
}

class PromotionNotOwnedError extends Error {
  constructor() {
    super('You do not own this promotion');
    this.name = 'PromotionNotOwnedError';
  }
}
```

Benefits: Type-safe error handling, clearer intent, easier testing

## 8. Performance Considerations

### Potential Bottlenecks

1. **Promotion Fetch Query**: Single SELECT by primary key (very fast)
2. **Delete Query**: Single DELETE by primary key (very fast)
3. **Cascade Delete**: Automatic deletion of promotion_badges (fast, indexed)
4. **Network Latency**: Client to server to database
5. **No Complex Joins**: Simple single-table operations

### Optimization Strategies

1. **Database Optimization**:
   - **Indexes Used** (should already exist):
     - `promotions(id)` - Primary key (indexed)
     - `promotions(created_by)` - For ownership filter (indexed)
     - `promotions(status)` - For status filter (indexed)
     - `promotion_badges(promotion_id)` - Foreign key (indexed)

   - **Query Pattern**:
     ```sql
     -- Fetch and validate
     SELECT id, status, created_by
     FROM promotions
     WHERE id = $1;

     -- Delete (if validation passes)
     DELETE FROM promotions
     WHERE id = $1;

     -- Automatic cascade
     DELETE FROM promotion_badges
     WHERE promotion_id = $1;
     ```

2. **Single Transaction**:
   - Fetch and delete in single database round trip
   - Use transaction for atomicity
   - Rollback on validation failure

3. **Response Size**:
   - Minimal response (success message only)
   - No large object serialization
   - Fast response time

4. **Cascade Performance**:
   - Foreign key cascade is database-level (very efficient)
   - Indexed foreign key ensures fast cascade delete
   - No application-level logic needed

### Expected Performance

Based on indexed queries and simple DELETE:

- **Promotion Fetch Query**: 1-5ms
- **Promotion Delete Query**: 5-10ms
- **Cascade Delete (promotion_badges)**: 5-10ms (depends on badge count)
- **Total Database Time**: 10-25ms
- **Total Response Time**: < 50ms (excluding network latency)
- **99th Percentile**: < 100ms

**Performance is excellent** - simple indexed operations.

### Performance Monitoring

- Log slow requests (> 100ms) with promotion_id
- Track deletion rate by user
- Monitor cascade delete performance (badge count)
- Set up alerts for degraded performance (> 200ms)
- Track error rate for failed deletions

### Load Considerations

- Promotion deletion is infrequent (users rarely delete drafts)
- Not a high-traffic endpoint
- No need for advanced optimization
- Current approach is sufficient for MVP
- Consider soft delete if deletion history needed

## 9. Implementation Steps

### Step 1: Add deletePromotion Method to PromotionService

**File**: `src/lib/promotion.service.ts` (update existing file)

**Purpose**: Add method to delete a draft promotion

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { Database } from "@/db/database.types";

export class PromotionService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Deletes a draft promotion
   *
   * Validates that the promotion exists, is in draft status, and belongs to the
   * current user. Deletion cascades to promotion_badges, unlocking badge applications.
   *
   * @param promotionId - ID of promotion to delete
   * @param userId - Current authenticated user ID (for ownership check)
   * @throws Error if promotion not found, not draft, or not owned by user
   */
  async deletePromotion(promotionId: string, userId: string): Promise<void> {
    // =========================================================================
    // Step 1: Fetch Promotion and Validate
    // =========================================================================
    const { data: promotion, error: fetchError } = await this.supabase
      .from("promotions")
      .select("id, status, created_by")
      .eq("id", promotionId)
      .single();

    // Handle promotion not found
    if (fetchError || !promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    // Handle status validation
    if (promotion.status !== "draft") {
      throw new Error(
        `Only draft promotions can be deleted. Current status: ${promotion.status}`
      );
    }

    // Handle ownership validation
    if (promotion.created_by !== userId) {
      throw new Error("You do not have permission to delete this promotion");
    }

    // =========================================================================
    // Step 2: Delete Promotion (CASCADE to promotion_badges)
    // =========================================================================
    const { error: deleteError } = await this.supabase
      .from("promotions")
      .delete()
      .eq("id", promotionId);

    if (deleteError) {
      throw new Error(`Failed to delete promotion: ${deleteError.message}`);
    }

    // Cascade delete to promotion_badges happens automatically via ON DELETE CASCADE
    // Badge applications are now unlocked and available for other promotions
  }
}
```

**Key Points**:
- Fetch promotion to validate existence, status, and ownership
- Throw clear errors for each validation failure
- Single DELETE query (cascade handled by database)
- No need to manually delete promotion_badges (CASCADE handles it)
- Type-safe with TypeScript

**Error Handling**:
- Promotion not found: Throw error with promotion ID
- Status not draft: Throw error with current status
- Not owner: Throw error (generic message for security)
- Database errors: Throw error with context

### Step 2: Add DELETE Handler to API Route

**File**: `src/pages/api/promotions/[id].ts` (update existing file)

**Purpose**: Handle HTTP DELETE request for promotion deletion

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import type { ApiError } from "@/types";
import { z } from "zod";

// Path parameter validation schema
const deletePromotionParamsSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

/**
 * DELETE /api/promotions/:id
 *
 * Deletes a promotion in draft status. Only the promotion creator can delete
 * their own draft promotions. Deletion cascades to promotion_badges, unlocking
 * all badge applications that were reserved for this promotion.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of promotion to delete (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Uses first available user ID from database
 *
 * Production Authorization (when enabled):
 * - Only promotion creator can delete
 * - Only draft promotions can be deleted
 *
 * @returns 200 OK with success message
 * @returns 400 Bad Request if invalid UUID
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not owner or not draft status
 * @returns 404 Not Found if promotion doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const paramsValidation = deletePromotionParamsSchema.safeParse(context.params);

    if (!paramsValidation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: promotionId } = paramsValidation.data;

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
    // Step 3: Delete Promotion via Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    await service.deletePromotion(promotionId, userId);

    // =========================================================================
    // Step 4: Return Success Response
    // =========================================================================
    return new Response(
      JSON.stringify({ message: "Promotion deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // =========================================================================
    // Error Handling
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /api/promotions/:id:", error);

    // Handle promotion not found
    if (error instanceof Error && error.message.includes("not found")) {
      const apiError: ApiError = {
        error: "not_found",
        message: "Promotion not found",
      };
      return new Response(JSON.stringify(apiError), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle authorization errors (not owner or not draft)
    if (
      error instanceof Error &&
      (error.message.includes("permission") ||
        error.message.includes("Only draft"))
    ) {
      const apiError: ApiError = {
        error: "forbidden",
        message: "You do not have permission to delete this promotion",
      };
      return new Response(JSON.stringify(apiError), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "Failed to delete promotion",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

**Key Points**:
- Validate path parameter with Zod before calling service
- Use service layer for business logic
- Return 200 OK with success message
- Map service errors to appropriate HTTP status codes
- Generic 403 message for both ownership and status errors (security)
- Authentication placeholder (disabled for development)

### Step 3: Manual Testing

**Prerequisites**:
- Supabase running locally: `npx supabase start`
- Development server running: `pnpm dev`
- Sample data imported (users, promotions)

**Test Scenarios**:

**1. Create a Draft Promotion** (for testing):
```bash
# First, create a draft promotion to delete
TEMPLATE_ID=$(curl -s 'http://localhost:3000/api/promotion-templates?is_active=true&limit=1' | python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")

PROMOTION_ID=$(curl -s -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d "{\"template_id\": \"$TEMPLATE_ID\"}" | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

echo "Created promotion: $PROMOTION_ID"
```

**2. Delete Draft Promotion (Success)**:
```bash
curl -X DELETE "http://localhost:3000/api/promotions/$PROMOTION_ID"
```
**Expected**: 200 OK with `{"message": "Promotion deleted successfully"}`

**3. Verify Deletion in Database**:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT COUNT(*) FROM promotions WHERE id = '$PROMOTION_ID';"
```
**Expected**: COUNT = 0 (promotion deleted)

**4. Verify Cascade Delete to promotion_badges**:
```bash
# First, create promotion with badges, then delete
# Create promotion
PROMOTION_ID=$(curl -s -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d "{\"template_id\": \"$TEMPLATE_ID\"}" | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

# Add badges to promotion (if POST /api/promotions/:id/badges is implemented)
# Then delete promotion

# Verify promotion_badges are also deleted
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT COUNT(*) FROM promotion_badges WHERE promotion_id = '$PROMOTION_ID';"
```
**Expected**: COUNT = 0 (cascade deleted)

**5. Invalid UUID Format (400)**:
```bash
curl -X DELETE 'http://localhost:3000/api/promotions/invalid-uuid'
```
**Expected**: 400 Bad Request with "Invalid promotion ID format"

**6. Non-existent Promotion (404)**:
```bash
curl -X DELETE 'http://localhost:3000/api/promotions/850e8400-0000-0000-0000-000000000000'
```
**Expected**: 404 Not Found with "Promotion not found"

**7. Non-draft Promotion (403)**:
```bash
# First, find a submitted/approved promotion
SUBMITTED_PROMO=$(psql postgresql://postgres:postgres@localhost:54322/postgres \
  -t -c "SELECT id FROM promotions WHERE status != 'draft' LIMIT 1;")

# Try to delete it
curl -X DELETE "http://localhost:3000/api/promotions/$SUBMITTED_PROMO"
```
**Expected**: 403 Forbidden with "You do not have permission to delete this promotion"

**8. Performance Test**:
```bash
time curl -w "\nTime: %{time_total}s\n" -s -X DELETE \
  "http://localhost:3000/api/promotions/$PROMOTION_ID" \
  > /dev/null
```
**Expected**: Response time < 100ms

### Step 4: Integration Tests

**File**: `src/pages/api/__tests__/promotions.delete.endpoint.spec.ts` (new file, when test framework available)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('DELETE /api/promotions/:id', () => {
  let testUserId: string;
  let testPromotionId: string;

  beforeEach(async () => {
    // Setup test data
    // Create test user and draft promotion
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('Success Cases', () => {
    it('deletes draft promotion successfully', async () => {
      // Test with valid draft promotion
      // Expected: 200 OK with success message
    });

    it('cascades delete to promotion_badges', async () => {
      // Test that promotion_badges are also deleted
      // Expected: promotion_badges records removed
    });

    it('unlocks badge applications', async () => {
      // Test that badges become available after deletion
      // Expected: Can add same badges to new promotion
    });
  });

  describe('Validation Errors', () => {
    it('returns 400 for invalid UUID format', async () => {
      // Test with invalid UUID
      // Expected: 400 with validation error
    });
  });

  describe('Not Found Cases', () => {
    it('returns 404 for non-existent promotion', async () => {
      // Test with valid UUID that doesn't exist
      // Expected: 404 Not Found
    });
  });

  describe('Authorization Cases', () => {
    it('returns 403 for non-draft promotion', async () => {
      // Test with submitted/approved promotion
      // Expected: 403 Forbidden
    });

    it('returns 403 for other user\'s promotion', async () => {
      // Test with promotion owned by different user
      // Expected: 403 Forbidden
    });

    it('uses generic error message for security', async () => {
      // Test error messages don't leak info
      // Expected: Same 403 message for status and ownership errors
    });
  });

  describe('Database Constraints', () => {
    it('cascade deletes promotion_badges', async () => {
      // Test CASCADE behavior
      // Expected: promotion_badges records deleted
    });

    it('does not delete badge applications', async () => {
      // Test badge applications remain
      // Expected: badge_applications still exist
    });
  });

  describe('Error Handling', () => {
    it('returns 500 for database connection errors', async () => {
      // Mock database connection failure
      // Expected: 500 with generic error message
    });

    it('does not expose internal error details', async () => {
      // Mock internal error
      // Expected: Generic error message, no stack trace
    });
  });
});
```

**Test Coverage Goals**:
- Success Cases: 3 tests
- Validation Errors: 1 test
- Not Found Cases: 1 test
- Authorization: 3 tests
- Database Constraints: 2 tests
- Error Handling: 2 tests
- **Total: ~12 tests**

### Step 5: Service Tests

**File**: `src/lib/__tests__/promotion.service.delete.spec.ts` (new file or update existing)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PromotionService } from '../promotion.service';

describe('PromotionService.deletePromotion', () => {
  let service: PromotionService;
  let testPromotionId: string;
  let testUserId: string;

  beforeEach(() => {
    // Setup test dependencies
    // Create mock Supabase client
    // Create test fixtures
  });

  describe('Success Cases', () => {
    it('deletes draft promotion owned by user', async () => {
      // Test successful deletion
    });

    it('does not throw error on successful deletion', async () => {
      // Test no errors for valid case
    });
  });

  describe('Validation', () => {
    it('throws error when promotion not found', async () => {
      // Test with non-existent ID
      // Expected: Error thrown with "not found" message
    });

    it('throws error when status is not draft', async () => {
      // Test with submitted/approved promotion
      // Expected: Error thrown with status message
    });

    it('throws error when user is not owner', async () => {
      // Test with different user
      // Expected: Error thrown with permission message
    });
  });

  describe('Error Handling', () => {
    it('throws error on database failure', async () => {
      // Mock database error
      // Expected: Error thrown with context
    });

    it('includes promotion ID in error messages', async () => {
      // Test error message content
      // Expected: promotion ID included for debugging
    });
  });
});
```

### Step 6: Verify Build and Linting

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

### Step 7: Documentation and Cleanup

**Actions**:

1. **Update API Documentation** (if exists):
   - Document DELETE endpoint
   - Include curl examples
   - Note cascade behavior

2. **Code Comments**:
   - Ensure service method is well-documented
   - Note cascade delete behavior
   - Explain security considerations

3. **Cleanup**:
   - Remove any test promotions created during testing
   - Verify no orphaned records in promotion_badges

## 10. Future Enhancements

### 1. Soft Delete

**Why**: Preserve deletion history for audit and recovery
**Implementation**: Add `deleted_at` timestamp instead of hard delete
**Benefit**: Can restore accidentally deleted promotions
**Priority**: Medium (useful for compliance and user experience)

### 2. Audit Logging

**Why**: Track who deletes promotions and when
**Implementation**: Insert record into audit_logs table before deletion
**Event Type**: `promotion.deleted`
**Payload**: `{ promotion_id, template_id, user_id, badge_count }`
**Priority**: Medium (useful for analytics and compliance)

### 3. Confirmation Requirement

**Why**: Prevent accidental deletions
**Implementation**: Require confirmation parameter or two-step process
**UI**: Show confirmation modal before DELETE request
**Priority**: Low (UI concern, not API concern)

### 4. Batch Delete

**Why**: Delete multiple draft promotions at once
**Implementation**: Accept array of promotion IDs
**Use Case**: Cleanup of old drafts
**Priority**: Very Low (not a common use case)

### 5. Undo/Restore

**Why**: Allow users to restore recently deleted promotions
**Implementation**: Soft delete + restore endpoint
**Time Window**: 30 days
**Priority**: Low (nice to have, adds complexity)

### 6. Delete Restrictions

**Why**: Additional business rules for deletion
**Implementation**: Check if promotion has too many badges, recent activity, etc.
**Example**: Cannot delete if created within last hour
**Priority**: Very Low (not in requirements)

---

## Notes & Assumptions

- Authentication is disabled for development and will be implemented later
- Test user ID is fetched from database for development testing
- Cascade delete to promotion_badges is handled by database (ON DELETE CASCADE)
- Badge applications are automatically unlocked when promotion is deleted
- Status must be 'draft' to allow deletion (business rule)
- created_by must match current user (ownership rule)
- Generic 403 message used for both ownership and status errors (security)
- Hard delete is used (no soft delete in MVP)
- No audit logging in MVP (can be added later)
- Performance is excellent due to simple indexed operations (< 50ms expected)
- Service layer throws errors, route handler maps to HTTP status codes
