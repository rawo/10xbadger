# API Endpoint Implementation Plan: POST /api/catalog-badges

## 1. Endpoint Overview

This endpoint creates a new catalog badge in the system. It is an **admin-only** endpoint that allows administrators to define new badge types that can be awarded to users. The badge is created with `status = 'active'` and `version = 1` by default.

**Key Features**:
- Create new catalog badge
- Admin-only access (disabled in development)
- Automatic status and version initialization
- Full input validation with detailed error messages
- Returns complete badge details on success

**Development Mode**: Authentication and authorization are disabled for development purposes. This will be re-enabled before production deployment.

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/catalog-badges`
- **Content-Type**: application/json
- **Authentication**: Disabled for development (will be required in production)
- **Authorization**: Admin only (will be enforced in production)

### Request Body

```json
{
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL database administration and optimization",
  "category": "technical",
  "level": "gold",
  "metadata": {
    "skills": ["SQL", "indexing", "query optimization"],
    "difficulty": "advanced"
  }
}
```

### Request Parameters

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `title` | string | **Yes** | Non-empty, max 200 chars | Badge title/name |
| `description` | string | No | Max 2000 chars | Detailed badge description |
| `category` | string | **Yes** | Enum: `technical`, `organizational`, `softskilled` | Badge category |
| `level` | string | **Yes** | Enum: `gold`, `silver`, `bronze` | Badge level/tier |
| `metadata` | object | No | Valid JSON object | Additional badge metadata (freeform) |

### Request Example

```bash
curl -X POST "http://localhost:3000/api/catalog-badges" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PostgreSQL Expert",
    "description": "Demonstrated advanced knowledge of PostgreSQL",
    "category": "technical",
    "level": "gold",
    "metadata": {}
  }'
```

## 3. Used Types

### From `src/types.ts`

**Command Model**:
- `CreateCatalogBadgeCommand` - Input validation and request body type

**Response Types**:
- `CatalogBadgeDetailDto` - Success response with complete badge details
- `CatalogBadgeRow` - Database row type from Supabase

**Error Types**:
- `ApiError` - Standard error response structure
- `ValidationErrorDetail` - Field-level validation errors

**Enums**:
- `BadgeCategory` - Valid category values
- `BadgeLevel` - Valid level values
- `CatalogBadgeStatus` - Badge status values (used internally)

### New Types to Create

**Validation Schema** (in route file or separate validation file):
```typescript
import { z } from 'zod';
import { BadgeCategory, BadgeLevel } from '@/types';

const createCatalogBadgeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  category: z.enum([BadgeCategory.Technical, BadgeCategory.Organizational, BadgeCategory.Softskilled], {
    errorMap: () => ({ message: 'Category must be one of: technical, organizational, softskilled' })
  }),
  level: z.enum([BadgeLevel.Gold, BadgeLevel.Silver, BadgeLevel.Bronze], {
    errorMap: () => ({ message: 'Level must be one of: gold, silver, bronze' })
  }),
  metadata: z.record(z.unknown()).optional().default({})
});
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL database administration and optimization",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440100",
  "created_at": "2025-01-22T15:30:00Z",
  "deactivated_at": null,
  "version": 1,
  "metadata": {
    "skills": ["SQL", "indexing", "query optimization"],
    "difficulty": "advanced"
  }
}
```

**Response Headers**:
- `Content-Type: application/json`
- `Location: /api/catalog-badges/{id}` (optional, but good practice for 201)

### Error Responses

#### 400 Bad Request - Validation Error

**Missing Required Field**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

**Multiple Validation Errors**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title must be at most 200 characters"
    },
    {
      "field": "category",
      "message": "Category must be one of: technical, organizational, softskilled"
    },
    {
      "field": "level",
      "message": "Level must be one of: gold, silver, bronze"
    }
  ]
}
```

**Invalid JSON**:
```json
{
  "error": "validation_error",
  "message": "Invalid JSON in request body"
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

#### 500 Internal Server Error

```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while creating the catalog badge"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/catalog-badges
       │ { title, description, category, level, metadata }
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/catalog-badges/index.ts              │
│                                                      │
│  1. Parse request body (JSON)                       │
│  2. Validate with Zod schema                        │
│  3. Check authentication (DISABLED in dev)          │
│  4. Check admin role (DISABLED in dev)              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         CatalogBadgeService                         │
│  src/lib/catalog-badge.service.ts                   │
│                                                      │
│  createCatalogBadge(command, createdBy)             │
│  1. Insert badge into database                      │
│  2. Set default values:                             │
│     - status = 'active'                             │
│     - version = 1                                   │
│     - created_by = current user ID                  │
│     - created_at = NOW()                            │
│  3. Return created badge                            │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  INSERT INTO catalog_badges                         │
│  (title, description, category, level, metadata,    │
│   status, created_by, version)                      │
│  VALUES ($1, $2, $3, $4, $5, 'active', $6, 1)       │
│  RETURNING *                                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  catalog_badges table                               │
│  - Auto-generate UUID for id                        │
│  - Set created_at timestamp                         │
│  - Apply database constraints                       │
│  - Create full-text search index entry              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Created badge record
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Return 201 Created                              │
│  2. Include badge data in response body             │
│  3. Set Location header (optional)                  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

## 6. Security Considerations

### Authentication (Production)
- **Production**: Requires valid session from Google OAuth
- **Development**: Disabled - no authentication required
- **Implementation**: Comment out auth check with clear TODO markers

### Authorization (Production)
- **Production**: Only admin users can create badges
- **Development**: Disabled - all users can create (for testing)
- **Check**: Validate `is_admin` field from user session
- **Error**: Return 403 Forbidden if user is not admin

### Input Validation

**XSS Prevention**:
- Validate title and description for malicious content
- PostgreSQL stores data safely (parameterized queries)
- Frontend should escape HTML when displaying
- Consider sanitizing metadata if it contains user-generated content

**SQL Injection Prevention**:
- ✅ Supabase query builder uses parameterized queries
- ✅ All values passed as parameters, never concatenated
- ✅ No raw SQL execution with user input

**Data Validation**:
- ✅ Enum validation for category and level
- ✅ Length limits on title (200) and description (2000)
- ✅ Type validation for metadata (must be valid JSON object)
- ✅ Reject empty strings for required fields

**Size Limits**:
- Title: Max 200 characters (prevents UI overflow)
- Description: Max 2000 characters (reasonable length)
- Metadata: Consider adding size limit (e.g., max 10KB JSON)
- Request body: Consider global size limit in middleware

### Data Integrity

**Database Constraints**:
- Primary key (id) auto-generated as UUID
- `created_by` foreign key references users(id)
- `status` check constraint (active/inactive)
- `category` validated at application layer
- `level` validated at application layer

**Default Values**:
- `status` defaults to 'active'
- `version` defaults to 1
- `created_at` auto-set by database
- `metadata` defaults to {} if not provided

### Security Best Practices

- ✅ Validate all input with Zod schema
- ✅ Use parameterized queries (Supabase)
- ✅ Return appropriate status codes
- ✅ Log errors server-side only (never expose to client)
- ✅ Don't leak database structure in error messages
- ✅ Sanitize error messages before returning to client
- ✅ Use TypeScript for compile-time type safety
- ✅ Implement rate limiting (future enhancement)

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid JSON body | 400 | `validation_error` | Try-catch JSON.parse, return clear error |
| Missing required field (title) | 400 | `validation_error` | Zod validation, return field-level error |
| Title too long (>200 chars) | 400 | `validation_error` | Zod validation with custom message |
| Description too long (>2000) | 400 | `validation_error` | Zod validation with custom message |
| Invalid category value | 400 | `validation_error` | Zod enum validation with allowed values |
| Invalid level value | 400 | `validation_error` | Zod enum validation with allowed values |
| Invalid metadata format | 400 | `validation_error` | Zod validation, must be object |
| Not authenticated | 401 | `unauthorized` | Check session, return generic message (prod only) |
| Not admin | 403 | `forbidden` | Check is_admin flag, return clear message (prod only) |
| Database connection error | 500 | `internal_error` | Catch Supabase error, log details, return generic message |
| Database constraint violation | 500 | `internal_error` | Catch error, log, return generic message |
| Unexpected error | 500 | `internal_error` | Top-level catch-all, log full error, return generic message |

### Error Handling Strategy

1. **JSON Parsing (400)**:
   ```typescript
   try {
     const body = await context.request.json();
   } catch (error) {
     return new Response(JSON.stringify({
       error: 'validation_error',
       message: 'Invalid JSON in request body'
     }), { status: 400 });
   }
   ```

2. **Zod Validation (400)**:
   ```typescript
   const validation = createCatalogBadgeSchema.safeParse(body);
   if (!validation.success) {
     return new Response(JSON.stringify({
       error: 'validation_error',
       message: 'Validation failed',
       details: validation.error.issues.map(err => ({
         field: err.path.join('.'),
         message: err.message
       }))
     }), { status: 400 });
   }
   ```

3. **Authentication Check (401)** - Production Only:
   ```typescript
   // Currently commented out in development mode
   /*
   const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
   if (authError || !user) {
     return new Response(JSON.stringify({
       error: 'unauthorized',
       message: 'Authentication required'
     }), { status: 401 });
   }
   */
   ```

4. **Authorization Check (403)** - Production Only:
   ```typescript
   // Currently commented out in development mode
   /*
   if (!userData.is_admin) {
     return new Response(JSON.stringify({
       error: 'forbidden',
       message: 'Admin access required'
     }), { status: 403 });
   }
   */
   ```

5. **Database Errors (500)**:
   ```typescript
   try {
     const badge = await service.createCatalogBadge(command, userId);
   } catch (error) {
     console.error('Database error creating catalog badge:', error);
     return new Response(JSON.stringify({
       error: 'internal_error',
       message: 'An unexpected error occurred while creating the catalog badge'
     }), { status: 500 });
   }
   ```

6. **Top-Level Error Handler (500)**:
   ```typescript
   try {
     // ... all endpoint logic
   } catch (error) {
     console.error('Error in POST /api/catalog-badges:', error);
     return new Response(JSON.stringify({
       error: 'internal_error',
       message: 'An unexpected error occurred while creating the catalog badge'
     }), { status: 500 });
   }
   ```

### Error Logging

- **Development**: Use `console.error()` with detailed error information
- **Production**: Consider structured logging service (e.g., Sentry, LogRocket)
- **Sensitive Data**: Never log passwords, tokens, or PII
- **Error Context**: Log request ID, user ID, timestamp for debugging
- **Stack Traces**: Log full stack traces server-side, never send to client

## 8. Performance Considerations

### Advantages
1. **Simple Insert**: Single INSERT query, very fast
2. **No Complex Joins**: No related data to fetch/insert
3. **Auto-generated IDs**: Database handles UUID generation efficiently
4. **Indexed Columns**: Full-text search index updated asynchronously

### Expected Performance
- **Typical Response Time**: < 50ms (local database)
- **Database Query**: < 20ms (single INSERT)
- **Validation**: < 5ms (Zod schema validation)
- **JSON Parsing**: < 5ms (small payloads)

### Potential Bottlenecks

1. **Large Metadata Objects**:
   - **Issue**: Very large metadata JSONB could slow down insert
   - **Mitigation**: Add size validation (e.g., max 10KB for metadata)

2. **Database Connection Pool**:
   - **Issue**: High concurrent requests could exhaust connections
   - **Mitigation**: Supabase handles connection pooling automatically

3. **Full-Text Search Index**:
   - **Issue**: Index update on large titles
   - **Mitigation**: PostgreSQL handles this efficiently; updates are asynchronous

### Optimization Strategies

1. **Validation**:
   - ✅ Use Zod for efficient validation
   - ✅ Fail fast - validate before database query
   - ✅ Cache Zod schemas (defined at module level)

2. **Database**:
   - ✅ Use Supabase query builder (optimized)
   - ✅ Return only necessary fields (SELECT *)
   - ✅ Leverage database default values
   - ✅ Let database handle UUID generation

3. **Response**:
   - ✅ Small payload (single badge object)
   - ✅ Efficient JSON serialization
   - ✅ No unnecessary data transformation

4. **Future Enhancements**:
   - Consider caching badge count/stats
   - Add request rate limiting per user
   - Implement request ID for tracing

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File**: `src/lib/validation/catalog-badge.validation.ts` (extend existing file)

```typescript
import { z } from 'zod';
import { BadgeCategory, BadgeLevel } from '@/types';

/**
 * Validation schema for POST /api/catalog-badges
 *
 * Validates all fields for creating a new catalog badge.
 */
export const createCatalogBadgeSchema = z.object({
  // Required: Badge title (non-empty, max 200 chars)
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),

  // Optional: Detailed description (max 2000 chars)
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),

  // Required: Badge category (enum)
  category: z.enum(
    [BadgeCategory.Technical, BadgeCategory.Organizational, BadgeCategory.Softskilled],
    {
      errorMap: () => ({
        message: 'Category must be one of: technical, organizational, softskilled',
      }),
    }
  ),

  // Required: Badge level (enum)
  level: z.enum([BadgeLevel.Gold, BadgeLevel.Silver, BadgeLevel.Bronze], {
    errorMap: () => ({
      message: 'Level must be one of: gold, silver, bronze',
    }),
  }),

  // Optional: Metadata (JSON object, defaults to {})
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateCatalogBadgeSchema = z.infer<typeof createCatalogBadgeSchema>;
```

### Step 2: Add Service Method

**File**: `src/lib/catalog-badge.service.ts` (extend existing class)

```typescript
import type { CreateCatalogBadgeCommand, CatalogBadgeDetailDto } from '@/types';

/**
 * Creates a new catalog badge
 *
 * @param command - Badge creation data
 * @param createdBy - User ID of the creator
 * @returns Created catalog badge with all fields
 * @throws Error if database insertion fails
 */
async createCatalogBadge(
  command: CreateCatalogBadgeCommand,
  createdBy: string
): Promise<CatalogBadgeDetailDto> {
  const { data, error } = await this.supabase
    .from('catalog_badges')
    .insert({
      title: command.title,
      description: command.description || null,
      category: command.category,
      level: command.level,
      metadata: command.metadata || {},
      status: 'active',
      version: 1,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create catalog badge: ${error.message}`);
  }

  return data as CatalogBadgeDetailDto;
}
```

### Step 3: Create/Update API Route Handler

**File**: `src/pages/api/catalog-badges/index.ts` (add POST handler to existing file)

```typescript
import type { APIRoute } from 'astro';
import { CatalogBadgeService } from '@/lib/catalog-badge.service';
import { createCatalogBadgeSchema } from '@/lib/validation/catalog-badge.validation';
import type { ApiError } from '@/types';

/**
 * POST /api/catalog-badges
 *
 * Creates a new catalog badge (admin only).
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication and admin check before production deployment
 *
 * Request Body:
 * - title: Badge title (required, max 200 chars)
 * - description: Badge description (optional, max 2000 chars)
 * - category: Badge category (required, enum: technical/organizational/softskilled)
 * - level: Badge level (required, enum: gold/silver/bronze)
 * - metadata: Additional metadata (optional, JSON object)
 *
 * @returns 201 Created with catalog badge details
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if not authenticated (production)
 * @returns 403 Forbidden if not admin (production)
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Parse Request Body
    // =========================================================================
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      const apiError: ApiError = {
        error: 'validation_error',
        message: 'Invalid JSON in request body',
      };
      return new Response(JSON.stringify(apiError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // Step 2: Validate Request Body
    // =========================================================================
    const validation = createCatalogBadgeSchema.safeParse(body);

    if (!validation.success) {
      const error: ApiError = {
        error: 'validation_error',
        message: 'Validation failed',
        details: validation.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const command = validation.data;

    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // For now, use a default admin user ID for development

    const createdBy = '550e8400-e29b-41d4-a716-446655440100'; // Default admin user from sample data

    // =========================================================================
    // PRODUCTION CODE (Currently Disabled)
    // =========================================================================
    // Uncomment the code below when authentication is ready:
    /*
    // Step 3: Authentication Check
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

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

    // Step 4: Get User Info (Admin Status)
    const { data: userData, error: userError } = await context.locals.supabase
      .from('users')
      .select('id, is_admin')
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

    // Step 5: Authorization Check (Admin Only)
    if (!userData.is_admin) {
      const error: ApiError = {
        error: 'forbidden',
        message: 'Admin access required',
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const createdBy = userData.id;
    */

    // =========================================================================
    // Step 6: Create Badge via Service
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const badge = await service.createCatalogBadge(command, createdBy);

    // =========================================================================
    // Step 7: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badge), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        // Optional: Add Location header pointing to the new resource
        // 'Location': `/api/catalog-badges/${badge.id}`
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error('Error in POST /api/catalog-badges:', error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: 'internal_error',
      message: 'An unexpected error occurred while creating the catalog badge',
    };
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 4: Test the Endpoint

#### Manual Testing Scenarios

1. **Valid Request - Minimal Fields**:
   ```bash
   curl -X POST "http://localhost:3000/api/catalog-badges" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Docker Expert",
       "category": "technical",
       "level": "silver"
     }'
   ```
   Expected: 201 Created with badge data

2. **Valid Request - All Fields**:
   ```bash
   curl -X POST "http://localhost:3000/api/catalog-badges" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Docker Expert",
       "description": "Expertise in containerization with Docker",
       "category": "technical",
       "level": "silver",
       "metadata": {
         "skills": ["containers", "orchestration"],
         "difficulty": "intermediate"
       }
     }'
   ```
   Expected: 201 Created with complete badge data

3. **Missing Required Field (title)**:
   ```bash
   curl -X POST "http://localhost:3000/api/catalog-badges" \
     -H "Content-Type: application/json" \
     -d '{
       "category": "technical",
       "level": "gold"
     }'
   ```
   Expected: 400 Bad Request with validation error

4. **Invalid Category**:
   ```bash
   curl -X POST "http://localhost:3000/api/catalog-badges" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Invalid Badge",
       "category": "invalid_category",
       "level": "gold"
     }'
   ```
   Expected: 400 Bad Request with enum validation error

5. **Title Too Long**:
   ```bash
   curl -X POST "http://localhost:3000/api/catalog-badges" \
     -H "Content-Type: application/json" \
     -d "{
       \"title\": \"$(python3 -c 'print("A" * 201)')\",
       \"category\": \"technical\",
       \"level\": \"gold\"
     }"
   ```
   Expected: 400 Bad Request with length validation error

6. **Invalid JSON**:
   ```bash
   curl -X POST "http://localhost:3000/api/catalog-badges" \
     -H "Content-Type: application/json" \
     -d '{invalid json'
   ```
   Expected: 400 Bad Request with JSON parsing error

### Step 5: Browser Testing

Test in browser console:

```javascript
// Test 1: Valid request with all fields
fetch('/api/catalog-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Kubernetes Expert',
    description: 'Advanced knowledge of Kubernetes orchestration',
    category: 'technical',
    level: 'gold',
    metadata: { skills: ['k8s', 'helm', 'deployment'] }
  })
})
  .then(res => {
    console.log('Status:', res.status); // Should be 201
    return res.json();
  })
  .then(data => console.log('Created badge:', data));

// Test 2: Missing required field
fetch('/api/catalog-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'technical',
    level: 'gold'
  })
})
  .then(res => res.json())
  .then(data => console.log('Validation error:', data));

// Test 3: Invalid category value
fetch('/api/catalog-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Badge',
    category: 'invalid',
    level: 'gold'
  })
})
  .then(res => res.json())
  .then(data => console.log('Enum validation error:', data));
```

### Step 6: Update Testing Guide

Add POST endpoint test scenarios to `.ai/catalog-badges-testing-guide.md`:

```markdown
### POST /api/catalog-badges

### 22. Create Badge - Valid Request (Minimal)
...

### 23. Create Badge - Valid Request (All Fields)
...

### 24. Create Badge - Missing Required Field
...

### 25. Create Badge - Invalid Category
...

### 26. Create Badge - Title Too Long
...

### 27. Create Badge - Invalid JSON
...
```

### Step 7: Verify Build

```bash
pnpm build
```

Ensure no TypeScript or build errors.

### Step 8: Verify Linting

```bash
pnpm lint
```

Ensure no ESLint errors.

## 10. Code Quality Checklist

Before completing implementation:

- [ ] Zod validation schema created with all constraints
- [ ] Proper error handling (400, 401, 403, 500)
- [ ] Service method added to CatalogBadgeService
- [ ] POST handler added to API route
- [ ] JSDoc comments added to all functions
- [ ] TypeScript types used correctly
- [ ] Error logging (console.error with eslint-disable)
- [ ] Generic error messages to client
- [ ] No authentication (development mode noted with TODOs)
- [ ] Default values set (status, version, created_by)
- [ ] Build passes without errors
- [ ] Linting passes without errors
- [ ] Manual testing completed
- [ ] Testing guide updated

## 11. Integration with Existing Code

### Dependencies
- ✅ Extends existing `CatalogBadgeService` class
- ✅ Uses existing `ApiError` type
- ✅ Uses existing `CreateCatalogBadgeCommand` type
- ✅ Uses existing `CatalogBadgeDetailDto` type
- ✅ Uses existing Supabase client from context
- ✅ Follows same patterns as GET endpoints

### File Structure
```
src/
├── lib/
│   ├── catalog-badge.service.ts (extend with createCatalogBadge method)
│   └── validation/
│       └── catalog-badge.validation.ts (add createCatalogBadgeSchema)
├── pages/
│   └── api/
│       └── catalog-badges/
│           ├── index.ts (add POST handler to existing file)
│           └── [id].ts (existing - detail endpoint)
└── types.ts (existing - no changes needed)
```

## 12. Future Enhancements

1. **Authentication**: Re-enable when auth system is ready
2. **Duplicate Detection**: Check for duplicate titles before creating
3. **Audit Logging**: Log badge creation in audit_logs table
4. **Metadata Validation**: Add JSON schema validation for metadata structure
5. **Batch Creation**: Support creating multiple badges in one request
6. **Rich Text**: Support markdown in description field
7. **Image Upload**: Allow badge icon/image upload
8. **Versioning**: Support badge templates with version control
9. **Draft Mode**: Allow saving badges as drafts before publishing
10. **Notifications**: Notify users when new badges are available

## 13. Business Rules

### Badge Creation Rules

1. **Status**: All new badges created with `status = 'active'`
2. **Version**: All new badges start at `version = 1`
3. **Creator Tracking**: `created_by` records the admin who created the badge
4. **Timestamp**: `created_at` automatically set by database
5. **Deactivation**: `deactivated_at` is NULL for new badges

### Validation Rules

1. **Title Uniqueness**: Not enforced in MVP (could have duplicate titles)
2. **Category Values**: Must be one of: technical, organizational, softskilled
3. **Level Values**: Must be one of: gold, silver, bronze
4. **Metadata Format**: Must be valid JSON object (not array or primitive)

### Data Integrity Rules

1. **Foreign Key**: `created_by` must reference valid user
2. **Status Constraint**: Database enforces status IN ('active', 'inactive')
3. **Version**: Must be positive integer (default 1)
4. **Timestamps**: created_at is NOT NULL, deactivated_at is nullable

## 14. Differences from GET Endpoints

| Feature | GET /api/catalog-badges | GET /api/catalog-badges/:id | POST /api/catalog-badges |
|---------|-------------------------|----------------------------|--------------------------|
| Method | GET | GET | POST |
| Parameters | Query params (filters) | Path param (UUID) | Request body (JSON) |
| Validation | Query param schema | UUID format | Full object schema |
| Response | Paginated list (200) | Single object (200) | Single object (201) |
| Database Query | SELECT multiple rows | SELECT single row | INSERT single row |
| Admin Only | No | No | Yes (in production) |
| Error Handling | 400, 403, 500 | 400, 404, 500 | 400, 401, 403, 500 |
| Created By | N/A | N/A | Current user ID |

## 15. Summary

This endpoint enables administrators to create new badge definitions in the catalog. The implementation follows RESTful conventions with proper validation, error handling, and security considerations. The service layer pattern ensures business logic is separated from the API route handler.

**Key Implementation Points**:
- ✅ Comprehensive Zod validation with detailed error messages
- ✅ Proper status code usage (201 for creation)
- ✅ Service layer separation for database operations
- ✅ Clear error messages for all validation failures
- ✅ Consistent with existing GET endpoint patterns
- ✅ Ready for authentication when needed
- ✅ Default values handled automatically
- ✅ Full TypeScript type safety

**Estimated Implementation Time**: 45-60 minutes

**Testing Time**: 20-30 minutes

**Total Time**: ~1.5 hours

---

## Appendix A: Complete Validation Matrix

| Field | Required | Type | Min | Max | Default | Enum Values | Notes |
|-------|----------|------|-----|-----|---------|-------------|-------|
| title | Yes | string | 1 | 200 | - | - | Non-empty |
| description | No | string | 0 | 2000 | null | - | Optional |
| category | Yes | string | - | - | - | technical, organizational, softskilled | Enum |
| level | Yes | string | - | - | - | gold, silver, bronze | Enum |
| metadata | No | object | - | - | {} | - | JSON object |
| status | No | string | - | - | active | - | Set by system |
| version | No | number | - | - | 1 | - | Set by system |
| created_by | No | UUID | - | - | current user | - | Set by system |

## Appendix B: HTTP Status Code Reference

| Code | Name | Usage in This Endpoint |
|------|------|------------------------|
| 201 | Created | Badge successfully created |
| 400 | Bad Request | Validation errors, invalid JSON |
| 401 | Unauthorized | Not authenticated (production only) |
| 403 | Forbidden | Not admin (production only) |
| 500 | Internal Server Error | Database errors, unexpected errors |
