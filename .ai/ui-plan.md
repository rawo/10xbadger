# UI Architecture for 10xBadger

## 1. UI Structure Overview

10xBadger's UI is organized around the core API resources and user roles. Top-level navigation maps directly to API resources (Catalog, Applications, Promotion Templates, Promotions, Admin Review) to simplify data fetching and permission checks. The UI uses a hybrid data strategy: SSR/edge for read-mostly lists and React Query (or SWR) for interactive CRUD pages, autosave, and optimistic updates. The design system is built on Tailwind + Shadcn/ui with accessible shared primitives. Mobile support is deferred for the MVP; WCAG AA accessibility baseline is enforced.

## 2. View List

- View name: Dashboard (Home)
  - View path: `/`
  - Main purpose: Provide quick entry points and high-level counts (my apps, pending reviews, templates)
  - Key information to display: my badges pending reviews, my badges in draft, my badges approved, quick links to Catalog, Applications, Admin Review, Templates
  - Key view components: Overview cards, small activity feed, quick action buttons
  - UX/accessibility/security: Keyboard-accessible shortcuts, clear aria labels for cards; no admin-only controls unless user is admin

- View name: Catalog List
  - View path: `/catalog`
  - Main purpose: Browse and discover catalog badges
  - Key information to display: badge title, level, category, short description, status chip, CTA to Apply or View
  - Key view components: Search bar (debounced), filters (category/level/status), paginated list or table, `CatalogCard`
  - UX/accessibility/security: semantic list, accessible form controls for filters, server-side search query mapping to `GET /api/catalog-badges`

- View name: Catalog Detail
  - View path: `/catalog/:id`
  - Main purpose: Show badge details and allow starting an application
  - Key information to display: full description, version, metadata, example evidence, CTA “Apply”
  - Key view components: `CatalogDetail`, `CatalogCard`, Apply button initiating `/apply/new?catalog_badge_id=` flow
  - UX/accessibility/security: ARIA landmarks for content, validate badge status before enabling Apply; `GET /api/catalog-badges/:id`

- View name: New Application / Application Editor
  - View path: `/apply/new` (or `/applications/:id/edit`)
  - Main purpose: Create and edit badge application drafts
  - Key information to display: selected catalog badge, applicant info, date fields, reason/evidence fields, draft status indicator, autosave status
  - Key view components: multi-section `ApplicationEditor` (metadata, dates, evidence placeholder), `FormField`, `DatePicker`, Save/Submit actions
  - UX/accessibility/security: Autosave indicator, inline validation errors from client and server (`POST /api/badge-applications` then `PUT /api/badge-applications/:id`), ensure CSRF protected writes

- View name: My Applications (List)
  - View path: `/applications`
  - Main purpose: List user's applications with status and quick actions
  - Key information to display: application title, linked catalog badge, status chips (draft/submitted/accepted/rejected), submitted_at
  - Key view components: `ApplicationList`, `ApplicationRow`, filters (status), pagination
  - UX/accessibility/security: Show only user's apps (or all for admin), call `GET /api/badge-applications` with applicant_id for non-admins

- View name: Application Detail / Review
  - View path: `/applications/:id`
  - Main purpose: View full application details and perform actions (edit, submit). For admins, accept/reject.
  - Key information to display: all application fields, evidence, applicant info, audit trail, action buttons (submit, accept, reject)
  - Key view components: `ApplicationDetail`, `ReviewPanel` (admin), `DecisionForm` modal
  - UX/accessibility/security: Admin-only controls guarded by `RoleGuard`; accept/reject call `POST /api/badge-applications/:id/accept` and `.../reject` with note/notify options

- View name: Promotion Templates List
  - View path: `/promotion-templates`
  - Main purpose: Browse promotion templates and start promotion builds
  - Key information to display: template name, path, from_level/to_level, description, CTA “Use Template”
  - Key view components: `TemplateList`, `TemplateCard`
  - UX/accessibility/security: `GET /api/promotion-templates`

- View name: Template Detail / Use Template
  - View path: `/promotion-templates/:id`
  - Main purpose: Inspect template and create promotion from it
  - Key information to display: template details, sample badges, CTA to create promotion
  - Key view components: `TemplateDetail`, modal/flow to create promotion via `POST /api/promotions`
  - UX/accessibility/security: Confirm creation, show success toast and navigate to promotion builder

- View name: Promotions List
  - View path: `/promotions`
  - Main purpose: List promotions (my or organization) with status
  - Key information to display: promotion name, owner, status, created_at
  - Key view components: `PromotionList`, pagination, quick filters
  - UX/accessibility/security: use `GET /api/promotions`

- View name: Promotion Builder / Detail
  - View path: `/promotions/:id`
  - Main purpose: Build and edit a promotion (add/remove badges, edit metadata)
  - Key information to display: selected badges, candidate info, promotion metadata, save/submit controls
  - Key view components: `PromotionBuilder`, `BadgePicker` (catalog search), add/remove badge actions (POST/DELETE `/api/promotions/:id/badges`), save `PUT /api/promotions/:id`
  - UX/accessibility/security: confirm destructive actions, autosave drafts, map API errors to UI

- View name: Admin Review Queue
  - View path: `/admin/review`
  - Main purpose: Admins review submitted applications in a queue/filterable list
  - Key information to display: submitted applications, applicant, linked badge, submitted_at, quick accept/reject
  - Key view components: `AdminReviewList`, bulk-select controls, `ReviewPanel` with decision modal
  - UX/accessibility/security: admin-only; guard route and fetch `GET /api/badge-applications` with filters

## 3. User Journey Map

Main use case: Engineer — Browse Catalog → Apply → Submit → Track

1. User lands on `/catalog` (SSR) — `GET /api/catalog-badges` shows active badges.
2. User filters/searches badges (debounced input) and clicks a badge to view `/catalog/:id` (`GET /api/catalog-badges/:id`).
3. User clicks “Apply” — navigates to `/apply/new?catalog_badge_id=...` and `ApplicationEditor` opens with prefilled badge info.
4. Editor autosaves draft: initial `POST /api/badge-applications` (create draft), then subsequent `PUT /api/badge-applications/:id` for updates — UI shows save status.
5. Client-side validation runs; on submit, server validation (`POST /api/badge-applications/:id/submit`) may return `validation_error` mapped to inline fields — user fixes and retries.
6. On successful submit, app status updates to `submitted`; invalidate queries for applications and dashboard counts; show success toast and link to `/applications/:id`.
7. User monitors `/applications` for status changes.

Supporting journeys

- Admin review: Admin opens `/admin/review`, inspects item (`GET /api/badge-applications/:id`), and Accepts/Rejects via `POST` endpoints with decision note; UI shows immediate update and invalidates app lists.
- Promotion build: User opens `/promotion-templates`, selects a template, creates a new promotion (`POST /api/promotions`), adds badges via `POST /api/promotions/:id/badges`, saves (`PUT`), then submits.

## 4. Layout and Navigation Structure

- Global layout: Header (logo, top nav, search), Role-aware primary nav, user menu (profile/sign-out), breadcrumbs, footer.
- Primary nav items: Dashboard, Catalog, Applications, Promotion Templates, Promotions, Admin (visible only to admins).
- Contextual actions: CTA buttons in views (Apply, Create Promotion, New Template) and action buttons within lists.
- Route guards: `RoleGuard` controls access to admin routes and hides admin-only UI elements; client listens for `401/403` to prompt re-auth or display permission messages.

Navigation rules

- Keep shallow routes for common flows: list → detail → editor.
- Use query parameters for filters and searches so URLs are shareable and bookmarkable.
- Use modals for confirm/decision flows (submit/accept/reject) with accessible focus management.

## 5. Key Components

- Layout / Shell
  - Header: role-aware nav and global search
  - Footer: legal/links
  - Breadcrumbs: show context path
  - ToastHost: global toasts
  - ModalHost: centralized modal handling

- Data & UX primitives
  - `FormField` (label, helper, error), `FormSection`
  - `DatePicker` with accessible keyboard support
  - `Select` and `Combobox` for searchable selects
  - `Table` (sortable, paginated) and `Card` variants for lists
  - `Spinner`, `EmptyState`, `ErrorState`
  - `ConfirmationDialog`, `DecisionForm` (for admin accept/reject)

- Resource-specific components
  - `CatalogList`, `CatalogCard`, `CatalogDetail`
  - `ApplicationList`, `ApplicationRow`, `ApplicationEditor`, `ApplicationDetail`
  - `TemplateList`, `TemplateCard`, `TemplateDetail`
  - `PromotionBuilder`, `BadgePicker`
  - `AdminReviewList`, `ReviewPanel`

- Hooks & data-layer utilities
  - `useAuth` (fetch session, user id, is_admin)
  - `useApi` (wrap fetch, map ApiError to UI-friendly shapes)
  - React Query hooks: `useCatalog`, `useCatalogById`, `useApplications`, `useApplication`, `usePromotionTemplates`, `usePromotion`
  - `useAutosave` to debounce and persist draft data

## 6. UX, Accessibility, and Security Notes (summary)

- Accessibility: WCAG AA baseline — semantic HTML, aria labels, focus management, descriptive error messages, keyboard operability for all interactive controls.
- Responsiveness: Desktop-first for MVP; components should degrade gracefully on smaller viewports but full mobile UX is out of scope for initial release.
- Security: Rely on backend-managed sessions (Supabase httpOnly cookies); client handles `401/403` by prompting re-auth or showing permission messages. Ensure CSRF tokens or same-site cookie protections for state-changing requests. Avoid storing tokens in localStorage.

## 7. Edge Cases and Error States

- API returns `validation_error`: map `details` to inline field errors and focus the first invalid field.
- API returns `unauthorized`: redirect to sign-in or show a re-auth modal.
- API returns `forbidden`: show permission UI and hide admin actions.
- API returns `conflict`: present conflict resolution UI (reload data, show differences, retry option).
- Network failures/timeouts: show persistent retryable banners and save local draft indicators where possible.
- Partial failures during multi-step flows (e.g., promotion badge attach fails): present per-action errors and allow retry without losing work.

## 8. Compatibility with API Plan

- All views map to available endpoints described in the API plan: `GET /api/catalog-badges`, `GET /api/catalog-badges/:id`, `POST/PUT /api/badge-applications`, `POST /api/badge-applications/:id/submit`, `POST /api/badge-applications/:id/accept|reject`, `GET/POST /api/promotion-templates`, `GET/POST/PUT/DELETE /api/promotions` and badge subroutes.
- Use query parameters (filters, search, paging) to leverage server-side filtering and reduce client workload.
- Rely on server-side role checks for admin actions; the UI will surface appropriate controls based on `useAuth` session data and handle 403 from API gracefully.

## 9. Mapping PRD User Stories to UI

- Browse catalog and search (PRD): mapped to `Catalog List` and `Catalog Detail` with search/filters.
- Draft and submit badge applications (PRD): mapped to `ApplicationEditor`, autosave, submit flow.
- Administrative review (PRD): mapped to `Admin Review Queue` and `ReviewPanel` with accept/reject decision notes.
- Promotion building (PRD): mapped to `Promotion Templates`, `PromotionBuilder`, and badge management subflows.
- Role-based access (PRD): enforced via `useAuth`, `RoleGuard`, and server-side checks.

## 10. Addressing User Pain Points

- Pain: losing draft progress — Solution: autosave with clear status, local retry, and server-side drafts.
- Pain: unclear validation failures — Solution: map server `validation_error.details` to inline messages and provide general toasts.
- Pain: permission surprises — Solution: role-aware nav, disabled UI for restricted actions, and clear 403 messaging.
- Pain: slow list loads — Solution: SSR for catalog/templates, caching with React Query, pagination, and debounced search.



<!-- End of UI architecture document -->
