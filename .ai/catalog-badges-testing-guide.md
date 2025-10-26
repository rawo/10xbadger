# Testing Guide: Catalog Badges API

This guide provides instructions for manually testing the catalog badges API endpoints:
- `GET /api/catalog-badges` - List badges with filtering and pagination
- `GET /api/catalog-badges/:id` - Get a single badge by ID

## ⚠️ Development Mode Notice

**Authentication is currently DISABLED for development purposes on both endpoints.**

### List Endpoint (`/api/catalog-badges`)
- No authentication tokens required
- Default behavior: non-admin user (can only view active badges)
- To test admin features: Change `isAdmin = false` to `isAdmin = true` in `src/pages/api/catalog-badges/index.ts`

### Detail Endpoint (`/api/catalog-badges/:id`)
- No authentication tokens required
- All badges accessible regardless of status
- No role-based filtering applied

Authentication will be re-enabled before production deployment.

## Prerequisites

1. **Start the development server**:
   ```bash
   pnpm dev
   ```
   The server should be running on `http://localhost:3000` (or configured port)

2. **Set up Supabase**:
   - Ensure local Supabase is running: `npx supabase start`
   - Or configure `.env` with remote Supabase credentials

3. **Seed test data**:
   - Import sample data using the quick start guide (`.ai/quick-start-data-import.md`)
   - Or create sample catalog badges with various categories, levels, and statuses
   - Ensure you have some badges with `status = 'active'`
   - Ensure you have some badges with `status = 'inactive'` for admin testing

## Quick Reference - Sample Badge IDs

After importing sample data (see `.ai/quick-start-data-import.md`):

| ID | Title | Category | Level |
|---|---|---|---|
| `550e8400-e29b-41d4-a716-446655440001` | PostgreSQL Expert | technical | gold |
| `550e8400-e29b-41d4-a716-446655440002` | Team Leadership | organizational | silver |
| `550e8400-e29b-41d4-a716-446655440003` | Effective Communication | softskilled | bronze |

Use these IDs when testing the detail endpoint.

## Test Scenarios - List Endpoint

### GET /api/catalog-badges

### 1. Basic Request

**Description**: List active badges with default pagination

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges"
```

**Expected Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid-here",
      "title": "PostgreSQL Expert",
      "description": "...",
      "category": "technical",
      "level": "gold",
      "status": "active",
      "created_by": "uuid-here",
      "created_at": "2025-01-10T09:00:00Z",
      "deactivated_at": null,
      "version": 1,
      "metadata": {}
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

### 2. Filter by Category

**Description**: Get only technical badges

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?category=technical"
```

**Expected Response**: `200 OK` with only `category: "technical"` badges

---

### 3. Filter by Level

**Description**: Get only gold badges

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?level=gold"
```

**Expected Response**: `200 OK` with only `level: "gold"` badges

---

### 4. Full-Text Search on Title

**Description**: Search for badges with "PostgreSQL" in title

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?q=PostgreSQL"
```

**Expected Response**: `200 OK` with badges matching "PostgreSQL" in title

---

### 5. Sort by Title (Ascending)

**Description**: Sort badges by title alphabetically

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?sort=title&order=asc"
```

**Expected Response**: `200 OK` with badges sorted by title A-Z

---

### 6. Pagination

**Description**: Get 10 badges starting from offset 20

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?limit=10&offset=20"
```

**Expected Response**: `200 OK`
```json
{
  "data": [...], // 10 items
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 20,
    "has_more": true
  }
}
```

---

### 7. Admin Status Filter - Requires Code Change

**Description**: Test admin access to inactive badges

**Setup**:
1. Open `src/pages/api/catalog-badges.ts`
2. Change `const isAdmin = false;` to `const isAdmin = true;`
3. Restart the dev server

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?status=inactive"
```

**Expected Response**: `200 OK` with inactive badges

**Cleanup**: Change `isAdmin` back to `false` after testing

---

### 8. Non-Admin Status Filter - Should Fail

**Description**: Non-admin user tries to filter by status (default behavior)

**Setup**: Ensure `isAdmin = false` in the code (default)

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?status=inactive"
```

**Expected Response**: `403 Forbidden`
```json
{
  "error": "forbidden",
  "message": "Only administrators can filter by status"
}
```

---

### 9. Invalid Category - Validation Error

**Description**: Provide invalid category value

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?category=invalid"
```

**Expected Response**: `400 Bad Request`
```json
{
  "error": "validation_error",
  "message": "Invalid query parameters",
  "details": [
    {
      "field": "category",
      "message": "Invalid enum value. Expected 'technical' | 'organizational' | 'softskilled', received 'invalid'"
    }
  ]
}
```

---

### 10. Invalid Limit - Validation Error

**Description**: Provide limit > 100

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?limit=200"
```

**Expected Response**: `400 Bad Request`
```json
{
  "error": "validation_error",
  "message": "Invalid query parameters",
  "details": [
    {
      "field": "limit",
      "message": "Number must be less than or equal to 100"
    }
  ]
}
```

---

### 11. Negative Offset - Validation Error

**Description**: Provide negative offset

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?offset=-10"
```

**Expected Response**: `400 Bad Request`
```json
{
  "error": "validation_error",
  "message": "Invalid query parameters",
  "details": [
    {
      "field": "offset",
      "message": "Number must be greater than or equal to 0"
    }
  ]
}
```

---

### 12. Combined Filters

**Description**: Apply multiple filters at once

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges?category=technical&level=gold&sort=title&order=asc&limit=5"
```

**Expected Response**: `200 OK` with 5 technical gold badges sorted by title

---

## Test Scenarios - Detail Endpoint

### GET /api/catalog-badges/:id

### 13. Get Badge by Valid ID (PostgreSQL Expert)

**Description**: Retrieve a single badge using a valid UUID

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001"
```

**Expected Response**: `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL database administration, optimization, and performance tuning. Successfully implemented complex queries, indexing strategies, and backup/recovery procedures.",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440100",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": null,
  "version": 1,
  "metadata": {
    "skills": ["SQL", "indexing", "query optimization", "performance tuning"],
    "difficulty": "advanced"
  }
}
```

---

### 14. Get Badge by Valid ID (Team Leadership)

**Description**: Retrieve the silver organizational badge

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440002"
```

**Expected Response**: `200 OK` with Team Leadership badge details

---

### 15. Get Badge by Valid ID (Effective Communication)

**Description**: Retrieve the bronze soft-skilled badge

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440003"
```

**Expected Response**: `200 OK` with Effective Communication badge details

---

### 16. Badge Not Found (Valid UUID)

**Description**: Request a badge that doesn't exist using a valid UUID format

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999"
```

**Expected Response**: `404 Not Found`
```json
{
  "error": "not_found",
  "message": "Catalog badge not found"
}
```

---

### 17. Invalid UUID Format (Random String)

**Description**: Provide a non-UUID string

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/invalid-id"
```

**Expected Response**: `400 Bad Request`
```json
{
  "error": "invalid_parameter",
  "message": "Invalid badge ID format. Must be a valid UUID."
}
```

---

### 18. Invalid UUID Format (Numeric ID)

**Description**: Provide a numeric ID instead of UUID

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/123"
```

**Expected Response**: `400 Bad Request`
```json
{
  "error": "invalid_parameter",
  "message": "Invalid badge ID format. Must be a valid UUID."
}
```

---

### 19. Invalid UUID Format (Short String)

**Description**: Provide a short alphanumeric string

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/abc123"
```

**Expected Response**: `400 Bad Request`

---

### 20. Malformed UUID (Incorrect Format)

**Description**: Provide a UUID-like string with incorrect format

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716"
```

**Expected Response**: `400 Bad Request`

---

### 21. Empty ID (Root Endpoint)

**Description**: Access the root catalog-badges endpoint without ID

**Request**:
```bash
curl -X GET "http://localhost:3000/api/catalog-badges/"
```

**Expected Response**: `200 OK` - This should route to the list endpoint and return paginated badges (same as test #1)

---

## Using Browser Dev Tools

You can also test using the browser:

1. Open the application in the browser and sign in
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Run fetch requests:

```javascript
// ============================================================================
// List Endpoint Tests
// ============================================================================

// Basic request
fetch('/api/catalog-badges')
  .then(res => res.json())
  .then(data => console.log(data));

// With query parameters
fetch('/api/catalog-badges?category=technical&level=gold&limit=5')
  .then(res => res.json())
  .then(data => console.log(data));

// Check response status
fetch('/api/catalog-badges?category=invalid')
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Error:', data));

// ============================================================================
// Detail Endpoint Tests
// ============================================================================

// Get badge by valid ID (PostgreSQL Expert)
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001')
  .then(res => res.json())
  .then(data => console.log('Badge:', data));

// Get badge by valid ID (Team Leadership)
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655440002')
  .then(res => res.json())
  .then(data => console.log('Badge:', data));

// Test not found (valid UUID, but doesn't exist)
fetch('/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999')
  .then(res => {
    console.log('Status:', res.status); // Should be 404
    return res.json();
  })
  .then(data => console.log('Not found error:', data));

// Test invalid UUID format
fetch('/api/catalog-badges/invalid-id')
  .then(res => {
    console.log('Status:', res.status); // Should be 400
    return res.json();
  })
  .then(data => console.log('Validation error:', data));

// Test with numeric ID
fetch('/api/catalog-badges/123')
  .then(res => {
    console.log('Status:', res.status); // Should be 400
    return res.json();
  })
  .then(data => console.log('Validation error:', data));
```

---

## Automated Testing Checklist

Once you run manual tests, verify:

### List Endpoint (GET /api/catalog-badges)

- [ ] Authorization works (403 for non-admin status filter)
- [ ] Category filter works correctly
- [ ] Level filter works correctly
- [ ] Full-text search returns matching results
- [ ] Sorting works (both asc and desc)
- [ ] Sorting works for both created_at and title
- [ ] Pagination limit is enforced (max 100)
- [ ] Pagination offset works correctly
- [ ] `has_more` flag is accurate in pagination
- [ ] Validation errors have detailed field-level messages
- [ ] Non-admin users only see active badges (default behavior)
- [ ] Admin users can see all badges and filter by status (when `isAdmin = true`)
- [ ] Database errors return 500 with generic message
- [ ] Multiple filters can be combined
- [ ] No authentication required in development mode

### Detail Endpoint (GET /api/catalog-badges/:id)

- [ ] Returns 200 OK for valid badge ID
- [ ] Returns complete badge details including metadata
- [ ] Returns 404 Not Found for non-existent badge (valid UUID)
- [ ] Returns 400 Bad Request for invalid UUID format
- [ ] UUID validation rejects numeric IDs (123)
- [ ] UUID validation rejects random strings (abc123, invalid-id)
- [ ] UUID validation rejects malformed UUIDs
- [ ] Error messages are clear and specific
- [ ] Database errors return 500 with generic message
- [ ] No authentication required in development mode
- [ ] Works with all three sample badge IDs
- [ ] Root endpoint (/) routes to list endpoint

---

## Performance Testing

### List Endpoint Performance

Test with larger datasets:

```bash
# Create 1000+ test badges in database
# Then test pagination performance

time curl -X GET "http://localhost:3000/api/catalog-badges?limit=100"

# Test full-text search performance
time curl -X GET "http://localhost:3000/api/catalog-badges?q=test"

# Test with multiple filters
time curl -X GET "http://localhost:3000/api/catalog-badges?category=technical&level=gold&q=database"
```

Expected performance:
- Small datasets (< 1000): < 100ms
- Medium datasets (1000-10000): < 200ms
- Large datasets (> 10000): < 500ms

### Detail Endpoint Performance

Test single badge retrieval:

```bash
# Test primary key lookup performance
time curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001"

# Run multiple times to test caching (if implemented)
for i in {1..10}; do
  time curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655440001"
done

# Test 404 performance
time curl -X GET "http://localhost:3000/api/catalog-badges/550e8400-e29b-41d4-a716-446655449999"

# Test validation error performance
time curl -X GET "http://localhost:3000/api/catalog-badges/invalid-id"
```

Expected performance:
- Primary key lookup: < 10ms (local database)
- 404 response: < 10ms
- Validation error: < 5ms (no database query)

---

## Debugging Tips

If you encounter errors:

1. **Check server logs**: Look at console output in the terminal running `pnpm dev`
2. **Check Supabase logs**: Run `npx supabase logs` for database errors
3. **Verify authentication**: Use browser dev tools to check session cookies/tokens
4. **Check database data**: Verify test data exists using Supabase Studio
5. **TypeScript errors**: Run `pnpm astro check` to check for type errors

---

## Next Steps

After manual testing:

1. **Integration Tests**: Create automated tests using Vitest (when test framework is configured)
   - Test list endpoint with all filter combinations
   - Test detail endpoint with various ID formats
   - Test error scenarios
   - Test pagination edge cases

2. **API Documentation**: Set up Swagger/OpenAPI
   - Document both list and detail endpoints
   - Include request/response examples
   - Add authentication documentation when re-enabled

3. **Performance Optimization**:
   - Add caching for frequently accessed badges (detail endpoint)
   - Implement database query optimization
   - Add performance monitoring and logging

4. **Security Enhancements**:
   - Re-enable authentication when ready
   - Implement rate limiting
   - Add request validation middleware
   - Implement CORS policies

5. **Additional Endpoints**: Implement remaining CRUD operations
   - POST /api/catalog-badges (create badge)
   - PATCH /api/catalog-badges/:id (update badge)
   - DELETE /api/catalog-badges/:id (deactivate badge)

## Summary

This testing guide covers both catalog badge API endpoints:

✅ **List Endpoint** (GET /api/catalog-badges)
- 12 test scenarios covering filters, search, pagination, validation, and authorization
- Comprehensive parameter validation testing
- Performance benchmarks for various dataset sizes

✅ **Detail Endpoint** (GET /api/catalog-badges/:id)
- 9 test scenarios covering valid IDs, not found, and various validation errors
- UUID format validation testing
- Primary key lookup performance testing

Both endpoints are ready for development testing with authentication disabled. Remember to re-enable authentication before production deployment!
