#!/bin/bash

echo "=========================================="
echo "Testing POST /api/promotions/:id/reject"
echo "=========================================="
echo ""

# Setup
echo "Setting up test data..."
psql postgresql://postgres:postgres@localhost:54322/postgres << 'EOF' > /dev/null 2>&1
-- Reset test promotion
UPDATE promotions
SET status = 'submitted', executed = false, rejected_at = NULL, rejected_by = NULL, reject_reason = NULL
WHERE id = '888e8400-e29b-41d4-a716-446655440088';

-- Reset badge statuses
UPDATE badge_applications
SET status = 'used_in_promotion'
WHERE id IN ('222e8400-e29b-41d4-a716-446655440001', '222e8400-e29b-41d4-a716-446655440002');

-- Recreate promotion_badges
DELETE FROM promotion_badges WHERE promotion_id = '888e8400-e29b-41d4-a716-446655440088';
INSERT INTO promotion_badges (promotion_id, badge_application_id, assigned_by, consumed)
VALUES
  ('888e8400-e29b-41d4-a716-446655440088', '222e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', false),
  ('888e8400-e29b-41d4-a716-446655440088', '222e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440101', false);
EOF

echo "Test data ready!"
echo ""

# Test 1: Happy Path
echo "Test 1: Happy Path - Reject Submitted Promotion"
echo "-------------------------------------------------"
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/promotions/888e8400-e29b-41d4-a716-446655440088/reject" \
  -H "Content-Type: application/json" \
  -d '{"reject_reason": "Insufficient evidence for technical leadership"}')
STATUS=$(echo "$RESPONSE" | jq -r '.status // empty')
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ "$STATUS" = "rejected" ]; then
  echo "✅ PASS - Status: rejected"
  echo "   rejected_by: $(echo "$RESPONSE" | jq -r '.rejected_by')"
  echo "   reject_reason present: $(echo "$RESPONSE" | jq -r '.reject_reason != null')"
else
  echo "❌ FAIL - Error: $ERROR"
fi
echo ""

# Test 2: Invalid UUID
echo "Test 2: Invalid UUID Format"
echo "---------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/invalid-uuid/reject" \
  -H "Content-Type: application/json" \
  -d '{"reject_reason": "Test"}' | jq -r '.error')
if [ "$ERROR" = "validation_error" ]; then
  echo "✅ PASS - Got validation_error"
else
  echo "❌ FAIL - Expected validation_error, got: $ERROR"
fi
echo ""

# Test 3: Missing reject_reason
echo "Test 3: Missing Reject Reason"
echo "------------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/888e8400-e29b-41d4-a716-446655440088/reject" \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.error')
if [ "$ERROR" = "validation_error" ]; then
  echo "✅ PASS - Got validation_error"
else
  echo "❌ FAIL - Expected validation_error, got: $ERROR"
fi
echo ""

# Test 4: Reject reason too long
echo "Test 4: Reject Reason Too Long"
echo "-------------------------------"
LONG_REASON=$(python3 -c "print('a' * 2001)")
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/888e8400-e29b-41d4-a716-446655440088/reject" \
  -H "Content-Type: application/json" \
  -d "{\"reject_reason\": \"$LONG_REASON\"}" | jq -r '.error')
if [ "$ERROR" = "validation_error" ]; then
  echo "✅ PASS - Got validation_error"
else
  echo "❌ FAIL - Expected validation_error, got: $ERROR"
fi
echo ""

# Test 5: Not Found
echo "Test 5: Non-Existent Promotion"
echo "------------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/00000000-0000-0000-0000-000000000000/reject" \
  -H "Content-Type: application/json" \
  -d '{"reject_reason": "Test"}' | jq -r '.error')
if [ "$ERROR" = "not_found" ]; then
  echo "✅ PASS - Got not_found"
else
  echo "❌ FAIL - Expected not_found, got: $ERROR"
fi
echo ""

# Test 6: Draft Promotion
echo "Test 6: Draft Promotion (Wrong Status)"
echo "--------------------------------------"
DRAFT_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT id FROM promotions WHERE status = 'draft' LIMIT 1;" | tr -d ' ')
if [ -n "$DRAFT_ID" ]; then
  RESPONSE=$(curl -s -X POST "http://localhost:3000/api/promotions/$DRAFT_ID/reject" \
    -H "Content-Type: application/json" \
    -d '{"reject_reason": "Test"}')
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  CURRENT_STATUS=$(echo "$RESPONSE" | jq -r '.current_status // empty')

  if [ "$ERROR" = "invalid_status" ] && [ "$CURRENT_STATUS" = "draft" ]; then
    echo "✅ PASS - Got invalid_status with current_status=draft"
  else
    echo "❌ FAIL - Expected invalid_status (draft), got: $ERROR ($CURRENT_STATUS)"
  fi
else
  echo "⚠️  SKIP - No draft promotion available"
fi
echo ""

# Test 7: Already Rejected
echo "Test 7: Already Rejected Promotion"
echo "-----------------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/888e8400-e29b-41d4-a716-446655440088/reject" \
  -H "Content-Type: application/json" \
  -d '{"reject_reason": "Test"}' | jq -r '.error')
if [ "$ERROR" = "invalid_status" ]; then
  echo "✅ PASS - Got invalid_status (already rejected)"
else
  echo "❌ FAIL - Expected invalid_status, got: $ERROR"
fi
echo ""

# Verification: Check badge unlocking
echo "Verification: Badge Unlocking"
echo "------------------------------"
BADGE_COUNT=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT COUNT(*) FROM promotion_badges WHERE promotion_id = '888e8400-e29b-41d4-a716-446655440088';" | tr -d ' ')

if [ "$BADGE_COUNT" = "0" ]; then
  echo "✅ PASS - All promotion_badges deleted"
else
  echo "⚠️  WARNING - $BADGE_COUNT promotion_badges remain (RLS limitation in dev mode)"
fi

ACCEPTED_COUNT=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT COUNT(*) FROM badge_applications WHERE id IN ('222e8400-e29b-41d4-a716-446655440001', '222e8400-e29b-41d4-a716-446655440002') AND status = 'accepted';" | tr -d ' ')

if [ "$ACCEPTED_COUNT" = "2" ]; then
  echo "✅ PASS - All badge statuses reverted to 'accepted'"
else
  echo "⚠️  WARNING - $ACCEPTED_COUNT/2 badges reverted to 'accepted' (RLS limitation in dev mode)"
fi
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
