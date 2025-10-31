# API Endpoint Implementation Plan: GET /api/promotion-templates/:id

## 1. Endpoint Overview

This endpoint retrieves a single promotion template by its UUID. Promotion templates define the badge requirements for career level transitions across different career paths (technical, financial, management). This endpoint is used when users need detailed information about a specific template, such as when planning a promotion or viewing template details in an admin interface.

**Key Features**:
- Fetch single template by UUID
- Return typed rules array (JSONB to TypeScript conversion)
- Return 404 if template not found
- UUID validation in path parameter
- No role-based restrictions (all authenticated users can view)

**Business Context**:
This endpoint is used for:
- Viewing detailed template requirements
- Template management UI (admin)
- Promotion planning workflows
- Template selection interfaces

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/promotion-templates/:id`
- **Authentication**: Required (ignored for development per instructions)
- **Authorization**: None - all authenticated users have equal access

### Path Parameters

#### Required Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `id` | string (UUID) | Valid UUID format | Promotion template ID |

### Request Examples

**Fetch Specific Template**:
```
GET /api/promotion-templates/750e8400-e29b-41d4-a716-446655440020
```

**Invalid UUID**:
```
GET /api/promotion-templates/invalid-uuid
Expected: 400 Bad Request
```

**Non-Existent Template**:
```
GET /api/promotion-templates/750e8400-0000-0000-0000-000000000000
Expected: 404 Not Found
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `PromotionTemplateDetailDto` - Response DTO (same as PromotionTemplateDto)
  ```typescript
  type PromotionTemplateDetailDto = PromotionTemplateDto;

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

**Database Types**:
- `PromotionTemplateRow` - Database row type from Supabase (with JSONB rules)

**Error Types**:
- `ApiError` - Standard error response structure
  ```typescript
  interface ApiError {
    error: string;
    message: string;
    details?: ValidationErrorDetail[];
  }
  ```

### Validation Types (Reuse or Create)

**UUID Parameter Validation** (can reuse from catalog-badge validation or create inline):
```typescript
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
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
    },
    {
      "category": "any",
      "level": "silver",
      "count": 4
    }
  ],
  "is_active": true,
  "created_by": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-01-05T10:00:00Z",
  "updated_at": "2025-01-05T10:00:00Z"
}
```

**Response Field Descriptions**:
- `id`: UUID of the promotion template
- `name`: Human-readable template name
- `path`: Career path (technical, financial, management)
- `from_level`: Source position level code
- `to_level`: Target position level code
- `rules`: Array of badge requirements (typed from JSONB)
- `is_active`: Whether template is currently active
- `created_by`: UUID of user who created the template
- `created_at`: Timestamp when template was created
- `updated_at`: Timestamp when template was last updated

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
  "message": "An unexpected error occurred while fetching the promotion template"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/promotion-templates/750e8400-e29b-41d4-a716-446655440020
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/promotion-templates/[id].ts          │
│                                                      │
│  1. Extract id from path parameters                 │
│  2. Validate UUID format (Zod schema)               │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         PromotionTemplateService                    │
│  src/lib/promotion-template.service.ts              │
│                                                      │
│  getPromotionTemplateById(id)                       │
│  1. Query promotion_templates by ID                 │
│  2. Handle not found (return null)                  │
│  3. Transform JSONB rules to typed array            │
│  4. Return template or null                         │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query: promotion_templates table                   │
│  Filter: WHERE id = $1                              │
│  - Uses primary key lookup (fast)                   │
│  - Returns JSONB rules field                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  promotion_templates table                          │
│  - Primary key lookup (O(1) with index)             │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Result (template or null)
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Check if result is null                         │
│  2. If null: Return 404 Not Found                   │
│  3. If found: Return 200 OK with template           │
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
  - Don't expose internal error details to client (stack traces, query details)
  - Log detailed errors server-side only with appropriate context
  - Return generic error messages for 500 errors
- **Public Data**:
  - All template fields are non-sensitive and safe to expose
  - created_by UUID is fine to expose (no personal data)
  - Rules array contains only badge requirement logic (public)

### SQL Injection Prevention
- **Mitigation**:
  - Use Supabase query builder exclusively (parameterized queries)
  - UUID validation prevents injection attempts
  - No string concatenation in queries
  - Supabase client handles query escaping automatically

### UUID Enumeration
- **Threat**: Guessing valid UUIDs to discover templates
- **Mitigation**:
  - UUID v4 has 122 bits of randomness (very hard to guess)
  - No sensitive data in templates anyway (public information)
  - Rate limiting at infrastructure level (future enhancement)

### OWASP Top 10 Considerations
1. **Broken Access Control**: N/A - no access restrictions on this endpoint
2. **Injection**: Mitigated by using ORM/query builder and UUID validation
3. **Sensitive Data Exposure**: N/A - no sensitive data in templates
4. **Security Misconfiguration**: Follow Astro/Supabase security best practices
5. **Identification and Authentication Failures**: Handled by Supabase auth (when enabled)

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid UUID format | 400 | `validation_error` | Validate with Zod, return field-level error |
| Template not found | 404 | `not_found` | Check if service returns null, return 404 |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Supabase query error | 500 | `internal_error` | Log error, return generic message |
| JSONB parsing error | 500 | `internal_error` | Log error, return generic message |
| Unexpected exception | 500 | `internal_error` | Catch all, log, return generic message |

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Use Zod schema to validate path parameter
   - Return structured error response with field-level details
   - Include helpful message for developers

2. **Not Found Errors (404)**:
   - Service returns null when template not found
   - Route handler checks for null and returns 404
   - Clear error message: "Promotion template not found"
   - Don't expose whether ID format was valid

3. **Database Errors (500)**:
   - Catch all database exceptions in service layer
   - Log full error details server-side (console.error with context)
   - Return generic error message to client
   - Don't expose database structure or query details
   - Include template ID in logs for debugging

4. **JSONB Type Errors (500)**:
   - Catch errors when transforming JSONB rules to TypeScript types
   - Log malformed rules data for investigation
   - Return 500 error (data integrity issue)
   - Consider adding rules schema validation (future enhancement)

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
1. **Primary Key Lookup**: Very fast (O(1) with index), not a concern
2. **JSONB Rules Field**: Parsing and type conversion minimal overhead
3. **Single Record**: No pagination or aggregation needed
4. **Network Latency**: Main bottleneck for single-record queries

### Optimization Strategies

1. **Database Optimization**:
   - Primary key (id) lookup is automatically indexed (fastest possible query)
   - No additional indexes needed
   - Query execution time: ~1-5ms

2. **JSONB Handling**:
   - PostgreSQL returns JSONB as JavaScript object automatically
   - No additional parsing needed (Supabase handles it)
   - Type assertion to PromotionTemplateRule[] is fast (no validation)
   - Overhead: ~1ms

3. **Caching Considerations** (Future Enhancement):
   - Cache individual templates with medium-long TTL (15-30 minutes)
   - Cache key: `template:${id}`
   - Invalidate cache when template is updated
   - Templates change infrequently, excellent candidate for caching
   - Consider Redis or in-memory cache

4. **Response Size**:
   - Single template response is small (~500 bytes - 2KB)
   - Rules array typically has 2-5 rules
   - No compression needed for single record

### Expected Performance

Based on primary key lookup and minimal processing:

- **Query Time**: 1-5ms (primary key lookup)
- **JSONB Parsing**: ~1ms (minimal overhead)
- **Total Response Time**: < 20ms (excluding network latency)
- **99th Percentile**: < 50ms

**Performance is excellent** - primary key lookups are the fastest database operation possible.

### Performance Monitoring
- Log slow queries (> 50ms) with template ID
- Track response times by template (identify hot templates)
- Monitor JSONB parsing errors (indicates data issues)
- Set up alerts for degraded performance (> 100ms)

## 9. Implementation Steps

### Step 1: Add Service Method

**File**: `src/lib/promotion-template.service.ts` (existing file, add method)

**Purpose**: Add method to fetch single template by ID

```typescript
/**
 * Retrieves a single promotion template by ID
 *
 * @param id - Template UUID
 * @returns Promotion template if found, null otherwise
 * @throws Error if database query fails
 */
async getPromotionTemplateById(id: string): Promise<PromotionTemplateDetailDto | null> {
  const { data, error } = await this.supabase
    .from("promotion_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // Handle "not found" vs actual errors
    if (error.code === "PGRST116") {
      // PostgREST error code for no rows returned
      return null;
    }
    throw new Error(`Failed to fetch promotion template: ${error.message}`);
  }

  // Transform JSONB rules to typed array
  return {
    id: data.id,
    name: data.name,
    path: data.path,
    from_level: data.from_level,
    to_level: data.to_level,
    rules: data.rules as unknown as PromotionTemplateRule[],
    is_active: data.is_active,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
```

**Key Points**:
- Use `.single()` to fetch exactly one record
- Handle PGRST116 error code (not found) by returning null
- Transform JSONB rules field to typed array
- Throw errors for actual database failures

### Step 2: Create API Route Handler

**File**: `src/pages/api/promotion-templates/[id].ts` (new file)

**Purpose**: Handle HTTP request/response for single template endpoint

```typescript
import type { APIRoute } from "astro";
import { PromotionTemplateService } from "@/lib/promotion-template.service";
import type { ApiError } from "@/types";
import { z } from "zod";

// UUID validation schema
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
});

/**
 * GET /api/promotion-templates/:id
 *
 * Retrieves a single promotion template by ID.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Promotion template UUID (required)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - All templates are visible
 *
 * Production Authorization (when enabled):
 * - All authenticated users can view templates
 * - No role-based restrictions
 *
 * @returns 200 OK with promotion template
 * @returns 400 Bad Request if UUID format is invalid
 * @returns 404 Not Found if template doesn't exist
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

    // Note: No admin check needed - all authenticated users can view templates
    */

    // =========================================================================
    // Step 2: Validate Path Parameter
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
    // Step 3: Fetch Template from Service
    // =========================================================================
    const service = new PromotionTemplateService(context.locals.supabase);
    const template = await service.getPromotionTemplateById(id);

    // =========================================================================
    // Step 4: Handle Not Found
    // =========================================================================
    if (!template) {
      const error: ApiError = {
        error: "not_found",
        message: "Promotion template not found",
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 5: Return Successful Response
    // =========================================================================
    return new Response(JSON.stringify(template), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/promotion-templates/:id:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while fetching the promotion template",
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
- Handle not found separately from errors
- Return appropriate status codes
- Authentication placeholder (disabled for development)

### Step 3: Manual Testing

**Test Scenarios**:

**1. Fetch Existing Template**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'
```
**Expected**: 200 OK with complete template including typed rules array

**2. Invalid UUID Format**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates/invalid-uuid'
```
**Expected**: 400 Bad Request with validation error

**3. Non-Existent Template (Valid UUID)**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates/750e8400-0000-0000-0000-000000000000'
```
**Expected**: 404 Not Found

**4. Verify JSONB Rules Typing**:
```bash
curl -s 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440003' | python3 -m json.tool
```
**Expected**: Rules array with proper structure (category, level, count)

**5. Empty UUID**:
```bash
curl -X GET 'http://localhost:3000/api/promotion-templates/'
```
**Expected**: 404 (route not found) or redirect to list endpoint

**6. Test All Sample Templates**:
```bash
# Loop through all sample template IDs
for id in \
  750e8400-e29b-41d4-a716-446655440001 \
  750e8400-e29b-41d4-a716-446655440002 \
  750e8400-e29b-41d4-a716-446655440003; do
  echo "Testing template: $id"
  curl -s "http://localhost:3000/api/promotion-templates/$id" | jq '.name'
done
```
**Expected**: All templates return successfully with their names

### Step 4: Integration Tests

**File**: `src/pages/api/promotion-templates/[id].test.ts` (when test framework is configured)

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { APIContext } from 'astro';

describe('GET /api/promotion-templates/:id', () => {
  // Test data setup
  let testTemplateId: string;

  beforeAll(async () => {
    // Setup test database with sample template
    // Store test template ID
  });

  beforeEach(async () => {
    // Reset test data if needed
  });

  describe('Success Cases', () => {
    it('should return template when valid ID provided', async () => {
      // Test with valid template ID
      // Expected: 200 OK with complete template
    });

    it('should include typed rules array', async () => {
      // Test response structure
      // Expected: rules is array of PromotionTemplateRule objects
    });

    it('should include all required fields', async () => {
      // Test response has all fields
      // Expected: id, name, path, from_level, to_level, rules, is_active, created_by, timestamps
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

    it('should return 404 for deleted template', async () => {
      // Create template, delete it, try to fetch
      // Expected: 404 Not Found
    });
  });

  describe('JSONB Rules Field', () => {
    it('should correctly type rules array', async () => {
      // Test with template having complex rules
      // Expected: Rules properly typed with category, level, count
    });

    it('should handle empty rules array', async () => {
      // Test with template having empty rules
      // Expected: Empty array, not null
    });

    it('should handle "any" category in rules', async () => {
      // Test with template having "any" category
      // Expected: "any" properly typed
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

  describe('Edge Cases', () => {
    it('should handle uppercase UUID', async () => {
      // Test with uppercase UUID (if allowed by validation)
      // Expected: Works or validation error
    });

    it('should handle UUID with hyphens in different positions', async () => {
      // Test UUID format variations
      // Expected: Only valid UUID format accepted
    });
  });
});
```

**Test Coverage Goals**:
- Success Cases: 3 tests
- Validation Errors: 3 tests
- Not Found Cases: 2 tests
- JSONB Rules Field: 3 tests
- Error Handling: 3 tests
- Edge Cases: 2 tests
- **Total: ~16 tests**

### Step 5: Documentation

**Action**: Update API documentation

**Content to Include**:
- Endpoint URL and HTTP method
- Path parameter description (UUID format)
- Authentication requirements (when enabled)
- Authorization behavior (all users have equal access)
- Request and response examples
- Error scenarios with status codes and messages
- JSONB rules field structure and types
- Rate limiting information (if applicable)
- Changelog entry for new endpoint

**Example Documentation**:
```markdown
## GET /api/promotion-templates/:id

Retrieves a single promotion template by ID.

### Authentication
Required (all authenticated users can access)

### Path Parameters
- `id` (required, UUID): Promotion template ID

### Response
Returns complete promotion template with typed rules array.

### Example
```bash
GET /api/promotion-templates/750e8400-e29b-41d4-a716-446655440001
```

### Errors
- `400 Bad Request`: Invalid UUID format
- `404 Not Found`: Template doesn't exist
- `500 Internal Server Error`: Unexpected error
```

### Step 6: Update Service Tests

**File**: `src/lib/promotion-template.service.test.ts` (new file or update existing)

```typescript
import { describe, it, expect } from 'vitest';
import { PromotionTemplateService } from './promotion-template.service';

describe('PromotionTemplateService.getPromotionTemplateById', () => {
  it('should return template when found', async () => {
    // Test implementation
  });

  it('should return null when not found', async () => {
    // Test implementation
  });

  it('should throw error on database failure', async () => {
    // Test implementation
  });

  it('should correctly type JSONB rules', async () => {
    // Test implementation
  });
});
```

### Step 7: Verify Build and Linting

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

### Step 8: Performance Testing

**Actions**:

1. **Measure Response Time**:
```bash
curl -w "\nTime: %{time_total}s\n" -s \
  'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001' \
  > /dev/null
```
**Expected**: < 50ms

2. **Test Under Load** (optional, using Apache Bench):
```bash
ab -n 1000 -c 10 'http://localhost:3000/api/promotion-templates/750e8400-e29b-41d4-a716-446655440001'
```
**Expected**: Consistent response times, no errors

3. **Monitor Database Queries**:
- Check Supabase logs for query execution time
- Expected: ~1-5ms per query

## 10. Future Enhancements

### 1. Response Caching
**Why**: Reduce database load for frequently accessed templates
**Implementation**: Redis cache with template ID as key, 15-30 minute TTL
**Invalidation**: On template update/delete
**Priority**: Medium (templates change infrequently)

### 2. Field Selection
**Why**: Allow clients to specify which fields to return
**Implementation**: Add `fields` query parameter
**Example**: `?fields=id,name,rules`
**Priority**: Low (response size is small)

### 3. Include Related Data
**Why**: Reduce additional requests for related information
**Implementation**: Add optional `include` query parameter
**Options**: `include=creator` (user details), `include=usage_stats` (promotion count)
**Priority**: Medium (improves UX)

### 4. Template Versioning
**Why**: Track changes to templates over time
**Implementation**: Add version field, maintain history table
**Endpoint**: `GET /api/promotion-templates/:id/history`
**Priority**: Medium (important for promotion integrity)

### 5. Rules Schema Validation
**Why**: Ensure data integrity of JSONB rules field
**Implementation**: JSON schema or Zod validation in service layer
**Benefit**: Catch malformed rules before returning to client
**Priority**: High (prevents runtime type errors)

### 6. Template Usage Statistics
**Why**: Show how many promotions use each template
**Implementation**: Join with promotions table, count usage
**Response**: Add `usage_count` field
**Priority**: Low (analytics, not core functionality)

### 7. Soft Delete Support
**Why**: Preserve template history when deactivating
**Implementation**: Add `deleted_at` field, filter deleted templates
**Impact**: Templates never truly deleted, only marked inactive
**Priority**: Low (is_active field sufficient for MVP)

### 8. ETag Support
**Why**: Enable client-side caching with conditional requests
**Implementation**: Return ETag header based on updated_at
**Benefit**: Reduce unnecessary data transfer
**Priority**: Low (optimization)

### 9. Template Cloning Endpoint
**Why**: Allow creating new templates based on existing ones
**Implementation**: `POST /api/promotion-templates/:id/clone`
**Use Case**: Admin creating similar templates for different levels
**Priority**: Low (UI can handle this)

### 10. Template Validation Endpoint
**Why**: Validate template rules against position level configuration
**Implementation**: `POST /api/promotion-templates/:id/validate`
**Logic**: Check rules match position level badge requirements
**Priority**: Medium (ensures template integrity)
