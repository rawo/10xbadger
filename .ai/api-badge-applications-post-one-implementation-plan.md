# API Endpoint Implementation Plan: POST /api/badge-applications

## 1. Endpoint Overview

This endpoint creates a new badge application in draft status for the authenticated user. The application references a catalog badge and captures application dates and optional justification. The system automatically sets the applicant to the current user and captures the catalog badge version for historical integrity, allowing badges to be updated without affecting existing applications.

**Key Features**:
- Create badge application in draft status
- Automatic applicant_id assignment from session
- Catalog badge version snapshot for historical integrity
- Date validation with optional fulfillment date
- Optional justification field
- Returns complete badge application details

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/badge-applications`
- **Authentication**: Required (session-based)
- **Authorization**: All authenticated users can create badge applications

### Request Body

**Content-Type**: `application/json`

#### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `catalog_badge_id` | string (UUID) | Valid UUID, must exist and be active | Reference to catalog badge |
| `date_of_application` | string | ISO date (YYYY-MM-DD) | When application was made |

#### Optional Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `date_of_fulfillment` | string | ISO date (YYYY-MM-DD), must be >= date_of_application | When badge requirements were fulfilled |
| `reason` | string | Max 2000 characters | Justification for badge application |

### Request Examples

**Minimal Request**:
```json
{
  "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
  "date_of_application": "2025-01-15"
}
```

**Complete Request**:
```json
{
  "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project that improved query performance by 40%. Implemented advanced indexing strategies and query optimization techniques."
}
```

## 3. Used Types

### From `src/types.ts`

**Command Types**:
- `CreateBadgeApplicationCommand` - Request payload type
  ```typescript
  interface CreateBadgeApplicationCommand {
    catalog_badge_id: string;
    date_of_application: string; // ISO date string (YYYY-MM-DD)
    date_of_fulfillment?: string; // ISO date string (YYYY-MM-DD)
    reason?: string;
  }
  ```

**Response Types**:
- `BadgeApplicationRow` - Database row type (response)

**Error Types**:
- `ApiError` - Standard error response structure
- `ValidationErrorDetail` - Field-level validation errors

### New Validation Schema to Create

**File**: `src/lib/validation/badge-application.validation.ts`

```typescript
export const createBadgeApplicationSchema = z.object({
  catalog_badge_id: z.string().uuid("Invalid catalog badge ID format"),
  date_of_application: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
  date_of_fulfillment: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD").optional(),
  reason: z.string().max(2000, "Reason must be at most 2000 characters").optional(),
}).refine(
  (data) => {
    if (!data.date_of_fulfillment) return true;
    return data.date_of_fulfillment >= data.date_of_application;
  },
  {
    message: "Date of fulfillment must be on or after date of application",
    path: ["date_of_fulfillment"],
  }
);
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440101",
  "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project that improved query performance by 40%",
  "status": "draft",
  "submitted_at": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "review_reason": null,
  "created_at": "2025-01-30T15:45:00Z",
  "updated_at": "2025-01-30T15:45:00Z"
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

#### 400 Bad Request - Invalid JSON
```json
{
  "error": "validation_error",
  "message": "Invalid JSON in request body"
}
```

#### 400 Bad Request - Validation Errors
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "catalog_badge_id",
      "message": "Invalid catalog badge ID format"
    },
    {
      "field": "date_of_fulfillment",
      "message": "Date of fulfillment must be on or after date of application"
    }
  ]
}
```

#### 400 Bad Request - Catalog Badge Not Found or Inactive
```json
{
  "error": "invalid_reference",
  "message": "Catalog badge not found or is not active"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while creating the badge application"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/badge-applications
       │ Body: { catalog_badge_id, date_of_application, ... }
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/badge-applications/index.ts          │
│                                                      │
│  1. Parse request body JSON                         │
│  2. Check authentication (context.locals.supabase)  │
│  3. Get user info (id)                              │
│  4. Validate request body (Zod schema)              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│         BadgeApplicationService                     │
│  src/lib/badge-application.service.ts               │
│                                                      │
│  createBadgeApplication(command, userId)            │
│  1. Validate catalog badge exists and is active     │
│  2. Fetch catalog_badge_version                     │
│  3. Insert badge_applications record:               │
│     - applicant_id = userId                         │
│     - catalog_badge_version from badge              │
│     - status = 'draft'                              │
│     - All fields from command                       │
│  4. Return created badge application                │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│                                                      │
│  1. Query: catalog_badges WHERE id = :id            │
│     - Validate exists and status = 'active'         │
│     - Get version field                             │
│  2. Insert: badge_applications                      │
│     - All fields including captured version         │
│  3. Return: Inserted row with all fields            │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database                      │
│                                                      │
│  Tables:                                            │
│  - catalog_badges (for validation & version)        │
│  - badge_applications (insert new record)           │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Created badge application
┌─────────────────────────────────────────────────────┐
│           API Route Handler                         │
│                                                      │
│  1. Return JSON response with 201 status            │
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
- **Access Control**: All authenticated users can create badge applications for themselves
- **Applicant Assignment**: Server-side enforcement - applicant_id set from session, never from request body
- **No Elevation**: Users cannot create applications on behalf of others

### Input Validation
- **UUID Validation**:
  - Validate catalog_badge_id is proper UUID format
  - Prevents malformed database queries
- **Date Validation**:
  - Validate ISO date format (YYYY-MM-DD)
  - Ensure date_of_fulfillment >= date_of_application
  - Prevents invalid date ranges
- **String Length**:
  - Enforce max 2000 characters on reason field
  - Prevents database overflow and DoS
- **SQL Injection Prevention**:
  - Use Supabase query builder (parameterized queries)
  - Never concatenate user input into SQL strings

### Business Logic Validation
- **Catalog Badge Validation**:
  - Verify catalog badge exists before creating application
  - Verify catalog badge is active (status = 'active')
  - Return 400 Bad Request if validation fails
- **Version Capture**:
  - Capture catalog_badge_version for historical integrity
  - Allows badge definitions to change without affecting existing applications

### Data Integrity
- **Server-Side Fields**:
  - applicant_id set from authenticated user
  - catalog_badge_version fetched from database
  - status always set to 'draft'
  - created_at and updated_at set by database
- **Immutable on Create**:
  - submitted_at, reviewed_by, reviewed_at, review_reason all null on creation

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling |
|----------|-------------|------------|----------|
| User not authenticated | 401 | `unauthorized` | Return error immediately, don't process request |
| Invalid JSON body | 400 | `validation_error` | Try-catch on JSON parsing, return clear error |
| Missing required fields | 400 | `validation_error` | Zod validation, return field-level errors |
| Invalid UUID format | 400 | `validation_error` | Zod validation with custom message |
| Invalid date format | 400 | `validation_error` | Zod regex validation with custom message |
| Invalid date range | 400 | `validation_error` | Zod refinement with path to date_of_fulfillment |
| Reason too long | 400 | `validation_error` | Zod max length validation |
| Catalog badge not found | 400 | `invalid_reference` | Service checks before insert, return specific error |
| Catalog badge inactive | 400 | `invalid_reference` | Service checks status, return specific error |
| Database connection error | 500 | `internal_error` | Log error, return generic message |
| Database insert error | 500 | `internal_error` | Log error, return generic message |

### Error Handling Strategy

1. **JSON Parsing Errors (400)**:
   - Wrap `context.request.json()` in try-catch
   - Return clear error message about invalid JSON
   - Don't proceed with validation

2. **Validation Errors (400)**:
   - Use Zod schema with safeParse
   - Collect all validation errors
   - Return structured error with field-level details
   - Include helpful error messages for each field

3. **Authentication Errors (401)**:
   - Check authentication before any processing
   - Return immediately if not authenticated
   - Use consistent error message

4. **Business Logic Errors (400)**:
   - Validate catalog badge exists and is active in service
   - Return clear error about invalid reference
   - Distinguish between not found and inactive

5. **Database Errors (500)**:
   - Catch all database exceptions
   - Log full error details server-side (console.error)
   - Return generic error message to client
   - Don't expose database structure or query details

6. **Unexpected Errors (500)**:
   - Wrap entire handler in try-catch
   - Log unexpected errors with full context
   - Return generic error message

## 8. Performance Considerations

### Potential Bottlenecks
1. **Catalog Badge Validation**: Extra query to validate badge exists and get version
2. **Database Insert**: Single insert operation should be fast
3. **Network Round Trips**: Two database operations (select + insert)

### Optimization Strategies

1. **Database Indexes** (Already in schema):
   - Primary key index on `catalog_badges.id` for validation query
   - Foreign key index on `badge_applications.catalog_badge_id`
   - Foreign key index on `badge_applications.applicant_id`

2. **Query Optimization**:
   - Fetch only needed fields from catalog badge (id, status, version)
   - Use `.single()` for catalog badge lookup
   - Single insert operation for badge application

3. **Validation Efficiency**:
   - Validate request body before database queries
   - Early return on validation failures
   - Minimize database round trips

4. **Response Optimization**:
   - Return created record directly from insert
   - No additional queries needed after insert
   - Response is small (single badge application)

5. **Caching Considerations** (Future Enhancement):
   - Consider caching catalog badge status and version with short TTL
   - Invalidate on catalog badge updates
   - Reduces validation query overhead

### Expected Performance
- **Validation Query**: < 20ms (indexed lookup)
- **Insert Operation**: < 50ms (single row insert)
- **Total Response Time**: < 100ms for successful creation

## 9. Implementation Steps

### Step 1: Add Validation Schema
**File**: `src/lib/validation/badge-application.validation.ts`

```typescript
import { z } from "zod";

/**
 * Validation schema for POST /api/badge-applications
 *
 * Validates all fields for creating a new badge application.
 * Uses Zod for runtime type checking and validation.
 */
export const createBadgeApplicationSchema = z
  .object({
    // Required: Catalog badge reference (UUID)
    catalog_badge_id: z.string().uuid("Invalid catalog badge ID format"),

    // Required: Date when application was made (ISO date)
    date_of_application: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),

    // Optional: Date when badge requirements were fulfilled (ISO date)
    date_of_fulfillment: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .optional(),

    // Optional: Justification for badge application (max 2000 chars)
    reason: z.string().max(2000, "Reason must be at most 2000 characters").optional(),
  })
  .refine(
    (data) => {
      // If date_of_fulfillment is not provided, validation passes
      if (!data.date_of_fulfillment) return true;
      // If provided, it must be >= date_of_application
      return data.date_of_fulfillment >= data.date_of_application;
    },
    {
      message: "Date of fulfillment must be on or after date of application",
      path: ["date_of_fulfillment"],
    }
  );

/**
 * Inferred TypeScript type from the create badge application schema
 */
export type CreateBadgeApplicationSchema = z.infer<typeof createBadgeApplicationSchema>;
```

### Step 2: Add Service Method
**File**: `src/lib/badge-application.service.ts`

Add to existing `BadgeApplicationService` class:

```typescript
import type { CreateBadgeApplicationCommand } from "@/types";

/**
 * Creates a new badge application in draft status
 *
 * Validates catalog badge exists and is active, captures badge version,
 * and creates application with applicant_id from userId.
 *
 * @param command - Badge application creation data
 * @param userId - Current user's ID (applicant)
 * @returns Created badge application with all fields
 * @throws Error with message 'CATALOG_BADGE_NOT_FOUND' if badge doesn't exist
 * @throws Error with message 'CATALOG_BADGE_INACTIVE' if badge is not active
 * @throws Error if database operation fails
 */
async createBadgeApplication(
  command: CreateBadgeApplicationCommand,
  userId: string
): Promise<BadgeApplicationRow> {
  // Step 1: Validate catalog badge exists and is active, get version
  const { data: catalogBadge, error: badgeError } = await this.supabase
    .from("catalog_badges")
    .select("id, status, version")
    .eq("id", command.catalog_badge_id)
    .single();

  if (badgeError) {
    // Handle "not found" vs actual errors
    if (badgeError.code === "PGRST116") {
      throw new Error("CATALOG_BADGE_NOT_FOUND");
    }
    throw new Error(`Failed to fetch catalog badge: ${badgeError.message}`);
  }

  // Step 2: Check if catalog badge is active
  if (catalogBadge.status !== "active") {
    throw new Error("CATALOG_BADGE_INACTIVE");
  }

  // Step 3: Create badge application
  const { data, error } = await this.supabase
    .from("badge_applications")
    .insert({
      applicant_id: userId,
      catalog_badge_id: command.catalog_badge_id,
      catalog_badge_version: catalogBadge.version,
      date_of_application: command.date_of_application,
      date_of_fulfillment: command.date_of_fulfillment || null,
      reason: command.reason || null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create badge application: ${error.message}`);
  }

  return data as BadgeApplicationRow;
}
```

### Step 3: Add POST Handler to Existing Route
**File**: `src/pages/api/badge-applications/index.ts`

Add POST export to the existing file (currently only has GET):

```typescript
import { BadgeApplicationService } from "@/lib/badge-application.service";
import { createBadgeApplicationSchema } from "@/lib/validation/badge-application.validation";
import type { ApiError } from "@/types";

/**
 * POST /api/badge-applications
 *
 * Creates a new badge application in draft status.
 *
 * ⚠️  DEVELOPMENT MODE: Authentication is currently DISABLED
 * TODO: Re-enable authentication before production deployment
 *
 * Request Body:
 * - catalog_badge_id: Catalog badge UUID (required)
 * - date_of_application: ISO date (required)
 * - date_of_fulfillment: ISO date (optional, must be >= date_of_application)
 * - reason: Justification text (optional, max 2000 chars)
 *
 * Development Mode Behavior:
 * - No authentication required
 * - Default user ID is used as applicant
 *
 * Production Authorization (when enabled):
 * - All authenticated users can create badge applications
 * - Applicant is automatically set to current user
 *
 * @returns 201 Created with badge application details
 * @returns 400 Bad Request if validation fails or catalog badge not found/inactive
 * @returns 401 Unauthorized if not authenticated (production)
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
    } catch {
      const apiError: ApiError = {
        error: "validation_error",
        message: "Invalid JSON in request body",
      };
      return new Response(JSON.stringify(apiError), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // Step 2: Validate Request Body
    // =========================================================================
    const validation = createBadgeApplicationSchema.safeParse(body);

    if (!validation.success) {
      const error: ApiError = {
        error: "validation_error",
        message: "Validation failed",
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

    const command = validation.data;

    // =========================================================================
    // DEVELOPMENT MODE: Authentication Disabled
    // =========================================================================
    // TODO: Re-enable authentication before production deployment
    // For now, use a default user ID as applicant

    const userId = "550e8400-e29b-41d4-a716-446655440101"; // Default user (John Doe)

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
        error: "unauthorized",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    */

    // =========================================================================
    // Step 4: Create Badge Application via Service
    // =========================================================================
    const service = new BadgeApplicationService(context.locals.supabase);
    const badgeApplication = await service.createBadgeApplication(command, userId);

    // =========================================================================
    // Step 5: Return Success Response
    // =========================================================================
    return new Response(JSON.stringify(badgeApplication), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // =========================================================================
    // Error Handling: Business Logic and Database Errors
    // =========================================================================

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === "CATALOG_BADGE_NOT_FOUND" || error.message === "CATALOG_BADGE_INACTIVE") {
        const apiError: ApiError = {
          error: "invalid_reference",
          message: "Catalog badge not found or is not active",
        };
        return new Response(JSON.stringify(apiError), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log error for debugging (server-side only)
    // eslint-disable-next-line no-console
    console.error("Error in POST /api/badge-applications:", error);

    // Return generic error to client (don't expose internal details)
    const apiError: ApiError = {
      error: "internal_error",
      message: "An unexpected error occurred while creating the badge application",
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

1. **Valid Request - Minimal Fields**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
       "date_of_application": "2025-01-30"
     }'
   ```
   Expected: 201 Created with badge application details

2. **Valid Request - All Fields**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
       "date_of_application": "2025-01-25",
       "date_of_fulfillment": "2025-01-30",
       "reason": "Completed advanced database optimization project"
     }'
   ```
   Expected: 201 Created with all fields populated

3. **Invalid Catalog Badge ID**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "not-a-uuid",
       "date_of_application": "2025-01-30"
     }'
   ```
   Expected: 400 Bad Request with UUID validation error

4. **Invalid Date Format**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
       "date_of_application": "01/30/2025"
     }'
   ```
   Expected: 400 Bad Request with date format error

5. **Invalid Date Range**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30",
       "date_of_application": "2025-01-30",
       "date_of_fulfillment": "2025-01-20"
     }'
   ```
   Expected: 400 Bad Request with date range validation error

6. **Non-Existent Catalog Badge**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "00000000-0000-0000-0000-000000000000",
       "date_of_application": "2025-01-30"
     }'
   ```
   Expected: 400 Bad Request with catalog badge not found error

7. **Missing Required Field**:
   ```bash
   curl -X POST http://localhost:3000/api/badge-applications \
     -H "Content-Type: application/json" \
     -d '{
       "catalog_badge_id": "be3dcc60-3fcb-4161-996c-46a9e976cf30"
     }'
   ```
   Expected: 400 Bad Request with missing field error

8. **Reason Too Long**:
   ```bash
   # Create a 2001-character string and test
   Expected: 400 Bad Request with max length error
   ```

### Step 5: Add Integration Tests
Create test file `src/pages/api/badge-applications/index.test.ts` (when test framework is configured):

```typescript
import { describe, it, expect } from 'vitest';

describe('POST /api/badge-applications', () => {
  it('should return 401 when not authenticated', async () => {
    // Test implementation
  });

  it('should create badge application with minimal fields', async () => {
    // Test implementation
  });

  it('should create badge application with all fields', async () => {
    // Test implementation
  });

  it('should set status to draft', async () => {
    // Test implementation
  });

  it('should capture catalog badge version', async () => {
    // Test implementation
  });

  it('should set applicant_id from session', async () => {
    // Test implementation
  });

  it('should return 400 for invalid UUID', async () => {
    // Test implementation
  });

  it('should return 400 for invalid date format', async () => {
    // Test implementation
  });

  it('should return 400 for invalid date range', async () => {
    // Test implementation
  });

  it('should return 400 for non-existent catalog badge', async () => {
    // Test implementation
  });

  it('should return 400 for inactive catalog badge', async () => {
    // Test implementation
  });

  it('should return 400 for reason exceeding 2000 chars', async () => {
    // Test implementation
  });

  it('should return 400 for missing required fields', async () => {
    // Test implementation
  });

  it('should return 400 for invalid JSON', async () => {
    // Test implementation
  });
});
```

### Step 6: Documentation
Update API documentation to include:
- Request body field descriptions and constraints
- Example requests for all scenarios
- Response structure with field descriptions
- Error scenarios with status codes and messages
- Business logic (version capture, draft status)

### Step 7: Monitoring and Logging
Add logging for:
- Failed catalog badge validations
- Invalid date ranges
- Database errors with full context
- Successful creations (aggregate metrics)

Consider using a logging service or application performance monitoring (APM) tool in production.

## 10. Future Enhancements

1. **Auto-Complete Suggestions**: Suggest reason text based on badge category and previous applications
2. **Draft Auto-Save**: Periodically save draft applications as user types (client-side feature)
3. **Badge Templates**: Pre-filled templates for common badge types
4. **Duplicate Detection**: Warn if user has existing application for same badge
5. **Date Validation Enhancement**: Validate dates are not in future (business rule decision needed)
6. **Bulk Creation**: Allow creating multiple applications at once
7. **File Attachments**: Support evidence/documentation files (out of MVP scope)
8. **Validation Rules**: Badge-specific validation rules based on category
9. **Application Drafts List**: Endpoint to list user's draft applications
10. **Rate Limiting**: Prevent users from creating too many applications in short period
