# API Endpoint Implementation Plan: GET /api/catalog-badges

## 1. Endpoint Overview

This endpoint retrieves a paginated, filterable, and searchable list of catalog badges from the system. It supports multiple query parameters for filtering by category, level, and status, as well as full-text search on badge titles. The endpoint implements role-based access control where non-admin users can only view active badges, while administrators can filter by any status.

**Key Features**:
- Filtering by category, level, and status
- Full-text search on badge titles
- Sorting by created_at or title
- Pagination with configurable limit and offset
- Role-based filtering (admin vs. standard user)

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/catalog-badges`
- **Authentication**: Required (session-based)
- **Authorization**:
  - Standard users: Can only view `active` badges
  - Admin users: Can filter by any status

### Query Parameters

#### Required Parameters
None - all parameters are optional

#### Optional Parameters

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `category` | string | - | Enum: `technical`, `organizational`, `softskilled` | Filter by badge category |
| `level` | string | - | Enum: `gold`, `silver`, `bronze` | Filter by badge level |
| `q` | string | - | Any string | Full-text search on badge title |
| `status` | string | `active` | Enum: `active`, `inactive` (admin only) | Filter by badge status |
| `sort` | string | `created_at` | Enum: `created_at`, `title` | Field to sort by |
| `order` | string | `desc` | Enum: `asc`, `desc` | Sort order |
| `limit` | number | 20 | Integer, min: 1, max: 100 | Page size |
| `offset` | number | 0 | Integer, min: 0 | Page offset |

### Request Example

```
GET /api/catalog-badges?category=technical&level=gold&q=PostgreSQL&sort=title&order=asc&limit=10&offset=0
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `CatalogBadgeListItemDto` - Individual catalog badge in response
- `PaginatedResponse<CatalogBadgeListItemDto>` - Full response structure
- `PaginationMetadata` - Pagination metadata

**Validation Types**:
- `BadgeCategory` - Badge category enum values
- `BadgeCategoryType` - Type for badge category
- `BadgeLevel` - Badge level enum values
- `BadgeLevelType` - Type for badge level
- `CatalogBadgeStatus` - Catalog badge status enum values
- `CatalogBadgeStatusType` - Type for catalog badge status

**Database Types**:
- `CatalogBadgeRow` - Database row type from Supabase

**Error Types**:
- `ApiError` - Standard error response structure
- `ValidationErrorDetail` - Field-level validation errors

### New Types to Create

**Query Parameter Schema** (in route file or service):
```typescript
interface ListCatalogBadgesQuery {
  category?: BadgeCategoryType;
  level?: BadgeLevelType;
  q?: string;
  status?: CatalogBadgeStatusType;
  sort?: 'created_at' | 'title';
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
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "PostgreSQL Expert",
      "description": "Demonstrated advanced knowledge of PostgreSQL database administration and optimization",
      "category": "technical",
      "level": "gold",
      "status": "active",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-01-10T09:00:00Z",
      "deactivated_at": null,
      "version": 1,
      "metadata": {}
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
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
  "message": "Invalid category value. Must be one of: technical, organizational, softskilled"
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
      "field": "category",
      "message": "Invalid category. Must be one of: technical, organizational, softskilled"
    }
  ]
}
```

#### 403 Forbidden - Non-Admin Status Filter
```json
{
  "error": "forbidden",
  "message": "Only administrators can filter by status"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching catalog badges"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/catalog-badges?category=technical&limit=10
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/catalog-badges.ts                    │
│                                                      │
│  1. Extract query parameters                        │
│  2. Check authentication (context.locals.supabase)  │
│  3. Get user info (is_admin flag)                   │
│  4. Validate query parameters (Zod schema)          │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         CatalogBadgeService                         │
│  src/lib/catalog-badge.service.ts                   │
│                                                      │
│  listCatalogBadges(filters, isAdmin)                │
│  1. Build base query                                │
│  2. Apply status filter (active only for non-admin) │
│  3. Apply category filter (if provided)             │
│  4. Apply level filter (if provided)                │
│  5. Apply full-text search (if q provided)          │
│  6. Apply sorting                                   │
│  7. Execute count query (total)                     │
│  8. Apply pagination (limit/offset)                 │
│  9. Execute data query                              │
│  10. Build response with pagination metadata        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query: catalog_badges table                        │
│  - Uses indexes on (category, level)                │
│  - Uses GIN index for full-text search on title     │
│  - Applies WHERE clauses for filters                │
│  - Uses ORDER BY for sorting                        │
│  - Uses LIMIT/OFFSET for pagination                 │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  catalog_badges table with indexes                  │
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
  - Can only view badges with `status = 'active'`
  - Cannot use `status` query parameter
  - Automatically filtered at service layer
- **Admin Users**:
  - Can view all badges regardless of status
  - Can use `status` query parameter to filter
  - Admin check via `current_user.is_admin` flag

### Input Validation
- **SQL Injection Prevention**:
  - Use Supabase query builder (parameterized queries)
  - Never concatenate user input into SQL strings
- **Parameter Validation**:
  - Validate all enum values against allowed constants
  - Sanitize search query `q` parameter
  - Enforce numeric constraints on limit/offset
- **DoS Prevention**:
  - Maximum limit of 100 items per page
  - Validate offset is non-negative
  - Consider rate limiting at infrastructure level

### Data Exposure
- **Prevent Information Leakage**:
  - Don't expose internal error details to client
  - Log detailed errors server-side only
  - Return generic error messages for 500 errors
- **User Privacy**:
  - Only expose `created_by` UUID, not sensitive user data
  - Consider adding user details in future if needed

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling |
|----------|-------------|------------|----------|
| User not authenticated | 401 | `unauthorized` | Return error immediately, don't process request |
| Invalid category value | 400 | `validation_error` | Validate with Zod, return field-level error |
| Invalid level value | 400 | `validation_error` | Validate with Zod, return field-level error |
| Invalid status value | 400 | `validation_error` | Validate with Zod, return field-level error |
| Non-admin using status filter | 403 | `forbidden` | Check user role before allowing status filter |
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
   - Check if non-admin user tries to filter by status
   - Return clear error message

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
1. **Full-Text Search**: Can be slow on large datasets
2. **Count Query**: Counting total results can be expensive
3. **Unindexed Filters**: Filtering on unindexed columns
4. **Large Result Sets**: Fetching many rows at once

### Optimization Strategies

1. **Database Indexes** (Already in schema):
   - GIN index on `to_tsvector('simple', title)` for full-text search
   - B-Tree index on `(category, level)` for filter queries
   - B-Tree index on `(status, created_at)` for listing active badges

2. **Query Optimization**:
   - Use `select()` to only fetch needed columns (not necessary with typed responses)
   - Use `range()` for efficient pagination
   - Execute count query separately (Supabase provides this)

3. **Pagination**:
   - Default to 20 items per page
   - Enforce maximum of 100 items per page
   - Use offset-based pagination for simplicity (consider cursor-based for large datasets in future)

4. **Caching Considerations** (Future Enhancement):
   - Consider caching catalog badge list for non-authenticated requests
   - Invalidate cache when badges are created/updated/deactivated
   - Use short TTL (5-10 minutes) for active badges list

5. **Response Size**:
   - Limit metadata field size if needed
   - Consider removing metadata from list response (keep only in detail view)

### Expected Performance
- **Small Datasets** (< 1000 badges): < 100ms response time
- **Medium Datasets** (1000-10000 badges): < 200ms response time
- **Large Datasets** (> 10000 badges): < 500ms response time
- **Full-Text Search**: Add 50-100ms overhead

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File**: `src/lib/validation/catalog-badge.validation.ts` (new file)

```typescript
import { z } from 'zod';
import { BadgeCategory, BadgeLevel, CatalogBadgeStatus } from '@/types';

export const listCatalogBadgesQuerySchema = z.object({
  category: z.enum([
    BadgeCategory.Technical,
    BadgeCategory.Organizational,
    BadgeCategory.Softskilled,
  ]).optional(),
  level: z.enum([
    BadgeLevel.Gold,
    BadgeLevel.Silver,
    BadgeLevel.Bronze,
  ]).optional(),
  q: z.string().max(200).optional(),
  status: z.enum([
    CatalogBadgeStatus.Active,
    CatalogBadgeStatus.Inactive,
  ]).optional(),
  sort: z.enum(['created_at', 'title']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListCatalogBadgesQuery = z.infer<typeof listCatalogBadgesQuerySchema>;
```

### Step 2: Create Service Method
**File**: `src/lib/catalog-badge.service.ts` (new file)

```typescript
import type { SupabaseClient } from '@/db/supabase.client';
import type {
  CatalogBadgeListItemDto,
  PaginatedResponse,
  PaginationMetadata,
} from '@/types';
import type { ListCatalogBadgesQuery } from './validation/catalog-badge.validation';

export class CatalogBadgeService {
  constructor(private supabase: SupabaseClient) {}

  async listCatalogBadges(
    query: ListCatalogBadgesQuery,
    isAdmin: boolean
  ): Promise<PaginatedResponse<CatalogBadgeListItemDto>> {
    // Build base query
    let dataQuery = this.supabase.from('catalog_badges').select('*');
    let countQuery = this.supabase.from('catalog_badges').select('*', { count: 'exact', head: true });

    // Apply status filter (default to 'active' for non-admin)
    if (query.status && isAdmin) {
      dataQuery = dataQuery.eq('status', query.status);
      countQuery = countQuery.eq('status', query.status);
    } else if (!isAdmin) {
      // Non-admin users can only see active badges
      dataQuery = dataQuery.eq('status', 'active');
      countQuery = countQuery.eq('status', 'active');
    }

    // Apply category filter
    if (query.category) {
      dataQuery = dataQuery.eq('category', query.category);
      countQuery = countQuery.eq('category', query.category);
    }

    // Apply level filter
    if (query.level) {
      dataQuery = dataQuery.eq('level', query.level);
      countQuery = countQuery.eq('level', query.level);
    }

    // Apply full-text search on title
    if (query.q) {
      dataQuery = dataQuery.textSearch('title', query.q, {
        type: 'plain',
        config: 'simple',
      });
      countQuery = countQuery.textSearch('title', query.q, {
        type: 'plain',
        config: 'simple',
      });
    }

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === 'asc' });

    // Execute count query
    const { count, error: countError } = await countQuery;
    if (countError) {
      throw new Error(`Failed to count catalog badges: ${countError.message}`);
    }

    // Apply pagination
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      throw new Error(`Failed to fetch catalog badges: ${dataError.message}`);
    }

    // Build pagination metadata
    const total = count ?? 0;
    const pagination: PaginationMetadata = {
      total,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + query.limit < total,
    };

    return {
      data: data as CatalogBadgeListItemDto[],
      pagination,
    };
  }
}
```

### Step 3: Create API Route Handler
**File**: `src/pages/api/catalog-badges.ts` (new file)

```typescript
import type { APIRoute } from 'astro';
import { CatalogBadgeService } from '@/lib/catalog-badge.service';
import { listCatalogBadgesQuerySchema } from '@/lib/validation/catalog-badge.validation';
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

    const validation = listCatalogBadgesQuerySchema.safeParse(queryParams);

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

    // 4. Check if non-admin user is trying to use status filter
    if (query.status && !isAdmin) {
      const error: ApiError = {
        error: 'forbidden',
        message: 'Only administrators can filter by status',
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Call service to get catalog badges
    const service = new CatalogBadgeService(context.locals.supabase);
    const result = await service.listCatalogBadges(query, isAdmin);

    // 6. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in GET /api/catalog-badges:', error);

    // Return generic error to client
    const apiError: ApiError = {
      error: 'internal_error',
      message: 'An unexpected error occurred while fetching catalog badges',
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 4: Add Zod Dependency
Ensure `zod` is installed in the project:

```bash
pnpm add zod
```

### Step 5: Create Directory Structure
Create the following directories if they don't exist:
- `src/lib/` - for service files
- `src/lib/validation/` - for validation schemas
- `src/pages/api/` - for API route handlers

### Step 6: Test the Endpoint

#### Manual Testing Scenarios

1. **Basic Request** (authenticated user):
   ```
   GET /api/catalog-badges
   Expected: 200 OK with active badges, default pagination
   ```

2. **Filter by Category**:
   ```
   GET /api/catalog-badges?category=technical
   Expected: 200 OK with only technical badges
   ```

3. **Filter by Level**:
   ```
   GET /api/catalog-badges?level=gold
   Expected: 200 OK with only gold badges
   ```

4. **Search by Title**:
   ```
   GET /api/catalog-badges?q=PostgreSQL
   Expected: 200 OK with badges matching "PostgreSQL"
   ```

5. **Sort by Title**:
   ```
   GET /api/catalog-badges?sort=title&order=asc
   Expected: 200 OK with badges sorted by title ascending
   ```

6. **Pagination**:
   ```
   GET /api/catalog-badges?limit=10&offset=20
   Expected: 200 OK with 10 badges starting from offset 20
   ```

7. **Admin Status Filter**:
   ```
   GET /api/catalog-badges?status=inactive
   Expected: 200 OK if admin, 403 if not admin
   ```

8. **Invalid Category**:
   ```
   GET /api/catalog-badges?category=invalid
   Expected: 400 Bad Request with validation error
   ```

9. **Invalid Limit**:
   ```
   GET /api/catalog-badges?limit=200
   Expected: 400 Bad Request with validation error
   ```

10. **Unauthenticated Request**:
    ```
    GET /api/catalog-badges (no session)
    Expected: 401 Unauthorized
    ```

### Step 7: Add Integration Tests
Create test file `src/pages/api/catalog-badges.test.ts` (when test framework is configured):

```typescript
import { describe, it, expect, beforeAll } from 'vitest'; // or your test framework
import type { APIContext } from 'astro';

describe('GET /api/catalog-badges', () => {
  it('should return 401 when not authenticated', async () => {
    // Test implementation
  });

  it('should return active badges for non-admin users', async () => {
    // Test implementation
  });

  it('should allow admin users to filter by status', async () => {
    // Test implementation
  });

  it('should validate query parameters', async () => {
    // Test implementation
  });

  it('should apply pagination correctly', async () => {
    // Test implementation
  });

  it('should apply filters correctly', async () => {
    // Test implementation
  });

  it('should perform full-text search', async () => {
    // Test implementation
  });
});
```

### Step 8: Documentation
Update API documentation to include:
- Query parameter descriptions
- Example requests and responses
- Error scenarios
- Authentication requirements

### Step 9: Monitoring and Logging
Add logging for:
- Slow queries (> 1 second)
- Failed authentication attempts
- Validation errors (aggregate metrics)
- Database errors

Consider using a logging service or application performance monitoring (APM) tool in production.

## 10. Future Enhancements

1. **Cursor-Based Pagination**: Replace offset-based pagination with cursor-based for better performance on large datasets
2. **Response Caching**: Implement caching for frequently accessed badge lists
3. **GraphQL Support**: Consider adding GraphQL endpoint for more flexible queries
4. **Advanced Search**: Add search on description field, support fuzzy matching
5. **Faceted Search**: Return counts for each category/level/status combination
6. **Bulk Export**: Add endpoint to export all badges as CSV/JSON
7. **Rate Limiting**: Implement rate limiting per user to prevent abuse
8. **Request Compression**: Enable gzip compression for large responses
9. **Field Selection**: Allow clients to specify which fields to return (`fields` query parameter)
10. **Elasticsearch Integration**: For advanced full-text search capabilities on large datasets
