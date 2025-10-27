# API Endpoint Implementation Plan: PUT /api/catalog-badges/:id

## 1. Endpoint Overview

This endpoint updates an existing catalog badge in the system. It is an **admin-only** endpoint that allows administrators to modify badge definitions. The endpoint supports partial updates (all fields are optional) and automatically increments the `version` field to maintain versioning for historical badge applications.

**Key Features**:
- Update existing catalog badge by ID
- Admin-only access (disabled in development)
- Partial update support (all fields optional)
- Automatic version increment
- Cannot modify `status` field (use deactivate endpoint)
- Returns complete updated badge details

**Development Mode**: Authentication and authorization are disabled for development purposes. This will be re-enabled before production deployment.

## 2. Request Details

- **HTTP Method**: PUT
- **URL Structure**: `/api/catalog-badges/:id`
- **Content-Type**: application/json
- **Authentication**: Disabled for development (will be required in production)
- **Authorization**: Admin only (will be enforced in production)

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | UUID | **Yes** | Valid UUID format | Catalog badge unique identifier |

### Request Body

All fields are **optional** for partial updates:

```json
{
  "title": "PostgreSQL Expert (Updated)",
  "description": "Updated description with more details",
  "category": "technical",
  "level": "gold",
  "metadata": {
    "skills": ["SQL", "indexing", "optimization"],
    "difficulty": "advanced"
  }
}
```

### Request Parameters

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `title` | string | No | Non-empty if provided, max 200 chars | Badge title/name |
| `description` | string | No | Max 2000 chars | Detailed badge description |
| `category` | string | No | Enum: `technical`, `organizational`, `softskilled` | Badge category |
| `level` | string | No | Enum: `gold`, `silver`, `bronze` | Badge level/tier |
| `metadata` | object | No | Valid JSON object | Additional badge metadata (freeform) |

**Note**: At least one field should be provided for the update to be meaningful, though this is not enforced.

### Request Example

```bash
curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PostgreSQL Expert (Updated)",
    "description": "Advanced PostgreSQL expertise with focus on performance optimization"
  }'
```

## 3. Used Types

### From `src/types.ts`

**Command Model**:
- `UpdateCatalogBadgeCommand` - Input validation and request body type (all fields optional)

**Response Types**:
- `CatalogBadgeDetailDto` - Success response with complete badge details
- `CatalogBadgeRow` - Database row type from Supabase

**Error Types**:
- `ApiError` - Standard error response structure
- `ValidationErrorDetail` - Field-level validation errors

**Enums** (used internally):
- `BadgeCategory` - Valid category values
- `BadgeLevel` - Valid level values

### New Types to Create

**Validation Schema** (in validation file):
```typescript
import { z } from 'zod';

// UUID validation for path parameter
const uuidSchema = z.string().uuid();

// Update badge validation schema (all fields optional)
const updateCatalogBadgeSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title must be at most 200 characters').optional(),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  category: z.enum(['technical', 'organizational', 'softskilled']).optional(),
  level: z.enum(['gold', 'silver', 'bronze']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert (Updated)",
  "description": "Advanced PostgreSQL expertise with focus on performance optimization",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440100",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": null,
  "version": 2,
  "metadata": {
    "skills": ["SQL", "indexing", "optimization"],
    "difficulty": "advanced"
  }
}
```

**Note**: The `version` field is automatically incremented from 1 to 2.

**Response Headers**:
- `Content-Type: application/json`

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": "invalid_parameter",
  "message": "Invalid badge ID format. Must be a valid UUID."
}
```

#### 400 Bad Request - Validation Error

**Empty Title**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title cannot be empty"
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
      "message": "Invalid enum value. Expected 'technical' | 'organizational' | 'softskilled', received 'invalid'"
    }
  ]
}
```

#### 400 Bad Request - Invalid JSON

```json
{
  "error": "validation_error",
  "message": "Invalid JSON in request body"
}
```

#### 400 Bad Request - Empty Request Body

```json
{
  "error": "validation_error",
  "message": "Request body cannot be empty"
}
```

#### 404 Not Found - Badge Not Found

```json
{
  "error": "not_found",
  "message": "Catalog badge not found"
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
  "message": "An unexpected error occurred while updating the catalog badge"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ PUT /api/catalog-badges/550e8400-e29b-41d4-a716-446655440001
       │ { title: "Updated Title", description: "Updated description" }
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/catalog-badges/[id].ts               │
│                                                      │
│  1. Extract id from path parameters                 │
│  2. Validate UUID format (Zod schema)               │
│  3. Parse request body (JSON)                       │
│  4. Validate request body (Zod schema)              │
│  5. Check authentication (DISABLED in dev)          │
│  6. Check admin role (DISABLED in dev)              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         CatalogBadgeService                         │
│  src/lib/catalog-badge.service.ts                   │
│                                                      │
│  updateCatalogBadge(id, command)                    │
│  1. Check if badge exists (SELECT by id)            │
│  2. Return null if not found                        │
│  3. Build update object with provided fields        │
│  4. Increment version                               │
│  5. Update badge in database                        │
│  6. Return updated badge                            │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  Step 1: Check existence                            │
│  SELECT * FROM catalog_badges WHERE id = $1        │
│                                                      │
│  Step 2: Update if exists                           │
│  UPDATE catalog_badges                              │
│  SET title = COALESCE($1, title),                   │
│      description = COALESCE($2, description),       │
│      category = COALESCE($3, category),             │
│      level = COALESCE($4, level),                   │
│      metadata = COALESCE($5, metadata),             │
│      version = version + 1                          │
│  WHERE id = $6                                      │
│  RETURNING *                                        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  catalog_badges table                               │
│  - Primary key lookup on id column                  │
│  - Update specified fields                          │
│  - Auto-increment version                           │
│  - Return updated row                               │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Updated badge record
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Check if badge was found and updated            │
│  2. Return 200 OK with updated badge data           │
│  3. OR return 404 if not found                      │
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
- **Production**: Only admin users can update badges
- **Development**: Disabled - all users can update (for testing)
- **Check**: Validate `is_admin` field from user session
- **Error**: Return 403 Forbidden if user is not admin

### Input Validation

**UUID Validation**:
- Validate path parameter ID is valid UUID format
- Prevents invalid IDs from reaching database
- Returns 400 for malformed UUIDs

**XSS Prevention**:
- Validate title and description for malicious content
- PostgreSQL stores data safely (parameterized queries)
- Frontend should escape HTML when displaying

**SQL Injection Prevention**:
- ✅ Supabase query builder uses parameterized queries
- ✅ All values passed as parameters, never concatenated
- ✅ No raw SQL execution with user input

**Data Validation**:
- ✅ Enum validation for category and level (if provided)
- ✅ Length limits on title (200) and description (2000)
- ✅ Type validation for metadata (must be valid JSON object)
- ✅ Prevent empty strings for title if provided
- ✅ At least one field should be provided (optional check)

**Size Limits**:
- Title: Max 200 characters (prevents UI overflow)
- Description: Max 2000 characters (reasonable length)
- Metadata: Consider adding size limit (e.g., max 10KB JSON)
- Request body: Consider global size limit in middleware

### Business Logic Validation

**Field Restrictions**:
- ❌ Cannot update `status` field (use deactivate endpoint)
- ❌ Cannot update `created_by` field (immutable)
- ❌ Cannot update `created_at` field (immutable)
- ❌ Cannot update `id` field (immutable)
- ✅ Can update: title, description, category, level, metadata
- ✅ Version automatically incremented (not user-controlled)

**Badge Existence**:
- Must check if badge exists before updating
- Return 404 if badge not found
- Prevent creating badges via PUT (use POST)

### Data Integrity

**Database Constraints**:
- Primary key (id) cannot be changed
- `created_by` foreign key references users(id)
- `status` check constraint (active/inactive) - not updatable via this endpoint
- Version automatically incremented

**Versioning**:
- Version incremented on every update
- Existing badge applications reference old versions via `catalog_badge_version`
- Historical integrity maintained

### Security Best Practices

- ✅ Validate all input with Zod schema
- ✅ Use parameterized queries (Supabase)
- ✅ Return appropriate status codes
- ✅ Log errors server-side only (never expose to client)
- ✅ Don't leak database structure in error messages
- ✅ Sanitize error messages before returning to client
- ✅ Use TypeScript for compile-time type safety
- ✅ Check badge existence before update
- ✅ Prevent status modification via this endpoint

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy |
|----------|-------------|------------|-------------------|
| Invalid UUID format (path) | 400 | `invalid_parameter` | Validate UUID before database query |
| Invalid JSON body | 400 | `validation_error` | Try-catch JSON.parse, return clear error |
| Empty request body | 400 | `validation_error` | Check if body is empty object |
| Title empty string | 400 | `validation_error` | Zod validation with min(1) if provided |
| Title too long (>200 chars) | 400 | `validation_error` | Zod validation with custom message |
| Description too long (>2000) | 400 | `validation_error` | Zod validation with custom message |
| Invalid category value | 400 | `validation_error` | Zod enum validation with allowed values |
| Invalid level value | 400 | `validation_error` | Zod enum validation with allowed values |
| Invalid metadata format | 400 | `validation_error` | Zod validation, must be object |
| Badge not found | 404 | `not_found` | Check if SELECT returns null |
| Not authenticated | 401 | `unauthorized` | Check session, return generic message (prod only) |
| Not admin | 403 | `forbidden` | Check is_admin flag, return clear message (prod only) |
| Database connection error | 500 | `internal_error` | Catch Supabase error, log details, return generic message |
| Database update error | 500 | `internal_error` | Catch error, log, return generic message |
| Unexpected error | 500 | `internal_error` | Top-level catch-all, log full error, return generic message |

### Error Handling Strategy

1. **UUID Validation (400)**:
   ```typescript
   const uuidValidation = uuidSchema.safeParse(id);
   if (!uuidValidation.success) {
     return new Response(JSON.stringify({
       error: 'invalid_parameter',
       message: 'Invalid badge ID format. Must be a valid UUID.'
     }), { status: 400 });
   }
   ```

2. **JSON Parsing (400)**:
   ```typescript
   try {
     body = await context.request.json();
   } catch (error) {
     return new Response(JSON.stringify({
       error: 'validation_error',
       message: 'Invalid JSON in request body'
     }), { status: 400 });
   }
   ```

3. **Empty Body Check (400)** - Optional:
   ```typescript
   if (Object.keys(body).length === 0) {
     return new Response(JSON.stringify({
       error: 'validation_error',
       message: 'Request body cannot be empty'
     }), { status: 400 });
   }
   ```

4. **Zod Validation (400)**:
   ```typescript
   const validation = updateCatalogBadgeSchema.safeParse(body);
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

5. **Not Found (404)**:
   ```typescript
   const badge = await service.updateCatalogBadge(id, command);
   if (!badge) {
     return new Response(JSON.stringify({
       error: 'not_found',
       message: 'Catalog badge not found'
     }), { status: 404 });
   }
   ```

6. **Authentication Check (401)** - Production Only:
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

7. **Authorization Check (403)** - Production Only:
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

8. **Database Errors (500)**:
   ```typescript
   try {
     const badge = await service.updateCatalogBadge(id, command);
   } catch (error) {
     console.error('Database error updating catalog badge:', error);
     return new Response(JSON.stringify({
       error: 'internal_error',
       message: 'An unexpected error occurred while updating the catalog badge'
     }), { status: 500 });
   }
   ```

9. **Top-Level Error Handler (500)**:
   ```typescript
   try {
     // ... all endpoint logic
   } catch (error) {
     console.error('Error in PUT /api/catalog-badges/:id:', error);
     return new Response(JSON.stringify({
       error: 'internal_error',
       message: 'An unexpected error occurred while updating the catalog badge'
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
1. **Primary Key Lookup**: Extremely fast O(log n) or O(1) with index
2. **Single Query**: One SELECT to check existence, one UPDATE
3. **Partial Update**: Only updates fields that are provided
4. **Indexed Column**: ID is primary key with automatic index

### Expected Performance
- **Typical Response Time**: < 50ms (local database)
- **Database SELECT**: < 10ms (primary key lookup)
- **Database UPDATE**: < 20ms (single row update with version increment)
- **Validation**: < 5ms (Zod schema validation)
- **JSON Parsing**: < 5ms (small payloads)

### Potential Bottlenecks

1. **Two Database Queries**:
   - **Issue**: SELECT to check existence, then UPDATE
   - **Alternative**: Use UPDATE with RETURNING, check if row count > 0
   - **Trade-off**: Simpler logic with two queries vs. optimization with one query

2. **Large Metadata Objects**:
   - **Issue**: Very large metadata JSONB could slow down update
   - **Mitigation**: Add size validation (e.g., max 10KB for metadata)

3. **Version Increment**:
   - **Issue**: Race condition if multiple updates happen simultaneously
   - **Mitigation**: Database handles version increment atomically
   - **Note**: Unlikely in this use case (admin-only, infrequent updates)

### Optimization Strategies

1. **Database**:
   - ✅ Use Supabase query builder (optimized)
   - ✅ Primary key index already exists (automatic)
   - ✅ Use RETURNING clause to get updated badge in one query
   - ✅ Let database handle version increment atomically

2. **Validation**:
   - ✅ Use Zod for efficient validation
   - ✅ Fail fast - validate before database query
   - ✅ Cache Zod schemas (defined at module level)

3. **Response**:
   - ✅ Small payload (single badge object)
   - ✅ Efficient JSON serialization
   - ✅ No unnecessary data transformation

4. **Alternative Approach** (More Efficient):
   Instead of SELECT then UPDATE, use UPDATE with RETURNING and check affected rows:
   ```typescript
   // Single query approach
   const { data, error } = await this.supabase
     .from('catalog_badges')
     .update({ ...updateFields, version: sql`version + 1` })
     .eq('id', id)
     .select('*')
     .single();

   if (error?.code === 'PGRST116') {
     return null; // Not found
   }
   ```

5. **Future Enhancements**:
   - Add caching for frequently accessed badges
   - Add request rate limiting per user
   - Implement optimistic locking with version check
   - Add request ID for distributed tracing

## 9. Implementation Steps

### Step 1: Create/Extend Validation Schema

**File**: `src/lib/validation/catalog-badge.validation.ts` (extend existing file)

```typescript
/**
 * Validation schema for PUT /api/catalog-badges/:id
 *
 * Validates all fields for updating a catalog badge.
 * All fields are optional for partial updates.
 */
export const updateCatalogBadgeSchema = z.object({
  // Optional: Badge title (if provided, non-empty, max 200 chars)
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title must be at most 200 characters")
    .optional(),

  // Optional: Detailed description (max 2000 chars)
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .optional(),

  // Optional: Badge category (enum)
  category: z.enum(["technical", "organizational", "softskilled"]).optional(),

  // Optional: Badge level (enum)
  level: z.enum(["gold", "silver", "bronze"]).optional(),

  // Optional: Metadata (JSON object)
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateCatalogBadgeSchema = z.infer<typeof updateCatalogBadgeSchema>;
```

### Step 2: Add Service Method

**File**: `src/lib/catalog-badge.service.ts` (extend existing class)

```typescript
import type { UpdateCatalogBadgeCommand } from '@/types';

/**
 * Updates an existing catalog badge
 *
 * @param id - Badge UUID
 * @param command - Badge update data (partial)
 * @returns Updated catalog badge if found, null if not found
 * @throws Error if database update fails
 */
async updateCatalogBadge(id: string, command: UpdateCatalogBadgeCommand): Promise<CatalogBadgeDetailDto | null> {
  // Step 1: Check if badge exists
  const { data: existingBadge, error: fetchError } = await this.supabase
    .from('catalog_badges')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      // PostgREST error code for no rows returned
      return null;
    }
    throw new Error(`Failed to fetch catalog badge: ${fetchError.message}`);
  }

  // Step 2: Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {};

  if (command.title !== undefined) updateData.title = command.title;
  if (command.description !== undefined) updateData.description = command.description;
  if (command.category !== undefined) updateData.category = command.category;
  if (command.level !== undefined) updateData.level = command.level;
  if (command.metadata !== undefined) updateData.metadata = command.metadata as Json;

  // Step 3: Update badge and increment version
  const { data, error } = await this.supabase
    .from('catalog_badges')
    .update({
      ...updateData,
      version: existingBadge.version + 1,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update catalog badge: ${error.message}`);
  }

  return data as CatalogBadgeDetailDto;
}
```

**Alternative Single-Query Approach** (More Efficient):

```typescript
async updateCatalogBadge(id: string, command: UpdateCatalogBadgeCommand): Promise<CatalogBadgeDetailDto | null> {
  // Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {};

  if (command.title !== undefined) updateData.title = command.title;
  if (command.description !== undefined) updateData.description = command.description;
  if (command.category !== undefined) updateData.category = command.category;
  if (command.level !== undefined) updateData.level = command.level;
  if (command.metadata !== undefined) updateData.metadata = command.metadata as Json;

  // First, get current version
  const { data: current } = await this.supabase
    .from('catalog_badges')
    .select('version')
    .eq('id', id)
    .single();

  if (!current) {
    return null; // Badge not found
  }

  // Update badge and increment version in single query
  const { data, error } = await this.supabase
    .from('catalog_badges')
    .update({
      ...updateData,
      version: current.version + 1,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found (race condition)
    }
    throw new Error(`Failed to update catalog badge: ${error.message}`);
  }

  return data as CatalogBadgeDetailDto;
}
```

### Step 3: Add PUT Handler to API Route

**File**: `src/pages/api/catalog-badges/[id].ts` (add PUT handler to existing file)

```typescript
import { updateCatalogBadgeSchema } from '@/lib/validation/catalog-badge.validation';

/**
 * PUT /api/catalog-badges/:id
 *
 * Updates an existing catalog badge (admin only).
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication and admin check before production deployment
 *
 * Path Parameters:
 * - id: Catalog badge UUID
 *
 * Request Body (all fields optional):
 * - title: Badge title (max 200 chars, cannot be empty if provided)
 * - description: Badge description (max 2000 chars)
 * - category: Badge category (enum: technical/organizational/softskilled)
 * - level: Badge level (enum: gold/silver/bronze)
 * - metadata: Additional metadata (JSON object)
 *
 * @returns 200 OK with updated catalog badge details
 * @returns 400 Bad Request if validation fails or UUID is invalid
 * @returns 404 Not Found if badge doesn't exist
 * @returns 401 Unauthorized if not authenticated (production)
 * @returns 403 Forbidden if not admin (production)
 * @returns 500 Internal Server Error on unexpected errors
 */
export const PUT: APIRoute = async (context) => {
  try {
    // =========================================================================
    // Step 1: Extract and Validate ID Parameter
    // =========================================================================
    const { id } = context.params;

    // Validate UUID format
    const uuidValidation = uuidSchema.safeParse(id);

    if (!uuidValidation.success) {
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
    // Step 2: Parse Request Body
    // =========================================================================
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
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
    // Step 3: Validate Request Body
    // =========================================================================
    const validation = updateCatalogBadgeSchema.safeParse(body);

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

    // =========================================================================
    // PRODUCTION CODE (Currently Disabled)
    // =========================================================================
    // Uncomment the code below when authentication is ready:
    /*
    // Step 4: Authentication Check
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

    // Step 5: Get User Info (Admin Status)
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

    // Step 6: Authorization Check (Admin Only)
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
    */

    // =========================================================================
    // Step 7: Update Badge via Service
    // =========================================================================
    const service = new CatalogBadgeService(context.locals.supabase);
    const badge = await service.updateCatalogBadge(uuidValidation.data, command);

    // =========================================================================
    // Step 8: Handle Not Found
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
    // Step 9: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badge), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Unexpected Errors
    // =========================================================================
    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error('Error in PUT /api/catalog-badges/:id:', error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: 'internal_error',
      message: 'An unexpected error occurred while updating the catalog badge',
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

1. **Valid Update - Single Field**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{"title": "PostgreSQL Expert (Updated)"}'
   ```
   Expected: 200 OK with updated badge data, version incremented

2. **Valid Update - Multiple Fields**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "PostgreSQL Master",
       "description": "Expert-level PostgreSQL knowledge",
       "metadata": {"difficulty": "expert"}
     }'
   ```
   Expected: 200 OK with all fields updated, version incremented

3. **Valid Update - All Fields**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "PostgreSQL Guru",
       "description": "Master-level PostgreSQL expertise",
       "category": "technical",
       "level": "gold",
       "metadata": {"skills": ["SQL", "optimization"], "difficulty": "master"}
     }'
   ```
   Expected: 200 OK with complete update

4. **Badge Not Found**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999" \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Title"}'
   ```
   Expected: 404 Not Found

5. **Invalid UUID**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/invalid-id" \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Title"}'
   ```
   Expected: 400 Bad Request with UUID validation error

6. **Empty Title**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{"title": ""}'
   ```
   Expected: 400 Bad Request with validation error

7. **Title Too Long**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{"title": "'$(python3 -c 'print("A" * 201)')'"}'
   ```
   Expected: 400 Bad Request with length validation error

8. **Invalid Category**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{"category": "invalid_category"}'
   ```
   Expected: 400 Bad Request with enum validation error

9. **Invalid JSON**:
   ```bash
   curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
     -H "Content-Type: application/json" \
     -d '{invalid json'
   ```
   Expected: 400 Bad Request with JSON parsing error

10. **Empty Body** (Optional - may or may not be enforced):
    ```bash
    curl -X PUT "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001" \
      -H "Content-Type: application/json" \
      -d '{}'
    ```
    Expected: 200 OK (no changes) OR 400 Bad Request (if enforced)

### Step 5: Browser Testing

Test in browser console:

```javascript
// Test 1: Update single field
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'PostgreSQL Expert (Updated)'
  })
})
  .then(res => {
    console.log('Status:', res.status); // Should be 200
    return res.json();
  })
  .then(data => console.log('Updated badge:', data));

// Test 2: Update multiple fields
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'PostgreSQL Master',
    description: 'Expert-level PostgreSQL knowledge',
    metadata: { difficulty: 'expert' }
  })
})
  .then(res => res.json())
  .then(data => console.log('Updated badge:', data));

// Test 3: Not found
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Updated' })
})
  .then(res => {
    console.log('Status:', res.status); // Should be 404
    return res.json();
  })
  .then(data => console.log('Error:', data));

// Test 4: Invalid category
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ category: 'invalid' })
})
  .then(res => res.json())
  .then(data => console.log('Validation error:', data));

// Test 5: Empty title
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: '' })
})
  .then(res => res.json())
  .then(data => console.log('Validation error:', data));
```

### Step 6: Update Testing Guide

Add PUT endpoint test scenarios to `.ai/catalog-badges-testing-guide.md`.

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

- [ ] UUID validation with Zod (path parameter)
- [ ] Request body validation with Zod (all fields optional)
- [ ] Proper error handling (400, 404, 401, 403, 500)
- [ ] Service method added to CatalogBadgeService
- [ ] PUT handler added to API route
- [ ] JSDoc comments added to all functions
- [ ] TypeScript types used correctly
- [ ] Error logging (console.error with eslint-disable)
- [ ] Generic error messages to client
- [ ] No authentication (development mode noted with TODOs)
- [ ] Version increment handled correctly
- [ ] Badge existence check before update
- [ ] Partial update support (only provided fields updated)
- [ ] Cannot update status field (business rule)
- [ ] Build passes without errors
- [ ] Linting passes without errors
- [ ] Manual testing completed
- [ ] Testing guide updated

## 11. Integration with Existing Code

### Dependencies
- ✅ Extends existing `CatalogBadgeService` class
- ✅ Uses existing `ApiError` type
- ✅ Uses existing `UpdateCatalogBadgeCommand` type
- ✅ Uses existing `CatalogBadgeDetailDto` type
- ✅ Uses existing Supabase client from context
- ✅ Follows same patterns as GET and POST endpoints
- ✅ Reuses `uuidSchema` from GET [id] endpoint

### File Structure
```
src/
├── lib/
│   ├── catalog-badge.service.ts (add updateCatalogBadge method)
│   └── validation/
│       └── catalog-badge.validation.ts (add updateCatalogBadgeSchema)
├── pages/
│   └── api/
│       └── catalog-badges/
│           ├── index.ts (existing - GET list, POST create)
│           └── [id].ts (extend - GET detail, add PUT update)
└── types.ts (existing - no changes needed)
```

## 12. Future Enhancements

1. **Authentication**: Re-enable when auth system is ready
2. **Optimistic Locking**: Check version before update to prevent conflicts
3. **Audit Logging**: Log badge updates in audit_logs table with before/after values
4. **Change Tracking**: Store historical versions in separate table
5. **Partial Update Validation**: Require at least one field to be provided
6. **Metadata Schema**: Add JSON schema validation for metadata structure
7. **Batch Updates**: Support updating multiple badges in one request
8. **Dry Run Mode**: Preview changes before applying
9. **Status Change Endpoint**: Separate endpoint for status changes (reactivation)
10. **Field History**: Track which fields changed and when

## 13. Business Rules

### Update Rules

1. **Version Increment**: Version automatically incremented on every update
2. **Immutable Fields**: Cannot update `id`, `created_by`, `created_at`, `status`
3. **Status Management**: Use deactivate endpoint to change status
4. **Partial Updates**: All fields optional, only provided fields updated
5. **Badge Existence**: Must exist before update (404 if not found)

### Validation Rules

1. **Title**: If provided, cannot be empty, max 200 characters
2. **Description**: If provided, max 2000 characters
3. **Category**: If provided, must be valid enum value
4. **Level**: If provided, must be valid enum value
5. **Metadata**: If provided, must be valid JSON object

### Historical Integrity

1. **Version Tracking**: Each update increments version
2. **Application References**: Existing badge applications reference old versions
3. **No Retroactive Changes**: Historical applications unaffected by updates
4. **Version Snapshot**: Badge applications store `catalog_badge_version`

## 14. Differences from POST Endpoint

| Feature | POST /api/catalog-badges | PUT /api/catalog-badges/:id |
|---------|--------------------------|----------------------------|
| Method | POST | PUT |
| URL | /api/catalog-badges | /api/catalog-badges/:id |
| Path Param | None | UUID (required) |
| Body Fields | All required except metadata | All optional (partial update) |
| Response | 201 Created | 200 OK |
| Database | INSERT | UPDATE |
| Version | Set to 1 | Increment by 1 |
| Not Found | N/A | Returns 404 |
| UUID Validation | N/A | Required for path param |
| created_by | Set from current user | Immutable |
| status | Set to 'active' | Immutable (use deactivate endpoint) |

## 15. Summary

This endpoint enables administrators to update existing badge definitions in the catalog. The implementation follows RESTful conventions with proper validation, error handling, versioning, and security considerations. The service layer pattern ensures business logic is separated from the API route handler.

**Key Implementation Points**:
- ✅ UUID path parameter validation
- ✅ Partial update support (all fields optional)
- ✅ Comprehensive Zod validation with detailed error messages
- ✅ Proper status code usage (200 for update, 404 for not found)
- ✅ Service layer separation for database operations
- ✅ Automatic version increment
- ✅ Badge existence check before update
- ✅ Clear error messages for all validation failures
- ✅ Consistent with existing endpoint patterns
- ✅ Ready for authentication when needed
- ✅ Immutable field protection
- ✅ Full TypeScript type safety

**Estimated Implementation Time**: 45-60 minutes

**Testing Time**: 25-35 minutes

**Total Time**: ~1.5 hours

---

## Appendix A: Complete Validation Matrix

| Field | Required | Type | Min | Max | Default | Enum Values | Notes |
|-------|----------|------|-----|-----|---------|-------------|-------|
| id (path) | Yes | UUID | - | - | - | - | Must be valid UUID |
| title | No | string | 1 | 200 | - | - | If provided, cannot be empty |
| description | No | string | 0 | 2000 | - | - | Optional |
| category | No | string | - | - | - | technical, organizational, softskilled | If provided, must be valid enum |
| level | No | string | - | - | - | gold, silver, bronze | If provided, must be valid enum |
| metadata | No | object | - | - | - | - | JSON object |
| status | No | - | - | - | - | - | Cannot be updated via this endpoint |
| version | No | - | - | - | - | - | Auto-incremented by system |
| created_by | No | - | - | - | - | - | Immutable |

## Appendix B: HTTP Status Code Reference

| Code | Name | Usage in This Endpoint |
|------|------|------------------------|
| 200 | OK | Badge successfully updated |
| 400 | Bad Request | Validation errors, invalid JSON, invalid UUID |
| 401 | Unauthorized | Not authenticated (production only) |
| 403 | Forbidden | Not admin (production only) |
| 404 | Not Found | Badge not found |
| 500 | Internal Server Error | Database errors, unexpected errors |
