# Authentication System Architecture Specification

## Document Overview

This specification describes the authentication system for 10xbadger, implementing email/password authentication using Supabase Auth and Astro. It covers user registration, login, logout, and password recovery flows while maintaining compatibility with existing application behavior defined in the PRD.

**Version**: 2.0
**Date**: 2025-11-10
**Status**: Technical Specification
**PRD Reference**: FR-001 (Authentication and Authorization), US-001, US-00101, US-00102, US-00103, US-00104

### Key Requirements from PRD

**FR-001 Authentication and Authorization** (Updated):
- Use email and password authentication (Supabase Auth)
- Support user registration with email validation
- Support password recovery with email reset links
- Admin accounts assigned through database updates only
- Roles: `administrator` and `standard user (engineer)`
- All endpoints must validate authenticated user and role

**User Stories Covered**:
- **US-001**: User Authentication via email and password
- **US-00101**: User registration via registration form
- **US-00102**: User sign out via sign out button
- **US-00103**: User password recovery
- **US-00104**: Administrative rights assignment

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Authentication Flow Overview

The application implements a standard email/password authentication model where:
- **Unauthenticated users** are redirected to `/login` for all protected routes
- **Authenticated users** have seamless access to application features
- **Email/password** is the authentication method with email verification
- **Password recovery** available via email reset links
- **Session management** uses Supabase Auth with httpOnly cookies

### 1.2 Page Structure

#### 1.2.1 New Auth Pages

**Page: Login (`/login`)**
- **Purpose**: Entry point for authentication; email/password login form
- **Access**: Public (unauthenticated only; redirects authenticated users to `/`)
- **Components**:
  - `LoginPage.astro` - Server-rendered Astro page
  - `LoginView.tsx` - React component for interactive login form
  - `EmailPasswordForm.tsx` - Email and password input fields
  - `AuthErrorAlert.tsx` - Display authentication errors
  - `AuthSuccessAlert.tsx` - Display success messages (e.g., "Check your email")
- **Layout**: Centered card layout with branding, minimal navigation
- **Content**:
  - Application logo and name
  - Email input field
  - Password input field (with show/hide toggle)
  - "Sign In" button (primary CTA)
  - "Forgot password?" link → `/forgot-password`
  - "Don't have an account? Register" link → `/register`
  - Error message display area
  - Success message display area

**Page: Register (`/register`)**
- **Purpose**: New user registration with email and password
- **Access**: Public (unauthenticated only; redirects authenticated users to `/`)
- **Components**:
  - `RegisterPage.astro` - Server-rendered Astro page
  - `RegisterView.tsx` - React component for interactive registration form
  - `RegistrationForm.tsx` - Form with validation
  - `PasswordStrengthIndicator.tsx` - Visual password strength meter
  - `AuthErrorAlert.tsx` - Display registration errors
- **Layout**: Centered card layout with branding
- **Content**:
  - Application logo and name
  - Email input field (with validation)
  - Password input field (min 8 characters)
  - Password confirmation field
  - Password strength indicator
  - "Create Account" button (primary CTA)
  - "Already have an account? Sign in" link → `/login`
  - Error message display area
  - Success message: "Check your email to verify your account"

**Page: Verify Email (`/verify-email`)**
- **Purpose**: Instructions after registration
- **Access**: Public
- **Components**:
  - `VerifyEmailView.tsx` - Instructions and resend link
- **Content**:
  - Check email icon/illustration
  - "Check your email" heading
  - Instructions to click verification link
  - "Resend verification email" button
  - "Back to login" link

**Page: Forgot Password (`/forgot-password`)**
- **Purpose**: Initiate password recovery process
- **Access**: Public
- **Components**:
  - `ForgotPasswordPage.astro` - Server-rendered Astro page
  - `ForgotPasswordView.tsx` - React component for form
  - `EmailForm.tsx` - Email input field
  - `AuthErrorAlert.tsx` - Display errors
  - `AuthSuccessAlert.tsx` - Display success messages
- **Layout**: Centered card layout
- **Content**:
  - "Reset your password" heading
  - Instructions: "Enter your email to receive reset link"
  - Email input field
  - "Send Reset Link" button (primary CTA)
  - "Back to login" link → `/login`
  - Success message: "Check your email for reset link"

**Page: Reset Password (`/reset-password`)**
- **Purpose**: Set new password via recovery link
- **Access**: Public (requires valid recovery token in URL)
- **Components**:
  - `ResetPasswordPage.astro` - Server-rendered Astro page
  - `ResetPasswordView.tsx` - React component for form
  - `NewPasswordForm.tsx` - New password input fields
  - `PasswordStrengthIndicator.tsx` - Visual password strength meter
  - `AuthErrorAlert.tsx` - Display errors
- **Layout**: Centered card layout
- **Content**:
  - "Set new password" heading
  - New password input field (min 8 characters)
  - Confirm password input field
  - Password strength indicator
  - "Reset Password" button (primary CTA)
  - Success redirect to `/login` with success message

**Page: Logout Confirmation (`/logout`)**
- **Purpose**: Confirm logout action and clear session
- **Access**: Protected (authenticated users only)
- **Implementation**: Server-side Astro endpoint
- **Flow**:
  1. Clear Supabase session
  2. Clear cookies
  3. Redirect to `/login?message=logged_out`

**Page: Unauthorized (`/unauthorized`)**
- **Purpose**: Display friendly message for insufficient permissions
- **Access**: Public
- **Content**:
  - Explanation of access restrictions
  - Contact information for access requests
  - Link to return to dashboard or login

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
- **Purpose**: Interactive login interface with email/password
- **Props**:
```typescript
interface LoginViewProps {
  error?: string;
  message?: string;
  redirectUrl?: string;
}
```
- **State**:
  - `email: string` - User email input
  - `password: string` - User password input
  - `isLoading: boolean` - Form submission state
  - `showPassword: boolean` - Password visibility toggle
- **Validation**:
  - Email: Valid email format (RFC 5322)
  - Password: Not empty, minimum 8 characters
- **Events**:
  - `handleSubmit()` - Submit login form via `/api/auth/login`
  - `handleForgotPassword()` - Navigate to `/forgot-password`
  - `handleRegister()` - Navigate to `/register`

**Component: `RegisterView` (React)**
- **File**: `src/components/auth/RegisterView.tsx`
- **Purpose**: User registration form
- **Props**:
```typescript
interface RegisterViewProps {
  error?: string;
}
```
- **State**:
  - `email: string` - User email input
  - `password: string` - User password input
  - `confirmPassword: string` - Password confirmation
  - `isLoading: boolean` - Form submission state
  - `showPassword: boolean` - Password visibility toggle
  - `passwordStrength: number` - Password strength score (0-4)
- **Validation**:
  - Email: Valid format, not already registered
  - Password: Minimum 8 characters
  - Confirm password: Must match password
  - Real-time validation feedback
- **Events**:
  - `handleSubmit()` - Submit registration via `/api/auth/register`
  - `handlePasswordChange()` - Update password strength indicator

**Component: `ForgotPasswordView` (React)**
- **File**: `src/components/auth/ForgotPasswordView.tsx`
- **Purpose**: Password recovery initiation
- **Props**:
```typescript
interface ForgotPasswordViewProps {
  error?: string;
  success?: boolean;
}
```
- **State**:
  - `email: string` - User email input
  - `isLoading: boolean` - Form submission state
  - `sent: boolean` - Email sent confirmation
- **Validation**:
  - Email: Valid format, required
- **Events**:
  - `handleSubmit()` - Send reset email via `/api/auth/forgot-password`

**Component: `ResetPasswordView` (React)**
- **File**: `src/components/auth/ResetPasswordView.tsx`
- **Purpose**: Set new password via recovery link
- **Props**:
```typescript
interface ResetPasswordViewProps {
  token: string; // Recovery token from URL
  error?: string;
}
```
- **State**:
  - `password: string` - New password input
  - `confirmPassword: string` - Password confirmation
  - `isLoading: boolean` - Form submission state
  - `showPassword: boolean` - Password visibility toggle
  - `passwordStrength: number` - Password strength score
- **Validation**:
  - Password: Minimum 8 characters
  - Confirm password: Must match password
- **Events**:
  - `handleSubmit()` - Reset password via `/api/auth/reset-password`

**Component: `PasswordStrengthIndicator` (React)**
- **File**: `src/components/auth/PasswordStrengthIndicator.tsx`
- **Purpose**: Visual feedback for password strength
- **Props**:
```typescript
interface PasswordStrengthIndicatorProps {
  password: string;
  onStrengthChange?: (strength: number) => void;
}
```
- **Algorithm**:
  - Score 0-4 based on:
    - Length (8+ chars)
    - Uppercase letters
    - Lowercase letters
    - Numbers
    - Special characters
- **Display**:
  - Color-coded strength bar (red → yellow → green)
  - Text labels: "Weak", "Fair", "Good", "Strong"

**Component: `AuthErrorAlert` (React)**
- **File**: `src/components/auth/AuthErrorAlert.tsx`
- **Purpose**: Display user-friendly authentication errors
- **Props**:
```typescript
interface AuthErrorAlertProps {
  error: string; // Error code from URL params or API
  dismissible?: boolean;
}
```
- **Error Messages**:
  - `invalid_credentials` - "Invalid email or password."
  - `email_already_exists` - "An account with this email already exists."
  - `weak_password` - "Password must be at least 8 characters long."
  - `passwords_dont_match` - "Passwords do not match."
  - `invalid_token` - "Reset link is invalid or has expired."
  - `email_not_confirmed` - "Please verify your email address before signing in."
  - `session_expired` - "Your session has expired. Please sign in again."
  - `user_not_found` - "No account found with this email."

**Component: `AuthSuccessAlert` (React)**
- **File**: `src/components/auth/AuthSuccessAlert.tsx`
- **Purpose**: Display success messages
- **Props**:
```typescript
interface AuthSuccessAlertProps {
  message: string;
  dismissible?: boolean;
}
```

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
- Email: Required, valid email format
- Password: Required, not empty

**Registration Form**:
- Email: Required, valid format
- Password: Required, minimum 8 characters
- Confirm Password: Required, must match password
- Real-time validation with error messages

**Forgot Password Form**:
- Email: Required, valid format

**Reset Password Form**:
- Password: Required, minimum 8 characters
- Confirm Password: Required, must match password
- Password strength: Show indicator, require minimum strength

#### 1.4.2 Server-Side Validation

All forms validated on server with Zod schemas:
- Email format validation
- Password length validation (min 8 chars)
- Email uniqueness check for registration
- Token validity check for password reset

#### 1.4.3 Error Messages

| Error Code | User Message | Context |
|------------|--------------|---------|
| `invalid_credentials` | "Invalid email or password. Please try again." | Login |
| `email_already_exists` | "An account with this email already exists. Please sign in." | Registration |
| `weak_password` | "Password must be at least 8 characters long." | Registration/Reset |
| `passwords_dont_match` | "Passwords do not match. Please try again." | Registration/Reset |
| `invalid_token` | "This reset link is invalid or has expired. Please request a new one." | Password Reset |
| `email_not_confirmed` | "Please verify your email address before signing in. Check your inbox." | Login |
| `session_expired` | "Your session has expired. Please sign in again to continue." | Protected Pages |
| `user_not_found` | "No account found with this email address." | Forgot Password |
| `server_error` | "An unexpected error occurred. Please try again later." | All Forms |

### 1.5 User Scenarios

#### 1.5.1 First-Time User Registration

**Flow**:
1. User navigates to `/login`
2. User clicks "Don't have an account? Register"
3. User fills out registration form (email, password, confirm password)
4. User clicks "Create Account"
5. Server validates input, checks email uniqueness
6. Server creates Supabase Auth user (status: unconfirmed)
7. Server sends verification email via Supabase
8. User redirected to `/verify-email` with instructions
9. User checks email and clicks verification link
10. Verification link redirects to `/login?message=email_verified`
11. User can now sign in with credentials

**Validation**:
- Email must be valid format
- Email must not already exist
- Password must be at least 8 characters
- Confirm password must match

**Edge Cases**:
- Duplicate email → Show error: "Email already exists"
- Weak password → Show error inline before submit
- Email send failure → Show error: "Failed to send verification email"

#### 1.5.2 Returning User Login

**Flow**:
1. User navigates to `/` → Redirected to `/login?redirect=/`
2. User enters email and password
3. User clicks "Sign In"
4. Server validates credentials via Supabase Auth
5. Server checks email confirmation status
6. Server fetches user profile from `users` table
7. Server sets session cookie
8. Server updates `last_seen_at` timestamp
9. User redirected to intended destination or `/`

**Validation**:
- Credentials must match Supabase Auth
- Email must be confirmed
- User record must exist in `users` table

**Edge Cases**:
- Invalid credentials → Show error: "Invalid email or password"
- Email not confirmed → Show error with resend link
- User not in database → Create user record, then continue

#### 1.5.3 Password Recovery

**Flow (Initiate)**:
1. User clicks "Forgot password?" on login page
2. User redirected to `/forgot-password`
3. User enters email address
4. User clicks "Send Reset Link"
5. Server generates recovery token via Supabase
6. Server sends recovery email with link to `/reset-password?token=xxx`
7. User sees success message: "Check your email"

**Flow (Complete)**:
1. User clicks link in email
2. User redirected to `/reset-password?token=xxx`
3. Page validates token (not expired, not used)
4. User enters new password (twice)
5. User clicks "Reset Password"
6. Server validates token and updates password
7. Token is invalidated (one-time use)
8. User redirected to `/login?message=password_reset_success`

**Validation**:
- Email must exist in system (don't reveal if it doesn't for security)
- Token must be valid and not expired (default 1 hour)
- Token must not have been used already
- New password must be at least 8 characters

**Edge Cases**:
- Invalid/expired token → Show error: "Link is invalid or expired"
- Token already used → Show error: "Link has already been used"
- Email not found → Still show success (security best practice)

#### 1.5.4 Logout

**Flow**:
1. User clicks "Sign Out" in UserMenu
2. Browser navigates to `/logout`
3. Server calls `supabase.auth.signOut()`
4. Server clears cookies
5. Server redirects to `/login?message=logged_out`
6. User sees confirmation message: "You have been signed out"

#### 1.5.5 Session Expiration

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

**Endpoint: `POST /api/auth/register`**
- **Purpose**: Register new user with email and password
- **Access**: Public
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/register.ts`
- **Request Body**:
```typescript
{
  email: string;      // Valid email address
  password: string;   // Minimum 8 characters
}
```
- **Validation**:
```typescript
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```
- **Flow**:
  1. Validate request body with Zod schema
  2. Check if email already exists (Supabase will handle this)
  3. Call `supabase.auth.signUp({ email, password })`
  4. Supabase sends verification email automatically
  5. Create placeholder record in `users` table
  6. Return success response
- **Response Success (201)**:
```typescript
{
  message: "Registration successful. Please check your email to verify your account.",
  email: "user@example.com"
}
```
- **Response Errors**:
  - `400 Bad Request`: Invalid input
    ```json
    {
      "error": "validation_error",
      "message": "Invalid email format",
      "details": [{"field": "email", "message": "Invalid email format"}]
    }
    ```
  - `409 Conflict`: Email already exists
    ```json
    {
      "error": "email_already_exists",
      "message": "An account with this email already exists"
    }
    ```
  - `500 Internal Server Error`: Server error

**Endpoint: `POST /api/auth/login`**
- **Purpose**: Authenticate user with email and password
- **Access**: Public
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/login.ts`
- **Request Body**:
```typescript
{
  email: string;
  password: string;
}
```
- **Validation**:
```typescript
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
```
- **Flow**:
  1. Validate request body
  2. Call `supabase.auth.signInWithPassword({ email, password })`
  3. Check if email is confirmed
  4. Fetch or create user record in `users` table
  5. Update `last_seen_at` timestamp
  6. Return session info
- **Response Success (200)**:
```typescript
{
  user: {
    id: "uuid",
    email: "user@example.com",
    display_name: "User Name",
    is_admin: false
  },
  message: "Login successful"
}
```
- **Response Errors**:
  - `400 Bad Request`: Invalid input
  - `401 Unauthorized`: Invalid credentials
    ```json
    {
      "error": "invalid_credentials",
      "message": "Invalid email or password"
    }
    ```
  - `403 Forbidden`: Email not confirmed
    ```json
    {
      "error": "email_not_confirmed",
      "message": "Please verify your email address before signing in"
    }
    ```

**Endpoint: `POST /api/auth/forgot-password`**
- **Purpose**: Initiate password recovery process
- **Access**: Public
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/forgot-password.ts`
- **Request Body**:
```typescript
{
  email: string;
}
```
- **Validation**:
```typescript
const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});
```
- **Flow**:
  1. Validate request body
  2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
  3. Supabase sends recovery email with token
  4. Always return success (security: don't reveal if email exists)
- **Response Success (200)**:
```typescript
{
  message: "If an account exists with this email, you will receive a password reset link."
}
```
- **Response Errors**:
  - `400 Bad Request`: Invalid email format
  - `429 Too Many Requests`: Rate limit exceeded

**Endpoint: `POST /api/auth/reset-password`**
- **Purpose**: Set new password with recovery token
- **Access**: Public (requires valid token)
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/reset-password.ts`
- **Request Body**:
```typescript
{
  token: string;      // Recovery token from email link
  password: string;   // New password (min 8 chars)
}
```
- **Validation**:
```typescript
const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```
- **Flow**:
  1. Validate request body
  2. Verify token with `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`
  3. Update password with `supabase.auth.updateUser({ password })`
  4. Token is automatically invalidated by Supabase (one-time use)
  5. Return success response
- **Response Success (200)**:
```typescript
{
  message: "Password reset successful. You can now sign in with your new password."
}
```
- **Response Errors**:
  - `400 Bad Request`: Invalid input or weak password
  - `401 Unauthorized`: Invalid or expired token
    ```json
    {
      "error": "invalid_token",
      "message": "Reset link is invalid or has expired"
    }
    ```

**Endpoint: `POST /api/auth/logout`**
- **Purpose**: Terminate user session
- **Access**: Protected (authenticated users)
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/logout.ts`
- **Request Body**: None
- **Flow**:
  1. Get session from request
  2. Call `supabase.auth.signOut()`
  3. Clear cookies
  4. Return success response
- **Response Success (200)**:
```typescript
{
  success: true,
  message: "Logged out successfully"
}
```

**Endpoint: `POST /api/auth/resend-verification`**
- **Purpose**: Resend email verification link
- **Access**: Public
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/resend-verification.ts`
- **Request Body**:
```typescript
{
  email: string;
}
```
- **Flow**:
  1. Validate email format
  2. Call `supabase.auth.resend({ type: 'signup', email })`
  3. Return success (don't reveal if email exists)
- **Response Success (200)**:
```typescript
{
  message: "Verification email sent. Please check your inbox."
}
```

**Endpoint: `GET /api/auth/session`**
- **Purpose**: Get current session info (for client-side checks)
- **Access**: Public (returns null if unauthenticated)
- **Implementation**: Astro API route
- **File**: `src/pages/api/auth/session.ts`
- **Response Success (200)**:
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
- **Implementation**: Astro API route
- **File**: `src/pages/api/me.ts`
- **Response Success (200)**: `UserDto`
- **Response Errors**:
  - `401 Unauthorized`: Not authenticated

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

#### 2.2.1 User Model

**Table**: `users`
- **Schema** (from existing migration):
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
```

**Note**: The `google_sub` field from the previous Google OAuth implementation should be removed in a new migration:

```sql
-- Migration: Remove google_sub column
alter table users drop column if exists google_sub;
```

**Fields**:
- `id` (UUID, PK) - Matches Supabase Auth user ID
- `email` (text, unique) - User email
- `display_name` (text) - User's display name
- `is_admin` (boolean) - Admin role flag (default false)
- `created_at` (timestamptz) - Account creation timestamp
- `last_seen_at` (timestamptz) - Last login timestamp

**Indexes**:
- Primary key on `id`
- Unique constraint on `email`

#### 2.2.2 Session Storage

**Supabase Auth** manages sessions automatically:
- Sessions stored in Supabase Auth tables (managed)
- Client receives httpOnly cookie with session token
- No application database changes required
- Refresh tokens handled by Supabase
- Email confirmation status tracked by Supabase Auth

### 2.3 Input Validation

#### 2.3.1 Zod Schemas

**File**: `src/lib/validation/auth.validation.ts`

```typescript
import { z } from 'zod';

// Registration validation
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Login validation
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Forgot password validation
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Reset password validation
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Redirect URL validation
export const RedirectSchema = z.object({
  redirect: z.string().optional().refine(
    (url) => !url || url.startsWith('/'),
    'Redirect must be a relative path'
  ),
});
```

#### 2.3.2 Password Strength Validation

**Client-Side Only** (UX feedback):
- Check length (8+ characters)
- Check for uppercase, lowercase, numbers, special chars
- Display strength indicator
- Don't block submission based on strength

**Server-Side**:
- Enforce minimum 8 characters (Supabase default)
- Can configure stronger requirements in Supabase dashboard

#### 2.3.3 Email Verification

**Supabase Handles**:
- Sends verification email on signup
- Tracks confirmation status
- Requires confirmation before login (configurable)
- Provides resend functionality

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

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super(
      'Invalid email or password',
      'invalid_credentials',
      401
    );
  }
}

export class EmailAlreadyExistsError extends AuthError {
  constructor() {
    super(
      'An account with this email already exists',
      'email_already_exists',
      409
    );
  }
}

export class EmailNotConfirmedError extends AuthError {
  constructor() {
    super(
      'Please verify your email address before signing in',
      'email_not_confirmed',
      403
    );
  }
}

export class InvalidTokenError extends AuthError {
  constructor() {
    super(
      'Reset link is invalid or has expired',
      'invalid_token',
      401
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

export class WeakPasswordError extends AuthError {
  constructor() {
    super(
      'Password must be at least 8 characters long',
      'weak_password',
      400
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
}

export function logAuthSuccess(
  userId: string,
  method: 'email_password',
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

export async function logAuthEvent(
  supabase: SupabaseClient,
  userId: string | null,
  eventType: 'auth.success' | 'auth.failure' | 'auth.password_reset',
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

#### 3.1.1 Email Authentication Setup

**Supabase Dashboard Configuration**:
1. Navigate to Authentication > Providers
2. Ensure Email provider is enabled (default)
3. Configure email settings:
   - **Enable Email Signup**: Yes
   - **Confirm Email**: Yes (require email verification)
   - **Secure Email Change**: Yes
   - **Double Confirm Email Changes**: Yes

**Email Templates** (Authentication > Email Templates):
1. **Confirmation Email**:
   - Subject: "Confirm your email for 10xbadger"
   - Body: Include {{ .ConfirmationURL }} link
   - Redirect URL: `https://yourdomain.com/login?message=email_verified`

2. **Magic Link** (Not used in MVP, but available):
   - Can be used for passwordless login in future

3. **Password Recovery**:
   - Subject: "Reset your password for 10xbadger"
   - Body: Include {{ .ConfirmationURL }} link
   - Redirect URL: `https://yourdomain.com/reset-password`

#### 3.1.2 Session Configuration

**Supabase Project Settings** (Authentication):
- **JWT Expiry**: 3600 seconds (1 hour)
- **Refresh Token Rotation**: Enabled
- **Auto Confirm Users**: Disabled (require email verification)
- **Disable Signup**: Disabled (allow registration)
- **Enable Manual Signup**: Enabled
- **Minimum Password Length**: 8 characters
- **Strong Password**: Disabled (we handle client-side)

#### 3.1.3 Security Settings

**Password Policy**:
- Minimum length: 8 characters
- No complexity requirements (configurable in dashboard)
- Rate limiting on password reset: 60 seconds

**Session Security**:
- HttpOnly cookies for tokens
- Secure flag in production
- SameSite: Lax (CSRF protection)

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
    flowType: 'pkce', // Use PKCE flow for added security
  },
});

export type SupabaseClient = typeof supabaseClient;
```

**Changes from Previous Version**:
- Remove service role key usage (was for development)
- Use anon key (respects Row Level Security)
- Enable session persistence and auto-refresh
- Use PKCE flow for better security

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

#### 3.3.1 Registration Flow

**Sequence Diagram**:
```
User -> App: Fill registration form (email, password)
App -> App: Validate input client-side
User -> App: Submit registration
App -> Supabase: signUp({ email, password })
Supabase -> Email: Send verification link
Supabase -> App: User created (unconfirmed)
App -> DB: Create user record (if needed)
App -> User: Show "Check your email" message
User -> Email: Click verification link
Email -> Supabase: Confirm email
Supabase -> App: Redirect to /login?message=email_verified
```

**Implementation**: `src/pages/api/auth/register.ts`
```typescript
export const prerender = false;

import type { APIContext } from 'astro';
import { RegisterSchema } from '@/lib/validation/auth.validation';
import { logAuthFailure, logAuthSuccess } from '@/lib/error-logger';

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  try {
    // Parse and validate request body
    const body = await context.request.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors.map((e) => ({
            field: e.path[0],
            message: e.message,
          })),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = validation.data;

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${context.url.origin}/login?message=email_verified`,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return new Response(
          JSON.stringify({
            error: 'email_already_exists',
            message: 'An account with this email already exists',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      logAuthFailure(null, 'Registration failed', { error, email });
      return new Response(
        JSON.stringify({
          error: 'registration_failed',
          message: error.message || 'Registration failed',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create user record in application database
    if (data.user) {
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: data.user.email!.split('@')[0], // Default display name
          is_admin: false,
        });

      if (dbError && !dbError.message.includes('duplicate')) {
        logAuthFailure(data.user.id, 'User record creation failed', { error: dbError });
      }

      logAuthSuccess(data.user.id, 'email_password', { action: 'registration' });
    }

    return new Response(
      JSON.stringify({
        message: 'Registration successful. Please check your email to verify your account.',
        email,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logAuthFailure(null, 'Unexpected error during registration', { error });
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

#### 3.3.2 Login Flow

**Sequence Diagram**:
```
User -> App: Enter email and password
App -> App: Validate input client-side
User -> App: Submit login
App -> Supabase: signInWithPassword({ email, password })
Supabase -> App: Session + User Info
App -> App: Check email confirmed
App -> DB: Fetch/create user record
App -> DB: Update last_seen_at
App -> User: Set session cookie, redirect to dashboard
```

**Implementation**: `src/pages/api/auth/login.ts`
```typescript
export const prerender = false;

import type { APIContext } from 'astro';
import { LoginSchema } from '@/lib/validation/auth.validation';
import { logAuthFailure, logAuthSuccess } from '@/lib/error-logger';

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  try {
    // Parse and validate request body
    const body = await context.request.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors.map((e) => ({
            field: e.path[0],
            message: e.message,
          })),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = validation.data;

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logAuthFailure(null, 'Login failed', { error, email });
      return new Response(
        JSON.stringify({
          error: 'invalid_credentials',
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({
          error: 'auth_failed',
          message: 'Authentication failed',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is confirmed
    if (!data.user.email_confirmed_at) {
      logAuthFailure(data.user.id, 'Email not confirmed', { email });
      return new Response(
        JSON.stringify({
          error: 'email_not_confirmed',
          message: 'Please verify your email address before signing in',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch or create user record
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      // User not in database yet, create record
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: data.user.email!.split('@')[0],
          is_admin: false,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        logAuthFailure(data.user.id, 'User record creation failed', { error: insertError });
        return new Response(
          JSON.stringify({
            error: 'server_error',
            message: 'Failed to create user record',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the newly created record
      const { data: newUserData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      userData = newUserData!;
    } else {
      // Update last_seen_at
      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    logAuthSuccess(data.user.id, 'email_password', { action: 'login' });

    return new Response(
      JSON.stringify({
        user: {
          id: userData.id,
          email: userData.email,
          display_name: userData.display_name,
          is_admin: userData.is_admin,
        },
        message: 'Login successful',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logAuthFailure(null, 'Unexpected error during login', { error });
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

#### 3.3.3 Password Recovery Flow

**Implementation**: `src/pages/api/auth/forgot-password.ts`
```typescript
export const prerender = false;

import type { APIContext } from 'astro';
import { ForgotPasswordSchema } from '@/lib/validation/auth.validation';

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  try {
    const body = await context.request.json();
    const validation = ForgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'validation_error',
          message: 'Invalid email format',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email } = validation.data;

    // Send password recovery email
    // Note: Supabase doesn't reveal if email exists (security)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${context.url.origin}/reset-password`,
    });

    // Always return success (don't reveal if email exists)
    return new Response(
      JSON.stringify({
        message: 'If an account exists with this email, you will receive a password reset link.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Implementation**: `src/pages/api/auth/reset-password.ts`
```typescript
export const prerender = false;

import type { APIContext } from 'astro';
import { ResetPasswordSchema } from '@/lib/validation/auth.validation';
import { logAuthSuccess } from '@/lib/error-logger';

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  try {
    const body = await context.request.json();
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { password } = validation.data;

    // Update password (must be called from authenticated session after token verification)
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: 'invalid_token',
          message: 'Reset link is invalid or has expired',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (data.user) {
      logAuthSuccess(data.user.id, 'email_password', { action: 'password_reset' });
    }

    return new Response(
      JSON.stringify({
        message: 'Password reset successful. You can now sign in with your new password.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

#### 3.3.4 Logout Flow

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

#### 3.3.5 Session Refresh

**Automatic Refresh** (handled by Supabase client):
- Supabase client auto-refreshes sessions using refresh tokens
- No manual implementation needed
- Refresh happens before expiration

### 3.4 Row Level Security (RLS) Policies

**Note**: RLS policies already exist in database schema. Authentication enables proper enforcement.

**Key Points**:
- RLS policies use `auth.uid()` function (Supabase built-in)
- Policies check `is_admin` flag from `users` table
- No need for manual context setting (Supabase handles it)

**Verification**: Existing RLS policies should work with email/password authentication without changes.

### 3.5 Admin Account Management

**PRD Requirement**: "Admin accounts assigned through database updates only" (US-00104)

#### 3.5.1 Admin Assignment Strategy

Admins are assigned by manually updating the `is_admin` flag in the database. No UI for admin assignment in MVP.

**Approach: Manual Database Update**

After a user registers and logs in, update their record to grant admin privileges:

```sql
-- Run this in Supabase SQL Editor
UPDATE users
SET is_admin = TRUE
WHERE email = 'admin@company.com';
```

**Alternative: Database Function**

Create a secure database function that only superadmins can call:

```sql
-- Migration: Create admin assignment function
CREATE OR REPLACE FUNCTION assign_admin(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET is_admin = TRUE
  WHERE email = user_email;
END;
$$;

-- Restrict access to function
REVOKE ALL ON FUNCTION assign_admin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_admin(TEXT) TO postgres;
```

**Usage**:
```sql
SELECT assign_admin('admin@company.com');
```

#### 3.5.2 Admin Assignment Checklist

- [ ] User must register and verify email first
- [ ] User must log in at least once
- [ ] Admin runs SQL to set `is_admin = TRUE`
- [ ] User logs out and back in to get updated permissions
- [ ] Verify admin routes are accessible
- [ ] Test admin-only features
- [ ] Document process for future admin assignments

### 3.6 Environment Variables

**Required Variables** (add to `.env`):
```env
# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Only for migrations/admin tasks
```

**Update**: `src/env.d.ts`
```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
}
```

---

## 4. PRD USER STORY VERIFICATION

This section verifies that each User Story from the PRD can be implemented with the authentication system described in this specification.

### 4.1 User Story Mapping

**US-001: User Authentication via email and password** ✅
- **Specification Coverage**:
  - Section 3.3.2: Email/password login flow implementation
  - Section 2.1.1: Authentication endpoints (`/api/auth/login`)
  - Section 3.1.1: Supabase email authentication setup
  - Section 1.5.2: Returning user login flow
- **Acceptance Criteria Mapping**:
  - Admin accounts seeded at deploy → ✅ Section 3.5 (Manual admin assignment)
  - Unauthorized users receive clear error message → ✅ Section 1.4.3 (Error Messages)

**US-00101: User registration via registration form** ✅
- **Specification Coverage**:
  - Section 3.3.1: Registration flow implementation
  - Section 2.1.1: `/api/auth/register` endpoint
  - Section 1.2.1: Register page and form
  - Section 1.5.1: First-time user registration flow
- **Acceptance Criteria Mapping**:
  - Registration forbids already registered emails → ✅ Email uniqueness check
  - Requires email and password → ✅ Validation schema enforces both
  - Password must be at least 8 characters → ✅ Client and server validation

**US-00102: User sign out via sign out button** ✅
- **Specification Coverage**:
  - Section 3.3.4: Logout flow implementation
  - Section 2.1.1: `/api/auth/logout` endpoint
  - Section 1.5.4: Logout user scenario
  - Section 1.3.1: UserMenu component with sign out
- **Acceptance Criteria Mapping**:
  - Sign out redirects to login page → ✅ Redirects to `/login?message=logged_out`
  - Sign out clears user session → ✅ Calls `supabase.auth.signOut()` and clears cookies

**US-00103: User password recovery** ✅
- **Specification Coverage**:
  - Section 3.3.3: Password recovery flow implementation
  - Section 2.1.1: `/api/auth/forgot-password` and `/api/auth/reset-password` endpoints
  - Section 1.2.1: Forgot password and reset password pages
  - Section 1.5.3: Password recovery user scenario
- **Acceptance Criteria Mapping**:
  - Requires email to be provided → ✅ Email validation in forgot password form
  - Provides one-time recovery link → ✅ Supabase sends token-based email link
  - New password overrides old → ✅ `updateUser({ password })` replaces password
  - One-time link invalidated once opened → ✅ Supabase automatically invalidates tokens

**US-00104: Administrative rights** ✅
- **Specification Coverage**:
  - Section 3.5: Admin account management
  - Section 2.2.1: User model with `is_admin` flag
  - Section 1.6.2: Admin route guards
- **Acceptance Criteria Mapping**:
  - Admin rights assigned only through database updates → ✅ Manual SQL update required

**US-002: View Badge Catalog (standard user)** ✅
- **Auth Requirements**: User must be authenticated to access catalog
- **Specification Coverage**:
  - Section 1.2.2: Modified existing pages with auth guards
  - Section 2.1.2: Modified API endpoints with authentication checks
  - Section 1.6.2: Route guards implementation pattern

**US-003: Admin Catalog Management** ✅
- **Auth Requirements**: User must be authenticated AND have `is_admin = true`
- **Specification Coverage**:
  - Section 1.6.2: Admin route guards
  - Section 3.2.2: `requireAdmin()` server-side helper function

**US-004-014: Other User Stories** ✅
- All other user stories follow the same authentication patterns
- Protected endpoints check authentication
- Admin endpoints check `is_admin` flag
- User ownership verified by comparing IDs

### 4.2 Authentication Coverage Summary

| Functional Requirement | Auth Spec Coverage | Notes |
|------------------------|-------------------|--------|
| FR-001: Authentication | Sections 1-3 | Complete email/password implementation |
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

### 4.3 Identified Changes from Previous Specification

#### Change 1: Authentication Method
**Previous**: Google OAuth SSO with domain restriction
**Current**: Email/password authentication with email verification
**Impact**:
- More user stories to implement (registration, password recovery)
- Simpler setup (no OAuth provider configuration)
- Email verification adds complexity
- No domain restriction needed

#### Change 2: Admin Seeding
**Previous**: Auto-elevation via database trigger or environment variable
**Current**: Manual database update only (per US-00104)
**Impact**:
- Simpler implementation
- More manual process
- Requires documentation for operations team

#### Change 3: Session Management
**Previous**: OAuth tokens and sessions
**Current**: Email/password sessions with Supabase Auth
**Impact**:
- No changes to session management logic
- Same Supabase Auth infrastructure
- Same cookie-based session storage

---

## 5. INTEGRATION CHECKLIST

### 5.1 New Files to Create

#### Auth Pages
- [ ] `src/pages/login.astro` - Login page
- [ ] `src/pages/register.astro` - Registration page
- [ ] `src/pages/verify-email.astro` - Email verification instructions
- [ ] `src/pages/forgot-password.astro` - Password recovery initiation
- [ ] `src/pages/reset-password.astro` - Password reset with token
- [ ] `src/pages/logout.astro` - Logout endpoint
- [ ] `src/pages/unauthorized.astro` - Unauthorized access page

#### Auth API Endpoints
- [ ] `src/pages/api/auth/register.ts` - User registration
- [ ] `src/pages/api/auth/login.ts` - User login
- [ ] `src/pages/api/auth/logout.ts` - User logout
- [ ] `src/pages/api/auth/forgot-password.ts` - Password recovery initiation
- [ ] `src/pages/api/auth/reset-password.ts` - Password reset with token
- [ ] `src/pages/api/auth/resend-verification.ts` - Resend verification email
- [ ] `src/pages/api/auth/session.ts` - Session info endpoint
- [ ] `src/pages/api/me.ts` - Current user endpoint

#### Auth Components
- [ ] `src/components/auth/LoginView.tsx` - Login interface
- [ ] `src/components/auth/RegisterView.tsx` - Registration interface
- [ ] `src/components/auth/ForgotPasswordView.tsx` - Forgot password interface
- [ ] `src/components/auth/ResetPasswordView.tsx` - Reset password interface
- [ ] `src/components/auth/VerifyEmailView.tsx` - Email verification instructions
- [ ] `src/components/auth/EmailPasswordForm.tsx` - Email/password inputs
- [ ] `src/components/auth/PasswordStrengthIndicator.tsx` - Password strength meter
- [ ] `src/components/auth/AuthErrorAlert.tsx` - Error display
- [ ] `src/components/auth/AuthSuccessAlert.tsx` - Success message display
- [ ] `src/components/navigation/UserMenu.tsx` - User dropdown

#### Auth Logic
- [ ] `src/lib/auth/server-auth.ts` - Server-side helpers
- [ ] `src/lib/validation/auth.validation.ts` - Zod schemas
- [ ] `src/lib/errors/auth.errors.ts` - Custom error classes
- [ ] `src/hooks/useUser.ts` - React auth hook (update existing)

### 5.2 Files to Modify

#### Configuration
- [ ] `src/db/supabase.client.ts` - Use anon key, enable auth options with PKCE
- [ ] `src/middleware/index.ts` - Add session refresh middleware
- [ ] `src/env.d.ts` - Update environment variables

#### Database Migration
- [ ] Create migration to remove `google_sub` column from `users` table

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
- [ ] Enable Email authentication provider
- [ ] Configure email templates (confirmation, password reset)
- [ ] Set session duration (3600s)
- [ ] Enable refresh token rotation
- [ ] Set email confirmation required
- [ ] Set minimum password length (8)

#### Environment Variables
- [ ] Update `.env` with Supabase credentials
- [ ] Document all env vars in `.env.example`
- [ ] Update deployment configurations

### 5.4 Testing Requirements

#### Manual Testing
- [ ] User registration with valid email
- [ ] User registration with duplicate email (error)
- [ ] Email verification link click
- [ ] Login with verified account
- [ ] Login with unverified account (error)
- [ ] Login with invalid credentials (error)
- [ ] Password recovery initiation
- [ ] Password reset with valid token
- [ ] Password reset with expired token (error)
- [ ] Session expiration handling
- [ ] Logout flow
- [ ] Admin vs. standard user permissions
- [ ] Redirect after login to intended destination

#### Automated Testing (Optional for MVP)
- [ ] Unit tests for validation schemas
- [ ] Integration tests for auth endpoints
- [ ] E2E tests for complete auth flows

### 5.5 Documentation

- [ ] Update README with authentication setup instructions
- [ ] Document email template configuration
- [ ] Update API documentation with auth requirements
- [ ] Create admin assignment guide
- [ ] Document troubleshooting steps for common auth issues
- [ ] Update `.ai/auth-disabled-notice.md` to reflect new implementation

---

## 6. SECURITY CONSIDERATIONS

### 6.1 Password Security

**Password Policy**:
- Minimum 8 characters (configurable in Supabase)
- Client-side strength indicator (UX)
- No maximum length restriction
- Server-side validation enforced

**Best Practices**:
- Passwords never logged or stored in plaintext
- Supabase handles bcrypt hashing automatically
- Password reset tokens are one-time use
- Tokens expire after 1 hour (configurable)

### 6.2 Email Verification

**Security Benefits**:
- Prevents account creation with fake emails
- Confirms user owns the email address
- Required before login (configurable)

**Implementation**:
- Supabase sends verification email on signup
- Link contains secure token
- Token expires after 24 hours (default)
- User can request new verification email

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

### 6.4 Rate Limiting

**Supabase Built-in Limits**:
- Password reset: 60 seconds between requests
- Login attempts: Configurable in dashboard
- Registration: Configurable in dashboard

**Future Enhancements**:
- Custom rate limiting per IP
- Account lockout after N failed attempts
- CAPTCHA on repeated failures

### 6.5 Token Security

**Password Reset Tokens**:
- Cryptographically secure random tokens
- One-time use (invalidated after reset)
- Expire after 1 hour
- Sent only to registered email

**Session Tokens**:
- JWT tokens with signature verification
- HttpOnly cookies prevent XSS
- SameSite cookies prevent CSRF
- Refresh token rotation enabled

### 6.6 Audit Logging

**Log Events**:
- Successful registrations
- Successful logins
- Failed login attempts
- Password reset requests
- Password resets completed
- Session expirations
- Logout events

**Log Storage**:
- Store in `audit_logs` table
- Include timestamp, user ID, IP address, user agent
- Retain for compliance requirements

---

## 7. DEPLOYMENT CONSIDERATIONS

### 7.1 Pre-Production Checklist

- [ ] Remove all `TODO` comments for authentication
- [ ] Ensure anon key is used (not service role)
- [ ] Enable Row Level Security enforcement
- [ ] Test with real email addresses
- [ ] Configure production Supabase project
- [ ] Set up email service (SMTP or provider)
- [ ] Configure email templates with branding
- [ ] Set up monitoring and alerts
- [ ] Document admin assignment process

### 7.2 Production Configuration

**Environment**:
- [ ] Set production Supabase URL and keys
- [ ] Configure production email sender
- [ ] Enable HTTPS enforcement
- [ ] Set secure cookie flags
- [ ] Configure CORS for production domain

**Email Service**:
- [ ] Set up SMTP provider (SendGrid, AWS SES, etc.)
- [ ] Configure SPF, DKIM, DMARC records
- [ ] Test email deliverability
- [ ] Set up email bounce handling

**Monitoring**:
- [ ] Monitor auth failure rate
- [ ] Alert on unusual login patterns
- [ ] Track registration rate
- [ ] Monitor email delivery failures
- [ ] Track session duration metrics

### 7.3 Rollback Plan

**If Issues Arise**:
1. Disable new registrations in Supabase dashboard
2. Add maintenance notice on login page
3. Debug in staging environment
4. Deploy fix with thorough testing
5. Re-enable registrations
6. Notify affected users if needed

---

## 8. FUTURE ENHANCEMENTS (Out of Scope for MVP)

### 8.1 Additional Auth Features

- **Social Login**: Google, GitHub, etc. (OAuth providers)
- **Magic Links**: Passwordless email authentication
- **Multi-Factor Authentication**: TOTP or SMS-based 2FA
- **SSO Integration**: SAML for enterprise customers
- **Biometric Auth**: Face ID, fingerprint on mobile

### 8.2 Advanced Features

- **Session Management Dashboard**: View/revoke active sessions
- **Login History**: Track login events per user
- **Account Recovery**: Alternative recovery methods
- **Password Expiration**: Force password change after N days
- **Account Lockout**: After N failed login attempts
- **Login Notifications**: Email on new device login

### 8.3 User Profile Management

- **Profile Settings Page**: Edit display name, avatar
- **Email Change**: With verification for new email
- **Password Change**: In-app password update
- **Account Deletion**: GDPR-compliant self-service deletion
- **Data Export**: Download user data

---

## 9. APPENDIX

### 9.1 Error Code Reference

| Code | HTTP Status | User Message | Action |
|------|-------------|--------------|--------|
| `invalid_credentials` | 401 | Invalid email or password | Retry login |
| `email_already_exists` | 409 | Email already registered | Sign in instead |
| `weak_password` | 400 | Password too weak | Choose stronger password |
| `passwords_dont_match` | 400 | Passwords don't match | Re-enter passwords |
| `email_not_confirmed` | 403 | Email not verified | Check email for link |
| `invalid_token` | 401 | Link invalid/expired | Request new link |
| `session_expired` | 401 | Session expired | Redirect to login |
| `user_not_found` | 401 | User not found | Contact support |
| `server_error` | 500 | Unexpected error | Retry later |

### 9.2 User Flow Diagrams

**Registration Flow**:
```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐
│ User │────▶│ Register │────▶│ Supabase │────▶│ Email  │────▶│ Verified │
└──────┘     └──────────┘     └──────────┘     └────────┘     └──────────┘
   │             │                  │                │              │
   │   Fill      │  Create          │  Send         │  Click       │  Login
   │   Form      │  Account         │  Link         │  Link        │  Enabled
```

**Login Flow**:
```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
│ User │────▶│ Login   │────▶│ Validate │────▶│ Session  │────▶│  /   │
└──────┘     └─────────┘     └──────────┘     └──────────┘     └──────┘
   │             │                 │                │              │
   │   Enter     │  Submit         │  Check         │  Create      │  Auth
   │   Creds     │  Form           │  Password      │  Cookie      │  Success
```

**Password Recovery**:
```
┌──────┐     ┌────────────┐     ┌────────┐     ┌───────────┐     ┌─────────┐
│ User │────▶│ Forgot PW  │────▶│ Email  │────▶│ Reset PW  │────▶│ Login   │
└──────┘     └────────────┘     └────────┘     └───────────┘     └─────────┘
   │             │                   │               │                │
   │   Request   │  Send             │  Click        │  Set New       │  Sign In
   │   Reset     │  Link             │  Link         │  Password      │  Success
```

### 9.3 Type Definitions

**New Types** (`src/types.ts` additions):
```typescript
// Auth-related types

export interface AuthSession {
  user: UserDto;
  expiresAt: string;
}

export interface RegistrationRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface LoginError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  warning: string | null;
}
```

### 9.4 Sample Requests/Responses

**Registration**:
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response 201:
{
  "message": "Registration successful. Please check your email to verify your account.",
  "email": "user@example.com"
}
```

**Login**:
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "is_admin": false
  },
  "message": "Login successful"
}
```

**Forgot Password**:
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "message": "If an account exists with this email, you will receive a password reset link."
}
```

**Reset Password**:
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "recovery_token_from_email",
  "password": "NewSecurePassword123"
}

Response 200:
{
  "message": "Password reset successful. You can now sign in with your new password."
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
