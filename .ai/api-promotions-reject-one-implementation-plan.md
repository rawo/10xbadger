# API Endpoint Implementation Plan: POST /api/promotions/:id/reject

## 1. Endpoint Overview

This endpoint allows administrators to reject submitted promotions. Upon rejection, the promotion status transitions to 'rejected', rejection metadata is recorded, and all associated badge reservations are unlocked by removing promotion_badges records and reverting badge application statuses.

**Key Characteristics:**
- Admin-only operation
- Operates on promotions in 'submitted' status
- Unlocks badge reservations for reuse
- Reverts badge application status to 'accepted'
- Records rejection reason for audit trail

**Business Context:**
This is a critical administrative workflow that provides feedback on promotions that don't meet requirements. Unlike approval, rejection unlocks badges so they can be reused in other promotion applications, allowing the employee to iterate and resubmit.

---

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/promotions/:id/reject`

Where `:id` is the UUID of the promotion to reject.

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID format | Promotion identifier to reject |

**Validation Schema (Zod):**
```typescript
const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});
```

### Request Headers
- `Content-Type`: application/json
- Session/Auth cookie (authentication handled by middleware/locals)

### Request Body

**Schema:**
```json
{
  "reject_reason": "string"
}
```

**Field Validation:**
- `reject_reason` (required): String explaining why promotion was rejected
  - Must be non-empty (min length: 1)
  - Maximum length: 2000 characters
  - Used for feedback to promotion creator

**Validation Schema (Zod):**
```typescript
const rejectBodySchema = z.object({
  reject_reason: z.string()
    .min(1, "Reject reason is required")
    .max(2000, "Reject reason must not exceed 2000 characters")
    .trim(),
});
```

**Example Request Body:**
```json
{
  "reject_reason": "Insufficient evidence for technical leadership competency. Please provide more detailed examples of projects led."
}
```

---

## 3. Used Types

### DTOs and Response Types

**From `src/types.ts`:**

```typescript
// Request Command
interface RejectPromotionCommand {
  reject_reason: string;
}

// Response DTO
type PromotionRow = Tables<"promotions">; // Full promotion record

// Error Response Types
interface ApiError {
  error: string;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
}

interface InvalidStatusError extends ApiError {
  current_status: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Service Method Signature

**New method to add to `PromotionService`:**

```typescript
async rejectPromotion(
  promotionId: string,
  adminUserId: string,
  rejectReason: string
): Promise<PromotionRow>
```

---

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "rejected",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T18:30:00Z",
  "approved_at": null,
  "approved_by": null,
  "rejected_at": "2025-01-23T09:00:00Z",
  "rejected_by": "550e8400-e29b-41d4-a716-446655440002",
  "reject_reason": "Insufficient evidence for technical leadership",
  "executed": false
}
```

**Response Headers:**
- `Content-Type: application/json`

### Error Responses

#### 400 Bad Request - Invalid Input

**Scenario 1: Invalid UUID Format**
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
}
```

**Scenario 2: Missing Reject Reason**
```json
{
  "error": "validation_error",
  "message": "Reject reason is required"
}
```

**Scenario 3: Reject Reason Too Long**
```json
{
  "error": "validation_error",
  "message": "Reject reason must not exceed 2000 characters"
}
```

#### 401 Unauthorized - Not Authenticated
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden - Not Admin
```json
{
  "error": "forbidden",
  "message": "Only admins may reject promotions"
}
```

#### 404 Not Found - Promotion Not Found
```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

#### 409 Conflict - Invalid Status Transition
```json
{
  "error": "invalid_status",
  "message": "Only submitted promotions can be rejected",
  "current_status": "draft"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while rejecting the promotion"
}
```

---

## 5. Data Flow

### High-Level Flow

```
1. Client → POST /api/promotions/:id/reject with { reject_reason }
2. API Route Handler:
   ├─ Extract & validate promotion ID (UUID)
   ├─ Parse and validate request body (reject_reason)
   ├─ Authenticate user (context.locals.supabase.auth.getUser())
   ├─ Verify admin status (query users table)
   └─ Call PromotionService.rejectPromotion(id, adminUserId, rejectReason)
3. PromotionService.rejectPromotion():
   ├─ Fetch promotion record
   ├─ Validate status === 'submitted'
   ├─ Update promotion (status, rejected_by, rejected_at, reject_reason)
   ├─ Get promotion_badges to find badge_application_ids
   ├─ Delete promotion_badges records (unlocks badges)
   ├─ Update badge_applications status from 'used_in_promotion' to 'accepted'
   └─ Return updated promotion
4. API Route Handler → Return 200 with promotion record
```

### Database Interactions

**Tables Involved:**
1. `users` - Fetch admin status
2. `promotions` - Fetch and update promotion record
3. `promotion_badges` - Get badge IDs, then delete records
4. `badge_applications` - Update status back to 'accepted'

**Query Sequence:**

```sql
-- 1. Fetch user admin status (in route handler)
SELECT is_admin FROM users WHERE id = $adminUserId;

-- 2. Fetch promotion and validate (in service)
SELECT id, status FROM promotions WHERE id = $promotionId;

-- 3. Update promotion (with race condition check)
UPDATE promotions
SET
  status = 'rejected',
  rejected_by = $adminUserId,
  rejected_at = NOW(),
  reject_reason = $rejectReason
WHERE id = $promotionId
  AND status = 'submitted'  -- Prevents race condition
RETURNING *;

-- 4. Get badge application IDs from promotion_badges
SELECT badge_application_id
FROM promotion_badges
WHERE promotion_id = $promotionId;

-- 5. Delete promotion_badges records (unlocks badges)
DELETE FROM promotion_badges
WHERE promotion_id = $promotionId;

-- 6. Revert badge application statuses to 'accepted'
UPDATE badge_applications
SET status = 'accepted'
WHERE id IN ($badgeApplicationIds)
  AND status = 'used_in_promotion';
```

### State Transitions

**Promotion Status:**
- Before: `status = 'submitted'`
- After: `status = 'rejected'`

**Promotion Metadata:**
- `rejected_by`: NULL → admin user ID
- `rejected_at`: NULL → current timestamp
- `reject_reason`: NULL → provided reason text
- `executed`: remains false

**Promotion Badges:**
- All records: DELETED (CASCADE removes reservations)

**Badge Applications:**
- Status: `'used_in_promotion'` → `'accepted'`
- Badges become available for reuse in other promotions

---

## 6. Security Considerations

### Authentication
- **Requirement:** User must be authenticated
- **Implementation:** Use `context.locals.supabase.auth.getUser()`
- **Error Response:** 401 Unauthorized if not authenticated
- **Development Mode:** Skip authentication, use hardcoded admin ID

### Authorization
- **Requirement:** Only administrators can reject promotions
- **Implementation:**
  1. Fetch user record from `users` table
  2. Check `is_admin = true`
- **Error Response:** 403 Forbidden if not admin
- **Development Mode:** Skip check, assume admin

### Data Validation

**Input Validation:**
- Promotion ID must be valid UUID format
- `reject_reason` must be non-empty string
- `reject_reason` must not exceed 2000 characters
- Use Zod schemas to validate

**Business Logic Validation:**
- Promotion must exist (404 if not found)
- Promotion must be in 'submitted' status (409 if not)
- Cannot reject draft, approved, or already rejected promotions

### Race Condition Prevention

**Scenario:** Two admins try to reject the same promotion simultaneously

**Mitigation:**
```typescript
// Include status check in WHERE clause of UPDATE
.update({ status: 'rejected', ... })
.eq("id", promotionId)
.eq("status", "submitted")  // ← Prevents race condition
```

If status has changed between fetch and update, the update will affect 0 rows and should fail gracefully.

### Data Integrity

**Atomic Operations:**
- Update promotion, delete promotion_badges, update badge_applications in sequence
- If badge update fails, log error but don't rollback (badges can be manually fixed)
- Consider using Supabase RPC for true transactions if needed

**Idempotency:**
- If promotion is already rejected, should return 409 (not idempotent by design)
- Prevents accidental double-rejection

### Security Threats & Mitigations

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Authorization bypass | Non-admin rejects promotion | Check `is_admin` flag before rejection |
| Status manipulation | Reject draft/approved promotion | Validate `status = 'submitted'` |
| Race condition | Concurrent rejections | Use status check in WHERE clause |
| Badge lock exploitation | Badges remain locked | Delete promotion_badges to unlock |
| SQL injection | Data breach/manipulation | Use parameterized queries |
| XSS in reject_reason | Client-side attacks | Validate length, escape on display |
| Privilege escalation | User modifies admin flag | Read admin status from DB, don't trust client |

---

## 7. Error Handling

### Error Categories

#### 1. Validation Errors (400)

**Scenario 1:** Invalid promotion ID format
- **Detection:** Zod validation fails on UUID
- **Response:**
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
}
```

**Scenario 2:** Missing reject_reason
- **Detection:** Zod validation fails on required field
- **Response:**
```json
{
  "error": "validation_error",
  "message": "Reject reason is required"
}
```

**Scenario 3:** Reject reason too long
- **Detection:** Zod validation fails on max length
- **Response:**
```json
{
  "error": "validation_error",
  "message": "Reject reason must not exceed 2000 characters"
}
```

#### 2. Authentication Errors (401)
**Scenario:** User not authenticated

**Detection:** `context.locals.supabase.auth.getUser()` returns error or no user

**Response:**
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**Development Mode:** Skip this check

#### 3. Authorization Errors (403)
**Scenario:** User is not admin

**Detection:** User record has `is_admin = false`

**Response:**
```json
{
  "error": "forbidden",
  "message": "Only admins may reject promotions"
}
```

**Development Mode:** Skip this check

#### 4. Not Found Errors (404)
**Scenario:** Promotion doesn't exist

**Detection:** Service throws "Promotion not found" error

**Response:**
```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

#### 5. Conflict Errors (409)
**Scenario:** Promotion not in submitted status

**Detection:** Service throws error with "status" in message

**Response:**
```json
{
  "error": "invalid_status",
  "message": "Only submitted promotions can be rejected",
  "current_status": "draft"
}
```

#### 6. Server Errors (500)
**Scenario:** Database error, unexpected exception

**Detection:** Catch-all error handler

**Action:**
- Log error to console
- Log to audit_logs table via `logError()`
- Return generic error message

**Response:**
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while rejecting the promotion"
}
```

### Error Logging Strategy

**When to Log:**
- All 500 errors (unexpected errors)
- Optionally: authorization failures for security monitoring

**Log Details:**
```typescript
await logError(context.locals.supabase, {
  route: "/api/promotions/:id/reject",
  error_code: "REJECTION_FAILED",
  message: error.message,
  payload: {
    promotion_id: promotionId,
    admin_user_id: adminUserId,
    reject_reason: rejectReason
  },
  requester_id: adminUserId,
});
```

**Error Log Table:** `audit_logs` (as per db-plan.md)

### Error Recovery

**Non-Critical Failures:**
- If badge_applications update fails after promotion update succeeds:
  - Log warning to console
  - Promotion rejection still succeeds
  - Badges can be manually reverted to 'accepted' later

**Critical Failures:**
- If promotion update fails:
  - Entire operation fails
  - Return 500 error
  - No partial state

---

## 8. Performance Considerations

### Database Queries

**Query Count:** 5-6 queries per request
1. Get authenticated user (1 query)
2. Get user admin status (1 query)
3. Fetch and validate promotion (1 query)
4. Update promotion (1 query)
5. Get badge application IDs (1 query)
6. Delete promotion_badges (1 query)
7. Update badge_applications (1 query)

**Total:** ~6-7 database round trips

### Optimization Opportunities

#### 1. Reduce Admin Check Query
**Current:** Separate query to fetch `is_admin`

**Optimization:**
- Cache admin status in session/JWT
- Or use RLS policies to enforce admin-only access at DB level

#### 2. Batch Badge Updates
**Current:** Get badge IDs, then delete promotion_badges, then update badge_applications

**Optimization:**
- Use PostgreSQL RPC function for atomic transaction
- Example: `rpc('reject_promotion', { promotion_id, admin_user_id, reject_reason })`

#### 3. Index Coverage
**Required Indexes (already in db-plan.md):**
- `promotions(id)` - Primary key (automatic)
- `promotions(status)` - For status filtering
- `promotion_badges(promotion_id)` - For badge lookup
- `badge_applications(id)` - For status updates

### Potential Bottlenecks

#### 1. Large Badge Counts
**Scenario:** Promotion with 100+ badges

**Impact:** DELETE and UPDATE queries could be slow

**Mitigation:**
- Index on `promotion_id` ensures fast lookup
- Batch operations are single SQL statements
- Unlikely to be a bottleneck unless thousands of badges

#### 2. Concurrent Rejections
**Scenario:** Multiple admins reviewing promotions simultaneously

**Impact:** Database lock contention on promotions table

**Mitigation:**
- PostgreSQL MVCC handles this well
- Status check in WHERE clause prevents conflicts
- Minimal lock time (single row update)

### Scalability Considerations

**Current Design:**
- Synchronous operation (waits for DB updates)
- Acceptable for MVP with < 1000 promotions/month

**Future Enhancements:**
- Async rejection processing with job queue
- Event-driven architecture (publish "promotion.rejected" event)
- Batch rejection operations for admins

---

## 9. Implementation Steps

### Step 1: Create Endpoint Route File
**File:** `src/pages/api/promotions/[id]/reject.ts`

**Tasks:**
1. Create file structure following Astro API route pattern
2. Import dependencies: `APIRoute`, `z`, `PromotionService`, `logError`, types
3. Define Zod validation schemas for ID and body
4. Export POST handler function

**Code Structure:**
```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { PromotionService } from "@/lib/promotion.service";
import type { ApiError, RejectPromotionCommand } from "@/types";
import { logError } from "@/lib/error-logger";

const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

const rejectBodySchema = z.object({
  reject_reason: z.string()
    .min(1, "Reject reason is required")
    .max(2000, "Reject reason must not exceed 2000 characters")
    .trim(),
});

export const POST: APIRoute = async (context) => {
  // Implementation in next steps
};
```

### Step 2: Implement Authentication and Authorization
**Location:** Inside POST handler

**Tasks:**
1. Get authenticated user via `context.locals.supabase.auth.getUser()`
2. Handle authentication errors (401)
3. Fetch user record to get `is_admin` status
4. Handle user not found (401)
5. Validate `is_admin = true` (403 if false)

**Development Mode:**
```typescript
// DEVELOPMENT MODE: Skip authentication
const adminUserId = "550e8400-e29b-41d4-a716-446655440100"; // Test admin user

// TODO: Production auth code:
// const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
// if (authError || !user) return 401;
// const { data: userData } = await context.locals.supabase.from('users').select('is_admin').eq('id', user.id).single();
// if (!userData?.is_admin) return 403;
```

### Step 3: Validate Inputs
**Location:** After authentication

**Tasks:**
1. Extract promotion ID from `context.params.id`
2. Validate with Zod schema
3. Parse request body
4. Validate body with Zod schema
5. Handle validation errors (400)

**Error Handling:**
- Return 400 with validation error messages
- Include field-level details if applicable

### Step 4: Implement Service Method
**File:** `src/lib/promotion.service.ts`

**Method Name:** `rejectPromotion(promotionId: string, adminUserId: string, rejectReason: string): Promise<PromotionRow>`

**Tasks:**
1. Fetch promotion record by ID
2. Validate promotion exists (throw "Promotion not found")
3. Validate status is 'submitted' (throw with status info)
4. Update promotion record:
   - Set `status = 'rejected'`
   - Set `rejected_by = adminUserId`
   - Set `rejected_at = NOW()`
   - Set `reject_reason = rejectReason`
   - Use `.eq("status", "submitted")` to prevent race conditions
5. Get badge application IDs from promotion_badges
6. Delete promotion_badges records (unlocks badges)
7. Update badge_applications status to 'accepted'
8. Return updated promotion record

**Error Handling:**
- Throw specific error messages for route handler to parse
- Handle Supabase errors gracefully
- Log non-critical failures (badge update issues)

**Code Template:**
```typescript
async rejectPromotion(
  promotionId: string,
  adminUserId: string,
  rejectReason: string
): Promise<PromotionRow> {
  // Step 1: Fetch and validate promotion
  const { data: promotion, error: fetchError } = await this.supabase
    .from("promotions")
    .select("id, status")
    .eq("id", promotionId)
    .single();

  if (fetchError || !promotion) {
    throw new Error(`Promotion not found: ${promotionId}`);
  }

  if (promotion.status !== "submitted") {
    throw new Error(`Only submitted promotions can be rejected. Current status: ${promotion.status}`);
  }

  // Step 2: Update promotion (with race condition prevention)
  const { data: updatedPromotion, error: updateError } = await this.supabase
    .from("promotions")
    .update({
      status: "rejected",
      rejected_by: adminUserId,
      rejected_at: new Date().toISOString(),
      reject_reason: rejectReason,
    })
    .eq("id", promotionId)
    .eq("status", "submitted") // Prevents race condition
    .select()
    .single();

  if (updateError || !updatedPromotion) {
    throw new Error("Failed to reject promotion (may have been already processed)");
  }

  // Step 3: Get badge application IDs
  const { data: promotionBadges, error: badgesError } = await this.supabase
    .from("promotion_badges")
    .select("badge_application_id")
    .eq("promotion_id", promotionId);

  if (badgesError) {
    // eslint-disable-next-line no-console
    console.warn("Failed to fetch promotion badges:", badgesError);
  }

  const badgeApplicationIds = promotionBadges?.map(pb => pb.badge_application_id) || [];

  // Step 4: Delete promotion_badges records (unlocks badges)
  const { error: deleteError } = await this.supabase
    .from("promotion_badges")
    .delete()
    .eq("promotion_id", promotionId);

  if (deleteError) {
    // Non-critical: Log but don't fail
    // eslint-disable-next-line no-console
    console.warn("Failed to delete promotion badges:", deleteError);
  }

  // Step 5: Revert badge application statuses to 'accepted'
  if (badgeApplicationIds.length > 0) {
    const { error: revertError } = await this.supabase
      .from("badge_applications")
      .update({ status: "accepted" })
      .in("id", badgeApplicationIds)
      .eq("status", "used_in_promotion");

    if (revertError) {
      // Non-critical: Log but don't fail
      // eslint-disable-next-line no-console
      console.warn("Failed to revert badge statuses:", revertError);
    }
  }

  // Step 6: Return updated promotion
  return updatedPromotion as PromotionRow;
}
```

### Step 5: Call Service from Route Handler
**Location:** Inside POST handler, after validation

**Tasks:**
1. Instantiate `PromotionService` with `context.locals.supabase`
2. Call `rejectPromotion(promotionId, adminUserId, rejectReason)`
3. Handle success: return 200 with promotion record
4. Catch and handle service errors

**Error Handling:**
- Parse error message to determine error type
- Return appropriate status code and error response
- Log unexpected errors

**Code Structure:**
```typescript
try {
  const service = new PromotionService(context.locals.supabase);
  const rejectedPromotion = await service.rejectPromotion(
    promotionId,
    adminUserId,
    command.reject_reason
  );

  return new Response(
    JSON.stringify(rejectedPromotion),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
} catch (error) {
  // Error handling in next step
}
```

### Step 6: Implement Error Handling
**Location:** Catch block in POST handler

**Tasks:**
1. Extract error message
2. Check for specific error patterns:
   - "not found" → 404
   - "Current status" → 409 with current_status
   - Other → 500
3. Log 500 errors to audit_logs
4. Return appropriate error response

**Error Parsing Logic:**
```typescript
const errorMessage = error instanceof Error ? error.message : "Unknown error";

// Not found (404)
if (errorMessage.includes("not found")) {
  return new Response(
    JSON.stringify({
      error: "not_found",
      message: "Promotion not found",
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}

// Invalid status (409)
if (errorMessage.includes("Current status")) {
  const statusMatch = errorMessage.match(/Current status: (\w+)/);
  const currentStatus = statusMatch ? statusMatch[1] : "unknown";

  return new Response(
    JSON.stringify({
      error: "invalid_status",
      message: "Only submitted promotions can be rejected",
      current_status: currentStatus,
    }),
    { status: 409, headers: { "Content-Type": "application/json" } }
  );
}

// Unexpected error (500)
console.error("Error rejecting promotion:", error);
await logError(context.locals.supabase, {
  route: "/api/promotions/:id/reject",
  error_code: "REJECTION_FAILED",
  message: errorMessage,
  payload: {
    promotion_id: promotionId,
    admin_user_id: adminUserId,
    reject_reason: rejectReason,
  },
  requester_id: adminUserId,
});

return new Response(
  JSON.stringify({
    error: "internal_error",
    message: "An unexpected error occurred while rejecting the promotion",
  }),
  { status: 500, headers: { "Content-Type": "application/json" } }
);
```

### Step 7: Add JSDoc Documentation
**Location:** Top of route file and service method

**Tasks:**
1. Add endpoint documentation comment at top of route file
2. Add method documentation comment for `rejectPromotion()`
3. Document parameters, return types, and error scenarios

**Example:**
```typescript
/**
 * POST /api/promotions/:id/reject
 *
 * Rejects a submitted promotion (admin only)
 * Unlocks badge reservations and reverts badge statuses
 *
 * Request:
 *   - Path Parameter: id (UUID) - Promotion ID
 *   - Body: { reject_reason: string } (required, max 2000 chars)
 *   - Authentication: Required (admin only)
 *
 * Response (200 OK):
 *   - Full promotion record with status='rejected' and rejection metadata
 *
 * Error Responses:
 *   - 400 Bad Request: Invalid promotion ID or reject reason
 *   - 401 Unauthorized: Not authenticated
 *   - 403 Forbidden: User is not admin
 *   - 404 Not Found: Promotion not found
 *   - 409 Conflict: Promotion not in submitted status
 *   - 500 Internal Server Error: Database or unexpected error
 */
```

### Step 8: Testing Preparation
**Manual Testing Checklist:**

1. **Happy Path:**
   - [ ] Admin can reject submitted promotion
   - [ ] Response contains rejection metadata
   - [ ] Promotion status is 'rejected'
   - [ ] Promotion_badges records are deleted
   - [ ] Badge applications reverted to 'accepted' status

2. **Authentication:**
   - [ ] Unauthenticated request returns 401
   - [ ] Non-admin request returns 403

3. **Validation:**
   - [ ] Invalid UUID returns 400
   - [ ] Missing reject_reason returns 400
   - [ ] Reject reason > 2000 chars returns 400
   - [ ] Non-existent promotion returns 404

4. **Business Logic:**
   - [ ] Draft promotion returns 409
   - [ ] Already rejected promotion returns 409
   - [ ] Approved promotion returns 409

5. **Race Conditions:**
   - [ ] Concurrent rejections handled gracefully

**Test Data Setup:**
```sql
-- Create test promotion in submitted status
INSERT INTO promotions (id, template_id, created_by, path, from_level, to_level, status, submitted_at)
VALUES (
  '850e8400-e29b-41d4-a716-446655440030',
  '750e8400-e29b-41d4-a716-446655440020',
  '550e8400-e29b-41d4-a716-446655440000',
  'technical',
  'S1',
  'S2',
  'submitted',
  NOW()
);

-- Create test admin user
UPDATE users SET is_admin = true WHERE id = '550e8400-e29b-41d4-a716-446655440100';
```

### Step 9: Update Implementation Documentation
**File:** `.ai/api-promotions-reject-one-implementation-plan.md` (this document)

**Tasks:**
1. Mark implementation as complete
2. Document any deviations from plan
3. Note lessons learned
4. Update with production deployment notes if applicable

---

## 10. Implementation Checklist

- [ ] Create route file: `src/pages/api/promotions/[id]/reject.ts`
- [ ] Implement authentication check (skip in dev mode)
- [ ] Implement authorization check (admin only - skip in dev mode)
- [ ] Implement promotion ID validation
- [ ] Implement reject_reason validation
- [ ] Add `rejectPromotion()` method to `PromotionService`
- [ ] Implement promotion fetch and validation
- [ ] Implement promotion update with race condition prevention
- [ ] Implement promotion_badges deletion (unlock badges)
- [ ] Implement badge_applications status revert to 'accepted'
- [ ] Implement error handling for all scenarios
- [ ] Implement error logging for 500 errors
- [ ] Add JSDoc documentation to route and service
- [ ] Manual testing against test database
- [ ] Verify badge unlocking in database
- [ ] Verify badge status reversion
- [ ] Verify promotion status transitions correctly
- [ ] Test authentication and authorization
- [ ] Test concurrent rejection scenarios
- [ ] Code review and feedback incorporation
- [ ] Merge to main branch

---

## 11. Notes and Considerations

### Authentication Implementation
**Current State:** Development mode uses hardcoded test user ID

**Production Migration:**
- Replace test user ID with actual authentication
- Use `context.locals.user` from middleware
- Ensure session/JWT contains user ID and admin flag

**Migration Steps:**
```typescript
// BEFORE (Development):
const adminUserId = "550e8400-e29b-41d4-a716-446655440100";

// AFTER (Production):
const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({ error: "unauthorized", message: "Authentication required" }),
    { status: 401 });
}
const userId = user.id;
```

### Badge Unlocking Strategy
**Current Approach:** Delete promotion_badges records

**Alternative Approach:** Set `consumed = false` instead of deleting

**Chosen Strategy: DELETE**
- Simpler: One operation removes the reservation
- Cleaner: No orphaned records in junction table
- Consistent: CASCADE delete is automatic when promotion is deleted

### Transaction Considerations
**Current Approach:** Sequential updates (promotion, delete badges, update badge statuses)

**Risk:** If badge status update fails, promotion is already rejected but badges remain locked

**Mitigation:**
- Non-critical warning logged
- Badges can be manually unlocked via admin panel
- Consider RPC function for true transaction in future

**Future Enhancement:**
```sql
CREATE OR REPLACE FUNCTION reject_promotion(
  p_promotion_id UUID,
  p_admin_user_id UUID,
  p_reject_reason TEXT
) RETURNS promotions AS $$
DECLARE
  v_badge_ids UUID[];
BEGIN
  -- Atomic transaction
  UPDATE promotions SET ... WHERE id = p_promotion_id AND status = 'submitted';

  -- Get badge IDs
  SELECT ARRAY_AGG(badge_application_id) INTO v_badge_ids
  FROM promotion_badges WHERE promotion_id = p_promotion_id;

  -- Delete promotion_badges
  DELETE FROM promotion_badges WHERE promotion_id = p_promotion_id;

  -- Revert badge statuses
  UPDATE badge_applications SET status = 'accepted'
  WHERE id = ANY(v_badge_ids) AND status = 'used_in_promotion';

  RETURN (SELECT * FROM promotions WHERE id = p_promotion_id);
END;
$$ LANGUAGE plpgsql;
```

### Audit Trail
**Captured Automatically:**
- `rejected_by` - Admin user ID
- `rejected_at` - Timestamp of rejection
- `reject_reason` - Explanation for rejection

**Future Enhancements:**
- Detailed audit log entry in `audit_logs` table
- Track admin actions for compliance
- Include IP address, user agent in audit log

### Notification System (Future)
**When promotion is rejected:**
- Notify promotion creator via email/in-app notification
- Include reject_reason for transparency
- Link to promotion details page

---

## Appendix: Related Documentation

### API Specification
- Source: `.ai/api-plan.md`, Lines 1598-1654
- Endpoint: `POST /api/promotions/:id/reject`

### Database Schema
- Source: `.ai/db-plan.md`
- Tables: `promotions`, `promotion_badges`, `badge_applications`

### Type Definitions
- Source: `src/types.ts`
- Types: `PromotionRow`, `RejectPromotionCommand`, `ApiError`, `InvalidStatusError`

### Existing Service
- Source: `src/lib/promotion.service.ts`
- Reference method: `approvePromotion()` (similar validation pattern)

### Existing Endpoint Pattern
- Source: `src/pages/api/promotions/[id]/approve.ts`
- Pattern: Admin-only action endpoint with similar structure

### Error Logger
- Source: `src/lib/error-logger.ts`
- Function: `logError(supabase, options)`

---

**Plan Version:** 1.0
**Created:** 2025-11-04
**Last Updated:** 2025-11-04
**Status:** Ready for Implementation
