# Manual Testing Guide: GET /api/promotions/:id

This document provides step-by-step instructions for manually testing the GET /api/promotions/:id endpoint.

## Prerequisites

1. Development server running: `pnpm dev`
2. Test data in Supabase database (promotions, templates, badge applications, users)
3. Tool for making HTTP requests (curl, Postman, or browser)

## Test Scenarios

### 1. Success Case - Valid Promotion ID

**Test**: Fetch an existing promotion with valid UUID

```bash
curl -X GET 'http://localhost:3000/api/promotions/[VALID_PROMOTION_UUID]'
```

**Expected Result**:
- Status: 200 OK
- Response body contains:
  - All promotion fields (id, status, dates, etc.)
  - `template` object with nested details and `rules` array
  - `badge_applications` array with nested `catalog_badge` objects
  - `creator` object with user information

**Validation Checklist**:
- [ ] Response has correct status code (200)
- [ ] Promotion ID matches request
- [ ] Template object is complete with rules array
- [ ] Badge applications array is present (may be empty for drafts)
- [ ] Creator object has id, display_name, email
- [ ] All timestamps are ISO 8601 format
- [ ] Content-Type is application/json

### 2. Validation Error - Invalid UUID Format

**Test**: Request with malformed UUID

```bash
curl -X GET 'http://localhost:3000/api/promotions/invalid-uuid'
```

**Expected Result**:
- Status: 400 Bad Request
- Response body:
```json
{
  "error": "validation_error",
  "message": "Invalid promotion ID format",
  "details": [
    {
      "field": "id",
      "message": "Invalid UUID format"
    }
  ]
}
```

**Validation Checklist**:
- [ ] Response has correct status code (400)
- [ ] Error code is "validation_error"
- [ ] Details array contains field-level error
- [ ] Content-Type is application/json

### 3. Not Found - Non-Existent Promotion

**Test**: Request with valid UUID that doesn't exist

```bash
curl -X GET 'http://localhost:3000/api/promotions/99999999-9999-4999-8999-999999999999'
```

**Expected Result**:
- Status: 404 Not Found
- Response body:
```json
{
  "error": "not_found",
  "message": "Promotion not found"
}
```

**Validation Checklist**:
- [ ] Response has correct status code (404)
- [ ] Error code is "not_found"
- [ ] Generic error message (doesn't reveal if promotion exists)
- [ ] Content-Type is application/json

### 4. Response Structure Verification

**Test**: Verify complete response structure

```bash
curl -s 'http://localhost:3000/api/promotions/[VALID_UUID]' | python3 -m json.tool
```

**Expected Structure**:
```json
{
  "id": "uuid",
  "template_id": "uuid",
  "created_by": "uuid",
  "path": "technical|financial|management",
  "from_level": "string",
  "to_level": "string",
  "status": "draft|submitted|approved|rejected",
  "created_at": "ISO timestamp",
  "submitted_at": "ISO timestamp | null",
  "approved_at": "ISO timestamp | null",
  "approved_by": "uuid | null",
  "rejected_at": "ISO timestamp | null",
  "rejected_by": "uuid | null",
  "reject_reason": "string | null",
  "executed": boolean,
  "template": {
    "id": "uuid",
    "name": "string",
    "path": "string",
    "from_level": "string",
    "to_level": "string",
    "rules": [
      {
        "category": "technical|organizational|softskilled|any",
        "level": "gold|silver|bronze",
        "count": number
      }
    ],
    "is_active": boolean
  },
  "badge_applications": [
    {
      "id": "uuid",
      "catalog_badge_id": "uuid",
      "date_of_fulfillment": "YYYY-MM-DD | null",
      "status": "badge application status",
      "catalog_badge": {
        "id": "uuid",
        "title": "string",
        "category": "technical|organizational|softskilled",
        "level": "gold|silver|bronze"
      }
    }
  ],
  "creator": {
    "id": "uuid",
    "display_name": "string",
    "email": "string"
  }
}
```

**Validation Checklist**:
- [ ] All nested objects present
- [ ] Arrays are valid (not undefined)
- [ ] Template rules array has correct structure
- [ ] Badge applications have nested catalog_badge
- [ ] All UUIDs are properly formatted
- [ ] Enums have valid values

### 5. Different Promotion Statuses

**Test**: Verify endpoint works for all promotion statuses

```bash
# Draft promotion
curl -X GET 'http://localhost:3000/api/promotions/[DRAFT_UUID]'

# Submitted promotion
curl -X GET 'http://localhost:3000/api/promotions/[SUBMITTED_UUID]'

# Approved promotion
curl -X GET 'http://localhost:3000/api/promotions/[APPROVED_UUID]'

# Rejected promotion
curl -X GET 'http://localhost:3000/api/promotions/[REJECTED_UUID]'
```

**Expected Result**: All return 200 with appropriate status field

**Validation Checklist**:
- [ ] Draft: submitted_at, approved_at, rejected_at are null
- [ ] Submitted: submitted_at is set, others are null
- [ ] Approved: submitted_at and approved_at are set
- [ ] Rejected: submitted_at and rejected_at are set, reject_reason present

### 6. Performance Testing

**Test**: Measure response time

```bash
curl -w "\nTime: %{time_total}s\n" -s \
  'http://localhost:3000/api/promotions/[VALID_UUID]' \
  > /dev/null
```

**Expected Result**: Response time < 200ms

**Validation Checklist**:
- [ ] Response time is acceptable
- [ ] No N+1 query issues (single query with joins)
- [ ] Response size is reasonable (typically 2-10KB)

### 7. Empty Badge Applications

**Test**: Fetch promotion with no badge applications (draft)

```bash
curl -X GET 'http://localhost:3000/api/promotions/[DRAFT_UUID_WITH_NO_BADGES]'
```

**Expected Result**:
- Status: 200 OK
- `badge_applications` is empty array `[]` (not null or undefined)

**Validation Checklist**:
- [ ] badge_applications is an array
- [ ] Array is empty but defined
- [ ] Other fields are correct

## Development Mode Notes

- **Authentication is currently DISABLED** for development
- All promotions are visible (behaves as admin)
- In production, authorization will be enforced:
  - Non-admin users: only see own promotions
  - Admin users: see all promotions
  - Unauthorized access returns 404 (not 403) for security

## Testing with Production Authentication (When Enabled)

### Authorization Tests (Future)

1. **User Access Own Promotion**:
   - User should be able to access their own promotion (200)

2. **User Access Other's Promotion**:
   - User should get 404 when trying to access another user's promotion
   - Response should not reveal if promotion exists (security)

3. **Admin Access Any Promotion**:
   - Admin should be able to access any promotion (200)

## Common Issues and Troubleshooting

### Issue: 500 Internal Server Error
- Check server logs for detailed error
- Verify database connection
- Check Supabase credentials in .env

### Issue: Empty Response or Null Fields
- Verify test data exists in database
- Check database joins are working
- Verify foreign key relationships

### Issue: Incorrect Response Structure
- Check DTO transformation in service layer
- Verify Supabase nested select syntax
- Check for typos in field names

## Test Data Requirements

For complete testing, ensure database has:

1. **Promotions Table**:
   - Multiple promotions with different statuses
   - Promotions with and without badge applications
   - Promotions from different users

2. **Promotion Templates Table**:
   - Active templates with rules
   - Templates for different paths

3. **Badge Applications Table**:
   - Applications linked to promotions via promotion_badges
   - Applications with different statuses

4. **Catalog Badges Table**:
   - Badges referenced by badge applications

5. **Users Table**:
   - Users who created promotions

## Automated Test Coverage

See test files for automated coverage:
- **Endpoint Tests**: `src/pages/api/__tests__/promotions.get-one.endpoint.spec.ts`
- **Service Tests**: `src/lib/__tests__/promotion.service.getById.spec.ts`

Both test suites pass with 100% coverage of main scenarios.

## Summary Checklist

Before marking manual testing complete:

- [ ] All 7 test scenarios executed
- [ ] All validation checklists completed
- [ ] Response times are acceptable
- [ ] No errors in server logs
- [ ] Response structure matches specification
- [ ] Edge cases handled correctly
- [ ] Documentation reviewed and accurate

