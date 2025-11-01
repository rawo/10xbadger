# API Endpoint Implementation Plan: DELETE /api/promotion-templates/:id

## 1. Endpoint Overview

This endpoint deactivates a promotion template by setting its `is_active` flag to `false`. This is a **soft delete** operation that preserves template history and data integrity. Existing promotions that use this template remain valid and unaffected, but new promotions cannot be created using a deactivated template.

**Key Features**:
- Soft delete operation (sets `is_active = false`)
- Admin-only access (when authentication is enabled)
- UUID validation for path parameter
- Preserves template history and existing promotion references
- Returns success message (not the updated template)

**Business Context**:
This endpoint is used for:
- Template lifecycle management (deprecating outdated templates)
- Admin template management interface
- Preventing creation of new promotions with obsolete requirements
- Maintaining referential integrity (existing promotions unaffected)

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/promotion-templates/:id`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: Admin only (when authentication is enabled)

### Path Parameters

#### Required Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format | Promotion template ID to deactivate |

### Request Body

None - DELETE operations typically don't include request body.

### Request Examples

**Deactivate Existing Template**:
```bash
DELETE /api/promotion-templates/750e8400-e29b-41d4-a716-446655440020
```

**Invalid UUID Format**:
```bash
DELETE /api/promotion-templates/invalid-uuid
Expected: 400 Bad Request
```

**Non-Existent Template**:
```bash
DELETE /api/promotion-templates/750e8400-0000-0000-0000-000000000000
Expected: 404 Not Found
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- Success response is a simple message object (not a standard DTO)
  ```typescript
  {
    message: string;
  }
  ```

**Error Types**:
- `ApiError` - Standard error response structure
  ```typescript
  interface ApiError {
    error: string;
    message: string;
    details?: ValidationErrorDetail[];
  }
  ```

**Database Types**:
- `PromotionTemplateRow` - Database row type from Supabase
- Used internally for queries, not exposed in response

### Validation Types

**UUID Parameter Validation** (reuse from GET endpoint):
```typescript
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
});
```

## 4. Response Details

### Success Response (200 OK)

Per API specification (api-plan.md lines 1064-1069):

```json
{
  "message": "Promotion template deactivated successfully"
}
```

**Note**: Response returns a message, not the updated template object. This is simpler and sufficient for delete operations.

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "validation_error",
  "message": "Invalid template ID format",
  "details": [
    {
      "field": "id",
      "message": "Invalid UUID format"
    }
  ]
}
```

#### 401 Unauthorized - Not Authenticated (when auth enabled)

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden - Not Admin (when auth enabled)

```json
{
  "error": "forbidden",
  "message": "Admin access required"
}
```

#### 404 Not Found - Template Not Found

```json
{
  "error": "not_found",
  "message": "Promotion template not found"
}
```

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while deactivating the promotion template"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
│   (Admin)   │
└──────┬──────┘
       │ DELETE /api/promotion-templates/750e8400-e29b-41d4-a716-446655440020
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/promotion-templates/[id].ts          │
│                                                      │
│  1. Extract id from path parameters                 │
│  2. Validate UUID format (Zod schema)               │
│  3. (Future) Check admin authorization              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         PromotionTemplateService                    │
│  src/lib/promotion-template.service.ts              │
│                                                      │
│  deactivatePromotionTemplate(id)                    │
│  1. Query template by ID                            │
│  2. Check if exists (throw if not found)            │
│  3. Update is_active = false                        │
│  4. Update updated_at = NOW()                       │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  UPDATE promotion_templates                         │
│  SET is_active = false,                             │
│      updated_at = NOW()                             │
│  WHERE id = $1                                      │
│  RETURNING *                                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  promotion_templates table                          │
│  - Primary key lookup (O(1) with index)             │
│  - Soft delete: is_active = false                   │
│  - Existing promotions unaffected                   │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Result (updated template or null)
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Check if result exists                          │
│  2. If null: Return 404 Not Found                   │
│  3. If success: Return 200 OK with message          │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
│  (Success)  │
└─────────────┘
```

## 6. Security Considerations

### Authentication

- **Requirement**: User must be authenticated via session
- **Implementation**: Ignored for development per instructions
- **Production**: Will check `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized if no valid session

### Authorization

- **Access Level**: Admin only (check `user.is_admin`)
- **Business Rationale**: Only admins should manage template lifecycle
- **Implementation**: Check admin flag from user record (when auth enabled)
- **Failure Response**: 403 Forbidden if user is not admin

### Input Validation

- **UUID Format Validation**:
  - Use Zod schema to validate UUID format
  - Reject invalid UUIDs with 400 Bad Request
  - Prevents SQL injection and path traversal
- **Parameter Type Safety**:
  - Extract id from Astro params object
  - Type-safe parameter access
  - No string concatenation in queries

### Data Integrity

- **Soft Delete Benefits**:
  - Preserves template history
  - Allows potential reactivation (future feature)
  - Maintains referential integrity with existing promotions
  - No cascade delete issues
- **Existing Promotions Protected**:
  - Per API spec: "Existing promotions using this template remain valid"
  - Only affects new promotion creation
  - Historical data preserved

### SQL Injection Prevention

- **Mitigation**:
  - Use Supabase query builder exclusively (parameterized queries)
  - UUID validation prevents injection attempts
  - No string concatenation in queries
  - Supabase client handles query escaping automatically

### Admin-Only Actions

- **Threat**: Unauthorized template deactivation
- **Mitigation**:
  - Check `is_admin` flag from authenticated user
  - Return 403 Forbidden if not admin
  - Log admin actions (future enhancement)
- **Impact**: Prevents non-admin users from breaking promotion workflows

### UUID Enumeration

- **Threat**: Guessing valid UUIDs to discover and disable templates
- **Mitigation**:
  - UUID v4 has 122 bits of randomness (very hard to guess)
  - Admin-only access prevents casual enumeration
  - Rate limiting at infrastructure level (future enhancement)
  - Audit logging of deactivation actions (future enhancement)

### OWASP Top 10 Considerations

1. **Broken Access Control**: Mitigated by admin-only authorization check
2. **Injection**: Mitigated by using ORM/query builder and UUID validation
3. **Security Misconfiguration**: Follow Astro/Supabase security best practices
4. **Identification and Authentication Failures**: Handled by Supabase auth (when enabled)
5. **Data Integrity Failures**: Soft delete preserves data, allows rollback

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid UUID format | 400 | `validation_error` | Validate with Zod, return field-level error |
| Not authenticated | 401 | `unauthorized` | Check auth session (when enabled) |
| Not admin | 403 | `forbidden` | Check is_admin flag (when enabled) |
| Template not found | 404 | `not_found` | Check if service returns null/throws NotFound |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Supabase query error | 500 | `internal_error` | Log error, return generic message |
| Unexpected exception | 500 | `internal_error` | Catch all, log, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Use Zod schema to validate path parameter
   - Return structured error response with field-level details
   - Include helpful message for developers
   - Don't proceed to database if validation fails

2. **Authentication Errors (401)**:
   - Check user session via Supabase auth (when enabled)
   - Return early if not authenticated
   - Clear error message: "Authentication required"
   - Don't expose any details about the template

3. **Authorization Errors (403)**:
   - Check `is_admin` flag after authentication (when enabled)
   - Return early if not admin
   - Clear error message: "Admin access required"
   - Don't expose template existence to non-admins

4. **Not Found Errors (404)**:
   - Service throws error or returns null when template not found
   - Route handler checks for not found and returns 404
   - Clear error message: "Promotion template not found"
   - Don't distinguish between non-existent and inactive templates

5. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include template ID in logs for debugging

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
  }>;
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Primary Key Lookup**: Very fast (O(1) with index), not a concern
2. **Single Update**: Single row update is fast (~1-5ms)
3. **No Complex Joins**: No relationships need updating
4. **Soft Delete**: Faster than hard delete (no cascade operations)

### Optimization Strategies

1. **Database Optimization**:
   - Primary key (id) lookup is automatically indexed (fastest possible query)
   - Single UPDATE operation with WHERE clause on primary key
   - No additional indexes needed
   - Query execution time: ~1-5ms

2. **Transaction Management**:
   - Single UPDATE statement doesn't require explicit transaction
   - Supabase client handles transaction automatically
   - No risk of partial updates (atomic operation)

3. **Caching Considerations** (Future Enhancement):
   - Invalidate cache for template list endpoint when template deactivated
   - Invalidate cache for specific template if cached
   - Cache key pattern: `template:${id}` and `template:list:*`
   - Consider publishing event to cache invalidation service

4. **Response Size**:
   - Response is minimal (just success message)
   - Very small payload (~50 bytes)
   - No compression needed

5. **Index Impact**:
   - UPDATE on `is_active` field might affect filter queries
   - Consider index on `(is_active, created_at)` for list endpoint performance
   - Deactivation is infrequent, so index update overhead is minimal

### Expected Performance

Based on primary key lookup and single UPDATE:

- **Query Time**: 1-5ms (primary key lookup + update)
- **Total Response Time**: < 20ms (excluding network latency)
- **99th Percentile**: < 50ms

**Performance is excellent** - single row update on primary key is one of the fastest database operations.

### Performance Monitoring

- Log slow queries (> 50ms) with template ID
- Track deactivation frequency (should be infrequent)
- Monitor cache invalidation impact (when caching implemented)
- Set up alerts for degraded performance (> 100ms)

## 9. Implementation Steps

### Step 1: Add Service Method

**File**: `src/lib/promotion-template.service.ts` (existing file, add method)

**Purpose**: Add method to deactivate template by ID

```typescript
/**
 * Deactivates a promotion template by setting is_active to false
 *
 * @param id - Template UUID to deactivate
 * @throws Error if template not found or database query fails
 */
async deactivatePromotionTemplate(id: string): Promise<void> {
  const { data, error } = await this.supabase
    .from("promotion_templates")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Handle "not found" vs actual errors
    if (error.code === "PGRST116") {
      // PostgREST error code for no rows returned
      throw new Error("Promotion template not found");
    }
    throw new Error(`Failed to deactivate promotion template: ${error.message}`);
  }

  // Note: data will be null if no rows matched (already handled above)
  // Successful update returns the updated row
}
```

**Key Points**:
- Use `.update()` to set `is_active = false`
- Also update `updated_at` timestamp
- Use `.eq("id", id)` to target specific template
- Use `.select().single()` to get result and detect not found
- Handle PGRST116 error code (not found) by throwing specific error
- Throw errors for actual database failures

**Alternative Approach** (check existence first):
```typescript
async deactivatePromotionTemplate(id: string): Promise<void> {
  // First check if template exists
  const { data: existing, error: fetchError } = await this.supabase
    .from("promotion_templates")
    .select("id, is_active")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw new Error("Promotion template not found");
  }

  // Optional: Skip update if already inactive
  // if (!existing.is_active) {
  //   return; // Already deactivated, no-op
  // }

  // Perform update
  const { error: updateError } = await this.supabase
    .from("promotion_templates")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    throw new Error(`Failed to deactivate promotion template: ${updateError.message}`);
  }
}
```

### Step 2: Update API Route Handler

**File**: `src/pages/api/promotion-templates/[id].ts` (update existing file)

**Purpose**: Add DELETE handler to existing route file

```typescript
import type { APIRoute } from "astro";
import { PromotionTemplateService } from "@/lib/promotion-template.service";
import type { ApiError } from "@/types";
import { z } from "zod";

// UUID validation schema (reuse from GET handler)
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
});

// ... existing GET handler ...

/**
 * DELETE /api/promotion-templates/:id
 *
 * Deactivates a promotion template (soft delete).
 * Sets is_active = false while preserving template history.
 * Existing promotions using this template remain valid.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Promotion template UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - No admin check performed
 *
 * Production Authorization (when enabled):
 * - User must be authenticated
 * - User must have admin role (is_admin = true)
 *
 * @returns 200 OK with success message
 * @returns 400 Bad Request if UUID format is invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 403 Forbidden if not admin (when auth enabled)
 * @returns 404 Not Found if template doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication and authorization will be implemented later.

    // =========================================================================
    // PRODUCTION CODE (Currently Disabled)
    // =========================================================================
    // Uncomment the code below when authentication is ready:
    /*
    // Step 1: Authentication Check
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

    // Step 2: Authorization Check (Admin Only)
    // Fetch user's admin status from users table
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError || !userData || !userData.is_admin) {
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
    // Step 3: Validate Path Parameter
    // =========================================================================
    const validation = uuidParamSchema.safeParse(context.params);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid template ID format",
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
    // Step 4: Deactivate Template via Service
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);

    try {
      await service.deactivatePromotionTemplate(id);
    } catch (serviceError) {
      // Check if error is "not found"
      if (serviceError instanceof Error && serviceError.message.includes("not found")) {
        const error: ApiError = {
          error: "not_found",
          message: "Promotion template not found",
        };
        return new Response(JSON.stringify(error), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Re-throw other errors to be caught by outer catch
      throw serviceError;
    }

    // =========================================================================
    // Step 5: Return Success Response
    // =========================================================================
    return new Response(
      JSON.stringify({
        message: "Promotion template deactivated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in DELETE /api/promotion-templates/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while deactivating the promotion template",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

**Key Points**:
- Validate UUID format before querying database
- Use service layer for business logic
- Handle not found separately from other errors
- Return appropriate status codes
- Authentication and authorization placeholders (disabled for development)
- Follow exact response format from API spec

### Step 3: Manual Testing

**Test Scenarios**:

**1. Deactivate Existing Template**:
```bash
# First, get list of active templates
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=true'

# Deactivate one template (use actual ID from list)
curl -X DELETE 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'
```
**Expected**: 200 OK with success message

**2. Verify Template is Deactivated**:
```bash
# Fetch the deactivated template
curl -X GET 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'
```
**Expected**: 200 OK with template showing `is_active: false`

**3. Verify Template Not in Active List**:
```bash
# List only active templates
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=true'
```
**Expected**: Deactivated template should not appear in list

**4. Invalid UUID Format**:
```bash
curl -X DELETE 'http://localhost:3000/api/promotion-templates/invalid-uuid'
```
**Expected**: 400 Bad Request with validation error

**5. Non-Existent Template (Valid UUID)**:
```bash
curl -X DELETE 'http://localhost:3000/api/promotion-templates/750e8400-0000-0000-0000-000000000000'
```
**Expected**: 404 Not Found

**6. Deactivate Already Inactive Template**:
```bash
# Deactivate same template twice
curl -X DELETE 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'
curl -X DELETE 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'
```
**Expected**: Both return 200 OK (idempotent operation) OR second one returns 404 (depends on implementation choice)

**7. Verify Existing Promotions Unaffected**:
```bash
# Check if promotions using deactivated template still exist and are valid
curl -X GET 'http://localhost:3000/api/promotions?template_id=750e8400-e29b-41d4-a716-446655440001'
```
**Expected**: Existing promotions still returned, unaffected by template deactivation

**8. Test Database Directly**:
```bash
# Check database state
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT id, name, is_active, updated_at FROM promotion_templates WHERE id = '750e8400-e29b-41d4-a716-446655440001';"
```
**Expected**: `is_active` should be `false`, `updated_at` should be recent timestamp

### Step 4: Integration Tests

**File**: `src/pages/api/promotion-templates/[id].test.ts` (update existing test file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('DELETE /api/promotion-templates/:id', () => {
  let testTemplateId: string;

  beforeEach(async () => {
    // Create a test template that's active
    // Store ID for testing
  });

  describe('Success Cases', () => {
    it('should deactivate template when valid ID provided', async () => {
      // Test with valid active template ID
      // Expected: 200 OK with success message
      // Verify is_active = false in database
    });

    it('should return success message in correct format', async () => {
      // Test response structure
      // Expected: { message: "Promotion template deactivated successfully" }
    });

    it('should update updated_at timestamp', async () => {
      // Deactivate template
      // Fetch template and verify updated_at changed
    });

    it('should be idempotent (deactivating twice succeeds)', async () => {
      // Deactivate same template twice
      // Expected: Both return 200 OK (or second returns 404, depending on implementation)
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid UUID format', async () => {
      // Test with 'invalid-uuid'
      // Expected: 400 with validation error
    });

    it('should return 400 for empty ID', async () => {
      // Test with empty string
      // Expected: 400 with validation error
    });

    it('should return 400 for malformed UUID', async () => {
      // Test with 'not-a-uuid-123'
      // Expected: 400 with validation error
    });
  });

  describe('Not Found Cases', () => {
    it('should return 404 for non-existent template', async () => {
      // Test with valid UUID that doesn't exist
      // Expected: 404 Not Found
    });
  });

  describe('Business Logic', () => {
    it('should preserve template data (soft delete)', async () => {
      // Deactivate template
      // Fetch template directly from database
      // Expected: Template still exists, only is_active changed
    });

    it('should not affect existing promotions using template', async () => {
      // Create promotion using template
      // Deactivate template
      // Fetch promotion
      // Expected: Promotion still valid and references template
    });

    it('should prevent new promotions from using deactivated template', async () => {
      // Deactivate template
      // Try to create new promotion using deactivated template
      // Expected: 400 Bad Request (template not active)
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database connection failure
      // Expected: 500 with generic error message
    });

    it('should handle query errors', async () => {
      // Mock query error
      // Expected: 500 with generic error message
    });

    it('should not expose internal error details', async () => {
      // Mock internal error
      // Expected: Generic error message, no stack trace
    });
  });

  describe('Authorization (when enabled)', () => {
    it('should require authentication', async () => {
      // Test without auth header/session
      // Expected: 401 Unauthorized
    });

    it('should require admin role', async () => {
      // Test with non-admin user
      // Expected: 403 Forbidden
    });

    it('should allow admin to deactivate templates', async () => {
      // Test with admin user
      // Expected: 200 OK
    });
  });
});
```

**Test Coverage Goals**:
- Success Cases: 4 tests
- Validation Errors: 3 tests
- Not Found Cases: 1 test
- Business Logic: 3 tests
- Error Handling: 3 tests
- Authorization: 3 tests (for future)
- **Total: ~17 tests**

### Step 5: Update Service Tests

**File**: `src/lib/promotion-template.service.test.ts` (update existing file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PromotionTemplateService } from './promotion-template.service';

describe('PromotionTemplateService.deactivatePromotionTemplate', () => {
  let service: PromotionTemplateService;
  let testTemplateId: string;

  beforeEach(async () => {
    // Setup test database and service instance
    // Create test template
  });

  it('should deactivate template successfully', async () => {
    // Call service method
    // Expected: No error thrown
    // Verify is_active = false in database
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    // Call service method
    // Fetch template and compare timestamps
    // Expected: updated_at changed
  });

  it('should throw error when template not found', async () => {
    // Call with non-existent ID
    // Expected: Error thrown with "not found" message
  });

  it('should throw error on database failure', async () => {
    // Mock database error
    // Expected: Error thrown with failure message
  });

  it('should handle already inactive template', async () => {
    // Deactivate template twice
    // Expected: Both succeed (or second throws not found)
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

5. **Check for Console Warnings**:
```bash
pnpm astro check
```
**Expected**: No warnings or errors

### Step 7: Performance Testing

**Actions**:

1. **Measure Response Time**:
```bash
curl -w "\nTime: %{time_total}s\n" -s \
  -X DELETE \
  'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001' \
  | cat
```
**Expected**: < 50ms

2. **Test Under Load** (optional, using Apache Bench):
```bash
# Note: Need to create new templates for each request since DELETE is not idempotent
# This test is less relevant for DELETE operations
```

3. **Monitor Database Queries**:
- Check Supabase logs for query execution time
- Expected: ~1-5ms per UPDATE query

4. **Verify No Performance Degradation**:
```bash
# Run list endpoint before and after deactivating templates
time curl -s 'http://localhost:3000/api/promotion-templates?is_active=true' > /dev/null
```
**Expected**: No noticeable performance difference

### Step 8: Documentation

**Action**: Update API documentation

**Content to Include**:
- Endpoint URL and HTTP method
- Path parameter description (UUID format)
- Authentication requirements (when enabled)
- Authorization requirement (admin only)
- Request and response examples
- Error scenarios with status codes and messages
- Business rules (soft delete, existing promotions unaffected)
- Idempotency behavior

**Example Documentation**:
```markdown
## DELETE /api/promotion-templates/:id

Deactivates a promotion template (soft delete). Sets `is_active = false` while preserving template history.

### Authentication
Required - Admin only

### Path Parameters
- `id` (required, UUID): Promotion template ID to deactivate

### Response
Returns success message on deactivation.

### Business Rules
- Soft delete operation (template data preserved)
- Existing promotions using this template remain valid
- New promotions cannot use deactivated template
- Template can potentially be reactivated (future feature)

### Example
```bash
DELETE /api/promotion-templates/750e8400-e29b-41d4-a716-446655440001
```

Response:
```json
{
  "message": "Promotion template deactivated successfully"
}
```

### Errors
- `400 Bad Request`: Invalid UUID format
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not admin
- `404 Not Found`: Template doesn't exist
- `500 Internal Server Error`: Unexpected error
```

### Step 9: Update Type Definitions (if needed)

**File**: `src/types.ts`

**Check if any new types are needed**:
- Success response type (simple message)
- No new DTOs needed

**Optional**: Add type for success message response:
```typescript
/**
 * Generic success message response
 */
export interface SuccessMessageResponse {
  message: string;
}
```

### Step 10: Final Verification

**Checklist**:

- [ ] Service method added and tested
- [ ] API route handler implemented with DELETE method
- [ ] UUID validation implemented
- [ ] Error handling for all scenarios
- [ ] Manual tests pass (all scenarios)
- [ ] Integration tests written (when test framework available)
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Performance verified
- [ ] Authentication placeholders in place
- [ ] Authorization placeholders in place
- [ ] Soft delete verified (data preserved)
- [ ] Existing promotions unaffected

**Final Manual Test Script**:
```bash
#!/bin/bash
# Complete test script for DELETE endpoint

echo "=== Testing DELETE /api/promotion-templates/:id ==="

# Test 1: Deactivate existing template
echo "\n1. Deactivate existing template..."
curl -X DELETE 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'

# Test 2: Verify deactivation
echo "\n2. Verify template is deactivated..."
curl -s 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001' | jq '.is_active'

# Test 3: Invalid UUID
echo "\n3. Test invalid UUID..."
curl -X DELETE 'http://localhost:3000/api/promotion-templates/invalid-uuid'

# Test 4: Non-existent template
echo "\n4. Test non-existent template..."
curl -X DELETE 'http://localhost:3000/api/promotion-templates/750e8400-0000-0000-0000-000000000000'

# Test 5: Verify existing promotions unaffected
echo "\n5. Verify existing promotions unaffected..."
curl -s 'http://localhost:3000/api/promotions' | jq '.data[] | select(.template_id == "750e8400-e29b-41d4-a716-446655440001")'

echo "\n=== All tests complete ==="
```

## 10. Future Enhancements

### 1. Template Reactivation Endpoint

**Why**: Allow admins to reactivate previously deactivated templates
**Implementation**: `POST /api/promotion-templates/:id/reactivate` endpoint
**Logic**: Set `is_active = true`, update `updated_at`
**Priority**: Medium (useful for template lifecycle management)

### 2. Deactivation Audit Trail

**Why**: Track who deactivated templates and when for compliance
**Implementation**: Add `deactivated_by`, `deactivated_at` fields
**Storage**: Store in `promotion_templates` table or separate audit log
**Priority**: High (important for admin accountability)

### 3. Cascade Deactivation Warning

**Why**: Warn admins about impact before deactivating template
**Implementation**: Return count of active promotions using template
**Response**: Add `warning` field with promotion count
**Priority**: Medium (improves admin UX)

### 4. Bulk Template Deactivation

**Why**: Allow deactivating multiple templates at once
**Implementation**: `POST /api/promotion-templates/bulk-deactivate` with array of IDs
**Use Case**: Deprecating entire template series at once
**Priority**: Low (rare use case)

### 5. Soft Delete with Reason

**Why**: Document why template was deactivated
**Implementation**: Add optional `reason` field to request body
**Storage**: Add `deactivation_reason` field to table
**Priority**: Medium (helps with future audits)

### 6. Template Dependency Check

**Why**: Prevent deactivation if referenced by pending promotions
**Implementation**: Check for draft/submitted promotions using template
**Response**: 409 Conflict if dependencies exist
**Priority**: Low (business rules allow deactivation regardless)

### 7. Scheduled Deactivation

**Why**: Auto-deactivate templates on specific date (e.g., policy changes)
**Implementation**: Add `deactivate_at` field, background job
**Use Case**: Planning template lifecycle in advance
**Priority**: Low (admin can manually deactivate when needed)

### 8. Template Archival

**Why**: Move very old deactivated templates to archive
**Implementation**: Separate `archived_templates` table
**Benefit**: Keep main table performant
**Priority**: Low (MVP won't have enough data)

### 9. Deactivation Notifications

**Why**: Notify affected users when template deactivated
**Implementation**: Email or in-app notification to users with draft promotions
**Use Case**: Warn users their promotion drafts may be affected
**Priority**: Low (out of scope for MVP)

### 10. Undo Deactivation

**Why**: Quick rollback mechanism for accidental deactivations
**Implementation**: Keep deactivation history, allow one-click undo
**UI**: "Undo" button in admin interface for recent deactivations
**Priority**: Medium (improves admin experience)

---

## Notes & Assumptions

- The plan assumes the `promotion_templates` table has `is_active` and `updated_at` fields as specified in `db-plan.md`
- Authentication is disabled for development and will be implemented later
- Authorization (admin check) placeholder is included for future implementation
- Soft delete preserves all template data and existing promotion references
- Response returns simple message (not updated template) per API specification
- Deactivation is idempotent - deactivating twice returns success (no error)
- No cascade delete - existing promotions using template remain valid
- Template can potentially be reactivated (future enhancement) by setting `is_active = true`
- Consider adding `deactivated_by` and `deactivated_at` fields for audit trail (future enhancement)
