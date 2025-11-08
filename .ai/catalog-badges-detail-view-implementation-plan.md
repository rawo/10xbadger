# View Implementation Plan: Catalog Detail

## 1. Overview

The Catalog Detail view displays a single catalog badge with all metadata, requirements, example evidence, and admin actions (edit, deactivate). It supports read-only browsing for engineers and additional controls for admins (deactivate/edit). The view consumes the backend endpoint `GET /api/catalog-badges/:id` to render authoritative badge details.

## 2. View Routing

- Path: `/catalog/:id` (client route that maps to an Astro page `src/pages/catalog/[id].astro` which mounts the React client component)
- API endpoint used: `GET /api/catalog-badges/:id`

Notes:
- Follow existing project routing conventions: catalog list exists at `/catalog` so detail should be `/catalog/:id`.
- The page should support direct navigation (SSR/static Astro page that fetches server-side or client fetch depending on auth). Prefer client-side fetch for unified UX and reuse of hooks.

## 3. Component Structure

- `CatalogBadgeDetailPage` (Astro page wrapper)
  - mounts `CatalogBadgeDetail` (client React; main container)
  - provides page-level layout (`src/layouts/Layout.astro` usage)

- `CatalogBadgeDetail` (client React; top-level view)
  - `DetailHeader` (title, level, status badge, breadcrumbs/back)
  - `BadgeMain` (left column)
    - `BadgeOverviewCard` (key fields: title, short description, icon)
    - `BadgeMetadata` (category, position levels, created/updated, tags)
    - `BadgeRequirementsList` (requirements, mapping to evidence examples)
  - `BadgeActions` (right column; Edit, Deactivate button / suggestion to apply)
  - `RelatedBadges` (list of other catalog badges or similar)
  - `LoadingSkeleton` (while fetching)
  - `ErrorState` (if fetch fails)

## 4. Component Details

### CatalogBadgeDetailPage (Astro wrapper)
- Component description: Astro page at `src/pages/catalog/[id].astro`. Wraps layout and client components; reads `params.id` and passes to `CatalogBadgeDetail`.
- Main elements: page layout, SEO title, client mount point for `CatalogBadgeDetail`.
- Handled interactions: none (just passes params).
- Validation: ensures `id` param exists; if missing navigate back to `/catalog`.
- Types: `string id` prop passed to client component.
- Props: `{ id: string }`

### CatalogBadgeDetail (React)
- Component description: Fetches badge DTO by id, holds view-level state (loading, error, badge data) and renders subcomponents.
- Main elements:
  - container grid with two columns (main content + actions)
  - child components: `DetailHeader`, `BadgeOverviewCard`, `BadgeMetadata`, `BadgeRequirementsList`, `BadgeActions`, `RelatedBadges`
- Handled events:
  - onClick Edit → navigate to edit modal/page
  - onClick Deactivate → open `ConfirmDeactivateModal`
  - onClick Apply / Start Application → open application flow or route to `/apply/new?badgeId=:id`
- Validation:
  - Validates presence of required DTO fields (id, title, description, requirements array)
  - Validates `active` boolean to conditionally render Deactivate vs Reactivate states
- Types:
  - Props: `{ id: string }`
  - State uses `CatalogBadgeViewModel` (see Types)

### DetailHeader
- Component description: Displays breadcrumb/back link, badge title, status chip (Active/Inactive), and primary CTA (Apply).
- Main elements: back button, title h1, status pill, Apply button
- Handled events: Back click, Apply click
- Validation: disables Apply if `badge.active === false`
- Types: accepts `title: string`, `active: boolean`, `id: string`
- Props: `{ title, active, id, onApply?: () => void }`

### BadgeOverviewCard
- Component description: Visual card showing badge icon, short description, example evidence highlights.
- Main elements: icon/avatar, tagline, short description, evidence list (1-3 examples)
- Handled events: none except optional expand
- Validation: render fallback content if icon or examples missing
- Types: accepts `shortDescription: string`, `iconUrl?: string`, `examples?: string[]`
- Props: `{ shortDescription, iconUrl?, examples? }`

### BadgeMetadata
- Component description: Render structured badge metadata (category, level, position levels, tags, created/updated).
- Main elements: list or table rows of metadata
- Handled events: click on position level tag may open position-level details (optional)
- Validation: render placeholders for missing fields
- Types: `{ category?: string, positionLevels?: string[], tags?: string[], createdAt?: string, updatedAt?: string }`
- Props: corresponding fields

### BadgeRequirementsList
- Component description: Lists requirement items (each with title, description, required evidence type)
- Main elements: ordered list of requirements, each requirement may show examples
- Handled events:
  - Click requirement → expand details (toggle)
  - Click evidence example → copy/link or open modal
- Validation:
  - Ensure the requirements array exists and each item contains an id and description
  - If requirements are empty, show "No explicit requirements" message
- Types:
  - `RequirementViewModel` items: `{ id: string; title?: string; description: string; required?: boolean; examples?: string[] }`
- Props: `requirements: RequirementViewModel[]`

### BadgeActions
- Component description: Action buttons for the user (Apply) and admin controls (Edit, Deactivate). Shows contextual tooltips and toasts for success/failure.
- Main elements: `Apply` (primary), `Edit` (secondary), `Deactivate` (danger)
- Handled events:
  - Apply → route to application flow (preserve badgeId)
  - Edit → open edit modal/page
  - Deactivate → open `ConfirmDeactivateModal`; on confirm call `POST /api/catalog-badges/:id/deactivate` or relevant endpoint (there's an existing `deactivate.ts`)
- Validation:
  - `Deactivate` only visible to admin role
  - `Apply` disabled if badge inactive
- Types: receives badge id and `active` and user role
- Props: `{ id: string; active: boolean; onApply: () => void; onEdit: () => void; onDeactivate: () => void; isAdmin: boolean }`

### ConfirmDeactivateModal (re-use existing modal components)
- Component description: Confirmation dialog for deactivation
- Main elements: reason textarea (optional), Confirm button, Cancel button
- Handled events: Confirm → calls the deactivate API; Cancel → closes modal
- Validation: require confirm click; optional reason length limit (e.g., 500 chars)
- Props: `{ id: string; onClose: () => void; onDeactivated: (result) => void }`

### RelatedBadges
- Component description: Small list of similar or recommended badges (optional fetch)
- Main elements: horizontal list of `BadgeCard` components
- Handled events: click badge → navigate to its detail
- Validation: hide if no related badges
- Props: `{ related: CatalogBadgeDto[] }`

### LoadingSkeleton and ErrorState
- Re-use `ui/skeleton.tsx` and `EmptyState` patterns for consistent UX.
- LoadingSkeleton shown while fetching; ErrorState shows friendly message and retry button.

## 5. Types

Note: The project already contains shared types. For the view we will reference `CatalogBadgeDto` (existing) and create `CatalogBadgeViewModel` and `RequirementViewModel` for UI use.

### Existing (reference)
- `CatalogBadgeDto` (expected fields from backend):
  - `id: string`
  - `title: string`
  - `description: string`
  - `short_description?: string`
  - `icon_url?: string`
  - `category?: string`
  - `position_levels?: string[]`
  - `tags?: string[]`
  - `requirements?: Array<{ id: string; title?: string; description: string; required?: boolean; examples?: string[] }>`
  - `active: boolean`
  - `created_at?: string`
  - `updated_at?: string`

### New ViewModel types
- `CatalogBadgeViewModel`
  - `id: string`
  - `title: string`
  - `description: string`
  - `shortDescription?: string`
  - `iconUrl?: string`
  - `category?: string`
  - `positionLevels: string[]`
  - `tags: string[]`
  - `requirements: RequirementViewModel[]`
  - `active: boolean`
  - `createdAt?: string`
  - `updatedAt?: string`

- `RequirementViewModel`
  - `id: string`
  - `title?: string`
  - `description: string`
  - `required: boolean` (default true)
  - `examples: string[]`

Conversion: `CatalogBadgeViewModel` is a thin adapter created by the data-fetching hook from `CatalogBadgeDto`. Map snake_case or database fields to camelCase for React consumption.

## 6. State Management

- Use a custom hook `useCatalogBadge(id: string)` to encapsulate fetch logic, state (loading, error, data), and actions (refresh, deactivate).
  - Returns: `{ badge?: CatalogBadgeViewModel; loading: boolean; error?: Error; refresh: () => void; deactivate: (reason?: string) => Promise<void> }`
  - Hook handles API calls, error mapping, optimistic UI updates for deactivate (optional).

- Local component state inside `CatalogBadgeDetail`:
  - `isConfirmDeactivateOpen: boolean`
  - `deactivateLoading: boolean`
  - `expandedRequirementId?: string`
  - `relatedBadges?: CatalogBadgeViewModel[]` (optional)

- Global state: none required. Use router navigation + toasts for feedback. If application uses a global toast store (existing `ui/toaster.tsx`), use it.

## 7. API Integration

- Endpoint: GET /api/catalog-badges/:id
  - Request: GET, path param `id`
  - Response (200): `{ badge: CatalogBadgeDto }` OR `CatalogBadgeDto` (determine by inspecting existing endpoints; component should accept both shapes via the hook)
  - Error: 404 if not found, 401/403 if auth required

- Endpoint: POST /api/catalog-badges/:id/deactivate (or existing `/deactivate.ts`)
  - Request: `{ reason?: string }` (JSON)
  - Response (200): updated `CatalogBadgeDto` or `{ success: true }`

Frontend actions:
- `useCatalogBadge` performs GET on mount and on `refresh`.
- `deactivate` action calls POST deactivate, sets loading, then calls `refresh` or updates the local view model to `active: false`.

Request/Response Types (example TypeScript)

```ts
type GetCatalogBadgeResponse = { badge: CatalogBadgeDto } | CatalogBadgeDto;
type DeactivateRequest = { reason?: string };
type DeactivateResponse = { success: boolean } | { badge: CatalogBadgeDto };
```

## 8. User Interactions

- View loads: show `LoadingSkeleton` until fetch resolves.
- Successful fetch: render `CatalogBadgeDetail`.
- Apply click: navigate to `/apply/new?badgeId=:id`. If user not authenticated, redirect to SSO/login.
- Edit click: navigate to edit page/modal (admin only).
- Deactivate click (admin): open `ConfirmDeactivateModal`. Confirm triggers API; on success show toast and update UI (status pill to Inactive and disable Apply).
- Click requirement → toggles expanded description and shows examples.
- Click related badge → navigate to that badge detail.
- Error state: show error message, retry button runs `refresh`.

## 9. Conditions and Validation

- Component-level verification:
  - Presence of `id` param: redirect or show 400/NotFound UI if missing.
  - Required fields: `id`, `title`, `description`, `active`. If server returns a badge missing required fields, show ErrorState and log with `error-logger.ts`.
  - `requirements` elements: each must have `id` and `description`. If not present, show fallback text.
  - Admin-only actions require role check: use existing auth middleware/custom hook (e.g., `useUser()` or middleware-provided session).

- UX behavior based on `active`:
  - If `active === false`:
    - Show status pill "Inactive"
    - Disable Apply CTA (with tooltip "Badge is inactive")
    - Show Reactivate action for admins if available

## 10. Error Handling

- Network errors:
  - Show `ErrorState` with retry button that calls `refresh`.
  - Use `error-logger.ts` to surface error details for server-side logging.

- 404 (Badge not found):
  - Show friendly "Badge not found" message and an action to return to `/catalog`.

- 403/401:
  - If user must be logged in for certain actions (Apply, Edit), show auth prompt or route to SSO.

- Deactivate failure:
  - Show toast error with message from API; keep modal open to let admin retry.
  - Revert any optimistic updates if used.

## 11. Implementation Steps

1. Create `src/pages/catalog/[id].astro` as page wrapper which reads `params.id` and includes layout and client mount.
2. Add `src/components/catalog-badges/CatalogBadgeDetail.tsx` (React client): the top-level view component.
3. Add subcomponents inside `src/components/catalog-badges/`:
   - `DetailHeader.tsx`
   - `BadgeOverviewCard.tsx`
   - `BadgeMetadata.tsx`
   - `BadgeRequirementsList.tsx`
   - `BadgeActions.tsx`
   - `RelatedBadges.tsx`
   - `ConfirmDeactivateModal.tsx` (or reuse existing dialog)
4. Implement `src/hooks/useCatalogBadge.ts` hook:
   - Encapsulate GET, deactivate action, loading/error state, data mapping to `CatalogBadgeViewModel`
5. Wire up styling using Tailwind classes consistent with Shadcn/ui components and existing project CSS (`src/styles/global.css`).
6. Implement API integration:
   - Use `fetch` or existing HTTP client abstraction; set correct headers; handle JSON parsing.
7. Add unit tests for:
   - Hook (`useCatalogBadge`) to ensure correct fetch and deactivate flows (mock API).
   - `BadgeRequirementsList` behavior (expand/collapse).
8. Add stories / visual tests if project uses Storybook or similar (optional).
9. Review accessibility:
   - Ensure buttons have aria-labels, modal traps focus, images have alt text.
10. QA and manual testing:
   - Test as standard user and admin.
   - Test offline and error scenarios.

## 12. Notes, Constraints, and Edge Cases

- Use existing shared components (`ui/button.tsx`, `ui/card.tsx`, `ui/dialog.tsx`) to maintain consistent look & feel.
- Keep data mapping in the hook to keep components pure and presentation-focused.
- If endpoint returns `CatalogBadgeDto` directly (not wrapped), accept both shapes in the hook.
- Performance: if requirements list is long, virtualize or collapse by default.
- Security: Admin actions must be protected by server-side checks; don't rely on client role checks alone.

--- 

This document should be saved at `.ai/catalog-badges-detail-view-implementation-plan.md` and used as the canonical implementation guide for frontend developers implementing the Catalog Detail view.


