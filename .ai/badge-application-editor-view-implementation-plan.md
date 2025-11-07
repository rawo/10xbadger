# View Implementation Plan: Badge Application Editor

## 1. Overview

The Badge Application Editor view enables engineers to create new badge applications and edit existing drafts. This view supports the full lifecycle of a badge application from initial draft creation through submission for admin review. The editor features autosave functionality, real-time validation, and a multi-section form layout that guides users through providing application details, dates, and supporting evidence.

## 2. View Routing

### Routes

- **New Application**: `/apply/new?catalog_badge_id={uuid}`
  - Creates a new badge application for the specified catalog badge
  - Requires `catalog_badge_id` query parameter

- **Edit Draft Application**: `/applications/[id]/edit`
  - Edits an existing draft badge application
  - `id` is the badge application UUID
  - Only accessible for applications with `status='draft'`

### Route Protection

- Both routes require authentication
- Edit route validates ownership: `applicant_id` must match current user
- Edit route validates status: application must be in `draft` status
- Redirect to `/applications` if unauthorized or application not found

## 3. Component Structure

```
ApplicationEditorPage (Astro)
└── ApplicationEditor (React)
    ├── EditorHeader
    │   ├── PageTitle
    │   └── StatusBadge
    ├── BadgeInfoSection
    │   └── BadgeCard (read-only display)
    ├── ApplicationFormSection
    │   ├── FormField (date_of_application)
    │   │   └── DatePicker
    │   ├── FormField (date_of_fulfillment)
    │   │   └── DatePicker
    │   └── FormField (reason)
    │       └── Textarea
    └── ActionBar
        ├── AutosaveIndicator
        ├── Button (Save Draft)
        └── Button (Submit for Review)
```

## 4. Component Details

### ApplicationEditorPage (Astro SSR)

**Component description**: Server-side page component that handles route logic, data fetching, authentication checks, and renders the React ApplicationEditor component.

**Main elements**:
- Astro Layout wrapper
- Authentication check via middleware
- Data fetching (catalog badge, existing application)
- Error boundary for 404/403 errors
- Client directive for React component

**Handled interactions**: None (server-side only)

**Handled validation**:
- Route parameter validation (UUID format)
- Query parameter validation (catalog_badge_id for new applications)
- Ownership validation for edit route
- Status validation (must be draft) for edit route

**Types**:
- `CatalogBadgeDetailDto` (catalog badge data)
- `BadgeApplicationDetailDto` (existing application data, edit mode only)
- `UserDto` (current user from session)

**Props**: N/A (Astro page component)

---

### ApplicationEditor (React Component)

**Component description**: Main interactive editor component that manages form state, autosave, validation, and submission. Uses custom hook for state management.

**Main elements**:
- Form container with sections
- EditorHeader with title and status
- BadgeInfoSection displaying selected badge
- Form fields for all application data
- ActionBar with save/submit buttons and autosave indicator

**Handled interactions**:
- Form field changes trigger validation and autosave
- "Save Draft" button manually saves without validation
- "Submit for Review" validates and submits application
- Cancel navigation with unsaved changes warning

**Handled validation**:
- `date_of_application`: required, valid date format
- `date_of_fulfillment`: optional, valid date format, must be >= `date_of_application`
- `reason`: optional, max 2000 characters
- Submit validation: all required fields must be valid

**Types**:
- `ApplicationEditorProps` (component props)
- `ApplicationFormData` (form state)
- `ValidationErrors` (field errors)

**Props**:
```typescript
interface ApplicationEditorProps {
  mode: 'create' | 'edit';
  catalogBadge: CatalogBadgeDetailDto;
  existingApplication?: BadgeApplicationDetailDto;
  userId: string;
}
```

---

### EditorHeader (React Component)

**Component description**: Displays page title, breadcrumbs, and current status badge.

**Main elements**:
- h1 element with dynamic title
- Breadcrumb navigation
- StatusBadge component showing draft/submitted status

**Handled interactions**: None

**Handled validation**: None

**Types**:
- `EditorHeaderProps`

**Props**:
```typescript
interface EditorHeaderProps {
  mode: 'create' | 'edit';
  status?: BadgeApplicationStatusType;
  catalogBadgeTitle: string;
}
```

---

### BadgeInfoSection (React Component)

**Component description**: Read-only display of selected catalog badge information including title, description, category, and level.

**Main elements**:
- Section heading
- BadgeCard component (styled card with badge details)
- Category and level badges/chips

**Handled interactions**: None (read-only display)

**Handled validation**: None

**Types**:
- `BadgeInfoSectionProps`
- `CatalogBadgeDetailDto`

**Props**:
```typescript
interface BadgeInfoSectionProps {
  catalogBadge: CatalogBadgeDetailDto;
}
```

---

### ApplicationFormSection (React Component)

**Component description**: Main form section containing all editable fields for badge application data.

**Main elements**:
- Section heading ("Application Details")
- FormField wrappers for each input
- DatePicker components for dates
- Textarea for reason field
- Character counter for reason field

**Handled interactions**:
- Field change events trigger validation and autosave
- Date selection updates form state
- Textarea input with character count

**Handled validation**:
- Validates date_of_application is not empty
- Validates date_of_fulfillment >= date_of_application when provided
- Validates reason length <= 2000 characters
- Displays inline error messages below fields

**Types**:
- `ApplicationFormSectionProps`
- `ApplicationFormData`
- `ValidationErrors`

**Props**:
```typescript
interface ApplicationFormSectionProps {
  formData: ApplicationFormData;
  errors: ValidationErrors;
  onChange: (field: keyof ApplicationFormData, value: string) => void;
  onBlur: (field: keyof ApplicationFormData) => void;
}
```

---

### ActionBar (React Component)

**Component description**: Bottom action bar with save, submit buttons and autosave status indicator.

**Main elements**:
- Fixed/sticky bar at bottom of form
- AutosaveIndicator showing "Saving...", "Saved", or error state
- "Save Draft" button (secondary style)
- "Submit for Review" button (primary style)
- Cancel/back link

**Handled interactions**:
- "Save Draft" click triggers manual save
- "Submit for Review" validates form, then submits if valid
- Shows confirmation dialog on submit

**Handled validation**:
- Submit button disabled if validation errors exist
- Submit button disabled if required fields empty
- Shows tooltip on disabled submit explaining requirements

**Types**:
- `ActionBarProps`
- `AutosaveState`

**Props**:
```typescript
interface ActionBarProps {
  autosaveState: AutosaveState;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}
```

---

### AutosaveIndicator (React Component)

**Component description**: Visual indicator showing autosave status (idle, saving, saved, error).

**Main elements**:
- Icon (spinner, check, or alert)
- Status text
- Timestamp of last save

**Handled interactions**: None (display only)

**Handled validation**: None

**Types**:
- `AutosaveIndicatorProps`
- `AutosaveState`

**Props**:
```typescript
interface AutosaveIndicatorProps {
  state: AutosaveState;
}
```

## 5. Types

### ApplicationFormData

Form state representing all editable fields in the badge application.

```typescript
interface ApplicationFormData {
  catalog_badge_id: string;
  date_of_application: string; // YYYY-MM-DD format
  date_of_fulfillment: string; // YYYY-MM-DD format
  reason: string;
}
```

### ValidationErrors

Map of field names to error messages for displaying validation feedback.

```typescript
interface ValidationErrors {
  date_of_application?: string;
  date_of_fulfillment?: string;
  reason?: string;
}
```

### AutosaveState

State object tracking autosave status and metadata.

```typescript
type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt?: Date;
  error?: string;
}
```

### ApplicationEditorViewModel

Complete view model passed from Astro page to React component.

```typescript
interface ApplicationEditorViewModel {
  mode: 'create' | 'edit';
  catalogBadge: CatalogBadgeDetailDto;
  existingApplication?: BadgeApplicationDetailDto;
  userId: string;
}
```

## 6. State Management

### Custom Hook: useApplicationEditor

**Purpose**: Centralized state management for the badge application editor, handling form data, validation, autosave, and API interactions.

**Hook Interface**:
```typescript
function useApplicationEditor(props: {
  mode: 'create' | 'edit';
  catalogBadge: CatalogBadgeDetailDto;
  existingApplication?: BadgeApplicationDetailDto;
  userId: string;
}): {
  formData: ApplicationFormData;
  errors: ValidationErrors;
  autosaveState: AutosaveState;
  isSubmitting: boolean;
  applicationId?: string;

  updateField: (field: keyof ApplicationFormData, value: string) => void;
  handleBlur: (field: keyof ApplicationFormData) => void;
  saveDraft: () => Promise<void>;
  submitForReview: () => Promise<void>;
}
```

**State Variables**:

1. `formData`: ApplicationFormData - Current form values
2. `errors`: ValidationErrors - Validation error messages per field
3. `autosaveState`: AutosaveState - Autosave status and metadata
4. `isSubmitting`: boolean - Whether submit is in progress
5. `applicationId`: string | undefined - Created application ID after first save
6. `isDirty`: boolean - Whether form has unsaved changes

**Hook Behavior**:

- **Initialization**: Populates formData from existingApplication or creates empty state
- **Field Updates**: Updates form data and triggers validation
- **Validation**: Runs on field blur and before submit
- **Autosave**: Debounced (2 seconds) after field changes, calls PUT endpoint
- **First Save**: Create mode calls POST on first save, stores returned ID
- **Submit**: Validates, then calls POST /api/badge-applications/:id/submit

**Autosave Logic**:
```typescript
// Debounce autosave calls (2 second delay)
const debouncedSave = useMemo(
  () => debounce(async () => {
    setAutosaveState({ status: 'saving' });
    try {
      if (mode === 'create' && !applicationId) {
        // First save - create draft
        const response = await createBadgeApplication(formData);
        setApplicationId(response.id);
      } else if (applicationId) {
        // Subsequent saves - update draft
        await updateBadgeApplication(applicationId, formData);
      }
      setAutosaveState({ status: 'saved', lastSavedAt: new Date() });
    } catch (error) {
      setAutosaveState({ status: 'error', error: error.message });
    }
  }, 2000),
  [mode, applicationId, formData]
);

// Trigger autosave on field changes
useEffect(() => {
  if (isDirty) {
    debouncedSave();
  }
}, [formData, isDirty, debouncedSave]);
```

## 7. API Integration

### Endpoints Used

#### GET /api/catalog-badges/:id

**When**: Page load for new application (fetch catalog badge details)

**Request**: None (path parameter only)

**Response**: `CatalogBadgeDetailDto`

**Error Handling**:
- 404: Show "Badge not found" error page
- 401: Redirect to login

---

#### GET /api/badge-applications/:id

**When**: Page load for edit mode (fetch existing application)

**Request**: None (path parameter only)

**Response**: `BadgeApplicationDetailDto`

**Error Handling**:
- 404: Redirect to /applications with error toast
- 403: Redirect to /applications (not owner)
- 409: If status not 'draft', redirect to detail view

---

#### POST /api/badge-applications

**When**: First autosave in create mode

**Request**: `CreateBadgeApplicationCommand`
```typescript
{
  catalog_badge_id: string;
  date_of_application: string;
  date_of_fulfillment?: string;
  reason?: string;
}
```

**Response**: `BadgeApplicationRow` (with id and status='draft')

**Error Handling**:
- 400 validation error: Display field errors inline
- 404 catalog badge not found: Show error toast
- 401: Redirect to login

---

#### PUT /api/badge-applications/:id

**When**: Autosave after form changes (debounced), manual "Save Draft" click

**Request**: `UpdateBadgeApplicationCommand`
```typescript
{
  date_of_application?: string;
  date_of_fulfillment?: string;
  reason?: string;
}
```

**Response**: `BadgeApplicationRow` (updated)

**Error Handling**:
- 400 validation error: Display field errors inline, stop autosave
- 403 forbidden: Show error toast, disable further editing
- 404: Show error toast

---

#### POST /api/badge-applications/:id/submit

**When**: User clicks "Submit for Review" button

**Request**: None (empty body or no body)

**Response**: `BadgeApplicationRow` (status='submitted')

**Success Actions**:
- Show success toast: "Application submitted for review"
- Redirect to `/applications/:id` (detail view)

**Error Handling**:
- 400 validation error: Display errors, prevent submit
- 403 forbidden: Show error toast
- 409 conflict (not draft status): Show error modal, refresh page

## 8. User Interactions

### New Application Flow

1. **Entry**: User clicks "Apply" on catalog badge detail page
2. **Navigation**: Redirect to `/apply/new?catalog_badge_id={uuid}`
3. **Load**: Page fetches catalog badge details, displays in BadgeInfoSection
4. **Form Display**: Empty form with catalog badge pre-selected (read-only)
5. **User Fills Form**:
   - Enters date_of_application (required)
   - Optionally enters date_of_fulfillment
   - Optionally enters reason (evidence)
6. **Autosave**: On first blur after entering required field:
   - POST /api/badge-applications creates draft
   - Application ID stored in hook state
   - Autosave indicator shows "Saved"
7. **Subsequent Edits**:
   - Each change triggers debounced autosave
   - PUT /api/badge-applications/:id updates draft
   - Autosave indicator cycles: idle → saving → saved
8. **Manual Save**: User clicks "Save Draft"
   - Immediately triggers save (bypasses debounce)
   - Shows success toast
9. **Submit**: User clicks "Submit for Review"
   - Validates all fields
   - If valid: shows confirmation dialog
   - On confirm: POST /api/badge-applications/:id/submit
   - On success: redirect to detail page

### Edit Draft Flow

1. **Entry**: User clicks "Edit" on draft application card
2. **Navigation**: Redirect to `/applications/:id/edit`
3. **Load**: Page fetches application and catalog badge, validates ownership/status
4. **Form Display**: Form pre-populated with existing data
5. **User Edits**: Same autosave behavior as new application
6. **Submit**: Same submission flow as new application

### Cancel/Navigation

- User clicks "Cancel" or browser back:
  - If unsaved changes: show confirmation dialog
  - On confirm: navigate to `/applications`
- User navigates away with unsaved changes:
  - Browser shows "unsaved changes" prompt (if supported)

## 9. Conditions and Validation

### Field-Level Validation

#### date_of_application (Required)

**Conditions**:
- Must not be empty
- Must be valid date format (YYYY-MM-DD)
- Should be in the past or today (soft validation, warning only)

**Validation Timing**: On blur, on submit

**Error Messages**:
- Empty: "Application date is required"
- Invalid format: "Please enter a valid date"
- Future date: "Application date should not be in the future" (warning)

**Component Affected**: ApplicationFormSection DatePicker

**UI State**:
- Field border: red on error
- Error text: displayed below field
- Submit button: disabled if error

---

#### date_of_fulfillment (Optional)

**Conditions**:
- If provided, must be valid date format (YYYY-MM-DD)
- If provided, must be >= date_of_application
- Can be today or in the past

**Validation Timing**: On blur, on submit, when date_of_application changes

**Error Messages**:
- Invalid format: "Please enter a valid date"
- Before application date: "Fulfillment date cannot be before application date"

**Component Affected**: ApplicationFormSection DatePicker

**UI State**:
- Field border: red on error
- Error text: displayed below field
- Submit button: disabled if error

---

#### reason (Optional)

**Conditions**:
- If provided, max 2000 characters
- HTML/script tags stripped (XSS prevention)

**Validation Timing**: On input (for character count), on blur (for sanitization)

**Error Messages**:
- Too long: "Reason must be 2000 characters or less (currently {count})"

**Component Affected**: ApplicationFormSection Textarea

**UI State**:
- Character counter: turns red when approaching/exceeding limit
- Error text: displayed below field
- Submit button: disabled if over limit

---

### Form-Level Validation

**Submit Validation** (runs before submission):

1. All field validations pass
2. Required fields (date_of_application) are non-empty
3. No server-side errors from last save

**Submit Button State**:
- Disabled if: validation errors exist, required fields empty, or submit in progress
- Enabled if: all validations pass and no errors

**Component Affected**: ActionBar Submit Button

**UI State**:
- Button disabled: opacity reduced, cursor not-allowed
- Tooltip on hover (when disabled): explains why disabled
- Loading state (when submitting): spinner icon, "Submitting..." text

---

### Server-Side Validation Integration

**API Validation Errors** (400 responses):

When API returns validation errors:
```typescript
{
  error: "validation_error",
  message: "Validation failed",
  details: [
    { field: "date_of_application", message: "Application date is required" },
    { field: "date_of_fulfillment", message: "Fulfillment date must be after application date" }
  ]
}
```

**Handling**:
1. Parse `details` array
2. Map each error to corresponding field in `ValidationErrors` state
3. Display inline below affected fields
4. Focus first invalid field
5. Stop autosave until errors resolved

## 10. Error Handling

### Network Errors

**Scenario**: Request fails due to network issues (timeout, offline, etc.)

**Handling**:
- Autosave: Set autosave state to 'error', show "Unable to save - check connection" message
- Submit: Show error toast with retry button
- Keep form data in state (don't lose user input)

**User Actions**:
- Retry autosave automatically when connection restored
- Manual retry button on submit error

---

### Validation Errors (400)

**Scenario**: Server returns validation errors for invalid data

**Handling**:
- Parse error details from API response
- Display inline errors below affected fields
- Focus first invalid field
- Disable autosave until errors resolved

**User Actions**:
- Fix validation errors
- Resubmit or let autosave retry

---

### Unauthorized (401)

**Scenario**: User session expired or not authenticated

**Handling**:
- Save form data to sessionStorage (to restore after login)
- Show "Session expired" toast
- Redirect to login page with return URL

**User Actions**:
- Re-authenticate
- Return to form with data restored

---

### Forbidden (403)

**Scenario**: User attempts to edit application they don't own, or application not in draft status

**Handling**:
- Show error toast: "You don't have permission to edit this application"
- Redirect to application detail view or list

**User Actions**:
- None (cannot edit this application)

---

### Not Found (404)

**Scenario**: Catalog badge or badge application not found

**Handling**:
- Show error page: "Badge application not found"
- Provide link back to applications list

**User Actions**:
- Navigate back to list

---

### Conflict (409)

**Scenario**: Application status changed (e.g., already submitted by another process)

**Handling**:
- Show error modal: "This application has already been submitted"
- Offer to reload page or navigate to detail view

**User Actions**:
- Reload to see current state
- Navigate to detail view

---

### Catalog Badge Inactive

**Scenario**: Catalog badge was deactivated after user started application

**Handling**:
- On page load: show warning banner "This badge is no longer active"
- Allow viewing existing draft but warn that submission may fail
- On submit: API will reject, show error

**User Actions**:
- Save as draft (allowed)
- Cannot submit (show clear error)

## 11. Implementation Steps

### Step 1: Create Astro Page Component

**File**: `src/pages/apply/new.astro`

1. Add authentication middleware check
2. Parse and validate `catalog_badge_id` query parameter
3. Fetch catalog badge data via `GET /api/catalog-badges/:id`
4. Handle errors (404, 401)
5. Pass data to ApplicationEditor React component
6. Add client directive: `client:load`

**File**: `src/pages/applications/[id]/edit.astro`

1. Add authentication middleware check
2. Parse and validate `id` path parameter
3. Fetch badge application via `GET /api/badge-applications/:id`
4. Validate ownership (applicant_id === current user)
5. Validate status === 'draft'
6. Fetch catalog badge details
7. Handle errors (403, 404, 409)
8. Pass data to ApplicationEditor React component

---

### Step 2: Create Type Definitions

**File**: `src/types.ts` (or separate view-model file)

1. Add `ApplicationFormData` interface
2. Add `ValidationErrors` interface
3. Add `AutosaveState` type and interface
4. Add `ApplicationEditorViewModel` interface
5. Add all component Props interfaces

---

### Step 3: Implement useApplicationEditor Hook

**File**: `src/hooks/useApplicationEditor.ts`

1. Set up state variables (formData, errors, autosaveState, etc.)
2. Implement field validation functions
3. Implement `updateField` function with validation
4. Implement debounced autosave with `useMemo` and `useEffect`
5. Implement `saveDraft` function (calls POST or PUT based on mode)
6. Implement `submitForReview` function
7. Handle API errors and update state accordingly
8. Return hook interface

---

### Step 4: Create Reusable Form Components

**File**: `src/components/ui/form-field.tsx` (if not exists in shadcn/ui)

1. Create FormField wrapper component
2. Add label, input, error message sections
3. Style with Tailwind following shadcn/ui patterns

**File**: `src/components/ui/date-picker.tsx` (use shadcn/ui)

1. Install/configure shadcn/ui DatePicker if needed
2. Customize for date format (YYYY-MM-DD)
3. Add validation styling

---

### Step 5: Implement ApplicationEditor Component

**File**: `src/components/ApplicationEditor.tsx`

1. Create main component with props interface
2. Initialize useApplicationEditor hook
3. Implement form layout with sections
4. Connect form fields to hook functions
5. Implement ActionBar with save/submit handlers
6. Add confirmation dialogs for submit and cancel
7. Add error boundaries

---

### Step 6: Implement Child Components

**EditorHeader** (`src/components/EditorHeader.tsx`):
1. Create component with title, breadcrumbs, status badge
2. Style with Tailwind

**BadgeInfoSection** (`src/components/BadgeInfoSection.tsx`):
1. Create component displaying catalog badge details
2. Show badge title, description, category, level as read-only

**ApplicationFormSection** (`src/components/ApplicationFormSection.tsx`):
1. Create form section with all input fields
2. Wire up to onChange/onBlur handlers from props
3. Display validation errors inline
4. Add character counter to reason field

**ActionBar** (`src/components/ActionBar.tsx`):
1. Create fixed/sticky bar at bottom
2. Add AutosaveIndicator, buttons
3. Handle disabled states based on validation

**AutosaveIndicator** (`src/components/AutosaveIndicator.tsx`):
1. Create status indicator with icon and text
2. Show different states (idle, saving, saved, error)
3. Include timestamp of last save

---

### Step 7: API Integration Functions

**File**: `src/lib/api/badge-applications.ts` (or similar)

1. Create `createBadgeApplication(data: CreateBadgeApplicationCommand)` function
2. Create `updateBadgeApplication(id: string, data: UpdateBadgeApplicationCommand)` function
3. Create `submitBadgeApplication(id: string)` function
4. Handle API responses and errors consistently
5. Use Supabase client from context

---

### Step 8: Add Client-Side Validation

**File**: `src/lib/validation/application-validation.ts`

1. Create Zod schemas matching API validation
2. Create validation functions for each field
3. Create form-level validation function
4. Export for use in hook and components

---

### Step 9: Implement Error Handling

1. Add error toast system (if not exists)
2. Implement error boundaries for React components
3. Add error state handling in hook
4. Map API errors to user-friendly messages
5. Add retry logic for network errors

---

### Step 10: Add Accessibility Features

1. Add ARIA labels to all form fields
2. Add ARIA live region for autosave status
3. Ensure keyboard navigation works (Tab order)
4. Add focus management (focus first error on validation)
5. Add screen reader announcements for state changes
6. Test with screen reader

---

### Step 11: Styling and Responsive Design

1. Apply Tailwind CSS classes following project patterns
2. Ensure shadcn/ui components styled consistently
3. Test responsive layout (mobile, tablet, desktop)
4. Add loading skeletons for data fetching
5. Style validation states (error, success)

---

### Step 12: Testing

1. Test new application flow end-to-end
2. Test edit draft flow end-to-end
3. Test autosave functionality (debounce, network errors)
4. Test validation (client and server)
5. Test error scenarios (404, 403, 409, network)
6. Test accessibility with keyboard and screen reader
7. Test with different catalog badge states (active, inactive)

---

### Step 13: Integration Testing

1. Test integration with catalog badge list/detail views
2. Test navigation to/from application list
3. Test redirect after submission
4. Test session expiry handling
5. Test concurrent editing scenarios

---

### Step 14: Documentation

1. Add JSDoc comments to components and functions
2. Document props interfaces
3. Add usage examples in component files
4. Update project documentation with new routes

---

### Step 15: Performance Optimization

1. Review and optimize re-renders
2. Memoize expensive computations
3. Optimize debounce timing for autosave
4. Add loading states and skeletons
5. Test performance with slow network
