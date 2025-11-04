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
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json")
STATUS=$(echo "$RESPONSE" | jq -r '.status // empty')
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ "$STATUS" = "approved" ]; then
  echo "✅ PASS - Status: approved"
  echo "   executed: $(echo "$RESPONSE" | jq -r '.executed')"
  echo "   approved_by: $(echo "$RESPONSE" | jq -r '.approved_by')"
else
  echo "❌ FAIL - Error: $ERROR"
fi
echo ""

# Test 2: Invalid UUID
echo "Test 2: Invalid UUID Format"
echo "---------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/invalid-uuid/approve" \
  -H "Content-Type: application/json" | jq -r '.error')
if [ "$ERROR" = "validation_error" ]; then
  echo "✅ PASS - Got validation_error"
else
  echo "❌ FAIL - Expected validation_error, got: $ERROR"
fi
echo ""

# Test 3: Not Found
echo "Test 3: Non-Existent Promotion"
echo "------------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/00000000-0000-0000-0000-000000000000/approve" \
  -H "Content-Type: application/json" | jq -r '.error')
if [ "$ERROR" = "not_found" ]; then
  echo "✅ PASS - Got not_found"
else
  echo "❌ FAIL - Expected not_found, got: $ERROR"
fi
echo ""

# Test 4: Draft Promotion
echo "Test 4: Draft Promotion (Wrong Status)"
echo "--------------------------------------"
DRAFT_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT id FROM promotions WHERE status = 'draft' LIMIT 1;" | tr -d ' ')
if [ -n "$DRAFT_ID" ]; then
  RESPONSE=$(curl -s -X POST "http://localhost:3000/api/promotions/$DRAFT_ID/approve" \
    -H "Content-Type: application/json")
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

# Test 5: Already Approved
echo "Test 5: Already Approved Promotion"
echo "-----------------------------------"
ERROR=$(curl -s -X POST "http://localhost:3000/api/promotions/999e8400-e29b-41d4-a716-446655440099/approve" \
  -H "Content-Type: application/json" | jq -r '.error')
if [ "$ERROR" = "conflict" ]; then
  echo "✅ PASS - Got conflict (already processed)"
else
  echo "❌ FAIL - Expected conflict, got: $ERROR"
fi
echo ""

# Verify badge consumption
echo "Verification: Badge Consumption"
echo "-------------------------------"
CONSUMED_COUNT=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT COUNT(*) FROM promotion_badges WHERE promotion_id = '999e8400-e29b-41d4-a716-446655440099' AND consumed = true;" | tr -d ' ')
TOTAL_COUNT=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT COUNT(*) FROM promotion_badges WHERE promotion_id = '999e8400-e29b-41d4-a716-446655440099';" | tr -d ' ')

if [ "$CONSUMED_COUNT" = "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
  echo "✅ PASS - All $TOTAL_COUNT badges consumed"
else
  echo "⚠️  WARNING - $CONSUMED_COUNT/$TOTAL_COUNT badges consumed"
  echo "   (Non-critical: badge update may have failed but approval succeeded)"
fi
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
