# View Implementation Plan: Promotion Builder / Detail

## 1. Overview

The Promotion Builder/Detail view serves as the primary interface for engineers to create, edit, and submit promotion applications based on promotion templates. Users can add accepted badge applications to their draft promotions, view real-time eligibility status against template requirements, remove badges, and submit when validation passes. The view also provides read-only detail display for submitted/approved/rejected promotions.

Key Responsibilities:
- Display promotion metadata (template, path, levels, status, creator)
- Manage badge applications assigned to the promotion (add/remove)
- Show real-time validation status against template requirements
- Enable submission when requirements are met
- Provide breadcrumb navigation and contextual actions
- Handle reservation conflicts (HTTP 409) with actionable error modals
- Support both builder (draft) and detail (submitted/approved/rejected) modes

## 2. View Routing

**Primary Path:** `/promotions/:id`

**Query Parameters:** None (promotion ID in path is sufficient)

**Navigation Entry Points:**
- From Promotions List (`/promotions`) - clicking a promotion row
- From Promotion Template Detail (`/promotion-templates/:id`) - after "Use Template" action creates draft
- From Dashboard - clicking a promotion item in overview cards
- From "New Promotion" flow (`/promotions/new?template_id=...`) - after creation redirects here

**Exit Points:**
- Back to Promotions List via breadcrumb or back button
- Navigate to Badge Application detail when clicking badges (contextual)
- Delete draft (returns to list)

## 3. Component Structure

```
PromotionBuilderPage.astro (SSR Entry Point)
└── PromotionBuilderView (React, client:load)
    ├── BuilderHeader
    │   ├── Breadcrumb (Home / Promotions / Promotion {id})
    │   └── StatusBadge
    ├── PromotionMetadataCard
    │   ├── TemplateInfo (name, path, levels)
    │   ├── CreatorInfo (display_name, created_at)
    │   └── StatusTimestamps (submitted_at, approved_at, etc.)
    ├── EligibilityPreview (eligibility summary)
    │   ├── RequirementRow (repeated)
    │   └── ValidationStatusIndicator
    ├── BadgesList (assigned badges)
    │   ├── BadgeListItem (repeated)
    │   │   ├── CatalogBadgeSummary
    │   │   └── RemoveBadgeButton (draft only)
    │   └── EmptyState (no badges yet)
    ├── BadgePicker (draft only, modal or inline)
    │   ├── SearchBar (filter accepted badges)
    │   ├── AvailableBadgesList (multi-select)
    │   └── AddBadgesButton
    ├── ActionBar (sticky footer or section)
    │   ├── SubmitButton (disabled until valid)
    │   ├── DeleteButton (draft only)
    │   └── BackButton
    └── ConflictModal (reservation conflict handler)
        ├── ConflictDetails
        ├── LinkToOwningPromotion
        └── RefreshButton
```

## 4. Component Details

### PromotionBuilderPage.astro

**Description:** SSR page that validates route parameter (promotion ID), fetches initial promotion data server-side, checks authorization (user owns promotion or is admin), and hydrates the React PromotionBuilderView component.

**Main Elements:**
- Astro Layout wrapper
- Server-side validation of promotion ID (UUID format)
- Server-side fetch of `GET /api/promotions/:id` with auth headers
- Error handling for 404 (not found) and 401/403 (unauthorized)
- Hydration of `PromotionBuilderView` with `client:load`

**Handled Events:** None (SSR page)

**Validation Conditions:**
- Promotion ID must be valid UUID format
- Promotion must exist (404 if not)
- User must own promotion OR be admin (403 if not authorized for read)

**Types:**
- `PromotionDetailDto` (fetched from API)
- `ApiError` (for error responses)

**Props Passed to React Component:**
- `initialPromotion: PromotionDetailDto`
- `userId: string`
- `isAdmin: boolean`

---

### PromotionBuilderView

**Description:** Main React orchestration component. Manages state for promotion data, validation results, modal states, loading states, and coordinates all child components. Handles API calls for adding/removing badges and submitting promotion.

**Main Elements:**
- State: `promotion` (PromotionDetailDto), `validationResult` (PromotionValidationResponse), `isAdding`, `isRemoving`, `isSubmitting`, `conflictModal` state
- Memoized computed values: `isDraft`, `canEdit`, `isValid`
- Effect hook to fetch validation status whenever promotion changes
- Handler functions: `handleAddBadges`, `handleRemoveBadge`, `handleSubmit`, `handleDelete`, `handleConflictRetry`

**Handled Events:**
- Add badges (`POST /api/promotions/:id/badges`)
- Remove badge (`DELETE /api/promotions/:id/badges`)
- Submit promotion (`POST /api/promotions/:id/submit`)
- Delete promotion (`DELETE /api/promotions/:id`)

**Validation Conditions:**
- Promotion must be in `draft` status to enable editing
- Submit button disabled unless `validationResult.is_valid === true`
- Badge removal only allowed for draft promotions
- Badge addition must handle conflicts (409 response)

**Types:**
- Props: `PromotionBuilderViewProps { initialPromotion: PromotionDetailDto, userId: string, isAdmin: boolean }`
- State: `PromotionDetailDto | null`, `PromotionValidationResponse | null`, loading booleans, modal state
- Handlers return `Promise<void>`

**Props:** See PromotionBuilderViewProps definition above

---

### BuilderHeader

**Description:** Displays breadcrumb navigation, promotion title (template name), and status badge.

**Main Elements:**
- Breadcrumb: `Home / Promotions / Promotion {id}`
- `h1` with template name
- `StatusBadge` component showing promotion status (draft, submitted, approved, rejected)

**Handled Events:** None (presentational)

**Validation Conditions:** None

**Types:**
- Props: `BuilderHeaderProps { templateName: string, promotionId: string, status: PromotionStatusType }`

**Props:**
- `templateName: string`
- `promotionId: string`
- `status: PromotionStatusType`

---

### PromotionMetadataCard

**Description:** Card component displaying essential promotion metadata including template details, creator information, and status timestamps.

**Main Elements:**
- `Card` wrapper with sections
- Template info: name, path (badge), from_level → to_level
- Creator: display_name, created_at
- Status timestamps: submitted_at, approved_at/rejected_at, review notes (if rejected)

**Handled Events:** None (presentational)

**Validation Conditions:** None (display only)

**Types:**
- Props: `PromotionMetadataCardProps { template: PromotionTemplateDetail, creator: UserSummary, status: PromotionStatusType, createdAt: string, submittedAt: string | null, approvedAt: string | null, rejectedAt: string | null, rejectReason: string | null }`

**Props:**
- `template: PromotionTemplateDetail`
- `creator: UserSummary`
- `status: PromotionStatusType`
- `createdAt: string`
- `submittedAt: string | null`
- `approvedAt: string | null`
- `rejectedAt: string | null`
- `rejectReason: string | null`

---

### EligibilityPreview

**Description:** Displays real-time validation status showing which template requirements are satisfied and which are missing. Updates automatically when badges are added/removed.

**Main Elements:**
- Overall status indicator (✓ Eligible or ✗ Not Eligible)
- List of `RequirementRow` components (one per template rule)
- Each row shows: category badge, level badge, required count, current count, satisfaction status icon

**Handled Events:** None (presentational, receives data from parent)

**Validation Conditions:**
- Displays data from `PromotionValidationResponse`
- Shows red/warning state if `is_valid === false`
- Shows green/success state if `is_valid === true`

**Types:**
- Props: `EligibilityPreviewProps { validationResult: PromotionValidationResponse | null, isLoading: boolean }`

**Props:**
- `validationResult: PromotionValidationResponse | null`
- `isLoading: boolean` (shows skeleton during fetch)

---

### BadgesList

**Description:** Lists all badge applications currently assigned to the promotion. Each item shows badge summary and a remove button (for draft status only).

**Main Elements:**
- Section header: "Assigned Badges ({count})"
- Repeated `BadgeListItem` components
- `EmptyState` when no badges assigned (prompts to add badges)

**Handled Events:**
- Remove badge click (delegates to parent via `onRemoveBadge` prop)

**Validation Conditions:**
- Remove button only shown when `isDraft === true`
- Empty state shows different message based on status (draft vs submitted)

**Types:**
- Props: `BadgesListProps { badges: BadgeApplicationWithBadge[], isDraft: boolean, onRemoveBadge: (badgeId: string) => void }`

**Props:**
- `badges: BadgeApplicationWithBadge[]`
- `isDraft: boolean`
- `onRemoveBadge: (badgeId: string) => void`

---

### BadgeListItem

**Description:** Individual list item for a badge application. Shows catalog badge summary with category/level badges, title, and a remove button.

**Main Elements:**
- `Card` or list row
- Catalog badge icon/visual
- Badge title, category badge, level badge
- Date of fulfillment (formatted)
- Remove button (icon button with trash icon) if `isDraft`

**Handled Events:**
- Click remove button → calls `onRemove(badgeId)`

**Validation Conditions:**
- Remove button disabled during `isRemoving` loading state

**Types:**
- Props: `BadgeListItemProps { badge: BadgeApplicationWithBadge, isDraft: boolean, onRemove: (badgeId: string) => void, isRemoving: boolean }`

**Props:**
- `badge: BadgeApplicationWithBadge`
- `isDraft: boolean`
- `onRemove: (badgeId: string) => void`
- `isRemoving: boolean`

---

### BadgePicker

**Description:** Component (modal or inline section) that allows users to search and select accepted badge applications to add to the promotion. Only shows badges with status `accepted` that are not already in the promotion.

**Main Elements:**
- Search/filter input (filters by title, category, level)
- List of available badges (multi-select checkboxes)
- Selected count indicator
- "Add Selected Badges" button
- Loading spinner during fetch

**Handled Events:**
- Toggle badge selection (checkbox change)
- Search input change (debounced filter)
- Click "Add Selected Badges" → calls `onAddBadges(selectedIds[])`

**Validation Conditions:**
- Only fetch badges with `status === 'accepted'`
- Exclude badge IDs already in promotion
- Add button disabled if no badges selected
- Add button shows loading spinner during `isAdding`

**Types:**
- Props: `BadgePickerProps { existingBadgeIds: string[], onAddBadges: (badgeIds: string[]) => void, isAdding: boolean }`
- Internal state: `availableBadges: BadgeApplicationListItemDto[]`, `selectedIds: string[]`, `searchQuery: string`, `isLoading: boolean`

**Props:**
- `existingBadgeIds: string[]` (to exclude from picker)
- `onAddBadges: (badgeIds: string[]) => void`
- `isAdding: boolean`

---

### ActionBar

**Description:** Sticky footer or action section with primary actions for the promotion (Submit, Delete, Back).

**Main Elements:**
- "Submit for Review" button (primary, disabled unless `isValid`)
- "Delete Draft" button (destructive, secondary, draft only)
- "Back to Promotions" button (neutral)
- Loading indicators on buttons during async actions

**Handled Events:**
- Click "Submit" → calls `onSubmit()` → `POST /api/promotions/:id/submit`
- Click "Delete" → opens confirm modal, then calls `onDelete()` → `DELETE /api/promotions/:id`
- Click "Back" → navigate to `/promotions`

**Validation Conditions:**
- Submit button disabled unless `validationResult.is_valid === true` and `status === 'draft'`
- Delete button only shown for `status === 'draft'`
- Buttons disabled during loading states (`isSubmitting`, `isDeleting`)

**Types:**
- Props: `ActionBarProps { status: PromotionStatusType, isValid: boolean, isSubmitting: boolean, onSubmit: () => void, onDelete: () => void, onBack: () => void, canEdit: boolean }`

**Props:**
- `status: PromotionStatusType`
- `isValid: boolean`
- `isSubmitting: boolean`
- `onSubmit: () => void`
- `onDelete: () => void`
- `onBack: () => void`
- `canEdit: boolean`

---

### ConflictModal

**Description:** Modal dialog that appears when a reservation conflict occurs (HTTP 409 response when adding badges). Displays conflict details and provides options to navigate to the owning promotion or retry after refresh.

**Main Elements:**
- Modal dialog with alert/warning styling
- Conflict message: "Badge already assigned to another promotion"
- Badge application details (which badge conflicted)
- Link to owning promotion: "View Promotion {id}"
- "Refresh & Retry" button
- "Cancel" button

**Handled Events:**
- Click "View Promotion {id}" → navigate to `/promotions/{owningPromotionId}`
- Click "Refresh & Retry" → calls `onRetry()` to refetch promotion and available badges
- Click "Cancel" → close modal

**Validation Conditions:**
- Only shown when `isOpen === true`
- Disabled interaction during retry loading

**Types:**
- Props: `ConflictModalProps { isOpen: boolean, conflictError: ReservationConflictError | null, onRetry: () => void, onClose: () => void, onNavigateToOwner: (promotionId: string) => void }`

**Props:**
- `isOpen: boolean`
- `conflictError: ReservationConflictError | null`
- `onRetry: () => void`
- `onClose: () => void`
- `onNavigateToOwner: (promotionId: string) => void`

---

## 5. Types

### Existing Types (from `@/types`)

**Core DTOs:**
- `PromotionDetailDto` - Full promotion with template, badges, creator
- `PromotionValidationResponse` - Validation result with requirements and missing badges
- `BadgeApplicationWithBadge` - Badge application with catalog badge summary
- `PromotionTemplateDetail` - Template with rules
- `UserSummary` - Creator info
- `ReservationConflictError` - Conflict error with owning promotion ID

**Command Models:**
- `AddPromotionBadgesCommand { badge_application_ids: string[] }`
- `RemovePromotionBadgesCommand { badge_application_ids: string[] }`

**Enums:**
- `PromotionStatusType` - "draft" | "submitted" | "approved" | "rejected"

### New Types to Define

**PromotionBuilderViewProps:**
```typescript
export interface PromotionBuilderViewProps {
  initialPromotion: PromotionDetailDto;
  userId: string;
  isAdmin: boolean;
}
```

**BuilderHeaderProps:**
```typescript
export interface BuilderHeaderProps {
  templateName: string;
  promotionId: string;
  status: PromotionStatusType;
}
```

**PromotionMetadataCardProps:**
```typescript
export interface PromotionMetadataCardProps {
  template: PromotionTemplateDetail;
  creator: UserSummary;
  status: PromotionStatusType;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
}
```

**EligibilityPreviewProps:**
```typescript
export interface EligibilityPreviewProps {
  validationResult: PromotionValidationResponse | null;
  isLoading: boolean;
}
```

**RequirementRowProps:**
```typescript
export interface RequirementRowProps {
  requirement: PromotionRequirement;
}
```

**BadgesListProps:**
```typescript
export interface BadgesListProps {
  badges: BadgeApplicationWithBadge[];
  isDraft: boolean;
  onRemoveBadge: (badgeId: string) => void;
  isRemoving: boolean;
}
```

**BadgeListItemProps:**
```typescript
export interface BadgeListItemProps {
  badge: BadgeApplicationWithBadge;
  isDraft: boolean;
  onRemove: (badgeId: string) => void;
  isRemoving: boolean;
}
```

**BadgePickerProps:**
```typescript
export interface BadgePickerProps {
  userId: string; // to fetch user's accepted badges
  existingBadgeIds: string[];
  onAddBadges: (badgeIds: string[]) => void;
  isAdding: boolean;
}
```

**ActionBarProps:**
```typescript
export interface ActionBarProps {
  status: PromotionStatusType;
  isValid: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onDelete: () => void;
  onBack: () => void;
  canEdit: boolean;
}
```

**ConflictModalProps:**
```typescript
export interface ConflictModalProps {
  isOpen: boolean;
  conflictError: ReservationConflictError | null;
  onRetry: () => void;
  onClose: () => void;
  onNavigateToOwner: (promotionId: string) => void;
}
```

## 6. State Management

### Main Component State (PromotionBuilderView)

**Promotion Data:**
- `promotion: PromotionDetailDto | null` - Current promotion with all details
- Initialized from `initialPromotion` prop
- Updated after successful add/remove/refresh operations

**Validation State:**
- `validationResult: PromotionValidationResponse | null` - Current validation status
- Fetched via `useEffect` whenever `promotion` changes (badge count changes)
- API call: `GET /api/promotions/:id/validation`

**Loading States:**
- `isAdding: boolean` - True during `POST /api/promotions/:id/badges`
- `isRemoving: boolean` - True during `DELETE /api/promotions/:id/badges`
- `isSubmitting: boolean` - True during `POST /api/promotions/:id/submit`
- `isDeleting: boolean` - True during `DELETE /api/promotions/:id`
- `isValidating: boolean` - True during validation fetch

**Modal States:**
- `conflictModal: { isOpen: boolean, error: ReservationConflictError | null }`
- `deleteConfirmModal: { isOpen: boolean }`

**Computed Values (useMemo):**
- `isDraft: boolean` - `promotion.status === 'draft'`
- `canEdit: boolean` - `isDraft && (isOwner || isAdmin)`
- `isValid: boolean` - `validationResult?.is_valid || false`
- `isOwner: boolean` - `promotion.created_by === userId`

### Child Component State

**BadgePicker:**
- `availableBadges: BadgeApplicationListItemDto[]` - Fetched accepted badges
- `selectedIds: string[]` - Currently selected badge IDs for addition
- `searchQuery: string` - Filter query
- `isLoading: boolean` - Fetching available badges

**No Custom Hook Required:** State management is straightforward React state with `useState` and `useEffect`. A custom hook like `usePromotionBuilder` could be extracted for reusability but is not strictly necessary for MVP.

## 7. API Integration

### Endpoints Used

**1. GET /api/promotions/:id** (Initial fetch and refetch after mutations)
- **When:** Server-side initial render, after add/remove badges
- **Request:** Path param `id` (UUID), auth headers
- **Response:** `PromotionDetailDto` (200 OK) or `ApiError` (404, 403, 500)
- **Handling:** Update `promotion` state, show toast on error

**2. GET /api/promotions/:id/validation** (Real-time eligibility check)
- **When:** On mount, after add/remove badges (whenever `promotion` changes)
- **Request:** Path param `id` (UUID)
- **Response:** `PromotionValidationResponse` (200 OK) or `ApiError` (404, 500)
- **Handling:** Update `validationResult` state, enable/disable submit button

**3. POST /api/promotions/:id/badges** (Add badges to promotion)
- **When:** User clicks "Add Selected Badges" in BadgePicker
- **Request:** 
  ```json
  {
    "badge_application_ids": ["uuid1", "uuid2", ...]
  }
  ```
- **Response:** 
  - 200 OK: `{ message: string, added_count: number }`
  - 409 Conflict: `ReservationConflictError` (badge already reserved)
  - 400, 403, 404, 500: `ApiError`
- **Handling:** 
  - Success: Refetch promotion, show toast, clear selection
  - 409: Open ConflictModal with error details
  - Other errors: Show error toast

**4. DELETE /api/promotions/:id/badges** (Remove badges from promotion)
- **When:** User clicks remove button on a badge in BadgesList
- **Request:**
  ```json
  {
    "badge_application_ids": ["uuid1"]
  }
  ```
- **Response:** 200 OK: `{ message: string }` or `ApiError` (400, 403, 404, 500)
- **Handling:** Refetch promotion, show toast

**5. POST /api/promotions/:id/submit** (Submit promotion for review)
- **When:** User clicks "Submit for Review" button
- **Request:** Empty body or `{}` (endpoint doesn't require body)
- **Response:** 200 OK: `{ message: string }` or `ApiError` (400, 403, 409, 500)
- **Handling:** 
  - Success: Redirect to `/promotions` with success toast
  - 409: Show validation error (missing requirements)
  - Other: Show error toast

**6. DELETE /api/promotions/:id** (Delete draft promotion)
- **When:** User confirms delete in ActionBar
- **Request:** Empty body
- **Response:** 200 OK: `{ message: string }` or `ApiError` (403, 404, 500)
- **Handling:** Success → redirect to `/promotions`, error → show toast

**7. GET /api/badge-applications** (Fetch available badges for picker)
- **When:** BadgePicker component mounts
- **Request:** Query params `status=accepted&applicant_id={userId}&limit=100`
- **Response:** `PaginatedResponse<BadgeApplicationListItemDto>` (200 OK) or `ApiError`
- **Handling:** Filter out badges already in promotion, update availableBadges state

## 8. User Interactions

### Adding Badges to Promotion

**Flow:**
1. User clicks "Add Badges" button or section (BadgePicker opens if modal, or inline section expands)
2. BadgePicker fetches accepted badges (`GET /api/badge-applications?status=accepted`)
3. User searches/filters badges, selects multiple via checkboxes
4. User clicks "Add Selected Badges"
5. Frontend calls `POST /api/promotions/:id/badges` with selected IDs
6. **Success:** Promotion refetched, BadgesList updates, validation recalculates, toast shown
7. **Conflict (409):** ConflictModal opens with error details and owning promotion link
8. **Other Error:** Toast with error message, selection retained for retry

**Expected Outcomes:**
- Badges appear in BadgesList
- Eligibility preview updates (requirements progress)
- Submit button enables if validation passes
- Clear user feedback via toasts

### Removing Badges from Promotion

**Flow:**
1. User clicks remove button (trash icon) on a badge in BadgesList
2. Confirm modal may appear (optional, for safety)
3. Frontend calls `DELETE /api/promotions/:id/badges` with badge ID
4. Promotion refetched, badge removed from list, validation recalculates
5. Toast shown: "Badge removed successfully"

**Expected Outcomes:**
- Badge disappears from BadgesList
- Eligibility preview updates (count decreases)
- Submit button may disable if validation no longer passes

### Submitting Promotion

**Flow:**
1. User adds badges until `isValid === true` (submit button enabled)
2. User clicks "Submit for Review"
3. Final validation confirmation (optional modal: "Submit this promotion?")
4. Frontend calls `POST /api/promotions/:id/submit`
5. **Success:** Redirect to `/promotions` with toast "Promotion submitted successfully"
6. **409 (validation failed):** Show error details in toast or modal (missing requirements)
7. **Other Error:** Show error toast, stay on page

**Expected Outcomes:**
- Status changes to `submitted` (if redirect not immediate, UI would update)
- User returns to promotions list with success confirmation
- Promotion becomes read-only

### Deleting Draft Promotion

**Flow:**
1. User clicks "Delete Draft" button in ActionBar
2. Confirm modal opens: "Are you sure you want to delete this promotion draft?"
3. User confirms
4. Frontend calls `DELETE /api/promotions/:id`
5. **Success:** Redirect to `/promotions` with toast "Promotion deleted"
6. **Error:** Show error toast, stay on page

**Expected Outcomes:**
- Promotion removed from database
- Assigned badges released (status reverts to `accepted`)
- User returns to promotions list

### Handling Reservation Conflicts

**Flow:**
1. User attempts to add a badge that's already reserved by another promotion
2. API returns 409 with `ReservationConflictError`
3. ConflictModal opens displaying:
   - "Badge X is already assigned to Promotion Y"
   - Link: "View Promotion Y"
   - Button: "Refresh & Retry"
4. User clicks "View Promotion Y" → navigate to `/promotions/{owningPromotionId}`
5. OR user clicks "Refresh & Retry" → refetch promotion and available badges, retry if desired

**Expected Outcomes:**
- User is clearly informed of conflict
- User can navigate to conflicting promotion to review or unassign badge
- User can refresh and see updated state

## 9. Conditions and Validation

### Component-Level Validations

**PromotionBuilderView:**
- `isDraft` computed: Only allow editing if `status === 'draft'`
- `canEdit` computed: `isDraft && (isOwner || isAdmin)`
- `isValid` computed: `validationResult?.is_valid === true`
- Submit button enabled only when `isDraft && isValid`

**BadgePicker:**
- Filter available badges: `status === 'accepted'` AND `id NOT IN existingBadgeIds`
- Add button disabled if `selectedIds.length === 0`
- Add button disabled during `isAdding` (prevent double submission)

**BadgesList / BadgeListItem:**
- Remove button only shown if `isDraft === true`
- Remove button disabled during `isRemoving`

**ActionBar:**
- Submit button disabled if `!isValid` OR `status !== 'draft'`
- Delete button only shown if `status === 'draft'`
- Buttons show loading spinners when `isSubmitting`, `isDeleting`

### API Conditions Enforced

**POST /api/promotions/:id/badges:**
- Promotion must be in `draft` status (403 if not)
- User must own promotion (403 if not owner)
- Badge applications must exist and have `status === 'accepted'` (400 if not)
- Badges must not be reserved by another promotion (409 if conflict)

**DELETE /api/promotions/:id/badges:**
- Promotion must be in `draft` status (403 if not)
- User must own promotion (403 if not)
- Badge must be assigned to this promotion (404 if not)

**POST /api/promotions/:id/submit:**
- Promotion must be in `draft` status (409 if not)
- Promotion must pass template validation (409 if not valid)
- User must own promotion (403 if not owner)

**DELETE /api/promotions/:id:**
- Promotion must be in `draft` status (403 if not)
- User must own promotion (403 if not)

### UI State Mapping

| Promotion Status | Can Edit Badges | Can Submit | Can Delete | Display Mode |
|------------------|-----------------|------------|------------|--------------|
| `draft`          | ✓ (if owner/admin) | ✓ (if valid) | ✓ (if owner) | Builder |
| `submitted`      | ✗               | ✗          | ✗          | Detail (read-only) |
| `approved`       | ✗               | ✗          | ✗          | Detail (read-only) |
| `rejected`       | ✗               | ✗          | ✗          | Detail (read-only) |

## 10. Error Handling

### HTTP Error Status Codes

**400 Bad Request:**
- **Scenario:** Invalid badge application ID format, invalid request body
- **Handling:** Show toast with validation error message, highlight invalid fields if applicable

**401 Unauthorized:**
- **Scenario:** User session expired or not authenticated
- **Handling:** Redirect to login page with return URL

**403 Forbidden:**
- **Scenario:** User doesn't own promotion, promotion not in draft status
- **Handling:** Show toast with permission error, disable/hide relevant actions, optionally redirect to promotions list

**404 Not Found:**
- **Scenario:** Promotion doesn't exist, badge application not found
- **Handling:** Redirect to promotions list with error toast "Promotion not found"

**409 Conflict:**
- **Scenario 1:** Badge already reserved by another promotion
- **Handling:** Open `ConflictModal` with `ReservationConflictError` details and link to owning promotion
- **Scenario 2:** Promotion validation failed on submit (missing requirements)
- **Handling:** Show validation error modal or toast with missing requirements details

**500 Internal Server Error:**
- **Scenario:** Unexpected server error
- **Handling:** Show generic error toast "Something went wrong. Please try again.", provide retry button

### Client-Side Error Scenarios

**Network Failures:**
- **Scenario:** Request fails due to network issues (timeout, no connection)
- **Handling:** Show toast "Network error. Please check your connection and try again.", enable retry

**Validation Fetch Fails:**
- **Scenario:** `GET /api/promotions/:id/validation` fails
- **Handling:** Disable submit button, show warning banner "Unable to verify eligibility. Please refresh."

**Concurrent Modifications:**
- **Scenario:** Promotion state changed since page load (another user action, admin action)
- **Handling:** Detect via 409 or stale data, show modal "This promotion has been modified. Refresh to see updates." with refresh button

**Partial Failures:**
- **Scenario:** Batch add badges, some succeed but one conflicts
- **Handling:** Show partial success toast "X badges added, Y failed (conflicts).", refetch promotion to show updated state

### UX Principles

1. **Clear Feedback:** Every action (add, remove, submit, delete) provides immediate visual feedback (toast, spinner, state update)
2. **Prevent Data Loss:** Confirm destructive actions (delete draft) with modal
3. **Graceful Degradation:** If validation fetch fails, disable submit but allow user to view/edit
4. **Conflict Resolution:** Provide actionable conflict resolution (link to owning promotion, refresh option)
5. **Loading States:** Show loading spinners on buttons during async operations, disable buttons to prevent double submission
6. **Error Persistence:** Show errors in context (inline for forms, toast for operations, modal for critical conflicts)

## 11. Implementation Steps

### Phase A: Foundation (SSR Page + View Skeleton)

**Step 1:** Create Astro SSR page `src/pages/promotions/[id].astro`
- Validate `id` path parameter (UUID format with Zod)
- Fetch promotion via `GET /api/promotions/:id` server-side
- Pass `initialPromotion`, `userId`, `isAdmin` to React component
- Handle 404 and 403 errors with appropriate error pages

**Step 2:** Create `PromotionBuilderView.tsx` main component skeleton
- Define props interface `PromotionBuilderViewProps`
- Initialize state: `promotion`, `validationResult`, loading states, modal states
- Implement computed values: `isDraft`, `canEdit`, `isValid`, `isOwner`
- Render placeholder sections (header, metadata, badges list, actions)

**Step 3:** Add types to `src/types.ts`
- Define all new component props interfaces (see Section 5)
- Export from `@/types` for reuse

### Phase B: Core UI Components

**Step 4:** Implement `BuilderHeader` component
- Breadcrumb navigation using existing pattern
- Display template name as `h1`
- Render status badge (reuse existing `Badge` component with status colors)

**Step 5:** Implement `PromotionMetadataCard` component
- Use `Card` component from shadcn/ui
- Display template info (path, levels) with badges
- Display creator info and timestamps
- Format dates with `date-fns` or native formatter

**Step 6:** Implement `BadgesList` and `BadgeListItem` components
- Map over `promotion.badge_applications` array
- Display badge summary (title, category, level) using existing badge components
- Add remove button (trash icon) with confirmation
- Show empty state when no badges assigned

### Phase C: Eligibility & Validation

**Step 7:** Implement validation fetch logic in `PromotionBuilderView`
- Add `useEffect` to fetch validation on mount and when `promotion` changes
- Call `GET /api/promotions/:id/validation`
- Update `validationResult` state
- Handle fetch errors gracefully (disable submit, show warning)

**Step 8:** Implement `EligibilityPreview` component
- Display overall eligibility status (checkmark or warning icon)
- Render `RequirementRow` for each requirement in `validationResult.requirements`
- Show progress bars or counts for each requirement (current / required)
- Highlight unsatisfied requirements in red/warning color

**Step 9:** Connect validation to submit button in `ActionBar`
- Implement `ActionBar` component with submit, delete, back buttons
- Disable submit button when `!isValid` or `status !== 'draft'`
- Show loading spinner on submit button during `isSubmitting`

### Phase D: Badge Management Actions

**Step 10:** Implement `BadgePicker` component
- Fetch available badges: `GET /api/badge-applications?status=accepted&applicant_id={userId}`
- Filter out badges already in promotion (compare IDs)
- Implement search/filter input
- Multi-select checkboxes for badge selection
- "Add Selected Badges" button

**Step 11:** Implement `handleAddBadges` in `PromotionBuilderView`
- Call `POST /api/promotions/:id/badges` with selected badge IDs
- Handle 409 conflict → open `ConflictModal`
- Handle success → refetch promotion, show toast, close picker
- Handle other errors → show toast, keep selection for retry

**Step 12:** Implement `handleRemoveBadge` in `PromotionBuilderView`
- Call `DELETE /api/promotions/:id/badges` with badge ID
- Handle success → refetch promotion, show toast
- Handle errors → show toast

### Phase E: Submission & Deletion

**Step 13:** Implement `handleSubmit` in `PromotionBuilderView`
- Optional: Show confirmation modal "Submit this promotion for review?"
- Call `POST /api/promotions/:id/submit`
- Handle success → redirect to `/promotions` with success toast
- Handle 409 validation error → show detailed error modal with missing requirements
- Handle other errors → show error toast

**Step 14:** Implement `handleDelete` in `PromotionBuilderView`
- Show confirmation modal: "Are you sure you want to delete this promotion draft?"
- Call `DELETE /api/promotions/:id`
- Handle success → redirect to `/promotions` with toast
- Handle errors → show error toast

**Step 15:** Implement `ConflictModal` component
- Display conflict error details from `ReservationConflictError`
- Link to owning promotion: `<a href="/promotions/{owningPromotionId}">View Promotion</a>`
- "Refresh & Retry" button → calls `onRetry()` to refetch promotion
- "Cancel" button → closes modal

### Phase F: Polish & Accessibility

**Step 16:** Add loading states and skeletons
- Show skeleton loaders while fetching validation
- Show spinners on buttons during async operations
- Disable interactive elements during loading

**Step 17:** Add keyboard navigation and ARIA attributes
- Ensure all buttons are keyboard accessible (tab, enter, space)
- Add `aria-label` to icon buttons (remove badge, etc.)
- Add `aria-busy` to sections during loading
- Focus management for modals (trap focus, restore on close)

**Step 18:** Error boundary and fallback UI
- Wrap view in error boundary for unexpected React errors
- Provide fallback UI with "Something went wrong" message and retry button

### Phase G: Testing & Validation

**Step 19:** Manual testing of all flows
- Create draft promotion, add badges, submit
- Test remove badges
- Test delete draft
- Test conflict scenario (requires seeding duplicate attempts)
- Test validation UI updates

**Step 20:** Unit tests for critical logic
- Test computed values (`isDraft`, `canEdit`, `isValid`)
- Test error handling in API call handlers
- Test validation fetch effect

**Step 21:** Integration tests (optional for MVP)
- Test full flow from promotion creation to submission
- Test conflict resolution flow
- Test admin view vs owner view differences

### Phase H: Documentation & Cleanup

**Step 22:** Add inline JSDoc comments
- Document component purposes and props
- Document handler functions and their side effects

**Step 23:** Run linter and format code
- Fix any ESLint errors
- Run Prettier or equivalent formatter

**Step 24:** Update README or docs
- Document promotion builder flow for developers
- Note any TODOs or future enhancements

---

## Additional Notes

### Future Enhancements (Out of Scope for MVP)

- Drag-and-drop badge reordering
- Inline badge editing (update date_of_fulfillment)
- Batch badge operations (add all matching criteria)
- Export promotion summary as PDF
- Timeline view of promotion history
- Comments/notes on promotion drafts
- Admin override for validation (emergency approvals)

### Performance Considerations

- Debounce search input in BadgePicker (300ms)
- Memoize computed values with `useMemo` to avoid re-calculation
- Use `useCallback` for handler functions passed to children
- Consider React Query for automatic caching and refetching (future optimization)

### Accessibility Checklist

- ✓ All interactive elements keyboard accessible
- ✓ Focus visible on all focusable elements
- ✓ ARIA labels for icon buttons
- ✓ ARIA live regions for toast notifications
- ✓ Modal focus trap and restore
- ✓ Color contrast meets WCAG AA
- ✓ Semantic HTML structure (headings, lists, sections)

---

**End of Implementation Plan**

