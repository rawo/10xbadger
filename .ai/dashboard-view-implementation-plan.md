# View Implementation Plan: Dashboard (Home)

## 1. Overview

The Dashboard (Home) view serves as the main landing page for authenticated users in the Badger application. It provides a comprehensive overview of the user's badge application journey and promotion status. The dashboard displays quick statistics, recent badge applications grouped by status, active promotions, and quick action buttons for common tasks. This view prioritizes user efficiency by centralizing key information and providing direct navigation to detailed views.

**Primary Goals:**
- Provide at-a-glance overview of user's badge applications and promotions
- Show key statistics (drafts, submitted, accepted, active promotions)
- Enable quick navigation to relevant detail pages
- Facilitate common actions through quick action buttons

**Target Users:**
- Standard users (engineers) viewing their own data
- Administrators viewing their own data (admin-specific dashboard out of MVP scope)

## 2. View Routing

**Path:** `/` (root path)

**Access Control:**
- Requires authentication (Google Workspace SSO)
- All authenticated users can access
- No admin-specific restrictions for this view

## 3. Component Structure

```
DashboardPage (Astro - SSR)
└── DashboardView (React client:load)
    ├── QuickActions
    │   └── Button[] (shadcn/ui)
    ├── StatisticsGrid
    │   ├── StatCard (Draft Applications)
    │   ├── StatCard (Submitted Applications)
    │   ├── StatCard (Accepted Badges)
    │   └── StatCard (Active Promotions)
    ├── BadgeApplicationsOverview
    │   ├── Card (shadcn/ui)
    │   ├── Tabs (shadcn/ui) - for status filtering
    │   └── BadgeApplicationItem[]
    │       ├── Badge (shadcn/ui) - status indicator
    │       ├── Badge (shadcn/ui) - category/level
    │       └── Link to detail view
    └── PromotionsOverview
        ├── Card (shadcn/ui)
        └── PromotionItem[]
            ├── Badge (shadcn/ui) - status indicator
            └── Link to detail view
```

**Component Hierarchy:**
1. **Page Level**: DashboardPage (Astro) - handles SSR, layout, initial data
2. **Container Level**: DashboardView (React) - manages client-side state and interactions
3. **Section Level**: QuickActions, StatisticsGrid, BadgeApplicationsOverview, PromotionsOverview
4. **Presentational Level**: StatCard, BadgeApplicationItem, PromotionItem

## 4. Component Details

### DashboardPage (Astro Component)

**Description:** Server-side rendered page component that fetches initial data and provides the layout structure for the dashboard. Handles authentication check and initial data loading via SSR.

**Main Elements:**
- `<Layout>` wrapper component
- Page title and meta tags
- `<DashboardView>` React component with `client:load` directive

**Handled Events:**
- None (SSR component)

**Handled Validation:**
- Authentication check (redirects to login if not authenticated)
- Session validation via Supabase

**Types:**
- `PaginatedResponse<BadgeApplicationListItemDto>` for badge applications
- `PaginatedResponse<PromotionListItemDto>` for promotions
- `DashboardViewModel` for aggregated data

**Props:**
- None (page component receives Astro context)

**Implementation Notes:**
- Fetch badge applications with multiple status filters in parallel
- Fetch promotions with status filters in parallel
- Transform API responses into DashboardViewModel
- Pass aggregated data to DashboardView as props

---

### DashboardView (React Component)

**Description:** Main client-side interactive container that manages the dashboard state and coordinates child components. Handles data refresh, error states, and user interactions.

**Main Elements:**
- Header section with title and refresh button
- QuickActions section
- StatisticsGrid section
- BadgeApplicationsOverview section
- PromotionsOverview section
- Error boundary for error handling

**Handled Events:**
- Manual data refresh (refresh button click)
- Auto-refresh via interval (every 60 seconds)
- Error retry actions

**Handled Validation:**
- Data shape validation for props
- Null/undefined checks for optional data

**Types:**
- `DashboardViewProps`: Contains initialData (DashboardViewModel), error state, loading state

**Props:**
```typescript
interface DashboardViewProps {
  initialData: DashboardViewModel;
  userId: string;
}
```

**Implementation Notes:**
- Use React.useState for client-side state management
- Implement useEffect for auto-refresh
- Handle loading and error states gracefully
- Provide refresh functionality via fetch API

---

### QuickActions (React Component)

**Description:** Displays a horizontal row of prominent action buttons for common user tasks like browsing the catalog, applying for a badge, or creating a promotion.

**Main Elements:**
- Container div with responsive grid/flex layout
- Multiple Button components (shadcn/ui)
- Optional icons for each action

**Handled Events:**
- Click events for navigation (handled by Link components)

**Handled Validation:**
- None (navigation only)

**Types:**
- `QuickActionItem[]`

**Props:**
```typescript
interface QuickActionsProps {
  className?: string;
}
```

**Implementation Notes:**
- Use Astro's Link component or native anchor tags for navigation
- Style as prominent CTAs
- Consider user context (show relevant actions)
- Actions: "Browse Catalog" (/catalog), "Apply for Badge" (/apply/new), "View Templates" (/promotion-templates)

---

### StatisticsGrid (React Component)

**Description:** Grid layout displaying key statistics as clickable cards. Each card shows a count and links to a filtered view of the relevant data.

**Main Elements:**
- Grid container (responsive: 2x2 on desktop, 1 column on mobile)
- 4 StatCard components

**Handled Events:**
- Click on cards for navigation

**Handled Validation:**
- Number validation for counts (must be >= 0)

**Types:**
- `DashboardStatistics`

**Props:**
```typescript
interface StatisticsGridProps {
  statistics: DashboardStatistics;
  className?: string;
}
```

**Implementation Notes:**
- Use CSS Grid or Tailwind grid classes
- Cards: Draft Applications, Submitted Applications, Accepted Badges, Active Promotions
- Each card links to filtered list view

---

### StatCard (React Component)

**Description:** Reusable card component displaying a single statistic with label, value, optional icon, and navigation link.

**Main Elements:**
- Card container (shadcn/ui Card)
- Icon element (optional)
- Label text
- Value number (large, prominent)
- Optional Link wrapper

**Handled Events:**
- Click for navigation (if link provided)

**Handled Validation:**
- Value must be a number

**Types:**
- `StatCardProps`

**Props:**
```typescript
interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  link?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}
```

**Implementation Notes:**
- Use shadcn/ui Card, CardHeader, CardContent
- Apply variant-specific styling (colors, borders)
- Make entire card clickable if link provided
- Accessible keyboard navigation

---

### BadgeApplicationsOverview (React Component)

**Description:** Section displaying user's badge applications grouped by status. Uses tabs for status filtering and shows a list of recent applications for the selected status.

**Main Elements:**
- Card container (shadcn/ui)
- Section header with title and "View All" link
- Tabs component (shadcn/ui) for status selection
- List of BadgeApplicationItem components
- Empty state component (if no applications)

**Handled Events:**
- Tab change (status filter selection)
- Click on individual items for navigation

**Handled Validation:**
- Selected status must be valid BadgeApplicationStatusType

**Types:**
- `BadgeApplicationListItemDto[]`
- `BadgeApplicationStatusType` for tab selection

**Props:**
```typescript
interface BadgeApplicationsOverviewProps {
  applications: {
    draft: BadgeApplicationListItemDto[];
    submitted: BadgeApplicationListItemDto[];
    accepted: BadgeApplicationListItemDto[];
    rejected: BadgeApplicationListItemDto[];
  };
  className?: string;
}
```

**Implementation Notes:**
- Default to "draft" tab
- Show max 5-10 items per tab
- "View All" link: `/applications?status={selected-status}`
- Use shadcn/ui Tabs, TabsList, TabsTrigger, TabsContent
- Display empty state with helpful message if no items

---

### BadgeApplicationItem (React Component)

**Description:** List item displaying summary information for a single badge application with status indicator, badge details, and navigation link.

**Main Elements:**
- Container div with hover effects
- Catalog badge title
- Category and level badges (shadcn/ui Badge)
- Status badge (shadcn/ui Badge) with color coding
- Dates (created, submitted)
- Link wrapper for navigation

**Handled Events:**
- Click for navigation to detail view

**Handled Validation:**
- None (display only)

**Types:**
- `BadgeApplicationListItemDto`

**Props:**
```typescript
interface BadgeApplicationItemProps {
  application: BadgeApplicationListItemDto;
  onNavigate?: (id: string) => void;
  className?: string;
}
```

**Implementation Notes:**
- Status badge colors: draft=gray, submitted=blue, accepted=green, rejected=red, used_in_promotion=purple
- Navigate to `/applications/{id}` on click
- Display catalog badge title, category, level
- Show appropriate date based on status (created_at, submitted_at, etc.)

---

### PromotionsOverview (React Component)

**Description:** Section displaying user's promotions with status indicators and quick navigation.

**Main Elements:**
- Card container (shadcn/ui)
- Section header with title and "View All" link
- List of PromotionItem components
- Empty state component (if no promotions)

**Handled Events:**
- Click on individual items for navigation

**Handled Validation:**
- None (display only)

**Types:**
- `PromotionListItemDto[]`

**Props:**
```typescript
interface PromotionsOverviewProps {
  promotions: {
    draft: PromotionListItemDto[];
    submitted: PromotionListItemDto[];
    approved: PromotionListItemDto[];
    rejected: PromotionListItemDto[];
  };
  className?: string;
}
```

**Implementation Notes:**
- Show all statuses in single list (or use tabs like badge applications)
- Max 5-10 items total
- "View All" link: `/promotions`
- Sort by most recent first

---

### PromotionItem (React Component)

**Description:** List item displaying summary information for a single promotion with status indicator, template info, and badge count.

**Main Elements:**
- Container div with hover effects
- Template name
- Path and level progression (from_level → to_level)
- Status badge (shadcn/ui Badge)
- Badge count indicator
- Created/submitted date
- Link wrapper for navigation

**Handled Events:**
- Click for navigation to detail view

**Handled Validation:**
- None (display only)

**Types:**
- `PromotionListItemDto`

**Props:**
```typescript
interface PromotionItemProps {
  promotion: PromotionListItemDto;
  onNavigate?: (id: string) => void;
  className?: string;
}
```

**Implementation Notes:**
- Status badge colors: draft=gray, submitted=blue, approved=green, rejected=red
- Navigate to `/promotions/{id}` on click
- Display template name, path, level progression
- Show badge count: "X badges attached"
- Show appropriate date based on status

---

## 5. Types

### Existing Types (from types.ts)

**BadgeApplicationListItemDto:**
```typescript
interface BadgeApplicationListItemDto extends BadgeApplicationRow {
  catalog_badge: CatalogBadgeSummary;
}
```
- Includes all badge application fields plus nested catalog badge summary
- Used for displaying badge application lists

**PromotionListItemDto:**
```typescript
interface PromotionListItemDto extends PromotionRow {
  badge_count: number;
  template: PromotionTemplateSummary;
}
```
- Includes all promotion fields plus badge count and template summary
- Used for displaying promotion lists

**PaginatedResponse<T>:**
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}
```
- Generic wrapper for paginated API responses

**Enums:**
- `BadgeApplicationStatus`: draft | submitted | accepted | rejected | used_in_promotion
- `PromotionStatus`: draft | submitted | approved | rejected
- `BadgeCategory`: technical | organizational | softskilled
- `BadgeLevel`: gold | silver | bronze

### New Types (Dashboard-Specific)

**DashboardViewModel:**
```typescript
interface DashboardViewModel {
  badgeApplications: {
    draft: BadgeApplicationListItemDto[];
    submitted: BadgeApplicationListItemDto[];
    accepted: BadgeApplicationListItemDto[];
    rejected: BadgeApplicationListItemDto[];
  };
  promotions: {
    draft: PromotionListItemDto[];
    submitted: PromotionListItemDto[];
    approved: PromotionListItemDto[];
    rejected: PromotionListItemDto[];
  };
  statistics: DashboardStatistics;
}
```
- **Fields:**
  - `badgeApplications`: Object containing arrays of badge applications grouped by status
    - `draft`: Array of badge applications in draft status
    - `submitted`: Array of badge applications in submitted status
    - `accepted`: Array of accepted badge applications
    - `rejected`: Array of rejected badge applications
  - `promotions`: Object containing arrays of promotions grouped by status
    - `draft`: Array of promotions in draft status
    - `submitted`: Array of submitted promotions
    - `approved`: Array of approved promotions
    - `rejected`: Array of rejected promotions
  - `statistics`: Aggregated counts for dashboard statistics

**DashboardStatistics:**
```typescript
interface DashboardStatistics {
  draftApplicationsCount: number;
  submittedApplicationsCount: number;
  acceptedBadgesCount: number;
  rejectedApplicationsCount: number;
  draftPromotionsCount: number;
  submittedPromotionsCount: number;
  approvedPromotionsCount: number;
  rejectedPromotionsCount: number;
}
```
- **Fields:**
  - `draftApplicationsCount`: Number of badge applications in draft status
  - `submittedApplicationsCount`: Number of badge applications in submitted status
  - `acceptedBadgesCount`: Number of accepted badge applications (available for promotions)
  - `rejectedApplicationsCount`: Number of rejected badge applications
  - `draftPromotionsCount`: Number of promotions in draft status
  - `submittedPromotionsCount`: Number of promotions in submitted status
  - `approvedPromotionsCount`: Number of approved promotions
  - `rejectedPromotionsCount`: Number of rejected promotions

**StatCardProps:**
```typescript
interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  link?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}
```
- **Fields:**
  - `label`: Display label for the statistic (e.g., "Draft Applications")
  - `value`: Numeric value to display
  - `icon`: Optional React element for icon display
  - `link`: Optional URL for navigation when card is clicked
  - `variant`: Visual style variant for the card (affects colors)
  - `className`: Optional additional CSS classes

**QuickActionItem:**
```typescript
interface QuickActionItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary';
}
```
- **Fields:**
  - `label`: Button text
  - `href`: Navigation destination URL
  - `icon`: Optional icon element
  - `variant`: Button style variant

**DashboardViewProps:**
```typescript
interface DashboardViewProps {
  initialData: DashboardViewModel;
  userId: string;
}
```
- **Fields:**
  - `initialData`: Pre-fetched dashboard data from SSR
  - `userId`: Current authenticated user's ID

## 6. State Management

### Approach: React Component State with Fetch API

The dashboard uses a simple state management approach suitable for its read-heavy nature:

1. **Server-Side Rendering (SSR)**: Initial data is fetched during SSR in the Astro page component
2. **Client-Side State**: React components maintain local state for interactive features
3. **No Global State**: No Redux, Zustand, or similar needed for MVP
4. **Manual Refresh**: Explicit refetch via fetch API calls

### State Structure

**In DashboardView Component:**
```typescript
const [data, setData] = useState<DashboardViewModel>(initialData);
const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [selectedBadgeStatus, setSelectedBadgeStatus] = useState<BadgeApplicationStatusType>('draft');
```

**State Variables:**
- `data`: Current dashboard data (initialized from props)
- `isRefreshing`: Whether a manual refresh is in progress
- `error`: Error message if refresh fails
- `selectedBadgeStatus`: Currently selected tab in BadgeApplicationsOverview

### Data Fetching Strategy

**Initial Load (SSR):**
- Astro page fetches data server-side before rendering
- Multiple API calls made in parallel:
  - Badge applications by status (draft, submitted, accepted, rejected)
  - Promotions by status (draft, submitted, approved, rejected)
- Data transformed into DashboardViewModel
- Passed to DashboardView as props

**Client-Side Refresh:**
- User triggers refresh via button click
- Fetch API calls made to same endpoints
- Loading state shown during fetch
- Data updated on success, error shown on failure

### Custom Hook: useDashboardData

**Purpose:** Encapsulate data fetching logic for reusability and testing

**Implementation:**
```typescript
function useDashboardData(userId: string, initialData: DashboardViewModel) {
  const [data, setData] = useState<DashboardViewModel>(initialData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Parallel fetch of all required data
      const [draftApps, submittedApps, acceptedApps, rejectedApps,
             draftPromos, submittedPromos, approvedPromos, rejectedPromos] =
        await Promise.all([
          fetch('/api/badge-applications?status=draft&limit=10').then(r => r.json()),
          fetch('/api/badge-applications?status=submitted&limit=10').then(r => r.json()),
          fetch('/api/badge-applications?status=accepted&limit=10').then(r => r.json()),
          fetch('/api/badge-applications?status=rejected&limit=10').then(r => r.json()),
          fetch('/api/promotions?status=draft&limit=10').then(r => r.json()),
          fetch('/api/promotions?status=submitted&limit=10').then(r => r.json()),
          fetch('/api/promotions?status=approved&limit=10').then(r => r.json()),
          fetch('/api/promotions?status=rejected&limit=10').then(r => r.json()),
        ]);

      // Transform into DashboardViewModel
      const newData: DashboardViewModel = {
        badgeApplications: {
          draft: draftApps.data,
          submitted: submittedApps.data,
          accepted: acceptedApps.data,
          rejected: rejectedApps.data,
        },
        promotions: {
          draft: draftPromos.data,
          submitted: submittedPromos.data,
          approved: approvedPromos.data,
          rejected: rejectedPromos.data,
        },
        statistics: calculateStatistics(/* ... */),
      };

      setData(newData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return { data, isRefreshing, error, refetch };
}
```

### Auto-Refresh (Optional for MVP)

Consider implementing auto-refresh with configurable interval:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, 60000); // Refresh every 60 seconds

  return () => clearInterval(interval);
}, [refetch]);
```

**Notes:**
- Auto-refresh is optional for MVP
- Can be added later based on user feedback
- Should be pauseable if user is actively interacting

## 7. API Integration

### Endpoints Used

**1. GET /api/badge-applications**

**Purpose:** Fetch user's badge applications filtered by status

**Query Parameters:**
- `status`: (optional) Filter by status - one of: draft, submitted, accepted, rejected, used_in_promotion
- `limit`: (optional) Number of items to return (default: 20, max: 100) - use 10 for dashboard
- `offset`: (optional) Pagination offset (default: 0)
- `sort`: (optional) Sort field (default: created_at)
- `order`: (optional) Sort order - asc or desc (default: desc)

**Request Type:** `GET`

**Response Type:** `PaginatedResponse<BadgeApplicationListItemDto>`

**Response Structure:**
```typescript
{
  data: BadgeApplicationListItemDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

**Usage in Dashboard:**
- Make 4 parallel calls with different status filters:
  - `?status=draft&limit=10&sort=created_at&order=desc`
  - `?status=submitted&limit=10&sort=submitted_at&order=desc`
  - `?status=accepted&limit=10&sort=created_at&order=desc`
  - `?status=rejected&limit=10&sort=created_at&order=desc`

**Error Handling:**
- 401 Unauthorized: Redirect to login
- 400 Bad Request: Show error message
- 500 Internal Server Error: Show error message with retry option

---

**2. GET /api/promotions**

**Purpose:** Fetch user's promotions filtered by status

**Query Parameters:**
- `status`: (optional) Filter by status - one of: draft, submitted, approved, rejected
- `limit`: (optional) Number of items to return (default: 20, max: 100) - use 10 for dashboard
- `offset`: (optional) Pagination offset (default: 0)
- `sort`: (optional) Sort field (default: created_at)
- `order`: (optional) Sort order - asc or desc (default: desc)

**Request Type:** `GET`

**Response Type:** `PaginatedResponse<PromotionListItemDto>`

**Response Structure:**
```typescript
{
  data: PromotionListItemDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

**Usage in Dashboard:**
- Make 4 parallel calls with different status filters:
  - `?status=draft&limit=10&sort=created_at&order=desc`
  - `?status=submitted&limit=10&sort=submitted_at&order=desc`
  - `?status=approved&limit=10&sort=created_at&order=desc`
  - `?status=rejected&limit=10&sort=created_at&order=desc`

**Error Handling:**
- 401 Unauthorized: Redirect to login
- 400 Bad Request: Show error message
- 500 Internal Server Error: Show error message with retry option

---

### API Call Implementation

**Server-Side (Astro Page):**
```typescript
// In DashboardPage.astro
const supabase = Astro.locals.supabase;

// Check authentication
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return Astro.redirect('/login');
}

// Fetch all data in parallel
const [
  draftAppsResponse,
  submittedAppsResponse,
  acceptedAppsResponse,
  rejectedAppsResponse,
  draftPromosResponse,
  submittedPromosResponse,
  approvedPromosResponse,
  rejectedPromosResponse
] = await Promise.all([
  fetch(`${Astro.url.origin}/api/badge-applications?status=draft&limit=10`, {
    headers: { Cookie: Astro.request.headers.get('Cookie') || '' }
  }),
  // ... other calls
]);

// Parse responses
const draftApps = await draftAppsResponse.json();
// ... parse others

// Build view model
const dashboardData: DashboardViewModel = {
  badgeApplications: {
    draft: draftApps.data,
    submitted: submittedApps.data,
    accepted: acceptedApps.data,
    rejected: rejectedApps.data,
  },
  promotions: {
    draft: draftPromos.data,
    submitted: submittedPromos.data,
    approved: approvedPromos.data,
    rejected: rejectedPromos.data,
  },
  statistics: {
    draftApplicationsCount: draftApps.pagination.total,
    submittedApplicationsCount: submittedApps.pagination.total,
    acceptedBadgesCount: acceptedApps.pagination.total,
    rejectedApplicationsCount: rejectedApps.pagination.total,
    draftPromotionsCount: draftPromos.pagination.total,
    submittedPromotionsCount: submittedPromos.pagination.total,
    approvedPromotionsCount: approvedPromos.pagination.total,
    rejectedPromotionsCount: rejectedPromos.pagination.total,
  },
};
```

**Client-Side (React Component):**
```typescript
// In useDashboardData hook
const refetch = async () => {
  setIsRefreshing(true);
  setError(null);

  try {
    const responses = await Promise.all([
      fetch('/api/badge-applications?status=draft&limit=10'),
      fetch('/api/badge-applications?status=submitted&limit=10'),
      fetch('/api/badge-applications?status=accepted&limit=10'),
      fetch('/api/badge-applications?status=rejected&limit=10'),
      fetch('/api/promotions?status=draft&limit=10'),
      fetch('/api/promotions?status=submitted&limit=10'),
      fetch('/api/promotions?status=approved&limit=10'),
      fetch('/api/promotions?status=rejected&limit=10'),
    ]);

    // Check for errors
    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
    }

    // Parse all responses
    const [
      draftApps, submittedApps, acceptedApps, rejectedApps,
      draftPromos, submittedPromos, approvedPromos, rejectedPromos
    ] = await Promise.all(responses.map(r => r.json()));

    // Update state with new data
    setData({
      badgeApplications: {
        draft: draftApps.data,
        submitted: submittedApps.data,
        accepted: acceptedApps.data,
        rejected: rejectedApps.data,
      },
      promotions: {
        draft: draftPromos.data,
        submitted: submittedPromos.data,
        approved: approvedPromos.data,
        rejected: rejectedPromos.data,
      },
      statistics: calculateStatistics(/* ... */),
    });
  } catch (err) {
    setError(err as Error);
  } finally {
    setIsRefreshing(false);
  }
};
```

## 8. User Interactions

### 1. Page Load

**Interaction:** User navigates to `/` (dashboard)

**Expected Behavior:**
1. Browser requests dashboard page
2. Server performs authentication check
3. If not authenticated, redirect to `/login`
4. If authenticated, fetch all required data server-side
5. Render page with data
6. Hydrate React components on client
7. Display fully populated dashboard

**Visual Feedback:**
- Show skeleton loaders during initial SSR
- Smooth transition from skeleton to actual content

---

### 2. Click on Stat Card

**Interaction:** User clicks on a StatCard (e.g., "3 Draft Applications")

**Expected Behavior:**
1. Navigate to filtered list view
2. URL: `/applications?status=draft` (or corresponding filter)
3. List page shows filtered results matching the statistic

**Visual Feedback:**
- Card has hover effect (subtle scale/shadow)
- Cursor changes to pointer
- Optional loading state during navigation

---

### 3. Click on Badge Application Item

**Interaction:** User clicks on a badge application in the list

**Expected Behavior:**
1. Navigate to detail view
2. URL: `/applications/{id}`
3. Detail page shows full application information

**Visual Feedback:**
- Row/item has hover effect (background color change)
- Cursor changes to pointer
- Optional loading state during navigation

---

### 4. Click on Promotion Item

**Interaction:** User clicks on a promotion in the list

**Expected Behavior:**
1. Navigate to detail view
2. URL: `/promotions/{id}`
3. Detail page shows full promotion information

**Visual Feedback:**
- Row/item has hover effect
- Cursor changes to pointer
- Optional loading state during navigation

---

### 5. Switch Badge Application Status Tab

**Interaction:** User clicks on a different tab (Draft, Submitted, Accepted, Rejected)

**Expected Behavior:**
1. Tab becomes active (visual state change)
2. Content area updates to show applications with selected status
3. Empty state shown if no applications in that status

**Visual Feedback:**
- Active tab highlighted (border, background, or underline)
- Smooth transition between tab contents
- Empty state with helpful message if no data

---

### 6. Click Quick Action Button

**Interaction:** User clicks on a quick action button (e.g., "Browse Catalog", "Apply for Badge")

**Expected Behavior:**
1. Navigate to corresponding page
2. URLs:
   - "Browse Catalog" → `/catalog`
   - "Apply for Badge" → `/apply/new`
   - "View Templates" → `/promotion-templates`

**Visual Feedback:**
- Button hover effect
- Optional loading state during navigation

---

### 7. Manual Refresh

**Interaction:** User clicks refresh button in header

**Expected Behavior:**
1. Trigger refetch of all data
2. Show loading indicator
3. Update all sections with fresh data
4. Show success/error notification

**Visual Feedback:**
- Refresh icon animates (spinning)
- Loading overlay or inline spinners
- Toast notification on success/error

---

### 8. View All Links

**Interaction:** User clicks "View All" link in section headers

**Expected Behavior:**
1. Navigate to full list page
2. URLs:
   - Badge Applications: `/applications` (optionally with status filter)
   - Promotions: `/promotions`

**Visual Feedback:**
- Link hover effect (underline, color change)
- Standard link styling

---

### 9. Empty State Interaction

**Interaction:** User views section with no data

**Expected Behavior:**
1. Display empty state message
2. Provide call-to-action button
3. CTA navigates to relevant creation page

**Visual Feedback:**
- Centered empty state with icon
- Helpful message: "You don't have any badge applications yet"
- Primary CTA button: "Apply for Your First Badge"

## 9. Conditions and Validation

### Data Display Conditions

**1. Badge Application Status Filtering**

**Condition:** Only show badge applications matching the selected status tab

**Components Affected:** BadgeApplicationsOverview

**Validation:**
- Selected status must be a valid value from `BadgeApplicationStatusType` enum
- Default to 'draft' if no selection

**UI State Impact:**
- Active tab visually highlighted
- Content area shows only matching applications
- Empty state shown if no applications match

---

**2. Empty Data States**

**Condition:** User has no badge applications or promotions

**Components Affected:** BadgeApplicationsOverview, PromotionsOverview

**Validation:**
- Check if data arrays are empty or null
- Check if pagination.total is 0

**UI State Impact:**
- Show empty state component with helpful message
- Hide list/table elements
- Display CTA button for creating first item

---

**3. Status Badge Color Coding**

**Condition:** Status determines badge color for visual clarity

**Components Affected:** BadgeApplicationItem, PromotionItem

**Validation:**
- Status value must be from defined enum
- Map status to color variant

**Mapping:**
- Badge Applications:
  - `draft` → gray badge
  - `submitted` → blue badge
  - `accepted` → green badge
  - `rejected` → red badge
  - `used_in_promotion` → purple badge
- Promotions:
  - `draft` → gray badge
  - `submitted` → blue badge
  - `approved` → green badge
  - `rejected` → red badge

**UI State Impact:**
- Badge component styled with appropriate color
- Consistent visual language across app

---

**4. Data Freshness**

**Condition:** Dashboard data should be reasonably fresh

**Components Affected:** DashboardView

**Validation:**
- No explicit validation (relies on API responses)
- Optional: track last refresh timestamp

**UI State Impact:**
- Optional: Display "Last updated: X minutes ago"
- Refresh button available for manual updates
- Optional: Auto-refresh every 60 seconds

---

**5. Navigation Links**

**Condition:** Links should only be enabled for valid items

**Components Affected:** StatCard, BadgeApplicationItem, PromotionItem

**Validation:**
- Item must have valid ID
- Link href must be valid path

**UI State Impact:**
- Clickable elements have pointer cursor
- Disabled links styled appropriately (if needed)

---

**6. Pagination Display**

**Condition:** Show "View All" link only if more items exist

**Components Affected:** BadgeApplicationsOverview, PromotionsOverview

**Validation:**
- Check `pagination.has_more` or `pagination.total > displayed items`

**UI State Impact:**
- "View All" link visible if more items exist
- Link hidden if all items already shown

---

### API Response Validation

**Condition:** API responses must match expected shape

**Components Affected:** All components consuming API data

**Validation:**
- Check response is valid JSON
- Verify required fields exist
- Type checking via TypeScript

**Error Handling:**
- Display error state if validation fails
- Log error to console
- Provide retry option

---

### Authentication State

**Condition:** User must be authenticated to view dashboard

**Components Affected:** DashboardPage (Astro)

**Validation:**
- Check Supabase auth session
- Verify user object exists

**UI State Impact:**
- Redirect to `/login` if not authenticated
- Block rendering of dashboard components

---

### Loading States

**Condition:** Show loading indicators during data fetch

**Components Affected:** DashboardView

**Validation:**
- Track loading state via `isRefreshing` flag

**UI State Impact:**
- Show spinner or skeleton loaders
- Disable interactive elements during load
- Clear indicators when complete

---

### Error States

**Condition:** Handle API errors gracefully

**Components Affected:** DashboardView

**Validation:**
- Catch fetch errors
- Check response status codes

**UI State Impact:**
- Display error message
- Show retry button
- Log error details to console

## 10. Error Handling

### Error Categories and Handling Strategies

**1. Authentication Errors (401 Unauthorized)**

**Scenario:**
- User session expired
- Invalid authentication token
- User logged out in another tab

**Handling Strategy:**
```typescript
if (response.status === 401) {
  // Redirect to login page
  window.location.href = '/login?redirect=/';
}
```

**UI Feedback:**
- Automatic redirect to login page
- Optional: Show toast notification "Session expired, please log in"
- Preserve redirect URL to return to dashboard after login

---

**2. Authorization Errors (403 Forbidden)**

**Scenario:**
- User lacks permission for requested resource
- Should not occur for dashboard (all authenticated users allowed)

**Handling Strategy:**
```typescript
if (response.status === 403) {
  setError('You do not have permission to access this resource');
}
```

**UI Feedback:**
- Show error message in UI
- Provide link to contact support
- Log error details

---

**3. Network Errors**

**Scenario:**
- No internet connection
- DNS resolution failure
- Request timeout
- Server unreachable

**Handling Strategy:**
```typescript
try {
  const response = await fetch('/api/badge-applications');
  // ...
} catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    setError('Network error. Please check your internet connection.');
  }
}
```

**UI Feedback:**
- Show error banner: "Unable to connect. Please check your internet connection."
- Provide retry button
- Keep showing stale data if available
- Disable features requiring network access

---

**4. Server Errors (500 Internal Server Error)**

**Scenario:**
- Unhandled exception on server
- Database connection failure
- Server overload

**Handling Strategy:**
```typescript
if (response.status >= 500) {
  setError('Server error. Please try again later.');
  // Log to error tracking service (if available)
  console.error('Server error:', await response.text());
}
```

**UI Feedback:**
- Show error message: "Something went wrong on our end. Please try again later."
- Provide retry button
- Display last successful data if available
- Show support contact information

---

**5. Invalid Response Data**

**Scenario:**
- API returns data that doesn't match expected shape
- Missing required fields
- Type mismatches

**Handling Strategy:**
```typescript
function validateBadgeApplicationResponse(data: unknown): data is PaginatedResponse<BadgeApplicationListItemDto> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'pagination' in data &&
    Array.isArray((data as any).data)
  );
}

const responseData = await response.json();
if (!validateBadgeApplicationResponse(responseData)) {
  throw new Error('Invalid response format');
}
```

**UI Feedback:**
- Show error message: "Unexpected data format. Please refresh the page."
- Log detailed error information
- Provide refresh button
- Clear invalid data from state

---

**6. Partial Data Load Failures**

**Scenario:**
- Some API calls succeed, others fail
- Example: Badge applications load, but promotions fail

**Handling Strategy:**
```typescript
const results = await Promise.allSettled([
  fetch('/api/badge-applications?status=draft'),
  fetch('/api/badge-applications?status=submitted'),
  fetch('/api/promotions?status=draft'),
  // ...
]);

const successfulData = results
  .filter((r): r is PromiseFulfilledResult<Response> => r.status === 'fulfilled')
  .map(r => r.value);

const errors = results
  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  .map(r => r.reason);

// Show partial data with error indicators for failed sections
```

**UI Feedback:**
- Display successfully loaded sections normally
- Show error state for failed sections within their container
- Provide section-specific retry buttons
- Toast notification: "Some data could not be loaded"

---

**7. Empty Data States**

**Scenario:**
- User has no badge applications
- User has no promotions
- New user with no activity

**Handling Strategy:**
```typescript
if (badgeApplications.length === 0) {
  return (
    <EmptyState
      icon={<FileIcon />}
      title="No badge applications yet"
      description="Start your journey by applying for your first badge"
      action={
        <Button onClick={() => navigate('/apply/new')}>
          Apply for Badge
        </Button>
      }
    />
  );
}
```

**UI Feedback:**
- Friendly empty state illustration/icon
- Helpful message explaining the state
- Clear call-to-action button
- Guidance on next steps

---

**8. Rate Limiting (429 Too Many Requests)**

**Scenario:**
- User refreshes too frequently
- API rate limit exceeded

**Handling Strategy:**
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  setError(`Too many requests. Please wait ${retryAfter} seconds.`);

  // Optionally disable refresh button temporarily
  setTimeout(() => {
    setCanRefresh(true);
  }, parseInt(retryAfter || '60') * 1000);
}
```

**UI Feedback:**
- Error message with countdown timer
- Disable refresh button temporarily
- Show retry availability time

---

**9. Concurrent Modification Conflicts**

**Scenario:**
- Data changed by another process while user viewing
- Stale data displayed

**Handling Strategy:**
```typescript
// Optimistic UI update with conflict detection
async function handleUpdate(id: string, data: unknown) {
  try {
    const response = await fetch(`/api/badge-applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (response.status === 409) {
      // Conflict - data was modified elsewhere
      const errorData = await response.json();
      setError('This item was modified elsewhere. Refreshing...');
      await refetch(); // Reload fresh data
    }
  } catch (error) {
    // Handle error
  }
}
```

**UI Feedback:**
- Warning message about conflict
- Automatic refresh of data
- Preserve user's current view context

---

### Error Recovery Strategies

**1. Automatic Retry**
- Retry failed requests with exponential backoff
- Limit retry attempts (max 3)
- Only for transient errors (network, 5xx)

**2. Fallback to Stale Data**
- Display last successfully loaded data
- Show indicator that data may be stale
- Provide manual refresh option

**3. Graceful Degradation**
- Show partial UI with available data
- Hide or disable unavailable features
- Maintain core functionality

**4. User-Triggered Recovery**
- Prominent "Retry" or "Refresh" buttons
- Clear error messages with actionable steps
- Preserve user's context after recovery

### Error Logging

**Development:**
```typescript
console.error('Dashboard error:', {
  timestamp: new Date().toISOString(),
  error: error.message,
  stack: error.stack,
  context: 'DashboardView',
});
```

**Production:**
```typescript
// Send to error tracking service (e.g., Sentry)
errorTracker.captureException(error, {
  tags: { component: 'Dashboard' },
  extra: { userId, timestamp: Date.now() },
});
```

## 11. Implementation Steps

### Phase 1: Foundation Setup

**Step 1.1: Create Type Definitions**
- Add new dashboard-specific types to `src/types.ts` or create `src/types/dashboard.types.ts`
- Define: `DashboardViewModel`, `DashboardStatistics`, `StatCardProps`, `QuickActionItem`, component prop interfaces
- Export all types for use in components

**Step 1.2: Create Astro Page Component**
- Create file: `src/pages/index.astro`
- Set up page layout and metadata
- Implement authentication check with redirect to login if not authenticated
- Add placeholder for DashboardView React component

**Step 1.3: Set Up Data Fetching Logic**
- Implement parallel API calls for badge applications (4 calls, one per status)
- Implement parallel API calls for promotions (4 calls, one per status)
- Create helper function to transform API responses into `DashboardViewModel`
- Calculate statistics from pagination.total values
- Handle errors during SSR (show error page or graceful fallback)

---

### Phase 2: Core React Components

**Step 2.1: Create DashboardView Container**
- Create file: `src/components/DashboardView.tsx`
- Accept `initialData` and `userId` props
- Set up React state for data, loading, error
- Implement basic layout structure (header, main sections)
- Add client:load directive in Astro page

**Step 2.2: Implement useDashboardData Hook**
- Create file: `src/hooks/useDashboardData.ts`
- Implement refetch logic with parallel API calls
- Handle loading and error states
- Return data, isRefreshing, error, refetch function
- Use in DashboardView component

**Step 2.3: Create StatCard Component**
- Create file: `src/components/dashboard/StatCard.tsx`
- Use shadcn/ui Card component as base
- Implement variant styling (default, success, warning, error)
- Add link wrapper for navigation
- Make card clickable and accessible
- Add hover effects

**Step 2.4: Create StatisticsGrid Component**
- Create file: `src/components/dashboard/StatisticsGrid.tsx`
- Implement responsive grid layout (CSS Grid or Tailwind)
- Render 4 StatCard components
- Pass statistics props to each card
- Define navigation links for each stat

---

### Phase 3: Badge Applications Section

**Step 3.1: Create BadgeApplicationsOverview**
- Create file: `src/components/dashboard/BadgeApplicationsOverview.tsx`
- Use shadcn/ui Card and Tabs components
- Implement tab system for status filtering
- Add section header with "View All" link
- Handle empty state

**Step 3.2: Create BadgeApplicationItem**
- Create file: `src/components/dashboard/BadgeApplicationItem.tsx`
- Display badge application summary (title, category, level, status)
- Use shadcn/ui Badge component for status and category/level
- Implement status color coding
- Add click handler for navigation
- Style hover effects

**Step 3.3: Integrate Badge Applications**
- Wire up BadgeApplicationsOverview in DashboardView
- Pass grouped badge applications data
- Connect tab selection to state
- Implement navigation handlers

---

### Phase 4: Promotions Section

**Step 4.1: Create PromotionsOverview**
- Create file: `src/components/dashboard/PromotionsOverview.tsx`
- Use shadcn/ui Card component
- Add section header with "View All" link
- Implement list layout
- Handle empty state

**Step 4.2: Create PromotionItem**
- Create file: `src/components/dashboard/PromotionItem.tsx`
- Display promotion summary (template name, path, level progression, status)
- Use shadcn/ui Badge for status indicator
- Show badge count
- Add click handler for navigation
- Style hover effects

**Step 4.3: Integrate Promotions**
- Wire up PromotionsOverview in DashboardView
- Pass promotions data
- Flatten status groups into single list (or use tabs like badge applications)
- Implement navigation handlers

---

### Phase 5: Quick Actions

**Step 5.1: Create QuickActions Component**
- Create file: `src/components/dashboard/QuickActions.tsx`
- Use shadcn/ui Button component
- Implement responsive layout (horizontal on desktop, stack on mobile)
- Define action items: "Browse Catalog", "Apply for Badge", "View Templates"
- Use Astro Link or anchor tags for navigation

**Step 5.2: Integrate Quick Actions**
- Add QuickActions to DashboardView layout
- Position prominently at top of dashboard
- Style as primary CTAs

---

### Phase 6: Empty States

**Step 6.1: Create EmptyState Component**
- Create file: `src/components/EmptyState.tsx`
- Accept props: icon, title, description, action button
- Center content with appropriate spacing
- Style for visual appeal and clarity

**Step 6.2: Add Empty States to Sections**
- Integrate EmptyState in BadgeApplicationsOverview (for each tab)
- Integrate EmptyState in PromotionsOverview
- Provide appropriate messages and CTAs for each state

---

### Phase 7: Error Handling

**Step 7.1: Implement Error Boundary**
- Create error boundary component for React tree
- Catch rendering errors
- Display user-friendly error message

**Step 7.2: Add Error States to Components**
- Add error prop to DashboardView
- Display error banner or message when errors occur
- Provide retry button
- Handle specific error types (network, auth, server)

**Step 7.3: Implement Retry Logic**
- Add retry button to error states
- Clear error state before retry
- Call refetch function
- Show loading state during retry

---

### Phase 8: Loading States

**Step 8.1: Add Loading Indicators**
- Show skeleton loaders during initial SSR
- Display spinners during client-side refresh
- Use shadcn/ui Skeleton component

**Step 8.2: Implement Refresh Button**
- Add refresh button to dashboard header
- Show spinning icon during refresh
- Disable button while refreshing
- Display toast notification on success/error

---

### Phase 9: Styling and Polish

**Step 9.1: Apply Tailwind Styling**
- Implement responsive layouts
- Apply consistent spacing and typography
- Add hover and focus states
- Ensure WCAG AA accessibility

**Step 9.2: Add Animations and Transitions**
- Smooth transitions between tab contents
- Card hover animations (subtle scale or shadow)
- Loading state animations
- Toast notifications

**Step 9.3: Responsive Design**
- Test on various screen sizes
- Adjust layouts for mobile (stack components vertically)
- Ensure touch targets are appropriately sized
- Test with browser dev tools

---

### Phase 10: Testing and Refinement

**Step 10.1: Manual Testing**
- Test with different data scenarios (empty, partial, full)
- Test error scenarios (network failure, invalid data)
- Test navigation and interactions
- Test refresh functionality

**Step 10.2: Accessibility Testing**
- Verify keyboard navigation
- Check screen reader compatibility
- Ensure proper ARIA labels
- Test color contrast

**Step 10.3: Performance Testing**
- Measure initial load time
- Profile React rendering performance
- Optimize API calls if needed
- Test with slow network conditions

**Step 10.4: Cross-Browser Testing**
- Test in Chrome, Firefox, Safari, Edge
- Check for browser-specific issues
- Verify consistent appearance and behavior

---

### Phase 11: Documentation and Deployment

**Step 11.1: Code Documentation**
- Add JSDoc comments to components
- Document prop interfaces
- Explain complex logic
- Add inline comments where needed

**Step 11.2: Update Project Documentation**
- Update README if needed
- Document any new environment variables
- Note any dependencies added

**Step 11.3: Deploy to Development Environment**
- Build project
- Deploy to dev/staging environment
- Perform smoke tests
- Gather feedback from stakeholders

---

### Implementation Checklist

- [ ] Phase 1: Foundation Setup
  - [ ] Create type definitions
  - [ ] Create Astro page component
  - [ ] Set up data fetching logic
- [ ] Phase 2: Core React Components
  - [ ] Create DashboardView container
  - [ ] Implement useDashboardData hook
  - [ ] Create StatCard component
  - [ ] Create StatisticsGrid component
- [ ] Phase 3: Badge Applications Section
  - [ ] Create BadgeApplicationsOverview
  - [ ] Create BadgeApplicationItem
  - [ ] Integrate badge applications
- [ ] Phase 4: Promotions Section
  - [ ] Create PromotionsOverview
  - [ ] Create PromotionItem
  - [ ] Integrate promotions
- [ ] Phase 5: Quick Actions
  - [ ] Create QuickActions component
  - [ ] Integrate quick actions
- [ ] Phase 6: Empty States
  - [ ] Create EmptyState component
  - [ ] Add empty states to sections
- [ ] Phase 7: Error Handling
  - [ ] Implement error boundary
  - [ ] Add error states to components
  - [ ] Implement retry logic
- [ ] Phase 8: Loading States
  - [ ] Add loading indicators
  - [ ] Implement refresh button
- [ ] Phase 9: Styling and Polish
  - [ ] Apply Tailwind styling
  - [ ] Add animations and transitions
  - [ ] Responsive design
- [ ] Phase 10: Testing and Refinement
  - [ ] Manual testing
  - [ ] Accessibility testing
  - [ ] Performance testing
  - [ ] Cross-browser testing
- [ ] Phase 11: Documentation and Deployment
  - [ ] Code documentation
  - [ ] Update project documentation
  - [ ] Deploy to development environment

---

### Estimated Timeline

- **Phase 1-2 (Foundation & Core):** 2-3 days
- **Phase 3-4 (Main Sections):** 3-4 days
- **Phase 5-6 (Quick Actions & Empty States):** 1-2 days
- **Phase 7-8 (Error & Loading States):** 1-2 days
- **Phase 9 (Styling & Polish):** 2-3 days
- **Phase 10 (Testing):** 2-3 days
- **Phase 11 (Documentation & Deployment):** 1 day

**Total Estimated Time:** 12-18 days

### Dependencies

- shadcn/ui components installed and configured
- Tailwind CSS configured
- Supabase client configured
- Authentication system functional
- API endpoints implemented and tested (`/api/badge-applications`, `/api/promotions`)

### Success Criteria

- [ ] Dashboard loads in under 2 seconds on average connection
- [ ] All user interactions work as expected
- [ ] Error handling covers all major scenarios
- [ ] Empty states provide clear guidance
- [ ] Responsive design works on mobile and desktop
- [ ] Accessibility score meets WCAG AA standards
- [ ] Code is well-documented and maintainable
