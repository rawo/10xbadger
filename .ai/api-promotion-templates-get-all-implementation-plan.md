# API Endpoint Implementation Plan: GET /api/promotion-templates

## 1. Endpoint Overview

This endpoint retrieves a paginated, filterable list of promotion templates from the system. Promotion templates define the badge requirements for career level transitions across different career paths (technical, financial, management). The endpoint supports filtering by path, level transitions, and active status, with flexible sorting options.

**Key Features**:
- Filtering by career path, source level, target level, and active status
- Sorting by name or creation date
- Pagination with configurable limit and offset
- Typed rules array in response (JSONB to TypeScript type conversion)
- Default filter for active templates only

**Business Context**:
Promotion templates are critical for:
- Users planning their career progression and badge collection
- Understanding badge requirements for next level promotion
- Admins managing promotion requirements
- Building promotion applications with correct badge combinations

**No Role-Based Restrictions**: All authenticated users can view promotion templates (both admin and standard users)

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/promotion-templates`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: None - all authenticated users have equal access

### Query Parameters

#### Required Parameters
None - all parameters are optional

#### Optional Parameters

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `path` | string | - | Enum: `technical`, `financial`, `management` | Filter by career path |
| `from_level` | string | - | Any string (e.g., "S1", "J2", "M1") | Filter by source position level |
| `to_level` | string | - | Any string (e.g., "S2", "J3", "M2") | Filter by target position level |
| `is_active` | boolean | `true` | Boolean | Filter by active status |
| `sort` | string | `name` | Enum: `created_at`, `name` | Field to sort by |
| `order` | string | `asc` | Enum: `asc`, `desc` | Sort order |
| `limit` | number | 20 | Integer, min: 1, max: 100 | Page size |
| `offset` | number | 0 | Integer, min: 0 | Page offset |

### Request Examples

**Basic Request - Active Templates by Name**:
```
GET /api/promotion-templates
```
Returns all active templates sorted by name ascending (default behavior)

**Filter by Career Path**:
```
GET /api/promotion-templates?path=technical
```
Returns active technical path templates

**Filter by Level Transition**:
```
GET /api/promotion-templates?from_level=S1&to_level=S2
```
Returns templates for S1 → S2 promotion

**Include Inactive Templates**:
```
GET /api/promotion-templates?is_active=false
```
Returns only inactive templates

**Sort by Creation Date**:
```
GET /api/promotion-templates?sort=created_at&order=desc
```
Returns templates sorted by newest first

**Pagination**:
```
GET /api/promotion-templates?limit=10&offset=20
```
Returns 10 templates starting from offset 20

**Combined Filters**:
```
GET /api/promotion-templates?path=technical&from_level=S1&is_active=true&sort=name&order=asc&limit=50
```
Returns active S1 technical templates sorted by name

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `PromotionTemplateListItemDto` - Individual template in response (same as PromotionTemplateDto)
  ```typescript
  type PromotionTemplateListItemDto = PromotionTemplateDto;
  ```
- `PromotionTemplateDto` - Template with typed rules field
  ```typescript
  interface PromotionTemplateDto extends Omit<PromotionTemplateRow, 'rules'> {
    rules: PromotionTemplateRule[];
  }
  ```
- `PromotionTemplateRule` - Rule structure
  ```typescript
  interface PromotionTemplateRule {
    category: BadgeCategoryType | "any";
    level: BadgeLevelType;
    count: number;
  }
  ```
- `PaginatedResponse<PromotionTemplateListItemDto>` - Full response structure
  ```typescript
  interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMetadata;
  }
  ```
- `PaginationMetadata` - Pagination metadata
  ```typescript
  interface PaginationMetadata {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }
  ```

**Validation Types**:
- `PromotionPath` - Career path enum values
- `PromotionPathType` - Type for career path

**Database Types**:
- `PromotionTemplateRow` - Database row type from Supabase (with JSONB rules)

**Error Types**:
- `ApiError` - Standard error response structure
- `ValidationErrorDetail` - Field-level validation errors

### New Types to Create

**Query Parameter Schema** (in validation file):
```typescript
interface ListPromotionTemplatesQuery {
  path?: PromotionPathType;
  from_level?: string;
  to_level?: string;
  is_active?: boolean;
  sort?: 'created_at' | 'name';
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
      "is_active": true,
      "created_by": "550e8400-e29b-41d4-a716-446655440002",
      "created_at": "2025-01-05T10:00:00Z",
      "updated_at": "2025-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Response Field Descriptions**:
- `id`: UUID of the promotion template
- `name`: Human-readable template name (e.g., "S1 to S2 - Technical Path")
- `path`: Career path (technical, financial, management)
- `from_level`: Source position level code
- `to_level`: Target position level code
- `rules`: Array of badge requirements (typed from JSONB)
- `is_active`: Whether template is currently active
- `created_by`: UUID of user who created the template
- `created_at`: Timestamp when template was created
- `updated_at`: Timestamp when template was last updated

### Error Responses

#### 400 Bad Request - Invalid Parameter
```json
{
  "error": "invalid_parameter",
  "message": "Invalid path value. Must be one of: technical, financial, management"
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
      "field": "sort",
      "message": "Invalid sort field. Must be one of: created_at, name"
    }
  ]
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching promotion templates"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/promotion-templates?path=technical&sort=name
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/promotion-templates.ts               │
│                                                      │
│  1. Extract query parameters from URL               │
│  2. Validate query parameters (Zod schema)          │
│  3. Apply defaults (is_active=true if not set)      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         PromotionTemplateService                    │
│  src/lib/promotion-template.service.ts              │
│                                                      │
│  listPromotionTemplates(query)                      │
│  1. Build base query from promotion_templates       │
│  2. Apply path filter (if provided)                 │
│  3. Apply from_level filter (if provided)           │
│  4. Apply to_level filter (if provided)             │
│  5. Apply is_active filter (default true)           │
│  6. Apply sorting (name or created_at)              │
│  7. Execute count query (total)                     │
│  8. Apply pagination (limit/offset)                 │
│  9. Execute data query                              │
│  10. Transform JSONB rules to typed array           │
│  11. Build response with pagination metadata        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query: promotion_templates table                   │
│  - Uses indexes on (path, from_level, to_level)     │
│  - Filters on is_active (boolean)                   │
│  - Applies WHERE clauses for filters                │
│  - Uses ORDER BY for sorting                        │
│  - Uses LIMIT/OFFSET for pagination                 │
│  - Returns JSONB rules field                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  promotion_templates table with indexes             │
│  - BTREE on (path, from_level, to_level)            │
│  - GIN on rules JSONB (optional)                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Results
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Receive results from service                    │
│  2. Rules already typed as PromotionTemplateRule[]  │
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
- **Implementation**: Ignored for development per instructions
- **Production**: Will check `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized if no valid session

### Authorization
- **Access Level**: All authenticated users (no role restrictions)
- **Business Rationale**: Templates are public information needed for career planning
- **No Filtering Required**: All users see same templates regardless of role

### Input Validation
- **SQL Injection Prevention**:
  - Use Supabase query builder exclusively (parameterized queries)
  - Never concatenate user input into SQL strings
  - Supabase client handles query escaping automatically
- **Parameter Validation**:
  - Validate enum values against allowed constants using Zod
  - Validate boolean coercion for is_active parameter
  - Enforce numeric constraints on limit/offset with coercion
  - Allow free text for from_level/to_level (flexible position codes)
- **DoS Prevention**:
  - Maximum limit of 100 items per page (prevents memory exhaustion)
  - Validate offset is non-negative (prevents query errors)
  - Consider rate limiting at infrastructure/middleware level
  - Set reasonable query timeout values

### Data Exposure
- **Prevent Information Leakage**:
  - Don't expose internal error details to client (stack traces, query details)
  - Log detailed errors server-side only with appropriate context
  - Return generic error messages for 500 errors
- **Public Data**:
  - All template fields are non-sensitive and safe to expose
  - created_by UUID is fine to expose (no personal data)
  - Rules array contains only badge requirement logic (public)

### JSONB Security
- **JSONB Injection**:
  - Read-only endpoint, no JSONB injection risk
  - Rules field is returned as-is from database
  - Type conversion happens in application layer

### OWASP Top 10 Considerations
1. **Broken Access Control**: N/A - no access restrictions on this endpoint
2. **Injection**: Mitigated by using ORM/query builder
3. **Sensitive Data Exposure**: N/A - no sensitive data in templates
4. **Security Misconfiguration**: Follow Astro/Supabase security best practices
5. **Identification and Authentication Failures**: Handled by Supabase auth (when enabled)

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid path value | 400 | `validation_error` | Validate with Zod, return field-level error |
| Invalid sort field | 400 | `validation_error` | Validate with Zod, return error |
| Invalid order value | 400 | `validation_error` | Validate with Zod, return error |
| Invalid is_active value | 400 | `validation_error` | Validate with Zod boolean coercion |
| Limit < 1 or > 100 | 400 | `validation_error` | Validate with Zod, return error |
| Negative offset | 400 | `validation_error` | Validate with Zod, return error |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Supabase query error | 500 | `internal_error` | Log error, return generic message |
| JSONB parsing error | 500 | `internal_error` | Log error, return generic message |
| Unexpected exception | 500 | `internal_error` | Catch all, log, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Use Zod schema to validate all query parameters at once
   - Collect all validation errors (don't fail fast)
   - Return structured error response with field-level details
   - Include helpful messages for developers/users

2. **JSONB Type Errors**:
   - Catch errors when transforming JSONB rules to TypeScript types
   - Log malformed rules data for investigation
   - Return 500 error (data integrity issue)
   - Consider adding rules schema validation

3. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include request context in logs (query params)

4. **Unexpected Errors (500)**:
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
1. **JSONB Rules Field**: Parsing and type conversion for each template
2. **Count Query**: Counting total results can be expensive on large tables
3. **Unindexed Filters**: Filtering on unindexed columns causes table scans
4. **Deep Pagination**: High offset values require scanning many rows
5. **No Filtering**: Fetching all templates when no filters applied

### Optimization Strategies

1. **Database Indexes** (from `@db-plan.md`):
   - B-Tree index on `promotion_templates(path, from_level, to_level)` - for level transition filtering
   - GIN index on `rules` JSONB (optional) - for rule-based queries (future)
   - B-Tree index on `is_active` - for active/inactive filtering

2. **Query Optimization**:
   - Use `select('*')` to fetch all columns (needed for complete response)
   - Use `range()` for efficient pagination (better than LIMIT/OFFSET)
   - Execute count query separately (Supabase provides this efficiently)
   - Apply most selective filters first (path, from_level, to_level)

3. **JSONB Handling**:
   - PostgreSQL returns JSONB as JavaScript object automatically
   - No additional parsing needed (Supabase handles it)
   - Type assertion to PromotionTemplateRule[] is fast (no validation)
   - Consider adding JSON schema validation if data integrity is concern

4. **Pagination**:
   - Default to 20 items per page (reasonable for most UIs)
   - Enforce maximum of 100 items per page (prevents memory issues)
   - Use offset-based pagination for simplicity
   - Consider cursor-based pagination for future (better for deep pagination)

5. **Caching Considerations** (Future Enhancement):
   - Cache template list with medium TTL (5-10 minutes)
   - Invalidate cache when templates are created/updated/deactivated
   - Use query parameter hash as cache key
   - Templates change infrequently, good candidate for caching

6. **Default Filtering**:
   - Default `is_active=true` reduces result set significantly
   - Most users only need active templates
   - Inactive templates are historical/archived

### Expected Performance

Based on database indexes and query optimization:

- **Small Datasets** (< 50 templates): < 50ms response time
- **Medium Datasets** (50-200 templates): < 100ms response time
- **Large Datasets** (> 200 templates): < 200ms response time
- **JSONB Overhead**: Minimal (~5-10ms for type conversion)
- **Count Query**: Add 10-20ms overhead for total count

**Expected Template Count**: Low (typically 10-50 templates total)
- Few career paths (3: technical, financial, management)
- Limited level transitions per path (5-10)
- Templates don't change frequently

### Performance Monitoring
- Log slow queries (> 200ms) with query parameters
- Track response times by filter combinations
- Monitor JSONB parsing errors (indicates data issues)
- Set up alerts for degraded performance

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File**: `src/lib/validation/promotion-template.validation.ts` (new file)

**Purpose**: Centralize validation logic for promotion template endpoints

```typescript
import { z } from 'zod';
import { PromotionPath } from '@/types';

/**
 * Validation schema for GET /api/promotion-templates query parameters
 */
export const listPromotionTemplatesQuerySchema = z.object({
  path: z.enum([
    PromotionPath.Technical,
    PromotionPath.Financial,
    PromotionPath.Management,
  ]).optional(),
  from_level: z.string().optional(),
  to_level: z.string().optional(),
  is_active: z.coerce.boolean().default(true),
  sort: z.enum(['created_at', 'name']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListPromotionTemplatesQuery = z.infer<typeof listPromotionTemplatesQuerySchema>;
```

**Key Points**:
- Use `z.coerce.boolean()` to handle string boolean values from query params
- Use `z.coerce.number()` to handle string number values
- Use `.default()` for optional parameters with defaults
- `from_level` and `to_level` are free text strings (no enum validation)
- Export type for use in service and route handler

### Step 2: Create Service Method

**File**: `src/lib/promotion-template.service.ts` (new file)

**Purpose**: Encapsulate business logic for promotion template operations

```typescript
import type { SupabaseClient } from '@/db/supabase.client';
import type {
  PromotionTemplateListItemDto,
  PaginatedResponse,
  PaginationMetadata,
  PromotionTemplateRule,
} from '@/types';
import type { ListPromotionTemplatesQuery } from './validation/promotion-template.validation';

/**
 * Service for promotion template business logic
 */
export class PromotionTemplateService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists promotion templates with filtering, sorting, and pagination
   *
   * @param query - Validated query parameters
   * @returns Paginated list of promotion templates with typed rules
   */
  async listPromotionTemplates(
    query: ListPromotionTemplatesQuery
  ): Promise<PaginatedResponse<PromotionTemplateListItemDto>> {
    // Build base query
    let dataQuery = this.supabase.from('promotion_templates').select('*');
    let countQuery = this.supabase.from('promotion_templates').select('*', { count: 'exact', head: true });

    // Apply path filter
    if (query.path) {
      dataQuery = dataQuery.eq('path', query.path);
      countQuery = countQuery.eq('path', query.path);
    }

    // Apply from_level filter
    if (query.from_level) {
      dataQuery = dataQuery.eq('from_level', query.from_level);
      countQuery = countQuery.eq('from_level', query.from_level);
    }

    // Apply to_level filter
    if (query.to_level) {
      dataQuery = dataQuery.eq('to_level', query.to_level);
      countQuery = countQuery.eq('to_level', query.to_level);
    }

    // Apply is_active filter (default is true from validation)
    dataQuery = dataQuery.eq('is_active', query.is_active);
    countQuery = countQuery.eq('is_active', query.is_active);

    // Apply sorting
    dataQuery = dataQuery.order(query.sort, { ascending: query.order === 'asc' });

    // Execute count query
    const { count, error: countError } = await countQuery;
    if (countError) {
      throw new Error(`Failed to count promotion templates: ${countError.message}`);
    }

    // Apply pagination
    const from = query.offset;
    const to = query.offset + query.limit - 1;
    dataQuery = dataQuery.range(from, to);

    // Execute data query
    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      throw new Error(`Failed to fetch promotion templates: ${dataError.message}`);
    }

    // Transform data to DTO format (rules JSONB to typed array)
    const templates: PromotionTemplateListItemDto[] = (data || []).map((template: any) => ({
      id: template.id,
      name: template.name,
      path: template.path,
      from_level: template.from_level,
      to_level: template.to_level,
      rules: template.rules as PromotionTemplateRule[], // Type assertion for JSONB
      is_active: template.is_active,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
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
      data: templates,
      pagination,
    };
  }
}
```

**Key Points**:
- Separate data and count queries for efficiency
- Apply filters conditionally based on query parameters
- Default is_active filter is handled by validation schema
- JSONB rules field is type-asserted to PromotionTemplateRule[]
- Transform database results to DTO format explicitly
- Calculate pagination metadata accurately

### Step 3: Create API Route Handler

**File**: `src/pages/api/promotion-templates.ts` (new file)

**Purpose**: Handle HTTP request/response for promotion templates endpoint

```typescript
import type { APIRoute } from 'astro';
import { PromotionTemplateService } from '@/lib/promotion-template.service';
import { listPromotionTemplatesQuerySchema } from '@/lib/validation/promotion-template.validation';
import type { ApiError } from '@/types';

/**
 * GET /api/promotion-templates
 *
 * Lists promotion templates with filtering and pagination.
 * All authenticated users can view templates.
 *
 * Note: Authentication is disabled for development.
 */
export const GET: APIRoute = async (context) => {
  try {
    // Authentication check would go here (disabled for development)
    // In production:
    // const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
    // if (authError || !user) { return 401 }

    // 1. Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = listPromotionTemplatesQuerySchema.safeParse(queryParams);

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

    // 2. Call service to get promotion templates
    const service = new PromotionTemplateService(context.locals.supabase);
    const result = await service.listPromotionTemplates(query);

    // 3. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in GET /api/promotion-templates:', error);

    // Return generic error to client
    const apiError: ApiError = {
      error: 'internal_error',
      message: 'An unexpected error occurred while fetching promotion templates',
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

**Key Points**:
- Authentication check commented out for development
- Validate query parameters with Zod first
- No authorization checks (all users have equal access)
- Delegate business logic to service layer
- Return consistent error responses
- Log errors with context for debugging

### Step 4: Ensure Zod Dependency

**Action**: Verify `zod` is installed in the project

```bash
pnpm add zod
```

**Verification**: Check if zod is already in `package.json` dependencies

**Why**: Zod provides runtime type validation and type inference for TypeScript

### Step 5: Create Directory Structure

**Action**: Ensure the following directories exist

```bash
mkdir -p src/lib/validation
mkdir -p src/pages/api
```

**Directory Purposes**:
- `src/lib/` - Service layer (business logic)
- `src/lib/validation/` - Validation schemas (Zod)
- `src/pages/api/` - API route handlers (Astro)

### Step 6: Test the Endpoint

#### Manual Testing Scenarios

**1. Basic Request** (default filters):
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates'
```
**Expected**: 200 OK with active templates sorted by name ascending

**2. Filter by Career Path**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?path=technical'
```
**Expected**: 200 OK with only technical path templates

**3. Filter by Level Transition**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?from_level=S1&to_level=S2'
```
**Expected**: 200 OK with S1 → S2 templates

**4. Include Inactive Templates**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=false'
```
**Expected**: 200 OK with only inactive templates

**5. All Templates (Active and Inactive)**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=true'
```
Then query with `is_active=false` separately (no way to get both in one request per spec)

**6. Sort by Creation Date**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?sort=created_at&order=desc'
```
**Expected**: 200 OK with templates sorted by newest first

**7. Pagination**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?limit=5&offset=0'
curl -X GET 'http://localhost:3000/api/promotion-templates?limit=5&offset=5'
```
**Expected**: 200 OK with 5 templates per page

**8. Combined Filters**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?path=technical&from_level=S1&is_active=true&sort=name&order=asc'
```
**Expected**: 200 OK with filtered, sorted results

**9. Invalid Path**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?path=invalid'
```
**Expected**: 400 Bad Request with validation error

**10. Invalid Sort Field**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?sort=invalid'
```
**Expected**: 400 Bad Request with validation error

**11. Invalid Limit**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?limit=0'
curl -X GET 'http://localhost:3000/api/promotion-templates?limit=101'
```
**Expected**: 400 Bad Request with validation error

**12. Negative Offset**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?offset=-1'
```
**Expected**: 400 Bad Request with validation error

**13. Boolean String Coercion**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=true'
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=false'
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=1'
curl -X GET 'http://localhost:3000/api/promotion-templates?is_active=0'
```
**Expected**: All should work (Zod coerces strings to boolean)

**14. Empty Result Set**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates?from_level=NONEXISTENT'
```
**Expected**: 200 OK with empty data array and total=0

### Step 7: Add Integration Tests

**File**: `src/pages/api/promotion-templates.test.ts` (when test framework is configured)

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { APIContext } from 'astro';

describe('GET /api/promotion-templates', () => {
  // Test data setup
  beforeAll(async () => {
    // Setup test database with sample templates
  });

  beforeEach(async () => {
    // Reset test data before each test
  });

  describe('Default Behavior', () => {
    it('should return active templates by default', async () => {
      // Test without is_active parameter
      // Expected: Only active templates
    });

    it('should sort by name ascending by default', async () => {
      // Test without sort/order parameters
      // Expected: Results sorted by name asc
    });

    it('should use default pagination (limit=20, offset=0)', async () => {
      // Test without pagination parameters
      // Expected: 20 results, offset 0
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate path enum values', async () => {
      // Test with invalid path
      // Expected: 400 with validation error
    });

    it('should validate sort field enum', async () => {
      // Test with invalid sort field
      // Expected: 400 with validation error
    });

    it('should validate order enum', async () => {
      // Test with invalid order value
      // Expected: 400 with validation error
    });

    it('should validate limit range (1-100)', async () => {
      // Test with limit = 0
      // Test with limit = 101
      // Expected: 400 with validation error
    });

    it('should validate offset is non-negative', async () => {
      // Test with offset = -1
      // Expected: 400 with validation error
    });

    it('should coerce boolean strings for is_active', async () => {
      // Test with is_active="true", "false", "1", "0"
      // Expected: All work correctly
    });

    it('should accept free text for from_level and to_level', async () => {
      // Test with various level codes
      // Expected: No validation errors
    });
  });

  describe('Filtering', () => {
    it('should filter by path', async () => {
      // Test with path=technical
      // Expected: Only technical templates
    });

    it('should filter by from_level', async () => {
      // Test with from_level=S1
      // Expected: Only S1 templates
    });

    it('should filter by to_level', async () => {
      // Test with to_level=S2
      // Expected: Only S2 templates
    });

    it('should filter by is_active', async () => {
      // Test with is_active=false
      // Expected: Only inactive templates
    });

    it('should combine multiple filters', async () => {
      // Test with path + from_level + to_level + is_active
      // Expected: Templates matching all filters
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending by default', async () => {
      // Test without sort/order
      // Expected: Alphabetical order
    });

    it('should sort by name descending', async () => {
      // Test with sort=name&order=desc
      // Expected: Reverse alphabetical order
    });

    it('should sort by created_at ascending', async () => {
      // Test with sort=created_at&order=asc
      // Expected: Oldest first
    });

    it('should sort by created_at descending', async () => {
      // Test with sort=created_at&order=desc
      // Expected: Newest first
    });
  });

  describe('Pagination', () => {
    it('should apply default pagination', async () => {
      // Test without pagination parameters
      // Expected: limit=20, offset=0
    });

    it('should apply custom limit and offset', async () => {
      // Test with limit=10&offset=5
      // Expected: 10 results starting from offset 5
    });

    it('should calculate has_more correctly', async () => {
      // Test with various pagination scenarios
      // Expected: has_more = true when more results available
    });

    it('should return accurate total count', async () => {
      // Test with filters
      // Expected: Total count matches filtered results
    });

    it('should handle pagination beyond result set', async () => {
      // Test with offset > total
      // Expected: Empty data array, correct metadata
    });
  });

  describe('JSONB Rules Field', () => {
    it('should return rules as typed array', async () => {
      // Test response structure
      // Expected: rules is array of PromotionTemplateRule objects
    });

    it('should handle complex rule structures', async () => {
      // Test with various rule combinations
      // Expected: All rules correctly typed
    });

    it('should handle empty rules array', async () => {
      // Test template with empty rules
      // Expected: Empty array, not null
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

    it('should handle malformed JSONB data', async () => {
      // Insert template with invalid rules JSON
      // Expected: 500 or type assertion succeeds
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result set', async () => {
      // Query with filters that match nothing
      // Expected: Empty data array, total=0
    });

    it('should handle special characters in level codes', async () => {
      // Test with from_level="L-1", "L.2", etc.
      // Expected: Works correctly
    });

    it('should handle very long level codes', async () => {
      // Test with 100+ character level code
      // Expected: Works (no length validation)
    });
  });
});
```

**Test Coverage Goals**:
- Default Behavior: 3 tests
- Query Parameter Validation: 7 tests
- Filtering: 5 tests
- Sorting: 4 tests
- Pagination: 5 tests
- JSONB Rules Field: 3 tests
- Error Handling: 4 tests
- Edge Cases: 3 tests
- **Total: ~34 tests**

### Step 8: Documentation

**Action**: Update API documentation

**File**: Update relevant documentation files (API docs, README, etc.)

**Content to Include**:
- Endpoint URL and HTTP method
- Authentication requirements (when enabled)
- Authorization behavior (all users have equal access)
- Query parameter descriptions with types, defaults, and constraints
- Request and response examples
- Error scenarios with status codes and messages
- JSONB rules field structure and types
- Default filtering behavior (is_active=true)
- Rate limiting information (if applicable)
- Changelog entry for new endpoint

**Example Documentation**:
```markdown
## GET /api/promotion-templates

Lists promotion templates with filtering, sorting, and pagination.

### Authentication
Required (all authenticated users can access)

### Query Parameters
- `path` (optional): Filter by career path (technical, financial, management)
- `from_level` (optional): Filter by source level code
- `to_level` (optional): Filter by target level code
- `is_active` (optional, default: true): Filter by active status
- `sort` (optional, default: name): Sort field (created_at, name)
- `order` (optional, default: asc): Sort order (asc, desc)
- `limit` (optional, default: 20, max: 100): Page size
- `offset` (optional, default: 0): Page offset

### Response
Returns paginated list of promotion templates with typed rules array.

### Example
```bash
GET /api/promotion-templates?path=technical&from_level=S1&limit=10
```
```

### Step 9: Monitoring and Logging

**Action**: Add structured logging and monitoring

**Logging Points**:

1. **Slow Query Logging**:
```typescript
const startTime = Date.now();
const result = await service.listPromotionTemplates(query);
const duration = Date.now() - startTime;

if (duration > 200) {
  console.warn('Slow query detected', {
    endpoint: '/api/promotion-templates',
    duration,
    query,
  });
}
```

2. **Validation Errors** (aggregate metrics):
```typescript
if (!validation.success) {
  console.info('Validation error', {
    endpoint: '/api/promotion-templates',
    errors: validation.error.errors.map(e => e.path.join('.')),
  });
  // Return 400 error
}
```

3. **Database Errors**:
```typescript
catch (error) {
  console.error('Database error in promotion template service', {
    query,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

4. **JSONB Type Assertion Monitoring**:
```typescript
// Consider adding validation
const templates: PromotionTemplateListItemDto[] = (data || []).map((template: any) => {
  try {
    // Optionally validate rules structure
    if (!Array.isArray(template.rules)) {
      console.warn('Invalid rules structure', {
        template_id: template.id,
        rules: template.rules,
      });
    }
    return { ...template, rules: template.rules as PromotionTemplateRule[] };
  } catch (error) {
    console.error('Error processing template', {
      template_id: template.id,
      error,
    });
    throw error;
  }
});
```

**Monitoring Considerations**:
- Use structured logging (JSON format) for easier parsing
- Consider using a logging service (e.g., Pino, Winston)
- Set up error tracking (e.g., Sentry)
- Monitor API response times and error rates
- Set up alerts for high error rates or slow queries
- Track usage patterns (most common filters, popular paths)
- Monitor JSONB parsing issues (indicates data integrity problems)

## 10. Future Enhancements

### 1. Cursor-Based Pagination
**Why**: Better performance for deep pagination on large datasets
**Implementation**: Use `created_at` + `id` as cursor instead of offset
**Benefit**: Constant-time pagination regardless of offset
**Priority**: Low (templates dataset is small)

### 2. Response Caching
**Why**: Reduce database load for frequently accessed lists
**Implementation**: Redis cache with query parameter hash as key
**Invalidation**: On template create/update/deactivate, TTL 5-10 minutes
**Priority**: Medium (templates change infrequently)

### 3. Rules Schema Validation
**Why**: Ensure data integrity of JSONB rules field
**Implementation**: JSON schema or Zod validation in service layer
**Benefit**: Catch malformed rules before returning to client
**Priority**: High (prevents runtime type errors)

### 4. Include Creator Details
**Why**: Show who created each template for auditing
**Implementation**: Add optional `include=creator` query parameter
**Response**: Add nested creator object with display_name, email
**Priority**: Low (created_by UUID is sufficient)

### 5. Filter by Rule Requirements
**Why**: Find templates requiring specific badge combinations
**Implementation**: Query JSONB rules field with PostgreSQL operators
**Example**: `rules @> '[{"category": "technical", "level": "gold"}]'`
**Priority**: Low (complex queries, limited use case)

### 6. Template Versioning
**Why**: Track changes to template requirements over time
**Implementation**: Add version field, maintain history table
**Benefit**: Promotions reference specific template version
**Priority**: Medium (similar to catalog badge versioning)

### 7. Bulk Operations
**Why**: Fetch multiple templates by IDs in one request
**Implementation**: `POST /api/promotion-templates/batch` with array of IDs
**Use Case**: Pre-loading templates for promotion builder UI
**Priority**: Low (templates dataset is small, not needed)

### 8. GraphQL Support
**Why**: Flexible queries with nested data selection
**Implementation**: Add GraphQL endpoint parallel to REST
**Benefit**: Clients specify exact data needs, reduce over-fetching
**Priority**: Low (REST API sufficient for MVP)

### 9. Template Recommendations
**Why**: Suggest appropriate template for user's current level
**Implementation**: `GET /api/promotion-templates/recommended`
**Logic**: Based on user's current level, suggest next level templates
**Priority**: Medium (improves UX for promotion planning)

### 10. Export to CSV/JSON
**Why**: Enable template analysis and bulk editing
**Implementation**: `GET /api/promotion-templates/export?format=csv`
**Use Case**: HR review, template management
**Priority**: Low (small dataset, manual export sufficient)

### 11. Search by Name
**Why**: Find templates by keywords
**Implementation**: Add `q` query parameter with full-text search
**Index**: GIN index on `to_tsvector('english', name)`
**Priority**: Low (limited templates, filtering sufficient)

### 12. Active Templates Only Endpoint
**Why**: Simplified endpoint for common case
**Implementation**: `GET /api/promotion-templates/active` (no filters)
**Benefit**: Faster response, no query parameters needed
**Priority**: Low (default behavior handles this)

### 13. Template Usage Statistics
**Why**: Track which templates are most commonly used
**Implementation**: Join with promotions table, count usage
**Response**: Add `usage_count` field to template
**Priority**: Low (analytics, not core functionality)

### 14. Duplicate Template Detection
**Why**: Prevent creating duplicate templates
**Implementation**: Check for existing template with same path/levels
**Location**: POST endpoint validation (not GET)
**Priority**: Medium (prevents admin errors)

### 15. Template Validation Endpoint
**Why**: Validate template rules against position level configuration
**Implementation**: `POST /api/promotion-templates/validate`
**Logic**: Check rules match position level badge requirements
**Priority**: Medium (ensures template integrity)
