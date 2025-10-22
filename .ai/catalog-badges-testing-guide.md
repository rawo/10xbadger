# Testing Guide: GET /api/catalog-badges

This guide provides instructions for manually testing the `GET /api/catalog-badges` endpoint.

## ⚠️ Development Mode Notice

**Authentication is currently DISABLED for development purposes.**

- No authentication tokens required
- Default behavior: non-admin user (can only view active badges)
- To test admin features: Change `isAdmin = false` to `isAdmin = true` in the route handler code

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
   - Create sample catalog badges with various categories, levels, and statuses
   - Ensure you have some badges with `status = 'active'`
   - Ensure you have some badges with `status = 'inactive'` for admin testing

## Test Scenarios

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

## Using Browser Dev Tools

You can also test using the browser:

1. Open the application in the browser and sign in
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Run fetch requests:

```javascript
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
```

---

## Automated Testing Checklist

Once you run manual tests, verify:

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

---

## Performance Testing

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

1. Create integration tests using Vitest (when test framework is configured)
2. Set up API documentation (Swagger/OpenAPI)
3. Add performance monitoring
4. Implement rate limiting
5. Add caching for frequently accessed results
