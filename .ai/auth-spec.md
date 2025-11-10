# Authentication System Architecture Specification

## Document Overview

This specification describes the authentication system for 10xbadger, implementing Google Workspace SSO (OIDC) using Supabase Auth and Astro. It covers user registration, login, logout flows while maintaining compatibility with existing application behavior defined in the PRD.

**Version**: 1.1  
**Date**: 2025-11-10  
**Status**: Technical Specification  
**PRD Reference**: FR-001 (Authentication and Authorization), US-001 (User Authentication via Google Workspace SSO), US-014 (Logging)

### Key Requirements from PRD

**FR-001 Authentication and Authorization**:
- Use Google Workspace SSO (OIDC/SAML) restricted to company domain
- No manual account creation
- Admin accounts seeded at deploy for MVP
- Roles: `administrator` and `standard user (engineer)`
- All endpoints must validate authenticated user's domain claim and role

**US-001 Acceptance Criteria**:
- ✅ Login flow supports Google SSO (OIDC)
- ✅ Only emails from configured company domain can sign in
- ✅ Admin accounts seeded at deploy (manual process)
- ✅ Unauthorized domain emails receive clear error message

**Note**: Password recovery is explicitly OUT OF SCOPE for MVP (OAuth-only authentication)

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Authentication Flow Overview

The application implements a hybrid authentication model where:
- **Unauthenticated users** are redirected to `/login` for all protected routes
- **Authenticated users** have seamless access to application features
- **Google Workspace SSO** is the primary authentication method (domain-restricted)
- **Session management** uses Supabase Auth with httpOnly cookies

### 1.2 Page Structure

#### 1.2.1 New Auth Pages

**Page: Login (`/login`)**
- **Purpose**: Entry point for authentication; redirect to Google SSO
- **Access**: Public (unauthenticated only; redirects authenticated users to `/`)
- **Components**:
  - `LoginPage.astro` - Server-rendered Astro page
  - `LoginView.tsx` - React component for interactive elements
  - `GoogleSignInButton.tsx` - SSO trigger button
  - `AuthErrorAlert.tsx` - Display authentication errors
- **Layout**: Centered card layout with branding, minimal navigation
- **Content**:
  - Application logo and name
  - Brief description ("Sign in with your company Google account")
  - Google Sign-In button (primary CTA)
  - Error message display area
  - Link to support/help (if needed)

**Page: Auth Callback (`/auth/callback`)**
- **Purpose**: Handle OAuth callback from Google
- **Access**: Public (handles redirect after Google authentication)
- **Implementation**: Server-side Astro endpoint
- **Flow**:
  1. Receive OAuth code from Google
  2. Exchange code for Supabase session
  3. Validate domain restriction
  4. Create or update user in database
  5. Redirect to intended destination or `/`
- **Error Handling**: Redirect to `/login?error=...` on failure

**Page: Logout Confirmation (`/logout`)**
- **Purpose**: Confirm logout action and clear session
- **Access**: Protected (authenticated users only)
- **Implementation**: Server-side Astro endpoint
- **Flow**:
  1. Clear Supabase session
  2. Clear cookies
  3. Redirect to `/login?message=logged_out`

**Page: Unauthorized (`/unauthorized`)**
- **Purpose**: Display friendly message for domain restriction violations
- **Access**: Public
- **Content**:
  - Explanation of domain restriction
  - Contact information for access requests
  - Link to return to login

#### 1.2.2 Modified Existing Pages

**All Protected Pages** (Dashboard, Catalog, Applications, etc.)
- **Changes**:
  - Add authentication check in frontmatter
  - Redirect to `/login?redirect={current_path}` if unauthenticated
  - Pass authenticated user data to components via props
- **Implementation Pattern**:
```typescript
// src/pages/index.astro (example)
---
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return Astro.redirect(`/login?redirect=${encodeURIComponent(Astro.url.pathname)}`);
}

// Fetch user profile
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

if (!userData) {
  return Astro.redirect('/login?error=user_not_found');
}

const userId = user.id;
const isAdmin = userData.is_admin;
---
```

**Layout Component (`src/layouts/Layout.astro`)**
- **Changes**:
  - Add optional user prop for authenticated state
  - Conditionally render navigation based on auth state
  - Add user menu dropdown (profile, settings, logout)
- **New Props**:
```typescript
interface Props {
  title?: string;
  user?: {
    id: string;
    email: string;
    display_name: string;
    is_admin: boolean;
  } | null;
}
```

### 1.3 Component Architecture

#### 1.3.1 Auth-Specific Components

**Component: `LoginView` (React)**
- **File**: `src/components/auth/LoginView.tsx`
- **Purpose**: Interactive login interface
- **Props**:
```typescript
interface LoginViewProps {
  error?: string;
  message?: string;
  redirectUrl?: string;
}
```
- **State**: None (stateless, triggers server-side OAuth flow)
- **Events**:
  - `handleGoogleSignIn()` - Initiates OAuth flow via `/auth/google`

**Component: `GoogleSignInButton` (React)**
- **File**: `src/components/auth/GoogleSignInButton.tsx`
- **Purpose**: Styled Google OAuth button
- **Props**:
```typescript
interface GoogleSignInButtonProps {
  redirectUrl?: string;
  disabled?: boolean;
}
```
- **Implementation**:
  - Redirects to `/auth/google?redirect=${redirectUrl}`
  - Uses Google branding guidelines
  - Accessible with keyboard navigation
  - Shows loading state during redirect

**Component: `AuthErrorAlert` (React)**
- **File**: `src/components/auth/AuthErrorAlert.tsx`
- **Purpose**: Display user-friendly authentication errors
- **Props**:
```typescript
interface AuthErrorAlertProps {
  error: string; // Error code from URL params
}
```
- **Error Messages**:
  - `invalid_domain` - "Your email domain is not authorized to access this application."
  - `auth_failed` - "Authentication failed. Please try again."
  - `session_expired` - "Your session has expired. Please sign in again."
  - `user_not_found` - "User account not found. Please contact support."

**Component: `UserMenu` (React)**
- **File**: `src/components/navigation/UserMenu.tsx`
- **Purpose**: User profile dropdown in header
- **Props**:
```typescript
interface UserMenuProps {
  user: {
    display_name: string;
    email: string;
    is_admin: boolean;
  };
}
```
- **Content**:
  - User avatar (initials or photo)
  - Display name and email
  - Menu items:
    - "Dashboard" → `/`
    - "Settings" → `/settings` (future)
    - Divider
    - "Admin" → `/admin/review` (if `is_admin`)
    - Divider
    - "Sign Out" → `/logout`

**Component: `ProtectedRoute` (Higher-Order Component)**
- **File**: `src/components/auth/ProtectedRoute.tsx`
- **Purpose**: Client-side route protection for React components
- **Props**:
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}
```
- **Behavior**:
  - Checks authentication status via `useUser()` hook
  - Redirects unauthenticated users to `/login`
  - Shows fallback or error for insufficient permissions

#### 1.3.2 Modified Existing Components

**All React Views** (Dashboard, Catalog, Applications, etc.)
- **Add User Context**: Pass authenticated user via props
- **Update Interfaces**: Add user/isAdmin to component props
- **Example**:
```typescript
export interface DashboardViewProps {
  initialData: DashboardViewModel;
  userId: string;
  user: UserSummary; // NEW
  isAdmin: boolean;  // NEW
}
```

### 1.4 Validation and Error Handling

#### 1.4.1 Client-Side Validation

**Login Form**:
- No traditional form validation (direct OAuth flow)
- Check for valid redirect parameter (whitelist URLs)

**Domain Validation**:
- Performed server-side after OAuth callback
- Extract domain from `user.email`
- Compare against `ALLOWED_EMAIL_DOMAIN` environment variable
- Reject non-matching domains with clear error message

#### 1.4.2 Error Messages

| Error Code | User Message | Technical Details |
|------------|--------------|-------------------|
| `invalid_domain` | "Access Denied: Your email domain (@{domain}) is not authorized. Please contact your administrator." | Email domain doesn't match `ALLOWED_EMAIL_DOMAIN` |
| `auth_failed` | "Authentication failed. Please try again or contact support if the problem persists." | OAuth exchange failed or Supabase error |
| `session_expired` | "Your session has expired. Please sign in again to continue." | Supabase session invalid or expired |
| `user_not_found` | "Account setup incomplete. Please contact support." | User record missing in database |
| `server_error` | "An unexpected error occurred. Please try again later." | Unhandled server exception |

### 1.5 User Scenarios

#### 1.5.1 First-Time User Login

**Flow**:
1. User navigates to protected route (e.g., `/`) → Redirected to `/login?redirect=/`
2. User sees login page with Google Sign-In button
3. User clicks "Sign in with Google"
4. Browser redirects to Google OAuth consent screen
5. User authenticates with Google and grants permissions
6. Google redirects to `/auth/callback?code=...`
7. Server exchanges code for Supabase session
8. Server validates email domain
9. Server creates user record in `users` table (if not exists)
10. Server sets session cookie and redirects to intended destination
11. User sees dashboard with full navigation

**Validation**:
- Email domain must match `ALLOWED_EMAIL_DOMAIN`
- Google sub must be unique in `users.google_sub`
- User record created with `is_admin = false` (default)

**Edge Cases**:
- Domain mismatch → Redirect to `/unauthorized` with explanation
- Duplicate email → Use existing user record
- Database error → Redirect to `/login?error=server_error`

#### 1.5.2 Returning User Login

**Flow**:
1. User navigates to `/` → Redirected to `/login`
2. User clicks "Sign in with Google"
3. OAuth flow completes (may skip consent screen)
4. Server updates `users.last_seen_at`
5. User redirected to intended destination

**Session Duration**:
- Supabase default: 1 hour (refresh token extends)
- Configurable via Supabase dashboard

#### 1.5.3 Logout

**Flow**:
1. User clicks "Sign Out" in UserMenu
2. Browser navigates to `/logout`
3. Server calls `supabase.auth.signOut()`
4. Server clears cookies
5. Server redirects to `/login?message=logged_out`
6. User sees confirmation message

#### 1.5.4 Session Expiration

**Flow**:
1. User session expires (idle timeout or max age)
2. User attempts action (page navigation or API call)
3. Auth check fails
4. Page: Redirect to `/login?error=session_expired&redirect={current_path}`
5. API: Return `401 Unauthorized` with `{ error: "session_expired" }`
6. Client displays error and prompts re-authentication

### 1.6 Navigation and Layout Changes

#### 1.6.1 Header Navigation

**Unauthenticated State**:
- Logo (links to `/login`)
- Minimal or no navigation items
- "Sign In" button (links to `/login`)

**Authenticated State**:
- Logo (links to `/`)
- Primary navigation:
  - Dashboard
  - Catalog
  - Applications
  - Promotion Templates
  - Promotions
  - Admin (visible only if `is_admin = true`)
- User menu (right side):
  - Avatar with initials
  - Dropdown with profile and logout

#### 1.6.2 Route Guards

**Implementation**: Server-side in Astro pages
- Check authentication before rendering
- Redirect unauthenticated users to `/login`
- Check admin role for admin routes
- Preserve intended destination in redirect parameter

**Example Guard**:
```typescript
// src/pages/admin/review.astro
---
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return Astro.redirect(`/login?redirect=${encodeURIComponent(Astro.url.pathname)}`);
}

const { data: userData } = await supabase
  .from('users')
  .select('is_admin')
  .eq('id', user.id)
  .single();

if (!userData?.is_admin) {
  return Astro.redirect('/unauthorized');
}
---
```

---

## 2. BACKEND LOGIC

### 2.1 API Endpoints

#### 2.1.1 New Authentication Endpoints

**Endpoint: `GET /auth/google`**
- **Purpose**: Initiate Google OAuth flow
- **Access**: Public
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/google.ts`
- **Parameters**:
  - `redirect` (query, optional): URL to redirect after successful auth
- **Flow**:
  1. Validate and sanitize redirect parameter
  2. Generate OAuth state token (CSRF protection)
  3. Store state and redirect in session/cookie
  4. Call `supabase.auth.signInWithOAuth({ provider: 'google' })`
  5. Return redirect response to Google OAuth URL
- **Response**: HTTP 302 redirect to Google

**Endpoint: `GET /auth/callback`**
- **Purpose**: Handle Google OAuth callback
- **Access**: Public
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/callback.ts`
- **Parameters**:
  - `code` (query, required): OAuth authorization code
  - `state` (query, required): CSRF protection token
- **Flow**:
  1. Validate state token matches session
  2. Exchange code for Supabase session via `supabase.auth.exchangeCodeForSession()`
  3. Extract user info from session
  4. Validate email domain
  5. Upsert user record in `users` table
  6. Set session cookie
  7. Redirect to intended destination or `/`
- **Validation**:
```typescript
const emailDomain = user.email.split('@')[1];
const allowedDomain = import.meta.env.ALLOWED_EMAIL_DOMAIN;

if (emailDomain !== allowedDomain) {
  await supabase.auth.signOut();
  return Astro.redirect('/unauthorized?domain=' + emailDomain);
}
```
- **User Creation**:
```typescript
const { error } = await supabase
  .from('users')
  .upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata.full_name || user.email,
    google_sub: user.user_metadata.sub,
    last_seen_at: new Date().toISOString(),
  }, {
    onConflict: 'google_sub',
  });
```
- **Response**: HTTP 302 redirect to app or error page
- **Error Handling**:
  - Invalid state → Redirect to `/login?error=invalid_state`
  - Exchange failed → Redirect to `/login?error=auth_failed`
  - Domain mismatch → Redirect to `/unauthorized`
  - Database error → Log and redirect to `/login?error=server_error`

**Endpoint: `POST /api/auth/logout`**
- **Purpose**: Terminate user session
- **Access**: Protected (authenticated users)
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/logout.ts`
- **Flow**:
  1. Call `supabase.auth.signOut()`
  2. Clear cookies
  3. Return success response
- **Response**:
```typescript
{
  success: true,
  message: "Logged out successfully"
}
```

**Endpoint: `GET /api/auth/session`**
- **Purpose**: Get current session info (for client-side checks)
- **Access**: Public (returns null if unauthenticated)
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/session.ts`
- **Response**:
```typescript
{
  user: {
    id: string;
    email: string;
    display_name: string;
    is_admin: boolean;
  } | null,
  authenticated: boolean
}
```

**Endpoint: `GET /api/me`**
- **Purpose**: Get authenticated user profile
- **Access**: Protected
- **Implementation**: Astro API route (new)
- **File**: `src/pages/api/me.ts`
- **Response**: `UserDto`
- **Error**: 401 if unauthenticated

#### 2.1.2 Modified API Endpoints

**All Protected Endpoints** (Badge Applications, Promotions, etc.)
- **Changes**:
  - Add authentication check before processing
  - Extract user ID from session
  - Use authenticated user ID for ownership checks
  - Return 401 for unauthenticated requests
  - Return 403 for insufficient permissions

**Example Pattern**:
```typescript
// src/pages/api/badge-applications.ts
export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ 
        error: 'unauthorized', 
        message: 'Authentication required' 
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Get user info
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return new Response(
      JSON.stringify({ 
        error: 'unauthorized', 
        message: 'User not found' 
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isAdmin = userData.is_admin;
  const userId = user.id;

  // 3. Process request with authenticated context
  // ... existing endpoint logic using userId and isAdmin
}
```

### 2.2 Data Models

#### 2.2.1 Existing User Model (No Changes Required)

**Table**: `users`
- **Schema** (from migration):
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  google_sub text not null unique
);
```

**Fields**:
- `id` (UUID, PK) - Matches Supabase Auth user ID
- `email` (text, unique) - User email from Google
- `display_name` (text) - Full name from Google profile
- `is_admin` (boolean) - Admin role flag (default false)
- `created_at` (timestamptz) - Account creation timestamp
- `last_seen_at` (timestamptz) - Last login timestamp
- `google_sub` (text, unique) - Google subject ID (stable identifier)

**Indexes**:
- Primary key on `id`
- Unique constraint on `email`
- Unique constraint on `google_sub`

#### 2.2.2 Session Storage

**Supabase Auth** manages sessions automatically:
- Sessions stored in Supabase Auth tables (managed)
- Client receives httpOnly cookie with session token
- No application database changes required
- Refresh tokens handled by Supabase

### 2.3 Input Validation

#### 2.3.1 OAuth Callback Validation

**Zod Schema** (`src/lib/validation/auth.validation.ts`):
```typescript
import { z } from 'zod';

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

export const RedirectSchema = z.object({
  redirect: z.string().url().optional().refine(
    (url) => !url || url.startsWith('/'),
    'Redirect must be a relative path'
  ),
});

export const EmailDomainSchema = z.object({
  email: z.string().email('Invalid email format'),
}).refine(
  (data) => {
    const domain = data.email.split('@')[1];
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    return domain === allowedDomain;
  },
  {
    message: 'Email domain not authorized',
  }
);
```

#### 2.3.2 Session Validation

**Middleware** (`src/middleware/auth.ts`):
```typescript
import { defineMiddleware } from 'astro:middleware';

export const validateSession = defineMiddleware(async (context, next) => {
  const supabase = context.locals.supabase;
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Refresh user's last_seen_at timestamp
    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id);
  }

  return next();
});
```

### 2.4 Exception Handling

#### 2.4.1 Error Types

**Auth Errors** (`src/lib/errors/auth.errors.ts`):
```typescript
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class DomainNotAllowedError extends AuthError {
  constructor(domain: string) {
    super(
      `Email domain @${domain} is not authorized`,
      'domain_not_allowed',
      403
    );
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super(
      'Your session has expired',
      'session_expired',
      401
    );
  }
}
```

#### 2.4.2 Error Logging

**Log Authentication Events**:
```typescript
// src/lib/error-logger.ts (extend existing)

export function logAuthFailure(
  userId: string | null,
  reason: string,
  metadata?: Record<string, unknown>
): void {
  console.error('[AUTH_FAILURE]', {
    timestamp: new Date().toISOString(),
    userId,
    reason,
    ...metadata,
  });

  // Optionally: Insert into audit_logs table
}

export function logAuthSuccess(
  userId: string,
  method: 'google_oauth',
  metadata?: Record<string, unknown>
): void {
  console.info('[AUTH_SUCCESS]', {
    timestamp: new Date().toISOString(),
    userId,
    method,
    ...metadata,
  });
}
```

#### 2.4.3 Audit Logging

**Record Auth Events in Database**:
```typescript
// src/lib/audit-logger.ts

import type { SupabaseClient } from '@/db/supabase.client';
import { AuditEventType } from '@/types';

export async function logAuthEvent(
  supabase: SupabaseClient,
  userId: string | null,
  eventType: typeof AuditEventType.AuthFailure | 'auth.success',
  metadata: Record<string, unknown>
): Promise<void> {
  await supabase.from('audit_logs').insert({
    event_type: eventType,
    user_id: userId,
    metadata,
  });
}
```

### 2.5 Server-Side Rendering Updates

#### 2.5.1 Astro Configuration

**File**: `astro.config.mjs`
- **Current**: `output: "server"` ✓ (already configured)
- **No changes required**

#### 2.5.2 Middleware Integration

**Update**: `src/middleware/index.ts`
```typescript
import { defineMiddleware, sequence } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client';

const supabaseMiddleware = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});

const sessionRefreshMiddleware = defineMiddleware(async (context, next) => {
  const supabase = context.locals.supabase;
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Update last_seen_at for authenticated users
    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
  }

  return next();
});

export const onRequest = sequence(
  supabaseMiddleware,
  sessionRefreshMiddleware
);
```

#### 2.5.3 Page-Level Auth Checks

**Pattern for Protected Pages**:
```typescript
// src/pages/[protected-route].astro
---
import Layout from '@/layouts/Layout.astro';

const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  const redirectUrl = encodeURIComponent(Astro.url.pathname + Astro.url.search);
  return Astro.redirect(`/login?redirect=${redirectUrl}`);
}

const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

if (!userData) {
  return Astro.redirect('/login?error=user_not_found');
}
---

<Layout title="Page Title" user={userData}>
  <!-- Page content with authenticated user context -->
</Layout>
```

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Configuration

#### 3.1.1 OAuth Provider Setup

**Supabase Dashboard Configuration**:
1. Navigate to Authentication > Providers
2. Enable Google provider
3. Configure OAuth settings:
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
   - Authorized redirect URIs: `https://[project-ref].supabase.co/auth/v1/callback`
4. Configure email domain restrictions (application-level, not Supabase)

**Google Cloud Console Setup**:
1. Create OAuth 2.0 Client ID (Web application)
2. Set Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
3. Set Authorized redirect URIs:
   - `https://[project-ref].supabase.co/auth/v1/callback`
4. Configure OAuth consent screen:
   - App name: "10xbadger"
   - Support email
   - Scopes: email, profile, openid
   - Authorized domains: Your application domain

#### 3.1.2 Session Configuration

**Supabase Project Settings** (Authentication):
- **Session Duration**: 3600 seconds (1 hour)
- **Refresh Token Rotation**: Enabled
- **Auto Confirm Users**: Enabled (no email verification needed for OAuth)
- **Disable Signup**: Disabled (allow OAuth signup)
- **Enable Manual Signup**: Disabled (OAuth only)

#### 3.1.3 Email Templates (Not Used in MVP)

**Note**: Password recovery and email verification are not part of MVP scope (OAuth-only). If needed in future:
- Configure in Supabase Dashboard > Authentication > Email Templates
- Customize templates for password reset

### 3.2 Supabase Client Configuration

#### 3.2.1 Update Supabase Client

**File**: `src/db/supabase.client.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Use anon key for production (respects RLS)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseClient = typeof supabaseClient;
```

**Changes**:
- Remove service role key usage (was for development)
- Use anon key (respects Row Level Security)
- Enable session persistence and auto-refresh

#### 3.2.2 Server-Side Auth Helper

**File**: `src/lib/auth/server-auth.ts`
```typescript
import type { AstroGlobal } from 'astro';
import type { UserDto } from '@/types';

export async function getAuthenticatedUser(
  Astro: AstroGlobal
): Promise<UserDto | null> {
  const supabase = Astro.locals.supabase;
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return userData || null;
}

export async function requireAuth(
  Astro: AstroGlobal
): Promise<UserDto> {
  const user = await getAuthenticatedUser(Astro);
  
  if (!user) {
    const redirectUrl = encodeURIComponent(Astro.url.pathname + Astro.url.search);
    return Astro.redirect(`/login?redirect=${redirectUrl}`) as never;
  }
  
  return user;
}

export async function requireAdmin(
  Astro: AstroGlobal
): Promise<UserDto> {
  const user = await requireAuth(Astro);
  
  if (!user.is_admin) {
    return Astro.redirect('/unauthorized') as never;
  }
  
  return user;
}
```

#### 3.2.3 Client-Side Auth Hook

**File**: `src/hooks/useUser.ts`
```typescript
import { useEffect, useState } from 'react';
import type { UserDto } from '@/types';

export function useUser() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const response = await fetch('/api/me');
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        setUser(null);
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    refetch: fetchUser,
  };
}
```

### 3.3 Authentication Flow Implementation

#### 3.3.1 Login Flow (Google OAuth)

**Sequence Diagram**:
```
User -> App: Navigate to protected route
App -> User: Redirect to /login?redirect=/target
User -> App: Click "Sign in with Google"
App -> Google: Redirect to OAuth consent
Google -> User: Show consent screen
User -> Google: Approve
Google -> App: Redirect to /auth/callback?code=xxx
App -> Supabase: exchangeCodeForSession(code)
Supabase -> App: Session + User Info
App -> DB: Validate domain, upsert user
App -> User: Set session cookie, redirect to /target
```

**Implementation**: `src/pages/api/auth/google.ts`
```typescript
export const prerender = false;

import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  const redirectUrl = context.url.searchParams.get('redirect') || '/';

  // Validate redirect URL (must be relative path)
  if (!redirectUrl.startsWith('/')) {
    return new Response('Invalid redirect', { status: 400 });
  }

  // Store redirect in cookie for callback
  context.cookies.set('auth_redirect', redirectUrl, {
    path: '/',
    maxAge: 600, // 10 minutes
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
  });

  // Initiate OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${context.url.origin}/auth/callback`,
      scopes: 'email profile',
    },
  });

  if (error) {
    console.error('[AUTH] OAuth initiation failed:', error);
    return context.redirect('/login?error=auth_failed');
  }

  return context.redirect(data.url);
}
```

**Implementation**: `src/pages/api/auth/callback.ts`
```typescript
export const prerender = false;

import type { APIContext } from 'astro';
import { logAuthFailure, logAuthSuccess } from '@/lib/error-logger';

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  const code = context.url.searchParams.get('code');

  if (!code) {
    return context.redirect('/login?error=invalid_code');
  }

  try {
    // Exchange code for session
    const { data: { session, user }, error: sessionError } = 
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !session || !user) {
      logAuthFailure(null, 'Session exchange failed', { error: sessionError });
      return context.redirect('/login?error=auth_failed');
    }

    // Validate email domain
    const emailDomain = user.email?.split('@')[1];
    const allowedDomain = import.meta.env.ALLOWED_EMAIL_DOMAIN || 'goodcompany.com';

    if (emailDomain !== allowedDomain) {
      await supabase.auth.signOut();
      logAuthFailure(user.id, 'Domain not allowed', { domain: emailDomain });
      return context.redirect(`/unauthorized?domain=${emailDomain}`);
    }

    // Upsert user record
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        display_name: user.user_metadata.full_name || user.email!,
        google_sub: user.user_metadata.sub,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'google_sub',
      });

    if (dbError) {
      logAuthFailure(user.id, 'Database upsert failed', { error: dbError });
      return context.redirect('/login?error=server_error');
    }

    logAuthSuccess(user.id, 'google_oauth');

    // Retrieve and clear redirect cookie
    const redirectUrl = context.cookies.get('auth_redirect')?.value || '/';
    context.cookies.delete('auth_redirect');

    return context.redirect(redirectUrl);
  } catch (error) {
    logAuthFailure(null, 'Unexpected error', { error });
    return context.redirect('/login?error=server_error');
  }
}
```

#### 3.3.2 Logout Flow

**Implementation**: `src/pages/logout.astro`
```typescript
---
const supabase = Astro.locals.supabase;

// Sign out from Supabase
await supabase.auth.signOut();

// Redirect to login with message
return Astro.redirect('/login?message=logged_out');
---
```

#### 3.3.3 Session Refresh

**Automatic Refresh** (handled by Supabase client):
- Supabase client auto-refreshes sessions using refresh tokens
- No manual implementation needed
- Refresh happens before expiration

**Manual Refresh** (if needed):
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

### 3.4 Row Level Security (RLS) Policies

**Note**: RLS policies already exist in database schema (`20251019090000_create_initial_schema.sql`). Authentication enables proper enforcement.

#### 3.4.1 RLS Policy Context Setting

**IMPORTANT**: The existing RLS policies use `current_setting('app.current_user_id')` and `current_setting('app.is_admin')` for authorization. These settings must be explicitly set by the application after authentication.

**Implementation Required**: Update middleware to set RLS context after successful authentication:

```typescript
// src/middleware/index.ts - ADD RLS context setting
const sessionRefreshMiddleware = defineMiddleware(async (context, next) => {
  const supabase = context.locals.supabase;
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Fetch user data for RLS context
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userData) {
      // Set RLS context for this request
      // Note: This requires executing raw SQL or using a custom function
      await supabase.rpc('set_user_context', {
        user_id: session.user.id,
        is_admin: userData.is_admin
      });
    }

    // Update last_seen_at
    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id);
  }

  return next();
});
```

**Alternative Approach** (Simpler for MVP): Since RLS policies check `app.current_user_id`, and Supabase automatically sets this from the JWT token, the policies should work without manual context setting. However, for admin checks, we'll continue to fetch `is_admin` from the database explicitly in each endpoint.

**Key Policies**:
- **Users Table**: 
  - Users can read own row
  - Admins can read all rows
  - Users can update own row (except `is_admin` flag)
- **Badge Applications**: 
  - Users can read own applications
  - Admins can read all applications
  - Users can create/update own drafts
- **Promotions**: 
  - Users can read own promotions
  - Admins can read all promotions
  - Users can create/update own drafts

**Verification Needed**: Test that Supabase Auth automatically sets `app.current_user_id` from JWT. If not, we'll need to create a PostgreSQL function to set context.

### 3.5 Admin Account Seeding

**PRD Requirement**: "Admin accounts seeded at deploy for MVP" (FR-001)

#### 3.5.1 Admin Seeding Strategy

Since authentication happens via Google OAuth, admin accounts cannot be pre-created in the traditional sense. Instead, we'll use a database migration or initialization script to mark specific Google accounts as admins.

**Approach 1: Post-Login Admin Elevation (Recommended for MVP)**

Create a database migration that marks known email addresses as admin after their first login:

```sql
-- Migration: Mark admin users
-- File: supabase/migrations/[timestamp]_seed_admin_users.sql

-- Function to automatically elevate known admins on first login
CREATE OR REPLACE FUNCTION elevate_admin_users()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'admin@goodcompany.com',
    'manager@goodcompany.com'
    -- Add more admin emails here
  ];
BEGIN
  IF NEW.email = ANY(admin_emails) THEN
    NEW.is_admin := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run on user insert
CREATE TRIGGER auto_elevate_admins
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION elevate_admin_users();

-- Also update existing users if they're already in the system
UPDATE users
SET is_admin = TRUE
WHERE email IN (
  'admin@goodcompany.com',
  'manager@goodcompany.com'
);
```

**Approach 2: Manual Database Update (Simpler)**

After deployment, manually update specific users to admin via SQL:

```sql
-- Run this in Supabase SQL Editor after first admin login
UPDATE users
SET is_admin = TRUE
WHERE email = 'admin@goodcompany.com';
```

**Approach 3: Environment Variable Configuration**

Store admin emails in environment variable and check during user upsert:

```typescript
// src/pages/api/auth/callback.ts
const adminEmails = (import.meta.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
const isAdmin = adminEmails.includes(user.email);

const { error: dbError } = await supabase
  .from('users')
  .upsert({
    id: user.id,
    email: user.email!,
    display_name: user.user_metadata.full_name || user.email!,
    google_sub: user.user_metadata.sub,
    is_admin: isAdmin, // Set based on environment config
    last_seen_at: new Date().toISOString(),
  }, {
    onConflict: 'google_sub',
    ignoreDuplicates: false, // Always update
  });
```

**Recommended Approach**: Use Approach 1 (database trigger) for automatic admin elevation, supplemented by Approach 2 (manual SQL) for immediate admin access during deployment.

#### 3.5.2 Admin Seeding Checklist

- [ ] Create migration with admin email list
- [ ] Deploy migration to production
- [ ] Have first admin user login via OAuth
- [ ] Verify admin flag is set correctly
- [ ] Test admin-only routes and features
- [ ] Document process for adding future admins

### 3.6 Environment Variables

**Required Variables** (add to `.env`):
```env
# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Only for migrations/admin tasks

# Authentication
ALLOWED_EMAIL_DOMAIN=goodcompany.com

# Admin Seeding (Optional - for Approach 3)
ADMIN_EMAILS=admin@goodcompany.com,manager@goodcompany.com

# Google OAuth (configured in Supabase Dashboard - no env vars needed)
```

**Update**: `src/env.d.ts`
```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly ALLOWED_EMAIL_DOMAIN: string;
  readonly ADMIN_EMAILS?: string; // Optional
  readonly OPENROUTER_API_KEY: string;
}
```

### 3.7 Password Recovery (Out of Scope for MVP)

**Future Implementation Notes**:
- MVP uses OAuth-only (no password-based auth)
- Password recovery not needed
- If password auth is added later:
  - Use Supabase `resetPasswordForEmail()`
  - Configure email templates
  - Create password reset pages

---

## 4. PRD USER STORY VERIFICATION

This section verifies that each User Story from the PRD can be implemented with the authentication system described in this specification.

### 4.1 User Story Mapping

**US-001: User Authentication via Google Workspace SSO** ✅
- **Specification Coverage**:
  - Section 3.3.1: Google OAuth login flow implementation
  - Section 2.1.1: Authentication endpoints (`/auth/google`, `/auth/callback`)
  - Section 3.1.1: Supabase OAuth provider setup
  - Section 1.5.1-1.5.2: First-time and returning user login flows
- **Acceptance Criteria Mapping**:
  - Login flow supports Google SSO (OIDC) → ✅ Section 3.3.1
  - Only emails from configured domain can sign in → ✅ Section 2.1.1 (callback domain validation)
  - Admin accounts seeded at deploy → ✅ Section 3.5 (Admin Account Seeding)
  - Unauthorized domain emails receive clear error → ✅ Section 1.4.2 (Error Messages)

**US-002: View Badge Catalog (standard user)** ✅
- **Auth Requirements**: User must be authenticated to access catalog
- **Specification Coverage**:
  - Section 1.2.2: Modified existing pages (catalog.astro) with auth guards
  - Section 2.1.2: Modified API endpoints with authentication checks
  - Section 1.6.2: Route guards implementation pattern
- **Implementation**: `/catalog` page checks authentication, redirects to `/login` if not authenticated

**US-003: Admin Catalog Management** ✅
- **Auth Requirements**: User must be authenticated AND have `is_admin = true`
- **Specification Coverage**:
  - Section 1.6.2: Admin route guards (requireAdmin helper)
  - Section 3.2.2: `requireAdmin()` server-side helper function
  - Section 1.3.1: UserMenu component shows admin link only if `is_admin`
- **Implementation**: Admin actions check `is_admin` flag from authenticated user

**US-004: Draft Badge Application** ✅
- **Auth Requirements**: User must be authenticated to create drafts
- **Specification Coverage**:
  - Section 2.1.2: API endpoints validate authenticated user
  - Section 1.2.2: Application pages include auth guards
  - Ownership verified by comparing `applicantId` to authenticated `userId`
- **Implementation**: Draft endpoints use authenticated user's ID for ownership

**US-005: Submit Badge Application** ✅
- **Auth Requirements**: User must be authenticated and be the application owner
- **Specification Coverage**:
  - Section 2.1.2: Authentication pattern for protected endpoints
  - Server records `applicantId` from authenticated session
- **Implementation**: Submit endpoint validates user owns the application

**US-006: Admin Review Badge Application** ✅
- **Auth Requirements**: User must be authenticated AND have `is_admin = true`
- **Specification Coverage**:
  - Section 1.6.2: Admin route guards
  - Section 2.1.2: Admin-only endpoint pattern with `isAdmin` check
  - Records `reviewedBy` from authenticated admin user ID
- **Implementation**: Review endpoints check `isAdmin` before allowing accept/reject

**US-007: Create Promotion Draft** ✅
- **Auth Requirements**: User must be authenticated
- **Specification Coverage**:
  - Section 2.1.2: Protected endpoint pattern
  - Uses authenticated `userId` as `createdBy`
- **Implementation**: Promotion creation uses authenticated user ID

**US-008: Eligibility Preview and Submit Promotion** ✅
- **Auth Requirements**: User must be authenticated and own the promotion
- **Specification Coverage**:
  - Section 2.1.2: Authentication checks on promotion endpoints
  - Section 1.5.4: Session expiration handling for long-form interactions
- **Implementation**: Validation and submit check authenticated user owns promotion

**US-009: Admin Review Promotion** ✅
- **Auth Requirements**: User must be authenticated AND have `is_admin = true`
- **Specification Coverage**:
  - Section 1.6.2: Admin-only route protection
  - Section 2.1.2: Admin endpoint authentication pattern
  - Records `approvedBy`/`rejectedBy` from authenticated admin
- **Implementation**: Promotion review endpoints verify admin role

**US-010: Reservation Conflict Handling** ✅
- **Auth Requirements**: User must be authenticated to receive conflict information
- **Specification Coverage**:
  - Section 2.1.2: Authenticated endpoints return structured errors
  - No specific auth conflicts (conflict handling works with authenticated users)
- **Implementation**: Conflict modal shows for authenticated users only

**US-011: Admin Context Controls** ✅
- **Auth Requirements**: User must be authenticated with `is_admin = true`
- **Specification Coverage**:
  - Section 1.6.1: Header navigation shows admin link conditionally
  - Section 1.3.1: UserMenu component includes admin route
  - Section 1.3.2: All React views receive `isAdmin` prop
- **Implementation**: UI conditionally renders admin controls based on `isAdmin` flag

**US-012: My Badges and Promotions View** ✅
- **Auth Requirements**: User must be authenticated to view their items
- **Specification Coverage**:
  - Section 1.2.2: Dashboard and other pages include auth guards
  - Section 2.1.2: API endpoints filter by authenticated `userId`
- **Implementation**: Dashboard fetches data for authenticated user only

**US-013: Data Integrity and IDs** ✅
- **Auth Requirements**: No direct auth requirement, but user creation uses UUIDs
- **Specification Coverage**:
  - Section 2.2.1: User model uses UUID matching Supabase Auth user ID
  - Auth system preserves user ID consistency
- **Implementation**: Supabase Auth generates UUIDs, synced to users table

**US-014: Logging** ✅
- **Auth Requirements**: Log auth failures and success events
- **Specification Coverage**:
  - Section 2.4.2: Authentication event logging (logAuthFailure, logAuthSuccess)
  - Section 2.4.3: Audit logging to database
  - Section 5.5: Audit logging for auth events
- **Acceptance Criteria Mapping**:
  - Auth failures logged → ✅ Section 2.4.2
  - Timestamps and contextual fields → ✅ Logged with userId, reason, metadata
  - Logs accessible to dev/ops → ✅ Console logs + audit_logs table

### 4.2 Authentication Coverage Summary

| Functional Requirement | Auth Spec Coverage | Notes |
|------------------------|-------------------|--------|
| FR-001: Authentication | Sections 1-3 | Complete OAuth implementation |
| FR-002: Badge Catalog | Section 2.1.2 | Auth guards on pages and APIs |
| FR-003: Badge Applications | Section 2.1.2 | Ownership via authenticated userId |
| FR-004: Promotion Templates | Section 2.1.2 | Protected endpoints |
| FR-005: Promotion Builder | Section 2.1.2 | Auth + ownership checks |
| FR-006: Reservation/Concurrency | Section 2.1.2 | No conflict with auth |
| FR-007: Admin Review | Section 1.6.2, 3.2.2 | Admin role verification |
| FR-008: Logging | Section 2.4.2-2.4.3 | Auth event logging |
| FR-009: Data Models/IDs | Section 2.2.1 | UUID consistency |
| FR-010: Import/Migration | N/A | Out of scope |
| FR-011: Position Levels | Section 2.1.2 | Protected endpoint pattern |

### 4.3 Identified Conflicts and Resolutions

#### Conflict 1: RLS Policy Context Setting ⚠️
**Issue**: Existing RLS policies use `current_setting('app.current_user_id')` and `current_setting('app.is_admin')`, but it's unclear if Supabase Auth automatically sets these.

**Resolution**: 
- **Option A**: Test if Supabase automatically populates `app.current_user_id` from JWT
- **Option B**: Create database function `set_user_context()` and call from middleware
- **Option C**: Continue using explicit authorization checks in endpoints (current approach)

**Recommendation**: Use Option C for MVP (explicit checks in endpoints), then migrate to Option A/B if RLS context is needed.

**Updated in**: Section 3.4.1

#### Conflict 2: Admin Account Seeding ⚠️
**Issue**: PRD states "Admin accounts seeded at deploy" but OAuth prevents pre-creating accounts before users log in.

**Resolution**: Three approaches provided:
1. Database trigger to auto-elevate known admin emails (Recommended)
2. Manual SQL update after first login
3. Environment variable configuration

**Recommendation**: Use approach 1 (database trigger) + approach 2 (manual SQL) for flexibility.

**Updated in**: Section 3.5

#### Conflict 3: SAML Support 🔍
**Issue**: PRD mentions "OIDC/SAML" but specification only implements OIDC via Google OAuth.

**Clarification**: SAML support deferred to future enhancement. MVP uses OIDC only.

**Updated in**: Section 7.1 (Future Enhancements)

### 4.4 Assumptions Validated

✅ **OAuth-Only Authentication**: PRD confirms "No manual account creation", aligns with OAuth-only approach  
✅ **Domain Restriction**: Server-side validation required per FR-001  
✅ **Two-Tier Roles**: Only `administrator` and `standard user` needed for MVP  
✅ **Session Management**: Supabase Auth handles session lifecycle automatically  
✅ **Password Recovery Not Needed**: Out of scope per PRD Section 4 (Product Boundaries)  

---

## 5. INTEGRATION CHECKLIST

### 5.1 New Files to Create

#### Auth Pages
- [ ] `src/pages/login.astro` - Login page
- [ ] `src/pages/logout.astro` - Logout endpoint
- [ ] `src/pages/unauthorized.astro` - Unauthorized access page
- [ ] `src/pages/api/auth/google.ts` - OAuth initiation
- [ ] `src/pages/api/auth/callback.ts` - OAuth callback handler
- [ ] `src/pages/api/auth/session.ts` - Session info endpoint
- [ ] `src/pages/api/me.ts` - Current user endpoint

#### Auth Components
- [ ] `src/components/auth/LoginView.tsx` - Login interface
- [ ] `src/components/auth/GoogleSignInButton.tsx` - OAuth button
- [ ] `src/components/auth/AuthErrorAlert.tsx` - Error display
- [ ] `src/components/navigation/UserMenu.tsx` - User dropdown

#### Auth Logic
- [ ] `src/lib/auth/server-auth.ts` - Server-side helpers
- [ ] `src/lib/validation/auth.validation.ts` - Zod schemas
- [ ] `src/lib/errors/auth.errors.ts` - Custom error classes
- [ ] `src/hooks/useUser.ts` - React auth hook (update existing)

### 5.2 Files to Modify

#### Configuration
- [x] `src/db/supabase.client.ts` - Switch to anon key, enable auth options
- [x] `src/middleware/index.ts` - Add session refresh middleware
- [x] `src/env.d.ts` - Add `ALLOWED_EMAIL_DOMAIN`

#### Layout
- [ ] `src/layouts/Layout.astro` - Add user prop, conditionally render nav

#### Existing Pages (Add Auth Guards)
- [ ] `src/pages/index.astro` - Dashboard
- [ ] `src/pages/catalog.astro` - Catalog list
- [ ] `src/pages/catalog/[id].astro` - Catalog detail
- [ ] `src/pages/applications.astro` - Applications list
- [ ] `src/pages/applications/[id].astro` - Application detail
- [ ] `src/pages/apply/new.astro` - New application
- [ ] `src/pages/promotions.astro` - Promotions list
- [ ] `src/pages/promotions/[id].astro` - Promotion detail
- [ ] `src/pages/promotion-templates.astro` - Templates list
- [ ] `src/pages/admin/review.astro` - Admin review

#### Existing API Endpoints (Add Auth Checks)
- [ ] All endpoints in `src/pages/api/badge-applications/`
- [ ] All endpoints in `src/pages/api/promotions/`
- [ ] All endpoints in `src/pages/api/catalog-badges/`
- [ ] All endpoints in `src/pages/api/promotion-templates/`

### 5.3 External Configuration

#### Supabase Dashboard
- [ ] Enable Google OAuth provider
- [ ] Configure OAuth credentials (Client ID/Secret)
- [ ] Set session duration (3600s)
- [ ] Enable refresh token rotation
- [ ] Enable auto-confirm users

#### Google Cloud Console
- [ ] Create OAuth 2.0 Client ID
- [ ] Configure authorized origins
- [ ] Configure redirect URIs
- [ ] Set up OAuth consent screen
- [ ] Add application logo and description

#### Environment Variables
- [ ] Add `ALLOWED_EMAIL_DOMAIN` to `.env`
- [ ] Document all env vars in `.env.example`
- [ ] Update deployment configurations

### 5.4 Testing Requirements

#### Manual Testing
- [ ] First-time user login (domain match)
- [ ] First-time user login (domain mismatch)
- [ ] Returning user login
- [ ] Session expiration handling
- [ ] Logout flow
- [ ] Admin vs. standard user permissions
- [ ] Redirect after login to intended destination
- [ ] Concurrent sessions (multiple tabs)

#### Automated Testing (Optional for MVP)
- [ ] Unit tests for validation schemas
- [ ] Integration tests for auth endpoints
- [ ] E2E tests for complete auth flow

### 5.5 Documentation

- [ ] Update README with authentication setup instructions
- [ ] Document environment variable requirements
- [ ] Create Google OAuth setup guide
- [ ] Update API documentation with auth requirements
- [ ] Document troubleshooting steps for common auth issues

---

## 6. SECURITY CONSIDERATIONS

### 6.1 OAuth Security

**CSRF Protection**:
- Use state parameter in OAuth flow
- Validate state on callback
- Store state in httpOnly cookie

**Token Security**:
- Use httpOnly cookies for session tokens (Supabase default)
- Never expose tokens in localStorage
- Set secure flag in production
- Use SameSite=Lax for CSRF protection

### 6.2 Domain Restriction

**Email Validation**:
- Validate domain server-side (never trust client)
- Reject unauthorized domains immediately
- Log rejection attempts for monitoring
- Clear session before rejection redirect

### 6.3 Session Management

**Session Lifecycle**:
- Default duration: 1 hour (configurable)
- Auto-refresh before expiration
- Graceful handling of expired sessions
- Forced logout on security events

**Cookie Configuration**:
```typescript
{
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax',
  maxAge: 3600,
}
```

### 6.4 Rate Limiting (Future Enhancement)

**Recommendations**:
- Limit login attempts per IP
- Limit OAuth callback retries
- Monitor for suspicious patterns
- Implement exponential backoff

### 6.5 Audit Logging

**Log Events**:
- Successful logins
- Failed login attempts
- Domain restriction violations
- Session expirations
- Logout events

**Log Retention**:
- Store in `audit_logs` table
- Retain for compliance requirements
- Include IP address, user agent, timestamp

---

## 7. DEPLOYMENT CONSIDERATIONS

### 7.1 Pre-Production Checklist

- [ ] Remove all `TODO` comments for authentication
- [ ] Remove development mode bypasses
- [ ] Switch from service role key to anon key
- [ ] Enable Row Level Security enforcement
- [ ] Test with real Google Workspace account
- [ ] Configure production OAuth credentials
- [ ] Set up monitoring and alerts

### 7.2 Production Configuration

**Environment**:
- [ ] Set `ALLOWED_EMAIL_DOMAIN` to actual domain
- [ ] Use production Supabase project
- [ ] Configure production OAuth redirect URLs
- [ ] Enable HTTPS enforcement
- [ ] Set secure cookie flags

**Monitoring**:
- [ ] Monitor auth failure rate
- [ ] Alert on unusual login patterns
- [ ] Track session duration metrics
- [ ] Monitor token refresh failures

### 7.3 Rollback Plan

**If Issues Arise**:
1. Revert to development mode (service role key)
2. Disable OAuth provider in Supabase
3. Add notice banner explaining maintenance
4. Debug in staging environment
5. Deploy fix with thorough testing

---

## 8. FUTURE ENHANCEMENTS (Out of Scope for MVP)

### 8.1 Additional Auth Methods

- **SAML SSO**: For enterprise customers with IdP
- **Magic Links**: Email-based passwordless auth
- **Multi-Factor Authentication**: TOTP or SMS-based 2FA

### 8.2 Advanced Features

- **Session Management Dashboard**: View/revoke active sessions
- **Login History**: Track login events per user
- **Role Hierarchy**: More granular permissions beyond admin/user
- **Team/Organization Support**: Multi-tenant architecture
- **API Keys**: For programmatic access

### 8.3 User Profile Management

- **Profile Settings Page**: Edit display name, avatar
- **Notification Preferences**: Email notification toggles
- **Privacy Settings**: Control data visibility
- **Account Deletion**: GDPR-compliant self-service deletion

---

## 9. APPENDIX

### 9.1 Error Code Reference

| Code | HTTP Status | User Message | Action |
|------|-------------|--------------|--------|
| `invalid_domain` | 403 | Domain not authorized | Redirect to `/unauthorized` |
| `auth_failed` | 401 | Authentication failed | Retry OAuth flow |
| `session_expired` | 401 | Session expired | Redirect to `/login` |
| `user_not_found` | 401 | User not found | Contact support |
| `server_error` | 500 | Unexpected error | Retry later |
| `invalid_code` | 400 | Invalid auth code | Restart OAuth flow |
| `invalid_redirect` | 400 | Invalid redirect URL | Use default redirect |

### 9.2 User Flow Diagrams

**Login Flow**:
```
┌──────┐     ┌─────────┐     ┌────────┐     ┌──────────┐     ┌──────┐
│ User │────▶│ /login  │────▶│ Google │────▶│ Callback │────▶│  /   │
└──────┘     └─────────┘     └────────┘     └──────────┘     └──────┘
   │             │                │               │              │
   │   View      │  OAuth         │  Consent      │  Session     │  Auth
   │   Login     │  Redirect      │  & Approve    │  Exchange    │  Success
```

**Session Expired**:
```
┌──────┐     ┌──────────┐     ┌─────────┐     ┌────────┐
│ User │────▶│ Request  │────▶│ 401     │────▶│ /login │
└──────┘     └──────────┘     └─────────┘     └────────┘
   │             │                  │              │
   │   Action    │  Auth Check      │  Redirect    │  Re-auth
```

### 9.3 Type Definitions

**New Types** (`src/types.ts` additions):
```typescript
// Auth-related types

export interface AuthSession {
  user: UserDto;
  expiresAt: string;
}

export interface GoogleOAuthProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface LoginError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
}
```

### 9.4 Sample Requests/Responses

**Login Initiation**:
```
GET /api/auth/google?redirect=/catalog/123
→ HTTP 302 Redirect to Google OAuth
```

**OAuth Callback**:
```
GET /api/auth/callback?code=xxx&state=yyy
→ HTTP 302 Redirect to /catalog/123
Set-Cookie: sb-access-token=...; HttpOnly; Secure
```

**Get Session**:
```
GET /api/auth/session
Cookie: sb-access-token=...

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@goodcompany.com",
    "display_name": "John Doe",
    "is_admin": false
  },
  "authenticated": true
}
```

**Logout**:
```
POST /api/auth/logout
Cookie: sb-access-token=...

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

**End of Specification**

