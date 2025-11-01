# API Endpoint Implementation Plan: GET /api/promotions/:id

## 1. Endpoint Overview

This endpoint retrieves a single promotion by ID with comprehensive details including the full promotion template (with rules), all badge applications used in the promotion (with catalog badge summaries), and creator information. The endpoint implements role-based authorization where users can only access their own promotions, while administrators can access any promotion.

**Key Features**:
- Fetch single promotion by UUID
- Include full template details with typed rules array
- Include all badge applications with catalog badge information
- Include creator user information
- Role-based access control (owner or admin only)
- Return 404 for both non-existent and unauthorized promotions (security)

**Business Context**:
This endpoint is used for:
- Viewing promotion details in user dashboard
- Admin review of promotion submissions
- Displaying badge applications used in promotion
- Template requirement validation preview

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/promotions/:id`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: Role-based (users see own promotions, admins see all)

### Path Parameters

#### Required Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format | Promotion ID to retrieve |

### Request Examples

**Fetch Own Promotion**:
```
GET /api/promotions/850e8400-e29b-41d4-a716-446655440030
```

**Admin Fetching Any Promotion**:
```
GET /api/promotions/850e8400-e29b-41d4-a716-446655440030
```

**Invalid UUID**:
```
GET /api/promotions/invalid-uuid
Expected: 400 Bad Request
```

**Non-Existent or Unauthorized**:
```
GET /api/promotions/850e8400-0000-0000-0000-000000000000
Expected: 404 Not Found
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `PromotionDetailDto` - Complete promotion with nested details
  ```typescript
  interface PromotionDetailDto extends PromotionRow {
    template: PromotionTemplateDetail;
    badge_applications: BadgeApplicationWithBadge[];
    creator: UserSummary;
  }
  ```

- `PromotionTemplateDetail` - Full template with typed rules
  ```typescript
  interface PromotionTemplateDetail {
    id: string;
    name: string;
    path: string;
    from_level: string;
    to_level: string;
    rules: PromotionTemplateRule[];
    is_active: boolean;
  }
  ```

- `BadgeApplicationWithBadge` - Badge application with catalog badge
  ```typescript
  interface BadgeApplicationWithBadge {
    id: string;
    catalog_badge_id: string;
    catalog_badge: CatalogBadgeSummary;
    date_of_fulfillment: string | null;
    status: BadgeApplicationStatusType;
  }
  ```

- `UserSummary` - Creator information
  ```typescript
  interface UserSummary {
    id: string;
    display_name: string;
    email: string;
  }
  ```

- `CatalogBadgeSummary` - Badge information
  ```typescript
  interface CatalogBadgeSummary {
    id: string;
    title: string;
    category: BadgeCategoryType;
    level: BadgeLevelType;
  }
  ```

**Database Types**:
- `PromotionRow` - Database row type from Supabase

**Error Types**:
- `ApiError` - Standard error response structure

### Validation Types

**UUID Parameter Validation** (reuse from other endpoints):
```typescript
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "submitted",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T16:30:00Z",
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": false,
  "template": {
    "id": "750e8400-e29b-41d4-a716-446655440020",
    "name": "S1 to S2 - Technical Path",
    "path": "technical",
    "from_level": "S1",
    "to_level": "S2",
    "rules": [
      {
        "category": "technical",
        "level": "silver",
        "count": 6
      },
      {
        "category": "any",
        "level": "gold",
        "count": 1
      }
    ],
    "is_active": true
  },
  "badge_applications": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440010",
      "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
      "catalog_badge": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "React Expert",
        "category": "technical",
        "level": "silver"
      },
      "date_of_fulfillment": "2025-01-15",
      "status": "used_in_promotion"
    }
  ],
  "creator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "email": "john.doe@goodcompany.com"
  }
}
```

**Response Field Descriptions**:
- All promotion fields from PromotionRow
- `template`: Complete template object with rules array
- `badge_applications`: Array of badge applications with catalog badge summaries
- `creator`: User who created the promotion

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format",
  "details": [
    {
      "field": "id",
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

#### 404 Not Found - Promotion Not Found or Unauthorized

```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

**Note**: Return 404 for both non-existent promotions AND unauthorized access attempts to avoid information disclosure (don't reveal existence of promotions user can't access).

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching the promotion"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/promotions/850e8400-e29b-41d4-a716-446655440030
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/promotions/[id].ts                   │
│                                                      │
│  1. Extract id from path parameters                 │
│  2. Validate UUID format (Zod schema)               │
│  3. (Future) Get user from auth session             │
│  4. (Future) Check admin status                     │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              PromotionService                       │
│        src/lib/promotion.service.ts                 │
│                                                      │
│  getPromotionById(id, userId?, isAdmin?)            │
│  1. Query promotion with joins                      │
│  2. Apply authorization filtering:                  │
│     - If NOT admin: filter by created_by = userId   │
│  3. Return null if not found or unauthorized        │
│  4. Fetch template details                          │
│  5. Fetch badge applications with catalog badges    │
│  6. Fetch creator information                       │
│  7. Transform to DTO                                │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Complex Query with Joins:                          │
│  SELECT p.*,                                        │
│         pt.*,                                       │
│         u.id, u.display_name, u.email,              │
│         ba.*, cb.*                                  │
│  FROM promotions p                                  │
│  INNER JOIN promotion_templates pt                  │
│    ON p.template_id = pt.id                         │
│  INNER JOIN users u                                 │
│    ON p.created_by = u.id                           │
│  LEFT JOIN promotion_badges pb                      │
│    ON p.id = pb.promotion_id                        │
│  LEFT JOIN badge_applications ba                    │
│    ON pb.badge_application_id = ba.id               │
│  LEFT JOIN catalog_badges cb                        │
│    ON ba.catalog_badge_id = cb.id                   │
│  WHERE p.id = $1                                    │
│    AND (p.created_by = $2 OR $3)  -- auth filter    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  Tables:                                            │
│  - promotions (main record)                         │
│  - promotion_templates (template details)           │
│  - users (creator info)                             │
│  - promotion_badges (junction table)                │
│  - badge_applications (badge details)               │
│  - catalog_badges (badge catalog info)              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Result (promotion or null)
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Check if result is null                         │
│  2. If null: Return 404 Not Found                   │
│  3. If found: Return 200 OK with promotion details  │
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

### Authorization - Role-Based Access

- **Non-Admin Users**:
  - Can only access promotions where `created_by = current_user.id`
  - Attempting to access another user's promotion returns 404 (not 403)
  - Cannot enumerate or discover other users' promotions

- **Admin Users**:
  - Can access any promotion in the system
  - No filtering by created_by
  - Used for administrative review and approval workflows

**Implementation**:
```typescript
// Non-admin: Force filter by current user
if (!isAdmin) {
  query = query.eq('created_by', userId);
}
// Admin: No additional filtering
```

**Security Note**: Return 404 instead of 403 for unauthorized access attempts to avoid information disclosure. A 403 response would confirm the promotion exists but user can't access it, potentially leaking information.

### Input Validation

- **UUID Format Validation**:
  - Use Zod schema to validate UUID format
  - Reject invalid UUIDs with 400 Bad Request
  - Prevents SQL injection and path traversal

- **Parameter Type Safety**:
  - Extract id from Astro params object
  - Type-safe parameter access
  - No string concatenation in queries

### Data Exposure

- **Prevent Information Leakage**:
  - Don't expose internal error details to client
  - Log detailed errors server-side only
  - Return generic error messages for 500 errors
  - Return 404 (not 403) for unauthorized access

- **Sensitive Data**:
  - Creator email is included but safe to expose to authorized users
  - Badge application details only visible to promotion owner or admin
  - Template rules are non-sensitive (public information)

### SQL Injection Prevention

- **Mitigation**:
  - Use Supabase query builder exclusively (parameterized queries)
  - UUID validation prevents injection attempts
  - No string concatenation in queries
  - Supabase client handles query escaping automatically

### UUID Enumeration

- **Threat**: Guessing valid UUIDs to discover promotions
- **Mitigation**:
  - UUID v4 has 122 bits of randomness (very hard to guess)
  - Authorization check prevents access even if UUID is guessed
  - Return 404 to avoid confirming existence
  - Rate limiting at infrastructure level (future enhancement)

### OWASP Top 10 Considerations

1. **Broken Access Control**:
   - Mitigated by created_by filtering for non-admin users
   - Admin role check enforced

2. **Injection**:
   - Mitigated by using ORM/query builder and UUID validation

3. **Sensitive Data Exposure**:
   - Minimal sensitive data (email is safe for authorized users)
   - No passwords or tokens exposed

4. **Security Misconfiguration**:
   - Follow Astro/Supabase security best practices

5. **Identification and Authentication Failures**:
   - Handled by Supabase auth (when enabled)

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid UUID format | 400 | `validation_error` | Validate with Zod, return field-level error |
| Not authenticated | 401 | `unauthorized` | Check auth session (when enabled) |
| Not owner or admin | 404 | `not_found` | Return 404 to avoid information leakage |
| Promotion not found | 404 | `not_found` | Check if service returns null |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Database query error | 500 | `internal_error` | Log error, return generic message |
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
   - Don't expose any promotion data

3. **Authorization Errors (404, not 403)**:
   - Service returns null if promotion not found OR user not authorized
   - Route handler returns 404 in both cases
   - Clear error message: "Promotion not found"
   - Don't distinguish between non-existent and unauthorized
   - Prevents information disclosure

4. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include promotion ID in logs for debugging

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

1. **Complex Joins**: Multiple table joins increase query complexity
2. **Badge Applications**: Variable number of badge applications per promotion
3. **Nested Objects**: Transformation of flat query results to nested DTOs
4. **Network Latency**: Multiple round-trips if queries not optimized

### Optimization Strategies

1. **Database Optimization**:
   - **Single Query with Joins**: Fetch all data in one query
   - **Indexes Required**:
     - `promotions(id)` - Primary key (already indexed)
     - `promotions(created_by)` - For authorization filter
     - `promotion_badges(promotion_id)` - For join
     - `badge_applications(id)` - Primary key
     - `catalog_badges(id)` - Primary key

   - **Query Pattern**:
     ```sql
     -- Use Supabase nested select syntax
     SELECT *,
            promotion_templates(*),
            users(id, display_name, email),
            promotion_badges(
              badge_applications(
                *,
                catalog_badges(id, title, category, level)
              )
            )
     FROM promotions
     WHERE id = $1 AND (created_by = $2 OR $3);
     ```

2. **Supabase Nested Select**:
   - Use Supabase's nested select feature for efficient joins
   - Single query instead of multiple queries
   - Automatic transformation to nested objects
   - Example:
     ```typescript
     .select(`
       *,
       promotion_templates(*),
       users!created_by(id, display_name, email),
       promotion_badges(
         badge_applications(
           *,
           catalog_badges(id, title, category, level)
         )
       )
     `)
     ```

3. **Caching Considerations** (Future Enhancement):
   - Cache individual promotions with short TTL (1-2 minutes)
   - Cache key: `promotion:${id}:${userId}`
   - Invalidate cache on promotion update
   - Promotions change frequently, so short TTL is appropriate
   - Consider Redis or in-memory cache

4. **Response Size**:
   - Single promotion response is moderate (2-10KB typically)
   - Badge applications array can grow (10-50 items max)
   - Template rules array is small (2-5 items typically)
   - Compression recommended for large responses

5. **Data Transformation**:
   - Transform flat query results to nested DTOs in service layer
   - Use efficient object mapping (avoid deep cloning)
   - Leverage TypeScript type assertions where safe

### Expected Performance

Based on proper indexing and single-query strategy:

- **Query Time**: 10-50ms (single query with joins)
- **Transformation Time**: ~1-5ms (object mapping)
- **Total Response Time**: < 100ms (excluding network latency)
- **99th Percentile**: < 200ms

**Performance is good** - single query with proper indexes is efficient.

### Performance Monitoring

- Log slow queries (> 100ms) with promotion ID
- Track response times by promotion status
- Monitor join query execution plans
- Set up alerts for degraded performance (> 300ms)

## 9. Implementation Steps

### Step 1: Add Service Method to PromotionService

**File**: `src/lib/promotion.service.ts` (update existing file)

**Purpose**: Add method to fetch single promotion by ID with all details

```typescript
/**
 * Retrieves a single promotion by ID with full details
 *
 * Includes template details, badge applications, and creator info.
 * Non-admin users can only access their own promotions.
 *
 * @param id - Promotion UUID
 * @param userId - Current user ID (for authorization)
 * @param isAdmin - Whether current user is admin
 * @returns Promotion detail if found and authorized, null otherwise
 * @throws Error if database query fails
 */
async getPromotionById(
  id: string,
  userId?: string,
  isAdmin = false
): Promise<PromotionDetailDto | null> {
  // Build query with all necessary joins
  let query = this.supabase
    .from("promotions")
    .select(`
      *,
      promotion_templates(*),
      users!created_by(id, display_name, email),
      promotion_badges(
        badge_applications(
          id,
          catalog_badge_id,
          date_of_fulfillment,
          status,
          catalog_badges(id, title, category, level)
        )
      )
    `)
    .eq("id", id);

  // Apply authorization filter for non-admin users
  if (!isAdmin && userId) {
    query = query.eq("created_by", userId);
  }

  // Execute query
  const { data, error } = await query.single();

  if (error) {
    // Handle "not found" vs actual errors
    if (error.code === "PGRST116") {
      // PostgREST error code for no rows returned
      return null;
    }
    throw new Error(`Failed to fetch promotion: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Transform to DTO with nested objects
  const promotion: PromotionDetailDto = {
    // All promotion fields
    id: data.id,
    template_id: data.template_id,
    created_by: data.created_by,
    path: data.path,
    from_level: data.from_level,
    to_level: data.to_level,
    status: data.status,
    created_at: data.created_at,
    submitted_at: data.submitted_at,
    approved_at: data.approved_at,
    approved_by: data.approved_by,
    rejected_at: data.rejected_at,
    rejected_by: data.rejected_by,
    reject_reason: data.reject_reason,
    executed: data.executed,

    // Nested template details
    template: {
      id: data.promotion_templates.id,
      name: data.promotion_templates.name,
      path: data.promotion_templates.path,
      from_level: data.promotion_templates.from_level,
      to_level: data.promotion_templates.to_level,
      rules: data.promotion_templates.rules as unknown as PromotionTemplateRule[],
      is_active: data.promotion_templates.is_active,
    },

    // Nested badge applications
    badge_applications: (data.promotion_badges || []).map((pb: any) => ({
      id: pb.badge_applications.id,
      catalog_badge_id: pb.badge_applications.catalog_badge_id,
      date_of_fulfillment: pb.badge_applications.date_of_fulfillment,
      status: pb.badge_applications.status,
      catalog_badge: {
        id: pb.badge_applications.catalog_badges.id,
        title: pb.badge_applications.catalog_badges.title,
        category: pb.badge_applications.catalog_badges.category,
        level: pb.badge_applications.catalog_badges.level,
      },
    })),

    // Creator information
    creator: {
      id: data.users.id,
      display_name: data.users.display_name,
      email: data.users.email,
    },
  };

  return promotion;
}
```

**Key Points**:
- Use Supabase nested select for efficient single-query fetch
- Apply authorization filter for non-admin users
- Return null for not found OR unauthorized (don't distinguish)
- Transform nested Supabase response to typed DTO
- Handle PGRST116 error code for not found

### Step 2: Create API Route Handler

**File**: `src/pages/api/promotions/[id].ts` (new file)

**Purpose**: Handle HTTP request/response for single promotion endpoint

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import type { ApiError } from "@/types";
import { z } from "zod";

// UUID validation schema
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

/**
 * GET /api/promotions/:id
 *
 * Retrieves a single promotion with full details.
 * Users can only access their own promotions; admins can access all.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Promotion UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - All promotions visible (behaves as admin)
 *
 * Production Authorization (when enabled):
 * - Authenticated users can view their own promotions
 * - Admin users can view all promotions
 *
 * @returns 200 OK with promotion details
 * @returns 400 Bad Request if UUID format is invalid
 * @returns 401 Unauthorized if not authenticated (when auth enabled)
 * @returns 404 Not Found if promotion doesn't exist or user not authorized
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // Authentication will be implemented later. For now, we skip auth checks.

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
    // Step 3: Validate Path Parameter
    // =========================================================================
    const validation = uuidParamSchema.safeParse(context.params);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Invalid promotion ID format",
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
    // Step 4: Fetch Promotion from Service
    // =========================================================================
    const service = new PromotionService(context.locals.supabase);
    const promotion = await service.getPromotionById(id, userId, isAdmin);

    // =========================================================================
    // Step 5: Handle Not Found or Unauthorized
    // =========================================================================
    // Note: Return 404 for both not found and unauthorized to avoid
    // information leakage (don't reveal existence of promotions user can't access)
    if (!promotion) {
      const error: ApiError = {
        error: "not_found",
        message: "Promotion not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 6: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(promotion), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/promotions/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the promotion",
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
- Return 404 for both not found AND unauthorized (security)
- Return appropriate status codes
- Authentication placeholder (disabled for development)

### Step 3: Manual Testing

**Test Scenarios**:

**1. Fetch Existing Promotion**:
```bash
curl -X GET 'http://localhost:3000/api/promotions/850e8400-e29b-41d4-a716-446655440001'
```
**Expected**: 200 OK with complete promotion including template, badge_applications, creator

**2. Invalid UUID Format**:
```bash
curl -X GET 'http://localhost:3000/api/promotions/invalid-uuid'
```
**Expected**: 400 Bad Request with validation error

**3. Non-Existent Promotion (Valid UUID)**:
```bash
curl -X GET 'http://localhost:3000/api/promotions/850e8400-0000-0000-0000-000000000000'
```
**Expected**: 404 Not Found

**4. Verify Response Structure**:
```bash
curl -s 'http://localhost:3000/api/promotions/850e8400-e29b-41d4-a716-446655440001' | python3 -m json.tool
```
**Expected**:
- All promotion fields present
- `template` object with full details and rules array
- `badge_applications` array with catalog_badge nested objects
- `creator` object with id, display_name, email

**5. Verify Nested Objects**:
```bash
curl -s 'http://localhost:3000/api/promotions/850e8400-e29b-41d4-a716-446655440001' | \
  python3 -c "import json,sys; data=json.load(sys.stdin); \
  print('Template rules:', data['template']['rules']); \
  print('Badge count:', len(data['badge_applications'])); \
  print('Creator:', data['creator']['display_name'])"
```
**Expected**: Proper nested structure with typed arrays

**6. Test Different Promotion Statuses**:
```bash
# Test with draft promotion
curl -s 'http://localhost:3000/api/promotions/[draft-id]'

# Test with submitted promotion
curl -s 'http://localhost:3000/api/promotions/[submitted-id]'

# Test with approved promotion
curl -s 'http://localhost:3000/api/promotions/[approved-id]'
```
**Expected**: All return 200 with appropriate status field

### Step 4: Integration Tests

**File**: `src/pages/api/__tests__/promotions.get-one.endpoint.spec.ts` (new file, when test framework available)

```typescript
import { describe, it, expect } from 'vitest';

describe('GET /api/promotions/:id', () => {
  describe('Success Cases', () => {
    it('returns promotion with full details when valid ID provided', async () => {
      // Test with valid promotion ID
      // Expected: 200 OK with complete structure
    });

    it('includes template details with typed rules array', async () => {
      // Test response structure
      // Expected: template.rules is array of PromotionTemplateRule objects
    });

    it('includes badge applications with catalog badge summaries', async () => {
      // Test nested badge_applications
      // Expected: Array with catalog_badge nested objects
    });

    it('includes creator information', async () => {
      // Test creator object
      // Expected: id, display_name, email present
    });
  });

  describe('Validation Errors', () => {
    it('returns 400 for invalid UUID format', async () => {
      // Test with 'invalid-uuid'
      // Expected: 400 with validation error
    });
  });

  describe('Not Found Cases', () => {
    it('returns 404 for non-existent promotion', async () => {
      // Test with valid UUID that doesn't exist
      // Expected: 404 Not Found
    });
  });

  describe('Authorization (when enabled)', () => {
    it('allows user to access their own promotion', async () => {
      // Test non-admin accessing own promotion
      // Expected: 200 OK
    });

    it('returns 404 when user tries to access another user\'s promotion', async () => {
      // Test non-admin accessing other's promotion
      // Expected: 404 Not Found (not 403)
    });

    it('allows admin to access any promotion', async () => {
      // Test admin accessing any promotion
      // Expected: 200 OK
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
- Validation Errors: 1 test
- Not Found Cases: 1 test
- Authorization: 3 tests
- Error Handling: 2 tests
- **Total: ~11 tests**

### Step 5: Service Tests

**File**: `src/lib/__tests__/promotion.service.spec.ts` (update existing file)

```typescript
import { describe, it, expect } from 'vitest';
import { PromotionService } from '../promotion.service';

describe('PromotionService.getPromotionById', () => {
  it('returns promotion with all nested details when found', async () => {
    // Test implementation
  });

  it('returns null when promotion not found', async () => {
    // Test implementation
  });

  it('returns null when non-admin user tries to access another user\'s promotion', async () => {
    // Test authorization filtering
  });

  it('allows admin to access any promotion', async () => {
    // Test admin access
  });

  it('includes template with typed rules array', async () => {
    // Test transformation
  });

  it('includes badge applications array', async () => {
    // Test nested objects
  });

  it('includes creator information', async () => {
    // Test user summary
  });

  it('throws error on database failure', async () => {
    // Test error handling
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

### Step 7: Performance Testing

**Actions**:

1. **Measure Response Time**:
```bash
curl -w "\nTime: %{time_total}s\n" -s \
  'http://localhost:3000/api/promotions/850e8400-e29b-41d4-a716-446655440001' \
  > /dev/null
```
**Expected**: < 100ms

2. **Monitor Query Performance**:
- Check Supabase logs for query execution time
- Expected: Single query with joins ~10-50ms

3. **Test with Different Badge Counts**:
```bash
# Test promotion with many badge applications
curl -w "\nTime: %{time_total}s\n" -s \
  'http://localhost:3000/api/promotions/[promotion-with-many-badges]' \
  > /dev/null
```
**Expected**: Still < 200ms even with many badges

## 10. Future Enhancements

### 1. Response Caching

**Why**: Reduce database load for frequently accessed promotions
**Implementation**: Redis cache with promotion ID as key, short TTL (1-2 minutes)
**Invalidation**: On promotion update/delete
**Priority**: Medium (promotions accessed frequently during review process)

### 2. Field Selection

**Why**: Allow clients to specify which nested objects to include
**Implementation**: Add `include` query parameter
**Options**: `include=template`, `include=badges`, `include=creator`
**Priority**: Low (response size is reasonable)

### 3. Promotion Activity Log

**Why**: Track views and access history
**Implementation**: Log when promotion is accessed (audit trail)
**Storage**: Separate audit_logs table
**Priority**: Low (not required for MVP)

### 4. Computed Fields

**Why**: Include validation status in response
**Implementation**: Add `is_valid` boolean field computed from template rules
**Benefit**: Client doesn't need separate validation call
**Priority**: Medium (improves UX)

### 5. Badge Application Details

**Why**: Include more badge application fields
**Implementation**: Extend BadgeApplicationWithBadge type
**Fields**: applicant_id, date_of_application, reason
**Priority**: Low (current fields sufficient)

---

## Notes & Assumptions

- The plan assumes Supabase nested select syntax works as documented
- Badge applications are fetched via promotion_badges junction table
- Template rules are stored as JSONB and type-asserted to PromotionTemplateRule[]
- Authorization returns 404 (not 403) to avoid information disclosure
- Authentication is disabled for development and will be implemented later
- Single-query approach with joins is preferred for performance
