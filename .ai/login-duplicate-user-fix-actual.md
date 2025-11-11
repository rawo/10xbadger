# Login Duplicate User Fix (ACTUAL)

## Issue Description

**Error**: `duplicate key value violates unique constraint "users_pkey"`  
**Error Code**: `23505` (PostgreSQL unique constraint violation)

When logging in with an already registered user, the application was attempting to create a duplicate user record in the `public.users` table, resulting in a constraint violation.

## Root Cause Analysis

The issue had **TWO** problems:

### Problem 1: RLS Blocking User Queries

The `users_select_authenticated` RLS policy allows reading user records if:
```sql
id = auth.uid() OR is_admin()
```

However, the `is_admin()` function tries to read from the `users` table:
```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
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

**This creates a circular dependency:**
1. Query tries to read from `users` table
2. RLS policy calls `is_admin()` function
3. `is_admin()` tries to read from `users` table (recursive!)
4. When user doesn't exist yet, query may fail or return RLS error
5. Login code interprets this as "user doesn't exist"
6. Attempts to insert → duplicate key error!

### Problem 2: Using Non-Admin Client for Initial Query

The login endpoint was using the regular authenticated Supabase client (from `context.locals.supabase`) to query the `users` table. This client respects RLS policies, which can block or confuse the query results.

## The Solution

**Use the SERVICE ROLE client for ALL user record operations during login:**

```typescript
// Create admin client ONCE at the start
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = await import("@supabase/supabase-js");
const adminClient = createClient(import.meta.env.SUPABASE_URL, serviceRoleKey);

// Use admin client to fetch user (bypasses RLS completely)
let { data: userData, error: userError } = await adminClient
  .from("users")
  .select("*")
  .eq("id", data.user.id)
  .single();

// Now we can trust the result:
// - userError?.code === 'PGRST116' → User truly doesn't exist
// - userData exists → User exists in DB
// - Other error → Genuine database problem
```

### Key Changes

1. **Create admin client BEFORE querying** (not inside conditional blocks)
2. **Use admin client for initial SELECT** (bypasses RLS entirely)
3. **Use same admin client for INSERT/UPDATE** (consistent approach)
4. **Trust the error codes** now that RLS is out of the picture

## Code Flow

```
┌─────────────────────────────────────────────┐
│ 1. User authenticates (auth.users)         │
│    ✅ Supabase Auth succeeds                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 2. Create SERVICE ROLE client              │
│    (bypasses ALL RLS policies)             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 3. Query public.users with admin client    │
│    SELECT * FROM users WHERE id = ?        │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ PGRST116         │  │ userData exists  │
│ (Not found)      │  │                  │
└─────────┬────────┘  └────────┬─────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ INSERT new user  │  │ UPDATE existing  │
│ (admin client)   │  │ (admin client)   │
└─────────┬────────┘  └────────┬─────────┘
          │                    │
          └─────────┬──────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ ✅ Login success  │
          │ Redirect to app  │
          └──────────────────┘
```

## Why This Works

### Before (BROKEN)
```typescript
// ❌ Using authenticated client (respects RLS)
let { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .single();

// Problem: RLS policy blocks/confuses query
// - If user exists: RLS might block (circular is_admin)
// - Code thinks user doesn't exist
// - Tries to INSERT → duplicate key error!
```

### After (FIXED)
```typescript
// ✅ Using service role client (bypasses RLS)
const adminClient = createClient(url, serviceRoleKey);

let { data, error } = await adminClient
  .from("users")
  .select("*")
  .eq("id", userId)
  .single();

// Now we get accurate results:
// - PGRST116 = user doesn't exist → INSERT
// - Data returned = user exists → UPDATE
// - Other error = real problem → fail safely
```

## Security Considerations

**Q: Is it safe to use service role key in the login endpoint?**

**A: YES**, because:

1. ✅ **User is already authenticated** via Supabase Auth
2. ✅ **Only operates on the authenticated user's own record** (`data.user.id`)
3. ✅ **No user input determines which record** to read/write
4. ✅ **Limited scope**: Only reads/writes to `users` table for current user
5. ✅ **Necessary for onboarding flow** (chicken-and-egg problem with RLS)

**Service role key usage is justified here** because:
- We need to check if user exists (can't do with RLS blocking)
- We need to create user record (can't do without existing record due to RLS)
- We're only touching the currently authenticated user's data

## Testing

### Test Case 1: First-time Login (User Not in DB)
```
1. User registers via /register (creates auth.users entry only)
2. User logs in via /login
3. Expected: Creates public.users entry, redirects to dashboard
4. ✅ Works correctly
```

### Test Case 2: Existing User Login (User in DB)
```
1. User has existing public.users record
2. User logs in via /login
3. Expected: Updates last_seen_at, redirects to dashboard
4. ✅ FIXED - No more duplicate key error!
```

### Test Case 3: Database Error
```
1. Database connection fails
2. User attempts login
3. Expected: Logs error, redirects to login with error message
4. ✅ Handled gracefully
```

## Debug Logging

Added debug logging to help diagnose issues:

```typescript
console.log("[Login Debug] User fetch result:", {
  userId: data.user.id,
  hasUserData: !!userData,
  errorCode: userError?.code,
  errorMessage: userError?.message,
});
```

This helps verify:
- User ID is correct
- User data exists or not
- Error codes are as expected

## Files Modified

1. `/src/pages/api/auth/login.ts` - Complete refactor of user fetch logic

## Related Issues

- **RLS Circular Dependency**: The `is_admin()` function creates a circular dependency
- **Possible Future Fix**: Consider caching `is_admin` status in JWT claims to avoid database lookup in RLS policies

## Technical Details

### PostgREST Error Codes
- `PGRST116` - No rows found (404 equivalent)
- `23505` - Unique constraint violation (duplicate key)
- `42501` - Insufficient privilege (RLS blocked)

### Supabase Service Role Key
- Bypasses ALL RLS policies
- Full database access
- Should only be used server-side
- Needed for user onboarding operations

## Summary

**Root Cause**: Using authenticated client with RLS policies created confusion about whether user exists

**Solution**: Use service role client for all user operations during login to bypass RLS and get accurate results

**Result**: Existing users can now log in successfully without duplicate key errors! ✅

## Status

✅ **FIXED** - Login now correctly handles existing users by using service role client to bypass RLS

