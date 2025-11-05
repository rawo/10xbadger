Creating a short todo list for UI architecture planning, then I'll generate the 10 combined questions + recommendations.

[1 tool called]

Created todo list; now generating the 10 combined questions + recommendations.

<questions>

List your questions and recommendations here, numbered for clarity:

1. Should the app's top-level view hierarchy mirror the API resource structure (catalog-badges, badge-applications, promotion-templates, promotions, admin review)?
Recommendation: Yes — design top-level routes/pages that map to those API resources (Catalog, My Applications, Promotion Templates, Promotions, Admin Review) to keep navigation predictable and simplify data fetching and permissions checks.

2. How should role-based navigation and access be presented given Google Workspace SSO and admin endpoints (accept/reject, promotion management)?
Recommendation: Implement role-aware navigation (engineer vs admin) with route guards and conditional menu items; fetch minimal role scope on session load, and hide/admin-only UI until backend confirms permissions. Surface permission errors with clear UI states.

3. Which data-fetching pattern should we use for catalog and templates vs interactive forms (list vs single resource endpoints)?
Recommendation: Use a hybrid approach: SSR/edge-render catalog lists and templates where possible for SEO and fast first paint; use client-side fetching (React Query / SWR) for interactive pages and forms (badge application drafts, promotion edits) with optimistic updates for submit/accept flows.

4. What state management strategy should we use for globally-shared data (current user, roles, catalog cache) vs form/local state?
Recommendation: Use React Query (or SWR) as the primary data-sync layer for server state and caching, plus local component state or context for ephemeral UI state; avoid a heavy global store — centralize auth/session and use query invalidation to sync changes.

5. How should the UI handle validation and error mapping for API validation endpoints (server-side validation errors returned on submit)?
Recommendation: Implement layered validation: client-side validation for immediate UX (mirrors server rules) and robust server-error handling that maps API error payloads to inline field errors and global toasts; standardize error shapes in the UI adapter layer.

6. What caching and invalidation strategy should we apply for frequently-read resources (catalog badges, promotion templates) to balance freshness and performance?
Recommendation: Use React Query with tuned staleTime and background refetch (stale-while-revalidate), cache catalog and templates longer (e.g., 5–15 minutes) with manual invalidation after writes; paginate and lazy-load lists to reduce payloads.

7. Which UI components and design system should be adopted to ensure consistency and speed of development (modals, forms, tables, toasts)?
Recommendation: Leverage the existing stack (Tailwind + Shadcn/ui) as the base design system, create shared component primitives (Form, Modal, Table, Card, Toast) with design tokens and accessible defaults to ensure consistent patterns and faster feature delivery.

8. How should accessibility and responsive behavior be specified (keyboard nav, ARIA, mobile flows, focus management)?
Recommendation: Enforce WCAG AA baseline: semantic HTML, ARIA roles for custom widgets, keyboard focus management for modals and dialogs, visible focus states, and mobile-first responsive breakpoints where complex desktop modals become full-screen mobile flows.

9. How should the UI present long-running or multi-step actions (badge application drafting, promotion build, admin reviews) and recover from partial failures?
Recommendation: Use explicit multi-step form patterns with autosave/draft endpoints, client-side draft persistence, progress indicators, and clear retry/failure states; provide undo/confirm actions for destructive admin operations and surface API error details plus remediation steps.

10. How should authentication tokens, session persistence, and secure client-side API calls be handled to meet security needs (CSRF, token exposure, role enforcement)?
Recommendation: Use backend-managed sessions with secure httpOnly cookies after Google Workspace SSO, protect write endpoints server-side with permission checks, implement CSRF protection for state-changing calls, and avoid storing auth tokens in localStorage; the client should rely on backend session endpoints and include robust handling for 401/403 to trigger re-auth flows.

</questions>

- Created three TODOs to track work: `todo-001-draft-questions` (in_progress), `todo-002-review-prd-api` (pending), `todo-003-create-navigation` (pending).
- Produced 10 focused question+recommendation pairs to guide UI architecture, covering view hierarchy, data flow, state management, accessibility, security, caching, and component choices.

1. Yes
2. Proceed with recommendation
3. Proceed with recommendation
4. Proceed with recommendation
5. Proceed with recommendation
6. Proceed with recommendation
7. Proceed with recommendation
8. No need to be mobile friendly for the mvp. But for other aspects use wcag aa baseline.
9. Proceed with recommendation
10. Proceed with recommendation
