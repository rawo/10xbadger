# API Endpoint Implementation Plan: GET /api/badge-applications/:id

## 1. Endpoint Overview

This endpoint retrieves a single badge application by its ID with complete details including nested catalog badge information and applicant user information. It implements role-based authorization where standard users can only view their own badge applications, while administrators can view any badge application in the system.

**Key Features**:
- Retrieve single badge application by UUID
- Include full catalog badge details (with description and version)
- Include applicant user information
- Role-based access control (owner or admin only)
- Comprehensive error handling for not found and forbidden scenarios

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/badge-applications/:id`
- **Authentication**: Required (session-based)
- **Authorization**:
  - Standard users: Can only view their own badge applications
  - Admin users: Can view any badge application

### Path Parameters

#### Required Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format | Badge application identifier |

### Request Examples

**Standard User - View Own Application**:
```
GET /api/badge-applications/88f1c7e1-b698-4a95-923d-92b2ed2e7870
```

**Admin User - View Any Application**:
```
GET /api/badge-applications/650e8400-e29b-41d4-a716-446655440010
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `BadgeApplicationDetailDto` - Complete badge application with nested objects
  ```typescript
  interface BadgeApplicationDetailDto extends BadgeApplicationRow {
    catalog_badge: CatalogBadgeDetail;
    applicant: UserSummary;
  }
  ```
- `CatalogBadgeDetail` - Full catalog badge information
  ```typescript
  interface CatalogBadgeDetail extends CatalogBadgeSummary {
    description: string | null;
    version: number;
  }
  ```
- `UserSummary` - Applicant user information
  ```typescript
  interface UserSummary {
    id: string;
    display_name: string;
    email: string;
  }
  ```

**Database Types**:
- `BadgeApplicationRow` - Base badge application database type

**Error Types**:
- `ApiError` - Standard error response structure

### Validation Schema to Reuse

From `src/lib/validation/catalog-badge.validation.ts`:
```typescript
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid badge application ID format"),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project that improved query performance by 40%",
  "status": "accepted",
  "submitted_at": "2025-01-21T10:00:00Z",
  "reviewed_by": "550e8400-e29b-41d4-a716-446655440002",
  "reviewed_at": "2025-01-22T09:30:00Z",
  "review_reason": "Well documented achievements",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-22T09:30:00Z",
  "catalog_badge": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "PostgreSQL Expert",
    "description": "Demonstrated advanced knowledge of PostgreSQL database administration and optimization",
    "category": "technical",
    "level": "gold",
    "version": 1
  },
  "applicant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "email": "john.doe@goodcompany.com"
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden - Non-Owner Access
```json
{
  "error": "forbidden",
  "message": "You do not have permission to view this badge application"
}
```

#### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Badge application not found"
}
```

#### 400 Bad Request - Invalid UUID
```json
{
  "error": "validation_error",
  "message": "Invalid badge application ID format",
  "details": [
    {
      "field": "id",
      "message": "Invalid badge application ID format"
    }
  ]
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching the badge application"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/badge-applications/88f1c7e1-b698-4a95-923d-92b2ed2e7870
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/badge-applications/[id].ts           │
│                                                      │
│  1. Extract id from path params                     │
│  2. Check authentication (context.locals.supabase)  │
│  3. Get user info (id, is_admin flag)               │
│  4. Validate id parameter (UUID format)             │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         BadgeApplicationService                     │
│  src/lib/badge-application.service.ts               │
│                                                      │
│  getBadgeApplicationById(id)                        │
│  1. Build query with joins:                         │
│     - catalog_badges (full details with desc)       │
│     - users (applicant info)                        │
│  2. Execute single query with .single()             │
│  3. Handle not found (PGRST116 error code)          │
│  4. Return BadgeApplicationDetailDto or null        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query: badge_applications table                    │
│  Join: catalog_badges (all fields)                  │
│  Join: users (id, display_name, email)              │
│  Filter: WHERE id = :id                             │
│  Execute: .single()                                 │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  badge_applications table                           │
│  catalog_badges table (for join)                    │
│  users table (for join)                             │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Result or null
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Check if result is null (404 Not Found)         │
│  2. Authorization check:                            │
│     - If admin: allow                               │
│     - If owner (applicant_id = userId): allow       │
│     - Otherwise: 403 Forbidden                      │
│  3. Return JSON response with 200 status            │
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
- **Implementation**: Check `context.locals.supabase.auth.getUser()` in route handler
- **Failure Response**: 401 Unauthorized if no valid session

### Authorization
- **Ownership Check**:
  - Standard users can only view applications where `applicant_id = current_user.id`
  - Check performed at route level after fetching the application
  - Return 403 Forbidden if user is not owner and not admin
- **Admin Override**:
  - Admin users (`is_admin = true`) can view any badge application
  - Admin check via `current_user.is_admin` flag

### Input Validation
- **UUID Validation**:
  - Use Zod schema to validate UUID format
  - Return 400 Bad Request for invalid UUID format
  - Prevents malformed queries to database
- **SQL Injection Prevention**:
  - Use Supabase query builder (parameterized queries)
  - Never concatenate user input into SQL strings

### Data Exposure
- **Prevent Information Leakage**:
  - Don't expose internal error details to client
  - Log detailed errors server-side only
  - Return generic error messages for 500 errors
- **Consistent Error Messages**:
  - Use same error message for not found vs forbidden to prevent resource enumeration
  - Consider returning 404 for both cases to hide existence

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling |
|----------|-------------|------------|----------|
| User not authenticated | 401 | `unauthorized` | Return error immediately, don't process request |
| Invalid UUID format | 400 | `validation_error` | Validate with Zod, return field-level error |
| Badge application not found | 404 | `not_found` | Service returns null, route returns 404 |
| Non-owner non-admin access | 403 | `forbidden` | Check ownership after fetching, return error |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Supabase query error | 500 | `internal_error` | Log error, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Use Zod schema to validate id parameter
   - Return structured error response with field-level details
   - Validate before making any database queries

2. **Authentication Errors (401)**:
   - Check authentication before any processing
   - Return immediately if not authenticated
   - Use consistent error message

3. **Authorization Errors (403)**:
   - Fetch application first (need to check ownership)
   - Compare `applicant_id` with `current_user.id`
   - Allow if user is admin or owner
   - Return clear error message for unauthorized access

4. **Not Found Errors (404)**:
   - Service returns null when application doesn't exist
   - Route handler checks for null and returns 404
   - Also return 404 for invalid UUID (after validation)
   - Use same error message as 403 to prevent enumeration

5. **Database Errors (500)**:
   - Catch all database exceptions
   - Log full error details server-side (console.error)
   - Return generic error message to client
   - Don't expose database structure or query details

6. **Unexpected Errors (500)**:
   - Wrap entire handler in try-catch
   - Log unexpected errors
   - Return generic error message

## 8. Performance Considerations

### Potential Bottlenecks
1. **Multiple Table Joins**: Joining with catalog_badges and users tables
2. **Single Item Query**: Should be fast with proper indexing
3. **Network Latency**: Single round trip to database

### Optimization Strategies

1. **Database Indexes** (Already in schema):
   - Primary key index on `badge_applications.id` (automatic)
   - Foreign key indexes on `catalog_badge_id` and `applicant_id`

2. **Query Optimization**:
   - Use `.single()` for single row query (more efficient than limit(1))
   - Select only needed fields from joined tables
   - Use PostgREST's efficient JSON aggregation for nested objects

3. **Join Optimization**:
   - Fetch all data in single query (no N+1 problem)
   - Supabase handles join efficiently at database level
   - All joins use indexed foreign keys

4. **Caching Considerations** (Future Enhancement):
   - Consider caching badge applications that don't change often (accepted status)
   - Invalidate cache when application is updated
   - Use short TTL (1-2 minutes) for frequently accessed applications

5. **Response Size**:
   - Response is relatively small (single application with nested data)
   - No pagination needed
   - Description field may be large but typically < 2000 chars

### Expected Performance
- **Single Item Query**: < 50ms response time
- **With Joins**: < 100ms response time
- **Network Overhead**: 10-20ms depending on location

## 9. Implementation Steps

### Step 1: Add Validation Schema (if not reusing)
**File**: `src/lib/validation/badge-application.validation.ts`

Add UUID validation if not already present (can reuse from catalog-badge.validation.ts):

```typescript
export { uuidParamSchema } from './catalog-badge.validation';
```

### Step 2: Add Service Method
**File**: `src/lib/badge-application.service.ts`

```typescript
import type {
  BadgeApplicationDetailDto,
  CatalogBadgeDetail,
  UserSummary,
} from "@/types";

// Add to existing BadgeApplicationService class:

/**
 * Retrieves a single badge application by ID with full details
 *
 * Includes nested catalog badge details (with description and version)
 * and applicant user information.
 *
 * @param id - Badge application UUID
 * @returns Badge application with nested data if found, null otherwise
 * @throws Error if database query fails
 */
async getBadgeApplicationById(id: string): Promise<BadgeApplicationDetailDto | null> {
  // Build query with joins for catalog badge and applicant user
  const { data, error } = await this.supabase
    .from("badge_applications")
    .select(
      `
        *,
        catalog_badge:catalog_badges!catalog_badge_id (
          id,
          title,
          description,
          category,
          level,
          version
        ),
        applicant:users!applicant_id (
          id,
          display_name,
          email
        )
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    // Handle "not found" vs actual errors
    if (error.code === "PGRST116") {
      // PostgREST error code for no rows returned
      return null;
    }
    throw new Error(`Failed to fetch badge application: ${error.message}`);
  }

  // Transform to proper DTO type
  return {
    id: data.id,
    applicant_id: data.applicant_id,
    catalog_badge_id: data.catalog_badge_id,
    catalog_badge_version: data.catalog_badge_version,
    date_of_application: data.date_of_application,
    date_of_fulfillment: data.date_of_fulfillment,
    reason: data.reason,
    status: data.status,
    submitted_at: data.submitted_at,
    reviewed_by: data.reviewed_by,
    reviewed_at: data.reviewed_at,
    review_reason: data.review_reason,
    created_at: data.created_at,
    updated_at: data.updated_at,
    catalog_badge: data.catalog_badge as CatalogBadgeDetail,
    applicant: data.applicant as UserSummary,
  } as BadgeApplicationDetailDto;
}
```

### Step 3: Create API Route Handler
**File**: `src/pages/api/badge-applications/[id].ts` (new file)

```typescript
import type { APIRoute } from "astro";
import { BadgeApplicationService } from "@/lib/badge-application.service";
import { uuidParamSchema } from "@/lib/validation/catalog-badge.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/badge-applications/:id
 *
 * Retrieves a single badge application with full details.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Badge application UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user ID is used for authorization checks
 * - Default user is non-admin
 * - To test admin features, change `isAdmin = true` in the code
 *
 * Production Authorization (when enabled):
 * - Non-admin users: Can only view their own badge applications
 * - Admin users: Can view any badge application
 *
 * @returns 200 OK with badge application details
 * @returns 403 Forbidden if non-owner non-admin tries to access
 * @returns 404 Not Found if badge application doesn't exist
 * @returns 400 Bad Request if invalid UUID format
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks
    // and use a default non-admin user for development purposes.

    const isAdmin = false; // Default to non-admin user for development
    const userId = "550e8400-e29b-41d4-a716-446655440101"; // Default user (John Doe)

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

    // Step 2: Get User Info (Admin Status)
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

    const isAdmin = userData.is_admin;
    const userId = user.id;
    */

    // =========================================================================
    // Step 3: Validate Path Parameter
    // =========================================================================
    const id = context.params.id;

    // Validate UUID format
    const validation = uuidParamSchema.safeParse({ id });

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid badge application ID format",
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

    // =========================================================================
    // Step 4: Fetch Badge Application from Service
    // =========================================================================
    const service = new BadgeApplicationService(context.locals.supabase);
    const badgeApplication = await service.getBadgeApplicationById(id);

    // =========================================================================
    // Step 5: Handle Not Found
    // =========================================================================
    if (!badgeApplication) {
      const error: ApiError = {
        error: "not_found",
        message: "Badge application not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 6: Authorization Check
    // =========================================================================
    // Non-admin users can only view their own badge applications
    const isOwner = badgeApplication.applicant_id === userId;

    if (!isAdmin && !isOwner) {
      const error: ApiError = {
        error: "forbidden",
        message: "You do not have permission to view this badge application",
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 7: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(badgeApplication), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/badge-applications/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the badge application",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Step 4: Test the Endpoint

#### Manual Testing Scenarios

1. **Valid Request - Own Application**:
   ```
   GET /api/badge-applications/88f1c7e1-b698-4a95-923d-92b2ed2e7870
   Expected: 200 OK with full application details including nested data
   ```

2. **Valid Request - Admin Viewing Any Application**:
   ```
   GET /api/badge-applications/650e8400-e29b-41d4-a716-446655440010
   (with isAdmin = true)
   Expected: 200 OK with full application details
   ```

3. **Non-Owner Non-Admin Access**:
   ```
   GET /api/badge-applications/650e8400-e29b-41d4-a716-446655440010
   (with isAdmin = false, different userId)
   Expected: 403 Forbidden
   ```

4. **Invalid UUID Format**:
   ```
   GET /api/badge-applications/not-a-uuid
   Expected: 400 Bad Request with validation error
   ```

5. **Non-Existent Application**:
   ```
   GET /api/badge-applications/00000000-0000-0000-0000-000000000000
   Expected: 404 Not Found
   ```

6. **Verify Nested Data**:
   ```
   GET /api/badge-applications/88f1c7e1-b698-4a95-923d-92b2ed2e7870
   Expected: Response includes:
   - catalog_badge with description and version
   - applicant with display_name and email
   ```

### Step 5: Add Integration Tests
Create test file `src/pages/api/badge-applications/[id].test.ts` (when test framework is configured):

```typescript
import { describe, it, expect } from 'vitest'; // or your test framework

describe('GET /api/badge-applications/:id', () => {
  it('should return 401 when not authenticated', async () => {
    // Test implementation
  });

  it('should return badge application for owner', async () => {
    // Test implementation
  });

  it('should return badge application for admin', async () => {
    // Test implementation
  });

  it('should return 403 for non-owner non-admin', async () => {
    // Test implementation
  });

  it('should return 404 for non-existent application', async () => {
    // Test implementation
  });

  it('should return 400 for invalid UUID format', async () => {
    // Test implementation
  });

  it('should include nested catalog badge details', async () => {
    // Test implementation - verify description and version
  });

  it('should include nested applicant user info', async () => {
    // Test implementation - verify display_name and email
  });
});
```

### Step 6: Documentation
Update API documentation to include:
- Path parameter description
- Example requests and responses with nested data
- Authorization behavior (owner vs admin)
- Error scenarios with status codes

### Step 7: Monitoring and Logging
Add logging for:
- Failed authorization attempts (non-owner access)
- Not found requests (may indicate invalid links)
- Database errors with context
- Invalid UUID attempts

Consider using a logging service or application performance monitoring (APM) tool in production.

## 10. Future Enhancements

1. **Response Caching**: Implement caching for frequently accessed applications (especially accepted ones)
2. **Partial Response**: Add `fields` query parameter to select specific fields
3. **Include Reviewer Details**: Optionally include full reviewer user information
4. **Audit Trail**: Log who accessed which applications for security auditing
5. **Related Applications**: Include links to related applications for the same badge
6. **Activity History**: Show history of status changes and reviews
7. **GraphQL Support**: Consider adding GraphQL endpoint for flexible data fetching
8. **Etag Support**: Implement ETags for efficient caching and conditional requests
9. **Rate Limiting**: Add rate limiting per user to prevent abuse
10. **Webhooks**: Trigger webhooks when application is accessed (for notifications)
