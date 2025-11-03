# API Endpoint Implementation Plan: POST /api/promotions/:id/submit

## 1. Endpoint Overview

This endpoint submits a draft promotion for admin review. It validates that the promotion meets all template requirements before allowing submission. Upon successful validation, it transitions the promotion status from `draft` to `submitted`, sets the submission timestamp, and updates all associated badge applications to mark them as used.

**Purpose:**
- Enable users to submit completed promotions for review
- Enforce template compliance before submission (exact-match validation)
- Finalize badge reservations by marking them as used
- Make promotions read-only after submission
- Track submission timestamp for audit purposes

**Key Features:**
- Template validation using exact-match logic (no level equivalence)
- Automatic badge application status updates
- Atomic transaction to ensure data consistency
- Detailed error messages for validation failures
- Idempotent operation (re-submitting submitted promotion returns 409)

**Important Note:** User request indicated GET method, but API specification shows **POST**. This is a state-changing operation (draft → submitted), so POST is correct.

## 2. Request Details

**HTTP Method:** POST

**URL Structure:** `/api/promotions/:id/submit`

**Path Parameters:**
- `id` (UUID, required) - The promotion ID to submit

**Query Parameters:** None

**Request Headers:**
- `Content-Type`: application/json (not required, no body)
- Authentication header/cookie (handled by Astro middleware)

**Request Body:** None (this is a parameter-less POST operation)

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/promotions/850e8400-e29b-41d4-a716-446655440030/submit \
  -H "Cookie: session=..."
```

## 3. Used Types

**Input Types:**
- Path parameter `id`: string (validated as UUID)

**Output Types:**
- `PromotionRow` (successful submission response):
  ```typescript
  interface PromotionRow {
    id: string;
    template_id: string;
    created_by: string;
    path: string;
    from_level: string;
    to_level: string;
    status: PromotionStatusType; // 'submitted'
    created_at: string;
    submitted_at: string | null;
    approved_at: string | null;
    approved_by: string | null;
    rejected_at: string | null;
    rejected_by: string | null;
    reject_reason: string | null;
    executed: boolean;
  }
  ```

**Error Types:**
- `ValidationFailedError` (409 Conflict):
  ```typescript
  interface ValidationFailedError extends ApiError {
    missing: MissingBadge[];
  }

  interface MissingBadge {
    category: BadgeCategoryType | "any";
    level: BadgeLevelType;
    count: number;
  }
  ```

- `InvalidStatusError` (409 Conflict):
  ```typescript
  interface InvalidStatusError extends ApiError {
    current_status: string;
  }
  ```

- `ApiError` (standard error response)

**Internal Types:**
- `PromotionValidationResponse` - From `validatePromotion()` service method

## 4. Response Details

### Success Response (200 OK)

**Description:** Promotion successfully submitted for review

**Response Body:**
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
  "submitted_at": "2025-01-22T18:30:00Z",
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": false
}
```

### Error Responses

**400 Bad Request** - Invalid UUID format
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
}
```

**401 Unauthorized** - Not authenticated
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden** - User is not promotion creator
```json
{
  "error": "forbidden",
  "message": "You do not have permission to submit this promotion"
}
```

**404 Not Found** - Promotion doesn't exist
```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

**409 Conflict** - Invalid status (not draft)
```json
{
  "error": "invalid_status",
  "message": "Only draft promotions can be submitted",
  "current_status": "submitted"
}
```

**409 Conflict** - Template validation failed
```json
{
  "error": "validation_failed",
  "message": "Promotion does not meet template requirements",
  "missing": [
    {
      "category": "technical",
      "level": "silver",
      "count": 2
    },
    {
      "category": "any",
      "level": "gold",
      "count": 1
    }
  ]
}
```

**500 Internal Server Error** - Database or unexpected error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred"
}
```

## 5. Data Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/promotions/:id/submit
     │
     ▼
┌─────────────────┐
│ Astro Middleware│ ──► Authenticate user (future)
└────┬────────────┘     Extract userId
     │
     ▼
┌──────────────────┐
│  Route Handler   │ ──► Validate promotion ID (Zod)
│  (POST handler)  │     Extract path parameters
└────┬─────────────┘
     │
     ▼
┌─────────────────────┐
│  PromotionService   │
│  .submitPromotion   │
└────┬────────────────┘
     │
     ├─► Step 1: Fetch promotion
     │   └─► Query: promotions WHERE id = $1
     │       ├─► Check exists (404 if not)
     │       ├─► Check created_by = userId (403 if not)
     │       └─► Check status = 'draft' (409 if not)
     │
     ├─► Step 2: Run template validation
     │   └─► Call: validatePromotion(promotionId, userId)
     │       ├─► Fetch template rules
     │       ├─► Count badges by category/level
     │       ├─► Compare against requirements
     │       └─► Return validation result
     │
     ├─► Step 3: Check validation result
     │   └─► If is_valid = false:
     │       └─► Return 409 with missing[] array
     │
     ├─► Step 4: Start database transaction
     │   │
     │   ├─► Update promotion record
     │   │   └─► SET status = 'submitted',
     │   │       submitted_at = NOW()
     │   │   └─► WHERE id = $1 AND status = 'draft'
     │   │       (prevents race condition)
     │   │
     │   └─► Update badge applications
     │       └─► UPDATE badge_applications
     │           SET status = 'used_in_promotion'
     │           WHERE id IN (
     │             SELECT badge_application_id
     │             FROM promotion_badges
     │             WHERE promotion_id = $1
     │           )
     │
     ├─► Step 5: Commit transaction
     │
     ├─► Step 6: (Optional) Log to audit_logs
     │   └─► INSERT INTO audit_logs
     │       (actor_id, event_type, payload)
     │       VALUES ($1, 'promotion.submitted', {...})
     │
     └─► Step 7: Return updated promotion
         └─► Fetch fresh promotion data
             └─► Return PromotionRow
                 │
                 ▼
         ┌──────────────────┐
         │  Route Handler   │ ──► Return JSON response
         │  (Response)      │     HTTP 200 OK
         └────┬─────────────┘
              │
              ▼
         ┌──────────┐
         │  Client  │
         └──────────┘
```

## 6. Security Considerations

### Authentication
- **Requirement:** User must be authenticated
- **Implementation:** Handled by Astro middleware (future)
- **Development Mode:** Authentication disabled, using hardcoded test user

### Authorization
- **Requirement:** User can only submit their own promotions
- **Implementation:** Service checks `promotion.created_by === userId`
- **Error Response:** 403 Forbidden if user is not creator

### Input Validation
- **Promotion ID:** Validate UUID format using Zod schema
- **Sanitization:** UUID validation prevents injection attacks
- **Error Response:** 400 Bad Request for invalid format

### Transaction Safety
- **Race Condition Prevention:** Use WHERE clause with status check
  ```sql
  UPDATE promotions
  SET status = 'submitted', submitted_at = NOW()
  WHERE id = $1 AND status = 'draft'
  ```
- **Atomic Operations:** Use database transaction for consistency
- **Badge Reservation Integrity:** Ensure badges remain reserved throughout

### Data Integrity
- **Template Validation:** Mandatory before submission
- **Badge Status Consistency:** All badges marked as 'used_in_promotion'
- **Audit Trail:** Track submission timestamp and user

### RLS (Row Level Security)
- **Database Level:** RLS policies on promotions table enforce access control
- **Application Level:** Double-check authorization in service layer
- **Defense in Depth:** Multiple layers of security

## 7. Error Handling

### Error Scenarios and Status Codes

| Scenario | Status Code | Error Code | Message | Service Error |
|----------|-------------|------------|---------|---------------|
| Invalid promotion ID format | 400 | validation_error | Invalid promotion ID format | Zod validation error |
| Not authenticated | 401 | unauthorized | Authentication required | Middleware |
| Not promotion creator | 403 | forbidden | You do not have permission to submit this promotion | Service throws Error |
| Promotion not found | 404 | not_found | Promotion not found | Service throws Error |
| Promotion not draft | 409 | invalid_status | Only draft promotions can be submitted | Service throws Error with status |
| Template validation fails | 409 | validation_failed | Promotion does not meet template requirements | Service throws Error with missing[] |
| Database transaction fails | 500 | internal_error | An unexpected error occurred | Service throws Error |

### Error Handling Implementation

**Route Handler Pattern:**
```typescript
try {
  // Validate input
  const validation = promotionIdSchema.safeParse({ id: params.id });
  if (!validation.success) {
    return new Response(JSON.stringify({
      error: "validation_error",
      message: "Invalid promotion ID format"
    }), { status: 400 });
  }

  // Call service
  const result = await promotionService.submitPromotion(
    validation.data.id,
    userId
  );

  // Return success
  return new Response(JSON.stringify(result), { status: 200 });

} catch (error) {
  // Handle specific error types
  if (error.message.includes("not found")) {
    return new Response(JSON.stringify({
      error: "not_found",
      message: "Promotion not found"
    }), { status: 404 });
  }

  if (error.message.includes("permission")) {
    return new Response(JSON.stringify({
      error: "forbidden",
      message: error.message
    }), { status: 403 });
  }

  if (error.message.includes("draft")) {
    // Extract current status from error message
    return new Response(JSON.stringify({
      error: "invalid_status",
      message: error.message,
      current_status: extractStatus(error.message)
    }), { status: 409 });
  }

  if (error.message.includes("validation failed")) {
    // Parse missing badges from error
    return new Response(JSON.stringify({
      error: "validation_failed",
      message: "Promotion does not meet template requirements",
      missing: parseMissingBadges(error.message)
    }), { status: 409 });
  }

  // Unexpected errors
  return new Response(JSON.stringify({
    error: "internal_error",
    message: "An unexpected error occurred"
  }), { status: 500 });
}
```

**Service Error Handling:**
- Throws specific errors with context
- Includes status information in error messages
- Provides missing badges array for validation failures
- Caller maps errors to HTTP responses

## 8. Performance Considerations

### Database Operations
1. **Fetch promotion** (1 query):
   - SELECT with WHERE id = $1
   - Indexed on: `promotions.id` (primary key)
   - **Expected Time:** 5-10ms

2. **Run template validation** (2 queries):
   - Reuses `validatePromotion()` method
   - Promotion + template query: 5-10ms
   - Badge applications query: 10-20ms
   - **Expected Time:** 15-30ms

3. **Update promotion** (1 query in transaction):
   - UPDATE promotions SET status, submitted_at
   - **Expected Time:** 5-10ms

4. **Update badge applications** (1 query in transaction):
   - UPDATE badge_applications for multiple IDs
   - Batch update with WHERE IN clause
   - **Expected Time:** 10-20ms

5. **Fetch updated promotion** (1 query):
   - SELECT to return fresh data
   - **Expected Time:** 5-10ms

**Total Database Time:** 40-70ms

### Transaction Overhead
- **Transaction Begin/Commit:** 5-10ms
- **Lock Acquisition:** Minimal (single row lock)
- **Rollback Handling:** Automatic on error

**Total Transaction Time:** <10ms

### Overall Performance
- **Total Response Time:** 50-80ms (under 100ms target)
- **Optimization Opportunities:**
  - Combine final SELECT with UPDATE using RETURNING clause
  - Cache template validation results briefly
  - Use database function for batch badge updates (future)

### Caching Strategy (Future Enhancement)
- **Not applicable for submission** - State-changing operation
- **Template rules:** Can be cached (separate concern)
- **Validation results:** Cannot be cached (must be real-time)

## 9. Implementation Steps

### Step 1: Add Service Method to PromotionService

**File:** `src/lib/promotion.service.ts`

**Add new method:**
```typescript
/**
 * Submits a promotion for admin review
 *
 * Validates that promotion is in draft status, belongs to the user,
 * and meets all template requirements. Upon successful validation,
 * transitions promotion to submitted status and marks all badge
 * applications as used.
 *
 * @param promotionId - Promotion UUID to submit
 * @param userId - Current user ID (for authorization)
 * @returns Updated promotion with submitted status
 * @throws Error if promotion not found, not owned by user, not draft, or validation fails
 */
async submitPromotion(
  promotionId: string,
  userId: string
): Promise<PromotionRow>
```

**Implementation details:**
1. Fetch promotion with ownership/status check
2. Validate promotion is in draft status
3. Run template validation using `validatePromotion()`
4. Check validation result (is_valid = true)
5. If validation fails, throw error with missing badges
6. Begin database transaction:
   - Update promotion: status='submitted', submitted_at=NOW()
   - Update badge applications: status='used_in_promotion'
7. Commit transaction
8. Return updated promotion

**Validation Logic:**
```typescript
// Step 1: Fetch and validate promotion
const { data: promotion, error } = await this.supabase
  .from("promotions")
  .select("*")
  .eq("id", promotionId)
  .single();

if (error || !promotion) {
  throw new Error(`Promotion not found: ${promotionId}`);
}

if (promotion.created_by !== userId) {
  throw new Error("You do not have permission to submit this promotion");
}

if (promotion.status !== "draft") {
  throw new Error(
    `Only draft promotions can be submitted. Current status: ${promotion.status}`
  );
}

// Step 2: Run template validation
const validationResult = await this.validatePromotion(promotionId, userId, false);

if (!validationResult) {
  throw new Error("Failed to validate promotion");
}

if (!validationResult.is_valid) {
  // Throw error with missing badges for 409 response
  throw new Error(
    `Validation failed: ${JSON.stringify(validationResult.missing)}`
  );
}

// Step 3: Update in transaction
// (Transaction implementation details below)
```

**Transaction Implementation:**
```typescript
// Begin transaction (Supabase doesn't expose transactions directly)
// Alternative: Use multiple updates with status check

// Update promotion
const { data: updatedPromotion, error: updateError } = await this.supabase
  .from("promotions")
  .update({
    status: "submitted",
    submitted_at: new Date().toISOString(),
  })
  .eq("id", promotionId)
  .eq("status", "draft") // Prevents race condition
  .select()
  .single();

if (updateError || !updatedPromotion) {
  throw new Error("Failed to submit promotion (may have been already submitted)");
}

// Update badge applications
const { data: badges } = await this.supabase
  .from("promotion_badges")
  .select("badge_application_id")
  .eq("promotion_id", promotionId);

if (badges && badges.length > 0) {
  const badgeIds = badges.map(b => b.badge_application_id);

  await this.supabase
    .from("badge_applications")
    .update({ status: "used_in_promotion" })
    .in("id", badgeIds);
}

return updatedPromotion;
```

**Testing Notes:**
- Test with valid draft promotion (should succeed)
- Test with non-draft promotion (409 invalid_status)
- Test with incomplete promotion (409 validation_failed)
- Test with non-existent promotion (404)
- Test with different user (403)
- Test race condition (double submission)

### Step 2: Create API Route Handler

**File:** `src/pages/api/promotions/[id]/submit.ts`

**Create new file with POST handler:**

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { z } from "zod";

// Validation schema for promotion ID
const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

/**
 * POST /api/promotions/:id/submit
 *
 * Submits a draft promotion for admin review
 * Validates template compliance and updates status to submitted
 */
export const POST: APIRoute = async (context) => {
  // ===================================================================
  // Development Mode: Use test user credentials
  // ===================================================================
  // TODO: Replace with actual authentication when enabled
  const userId = "550e8400-e29b-41d4-a716-446655440100"; // Test user

  // ===================================================================
  // Step 1: Validate Promotion ID Format
  // ===================================================================
  const validation = promotionIdSchema.safeParse({ id: context.params.id });

  if (!validation.success) {
    const errorMessage = validation.error.errors[0]?.message || "Invalid promotion ID format";
    return new Response(
      JSON.stringify({
        error: "validation_error",
        message: errorMessage,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const promotionId = validation.data.id;

  // ===================================================================
  // Step 2: Submit Promotion via Service
  // ===================================================================
  try {
    const promotionService = new PromotionService(context.locals.supabase);
    const result = await promotionService.submitPromotion(promotionId, userId);

    // ===================================================================
    // Step 3: Return Success Response
    // ===================================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ===================================================================
    // Step 4: Handle Errors
    // ===================================================================
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Not found
    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Promotion not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Forbidden (not creator)
    if (errorMessage.includes("permission")) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: errorMessage,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Invalid status (not draft)
    if (errorMessage.includes("draft") && errorMessage.includes("Current status")) {
      const statusMatch = errorMessage.match(/Current status: (\w+)/);
      const currentStatus = statusMatch ? statusMatch[1] : "unknown";

      return new Response(
        JSON.stringify({
          error: "invalid_status",
          message: "Only draft promotions can be submitted",
          current_status: currentStatus,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validation failed
    if (errorMessage.includes("Validation failed")) {
      try {
        const missingMatch = errorMessage.match(/Validation failed: (.+)/);
        const missing = missingMatch ? JSON.parse(missingMatch[1]) : [];

        return new Response(
          JSON.stringify({
            error: "validation_failed",
            message: "Promotion does not meet template requirements",
            missing,
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch {
        return new Response(
          JSON.stringify({
            error: "validation_failed",
            message: "Promotion does not meet template requirements",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Unexpected error
    // eslint-disable-next-line no-console
    console.error("Error submitting promotion:", error);

    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

**Key Implementation Points:**
- Use Zod for UUID validation
- Handle multiple error types with specific responses
- Parse missing badges from error message for 409
- Use proper Content-Type headers
- Development mode with hardcoded user credentials

### Step 3: Manual Testing

**Create test script:** `.ai/test-promotions-submit.sh`

```bash
#!/bin/bash
# Test script for POST /api/promotions/:id/submit

# Test Data
PROMOTION_DRAFT="850e8400-e29b-41d4-a716-446655440030"
PROMOTION_SUBMITTED="850e8400-e29b-41d4-a716-446655440031"
PROMOTION_INCOMPLETE="850e8400-e29b-41d4-a716-446655440032"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "POST /api/promotions/:id/submit Tests"
echo "=========================================="
echo ""

# TEST 1: Submit valid draft promotion (success)
echo -e "${BLUE}TEST 1: Submit Valid Draft Promotion${NC}"
curl -s -X POST "http://localhost:3000/api/promotions/$PROMOTION_DRAFT/submit" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 2: Submit already submitted promotion (409 invalid_status)
echo -e "${BLUE}TEST 2: Submit Already Submitted Promotion${NC}"
curl -s -X POST "http://localhost:3000/api/promotions/$PROMOTION_SUBMITTED/submit" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 3: Submit incomplete promotion (409 validation_failed)
echo -e "${BLUE}TEST 3: Submit Incomplete Promotion${NC}"
curl -s -X POST "http://localhost:3000/api/promotions/$PROMOTION_INCOMPLETE/submit" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 4: Submit non-existent promotion (404)
echo -e "${BLUE}TEST 4: Submit Non-existent Promotion${NC}"
curl -s -X POST "http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-999999999999/submit" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 5: Invalid UUID format (400)
echo -e "${BLUE}TEST 5: Invalid UUID Format${NC}"
curl -s -X POST "http://localhost:3000/api/promotions/invalid-uuid/submit" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
```

**Test Scenarios:**
1. **Valid draft promotion:** Meets all requirements (200)
2. **Already submitted promotion:** Status not draft (409 invalid_status)
3. **Incomplete promotion:** Missing badges (409 validation_failed)
4. **Non-existent promotion:** Returns 404
5. **Invalid UUID format:** Returns 400
6. **Different owner:** User doesn't own promotion (403)
7. **Race condition:** Double submission attempt

### Step 4: Database Verification

**Verify submission worked correctly:**

```sql
-- Check promotion status and timestamps
SELECT
  id,
  status,
  created_at,
  submitted_at,
  created_by
FROM promotions
WHERE id = '850e8400-e29b-41d4-a716-446655440030';

-- Verify badge applications marked as used
SELECT
  ba.id,
  ba.status,
  cb.title,
  cb.category,
  cb.level
FROM badge_applications ba
JOIN catalog_badges cb ON ba.catalog_badge_id = cb.id
WHERE ba.id IN (
  SELECT badge_application_id
  FROM promotion_badges
  WHERE promotion_id = '850e8400-e29b-41d4-a716-446655440030'
);

-- Check audit log (if implemented)
SELECT
  event_type,
  actor_id,
  payload,
  created_at
FROM audit_logs
WHERE payload::text LIKE '%850e8400-e29b-41d4-a716-446655440030%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results:**
- Promotion status = 'submitted'
- submitted_at timestamp set to current time
- All badge applications status = 'used_in_promotion'

### Step 5: Build and Linting

**Run checks:**
```bash
# Type checking
pnpm astro check

# Linting
pnpm lint

# Build verification
pnpm build
```

**Expected Output:**
- No TypeScript errors
- No ESLint errors
- Build succeeds

**Fix any issues:**
```bash
# Auto-fix lint issues
pnpm lint:fix
```

### Step 6: Documentation

**Create test documentation:** `.ai/manual-testing-promotions-submit.md`

Document:
- Test scenarios executed
- Sample requests and responses
- Database verification queries
- Edge cases tested (race conditions, double submission)
- Performance measurements

**Update implementation summary:** `.ai/promotions-submit-implementation-summary.md`

Include:
- Service method signature
- Route handler structure
- Transaction handling approach
- Error mapping strategy
- Known limitations

## 10. Testing Checklist

### Functional Tests
- [ ] Valid draft promotion submits successfully (200)
- [ ] Status changes to 'submitted'
- [ ] submitted_at timestamp is set
- [ ] Badge applications marked as 'used_in_promotion'
- [ ] Already submitted promotion returns 409 with current_status
- [ ] Incomplete promotion returns 409 with missing[] array
- [ ] Non-existent promotion returns 404
- [ ] Invalid UUID format returns 400
- [ ] Non-owner attempt returns 403
- [ ] Double submission prevented (race condition)

### Validation Tests
- [ ] Template validation runs before submission
- [ ] Exact-match validation enforced (gold ≠ silver)
- [ ] "any" category matching works correctly
- [ ] Missing badges array correct in error response

### Security Tests
- [ ] UUID validation prevents injection attacks
- [ ] Authorization check enforced (creator only)
- [ ] RLS policies apply correctly
- [ ] Error messages don't leak sensitive information

### Transaction Tests
- [ ] Promotion update and badge updates are atomic
- [ ] Rollback on failure prevents partial state
- [ ] Race condition handled (status check in WHERE clause)
- [ ] No orphaned badge statuses after failure

### Edge Cases
- [ ] Promotion with no badges (validation should fail)
- [ ] Promotion exactly meeting requirements
- [ ] Promotion exceeding requirements
- [ ] Multiple simultaneous submission attempts
- [ ] Very large promotion (50+ badges)

## 11. Production Readiness

### Before Production Deployment
- [ ] Enable authentication (replace hardcoded test user)
- [ ] Verify RLS policies enabled on all tables
- [ ] Add rate limiting on endpoint
- [ ] Set up monitoring for submission failures
- [ ] Add comprehensive logging for audit trail
- [ ] Test with production-like data volumes
- [ ] Document API in external documentation
- [ ] Add endpoint to API versioning strategy

### Monitoring Metrics
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Submission success rate
- Validation failure rate
- Common validation failure reasons (for UX improvements)

### Future Enhancements
- Email notification on submission
- Webhook for submission events
- Batch submission endpoint (multiple promotions)
- Submission history timeline
- Submission rollback (return to draft)
- Partial submission with warnings

---

**End of Implementation Plan**
