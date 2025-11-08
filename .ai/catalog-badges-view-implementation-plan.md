# View Implementation Plan: Catalog List

## 1. Overview

The Catalog List view is a comprehensive badge catalog management interface that serves two distinct user roles:

**Standard Users (Engineers):**
- Browse and search active badges
- Filter by category and level
- View badge details
- Navigate to badge application form

**Administrators:**
- All standard user capabilities
- Create new catalog badges
- Edit existing badges
- Deactivate badges (soft delete)
- View inactive badges

The view implements server-side rendering (SSR) for initial load performance, with React components providing interactive features such as filtering, searching, sorting, pagination, and admin CRUD operations.

## 2. View Routing

**Primary Route:** `/catalog`

**Query Parameters:**
- `category` - Filter by category (technical, organizational, softskilled)
- `level` - Filter by level (gold, silver, bronze)
- `status` - Filter by status (active, inactive) - admin only
- `q` - Search query (full-text search on title)
- `sort` - Sort field (created_at, title)
- `order` - Sort order (asc, desc)
- `limit` - Page size (default: 20)
- `offset` - Page offset (default: 0)

Example URLs:
- `/catalog` - All active badges
- `/catalog?category=technical&level=gold` - Gold technical badges
- `/catalog?q=PostgreSQL&sort=title&order=asc` - Search results sorted by title
- `/catalog?status=inactive` - Inactive badges (admin only)

## 3. Component Structure

```
CatalogBadgesPage.astro (SSR)
└── CatalogBadgesView (React)
    ├── PageHeader
    │   └── Button ("Create Badge" - admin only)
    ├── FilterBar
    │   ├── CategoryTabs (All, Technical, Organizational, Softskilled)
    │   ├── LevelTabs (All, Gold, Silver, Bronze)
    │   ├── StatusTabs (All, Active, Inactive - admin only)
    │   ├── SearchInput (debounced)
    │   └── SortControls (Buttons + Order toggle)
    ├── BadgeGrid
    │   ├── BadgeCard (multiple)
    │   │   ├── Category badge
    │   │   ├── Level badge
    │   │   ├── Status indicator
    │   │   └── ActionMenu (admin only)
    │   │       ├── Edit button
    │   │       └── Deactivate button
    │   └── EmptyState (when no results)
    ├── Pagination
    └── Modals
        ├── BadgeFormModal
        │   └── BadgeForm
        │       ├── Input (title)
        │       ├── Textarea (description)
        │       ├── CategorySelect
        │       ├── LevelSelect
        │       └── Buttons (Save, Cancel)
        └── ConfirmDeactivateModal
            └── Buttons (Confirm, Cancel)
```

## 4. Component Details

### CatalogBadgesPage.astro

**Component Description:**
Server-side page component that fetches initial data, handles authentication (when enabled), and renders the React view with server-rendered data.

**Main Elements:**
- Layout wrapper with page metadata
- Server-side authentication check (currently disabled)
- Query parameter parsing with defaults
- API call to GET /api/catalog-badges
- Error boundary for server-side errors
- CatalogBadgesView React component hydration

**Handled Events:**
None (SSR component)

**Validation Conditions:**
- Parse URL query parameters
- Validate user authentication (production)
- Check user role for admin features
- Handle missing or malformed query parameters gracefully

**Types:**
- `PaginatedResponse<CatalogBadgeListItemDto>` - Initial data from API
- `ApiError` - Error responses

**Props:**
N/A (Top-level page component)

---

### CatalogBadgesView

**Component Description:**
Main React orchestration component that manages catalog state, filtering, API calls, and user interactions. Delegates rendering to child components.

**Main Elements:**
- PageHeader (title + create button)
- FilterBar (all filter controls)
- BadgeGrid (list of badges or empty state)
- Pagination controls
- Modals (form + confirmation)

**Handled Events:**
- Filter changes (category, level, status, search, sort)
- Pagination (page change)
- Badge selection (view details)
- Create badge (admin)
- Edit badge (admin)
- Deactivate badge (admin)

**Validation Conditions:**
None (delegates to children)

**Types:**
- `CatalogBadgesViewProps` - Component interface
- `CatalogBadgeFilters` - Filter state
- `CatalogBadgeListItemDto[]` - Badge list
- `PaginationMetadata` - Pagination info

**Props:**
```typescript
interface CatalogBadgesViewProps {
  initialData: PaginatedResponse<CatalogBadgeListItemDto>;
  userId: string;
  isAdmin: boolean;
}
```

---

### PageHeader

**Component Description:**
Displays page title, breadcrumb navigation, and conditional "Create Badge" button (admin only).

**Main Elements:**
- Breadcrumb navigation (Home / Catalog)
- Page title heading
- Create Badge button (conditional on `isAdmin`)

**Handled Events:**
- Click on "Create Badge" button → Opens BadgeFormModal in create mode

**Validation Conditions:**
None

**Types:**
- `PageHeaderProps` - Component interface

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  isAdmin: boolean;
  onCreateClick: () => void;
}
```

---

### FilterBar

**Component Description:**
Contains all filtering, searching, and sorting controls. Allows users to refine badge list by multiple criteria simultaneously.

**Main Elements:**
- Category filter tabs (All, Technical, Organizational, Softskilled)
- Level filter tabs (All, Gold, Silver, Bronze)
- Status filter tabs (All, Active, Inactive) - admin only
- Search input with debounce (300ms)
- Sort field buttons (Created Date, Title)
- Sort order toggle (Ascending / Descending)
- Result count display

**Handled Events:**
- Category tab click → Updates category filter, resets offset
- Level tab click → Updates level filter, resets offset
- Status tab click → Updates status filter, resets offset (admin only)
- Search input change → Debounced update of search filter, resets offset
- Sort field click → Updates sort field
- Sort order click → Toggles order (asc ↔ desc)

**Validation Conditions:**
- Conditionally render status filter based on `isAdmin`
- Search query max length: 200 characters
- Debounce search input to avoid excessive API calls

**Types:**
- `FilterBarProps` - Component interface
- `CatalogBadgeFilters` - Filter state

**Props:**
```typescript
interface FilterBarProps {
  filters: CatalogBadgeFilters;
  onFilterChange: (filters: Partial<CatalogBadgeFilters>) => void;
  resultCount: number;
  isAdmin: boolean;
}
```

---

### BadgeGrid

**Component Description:**
Displays grid of badge cards or shows loading/empty states. Responsive grid layout.

**Main Elements:**
- Grid container (CSS Grid or Flex)
- BadgeCard components (multiple)
- Loading skeleton cards (during fetch)
- EmptyState component (no results)

**Handled Events:**
- Badge card click → Navigate to application form or view details
- Edit click (admin) → Opens BadgeFormModal in edit mode
- Deactivate click (admin) → Opens ConfirmDeactivateModal

**Validation Conditions:**
None

**Types:**
- `BadgeGridProps` - Component interface
- `CatalogBadgeListItemDto[]` - Badge list

**Props:**
```typescript
interface BadgeGridProps {
  badges: CatalogBadgeListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  onBadgeClick: (badgeId: string) => void;
  onEditClick: (badge: CatalogBadgeListItemDto) => void;
  onDeactivateClick: (badgeId: string) => void;
}
```

---

### BadgeCard

**Component Description:**
Individual badge display card showing badge information, category/level indicators, status, and admin action menu.

**Main Elements:**
- Badge title (heading)
- Badge description (truncated)
- Category badge (colored indicator)
- Level badge (colored indicator)
- Status indicator (active/inactive)
- Created date
- Version number
- Action menu (admin only) with edit and deactivate options

**Handled Events:**
- Card click → Fires `onBadgeClick` callback
- Edit button click → Fires `onEditClick` callback
- Deactivate button click → Fires `onDeactivateClick` callback

**Validation Conditions:**
- Action menu only visible if `isAdmin` is true
- Deactivate button disabled if badge is already inactive
- Stop propagation on action menu clicks to prevent card click

**Types:**
- `BadgeCardProps` - Component interface
- `CatalogBadgeListItemDto` - Badge data

**Props:**
```typescript
interface BadgeCardProps {
  badge: CatalogBadgeListItemDto;
  isAdmin: boolean;
  onClick: (badgeId: string) => void;
  onEdit: (badge: CatalogBadgeListItemDto) => void;
  onDeactivate: (badgeId: string) => void;
}
```

---

### BadgeFormModal

**Component Description:**
Modal dialog containing form for creating new badges or editing existing ones. Manages form state and validation.

**Main Elements:**
- Modal overlay and dialog
- Form heading (Create/Edit Badge)
- Title input field
- Description textarea
- Category select dropdown
- Level select dropdown
- Metadata input (optional)
- Validation error messages
- Save button (primary)
- Cancel button (secondary)
- Close icon

**Handled Events:**
- Field change → Updates form state, clears field error
- Field blur → Validates individual field
- Form submit → Validates all fields, calls API, closes modal on success
- Cancel click → Closes modal without saving
- Close icon click → Closes modal without saving

**Validation Conditions:**
- **Title:**
  - Required
  - Non-empty string
  - Max 200 characters
  - Show error: "Title is required" or "Title must be 200 characters or less"

- **Description:**
  - Optional
  - Max 2000 characters
  - Show error: "Description must be 2000 characters or less"

- **Category:**
  - Required
  - Must be one of: technical, organizational, softskilled
  - Show error: "Category is required"

- **Level:**
  - Required
  - Must be one of: gold, silver, bronze
  - Show error: "Level is required"

- **Overall Form:**
  - Save button disabled if any validation errors exist
  - Show loading spinner during submission
  - On API error, parse and display field-specific errors from response

**Types:**
- `BadgeFormModalProps` - Component interface
- `BadgeFormData` - Form state
- `CreateCatalogBadgeCommand` - Create payload
- `UpdateCatalogBadgeCommand` - Update payload (edit mode)
- `CatalogBadgeDto` - Response type
- `ApiError` - Error responses with validation details

**Props:**
```typescript
interface BadgeFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  badge?: CatalogBadgeListItemDto; // For edit mode
  onClose: () => void;
  onSuccess: () => void; // Refetch list after save
}

interface BadgeFormData {
  title: string;
  description: string;
  category: BadgeCategoryType | "";
  level: BadgeLevelType | "";
  metadata?: Record<string, unknown>;
}
```

---

### ConfirmDeactivateModal

**Component Description:**
Confirmation dialog for deactivating badges. Shows warning message and requires explicit confirmation.

**Main Elements:**
- Modal overlay and dialog
- Warning icon
- Heading ("Deactivate Badge?")
- Badge title display
- Warning message explaining consequences
- Confirm button (destructive style)
- Cancel button (secondary)

**Handled Events:**
- Confirm click → Calls deactivate API, closes modal, shows success toast
- Cancel click → Closes modal without action
- Escape key → Closes modal without action

**Validation Conditions:**
None

**Types:**
- `ConfirmDeactivateModalProps` - Component interface
- `ApiError` - Error responses

**Props:**
```typescript
interface ConfirmDeactivateModalProps {
  isOpen: boolean;
  badge: CatalogBadgeListItemDto;
  onConfirm: (badgeId: string) => Promise<void>;
  onCancel: () => void;
}
```

---

### Pagination

**Component Description:**
Navigation controls for paginated badge list. Shows current page info and previous/next buttons.

**Main Elements:**
- Result count display ("Showing X to Y of Z badges")
- Previous button (disabled on first page)
- Current page indicator
- Next button (disabled on last page)
- Total pages display

**Handled Events:**
- Previous button click → Decrements offset by limit
- Next button click → Increments offset by limit

**Validation Conditions:**
- Previous button disabled if `offset === 0`
- Next button disabled if `!has_more`

**Types:**
- `PaginationProps` - Component interface
- `PaginationMetadata` - Pagination data

**Props:**
```typescript
interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
}
```

---

### EmptyState

**Component Description:**
Displayed when no badges match current filters or when catalog is empty.

**Main Elements:**
- Icon (empty box or search icon)
- Heading message (context-specific)
- Description text
- Clear Filters button (if filters active)
- Create Badge button (if admin and no filters)

**Handled Events:**
- Clear Filters click → Resets all filters to defaults
- Create Badge click → Opens BadgeFormModal in create mode

**Validation Conditions:**
- Show different messages based on context:
  - With filters: "No badges found matching your filters"
  - Without filters: "No badges in catalog yet"
- Conditionally show Clear Filters button based on `hasFilters`
- Conditionally show Create Badge button based on `isAdmin` and `!hasFilters`

**Types:**
- `EmptyStateProps` - Component interface

**Props:**
```typescript
interface EmptyStateProps {
  hasFilters: boolean;
  isAdmin: boolean;
  onClearFilters: () => void;
  onCreateBadge: () => void;
}
```

## 5. Types

### New Types Required

```typescript
/**
 * Filter state for catalog badges view
 */
export interface CatalogBadgeFilters {
  category?: BadgeCategoryType;
  level?: BadgeLevelType;
  status?: CatalogBadgeStatusType;
  search?: string; // Search query (q parameter)
  sort: "created_at" | "title";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

/**
 * Props for CatalogBadgesView component
 */
export interface CatalogBadgesViewProps {
  initialData: PaginatedResponse<CatalogBadgeListItemDto>;
  userId: string;
  isAdmin: boolean;
}

/**
 * Form data for badge create/edit modal
 */
export interface BadgeFormData {
  title: string;
  description: string;
  category: BadgeCategoryType | "";
  level: BadgeLevelType | "";
  metadata?: Record<string, unknown>;
}

/**
 * Props for BadgeFormModal
 */
export interface BadgeFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  badge?: CatalogBadgeListItemDto;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Props for BadgeCard component
 */
export interface BadgeCardProps {
  badge: CatalogBadgeListItemDto;
  isAdmin: boolean;
  onClick: (badgeId: string) => void;
  onEdit: (badge: CatalogBadgeListItemDto) => void;
  onDeactivate: (badgeId: string) => void;
}

/**
 * Props for FilterBar component
 */
export interface FilterBarProps {
  filters: CatalogBadgeFilters;
  onFilterChange: (filters: Partial<CatalogBadgeFilters>) => void;
  resultCount: number;
  isAdmin: boolean;
}

/**
 * Props for BadgeGrid component
 */
export interface BadgeGridProps {
  badges: CatalogBadgeListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  onBadgeClick: (badgeId: string) => void;
  onEditClick: (badge: CatalogBadgeListItemDto) => void;
  onDeactivateClick: (badgeId: string) => void;
}

/**
 * Props for ConfirmDeactivateModal
 */
export interface ConfirmDeactivateModalProps {
  isOpen: boolean;
  badge: CatalogBadgeListItemDto;
  onConfirm: (badgeId: string) => Promise<void>;
  onCancel: () => void;
}
```

### Existing Types (from types.ts)

The following types are already defined and will be used:

- `BadgeCategoryType` - technical | organizational | softskilled
- `BadgeLevelType` - gold | silver | bronze
- `CatalogBadgeStatusType` - active | inactive
- `CatalogBadgeListItemDto` - Badge list item with all fields
- `CatalogBadgeDto` - Full badge object (for detail/edit)
- `CreateCatalogBadgeCommand` - Badge creation payload
- `UpdateCatalogBadgeCommand` - Badge update payload (optional fields)
- `PaginatedResponse<T>` - Generic pagination wrapper
- `PaginationMetadata` - Pagination info (total, limit, offset, has_more)
- `ApiError` - Standard error response
- `ValidationErrorDetail` - Field-level validation errors

## 6. State Management

### Custom Hook: useCatalogBadges

A custom hook encapsulates all catalog-related state and logic:

```typescript
interface UseCatalogBadgesProps {
  initialData: PaginatedResponse<CatalogBadgeListItemDto>;
  userId: string;
  isAdmin: boolean;
}

interface UseCatalogBadgesReturn {
  badges: CatalogBadgeListItemDto[];
  pagination: PaginationMetadata;
  filters: CatalogBadgeFilters;
  isLoading: boolean;
  error: string | null;

  updateFilters: (filters: Partial<CatalogBadgeFilters>) => void;
  goToPage: (offset: number) => void;
  refetch: () => Promise<void>;
  createBadge: (data: CreateCatalogBadgeCommand) => Promise<void>;
  updateBadge: (id: string, data: UpdateCatalogBadgeCommand) => Promise<void>;
  deactivateBadge: (id: string) => Promise<void>;
}
```

**State Variables:**
- `badges` - Current page of badges
- `pagination` - Pagination metadata from API
- `filters` - Current filter state (synced with URL)
- `isLoading` - Loading indicator for API calls
- `error` - Error message (if any)

**Key Functions:**

1. **updateFilters:**
   - Updates filter state
   - Resets offset to 0 (first page)
   - Updates URL query parameters
   - Triggers refetch

2. **goToPage:**
   - Updates offset in filters
   - Updates URL query parameters
   - Triggers refetch

3. **refetch:**
   - Fetches badges from API with current filters
   - Updates badges and pagination state
   - Handles loading and error states

4. **createBadge:**
   - POSTs to `/api/catalog-badges`
   - Shows success toast
   - Refetches list
   - Throws error on failure

5. **updateBadge:**
   - PUTs to `/api/catalog-badges/:id`
   - Shows success toast
   - Refetches list
   - Throws error on failure

6. **deactivateBadge:**
   - POSTs to `/api/catalog-badges/:id/deactivate`
   - Shows success toast
   - Refetches list
   - Throws error on failure

**URL Synchronization:**
- Use `useEffect` to sync filters with URL query parameters
- Update URL using `window.history.replaceState` (not push, to avoid browser back issues)
- Initialize filters from URL on mount

**Debounce Search:**
- Implement debounce using custom `useDebounce` hook or lodash
- 300ms delay after user stops typing
- Cancel pending debounce on component unmount

## 7. API Integration

### GET /api/catalog-badges

**Request:**
```typescript
// Query parameters from CatalogBadgeFilters
const params = new URLSearchParams();
if (filters.category) params.set('category', filters.category);
if (filters.level) params.set('level', filters.level);
if (filters.status && isAdmin) params.set('status', filters.status);
if (filters.search) params.set('q', filters.search);
params.set('sort', filters.sort);
params.set('order', filters.order);
params.set('limit', filters.limit.toString());
params.set('offset', filters.offset.toString());

const response = await fetch(`/api/catalog-badges?${params.toString()}`);
```

**Response:**
```typescript
const data: PaginatedResponse<CatalogBadgeListItemDto> = await response.json();
```

**Error Handling:**
- 401: Redirect to login
- 403: Show error toast ("Admin access required")
- 400: Show validation errors
- 500: Show generic error message

---

### POST /api/catalog-badges

**Request:**
```typescript
const command: CreateCatalogBadgeCommand = {
  title: formData.title,
  description: formData.description || undefined,
  category: formData.category as BadgeCategoryType,
  level: formData.level as BadgeLevelType,
  metadata: formData.metadata,
};

const response = await fetch('/api/catalog-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(command),
});
```

**Response:**
```typescript
const badge: CatalogBadgeDto = await response.json();
```

**Error Handling:**
- 401: Redirect to login
- 403: Show error toast ("Admin access required")
- 400: Parse validation errors and display field-specific messages
- 500: Show generic error message

---

### PUT /api/catalog-badges/:id

**Request:**
```typescript
const command: UpdateCatalogBadgeCommand = {
  title: formData.title,
  description: formData.description,
  category: formData.category as BadgeCategoryType,
  level: formData.level as BadgeLevelType,
  metadata: formData.metadata,
};

const response = await fetch(`/api/catalog-badges/${badgeId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(command),
});
```

**Response:**
```typescript
const badge: CatalogBadgeDto = await response.json();
```

**Error Handling:**
- 401: Redirect to login
- 403: Show error toast ("Admin access required")
- 404: Show error toast ("Badge not found")
- 400: Parse validation errors and display field-specific messages
- 500: Show generic error message

---

### POST /api/catalog-badges/:id/deactivate

**Request:**
```typescript
const response = await fetch(`/api/catalog-badges/${badgeId}/deactivate`, {
  method: 'POST',
});
```

**Response:**
```typescript
const badge: CatalogBadgeDto = await response.json();
```

**Error Handling:**
- 401: Redirect to login
- 403: Show error toast ("Admin access required")
- 404: Show error toast ("Badge not found")
- 409: Show error toast ("Badge is already inactive")
- 500: Show generic error message

## 8. User Interactions

### Standard User Interactions

**1. Browse Catalog:**
- User navigates to `/catalog`
- Page loads with active badges
- User sees grid of badge cards

**2. Filter by Category:**
- User clicks "Technical" tab
- URL updates to `/catalog?category=technical`
- Badge list refetches and updates
- Only technical badges displayed
- Result count updates

**3. Filter by Level:**
- User clicks "Gold" tab
- URL updates to include `&level=gold`
- Badge list refetches with combined filters
- Only gold badges displayed

**4. Search Badges:**
- User types "PostgreSQL" in search box
- After 300ms debounce, search triggers
- URL updates to include `&q=PostgreSQL`
- Badge list refetches with search term
- Badges matching "PostgreSQL" in title are displayed

**5. Sort Badges:**
- User clicks "Title" sort button
- URL updates to include `sort=title&order=asc`
- Badge list refetches with new sort
- Badges displayed alphabetically by title

**6. Toggle Sort Order:**
- User clicks sort order toggle (↓ → ↑)
- URL updates to `order=desc`
- Badge list refetches
- Badges displayed in reverse order

**7. Pagination:**
- User clicks "Next" button
- URL updates to include `offset=20`
- Badge list refetches next page
- Page indicator updates (e.g., "Page 2 of 5")

**8. View Badge Details / Apply:**
- User clicks on badge card
- Navigates to `/applications/new?badge_id={id}`
- Badge application form opens with pre-selected badge

**9. Clear Filters (Empty State):**
- User has active filters with no results
- EmptyState shows "No badges found" with "Clear Filters" button
- User clicks "Clear Filters"
- All filters reset to defaults
- Full catalog displays

### Admin User Interactions

**10. Create Badge:**
- Admin clicks "Create Badge" button in PageHeader
- BadgeFormModal opens in create mode
- Admin fills in form fields:
  - Title: "Kubernetes Expert"
  - Description: "Demonstrated expertise..."
  - Category: technical
  - Level: gold
- Admin clicks "Save"
- Form validates all fields
- POST request to `/api/catalog-badges`
- Success toast: "Badge created successfully"
- Modal closes
- Badge list refetches
- New badge appears in list

**11. Edit Badge:**
- Admin clicks "Edit" in badge card action menu
- BadgeFormModal opens in edit mode with pre-filled data
- Admin modifies description
- Admin clicks "Save"
- PUT request to `/api/catalog-badges/:id`
- Success toast: "Badge updated successfully"
- Modal closes
- Badge list refetches
- Updated badge displays new information

**12. Deactivate Badge:**
- Admin clicks "Deactivate" in badge card action menu
- ConfirmDeactivateModal opens
- Shows warning: "This badge will no longer be available for new applications"
- Admin clicks "Confirm"
- POST request to `/api/catalog-badges/:id/deactivate`
- Success toast: "Badge deactivated successfully"
- Modal closes
- Badge list refetches
- Badge status updates to "Inactive"
- Badge card shows inactive styling

**13. View Inactive Badges:**
- Admin clicks "Inactive" status tab
- URL updates to include `status=inactive`
- Badge list refetches
- Only inactive badges displayed
- Deactivate button disabled on these badges

**14. Handle Deactivation Conflict:**
- Admin attempts to deactivate badge
- API returns 409 (badge already inactive)
- Error toast: "Badge is already inactive"
- Modal closes
- List refetches to show current state

### Error Scenarios

**15. Validation Error (Create/Edit):**
- Admin submits form with missing title
- API returns 400 with validation details
- Field-specific error displays: "Title is required"
- Save button remains disabled
- Admin corrects error
- Admin resubmits successfully

**16. Network Error:**
- User performs action (filter, search, etc.)
- Network request fails
- Error message displays: "Failed to load badges. Try again."
- Retry button available
- Previous data remains visible

**17. Authentication Expired:**
- User performs action
- API returns 401
- User redirected to login page
- After login, returns to catalog with original filters

## 9. Conditions and Validation

### UI-Level Conditions

**1. Admin-Only Features:**
- **Condition:** `isAdmin === true`
- **Components Affected:**
  - PageHeader: Show "Create Badge" button
  - FilterBar: Show status filter tabs
  - BadgeCard: Show action menu (edit, deactivate)
- **Interface Impact:** Non-admin users never see these elements

**2. Badge Status Restrictions:**
- **Condition:** `badge.status === 'inactive'`
- **Components Affected:**
  - BadgeCard: Deactivate button disabled, shows "Already Inactive"
- **Interface Impact:** Prevents redundant deactivation attempts

**3. Empty State Context:**
- **Condition:** `badges.length === 0 && hasActiveFilters`
- **Components Affected:**
  - EmptyState: Show "No badges found" with "Clear Filters" button
- **Interface Impact:** Provides actionable feedback for empty results

- **Condition:** `badges.length === 0 && !hasActiveFilters && isAdmin`
- **Components Affected:**
  - EmptyState: Show "No badges yet" with "Create Badge" button
- **Interface Impact:** Encourages admin to populate catalog

**4. Pagination Boundaries:**
- **Condition:** `pagination.offset === 0`
- **Components Affected:**
  - Pagination: Disable "Previous" button
- **Interface Impact:** Prevents invalid navigation

- **Condition:** `!pagination.has_more`
- **Components Affected:**
  - Pagination: Disable "Next" button
- **Interface Impact:** Prevents requesting non-existent pages

### Form Validation (BadgeFormModal)

**1. Title Validation:**
- **Required Check:**
  - Condition: `title.trim().length === 0`
  - Error: "Title is required"
  - Trigger: On blur, on submit

- **Length Check:**
  - Condition: `title.length > 200`
  - Error: "Title must be 200 characters or less"
  - Trigger: On change (real-time), on blur

**2. Description Validation:**
- **Length Check:**
  - Condition: `description.length > 2000`
  - Error: "Description must be 2000 characters or less"
  - Trigger: On change (real-time), on blur

**3. Category Validation:**
- **Required Check:**
  - Condition: `category === ""`
  - Error: "Category is required"
  - Trigger: On blur, on submit

**4. Level Validation:**
- **Required Check:**
  - Condition: `level === ""`
  - Error: "Level is required"
  - Trigger: On blur, on submit

**5. Submit Button State:**
- **Enabled When:**
  - All required fields filled
  - No validation errors
  - Not currently submitting
- **Disabled When:**
  - Any validation error exists
  - Missing required fields
  - Form is submitting (shows spinner)

### API-Level Validations

These validations are performed by the backend and mapped to UI errors:

**1. Badge Creation (POST /api/catalog-badges):**
- Title: required, non-empty, max 200 chars
- Description: optional, max 2000 chars
- Category: required, enum (technical, organizational, softskilled)
- Level: required, enum (gold, silver, bronze)

**2. Badge Update (PUT /api/catalog-badges/:id):**
- At least one field must be provided
- Same validation rules as creation for provided fields

**3. Badge Deactivation (POST /api/catalog-badges/:id/deactivate):**
- Badge must exist
- Badge must not already be inactive (409 conflict)

**4. List Filtering (GET /api/catalog-badges):**
- Status filter only allowed for admin users (403 forbidden)
- Search query max 200 characters
- Limit must be between 1 and 100
- Offset must be >= 0

## 10. Error Handling

### API Error Scenarios

**1. Network Failure:**
- **Scenario:** Network request fails, timeout, or no connection
- **Handling:**
  - Show error toast: "Network error. Please check your connection."
  - Keep previous data visible if available
  - Show "Retry" button
  - Log error to console (development)

**2. Authentication Expired (401):**
- **Scenario:** User session expired during operation
- **Handling:**
  - Redirect to `/login` with return URL
  - Store current filters/state in session storage
  - After login, restore state and return to catalog

**3. Forbidden Access (403):**
- **Scenario:** Non-admin tries admin-only operation
- **Handling:**
  - Show error toast: "Admin access required"
  - Don't expose operation was attempted
  - Log security event (production)

**4. Validation Error (400):**
- **Scenario:** Form submission fails backend validation
- **Handling:**
  - Parse `ApiError` with `details` array
  - Map field errors to form fields
  - Display field-specific error messages
  - Focus first invalid field
  - Example: `details: [{ field: "title", message: "Title is required" }]`

**5. Not Found (404):**
- **Scenario:** Badge doesn't exist (deleted or invalid ID)
- **Handling:**
  - Show error toast: "Badge not found"
  - Close any open modals
  - Refetch list to show current state

**6. Conflict (409):**
- **Scenario:** Badge already inactive, concurrent modification
- **Handling:**
  - Parse specific conflict type from response
  - Show contextual error message
  - Example: "Badge is already inactive"
  - Refetch list to show current state

**7. Server Error (500):**
- **Scenario:** Unexpected backend error
- **Handling:**
  - Show error toast: "An unexpected error occurred. Please try again."
  - Log full error details (development)
  - Provide "Contact Support" link (production)

### Form Error Handling

**8. Client-Side Validation Errors:**
- **Scenario:** User enters invalid data in form
- **Handling:**
  - Show inline error messages below fields
  - Disable submit button
  - Clear errors as user corrects fields
  - Use red border/text for error states

**9. Partial Form Submission:**
- **Scenario:** User closes modal during submission
- **Handling:**
  - Cancel in-flight request
  - Don't show success/error messages
  - Preserve form state if reopened

### Edge Cases

**10. Empty Catalog:**
- **Scenario:** No badges in system
- **Handling:**
  - Show EmptyState: "No badges in catalog yet"
  - If admin: Show "Create Badge" button
  - If user: Show helpful message

**11. Search No Results:**
- **Scenario:** Search query returns no matches
- **Handling:**
  - Show EmptyState: "No badges match your search"
  - Show current search term
  - Provide "Clear Search" button

**12. Concurrent Edits:**
- **Scenario:** Two admins edit same badge simultaneously
- **Handling:**
  - Last write wins (backend decides)
  - Show warning toast: "Badge was updated by another user"
  - Refetch to show latest state

**13. Stale Data:**
- **Scenario:** Badge list is outdated
- **Handling:**
  - Implement periodic auto-refresh (optional)
  - Provide manual refresh button
  - Refetch after any mutation (create, edit, deactivate)

**14. Long Running Operation:**
- **Scenario:** API request takes >5 seconds
- **Handling:**
  - Show loading spinner
  - Disable interactive elements
  - Provide "Cancel" option if possible
  - Timeout after 30 seconds with error message

## 11. Implementation Steps

### Phase 1: Foundation (Steps 1-3)

**Step 1: Create Type Definitions**
- Add new types to `src/types.ts`:
  - `CatalogBadgeFilters`
  - `CatalogBadgesViewProps`
  - `BadgeFormData`
  - All component prop interfaces
- Verify no TypeScript errors

**Step 2: Create Astro Page Component**
- Create `src/pages/catalog/index.astro`
- Implement server-side data fetching
- Parse query parameters with defaults
- Handle authentication (currently disabled)
- Fetch initial data from GET /api/catalog-badges
- Pass data to React component
- Handle server-side errors gracefully

**Step 3: Implement useCatalogBadges Hook**
- Create `src/hooks/useCatalogBadges.ts`
- Implement state management (badges, pagination, filters, loading, error)
- Implement URL synchronization with useEffect
- Implement filter update logic (reset offset on filter change)
- Implement pagination navigation
- Implement refetch function with proper error handling
- Implement create, update, deactivate functions
- Add debounce for search filter
- Add toast notifications (using sonner)

### Phase 2: Layout Components (Steps 4-6)

**Step 4: Create CatalogBadgesView Component**
- Create `src/components/catalog-badges/CatalogBadgesView.tsx`
- Integrate useCatalogBadges hook
- Define action handlers (view, edit, deactivate, create)
- Render child components (PageHeader, FilterBar, BadgeGrid, Pagination)
- Manage modal state (form open/close, deactivate confirmation)
- Handle badge selection for edit

**Step 5: Implement PageHeader Component**
- Create `src/components/catalog-badges/PageHeader.tsx`
- Render breadcrumb navigation
- Render page title
- Conditionally render "Create Badge" button (admin only)
- Handle create click event

**Step 6: Implement FilterBar Component**
- Create `src/components/catalog-badges/FilterBar.tsx`
- Implement category tabs using shadcn/ui Tabs
- Implement level tabs
- Implement status tabs (conditional on isAdmin)
- Implement search input with debounce
- Implement sort field buttons
- Implement sort order toggle
- Display result count
- Wire up all filter change handlers

### Phase 3: Badge Display (Steps 7-9)

**Step 7: Create BadgeGrid Component**
- Create `src/components/catalog-badges/BadgeGrid.tsx`
- Implement responsive grid layout (CSS Grid)
- Render BadgeCard for each badge
- Show loading skeletons during fetch
- Show EmptyState when no results
- Wire up event handlers

**Step 8: Implement BadgeCard Component**
- Create `src/components/catalog-badges/BadgeCard.tsx`
- Display badge information (title, description, dates, version)
- Render category and level badges with colors
- Show status indicator
- Implement admin action menu (edit, deactivate)
- Add hover effects and transitions
- Ensure keyboard accessibility
- Handle click events with proper event propagation

**Step 9: Implement EmptyState Component**
- Create `src/components/catalog-badges/EmptyState.tsx`
- Create context-specific messages (no results, no badges, filtered)
- Conditionally render action buttons (Clear Filters, Create Badge)
- Style with appropriate icon and spacing

### Phase 4: CRUD Operations (Steps 10-11)

**Step 10: Implement BadgeFormModal Component**
- Create `src/components/catalog-badges/BadgeFormModal.tsx`
- Set up modal using shadcn/ui Dialog component
- Create form with controlled inputs:
  - Title input
  - Description textarea
  - Category select
  - Level select
- Implement form state management
- Implement field-level validation
- Implement form submission logic
- Handle create vs edit modes
- Display validation errors inline
- Show loading state during submission
- Close modal on success, show toast
- Parse and display API validation errors

**Step 11: Implement ConfirmDeactivateModal Component**
- Create `src/components/catalog-badges/ConfirmDeactivateModal.tsx`
- Set up confirmation dialog using shadcn/ui AlertDialog
- Display badge title and warning message
- Implement confirm handler (calls deactivate API)
- Show loading state during API call
- Close modal on success/error
- Display toast notifications

### Phase 5: Pagination & Polish (Steps 12-14)

**Step 12: Implement Pagination Component**
- Create `src/components/catalog-badges/Pagination.tsx`
- Display result range ("Showing X to Y of Z")
- Implement previous/next buttons
- Display current page indicator
- Calculate and disable buttons at boundaries
- Wire up page change handler

**Step 13: Testing & Error Handling**
- Test all user flows with curl/browser:
  - Browse catalog (standard user)
  - Apply all filters and search
  - Test pagination
  - Create badge (admin)
  - Edit badge (admin)
  - Deactivate badge (admin)
  - View inactive badges (admin)
- Test error scenarios:
  - Network failures
  - Validation errors
  - Permission errors
  - Empty states
- Verify URL synchronization
- Test keyboard navigation
- Verify responsive layout on different screen sizes

**Step 14: Linting & Final Cleanup**
- Run `pnpm lint` and fix all issues
- Run `pnpm prettier` to format code
- Run `pnpm astro check` for TypeScript errors
- Review all components for:
  - Consistent naming
  - Proper accessibility attributes
  - Clear comments
  - No console.log statements
- Test complete user journey one final time
- Commit changes with clear commit message

### Notes on Implementation Order

- Steps are designed to build incrementally from foundation to polish
- Each step should be tested before moving to the next
- Components can be developed in parallel after Step 3 is complete
- Focus on getting basic functionality working before adding polish
- Use placeholder data/mocks if backend isn't ready
- Implement error handling alongside each feature, not as an afterthought
