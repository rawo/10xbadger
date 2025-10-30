# API Endpoint Implementation Plan: GET /api/badge-applications

## 1. Endpoint Overview

This endpoint retrieves a paginated, filterable list of badge applications from the system. It implements role-based access control where standard users can only view their own badge applications, while administrators can view all applications and filter by any applicant. The endpoint supports filtering by status, catalog badge, and applicant (admin only), with flexible sorting options.

**Key Features**:
- Role-based filtering (users see only their own applications, admins see all)
- Filtering by status, catalog badge, and applicant (admin only)
- Sorting by created_at or submitted_at
- Pagination with configurable limit and offset
- Nested catalog badge summary in response

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/badge-applications`
- **Authentication**: Required (session-based)
- **Authorization**:
  - Standard users: Can only view their own badge applications
  - Admin users: Can view all badge applications and filter by any applicant

### Query Parameters

#### Required Parameters
None - all parameters are optional

#### Optional Parameters

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `status` | string | - | Enum: `draft`, `submitted`, `accepted`, `rejected`, `used_in_promotion` | Filter by application status |
| `applicant_id` | string (UUID) | - | Valid UUID format (admin only) | Filter by applicant user ID |
| `catalog_badge_id` | string (UUID) | - | Valid UUID format | Filter by catalog badge ID |
| `sort` | string | `created_at` | Enum: `created_at`, `submitted_at` | Field to sort by |
| `order` | string | `desc` | Enum: `asc`, `desc` | Sort order |
| `limit` | number | 20 | Integer, min: 1, max: 100 | Page size |
| `offset` | number | 0 | Integer, min: 0 | Page offset |

### Request Examples

**Standard User - List Own Applications**:
```
GET /api/badge-applications?status=submitted&sort=submitted_at&order=desc
```

**Admin User - List All Applications by Applicant**:
```
GET /api/badge-applications?applicant_id=550e8400-e29b-41d4-a716-446655440000&limit=10
```

**Filter by Catalog Badge**:
```
GET /api/badge-applications?catalog_badge_id=550e8400-e29b-41d4-a716-446655440001
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `BadgeApplicationListItemDto` - Individual badge application with nested catalog badge summary
  ```typescript
  interface BadgeApplicationListItemDto extends BadgeApplicationRow {
    catalog_badge: CatalogBadgeSummary;
  }
  ```
- `CatalogBadgeSummary` - Nested badge information
  ```typescript
  interface CatalogBadgeSummary {
    id: string;
    title: string;
    category: BadgeCategoryType;
    level: BadgeLevelType;
  }
  ```
- `PaginatedResponse<BadgeApplicationListItemDto>` - Full response structure
- `PaginationMetadata` - Pagination metadata

**Validation Types**:
- `BadgeApplicationStatus` - Application status enum values
- `BadgeApplicationStatusType` - Type for application status

**Database Types**:
- `BadgeApplicationRow` - Database row type from Supabase

**Error Types**:
- `ApiError` - Standard error response structure
- `ValidationErrorDetail` - Field-level validation errors

### New Types to Create

**Query Parameter Schema** (in validation file):
```typescript
interface ListBadgeApplicationsQuery {
  status?: BadgeApplicationStatusType;
  applicant_id?: string; // UUID
  catalog_badge_id?: string; // UUID
  sort?: 'created_at' | 'submitted_at';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440010",
      "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
      "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
      "catalog_badge_version": 1,
      "date_of_application": "2025-01-15",
      "date_of_fulfillment": "2025-01-20",
      "reason": "Led database optimization project that improved query performance by 40%",
      "status": "submitted",
      "submitted_at": "2025-01-21T10:00:00Z",
      "reviewed_by": null,
      "reviewed_at": null,
      "review_reason": null,
      "created_at": "2025-01-20T14:30:00Z",
      "updated_at": "2025-01-21T10:00:00Z",
      "catalog_badge": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "PostgreSQL Expert",
        "category": "technical",
        "level": "gold"
      }
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 20,
    "offset": 0,
    "has_more": false
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

#### 400 Bad Request - Invalid Parameter
```json
{
  "error": "invalid_parameter",
  "message": "Invalid status value. Must be one of: draft, submitted, accepted, rejected, used_in_promotion"
}
```

#### 400 Bad Request - Validation Errors
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 100"
    },
    {
      "field": "applicant_id",
      "message": "Invalid UUID format"
    }
  ]
}
```

#### 403 Forbidden - Non-Admin Using applicant_id Filter
```json
{
  "error": "forbidden",
  "message": "Only administrators can filter by applicant_id"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching badge applications"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/badge-applications?status=submitted
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/badge-applications.ts                │
│                                                      │
│  1. Extract query parameters                        │
│  2. Check authentication (context.locals.supabase)  │
│  3. Get user info (id, is_admin flag)               │
│  4. Validate query parameters (Zod schema)          │
│  5. Check authorization (applicant_id filter)       │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         BadgeApplicationService                     │
│  src/lib/badge-application.service.ts               │
│                                                      │
│  listBadgeApplications(filters, userId, isAdmin)    │
│  1. Build base query with catalog_badge join        │
│  2. Apply authorization filter:                     │
│     - Non-admin: applicant_id = userId              │
│     - Admin: no automatic filter                    │
│  3. Apply status filter (if provided)               │
│  4. Apply catalog_badge_id filter (if provided)     │
│  5. Apply applicant_id filter (if admin provided)   │
│  6. Apply sorting (created_at or submitted_at)      │
│  7. Execute count query (total)                     │
│  8. Apply pagination (limit/offset)                 │
│  9. Execute data query                              │
│  10. Transform to DTO with nested catalog badge     │
│  11. Build response with pagination metadata        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query: badge_applications table                    │
│  Join: catalog_badges table                         │
│  - Uses indexes on (applicant_id)                   │
│  - Uses indexes on (status)                         │
│  - Uses indexes on (catalog_badge_id)               │
│  - Applies WHERE clauses for filters                │
│  - Uses ORDER BY for sorting                        │
│  - Uses LIMIT/OFFSET for pagination                 │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  badge_applications table with indexes              │
│  catalog_badges table (for join)                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Results
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Receive results from service                    │
│  2. Return JSON response with 200 status            │
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
- **Non-Admin Users**:
  - Can only view their own badge applications
  - Automatically filtered by `applicant_id = current_user.id` at service layer
  - Cannot use `applicant_id` query parameter
  - If `applicant_id` provided in query, return 403 Forbidden
- **Admin Users**:
  - Can view all badge applications
  - Can use `applicant_id` query parameter to filter by any user
  - No automatic filtering applied
  - Admin check via `current_user.is_admin` flag

### Input Validation
- **SQL Injection Prevention**:
  - Use Supabase query builder (parameterized queries)
  - Never concatenate user input into SQL strings
- **Parameter Validation**:
  - Validate all enum values against allowed constants
  - Validate UUID format for applicant_id and catalog_badge_id
  - Enforce numeric constraints on limit/offset
- **DoS Prevention**:
  - Maximum limit of 100 items per page
  - Validate offset is non-negative
  - Consider rate limiting at infrastructure level

### Data Exposure
- **Prevent Information Leakage**:
  - Non-admin users cannot access other users' applications
  - Don't expose internal error details to client
  - Log detailed errors server-side only
  - Return generic error messages for 500 errors
- **User Privacy**:
  - Only expose applicant_id UUID in response
  - Don't expose reviewer details in list view (only in detail view)

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling |
|----------|-------------|------------|----------|
| User not authenticated | 401 | `unauthorized` | Return error immediately, don't process request |
| Invalid status value | 400 | `validation_error` | Validate with Zod, return field-level error |
| Invalid UUID format | 400 | `validation_error` | Validate with Zod, return field-level error |
| Non-admin using applicant_id | 403 | `forbidden` | Check user role, return clear error message |
| Invalid sort field | 400 | `validation_error` | Validate with Zod, return error |
| Invalid order value | 400 | `validation_error` | Validate with Zod, return error |
| Limit < 1 or > 100 | 400 | `validation_error` | Validate with Zod, return error |
| Negative offset | 400 | `validation_error` | Validate with Zod, return error |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Supabase query error | 500 | `internal_error` | Log error, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Use Zod schema to validate all query parameters
   - Collect all validation errors
   - Return structured error response with field-level details

2. **Authentication Errors (401)**:
   - Check authentication before any processing
   - Return immediately if not authenticated
   - Use consistent error message

3. **Authorization Errors (403)**:
   - Check if non-admin user tries to use applicant_id filter
   - Return clear error message explaining admin-only access

4. **Database Errors (500)**:
   - Catch all database exceptions
   - Log full error details server-side (console.error)
   - Return generic error message to client
   - Don't expose database structure or query details

5. **Unexpected Errors (500)**:
   - Wrap entire handler in try-catch
   - Log unexpected errors
   - Return generic error message

## 8. Performance Considerations

### Potential Bottlenecks
1. **Join with catalog_badges**: Additional table join for nested data
2. **Count Query**: Counting total results can be expensive
3. **Unindexed Filters**: Filtering on unindexed columns
4. **Large Result Sets**: Users with many badge applications

### Optimization Strategies

1. **Database Indexes** (Already in schema):
   - B-Tree index on `applicant_id` for user filtering
   - B-Tree index on `status` for status filtering
   - B-Tree index on `catalog_badge_id` for badge filtering
   - B-Tree index on `created_at` for sorting

2. **Query Optimization**:
   - Use `select()` with specific columns for join to reduce data transfer
   - Use `range()` for efficient pagination
   - Execute count query separately (Supabase provides this)
   - Consider using `.single()` for catalog badge join optimization

3. **Pagination**:
   - Default to 20 items per page
   - Enforce maximum of 100 items per page
   - Use offset-based pagination for simplicity

4. **Join Optimization**:
   - Fetch only required fields from catalog_badges (id, title, category, level)
   - Consider denormalizing catalog badge summary if join becomes bottleneck

5. **Caching Considerations** (Future Enhancement):
   - Cache user's own applications list with short TTL
   - Invalidate cache when application status changes
   - Use per-user cache keys

### Expected Performance
- **Small Datasets** (< 100 applications per user): < 100ms response time
- **Medium Datasets** (100-500 applications per user): < 200ms response time
- **Large Datasets** (> 500 applications per user): < 500ms response time
- **With Join**: Add 20-50ms overhead for catalog badge join

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File**: `src/lib/validation/badge-application.validation.ts` (new file)

```typescript
import { z } from 'zod';
import { BadgeApplicationStatus } from '@/types';

export const listBadgeApplicationsQuerySchema = z.object({
  status: z.enum([
    BadgeApplicationStatus.Draft,
    BadgeApplicationStatus.Submitted,
    BadgeApplicationStatus.Accepted,
    BadgeApplicationStatus.Rejected,
    BadgeApplicationStatus.UsedInPromotion,
  ]).optional(),
  applicant_id: z.string().uuid().optional(),
  catalog_badge_id: z.string().uuid().optional(),
  sort: z.enum(['created_at', 'submitted_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListBadgeApplicationsQuery = z.infer<typeof listBadgeApplicationsQuerySchema>;
```

### Step 2: Create Service Method
**File**: `src/lib/badge-application.service.ts` (new file)

```typescript
import type { SupabaseClient } from '@/db/supabase.client';
import type {
  BadgeApplicationListItemDto,
  PaginatedResponse,
  PaginationMetadata,
  CatalogBadgeSummary,
} from '@/types';
import type { ListBadgeApplicationsQuery } from './validation/badge-application.validation';

export class BadgeApplicationService {
  constructor(private supabase: SupabaseClient) {}

  async listBadgeApplications(
    query: ListBadgeApplicationsQuery,
    userId: string,
    isAdmin: boolean
  ): Promise<PaginatedResponse<BadgeApplicationListItemDto>> {
    // Build base query with catalog badge join
    let dataQuery = this.supabase
      .from('badge_applications')
      .select(`
        *,
        catalog_badge:catalog_badges!catalog_badge_id (
          id,
          title,
          category,
          level
        )
      `);

    let countQuery = this.supabase
      .from('badge_applications')
      .select('*', { count: 'exact', head: true });

    // Apply authorization filter
    if (!isAdmin) {
      // Non-admin users can only see their own applications
      dataQuery = dataQuery.eq('applicant_id', userId);
      countQuery = countQuery.eq('applicant_id', userId);
    }

    // Apply status filter
    if (query.status) {
      dataQuery = dataQuery.eq('status', query.status);
      countQuery = countQuery.eq('status', query.status);
    }

    // Apply catalog_badge_id filter
    if (query.catalog_badge_id) {
      dataQuery = dataQuery.eq('catalog_badge_id', query.catalog_badge_id);
      countQuery = countQuery.eq('catalog_badge_id', query.catalog_badge_id);
    }

    // Apply applicant_id filter (admin only, checked in route handler)
    if (query.applicant_id && isAdmin) {
      dataQuery = dataQuery.eq('applicant_id', query.applicant_id);
      countQuery = countQuery.eq('applicant_id', query.applicant_id);
    }

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === 'asc' });

    // Execute count query
    const { count, error: countError } = await countQuery;
    if (countError) {
      throw new Error(`Failed to count badge applications: ${countError.message}`);
    }

    // Apply pagination
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      throw new Error(`Failed to fetch badge applications: ${dataError.message}`);
    }

    // Transform data to DTO format
    const applications: BadgeApplicationListItemDto[] = (data || []).map((app: any) => ({
      id: app.id,
      applicant_id: app.applicant_id,
      catalog_badge_id: app.catalog_badge_id,
      catalog_badge_version: app.catalog_badge_version,
      date_of_application: app.date_of_application,
      date_of_fulfillment: app.date_of_fulfillment,
      reason: app.reason,
      status: app.status,
      submitted_at: app.submitted_at,
      reviewed_by: app.reviewed_by,
      reviewed_at: app.reviewed_at,
      review_reason: app.review_reason,
      created_at: app.created_at,
      updated_at: app.updated_at,
      catalog_badge: app.catalog_badge as CatalogBadgeSummary,
    }));

    // Build pagination metadata
    const total = count ?? 0;
    const pagination: PaginationMetadata = {
      total,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + query.limit < total,
    };

    return {
      data: applications,
      pagination,
    };
  }
}
```

### Step 3: Create API Route Handler
**File**: `src/pages/api/badge-applications.ts` (new file)

```typescript
import type { APIRoute } from 'astro';
import { BadgeApplicationService } from '@/lib/badge-application.service';
import { listBadgeApplicationsQuerySchema } from '@/lib/validation/badge-application.validation';
import type { ApiError } from '@/types';

export const GET: APIRoute = async (context) => {
  try {
    // 1. Check authentication
    const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      const error: ApiError = {
        error: 'unauthorized',
        message: 'Authentication required',
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Get user info to check admin status
    const { data: userData, error: userError } = await context.locals.supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      const error: ApiError = {
        error: 'unauthorized',
        message: 'User not found',
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = userData.is_admin;

    // 3. Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listBadgeApplicationsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const error: ApiError = {
        error: 'validation_error',
        message: 'Invalid query parameters',
        details: validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const query = validation.data;

    // 4. Check if non-admin user is trying to use applicant_id filter
    if (query.applicant_id && !isAdmin) {
      const error: ApiError = {
        error: 'forbidden',
        message: 'Only administrators can filter by applicant_id',
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Call service to get badge applications
    const service = new BadgeApplicationService(context.locals.supabase);
    const result = await service.listBadgeApplications(query, user.id, isAdmin);

    // 6. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      });
  } catch (error) {
    // Log error for debugging
    console.error('Error in GET /api/badge-applications:', error);

    // Return generic error to client
    const apiError: ApiError = {
      error: 'internal_error',
      message: 'An unexpected error occurred while fetching badge applications',
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 4: Ensure Zod Dependency
Verify `zod` is installed in the project:

```bash
pnpm add zod
```

### Step 5: Create Directory Structure
Ensure the following directories exist:
- `src/lib/` - for service files
- `src/lib/validation/` - for validation schemas
- `src/pages/api/` - for API route handlers

### Step 6: Test the Endpoint

#### Manual Testing Scenarios

1. **Basic Request** (authenticated standard user):
   ```
   GET /api/badge-applications
   Expected: 200 OK with user's own applications, default pagination
   ```

2. **Filter by Status**:
   ```
   GET /api/badge-applications?status=submitted
   Expected: 200 OK with only submitted applications
   ```

3. **Filter by Catalog Badge**:
   ```
   GET /api/badge-applications?catalog_badge_id=550e8400-e29b-41d4-a716-446655440001
   Expected: 200 OK with applications for specific badge
   ```

4. **Sort by Submitted Date**:
   ```
   GET /api/badge-applications?sort=submitted_at&order=asc
   Expected: 200 OK with applications sorted by submission date ascending
   ```

5. **Pagination**:
   ```
   GET /api/badge-applications?limit=10&offset=20
   Expected: 200 OK with 10 applications starting from offset 20
   ```

6. **Admin Filter by Applicant**:
   ```
   GET /api/badge-applications?applicant_id=550e8400-e29b-41d4-a716-446655440000
   Expected: 200 OK if admin, 403 if not admin
   ```

7. **Invalid Status**:
   ```
   GET /api/badge-applications?status=invalid
   Expected: 400 Bad Request with validation error
   ```

8. **Invalid UUID**:
   ```
   GET /api/badge-applications?catalog_badge_id=not-a-uuid
   Expected: 400 Bad Request with validation error
   ```

9. **Invalid Limit**:
   ```
   GET /api/badge-applications?limit=200
   Expected: 400 Bad Request with validation error
   ```

10. **Non-Admin Using applicant_id**:
    ```
    GET /api/badge-applications?applicant_id=550e8400-e29b-41d4-a716-446655440000
    Expected: 403 Forbidden for non-admin users
    ```

11. **Unauthenticated Request**:
    ```
    GET /api/badge-applications (no session)
    Expected: 401 Unauthorized
    ```

### Step 7: Add Integration Tests
Create test file `src/pages/api/badge-applications.test.ts` (when test framework is configured):

```typescript
import { describe, it, expect } from 'vitest'; // or your test framework

describe('GET /api/badge-applications', () => {
  it('should return 401 when not authenticated', async () => {
    // Test implementation
  });

  it('should return only user own applications for non-admin', async () => {
    // Test implementation
  });

  it('should return all applications for admin users', async () => {
    // Test implementation
  });

  it('should allow admin users to filter by applicant_id', async () => {
    // Test implementation
  });

  it('should forbid non-admin users from using applicant_id filter', async () => {
    // Test implementation
  });

  it('should validate query parameters', async () => {
    // Test implementation
  });

  it('should apply status filter correctly', async () => {
    // Test implementation
  });

  it('should apply catalog_badge_id filter correctly', async () => {
    // Test implementation
  });

  it('should apply pagination correctly', async () => {
    // Test implementation
  });

  it('should apply sorting correctly', async () => {
    // Test implementation
  });

  it('should include nested catalog badge summary', async () => {
    // Test implementation
  });
});
```

### Step 8: Documentation
Update API documentation to include:
- Query parameter descriptions and constraints
- Example requests and responses
- Error scenarios with status codes
- Authentication and authorization requirements
- Role-based access control behavior

### Step 9: Monitoring and Logging
Add logging for:
- Slow queries (> 500ms)
- Failed authentication attempts
- Authorization violations (non-admin using applicant_id)
- Validation errors (aggregate metrics)
- Database errors with full context

Consider using a logging service or application performance monitoring (APM) tool in production.

## 10. Future Enhancements

1. **Cursor-Based Pagination**: Replace offset-based pagination with cursor-based for better performance on large datasets
2. **Response Caching**: Implement per-user caching for frequently accessed application lists
3. **Include Applicant Details**: Add option to include full applicant details in response
4. **Bulk Operations**: Add endpoint to fetch multiple applications by IDs
5. **Advanced Filtering**: Add date range filters (date_of_application, submitted_at)
6. **Sorting Options**: Add more sorting fields (status, date_of_fulfillment)
7. **Field Selection**: Allow clients to specify which fields to return (`fields` query parameter)
8. **CSV Export**: Add endpoint to export badge applications as CSV
9. **Real-time Updates**: Implement WebSocket support for live application status updates
10. **Aggregation Queries**: Add endpoint to get application counts by status/category
