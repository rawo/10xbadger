# API Endpoint Implementation Plan: POST /api/catalog-badges/:id/deactivate

## 1. Endpoint Overview

**Purpose**: Deactivates a catalog badge by setting its status to `inactive` and recording the deactivation timestamp. This is an admin-only operation that prevents the badge from appearing in catalog searches for non-admin users while preserving existing badge applications that reference it.

**HTTP Method**: POST

**URL Pattern**: `/api/catalog-badges/:id/deactivate`

**Authentication**: Required (Admin only) - *Currently disabled for development*

**Key Business Rules**:
- Only active badges can be deactivated (409 Conflict if already inactive)
- Sets `status = 'inactive'` and `deactivated_at = NOW()`
- Existing badge applications remain valid and unchanged
- Deactivated badges are hidden from non-admin catalog searches
- Admin users can still view deactivated badges when filtering by status

**Why POST instead of PUT/DELETE**:
- Follows REST convention for actions/state transitions
- Distinct from `PUT /api/catalog-badges/:id` (which updates badge content)
- Semantically represents an action ("deactivate this badge") rather than resource modification

---

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
```
POST /api/catalog-badges/:id/deactivate
```

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | string (UUID) | Yes | Must be valid UUID format | The unique identifier of the catalog badge to deactivate |

### Request Body
**None** - This endpoint does not accept a request body. The action is fully described by the URL.

### Headers
- `Content-Type: application/json` (standard, though no body required)
- Authentication headers (to be added in production)

### Example Request
```bash
POST /api/catalog-badges/550e8400-e29b-41d4-a716-446655440001/deactivate
```

---

## 3. Used Types

### Input Types
**Path Parameter Validation Schema**:
```typescript
// No new type needed, uses existing UUID validation
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid badge ID format")
});
```

### Output Types
**Response Type**: `CatalogBadgeDetailDto` (from `@/types.ts`)

The response returns the complete badge object with:
```typescript
interface CatalogBadgeDetailDto {
  id: string;
  title: string;
  description: string | null;
  category: BadgeCategoryType;
  level: BadgeLevelType;
  status: "inactive"; // Will always be 'inactive' in success response
  created_by: string;
  created_at: string;
  deactivated_at: string; // Will be set to current timestamp
  version: number;
  metadata: Record<string, unknown>;
}
```

### Error Types
- `ApiError` - Standard error response
- `InvalidStatusError` - For 409 Conflict when badge already inactive

---

## 4. Response Details

### Success Response (200 OK)

**Status Code**: `200 OK`

**Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge...",
  "category": "technical",
  "level": "gold",
  "status": "inactive",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": "2025-01-22T16:00:00Z",
  "version": 2,
  "metadata": {}
}
```

**Key Fields in Response**:
- `status`: Will always be `"inactive"`
- `deactivated_at`: Timestamp when deactivation occurred
- `version`: Current version (unchanged by deactivation)

### Error Responses

#### 400 Bad Request - Invalid UUID
```json
{
  "error": "validation_error",
  "message": "Invalid badge ID format",
  "details": [
    {
      "field": "id",
      "message": "Invalid badge ID format"
    }
  ]
}
```

#### 401 Unauthorized (Production Only)
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden (Production Only)
```json
{
  "error": "forbidden",
  "message": "Admin access required"
}
```

#### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Catalog badge not found"
}
```

#### 409 Conflict - Already Inactive
```json
{
  "error": "invalid_status",
  "message": "Badge is already inactive",
  "current_status": "inactive"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while deactivating the catalog badge"
}
```

---

## 5. Data Flow

### Request Flow Diagram
```
1. Request arrives: POST /api/catalog-badges/:id/deactivate
   ↓
2. Extract and validate path parameter (id must be UUID)
   ↓
3. [DEVELOPMENT] Skip authentication (use default admin user)
   [PRODUCTION] Authenticate user and verify admin status
   ↓
4. Call service: CatalogBadgeService.deactivateCatalogBadge(id)
   ↓
5. Service checks badge exists (SELECT by id)
   ↓
6. Service checks badge status (must be 'active')
   ↓
7. Service updates badge: SET status='inactive', deactivated_at=NOW()
   ↓
8. Service returns updated badge
   ↓
9. Route handler returns 200 OK with badge details
```

### Database Operations

**Step 1: Read badge**
```sql
SELECT * FROM catalog_badges WHERE id = $1;
```

**Step 2: Validate status**
```typescript
if (badge.status === 'inactive') {
  throw new Error('Badge is already inactive');
}
```

**Step 3: Update badge**
```sql
UPDATE catalog_badges
SET status = 'inactive',
    deactivated_at = NOW()
WHERE id = $1
RETURNING *;
```

### Service Method Pseudocode
```typescript
async deactivateCatalogBadge(id: string): Promise<CatalogBadgeDetailDto> {
  // Fetch badge
  const badge = await this.supabase
    .from('catalog_badges')
    .select('*')
    .eq('id', id)
    .single();

  // Handle not found
  if (!badge) return null;

  // Check if already inactive
  if (badge.status === 'inactive') {
    throw new ConflictError('Badge is already inactive');
  }

  // Update badge
  const result = await this.supabase
    .from('catalog_badges')
    .update({
      status: 'inactive',
      deactivated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  return result;
}
```

---

## 6. Security Considerations

### Authentication & Authorization

**Development Mode** (Current):
- Authentication is **DISABLED**
- No admin check performed
- Default admin user assumed for testing

**Production Mode** (Future):
1. **Authentication Check**:
   - Verify user session/JWT token
   - Return 401 if not authenticated

2. **Authorization Check**:
   - Query `users` table to get `is_admin` flag
   - Return 403 if `is_admin = false`

3. **Admin-Only Operation**:
   - Only users with `is_admin = true` can deactivate badges
   - Non-admin users receive 403 Forbidden

### Input Validation

1. **UUID Format Validation**:
   - Use Zod schema to validate UUID format
   - Prevents SQL injection and invalid queries
   - Returns 400 Bad Request for invalid UUIDs

2. **SQL Injection Prevention**:
   - Supabase client uses parameterized queries
   - No raw SQL concatenation
   - UUID validation provides additional layer

3. **Path Traversal Prevention**:
   - UUID format ensures no `../` or filesystem paths
   - Direct database lookup by ID

### Business Logic Security

1. **Idempotency Consideration**:
   - Second deactivation returns 409 Conflict (not 200)
   - Prevents accidental double-actions
   - Clear error message indicates current state

2. **Data Integrity**:
   - Badge applications are not modified
   - Historical references remain valid
   - Version number unchanged (deactivation is not content modification)

3. **Audit Trail**:
   - `deactivated_at` timestamp provides audit trail
   - Future: Log admin action in `audit_logs` table

---

## 7. Error Handling

### Error Handling Strategy

**Principle**: Use early returns and guard clauses to handle errors at the beginning of functions. Avoid deeply nested error handling.

### Error Classification

| Error Type | HTTP Status | Scenario | Handling |
|------------|-------------|----------|----------|
| Validation Error | 400 | Invalid UUID format | Zod validation before service call |
| Unauthorized | 401 | No valid session | Authentication middleware (production) |
| Forbidden | 403 | Non-admin user | Authorization check (production) |
| Not Found | 404 | Badge ID doesn't exist | Service returns null, route returns 404 |
| Conflict | 409 | Badge already inactive | Service checks status before update |
| Internal Error | 500 | Database error | Catch-all error handler |

### Detailed Error Scenarios

#### 1. Invalid UUID Format (400)

**Detection**: Zod schema validation fails

**Response**:
```typescript
const validation = uuidParamSchema.safeParse({ id });
if (!validation.success) {
  return new Response(JSON.stringify({
    error: "validation_error",
    message: "Invalid badge ID format",
    details: validation.error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  }), { status: 400 });
}
```

#### 2. Badge Not Found (404)

**Detection**: Service returns `null` from database query

**Response**:
```typescript
const badge = await service.deactivateCatalogBadge(id);

if (!badge) {
  return new Response(JSON.stringify({
    error: "not_found",
    message: "Catalog badge not found"
  }), { status: 404 });
}
```

#### 3. Badge Already Inactive (409)

**Detection**: Service checks `status` field before update

**Response**:
```typescript
if (badge.status === 'inactive') {
  return new Response(JSON.stringify({
    error: "invalid_status",
    message: "Badge is already inactive",
    current_status: "inactive"
  }), { status: 409 });
}
```

**Why 409 instead of 200**:
- 200 would imply successful deactivation
- 409 Conflict clearly indicates the badge is already in the target state
- Provides `current_status` for client-side handling
- Prevents confusion about whether action succeeded

#### 4. Database Error (500)

**Detection**: Supabase query throws error

**Response**:
```typescript
try {
  const badge = await service.deactivateCatalogBadge(id);
  // ...
} catch (error) {
  console.error('Error in POST /api/catalog-badges/:id/deactivate:', error);

  return new Response(JSON.stringify({
    error: "internal_error",
    message: "An unexpected error occurred while deactivating the catalog badge"
  }), { status: 500 });
}
```

### Service Error Handling

The service should throw specific errors that the route can catch:

```typescript
// Service method
if (badge.status === 'inactive') {
  throw new Error('BADGE_ALREADY_INACTIVE');
}

// Route handler
catch (error) {
  if (error.message === 'BADGE_ALREADY_INACTIVE') {
    return new Response(JSON.stringify({
      error: "invalid_status",
      message: "Badge is already inactive",
      current_status: "inactive"
    }), { status: 409 });
  }

  // Handle other errors...
}
```

---

## 8. Performance Considerations

### Database Queries

**Query Count**: 2 queries maximum
1. SELECT to fetch and validate badge (1 query)
2. UPDATE to deactivate badge (1 query)

**Optimization**:
- Both queries use primary key (`id`) lookup - O(1) with B-tree index
- No full table scans
- Minimal data transfer (single row)

### Alternative: Single Query Approach

Consider combining validation and update in a single query:

```sql
UPDATE catalog_badges
SET status = 'inactive', deactivated_at = NOW()
WHERE id = $1 AND status = 'active'
RETURNING *;
```

**Pros**:
- Reduces round trips to database
- Atomic operation (no race condition)

**Cons**:
- Cannot distinguish between "not found" and "already inactive"
- Requires checking affected rows count and querying again on failure

**Recommendation**: Use two-query approach for clearer error messages.

### Expected Response Time

- **Best case**: 20-50ms (local Supabase, cached connection)
- **Typical**: 50-150ms (remote Supabase, good network)
- **Worst case**: 200-500ms (slow network, connection pool exhaustion)

### Caching Considerations

**Not Recommended**:
- Deactivation is a write operation
- Badge status must be immediately consistent
- Caching could cause stale data in listing endpoints

**Related Endpoints**:
- After deactivation, `GET /api/catalog-badges` should immediately exclude badge for non-admin users
- Consider cache invalidation if badge listing is cached

### Concurrency Considerations

**Race Condition Scenario**: Two admins deactivate same badge simultaneously

**Handling**:
1. First request: Reads badge (status='active'), updates to 'inactive' → 200 OK
2. Second request: Reads badge (status='inactive'), returns 409 Conflict

**Database-Level Protection**:
- PostgreSQL MVCC ensures consistent reads
- No need for explicit locking (UPDATE is atomic)

**Alternative with Database Constraint**:
```sql
UPDATE catalog_badges
SET status = 'inactive', deactivated_at = NOW()
WHERE id = $1 AND status = 'active'
RETURNING *;
```
This prevents the update if status changed between read and write.

---

## 9. Implementation Steps

### Step 1: Create Path Parameter Validation Schema

**File**: `src/lib/validation/catalog-badge.validation.ts`

**Action**: Add UUID path parameter validation schema

**Code**:
```typescript
/**
 * Validation schema for UUID path parameters
 * Used for endpoints that take :id in the path
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid badge ID format"),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;
```

**Why**: Centralized validation logic, reusable across all endpoints with UUID params

---

### Step 2: Add Service Method

**File**: `src/lib/catalog-badge.service.ts`

**Action**: Add `deactivateCatalogBadge` method to `CatalogBadgeService` class

**Code**:
```typescript
/**
 * Deactivates a catalog badge
 *
 * Sets status to 'inactive' and records deactivation timestamp.
 * Only active badges can be deactivated.
 *
 * @param id - Badge UUID
 * @returns Deactivated badge if successful, null if not found
 * @throws Error if badge is already inactive or database query fails
 */
async deactivateCatalogBadge(id: string): Promise<CatalogBadgeDetailDto | null> {
  // Step 1: Fetch badge to validate it exists and check status
  const { data: badge, error: fetchError } = await this.supabase
    .from("catalog_badges")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    // Handle "not found" vs actual errors
    if (fetchError.code === "PGRST116") {
      // PostgREST error code for no rows returned
      return null;
    }
    throw new Error(`Failed to fetch catalog badge: ${fetchError.message}`);
  }

  // Step 2: Check if badge is already inactive
  if (badge.status === "inactive") {
    throw new Error("BADGE_ALREADY_INACTIVE");
  }

  // Step 3: Update badge to inactive status
  const { data: updatedBadge, error: updateError } = await this.supabase
    .from("catalog_badges")
    .update({
      status: "inactive",
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(`Failed to deactivate catalog badge: ${updateError.message}`);
  }

  return updatedBadge as CatalogBadgeDetailDto;
}
```

**Why**:
- Follows existing service pattern
- Clear error messages for different scenarios
- Returns null for not found (allows 404 in route)
- Throws specific error for conflict (allows 409 in route)

---

### Step 3: Create Deactivate Route File

**File**: `src/pages/api/catalog-badges/[id]/deactivate.ts`

**Action**: Create new Astro API route with POST handler

**Directory Structure**:
```
src/pages/api/catalog-badges/
├── index.ts (existing - GET, POST)
├── [id].ts (to be created - GET, PUT)
└── [id]/
    └── deactivate.ts (new - POST)
```

**Code**:
```typescript
import type { APIRoute } from "astro";
import { CatalogBadgeService } from "@/lib/catalog-badge.service";
import { uuidParamSchema } from "@/lib/validation/catalog-badge.validation";
import type { ApiError, InvalidStatusError } from "@/types";

/**
 * POST /api/catalog-badges/:id/deactivate
 *
 * Deactivates a catalog badge (admin only).
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: UUID of the catalog badge to deactivate
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user is admin (can deactivate badges)
 *
 * Production Authorization (when enabled):
 * - Admin users only can deactivate badges
 *
 * @returns 200 OK with deactivated badge details
 * @returns 400 Bad Request if badge ID is invalid UUID
 * @returns 401 Unauthorized if not authenticated (production)
 * @returns 403 Forbidden if not admin (production)
 * @returns 404 Not Found if badge doesn't exist
 * @returns 409 Conflict if badge is already inactive
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Validate Path Parameter
    // =========================================================================
    const validation = uuidParamSchema.safeParse({ id: context.params.id });

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge ID format",
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

    const { id } = validation.data;

    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks
    // and assume admin access for development purposes.

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

    // Step 3: Get User Info (Admin Status)
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      const error: ApiError = {
        error: "unauthorized",
        message: "User not found",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Authorization Check (Admin Only)
    if (!userData.is_admin) {
      const error: ApiError = {
        error: "forbidden",
        message: "Admin access required",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    */

    // =========================================================================
    // Step 5: Deactivate Badge via Service
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const badge = await service.deactivateCatalogBadge(id);

    // Handle not found
    if (!badge) {
      const error: ApiError = {
        error: "not_found",
        message: "Catalog badge not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 6: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badge), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Business Logic Errors
    // =========================================================================

    // Handle "already inactive" conflict
    if (error instanceof Error && error.message === "BADGE_ALREADY_INACTIVE") {
      const conflictError: InvalidStatusError = {
        error: "invalid_status",
        message: "Badge is already inactive",
        current_status: "inactive",
      };
      return new Response(JSON.stringify(conflictError), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/catalog-badges/:id/deactivate:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while deactivating the catalog badge",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

**Why**:
- Follows existing route structure and patterns
- Comprehensive error handling for all scenarios
- Clear comments marking development vs production code
- Uses service layer for business logic

---

### Step 4: Update Testing Guide

**File**: `.ai/catalog-badges-testing-guide.md`

**Action**: Add test scenarios for POST /api/catalog-badges/:id/deactivate

**Test Scenarios to Add**:

1. **Happy Path - Deactivate Active Badge**
   - POST to `/api/catalog-badges/{valid-id}/deactivate`
   - Expect 200 OK with badge status='inactive' and deactivated_at set

2. **Badge Not Found**
   - POST to `/api/catalog-badges/{non-existent-uuid}/deactivate`
   - Expect 404 Not Found

3. **Invalid UUID Format**
   - POST to `/api/catalog-badges/invalid-id/deactivate`
   - Expect 400 Bad Request with validation error

4. **Badge Already Inactive**
   - Deactivate same badge twice
   - First request: 200 OK
   - Second request: 409 Conflict with current_status='inactive'

5. **Existing Applications Remain Valid**
   - Create badge application for active badge
   - Deactivate the badge
   - Verify badge application still exists and unchanged

6. **Non-Admin Filter Behavior** (Future)
   - Deactivate badge
   - Query GET /api/catalog-badges as non-admin
   - Verify badge not in results

---

### Step 5: Run Linting

**Command**: `pnpm lint`

**Action**: Fix any ESLint or Prettier issues in new files

**Expected Issues**:
- Unused imports
- Console.log statements (expected in error handling)
- Formatting issues

---

### Step 6: Run Build

**Command**: `pnpm build`

**Action**: Verify TypeScript compilation succeeds

**Expected Issues**:
- Type mismatches
- Missing imports
- Path resolution issues

---

### Step 7: Manual Testing

**Prerequisite**: Ensure sample data is loaded (badge with known UUID)

**Test Commands**:
```bash
# 1. Deactivate a badge (replace UUID with actual badge ID)
curl -X POST http://localhost:4321/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001/deactivate

# 2. Try to deactivate same badge again (expect 409)
curl -X POST http://localhost:4321/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001/deactivate

# 3. Try invalid UUID (expect 400)
curl -X POST http://localhost:4321/api/catalog-badges/not-a-uuid/deactivate

# 4. Try non-existent UUID (expect 404)
curl -X POST http://localhost:4321/api/catalog-badges/00000000-0000-0000-0000-000000000000/deactivate
```

---

### Step 8: Update API Plan (Optional)

**File**: `.ai/api-plan.md`

**Action**: Mark POST /api/catalog-badges/:id/deactivate as implemented

**Change**: Add implementation date or status note to endpoint section

---

## 10. Additional Considerations

### Future Enhancements

1. **Audit Logging**:
   ```typescript
   // After successful deactivation
   await logAuditEvent({
     event_type: 'catalog_badge.deactivated',
     actor_id: currentUserId,
     payload: { badge_id: id, badge_title: badge.title }
   });
   ```

2. **Reactivation Endpoint**:
   - Consider `POST /api/catalog-badges/:id/activate`
   - Mirrors deactivate endpoint
   - Sets status='active', clears deactivated_at

3. **Soft Delete Pattern**:
   - Current implementation uses soft delete (status flag)
   - Consider adding `deleted_at` field for actual deletion
   - Deactivated badges are visible to admins; deleted badges are not

### Testing with Automation

**Unit Tests** (Future):
```typescript
describe('CatalogBadgeService.deactivateCatalogBadge', () => {
  it('should deactivate an active badge', async () => {
    // Test implementation
  });

  it('should return null for non-existent badge', async () => {
    // Test implementation
  });

  it('should throw error for already inactive badge', async () => {
    // Test implementation
  });
});
```

**Integration Tests** (Future):
```typescript
describe('POST /api/catalog-badges/:id/deactivate', () => {
  it('should return 200 and deactivated badge', async () => {
    // Test implementation
  });

  it('should return 409 on second deactivation', async () => {
    // Test implementation
  });
});
```

### Related Endpoints Impact

**GET /api/catalog-badges** (List):
- Must respect status filter
- Non-admin users automatically filter status='active'
- Deactivated badges excluded from non-admin results

**GET /api/catalog-badges/:id** (Detail):
- Should allow fetching inactive badges
- Used by admins to view deactivated badges
- No change needed

**PUT /api/catalog-badges/:id** (Update):
- Should allow updating inactive badges (for corrections)
- OR: Consider restricting updates to active badges only
- Current spec: "Cannot change status via this endpoint (use deactivate endpoint)"

### Database Considerations

**Index Usage**:
- Query uses primary key (id) - optimal performance
- No additional indexes needed

**Foreign Key Impact**:
- `badge_applications.catalog_badge_id` references `catalog_badges.id`
- ON DELETE behavior: Consider CASCADE vs SET NULL vs RESTRICT
- Current spec: Applications remain valid (no CASCADE delete)

**Data Consistency**:
- Deactivation doesn't break referential integrity
- Historical badge applications preserve snapshot via `catalog_badge_version`
- Status change is isolated operation

---

## 11. Summary

This implementation plan provides comprehensive guidance for implementing the `POST /api/catalog-badges/:id/deactivate` endpoint with:

- **Clear validation**: UUID format validation for path parameter
- **Robust error handling**: Specific error codes for each failure scenario
- **Service layer separation**: Business logic in CatalogBadgeService
- **Development-first approach**: Authentication disabled with clear TODOs
- **Future-proof design**: Ready for authentication and audit logging
- **Performance optimized**: Uses primary key lookups, minimal queries
- **Well-documented**: Inline comments explain each step

**Estimated Implementation Time**: 1-2 hours including testing

**Dependencies**:
- Existing CatalogBadgeService class
- Existing validation infrastructure
- Supabase client setup

**Blockers**: None - can be implemented independently
