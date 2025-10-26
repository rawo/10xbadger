# API Endpoint Implementation Plan: GET /api/catalog-badges/:id

## 1. Endpoint Overview

This endpoint retrieves a single catalog badge by its unique identifier (UUID). It returns the complete badge details including title, description, category, level, status, metadata, and versioning information. This is a simple read operation that performs a direct database lookup by primary key.

**Key Features**:
- Retrieve single badge by ID
- UUID validation
- 404 handling for non-existent badges
- Returns complete badge details

**Development Mode**: Authentication is disabled for development purposes.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/catalog-badges/:id`
- **Authentication**: Disabled for development (will be added later)

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID format | Catalog badge unique identifier |

### Request Example

```
GET /api/catalog-badges/550e8400-e29b-41d4-a716-446655440001
```

## 3. Used Types

### From `src/types.ts`

**Response Types**:
- `CatalogBadgeDetailDto` - Individual catalog badge with full details
- `CatalogBadgeRow` - Database row type from Supabase

**Error Types**:
- `ApiError` - Standard error response structure

### New Types to Create

**Path Parameter Validation Schema** (in route file or service):
```typescript
import { z } from 'zod';

const uuidSchema = z.string().uuid();
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL database administration, optimization, and performance tuning. Successfully implemented complex queries, indexing strategies, and backup/recovery procedures.",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": null,
  "version": 1,
  "metadata": {}
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "invalid_parameter",
  "message": "Invalid badge ID format. Must be a valid UUID."
}
```

#### 404 Not Found - Badge Not Found
```json
{
  "error": "not_found",
  "message": "Catalog badge not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while fetching the catalog badge"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/catalog-badges/550e8400-e29b-41d4-a716-446655440001
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/catalog-badges/[id].ts               │
│                                                      │
│  1. Extract id from path parameters                 │
│  2. Validate UUID format (Zod schema)               │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         CatalogBadgeService                         │
│  src/lib/catalog-badge.service.ts                   │
│                                                      │
│  getCatalogBadgeById(id: string)                    │
│  1. Query database by primary key                   │
│  2. Return badge if found                           │
│  3. Return null if not found                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Query: catalog_badges table                        │
│  - SELECT * WHERE id = $1                           │
│  - Uses primary key index (very fast)               │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  catalog_badges table                               │
│  - Primary key lookup on id column                  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Result (badge or null)
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Check if badge exists                           │
│  2. Return 200 with badge data                      │
│  3. OR return 404 if not found                      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

## 6. Security Considerations

### Authentication
- **Development Mode**: Authentication disabled
- **Production**: Will require valid session (to be implemented later)

### Input Validation
- **UUID Validation**:
  - Use Zod to validate UUID format
  - Prevents invalid IDs from reaching database
  - Returns 400 for malformed UUIDs
- **SQL Injection Prevention**:
  - Supabase query builder uses parameterized queries
  - UUID validation adds extra layer of protection

### Data Exposure
- **Badge Visibility**:
  - In development, all badges are accessible
  - Production may implement role-based filtering
- **Error Messages**:
  - Don't expose internal error details
  - Generic 500 errors for unexpected failures
  - Clear 404 message for missing badges

### Security Best Practices
- ✅ Validate all input (UUID format)
- ✅ Use parameterized queries (Supabase)
- ✅ Return appropriate status codes
- ✅ Log errors server-side only
- ✅ Don't leak database structure in errors

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling |
|----------|-------------|------------|----------|
| Invalid UUID format | 400 | `invalid_parameter` | Validate with Zod, return clear error |
| Badge not found | 404 | `not_found` | Check if data is null after query |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Supabase query error | 500 | `internal_error` | Log error, return generic message |
| Unexpected error | 500 | `internal_error` | Catch-all, log and return generic message |

### Error Handling Strategy

1. **UUID Validation (400)**:
   - Validate path parameter with Zod
   - Return specific error for invalid format
   - Prevent database query if invalid

2. **Not Found (404)**:
   - Check if Supabase returns null/empty result
   - Return clear "not found" message
   - Use appropriate 404 status code

3. **Database Errors (500)**:
   - Catch Supabase errors
   - Log full error details server-side
   - Return generic error to client
   - Don't expose database details

4. **Unexpected Errors (500)**:
   - Wrap entire handler in try-catch
   - Log unexpected errors
   - Return generic error message

## 8. Performance Considerations

### Advantages
1. **Primary Key Lookup**: Extremely fast O(log n) or O(1) with index
2. **Single Query**: No joins or complex filtering
3. **No Pagination**: Simple single-record retrieval
4. **Indexed Column**: ID is primary key with automatic index

### Expected Performance
- **Typical Response Time**: < 10ms (local database)
- **Database Query**: < 5ms (primary key lookup)
- **Network Overhead**: < 5ms (local development)

### Optimization Strategies

1. **Database**:
   - Primary key index already exists (automatic)
   - No additional indexes needed
   - Simple SELECT query

2. **Caching** (Future Enhancement):
   - Consider caching frequently accessed badges
   - Short TTL (5-10 minutes)
   - Invalidate on update/delete

3. **Response Size**:
   - Single badge object (small payload)
   - Minimal serialization overhead
   - No pagination needed

## 9. Implementation Steps

### Step 1: Add UUID Validation

No new file needed - add inline validation in route file.

```typescript
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid();
```

### Step 2: Add Service Method

**File**: `src/lib/catalog-badge.service.ts` (extend existing file)

```typescript
/**
 * Retrieves a single catalog badge by ID
 *
 * @param id - Badge UUID
 * @returns Catalog badge if found, null otherwise
 * @throws Error if database query fails
 */
async getCatalogBadgeById(id: string): Promise<CatalogBadgeDetailDto | null> {
  const { data, error } = await this.supabase
    .from('catalog_badges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Handle "not found" vs actual errors
    if (error.code === 'PGRST116') {
      // PostgREST error code for no rows returned
      return null;
    }
    throw new Error(`Failed to fetch catalog badge: ${error.message}`);
  }

  return data as CatalogBadgeDetailDto;
}
```

### Step 3: Create API Route Handler

**File**: `src/pages/api/catalog-badges/[id].ts` (new file)

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { CatalogBadgeService } from '@/lib/catalog-badge.service';
import type { ApiError } from '@/types';

// UUID validation schema
const uuidSchema = z.string().uuid();

/**
 * GET /api/catalog-badges/:id
 *
 * Retrieves a single catalog badge by ID.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Path Parameters:
 * - id: Catalog badge UUID
 *
 * @returns 200 OK with catalog badge details
 * @returns 400 Bad Request if UUID is invalid
 * @returns 404 Not Found if badge doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Extract and Validate ID Parameter
    // =========================================================================
    const { id } = context.params;

    // Validate UUID format
    const validation = uuidSchema.safeParse(id);

    if (!validation.success) {
      const error: ApiError = {
        error: 'invalid_parameter',
        message: 'Invalid badge ID format. Must be a valid UUID.',
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // Step 2: Fetch Badge from Database
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const badge = await service.getCatalogBadgeById(validation.data);

    // =========================================================================
    // Step 3: Handle Not Found
    // =========================================================================
    if (!badge) {
      const error: ApiError = {
        error: 'not_found',
        message: 'Catalog badge not found',
      };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // Step 4: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badge), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error('Error in GET /api/catalog-badges/:id:', error);

    // Return generic error to client
    const apiError: ApiError = {
      error: 'internal_error',
      message: 'An unexpected error occurred while fetching the catalog badge',
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 4: Create Directory Structure

Create the dynamic route directory:
```bash
mkdir -p src/pages/api/catalog-badges
```

### Step 5: Test the Endpoint

#### Manual Testing Scenarios

1. **Valid UUID - Badge Exists**:
   ```bash
   curl "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001"
   ```
   Expected: 200 OK with badge data

2. **Valid UUID - Badge Not Found**:
   ```bash
   curl "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999"
   ```
   Expected: 404 Not Found

3. **Invalid UUID Format**:
   ```bash
   curl "http://localhost:3000/api/catalog-badges/invalid-id"
   ```
   Expected: 400 Bad Request

4. **Not a UUID (random string)**:
   ```bash
   curl "http://localhost:3000/api/catalog-badges/abc123"
   ```
   Expected: 400 Bad Request

5. **Empty ID**:
   ```bash
   curl "http://localhost:3000/api/catalog-badges/"
   ```
   Expected: 404 Not Found (route not matched) or redirect to list

### Step 6: Browser Testing

Test in browser console:

```javascript
// Test with valid ID
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001')
  .then(res => res.json())
  .then(data => console.log('Badge:', data));

// Test with invalid ID
fetch('/api/catalog-badges/invalid-id')
  .then(res => res.json())
  .then(data => console.log('Error:', data));

// Test not found
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999')
  .then(res => res.json())
  .then(data => console.log('Not found:', data));
```

### Step 7: Add to Testing Guide

Update `.ai/catalog-badges-testing-guide.md` with new test scenarios for the detail endpoint.

### Step 8: Verify Build

```bash
pnpm build
```

Ensure no TypeScript or build errors.

## 10. Code Quality Checklist

Before completing implementation:

- [ ] UUID validation with Zod
- [ ] Proper error handling (400, 404, 500)
- [ ] Service method added to CatalogBadgeService
- [ ] API route handler created
- [ ] JSDoc comments added
- [ ] TypeScript types used correctly
- [ ] Error logging (console.error with eslint-disable)
- [ ] Generic error messages to client
- [ ] No authentication (development mode noted)
- [ ] Build passes without errors
- [ ] Manual testing completed
- [ ] Testing guide updated

## 11. Integration with Existing Code

### Dependencies
- ✅ Uses existing `CatalogBadgeService` class
- ✅ Uses existing `ApiError` type
- ✅ Uses existing `CatalogBadgeDetailDto` type
- ✅ Uses existing Supabase client from context
- ✅ Follows same patterns as list endpoint

### File Structure
```
src/
├── lib/
│   └── catalog-badge.service.ts (extend existing)
├── pages/
│   └── api/
│       └── catalog-badges/
│           ├── index.ts (existing - list endpoint)
│           └── [id].ts (new - detail endpoint)
└── types.ts (existing)
```

## 12. Future Enhancements

1. **Authentication**: Re-enable when auth system is ready
2. **Caching**: Cache frequently accessed badges
3. **Field Selection**: Allow `?fields=title,category` query param
4. **Related Data**: Include creator user details if needed
5. **Versioning**: Support `/api/catalog-badges/:id/versions` endpoint
6. **Audit Logging**: Log badge access for analytics
7. **Rate Limiting**: Prevent abuse of endpoint

## 13. Differences from List Endpoint

| Feature | List Endpoint | Detail Endpoint |
|---------|---------------|-----------------|
| URL | `/api/catalog-badges` | `/api/catalog-badges/:id` |
| Method | GET | GET |
| Parameters | Query params (8) | Path param (1) |
| Validation | Zod schema for query | Zod schema for UUID |
| Response | Paginated list | Single object |
| Database Query | Multiple rows | Single row |
| Performance | Filter/search/sort | Primary key lookup |
| Error Handling | 400, 403, 500 | 400, 404, 500 |

## 14. Summary

This endpoint provides a simple, fast way to retrieve a single catalog badge by ID. The implementation follows the same patterns as the list endpoint, ensuring consistency across the API. The primary key lookup ensures excellent performance, and proper error handling provides a good developer experience.

**Key Implementation Points**:
- ✅ UUID validation prevents invalid requests
- ✅ 404 handling for missing badges
- ✅ Service layer separation for business logic
- ✅ Clear error messages
- ✅ Consistent with list endpoint patterns
- ✅ Ready for authentication when needed

**Estimated Implementation Time**: 30-45 minutes

**Testing Time**: 15-20 minutes

**Total Time**: ~1 hour
