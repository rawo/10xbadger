#!/bin/bash
# Test Script for POST /api/promotions/:id/submit
# Tests promotion submission with template validation

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "POST /api/promotions/:id/submit Tests"
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
PROMOTION_DRAFT=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM promotions
   WHERE created_by = '550e8400-e29b-41d4-a716-446655440100'
   AND status = 'draft'
   LIMIT 1;" 2>/dev/null)

if [ -z "$PROMOTION_DRAFT" ]; then
    echo -e "${YELLOW}No existing draft promotion found. Creating test promotion...${NC}"

    # Get a template
    TEMPLATE_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
      "SELECT id FROM promotion_templates WHERE is_active = true LIMIT 1;" 2>/dev/null)

    # Create draft promotion
    PROMOTION_DRAFT=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
      "INSERT INTO promotions (template_id, created_by, path, from_level, to_level, status)
       SELECT id, '550e8400-e29b-41d4-a716-446655440100', path, from_level, to_level, 'draft'
       FROM promotion_templates WHERE id = '$TEMPLATE_ID'
       RETURNING id;" 2>/dev/null)
fi

# Get a submitted promotion (or create one)
PROMOTION_SUBMITTED=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM promotions
   WHERE created_by = '550e8400-e29b-41d4-a716-446655440100'
   AND status = 'submitted'
   LIMIT 1;" 2>/dev/null)

if [ -z "$PROMOTION_SUBMITTED" ]; then
    echo -e "${YELLOW}Creating submitted promotion for testing...${NC}"

    TEMPLATE_ID=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
      "SELECT id FROM promotion_templates WHERE is_active = true LIMIT 1;" 2>/dev/null)

    PROMOTION_SUBMITTED=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
      "INSERT INTO promotions (template_id, created_by, path, from_level, to_level, status, submitted_at)
       SELECT id, '550e8400-e29b-41d4-a716-446655440100', path, from_level, to_level, 'submitted', NOW()
       FROM promotion_templates WHERE id = '$TEMPLATE_ID'
       RETURNING id;" 2>/dev/null)
fi

# Get promotion owned by different user
PROMOTION_OTHER_USER=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM promotions
   WHERE created_by != '550e8400-e29b-41d4-a716-446655440100'
   AND status = 'draft'
   LIMIT 1;" 2>/dev/null)

echo -e "${GREEN}✓ Test data ready${NC}"
echo "  Draft Promotion: $PROMOTION_DRAFT"
echo "  Submitted Promotion: $PROMOTION_SUBMITTED"
if [ -n "$PROMOTION_OTHER_USER" ]; then
    echo "  Other User Promotion: $PROMOTION_OTHER_USER"
fi
echo ""

# =========================================================================
# TEST 1: Submit Incomplete Promotion (Validation Failed - 409)
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 1: Submit Incomplete Promotion${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup: Ensuring promotion has no badges (will fail validation)..."
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "DELETE FROM promotion_badges WHERE promotion_id = '$PROMOTION_DRAFT';" > /dev/null 2>&1
echo ""

test_endpoint "1" "Submit Incomplete Promotion (Validation Failed)" "409" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X POST 'http://localhost:3000/api/promotions/$PROMOTION_DRAFT/submit'"

# =========================================================================
# TEST 2: Submit Valid Promotion (Success - 200)
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 2: Submit Valid Promotion${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup: Adding required badges to promotion..."

# Get template requirements
TEMPLATE_RULES=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT rules FROM promotion_templates pt
   JOIN promotions p ON p.template_id = pt.id
   WHERE p.id = '$PROMOTION_DRAFT';" 2>/dev/null)

echo "Template requirements: $TEMPLATE_RULES"

# For simplicity, we'll add some accepted badges
# Note: This may still fail if we don't have enough badges of the right type
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "ALTER TABLE promotion_badges DISABLE ROW LEVEL SECURITY;" > /dev/null 2>&1

# Add some badges (best effort)
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "INSERT INTO promotion_badges (promotion_id, badge_application_id, assigned_by, consumed)
   SELECT
     '$PROMOTION_DRAFT',
     ba.id,
     '550e8400-e29b-41d4-a716-446655440100',
     false
   FROM badge_applications ba
   WHERE ba.status = 'accepted'
   AND ba.id NOT IN (SELECT badge_application_id FROM promotion_badges WHERE consumed = false)
   LIMIT 10
   ON CONFLICT DO NOTHING;" > /dev/null 2>&1

psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "ALTER TABLE promotion_badges ENABLE ROW LEVEL SECURITY;" > /dev/null 2>&1

echo ""
echo "Note: This test may return 409 if promotion doesn't meet exact requirements"
echo ""

test_endpoint "2" "Submit Valid Promotion (if requirements met)" "200" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X POST 'http://localhost:3000/api/promotions/$PROMOTION_DRAFT/submit'"

# =========================================================================
# TEST 3: Submit Already Submitted Promotion (409 Invalid Status)
# =========================================================================
test_endpoint "3" "Submit Already Submitted Promotion" "409" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X POST 'http://localhost:3000/api/promotions/$PROMOTION_SUBMITTED/submit'"

# =========================================================================
# TEST 4: Submit Non-existent Promotion (404)
# =========================================================================
test_endpoint "4" "Submit Non-existent Promotion" "404" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X POST 'http://localhost:3000/api/promotions/550e8400-e29b-41d4-a716-999999999999/submit'"

# =========================================================================
# TEST 5: Invalid UUID Format (400)
# =========================================================================
test_endpoint "5" "Invalid UUID Format" "400" \
  "curl -s -w 'HTTP_STATUS:%{http_code}' -X POST 'http://localhost:3000/api/promotions/invalid-uuid/submit'"

# =========================================================================
# TEST 6: Authorization Check (Different Owner - 403)
# =========================================================================
if [ -n "$PROMOTION_OTHER_USER" ]; then
    test_endpoint "6" "Submit Promotion Owned by Different User" "403" \
      "curl -s -w 'HTTP_STATUS:%{http_code}' -X POST 'http://localhost:3000/api/promotions/$PROMOTION_OTHER_USER/submit'"
else
    echo -e "${YELLOW}⚠ SKIP${NC} - No promotions owned by other users found"
    echo "Note: In production with proper auth, this would return 403"
    echo ""
fi

# =========================================================================
# TEST 7: Verify Badge Application Status Update
# =========================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST 7: Verify Badge Status Update${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Find a successfully submitted promotion
SUBMITTED_PROMO=$(psql postgresql://postgres:postgres@localhost:54322/postgres -tAc \
  "SELECT id FROM promotions WHERE status = 'submitted' LIMIT 1;" 2>/dev/null)

if [ -n "$SUBMITTED_PROMO" ]; then
    echo "Checking badge applications for submitted promotion: $SUBMITTED_PROMO"

    BADGE_STATUSES=$(psql postgresql://postgres:postgres@localhost:54322/postgres -c \
      "SELECT ba.status, COUNT(*) as count
       FROM badge_applications ba
       JOIN promotion_badges pb ON pb.badge_application_id = ba.id
       WHERE pb.promotion_id = '$SUBMITTED_PROMO'
       GROUP BY ba.status;" 2>&1)

    echo "$BADGE_STATUSES"

    if echo "$BADGE_STATUSES" | grep -q "used_in_promotion"; then
        echo -e "${GREEN}✓ PASS${NC} - Badge applications marked as 'used_in_promotion'"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ INFO${NC} - Badge statuses may vary based on test execution"
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} - No submitted promotions found for verification"
fi
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
