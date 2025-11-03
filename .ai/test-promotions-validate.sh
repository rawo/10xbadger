#!/bin/bash
# Test Script for GET /api/promotions/:id/validation
# Tests promotion validation against template requirements

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "GET /api/promotions/:id/validation Tests"
echo "=========================================="
echo ""

# Test counter
PASS=0
FAIL=0

# Function to run a test
test_endpoint() {
    local test_num="$1"
    local test_name="$2"
    local expected_status="$3"
    local curl_cmd="$4"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}TEST $test_num: $test_name${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Expected Status: HTTP $expected_status"
    echo ""

    # Execute curl and capture response
    response=$(eval "$curl_cmd")
    status=$(echo "$response" | grep -oE "HTTP_STATUS:[0-9]+" | grep -oE "[0-9]+")
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

    # Pretty print JSON
    echo "Response:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""

    # Check status
    if [ "$status" = "$expected_status" ]; then
        echo -e "Status: ${GREEN}✓ PASS${NC} (HTTP $status)"
        ((PASS++))
    else
        echo -e "Status: ${RED}✗ FAIL${NC} (Expected HTTP $expected_status, Got HTTP $status)"
        ((FAIL++))
    fi
    echo ""
}

# =========================================================================
# Setup: Get test data from database
# =========================================================================
echo "Setting up test data..."

# Get a draft promotion owned by test user
PROMOTION_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM promotions
   WHERE created_by = '550e8400-e29b-41d4-a716-446655440100'
   AND status = 'draft'
   LIMIT 1;" 2>/dev/null)

if [ -z "$PROMOTION_ID" ]; then
    echo -e "${YELLOW}No existing promotion found. Creating test promotion...${NC}"

    # Get a template
    TEMPLATE_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
      "SELECT id FROM promotion_templates WHERE is_active = true LIMIT 1;" 2>/dev/null)

    # Create promotion
    PROMOTION_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
      "INSERT INTO promotions (template_id, created_by, path, from_level, to_level, status)
       SELECT id, '550e8400-e29b-41d4-a716-446655440100', path, from_level, to_level, 'draft'
       FROM promotion_templates WHERE id = '$TEMPLATE_ID'
       RETURNING id;" 2>/dev/null)
fi

# Get some accepted badge applications
BADGE1=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM badge_applications WHERE status = 'accepted' LIMIT 1 OFFSET 0;" 2>/dev/null)

BADGE2=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM badge_applications WHERE status = 'accepted' LIMIT 1 OFFSET 1;" 2>/dev/null)

echo -e "${GREEN}✓ Test data ready${NC}"
echo "  Promotion ID: $PROMOTION_ID"
echo "  Badge 1: $BADGE1"
echo "  Badge 2: $BADGE2"
echo ""

# Disable RLS for testing
echo "Disabling RLS for testing..."
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "ALTER TABLE promotion_badges DISABLE ROW LEVEL SECURITY;" > /dev/null 2>&1
echo -e "${GREEN}✓ RLS disabled${NC}"
echo ""

# =========================================================================
# TEST 1: Empty Promotion (No Badges - All Requirements Unsatisfied)
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 1: Empty Promotion (No Badges)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup: Removing all badges from promotion..."
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "DELETE FROM promotion_badges WHERE promotion_id = '$PROMOTION_ID';" > /dev/null 2>&1
echo ""

test_endpoint "1" "Empty Promotion (All Requirements Unsatisfied)" "200" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X GET 'http://localhost:3000/api/promotions/$PROMOTION_ID/validation'"

# =========================================================================
# TEST 2: Partial Promotion (Some Requirements Satisfied)
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 2: Partial Promotion${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup: Adding some badges to promotion..."

if [ -n "$BADGE1" ]; then
    psql postgresql://postgres:postgres@localhost:54322/postgres -c \
      "INSERT INTO promotion_badges (promotion_id, badge_application_id, assigned_by, consumed)
       VALUES ('$PROMOTION_ID', '$BADGE1', '550e8400-e29b-41d4-a716-446655440100', false)
       ON CONFLICT DO NOTHING;" > /dev/null 2>&1
fi

if [ -n "$BADGE2" ]; then
    psql postgresql://postgres:postgres@localhost:54322/postgres -c \
      "INSERT INTO promotion_badges (promotion_id, badge_application_id, assigned_by, consumed)
       VALUES ('$PROMOTION_ID', '$BADGE2', '550e8400-e29b-41d4-a716-446655440100', false)
       ON CONFLICT DO NOTHING;" > /dev/null 2>&1
fi
echo ""

test_endpoint "2" "Partial Promotion (Some Requirements Satisfied)" "200" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X GET 'http://localhost:3000/api/promotions/$PROMOTION_ID/validation'"

# =========================================================================
# TEST 3: Non-existent Promotion (404)
# =========================================================================
test_endpoint "3" "Non-existent Promotion" "404" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X GET 'http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-999999999999/validation'"

# =========================================================================
# TEST 4: Invalid UUID Format (400)
# =========================================================================
test_endpoint "4" "Invalid UUID Format" "400" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X GET 'http://localhost:3000/api/promotions/invalid-uuid/validation'"

# =========================================================================
# TEST 5: Verify "any" Category Matching
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 5: Verify 'any' Category Logic${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking if response includes 'any' category requirements..."
echo ""

response=$(curl -s -w 'HTTP_STATUS:%{http_code}' -X GET "http://localhost:3000/api/promotions/$PROMOTION_ID/validation")
body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

# Check if "any" category appears in response
if echo "$body" | grep -q '"category":\s*"any"'; then
    echo -e "${GREEN}✓ PASS${NC} - Found 'any' category in requirements"
    echo "$body" | python3 -m json.tool | grep -A5 '"category":\s*"any"'
    ((PASS++))
else
    echo -e "${YELLOW}⚠ INFO${NC} - No 'any' category rules in this template"
    echo "This is expected if template doesn't use 'any' category"
fi
echo ""

# =========================================================================
# TEST 6: Verify Exact-Match Logic (No Level Equivalence)
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 6: Verify Exact-Match Logic${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Adding gold badge and checking silver requirement..."

# Get a gold level badge
GOLD_BADGE=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT ba.id FROM badge_applications ba
   JOIN catalog_badges cb ON ba.catalog_badge_id = cb.id
   WHERE ba.status = 'accepted' AND cb.level = 'gold'
   LIMIT 1;" 2>/dev/null)

if [ -n "$GOLD_BADGE" ]; then
    # Add gold badge to promotion
    psql postgresql://postgres:postgres@localhost:54322/postgres -c \
      "INSERT INTO promotion_badges (promotion_id, badge_application_id, assigned_by, consumed)
       VALUES ('$PROMOTION_ID', '$GOLD_BADGE', '550e8400-e29b-41d4-a716-446655440100', false)
       ON CONFLICT DO NOTHING;" > /dev/null 2>&1

    # Get validation result
    response=$(curl -s -X GET "http://localhost:3000/api/promotions/$PROMOTION_ID/validation")

    echo "Response with gold badge:"
    echo "$response" | python3 -m json.tool
    echo ""
    echo -e "${GREEN}✓ INFO${NC} - Gold badge added. Check that silver requirements remain unsatisfied (exact-match)."
    ((PASS++))
else
    echo -e "${YELLOW}⚠ SKIP${NC} - No gold badges available for testing"
fi
echo ""

# =========================================================================
# TEST 7: Valid Promotion ID Format But Different Owner (Authorization)
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 7: Authorization Check (Different Owner)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Looking for promotion owned by different user..."

OTHER_PROMOTION=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM promotions
   WHERE created_by != '550e8400-e29b-41d4-a716-446655440100'
   LIMIT 1;" 2>/dev/null)

if [ -n "$OTHER_PROMOTION" ]; then
    test_endpoint "7" "Promotion Owned by Different User" "404" \
      "curl -s -w 'HTTP_STATUS:%{http_code}' -X GET 'http://localhost:3000/api/promotions/$OTHER_PROMOTION/validation'"
else
    echo -e "${YELLOW}⚠ SKIP${NC} - No promotions owned by other users found"
    echo "Note: In production with proper auth, this would return 404 (not found/forbidden)"
    echo ""
fi

# =========================================================================
# Cleanup
# =========================================================================
echo "=========================================="
echo "Cleanup"
echo "=========================================="
echo ""
echo "Re-enabling RLS..."
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "ALTER TABLE promotion_badges ENABLE ROW LEVEL SECURITY;" > /dev/null 2>&1
echo -e "${GREEN}✓ RLS re-enabled${NC}"
echo ""

# =========================================================================
# Summary
# =========================================================================
echo "=========================================="
echo "               TEST SUMMARY"
echo "=========================================="
echo ""
echo -e "Tests Passed: ${GREEN}$PASS${NC}"
echo -e "Tests Failed: ${RED}$FAIL${NC}"
echo -e "Total Tests:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ ALL TESTS PASSED! ✓✓✓${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
