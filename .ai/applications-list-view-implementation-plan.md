# View Implementation Plan: My Applications (List)

## 1. Overview

The My Applications (List) view provides engineers with a consolidated, filterable list of their badge applications across all statuses (draft, submitted, accepted, rejected, used_in_promotion). This view serves as the central hub for tracking badge application progress, with quick actions for editing drafts, viewing details, and creating new applications. Admin users can view all applications across all users for review purposes.

## 2. View Routing

**Route**: `/applications`

**Access Control**:
- Authenticated users only
- Standard users see only their own applications
- Admin users see all applications and can filter by user

**Query Parameters** (for filtering and pagination):
- `status` - Filter by application status (optional)
- `catalog_badge_id` - Filter by specific catalog badge (optional)
- `sort` - Sort field: `created_at` or `submitted_at` (default: `created_at`)
- `order` - Sort order: `asc` or `desc` (default: `desc`)
- `limit` - Page size (default: 20, max: 100)
- `offset` - Page offset (default: 0)

## 3. Component Structure

```
ApplicationsListPage (Astro SSR)
└── ApplicationsListView (React)
    ├── PageHeader
    │   ├── PageTitle
    │   └── ActionButton ("New Application")
    ├── FilterBar (React)
    │   ├── StatusFilter (dropdown/tabs)
    │   ├── SearchInput (catalog badge search)
    │   └── SortControls (sort field + order)
    ├── ApplicationsList
    │   ├── ApplicationRow (repeating)
    │   │   ├── BadgeSummaryCard
    │   │   ├── StatusBadge
    │   │   ├── DateDisplay
    │   │   └── ActionMenu (edit/view/delete)
    │   └── EmptyState (when no applications)
    └── Pagination
        ├── PageInfo
        ├── PreviousButton
        └── NextButton
```

## 4. Component Details

### ApplicationsListPage (Astro SSR Component)

**Component description**: Server-side page that handles authentication, initial data fetching, and renders the React ApplicationsListView component with server-fetched data.

**Main elements**:
- Layout wrapper
- Authentication check via middleware
- Initial data fetch from `/api/badge-applications`
- Error boundary for 401/500 errors
- Client directive for React component

**Handled interactions**: None (server-side only)

**Handled validation**:
- Authentication check (redirect to login if not authenticated)
- Query parameter sanitization

**Types**:
- `PaginatedResponse<BadgeApplicationListItemDto>`
- `UserDto` (current user from session)

**Props**: N/A (Astro page component)

---

### ApplicationsListView (React Component)

**Component description**: Main interactive component managing the applications list, filters, pagination, and user interactions. Handles client-side filtering and refetching when filter/pagination changes.

**Main elements**:
- Page header with title and "New Application" CTA
- Filter bar with status tabs, search, and sort controls
- Applications list with rows
- Pagination controls at bottom

**Handled interactions**:
- Filter changes trigger refetch with new query parameters
- Pagination clicks update offset and refetch
- Sort changes update URL params and refetch
- "New Application" button navigates to catalog
- Row actions (edit, view, delete) trigger appropriate navigation or modals

**Handled validation**: None (read-only display with filters)

**Types**:
- `ApplicationsListViewProps`
- `ApplicationListFilters`
- `PaginatedResponse<BadgeApplicationListItemDto>`

**Props**:
```typescript
interface ApplicationsListViewProps {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  userId: string;
  isAdmin: boolean;
}
```

---

### PageHeader (React Component)

**Component description**: Displays page title, breadcrumbs, and primary action button ("New Application").

**Main elements**:
- h1 element with page title
- Breadcrumb navigation (Home > Applications)
- Primary action button linking to catalog

**Handled interactions**:
- "New Application" button click navigates to `/catalog`

**Handled validation**: None

**Types**:
- `PageHeaderProps`

**Props**:
```typescript
interface PageHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: React.ReactNode;
}
```

---

### FilterBar (React Component)

**Component description**: Contains all filtering, searching, and sorting controls for the applications list.

**Main elements**:
- Status filter tabs (All, Draft, Submitted, Accepted, Rejected, Used in Promotion)
- Search input for catalog badge title
- Sort dropdown (Created Date, Submitted Date)
- Sort order toggle (Ascending/Descending)

**Handled interactions**:
- Status tab click updates filter and triggers refetch
- Search input (debounced) updates catalog_badge_id filter
- Sort dropdown change updates sort field
- Sort order toggle switches between asc/desc

**Handled validation**: None (filters are optional)

**Types**:
- `FilterBarProps`
- `ApplicationListFilters`
- `BadgeApplicationStatusType`

**Props**:
```typescript
interface FilterBarProps {
  filters: ApplicationListFilters;
  onFilterChange: (filters: Partial<ApplicationListFilters>) => void;
  resultCount: number;
}
```

---

### ApplicationsList (React Component)

**Component description**: Renders the list of badge applications or an empty state if no applications exist.

**Main elements**:
- List container (semantic `<ul>` or table)
- ApplicationRow components (one per application)
- EmptyState component when list is empty
- Loading skeleton during fetch

**Handled interactions**:
- Pass through row-level interactions to ApplicationRow components

**Handled validation**: None

**Types**:
- `ApplicationsListProps`
- `BadgeApplicationListItemDto[]`

**Props**:
```typescript
interface ApplicationsListProps {
  applications: BadgeApplicationListItemDto[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}
```

---

### ApplicationRow (React Component)

**Component description**: Single row displaying badge application summary with status, dates, and actions.

**Main elements**:
- Badge summary card (title, category, level chips)
- Status badge (color-coded by status)
- Date displays (created, submitted if applicable)
- Action menu (3-dot menu or button group)
  - View Details (always)
  - Edit (draft status only, owner only)
  - Delete (draft status only, owner only)

**Handled interactions**:
- Click on row navigates to detail page
- Edit button navigates to edit page (`/applications/:id/edit`)
- Delete button shows confirmation modal, then calls DELETE endpoint

**Handled validation**:
- Show/hide edit action based on status === 'draft' and ownership
- Show/hide delete action based on status === 'draft' and ownership

**Types**:
- `ApplicationRowProps`
- `BadgeApplicationListItemDto`

**Props**:
```typescript
interface ApplicationRowProps {
  application: BadgeApplicationListItemDto;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
  isAdmin: boolean;
}
```

---

### BadgeSummaryCard (React Component)

**Component description**: Displays catalog badge information including title, category, and level badges.

**Main elements**:
- Badge title (linked to catalog detail)
- Category badge/chip (color-coded)
- Level badge/chip (color-coded)

**Handled interactions**:
- Title click navigates to catalog badge detail

**Handled validation**: None

**Types**:
- `BadgeSummaryCardProps`
- `CatalogBadgeSummary`

**Props**:
```typescript
interface BadgeSummaryCardProps {
  badge: CatalogBadgeSummary;
  showLink?: boolean;
}
```

---

### StatusBadge (React Component)

**Component description**: Color-coded status indicator for badge applications.

**Main elements**:
- Badge/chip component with status text
- Icon (optional, based on status)
- Color variants:
  - Draft: gray/neutral
  - Submitted: blue/info
  - Accepted: green/success
  - Rejected: red/error
  - Used in Promotion: purple/special

**Handled interactions**: None

**Handled validation**: None

**Types**:
- `StatusBadgeProps`
- `BadgeApplicationStatusType`

**Props**:
```typescript
interface StatusBadgeProps {
  status: BadgeApplicationStatusType;
  size?: "sm" | "md" | "lg";
}
```

---

### ActionMenu (React Component)

**Component description**: Dropdown menu or button group with context-specific actions for each application.

**Main elements**:
- Trigger button (3-dot icon or "Actions")
- Dropdown menu with:
  - View Details (always visible)
  - Edit (conditional: status === 'draft' && isOwner)
  - Delete (conditional: status === 'draft' && isOwner)

**Handled interactions**:
- View Details: navigate to `/applications/:id`
- Edit: navigate to `/applications/:id/edit`
- Delete: show confirmation dialog, then call DELETE endpoint

**Handled validation**:
- Only show edit/delete for draft applications owned by current user

**Types**:
- `ActionMenuProps`

**Props**:
```typescript
interface ActionMenuProps {
  applicationId: string;
  status: BadgeApplicationStatusType;
  isOwner: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

---

### Pagination (React Component)

**Component description**: Pagination controls for navigating through pages of applications.

**Main elements**:
- Page info (e.g., "Showing 1-20 of 45")
- Previous button (disabled on first page)
- Page numbers (optional, or just prev/next)
- Next button (disabled on last page)

**Handled interactions**:
- Previous/Next buttons update offset and trigger refetch
- Page number clicks jump to specific page

**Handled validation**:
- Disable prev button when offset === 0
- Disable next button when !has_more

**Types**:
- `PaginationProps`
- `PaginationMetadata`

**Props**:
```typescript
interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
}
```

---

### EmptyState (React Component)

**Component description**: Displays when no applications match current filters or user has no applications.

**Main elements**:
- Icon (empty box or search icon)
- Title (e.g., "No applications found")
- Description (context-specific based on filters)
- Call-to-action button (e.g., "Create your first application")

**Handled interactions**:
- CTA button navigates to catalog

**Handled validation**: None

**Types**:
- `EmptyStateProps`

**Props**:
```typescript
interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onCreate?: () => void;
}
```

## 5. Types

### ApplicationListFilters

Filter state for the applications list view.

```typescript
interface ApplicationListFilters {
  status?: BadgeApplicationStatusType;
  catalog_badge_id?: string;
  sort: "created_at" | "submitted_at";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}
```

**Field descriptions**:
- `status` - Filter by specific status (optional, shows all if omitted)
- `catalog_badge_id` - Filter by catalog badge (optional, from search)
- `sort` - Field to sort by (default: created_at)
- `order` - Sort direction (default: desc)
- `limit` - Page size (default: 20)
- `offset` - Pagination offset (default: 0)

### ApplicationsListViewModel

Complete view model passed from Astro to React component.

```typescript
interface ApplicationsListViewModel {
  applications: PaginatedResponse<BadgeApplicationListItemDto>;
  filters: ApplicationListFilters;
  userId: string;
  isAdmin: boolean;
}
```

**Field descriptions**:
- `applications` - Paginated list of badge applications with catalog badge details
- `filters` - Current filter state (from URL params)
- `userId` - Current authenticated user ID
- `isAdmin` - Whether current user has admin privileges

## 6. State Management

### Custom Hook: useApplicationsList

**Purpose**: Manages applications list state, filtering, pagination, and API calls for fetching data.

**Hook Interface**:
```typescript
function useApplicationsList(props: {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  initialFilters: ApplicationListFilters;
  userId: string;
  isAdmin: boolean;
}): {
  applications: BadgeApplicationListItemDto[];
  pagination: PaginationMetadata;
  filters: ApplicationListFilters;
  isLoading: boolean;
  error: string | null;

  updateFilters: (filters: Partial<ApplicationListFilters>) => void;
  goToPage: (offset: number) => void;
  refetch: () => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
}
```

**State Variables**:

1. `applications`: BadgeApplicationListItemDto[] - Current page of applications
2. `pagination`: PaginationMetadata - Pagination info (total, limit, offset, has_more)
3. `filters`: ApplicationListFilters - Current filter state
4. `isLoading`: boolean - Whether data is being fetched
5. `error`: string | null - Error message if fetch failed

**Hook Behavior**:

- **Initialization**: Starts with `initialData` and `initialFilters` from server
- **Filter Updates**:
  - Resets offset to 0 when filters change
  - Updates URL query parameters
  - Triggers refetch with new filters
- **Pagination**: Updates offset and triggers refetch
- **Refetch**: Calls GET `/api/badge-applications` with current filters
- **Delete**: Calls DELETE `/api/badge-applications/:id`, then refetches list

**URL Sync**:
```typescript
// Update URL when filters change (use Next.js router or window.history)
useEffect(() => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.catalog_badge_id) params.set('catalog_badge_id', filters.catalog_badge_id);
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  params.set('limit', filters.limit.toString());
  params.set('offset', filters.offset.toString());

  const newUrl = `/applications?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}, [filters]);
```

## 7. API Integration

### Endpoint: GET /api/badge-applications

**When**: Page load (SSR), filter changes, pagination, after delete

**Request**: Query parameters from `ApplicationListFilters`

**Query Parameters**:
- `status` (string, optional) - Filter by status
- `applicant_id` (UUID, optional, admin only) - Filter by applicant
- `catalog_badge_id` (UUID, optional) - Filter by catalog badge
- `sort` (string, optional) - Sort field (default: created_at)
- `order` (string, optional) - Sort order (default: desc)
- `limit` (number, optional) - Page size (default: 20, max: 100)
- `offset` (number, optional) - Page offset (default: 0)

**Response**: `PaginatedResponse<BadgeApplicationListItemDto>`

```typescript
{
  data: [
    {
      id: string;
      applicant_id: string;
      catalog_badge_id: string;
      catalog_badge_version: number;
      date_of_application: string;
      date_of_fulfillment: string | null;
      reason: string | null;
      status: BadgeApplicationStatusType;
      submitted_at: string | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
      review_reason: string | null;
      created_at: string;
      updated_at: string;
      catalog_badge: {
        id: string;
        title: string;
        category: BadgeCategoryType;
        level: BadgeLevelType;
      }
    }
  ],
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }
}
```

**Error Handling**:
- 401: Redirect to login
- 400: Display validation errors (invalid query params)
- 500: Show error toast, allow retry

---

### Endpoint: DELETE /api/badge-applications/:id

**When**: User clicks delete in action menu and confirms

**Request**: None (path parameter only)

**Response**: 200 OK with success message

**Success Actions**:
- Show success toast: "Application deleted successfully"
- Refetch applications list
- If deleted item was last on page and page > 0, go to previous page

**Error Handling**:
- 401: Redirect to login
- 403: Show error toast "You don't have permission to delete this application"
- 404: Show error toast "Application not found", refetch list
- 409: Show error toast "Only draft applications can be deleted"

## 8. User Interactions

### Initial Page Load

1. User navigates to `/applications` (via nav menu or direct URL)
2. Astro page loads, checks authentication
3. Fetches applications via GET `/api/badge-applications` with default filters
4. Renders ApplicationsListView with initial data
5. User sees paginated list of their applications

### Filtering by Status

1. User clicks status tab (e.g., "Submitted")
2. `updateFilters({ status: 'submitted', offset: 0 })` called
3. URL updates to `/applications?status=submitted&offset=0&...`
4. API refetch with new status filter
5. List updates to show only submitted applications
6. Active tab highlights selected status

### Searching by Badge

1. User types in search input (debounced 500ms)
2. Search triggers catalog badge lookup (future: autocomplete)
3. `updateFilters({ catalog_badge_id: 'uuid', offset: 0 })` called
4. API refetch with catalog_badge_id filter
5. List shows applications for that specific badge
6. Search input shows selected badge name

### Sorting

1. User selects sort field from dropdown (e.g., "Submitted Date")
2. `updateFilters({ sort: 'submitted_at' })` called
3. User toggles sort order (asc/desc)
4. `updateFilters({ order: 'asc' })` called
5. API refetch with new sort parameters
6. List re-renders in new sort order

### Pagination

1. User clicks "Next" button
2. `goToPage(currentOffset + limit)` called
3. URL updates with new offset
4. API refetch with new offset
5. List shows next page of results
6. "Previous" button becomes enabled

### Viewing Application Details

1. User clicks on application row or "View" action
2. Navigate to `/applications/:id`
3. Detail view loads (separate view, not in scope for this plan)

### Editing Draft Application

1. User clicks "Edit" action on draft application
2. Navigate to `/applications/:id/edit`
3. Application editor loads (already implemented)

### Deleting Draft Application

1. User clicks "Delete" action on draft application
2. Confirmation modal appears: "Delete this draft application? This action cannot be undone."
3. User confirms
4. DELETE `/api/badge-applications/:id` called
5. On success:
   - Show success toast
   - Refetch applications list
   - If last item on page, go to previous page
6. On error:
   - Show error toast with specific message
   - List remains unchanged

### Creating New Application

1. User clicks "New Application" button in page header
2. Navigate to `/catalog`
3. User selects badge and proceeds to application editor

## 9. Conditions and Validation

### Display Conditions

#### Edit Action Visibility
**Condition**: `status === 'draft' && isOwner`

**Where**: ApplicationRow, ActionMenu

**UI Effect**: Edit action only shown for draft applications owned by current user

**Validation**:
```typescript
const canEdit = application.status === 'draft' && application.applicant_id === userId;
```

---

#### Delete Action Visibility
**Condition**: `status === 'draft' && isOwner`

**Where**: ApplicationRow, ActionMenu

**UI Effect**: Delete action only shown for draft applications owned by current user

**Validation**:
```typescript
const canDelete = application.status === 'draft' && application.applicant_id === userId;
```

---

#### Admin View All
**Condition**: `isAdmin === true`

**Where**: ApplicationsListView (data fetching)

**UI Effect**:
- Admins see all applications across all users
- Additional filter for selecting specific user (admin only)
- No automatic filtering by applicant_id

**Validation**: Server-side enforced by API endpoint

---

#### Empty State Variant
**Condition**: Based on whether filters are applied

**Where**: EmptyState component

**UI Effect**:
- No filters + no applications: "You haven't created any badge applications yet. Start by browsing the catalog."
- Filters applied + no results: "No applications match your filters. Try adjusting your search."

**Validation**:
```typescript
const hasFilters = !!(filters.status || filters.catalog_badge_id);
```

## 10. Error Handling

### Network Errors

**Scenario**: Request fails due to network issues (timeout, offline, etc.)

**Handling**:
- Show error banner at top of page: "Unable to load applications. Check your connection."
- Display retry button
- Keep existing data visible (don't clear list)
- Log error to console

**User Actions**:
- Click retry button to refetch
- Or wait for automatic retry (exponential backoff)

---

### Unauthorized (401)

**Scenario**: User session expired or not authenticated

**Handling**:
- Save current URL to sessionStorage (for return after login)
- Redirect to login page: `/login?return=/applications?...`

**User Actions**:
- Re-authenticate
- Return to applications list with filters preserved

---

### Forbidden (403)

**Scenario**: User attempts to delete application they don't own, or non-admin tries to view all applications

**Handling**:
- Show error toast: "You don't have permission for this action"
- Don't modify current state
- Log error for debugging

**User Actions**:
- None (action blocked)

---

### Not Found (404)

**Scenario**: Application not found when trying to delete (race condition, already deleted)

**Handling**:
- Show info toast: "Application no longer exists"
- Refetch list to update UI
- Remove stale item from local state

**User Actions**:
- Continue browsing updated list

---

### Conflict (409)

**Scenario**: Attempt to delete non-draft application

**Handling**:
- Show error toast: "Only draft applications can be deleted. This application has status: {current_status}"
- Refetch list to ensure status is current

**User Actions**:
- View updated application status
- Cannot delete (action blocked)

---

### Validation Errors (400)

**Scenario**: Invalid query parameters (e.g., invalid status value)

**Handling**:
- Show error toast with specific validation message
- Reset to default filters
- Refetch with valid parameters

**User Actions**:
- Adjust filters to valid values
- Or clear all filters to reset

---

### Server Error (500)

**Scenario**: Unexpected server error during fetch

**Handling**:
- Show error banner: "Something went wrong. Please try again."
- Provide retry button
- Log full error for debugging
- Keep existing data visible if available

**User Actions**:
- Click retry button
- Or refresh page
- Or contact support if persistent

## 11. Implementation Steps

### Step 1: Create Astro Page Component

**File**: `src/pages/applications/index.astro`

1. Add authentication middleware check
2. Parse query parameters and build filter object
3. Fetch applications via GET `/api/badge-applications` with filters
4. Handle errors (401, 500)
5. Pass data to ApplicationsListView React component
6. Add client directive: `client:load`

**Checklist**:
- [ ] Authentication check with redirect
- [ ] Query parameter parsing with defaults
- [ ] API call with error handling
- [ ] Component import and props passing

---

### Step 2: Create Type Definitions

**File**: `src/types.ts` (or separate view-model file)

1. Add `ApplicationListFilters` interface
2. Add `ApplicationsListViewModel` interface
3. Add all component Props interfaces:
   - `ApplicationsListViewProps`
   - `PageHeaderProps`
   - `FilterBarProps`
   - `ApplicationsListProps`
   - `ApplicationRowProps`
   - `BadgeSummaryCardProps`
   - `StatusBadgeProps`
   - `ActionMenuProps`
   - `PaginationProps`
   - `EmptyStateProps`

**Checklist**:
- [ ] All types defined with JSDoc
- [ ] Export all public interfaces
- [ ] Ensure type safety with existing DTOs

---

### Step 3: Implement useApplicationsList Hook

**File**: `src/hooks/useApplicationsList.ts`

1. Set up state variables (applications, pagination, filters, loading, error)
2. Implement `updateFilters` function with URL sync
3. Implement `goToPage` function
4. Implement `refetch` function (calls API with current filters)
5. Implement `deleteApplication` function
6. Handle API errors and update state
7. Return hook interface

**Checklist**:
- [ ] State initialization from props
- [ ] Filter updates with debouncing for search
- [ ] URL synchronization
- [ ] API call error handling
- [ ] Delete with confirmation

---

### Step 4: Create Reusable UI Components

**Files**:
- `src/components/ui/badge.tsx` (if not exists from shadcn/ui)
- `src/components/ui/dropdown-menu.tsx` (if not exists from shadcn/ui)

1. Install/configure shadcn/ui components if needed
2. Create custom StatusBadge with color variants
3. Test components in isolation

**Checklist**:
- [ ] Badge component with status variants
- [ ] Dropdown menu for actions
- [ ] Consistent with design system

---

### Step 5: Implement ApplicationsListView Component

**File**: `src/components/badge-applications/ApplicationsListView.tsx`

1. Create main component with props interface
2. Initialize useApplicationsList hook
3. Implement layout structure
4. Connect PageHeader with "New Application" action
5. Connect FilterBar with filter state
6. Connect ApplicationsList with data and handlers
7. Connect Pagination with pagination state
8. Handle loading and error states

**Checklist**:
- [ ] Hook integration
- [ ] All child components rendered
- [ ] Loading skeleton during fetch
- [ ] Error display with retry

---

### Step 6: Implement Child Components (Part 1)

**PageHeader** (`src/components/badge-applications/PageHeader.tsx`):
1. Create component with title and action button
2. Add breadcrumbs
3. Style with Tailwind

**FilterBar** (`src/components/badge-applications/FilterBar.tsx`):
1. Create status tabs (All, Draft, Submitted, etc.)
2. Add search input with debounce
3. Add sort dropdown and order toggle
4. Wire up to onChange handlers from props
5. Display result count

**Checklist**:
- [ ] PageHeader with breadcrumbs
- [ ] FilterBar with all controls
- [ ] Proper event handling
- [ ] Accessible form controls

---

### Step 7: Implement Child Components (Part 2)

**ApplicationsList** (`src/components/badge-applications/ApplicationsList.tsx`):
1. Create list container
2. Map through applications and render ApplicationRow
3. Show EmptyState when no applications
4. Show loading skeleton

**ApplicationRow** (`src/components/badge-applications/ApplicationRow.tsx`):
1. Create row layout with badge summary, status, dates
2. Add ActionMenu component
3. Wire up click handlers
4. Conditional rendering of edit/delete actions

**Checklist**:
- [ ] List with semantic HTML
- [ ] Row with proper data display
- [ ] Conditional action visibility
- [ ] Click handlers connected

---

### Step 8: Implement Child Components (Part 3)

**BadgeSummaryCard** (`src/components/badge-applications/BadgeSummaryCard.tsx`):
1. Display badge title with optional link
2. Show category and level badges
3. Style with Tailwind

**StatusBadge** (`src/components/badge-applications/StatusBadge.tsx`):
1. Create badge component with status text
2. Add color variants for each status
3. Optional icon support

**ActionMenu** (`src/components/badge-applications/ActionMenu.tsx`):
1. Create dropdown menu with shadcn/ui
2. Add View, Edit, Delete actions
3. Conditional rendering based on status and ownership
4. Wire up click handlers

**Checklist**:
- [ ] BadgeSummaryCard with chips
- [ ] StatusBadge with color variants
- [ ] ActionMenu with conditional actions

---

### Step 9: Implement Pagination and Empty State

**Pagination** (`src/components/badge-applications/Pagination.tsx`):
1. Create pagination controls
2. Show page info (X-Y of Z)
3. Previous/Next buttons with disabled states
4. Wire up to onPageChange handler

**EmptyState** (`src/components/badge-applications/EmptyState.tsx`):
1. Create empty state with icon and message
2. Conditional messaging based on filters
3. CTA button to create new application or clear filters

**Checklist**:
- [ ] Pagination with disabled states
- [ ] EmptyState with conditional messaging
- [ ] Accessible controls

---

### Step 10: Add API Integration Functions

**File**: `src/lib/api/badge-applications-api.ts` (if not exists, or add to existing)

1. Create `getApplicationsList(filters: ApplicationListFilters)` function
2. Handle API responses and errors
3. Use Supabase client or fetch API

**Checklist**:
- [ ] API function with typed filters
- [ ] Error handling
- [ ] Response type checking

---

### Step 11: Implement Delete Functionality

1. Add delete confirmation modal (use shadcn/ui Dialog)
2. Implement deleteApplication in hook
3. Handle success (refetch, toast) and errors
4. Update UI optimistically (remove from list before refetch)

**Checklist**:
- [ ] Confirmation dialog
- [ ] API call to DELETE endpoint
- [ ] Success/error toast
- [ ] List update after delete

---

### Step 12: Add Error Handling

1. Add error toast system (if not exists)
2. Implement error boundaries for React components
3. Add error state handling in hook
4. Map API errors to user-friendly messages
5. Add retry logic for network errors

**Checklist**:
- [ ] Error toast component
- [ ] Error boundaries
- [ ] Retry functionality
- [ ] User-friendly error messages

---

### Step 13: Add Accessibility Features

1. Add ARIA labels to all interactive elements
2. Add ARIA live regions for list updates
3. Ensure keyboard navigation works (Tab order, Enter/Space)
4. Add focus management (focus first item after filter)
5. Add screen reader announcements for actions
6. Test with screen reader

**Checklist**:
- [ ] ARIA labels on buttons/links
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Screen reader testing

---

### Step 14: Styling and Responsive Design

1. Apply Tailwind CSS classes following project patterns
2. Ensure shadcn/ui components styled consistently
3. Test responsive layout (mobile, tablet, desktop)
4. Add loading skeletons for data fetching
5. Style status badges with proper colors
6. Ensure table/list is readable on mobile

**Checklist**:
- [ ] Tailwind styling applied
- [ ] Responsive design (mobile-first)
- [ ] Loading states
- [ ] Consistent with design system

---

### Step 15: Testing

1. Test initial page load with various filter states
2. Test filtering by status
3. Test searching by catalog badge
4. Test sorting (both fields and orders)
5. Test pagination (next, prev, edge cases)
6. Test delete functionality (confirmation, success, errors)
7. Test error scenarios (401, 403, 404, 409, 500)
8. Test with empty state (no applications)
9. Test with long lists (100+ items)
10. Test admin view (see all applications)

**Checklist**:
- [ ] All filter combinations
- [ ] Pagination edge cases
- [ ] Delete workflow
- [ ] Error handling
- [ ] Admin vs user views
- [ ] Empty and loading states
- [ ] Performance with large lists

---

### Step 16: Integration Testing

1. Test navigation from dashboard to applications list
2. Test navigation from list to detail view
3. Test navigation from list to edit view
4. Test "New Application" flow (list → catalog → editor)
5. Test back navigation (browser back button)
6. Test URL sharing (copy URL with filters, open in new tab)

**Checklist**:
- [ ] All navigation paths
- [ ] URL persistence
- [ ] Browser back/forward
- [ ] Deep linking with filters

---

### Step 17: Performance Optimization

1. Review and optimize re-renders
2. Memoize expensive computations
3. Debounce search input (500ms)
4. Add loading states and skeletons
5. Consider virtual scrolling for large lists (optional)
6. Test performance with slow network (throttle in DevTools)

**Checklist**:
- [ ] No unnecessary re-renders
- [ ] Debounced search
- [ ] Loading skeletons
- [ ] Performance with slow network

---

### Step 18: Documentation

1. Add JSDoc comments to components and functions
2. Document props interfaces
3. Add usage examples in component files
4. Update project documentation with new routes

**Checklist**:
- [ ] JSDoc on all exports
- [ ] Props documentation
- [ ] Usage examples
- [ ] Route documentation
