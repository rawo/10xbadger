# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Badger is an MVP web application that replaces legacy Excel and Confluence-based badge tracking with a unified system for cataloging badges, submitting badge applications, and building promotion submissions. The application serves engineers and administrators with features for catalog browsing, badge applications, administrative review, promotion building, and Google Workspace SSO authentication.

See the full Product Requirements Document at `/.ai/prd.md`.

## Tech Stack

- **Frontend:** Astro 5 (SSR mode), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend:** Supabase (PostgreSQL, auth, SDKs)
- **Package Manager:** pnpm (v10.17.0+)
- **Node Version:** 22.14.0 (see `.nvmrc`)
- **Tooling:** ESLint, Prettier, Husky, lint-staged

## Development Commands

### Essential Commands

```bash
# Development server (runs on port 3000)
pnpm dev

# Production build
pnpm build

# Preview production build locally
pnpm preview

# Linting
pnpm lint          # Check for errors
pnpm lint:fix      # Auto-fix errors

# Formatting
pnpm format        # Format all files with Prettier
```

### Supabase Database Commands

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Stop local Supabase
npx supabase stop

# Apply migrations
npx supabase db push

# Reset local database
npx supabase db reset

# Generate TypeScript types from database
npx supabase gen types typescript --local > src/db/supabase.types.ts
```

### Testing & Development

```bash
# Run single test (no test framework configured yet)
# TODO: Add test framework configuration

# Run Astro CLI directly
pnpm astro --help
```

## Architecture & Code Organization

### Directory Structure

```
src/
├── components/          # UI components
│   └── ui/             # shadcn/ui components
├── layouts/            # Astro layouts
├── pages/              # Astro pages (file-based routing)
│   └── api/           # API endpoints
├── middleware/         # Astro middleware (index.ts)
├── db/                # Supabase clients and types
├── lib/               # Services and helpers
├── types.ts           # Shared types (Entities, DTOs)
├── assets/            # Static internal assets
└── styles/            # Global styles

public/                # Public static assets

supabase/
└── migrations/        # Database migration files
```

### Important Patterns

**Path Aliases**: Use `@/*` to import from `src/` (configured in `tsconfig.json`)

```typescript
import { Button } from "@/components/ui/button";
```

**Supabase Client Access**: In Astro routes, always use `context.locals.supabase` instead of importing `supabaseClient` directly. Import `SupabaseClient` type from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`.

**Component Strategy**:
- Use `.astro` components for static content and layouts
- Use React (`.tsx`) components only when interactivity is needed
- Client-side components get `client:load` or similar directives

**Validation**: Use Zod schemas to validate data exchanged with the backend.

**Error Handling**:
- Handle errors at the beginning of functions using early returns
- Avoid deeply nested if statements
- Use guard clauses for preconditions
- Place happy path last in functions

### Database Migrations

**Naming Convention**: Migration files must follow this pattern:
```
YYYYMMDDHHmmss_short_description.sql
```
Example: `20251019090000_create_initial_schema.sql`

**Migration Guidelines**:
- Write all SQL in lowercase
- Enable Row Level Security (RLS) on all tables
- Create granular RLS policies (one per operation: select, insert, update, delete)
- Create separate policies for `anon` and `authenticated` roles
- Add copious comments for destructive operations
- Include migration metadata in header comments

### Data Models

The application uses UUIDs for all primary IDs. Core entities:

- **User**: `{ id, email, display_name, is_admin, google_sub }`
- **CatalogBadge**: `{ id, title, description, category, available_levels, status }`
  - Categories: technical, organizational, softskilled
  - Levels: gold, silver, bronze
  - Status: active, inactive
- **BadgeApplication**: `{ id, catalog_badge_id, selected_level, applicant_id, status, reason }`
  - Status: draft, submitted, accepted, rejected, used_in_promotion
- **PromotionTemplate**: `{ id, path, position_level, required_badges }`
  - Paths: technical, financial, management
- **Promotion**: `{ id, applicant_id, path, target_level, badge_application_ids, status }`

### Authentication & Authorization

- Google Workspace SSO (OIDC/SAML) restricted to company domain
- Two roles: `administrator` and `standard user (engineer)`
- Admins have all standard user capabilities plus admin functions
- All endpoints validate user domain and role

### Key Business Rules

1. **Badge Reservations**: Use optimistic reservation with DB uniqueness constraints to prevent double-use
2. **Promotion Validation**: Exact-match template requirements, no level equivalence (gold ≠ silver)
3. **Level Progression**: Promotions target immediate next level only
4. **Catalog Versioning**: Badge applications store `catalog_badge_version` for historical integrity
5. **Concurrency**: Return HTTP 409 on reservation conflicts with structured error containing `owningPromotionId`

## Configuration Files

- **astro.config.mjs**: Astro configuration (server mode, React integration, Node adapter)
- **tsconfig.json**: TypeScript configuration with strict mode and path aliases
- **eslint.config.js**: ESLint with TypeScript, React, Astro, and accessibility rules
- **.prettierrc.json**: Prettier formatting configuration
- **components.json**: shadcn/ui component configuration
- **supabase/config.toml**: Supabase local development configuration

## Environment Variables

Required environment variables (see `.env.example`):

```
SUPABASE_URL=###
SUPABASE_KEY=###
OPENROUTER_API_KEY=###  # Optional, for AI features
```

## Code Style & Standards

### Styling with Tailwind

- Use `@layer` directive for organizing styles
- Use arbitrary values with square brackets for one-off designs: `w-[123px]`
- Implement dark mode with `dark:` variant
- Use responsive variants: `sm:`, `md:`, `lg:`, etc.
- Use state variants: `hover:`, `focus-visible:`, `active:`, etc.

### Accessibility

- Use ARIA landmarks to identify page regions
- Apply appropriate ARIA roles to custom elements
- Set `aria-expanded` and `aria-controls` for expandable content
- Use `aria-live` regions for dynamic content updates
- Apply `aria-label` or `aria-labelledby` for elements without visible labels
- Avoid redundant ARIA that duplicates native HTML semantics

### Linting & Formatting

- Pre-commit hooks run ESLint and Prettier via husky and lint-staged
- TypeScript files use strict mode
- React Compiler plugin enforces React best practices
- No console statements in production (eslint warns on `console`)

## MVP Scope

### In Scope
- Google Workspace SSO with domain restriction
- Badge catalog CRUD (admin) and search/filter (all users)
- Badge application drafting, submission, and admin review
- Promotion templates with validation
- Promotion builder with reservation handling
- Optimistic concurrency control
- Basic logging for auth failures and conflicts

### Out of Scope
- Mobile application
- File attachments
- Email/in-app notifications
- Detailed audit logs
- Bulk approvals
- Social features (comments, likes)
- Automatic Excel/Confluence import
- Fine-grained admin roles
