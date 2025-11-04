# Manual Testing: GET /api/position-levels

**Date**: 2025-11-04  
**Endpoint**: `GET /api/position-levels`  
**Purpose**: Returns position levels configuration for promotion template validation  

---

## Test Environment

- **Server**: Development (Astro dev server)
- **Port**: 4321 (or configured port)
- **Authentication**: Disabled for development

---

## Prerequisites

1. Development server must be running:
   ```bash
   cd /Users/rawo/Projects/10xbadger
   pnpm dev
   ```

2. `jq` must be installed for JSON formatting:
   ```bash
   brew install jq  # macOS
   ```

---

## Automated Test Script

Run the complete test suite:
```bash
./.ai/test-position-levels.sh
```

Expected output: All tests should pass with ✅ indicators.

---

## Manual Test Cases

### Test 1: Basic GET Request (200 OK)

**Command**:
```bash
curl -X GET "http://localhost:4321/api/position-levels"
```

**Expected**:
- HTTP Status: 200 OK
- Response: Valid JSON with position levels configuration
- Response size: < 10 KB

**Verify**:
- [ ] Status code is 200
- [ ] Response is valid JSON
- [ ] Response contains `positions` field

---

### Test 2: Response Structure Validation

**Command**:
```bash
curl -s -X GET "http://localhost:4321/api/position-levels" | jq .
```

**Expected Structure**:
```json
{
  "positions": {
    "technical": { ... },
    "financial": { ... },
    "management": { ... }
  }
}
```

**Verify**:
- [ ] Has `positions` object
- [ ] Contains `technical` path
- [ ] Contains `financial` path
- [ ] Contains `management` path

---

### Test 3: Technical Path Verification

**Command**:
```bash
curl -s -X GET "http://localhost:4321/api/position-levels" | jq '.positions.technical'
```

**Expected**:
- Contains levels: J1, J2, S1, S2, S3
- Each level has `next_level` (except S3) and `required_badges`

**Verify**:
- [ ] J1 → J2 progression
- [ ] J2 → S1 progression
- [ ] S1 → S2 progression
- [ ] S2 → S3 progression
- [ ] S3 has no `next_level` (highest level)

---

### Test 4: Badge Requirements Validation

**Command**:
```bash
curl -s -X GET "http://localhost:4321/api/position-levels" | jq '.positions.technical.J1.required_badges'
```

**Expected**:
- Object with category keys (`technical`, `organizational`, `softskilled`, or `any`)
- Each category has array of requirements with `level` and `count`

**Verify**:
- [ ] Has category keys
- [ ] Each requirement has `level` field
- [ ] Each requirement has `count` field
- [ ] `level` is one of: "gold", "silver", "bronze"
- [ ] `count` is a positive integer

---

### Test 5: Financial Path Verification

**Command**:
```bash
curl -s -X GET "http://localhost:4321/api/position-levels" | jq '.positions.financial'
```

**Expected**:
- Contains levels: J1, J2, S1, S2
- Each level has proper structure

**Verify**:
- [ ] J1 exists with required_badges
- [ ] J2 exists with required_badges
- [ ] S1 exists with required_badges
- [ ] S2 exists with required_badges

---

### Test 6: Management Path Verification

**Command**:
```bash
curl -s -X GET "http://localhost:4321/api/position-levels" | jq '.positions.management'
```

**Expected**:
- Contains levels: M1, M2, M3
- Each level has proper structure

**Verify**:
- [ ] M1 → M2 progression
- [ ] M2 → M3 progression
- [ ] M3 has no `next_level` (highest level)

---

### Test 7: Response Headers

**Command**:
```bash
curl -i -X GET "http://localhost:4321/api/position-levels" | head -n 20
```

**Expected Headers**:
- `Content-Type: application/json`
- `Status: 200 OK`

**Verify**:
- [ ] Content-Type is application/json
- [ ] Status is 200 OK

---

### Test 8: Response Size

**Command**:
```bash
RESPONSE_SIZE=$(curl -s -X GET "http://localhost:4321/api/position-levels" | wc -c)
echo "Response size: $RESPONSE_SIZE bytes"
```

**Expected**:
- Response size < 10 KB (10240 bytes)

**Verify**:
- [ ] Response size is reasonable

---

### Test 9: Response Time

**Command**:
```bash
time curl -s -X GET "http://localhost:4321/api/position-levels" > /dev/null
```

**Expected**:
- Response time < 100ms

**Verify**:
- [ ] Response is fast (< 100ms)

---

### Test 10: Multiple Requests (Consistency)

**Command**:
```bash
for i in {1..5}; do
  curl -s -X GET "http://localhost:4321/api/position-levels" | jq -r '.positions.technical.J1.next_level'
done
```

**Expected**:
- All responses should be identical: "J2"

**Verify**:
- [ ] All responses are consistent

---

## Error Scenarios (Future)

### Test E1: Unauthorized Access (Production Only)

**Command**:
```bash
curl -X GET "https://production-url/api/position-levels"
```

**Expected** (when authentication is enabled):
- HTTP Status: 401 Unauthorized
- Error response with authentication required message

**Note**: Currently disabled in development mode.

---

## Performance Testing

### Load Test with Apache Bench

**Command**:
```bash
ab -n 1000 -c 10 http://localhost:4321/api/position-levels
```

**Expected**:
- Requests per second: > 100
- No failed requests
- Average response time: < 100ms

---

## Test Results Template

**Date**: _____________  
**Tester**: _____________  
**Environment**: Development  

| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1: Basic GET | ⬜ PASS / ⬜ FAIL | |
| Test 2: Structure | ⬜ PASS / ⬜ FAIL | |
| Test 3: Technical Path | ⬜ PASS / ⬜ FAIL | |
| Test 4: Badge Requirements | ⬜ PASS / ⬜ FAIL | |
| Test 5: Financial Path | ⬜ PASS / ⬜ FAIL | |
| Test 6: Management Path | ⬜ PASS / ⬜ FAIL | |
| Test 7: Response Headers | ⬜ PASS / ⬜ FAIL | |
| Test 8: Response Size | ⬜ PASS / ⬜ FAIL | |
| Test 9: Response Time | ⬜ PASS / ⬜ FAIL | |
| Test 10: Consistency | ⬜ PASS / ⬜ FAIL | |

**Overall Status**: ⬜ PASS / ⬜ FAIL  
**Issues Found**: _____________  
**Recommendations**: _____________  

---

## Troubleshooting

### Issue: Connection Refused

**Cause**: Development server not running  
**Solution**: Start server with `pnpm dev`

### Issue: Empty Response

**Cause**: Configuration file missing  
**Solution**: Verify `src/config/position-levels.json` exists

### Issue: Invalid JSON

**Cause**: Configuration file corrupted  
**Solution**: Validate JSON syntax with `cat src/config/position-levels.json | jq .`

### Issue: 404 Not Found

**Cause**: Endpoint not registered or server not restarted  
**Solution**: Restart development server

---

## Next Steps

1. ✅ Run automated test script
2. ⬜ Complete manual test cases
3. ⬜ Document test results
4. ⬜ Report any issues found
5. ⬜ Enable authentication for production
6. ⬜ Run performance tests

---

**Testing Completed**: _____________  
**Approved By**: _____________  

