# View Implementation Plan: Promotions List

## 1. Overview

The Promotions List view provides a paginated overview of promotion drafts and submissions for the current user (and all promotions for admin users). It enables users to scan promotion status, open promotion drafts/details, create a new promotion from a template, and for admins to filter, inspect and take action (approve/reject) on promotions. The view is SSR-friendly for initial load and client-interactive for filtering, pagination, and actions.

Key goals:
- Present promotions with clear status badges and metadata.
- Provide filters (status, path, template), sorting, and pagination.
- Allow creating new promotions (via template) and deleting draft promotions.
- Support admin actions and navigation to promotion builder/detail.

## 2. View Routing

- Path: `/promotions`
- Query parameters:
  - `status` (optional): "draft" | "submitted" | "approved" | "rejected"
  - `template_id` (optional): filter by template
  - `path` (optional): career path filter
  - `limit`, `offset`, `sort`, `order`

Navigation:
- Clicking a promotion navigates to `/promotions/:id`
- CTA "New Promotion" routes to `/promotions/new` or `/promotion-templates` for template-first flow

## 3. Component Structure

Top-level:
```
PromotionsListPage.astro (SSR)
└── PromotionsListView (React, client:load)
    ├── PromotionsHeader
    ├── PromotionsFilterBar
    ├── PromotionsTable (or Grid)
    │   └── PromotionRow (repeated)
    ├── Pagination
    ├── PromotionActionsModal (confirm delete)
    └── Toasts / Global feedback
```

## 4. Component Details

### PromotionsListPage.astro
- Description: SSR entry that validates query params, fetches initial paginated data from `GET /api/promotions`, and hydrates `PromotionsListView` with `client:load`. Handles 400/401/500 errors.
- Main elements:
  - Layout wrapper, page metadata, initial data fetch
  - Pass `initialData`, `isAdmin`, `userId` props to client component
- Validation:
  - Validate pagination and filters (use zod same as API)
- Types:
  - `PaginatedResponse<PromotionListItemDto>`

### PromotionsListView
- Description: Orchestrates filters, data refresh, client-side actions (delete, navigate), and renders list.
- Main elements:
  - `PromotionsHeader` (title + new promotion CTA)
  - `PromotionsFilterBar` (filters & sort controls)
  - `PromotionsTable` (list rendering)
  - `Pagination`
  - `PromotionActionsModal` for destructive confirms
- Handled events:
  - Filter change → update URL & re-fetch
  - Sort change → re-fetch
  - Click promotion → navigate `/promotions/:id`
  - Click delete (draft) → open confirm modal → call DELETE /api/promotions/:id
- Validation:
  - Disable delete if status !== 'draft'
  - Ensure pagination offsets are non-negative
- Props:
  - `initialData: PaginatedResponse<PromotionListItemDto>`
  - `isAdmin: boolean`
  - `userId: string`

### PromotionsHeader
- Description: Page title, quick actions (New Promotion), and summary counts.
- Events:
  - Click "New Promotion" → navigate `/promotions/new` (or show template chooser)
- Props:
  - `isAdmin`, `onCreate`

### PromotionsFilterBar
- Description: Controls for `status`, `path`, `template`, search, and sort.
- Elements: select dropdowns, search input, reset filters button.
- Events:
  - onFilterChange(filterObject)
  - onSortChange(sortOptions)
- Validation:
  - Ensure required query inputs valid; show inline errors for invalid values (rare for controlled selects)

### PromotionsTable
- Description: Tabular or card rendering of promotion items.
- Child: `PromotionRow`
- Props:
  - `promotions: PromotionListItemDto[]`
  - `isAdmin`, `onRowClick`, `onDelete`, `onApprove`, `onReject`

### PromotionRow
- Description: Single promotion row showing template, creator, badge count, status, created_at, actions.
- Elements:
  - Title (template name), status badge, created_by, created_at, badge_count, action menu
- Events:
  - Click row → `onView(id)`
  - Click delete → `onDelete(id)` (if draft & owner)
  - Admin: approve/reject buttons trigger modals and API POST `/api/promotions/:id/approve` or `/reject`
- Validation:
  - Guard approve/reject only for submitted promotions (admin)

### Pagination
- Description: Controls `limit`/`offset` with page numbers; emits onPageChange

### PromotionActionsModal
- Description: Confirm destructive actions (delete) and show success/failure.
- Events: onConfirm → call API; onCancel → close

## 5. Types

Reused types (from `src/types.ts`):
- `PromotionListItemDto` — promotion row; fields typically: `id`, `template: {id,name}`, `created_at`, `created_by`, `badge_count`, `status`, `path`
- `PaginatedResponse<T>` — `{ data: T[]; pagination: PaginationMetadata }`
- `PaginationMetadata` — `{ total, limit, offset, has_more }`

New / ViewModel types:
- `PromotionsListViewModel`:
  - promotions: PromotionListItemDto[]
  - pagination: PaginationMetadata
  - filters: { status?: string; path?: PromotionPathType; template_id?: string; search?: string }
  - isAdmin: boolean
  - userId?: string

Notes: Use existing `TemplateSummary` and `UserSummary` types where available.

## 6. State Management

Top-level state in `PromotionsListView`:
- `promotions` (list) — initial from SSR, updated via fetch
- `pagination` — limit/offset/total
- `filters` — controlled filters object
- `sortOptions` — current sort/order
- `isLoading` — API call indicator
- `selectedPromotionId` — for modals
- `isDeleteModalOpen` — boolean

Patterns:
- SSR provides initial data; client component uses `useState` + `useEffect` to manage subsequent fetches.
- Use `useCallback` for event handlers; use `useMemo` for derived values.
- Consider a small custom hook `usePromotions` to encapsulate fetching, filters, and pagination:
  - Exposes: promotions, pagination, filters, isLoading, fetchPromotions, updateFilters, goToPage, deletePromotion, approvePromotion, rejectPromotion.

## 7. API Integration

API calls required:
- GET /api/promotions?{filters,sort,limit,offset} → returns `PaginatedResponse<PromotionListItemDto>`
  - Request: no body; query params as above.
  - Response: { data: PromotionListItemDto[], pagination: PaginationMetadata }
- POST /api/promotions → create promotion (used from CTA when creating blank or template-based promotion)
  - Request body: { template_id?: string }
  - Response: created PromotionDetailDto or PromotionListItemDto with id
- DELETE /api/promotions/:id → delete draft promotion
  - Response: { message }
- POST /api/promotions/:id/approve → admin approve
  - Body: optional approval metadata
  - Response: updated promotion
- POST /api/promotions/:id/reject → admin reject
  - Body: { reject_reason: string }
  - Response: updated promotion

Frontend integration details:
- All calls should set `isLoading` and provide toast feedback on success/error.
- After mutations, refresh list via `fetchPromotions()` or optimistic update (prefer refetch for consistency).

## 8. User Interactions

Primary flows:
1. View list (initial SSR) — user sees promotions; client hydrates for interaction.
2. Filter/sort — changing controls updates URL query string and re-fetches data; show spinner.
3. Pagination — navigate pages using Pagination component; fetch relevant page.
4. Create promotion — click CTA; either route to `/promotions/new` or open template modal; on success redirect to promotion builder.
5. Delete promotion — open confirm modal; call DELETE; on success refresh list and show toast.
6. Admin approve/reject — open decision modal for reject (with reason); on confirmation call endpoints and refresh row; show toast.
7. Row click — navigate to `/promotions/:id`.

Expected outcomes:
- Filters and pagination update list and URL.
- Mutations produce toasts and update UI.
- Unauthorized actions show 403 toast and do not change UI.

## 9. Conditions and Validation

Component-level validations:
- Delete action only allowed when `status === 'draft'` and user is owner or admin.
- Approve action only for admins and when status === 'submitted'.
- Reject requires reason (non-empty) before calling API.
- Pagination inputs: limit positive integer (bounded).

API conditions to verify in UI:
- Handle 404 from delete (show toast and refetch)
- Handle 409/conflict from approve/reject/submit (show error details)

## 10. Error Handling

Common scenarios and handling:
- Network error / 5xx → show persistent error toast/banner with retry button.
- 401/403 → prompt re-auth (redirect to login) or show permission error.
- 404 on detail navigation → show 404 page with link back to list.
- Validation errors (400) → map `ApiError.details` to UI (form fields / modals).
- Conflict (409) → show conflict modal with details and refresh suggestion.

UX principles:
- Show loading indicators on buttons and list refresh.
- Disable controls during pending requests.
- Provide clear success/error toasts and keep modals open on recoverable errors.

## 11. Implementation Steps

Phase A — Foundation (SSR + view skeleton)
1. Add route `src/pages/promotions/index.astro`:
   - Validate query params (zod), call `GET /api/promotions` server-side, pass `initialData` and `isAdmin` to client view.
2. Create `src/components/promotions/PromotionsListView.tsx` with props `{ initialData, isAdmin, userId }` and placeholder render.
3. Add `usePromotions` hook skeleton in `src/hooks/usePromotions.ts` to encapsulate fetch, filters, pagination; return initialData on first render.

Phase B — UI Components
4. Implement `PromotionsHeader` with title, counts (if available), New Promotion CTA.
5. Implement `PromotionsFilterBar`:
   - Controlled selects for `status`, `path`, `template_id`, search input.
   - Emit `onFilterChange`.
6. Implement `PromotionsTable` and `PromotionRow`:
   - Row fields: template name, owner (display_name), badge_count, status badge, created_at, actions menu (view, delete).
   - Add accessible keyboard navigation and focus outlines.
7. Implement `Pagination` (reuse existing pagination component if available).

Phase C — Actions & Mutations
8. Wire `deletePromotion(id)` in `usePromotions` to call `DELETE /api/promotions/:id`, handle errors, and refetch.
9. Wire create promotion CTA to navigate to `/promotions/new` (or open template selection) and create via POST when appropriate.
10. Implement admin actions (approve/reject) with modals capturing reason for reject, calling `/approve` and `/reject`.

Phase D — Polishing & Tests
11. Add loading spinners and aria-busy attributes for accessibility.
12. Map and display API `validation_error.details` for modals/forms.
13. Add unit and integration tests:
   - `usePromotions` hook tests
   - `PromotionRow` actions tests
   - End-to-end simulation of create → navigate → add/remove badges (if test infra available)
14. Run linting and format.

Phase E — Optional Improvements
15. Add client-side caching (React Query or lightweight cache) and optimistic updates.
16. Add filters state to URL for deep linking and back-button consistency.
17. Add analytics instrumentation for key events (create, submit, approve, reject).

---

Save location
- `.ai/promotions-list-view-implementation-plan.md`


