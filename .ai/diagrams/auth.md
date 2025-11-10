# Authentication Architecture Diagram

## Overview

This diagram presents the complete authentication flow in the 10xbadger application, utilizing Google Workspace SSO through Supabase Auth and Astro.

## Main Flows

1. **Login (First Time)** - Complete OAuth flow with Google, domain validation, user creation
2. **Protected Page Rendering** - Fetching user data and rendering with authentication context
3. **Subsequent Requests with Session** - Session validation, automatic token refresh
4. **Session Expiration** - Expired session detection and redirect to login
5. **Logout** - Session termination and cookie cleanup

## Actors

- **Browser** - Client application (React + Astro)
- **Astro Middleware** - Intermediate layer checking session
- **Astro Page** - Server-side rendered pages
- **Astro API** - Authentication endpoints
- **Supabase Auth** - Session management and OAuth
- **Google OAuth** - External identity provider
- **Database** - PostgreSQL (Supabase)

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant M as Astro Middleware
    participant P as Astro Page
    participant A as Astro API
    participant SA as Supabase Auth
    participant G as Google OAuth
    participant DB as Database

    Note over B,DB: LOGIN FLOW (First Time)

    activate B
    B->>M: Request protected page
    activate M
    M->>SA: Check session
    activate SA
    SA-->>M: No session
    deactivate SA
    M-->>B: Redirect to /login
    deactivate M
    deactivate B

    activate B
    B->>P: GET /login
    activate P
    P-->>B: Display login page
    deactivate P
    B->>A: Click: Sign in with Google
    deactivate B

    activate A
    A->>A: Save redirect URL in cookie
    A->>SA: signInWithOAuth(provider: google)
    activate SA
    SA-->>A: Google authorization URL
    deactivate SA
    A-->>B: Redirect 302 to Google
    deactivate A

    activate B
    B->>G: Open OAuth consent screen
    activate G
    G-->>B: Display login form
    deactivate G
    B->>G: Authenticate and approve
    activate G
    G-->>B: Redirect to /auth/callback?code=xxx
    deactivate G
    deactivate B

    activate B
    B->>A: GET /auth/callback?code=xxx
    activate A
    A->>SA: exchangeCodeForSession(code)
    activate SA
    SA->>SA: Validate authorization code
    SA-->>A: Session + user data
    deactivate SA

    alt Unauthorized email domain
        A->>SA: signOut()
        activate SA
        SA-->>A: Session terminated
        deactivate SA
        A-->>B: Redirect to /unauthorized
        Note over B,A: Login failed:<br/>Invalid domain
    else Valid domain
        A->>DB: UPSERT user
        activate DB
        DB->>DB: Check if email on admin list
        DB-->>A: User saved
        deactivate DB
        
        A->>A: Set session cookie (httpOnly)
        A->>A: Get redirect URL from cookie
        A-->>B: Redirect 302 to target page
    end
    deactivate A
    deactivate B

    Note over B,DB: PROTECTED PAGE RENDERING

    activate B
    B->>P: GET /dashboard
    activate P
    P->>SA: getUser()
    activate SA
    SA-->>P: User data
    deactivate SA
    
    P->>DB: SELECT user WHERE id = user.id
    activate DB
    DB-->>P: User data + is_admin
    deactivate DB
    
    P->>P: Render page with user data
    P-->>B: HTML + user props
    deactivate P
    deactivate B

    Note over B,DB: SUBSEQUENT REQUESTS WITH SESSION

    activate B
    B->>M: API request /api/badge-applications
    activate M
    M->>SA: getSession()
    activate SA
    
    alt Session expiring soon
        SA->>SA: refreshSession() automatically
        SA-->>M: Refreshed session
    else Session valid
        SA-->>M: Current session
    end
    deactivate SA
    
    M->>DB: UPDATE users SET last_seen_at
    activate DB
    DB-->>M: Updated
    deactivate DB
    
    M->>A: Forward request
    deactivate M
    
    activate A
    A->>SA: getUser()
    activate SA
    SA-->>A: User data
    deactivate SA
    
    A->>DB: Fetch data
    activate DB
    DB-->>A: Query result
    deactivate DB
    
    A-->>B: JSON response 200
    deactivate A
    deactivate B

    Note over B,DB: SESSION EXPIRATION

    activate B
    B->>M: Request after session expired
    activate M
    M->>SA: getSession()
    activate SA
    SA-->>M: Session expired / null
    deactivate SA
    M-->>B: Redirect to /login?error=session_expired
    deactivate M
    B->>P: GET /login?error=session_expired
    activate P
    P-->>B: Display message: Session expired
    deactivate P
    deactivate B

    Note over B,DB: LOGOUT

    activate B
    B->>B: Click: Sign out
    B->>A: GET /logout
    activate A
    A->>SA: signOut()
    activate SA
    SA->>SA: Remove session from Supabase DB
    SA-->>A: Session terminated
    deactivate SA
    A->>A: Clear cookies
    A-->>B: Redirect to /login?message=logged_out
    deactivate A
    B->>P: GET /login?message=logged_out
    activate P
    P-->>B: Message: Successfully logged out
    deactivate P
    deactivate B
```

## Key Security Mechanisms

1. **Domain Validation** - Email verification before session creation
2. **httpOnly Cookies** - Session token inaccessible to JavaScript
3. **Automatic Refresh** - Token refreshed before expiration
4. **Middleware** - Every request validates session
5. **CSRF Protection** - State parameter in OAuth (managed by Supabase)

## Authentication Endpoints

- `GET /api/auth/google` - OAuth flow initiation
- `GET /api/auth/callback` - Google callback handler
- `GET /logout` - Session termination
- `GET /api/auth/session` - Session information retrieval
- `GET /api/me` - User profile retrieval

## References

- **PRD**: `/.ai/prd.md` - Product requirements (FR-001, US-001)
- **Auth Specification**: `/.ai/auth-spec.md` - Detailed authentication architecture
- **DB Migration**: `/supabase/migrations/20251019090000_create_initial_schema.sql` - Database schema

---

**Last Updated**: 2025-11-10  
**Status**: Technical Specification


