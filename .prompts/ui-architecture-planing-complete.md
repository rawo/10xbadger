You are a qualified frontend architect whose task is to create a comprehensive user interface architecture based on the Product Requirements Document (PRD), API plan, and planning session notes. Your goal is to design a user interface structure that effectively meets product requirements, is compatible with API capabilities, and incorporates insights from the planning session.

First, carefully review the following documents:

Product Requirements Document (PRD):
<prd>
@prd.md
</prd>

API Plan:
<api_plan>
@api-plan.md
</api_plan>

Session Notes:
<session_notes>
<conversation_summary>

<decisions>

1. Mirror top-level view hierarchy to API resources (Catalog, My Applications, Promotion Templates, Promotions, Admin Review).

2. Proceed with role-aware navigation and route guards for engineer vs admin flows (Google Workspace SSO assumed).

3. Use SSR/edge for catalog/templates lists and client-side fetching for interactive forms and edits.

4. Use React Query (or SWR) as primary data-sync/caching layer and local state/context for ephemeral UI state.

5. Implement layered validation: client-side validation + server-side mapping of ApiError to inline field errors and toasts.

6. Use caching strategies with stale-while-revalidate for catalog and templates; manual invalidation after writes.

7. Adopt Tailwind + Shadcn/ui as the design system and create shared UI primitives (Form, Modal, Table, Card, Toast).

8. For MVP, mobile-responsive behavior is not required; enforce WCAG AA baseline for accessibility otherwise.

9. Support multi-step/draft flows with autosave, explicit progress indicators, and retry/undo patterns for destructive actions.

10. Use backend-managed sessions (httpOnly cookies with Supabase auth) and implement CSRF/401/403 handling on the client; avoid storing tokens in localStorage.

</decisions>

<matched_recommendations>

1. Map top-level routes to API resources — Recommendation: design top-level routes/pages mapping to API resources. (User: Yes)

2. Role-aware navigation and route guards — Recommendation: implement role-aware nav, fetch role on session load. (User: Proceed)

3. Hybrid data-fetching (SSR + client-side) — Recommendation: SSR for lists, client-side for interactive pages. (User: Proceed)

4. Use React Query for server state and local state for ephemeral UI — Recommendation: centralize auth/session and query invalidation. (User: Proceed)

5. Layered validation with API error mapping — Recommendation: client validation + server-error mapping. (User: Proceed)

6. Caching with stale-while-revalidate and manual invalidation — Recommendation: tuned staleTime and background refetch. (User: Proceed)

7. Use Tailwind + Shadcn/ui and shared primitives — Recommendation: adopt existing stack and build accessible primitives. (User: Proceed)

8. Accessibility baseline WCAG AA; mobile not required for MVP — Recommendation: enforce WCAG AA; mobile excluded for MVP per user. (User: Mobile not required; WCAG AA for others)

9. Multi-step flows with autosave/drafts and retry — Recommendation: auto-save drafts to server and provide clear retry states. (User: Proceed)

10. Backend-managed sessions, httpOnly cookies, CSRF protection — Recommendation: avoid storing tokens client-side; handle 401/403 appropriately. (User: Proceed)

</matched_recommendations>

<ui_architecture_planning_summary>

Main UI architecture requirements

- Align top-level navigation to API resources for predictability and simple data-fetching: Catalog, Applications, Promotion Templates, Promotions, Admin Review.
- Role-aware UI with route guards and conditional navigation items for admin vs engineer views; rely on server-side role checks for sensitive actions.
- Use a hybrid data-fetching strategy: server-side rendering for public, read-mostly lists (catalog, templates) and client-side fetching with React Query for interactive CRUD pages and optimistic updates.
- Build a small design system using Tailwind + Shadcn/ui with accessible shared primitives.
- Implement robust client/server validation mapping, autosave for drafts, and clear handling for long-running or destructive operations.

Key views, screens, and user flows

- Top-level routes: `/` (Dashboard), `/catalog`, `/catalog/:id`, `/apply/new`, `/applications`, `/applications/:id`, `/promotion-templates`, `/promotion-templates/:id`, `/promotions`, `/promotions/:id`, `/admin/review`.
- Engineer flow: Browse Catalog → Apply (create draft) → Edit/Autosave → Submit → Track Application.
- Admin reviewer flow: Review Queue → Inspect Application → Accept/Reject with decision note and notify toggle → Lists update.
- Promotion builder flow: Browse Templates → Use Template → Add/Remove Badges → Save/Submit Promotion.
- Shared interactions: search/debounce, filters, pagination, confirmation modals, inline validation errors, global toasts.

API integration and state management strategy

- Use React Query (or SWR) for server data: resource-specific hooks (`useCatalog`, `useApplications`, `usePromotionTemplates`, `usePromotion`).
- Caching policy: catalog and templates longer staleTime (5–15m); user-specific lists shorter; background refetch on focus; manual invalidation after mutations.
- Optimistic updates for non-critical UX (e.g., UI indicators for autosave), but rely on server response for canonical state (particularly status transitions like submit/accept).
- Autosave implementation: debounced `POST` (create) then `PUT` (update) per application; `useAutosave` hook to manage retries and local indicators.
- Error shape mapping: standard `ApiError` mapping to inline field errors (`validation_error`), auth flows (`unauthorized`), permission UI (`forbidden`), and server errors (`internal_error`).

Responsiveness, accessibility, and security considerations

- Accessibility: enforce WCAG AA baseline (semantic markup, ARIA where needed, keyboard focus trapping in modals, visible focus states, clear error messages).
- Responsiveness: mobile is not a requirement for MVP; ensure graceful degradation for smaller widths but prioritize desktop and tablet layouts for MVP.
- Security: production endpoints expect Supabase-authenticated sessions; implement client flows that react to `401`/`403` with re-auth or permission messaging. Use backend-managed sessions (httpOnly cookies), CSRF protections for state-changing requests, and avoid storing tokens in localStorage.
- Admin actions: require server-side admin checks for accept/reject; UI must guard routes and display explicit admin-only messages in dev mode (auth disabled).

Any unresolved issues or areas requiring further clarification

- Authentication: many API endpoints currently have development-mode auth disabled; clarify the timeline and exact behavior for enabling Google Workspace SSO and session management in production.
- Promotions API details: confirm exact endpoints and payload shapes for adding/removing badges on a promotion (the code references `promotions/:id/badges` but full contract should be validated with API plan).
- Attachments & evidence: PRD references evidence for applications; API contract for file uploads or attachments is not clearly defined — need upload endpoint, storage, and UI flow.
- Bulk admin actions and undo: clarify desired behavior and API support for bulk accept/reject and undo semantics (atomicity, notifications).
- Error surface design: define a consistent user-visible mapping for `conflict` / `internal_error` and desired retry/rollback UX.

</ui_architecture_planning_summary>

<unresolved_issues>

1. Timeline and rollout plan for enabling production authentication (Google Workspace SSO + Supabase session flow).

2. Confirmation of promotion badge attach/remove API contracts and request/response payloads.

3. Definition of file upload endpoints and storage workflow for evidence/attachments.

4. Requirements for bulk admin operations and undo semantics.

5. Decide whether mobile support will be required in future sprints and when to prioritize responsive/mobile UX.

</unresolved_issues>

</conversation_summary>
</session_notes>

Your task is to create a detailed user interface architecture that includes necessary views, user journey mapping, navigation structure, and key elements for each view. The design should consider user experience, accessibility, and security.

Execute the following steps to complete the task:

1. Thoroughly analyze the PRD, API plan, and session notes.
2. Extract and list key requirements from the PRD.
3. Identify and list main API endpoints and their purposes.
4. Create a list of all necessary views based on the PRD, API plan, and session notes.
5. Determine the main purpose and key information for each view.
6. Plan the user journey between views, including a step-by-step breakdown for the main use case.
7. Design the navigation structure.
8. Propose key user interface elements for each view, considering UX, accessibility, and security.
9. Consider potential edge cases or error states.
10. Ensure the user interface architecture is compatible with the API plan.
11. Review and map all user stories from the PRD to the user interface architecture.
12. Explicitly map requirements to user interface elements.
13. Consider potential user pain points and how the user interface addresses them.

For each main step, work inside <ui_architecture_planning> tags in your thinking block to break down your thought process before moving to the next step. This section can be quite long. It's okay that this section can be quite long.

Present the final user interface architecture in the following Markdown format:

```markdown
# UI Architecture for [Product Name]

## 1. UI Structure Overview

[Provide a general overview of the UI structure]

## 2. View List

[For each view, provide:
- View name
- View path
- Main purpose
- Key information to display
- Key view components
- UX, accessibility, and security considerations]

## 3. User Journey Map

[Describe the flow between views and key user interactions]

## 4. Layout and Navigation Structure

[Explain how users will navigate between views]

## 5. Key Components

[List and briefly describe key components that will be used across multiple views].
```

Focus exclusively on user interface architecture, user journey, navigation, and key elements for each view. Do not include implementation details, specific visual design, or code examples unless they are crucial to understanding the architecture.

The final result should consist solely of the UI architecture in Markdown format in English, which you will save in the .ai/ui-plan.md file. Do not duplicate or repeat any work done in the thinking block.


