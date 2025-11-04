# Curl Test Commands for GET /api/position-levels

**Date**: 2025-11-04  
**Endpoint**: `GET /api/position-levels`  

---

## Prerequisites

Start the development server first:
```bash
cd /Users/rawo/Projects/10xbadger
pnpm dev
```

Wait for the message: "Local: http://localhost:4321/"

---

## Quick Test Commands

### Test 1: Basic Request (Get Full Response)
```bash
curl -X GET http://localhost:4321/api/position-levels | jq .
```

**Expected**: Full JSON response with all position levels

---

### Test 2: Check HTTP Status
```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4321/api/position-levels
```

**Expected**: `HTTP Status: 200`

---

### Test 3: View Headers
```bash
curl -I http://localhost:4321/api/position-levels
```

**Expected Headers**:
```
HTTP/1.1 200 OK
Content-Type: application/json
```

---

### Test 4: Check Technical Path
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.technical'
```

**Expected**: JSON object with J1, J2, S1, S2, S3 levels

---

### Test 5: Check J1 Level Details
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.technical.J1'
```

**Expected Output**:
```json
{
  "next_level": "J2",
  "required_badges": {
    "technical": [
      {
        "level": "bronze",
        "count": 3
      }
    ]
  }
}
```

---

### Test 6: Check Financial Path
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.financial'
```

**Expected**: JSON object with J1, J2, S1, S2 levels

---

### Test 7: Check Management Path
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.management'
```

**Expected**: JSON object with M1, M2, M3 levels

---

### Test 8: Verify Response Structure
```bash
curl -s http://localhost:4321/api/position-levels | jq 'has("positions")'
```

**Expected**: `true`

---

### Test 9: Count Career Paths
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions | keys | length'
```

**Expected**: `3` (technical, financial, management)

---

### Test 10: Check Response Size
```bash
curl -s http://localhost:4321/api/position-levels | wc -c
```

**Expected**: Less than 10240 bytes (< 10 KB)

---

### Test 11: Measure Response Time
```bash
curl -s -w "Time: %{time_total}s\n" -o /dev/null http://localhost:4321/api/position-levels
```

**Expected**: Less than 0.1s (100ms)

---

### Test 12: Verify All Three Paths Exist
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions | keys'
```

**Expected Output**:
```json
[
  "financial",
  "management",
  "technical"
]
```

---

### Test 13: Check Highest Levels (No Next Level)
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.technical.S3.next_level'
```

**Expected**: `null` (S3 is the highest technical level)

```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.management.M3.next_level'
```

**Expected**: `null` (M3 is the highest management level)

---

### Test 14: Verify Badge Requirement Structure
```bash
curl -s http://localhost:4321/api/position-levels | jq '.positions.technical.J1.required_badges.technical[0]'
```

**Expected Output**:
```json
{
  "level": "bronze",
  "count": 3
}
```

---

### Test 15: Full Automated Test Suite
Run the complete automated test script:
```bash
cd /Users/rawo/Projects/10xbadger
./.ai/test-position-levels.sh
```

**Expected**: All tests pass with ✅ indicators

---

## Testing Multiple Requests (Load Test)

### Test 16: Send 10 Concurrent Requests
```bash
for i in {1..10}; do
  curl -s http://localhost:4321/api/position-levels > /dev/null &
done
wait
echo "All requests completed"
```

**Expected**: All requests succeed without errors

---

### Test 17: Verify Consistency Across Requests
```bash
for i in {1..5}; do
  curl -s http://localhost:4321/api/position-levels | jq -r '.positions.technical.J1.next_level'
done
```

**Expected**: All 5 responses show "J2" (consistent results)

---

## Advanced Testing

### Test 18: Pretty Print Full Response
```bash
curl -s http://localhost:4321/api/position-levels | jq '.' | head -50
```

**Expected**: First 50 lines of formatted JSON

---

### Test 19: Save Response to File
```bash
curl -s http://localhost:4321/api/position-levels > /tmp/position-levels-response.json
cat /tmp/position-levels-response.json | jq . | head -20
```

**Expected**: Response saved and displays correctly

---

### Test 20: Compare with Configuration File
```bash
# Compare endpoint response with source config
diff <(curl -s http://localhost:4321/api/position-levels | jq -S .) \
     <(jq -S . src/config/position-levels.json)
```

**Expected**: No differences (endpoint serves the config file)

---

## Performance Testing

### Test 21: Apache Bench Load Test (if installed)
```bash
ab -n 1000 -c 10 http://localhost:4321/api/position-levels
```

**Expected**:
- Requests per second: > 100
- Failed requests: 0
- Time per request: < 100ms

---

### Test 22: Concurrent Requests with Time Measurement
```bash
time (for i in {1..100}; do
  curl -s http://localhost:4321/api/position-levels > /dev/null
done)
```

**Expected**: 100 requests complete in < 10 seconds

---

## Error Testing (Future - Production Only)

### Test 23: Test Without Authentication (Future)
When authentication is enabled in production:
```bash
curl -s http://production-url/api/position-levels
```

**Expected**: 401 Unauthorized error

---

## One-Liner Test Summary

Run all essential checks in one command:
```bash
echo "=== Position Levels Endpoint Tests ===" && \
echo "Status Code:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/api/position-levels && \
echo "Has positions:" && curl -s http://localhost:4321/api/position-levels | jq 'has("positions")' && \
echo "Path count:" && curl -s http://localhost:4321/api/position-levels | jq '.positions | keys | length' && \
echo "Technical J1:" && curl -s http://localhost:4321/api/position-levels | jq -c '.positions.technical.J1' && \
echo "Response size:" && curl -s http://localhost:4321/api/position-levels | wc -c | xargs echo "bytes" && \
echo "=== All Tests Complete ==="
```

---

## Troubleshooting

### If "Connection refused":
```bash
# Check if server is running
lsof -i :4321

# Start server if not running
cd /Users/rawo/Projects/10xbadger && pnpm dev
```

### If "command not found: jq":
```bash
# Install jq on macOS
brew install jq

# Or on Linux
sudo apt-get install jq
```

### If response is empty:
```bash
# Check server logs
cd /Users/rawo/Projects/10xbadger
pnpm dev

# Look for errors in the output
```

---

## Expected Full Response Sample

<details>
<summary>Click to expand full expected response</summary>

```json
{
  "positions": {
    "technical": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "technical": [{"level": "bronze", "count": 3}]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "technical": [{"level": "silver", "count": 4}],
          "organizational": [{"level": "bronze", "count": 2}]
        }
      },
      "S1": {
        "next_level": "S2",
        "required_badges": {
          "technical": [{"level": "silver", "count": 6}],
          "any": [{"level": "gold", "count": 1}]
        }
      },
      "S2": {
        "next_level": "S3",
        "required_badges": {
          "technical": [{"level": "gold", "count": 2}],
          "any": [{"level": "silver", "count": 8}]
        }
      },
      "S3": {
        "required_badges": {
          "technical": [{"level": "gold", "count": 4}],
          "any": [{"level": "gold", "count": 2}]
        }
      }
    },
    "financial": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "organizational": [{"level": "bronze", "count": 3}]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "organizational": [{"level": "silver", "count": 4}],
          "technical": [{"level": "bronze", "count": 2}]
        }
      },
      "S1": {
        "next_level": "S2",
        "required_badges": {
          "organizational": [{"level": "silver", "count": 6}],
          "any": [{"level": "gold", "count": 1}]
        }
      },
      "S2": {
        "required_badges": {
          "organizational": [{"level": "gold", "count": 2}],
          "any": [{"level": "silver", "count": 8}]
        }
      }
    },
    "management": {
      "M1": {
        "next_level": "M2",
        "required_badges": {
          "softskilled": [{"level": "silver", "count": 4}],
          "organizational": [{"level": "bronze", "count": 2}]
        }
      },
      "M2": {
        "next_level": "M3",
        "required_badges": {
          "softskilled": [{"level": "gold", "count": 1}],
          "organizational": [{"level": "silver", "count": 3}]
        }
      },
      "M3": {
        "required_badges": {
          "softskilled": [{"level": "gold", "count": 2}],
          "organizational": [{"level": "gold", "count": 2}],
          "any": [{"level": "silver", "count": 5}]
        }
      }
    }
  }
}
```

</details>

---

## Quick Start

```bash
# 1. Start server
cd /Users/rawo/Projects/10xbadger
pnpm dev

# 2. In a new terminal, run quick test
curl -s http://localhost:4321/api/position-levels | jq . | head -30

# 3. Run full automated test suite
./.ai/test-position-levels.sh
```

---

**Note**: All tests assume the development server is running on `http://localhost:4321`. If your server uses a different port, update the URLs accordingly.

