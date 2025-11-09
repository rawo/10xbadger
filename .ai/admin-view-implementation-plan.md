# View Implementation Plan: Admin Review Queue

## 1. Overview

The Admin Review Queue view provides administrators with a dedicated interface to review and process submitted badge applications. This view is admin-only and displays a filterable, sortable list of badge applications awaiting review (submitted status) as well as previously reviewed applications (accepted/rejected). Admins can quickly accept or reject applications with optional decision notes, view full application details, and track review metrics.

This view serves as the central hub for administrative review workflows, replacing manual Excel-based tracking with a streamlined, efficient interface that integrates with the badge application lifecycle.

## 2. View Routing

**Route**: `/admin/review`

**Access Control**:
- Admin users only (enforced by route guard and middleware)
- Non-admin users attempting to access this route should receive 403 Forbidden
- Unauthenticated users should be redirected to login

**Query Parameters** (for filtering and pagination):
- `status` - Filter by application status (default: `submitted`, options: `submitted`, `accepted`, `rejected`, or empty for all)
- `applicant_id` - Filter by specific applicant (optional, UUID)
- `catalog_badge_id` - Filter by specific catalog badge (optional, UUID)
- `sort` - Sort field: `submitted_at` or `created_at` (default: `submitted_at`)
- `order` - Sort order: `asc` or `desc` (default: `desc`, newest first)
- `limit` - Page size (default: 20, max: 100)
- `offset` - Page offset (default: 0)

## 3. Component Structure

```
AdminReviewPage (Astro SSR)
└── AdminReviewView (React)
    ├── PageHeader
    │   ├── PageTitle ("Badge Application Review Queue")
    │   └── ReviewMetrics (counts of pending/accepted/rejected)
    ├── FilterBar
    │   ├── StatusTabs (All / Submitted / Accepted / Rejected)
    │   ├── ApplicantFilter (searchable dropdown)
    │   ├── BadgeFilter (searchable dropdown)
    │   └── SortControls (sort field + order)
    ├── ReviewList
    │   ├── ReviewRow (repeating)
    │   │   ├── ApplicantInfo (name, email)
    │   │   ├── BadgeSummary (badge title, category, level)
    │   │   ├── ApplicationMeta (submitted date, reason preview)
    │   │   ├── StatusBadge (submitted/accepted/rejected)
    │   │   └── ReviewActions
    │   │       ├── ViewDetailsButton
    │   │       ├── AcceptButton (submitted only)
    │   │       └── RejectButton (submitted only)
    │   └── EmptyState (when no applications)
    └── Pagination
        ├── PageInfo
        ├── PreviousButton
        └── NextButton

Modals:
├── ReviewModal (accept/reject confirmation with note field)
└── ApplicationDetailModal (quick view without navigation)
```

## 4. Component Details

### AdminReviewPage (Astro SSR Component)

**Component description**: Server-side page that handles admin authentication, authorization check, initial data fetching, and renders the React AdminReviewView component with server-fetched data.

**Main elements**:
- Layout wrapper with admin-specific styles
- Admin authentication and authorization check via middleware
- Initial data fetch from `/api/badge-applications` with admin filters
- Error boundary for 401/403/500 errors
- Client directive for React component

**Handled interactions**: None (server-side only)

**Handled validation**:
- Authentication check (redirect to login if not authenticated)
- Admin role check (return 403 if not admin)
- Query parameter sanitization and validation

**Types**:
- `PaginatedResponse<BadgeApplicationListItemDto>`
- `UserDto` (current admin user from session)
- `AdminReviewMetrics` (aggregated counts)

**Props**: N/A (Astro page component)

---

### AdminReviewView (React Component)

**Component description**: Main interactive component managing the admin review queue, filters, pagination, and review actions. Handles client-side state management for filtering, quick review actions (accept/reject), and modal interactions.

**Main elements**:
- Page header with title and review metrics (pending count badge)
- Filter bar with status tabs, applicant/badge filters, and sort controls
- Review list with rows showing applicant info, badge details, and action buttons
- Pagination controls at bottom
- Review modal for accept/reject confirmation

**Handled interactions**:
- Filter changes trigger refetch with new query parameters
- Status tab clicks filter by status
- Pagination clicks update offset and refetch
- Sort changes update URL params and refetch
- Accept button opens confirmation modal, then calls accept API
- Reject button opens confirmation modal with required note, then calls reject API
- View Details opens application detail modal or navigates to detail page
- Row click (optional) navigates to full application detail page

**Handled validation**:
- Admin role check (should be enforced server-side, component assumes admin)
- Status validation for showing accept/reject buttons (only for submitted status)
- Decision note validation for reject action (optional for accept, encouraged for reject)

**Types**:
- `AdminReviewViewProps`
- `AdminReviewFilters`
- `PaginatedResponse<BadgeApplicationListItemDto>`
- `AdminReviewMetrics`

**Props**:
```typescript
interface AdminReviewViewProps {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  initialMetrics: AdminReviewMetrics;
  adminUserId: string;
}
```

---

### PageHeader (React Component)

**Component description**: Displays page title, breadcrumbs, and review metrics showing counts of applications by status.

**Main elements**:
- h1 element with page title ("Badge Application Review Queue")
- Breadcrumb navigation (Home > Admin > Review)
- Review metrics cards showing:
  - Pending Review (submitted count with warning badge if > threshold)
  - Accepted Today (accepted count from today)
  - Rejected Today (rejected count from today)

**Handled interactions**:
- Metrics cards can be clicked to filter by that status
- Breadcrumb links navigate to parent pages

**Handled validation**: None

**Types**:
- `AdminPageHeaderProps`
- `AdminReviewMetrics`

**Props**:
```typescript
interface AdminPageHeaderProps {
  title: string;
  metrics: AdminReviewMetrics;
  onMetricClick?: (status: BadgeApplicationStatusType) => void;
}
```

---

### FilterBar (React Component)

**Component description**: Contains all filtering, searching, and sorting controls for the admin review queue.

**Main elements**:
- Status filter tabs (All, Submitted, Accepted, Rejected)
- Applicant filter (searchable combobox with user autocomplete)
- Badge filter (searchable combobox with catalog badge autocomplete)
- Sort dropdown (Submitted Date, Created Date)
- Sort order toggle button (Ascending/Descending icon)
- Clear filters button (shown when any filter is active)

**Handled interactions**:
- Status tab click updates status filter and resets offset
- Applicant search (debounced 300ms) shows matching users, selection updates applicant_id filter
- Badge search (debounced 300ms) shows matching catalog badges, selection updates catalog_badge_id filter
- Sort dropdown change updates sort field
- Sort order toggle switches between asc/desc
- Clear filters button resets all filters to defaults

**Handled validation**: 
- Ensure filter values are valid before applying
- Debounce search inputs to avoid excessive API calls
- Validate UUIDs for applicant_id and catalog_badge_id filters

**Types**:
- `AdminFilterBarProps`
- `AdminReviewFilters`
- `BadgeApplicationStatusType`

**Props**:
```typescript
interface AdminFilterBarProps {
  filters: AdminReviewFilters;
  onFilterChange: (filters: Partial<AdminReviewFilters>) => void;
  resultCount: number;
  hasActiveFilters: boolean;
}
```

---

### ReviewList (React Component)

**Component description**: Renders the list of badge applications in the review queue or an empty state if no applications exist.

**Main elements**:
- Table or list container (semantic `<table>` or `<ul>`)
- Table headers (Applicant, Badge, Submitted, Status, Actions) if using table layout
- ReviewRow components (one per application)
- EmptyState component when list is empty
- Loading skeleton during fetch

**Handled interactions**:
- Pass through row-level interactions to ReviewRow components
- Handle bulk selection (future enhancement, not in MVP)

**Handled validation**: None

**Types**:
- `ReviewListProps`
- `BadgeApplicationListItemDto[]`

**Props**:
```typescript
interface ReviewListProps {
  applications: BadgeApplicationListItemDto[];
  isLoading?: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
  adminUserId: string;
}
```

---

### ReviewRow (React Component)

**Component description**: Single row displaying badge application summary with applicant info, badge details, submission date, status, and admin action buttons.

**Main elements**:
- Applicant info section:
  - Avatar (initials or icon)
  - Display name
  - Email (smaller text)
- Badge summary section:
  - Badge title (linked to catalog)
  - Category badge
  - Level badge
- Application meta section:
  - Submitted date (relative time, e.g., "2 days ago")
  - Reason preview (truncated, shows first 100 chars)
  - "View more" link
- Status badge (color-coded)
- Action buttons (conditional based on status):
  - View Details (always visible)
  - Accept (green button, submitted status only)
  - Reject (red button, submitted status only)

**Handled interactions**:
- Click on row (outside of buttons) navigates to application detail page
- Accept button click triggers onAccept callback with application ID
- Reject button click triggers onReject callback with application ID
- View Details button navigates to full application detail page or opens modal
- Badge title click navigates to catalog badge detail

**Handled validation**:
- Show accept/reject buttons only for status === 'submitted'
- Disable action buttons during API call (loading state)
- Show visual feedback on button hover/focus

**Types**:
- `ReviewRowProps`
- `BadgeApplicationListItemDto`

**Props**:
```typescript
interface ReviewRowProps {
  application: BadgeApplicationListItemDto;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
  isProcessing?: boolean; // true during accept/reject API call
}
```

---

### ReviewActions (React Component)

**Component description**: Action button group for admin review decisions (accept/reject) and view details.

**Main elements**:
- View Details button (secondary style, always visible)
- Accept button (green/success style, submitted status only)
  - Icon: CheckCircle
  - Text: "Accept"
  - Loading state during API call
- Reject button (red/destructive style, submitted status only)
  - Icon: XCircle
  - Text: "Reject"
  - Loading state during API call

**Handled interactions**:
- View button click triggers onView callback
- Accept button click triggers onAccept callback
- Reject button click triggers onReject callback
- Buttons disabled during loading state
- Keyboard accessible (Tab, Enter/Space)

**Handled validation**:
- Validate status before showing action buttons
- Disable buttons during API processing
- Show loading spinner on active button

**Types**:
- `ReviewActionsProps`
- `BadgeApplicationStatusType`

**Props**:
```typescript
interface ReviewActionsProps {
  applicationId: string;
  status: BadgeApplicationStatusType;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
  isProcessing?: boolean;
}
```

---

### ReviewModal (React Component)

**Component description**: Modal dialog for confirming accept/reject actions with optional decision note field.

**Main elements**:
- Modal overlay (backdrop)
- Modal content card:
  - Header with title ("Accept Application" or "Reject Application")
  - Close button (X icon)
  - Body section:
    - Application summary (applicant name, badge title)
    - Decision note textarea (optional for accept, recommended for reject)
      - Label: "Decision Note (Optional for Accept / Recommended for Reject)"
      - Placeholder: "Provide feedback for the applicant..."
      - Max length: 2000 characters
      - Character counter
  - Footer with action buttons:
    - Cancel button (secondary)
    - Confirm button ("Accept" or "Reject", styled appropriately)
      - Loading state during API call

**Handled interactions**:
- Close button and Cancel button close modal without action
- Confirm button validates input, calls API, shows success/error feedback
- Escape key closes modal
- Click outside modal closes modal
- Focus management (trap focus in modal, return to trigger on close)

**Handled validation**:
- Decision note max length: 2000 characters
- Show character counter
- For reject action, encourage but don't require decision note
- Disable Confirm button during API call (loading state)

**Types**:
- `ReviewModalProps`
- `ReviewDecisionFormData`

**Props**:
```typescript
interface ReviewModalProps {
  isOpen: boolean;
  mode: "accept" | "reject";
  application: BadgeApplicationListItemDto | null;
  onConfirm: (applicationId: string, decisionNote?: string) => Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
}
```

---

### ApplicantInfo (React Component)

**Component description**: Displays applicant information including avatar, name, and email in a compact format.

**Main elements**:
- Avatar component (initials or placeholder icon)
- Display name (primary text, medium weight)
- Email address (secondary text, smaller size)

**Handled interactions**: None (display only)

**Handled validation**: None

**Types**:
- `ApplicantInfoProps`
- `UserSummary`

**Props**:
```typescript
interface ApplicantInfoProps {
  applicant: UserSummary;
  size?: "sm" | "md" | "lg";
}
```

---

### EmptyState (React Component)

**Component description**: Displays when no applications match current filters or no applications are pending review.

**Main elements**:
- Icon (empty inbox or checkmark for "all reviewed")
- Title (context-specific based on filters)
  - With filters: "No applications match your filters"
  - Submitted filter: "No applications pending review" (with celebration icon)
  - All applications: "No applications to review"
- Description (helpful context)
  - With filters: "Try adjusting your filters to see more results"
  - No pending: "Great job! All submitted applications have been reviewed."
- Action buttons:
  - Clear Filters button (when filters are active)
  - View All Applications button (link to main applications list)

**Handled interactions**:
- Clear Filters button resets filters to defaults
- View All button navigates to `/applications` (main list view)

**Handled validation**: None

**Types**:
- `AdminEmptyStateProps`

**Props**:
```typescript
interface AdminEmptyStateProps {
  hasFilters: boolean;
  activeFilterCount: number;
  onClearFilters?: () => void;
}
```

---

### Pagination (React Component)

**Component description**: Pagination controls for navigating through pages of applications in the review queue.

**Main elements**:
- Page info text (e.g., "Showing 1-20 of 45 applications")
- Previous button (disabled on first page)
- Page numbers (current page highlighted, clickable for nearby pages)
- Next button (disabled on last page)
- Page size selector (optional: 10, 20, 50, 100)

**Handled interactions**:
- Previous/Next buttons update offset and trigger refetch
- Page number clicks jump to specific page (offset = (page - 1) * limit)
- Page size change updates limit, resets offset to 0, and refetches

**Handled validation**:
- Disable Previous button when offset === 0
- Disable Next button when !has_more
- Validate page numbers are within valid range

**Types**:
- `PaginationProps`
- `PaginationMetadata`

**Props**:
```typescript
interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
  onPageSizeChange?: (limit: number) => void;
}
```

## 5. Types

### AdminReviewFilters

Filter state for the admin review queue view.

```typescript
interface AdminReviewFilters {
  status?: BadgeApplicationStatusType;
  applicant_id?: string;
  catalog_badge_id?: string;
  sort: "submitted_at" | "created_at";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}
```

**Field descriptions**:
- `status` - Filter by specific status (default: `submitted` for pending review)
- `applicant_id` - Filter by specific applicant UUID (optional, from search)
- `catalog_badge_id` - Filter by catalog badge UUID (optional, from search)
- `sort` - Field to sort by (default: `submitted_at`)
- `order` - Sort direction (default: `desc`, newest first)
- `limit` - Page size (default: 20, range: 1-100)
- `offset` - Pagination offset (default: 0)

---

### AdminReviewMetrics

Aggregated metrics for the admin review queue showing counts by status and time period.

```typescript
interface AdminReviewMetrics {
  pendingCount: number;          // submitted status
  acceptedTodayCount: number;    // accepted today
  rejectedTodayCount: number;    // rejected today
  totalSubmittedCount: number;   // all submitted applications
  totalReviewedCount: number;    // accepted + rejected
}
```

**Field descriptions**:
- `pendingCount` - Count of applications with status='submitted' (needs review)
- `acceptedTodayCount` - Count of applications accepted today (reviewed_at = today)
- `rejectedTodayCount` - Count of applications rejected today (reviewed_at = today)
- `totalSubmittedCount` - Total count of all submitted applications (historical)
- `totalReviewedCount` - Total count of all reviewed applications (accepted + rejected)

---

### AdminReviewViewProps

Props for the main AdminReviewView component.

```typescript
interface AdminReviewViewProps {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  initialMetrics: AdminReviewMetrics;
  adminUserId: string;
}
```

**Field descriptions**:
- `initialData` - Initial paginated list of applications from server
- `initialMetrics` - Initial metrics for review queue dashboard
- `adminUserId` - Current authenticated admin user ID

---

### ReviewDecisionFormData

Form data for the review decision modal.

```typescript
interface ReviewDecisionFormData {
  decisionNote: string;
}
```

**Field descriptions**:
- `decisionNote` - Optional text note explaining the decision (max 2000 chars)

---

### BadgeApplicationListItemDto

DTO for badge application list items with nested catalog badge summary (already defined in types.ts).

```typescript
interface BadgeApplicationListItemDto extends BadgeApplicationRow {
  catalog_badge: CatalogBadgeSummary;
}
```

Note: This type is already defined in the project's `types.ts` file and includes:
- All fields from BadgeApplicationRow (id, applicant_id, catalog_badge_id, status, dates, etc.)
- Nested catalog_badge object with id, title, category, level

## 6. State Management

### Custom Hook: useAdminReview

**Purpose**: Manages admin review queue state, filtering, pagination, and API calls for fetching and reviewing badge applications.

**Hook Interface**:
```typescript
function useAdminReview(props: {
  initialData: PaginatedResponse<BadgeApplicationListItemDto>;
  initialMetrics: AdminReviewMetrics;
  adminUserId: string;
}): {
  // Data state
  applications: BadgeApplicationListItemDto[];
  pagination: PaginationMetadata;
  metrics: AdminReviewMetrics;
  filters: AdminReviewFilters;
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean; // for accept/reject actions
  processingId: string | null; // ID of application being processed
  
  // Error state
  error: string | null;
  
  // Filter actions
  updateFilters: (filters: Partial<AdminReviewFilters>) => void;
  resetFilters: () => void;
  
  // Pagination actions
  goToPage: (offset: number) => void;
  changePageSize: (limit: number) => void;
  
  // Review actions
  acceptApplication: (id: string, decisionNote?: string) => Promise<void>;
  rejectApplication: (id: string, decisionNote?: string) => Promise<void>;
  
  // Data actions
  refetch: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}
```

**State Variables**:

1. `applications`: BadgeApplicationListItemDto[] - Current page of applications
2. `pagination`: PaginationMetadata - Pagination info (total, limit, offset, has_more)
3. `metrics`: AdminReviewMetrics - Review queue metrics (counts)
4. `filters`: AdminReviewFilters - Current filter state
5. `isLoading`: boolean - Whether data is being fetched
6. `isProcessing`: boolean - Whether accept/reject action is in progress
7. `processingId`: string | null - ID of application currently being processed
8. `error`: string | null - Error message if operation failed

**Hook Behavior**:

- **Initialization**: 
  - Starts with `initialData` and `initialMetrics` from server
  - Initializes filters with defaults: `{ status: 'submitted', sort: 'submitted_at', order: 'desc', limit: 20, offset: 0 }`

- **Filter Updates**:
  - Resets offset to 0 when filters change (except offset itself)
  - Updates URL query parameters for bookmarking/sharing
  - Triggers refetch with new filters
  - Debounces search-based filters (300ms)

- **Pagination**: 
  - Updates offset and triggers refetch
  - Validates offset is within valid range

- **Review Actions** (accept/reject):
  - Sets `isProcessing` to true and stores application ID in `processingId`
  - Calls appropriate API endpoint (POST `/api/badge-applications/:id/accept` or `.../reject`)
  - On success:
    - Shows success toast
    - Refetches applications list to update UI
    - Refreshes metrics
    - Clears processing state
  - On error:
    - Shows error toast with API error message
    - Clears processing state
    - Keeps application in list

- **Refetch**: 
  - Calls GET `/api/badge-applications` with current filters
  - Updates applications and pagination state
  - Preserves current filters

- **Refresh Metrics**:
  - Calls custom endpoint or recalculates from applications
  - Updates metrics state

**URL Synchronization**:
```typescript
useEffect(() => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.applicant_id) params.set('applicant_id', filters.applicant_id);
  if (filters.catalog_badge_id) params.set('catalog_badge_id', filters.catalog_badge_id);
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  params.set('limit', filters.limit.toString());
  params.set('offset', filters.offset.toString());

  const newUrl = `/admin/review?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}, [filters]);
```

**Error Handling**:
```typescript
const handleApiError = (error: unknown, action: string) => {
  if (error instanceof Response) {
    // Handle HTTP error responses
    switch (error.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login?return=/admin/review';
        break;
      case 403:
        setError('You do not have permission to perform this action');
        break;
      case 404:
        setError('Application not found');
        refetch(); // Refresh list
        break;
      case 409:
        setError('Invalid status transition for this application');
        refetch(); // Refresh list
        break;
      default:
        setError(`Failed to ${action}. Please try again.`);
    }
  } else {
    setError(`An unexpected error occurred while ${action}`);
  }
};
```

## 7. API Integration

### Endpoint: GET /api/badge-applications

**When**: Page load (SSR), filter changes, pagination, after accept/reject action

**Purpose**: Fetch paginated list of badge applications for admin review

**Request**: Query parameters from `AdminReviewFilters`

**Query Parameters**:
- `status` (string, optional) - Filter by status (e.g., 'submitted')
- `applicant_id` (UUID, optional) - Filter by specific applicant
- `catalog_badge_id` (UUID, optional) - Filter by catalog badge
- `sort` (string, optional) - Sort field (default: 'submitted_at')
- `order` (string, optional) - Sort order (default: 'desc')
- `limit` (number, optional) - Page size (default: 20, max: 100)
- `offset` (number, optional) - Page offset (default: 0)

**Response**: `PaginatedResponse<BadgeApplicationListItemDto>`

```typescript
{
  data: [
    {
      id: "uuid",
      applicant_id: "uuid",
      catalog_badge_id: "uuid",
      catalog_badge_version: 1,
      date_of_application: "2024-01-15",
      date_of_fulfillment: "2024-01-20",
      reason: "Completed project X with Y results",
      status: "submitted",
      submitted_at: "2024-01-22T10:30:00Z",
      reviewed_by: null,
      reviewed_at: null,
      review_reason: null,
      created_at: "2024-01-15T09:00:00Z",
      updated_at: "2024-01-22T10:30:00Z",
      catalog_badge: {
        id: "uuid",
        title: "Senior Backend Developer",
        category: "technical",
        level: "gold"
      }
    }
  ],
  pagination: {
    total: 45,
    limit: 20,
    offset: 0,
    has_more: true
  }
}
```

**Error Handling**:
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show error "Admin access required"
- 400 Bad Request: Display validation errors
- 500 Internal Server Error: Show error toast, provide retry button

---

### Endpoint: POST /api/badge-applications/:id/accept

**When**: Admin clicks Accept button and confirms in modal

**Purpose**: Accept a submitted badge application

**Request Path Parameter**:
- `id` (UUID) - Badge application ID

**Request Body** (JSON):
```typescript
{
  decisionNote?: string; // optional, max 2000 chars
  notifyApplicants?: boolean; // optional, default true
}
```

**Response**: 200 OK with updated `BadgeApplicationDetailDto`

```typescript
{
  id: "uuid",
  applicant_id: "uuid",
  catalog_badge_id: "uuid",
  status: "accepted",
  reviewed_by: "admin-uuid",
  reviewed_at: "2024-01-23T14:00:00Z",
  review_reason: "Excellent work on project X",
  // ... other fields
  catalog_badge: { ... },
  applicant: { ... }
}
```

**Success Actions**:
1. Show success toast: "Application accepted successfully"
2. Refetch applications list to update UI
3. Refresh metrics (decrement pending count)
4. Close review modal
5. If was last item on current page, go to previous page

**Error Handling**:
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show error "Admin access required"
- 404 Not Found: Show error "Application not found", refetch list
- 409 Conflict: Show error "Application cannot be accepted in its current state" (invalid status transition)
- 500 Internal Server Error: Show error toast, allow retry

---

### Endpoint: POST /api/badge-applications/:id/reject

**When**: Admin clicks Reject button and confirms in modal with reason

**Purpose**: Reject a submitted badge application

**Request Path Parameter**:
- `id` (UUID) - Badge application ID

**Request Body** (JSON):
```typescript
{
  decisionNote?: string; // optional but recommended, max 2000 chars
  notifyApplicants?: boolean; // optional, default true
}
```

**Response**: 200 OK with updated `BadgeApplicationDetailDto`

```typescript
{
  id: "uuid",
  applicant_id: "uuid",
  catalog_badge_id: "uuid",
  status: "rejected",
  reviewed_by: "admin-uuid",
  reviewed_at: "2024-01-23T14:00:00Z",
  review_reason: "Insufficient evidence provided",
  // ... other fields
  catalog_badge: { ... },
  applicant: { ... }
}
```

**Success Actions**:
1. Show success toast: "Application rejected"
2. Refetch applications list to update UI
3. Refresh metrics (decrement pending count)
4. Close review modal
5. If was last item on current page, go to previous page

**Error Handling**:
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show error "Admin access required"
- 404 Not Found: Show error "Application not found", refetch list
- 409 Conflict: Show error "Application cannot be rejected in its current state" (invalid status transition)
- 500 Internal Server Error: Show error toast, allow retry

---

### Optional: GET /api/admin/review-metrics (Custom Endpoint)

**When**: Page load (SSR), after accept/reject actions

**Purpose**: Fetch aggregated metrics for admin review dashboard

**Request**: No parameters

**Response**: `AdminReviewMetrics`

```typescript
{
  pendingCount: 12,
  acceptedTodayCount: 5,
  rejectedTodayCount: 2,
  totalSubmittedCount: 156,
  totalReviewedCount: 144
}
```

**Note**: If this endpoint is not implemented, metrics can be calculated client-side by fetching applications with different status filters, but this is less efficient.

## 8. User Interactions

### Initial Page Load

1. Admin navigates to `/admin/review` (via nav menu or direct URL)
2. Astro page loads, checks authentication and admin role
3. Fetches applications via GET `/api/badge-applications?status=submitted&sort=submitted_at&order=desc&limit=20&offset=0`
4. Fetches metrics (via custom endpoint or calculated from data)
5. Renders AdminReviewView with initial data
6. Admin sees list of pending applications (submitted status) sorted by newest first

---

### Filtering by Status

1. Admin clicks status tab (e.g., "Accepted")
2. `updateFilters({ status: 'accepted', offset: 0 })` called
3. URL updates to `/admin/review?status=accepted&...`
4. API refetch with new status filter
5. List updates to show only accepted applications
6. Metrics remain unchanged (they show overall counts)
7. Active tab highlights selected status

---

### Filtering by Applicant

1. Admin types in applicant search input (debounced 300ms)
2. Autocomplete shows matching users from database
3. Admin selects a user from dropdown
4. `updateFilters({ applicant_id: 'uuid', offset: 0 })` called
5. URL updates with applicant_id parameter
6. API refetch with applicant_id filter
7. List shows only applications from selected applicant
8. Filter bar shows "Filter by: [Applicant Name] (X)" badge with clear button

---

### Filtering by Badge

1. Admin types in badge search input (debounced 300ms)
2. Autocomplete shows matching catalog badges
3. Admin selects a badge from dropdown
4. `updateFilters({ catalog_badge_id: 'uuid', offset: 0 })` called
5. URL updates with catalog_badge_id parameter
6. API refetch with catalog_badge_id filter
7. List shows only applications for selected badge
8. Filter bar shows "Filter by: [Badge Title] (X)" badge with clear button

---

### Sorting

1. Admin selects sort field from dropdown (e.g., "Created Date")
2. `updateFilters({ sort: 'created_at' })` called
3. Admin toggles sort order (asc/desc) using arrow icon button
4. `updateFilters({ order: 'asc' })` called
5. URL updates with new sort parameters
6. API refetch with new sort
7. List re-renders in new sort order
8. Sort controls show active sort field and direction

---

### Pagination

1. Admin clicks "Next" button
2. `goToPage(currentOffset + limit)` called
3. URL updates with new offset: `/admin/review?...&offset=20`
4. API refetch with new offset
5. List shows next page of results
6. "Previous" button becomes enabled
7. Page info updates (e.g., "Showing 21-40 of 45")

---

### Accepting an Application

1. Admin clicks "Accept" button on a submitted application row
2. Review modal opens with mode="accept"
3. Modal shows:
   - Application summary (applicant, badge)
   - Decision note textarea (optional)
   - "Accept" button (green)
4. Admin optionally enters decision note
5. Admin clicks "Accept" button in modal
6. Validation passes (note length <= 2000)
7. `acceptApplication(id, decisionNote)` called
8. Button shows loading state, modal disabled
9. POST `/api/badge-applications/:id/accept` called
10. On success (200):
    - Success toast appears: "Application accepted successfully"
    - Modal closes
    - `isProcessing` set to false
    - `refetch()` called to update list
    - `refreshMetrics()` called to update pending count
    - Application moves to "Accepted" status (removed from submitted view if filtered by submitted)
11. On error:
    - Error toast appears with specific message
    - Modal remains open to allow retry
    - `isProcessing` set to false

---

### Rejecting an Application

1. Admin clicks "Reject" button on a submitted application row
2. Review modal opens with mode="reject"
3. Modal shows:
   - Application summary (applicant, badge)
   - Decision note textarea (optional but encouraged)
   - Warning text: "Please provide a reason to help the applicant improve"
   - "Reject" button (red)
4. Admin enters decision note (encouraged)
5. Admin clicks "Reject" button in modal
6. Validation passes (note length <= 2000 if provided)
7. `rejectApplication(id, decisionNote)` called
8. Button shows loading state, modal disabled
9. POST `/api/badge-applications/:id/reject` called
10. On success (200):
    - Success toast appears: "Application rejected"
    - Modal closes
    - `isProcessing` set to false
    - `refetch()` called to update list
    - `refreshMetrics()` called to update pending count
    - Application moves to "Rejected" status (removed from submitted view if filtered by submitted)
11. On error:
    - Error toast appears with specific message
    - Modal remains open to allow retry
    - `isProcessing` set to false

---

### Viewing Application Details

1. Admin clicks "View Details" button or clicks on application row
2. Two possible implementations:
   - **Option A (Navigation)**: Navigate to `/applications/:id` (full detail page)
   - **Option B (Modal)**: Open ApplicationDetailModal with application data
3. Detail view shows:
   - Full application information
   - Applicant details (name, email)
   - Badge details (full description, category, level)
   - Dates (application, fulfillment, submitted)
   - Full reason text
   - Review information if already reviewed
   - Admin actions (accept/reject if submitted)

---

### Clearing Filters

1. Admin has active filters (e.g., applicant_id, catalog_badge_id)
2. Filter bar shows "Clear Filters" button with count of active filters
3. Admin clicks "Clear Filters" button
4. `resetFilters()` called
5. Filters reset to defaults: `{ status: 'submitted', sort: 'submitted_at', order: 'desc', limit: 20, offset: 0 }`
6. URL updates to default: `/admin/review`
7. API refetch with default filters
8. List shows all submitted applications
9. Filter bar clears all filter badges

---

### Handling Empty State

1. Admin filters applications (e.g., status=submitted)
2. No applications match the filters
3. EmptyState component renders with:
   - Icon: Checkmark (if no pending) or empty inbox
   - Title: "No applications pending review" or "No applications match your filters"
   - Description: Context-specific message
   - Action buttons: "Clear Filters" or "View All Applications"
4. Admin clicks "Clear Filters"
5. Filters reset, list refetches with defaults

## 9. Conditions and Validation

### Display Conditions

#### Accept/Reject Button Visibility

**Condition**: `status === 'submitted'`

**Where**: ReviewRow, ReviewActions components

**UI Effect**: Accept and Reject action buttons only shown for applications with submitted status

**Validation**:
```typescript
const canReview = application.status === 'submitted';

// In component:
{canReview && (
  <>
    <Button onClick={() => onAccept(application.id)}>Accept</Button>
    <Button onClick={() => onReject(application.id)}>Reject</Button>
  </>
)}
```

**Reasoning**: Only submitted applications can be reviewed. Draft applications are incomplete, and already reviewed applications (accepted/rejected) cannot be re-reviewed.

---

#### Processing State (Button Disabled)

**Condition**: `isProcessing && processingId === application.id`

**Where**: ReviewActions, ReviewModal

**UI Effect**: Disable action buttons and show loading spinner during API call

**Validation**:
```typescript
const isProcessingThis = isProcessing && processingId === application.id;

// In component:
<Button 
  disabled={isProcessingThis || isProcessing} 
  onClick={() => onAccept(application.id)}
>
  {isProcessingThis ? <Spinner /> : 'Accept'}
</Button>
```

**Reasoning**: Prevents duplicate submissions and provides visual feedback during async operations.

---

#### Admin Role Check

**Condition**: `isAdmin === true`

**Where**: AdminReviewPage (Astro SSR), route guard

**UI Effect**: Non-admin users receive 403 Forbidden error and cannot access view

**Validation** (server-side in Astro page):
```typescript
// In AdminReviewPage.astro
const user = context.locals.user;
if (!user || !user.is_admin) {
  return new Response('Forbidden', { status: 403 });
}
```

**Reasoning**: This is an admin-only feature. Standard users should not see or access the review queue.

---

#### Decision Note Length Validation

**Condition**: `decisionNote.length <= 2000`

**Where**: ReviewModal

**UI Effect**: Show character counter, display error if exceeded, disable submit button if invalid

**Validation**:
```typescript
const [decisionNote, setDecisionNote] = useState('');
const isValid = decisionNote.length <= 2000;
const remaining = 2000 - decisionNote.length;

// In component:
<textarea 
  value={decisionNote}
  onChange={(e) => setDecisionNote(e.target.value)}
  maxLength={2000}
/>
<p className={remaining < 100 ? 'text-warning' : 'text-muted'}>
  {remaining} characters remaining
</p>
<Button disabled={!isValid || isProcessing}>
  Confirm
</Button>
```

**Reasoning**: API enforces max length of 2000 characters. Client-side validation provides immediate feedback.

---

#### Empty State Variant

**Condition**: Based on active filters and result count

**Where**: EmptyState component

**UI Effect**: Show different messages and actions based on context

**Validation**:
```typescript
const hasFilters = !!(
  filters.status || 
  filters.applicant_id || 
  filters.catalog_badge_id
);

const isPendingFilter = filters.status === 'submitted';

// In component:
if (!hasFilters && applications.length === 0) {
  return <EmptyState 
    title="No applications to review"
    description="Check back later for new submissions"
  />;
}

if (hasFilters && applications.length === 0 && isPendingFilter) {
  return <EmptyState 
    title="No applications pending review"
    description="Great job! All submitted applications have been reviewed."
    icon={<CheckCircle />}
  />;
}

if (hasFilters && applications.length === 0) {
  return <EmptyState 
    title="No applications match your filters"
    description="Try adjusting your filters"
    action={<Button onClick={onClearFilters}>Clear Filters</Button>}
  />;
}
```

**Reasoning**: Context-specific empty states help users understand why the list is empty and what actions they can take.

---

#### Pagination Controls Disabled State

**Condition**: `offset === 0` (Previous) or `!has_more` (Next)

**Where**: Pagination component

**UI Effect**: Disable Previous button on first page, disable Next button on last page

**Validation**:
```typescript
const isFirstPage = pagination.offset === 0;
const isLastPage = !pagination.has_more;

// In component:
<Button 
  disabled={isFirstPage} 
  onClick={() => onPageChange(pagination.offset - pagination.limit)}
>
  Previous
</Button>
<Button 
  disabled={isLastPage} 
  onClick={() => onPageChange(pagination.offset + pagination.limit)}
>
  Next
</Button>
```

**Reasoning**: Prevents invalid pagination requests and provides clear visual feedback about page boundaries.

---

#### Metrics Badge Highlight

**Condition**: `pendingCount > threshold` (e.g., 10)

**Where**: PageHeader, ReviewMetrics

**UI Effect**: Show warning badge or highlight pending count if above threshold

**Validation**:
```typescript
const PENDING_WARNING_THRESHOLD = 10;
const hasManyPending = metrics.pendingCount > PENDING_WARNING_THRESHOLD;

// In component:
<MetricCard 
  label="Pending Review"
  value={metrics.pendingCount}
  variant={hasManyPending ? 'warning' : 'default'}
  icon={hasManyPending ? <AlertCircle /> : <Clock />}
/>
```

**Reasoning**: Helps admins prioritize review work by highlighting when the queue is getting long.

## 10. Error Handling

### Network Errors

**Scenario**: Request fails due to network issues (timeout, offline, connection lost)

**Handling**:
- Show error banner at top of view: "Unable to load applications. Check your connection."
- Display retry button in banner
- Keep existing data visible (don't clear list)
- Disable action buttons during network error
- Log error to console for debugging

**User Actions**:
- Click retry button to refetch
- Or wait for automatic retry (exponential backoff: 1s, 2s, 4s, max 3 retries)
- Check network connection

**Implementation**:
```typescript
const handleNetworkError = () => {
  setError('Unable to load applications. Check your connection.');
  // Exponential backoff retry
  const retryDelays = [1000, 2000, 4000];
  retryDelays.forEach((delay, index) => {
    setTimeout(() => {
      if (error) refetch(); // Retry if still in error state
    }, delay);
  });
};
```

---

### Unauthorized (401)

**Scenario**: User session expired or not authenticated

**Handling**:
- Save current URL to sessionStorage (for return after login)
- Redirect to login page: `/login?return=/admin/review?...`
- Show message: "Your session has expired. Please sign in again."

**User Actions**:
- Re-authenticate with Google SSO
- Return to admin review queue with filters preserved

**Implementation**:
```typescript
if (response.status === 401) {
  const currentUrl = window.location.pathname + window.location.search;
  sessionStorage.setItem('returnUrl', currentUrl);
  window.location.href = `/login?return=${encodeURIComponent(currentUrl)}`;
}
```

---

### Forbidden (403)

**Scenario**: Non-admin user attempts to access admin review queue, or admin loses admin privileges

**Handling**:
- Show error page: "Access Denied - Admin privileges required"
- Provide link to dashboard or home page
- Log access attempt for security monitoring
- Don't expose any data from the review queue

**User Actions**:
- Navigate to home page
- Contact administrator if privileges should be granted

**Implementation**:
```typescript
// In Astro page (SSR)
if (!user.is_admin) {
  return new Response(null, {
    status: 403,
    headers: {
      Location: '/403', // Custom 403 error page
    },
  });
}
```

---

### Not Found (404)

**Scenario**: Application not found when trying to accept/reject (race condition, application deleted by another admin)

**Handling**:
- Show info toast: "Application no longer exists"
- Refetch list to update UI and remove stale item
- If on last page and no items remain, go to previous page
- Log warning for investigation

**User Actions**:
- Continue browsing updated list
- No action needed (handled automatically)

**Implementation**:
```typescript
if (response.status === 404) {
  showToast('info', 'Application no longer exists');
  await refetch();
  // Check if page is now empty
  if (applications.length === 0 && pagination.offset > 0) {
    goToPage(pagination.offset - pagination.limit);
  }
}
```

---

### Conflict (409)

**Scenario**: Invalid status transition (attempt to accept/reject non-submitted application)

**Handling**:
- Show error toast: "Application cannot be reviewed in its current state"
- Refetch list to get current status
- Update UI to reflect current status
- Disable accept/reject buttons if status changed

**User Actions**:
- View updated application status
- Refresh understanding of current state
- Cannot proceed with review (action blocked)

**Implementation**:
```typescript
if (response.status === 409) {
  const errorData = await response.json();
  showToast('error', errorData.message || 'Invalid status transition');
  await refetch(); // Get current state
}
```

---

### Validation Errors (400)

**Scenario**: Invalid query parameters or request body (e.g., invalid status value, invalid UUID format)

**Handling**:
- Parse validation error details from API response
- Show error toast with first validation error message
- If query params invalid: reset to default filters and refetch
- If request body invalid (modal): show inline error message in modal

**User Actions**:
- Adjust input to valid values
- Or click "Clear Filters" to reset

**Implementation**:
```typescript
if (response.status === 400) {
  const errorData = await response.json();
  if (errorData.details && errorData.details.length > 0) {
    const firstError = errorData.details[0];
    showToast('error', `${firstError.field}: ${firstError.message}`);
  } else {
    showToast('error', errorData.message || 'Invalid request');
  }
  
  // If query param error, reset filters
  if (errorData.error === 'validation_error' && window.location.search) {
    resetFilters();
  }
}
```

---

### Server Error (500)

**Scenario**: Unexpected server error during fetch or review action

**Handling**:
- Show error banner: "Something went wrong. Our team has been notified."
- Provide retry button
- Log full error details to console and error monitoring service
- Keep existing data visible if available (graceful degradation)
- If during review action: keep modal open to allow retry

**User Actions**:
- Click retry button
- Or refresh page (F5)
- Or wait a moment and try again
- Or contact support if persistent

**Implementation**:
```typescript
if (response.status === 500) {
  const errorData = await response.json();
  showToast('error', 'An unexpected error occurred. Please try again.');
  
  // Log to error monitoring service (e.g., Sentry)
  logErrorToMonitoring({
    message: errorData.message,
    context: 'AdminReviewView',
    action: 'acceptApplication',
    applicationId: id,
  });
  
  // Keep modal open during review action errors
  if (isProcessing) {
    setIsProcessing(false);
    // Modal remains open for retry
  }
}
```

---

### Stale Data (Optimistic UI Conflict)

**Scenario**: Admin accepts/rejects application that was just modified by another admin in a different session

**Handling**:
- Show warning toast: "This application was recently modified. Refreshing..."
- Refetch list to get latest data
- If conflict persists (very rare): show error and block action

**User Actions**:
- Review updated application state
- Retry action if still appropriate

**Implementation**:
```typescript
// Could be detected by checking `updated_at` timestamp or ETag
if (currentUpdatedAt !== fetchedUpdatedAt) {
  showToast('warning', 'Application was recently modified. Refreshing...');
  await refetch();
  return; // Block action until user reviews fresh data
}
```

---

### Decision Note Too Long

**Scenario**: Admin tries to submit decision note longer than 2000 characters

**Handling**:
- Client-side: Prevent input beyond 2000 chars (maxLength attribute)
- Show character counter turning red when approaching limit
- Disable submit button if exceeded (shouldn't be possible with maxLength)
- Server-side: Return 400 with clear error if somehow exceeded

**User Actions**:
- Trim note to fit within limit
- Use more concise language

**Implementation**:
```typescript
// Client-side prevention
<textarea
  maxLength={2000}
  value={decisionNote}
  onChange={(e) => setDecisionNote(e.target.value)}
/>
<p className={decisionNote.length > 1900 ? 'text-red-500' : 'text-gray-500'}>
  {2000 - decisionNote.length} characters remaining
</p>
```

## 11. Implementation Steps

### Step 1: Create Route Guard and Admin Middleware

**File**: `src/middleware/admin-guard.ts` (if not exists)

1. Check if user is authenticated (via session)
2. Check if user has admin role (`is_admin === true`)
3. If not admin, return 403 Forbidden
4. If not authenticated, redirect to login with return URL
5. If admin, allow access and attach admin user to context

**Checklist**:
- [ ] Authentication check implemented
- [ ] Admin role check implemented
- [ ] 403 error response for non-admins
- [ ] Login redirect with return URL for unauthenticated
- [ ] User data attached to context

---

### Step 2: Create Astro Page Component

**File**: `src/pages/admin/review.astro`

1. Import and apply admin middleware/guard
2. Parse query parameters and build filter object with defaults
3. Fetch applications via GET `/api/badge-applications` with filters
4. Calculate or fetch review metrics
5. Handle errors (401, 403, 500)
6. Pass data to AdminReviewView React component
7. Add client directive: `client:load`
8. Add meta tags (title, description)

**Checklist**:
- [ ] Admin middleware applied
- [ ] Query parameter parsing with validation
- [ ] API call with error handling
- [ ] Metrics calculation or fetch
- [ ] Component import and props passing
- [ ] Meta tags for SEO
- [ ] Error page rendering for failures

**Implementation outline**:
```astro
---
// src/pages/admin/review.astro
import Layout from '@/layouts/Layout.astro';
import AdminReviewView from '@/components/admin/AdminReviewView';

// Check admin authorization
const user = Astro.locals.user;
if (!user) {
  return Astro.redirect('/login?return=/admin/review');
}
if (!user.is_admin) {
  return new Response('Forbidden', { status: 403 });
}

// Parse and validate query params
const url = new URL(Astro.request.url);
const params = {
  status: url.searchParams.get('status') || 'submitted',
  applicant_id: url.searchParams.get('applicant_id') || undefined,
  catalog_badge_id: url.searchParams.get('catalog_badge_id') || undefined,
  sort: url.searchParams.get('sort') || 'submitted_at',
  order: url.searchParams.get('order') || 'desc',
  limit: parseInt(url.searchParams.get('limit') || '20'),
  offset: parseInt(url.searchParams.get('offset') || '0'),
};

// Fetch applications
const response = await fetch(
  `${Astro.url.origin}/api/badge-applications?${new URLSearchParams(params)}`,
  {
    headers: {
      Cookie: Astro.request.headers.get('Cookie') || '',
    },
  }
);

if (!response.ok) {
  // Handle error
  return new Response('Error loading applications', { status: 500 });
}

const applicationsData = await response.json();

// Calculate metrics (simplified - could be from dedicated endpoint)
const metrics = {
  pendingCount: applicationsData.pagination.total, // if filtered by submitted
  acceptedTodayCount: 0, // TODO: fetch or calculate
  rejectedTodayCount: 0, // TODO: fetch or calculate
  totalSubmittedCount: 0, // TODO: fetch or calculate
  totalReviewedCount: 0, // TODO: fetch or calculate
};
---

<Layout title="Admin Review Queue">
  <AdminReviewView
    client:load
    initialData={applicationsData}
    initialMetrics={metrics}
    adminUserId={user.id}
  />
</Layout>
```

---

### Step 3: Create Type Definitions

**File**: `src/types.ts` (add to existing types file)

1. Add `AdminReviewFilters` interface
2. Add `AdminReviewMetrics` interface
3. Add `AdminReviewViewProps` interface
4. Add all component Props interfaces:
   - `AdminPageHeaderProps`
   - `AdminFilterBarProps`
   - `ReviewListProps`
   - `ReviewRowProps`
   - `ReviewActionsProps`
   - `ReviewModalProps`
   - `ApplicantInfoProps`
   - `AdminEmptyStateProps`
   - `ReviewDecisionFormData`

**Checklist**:
- [ ] All types defined with complete JSDoc
- [ ] Export all public interfaces
- [ ] Ensure type safety with existing DTOs
- [ ] No duplicate types (reuse existing where possible)

---

### Step 4: Implement useAdminReview Hook

**File**: `src/hooks/useAdminReview.ts`

1. Set up state variables (applications, pagination, metrics, filters, loading, processing, error)
2. Implement `updateFilters` function with URL sync and debouncing
3. Implement `resetFilters` function
4. Implement `goToPage` and `changePageSize` functions
5. Implement `refetch` function (calls API with current filters)
6. Implement `refreshMetrics` function
7. Implement `acceptApplication` function with error handling
8. Implement `rejectApplication` function with error handling
9. Add error handling utility functions
10. Return hook interface

**Checklist**:
- [ ] State initialization from props
- [ ] Filter updates with URL synchronization
- [ ] Debouncing for search filters (300ms)
- [ ] Accept/reject API calls with loading states
- [ ] Comprehensive error handling
- [ ] Success/error toast integration
- [ ] Refetch after successful review actions

---

### Step 5: Implement AdminReviewView Component

**File**: `src/components/admin/AdminReviewView.tsx`

1. Create main component with props interface
2. Initialize useAdminReview hook
3. Set up review modal state (isOpen, mode, selectedApplication)
4. Implement layout structure
5. Connect PageHeader with metrics
6. Connect FilterBar with filter state
7. Connect ReviewList with data and handlers
8. Connect Pagination with pagination state
9. Render ReviewModal with handlers
10. Handle loading and error states

**Checklist**:
- [ ] Hook integration
- [ ] Modal state management
- [ ] All child components rendered
- [ ] Loading skeleton during fetch
- [ ] Error display with retry
- [ ] Success toast on review actions

---

### Step 6: Implement PageHeader Component

**File**: `src/components/admin/PageHeader.tsx`

1. Create component with title and breadcrumbs
2. Add review metrics cards:
   - Pending Review count (with warning if > 10)
   - Accepted Today count
   - Rejected Today count
3. Make metric cards clickable to filter by status
4. Style with Tailwind following design system
5. Add responsive design (stack cards on mobile)

**Checklist**:
- [ ] Title and breadcrumbs
- [ ] Metrics cards with icons
- [ ] Click handlers for filtering
- [ ] Warning badge for high pending count
- [ ] Responsive layout

---

### Step 7: Implement FilterBar Component

**File**: `src/components/admin/FilterBar.tsx`

1. Create status tabs (All, Submitted, Accepted, Rejected)
2. Add applicant filter (searchable combobox)
   - Implement user search/autocomplete
   - Show selected user with clear button
3. Add badge filter (searchable combobox)
   - Implement catalog badge search/autocomplete
   - Show selected badge with clear button
4. Add sort dropdown (Submitted Date, Created Date)
5. Add sort order toggle button
6. Add "Clear Filters" button (shown when filters are active)
7. Wire up to onChange handlers from props
8. Display result count

**Checklist**:
- [ ] Status tabs with active state
- [ ] Applicant search with autocomplete
- [ ] Badge search with autocomplete
- [ ] Sort controls
- [ ] Clear filters button
- [ ] Result count display
- [ ] Debounced search inputs
- [ ] Accessible form controls

---

### Step 8: Implement ReviewList Component

**File**: `src/components/admin/ReviewList.tsx`

1. Create table or list container
2. Add table headers (if using table): Applicant, Badge, Submitted, Status, Actions
3. Map through applications and render ReviewRow
4. Show EmptyState when no applications
5. Show loading skeleton with correct column count
6. Style with Tailwind (striped rows, hover effects)

**Checklist**:
- [ ] Semantic HTML table or list
- [ ] Table headers (if table layout)
- [ ] Row components with proper data
- [ ] Empty state integration
- [ ] Loading skeleton
- [ ] Responsive design (consider card layout on mobile)

---

### Step 9: Implement ReviewRow Component

**File**: `src/components/admin/ReviewRow.tsx`

1. Create row layout with sections:
   - Applicant info (avatar, name, email)
   - Badge summary (title, category, level)
   - Application meta (submitted date, reason preview)
   - Status badge
   - Review actions
2. Add click handler for row (navigate to detail)
3. Implement conditional styling based on status
4. Add hover effects
5. Ensure keyboard accessibility

**Checklist**:
- [ ] All sections implemented
- [ ] Data binding correct
- [ ] Click handlers working
- [ ] Conditional styling
- [ ] Keyboard navigation
- [ ] Responsive layout

---

### Step 10: Implement ReviewActions Component

**File**: `src/components/admin/ReviewActions.tsx`

1. Create button group with View, Accept, Reject buttons
2. Implement conditional rendering (only show Accept/Reject for submitted status)
3. Add loading states for buttons
4. Wire up click handlers
5. Style with Tailwind (green for accept, red for reject)
6. Add icons (CheckCircle, XCircle)

**Checklist**:
- [ ] All buttons rendered
- [ ] Conditional visibility for accept/reject
- [ ] Loading states
- [ ] Click handlers connected
- [ ] Proper styling and icons
- [ ] Disabled state during processing

---

### Step 11: Implement ReviewModal Component

**File**: `src/components/admin/ReviewModal.tsx`

1. Create modal using shadcn/ui Dialog component
2. Implement modal header with title (mode-dependent)
3. Add application summary section
4. Add decision note textarea:
   - Label: "Decision Note (Optional)"
   - Placeholder: mode-dependent
   - maxLength: 2000
   - Character counter
5. Add footer with Cancel and Confirm buttons
6. Implement form state and validation
7. Wire up onConfirm handler
8. Handle loading state during submission
9. Implement focus management and keyboard shortcuts (Escape to close)

**Checklist**:
- [ ] Modal layout complete
- [ ] Application summary displayed
- [ ] Textarea with validation
- [ ] Character counter
- [ ] Cancel and Confirm buttons
- [ ] Form submission handler
- [ ] Loading state
- [ ] Focus management
- [ ] Escape key handling

---

### Step 12: Implement ApplicantInfo Component

**File**: `src/components/admin/ApplicantInfo.tsx`

1. Create component with avatar, name, email
2. Generate avatar from initials (first letter of first and last name)
3. Style with Tailwind (circular avatar, proper text hierarchy)
4. Add optional link to applicant profile (future enhancement)

**Checklist**:
- [ ] Avatar component
- [ ] Name display
- [ ] Email display
- [ ] Proper styling
- [ ] Optional profile link

---

### Step 13: Implement EmptyState Component

**File**: `src/components/admin/EmptyState.tsx`

1. Create empty state with icon and message
2. Implement conditional messaging based on filters:
   - No filters + no pending: "No applications to review"
   - Filter by submitted + no results: "Great job! All reviewed" (celebration)
   - Filters active + no results: "No applications match filters"
3. Add CTA buttons:
   - Clear Filters (when filters active)
   - View All Applications (link to main list)
4. Style with Tailwind (centered, proper spacing)

**Checklist**:
- [ ] Icon and message
- [ ] Conditional messaging
- [ ] CTA buttons
- [ ] Proper styling
- [ ] Context-aware content

---

### Step 14: Reuse Existing Components

Reuse components from other views where possible:

1. **StatusBadge**: Use existing from badge-applications
2. **BadgeSummaryCard**: Use existing or create admin version
3. **Pagination**: Use existing or adapt from applications list
4. **DateDisplay**: Create utility for relative dates ("2 days ago")
5. **Toast**: Use existing toast system

**Checklist**:
- [ ] Identify reusable components
- [ ] Import and test in admin view
- [ ] Adapt styling if needed
- [ ] Ensure consistent behavior

---

### Step 15: Implement API Integration Functions

**File**: `src/lib/api/admin-api.ts` (create if not exists)

1. Create `getApplicationsForReview(filters: AdminReviewFilters)` function
2. Create `acceptApplication(id: string, decisionNote?: string)` function
3. Create `rejectApplication(id: string, decisionNote?: string)` function
4. Create `getReviewMetrics()` function (if custom endpoint exists)
5. Handle API responses and errors with proper types
6. Use Supabase client or fetch API

**Checklist**:
- [ ] All API functions implemented
- [ ] Proper error handling
- [ ] Request/response type checking
- [ ] Authentication headers included
- [ ] Error mapping to user-friendly messages

---

### Step 16: Add Error Handling and Toasts

1. Integrate or create toast notification system (use shadcn/ui Toaster)
2. Implement error boundaries for React components
3. Add error state handling in useAdminReview hook
4. Map API errors to user-friendly messages
5. Add retry logic for network errors
6. Add error logging to monitoring service (optional)

**Checklist**:
- [ ] Toast system configured
- [ ] Error boundaries in place
- [ ] Error mapping utility
- [ ] Retry functionality
- [ ] User-friendly error messages
- [ ] Error logging (optional)

---

### Step 17: Add Accessibility Features

1. Add ARIA labels to all interactive elements
2. Add ARIA live regions for list updates and toasts
3. Ensure keyboard navigation works (Tab order, Enter/Space on buttons)
4. Add focus management (modal focus trap, return focus on close)
5. Add screen reader announcements for review actions
6. Test with screen reader (VoiceOver, NVDA)
7. Ensure color contrast meets WCAG AA standards
8. Add skip links for keyboard users

**Checklist**:
- [ ] ARIA labels on buttons/links
- [ ] ARIA live regions
- [ ] Keyboard navigation tested
- [ ] Focus management implemented
- [ ] Screen reader announcements
- [ ] Screen reader testing completed
- [ ] Color contrast validated
- [ ] Skip links added

---

### Step 18: Styling and Responsive Design

1. Apply Tailwind CSS classes following project patterns
2. Ensure shadcn/ui components styled consistently
3. Implement responsive layout:
   - Desktop: Table layout with all columns
   - Tablet: Condensed table or card layout
   - Mobile: Card layout with stacked information
4. Add loading skeletons for data fetching
5. Style status badges with proper colors
6. Add hover/focus states for interactive elements
7. Ensure metrics cards stack properly on mobile

**Checklist**:
- [ ] Tailwind styling applied
- [ ] Responsive design (mobile-first)
- [ ] Loading skeletons
- [ ] Status badge colors
- [ ] Hover/focus states
- [ ] Consistent with design system

---

### Step 19: Testing - Component Level

Test individual components in isolation:

1. **FilterBar**: Test status tabs, search inputs, sort controls, clear filters
2. **ReviewRow**: Test with different statuses, ensure actions only show for submitted
3. **ReviewModal**: Test accept/reject flows, validation, character counter
4. **Pagination**: Test edge cases (first page, last page, single page)
5. **EmptyState**: Test with different filter combinations
6. **ApplicantInfo**: Test with various name formats, missing data

**Checklist**:
- [ ] All components have unit tests
- [ ] Edge cases covered
- [ ] Prop variations tested
- [ ] Accessibility tested

---

### Step 20: Testing - Integration Level

Test complete workflows:

1. **Initial page load**: With various query parameters
2. **Filter by status**: All, Submitted, Accepted, Rejected
3. **Filter by applicant**: Search, select, clear
4. **Filter by badge**: Search, select, clear
5. **Sorting**: Both fields (submitted_at, created_at) and orders (asc, desc)
6. **Pagination**: Next, prev, direct page jump, page size change
7. **Accept application**: With and without decision note
8. **Reject application**: With and without decision note
9. **View details**: Modal or navigation
10. **Clear filters**: Reset to defaults
11. **URL state**: Filters persisted in URL, shareable, browser back/forward

**Checklist**:
- [ ] All workflows tested end-to-end
- [ ] URL state persistence verified
- [ ] Browser navigation tested
- [ ] Data refetch after actions
- [ ] Metrics update after reviews

---

### Step 21: Testing - Error Scenarios

Test error handling:

1. **Network errors**: Offline, timeout, slow connection
2. **401 Unauthorized**: Expired session
3. **403 Forbidden**: Non-admin access attempt
4. **404 Not Found**: Application deleted during review
5. **409 Conflict**: Invalid status transition
6. **400 Validation**: Invalid query params, invalid request body
7. **500 Server Error**: Unexpected errors
8. **Stale data**: Application modified by another admin
9. **Empty states**: No pending applications, no results with filters

**Checklist**:
- [ ] All error scenarios tested
- [ ] Error messages user-friendly
- [ ] Retry functionality works
- [ ] Graceful degradation
- [ ] No data loss during errors

---

### Step 22: Testing - Admin vs Non-Admin

Test authorization:

1. **Non-admin user**: Attempt to access `/admin/review`, expect 403
2. **Unauthenticated user**: Attempt to access, expect login redirect
3. **Admin user**: Full access, all features work
4. **Admin privileges revoked**: Mid-session, next action shows 403
5. **Session expires**: Mid-session, next action redirects to login

**Checklist**:
- [ ] Non-admin blocked from view
- [ ] Unauthenticated redirected to login
- [ ] Admin has full access
- [ ] Permission changes handled
- [ ] Session expiry handled

---

### Step 23: Performance Optimization

1. Review and optimize re-renders
2. Memoize expensive computations (filtering, sorting on client)
3. Debounce search inputs (300ms)
4. Add loading states and skeletons for perceived performance
5. Consider virtual scrolling for large lists (optional, 100+ items)
6. Optimize API calls (avoid duplicate requests)
7. Test performance with slow network (throttle in DevTools)
8. Measure and optimize Time to Interactive (TTI)

**Checklist**:
- [ ] No unnecessary re-renders
- [ ] Expensive computations memoized
- [ ] Debounced search implemented
- [ ] Loading skeletons in place
- [ ] Virtual scrolling evaluated
- [ ] No duplicate API calls
- [ ] Performance tested with slow network
- [ ] TTI metrics acceptable

---

### Step 24: Documentation

1. Add JSDoc comments to all components and functions
2. Document props interfaces with descriptions
3. Add usage examples in component files (Storybook or inline)
4. Update project documentation with new route
5. Document API endpoints used (if creating custom review metrics endpoint)
6. Create admin user guide (optional, for non-technical admins)

**Checklist**:
- [ ] JSDoc on all exports
- [ ] Props documentation complete
- [ ] Usage examples provided
- [ ] Route documented in project docs
- [ ] API endpoints documented
- [ ] User guide created (optional)

---

### Step 25: Final Integration and QA

1. Test navigation from dashboard to admin review queue
2. Test navigation from review queue to application detail
3. Test navigation from review queue back to dashboard
4. Verify all links work (breadcrumbs, header nav, CTAs)
5. Test URL sharing (copy URL with filters, open in new tab)
6. Test browser back/forward buttons
7. Perform final cross-browser testing (Chrome, Firefox, Safari, Edge)
8. Perform final accessibility audit (Lighthouse, axe DevTools)
9. Security review (ensure no sensitive data leaks, admin checks on all actions)

**Checklist**:
- [ ] All navigation paths tested
- [ ] URL state persistence verified
- [ ] Browser navigation working
- [ ] Cross-browser compatibility confirmed
- [ ] Accessibility audit passed
- [ ] Security review completed
- [ ] Ready for production deployment

---

## Summary

This implementation plan provides a comprehensive guide for implementing the Admin Review Queue view. The view is admin-only, provides efficient filtering and sorting of badge applications, and enables quick accept/reject actions with decision notes. The design follows existing patterns from the Applications List view while adding admin-specific features like review metrics and bulk review capabilities.

Key features:
- Admin-only access with proper authentication and authorization
- Filterable by status, applicant, and catalog badge
- Sortable by submission date and created date
- Quick accept/reject actions with optional decision notes
- Review metrics dashboard showing pending, accepted, and rejected counts
- Responsive design with mobile-friendly layout
- Comprehensive error handling and loading states
- Full accessibility support (WCAG AA compliance)
- URL state persistence for sharing and bookmarking

The implementation follows the project's tech stack (Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui) and integrates with existing API endpoints for badge applications.

