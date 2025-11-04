# API Endpoint Implementation Plan: POST /api/promotions/:id/approve

## 1. Endpoint Overview

This endpoint allows administrators to approve submitted promotions. Upon approval, the promotion status transitions to 'approved', approval metadata is recorded, and all associated badge applications are permanently consumed (marked as used and cannot be reused in other promotions).

**Key Characteristics:**
- Admin-only operation
- Operates on promotions in 'submitted' status
- Final approval implies execution (MVP behavior: approval = execution)
- Atomically marks all promotion_badges as consumed
- Badge applications remain in 'used_in_promotion' status permanently

**Business Context:**
This is a critical administrative workflow that finalizes a promotion request. Once approved, the promotion becomes immutable and the badges are permanently consumed, preventing reuse in other promotion applications.

---

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/promotions/:id/approve`

Where `:id` is the UUID of the promotion to approve.

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID format | Promotion identifier to approve |

**Validation Schema (Zod):**
```typescript
const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});
```

### Request Headers
- `Content-Type`: application/json (standard, though no body required)
- Session/Auth cookie (authentication handled by middleware/locals)

### Request Body
**None** - This endpoint does not accept a request body.

---

## 3. Used Types

### DTOs and Response Types

**From `src/types.ts`:**

```typescript
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
```

### Service Method Signature

**New method to add to `PromotionService`:**

```typescript
async approvePromotion(
  promotionId: string,
  adminUserId: string
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
  "status": "approved",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T18:30:00Z",
  "approved_at": "2025-01-23T09:00:00Z",
  "approved_by": "550e8400-e29b-41d4-a716-446655440002",
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": true
}
```

**Response Headers:**
- `Content-Type: application/json`

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
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
  "message": "Only admins may approve promotions"
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
  "message": "Only submitted promotions can be approved",
  "current_status": "draft"
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while approving the promotion"
}
```

---

## 5. Data Flow

### High-Level Flow

```
1. Client → POST /api/promotions/:id/approve
2. API Route Handler:
   ├─ Extract & validate promotion ID (UUID)
   ├─ Authenticate user (context.locals.supabase.auth.getUser())
   ├─ Verify admin status (query users table)
   └─ Call PromotionService.approvePromotion(id, adminUserId)
3. PromotionService.approvePromotion():
   ├─ Fetch promotion record
   ├─ Validate status === 'submitted'
   ├─ Update promotion (status, approved_by, approved_at, executed)
   ├─ Update promotion_badges (consumed = true)
   └─ Return updated promotion
4. API Route Handler → Return 200 with promotion record
```

### Database Interactions

**Tables Involved:**
1. `users` - Fetch admin status
2. `promotions` - Fetch and update promotion record
3. `promotion_badges` - Update consumed flag for all badges

**Query Sequence:**

```sql
-- 1. Fetch user admin status
SELECT is_admin FROM users WHERE id = $adminUserId;

-- 2. Fetch promotion and validate
SELECT id, status FROM promotions WHERE id = $promotionId;

-- 3. Update promotion (with race condition check)
UPDATE promotions
SET
  status = 'approved',
  approved_by = $adminUserId,
  approved_at = NOW(),
  executed = true
WHERE id = $promotionId
  AND status = 'submitted'  -- Prevents race condition
RETURNING *;

-- 4. Update all promotion_badges
UPDATE promotion_badges
SET consumed = true
WHERE promotion_id = $promotionId;
```

### State Transitions

**Promotion Status:**
- Before: `status = 'submitted'`
- After: `status = 'approved'`

**Promotion Metadata:**
- `approved_by`: NULL → admin user ID
- `approved_at`: NULL → current timestamp
- `executed`: false → true (MVP: approval implies execution)

**Promotion Badges:**
- All records: `consumed = false` → `consumed = true`

**Badge Applications:**
- Status remains: `'used_in_promotion'` (no change)
- These badges are now permanently consumed and cannot be reused

---

## 6. Security Considerations

### Authentication
- **Requirement:** User must be authenticated
- **Implementation:** Use `context.locals.supabase.auth.getUser()`
- **Error Response:** 401 Unauthorized if not authenticated

### Authorization
- **Requirement:** Only administrators can approve promotions
- **Implementation:**
  1. Fetch user record from `users` table
  2. Check `is_admin = true`
- **Error Response:** 403 Forbidden if not admin

### Data Validation

**Input Validation:**
- Promotion ID must be valid UUID format
- Use Zod schema to validate

**Business Logic Validation:**
- Promotion must exist (404 if not found)
- Promotion must be in 'submitted' status (409 if not)
- Cannot approve draft, approved, or rejected promotions

### Race Condition Prevention

**Scenario:** Two admins try to approve the same promotion simultaneously

**Mitigation:**
```typescript
// Include status check in WHERE clause of UPDATE
.update({ status: 'approved', ... })
.eq("id", promotionId)
.eq("status", "submitted")  // ← Prevents race condition
```

If status has changed between fetch and update, the update will affect 0 rows and should fail gracefully.

### Data Integrity

**Atomic Operations:**
- Update promotion and promotion_badges in sequence
- If promotion_badges update fails, log error but don't rollback promotion (badges can be manually fixed)
- Consider using Supabase RPC for true transactions if needed

**Idempotency:**
- If promotion is already approved by this admin, should return 409 (not idempotent by design)
- Prevents accidental double-approval

### Security Threats & Mitigations

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Authorization bypass | Non-admin approves promotion | Check `is_admin` flag before approval |
| Status manipulation | Approve draft/rejected promotion | Validate `status = 'submitted'` |
| Race condition | Concurrent approvals | Use status check in WHERE clause |
| Badge reuse | Consumed badge used again | Set `consumed = true` atomically |
| Privilege escalation | User modifies admin flag | Read admin status from DB, don't trust client |

---

## 7. Error Handling

### Error Categories

#### 1. Validation Errors (400)
**Scenario:** Invalid promotion ID format

**Detection:** Zod validation fails

**Response:**
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
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

#### 3. Authorization Errors (403)
**Scenario:** User is not admin

**Detection:** User record has `is_admin = false`

**Response:**
```json
{
  "error": "forbidden",
  "message": "Only admins may approve promotions"
}
```

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
  "message": "Only submitted promotions can be approved",
  "current_status": "draft"
}
```

#### 6. Server Errors (500)
**Scenario:** Database error, unexpected exception

**Detection:** Catch-all error handler

**Action:**
- Log error to console
- Log to error_logs table via `logError()`
- Return generic error message

**Response:**
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred while approving the promotion"
}
```

### Error Logging Strategy

**When to Log:**
- All 500 errors (unexpected errors)
- Optionally: authorization failures for security monitoring

**Log Details:**
```typescript
await logError(context.locals.supabase, {
  route: "/api/promotions/:id/approve",
  error_code: "APPROVAL_FAILED",
  message: error.message,
  payload: {
    promotion_id: promotionId,
    admin_user_id: adminUserId
  },
  requester_id: adminUserId,
});
```

**Error Log Table:** `audit_logs` (as per db-plan.md)

### Error Recovery

**Non-Critical Failures:**
- If promotion_badges update fails after promotion update succeeds:
  - Log warning to console
  - Promotion approval still succeeds
  - Badges can be manually marked as consumed later

**Critical Failures:**
- If promotion update fails:
  - Entire operation fails
  - Return 500 error
  - No partial state

---

## 8. Performance Considerations

### Database Queries

**Query Count:** 4 queries per request
1. Get authenticated user (1 query)
2. Get user admin status (1 query)
3. Fetch promotion and update (2 queries via service)
4. Update promotion_badges (1 query via service)

**Total:** ~4-5 database round trips

### Optimization Opportunities

#### 1. Reduce Admin Check Query
**Current:** Separate query to fetch `is_admin`

**Optimization:**
- Cache admin status in session/JWT
- Or use RLS policies to enforce admin-only access at DB level

#### 2. Batch Operations
**Current:** Update promotion, then update promotion_badges separately

**Optimization:**
- Use PostgreSQL RPC function for atomic transaction
- Example: `rpc('approve_promotion', { promotion_id, admin_user_id })`

#### 3. Index Coverage
**Required Indexes (already in db-plan.md):**
- `promotions(id)` - Primary key (automatic)
- `promotions(status)` - For status filtering
- `promotion_badges(promotion_id)` - For badge updates

### Potential Bottlenecks

#### 1. Large Promotion Badge Counts
**Scenario:** Promotion with 100+ badges

**Impact:** Update query on promotion_badges could be slow

**Mitigation:**
- Index on `promotion_id` ensures fast lookup
- Update is single operation (SET consumed = true WHERE promotion_id = ...)
- Unlikely to be a bottleneck unless thousands of badges

#### 2. Concurrent Approvals
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
- Async approval processing with job queue
- Event-driven architecture (publish "promotion.approved" event)
- Batch approval operations for admins

---

## 9. Implementation Steps

### Step 1: Create Endpoint Route File
**File:** `src/pages/api/promotions/[id]/approve.ts`

**Tasks:**
1. Create file structure following Astro API route pattern
2. Import dependencies: `APIRoute`, `z`, `PromotionService`, `logError`, types
3. Define Zod validation schema for promotion ID
4. Export POST handler function

**Code Structure:**
```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { PromotionService } from "@/lib/promotion.service";
import type { ApiError } from "@/types";
import { logError } from "@/lib/error-logger";

const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
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

**Error Handling:**
- Return 401 if not authenticated
- Return 401 if user record not found
- Return 403 if not admin

### Step 3: Validate Promotion ID
**Location:** After authentication

**Tasks:**
1. Extract promotion ID from `context.params.id`
2. Validate with Zod schema
3. Handle validation errors (400)

**Error Handling:**
- Return 400 with validation error message

### Step 4: Implement Service Method
**File:** `src/lib/promotion.service.ts`

**Method Name:** `approvePromotion(promotionId: string, adminUserId: string): Promise<PromotionRow>`

**Tasks:**
1. Fetch promotion record by ID
2. Validate promotion exists (throw "Promotion not found")
3. Validate status is 'submitted' (throw with status info)
4. Update promotion record:
   - Set `status = 'approved'`
   - Set `approved_by = adminUserId`
   - Set `approved_at = NOW()`
   - Set `executed = true`
   - Use `.eq("status", "submitted")` to prevent race conditions
5. Update all promotion_badges:
   - Set `consumed = true`
   - WHERE `promotion_id = promotionId`
6. Return updated promotion record

**Error Handling:**
- Throw specific error messages for route handler to parse
- Handle Supabase errors gracefully

**Code Template:**
```typescript
async approvePromotion(promotionId: string, adminUserId: string): Promise<PromotionRow> {
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
    throw new Error(`Only submitted promotions can be approved. Current status: ${promotion.status}`);
  }

  // Step 2: Update promotion (with race condition prevention)
  const { data: updatedPromotion, error: updateError } = await this.supabase
    .from("promotions")
    .update({
      status: "approved",
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
      executed: true,
    })
    .eq("id", promotionId)
    .eq("status", "submitted") // Prevents race condition
    .select()
    .single();

  if (updateError || !updatedPromotion) {
    throw new Error("Failed to approve promotion (may have been already processed)");
  }

  // Step 3: Update promotion_badges to consumed
  const { error: badgesError } = await this.supabase
    .from("promotion_badges")
    .update({ consumed: true })
    .eq("promotion_id", promotionId);

  if (badgesError) {
    // Non-critical: Log but don't fail
    console.warn("Failed to mark badges as consumed:", badgesError);
  }

  // Step 4: Return updated promotion
  return updatedPromotion as PromotionRow;
}
```

### Step 5: Call Service from Route Handler
**Location:** Inside POST handler, after validation

**Tasks:**
1. Instantiate `PromotionService` with `context.locals.supabase`
2. Call `approvePromotion(promotionId, adminUserId)`
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
  const approvedPromotion = await service.approvePromotion(promotionId, adminUserId);

  return new Response(
    JSON.stringify(approvedPromotion),
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
   - "status" → 409 with current_status
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
      message: "Only submitted promotions can be approved",
      current_status: currentStatus,
    }),
    { status: 409, headers: { "Content-Type": "application/json" } }
  );
}

// Unexpected error (500)
console.error("Error approving promotion:", error);
await logError(context.locals.supabase, {
  route: "/api/promotions/:id/approve",
  error_code: "APPROVAL_FAILED",
  message: errorMessage,
  payload: { promotion_id: promotionId },
  requester_id: adminUserId,
});

return new Response(
  JSON.stringify({
    error: "internal_error",
    message: "An unexpected error occurred while approving the promotion",
  }),
  { status: 500, headers: { "Content-Type": "application/json" } }
);
```

### Step 7: Add JSDoc Documentation
**Location:** Top of route file and service method

**Tasks:**
1. Add endpoint documentation comment at top of route file
2. Add method documentation comment for `approvePromotion()`
3. Document parameters, return types, and error scenarios

**Example:**
```typescript
/**
 * POST /api/promotions/:id/approve
 *
 * Approves a submitted promotion (admin only)
 * Consumes badge reservations and marks promotion as executed
 *
 * Request:
 *   - Path Parameter: id (UUID) - Promotion ID
 *   - No request body required
 *   - Authentication: Required (admin only)
 *
 * Response (200 OK):
 *   - Full promotion record with status='approved' and approval metadata
 *
 * Error Responses:
 *   - 400 Bad Request: Invalid promotion ID format
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
   - [ ] Admin can approve submitted promotion
   - [ ] Response contains correct approval metadata
   - [ ] Promotion status is 'approved'
   - [ ] Promotion_badges are marked as consumed

2. **Authentication:**
   - [ ] Unauthenticated request returns 401
   - [ ] Non-admin request returns 403

3. **Validation:**
   - [ ] Invalid UUID returns 400
   - [ ] Non-existent promotion returns 404

4. **Business Logic:**
   - [ ] Draft promotion returns 409
   - [ ] Already approved promotion returns 409
   - [ ] Rejected promotion returns 409

5. **Race Conditions:**
   - [ ] Concurrent approvals handled gracefully

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
UPDATE users SET is_admin = true WHERE id = '550e8400-e29b-41d4-a716-446655440002';
```

### Step 9: Update Implementation Documentation
**File:** `.ai/api-promotions-approve-one-implementation-plan.md` (this document)

**Tasks:**
1. Mark implementation as complete
2. Document any deviations from plan
3. Note lessons learned
4. Update with production deployment notes if applicable

---

## 10. Implementation Checklist

- [ ] Create route file: `src/pages/api/promotions/[id]/approve.ts`
- [ ] Implement authentication check
- [ ] Implement authorization check (admin only)
- [ ] Implement promotion ID validation
- [ ] Add `approvePromotion()` method to `PromotionService`
- [ ] Implement promotion fetch and validation
- [ ] Implement promotion update with race condition prevention
- [ ] Implement promotion_badges update (consumed = true)
- [ ] Implement error handling for all scenarios
- [ ] Implement error logging for 500 errors
- [ ] Add JSDoc documentation to route and service
- [ ] Manual testing against test database
- [ ] Verify badge consumption in database
- [ ] Verify promotion status transitions correctly
- [ ] Test authentication and authorization
- [ ] Test concurrent approval scenarios
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
const userId = "550e8400-e29b-41d4-a716-446655440100";

// AFTER (Production):
const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({ error: "unauthorized", message: "Authentication required" }),
    { status: 401 });
}
const userId = user.id;
```

### Transaction Considerations
**Current Approach:** Sequential updates (promotion, then promotion_badges)

**Risk:** If promotion_badges update fails, promotion is already approved

**Mitigation:**
- Non-critical warning logged
- Manual fix possible via admin panel
- Consider RPC function for true transaction in future

**Future Enhancement:**
```sql
CREATE OR REPLACE FUNCTION approve_promotion(
  p_promotion_id UUID,
  p_admin_user_id UUID
) RETURNS promotions AS $$
BEGIN
  -- Atomic transaction
  UPDATE promotions SET ... WHERE id = p_promotion_id AND status = 'submitted';
  UPDATE promotion_badges SET consumed = true WHERE promotion_id = p_promotion_id;
  RETURN (SELECT * FROM promotions WHERE id = p_promotion_id);
END;
$$ LANGUAGE plpgsql;
```

### Audit Trail
**Captured Automatically:**
- `approved_by` - Admin user ID
- `approved_at` - Timestamp of approval
- `executed` - Approval implies execution

**Future Enhancements:**
- Detailed audit log entry in `audit_logs` table
- Track admin actions for compliance
- Include IP address, user agent in audit log

### Rollback Capability
**Current:** No rollback mechanism for approved promotions

**Future Enhancement:**
- Add "unapprove" endpoint for admins (reverse approval)
- Un-consume promotion_badges
- Revert status to 'submitted'
- Add audit log entry for rollback

**Considerations:**
- Only allow rollback if promotion not yet executed in HR system
- Require admin permission level check
- Consider time window for rollback (e.g., 24 hours)

---

## Appendix: Related Documentation

### API Specification
- Source: `.ai/api-plan.md`, Section 2.5, Lines 1547-1595
- Endpoint: `POST /api/promotions/:id/approve`

### Database Schema
- Source: `.ai/db-plan.md`
- Tables: `promotions` (Section 5), `promotion_badges` (Section 6)

### Type Definitions
- Source: `src/types.ts`
- Types: `PromotionRow`, `ApiError`, `InvalidStatusError`

### Existing Service
- Source: `src/lib/promotion.service.ts`
- Reference method: `submitPromotion()` (similar validation pattern)

### Existing Endpoint Pattern
- Source: `src/pages/api/badge-applications/[id]/accept.ts`
- Pattern: Admin-only approval endpoint with similar structure

### Error Logger
- Source: `src/lib/error-logger.ts`
- Function: `logError(supabase, options)`

---

**Plan Version:** 1.0
**Created:** 2025-01-03
**Last Updated:** 2025-01-03
**Status:** Ready for Implementation
