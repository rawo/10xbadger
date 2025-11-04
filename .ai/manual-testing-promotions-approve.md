# Manual Testing Guide: POST /api/promotions/:id/approve

## Endpoint Overview

**URL:** `POST /api/promotions/:id/approve`
**Purpose:** Allows administrators to approve submitted promotions
**Authentication:** Currently disabled (Development Mode)
**Test Admin User:** `550e8400-e29b-41d4-a716-446655440100` (admin@goodcompany.com)

## Prerequisites

### 1. Start Local Supabase
```bash
npx supabase start
```

### 2. Start Development Server
```bash
pnpm dev
```

### 3. Verify Database Connection
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT COUNT(*) FROM promotions;"
```

## Test Data Setup

### Create Test Promotion in Submitted Status

```sql
-- Step 1: Create a test promotion in submitted status
INSERT INTO promotions (id, template_id, created_by, path, from_level, to_level, status, executed, created_at, submitted_at)
VALUES (
  '999e8400-e29b-41d4-a716-446655440099',
  '750e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440101',
  'technical',
  'J2',
  'S1',
  'submitted',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET status = 'submitted', executed = false, approved_at = NULL, approved_by = NULL;

-- Step 2: Create test badge applications
INSERT INTO badge_applications (id, catalog_badge_id, catalog_badge_version, applicant_id, status, date_of_application, date_of_fulfillment, reason)
VALUES
  ('111e8400-e29b-41d4-a716-446655440001', '1d1a260b-b4eb-4b2d-b65c-cf2a704586fb', 1, '550e8400-e29b-41d4-a716-446655440101', 'accepted', '2025-01-01', '2025-01-15', 'Test badge 1'),
  ('111e8400-e29b-41d4-a716-446655440002', 'd0b43df8-0a5c-447e-8170-45246031bde9', 1, '550e8400-e29b-41d4-a716-446655440101', 'accepted', '2025-01-01', '2025-01-15', 'Test badge 2')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add badge applications to the promotion
DELETE FROM promotion_badges WHERE promotion_id = '999e8400-e29b-41d4-a716-446655440099';
INSERT INTO promotion_badges (promotion_id, badge_application_id, assigned_by, consumed)
VALUES
  ('999e8400-e29b-41d4-a716-446655440099', '111e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', false),
  ('999e8400-e29b-41d4-a716-446655440099', '111e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440101', false);
```

### Run Setup Script

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres << 'EOF'
-- [Paste the above SQL here]
EOF
```

## Test Scenarios

### Test 1: Happy Path - Approve Submitted Promotion ✅

**Expected:** 200 OK with approved promotion

```bash
curl -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json" \
  | jq
```

**Expected Response:**
```json
{
  "id": "999e8400-e29b-41d4-a716-446655440099",
  "template_id": "750e8400-e29b-41d4-a716-446655440002",
  "created_by": "550e8400-e29b-41d4-a716-446655440101",
  "path": "technical",
  "from_level": "J2",
  "to_level": "S1",
  "status": "approved",
  "created_at": "2025-11-03T15:07:23.001758+00:00",
  "submitted_at": "2025-11-03T15:07:23.001758+00:00",
  "approved_at": "2025-11-03T15:09:36.699+00:00",
  "approved_by": "550e8400-e29b-41d4-a716-446655440100",
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": true
}
```

**Verification:**
```bash
# Verify promotion status
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "SELECT id, status, approved_by, executed FROM promotions WHERE id = '999e8400-e29b-41d4-a716-446655440099';"

# Verify badges are consumed
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "SELECT badge_application_id, consumed FROM promotion_badges WHERE promotion_id = '999e8400-e29b-41d4-a716-446655440099';"
```

---

### Test 2: Invalid UUID Format ❌

**Expected:** 400 Bad Request

```bash
curl -X POST "http://localhost:3000/api/promotions/not-a-valid-uuid/approve" \
  -H "Content-Type: application/json" \
  | jq
```

**Expected Response:**
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format"
}
```

---

### Test 3: Non-Existent Promotion ❌

**Expected:** 404 Not Found

```bash
curl -X POST "http://localhost:3000/api/promotions/00000000-0000-0000-0000-000000000000/approve" \
  -H "Content-Type: application/json" \
  | jq
```

**Expected Response:**
```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

---

### Test 4: Draft Promotion (Wrong Status) ❌

**Expected:** 409 Conflict

**Setup:**
```bash
# Find a draft promotion
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "SELECT id FROM promotions WHERE status = 'draft' LIMIT 1;"
```

**Test:**
```bash
# Replace DRAFT_PROMOTION_ID with actual ID from above
curl -X POST "http://localhost:3000/api/promotions/DRAFT_PROMOTION_ID/approve" \
  -H "Content-Type: application/json" \
  | jq
```

**Expected Response:**
```json
{
  "error": "invalid_status",
  "message": "Only submitted promotions can be approved",
  "current_status": "draft"
}
```

---

### Test 5: Already Approved Promotion (Race Condition) ❌

**Expected:** 409 Conflict

```bash
# Try to approve the same promotion again
curl -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json" \
  | jq
```

**Expected Response:**
```json
{
  "error": "conflict",
  "message": "Promotion has already been processed"
}
```

---

### Test 6: Rejected Promotion ❌

**Expected:** 409 Conflict with current_status = "rejected"

**Setup:**
```bash
# Create a rejected promotion
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "UPDATE promotions SET status = 'rejected' WHERE id = '999e8400-e29b-41d4-a716-446655440099';"
```

**Test:**
```bash
curl -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json" \
  | jq
```

**Expected Response:**
```json
{
  "error": "invalid_status",
  "message": "Only submitted promotions can be approved",
  "current_status": "rejected"
}
```

---

## Comprehensive Test Script

Run all tests in sequence:

```bash
#!/bin/bash

echo "=========================================="
echo "Testing POST /api/promotions/:id/approve"
echo "=========================================="
echo ""

# Setup
echo "Setting up test data..."
psql postgresql://postgres:postgres@localhost:54322/postgres << 'EOF' > /dev/null 2>&1
-- Reset test promotion
UPDATE promotions
SET status = 'submitted', executed = false, approved_at = NULL, approved_by = NULL
WHERE id = '999e8400-e29b-41d4-a716-446655440099';

-- Reset badge consumption
UPDATE promotion_badges
SET consumed = false
WHERE promotion_id = '999e8400-e29b-41d4-a716-446655440099';
EOF

echo "Test data ready!"
echo ""

# Test 1: Happy Path
echo "Test 1: Happy Path - Approve Submitted Promotion"
echo "-------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json" | jq -r '.status // .error'
echo ""

# Test 2: Invalid UUID
echo "Test 2: Invalid UUID Format"
echo "---------------------------"
curl -s -X POST "http://localhost:3000/api/promotions/invalid-uuid/approve" \
  -H "Content-Type: application/json" | jq -r '.error'
echo ""

# Test 3: Not Found
echo "Test 3: Non-Existent Promotion"
echo "------------------------------"
curl -s -X POST "http://localhost:3000/api/promotions/00000000-0000-0000-0000-000000000000/approve" \
  -H "Content-Type: application/json" | jq -r '.error'
echo ""

# Test 4: Draft Promotion
echo "Test 4: Draft Promotion (Wrong Status)"
echo "--------------------------------------"
DRAFT_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT id FROM promotions WHERE status = 'draft' LIMIT 1;" | tr -d ' ')
if [ -n "$DRAFT_ID" ]; then
  curl -s -X POST "http://localhost:3000/api/promotions/$DRAFT_ID/approve" \
    -H "Content-Type: application/json" | jq -r '.error + " (" + .current_status + ")"'
else
  echo "No draft promotion available"
fi
echo ""

# Test 5: Already Approved
echo "Test 5: Already Approved Promotion"
echo "-----------------------------------"
curl -s -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json" | jq -r '.error'
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
```

Save as `.ai/test-promotions-approve.sh` and run:

```bash
chmod +x .ai/test-promotions-approve.sh
./.ai/test-promotions-approve.sh
```

---

## Verification Queries

### Check Promotion Status
```sql
SELECT
  id,
  status,
  executed,
  approved_by,
  approved_at,
  submitted_at,
  created_at
FROM promotions
WHERE id = '999e8400-e29b-41d4-a716-446655440099';
```

### Check Badge Consumption
```sql
SELECT
  pb.badge_application_id,
  pb.consumed,
  ba.status as badge_status
FROM promotion_badges pb
JOIN badge_applications ba ON ba.id = pb.badge_application_id
WHERE pb.promotion_id = '999e8400-e29b-41d4-a716-446655440099';
```

### Check Admin User
```sql
SELECT id, email, display_name, is_admin
FROM users
WHERE id = '550e8400-e29b-41d4-a716-446655440100';
```

---

## Expected Behavior Summary

| Test Scenario | HTTP Status | Response Type | Key Fields |
|--------------|-------------|---------------|------------|
| Happy Path | 200 | Promotion record | status='approved', executed=true, approved_by set, approved_at set |
| Invalid UUID | 400 | Error | error='validation_error' |
| Not Found | 404 | Error | error='not_found' |
| Wrong Status (draft/rejected) | 409 | Error with status | error='invalid_status', current_status field |
| Already Approved | 409 | Error | error='conflict' |

---

## Cleanup

Reset test data after testing:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres << 'EOF'
-- Delete test promotion
DELETE FROM promotions WHERE id = '999e8400-e29b-41d4-a716-446655440099';

-- Delete test badge applications
DELETE FROM badge_applications WHERE id IN (
  '111e8400-e29b-41d4-a716-446655440001',
  '111e8400-e29b-41d4-a716-446655440002'
);
EOF
```

---

## Troubleshooting

### Issue: "Promotion has already been processed"

**Cause:** Promotion is already approved or update failed due to race condition

**Solution:** Reset promotion to submitted status:
```sql
UPDATE promotions
SET status = 'submitted', executed = false, approved_at = NULL, approved_by = NULL
WHERE id = '999e8400-e29b-41d4-a716-446655440099';
```

### Issue: Foreign key constraint violation on approved_by

**Cause:** Admin user doesn't exist in users table

**Solution:** Use correct admin user ID: `550e8400-e29b-41d4-a716-446655440100`

### Issue: Badges not consumed after approval

**Cause:** Non-critical warning logged but approval succeeded

**Solution:** Manually mark badges as consumed:
```sql
UPDATE promotion_badges
SET consumed = true
WHERE promotion_id = '999e8400-e29b-41d4-a716-446655440099';
```

---

## Notes

- **Authentication is disabled** in development mode
- All requests use test admin user: `550e8400-e29b-41d4-a716-446655440100`
- **Badge consumption** is non-critical - approval succeeds even if badge update fails
- **Race condition prevention** via status check in WHERE clause of UPDATE query
- In MVP, **approval implies execution** (executed = true)

---

**Last Updated:** 2025-11-03
**Status:** ✅ Implementation Complete
**Tested:** All scenarios passing
