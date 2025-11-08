# View Implementation Plan: Application Detail / Review

## 1. Overview

The Application Detail / Review view displays comprehensive information about a single badge application. This view serves two primary user roles:

**Standard Users (Application Owners):**
- View their own badge application details
- Edit draft applications (redirects to editor)
- Delete draft applications
- Submit draft applications for admin review

**Administrators:**
- View any badge application details
- See applicant information
- Accept or reject submitted badge applications with optional decision notes
- View review history for accepted/rejected applications

The view implements server-side rendering for initial load performance, with React components providing interactive features such as status-dependent actions, review modals, and real-time state updates after mutations.

## 2. View Routing

**Primary Route:** `/applications/:id`

**Path Parameters:**
- `id` - Badge application UUID (required, validated)

**Example URLs:**
- `/applications/550e8400-e29b-41d4-a716-446655440000` - View specific application
- `/applications/550e8400-e29b-41d4-a716-446655440000/edit` - Edit application (separate view)

**Navigation:**
- Back to applications list: `/applications`
- Edit application: `/applications/:id/edit`

## 3. Component Structure

```
ApplicationDetailPage.astro (SSR)
└── ApplicationDetailView (React, client:load)
    ├── DetailHeader
    │   ├── Breadcrumb navigation
    │   ├── Page title
    │   └── StatusBadge
    ├── Content Grid (2-column responsive layout)
    │   ├── Left Column (Primary Information)
    │   │   ├── ApplicationInfoCard
    │   │   │   ├── Date fields
    │   │   │   └── Reason field
    │   │   └── CatalogBadgeInfoCard
    │   │       ├── Badge title
    │   │       ├── Category and level badges
    │   │       ├── Description
    │   │       └── Version info
    │   └── Right Column (Metadata)
    │       ├── ApplicantInfoCard (admin only)
    │       │   ├── Applicant name
    │       │   └── Applicant email
    │       └── ReviewInfoCard (if accepted/rejected)
    │           ├── Reviewer information
    │           ├── Review date
    │           └── Decision note
    ├── ActionBar
    │   ├── EditButton (draft, owner)
    │   ├── DeleteButton (draft, owner)
    │   ├── SubmitButton (draft, owner)
    │   ├── AcceptButton (submitted, admin)
    │   └── RejectButton (submitted, admin)
    └── Modals
        ├── ReviewModal (accept/reject with decision note)
        ├── ConfirmSubmitModal
        └── ConfirmDeleteModal
```

## 4. Component Details

### ApplicationDetailPage.astro

**Component Description:**
Server-side page component that fetches initial application data, handles authentication (when enabled), and renders the React view with server-rendered data. This is the entry point for the detail view.

**Main Elements:**
- Layout wrapper with page metadata
- Server-side authentication check (currently disabled for development)
- Path parameter parsing and validation (UUID format)
- API call to GET /api/badge-applications/:id
- Error boundary for 404, 403, and server errors
- ApplicationDetailView React component hydration

**Handled Events:**
None (SSR component)

**Validation Conditions:**
- Validate path parameter is valid UUID format
- Validate user authentication (production mode)
- Check user permissions (owner or admin)
- Handle missing or invalid application ID gracefully

**Types:**
- `BadgeApplicationDetailDto` - Initial data from API
- `ApiError` - Error responses

**Props:**
N/A (Top-level page component)

---

### ApplicationDetailView

**Component Description:**
Main React orchestration component that manages application detail state, handles all user actions (edit, delete, submit, accept, reject), and coordinates modal displays. Delegates rendering to child components based on status and user permissions.

**Main Elements:**
- DetailHeader with breadcrumb and status
- Two-column responsive grid layout
- ApplicationInfoCard and CatalogBadgeInfoCard (left column)
- ApplicantInfoCard and ReviewInfoCard (right column)
- ActionBar with status-dependent buttons
- Three modal dialogs (review, submit confirmation, delete confirmation)

**Handled Events:**
- Edit action → Navigate to `/applications/:id/edit`
- Delete action → Show confirmation modal → DELETE API → Navigate to list
- Submit action → Show confirmation modal → POST /submit → Update view
- Accept action → Show review modal → POST /accept → Update view
- Reject action → Show review modal → POST /reject → Update view
- Modal confirm/cancel actions

**Validation Conditions:**
- Verify user permissions before showing actions
- Check application status before allowing actions
- Validate decision note length (max 2000 chars) in review modal
- Handle concurrent modification scenarios

**Types:**
- `ApplicationDetailViewProps` - Component interface
- `BadgeApplicationDetailDto` - Application data
- `BadgeApplicationStatusType` - Status enum
- `ApiError` - Error handling

**Props:**
```typescript
interface ApplicationDetailViewProps {
  initialData: BadgeApplicationDetailDto;
  userId: string;
  isAdmin: boolean;
}
```

---

### DetailHeader

**Component Description:**
Displays breadcrumb navigation, application title, and status badge. Provides clear context about the current application and allows easy navigation back to the applications list.

**Main Elements:**
- Breadcrumb navigation (Home / Applications / [Application ID])
- Page title: "Badge Application: [Catalog Badge Title]"
- StatusBadge component with color-coded status indicator
- Application ID display (for reference)

**Handled Events:**
- Breadcrumb click → Navigate to applications list

**Validation Conditions:**
None

**Types:**
- `DetailHeaderProps` - Component interface
- `BadgeApplicationStatusType` - Status for badge

**Props:**
```typescript
interface DetailHeaderProps {
  applicationId: string;
  badgeTitle: string;
  status: BadgeApplicationStatusType;
}
```

---

### ApplicationInfoCard

**Component Description:**
Displays core application information including application dates, fulfillment dates, reason/evidence text, and timestamps. This card shows the primary data that the applicant provided.

**Main Elements:**
- Card container with header "Application Details"
- Date of Application field (formatted date)
- Date of Fulfillment field (formatted date or "Not specified")
- Reason/Evidence textarea-style display (multi-line text)
- Created At timestamp
- Submitted At timestamp (if submitted)
- Character count indicator for reason field

**Handled Events:**
None (display only)

**Validation Conditions:**
- Handle null dateOfFulfillment gracefully
- Handle null reason gracefully
- Format dates consistently (locale-based)
- Truncate or scroll long reason text

**Types:**
- `ApplicationInfoCardProps` - Component interface

**Props:**
```typescript
interface ApplicationInfoCardProps {
  dateOfApplication: string; // YYYY-MM-DD
  dateOfFulfillment: string | null; // YYYY-MM-DD or null
  reason: string | null;
  createdAt: string; // ISO timestamp
  submittedAt: string | null; // ISO timestamp or null
}
```

---

### CatalogBadgeInfoCard

**Component Description:**
Displays detailed information about the catalog badge that this application is for. Shows badge title, category, level, description, and version information for historical tracking.

**Main Elements:**
- Card container with header "Badge Information"
- Badge title (large, prominent)
- Category badge (color-coded: technical=blue, organizational=green, softskilled=purple)
- Level badge (color-coded: gold=yellow, silver=gray, bronze=orange)
- Badge description (multi-line text)
- Catalog badge version number (for tracking)
- Created date of catalog badge

**Handled Events:**
None (display only)

**Validation Conditions:**
- Handle null description gracefully
- Display category and level with proper capitalization
- Show version prominently for audit trail

**Types:**
- `CatalogBadgeInfoCardProps` - Component interface
- `CatalogBadgeDetail` - Badge data

**Props:**
```typescript
interface CatalogBadgeInfoCardProps {
  badge: CatalogBadgeDetail;
}
```

---

### ApplicantInfoCard

**Component Description:**
Displays information about the applicant who submitted the badge application. This card is only visible to administrators and helps them understand who is applying for the badge.

**Main Elements:**
- Card container with header "Applicant Information"
- Applicant display name
- Applicant email address
- Conditional rendering based on isAdmin flag

**Handled Events:**
None (display only)

**Validation Conditions:**
- Only render if `isAdmin === true`
- Handle missing applicant data gracefully

**Types:**
- `ApplicantInfoCardProps` - Component interface
- `UserSummary` - Applicant data

**Props:**
```typescript
interface ApplicantInfoCardProps {
  applicant: UserSummary;
  isVisible: boolean; // isAdmin
}
```

---

### ReviewInfoCard

**Component Description:**
Displays review information for accepted or rejected applications. Shows who reviewed the application, when it was reviewed, and any decision notes provided by the reviewer.

**Main Elements:**
- Card container with header "Review Details"
- Review status indicator (Accepted/Rejected with color coding)
- Reviewer name
- Review date (formatted timestamp)
- Decision note (multi-line text, optional)
- Conditional rendering based on status

**Handled Events:**
None (display only)

**Validation Conditions:**
- Only render if `status === "accepted" || status === "rejected"`
- Handle null decision note gracefully (show "No decision note provided")
- Format review date consistently

**Types:**
- `ReviewInfoCardProps` - Component interface
- `BadgeApplicationStatusType` - Status type

**Props:**
```typescript
interface ReviewInfoCardProps {
  status: BadgeApplicationStatusType;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  isVisible: boolean; // status is accepted or rejected
}
```

---

### ActionBar

**Component Description:**
Contains all action buttons that vary based on the application status and user permissions. Implements business logic to show only appropriate actions for the current context.

**Main Elements:**
- Horizontal button group
- Edit button (primary, draft status, owner)
- Delete button (destructive, draft status, owner)
- Submit button (primary, draft status, owner)
- Accept button (success, submitted status, admin)
- Reject button (destructive, submitted status, admin)
- Cancel/Back button (always visible)

**Handled Events:**
- Edit click → Fires `onEdit` callback → Navigate to edit view
- Delete click → Fires `onDelete` callback → Show delete confirmation modal
- Submit click → Fires `onSubmit` callback → Show submit confirmation modal
- Accept click → Fires `onAccept` callback → Show review modal (accept mode)
- Reject click → Fires `onReject` callback → Show review modal (reject mode)
- Back click → Navigate to applications list

**Validation Conditions:**
- **Edit Button:**
  - Visible: `status === "draft" && isOwner`
  - Disabled: Never (hidden instead)

- **Delete Button:**
  - Visible: `status === "draft" && isOwner`
  - Disabled: Never (hidden instead)

- **Submit Button:**
  - Visible: `status === "draft" && isOwner`
  - Disabled: Never (hidden instead)

- **Accept Button:**
  - Visible: `status === "submitted" && isAdmin`
  - Disabled: During API call (loading state)

- **Reject Button:**
  - Visible: `status === "submitted" && isAdmin`
  - Disabled: During API call (loading state)

- **General Rule:**
  - Buttons for read-only statuses (accepted, rejected, used_in_promotion): None shown
  - Only status-appropriate actions are rendered

**Types:**
- `ActionBarProps` - Component interface
- `BadgeApplicationStatusType` - Status type

**Props:**
```typescript
interface ActionBarProps {
  status: BadgeApplicationStatusType;
  isOwner: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onBack: () => void;
}
```

---

### ReviewModal

**Component Description:**
Modal dialog for administrators to accept or reject badge applications. Includes an optional decision note field and handles the review submission workflow.

**Main Elements:**
- Modal overlay and dialog (using shadcn/ui Dialog)
- Modal header with title ("Accept Application" or "Reject Application")
- Application title display (for context)
- Decision note textarea (optional)
  - Label: "Decision Note (Optional)"
  - Placeholder: "Add a note about your decision..."
  - Max length: 2000 characters
  - Character counter
- Validation error display
- Action buttons:
  - Confirm button (primary for accept, destructive for reject)
  - Cancel button (secondary)
- Loading state during submission

**Handled Events:**
- Decision note change → Update form state, clear errors
- Decision note blur → Validate length
- Confirm click → Validate → Call onConfirm with decision note → Close on success
- Cancel click → Clear form → Call onCancel → Close modal
- Close icon click → Same as cancel

**Validation Conditions:**
- **Decision Note:**
  - Optional field (can be empty)
  - Max length: 2000 characters
  - Show error: "Decision note must be 2000 characters or less"
  - Real-time character counter

- **Form Submission:**
  - Confirm button disabled during submission (show spinner)
  - On API error, display error message
  - On success, close modal and refresh application data

**Types:**
- `ReviewModalProps` - Component interface
- `ReviewFormData` - Form state

**Props:**
```typescript
interface ReviewModalProps {
  isOpen: boolean;
  mode: "accept" | "reject";
  applicationTitle: string;
  onConfirm: (decisionNote?: string) => Promise<void>;
  onCancel: () => void;
}

interface ReviewFormData {
  decisionNote: string;
}
```

---

### ConfirmSubmitModal

**Component Description:**
Confirmation dialog that warns users before submitting their application, explaining that submission makes the application read-only for the applicant and sends it for admin review.

**Main Elements:**
- Modal overlay and alert dialog (using shadcn/ui AlertDialog)
- Warning icon
- Heading: "Submit Application?"
- Warning message explaining consequences:
  - "Once submitted, you will no longer be able to edit this application."
  - "An administrator will review your submission."
- Application title display (for context)
- Action buttons:
  - Confirm button (primary, "Submit Application")
  - Cancel button (secondary)

**Handled Events:**
- Confirm click → Call onConfirm → Close modal
- Cancel click → Call onCancel → Close modal
- Escape key → Same as cancel

**Validation Conditions:**
None

**Types:**
- `ConfirmSubmitModalProps` - Component interface

**Props:**
```typescript
interface ConfirmSubmitModalProps {
  isOpen: boolean;
  applicationTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

---

### ConfirmDeleteModal

**Component Description:**
Confirmation dialog that warns users before deleting their application, explaining that this action is permanent and cannot be undone.

**Main Elements:**
- Modal overlay and alert dialog (using shadcn/ui AlertDialog)
- Warning icon
- Heading: "Delete Application?"
- Warning message:
  - "Are you sure you want to delete this application?"
  - "This action cannot be undone."
- Application title display (for context)
- Action buttons:
  - Confirm button (destructive, "Delete Application")
  - Cancel button (secondary)

**Handled Events:**
- Confirm click → Call onConfirm → Close modal → Navigate to list
- Cancel click → Call onCancel → Close modal
- Escape key → Same as cancel

**Validation Conditions:**
None

**Types:**
- `ConfirmDeleteModalProps` - Component interface

**Props:**
```typescript
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  applicationTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

## 5. Types

### New Types Required

```typescript
/**
 * Props for ApplicationDetailView component
 */
export interface ApplicationDetailViewProps {
  initialData: BadgeApplicationDetailDto;
  userId: string;
  isAdmin: boolean;
}

/**
 * Props for DetailHeader component
 */
export interface DetailHeaderProps {
  applicationId: string;
  badgeTitle: string;
  status: BadgeApplicationStatusType;
}

/**
 * Props for ApplicationInfoCard component
 */
export interface ApplicationInfoCardProps {
  dateOfApplication: string;
  dateOfFulfillment: string | null;
  reason: string | null;
  createdAt: string;
  submittedAt: string | null;
}

/**
 * Props for CatalogBadgeInfoCard component
 */
export interface CatalogBadgeInfoCardProps {
  badge: CatalogBadgeDetail;
}

/**
 * Props for ApplicantInfoCard component
 */
export interface ApplicantInfoCardProps {
  applicant: UserSummary;
  isVisible: boolean;
}

/**
 * Props for ReviewInfoCard component
 */
export interface ReviewInfoCardProps {
  status: BadgeApplicationStatusType;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  isVisible: boolean;
}

/**
 * Props for ActionBar component
 */
export interface ActionBarProps {
  status: BadgeApplicationStatusType;
  isOwner: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onBack: () => void;
}

/**
 * Props for ReviewModal component
 */
export interface ReviewModalProps {
  isOpen: boolean;
  mode: "accept" | "reject";
  applicationTitle: string;
  onConfirm: (decisionNote?: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for ConfirmSubmitModal component
 */
export interface ConfirmSubmitModalProps {
  isOpen: boolean;
  applicationTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for ConfirmDeleteModal component
 */
export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  applicationTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Form data for review modal
 */
export interface ReviewFormData {
  decisionNote: string;
}
```

### Existing Types (from types.ts)

The following types are already defined and will be used:

- `BadgeApplicationDetailDto` - Full application data with nested catalog badge and applicant
- `BadgeApplicationStatusType` - Status enum (draft, submitted, accepted, rejected, used_in_promotion)
- `CatalogBadgeDetail` - Detailed catalog badge information
- `UserSummary` - User information (applicant)
- `ApiError` - Standard error response
- `BadgeCategoryType` - technical, organizational, softskilled
- `BadgeLevelType` - gold, silver, bronze

## 6. State Management

### State Management Pattern

**No custom hook is required** for this view. State management is straightforward and can be handled with React's built-in `useState` hook in the main ApplicationDetailView component.

### State Variables in ApplicationDetailView

```typescript
const [application, setApplication] = useState<BadgeApplicationDetailDto>(initialData);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
const [reviewMode, setReviewMode] = useState<"accept" | "reject" | null>(null);
const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
```

### State Update Pattern

1. **After Successful Actions** (Submit, Accept, Reject):
   - Call API endpoint
   - On success, fetch updated application data
   - Update `application` state with new data
   - Close relevant modal
   - Show success toast notification

2. **On Errors**:
   - Set `error` state with error message
   - Show error toast notification
   - Keep current data visible

3. **Modal State**:
   - Open modal: Set corresponding `isOpen` state to true
   - Close modal: Set corresponding `isOpen` state to false, clear form data
   - Handle escape key and backdrop clicks for closing

### Permission Derivation

```typescript
const isOwner = application.applicant_id === userId;
const canEdit = application.status === "draft" && isOwner;
const canDelete = application.status === "draft" && isOwner;
const canSubmit = application.status === "draft" && isOwner;
const canReview = application.status === "submitted" && isAdmin;
```

## 7. API Integration

### GET /api/badge-applications/:id

**Purpose:** Fetch application details (initial load and refetch after mutations)

**Request:**
- Method: GET
- URL: `/api/badge-applications/:id`
- Headers: None (authentication handled by Supabase)
- Body: None

**Response:**
```typescript
// Success (200)
const application: BadgeApplicationDetailDto = await response.json();

// Error Responses
// 401 Unauthorized - Redirect to login
// 403 Forbidden - Show error: "You don't have permission to view this application"
// 404 Not Found - Show error: "Application not found"
// 500 Server Error - Show error: "Something went wrong"
```

**Implementation:**
```typescript
async function fetchApplication(id: string): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}`);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

---

### DELETE /api/badge-applications/:id

**Purpose:** Delete a draft application

**Request:**
- Method: DELETE
- URL: `/api/badge-applications/:id`
- Headers: None
- Body: None

**Response:**
```typescript
// Success (200)
const result: { success: boolean; id: string } = await response.json();

// Error Responses
// 403 Forbidden - Show error: "You don't have permission to delete this application"
// 404 Not Found - Show error: "Application not found"
// 409 Conflict - Show error: "Cannot delete: Application is referenced by other resources"
// 500 Server Error - Show error: "Something went wrong"
```

**Implementation:**
```typescript
async function deleteApplication(id: string): Promise<void> {
  const response = await fetch(`/api/badge-applications/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }
}
```

---

### POST /api/badge-applications/:id/submit

**Purpose:** Submit a draft application for admin review

**Request:**
- Method: POST
- URL: `/api/badge-applications/:id/submit`
- Headers: None
- Body: None

**Response:**
```typescript
// Success (200)
const updated: BadgeApplicationDetailDto = await response.json();

// Error Responses
// 403 Forbidden - Show error: "You don't have permission to submit this application"
// 404 Not Found - Show error: "Application not found"
// 400 Bad Request - Show error: "Invalid status or validation error"
// 500 Server Error - Show error: "Something went wrong"
```

**Implementation:**
```typescript
async function submitApplication(id: string): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}/submit`, {
    method: "POST",
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

---

### POST /api/badge-applications/:id/accept

**Purpose:** Admin accepts a submitted application

**Request:**
- Method: POST
- URL: `/api/badge-applications/:id/accept`
- Headers: `Content-Type: application/json`
- Body:
```typescript
{
  decisionNote?: string;  // Optional, max 2000 chars
  notifyApplicants?: boolean;  // Optional, defaults to true
}
```

**Response:**
```typescript
// Success (200)
const updated: BadgeApplicationDetailDto = await response.json();

// Error Responses
// 403 Forbidden - Show error: "Only admins may accept badge applications"
// 404 Not Found - Show error: "Application not found"
// 409 Conflict - Show error: "Application cannot be accepted in its current state"
// 500 Server Error - Show error: "Something went wrong"
```

**Implementation:**
```typescript
async function acceptApplication(id: string, decisionNote?: string): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decisionNote }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

---

### POST /api/badge-applications/:id/reject

**Purpose:** Admin rejects a submitted application

**Request:**
- Method: POST
- URL: `/api/badge-applications/:id/reject`
- Headers: `Content-Type: application/json`
- Body:
```typescript
{
  decisionNote?: string;  // Optional, max 2000 chars
  notifyApplicants?: boolean;  // Optional, defaults to true
}
```

**Response:**
```typescript
// Success (200)
const updated: BadgeApplicationDetailDto = await response.json();

// Error Responses
// 403 Forbidden - Show error: "Only admins may reject badge applications"
// 404 Not Found - Show error: "Application not found"
// 409 Conflict - Show error: "Application cannot be rejected in its current state"
// 500 Server Error - Show error: "Something went wrong"
```

**Implementation:**
```typescript
async function rejectApplication(id: string, decisionNote?: string): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decisionNote }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

## 8. User Interactions

### Standard User (Application Owner) Interactions

**1. View Application Details:**
- User navigates to `/applications/:id`
- Page loads with full application details
- User sees application info, catalog badge info, and current status
- User can read all fields but cannot modify read-only applications

**2. Edit Draft Application:**
- User views draft application (status: draft)
- User clicks "Edit" button in ActionBar
- User is redirected to `/applications/:id/edit`
- Editor page loads with current application data

**3. Delete Draft Application:**
- User views draft application (status: draft)
- User clicks "Delete" button in ActionBar
- ConfirmDeleteModal appears with warning message
- User clicks "Confirm"
- DELETE request to `/api/badge-applications/:id`
- On success:
  - Toast notification: "Application deleted successfully"
  - Redirect to `/applications`
- On error:
  - Toast notification with error message
  - Modal closes, user can retry

**4. Submit Draft Application:**
- User views draft application (status: draft)
- User clicks "Submit" button in ActionBar
- ConfirmSubmitModal appears with warning about read-only status
- User clicks "Submit Application"
- POST request to `/api/badge-applications/:id/submit`
- On success:
  - Application status changes to "submitted"
  - Toast notification: "Application submitted successfully"
  - ActionBar updates (submit button disappears)
  - Page updates to show new status
- On error:
  - Toast notification with error message
  - Modal closes, user can retry

**5. View Read-Only Application:**
- User views submitted/accepted/rejected application
- No edit/delete/submit buttons are shown
- User sees all application details
- If rejected: User sees ReviewInfoCard with rejection reason
- If accepted: User sees ReviewInfoCard with acceptance note
- User can navigate back to applications list

### Admin User Interactions

**6. View Any Application:**
- Admin navigates to any application (own or others)
- Page loads with full application details
- Admin sees ApplicantInfoCard with applicant name and email
- Admin sees all application information
- Admin sees status-appropriate action buttons

**7. Accept Submitted Application:**
- Admin views submitted application (status: submitted)
- Admin clicks "Accept" button in ActionBar
- ReviewModal opens in "accept" mode
- Modal shows:
  - Title: "Accept Application"
  - Application title for context
  - Optional decision note textarea
  - Character counter (0 / 2000)
- Admin optionally enters decision note (e.g., "Excellent work, well documented")
- Admin clicks "Accept Application" button
- POST request to `/api/badge-applications/:id/accept` with decision note
- On success:
  - Application status changes to "accepted"
  - Toast notification: "Application accepted successfully"
  - Modal closes
  - Page updates to show:
    - New status badge (green, "Accepted")
    - ReviewInfoCard with reviewer name, date, and decision note
    - No action buttons (read-only state)
- On error:
  - Toast notification with error message
  - Modal remains open, admin can retry

**8. Reject Submitted Application:**
- Admin views submitted application (status: submitted)
- Admin clicks "Reject" button in ActionBar
- ReviewModal opens in "reject" mode
- Modal shows:
  - Title: "Reject Application"
  - Application title for context
  - Optional decision note textarea
  - Character counter (0 / 2000)
- Admin optionally enters decision note (e.g., "Insufficient evidence provided")
- Admin clicks "Reject Application" button (red/destructive)
- POST request to `/api/badge-applications/:id/reject` with decision note
- On success:
  - Application status changes to "rejected"
  - Toast notification: "Application rejected"
  - Modal closes
  - Page updates to show:
    - New status badge (red, "Rejected")
    - ReviewInfoCard with reviewer name, date, and decision note
    - No action buttons (read-only state)
- On error:
  - Toast notification with error message
  - Modal remains open, admin can retry

**9. Cancel Review Action:**
- Admin opens ReviewModal (accept or reject)
- Admin decides not to proceed
- Admin clicks "Cancel" button or clicks outside modal
- Modal closes without making API call
- Application remains in "submitted" status
- No changes made to application

### All Users (Common Interactions)

**10. Navigate Back to Applications List:**
- User clicks breadcrumb "Applications" link
- User navigates to `/applications`
- Applications list view loads

**11. Handle Long Decision Notes:**
- User/admin enters text in decision note field
- Character counter updates in real-time
- If length exceeds 2000:
  - Error message appears: "Decision note must be 2000 characters or less"
  - Submit button is disabled
  - Character counter turns red
- User removes characters until under limit
- Error clears, submit button re-enables

**12. Handle Network Errors:**
- User attempts any action (submit, delete, accept, reject)
- Network request fails (timeout, connection error)
- Toast notification: "Network error. Please try again."
- Modal/page state preserved
- User can retry the action

## 9. Conditions and Validation

### UI-Level Conditions

**1. Edit Button Visibility:**
- **Condition:** `application.status === "draft" && isOwner`
- **Components Affected:** ActionBar
- **Interface Impact:** Button is rendered or hidden entirely (not just disabled)
- **Error Message:** N/A (button hidden, not shown as disabled)

**2. Delete Button Visibility:**
- **Condition:** `application.status === "draft" && isOwner`
- **Components Affected:** ActionBar
- **Interface Impact:** Button is rendered or hidden entirely
- **Error Message:** N/A

**3. Submit Button Visibility:**
- **Condition:** `application.status === "draft" && isOwner`
- **Components Affected:** ActionBar
- **Interface Impact:** Button is rendered or hidden entirely
- **Error Message:** N/A

**4. Accept Button Visibility:**
- **Condition:** `application.status === "submitted" && isAdmin`
- **Components Affected:** ActionBar
- **Interface Impact:** Button is rendered or hidden entirely
- **Disabled State:** `isLoading === true` (during API call)
- **Error Message:** N/A (hidden, not disabled)

**5. Reject Button Visibility:**
- **Condition:** `application.status === "submitted" && isAdmin`
- **Components Affected:** ActionBar
- **Interface Impact:** Button is rendered or hidden entirely
- **Disabled State:** `isLoading === true` (during API call)
- **Error Message:** N/A

**6. Applicant Info Card Visibility:**
- **Condition:** `isAdmin === true`
- **Components Affected:** ApplicantInfoCard
- **Interface Impact:** Card is rendered or hidden entirely
- **Purpose:** Only admins should see applicant details (name, email)

**7. Review Info Card Visibility:**
- **Condition:** `application.status === "accepted" || application.status === "rejected"`
- **Components Affected:** ReviewInfoCard
- **Interface Impact:** Card is rendered or hidden entirely
- **Purpose:** Only show review details for reviewed applications

**8. Submitted At Timestamp Visibility:**
- **Condition:** `application.submitted_at !== null`
- **Components Affected:** ApplicationInfoCard
- **Interface Impact:** Field is shown or hidden
- **Purpose:** Only show submission timestamp after application is submitted

**9. No Actions for Read-Only States:**
- **Condition:** `application.status === "accepted" || application.status === "rejected" || application.status === "used_in_promotion"`
- **Components Affected:** ActionBar
- **Interface Impact:** No action buttons shown (except "Back")
- **Purpose:** These statuses are final and cannot be changed

### Form Validation (ReviewModal)

**1. Decision Note Validation:**
- **Field:** `decisionNote`
- **Type:** Optional text field
- **Validation Rules:**
  - Optional: Can be empty or null
  - Max length: 2000 characters
- **Validation Trigger:** On change (real-time) and on blur
- **Error Message:** "Decision note must be 2000 characters or less"
- **Error Display:** Below textarea, red text
- **Submit Button State:** Disabled if validation fails
- **Character Counter:**
  - Shows current length / 2000
  - Turns red when > 2000
  - Updates in real-time on input change

**2. Form Submission State:**
- **Enabled When:**
  - No validation errors
  - Not currently submitting
- **Disabled When:**
  - Length > 2000 characters
  - Form is submitting (shows spinner in button)
- **Loading State:**
  - Button shows "Accepting..." or "Rejecting..." with spinner
  - Modal cannot be closed during submission
  - Inputs are disabled during submission

### API-Level Validations

These validations are performed by the backend and result in error responses:

**1. Permission Validation:**
- **DELETE, PUT, POST /submit:** User must be owner or admin
- **POST /accept, /reject:** User must be admin
- **GET:** User must be owner or admin
- **Error Response:** 403 Forbidden
- **UI Handling:** Show error toast, prevent action attempt

**2. Status Transition Validation:**
- **Submit:** Can only submit draft applications
- **Accept/Reject:** Can only review submitted applications
- **Delete:** Can only delete draft or rejected applications (not used in promotions)
- **Error Response:** 409 Conflict or 400 Bad Request
- **UI Handling:** Show error toast with specific message

**3. Resource Existence:**
- **All Operations:** Application must exist in database
- **Error Response:** 404 Not Found
- **UI Handling:** Show error page or redirect to list with error toast

**4. Catalog Badge Validation:**
- **Submit:** Catalog badge must still exist and be active
- **Error Response:** 400 Bad Request
- **UI Handling:** Show error toast explaining issue

## 10. Error Handling

### API Error Scenarios

**1. Authentication Errors (401 Unauthorized):**
- **Scenario:** User session expired or invalid
- **Handling:**
  - Redirect to `/login` with return URL parameter
  - Store current URL in session storage
  - After login, return user to application detail page
- **User Experience:** Seamless re-authentication flow

**2. Permission Errors (403 Forbidden):**
- **Scenario:** User tries to access application they don't own (non-admin)
- **Handling:**
  - Show error page with message: "You don't have permission to view this application"
  - Provide button to return to applications list
  - Do not reveal application exists
- **User Experience:** Clear permission denial without information leakage

**3. Not Found Errors (404 Not Found):**
- **Scenario:** Application ID doesn't exist or was deleted
- **Handling:**
  - Show error page with message: "Application not found"
  - Provide button to return to applications list
  - Log the attempt (possible deleted or invalid ID)
- **User Experience:** Clear explanation with recovery path

**4. Validation Errors (400 Bad Request):**
- **Scenario:** Form data fails backend validation (e.g., decision note too long, invalid status)
- **Handling:**
  - Parse `ApiError` with `details` array
  - Map field errors to form inputs (ReviewModal)
  - Display inline error messages
  - Keep modal open so user can correct
- **User Experience:** Clear field-level errors with correction opportunity

**5. Conflict Errors (409 Conflict):**
- **Scenario:** Invalid status transition (e.g., trying to accept already-accepted application)
- **Handling:**
  - Show toast notification with specific message from API
  - Refetch application data to show current state
  - Close modal if open
- **User Experience:** Understand state conflict and see current state

**6. Server Errors (500 Internal Server Error):**
- **Scenario:** Unexpected backend error
- **Handling:**
  - Show toast notification: "An unexpected error occurred. Please try again."
  - Log full error details to console (development)
  - Preserve current UI state
  - Provide retry option
- **User Experience:** Generic error with retry capability

### Network Error Scenarios

**7. Network Failure:**
- **Scenario:** No internet connection or server unreachable
- **Handling:**
  - Show toast notification: "Network error. Please check your connection and try again."
  - Keep previous data visible
  - Enable retry for failed action
  - Consider offline indicator
- **User Experience:** Clear network issue indication with retry

**8. Timeout:**
- **Scenario:** Request takes too long (>30 seconds)
- **Handling:**
  - Cancel request
  - Show toast: "Request timed out. Please try again."
  - Return to pre-action state
- **User Experience:** Timely feedback, prevent indefinite wait

### Edge Cases

**9. Concurrent Modification:**
- **Scenario:** Application state changed by another user/admin while viewing
- **Handling:**
  - After any successful action, refetch latest data
  - Show toast: "Application updated successfully"
  - Update UI with latest state (status, review info, etc.)
  - If conflict detected, show message about concurrent change
- **User Experience:** Always see latest data, understand when others modified

**10. Stale Data:**
- **Scenario:** User has old data while application has been reviewed
- **Handling:**
  - Implement polling or WebSocket (future enhancement)
  - For MVP: Refetch on window focus
  - Show "Refresh" button in header
  - Auto-refetch after any action
- **User Experience:** Ability to see latest state without full page reload

**11. Empty Decision Note:**
- **Scenario:** Admin submits accept/reject without decision note
- **Handling:**
  - Allow submission (note is optional per API)
  - Send request without `decisionNote` field
  - Show success message
  - Display "(No decision note provided)" in ReviewInfoCard
- **User Experience:** Optional field works as intended

**12. Long Decision Note Display:**
- **Scenario:** Decision note is very long (up to 2000 chars)
- **Handling:**
  - Use scrollable container with max height
  - Or implement "Read more" expansion
  - Ensure full text is accessible
- **User Experience:** Long notes don't break layout, fully readable

**13. Delete Conflict (Referenced by Promotion):**
- **Scenario:** User tries to delete application that's referenced by promotion
- **Handling:**
  - API returns 409 Conflict
  - Show toast: "Cannot delete: This application is used in a promotion"
  - Close delete modal
  - Application remains visible
- **User Experience:** Clear explanation of why deletion failed

**14. Missing Applicant Data:**
- **Scenario:** Applicant user record is missing or incomplete
- **Handling:**
  - Show fallback: "Unknown User" or applicant ID
  - Log warning for investigation
  - Don't break UI rendering
- **User Experience:** Graceful degradation, page still functional

**15. Invalid Application ID Format:**
- **Scenario:** URL parameter is not a valid UUID
- **Handling:**
  - Astro page validates on load
  - Show 400 error page: "Invalid application ID"
  - Provide link to applications list
- **User Experience:** Clear error about malformed URL

## 11. Implementation Steps

### Phase 1: Foundation (Steps 1-3)

**Step 1: Add Type Definitions**
- Add new types to `src/types.ts` at the end of the file:
  - `ApplicationDetailViewProps`
  - `DetailHeaderProps`
  - `ApplicationInfoCardProps`
  - `CatalogBadgeInfoCardProps`
  - `ApplicantInfoCardProps`
  - `ReviewInfoCardProps`
  - `ActionBarProps`
  - `ReviewModalProps`
  - `ConfirmSubmitModalProps`
  - `ConfirmDeleteModalProps`
  - `ReviewFormData`
- Run `pnpm astro check` to verify no TypeScript errors

**Step 2: Create Astro Page Component**
- Create `src/pages/applications/[id].astro`
- Implement server-side data fetching:
  - Parse `:id` path parameter
  - Validate UUID format
  - Handle authentication (currently disabled, prepare for production)
  - Fetch initial data from `GET /api/badge-applications/:id`
  - Determine `userId` and `isAdmin` (from auth or dev defaults)
- Handle server-side errors:
  - 404: Render error page "Application not found"
  - 403: Render error page "Permission denied"
  - 500: Render error page "Server error"
- Pass data to React component with `client:load` directive
- Wrap in Layout component

**Step 3: Create ApplicationDetailView Component**
- Create `src/components/badge-application-detail/ApplicationDetailView.tsx`
- Set up state management:
  - Initialize with `initialData`
  - Create state for modals, loading, error
- Define permission-derived values (isOwner, canEdit, etc.)
- Implement action handlers:
  - `handleEdit()` → Navigate to edit page
  - `handleDelete()` → Open delete modal → Call API → Navigate to list
  - `handleSubmit()` → Open submit modal → Call API → Update state
  - `handleAccept()` → Open review modal → Call API → Update state
  - `handleReject()` → Open review modal → Call API → Update state
- Implement API helper functions for actions
- Render child components with proper props

### Phase 2: Display Components (Steps 4-7)

**Step 4: Create DetailHeader Component**
- Create `src/components/badge-application-detail/DetailHeader.tsx`
- Implement breadcrumb navigation (Home / Applications / Detail)
- Display application ID and badge title
- Render StatusBadge component with color coding
- Add responsive styling with Tailwind

**Step 5: Create ApplicationInfoCard Component**
- Create `src/components/badge-application-detail/ApplicationInfoCard.tsx`
- Display all application fields:
  - Date of Application (formatted)
  - Date of Fulfillment (formatted or "Not specified")
  - Reason (multi-line, scrollable if long)
  - Created At timestamp
  - Submitted At timestamp (conditional)
- Handle null values gracefully
- Use Card component from shadcn/ui
- Add proper spacing and typography

**Step 6: Create CatalogBadgeInfoCard Component**
- Create `src/components/badge-application-detail/CatalogBadgeInfoCard.tsx`
- Display catalog badge information:
  - Title (prominent heading)
  - Category badge (color-coded)
  - Level badge (color-coded)
  - Description (multi-line)
  - Version number
- Reuse Badge component from shadcn/ui
- Match styling with other badge displays in app

**Step 7: Create ApplicantInfoCard and ReviewInfoCard Components**
- Create `src/components/badge-application-detail/ApplicantInfoCard.tsx`:
  - Conditional rendering based on `isVisible` (admin only)
  - Display applicant name and email
  - Use Card component
- Create `src/components/badge-application-detail/ReviewInfoCard.tsx`:
  - Conditional rendering based on `isVisible` (accepted/rejected)
  - Display reviewer information, review date, decision note
  - Handle null decision note ("No decision note provided")
  - Use Card component with appropriate status colors

### Phase 3: Action Components (Steps 8-10)

**Step 8: Create ActionBar Component**
- Create `src/components/badge-application-detail/ActionBar.tsx`
- Implement conditional button rendering based on:
  - Application status
  - User permissions (isOwner, isAdmin)
- Button configurations:
  - Edit: Primary variant, draft + owner
  - Delete: Destructive variant, draft + owner
  - Submit: Primary variant, draft + owner
  - Accept: Success variant, submitted + admin
  - Reject: Destructive variant, submitted + admin
  - Back: Outline variant, always visible
- Add loading states (disable during API calls)
- Use Button component from shadcn/ui
- Add proper spacing and responsive layout

**Step 9: Create ReviewModal Component**
- Create `src/components/badge-application-detail/ReviewModal.tsx`
- Implement modal using shadcn/ui Dialog component
- Create form with controlled inputs:
  - Decision note textarea (optional, max 2000 chars)
  - Character counter (real-time update)
- Implement validation:
  - Max length check
  - Display error message inline
  - Disable submit on validation fail
- Handle form submission:
  - Call onConfirm with decision note
  - Show loading state in button
  - Handle success/error
  - Close modal on success
- Different titles/button text for accept vs reject mode
- Keyboard accessibility (escape to close)

**Step 10: Create Confirmation Modals**
- Create `src/components/badge-application-detail/ConfirmSubmitModal.tsx`:
  - Use shadcn/ui AlertDialog component
  - Display warning about read-only status after submission
  - Primary action button: "Submit Application"
  - Secondary action button: "Cancel"
- Create `src/components/badge-application-detail/ConfirmDeleteModal.tsx`:
  - Use shadcn/ui AlertDialog component
  - Display warning about permanent deletion
  - Destructive action button: "Delete Application"
  - Secondary action button: "Cancel"
- Implement keyboard handling (escape, enter)

### Phase 4: Integration & Testing (Steps 11-13)

**Step 11: Wire Up ApplicationDetailView**
- Connect all child components in ApplicationDetailView
- Implement two-column responsive grid layout:
  - Left column: ApplicationInfoCard, CatalogBadgeInfoCard
  - Right column: ApplicantInfoCard (admin), ReviewInfoCard (if reviewed)
- Pass correct props to all child components
- Ensure modal state management works correctly
- Add toast notifications using sonner:
  - Success messages for all actions
  - Error messages for failures
- Handle navigation after delete action

**Step 12: Test with curl and Browser**
- Test API endpoints with curl:
  - `GET /api/badge-applications/:id` (various statuses)
  - `POST /api/badge-applications/:id/submit`
  - `POST /api/badge-applications/:id/accept`
  - `POST /api/badge-applications/:id/reject`
  - `DELETE /api/badge-applications/:id`
- Test in browser:
  - View as owner (draft, submitted, accepted, rejected)
  - View as admin (all statuses)
  - Test all action buttons
  - Test modal workflows
  - Test validation (decision note length)
  - Test error scenarios (invalid ID, permission errors)
- Verify responsive design on different screen sizes
- Test keyboard navigation

**Step 13: Lint and Polish**
- Run `pnpm lint` and fix all issues
- Run `pnpm prettier` to format code
- Run `pnpm astro check` for TypeScript errors
- Review all components for:
  - Consistent naming conventions
  - Proper accessibility attributes (ARIA labels, roles)
  - Clear comments for complex logic
  - No console.log statements (remove or comment)
- Verify all error messages are user-friendly
- Test complete user journey:
  - Standard user: View → Submit → See submitted state
  - Admin user: View submitted → Accept/Reject → See final state
- Ensure all toast notifications work correctly
- Verify breadcrumb navigation works
- Check that all status badges have correct colors
- Commit changes with descriptive commit message

### Notes on Implementation Order

- Steps build incrementally from foundation (types, main component) to details (individual cards) to interactions (actions, modals)
- Each step should be tested before moving to next
- Display components (Steps 4-7) can be developed in parallel
- Action components (Steps 8-10) depend on display components for context
- Focus on core functionality first, polish later
- Use existing shadcn/ui components where possible (Card, Button, Dialog, AlertDialog, Badge)
- Follow patterns from existing views (ApplicationsList, CatalogBadges) for consistency
- Implement accessibility features throughout (keyboard nav, ARIA attributes, semantic HTML)
