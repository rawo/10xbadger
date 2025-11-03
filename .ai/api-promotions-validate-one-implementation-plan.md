# API Endpoint Implementation Plan: GET /api/promotions/:id/validation

## 1. Endpoint Overview

This endpoint validates a promotion against its template requirements and returns detailed eligibility status. It performs exact-match validation by counting badge applications in the promotion grouped by category and level, then comparing these counts against the template's requirements.

**Purpose:**
- Provides real-time validation feedback for promotion UI
- Shows which requirements are satisfied and which are missing
- Enables users to see exactly what badges they need to complete the promotion
- Used before submission to ensure template compliance

**Key Features:**
- Exact-match validation (no level equivalence: gold ≠ silver ≠ bronze)
- Handles "any" category matching (matches badges of all categories)
- Returns detailed requirement breakdown with current vs. required counts
- Read-only operation with no side effects

## 2. Request Details

**HTTP Method:** GET

**URL Structure:** `/api/promotions/:id/validation`

**Path Parameters:**
- `id` (UUID, required) - The promotion ID to validate

**Query Parameters:** None

**Request Headers:**
- `Content-Type`: Not applicable (GET request)
- Authentication header/cookie (handled by Astro middleware)

**Request Body:** None

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/promotions/850e8400-e29b-41d4-a716-446655440030/validation \
  -H "Cookie: session=..."
```

## 3. Used Types

**Input Types:**
- Path parameter `id`: string (validated as UUID)

**Output Types:**
- `PromotionValidationResponse` (from types.ts):
  ```typescript
  interface PromotionValidationResponse {
    promotion_id: string;
    is_valid: boolean;
    requirements: PromotionRequirement[];
    missing: MissingBadge[];
  }
  ```

**Supporting Types:**
- `PromotionRequirement`:
  ```typescript
  interface PromotionRequirement {
    category: BadgeCategoryType | "any";
    level: BadgeLevelType;
    required: number;
    current: number;
    satisfied: boolean;
  }
  ```

- `MissingBadge`:
  ```typescript
  interface MissingBadge {
    category: BadgeCategoryType | "any";
    level: BadgeLevelType;
    count: number;
  }
  ```

**Error Types:**
- `ApiError` (standard error response)

## 4. Response Details

### Success Response (200 OK)

**Description:** Validation result with detailed requirement breakdown

**Response Body:**
```json
{
  "promotion_id": "850e8400-e29b-41d4-a716-446655440030",
  "is_valid": false,
  "requirements": [
    {
      "category": "technical",
      "level": "silver",
      "required": 6,
      "current": 4,
      "satisfied": false
    },
    {
      "category": "any",
      "level": "gold",
      "required": 1,
      "current": 0,
      "satisfied": false
    },
    {
      "category": "any",
      "level": "silver",
      "required": 4,
      "current": 4,
      "satisfied": true
    }
  ],
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

**403 Forbidden** - User is not creator and not admin
```json
{
  "error": "forbidden",
  "message": "You do not have permission to access this promotion"
}
```

**404 Not Found** - Promotion not found
```json
{
  "error": "not_found",
  "message": "Promotion not found"
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
     │ GET /api/promotions/:id/validation
     │
     ▼
┌─────────────────┐
│ Astro Middleware│ ──► Authenticate user (future)
└────┬────────────┘     Extract userId, isAdmin
     │
     ▼
┌──────────────────┐
│  Route Handler   │ ──► Validate promotion ID (Zod)
│  (GET handler)   │     Extract path parameters
└────┬─────────────┘
     │
     ▼
┌─────────────────────┐
│  PromotionService   │
│  .validatePromotion │
└────┬────────────────┘
     │
     ├─► Step 1: Fetch promotion with template
     │   └─► Query: promotions JOIN promotion_templates
     │       └─► Check authorization (owner or admin)
     │           └─► Return null if unauthorized
     │
     ├─► Step 2: Fetch badge applications in promotion
     │   └─► Query: promotion_badges JOIN badge_applications JOIN catalog_badges
     │       └─► Get category and level for each badge
     │
     ├─► Step 3: Count badges by category and level
     │   └─► Build map: { "technical:silver": 4, "organizational:gold": 1, ... }
     │
     ├─► Step 4: Validate against template rules
     │   └─► For each rule:
     │       ├─► Count matching badges
     │       │   ├─► If category = "any": sum all badges of matching level
     │       │   └─► Else: count badges where category AND level match
     │       ├─► Compare count >= required
     │       └─► Build requirement object with satisfied flag
     │
     ├─► Step 5: Calculate missing badges
     │   └─► For each unsatisfied requirement:
     │       └─► Add to missing list with deficit count
     │
     └─► Step 6: Return validation result
         └─► is_valid = all requirements satisfied
             └─► Return PromotionValidationResponse
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
- **Requirement:** User can only validate their own promotions OR be admin
- **Implementation:** Service checks `promotion.created_by === userId OR isAdmin`
- **Error Response:** 403 Forbidden if unauthorized

### Input Validation
- **Promotion ID:** Validate UUID format using Zod schema
- **Sanitization:** UUID validation prevents injection attacks
- **Error Response:** 400 Bad Request for invalid format

### Data Access Control
- **Non-admin users:** Can only access promotions they created
- **Admin users:** Can access all promotions
- **Implementation:** Service filters by `created_by` for non-admins

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
| Not owner and not admin | 403 | forbidden | You do not have permission to access this promotion | Service returns null |
| Promotion not found | 404 | not_found | Promotion not found | Service returns null |
| Database query fails | 500 | internal_error | An unexpected error occurred | Service throws Error |

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
  const result = await promotionService.validatePromotion(
    validation.data.id,
    userId,
    isAdmin
  );

  // Handle not found or forbidden
  if (!result) {
    return new Response(JSON.stringify({
      error: "not_found",
      message: "Promotion not found"
    }), { status: 404 });
  }

  // Return success
  return new Response(JSON.stringify(result), { status: 200 });

} catch (error) {
  // Handle unexpected errors
  return new Response(JSON.stringify({
    error: "internal_error",
    message: "An unexpected error occurred"
  }), { status: 500 });
}
```

**Service Error Handling:**
- Returns `null` if promotion not found or user not authorized (403/404)
- Throws `Error` for database failures (500)
- Caller distinguishes 403 vs 404 based on context

## 8. Performance Considerations

### Database Queries
1. **Fetch promotion with template** (1 query):
   - Join: `promotions` ← `promotion_templates`
   - Indexed on: `promotions.id` (primary key), `promotions.template_id` (foreign key)
   - **Expected Time:** 5-10ms

2. **Fetch badge applications** (1 query):
   - Join: `promotion_badges` ← `badge_applications` ← `catalog_badges`
   - Filter: `promotion_badges.promotion_id = ?`
   - Indexed on: `promotion_badges.promotion_id` (foreign key)
   - **Expected Time:** 10-20ms

**Total Database Time:** 15-30ms

### In-Memory Processing
- **Badge counting:** O(n) where n = number of badges in promotion
  - Typical: 5-15 badges
  - Build hash map: { "category:level": count }
  - **Expected Time:** <1ms

- **Rule validation:** O(m) where m = number of template rules
  - Typical: 2-5 rules
  - Compare counts against requirements
  - **Expected Time:** <1ms

**Total Processing Time:** <5ms

### Overall Performance
- **Total Response Time:** 20-40ms (under 50ms target)
- **Optimization Opportunities:**
  - Use database aggregation function for badge counting (future)
  - Cache template rules (future)
  - Materialized view for badge counts (future)

### Caching Strategy (Future Enhancement)
- **Validation results:** Cache for 30 seconds (invalidate on badge add/remove)
- **Template rules:** Cache indefinitely (invalidate on template update)
- **Badge counts:** Real-time calculation (critical for accuracy)

## 9. Implementation Steps

### Step 1: Add Service Method to PromotionService

**File:** `src/lib/promotion.service.ts`

**Add new method:**
```typescript
/**
 * Validates a promotion against its template requirements
 *
 * Counts badge applications in the promotion by category and level,
 * then compares against template rules. Returns detailed validation
 * result showing which requirements are satisfied and which are missing.
 *
 * Uses exact-match logic: gold ≠ silver ≠ bronze (no level equivalence)
 * Handles "any" category rules that match badges of all categories
 *
 * @param promotionId - Promotion UUID to validate
 * @param userId - Current user ID (for authorization)
 * @param isAdmin - Whether current user is admin
 * @returns Validation result if found and authorized, null otherwise
 * @throws Error if database query fails
 */
async validatePromotion(
  promotionId: string,
  userId?: string,
  isAdmin = false
): Promise<PromotionValidationResponse | null>
```

**Implementation details:**
1. Fetch promotion with template (including rules)
2. Apply authorization check (owner or admin)
3. Fetch all badge applications in promotion with catalog badge details
4. Count badges by category and level
5. For each template rule:
   - Count matching badges (handle "any" category)
   - Compare with required count
   - Build PromotionRequirement object
6. Calculate missing badges (requirements where satisfied = false)
7. Determine is_valid (all requirements satisfied)
8. Return PromotionValidationResponse

**Badge Counting Logic:**
```typescript
// Build badge count map
const badgeCounts = new Map<string, number>();
for (const badge of badgeApplications) {
  const key = `${badge.category}:${badge.level}`;
  badgeCounts.set(key, (badgeCounts.get(key) || 0) + 1);
}

// Count badges for a rule
function countBadgesForRule(rule: PromotionTemplateRule): number {
  if (rule.category === "any") {
    // Sum all badges with matching level (any category)
    let count = 0;
    for (const [key, value] of badgeCounts) {
      const [_, level] = key.split(":");
      if (level === rule.level) {
        count += value;
      }
    }
    return count;
  } else {
    // Count badges with matching category AND level
    const key = `${rule.category}:${rule.level}`;
    return badgeCounts.get(key) || 0;
  }
}
```

**Testing Notes:**
- Test with promotion that satisfies all requirements (is_valid = true)
- Test with promotion missing some requirements (is_valid = false)
- Test "any" category matching
- Test exact-match validation (gold badge doesn't satisfy silver requirement)
- Test empty promotion (all requirements unsatisfied)
- Test authorization (non-owner access blocked)

### Step 2: Create API Route Handler

**File:** `src/pages/api/promotions/[id]/validation.ts`

**Create new file with GET handler:**

```typescript
import type { APIRoute } from "astro";
import { PromotionService } from "@/lib/promotion.service";
import { z } from "zod";

// Validation schema for promotion ID
const promotionIdSchema = z.object({
  id: z.string().uuid("Invalid promotion ID format"),
});

/**
 * GET /api/promotions/:id/validation
 *
 * Validates promotion against template requirements
 * Returns detailed eligibility status with requirement breakdown
 */
export const GET: APIRoute = async (context) => {
  // ===================================================================
  // Development Mode: Use test user credentials
  // ===================================================================
  // TODO: Replace with actual authentication when enabled
  const userId = "550e8400-e29b-41d4-a716-446655440100"; // Test user
  const isAdmin = false;

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
  // Step 2: Validate Promotion via Service
  // ===================================================================
  try {
    const promotionService = new PromotionService(context.locals.supabase);
    const result = await promotionService.validatePromotion(promotionId, userId, isAdmin);

    // Handle promotion not found or forbidden
    if (!result) {
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

    // ===================================================================
    // Step 3: Return Validation Result
    // ===================================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ===================================================================
    // Step 4: Handle Unexpected Errors
    // ===================================================================
    console.error("Error validating promotion:", error);

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
- Handle service returning null (404 response)
- Catch and handle unexpected errors (500 response)
- Use proper Content-Type headers
- Development mode with hardcoded user credentials

### Step 3: Manual Testing

**Create test script:** `.ai/test-promotions-validate.sh`

```bash
#!/bin/bash
# Test script for GET /api/promotions/:id/validation

# Test Data
PROMOTION_VALID="850e8400-e29b-41d4-a716-446655440030"
PROMOTION_INVALID="850e8400-e29b-41d4-a716-999999999999"
BADGE1="650e8400-e29b-41d4-a716-446655440011"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "GET /api/promotions/:id/validation Tests"
echo "=========================================="
echo ""

# TEST 1: Valid promotion with complete requirements
echo -e "${BLUE}TEST 1: Valid promotion (complete requirements)${NC}"
curl -s -X GET "http://localhost:3000/api/promotions/$PROMOTION_VALID/validation" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 2: Valid promotion with incomplete requirements
echo -e "${BLUE}TEST 2: Valid promotion (incomplete requirements)${NC}"
# First remove some badges to make it incomplete
echo "Setup: Removing badge to make promotion incomplete..."
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "DELETE FROM promotion_badges WHERE promotion_id = '$PROMOTION_VALID' AND badge_application_id = '$BADGE1';" > /dev/null 2>&1

curl -s -X GET "http://localhost:3000/api/promotions/$PROMOTION_VALID/validation" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 3: Non-existent promotion
echo -e "${BLUE}TEST 3: Non-existent promotion (404)${NC}"
curl -s -X GET "http://localhost:3000/api/promotions/$PROMOTION_INVALID/validation" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 4: Invalid promotion ID format
echo -e "${BLUE}TEST 4: Invalid promotion ID format (400)${NC}"
curl -s -X GET "http://localhost:3000/api/promotions/invalid-uuid/validation" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

# TEST 5: Empty promotion (no badges)
echo -e "${BLUE}TEST 5: Empty promotion (no badges)${NC}"
# Create empty promotion
EMPTY_PROMOTION=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "INSERT INTO promotions (template_id, created_by, path, from_level, to_level, status)
   SELECT id, '550e8400-e29b-41d4-a716-446655440100', path, from_level, to_level, 'draft'
   FROM promotion_templates LIMIT 1
   RETURNING id;" 2>/dev/null)

curl -s -X GET "http://localhost:3000/api/promotions/$EMPTY_PROMOTION/validation" \
  -H "Content-Type: application/json" | python3 -m json.tool

# Cleanup
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "DELETE FROM promotions WHERE id = '$EMPTY_PROMOTION';" > /dev/null 2>&1
echo ""

echo -e "${GREEN}✓ All tests completed${NC}"
```

**Test Scenarios:**
1. **Complete promotion:** All requirements satisfied (is_valid = true)
2. **Incomplete promotion:** Some requirements missing (is_valid = false)
3. **Non-existent promotion:** Returns 404
4. **Invalid UUID format:** Returns 400
5. **Empty promotion:** No badges (all requirements unsatisfied)
6. **Authorization:** Non-owner access (403) - requires auth setup

### Step 4: Database Verification

**Verify validation logic manually:**

```sql
-- Get promotion with template rules
SELECT
  p.id as promotion_id,
  p.path,
  p.from_level,
  p.to_level,
  pt.name as template_name,
  pt.rules as template_rules
FROM promotions p
JOIN promotion_templates pt ON p.template_id = pt.id
WHERE p.id = '850e8400-e29b-41d4-a716-446655440030';

-- Count badges in promotion by category and level
SELECT
  cb.category,
  cb.level,
  COUNT(*) as badge_count
FROM promotion_badges pb
JOIN badge_applications ba ON pb.badge_application_id = ba.id
JOIN catalog_badges cb ON ba.catalog_badge_id = cb.id
WHERE pb.promotion_id = '850e8400-e29b-41d4-a716-446655440030'
GROUP BY cb.category, cb.level
ORDER BY cb.category, cb.level;

-- Manually verify counts against template rules
-- Example template rules:
-- [
--   {"category": "technical", "level": "silver", "count": 6},
--   {"category": "any", "level": "gold", "count": 1}
-- ]
```

**Expected Behavior:**
- Badge counts should match validation response "current" values
- "any" category should sum all badges of matching level
- Requirements marked satisfied when current >= required

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

**Create test documentation:** `.ai/manual-testing-promotions-validate.md`

Document:
- Test scenarios executed
- Sample requests and responses
- Database verification queries
- Edge cases tested
- Performance measurements

**Update implementation summary:** `.ai/promotions-validate-implementation-summary.md`

Include:
- Service method signature
- Route handler structure
- Validation algorithm explanation
- Performance metrics
- Known limitations

## 10. Testing Checklist

### Functional Tests
- [ ] Promotion with all requirements satisfied returns is_valid = true
- [ ] Promotion with missing requirements returns is_valid = false
- [ ] Requirements array shows correct current vs required counts
- [ ] Missing array shows correct deficit counts
- [ ] "any" category rule correctly counts badges of all categories
- [ ] Exact-match validation (gold doesn't satisfy silver requirement)
- [ ] Empty promotion (no badges) returns all requirements unsatisfied
- [ ] Non-existent promotion returns 404
- [ ] Invalid UUID format returns 400
- [ ] Non-owner access returns 403 (when auth enabled)
- [ ] Admin can access any promotion

### Performance Tests
- [ ] Validation completes in < 50ms for typical promotion (5-15 badges)
- [ ] Validation completes in < 100ms for large promotion (50+ badges)
- [ ] Database queries use indexes effectively
- [ ] No N+1 query issues

### Security Tests
- [ ] UUID validation prevents injection attacks
- [ ] Authorization check enforced (owner or admin only)
- [ ] RLS policies apply correctly
- [ ] Error messages don't leak sensitive information

### Edge Cases
- [ ] Promotion with no template (should not occur, foreign key constraint)
- [ ] Template with empty rules array (all requirements satisfied)
- [ ] Template with "any" category at multiple levels
- [ ] Multiple rules for same category/level combination
- [ ] Very large badge counts (100+ badges)

## 11. Production Readiness

### Before Production Deployment
- [ ] Enable authentication (replace hardcoded test user)
- [ ] Verify RLS policies enabled on all tables
- [ ] Add rate limiting on endpoint
- [ ] Set up monitoring for response times
- [ ] Add logging for validation failures (audit trail)
- [ ] Test with production-like data volumes
- [ ] Document API in external documentation
- [ ] Add endpoint to API versioning strategy

### Monitoring Metrics
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Validation success rate (is_valid = true)
- Most common missing requirements (for UX improvements)

### Future Enhancements
- Cache validation results (30 second TTL)
- Database function for badge counting (performance)
- Materialized view for real-time badge counts
- Validation history (track changes over time)
- Webhook on validation status change
- Batch validation endpoint (multiple promotions)

---

**End of Implementation Plan**
