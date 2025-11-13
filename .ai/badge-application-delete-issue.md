# Badge Application Delete Issue - Investigation Summary

## Error Report

**Error Message**: `Error: Failed to delete badge application: no rows deleted`

**Stack Trace**:
```
at BadgeApplicationService.deleteBadgeApplication (/Users/rawo/Projects/10xbadger/src/lib/badge-application.service.ts:526:13)
at async Module.DELETE (/Users/rawo/Projects/10xbadger/src/pages/api/badge-applications/[id].ts:354:22)
```

**HTTP Status**: 500 Internal Server Error

**Endpoint**: `DELETE /api/badge-applications/2b580f63-99fc-49a6-9d9e-39131fa28452`

---

## Root Cause Analysis

### The Problem

The RLS (Row-Level Security) policy for DELETE operations on `badge_applications` is **more restrictive** than the business logic enforced in the application code.

**Current RLS Policy** (from `supabase/migrations/20251111000002_update_rls_to_auth_uid.sql`, lines 111-113):

```sql
-- badge_applications: delete - admin only
CREATE POLICY badge_applications_delete_authenticated ON badge_applications FOR DELETE TO authenticated
USING (is_admin());
```

This policy **only allows admins** to delete badge applications.

**Business Logic** (from `src/lib/badge-application.service.ts`, lines 481-491):

```typescript
// Ownership/authorization checks
if (!isAdmin) {
  if (!requesterId || row.applicant_id !== requesterId) {
    throw new Error("FORBIDDEN");
  }

  // Owners may only delete drafts
  if (row.status !== "draft") {
    throw new Error("FORBIDDEN");
  }
}
```

The service code allows:
1. **Admins** to delete any badge application
2. **Regular users** to delete their own draft applications

### Why the Mismatch Occurred

There are two relevant migrations that modified the DELETE policy:

1. **Earlier Migration** (`20251110000000_fix_badge_applications_delete_policy.sql`):
   - Allowed users to delete their own drafts
   - Used custom setting-based authorization

```sql
create policy badge_applications_delete_authenticated on badge_applications for delete to authenticated using (
  (
    -- allow if user is admin
    (current_setting('app.is_admin', true) = 'true')
    or
    -- or if user is the applicant and status is 'draft'
    (
      current_setting('app.current_user_id', true) is not null
      and applicant_id = current_setting('app.current_user_id', true)::uuid
      and status = 'draft'
    )
  )
);
```

2. **Later Migration** (`20251111000002_update_rls_to_auth_uid.sql`):
   - Updated all RLS policies to use `auth.uid()` instead of custom settings
   - **Accidentally made DELETE admin-only**, removing user's ability to delete own drafts
   - This migration drops and recreates all policies, overriding the previous fix

### Sequence of Events Leading to Error

1. User (non-admin) attempts to delete their own draft badge application
2. API endpoint authenticates the user and calls `service.deleteBadgeApplication(id, userId, false)`
3. Service fetches the application using SELECT (succeeds via RLS - users can read own applications)
4. Service performs application-level authorization checks:
   - ✅ User is the owner (`row.applicant_id === requesterId`)
   - ✅ Application status is 'draft'
   - **Authorization passes**
5. Service checks for dependencies in `promotion_badges` (none found)
6. Service attempts DELETE query:
   ```typescript
   const { data: deletedRows, error: delError } = await this.supabase
     .from("badge_applications")
     .delete()
     .eq("id", id)
     .select("id");
   ```
7. **DELETE fails silently due to RLS**: The `USING (is_admin())` clause evaluates to `false` for non-admin users, so **no rows match the policy criteria**, and Supabase returns 0 rows deleted
8. Service detects the failure at line 525-526:
   ```typescript
   if (!deletedRows || (Array.isArray(deletedRows) && deletedRows.length === 0)) {
     throw new Error("Failed to delete badge application: no rows deleted");
   }
   ```

### Why This is Similar to Previous Issues

This follows the same pattern as the "Application not found" issue we fixed earlier:

- **Application code** performs its own authorization checks (using `userId` and `isAdmin` parameters)
- **RLS policies** enforce database-level security (using `auth.uid()` and `is_admin()`)
- **Mismatch** between the two causes unexpected failures

In the previous case, we had to enable authentication in the API endpoints. In this case, authentication is already enabled, but the RLS policy is too restrictive.

---

## Technical Details

### Current Database State

**RLS Policy**: Admin-only DELETE
```sql
CREATE POLICY badge_applications_delete_authenticated ON badge_applications FOR DELETE TO authenticated
USING (is_admin());
```

**Helper Function** (from `supabase/migrations/20251111000002_update_rls_to_auth_uid.sql`, lines 14-27):
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Expected Behavior

According to:
- PRD requirements
- Service documentation (line 459-463 in `badge-application.service.ts`)
- Earlier migration intent (`20251110000000_fix_badge_applications_delete_policy.sql`)

Users should be able to delete their own draft applications.

### Related Policies (for reference)

The UPDATE policy correctly allows both admins and users to modify drafts:

```sql
-- badge_applications: update - own drafts or admin for review
CREATE POLICY badge_applications_update_authenticated ON badge_applications FOR UPDATE TO authenticated
USING (
  (applicant_id = auth.uid() AND status = 'draft') OR is_admin()
)
WITH CHECK (
  is_admin() OR (reviewed_by IS NULL AND reviewed_at IS NULL)
);
```

The DELETE policy should follow a similar pattern.

---

## Proposed Solution

### Option 1: Update RLS Policy (Recommended)

Update the DELETE policy to match the business logic and the UPDATE policy pattern:

```sql
-- Migration: Fix badge_applications delete policy to allow users to delete own drafts
BEGIN;

DROP POLICY IF EXISTS badge_applications_delete_authenticated ON badge_applications;

CREATE POLICY badge_applications_delete_authenticated ON badge_applications FOR DELETE TO authenticated
USING (
  -- Admins can delete any application
  is_admin()
  OR
  -- Users can delete their own draft applications
  (applicant_id = auth.uid() AND status = 'draft')
);

COMMIT;
```

**Advantages**:
- Aligns RLS with business logic
- Consistent with UPDATE policy
- No application code changes needed
- Follows the principle of defense in depth (both RLS and application checks)

**Files to modify**:
- Create new migration: `supabase/migrations/YYYYMMDDHHMMSS_fix_badge_applications_delete_policy_v2.sql`

### Option 2: Remove Application-Level Checks

Remove the authorization checks from `BadgeApplicationService.deleteBadgeApplication()` and rely solely on RLS.

**Advantages**:
- Single source of truth for authorization
- Simpler code

**Disadvantages**:
- Less explicit error messages
- Harder to debug authorization issues
- RLS errors are generic (just "no rows deleted")

**Not recommended** because:
- Explicit application checks provide better error messages
- Service layer can enforce additional business rules
- Makes the code more testable

### Option 3: Service Role Client for DELETE

Use a service role client (bypasses RLS) for the DELETE operation in the service.

**Not recommended** because:
- Violates principle of least privilege
- Service role should only be used when absolutely necessary (e.g., login flow)
- RLS provides an important security layer

---

## Impact Assessment

### Who is Affected

- **Regular users** attempting to delete their own draft badge applications
- **Only draft applications** - submitted/reviewed applications are correctly blocked

### What Works

- ✅ Admins can delete applications (RLS allows `is_admin()`)
- ✅ Users can view their own applications (SELECT policy correct)
- ✅ Users can update their own drafts (UPDATE policy correct)
- ✅ Users can create applications (INSERT policy correct)

### What Doesn't Work

- ❌ Users **cannot** delete their own draft applications (DELETE policy too restrictive)

---

## Recommended Action

**Implement Option 1**: Update the RLS policy to allow users to delete their own draft applications.

This is the correct fix because:
1. It aligns the database security policy with the documented business requirements
2. It follows the same pattern as the UPDATE policy (proven to work)
3. It maintains defense in depth (both RLS and application checks)
4. It requires minimal changes (single migration file)
5. It's consistent with the original intent of the earlier migration

### Implementation Steps

1. Create new migration file: `supabase/migrations/YYYYMMDDHHMMSS_fix_badge_applications_delete_policy_v2.sql`
2. Add SQL to drop and recreate the DELETE policy with the correct USING clause
3. Apply migration to database
4. Test with a regular user account:
   - Create a draft application
   - Attempt to delete it (should succeed)
   - Attempt to delete a submitted application (should fail with FORBIDDEN)
5. Test with an admin account:
   - Attempt to delete any application (should succeed)

### Migration File Content

```sql
-- Migration: Fix badge_applications delete policy to allow users to delete own drafts
-- Created: 2025-11-13
-- Purpose: Update RLS policy to match business logic
-- Issue: Users cannot delete their own draft applications
-- 
-- This reverts the overly restrictive admin-only policy from 
-- 20251111000002_update_rls_to_auth_uid.sql and restores the ability
-- for users to delete their own drafts while using auth.uid() instead
-- of custom settings.

BEGIN;

-- Drop the existing admin-only delete policy
DROP POLICY IF EXISTS badge_applications_delete_authenticated ON badge_applications;

-- Recreate the delete policy to allow:
-- 1. Admins to delete any badge application
-- 2. Users to delete their own draft applications
CREATE POLICY badge_applications_delete_authenticated ON badge_applications FOR DELETE TO authenticated
USING (
  is_admin()
  OR
  (applicant_id = auth.uid() AND status = 'draft')
);

COMMIT;

-- Verification queries (run after applying migration):
-- 
-- 1. Check policy exists:
-- SELECT * FROM pg_policies WHERE tablename = 'badge_applications' AND policyname = 'badge_applications_delete_authenticated';
--
-- 2. Test as regular user (replace with actual user ID):
-- SET ROLE authenticated;
-- SET request.jwt.claims.sub TO 'user-uuid-here';
-- DELETE FROM badge_applications WHERE id = 'test-draft-id';
```

---

## Testing Checklist

After applying the fix:

- [ ] Regular user can delete their own draft application
- [ ] Regular user **cannot** delete their own submitted application (status != 'draft')
- [ ] Regular user **cannot** delete another user's application
- [ ] Admin can delete any application (any status, any owner)
- [ ] Service-level error messages are appropriate:
  - `NOT_FOUND` for non-existent applications
  - `FORBIDDEN` for unauthorized attempts
  - `REFERENCED_BY_PROMOTION` for applications in use
- [ ] No linting errors introduced
- [ ] All existing tests pass

---

## Related Issues

This issue is part of a series of RLS-related problems:

1. **Badge application creation error** - Fixed by enabling authentication in POST endpoint
2. **"Application not found" error** - Fixed by enabling authentication in GET/PUT/DELETE endpoints
3. **Badge application deletion error** (this issue) - RLS policy too restrictive

All stem from the migration to `auth.uid()` based policies and the need to align:
- Database RLS policies
- Application service layer authorization
- API endpoint authentication

---

## Files Referenced

### Application Code
- `src/pages/api/badge-applications/[id].ts` (lines 299-399) - DELETE endpoint
- `src/lib/badge-application.service.ts` (lines 465-530) - `deleteBadgeApplication` method

### Database Migrations
- `supabase/migrations/20251019090000_create_initial_schema.sql` - Original schema and policies
- `supabase/migrations/20251110000000_fix_badge_applications_delete_policy.sql` - First attempt to allow user deletes (using custom settings)
- `supabase/migrations/20251111000002_update_rls_to_auth_uid.sql` - Migration to auth.uid() that accidentally made DELETE admin-only

### Documentation
- `.ai/db-plan.md` (lines 190-217) - Original RLS policy design
- `.ai/api-badge-applications-delete-one-implementation-plan.md` - DELETE endpoint implementation plan

---

## Date

2025-11-13

