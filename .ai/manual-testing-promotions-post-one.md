# Manual Testing Guide: POST /api/promotions

This document provides comprehensive manual testing procedures for the `POST /api/promotions` endpoint.

## Prerequisites

Before testing, ensure the following:

1. **Supabase is running locally**:
   ```bash
   npx supabase start
   ```

2. **Development server is running**:
   ```bash
   pnpm dev
   ```

3. **Sample data is imported**:
   - Users table has at least one user
   - Promotion templates table has at least one active template

## Test Scenarios

### Test 1: Get Active Template ID

**Purpose**: Retrieve an active template ID to use in subsequent tests.

**Command**:
```bash
curl -s 'http://localhost:3000/api/promotion-templates?is_active=true' | python3 -m json.tool
```

**Expected Result**:
- Status: 200 OK
- Response contains array of active templates
- Note the `id` field from one of the templates for use in next tests

**Example Response**:
```json
{
  "data": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440020",
      "name": "S1 to S2 - Technical Path",
      "path": "technical",
      "from_level": "S1",
      "to_level": "S2",
      "is_active": true,
      ...
    }
  ]
}
```

---

### Test 2: Create Valid Promotion (Success Case)

**Purpose**: Verify successful promotion creation with valid template ID.

**Command**:
```bash
curl -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "750e8400-e29b-41d4-a716-446655440020"
  }' | python3 -m json.tool
```

**Expected Result**:
- Status: 201 Created
- Response contains created promotion object
- Fields to verify:
  - `status` = "draft"
  - `executed` = false
  - `path`, `from_level`, `to_level` copied from template
  - `created_by` = test user ID
  - `submitted_at`, `approved_at`, `rejected_at` = null
  - `template_id` matches request

**Example Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "draft",
  "created_at": "2025-01-22T18:00:00Z",
  "submitted_at": null,
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": false
}
```

---

### Test 3: Missing Request Body

**Purpose**: Verify error handling for missing request body.

**Command**:
```bash
curl -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' | python3 -m json.tool
```

**Expected Result**:
- Status: 400 Bad Request
- Error code: "validation_error"
- Message indicates request body is required

**Example Response**:
```json
{
  "error": "validation_error",
  "message": "Request body is required and must be valid JSON"
}
```

---

### Test 4: Empty Request Body

**Purpose**: Verify error handling for empty request body (missing template_id).

**Command**:
```bash
curl -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -m json.tool
```

**Expected Result**:
- Status: 400 Bad Request
- Error code: "validation_error"
- Details indicate template_id is required

**Example Response**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "template_id",
      "message": "Required"
    }
  ]
}
```

---

### Test 5: Invalid UUID Format

**Purpose**: Verify UUID format validation.

**Command**:
```bash
curl -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invalid-uuid"
  }' | python3 -m json.tool
```

**Expected Result**:
- Status: 400 Bad Request
- Error code: "validation_error"
- Details indicate invalid UUID format

**Example Response**:
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "template_id",
      "message": "Invalid template ID format"
    }
  ]
}
```

---

### Test 6: Template Not Found

**Purpose**: Verify error handling for non-existent template.

**Command**:
```bash
curl -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "750e8400-0000-0000-0000-000000000000"
  }' | python3 -m json.tool
```

**Expected Result**:
- Status: 404 Not Found
- Error code: "not_found"
- Message: "Promotion template not found"

**Example Response**:
```json
{
  "error": "not_found",
  "message": "Promotion template not found"
}
```

---

### Test 7: Verify Database Record

**Purpose**: Confirm promotion was created in database with correct values.

**Command**:
```bash
# First, create a promotion and extract the ID
PROMOTION_ID=$(curl -s -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{"template_id": "750e8400-e29b-41d4-a716-446655440020"}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

# Then query the database
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT id, status, path, from_level, to_level, created_by, executed FROM promotions WHERE id = '$PROMOTION_ID';"
```

**Expected Result**:
- Database record exists with matching ID
- All fields match the API response
- `status` = 'draft'
- `executed` = false
- `path`, `from_level`, `to_level` match template

---

### Test 8: Verify Template Fields Copied

**Purpose**: Confirm template metadata is correctly copied to promotion.

**Command**:
```bash
# Get template details
TEMPLATE_ID="750e8400-e29b-41d4-a716-446655440020"

echo "Template details:"
curl -s "http://localhost:3000/api/promotion-templates/$TEMPLATE_ID" | \
  python3 -c "import json,sys; t=json.load(sys.stdin); print(f\"  path={t['path']}, from={t['from_level']}, to={t['to_level']}\")"

# Create promotion
echo -e "\nPromotion details:"
curl -s -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d "{\"template_id\": \"$TEMPLATE_ID\"}" | \
  python3 -c "import json,sys; p=json.load(sys.stdin); print(f\"  path={p['path']}, from={p['from_level']}, to={p['to_level']}\")"
```

**Expected Result**:
- Promotion path, from_level, to_level exactly match template
- Values are denormalized (copied) for performance

---

### Test 9: Malformed JSON

**Purpose**: Verify error handling for invalid JSON syntax.

**Command**:
```bash
curl -X POST 'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{ "template_id": "broken' | python3 -m json.tool
```

**Expected Result**:
- Status: 400 Bad Request
- Error code: "validation_error"
- Message indicates invalid JSON

---

### Test 10: Performance Test

**Purpose**: Measure response time for promotion creation.

**Command**:
```bash
curl -w "\nTime: %{time_total}s\n" -s -X POST \
  'http://localhost:3000/api/promotions' \
  -H 'Content-Type: application/json' \
  -d '{"template_id": "750e8400-e29b-41d4-a716-446655440020"}' \
  > /dev/null
```

**Expected Result**:
- Response time < 100ms (target)
- Response time < 200ms (acceptable)
- Consistent response times across multiple requests

**Multiple Requests Test**:
```bash
for i in {1..5}; do
  echo "Request $i:"
  curl -w "Time: %{time_total}s\n" -s -X POST \
    'http://localhost:3000/api/promotions' \
    -H 'Content-Type: application/json' \
    -d '{"template_id": "750e8400-e29b-41d4-a716-446655440020"}' \
    > /dev/null
done
```

---

## Cleanup

After testing, you may want to clean up created promotions:

```bash
# List all draft promotions
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT id, template_id, created_at FROM promotions WHERE status = 'draft' ORDER BY created_at DESC LIMIT 10;"

# Delete test promotions (optional)
# Replace PROMOTION_ID with IDs from above query
# psql postgresql://postgres:postgres@localhost:54322/postgres \
#   -c "DELETE FROM promotions WHERE id = 'PROMOTION_ID';"
```

## Troubleshooting

### Issue: "Test user not found"

**Cause**: No users in database.

**Solution**: Import sample users:
```bash
# Check if users exist
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT COUNT(*) FROM users;"

# If no users, import sample data
# (Follow instructions in .ai/import-sample-user.md)
```

### Issue: "Promotion template not found"

**Cause**: No active templates in database.

**Solution**: Create a template or import sample data:
```bash
# Check active templates
curl -s 'http://localhost:3000/api/promotion-templates?is_active=true' | python3 -m json.tool

# If empty, create a template via API (requires admin)
```

### Issue: Slow response times

**Cause**: Database not indexed properly or database not running.

**Solution**:
1. Verify Supabase is running: `npx supabase status`
2. Check database indexes exist (see db-plan.md)
3. Restart Supabase if needed: `npx supabase restart`

---

## Summary

This endpoint creates draft promotions efficiently with:
- ✅ Proper UUID validation
- ✅ Template existence and active status validation
- ✅ Denormalized template fields for performance
- ✅ Comprehensive error handling
- ✅ Security (no information disclosure for inactive templates)
- ✅ Fast response times (< 100ms typical)

All tests should pass with expected status codes and response structures.
