# Badge Application RLS Policy Fix

## Problem

Users were getting the following error when trying to create badge applications:

```
Error in POST /api/badge-applications: Error: Failed to create badge application: 
new row violates row-level security policy for table "badge_applications"
```

## Root Cause

The badge applications API endpoint (`/api/badge-applications`) was still in "development mode" with authentication disabled, using a hardcoded user ID:

```typescript
const userId = "550e8400-e29b-41d4-a716-446655440100"; // Default user (John Doe)
```

However, the Supabase client was authenticated with the **actual logged-in user** via session cookies from the middleware. This caused a mismatch:

- The API tried to insert with `applicant_id = hardcoded John Doe UUID`
- The RLS policy checked: `WITH CHECK (applicant_id = auth.uid())`
- `auth.uid()` returned the actual logged-in user's ID (from session)
- These didn't match → RLS policy blocked the INSERT

## RLS Policy

From `supabase/migrations/20251111000002_update_rls_to_auth_uid.sql`:

```sql
-- badge_applications: insert - only for self
CREATE POLICY badge_applications_insert_authenticated ON badge_applications 
FOR INSERT TO authenticated
WITH CHECK (applicant_id = auth.uid());
```

This policy ensures users can only create badge applications for themselves (not for other users).

## Solution

Enabled authentication in both GET and POST endpoints in `/api/badge-applications/index.ts`:

### Changes Made

1. **POST endpoint** (lines 176-226):
   - Removed hardcoded `userId`
   - Enabled authentication check using `context.locals.supabase.auth.getUser()`
   - Now uses authenticated user's ID: `const userId = user.id;`

2. **GET endpoint** (lines 33-81):
   - Removed hardcoded `userId` and `isAdmin` flag
   - Enabled authentication check
   - Fetches user's admin status from database
   - Now properly enforces that non-admin users only see their own applications

3. **Documentation updates**:
   - Removed "⚠️ DEVELOPMENT MODE" warnings
   - Updated comments to reflect authentication is now enabled
   - Added `401 Unauthorized` to return codes

## Impact

- ✅ Badge applications can now be created successfully
- ✅ Users can only create applications for themselves (RLS enforced)
- ✅ Non-admin users can only view their own applications
- ✅ Admin users can view all applications
- ✅ All 195 unit tests pass
- ✅ No linting errors

## Testing

To verify the fix:

1. **Create a badge application** (as authenticated user):
   ```bash
   POST /api/badge-applications
   {
     "catalog_badge_id": "<valid-uuid>",
     "date_of_application": "2025-11-13",
     "reason": "Test application"
   }
   ```
   Should return `201 Created` with application details

2. **List badge applications** (as authenticated user):
   ```bash
   GET /api/badge-applications
   ```
   Should return `200 OK` with only the user's own applications

3. **Verify RLS enforcement**:
   - Non-admin users cannot see other users' applications
   - Users cannot create applications with a different `applicant_id`

## Related Files

- `src/pages/api/badge-applications/index.ts` - Fixed authentication
- `src/lib/badge-application.service.ts` - Service layer (unchanged)
- `supabase/migrations/20251111000002_update_rls_to_auth_uid.sql` - RLS policies
- `src/middleware/index.ts` - Supabase client initialization (unchanged)

## Notes

- The Supabase client is automatically authenticated via session cookies from the middleware
- The RLS policy uses `auth.uid()` which comes from the Supabase session
- This fix ensures proper security: users can only create/view their own applications (unless admin)

