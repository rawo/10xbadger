# PRD vs Auth-Spec Comparison Report

**Date:** 2025-11-10
**Purpose:** Identify conflicts, redundancies, and implementation gaps between PRD and auth-spec.md

---

## Summary

✅ **Resolved Conflicts:** 3 major conflicts fixed in PRD
⚠️ **Database Issues:** 2 items require database migration
📝 **Implementation Verified:** All 5 auth user stories can be implemented

---

## 1. CONFLICTS RESOLVED

### Conflict 1: Authentication Method (CRITICAL - RESOLVED)
**Issue:** FR-001 stated "Use Google Workspace SSO" but user stories required email/password authentication.

**PRD Original:**
```
FR-001 Authentication and Authorization
- Use Google Workspace SSO (OIDC/SAML) restricted to the company domain
- No manual account creation
```

**User Stories Required:**
- US-001: "User Authentication via email and password"
- US-00101: "User registration via registration form"

**Resolution:** ✅ Updated PRD FR-001 to:
```
FR-001 Authentication and Authorization
- Use email and password authentication with email verification (Supabase Auth).
- Support user registration via registration form with email/password.
- Support password recovery via email reset links.
- Admin accounts assigned through database updates only.
```

### Conflict 2: Admin Account Seeding (RESOLVED)
**Issue:** US-001 stated "Admin accounts are seeded at deploy" but US-00104 states "admin rights can be assigned only through database updates".

**Resolution:** ✅ Updated US-001 acceptance criteria to:
```
- Admin accounts are assigned through database updates (as per US-00104).
```

### Conflict 3: Data Model Field Naming (RESOLVED)
**Issue:** PRD Appendix used inconsistent field names.

**PRD Original:**
```
User: { id: UUID, email, name, role }
```

**Database Schema Uses:**
```
{ id: UUID, email, display_name, is_admin, created_at, last_seen_at }
```

**Resolution:** ✅ Updated PRD Appendix to:
```
User: { id: UUID, email, display_name, is_admin: boolean, created_at, last_seen_at }
```

---

## 2. DATABASE MIGRATION REQUIRED

### Issue 1: `google_sub` Column Must Be Removed
**Location:** `users` table
**Current State:** Column exists with `NOT NULL` constraint and unique index
**Required Action:** Create migration to drop column

**Auth-Spec Reference:** Section 2.2.1
```sql
-- Migration: Remove google_sub column
alter table users drop column if exists google_sub;
```

**Priority:** HIGH - Blocks authentication implementation

### Issue 2: Auto-Elevation Trigger Conflicts with US-00104
**Location:** `users` table trigger `auto_elevate_admins`
**Current Behavior:** Automatically sets `is_admin = TRUE` for specific emails
**Conflicting Requirement:** US-00104 states "admin rights can be assigned only through database updates"

**Current Trigger:**
```sql
CREATE OR REPLACE FUNCTION public.elevate_admin_users()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'rafal.wokacz@gmail.com'
  ];
BEGIN
  IF NEW.email = ANY(admin_emails) THEN
    NEW.is_admin := TRUE;
  END IF;
  RETURN NEW;
END;
$function$
```

**Options:**
1. **Remove trigger entirely** - Aligns with US-00104 requirement for manual assignment
2. **Keep for development** - Document as development-only feature, remove before production

**Recommendation:** Option 1 (remove trigger) to strictly comply with US-00104

---

## 3. NAMING CONVENTION CONSISTENCY

### Issue: Mixed Case Conventions in PRD
**PRD Appendix:** Uses camelCase (`createdAt`, `createdBy`, `deactivatedAt`)
**Database:** Uses snake_case (`created_at`, `created_by`, `deactivated_at`)
**Auth-Spec:** Uses snake_case consistently

**Resolution:** PRD data model appendix was updated to use snake_case for timestamp fields. Other field naming should be reviewed project-wide for consistency.

**Note:** TypeScript types (DTOs) use camelCase, which is correct. The database uses snake_case, which is also correct. The issue was only in the PRD documentation.

---

## 4. USER STORY IMPLEMENTATION VERIFICATION

### ✅ US-001: User Authentication via email and password
**Auth-Spec Coverage:**
- Section 1.2.1: Login page specification
- Section 1.3.1: LoginView component
- Section 2.1.1: POST /api/auth/login endpoint
- Section 3.3.2: Complete login flow implementation

**Acceptance Criteria:**
- ✅ Admin accounts assigned via database updates (covered in Section 3.5)
- ✅ Clear error messages for invalid credentials (covered in Section 1.4.3)

**Implementation:** READY

---

### ✅ US-00101: User registration via registration form
**Auth-Spec Coverage:**
- Section 1.2.1: Register page specification
- Section 1.3.1: RegisterView component
- Section 2.1.1: POST /api/auth/register endpoint
- Section 3.3.1: Complete registration flow with email verification

**Acceptance Criteria:**
- ✅ Forbids already registered emails (409 Conflict response)
- ✅ Requires email and password (Zod validation)
- ✅ Password minimum 8 characters (client and server validation)

**Implementation:** READY

---

### ✅ US-00102: User sign out via sign out button
**Auth-Spec Coverage:**
- Section 1.3.1: UserMenu component with "Sign Out" option
- Section 1.2.1: Logout page specification
- Section 3.3.4: Complete logout flow

**Acceptance Criteria:**
- ✅ Redirects to login page (to `/login?message=logged_out`)
- ✅ Clears user session (`supabase.auth.signOut()` called)

**Implementation:** READY

---

### ✅ US-00103: User password recovery
**Auth-Spec Coverage:**
- Section 1.2.1: Forgot password and reset password pages
- Section 1.3.1: ForgotPasswordView and ResetPasswordView components
- Section 2.1.1: POST /api/auth/forgot-password and /api/auth/reset-password endpoints
- Section 3.3.3: Complete password recovery flow

**Acceptance Criteria:**
- ✅ Requires email to be provided (Zod validation)
- ✅ Provides one-time recovery link (Supabase sends token-based email)
- ✅ New password overrides old (updateUser with password)
- ✅ One-time link invalidated once used (Supabase auto-invalidates)

**Implementation:** READY

---

### ✅ US-00104: Administrative rights
**Auth-Spec Coverage:**
- Section 3.5: Admin Account Management
- Section 3.5.1: Manual database update strategy
- Section 3.5.2: Admin assignment checklist

**Acceptance Criteria:**
- ✅ Admin rights assigned only through database updates (manual SQL UPDATE)

**Implementation:** READY (but see database trigger conflict above)

---

## 5. OTHER USER STORIES (US-002 through US-014)

All non-authentication user stories require authentication guards, which are covered by:

- **Section 1.2.2:** Modified existing pages with auth checks
- **Section 1.6.2:** Route guard implementation pattern
- **Section 2.1.2:** Modified API endpoints with authentication checks
- **Section 3.2.2:** Server-side auth helper functions

**Pattern for Protected Pages:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return Astro.redirect(`/login?redirect=${encodeURIComponent(Astro.url.pathname)}`);
}
```

**Pattern for Protected APIs:**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
}
```

✅ **All user stories can be implemented** using these patterns.

---

## 6. FUNCTIONAL REQUIREMENTS COVERAGE

### FR-001: Authentication and Authorization ✅
**Updated to align with user stories:**
- Email/password authentication
- Registration with email verification
- Password recovery
- Manual admin assignment

**Auth-Spec Coverage:** Complete (Sections 1-3)

### FR-002: Badge Catalog ✅
**Auth Requirements:** Authenticated users only
**Auth-Spec Coverage:** Section 2.1.2 (API authentication checks)

### FR-003: Badge Application ✅
**Auth Requirements:** User ownership validation
**Auth-Spec Coverage:** Section 2.1.2 (userId from session)

### FR-004: Promotion Templates ✅
**Auth Requirements:** Admin for create/edit, authenticated for view
**Auth-Spec Coverage:** Section 1.6.2 (Admin route guards)

### FR-005: Promotion Builder ✅
**Auth Requirements:** User ownership validation
**Auth-Spec Coverage:** Section 2.1.2 (userId from session)

### FR-006: Reservation and Concurrency ✅
**Auth Requirements:** No conflict with authentication
**Auth-Spec Coverage:** N/A (orthogonal concern)

### FR-007: Admin Review Workflows ✅
**Auth Requirements:** Admin role required
**Auth-Spec Coverage:** Section 3.2.2 (`requireAdmin()` helper)

### FR-008: Logging and Monitoring ✅
**Auth Requirements:** Log authentication failures
**Auth-Spec Coverage:** Section 2.4.2-2.4.3 (Auth event logging)

### FR-009: Data Models and IDs ✅
**Auth Requirements:** UUID for user.id
**Auth-Spec Coverage:** Section 2.2.1 (User model)

### FR-010: Import and Migration ✅
**Auth Requirements:** Out of scope
**Auth-Spec Coverage:** N/A

### FR-011: Position Levels ✅
**Auth Requirements:** No conflict
**Auth-Spec Coverage:** N/A (orthogonal concern)

---

## 7. REDUNDANCIES IDENTIFIED

### Redundancy 1: Session Management Details
**PRD:** FR-001 mentions validating "authenticated user's domain claim"
**Auth-Spec:** Section 3.3 implements session validation without domain checks

**Resolution:** Not an issue - domain validation was part of Google OAuth requirement, which has been removed. Auth-spec correctly omits this.

### Redundancy 2: Admin Account Documentation
**PRD:** FR-001, US-001, and US-00104 all mention admin accounts
**Auth-Spec:** Section 3.5 consolidates all admin assignment information

**Resolution:** No action needed - auth-spec properly consolidates the information.

---

## 8. IMPLEMENTATION GAPS

### Gap 1: Email Template Configuration ⚠️
**PRD:** Does not mention email templates
**Auth-Spec:** Section 3.1.1 specifies email template configuration required

**Impact:** External configuration needed for Supabase email templates
**Action Required:** Configure Supabase dashboard with email templates

### Gap 2: Supabase Configuration ⚠️
**PRD:** Does not mention Supabase setup requirements
**Auth-Spec:** Section 3.1 details complete Supabase configuration

**Impact:** External setup required before implementation
**Action Required:** Configure Supabase project per Section 3.1

---

## 9. RECOMMENDED DATABASE MIGRATIONS

### Migration 1: Remove google_sub column (REQUIRED)
**Priority:** HIGH
**Blocks:** Authentication implementation

```sql
-- File: 20251110000001_remove_google_sub_column.sql
begin;

-- Drop constraints first
alter table users drop constraint if exists users_google_sub_key;

-- Drop column
alter table users drop column if exists google_sub;

commit;
```

### Migration 2: Remove auto_elevate_admins trigger (RECOMMENDED)
**Priority:** MEDIUM
**Reason:** Conflicts with US-00104 requirement

```sql
-- File: 20251110000002_remove_admin_auto_elevation.sql
begin;

-- Drop trigger
drop trigger if exists auto_elevate_admins on users;

-- Drop function
drop function if exists elevate_admin_users();

commit;
```

**Note:** If keeping for development, document clearly and add task to remove before production.

---

## 10. SUMMARY OF CHANGES MADE

### PRD Updates ✅
1. **Section 1:** Updated "Google Workspace SSO" to "email/password authentication"
2. **FR-001:** Replaced OAuth requirements with email/password requirements
3. **US-001:** Updated acceptance criteria to reference US-00104 for admin assignment
4. **Appendix:** Updated User data model to match database schema

### Auth-Spec Updates
✅ **No updates required** - auth-spec is comprehensive and consistent

### Required Actions
1. ☐ Create migration to remove `google_sub` column
2. ☐ Decide on `auto_elevate_admins` trigger (remove or keep for dev)
3. ☐ Configure Supabase dashboard (email templates, auth settings)
4. ☐ Begin implementation following auth-spec Section 5 (Integration Checklist)

---

## 11. CONCLUSION

### Overall Assessment: ✅ READY FOR IMPLEMENTATION

- **Conflicts:** All resolved
- **User Stories:** All 5 auth stories verified as implementable
- **Functional Requirements:** All covered by auth-spec
- **Database:** 2 migrations required before implementation
- **Documentation:** PRD and auth-spec now fully aligned

### Next Steps:
1. Create and apply database migrations
2. Configure Supabase dashboard per Section 3.1
3. Begin implementation following Section 5 checklist
4. Test each user story against acceptance criteria

---

**End of Comparison Report**
