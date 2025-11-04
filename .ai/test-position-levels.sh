#!/bin/bash

echo "========================================="
echo "Testing GET /api/position-levels"
echo "========================================="
echo ""

BASE_URL="http://localhost:4321"
ENDPOINT="/api/position-levels"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Happy Path - Get Position Levels
echo "Test 1: Get Position Levels (200 OK)"
echo "-------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
  echo "Response body: $BODY"
fi
echo ""

# Test 2: Verify Response Structure
echo "Test 2: Verify Response Structure"
echo "----------------------------------"
HAS_POSITIONS=$(echo "$BODY" | jq -r 'has("positions")')
HAS_TECHNICAL=$(echo "$BODY" | jq -r '.positions | has("technical")')
HAS_FINANCIAL=$(echo "$BODY" | jq -r '.positions | has("financial")')
HAS_MANAGEMENT=$(echo "$BODY" | jq -r '.positions | has("management")')

if [ "$HAS_POSITIONS" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Has 'positions' field"
else
  echo -e "${RED}❌ FAIL${NC} - Missing 'positions' field"
fi

if [ "$HAS_TECHNICAL" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Has 'technical' path"
else
  echo -e "${RED}❌ FAIL${NC} - Missing 'technical' path"
fi

if [ "$HAS_FINANCIAL" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Has 'financial' path"
else
  echo -e "${RED}❌ FAIL${NC} - Missing 'financial' path"
fi

if [ "$HAS_MANAGEMENT" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Has 'management' path"
else
  echo -e "${RED}❌ FAIL${NC} - Missing 'management' path"
fi
echo ""

# Test 3: Verify Level Structure
echo "Test 3: Verify Level Structure"
echo "-------------------------------"
J1_NEXT=$(echo "$BODY" | jq -r '.positions.technical.J1.next_level // empty')
J1_BADGES=$(echo "$BODY" | jq -r '.positions.technical.J1.required_badges // empty')

if [ "$J1_NEXT" = "J2" ]; then
  echo -e "${GREEN}✅ PASS${NC} - J1 next_level is J2"
else
  echo -e "${RED}❌ FAIL${NC} - J1 next_level is not J2 (got: $J1_NEXT)"
fi

if [ -n "$J1_BADGES" ]; then
  echo -e "${GREEN}✅ PASS${NC} - J1 has required_badges"
else
  echo -e "${RED}❌ FAIL${NC} - J1 missing required_badges"
fi
echo ""

# Test 4: Verify Badge Requirements Structure
echo "Test 4: Verify Badge Requirements Structure"
echo "--------------------------------------------"
TECH_BADGES=$(echo "$BODY" | jq -r '.positions.technical.J1.required_badges.technical // empty')
HAS_LEVEL=$(echo "$TECH_BADGES" | jq -r '.[0] | has("level")')
HAS_COUNT=$(echo "$TECH_BADGES" | jq -r '.[0] | has("count")')

if [ "$HAS_LEVEL" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Badge requirement has 'level' field"
else
  echo -e "${RED}❌ FAIL${NC} - Badge requirement missing 'level' field"
fi

if [ "$HAS_COUNT" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Badge requirement has 'count' field"
else
  echo -e "${RED}❌ FAIL${NC} - Badge requirement missing 'count' field"
fi
echo ""

# Test 5: Verify Financial Path
echo "Test 5: Verify Financial Path"
echo "------------------------------"
FIN_J1=$(echo "$BODY" | jq -r '.positions.financial.J1 // empty')
FIN_J1_NEXT=$(echo "$BODY" | jq -r '.positions.financial.J1.next_level // empty')

if [ -n "$FIN_J1" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Financial path has J1 level"
else
  echo -e "${RED}❌ FAIL${NC} - Financial path missing J1 level"
fi

if [ "$FIN_J1_NEXT" = "J2" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Financial J1 next_level is J2"
else
  echo -e "${RED}❌ FAIL${NC} - Financial J1 next_level incorrect (got: $FIN_J1_NEXT)"
fi
echo ""

# Test 6: Verify Management Path
echo "Test 6: Verify Management Path"
echo "-------------------------------"
MGT_M1=$(echo "$BODY" | jq -r '.positions.management.M1 // empty')
MGT_M1_NEXT=$(echo "$BODY" | jq -r '.positions.management.M1.next_level // empty')

if [ -n "$MGT_M1" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Management path has M1 level"
else
  echo -e "${RED}❌ FAIL${NC} - Management path missing M1 level"
fi

if [ "$MGT_M1_NEXT" = "M2" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Management M1 next_level is M2"
else
  echo -e "${RED}❌ FAIL${NC} - Management M1 next_level incorrect (got: $MGT_M1_NEXT)"
fi
echo ""

# Test 7: Response Size Check
echo "Test 7: Response Size Check"
echo "---------------------------"
RESPONSE_SIZE=$(echo "$BODY" | wc -c | tr -d ' ')

if [ "$RESPONSE_SIZE" -lt 10240 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Response size is acceptable: $RESPONSE_SIZE bytes (< 10 KB)"
else
  echo -e "${RED}❌ FAIL${NC} - Response size too large: $RESPONSE_SIZE bytes (> 10 KB)"
fi
echo ""

# Test 8: Verify Highest Levels (No next_level)
echo "Test 8: Verify Highest Levels"
echo "------------------------------"
S3_NEXT=$(echo "$BODY" | jq -r '.positions.technical.S3.next_level // "null"')
M3_NEXT=$(echo "$BODY" | jq -r '.positions.management.M3.next_level // "null"')

if [ "$S3_NEXT" = "null" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Technical S3 has no next_level (highest level)"
else
  echo -e "${RED}❌ FAIL${NC} - Technical S3 should not have next_level (got: $S3_NEXT)"
fi

if [ "$M3_NEXT" = "null" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Management M3 has no next_level (highest level)"
else
  echo -e "${RED}❌ FAIL${NC} - Management M3 should not have next_level (got: $M3_NEXT)"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Endpoint: $ENDPOINT"
echo "Response Size: $RESPONSE_SIZE bytes"
echo "Test completed at: $(date)"
echo ""
echo "To view full response:"
echo "  curl -X GET '$BASE_URL$ENDPOINT' | jq"
echo ""

