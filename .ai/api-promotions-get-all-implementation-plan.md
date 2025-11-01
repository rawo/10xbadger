# API Endpoint Implementation Plan: GET /api/promotions

## 1. Endpoint Overview

This endpoint lists promotions with filtering, sorting, and pagination capabilities. The endpoint implements role-based data access where standard users see only their own promotions, while administrators can view all promotions and filter by any user.

**Key Features**:
- Role-based data filtering (user's own vs all promotions)
- Multiple filter options (status, path, template, creator)
- Sorting by creation or submission date
- Pagination with configurable page size
- Response includes badge count and template summary for each promotion
- Efficient database queries with joins and aggregations

**Business Context**:
This endpoint is used for:
- User's promotion dashboard (viewing own promotion history)
- Admin promotion management interface (viewing all submissions)
- Filtering and searching promotions by various criteria
- Monitoring promotion workflow status

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/promotions`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: Role-based (users see own promotions, admins see all)

### Query Parameters

All parameters are optional:

| Parameter | Type | Validation | Default | Description |
|-----------|------|------------|---------|-------------|
| `status` | string | Enum: draft, submitted, approved, rejected | - | Filter by promotion status |
| `created_by` | string (UUID) | Valid UUID format (admin only) | - | Filter by creator user ID |
| `path` | string | Enum: technical, financial, management | - | Filter by career path |
| `template_id` | string (UUID) | Valid UUID format | - | Filter by promotion template |
| `sort` | string | Enum: created_at, submitted_at | created_at | Sort field |
| `order` | string | Enum: asc, desc | desc | Sort order |
| `limit` | number | Min: 1, Max: 100 | 20 | Page size |
| `offset` | number | Min: 0 | 0 | Page offset (for pagination) |

### Request Examples

**List user's own promotions (default)**:
```
GET /api/promotions
```

**Filter by status**:
```
GET /api/promotions?status=submitted
```

**Admin filtering by user**:
```
GET /api/promotions?created_by=550e8400-e29b-41d4-a716-446655440000
```

**Pagination with sorting**:
```
GET /api/promotions?sort=submitted_at&order=asc&limit=50&offset=100
```

**Complex filtering**:
```
GET /api/promotions?status=approved&path=technical&template_id=750e8400-e29b-41d4-a716-446655440020
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `PaginatedResponse<PromotionListItemDto>` - Paginated wrapper
  ```typescript
  interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMetadata;
  }
  ```

- `PromotionListItemDto` - Promotion list item with aggregated data
  ```typescript
  interface PromotionListItemDto extends PromotionRow {
    badge_count: number;
    template: PromotionTemplateSummary;
  }
  ```

- `PromotionTemplateSummary` - Nested template summary
  ```typescript
  interface PromotionTemplateSummary {
    id: string;
    name: string;
  }
  ```

- `PaginationMetadata` - Pagination information
  ```typescript
  interface PaginationMetadata {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }
  ```

**Database Types**:
- `PromotionRow` - Database row type from Supabase

**Enum Types**:
- `PromotionStatusType` - draft, submitted, approved, rejected
- `PromotionPathType` - technical, financial, management

**Error Types**:
- `ApiError` - Standard error response structure

### Validation Types (To Create)

**Query Parameters Validation Schema**:
```typescript
interface ListPromotionsQuery {
  status?: PromotionStatusType;
  created_by?: string;
  path?: PromotionPathType;
  template_id?: string;
  sort: 'created_at' | 'submitted_at';
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
}
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440030",
      "template_id": "750e8400-e29b-41d4-a716-446655440020",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "path": "technical",
      "from_level": "S1",
      "to_level": "S2",
      "status": "draft",
      "created_at": "2025-01-22T10:00:00Z",
      "submitted_at": null,
      "approved_at": null,
      "approved_by": null,
      "rejected_at": null,
      "rejected_by": null,
      "reject_reason": null,
      "executed": false,
      "badge_count": 5,
      "template": {
        "id": "750e8400-e29b-41d4-a716-446655440020",
        "name": "S1 to S2 - Technical Path"
      }
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Response Field Descriptions**:
- `data`: Array of promotion list items
- `badge_count`: Count of badge applications in this promotion
- `template`: Nested template summary (id and name only)
- `pagination.total`: Total count of promotions matching filters
- `pagination.has_more`: Boolean indicating if more pages exist

### Error Responses

#### 400 Bad Request - Invalid Query Parameters

```json
{
  "error": "validation_error",
  "message": "Invalid query parameters",
  "details": [
    {
      "field": "status",
      "message": "Invalid status value. Must be one of: draft, submitted, approved, rejected"
    }
  ]
}
```

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "validation_error",
  "message": "Invalid query parameters",
  "details": [
    {
      "field": "template_id",
      "message": "Invalid UUID format"
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

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching promotions"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/promotions?status=submitted&limit=20
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│      src/pages/api/promotions/index.ts              │
│                                                      │
│  1. Extract query parameters                        │
│  2. Validate query parameters (Zod schema)          │
│  3. (Future) Get user from auth session             │
│  4. (Future) Check admin status                     │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              PromotionService                       │
│        src/lib/promotion.service.ts                 │
│                                                      │
│  listPromotions(query, userId?, isAdmin?)           │
│  1. Build base query for promotions                 │
│  2. Build count query (for pagination total)        │
│  3. Apply automatic filtering:                      │
│     - If NOT admin: filter by created_by = userId   │
│     - If admin: apply created_by filter if provided │
│  4. Apply status filter (if provided)               │
│  5. Apply path filter (if provided)                 │
│  6. Apply template_id filter (if provided)          │
│  7. Execute count query (get total)                 │
│  8. Apply sorting (created_at or submitted_at)      │
│  9. Apply pagination (range)                        │
│  10. Execute data query with joins                  │
│  11. Transform to DTOs with aggregations            │
│  12. Build pagination metadata                      │
│  13. Return paginated response                      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query 1: Count promotions                          │
│  SELECT COUNT(*) FROM promotions                    │
│  WHERE [filters]                                    │
│                                                      │
│  Query 2: Fetch promotions with joins               │
│  SELECT p.*,                                        │
│         pt.id as template_id,                       │
│         pt.name as template_name,                   │
│         COUNT(pb.id) as badge_count                 │
│  FROM promotions p                                  │
│  LEFT JOIN promotion_templates pt ON p.template_id │
│  LEFT JOIN promotion_badges pb ON p.id = pb.promotion_id │
│  WHERE [filters]                                    │
│  GROUP BY p.id, pt.id, pt.name                      │
│  ORDER BY [sort] [order]                            │
│  LIMIT [limit] OFFSET [offset]                      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  Tables:                                            │
│  - promotions (main table)                          │
│  - promotion_templates (for template summary)       │
│  - promotion_badges (for badge count)               │
│                                                      │
│  Indexes used:                                      │
│  - promotions(created_by) - for user filtering      │
│  - promotions(status, created_at) - for filtering   │
│  - promotions(template_id) - for template filter    │
│  - promotion_badges(promotion_id) - for counting    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Result (promotions + metadata)
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Receive paginated response from service         │
│  2. Return 200 OK with data and pagination          │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

**Alternative Flow - Using Supabase RPC for Performance**:

For better performance with complex aggregations, consider creating a PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION list_promotions(
  p_user_id UUID,
  p_is_admin BOOLEAN,
  p_status TEXT,
  p_created_by UUID,
  p_path TEXT,
  p_template_id UUID,
  p_sort TEXT,
  p_order TEXT,
  p_limit INT,
  p_offset INT
)
RETURNS TABLE (
  id UUID,
  template_id UUID,
  created_by UUID,
  -- ... all promotion fields ...
  badge_count BIGINT,
  template_name TEXT
)
```

This can significantly improve performance for complex queries.

## 6. Security Considerations

### Authentication

- **Requirement**: User must be authenticated via session
- **Implementation**: Ignored for development per instructions
- **Production**: Will check `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized if no valid session

### Authorization - Role-Based Data Filtering

- **Non-Admin Users**:
  - Automatically filter by `created_by = current_user.id`
  - Can only see their own promotions
  - `created_by` query parameter is ignored (security measure)
  - Cannot enumerate or discover other users' promotions

- **Admin Users**:
  - Can see all promotions in the system
  - Can filter by any user using `created_by` parameter
  - Can view all promotion statuses
  - No automatic filtering applied

**Implementation**:
```typescript
// Non-admin: Force filter by current user
if (!isAdmin) {
  query = query.eq('created_by', userId);
  // Ignore created_by from query params
}
// Admin: Apply created_by filter if provided
else if (queryParams.created_by) {
  query = query.eq('created_by', queryParams.created_by);
}
```

### Input Validation

- **Query Parameter Validation**:
  - Use Zod schema to validate all parameters
  - Reject invalid enum values (status, path, sort, order)
  - Validate UUID format for created_by and template_id
  - Enforce limit constraints (1-100)
  - Enforce offset constraints (>= 0)

- **SQL Injection Prevention**:
  - Use Supabase query builder exclusively (parameterized queries)
  - No string concatenation in queries
  - UUID validation prevents injection attempts
  - Enum validation prevents unexpected values

### Data Exposure

- **Prevent Information Leakage**:
  - Don't expose internal error details to client
  - Log detailed errors server-side only
  - Return generic error messages for 500 errors
  - Don't reveal existence of other users' promotions

- **Sensitive Data**:
  - All promotion fields are safe to expose to owner
  - Template data is public information
  - Badge count is aggregated, not detailed

### Performance Security (DoS Prevention)

- **Rate Limiting** (future):
  - Implement rate limiting on list endpoint
  - Prevent excessive requests from single client

- **Query Limits**:
  - Maximum limit enforced (100)
  - Pagination required for large datasets
  - Index-optimized queries prevent slow scans

### OWASP Top 10 Considerations

1. **Broken Access Control**:
   - Mitigated by automatic created_by filtering for non-admin users
   - Admin role check enforced

2. **Injection**:
   - Mitigated by using ORM/query builder
   - UUID and enum validation

3. **Security Misconfiguration**:
   - Follow Astro/Supabase security best practices
   - Disable unnecessary features

4. **Identification and Authentication Failures**:
   - Handled by Supabase auth (when enabled)

5. **Security Logging and Monitoring Failures**:
   - Log all validation errors
   - Log database errors with context
   - Monitor for suspicious patterns

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid status enum | 400 | `validation_error` | Validate with Zod, return field-level error |
| Invalid UUID format | 400 | `validation_error` | Validate UUIDs with Zod regex |
| Invalid sort field | 400 | `validation_error` | Validate against allowed values |
| Invalid order value | 400 | `validation_error` | Validate against asc/desc |
| Invalid limit (< 1 or > 100) | 400 | `validation_error` | Enforce min/max constraints |
| Invalid offset (< 0) | 400 | `validation_error` | Enforce minimum value |
| Invalid path enum | 400 | `validation_error` | Validate against allowed paths |
| Not authenticated | 401 | `unauthorized` | Check auth session (when enabled) |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Database query error | 500 | `internal_error` | Log error, return generic message |
| Unexpected exception | 500 | `internal_error` | Catch all, log, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Use Zod schema to validate all query parameters
   - Return structured error response with field-level details
   - Include helpful messages for developers
   - Don't proceed to database if validation fails

2. **Authentication Errors (401)**:
   - Check user session via Supabase auth (when enabled)
   - Return early if not authenticated
   - Clear error message: "Authentication required"
   - Don't expose any data

3. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include query context in logs for debugging

4. **Empty Result Set**:
   - **NOT an error** - return 200 OK with empty data array
   - Set total = 0 in pagination metadata
   - Set has_more = false
   - This is normal behavior for list endpoints

5. **Unexpected Errors (500)**:
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

1. **Count Query**: Counting all matching records can be slow on large tables
2. **Join Operations**: Multiple joins (templates, badges) add overhead
3. **Aggregation**: Counting badges per promotion requires grouping
4. **Filtering**: Without proper indexes, filtering can cause table scans
5. **Large Result Sets**: Fetching many promotions impacts memory and network

### Optimization Strategies

1. **Database Optimization**:
   - **Indexes Required**:
     - `promotions(created_by)` - for user filtering (should exist)
     - `promotions(status, created_at)` - composite index for common filters
     - `promotions(template_id)` - for template filtering
     - `promotion_badges(promotion_id)` - for join and count

   - **Query Optimization**:
     - Use `.select('*, promotion_templates(id, name)')` for nested select
     - Count badges using Supabase's count feature or GROUP BY
     - Limit columns selected (avoid SELECT *)

2. **Pagination Strategy**:
   - **Current Approach**: Offset-based pagination
     - Simple to implement
     - Works well for small to medium datasets
     - Performance degrades with large offsets

   - **Future Enhancement**: Cursor-based pagination
     - Better performance for large datasets
     - Use `created_at` or `id` as cursor
     - Eliminates offset calculation overhead

3. **Count Query Optimization**:
   - Run count query in parallel with data query (Promise.all)
   - Consider caching total count for admin view (updates less frequently)
   - Use `count: 'exact'` only when needed, `count: 'estimated'` for large tables
   - Consider separate count endpoint for very large datasets

4. **Caching Considerations** (Future Enhancement):
   - Cache user's own promotion list (short TTL, 1-2 minutes)
   - Cache template summaries (longer TTL, they change rarely)
   - Invalidate cache on promotion create/update/delete
   - Use Redis or in-memory cache
   - Cache key pattern: `promotions:list:${userId}:${queryHash}`

5. **Aggregation Optimization**:
   - **Current**: JOIN with promotion_badges and COUNT
   - **Alternative**: Materialized view with badge counts
   - **Alternative**: Denormalized badge_count column on promotions table
   - Trade-off: Query complexity vs data denormalization

6. **Response Size Optimization**:
   - Limit default page size to 20 (balance between UX and performance)
   - Maximum limit of 100 prevents excessive data transfer
   - Only include necessary fields in template summary
   - Consider compression for large responses (gzip)

### Expected Performance

Based on proper indexing and optimization:

- **Query Time**:
  - Count query: 10-50ms (with index)
  - Data query: 20-100ms (with joins and grouping)
  - Total response time: < 150ms (excluding network latency)

- **Scaling**:
  - Good performance up to ~100,000 promotions
  - With proper indexes, supports millions of promotions
  - Consider partitioning by date for very large tables

- **99th Percentile**: < 300ms for typical queries

### Performance Monitoring

- Log slow queries (> 200ms) with query context
- Track response times by filter combinations
- Monitor database query execution plans
- Set up alerts for degraded performance (> 500ms)
- Track pagination patterns (identify common offsets)

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File**: `src/lib/validation/promotion.validation.ts` (new file)

**Purpose**: Define Zod schema for query parameter validation

```typescript
import { z } from "zod";
import { PromotionStatus, PromotionPath } from "@/types";

/**
 * Validation schema for GET /api/promotions query parameters
 */
export const listPromotionsQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  created_by: z.string().uuid("Invalid user ID format").optional(),
  path: z.enum(['technical', 'financial', 'management']).optional(),
  template_id: z.string().uuid("Invalid template ID format").optional(),
  sort: z.enum(['created_at', 'submitted_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;
```

**Key Points**:
- Use `.coerce.number()` to convert string query params to numbers
- Use `.default()` for optional parameters with defaults
- Use `.optional()` for truly optional parameters
- Validate UUIDs with `.uuid()` method
- Use enum validation for status, path, sort, order

### Step 2: Create or Update PromotionService

**File**: `src/lib/promotion.service.ts` (new file or update existing)

**Purpose**: Add method to list promotions with all business logic

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PromotionListItemDto,
  PromotionRow,
  PaginatedResponse,
  PaginationMetadata,
  PromotionTemplateSummary,
} from "@/types";
import type { ListPromotionsQuery } from "./validation/promotion.validation";

/**
 * Service class for promotion operations
 */
export class PromotionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists promotions with filtering, sorting, and pagination
   *
   * Non-admin users see only their own promotions.
   * Admin users can see all promotions and filter by user.
   *
   * @param query - Validated query parameters
   * @param userId - Current user ID (for non-admin filtering)
   * @param isAdmin - Whether current user is admin
   * @returns Paginated response with promotions and metadata
   * @throws Error if database query fails
   */
  async listPromotions(
    query: ListPromotionsQuery,
    userId?: string,
    isAdmin: boolean = false
  ): Promise<PaginatedResponse<PromotionListItemDto>> {
    // Build base query for data
    let dataQuery = this.supabase
      .from("promotions")
      .select(`
        *,
        promotion_templates!inner(id, name)
      `);

    // Build base query for count
    let countQuery = this.supabase
      .from("promotions")
      .select("*", { count: "exact", head: true });

    // Apply automatic filtering for non-admin users
    if (!isAdmin && userId) {
      dataQuery = dataQuery.eq("created_by", userId);
      countQuery = countQuery.eq("created_by", userId);
    }
    // Apply created_by filter for admin users (if provided)
    else if (isAdmin && query.created_by) {
      dataQuery = dataQuery.eq("created_by", query.created_by);
      countQuery = countQuery.eq("created_by", query.created_by);
    }

    // Apply status filter if provided
    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    // Apply path filter if provided
    if (query.path) {
      dataQuery = dataQuery.eq("path", query.path);
      countQuery = countQuery.eq("path", query.path);
    }

    // Apply template_id filter if provided
    if (query.template_id) {
      dataQuery = dataQuery.eq("template_id", query.template_id);
      countQuery = countQuery.eq("template_id", query.template_id);
    }

    // Execute count query to get total
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count promotions: ${countError.message}`);
    }

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === "asc" });

    // Apply pagination using range
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      throw new Error(`Failed to fetch promotions: ${dataError.message}`);
    }

    // Count badges for each promotion (separate queries or use RPC)
    // For now, we'll make separate queries - optimize later with RPC
    const promotionsWithBadges = await Promise.all(
      (data || []).map(async (promotion) => {
        const { count: badgeCount } = await this.supabase
          .from("promotion_badges")
          .select("*", { count: "exact", head: true })
          .eq("promotion_id", promotion.id);

        return {
          ...promotion,
          badge_count: badgeCount || 0,
          template: {
            id: promotion.promotion_templates.id,
            name: promotion.promotion_templates.name,
          } as PromotionTemplateSummary,
        };
      })
    );

    // Build pagination metadata
    const total = count ?? 0;
    const pagination: PaginationMetadata = {
      total,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + query.limit < total,
    };

    // Return paginated response
    return {
      data: promotionsWithBadges,
      pagination,
    };
  }
}
```

**Optimization Notes**:
- The badge counting with separate queries is not optimal
- Consider using a PostgreSQL function (RPC) to count badges in single query
- Alternative: Use Supabase `.select('*, promotion_badges(count)')` if supported

**Improved Query with Badge Count** (if Supabase supports it):
```typescript
let dataQuery = this.supabase
  .from("promotions")
  .select(`
    *,
    promotion_templates!inner(id, name),
    promotion_badges(count)
  `);
```

### Step 3: Create API Route Handler

**File**: `src/pages/api/promotions/index.ts` (new file)

**Purpose**: Handle HTTP request/response for promotions list endpoint

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { listPromotionsQuerySchema } from "@/lib/validation/promotion.validation";
import type { ApiError } from "@/types";

/**
 * GET /api/promotions
 *
 * Lists promotions with filtering, sorting, and pagination.
 * Non-admin users see only their own promotions.
 * Admin users can see all promotions and filter by user.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Query Parameters:
 * - status: Filter by promotion status (optional)
 * - created_by: Filter by creator ID - admin only (optional)
 * - path: Filter by career path (optional)
 * - template_id: Filter by template (optional)
 * - sort: Sort field - created_at or submitted_at (default: created_at)
 * - order: Sort order - asc or desc (default: desc)
 * - limit: Page size (default: 20, max: 100)
 * - offset: Page offset (default: 0)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - No admin check performed
 * - All promotions visible
 *
 * Production Authorization (when enabled):
 * - Authenticated users see only their own promotions
 * - Admin users can see all and filter by user
 *
 * @returns 200 OK with paginated promotions
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // For now, we skip auth checks and return all promotions

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

    // Step 2: Check Admin Status
    const { data: userData, error: userError } = await context.locals.supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    const isAdmin = userData?.is_admin || false;
    const userId = user.id;
    */

    // Development mode: Set defaults
    const isAdmin = true; // In dev, behave as admin to see all data
    const userId = undefined; // No filtering in dev mode

    // =========================================================================
    // Step 3: Validate Query Parameters
    // =========================================================================
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listPromotionsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid query parameters",
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

    const query = validation.data;

    // =========================================================================
    // Step 4: Fetch Promotions from Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const result = await service.listPromotions(query, userId, isAdmin);

    // =========================================================================
    // Step 5: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/promotions:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching promotions",
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

**Key Points**:
- Parse query parameters from URL
- Validate using Zod schema
- Pass isAdmin and userId to service for proper filtering
- Return paginated response with proper status codes
- Authentication placeholder (disabled for development)

### Step 4: Manual Testing

**Test Scenarios**:

**1. List All Promotions (No Filters)**:
```bash
curl -X GET 'http://localhost:3000/api/promotions'
```
**Expected**: 200 OK with all promotions, default pagination (limit=20, offset=0)

**2. Filter by Status**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?status=submitted'
```
**Expected**: 200 OK with only submitted promotions

**3. Filter by Multiple Criteria**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?status=approved&path=technical'
```
**Expected**: 200 OK with approved technical path promotions

**4. Custom Pagination**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?limit=5&offset=10'
```
**Expected**: 200 OK with 5 promotions starting from offset 10

**5. Sorting**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?sort=submitted_at&order=asc'
```
**Expected**: 200 OK with promotions sorted by submission date ascending

**6. Invalid Status Value**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?status=invalid'
```
**Expected**: 400 Bad Request with validation error

**7. Invalid UUID Format**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?template_id=not-a-uuid'
```
**Expected**: 400 Bad Request with UUID validation error

**8. Invalid Limit (Too Large)**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?limit=500'
```
**Expected**: 400 Bad Request with limit validation error

**9. Invalid Offset (Negative)**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?offset=-10'
```
**Expected**: 400 Bad Request with offset validation error

**10. Empty Result Set**:
```bash
curl -X GET 'http://localhost:3000/api/promotions?status=approved&path=financial'
```
**Expected**: 200 OK with empty data array, total=0, has_more=false

**11. Verify Pagination Metadata**:
```bash
curl -s 'http://localhost:3000/api/promotions?limit=2' | jq '.pagination'
```
**Expected**: Correct total, limit=2, has_more based on total

**12. Verify Badge Count**:
```bash
curl -s 'http://localhost:3000/api/promotions' | jq '.data[0].badge_count'
```
**Expected**: Numeric badge count for each promotion

**13. Verify Template Summary**:
```bash
curl -s 'http://localhost:3000/api/promotions' | jq '.data[0].template'
```
**Expected**: Object with id and name fields

### Step 5: Integration Tests

**File**: `src/pages/api/__tests__/promotions.get.endpoint.spec.ts` (new file, when test framework available)

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import type { APIContext } from 'astro';

describe('GET /api/promotions', () => {
  describe('Success Cases', () => {
    it('returns paginated promotions with default parameters', async () => {
      // Test with no query parameters
      // Expected: 200 OK with limit=20, offset=0
    });

    it('includes badge_count for each promotion', async () => {
      // Test response structure
      // Expected: Each promotion has badge_count field
    });

    it('includes template summary with id and name', async () => {
      // Test nested template object
      // Expected: template.id and template.name present
    });

    it('returns correct pagination metadata', async () => {
      // Test pagination object
      // Expected: total, limit, offset, has_more
    });
  });

  describe('Filtering', () => {
    it('filters by status correctly', async () => {
      // Test with status=submitted
      // Expected: Only submitted promotions
    });

    it('filters by path correctly', async () => {
      // Test with path=technical
      // Expected: Only technical path promotions
    });

    it('filters by template_id correctly', async () => {
      // Test with valid template UUID
      // Expected: Only promotions with that template
    });

    it('applies multiple filters correctly', async () => {
      // Test with status AND path filters
      // Expected: Promotions matching all criteria
    });
  });

  describe('Sorting and Pagination', () => {
    it('sorts by created_at descending by default', async () => {
      // Test default sorting
      // Expected: Newest promotions first
    });

    it('sorts by submitted_at ascending when specified', async () => {
      // Test custom sorting
      // Expected: Oldest submissions first
    });

    it('applies limit correctly', async () => {
      // Test with limit=5
      // Expected: Exactly 5 promotions (or less if total < 5)
    });

    it('applies offset correctly', async () => {
      // Test with offset=10
      // Expected: Results starting from 11th promotion
    });

    it('calculates has_more correctly', async () => {
      // Test pagination.has_more
      // Expected: true if more pages exist, false otherwise
    });
  });

  describe('Validation Errors', () => {
    it('returns 400 for invalid status', async () => {
      // Test with status=invalid
      // Expected: 400 with validation error
    });

    it('returns 400 for invalid UUID format', async () => {
      // Test with template_id=not-a-uuid
      // Expected: 400 with UUID validation error
    });

    it('returns 400 for invalid sort field', async () => {
      // Test with sort=invalid
      // Expected: 400 with validation error
    });

    it('returns 400 for limit exceeding maximum', async () => {
      // Test with limit=500
      // Expected: 400 with limit validation error
    });

    it('returns 400 for negative offset', async () => {
      // Test with offset=-5
      // Expected: 400 with offset validation error
    });
  });

  describe('Empty Results', () => {
    it('returns empty array for no matching promotions', async () => {
      // Test with filters matching nothing
      // Expected: 200 OK with data=[], total=0
    });

    it('sets has_more to false for empty results', async () => {
      // Test empty result pagination
      // Expected: has_more=false
    });
  });

  describe('Authorization (when enabled)', () => {
    it('filters to user\'s own promotions for non-admin', async () => {
      // Test non-admin user
      // Expected: Only promotions created by user
    });

    it('shows all promotions for admin users', async () => {
      // Test admin user
      // Expected: All promotions visible
    });

    it('allows admin to filter by created_by', async () => {
      // Test admin filtering by user
      // Expected: Promotions by specified user
    });

    it('ignores created_by filter for non-admin users', async () => {
      // Test non-admin trying to use created_by filter
      // Expected: Filter ignored, only user's own promotions
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
- Success Cases: 4 tests
- Filtering: 4 tests
- Sorting and Pagination: 5 tests
- Validation Errors: 5 tests
- Empty Results: 2 tests
- Authorization: 4 tests
- Error Handling: 2 tests
- **Total: ~26 tests**

### Step 6: Service Tests

**File**: `src/lib/__tests__/promotion.service.spec.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import { PromotionService } from '../promotion.service';
import type { SupabaseClient } from '@/db/supabase.client';

describe('PromotionService.listPromotions', () => {
  it('returns paginated promotions', async () => {
    // Test implementation
  });

  it('filters by created_by for non-admin users', async () => {
    // Test automatic filtering
  });

  it('allows admin to see all promotions', async () => {
    // Test admin access
  });

  it('applies status filter correctly', async () => {
    // Test filtering
  });

  it('applies sorting correctly', async () => {
    // Test sort and order
  });

  it('calculates pagination metadata correctly', async () => {
    // Test pagination
  });

  it('includes badge count for each promotion', async () => {
    // Test aggregation
  });

  it('includes template summary', async () => {
    // Test nested data
  });
});
```

### Step 7: Performance Optimization (Optional)

**Consider PostgreSQL Function for Better Performance**:

**File**: `supabase/migrations/[timestamp]_add_list_promotions_function.sql`

```sql
create or replace function list_promotions(
  p_user_id uuid default null,
  p_is_admin boolean default false,
  p_status text default null,
  p_created_by uuid default null,
  p_path text default null,
  p_template_id uuid default null,
  p_sort text default 'created_at',
  p_order text default 'desc',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  template_id uuid,
  created_by uuid,
  path text,
  from_level text,
  to_level text,
  status text,
  created_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  reject_reason text,
  executed boolean,
  badge_count bigint,
  template_name text
)
language sql
stable
as $$
  select
    p.id,
    p.template_id,
    p.created_by,
    p.path,
    p.from_level,
    p.to_level,
    p.status,
    p.created_at,
    p.submitted_at,
    p.approved_at,
    p.approved_by,
    p.rejected_at,
    p.rejected_by,
    p.reject_reason,
    p.executed,
    count(pb.id) as badge_count,
    pt.name as template_name
  from promotions p
  inner join promotion_templates pt on p.template_id = pt.id
  left join promotion_badges pb on p.id = pb.promotion_id
  where
    -- Non-admin: filter by user
    (p_is_admin or p.created_by = p_user_id)
    -- Admin created_by filter
    and (p_created_by is null or p.created_by = p_created_by)
    -- Status filter
    and (p_status is null or p.status = p_status)
    -- Path filter
    and (p_path is null or p.path = p_path)
    -- Template filter
    and (p_template_id is null or p.template_id = p_template_id)
  group by p.id, pt.id, pt.name
  order by
    case when p_sort = 'created_at' and p_order = 'asc' then p.created_at end asc,
    case when p_sort = 'created_at' and p_order = 'desc' then p.created_at end desc,
    case when p_sort = 'submitted_at' and p_order = 'asc' then p.submitted_at end asc,
    case when p_sort = 'submitted_at' and p_order = 'desc' then p.submitted_at end desc
  limit p_limit
  offset p_offset;
$$;
```

Then use with Supabase RPC:
```typescript
const { data, error } = await this.supabase.rpc('list_promotions', {
  p_user_id: userId,
  p_is_admin: isAdmin,
  p_status: query.status,
  p_created_by: query.created_by,
  p_path: query.path,
  p_template_id: query.template_id,
  p_sort: query.sort,
  p_order: query.order,
  p_limit: query.limit,
  p_offset: query.offset,
});
```

### Step 8: Documentation

**Action**: Update API documentation

**Content to Include**:
- Endpoint URL and HTTP method
- Query parameter descriptions with validation rules
- Authentication requirements (when enabled)
- Authorization behavior (user vs admin)
- Request and response examples
- Error scenarios with status codes
- Pagination details
- Performance considerations
- Rate limiting information (if applicable)

### Step 9: Verify Build and Linting

**Actions**:

1. **Run Linter**:
```bash
pnpm lint
```
**Expected**: No errors

2. **Run Build**:
```bash
pnpm build
```
**Expected**: Successful build

3. **Type Check**:
```bash
pnpm exec tsc --noEmit
```
**Expected**: No type errors

### Step 10: Final Verification Checklist

- [ ] Validation schema created and tested
- [ ] Service method implemented with all filters
- [ ] API route handler created
- [ ] Manual tests pass (all scenarios)
- [ ] Integration tests written (when framework available)
- [ ] Service tests written
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Performance considerations addressed
- [ ] Authentication placeholders in place
- [ ] Authorization logic implemented
- [ ] Error handling comprehensive
- [ ] Pagination working correctly
- [ ] Badge counting verified
- [ ] Template summary included

---

## Notes & Assumptions

- The plan assumes the `promotions` table has all fields as specified in `db-plan.md`
- Badge counting uses separate queries initially - optimize with RPC if performance issues arise
- Authentication is disabled for development and will be implemented later
- Authorization (admin check) placeholder is included for future implementation
- Pagination uses offset-based strategy (simpler but less efficient for large offsets)
- Consider cursor-based pagination for production with large datasets
- Template summary uses nested select - verify Supabase supports this syntax
- Index recommendations assume production workload - adjust based on actual usage patterns
