# API Endpoint Implementation Plan: GET /api/position-levels

## 1. Endpoint Overview

This endpoint returns the position levels configuration used for validating promotion template creation and level progression. The configuration defines career paths (technical, financial, management), position levels within each path, and badge requirements for level transitions. This is a read-only endpoint serving static configuration data bundled with the application.

**Key Features**:
- Read-only configuration endpoint
- No database queries required
- Static JSON file bundled at build time
- Used by promotion template validation logic
- Available to all authenticated users

**Business Context**:
This endpoint is used for:
- Validating promotion template creation (ensuring valid level transitions)
- Displaying available career paths and levels in UI
- Validation logic for level progression rules
- Reference data for frontend career planning interfaces

**Key Characteristics**:
- Minimal server overhead (no I/O, no database)
- Configuration loaded once at build time (Vite bundling)
- Small response payload (< 5 KB)
- No caching layer needed (already in memory)
- No pagination required (complete dataset)

---

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
`/api/position-levels`

### Path Parameters
None

### Query Parameters
None

### Request Headers
- Session/Auth cookie (authentication handled by middleware/locals)
- Standard HTTP headers (Accept, User-Agent, etc.)

### Request Body
**None** - GET request has no body

### Request Examples

**Basic Request**:
```bash
curl -X GET "http://localhost:3000/api/position-levels"
```

**With Authentication Header (Production)**:
```bash
curl -X GET "http://localhost:3000/api/position-levels" \
  -H "Cookie: sb-access-token=..."
```

---

## 3. Used Types

### From `src/types.ts`

**Response Types** (lines 492-516):
```typescript
// Badge requirement for a position level
interface PositionLevelBadgeRequirement {
  level: BadgeLevelType;  // "gold" | "silver" | "bronze"
  count: number;
}

// Position level definition
interface PositionLevel {
  next_level?: string;  // Next level in progression (e.g., "J2")
  required_badges: Record<BadgeCategoryType | "any", PositionLevelBadgeRequirement[]>;
}

// Complete response structure
interface PositionLevelsResponse {
  positions: Record<PromotionPathType, Record<string, PositionLevel>>;
}
```

**Related Enum Types**:
```typescript
// Career paths
type PromotionPathType = "technical" | "financial" | "management";

// Badge categories
type BadgeCategoryType = "technical" | "organizational" | "softskilled";

// Badge levels
type BadgeLevelType = "gold" | "silver" | "bronze";
```

### Configuration File Structure

**File**: `src/config/position-levels.json`

**Type Definition**:
```typescript
// Configuration matches PositionLevelsResponse interface
type PositionLevelsConfig = PositionLevelsResponse;
```

---

## 4. Response Details

### Success Response (200 OK)

**Status Code**: `200 OK`

**Response Body**:
```json
{
  "positions": {
    "technical": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "technical": [
            { "level": "bronze", "count": 3 }
          ]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "technical": [
            { "level": "silver", "count": 4 }
          ],
          "organizational": [
            { "level": "bronze", "count": 2 }
          ]
        }
      },
      "S1": {
        "next_level": "S2",
        "required_badges": {
          "technical": [
            { "level": "silver", "count": 6 }
          ],
          "any": [
            { "level": "gold", "count": 1 }
          ]
        }
      },
      "S2": {
        "next_level": "S3",
        "required_badges": {
          "technical": [
            { "level": "gold", "count": 2 }
          ],
          "any": [
            { "level": "silver", "count": 8 }
          ]
        }
      }
    },
    "financial": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "organizational": [
            { "level": "bronze", "count": 3 }
          ]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "organizational": [
            { "level": "silver", "count": 4 }
          ],
          "technical": [
            { "level": "bronze", "count": 2 }
          ]
        }
      }
    },
    "management": {
      "M1": {
        "next_level": "M2",
        "required_badges": {
          "softskilled": [
            { "level": "silver", "count": 4 }
          ],
          "organizational": [
            { "level": "bronze", "count": 2 }
          ]
        }
      },
      "M2": {
        "next_level": "M3",
        "required_badges": {
          "softskilled": [
            { "level": "gold", "count": 1 }
          ],
          "organizational": [
            { "level": "silver", "count": 3 }
          ]
        }
      }
    }
  }
}
```

**Response Headers**:
- `Content-Type: application/json`

**Response Field Descriptions**:
- `positions`: Root object containing all career paths
  - Keys: Career path names ("technical", "financial", "management")
  - Values: Object mapping level codes to level definitions
- `next_level`: Optional string indicating the next level in progression
  - If absent, this is the highest level in the path
- `required_badges`: Object mapping categories to badge requirements
  - Keys: Category names or "any" (matches any category)
  - Values: Array of badge requirements (level + count)

### Error Responses

#### 401 Unauthorized - Not Authenticated
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**When This Occurs**:
- No valid session/auth token provided (production only)
- Session expired or invalid
- Development mode: This error is skipped

#### 500 Internal Server Error - Configuration Load Failed
```json
{
  "error": "internal_error",
  "message": "Failed to load position levels configuration"
}
```

**When This Occurs**:
- Configuration file missing or corrupted (should never happen in production)
- JSON parsing error (malformed configuration)
- File system access error (deployment issue)

---

## 5. Data Flow

### High-Level Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/position-levels
       ▼
┌─────────────────────────────────────────────────────┐
│           Astro API Route Handler                   │
│  src/pages/api/position-levels/index.ts             │
│                                                      │
│  1. [Development] Skip authentication               │
│  2. [Production] Verify user session                │
│  3. Import static configuration                     │
│  4. Return JSON response                            │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Import (build-time)
┌─────────────────────────────────────────────────────┐
│          Static Configuration File                  │
│  src/config/position-levels.json                    │
│                                                      │
│  - Bundled by Vite at build time                    │
│  - Loaded into memory (no file I/O)                 │
│  - Type-safe import                                 │
└──────┬──────────────────────────────────────────────┘
       │
       ▼ Response
┌─────────────┐
│   Client    │
└─────────────┘
```

### Detailed Request Processing Flow

```
1. Request Received
   ├─ Extract path: /api/position-levels
   ├─ Method: GET
   └─ Headers: Cookie (auth)

2. Authentication Check (Production Only)
   ├─ Extract user from context.locals.supabase.auth.getUser()
   ├─ If error or no user: Return 401 Unauthorized
   └─ If valid: Continue

3. Load Configuration
   ├─ Import positionLevelsConfig (build-time import)
   ├─ Configuration already in memory (bundled by Vite)
   └─ No file I/O or parsing needed

4. Return Response
   ├─ Status: 200 OK
   ├─ Headers: Content-Type: application/json
   └─ Body: JSON.stringify(positionLevelsConfig)
```

### Database Interactions
**None** - This endpoint does not query any database tables.

### File System Interactions
**None** - Configuration is imported at build time and bundled into the application. No runtime file I/O occurs.

### External Service Interactions
**None** - This is a standalone endpoint with no external dependencies.

---

## 6. Security Considerations

### Authentication
- **Development Mode**:
  - Authentication **skipped** for testing convenience
  - All requests allowed without session validation
  - **IMPORTANT**: This must be enabled before production deployment
  
- **Production Mode**:
  - **Requirement**: User must be authenticated via Supabase session
  - **Implementation**: Check `context.locals.supabase.auth.getUser()`
  - **Failure Response**: 401 Unauthorized if no valid session

**Implementation Pattern**:
```typescript
// Development: Skip authentication
if (import.meta.env.PROD) {
  const { data: { user }, error } = await context.locals.supabase.auth.getUser();
  
  if (error || !user) {
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        message: "Authentication required",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

### Authorization
- **Access Level**: All authenticated users (no role restrictions)
- **Business Rationale**: 
  - Position levels are reference data needed by all users
  - No sensitive information in configuration
  - Used for career planning and promotion template creation
- **No Row-Level Security**: Data is identical for all users

### Input Validation
- **No User Input**: GET request with no parameters
- **No Validation Required**: No query params, no body, no path params
- **Safe by Design**: No way to inject malicious input

### Data Exposure
- **Public Configuration**: All data in response is non-sensitive
- **Safe to Cache**: Response can be cached indefinitely (static data)
- **No PII**: Configuration contains only structural career data
- **No Business Secrets**: Badge requirements are public company policy

### OWASP Top 10 Considerations

| Risk Category | Threat Level | Mitigation |
|---------------|--------------|------------|
| **Broken Access Control** | Low | Authentication required (production) |
| **Injection** | None | No user input, no queries |
| **Sensitive Data Exposure** | None | No sensitive data in response |
| **XXE** | None | Not processing XML |
| **Broken Authentication** | Low | Handled by Supabase (when enabled) |
| **Security Misconfiguration** | Low | Follow Astro/Supabase best practices |
| **XSS** | None | JSON response, no HTML rendering |
| **Insecure Deserialization** | None | Not deserializing user input |
| **Using Components with Known Vulnerabilities** | Low | Keep dependencies updated |
| **Insufficient Logging & Monitoring** | Low | Log 401 errors in production |

### Security Threats & Mitigations

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Unauthorized access | Low (public data) | Authentication required in production |
| Configuration tampering | High | Read-only, bundled at build time |
| Man-in-the-middle | Medium | HTTPS in production |
| DoS via repeated requests | Low | Rate limiting at infrastructure level |
| Information disclosure | None | All data is public |

### Configuration Integrity
- **Build-Time Bundling**: Configuration cannot be modified at runtime
- **Version Control**: Configuration tracked in Git
- **Deployment Verification**: Validate configuration in CI/CD pipeline
- **Schema Validation**: Consider adding JSON schema validation at build time

---

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Handling Strategy | Logging |
|----------|-------------|------------|-------------------|---------|
| Not authenticated (production) | 401 | `unauthorized` | Return standard 401 response | Log auth failures |
| Configuration file missing | 500 | `internal_error` | Catch import error, return 500 | Log critical error |
| Malformed JSON | 500 | `internal_error` | Catch parse error, return 500 | Log critical error |
| Unexpected exception | 500 | `internal_error` | Catch all, return generic 500 | Log full error with stack trace |

### Error Handling Implementation

```typescript
export const GET: APIRoute = async (context) => {
  try {
    // Authentication check (production only)
    if (import.meta.env.PROD) {
      const { data: { user }, error } = await context.locals.supabase.auth.getUser();
      
      if (error || !user) {
        // Log authentication failure
        console.warn("Unauthorized access attempt to /api/position-levels");
        
        return new Response(
          JSON.stringify({
            error: "unauthorized",
            message: "Authentication required",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Import configuration (build-time, should never fail)
    const config = positionLevelsConfig;

    // Validate configuration exists
    if (!config || !config.positions) {
      console.error("Position levels configuration is missing or invalid");
      
      return new Response(
        JSON.stringify({
          error: "internal_error",
          message: "Failed to load position levels configuration",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Log unexpected errors
    console.error("Unexpected error in GET /api/position-levels:", error);

    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Failed to load position levels configuration",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Error Logging Strategy

**Development**:
- Log all errors to console with stack traces
- Include request context for debugging
- No filtering of error details

**Production**:
- Log errors to monitoring service (e.g., Sentry, LogRocket)
- Include sanitized context (no PII)
- Alert on 500 errors (configuration issues)
- Track 401 rate (detect authentication issues)

**What to Log**:
```typescript
{
  timestamp: new Date().toISOString(),
  endpoint: "/api/position-levels",
  method: "GET",
  error_type: "configuration_load_failed",
  error_message: error.message,
  stack_trace: error.stack,
  environment: import.meta.env.MODE,
}
```

---

## 8. Performance

### Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Database Queries** | 0 | No database access |
| **File I/O Operations** | 0 | Configuration bundled at build time |
| **Memory Footprint** | < 10 KB | Small JSON object in memory |
| **Response Time** | < 5 ms | Simple JSON serialization |
| **Response Size** | < 5 KB | Small payload, gzip-friendly |

### Performance Optimizations

**1. Build-Time Bundling**:
- Configuration imported as ES module
- Vite bundles JSON into application code
- No runtime file reading required
- Configuration loaded once into memory

**2. No External Dependencies**:
- No database queries
- No API calls
- No file system access
- Minimal CPU usage

**3. Response Optimization**:
- Small JSON payload (< 5 KB)
- Compresses well with gzip/brotli
- No pagination needed (complete dataset)
- No filtering or sorting (return as-is)

### Caching Strategy

**Server-Side Caching**:
- **Not needed** - Configuration already in memory
- **Build-time loading** - No repeated file reads
- **No cache invalidation** - Data is immutable per deployment

**Client-Side Caching**:
- **HTTP Cache Headers** (future enhancement):
  ```typescript
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=86400", // 24 hours
    "ETag": "..." // Based on configuration hash
  }
  ```
- **Browser Caching**: Clients can cache indefinitely until deployment changes

**CDN Caching**:
- Configuration can be cached at CDN edge
- No cache invalidation needed (immutable per deployment)
- Cache key: URL + deployment version

### Bottlenecks and Mitigations

| Potential Bottleneck | Impact | Likelihood | Mitigation |
|---------------------|--------|------------|------------|
| JSON.stringify() overhead | Low | Low | Payload is small (< 5 KB) |
| Network latency | Medium | Medium | Add cache headers, use CDN |
| Concurrent requests | Low | Low | Configuration is immutable, no locks needed |
| Memory consumption | Low | Very Low | Single copy in memory, < 10 KB |

### Load Testing Expectations

**Expected Performance**:
- **Throughput**: 1000+ req/s (single instance)
- **Latency (p50)**: < 5 ms
- **Latency (p95)**: < 10 ms
- **Latency (p99)**: < 20 ms
- **Memory**: Constant (< 10 KB per instance)
- **CPU**: Minimal (< 1% per request)

**Stress Testing**:
```bash
# Test with Apache Bench
ab -n 10000 -c 100 http://localhost:3000/api/position-levels

# Test with wrk
wrk -t 4 -c 100 -d 30s http://localhost:3000/api/position-levels
```

---

## 9. Implementation Steps

### Phase 1: Configuration File Creation

**Step 1.1: Create Configuration Directory**
```bash
mkdir -p src/config
```

**Step 1.2: Create Position Levels Configuration**

**File**: `src/config/position-levels.json`

**Content**: Complete position levels configuration matching the API spec and `PositionLevelsResponse` interface.

**Requirements**:
- Valid JSON syntax
- Matches `PositionLevelsResponse` TypeScript interface
- Contains all three career paths: technical, financial, management
- Includes realistic level progressions and badge requirements
- Well-formatted for readability

**Validation**:
```bash
# Validate JSON syntax
cat src/config/position-levels.json | jq . > /dev/null

# Check if file exists and is non-empty
test -s src/config/position-levels.json && echo "✓ Config file created"
```

### Phase 2: Endpoint Handler Implementation

**Step 2.1: Create Endpoint Directory**
```bash
mkdir -p src/pages/api/position-levels
```

**Step 2.2: Implement GET Handler**

**File**: `src/pages/api/position-levels/index.ts`

**Requirements**:
- Export `GET` function (Astro API route convention)
- Import configuration JSON (build-time import)
- Handle authentication (skip in development)
- Return JSON response with appropriate headers
- Include error handling for unexpected issues
- Add JSDoc documentation

**Implementation Pattern**:
```typescript
import type { APIRoute } from "astro";
import type { PositionLevelsResponse } from "@/types";
import positionLevelsConfig from "@/config/position-levels.json";

/**
 * GET /api/position-levels
 * 
 * Returns position levels configuration used for promotion template validation.
 * 
 * @returns {PositionLevelsResponse} Position levels configuration
 * 
 * @throws {401} If not authenticated (production only)
 * @throws {500} If configuration cannot be loaded
 */
export const GET: APIRoute = async (context) => {
  try {
    // Authentication check (production only)
    if (import.meta.env.PROD) {
      const { data: { user }, error } = await context.locals.supabase.auth.getUser();
      
      if (error || !user) {
        return new Response(
          JSON.stringify({
            error: "unauthorized",
            message: "Authentication required",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Return static configuration
    return new Response(JSON.stringify(positionLevelsConfig), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in GET /api/position-levels:", error);
    
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Failed to load position levels configuration",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
```

**Step 2.3: Add TypeScript Path Alias (if needed)**

Ensure `@/config` alias is configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/config/*": ["./src/config/*"]
    }
  }
}
```

### Phase 3: Testing

**Step 3.1: Create Test Script**

**File**: `.ai/test-position-levels.sh`

```bash
#!/bin/bash

echo "========================================="
echo "Testing GET /api/position-levels"
echo "========================================="
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="/api/position-levels"

# Test 1: Happy Path - Get Position Levels
echo "Test 1: Get Position Levels (200 OK)"
echo "-------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS - Status: $HTTP_CODE"
else
  echo "❌ FAIL - Expected 200, got $HTTP_CODE"
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
  echo "✅ PASS - Has 'positions' field"
else
  echo "❌ FAIL - Missing 'positions' field"
fi

if [ "$HAS_TECHNICAL" = "true" ]; then
  echo "✅ PASS - Has 'technical' path"
else
  echo "❌ FAIL - Missing 'technical' path"
fi

if [ "$HAS_FINANCIAL" = "true" ]; then
  echo "✅ PASS - Has 'financial' path"
else
  echo "❌ FAIL - Missing 'financial' path"
fi

if [ "$HAS_MANAGEMENT" = "true" ]; then
  echo "✅ PASS - Has 'management' path"
else
  echo "❌ FAIL - Missing 'management' path"
fi
echo ""

# Test 3: Verify Level Structure
echo "Test 3: Verify Level Structure"
echo "-------------------------------"
J1_NEXT=$(echo "$BODY" | jq -r '.positions.technical.J1.next_level // empty')
J1_BADGES=$(echo "$BODY" | jq -r '.positions.technical.J1.required_badges // empty')

if [ "$J1_NEXT" = "J2" ]; then
  echo "✅ PASS - J1 next_level is J2"
else
  echo "❌ FAIL - J1 next_level is not J2 (got: $J1_NEXT)"
fi

if [ -n "$J1_BADGES" ]; then
  echo "✅ PASS - J1 has required_badges"
else
  echo "❌ FAIL - J1 missing required_badges"
fi
echo ""

# Test 4: Verify Badge Requirements Structure
echo "Test 4: Verify Badge Requirements Structure"
echo "--------------------------------------------"
TECH_BADGES=$(echo "$BODY" | jq -r '.positions.technical.J1.required_badges.technical // empty')
HAS_LEVEL=$(echo "$TECH_BADGES" | jq -r '.[0] | has("level")')
HAS_COUNT=$(echo "$TECH_BADGES" | jq -r '.[0] | has("count")')

if [ "$HAS_LEVEL" = "true" ]; then
  echo "✅ PASS - Badge requirement has 'level' field"
else
  echo "❌ FAIL - Badge requirement missing 'level' field"
fi

if [ "$HAS_COUNT" = "true" ]; then
  echo "✅ PASS - Badge requirement has 'count' field"
else
  echo "❌ FAIL - Badge requirement missing 'count' field"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Endpoint: $ENDPOINT"
echo "Response Size: $(echo "$BODY" | wc -c) bytes"
echo "Test completed at: $(date)"
echo ""
```

**Step 3.2: Make Script Executable**
```bash
chmod +x .ai/test-position-levels.sh
```

**Step 3.3: Run Tests**
```bash
# Start dev server
pnpm dev

# In another terminal, run tests
./.ai/test-position-levels.sh
```

**Step 3.4: Manual Verification**
```bash
# Test with curl
curl -X GET "http://localhost:3000/api/position-levels" | jq

# Verify specific path
curl -X GET "http://localhost:3000/api/position-levels" | jq '.positions.technical'

# Verify level structure
curl -X GET "http://localhost:3000/api/position-levels" | jq '.positions.technical.J1'

# Check response size
curl -X GET "http://localhost:3000/api/position-levels" | wc -c
```

### Phase 4: Code Quality Checks

**Step 4.1: Run Linter**
```bash
# Check for linting errors
pnpm eslint src/pages/api/position-levels/index.ts

# Auto-fix issues
pnpm eslint --fix src/pages/api/position-levels/index.ts
```

**Step 4.2: Run Prettier**
```bash
# Check formatting
pnpm prettier --check src/pages/api/position-levels/index.ts

# Auto-format
pnpm prettier --write src/pages/api/position-levels/index.ts
```

**Step 4.3: Run Astro Check**
```bash
# Type-check and validate Astro files
pnpm astro check
```

**Step 4.4: Run TypeScript Compiler**
```bash
# Check for TypeScript errors
pnpm tsc --noEmit
```

### Phase 5: Documentation

**Step 5.1: Document Test Results**

**File**: `.ai/manual-testing-position-levels.md`

Template:
```markdown
# Manual Testing: GET /api/position-levels

**Date**: [Date]
**Tested By**: [Name]
**Environment**: Development

## Test Results

### Test 1: Happy Path (200 OK)
- **Status**: PASS/FAIL
- **Response Time**: X ms
- **Response Size**: X bytes
- **Notes**: [Any observations]

### Test 2: Response Structure
- **Has positions field**: PASS/FAIL
- **Has technical path**: PASS/FAIL
- **Has financial path**: PASS/FAIL
- **Has management path**: PASS/FAIL

### Test 3: Level Structure
- **J1 next_level**: PASS/FAIL
- **J1 required_badges**: PASS/FAIL

## Issues Found
[List any issues]

## Conclusion
[Overall assessment]
```

**Step 5.2: Update CLAUDE.md (if needed)**

Add entry for position levels endpoint in project documentation.

---

## 10. Testing Plan

### Unit Tests (Optional, Future Enhancement)

**Test File**: `src/pages/api/__tests__/position-levels.spec.ts`

**Test Cases**:
```typescript
describe("GET /api/position-levels", () => {
  it("should return 200 OK with position levels", async () => {
    // Test implementation
  });

  it("should have all required career paths", async () => {
    // Verify technical, financial, management paths
  });

  it("should have valid level structure", async () => {
    // Verify next_level and required_badges fields
  });

  it("should return 401 in production without auth", async () => {
    // Test authentication (production mode)
  });
});
```

### Integration Tests

**Manual Testing Checklist**:
- [ ] GET /api/position-levels returns 200 OK
- [ ] Response contains `positions` object
- [ ] Response includes `technical` path
- [ ] Response includes `financial` path
- [ ] Response includes `management` path
- [ ] Each level has `next_level` (except highest level)
- [ ] Each level has `required_badges` object
- [ ] Badge requirements have `level` and `count` fields
- [ ] Response size is reasonable (< 10 KB)
- [ ] Response is valid JSON
- [ ] Authentication works in production mode

### Performance Testing

**Load Test Script**:
```bash
# Test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/position-levels

# Expected results:
# - Requests per second: > 100
# - Time per request: < 100 ms
# - Failed requests: 0
```

**Test Results Template**:
```
Server Software:        Astro
Server Hostname:        localhost
Server Port:            3000

Document Path:          /api/position-levels
Document Length:        XXXX bytes

Concurrency Level:      10
Time taken for tests:   X.XXX seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      XXXX bytes
HTML transferred:       XXXX bytes
Requests per second:    XXX.XX [#/sec] (mean)
Time per request:       X.XXX [ms] (mean)
Time per request:       X.XXX [ms] (mean, across all concurrent requests)
Transfer rate:          XXX.XX [Kbytes/sec] received
```

### Automated Testing

**CI/CD Test Script** (future):
```yaml
# .github/workflows/test-api.yml
test-position-levels:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Build application
      run: pnpm build
    
    - name: Start server
      run: pnpm preview &
    
    - name: Wait for server
      run: sleep 5
    
    - name: Test endpoint
      run: |
        RESPONSE=$(curl -s http://localhost:3000/api/position-levels)
        echo "$RESPONSE" | jq -e '.positions.technical' || exit 1
```

---

## 11. Production Readiness Checklist

### Pre-Deployment

- [ ] Configuration file validated (valid JSON syntax)
- [ ] TypeScript types match configuration structure
- [ ] All career paths present (technical, financial, management)
- [ ] Level progressions validated (next_level references valid levels)
- [ ] Badge requirements validated (valid categories and levels)
- [ ] Authentication enabled for production
- [ ] Error handling implemented
- [ ] JSDoc documentation complete
- [ ] Manual testing completed
- [ ] Load testing completed
- [ ] No linting errors
- [ ] Code formatted with Prettier
- [ ] TypeScript compilation successful

### Post-Deployment

- [ ] Endpoint returns 200 OK in production
- [ ] Authentication works correctly
- [ ] Response matches expected structure
- [ ] Response time acceptable (< 50 ms)
- [ ] No 500 errors in logs
- [ ] Monitoring configured (error rate, response time)
- [ ] Documentation updated

### Monitoring Setup

**Metrics to Track**:
- Request count (per hour, per day)
- Response time (p50, p95, p99)
- Error rate (401, 500)
- Response size
- Cache hit rate (if caching enabled)

**Alerts to Configure**:
- 500 error rate > 0.1% (critical)
- 401 error rate > 5% (warning)
- Response time p95 > 100 ms (warning)
- Response time p99 > 500 ms (critical)

**Logging Configuration**:
```typescript
// Log format for monitoring
{
  timestamp: "2025-01-22T18:30:00Z",
  endpoint: "/api/position-levels",
  method: "GET",
  status_code: 200,
  response_time_ms: 5,
  user_id: "uuid", // If authenticated
  error: null,
}
```

---

## 12. Key Differences from Database-Driven Endpoints

| Aspect | Database Endpoints | Position Levels Endpoint |
|--------|-------------------|-------------------------|
| **Data Source** | Supabase PostgreSQL | Static JSON file |
| **Service Layer** | Required (e.g., PromotionService) | Not needed |
| **Input Validation** | Zod schemas (body, params, query) | None (no input) |
| **Query Optimization** | Indexes, pagination, filtering | N/A (no queries) |
| **Error Scenarios** | 6-8 scenarios | 2 scenarios (401, 500) |
| **Performance** | Variable (depends on query) | Constant (< 5 ms) |
| **Caching** | Complex (invalidation needed) | Simple (static data) |
| **Authorization** | Complex (ownership, roles) | Simple (any authenticated user) |
| **State Changes** | Mutations (POST, PUT, DELETE) | Read-only (GET only) |
| **Concurrency** | Race conditions possible | No concurrency issues |
| **Testing** | Database setup required | No database setup needed |

---

## 13. Future Enhancements

### Enhancement 1: HTTP Caching Headers

**Implementation**:
```typescript
return new Response(JSON.stringify(positionLevelsConfig), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=86400", // 24 hours
    "ETag": `"${configVersion}"`, // Based on deployment version
  },
});
```

**Benefits**:
- Reduces server load
- Improves client performance
- Reduces network bandwidth

### Enhancement 2: Configuration Versioning

**Implementation**:
```json
{
  "version": "1.0.0",
  "last_updated": "2025-01-22T10:00:00Z",
  "positions": { ... }
}
```

**Benefits**:
- Clients can detect configuration changes
- Support for version-specific logic
- Better cache invalidation

### Enhancement 3: Configuration Validation at Build Time

**Implementation**:
```typescript
// scripts/validate-config.ts
import { z } from "zod";
import positionLevelsConfig from "../src/config/position-levels.json";

const positionLevelSchema = z.object({
  next_level: z.string().optional(),
  required_badges: z.record(
    z.array(
      z.object({
        level: z.enum(["gold", "silver", "bronze"]),
        count: z.number().positive(),
      })
    )
  ),
});

const configSchema = z.object({
  positions: z.record(z.record(positionLevelSchema)),
});

try {
  configSchema.parse(positionLevelsConfig);
  console.log("✅ Configuration is valid");
} catch (error) {
  console.error("❌ Configuration validation failed:", error);
  process.exit(1);
}
```

**Add to `package.json`**:
```json
{
  "scripts": {
    "validate-config": "tsx scripts/validate-config.ts",
    "prebuild": "pnpm validate-config"
  }
}
```

**Benefits**:
- Prevents deployment of invalid configuration
- Catches errors at build time
- Type-safe configuration

### Enhancement 4: Dynamic Configuration (Database-Backed)

**Future Consideration**:
- Move configuration to `settings` table in database
- Add admin UI for editing position levels
- Support for multiple configuration versions
- Audit log for configuration changes
- A/B testing different career paths

**Implementation Plan**:
1. Create `position_levels` table
2. Add admin endpoints for CRUD operations
3. Migrate static JSON to database
4. Add caching layer (Redis)
5. Update this endpoint to fetch from database

**Benefits**:
- No deployment needed for configuration changes
- Version history and rollback
- Dynamic career path management
- User-specific configurations (future)

### Enhancement 5: GraphQL Support

**Future Consideration**:
```graphql
query GetPositionLevels {
  positionLevels {
    positions {
      technical {
        J1 {
          nextLevel
          requiredBadges {
            category
            requirements {
              level
              count
            }
          }
        }
      }
    }
  }
}
```

**Benefits**:
- Client-driven queries
- Reduced over-fetching
- Better frontend integration

---

## 14. Related Files

**Implementation Files**:
- `src/config/position-levels.json` (NEW) - Position levels configuration
- `src/pages/api/position-levels/index.ts` (NEW) - GET endpoint handler

**Type Definitions**:
- `src/types.ts` (lines 492-516) - `PositionLevelsResponse`, `PositionLevel`, `PositionLevelBadgeRequirement`

**API Specification**:
- `.ai/api-plan.md` (lines 1656-1728) - Endpoint specification

**Test Files**:
- `.ai/test-position-levels.sh` (NEW) - Automated test script
- `.ai/manual-testing-position-levels.md` (NEW) - Manual test results

**Documentation**:
- `CLAUDE.md` - Project overview
- `.cursor/rules/astro.mdc` - Astro implementation guidelines
- `.cursor/rules/backend.mdc` - Backend guidelines

**Similar Endpoints for Reference**:
- `src/pages/api/promotion-templates/index.ts` - List promotion templates (GET)
- `src/pages/api/catalog-badges/index.ts` - List catalog badges (GET)

---

## 15. Success Criteria

### Functional Requirements
✅ Endpoint returns 200 OK with position levels configuration  
✅ Response matches `PositionLevelsResponse` TypeScript interface  
✅ All three career paths present: technical, financial, management  
✅ Each level has valid structure (`next_level`, `required_badges`)  
✅ Badge requirements have correct schema (`level`, `count`)  
✅ Authentication check implemented (skipped in development)  
✅ Error handling for unexpected issues (500 errors)  

### Non-Functional Requirements
✅ Response time < 10 ms (p95)  
✅ No database queries (static data)  
✅ Configuration bundled at build time  
✅ Response size < 10 KB  
✅ No linting errors (ESLint)  
✅ Code formatted correctly (Prettier)  
✅ TypeScript compilation successful  
✅ JSDoc documentation complete  

### Testing Requirements
✅ Manual testing completed successfully  
✅ Test script created and passing  
✅ Response structure validated  
✅ All career paths verified  
✅ Badge requirements validated  

### Documentation Requirements
✅ Implementation plan complete  
✅ JSDoc comments in endpoint handler  
✅ Test script documented  
✅ Manual testing results documented  

---

## 16. Implementation Summary

**Complexity**: Low  
**Estimated Time**: 30-45 minutes  
**Dependencies**: None (standalone endpoint)  
**Risk Level**: Low (read-only, no database, static data)  

**Implementation Order**:
1. Create configuration file (`src/config/position-levels.json`) - 10 min
2. Implement endpoint handler (`src/pages/api/position-levels/index.ts`) - 15 min
3. Test endpoint (manual + automated) - 10 min
4. Run linters and fix issues - 5 min
5. Document results - 5 min

**Next Steps**:
1. ✅ Review implementation plan
2. ⏳ Implement Phase 1 (configuration file)
3. ⏳ Implement Phase 2 (endpoint handler)
4. ⏳ Implement Phase 3 (testing)
5. ⏳ Implement Phase 4 (code quality checks)
6. ⏳ Implement Phase 5 (documentation)

---

**Plan Created**: 2025-11-04  
**Last Updated**: 2025-11-04  
**Status**: Ready for Implementation  
**Assigned To**: Development Team  
**Priority**: Medium  
**Sprint**: Current  

---

## Appendix A: Example Configuration File

**File**: `src/config/position-levels.json`

```json
{
  "positions": {
    "technical": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "technical": [
            { "level": "bronze", "count": 3 }
          ]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "technical": [
            { "level": "silver", "count": 4 }
          ],
          "organizational": [
            { "level": "bronze", "count": 2 }
          ]
        }
      },
      "S1": {
        "next_level": "S2",
        "required_badges": {
          "technical": [
            { "level": "silver", "count": 6 }
          ],
          "any": [
            { "level": "gold", "count": 1 }
          ]
        }
      },
      "S2": {
        "next_level": "S3",
        "required_badges": {
          "technical": [
            { "level": "gold", "count": 2 }
          ],
          "any": [
            { "level": "silver", "count": 8 }
          ]
        }
      },
      "S3": {
        "required_badges": {
          "technical": [
            { "level": "gold", "count": 4 }
          ],
          "any": [
            { "level": "gold", "count": 2 }
          ]
        }
      }
    },
    "financial": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "organizational": [
            { "level": "bronze", "count": 3 }
          ]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "organizational": [
            { "level": "silver", "count": 4 }
          ],
          "technical": [
            { "level": "bronze", "count": 2 }
          ]
        }
      },
      "S1": {
        "next_level": "S2",
        "required_badges": {
          "organizational": [
            { "level": "silver", "count": 6 }
          ],
          "any": [
            { "level": "gold", "count": 1 }
          ]
        }
      },
      "S2": {
        "required_badges": {
          "organizational": [
            { "level": "gold", "count": 2 }
          ],
          "any": [
            { "level": "silver", "count": 8 }
          ]
        }
      }
    },
    "management": {
      "M1": {
        "next_level": "M2",
        "required_badges": {
          "softskilled": [
            { "level": "silver", "count": 4 }
          ],
          "organizational": [
            { "level": "bronze", "count": 2 }
          ]
        }
      },
      "M2": {
        "next_level": "M3",
        "required_badges": {
          "softskilled": [
            { "level": "gold", "count": 1 }
          ],
          "organizational": [
            { "level": "silver", "count": 3 }
          ]
        }
      },
      "M3": {
        "required_badges": {
          "softskilled": [
            { "level": "gold", "count": 2 }
          ],
          "organizational": [
            { "level": "gold", "count": 2 }
          ],
          "any": [
            { "level": "silver", "count": 5 }
          ]
        }
      }
    }
  }
}
```

---

## Appendix B: Complete Endpoint Implementation

**File**: `src/pages/api/position-levels/index.ts`

```typescript
import type { APIRoute } from "astro";
import type { PositionLevelsResponse } from "@/types";
import positionLevelsConfig from "@/config/position-levels.json";

/**
 * GET /api/position-levels
 *
 * Returns position levels configuration used for promotion template validation
 * and level progression logic.
 *
 * This endpoint serves static configuration data bundled with the application.
 * No database queries are performed. The configuration is loaded at build time
 * and returned as-is.
 *
 * **Authentication**: Required in production, skipped in development
 *
 * **Authorization**: Available to all authenticated users (no role restrictions)
 *
 * **Response Structure**:
 * ```json
 * {
 *   "positions": {
 *     "technical": { "J1": { "next_level": "J2", "required_badges": {...} } },
 *     "financial": { "J1": { "next_level": "J2", "required_badges": {...} } },
 *     "management": { "M1": { "next_level": "M2", "required_badges": {...} } }
 *   }
 * }
 * ```
 *
 * **Success Response**: 200 OK with position levels configuration
 *
 * **Error Responses**:
 * - 401 Unauthorized: Not authenticated (production only)
 * - 500 Internal Server Error: Configuration load failed (deployment issue)
 *
 * @returns {PositionLevelsResponse} Complete position levels configuration
 *
 * @example
 * ```typescript
 * // Fetch position levels
 * const response = await fetch('/api/position-levels');
 * const { positions } = await response.json();
 *
 * // Access technical path levels
 * const technicalLevels = positions.technical;
 * console.log(technicalLevels.J1.next_level); // "J2"
 * ```
 */
export const GET: APIRoute = async (context) => {
  try {
    // Authentication check (production only)
    // In development, authentication is skipped for convenience
    if (import.meta.env.PROD) {
      const {
        data: { user },
        error,
      } = await context.locals.supabase.auth.getUser();

      if (error || !user) {
        console.warn(
          "Unauthorized access attempt to /api/position-levels:",
          error?.message || "No user session"
        );

        return new Response(
          JSON.stringify({
            error: "unauthorized",
            message: "Authentication required",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate configuration exists and is well-formed
    if (!positionLevelsConfig || !positionLevelsConfig.positions) {
      console.error(
        "Position levels configuration is missing or invalid:",
        positionLevelsConfig
      );

      return new Response(
        JSON.stringify({
          error: "internal_error",
          message: "Failed to load position levels configuration",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return static configuration
    // Configuration is bundled at build time, no file I/O required
    return new Response(JSON.stringify(positionLevelsConfig), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log unexpected errors with full context
    console.error("Unexpected error in GET /api/position-levels:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return generic error response (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Failed to load position levels configuration",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
// Ensures dynamic behavior (e.g., authentication checks) works correctly
export const prerender = false;
```

---

**END OF IMPLEMENTATION PLAN**
