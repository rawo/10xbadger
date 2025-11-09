# View Implementation Plan: Template Detail / Use Template

## 1. Overview

The Template Detail / Use Template view displays comprehensive information about a single promotion template, including its badge requirements and metadata. This view serves as both an informational resource for users to understand promotion requirements and as a starting point for creating new promotion submissions. Administrators can also edit or deactivate templates directly from this view.

**Key Features:**
- Display full template details including path, levels, and creation metadata
- Show all badge requirements (rules) in a clear, organized format
- Provide "Use This Template" call-to-action to initiate promotion creation
- Admin capabilities: edit template details, deactivate obsolete templates
- Breadcrumb navigation back to templates list
- Handle inactive templates with appropriate visual indicators
- Responsive layout with proper information hierarchy
- Comprehensive error handling for 404, unauthorized access, and server errors

**User Value:**
- Engineers can view exactly what badges they need for a specific promotion
- Clear path from discovering requirements to starting a promotion submission
- Admins can quickly update or retire templates without returning to the list view

## 2. View Routing

**Primary Route:** `/promotion-templates/:id`

**Route Parameters:**
- `id` - UUID of the promotion template (required)

**Example URLs:**
- `/promotion-templates/550e8400-e29b-41d4-a716-446655440001` - View specific template
- `/promotion-templates/invalid-id` - Invalid UUID format (400 error)
- `/promotion-templates/00000000-0000-0000-0000-000000000000` - Non-existent template (404 error)

**Navigation Paths:**
- **From:** Templates list view (`/promotion-templates`) via template card click
- **From:** Promotions builder when selecting/viewing template
- **From:** Dashboard "Quick Links" or search results
- **Back To:** Templates list via breadcrumb navigation
- **Forward To:** Promotion builder (`/promotions/new?template_id=:id`) via "Use This Template" button

**URL State:**
This view does not use query parameters. The template ID in the path is sufficient for identifying the resource.

## 3. Component Structure

```
TemplateDetailPage.astro (SSR Entry Point)
└── TemplateDetailView (React Component, client:load)
    ├── TemplateDetailHeader
    │   ├── Breadcrumb Navigation
    │   │   └── Link to /promotion-templates
    │   ├── Template Name (h1)
    │   └── Admin Action Buttons
    │       ├── Button "Edit" (admin only)
    │       └── Button "Deactivate" (admin only, if active)
    │
    ├── Content Grid (2-column on desktop, stacked on mobile)
    │   ├── Left Column (Main Content)
    │   │   ├── TemplateOverviewCard
    │   │   │   ├── Card Header "Template Information"
    │   │   │   ├── Status Badge (Active/Inactive)
    │   │   │   ├── Path Badge (Technical/Financial/Management)
    │   │   │   ├── Level Progression Display (From → To)
    │   │   │   ├── Created Date
    │   │   │   ├── Updated Date (if exists)
    │   │   │   └── Deactivated Date (if inactive)
    │   │   │
    │   │   └── TemplateRulesDetailCard
    │   │       ├── Card Header "Badge Requirements"
    │   │       ├── Description Text
    │   │       └── RulesDetailList
    │   │           └── For each rule:
    │   │               ├── Rule Row
    │   │               │   ├── Quantity Badge (e.g., "3×")
    │   │               │   ├── Category Badge (Technical/Organizational/Soft Skilled)
    │   │               │   └── Level Badge (Gold/Silver/Bronze)
    │   │               └── Divider
    │   │
    │   └── Right Column (Sidebar)
    │       └── UseTemplateCard
    │           ├── Card Header "Ready to Apply?"
    │           ├── Description (What happens when you use this template)
    │           ├── Requirements List (Template metadata summary)
    │           ├── Warning Message (if inactive)
    │           └── Button "Use This Template" (disabled if inactive)
    │
    ├── TemplateFormModal (Reused from list view)
    │   ├── Modal for editing template
    │   ├── Pre-filled with current template data
    │   └── Validation and submission logic
    │
    └── ConfirmDeactivateModal (Reused from list view)
        ├── Confirmation dialog for deactivation
        ├── Warning about impact
        └── Confirm/Cancel actions
```

## 4. Component Details

### TemplateDetailPage.astro

**Component Description:**
Server-side rendered page component that serves as the entry point for the template detail view. Handles initial template data fetching by ID, validates the route parameter, checks authentication (in production), and handles 404 errors for non-existent templates. Hydrates the React detail view component with server-rendered data.

**Main Elements:**
- `Layout` wrapper with dynamic page metadata (title includes template name)
- Server-side authentication check (currently disabled for development)
- Route parameter extraction and UUID validation
- API call to `GET /api/promotion-templates/:id`
- Error boundaries for 400 (invalid UUID), 401 (unauthorized), 404 (not found), and 500 (server error)
- `TemplateDetailView` React component with `client:load` directive
- Error display component for failed data fetching

**Handled Events:**
None (SSR component)

**Validation Conditions:**
- **Template ID Format:** Validate `id` parameter is a valid UUID format
  - Invalid format → Return 400 error page
- **User Authentication:** Verify user is authenticated (production mode)
  - Not authenticated → Redirect to `/login`
- **Template Exists:** Check API returns template data, not 404
  - Not found → Display 404 error page with link back to list
- **API Response Structure:** Validate response matches `PromotionTemplateDetailDto`
  - Invalid structure → Display error state
- **Server Errors:** Handle 500 responses gracefully
  - Server error → Display error page with retry option

**Types:**
- `PromotionTemplateDetailDto` - Template data from API
- `ApiError` - Error responses from API

**Props:**
N/A (Top-level page component)

**Implementation Notes:**
- Use Astro's `context.params.id` to extract template ID from URL
- Use `z.string().uuid()` for UUID validation before API call
- Use `Astro.redirect()` for authentication redirects
- Set page title dynamically: `{template.name} | Promotion Templates | Badger`
- Include OpenGraph metadata for sharing

---

### TemplateDetailView

**Component Description:**
Main React orchestration component that manages the state of the template detail page. Coordinates child components for displaying template information, handles modal states for edit and deactivate operations, manages API calls for updates, and provides callbacks for user interactions. Implements responsive layout switching between mobile (stacked) and desktop (2-column) views.

**Main Elements:**
- Container div with responsive padding and max-width
- `TemplateDetailHeader` with breadcrumb and admin actions
- Responsive grid layout (1 column mobile, 2 columns desktop)
  - Left column: `TemplateOverviewCard` and `TemplateRulesDetailCard`
  - Right column: `UseTemplateCard` (sticky positioned on desktop)
- `TemplateFormModal` for editing (conditional render)
- `ConfirmDeactivateModal` for deactivation (conditional render)
- Toast notifications for success/error feedback

**Handled Events:**
- **Edit Button Click** → Open `TemplateFormModal` with current template data pre-filled
- **Deactivate Button Click** → Open `ConfirmDeactivateModal` with template name
- **Use Template Button Click** → Navigate to `/promotions/new?template_id={id}` (or show "coming soon" message if promotions not implemented)
- **Edit Form Submit** → Call `PUT /api/promotion-templates/:id`, show success toast, refresh template data
- **Deactivate Confirm** → Call `DELETE /api/promotion-templates/:id`, show success toast, update template state to inactive
- **Modal Close** → Reset modal states, clear any error states

**Validation Conditions:**
- **Admin Actions Visibility:** Verify `isAdmin` prop is true before showing Edit/Deactivate buttons
- **Use Template Availability:** Check `template.is_active` is true before enabling "Use This Template" button
  - If inactive → Button disabled with tooltip explaining why
- **Edit Validation:** Delegate to `TemplateFormModal` validation logic
  - Required fields: name, path, from_level, to_level, at least one rule
- **Deactivate Validation:** Only allow if template is currently active
  - If already inactive → Hide deactivate button

**Types:**
- `TemplateDetailViewProps` - Component interface
- `PromotionTemplateDetailDto` - Template data
- `TemplateFormData` - Form submission data
- `ApiError` - Error responses

**Props:**
```typescript
interface TemplateDetailViewProps {
  initialTemplate: PromotionTemplateDetailDto;
  isAdmin: boolean;
  userId: string;
}
```

**State:**
```typescript
const [template, setTemplate] = useState<PromotionTemplateDetailDto>(initialTemplate);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
```

**Implementation Notes:**
- Use CSS Grid for responsive layout: `grid-cols-1 lg:grid-cols-3 gap-6`
- Right sidebar should span `lg:col-span-1` and be sticky on desktop
- After successful update, fetch fresh template data to ensure consistency
- Handle concurrent modifications gracefully (show warning if data changed)

---

### TemplateDetailHeader

**Component Description:**
Header section displaying breadcrumb navigation, template name, status indicator, and admin action buttons. Provides context about where the user is in the navigation hierarchy and offers quick access to editing and deactivation functions for administrators.

**Main Elements:**
- Breadcrumb navigation component
  - Link to "Home" (`/`)
  - Separator (`/`)
  - Link to "Promotion Templates" (`/promotion-templates`)
  - Separator (`/`)
  - Current template name (not linked, `aria-current="page"`)
- Template name heading (h1 with large, bold styling)
- Status badge (visible if template is inactive)
  - Red "Inactive" badge with destructive styling
  - Positioned inline with heading or on separate line on mobile
- Admin action button group (flexbox, gap-2)
  - "Edit" button (outline variant, with Edit icon)
  - "Deactivate" button (destructive variant, only if template is active)

**Handled Events:**
- **Edit Button Click** → Trigger `onEditClick` callback to open edit modal
- **Deactivate Button Click** → Trigger `onDeactivateClick` callback to open confirmation modal
- **Breadcrumb Link Click** → Navigate to respective pages (handled by browser)

**Validation Conditions:**
- **Admin Buttons Visibility:** Only render Edit and Deactivate buttons if `isAdmin` is true
- **Deactivate Button Visibility:** Only show Deactivate button if `isActive` is true
  - Already inactive templates cannot be deactivated again
- **Status Badge Visibility:** Only show "Inactive" badge if `isActive` is false

**Types:**
- `TemplateDetailHeaderProps` - Component interface

**Props:**
```typescript
interface TemplateDetailHeaderProps {
  templateName: string;
  isAdmin: boolean;
  isActive: boolean;
  onEditClick: () => void;
  onDeactivateClick: () => void;
}
```

**Implementation Notes:**
- Use shadcn/ui Breadcrumb component for navigation
- Use semantic HTML: `<nav aria-label="Breadcrumb">` for accessibility
- Template name should truncate with ellipsis on very narrow screens
- Buttons should stack on mobile, inline on desktop
- Use lucide-react icons: `Pencil` for Edit, `Trash2` for Deactivate

---

### TemplateOverviewCard

**Component Description:**
Card component displaying essential metadata about the promotion template, including career path, level transition, status, and timestamps. Presents information in a structured, scannable format with appropriate visual hierarchy and color-coded badges for status and path.

**Main Elements:**
- Card container (shadcn/ui Card component)
- Card header with title "Template Information"
- Content grid (2 columns on desktop, 1 column mobile)
  - **Status Row:**
    - Label: "Status"
    - Value: Active/Inactive badge (green for active, red for inactive)
  - **Career Path Row:**
    - Label: "Career Path"
    - Value: Path badge (Technical=blue, Financial=green, Management=purple)
  - **Level Progression Row:**
    - Label: "Level Progression"
    - Value: `{from_level} → {to_level}` with arrow icon
  - **Created Date Row:**
    - Label: "Created"
    - Value: Formatted date (e.g., "January 15, 2025")
  - **Updated Date Row (conditional):**
    - Label: "Last Updated"
    - Value: Formatted date (only if `updated_at` is not null)
  - **Deactivated Date Row (conditional):**
    - Label: "Deactivated"
    - Value: Formatted date (only if `deactivated_at` is not null)
    - Red text color to emphasize inactive status

**Handled Events:**
None (Display-only component)

**Validation Conditions:**
None (Assumes data is valid from API)

**Types:**
- `TemplateOverviewCardProps` - Component interface
- `PromotionTemplateDetailDto` - Template data structure

**Props:**
```typescript
interface TemplateOverviewCardProps {
  template: PromotionTemplateDetailDto;
}
```

**Implementation Notes:**
- Use shadcn/ui Card, CardHeader, CardTitle, CardContent components
- Use shadcn/ui Badge component for status and path
- Format dates using `new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`
- Use ArrowRight icon from lucide-react for level progression
- Apply consistent spacing between rows (e.g., `space-y-3`)
- Labels should use `text-sm text-muted-foreground` styling
- Values should use `text-base font-medium text-foreground` styling

**Badge Color Mapping:**
- Status: Active (green/success), Inactive (red/destructive)
- Path: Technical (blue), Financial (green), Management (purple)

---

### TemplateRulesDetailCard

**Component Description:**
Card component displaying the complete list of badge requirements (rules) for the promotion template. Shows each rule with visual badges for category and level, making it easy to understand exactly what badges are needed. Organizes rules in a clear, scannable format with proper spacing and visual hierarchy.

**Main Elements:**
- Card container (shadcn/ui Card component)
- Card header with title "Badge Requirements"
- Descriptive text explaining what rules represent
- Rules list container (vertical stack with dividers)
  - For each rule:
    - Rule row (flexbox, aligned center, gap-3)
      - Quantity badge (e.g., "3×" in medium font weight)
      - Category badge (colored based on category)
      - Level badge (colored based on level)
    - Divider line (except after last rule)
- Empty state message (if no rules, though this should never happen due to API validation)

**Handled Events:**
None (Display-only component)

**Validation Conditions:**
- **Rules Exist:** Check that `rules` array has at least one item
  - Empty array → Show message "No rules defined for this template" (error state)
- **Rule Data Validity:** Each rule should have category, level, and count > 0
  - Invalid data → Skip rendering that rule and log warning

**Types:**
- `TemplateRulesDetailCardProps` - Component interface
- `PromotionTemplateRule` - Individual rule structure
- `BadgeCategoryType` - Category enum values
- `BadgeLevelType` - Level enum values

**Props:**
```typescript
interface TemplateRulesDetailCardProps {
  rules: PromotionTemplateRule[];
}

// Where PromotionTemplateRule is:
interface PromotionTemplateRule {
  category: BadgeCategoryType | "any";
  level: BadgeLevelType;
  count: number; // Changed from minimum_required to match implementation
}
```

**Implementation Notes:**
- Reuse the `RulesList` component from templates list view, but in detailed (non-compact) mode
- Use shadcn/ui Card, CardHeader, CardTitle, CardContent, CardDescription
- Sort rules by category (technical, organizational, softskilled) then by level (gold, silver, bronze) for consistent display
- Use consistent color scheme:
  - Technical: Blue (`bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400`)
  - Organizational: Green (`bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400`)
  - Soft Skilled: Purple (`bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400`)
  - Gold: Yellow (`bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400`)
  - Silver: Gray (`bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300`)
  - Bronze: Orange (`bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400`)
- Quantity should be prominently displayed with `font-semibold` styling

**Accessibility:**
- Use semantic list markup (`<ul>` and `<li>`)
- Provide `aria-label="Badge requirements"` on the list
- Each badge should have appropriate text contrast ratios

---

### UseTemplateCard

**Component Description:**
Sticky sidebar card providing a call-to-action for users to create a new promotion based on this template. Includes a summary of template requirements, explanatory text about what happens when using the template, and a prominent action button. Handles both active and inactive template states with appropriate messaging and button states.

**Main Elements:**
- Card container (shadcn/ui Card component, sticky positioned on desktop)
- Card header with title "Ready to Apply for Promotion?"
- Card description/body text:
  - Introduction paragraph explaining the promotion process
  - Key requirements summary list:
    - Career path (e.g., "Technical track")
    - Level transition (e.g., "J2 → J3")
    - Number of badge requirements (e.g., "3 badge requirements to fulfill")
- Warning alert (conditional, only if template is inactive):
  - Alert icon (Info or AlertTriangle)
  - Message: "This template has been deactivated and cannot be used for new promotions."
- Action button:
  - Primary button "Use This Template" (if active)
  - Disabled button with tooltip (if inactive)
- Helper text: "You'll be able to select specific badges and review before submitting"

**Handled Events:**
- **Use Template Button Click** → Trigger `onUseTemplate` callback
  - Expected behavior: Navigate to `/promotions/new?template_id={templateId}`
  - Alternative: Show modal to create promotion draft then navigate to promotion builder

**Validation Conditions:**
- **Template Active Check:** Verify `isActive` is true before enabling button
  - If inactive → Button disabled, warning message shown, tooltip on button explaining why it's disabled
- **User Authentication:** Assumes user is authenticated (handled by page-level auth)
- **Data Completeness:** Verify template has path, from_level, to_level, and at least one rule

**Types:**
- `UseTemplateCardProps` - Component interface
- `PromotionPathType` - Career path enum

**Props:**
```typescript
interface UseTemplateCardProps {
  templateId: string;
  templateName: string;
  templatePath: PromotionPathType;
  fromLevel: string;
  toLevel: string;
  rulesCount: number;
  isActive: boolean;
  onUseTemplate: () => void;
}
```

**Implementation Notes:**
- Use `sticky top-6` positioning on desktop to keep card visible while scrolling
- Use shadcn/ui Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Use shadcn/ui Alert component for inactive warning (destructive variant)
- Use shadcn/ui Button component (primary variant when active, disabled when inactive)
- Use shadcn/ui Tooltip to explain disabled state
- Requirements list should use bullet points or icons
- Format path name: capitalize first letter (Technical, Financial, Management)
- Use Rocket or ArrowRight icon on the "Use This Template" button
- On mobile, card should appear at bottom (not sticky)

**Content Examples:**
- Description: "This template defines the requirements for advancing from {fromLevel} to {toLevel} in the {path} career path. Click below to start building your promotion submission."
- Inactive warning: "This template has been deactivated and cannot be used for new promotions. Please contact an administrator if you believe this is an error."

---

### TemplateFormModal (Reused from List View)

**Component Description:**
Modal dialog for editing the promotion template. This component is imported and reused from the templates list view implementation (`src/components/promotion-templates/TemplateFormModal.tsx`). Pre-fills form fields with current template data and handles validation and submission for updates.

**Main Elements:**
(Same as list view implementation)
- Modal dialog with header "Edit Promotion Template"
- Form fields: name, path, from_level, to_level
- Dynamic rules editor for adding/removing badge requirements
- Validation error messages
- Action buttons: Cancel, Save Changes

**Handled Events:**
- Form field changes with validation
- Add/remove rules
- Form submission (PUT /api/promotion-templates/:id)
- Modal close/cancel

**Validation Conditions:**
(Same as list view - see TemplateFormModal documentation)
- Name: required, max 200 characters
- Path: required, must be valid PromotionPathType
- From Level: required, max 50 characters
- To Level: required, max 50 characters
- Rules: at least one rule required, each rule must have valid category, level, and count > 0

**Types:**
- `TemplateFormModalProps` - Component interface
- `TemplateFormData` - Form data structure

**Props:**
```typescript
interface TemplateFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  template?: PromotionTemplateListItemDto;
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
}
```

**Implementation Notes:**
- Import from `@/components/promotion-templates/TemplateFormModal`
- Pass `mode="edit"` when opening from detail view
- Pass current template data to pre-fill form
- Handle submission in parent component (TemplateDetailView)
- On successful update, refetch template data and close modal

---

### ConfirmDeactivateModal (Reused from List View)

**Component Description:**
Confirmation dialog for deactivating the promotion template. This component is imported and reused from the templates list view implementation (`src/components/promotion-templates/ConfirmDeactivateModal.tsx`). Shows a warning about the implications of deactivation and requires explicit confirmation.

**Main Elements:**
(Same as list view implementation)
- Alert dialog with destructive styling
- Title "Deactivate Template?"
- Warning message with template name
- Explanation of impact
- Action buttons: Cancel, Deactivate

**Handled Events:**
- Confirm button click (deactivation)
- Cancel button click
- Dialog close

**Validation Conditions:**
- Template must be currently active to show this modal

**Types:**
- `TemplateConfirmDeactivateModalProps` - Component interface

**Props:**
```typescript
interface TemplateConfirmDeactivateModalProps {
  isOpen: boolean;
  template: PromotionTemplateListItemDto | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

**Implementation Notes:**
- Import from `@/components/promotion-templates/ConfirmDeactivateModal`
- Handle deactivation in parent component (TemplateDetailView)
- On successful deactivation, update template state to reflect inactive status
- Show success toast after deactivation

---

## 5. Types

### Existing Types (Reused)

All types are already defined in `src/types.ts` from the list view implementation:

```typescript
/**
 * Promotion template with typed rules field
 * Database stores rules as JSONB, we type it as PromotionTemplateRule[]
 */
export interface PromotionTemplateDto extends Omit<PromotionTemplateRow, "rules"> {
  rules: PromotionTemplateRule[];
}

/**
 * Detail response for a single promotion template (GET /api/promotion-templates/:id)
 * Same structure as list item but conceptually represents full detail
 */
export type PromotionTemplateDetailDto = PromotionTemplateDto;

/**
 * Rule definition for promotion templates
 * Specifies required badge counts by category and level
 */
export interface PromotionTemplateRule {
  category: BadgeCategoryType | "any";
  level: BadgeLevelType;
  count: number; // Note: Implementation uses 'count', not 'minimum_required'
}

/**
 * Promotion path enum
 */
export type PromotionPathType = "technical" | "financial" | "management";

/**
 * Badge category enum
 */
export type BadgeCategoryType = "technical" | "organizational" | "softskilled";

/**
 * Badge level enum
 */
export type BadgeLevelType = "gold" | "silver" | "bronze";
```

### New Types to Add

Add these types to `src/types.ts` in the "Promotion Templates Detail View Types" section:

```typescript
// =============================================================================
// Promotion Templates Detail View Types
// =============================================================================

/**
 * Props for TemplateDetailView component
 */
export interface TemplateDetailViewProps {
  initialTemplate: PromotionTemplateDetailDto;
  isAdmin: boolean;
  userId: string;
}

/**
 * Props for TemplateDetailHeader component
 */
export interface TemplateDetailHeaderProps {
  templateName: string;
  isAdmin: boolean;
  isActive: boolean;
  onEditClick: () => void;
  onDeactivateClick: () => void;
}

/**
 * Props for TemplateOverviewCard component
 */
export interface TemplateOverviewCardProps {
  template: PromotionTemplateDetailDto;
}

/**
 * Props for TemplateRulesDetailCard component
 */
export interface TemplateRulesDetailCardProps {
  rules: PromotionTemplateRule[];
}

/**
 * Props for UseTemplateCard component
 */
export interface UseTemplateCardProps {
  templateId: string;
  templateName: string;
  templatePath: PromotionPathType;
  fromLevel: string;
  toLevel: string;
  rulesCount: number;
  isActive: boolean;
  onUseTemplate: () => void;
}
```

### Type Usage Summary

| Component | Primary Types Used |
|-----------|-------------------|
| TemplateDetailPage.astro | `PromotionTemplateDetailDto`, `ApiError` |
| TemplateDetailView | `TemplateDetailViewProps`, `PromotionTemplateDetailDto`, `TemplateFormData` |
| TemplateDetailHeader | `TemplateDetailHeaderProps` |
| TemplateOverviewCard | `TemplateOverviewCardProps`, `PromotionTemplateDetailDto` |
| TemplateRulesDetailCard | `TemplateRulesDetailCardProps`, `PromotionTemplateRule[]` |
| UseTemplateCard | `UseTemplateCardProps`, `PromotionPathType` |
| TemplateFormModal | `TemplateFormModalProps`, `TemplateFormData` (reused) |
| ConfirmDeactivateModal | `TemplateConfirmDeactivateModalProps` (reused) |

## 6. State Management

### State Architecture

State management for the Template Detail view follows a simple, centralized approach using React's built-in `useState` and `useCallback` hooks. No custom hooks or external state management libraries are needed. State is managed at the top level in `TemplateDetailView` and passed down to child components via props.

### Primary State Variables

Located in `TemplateDetailView` component:

```typescript
// Template data - initialized from props, updated after mutations
const [template, setTemplate] = useState<PromotionTemplateDetailDto>(initialTemplate);

// Modal visibility states
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

// Loading state for async operations
const [isLoading, setIsLoading] = useState(false);
```

### State Update Patterns

**1. Opening Edit Modal:**
```typescript
const handleEditClick = () => {
  setIsEditModalOpen(true);
};
```

**2. Closing Edit Modal:**
```typescript
const handleEditModalClose = () => {
  setIsEditModalOpen(false);
};
```

**3. Submitting Edit Form:**
```typescript
const handleEditSubmit = async (data: TemplateFormData) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/promotion-templates/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.message || 'Failed to update template');
    }

    // Refetch template to ensure data consistency
    const updatedTemplate = await fetchTemplateById(template.id);
    setTemplate(updatedTemplate);

    toast.success('Template updated successfully');
    setIsEditModalOpen(false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    toast.error(message);
  } finally {
    setIsLoading(false);
  }
};
```

**4. Deactivating Template:**
```typescript
const handleDeactivateConfirm = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/promotion-templates/${template.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.message || 'Failed to deactivate template');
    }

    // Update template state to reflect deactivation
    setTemplate(prev => ({
      ...prev,
      is_active: false,
      deactivated_at: new Date().toISOString(),
    }));

    toast.success('Template deactivated successfully');
    setIsDeactivateModalOpen(false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate template';
    toast.error(message);
  } finally {
    setIsLoading(false);
  }
};
```

**5. Using Template for Promotion:**
```typescript
const handleUseTemplate = () => {
  // Navigate to promotions builder with template pre-selected
  window.location.href = `/promotions/new?template_id=${template.id}`;

  // Alternative: If promotions not yet implemented, show message
  // toast.info('Promotions feature coming soon!');
};
```

### Props Flow

```
TemplateDetailView (state owner)
├── template → TemplateDetailHeader (templateName, isActive)
├── template → TemplateOverviewCard (entire template object)
├── template.rules → TemplateRulesDetailCard (rules array)
├── template → UseTemplateCard (id, name, path, levels, isActive)
├── isEditModalOpen, template → TemplateFormModal
└── isDeactivateModalOpen, template → ConfirmDeactivateModal
```

### No Custom Hooks Needed

The view does not require custom hooks. Standard React hooks are sufficient:
- `useState` - For all state variables
- `useCallback` - For memoizing event handlers (optional optimization)
- `useEffect` - Not needed (no side effects beyond user actions)

### State Persistence

- **No client-side persistence:** Template data is fetched fresh on page load
- **Server as source of truth:** After mutations, refetch from server to ensure consistency
- **Optimistic updates:** Not used in this view to maintain simplicity and data integrity
- **URL state:** Template ID is in URL, no other state needs to be in URL

## 7. API Integration

### Overview

The Template Detail view integrates with the Promotion Templates API to fetch, update, and deactivate individual templates. All API calls use standard `fetch` with proper error handling, loading states, and user feedback via toast notifications.

### API Endpoints Used

#### 1. GET /api/promotion-templates/:id

**Purpose:** Fetch complete template details by ID

**When Called:**
- Server-side on initial page load (Astro component)
- Client-side after successful update (to refresh data)

**Request:**
```typescript
// Server-side (Astro)
const response = await fetch(`${baseUrl}/api/promotion-templates/${id}`, {
  headers: {
    Cookie: Astro.request.headers.get('Cookie') || '',
  },
});

// Client-side (React)
const response = await fetch(`/api/promotion-templates/${templateId}`);
```

**Request Type:** No body (GET request)

**Response Type:**
```typescript
// Success (200)
PromotionTemplateDetailDto

// Error (400 - Invalid UUID)
ApiError {
  error: "validation_error";
  message: "Invalid template ID format";
  details?: Array<{ field: string; message: string }>;
}

// Error (404 - Not Found)
ApiError {
  error: "not_found";
  message: "Promotion template not found";
}

// Error (500 - Server Error)
ApiError {
  error: "internal_error";
  message: "An unexpected error occurred while fetching the promotion template";
}
```

**Error Handling:**
- **400:** Show error page "Invalid template ID format" with link back to list
- **404:** Show 404 page "Template not found" with link back to list
- **500:** Show error page with retry button
- **Network Error:** Show error page with retry button

**Implementation Example (Server-side):**
```typescript
// In TemplateDetailPage.astro
try {
  const response = await fetch(`${baseUrl}/api/promotion-templates/${id}`, {
    headers: {
      Cookie: Astro.request.headers.get('Cookie') || '',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Render 404 error page
      return Astro.redirect('/404');
    }
    const errorData: ApiError = await response.json();
    throw new Error(errorData.message);
  }

  const template: PromotionTemplateDetailDto = await response.json();

  // Pass to React component
} catch (error) {
  // Render error page with message
}
```

---

#### 2. PUT /api/promotion-templates/:id

**Purpose:** Update an existing promotion template

**When Called:**
- User clicks "Save Changes" in edit modal
- Only available to admin users

**Request:**
```typescript
const response = await fetch(`/api/promotion-templates/${templateId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});
```

**Request Type:**
```typescript
// Partial update - only include fields being changed
UpdatePromotionTemplateCommand {
  name?: string;
  rules?: PromotionTemplateRule[];
}

// Note: path, from_level, to_level are immutable after creation
```

**Response Type:**
```typescript
// Success (200)
PromotionTemplateDetailDto // Updated template

// Error (400 - Validation Error)
ApiError {
  error: "validation_error";
  message: "Invalid request body";
  details?: Array<{ field: string; message: string }>;
}

// Error (404 - Not Found)
ApiError {
  error: "not_found";
  message: "Promotion template not found";
}

// Error (500 - Server Error)
ApiError {
  error: "internal_error";
  message: "An unexpected error occurred while updating the promotion template";
}
```

**Validation Rules:**
- **name:** Optional, if provided must be 1-200 characters
- **rules:** Optional, if provided:
  - Must be an array with at least 1 rule
  - Each rule must have valid category (technical/organizational/softskilled/any)
  - Each rule must have valid level (gold/silver/bronze)
  - Each rule must have count >= 1

**Error Handling:**
- **400:** Show inline validation errors in form modal
- **404:** Show toast error "Template not found" and close modal
- **500:** Show toast error "Failed to update template" and keep modal open for retry
- **Network Error:** Show toast error "Network error" and keep modal open

**Implementation Example:**
```typescript
const handleEditSubmit = async (data: TemplateFormData) => {
  setIsLoading(true);
  try {
    const updateData: UpdatePromotionTemplateCommand = {
      name: data.name,
      rules: data.rules,
    };

    const response = await fetch(`/api/promotion-templates/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.message || 'Failed to update template');
    }

    const updatedTemplate: PromotionTemplateDetailDto = await response.json();
    setTemplate(updatedTemplate);

    toast.success('Template updated successfully');
    setIsEditModalOpen(false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    toast.error(message);
    // Keep modal open for user to retry
  } finally {
    setIsLoading(false);
  }
};
```

---

#### 3. DELETE /api/promotion-templates/:id

**Purpose:** Deactivate (soft delete) a promotion template

**When Called:**
- User clicks "Deactivate" in confirmation modal
- Only available to admin users
- Only for active templates

**Request:**
```typescript
const response = await fetch(`/api/promotion-templates/${templateId}`, {
  method: 'DELETE',
});
```

**Request Type:** No body (DELETE request)

**Response Type:**
```typescript
// Success (200)
{
  message: "Promotion template deactivated successfully";
}

// Error (400 - Invalid UUID)
ApiError {
  error: "validation_error";
  message: "Invalid template ID format";
  details?: Array<{ field: string; message: string }>;
}

// Error (404 - Not Found)
ApiError {
  error: "not_found";
  message: "Promotion template not found";
}

// Error (500 - Server Error)
ApiError {
  error: "internal_error";
  message: "An unexpected error occurred while deactivating the promotion template";
}
```

**Error Handling:**
- **400:** Should never happen (ID validated earlier), but show toast error if it does
- **404:** Show toast error "Template not found" and close modal
- **500:** Show toast error "Failed to deactivate template" and keep modal open
- **Network Error:** Show toast error "Network error" and keep modal open for retry

**Implementation Example:**
```typescript
const handleDeactivateConfirm = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/promotion-templates/${template.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.message || 'Failed to deactivate template');
    }

    // Update local template state (soft delete)
    setTemplate(prev => ({
      ...prev,
      is_active: false,
      deactivated_at: new Date().toISOString(),
    }));

    toast.success('Template deactivated successfully');
    setIsDeactivateModalOpen(false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate template';
    toast.error(message);
    // Keep modal open for retry
  } finally {
    setIsLoading(false);
  }
};
```

---

### API Call Patterns

**1. Loading States:**
All API calls should set `isLoading` state:
```typescript
setIsLoading(true);
try {
  // API call
} finally {
  setIsLoading(false);
}
```

**2. Error Handling:**
Use try-catch with proper error typing:
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.message || 'Default error message');
  }
  // Success handling
} catch (error) {
  const message = error instanceof Error ? error.message : 'Generic error message';
  toast.error(message);
}
```

**3. Success Feedback:**
Always provide user feedback:
```typescript
toast.success('Template updated successfully');
```

**4. Data Refresh:**
After mutations, either:
- Update local state optimistically, OR
- Refetch from server for guaranteed consistency (preferred for this view)

```typescript
// Option 1: Optimistic update
setTemplate(prev => ({ ...prev, ...updates }));

// Option 2: Refetch (preferred)
const updatedTemplate = await fetchTemplateById(template.id);
setTemplate(updatedTemplate);
```

### Authentication & Authorization

**Current State:** Development mode - authentication disabled

**Production Requirements:**
- All endpoints require authenticated user
- PUT and DELETE endpoints require admin role
- Server validates auth via session cookies
- Client should check `isAdmin` prop before showing admin actions

**Error Responses:**
- 401 Unauthorized → Redirect to login page
- 403 Forbidden → Show error message "Admin access required"

## 8. User Interactions

### Primary User Flows

#### Flow 1: View Template Details

**Trigger:** User navigates to `/promotion-templates/:id` from templates list

**Steps:**
1. Page loads with template data from server
2. User sees complete template information:
   - Template name and status in header
   - Career path, level progression, creation date in overview card
   - Complete list of badge requirements in rules card
   - "Use This Template" CTA in sidebar (if template is active)
3. User can scroll to view all information
4. Sidebar remains sticky on desktop for easy access to CTA

**Expected Outcome:**
- User understands exactly what badges are required for this promotion
- User can easily identify if template is applicable to them
- User knows how to proceed (use template or return to list)

**Error Scenarios:**
- Template not found → Show 404 page with link back to list
- Invalid template ID → Show error page with link back to list
- Network error → Show error page with retry button

---

#### Flow 2: Use Template for Promotion

**Trigger:** User clicks "Use This Template" button

**Preconditions:**
- Template must be active (`is_active: true`)
- User must be authenticated

**Steps:**
1. User clicks "Use This Template" button in sidebar card
2. System navigates to promotion builder: `/promotions/new?template_id={id}`
3. Promotion builder opens with template pre-selected
4. User can begin selecting badges for promotion

**Expected Outcome:**
- User is taken to promotion builder with correct template context
- Template requirements are visible in promotion builder
- User can immediately start working on promotion

**Alternative (if promotions not implemented):**
- Show toast message: "Promotions feature coming soon!"
- Keep user on template detail page

**Error Scenarios:**
- Template inactive → Button disabled, tooltip explains why
- User not authenticated → Redirect to login (handled at page level)
- Navigation fails → Show error toast, keep user on current page

---

#### Flow 3: Edit Template (Admin Only)

**Trigger:** Admin clicks "Edit" button in header

**Preconditions:**
- User must have admin role (`isAdmin: true`)
- Template data must be loaded

**Steps:**
1. Admin clicks "Edit" button in header
2. System opens `TemplateFormModal` with current template data pre-filled
3. Admin modifies:
   - Template name
   - Badge requirements (add/remove/modify rules)
4. Admin clicks "Save Changes"
5. System validates form data client-side
6. System sends PUT request to `/api/promotion-templates/:id`
7. System shows loading state on button
8. On success:
   - Modal closes
   - Template data refreshes
   - Success toast appears: "Template updated successfully"
9. Template detail view updates to show new values

**Expected Outcome:**
- Template is updated with new information
- Changes are immediately visible in detail view
- User receives confirmation of successful update

**Validation:**
- Name: required, 1-200 characters
- Rules: at least 1 rule required
- Each rule: valid category, level, count >= 1

**Error Scenarios:**
- Validation error → Show inline error messages in form, keep modal open
- Template not found (404) → Show toast error, close modal
- Server error (500) → Show toast error, keep modal open for retry
- Network error → Show toast error, keep modal open for retry
- Concurrent modification → Show warning toast, refresh data, keep modal open

---

#### Flow 4: Deactivate Template (Admin Only)

**Trigger:** Admin clicks "Deactivate" button in header

**Preconditions:**
- User must have admin role (`isAdmin: true`)
- Template must be active (`is_active: true`)

**Steps:**
1. Admin clicks "Deactivate" button in header
2. System opens `ConfirmDeactivateModal` with warning message
3. Modal shows:
   - Template name being deactivated
   - Warning about impact
   - Explanation that existing promotions won't be affected
4. Admin clicks "Deactivate" to confirm (or "Cancel" to abort)
5. System sends DELETE request to `/api/promotion-templates/:id`
6. System shows loading state on button
7. On success:
   - Modal closes
   - Template state updates to inactive
   - Success toast appears: "Template deactivated successfully"
   - "Inactive" badge appears in header
   - "Deactivate" button is hidden
   - "Use This Template" button becomes disabled with warning

**Expected Outcome:**
- Template is marked as inactive
- Template no longer available for new promotions
- Visual indicators reflect inactive state
- Admin receives confirmation

**Error Scenarios:**
- Template not found (404) → Show toast error, close modal
- Server error (500) → Show toast error, keep modal open for retry
- Network error → Show toast error, keep modal open for retry
- Template already inactive → Should not reach this point (button hidden)

---

#### Flow 5: Navigate Back to Templates List

**Trigger:** User clicks breadcrumb link

**Steps:**
1. User clicks "Promotion Templates" link in breadcrumb navigation
2. System navigates to `/promotion-templates`
3. Templates list view loads
4. User sees all templates (with any filters they previously applied)

**Expected Outcome:**
- User returns to templates list
- Navigation is instant (standard browser navigation)
- List view state is preserved if user returns with browser back button

**Note:** URL query parameters are not preserved when navigating back. User will see default filtered view (active templates only).

---

### Interaction Details

**Clickable Elements:**
- Breadcrumb links (Home, Promotion Templates)
- Edit button (admin only, visible only when active)
- Deactivate button (admin only, visible only when active)
- Use This Template button (disabled when inactive)
- Modal action buttons (Cancel, Save, Confirm)

**Hover States:**
- All buttons show hover effects (darkening/lightening based on theme)
- Breadcrumb links show underline on hover
- Inactive "Use This Template" button shows tooltip on hover

**Focus States:**
- All interactive elements have visible focus indicators for keyboard navigation
- Modal focus is trapped within modal when open
- First focusable element in modal receives focus on open

**Loading States:**
- Edit/Deactivate buttons show spinner when loading
- "Use This Template" button shows spinner during navigation (if navigation takes time)
- Disabled state applied to buttons during loading

**Keyboard Navigation:**
- Tab/Shift+Tab to navigate between elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for form field navigation (handled by browser)

## 9. Conditions and Validation

### Component-Level Validation

#### TemplateDetailPage.astro (Server-Side)

**Condition 1: Valid UUID Format**
- **What:** Template ID parameter must be a valid UUID
- **When:** On every page load, before API call
- **How:** Use Zod schema validation: `z.string().uuid()`
- **Effect on UI:**
  - Invalid → Show 400 error page "Invalid template ID format"
  - Valid → Proceed with API call
- **Implementation:**
```typescript
const uuidSchema = z.string().uuid();
const validation = uuidSchema.safeParse(id);
if (!validation.success) {
  // Render 400 error page
}
```

**Condition 2: User Authentication**
- **What:** User must be authenticated to view template
- **When:** On every page load (production mode only, currently disabled)
- **How:** Check Supabase auth session
- **Effect on UI:**
  - Not authenticated → Redirect to `/login`
  - Authenticated → Load template data
- **Implementation:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return Astro.redirect('/login');
}
```

**Condition 3: Template Exists**
- **What:** Template with given ID must exist in database
- **When:** After API call returns
- **How:** Check API response status
- **Effect on UI:**
  - 404 response → Show "Template not found" error page
  - 200 response → Render detail view
- **Implementation:**
```typescript
if (response.status === 404) {
  // Render 404 error page
}
```

---

#### TemplateDetailView (Client-Side)

**Condition 1: Admin Status for Edit/Deactivate**
- **What:** User must have admin role to see edit and deactivate buttons
- **When:** On component render
- **How:** Check `isAdmin` prop
- **Effect on UI:**
  - `isAdmin === false` → Hide Edit and Deactivate buttons completely
  - `isAdmin === true` → Show both buttons (subject to other conditions)
- **Implementation:**
```typescript
{isAdmin && (
  <div className="flex gap-2">
    <Button onClick={handleEditClick}>Edit</Button>
    {template.is_active && (
      <Button onClick={handleDeactivateClick}>Deactivate</Button>
    )}
  </div>
)}
```

**Condition 2: Template Active for Deactivate Button**
- **What:** Deactivate button only shown if template is currently active
- **When:** On component render and after template state updates
- **How:** Check `template.is_active`
- **Effect on UI:**
  - `is_active === false` → Hide Deactivate button
  - `is_active === true` → Show Deactivate button (if admin)
- **Implementation:**
```typescript
{isAdmin && template.is_active && (
  <Button onClick={handleDeactivateClick}>Deactivate</Button>
)}
```

**Condition 3: Template Active for Use Button**
- **What:** "Use This Template" button only enabled if template is active
- **When:** On component render and after template state updates
- **How:** Check `template.is_active`
- **Effect on UI:**
  - `is_active === false`:
    - Button disabled
    - Warning alert shown: "This template has been deactivated"
    - Tooltip on button: "Cannot use inactive template"
  - `is_active === true`:
    - Button enabled
    - No warning shown
- **Implementation:**
```typescript
<Button
  onClick={handleUseTemplate}
  disabled={!template.is_active}
  title={!template.is_active ? "Cannot use inactive template" : undefined}
>
  Use This Template
</Button>
{!template.is_active && (
  <Alert variant="destructive">
    This template has been deactivated and cannot be used for new promotions.
  </Alert>
)}
```

---

#### TemplateDetailHeader

**Condition 1: Admin Buttons Visibility**
- **What:** Edit and Deactivate buttons only visible to admins
- **When:** On component render
- **How:** Check `isAdmin` prop
- **Effect on UI:**
  - Non-admin → No action buttons shown
  - Admin → Show Edit button, conditionally show Deactivate button
- **Implementation:**
```typescript
{isAdmin && (
  <>
    <Button onClick={onEditClick}>Edit</Button>
    {isActive && <Button onClick={onDeactivateClick}>Deactivate</Button>}
  </>
)}
```

**Condition 2: Inactive Badge Visibility**
- **What:** "Inactive" status badge only shown if template is inactive
- **When:** On component render
- **How:** Check `isActive` prop
- **Effect on UI:**
  - Active → No status badge
  - Inactive → Red "Inactive" badge shown next to template name
- **Implementation:**
```typescript
{!isActive && (
  <Badge variant="destructive">Inactive</Badge>
)}
```

---

#### UseTemplateCard

**Condition 1: Button Enabled State**
- **What:** Button only enabled if template is active
- **When:** On component render
- **How:** Check `isActive` prop
- **Effect on UI:**
  - Active → Button clickable, primary styling
  - Inactive → Button disabled, muted styling, tooltip shown
- **Implementation:**
```typescript
<Button
  onClick={onUseTemplate}
  disabled={!isActive}
>
  Use This Template
</Button>
```

**Condition 2: Warning Alert Visibility**
- **What:** Warning about inactive template only shown if template is inactive
- **When:** On component render
- **How:** Check `isActive` prop
- **Effect on UI:**
  - Active → No alert shown
  - Inactive → Destructive alert shown explaining why template can't be used
- **Implementation:**
```typescript
{!isActive && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      This template has been deactivated and cannot be used for new promotions.
    </AlertDescription>
  </Alert>
)}
```

---

#### TemplateFormModal (Reused - Validation)

**Condition 1: Name Field**
- **What:** Template name must be provided and within length limits
- **When:** On form blur and submission
- **How:** Validate input length
- **Effect on UI:**
  - Empty → Error message "Name is required"
  - > 200 chars → Error message "Name must be 200 characters or less"
  - Valid → No error, field border normal
- **Validation:**
```typescript
if (!formData.name.trim()) {
  errors.name = "Name is required";
} else if (formData.name.length > 200) {
  errors.name = "Name must be 200 characters or less";
}
```

**Condition 2: Rules Array**
- **What:** Template must have at least one badge requirement rule
- **When:** On form submission
- **How:** Check rules array length
- **Effect on UI:**
  - Empty array → Error message "At least one rule is required"
  - Has rules → No error, proceed with submission
- **Validation:**
```typescript
if (formData.rules.length === 0) {
  errors.rules = "At least one rule is required";
}
```

**Condition 3: Each Rule Validity**
- **What:** Each rule must have valid category, level, and count > 0
- **When:** When adding/modifying rules
- **How:** Validate before adding to rules array
- **Effect on UI:**
  - Invalid → Prevent adding rule, show error toast
  - Valid → Add rule to list
- **Validation:**
```typescript
if (newRule.count < 1) {
  toast.error("Count must be at least 1");
  return;
}
// Category and level validated by select dropdowns (can't be invalid)
```

---

### Validation Summary Table

| Component | Condition | Check | UI Effect |
|-----------|-----------|-------|-----------|
| TemplateDetailPage | Valid UUID | `z.string().uuid()` | 400 error page if invalid |
| TemplateDetailPage | User authenticated | `supabase.auth.getUser()` | Redirect to login if not |
| TemplateDetailPage | Template exists | API response status | 404 page if not found |
| TemplateDetailView | Is admin | `isAdmin === true` | Hide admin buttons if false |
| TemplateDetailView | Template active | `template.is_active` | Disable use button if false |
| TemplateDetailHeader | Is admin | `isAdmin === true` | Hide Edit/Deactivate if false |
| TemplateDetailHeader | Template active | `isActive === true` | Hide Deactivate button if false |
| UseTemplateCard | Template active | `isActive === true` | Disable button, show warning if false |
| TemplateFormModal | Name not empty | `name.trim().length > 0` | Error message if empty |
| TemplateFormModal | Name length | `name.length <= 200` | Error message if too long |
| TemplateFormModal | Rules exist | `rules.length >= 1` | Error message if none |
| TemplateFormModal | Rule count | `count >= 1` | Prevent adding if invalid |

## 10. Error Handling

### Error Categories

The Template Detail view must handle five main categories of errors:
1. **Route-level errors** (invalid ID, not found)
2. **Authentication errors** (not logged in, session expired)
3. **Authorization errors** (not admin when trying admin actions)
4. **Network errors** (API unreachable, timeout)
5. **Application errors** (validation failures, server errors)

---

### Server-Side Error Handling (TemplateDetailPage.astro)

#### Error 1: Invalid Template ID Format

**Scenario:** User navigates to URL with malformed UUID (e.g., `/promotion-templates/invalid-id`)

**Detection:** Zod validation fails on UUID format

**Handler:**
```typescript
const uuidSchema = z.string().uuid();
const validation = uuidSchema.safeParse(id);

if (!validation.success) {
  // Render 400 error page
  return {
    status: 400,
    body: ErrorPage({
      code: 400,
      title: "Invalid Template ID",
      message: "The template ID format is invalid. Please check the URL and try again.",
      action: { label: "Back to Templates", href: "/promotion-templates" }
    })
  };
}
```

**User Experience:**
- Show error page with clear explanation
- Provide link back to templates list
- Log error for debugging

**Prevention:** Validate IDs client-side before navigation where possible

---

#### Error 2: Template Not Found (404)

**Scenario:** User requests template that doesn't exist or has been deleted

**Detection:** API returns 404 status

**Handler:**
```typescript
if (response.status === 404) {
  // Render 404 error page
  return {
    status: 404,
    body: ErrorPage({
      code: 404,
      title: "Template Not Found",
      message: "The promotion template you're looking for doesn't exist or has been removed.",
      action: { label: "Browse Templates", href: "/promotion-templates" }
    })
  };
}
```

**User Experience:**
- Clear 404 error page
- Friendly message explaining the issue
- Link to templates list to continue browsing

**Prevention:** None (user might have old bookmarks or links)

---

#### Error 3: Unauthorized (401)

**Scenario:** User not authenticated or session expired

**Detection:** API returns 401 or auth check fails

**Handler:**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return Astro.redirect('/login?redirect=/promotion-templates/' + id);
}
```

**User Experience:**
- Redirect to login page
- Preserve intended destination in redirect parameter
- After login, return to template detail page

**Prevention:** Implement session monitoring, show warning before expiration

---

#### Error 4: Server Error (500)

**Scenario:** Unexpected error on server (database down, code error, etc.)

**Detection:** API returns 500 status or throws exception

**Handler:**
```typescript
try {
  const response = await fetch(apiUrl);

  if (response.status === 500) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.message);
  }

  // Process successful response
} catch (error) {
  console.error('Error fetching template:', error);

  return {
    status: 500,
    body: ErrorPage({
      code: 500,
      title: "Server Error",
      message: "We're experiencing technical difficulties. Please try again in a moment.",
      action: {
        label: "Retry",
        href: `/promotion-templates/${id}`,
        onClick: () => location.reload()
      }
    })
  };
}
```

**User Experience:**
- Error page with retry option
- Generic message (don't expose technical details)
- Reload button to try again

**Prevention:** Server monitoring, graceful degradation

---

#### Error 5: Network Error

**Scenario:** Client cannot reach server (offline, DNS issues, etc.)

**Detection:** Fetch throws exception, no response received

**Handler:**
```typescript
try {
  const response = await fetch(apiUrl);
  // ...
} catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      status: 503,
      body: ErrorPage({
        code: 503,
        title: "Connection Error",
        message: "Unable to connect to the server. Please check your internet connection and try again.",
        action: {
          label: "Retry",
          href: `/promotion-templates/${id}`,
          onClick: () => location.reload()
        }
      })
    };
  }
  // Handle other errors
}
```

**User Experience:**
- Clear message about network issue
- Retry button
- Suggest checking internet connection

**Prevention:** Show online/offline indicator, queue actions when offline

---

### Client-Side Error Handling (React Components)

#### Error 6: Edit Template Failure

**Scenario:** Admin tries to update template but API call fails

**Detection:** PUT request returns non-200 status or network error

**Handler:**
```typescript
const handleEditSubmit = async (data: TemplateFormData) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/promotion-templates/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();

      // Handle specific error types
      if (response.status === 404) {
        toast.error('Template not found. It may have been deleted.');
        setIsEditModalOpen(false);
        // Optionally navigate back to list
        return;
      }

      if (response.status === 400 && errorData.details) {
        // Show validation errors inline in form
        setFormErrors(errorData.details);
        toast.error('Please fix validation errors');
        return;
      }

      throw new Error(errorData.message || 'Failed to update template');
    }

    // Success handling
    const updatedTemplate = await response.json();
    setTemplate(updatedTemplate);
    toast.success('Template updated successfully');
    setIsEditModalOpen(false);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    toast.error(message);
    // Keep modal open so user can retry
  } finally {
    setIsLoading(false);
  }
};
```

**User Experience:**
- Validation errors → Show inline in form, highlight fields
- Not found → Close modal, show toast, optionally navigate away
- Server error → Show toast, keep modal open for retry
- Network error → Show toast, keep modal open

**Recovery:** User can correct validation errors or retry on failure

---

#### Error 7: Deactivate Template Failure

**Scenario:** Admin tries to deactivate template but API call fails

**Detection:** DELETE request returns non-200 status or network error

**Handler:**
```typescript
const handleDeactivateConfirm = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/promotion-templates/${template.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();

      if (response.status === 404) {
        toast.error('Template not found. It may have been deleted.');
        setIsDeactivateModalOpen(false);
        return;
      }

      throw new Error(errorData.message || 'Failed to deactivate template');
    }

    // Update template state
    setTemplate(prev => ({
      ...prev,
      is_active: false,
      deactivated_at: new Date().toISOString(),
    }));

    toast.success('Template deactivated successfully');
    setIsDeactivateModalOpen(false);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate template';
    toast.error(message);
    // Keep modal open for retry
  } finally {
    setIsLoading(false);
  }
};
```

**User Experience:**
- Not found → Close modal, show toast
- Server error → Show toast, keep modal open for retry
- Network error → Show toast, keep modal open

**Recovery:** User can retry from modal

---

#### Error 8: Concurrent Modification

**Scenario:** Template is modified by another admin while current admin is viewing/editing

**Detection:**
- Optimistic: Check `updated_at` timestamp on refetch
- Pessimistic: Server returns 409 Conflict (if implemented)

**Handler:**
```typescript
const handleEditSubmit = async (data: TemplateFormData) => {
  // ... API call ...

  const updatedTemplate = await response.json();

  // Check if template was modified since we loaded it
  if (updatedTemplate.updated_at !== template.updated_at) {
    toast.warning('This template was modified by another user. Your changes have been applied to the latest version.');
  }

  setTemplate(updatedTemplate);
  setIsEditModalOpen(false);
};
```

**User Experience:**
- Show warning toast about concurrent modification
- Apply changes to latest version
- Consider showing diff of what changed (future enhancement)

**Prevention:**
- Refresh data periodically
- Implement optimistic locking with version numbers
- Show "last updated" timestamp prominently

---

#### Error 9: Validation Errors in Form

**Scenario:** User submits invalid data in edit modal

**Detection:** Client-side validation or API returns 400 with validation details

**Handler:**
```typescript
// Client-side validation (before API call)
const validateForm = (data: TemplateFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length > 200) {
    errors.name = 'Name must be 200 characters or less';
  }

  if (data.rules.length === 0) {
    errors.rules = 'At least one rule is required';
  }

  return errors;
};

const handleEditSubmit = async (data: TemplateFormData) => {
  // Validate client-side first
  const clientErrors = validateForm(data);
  if (Object.keys(clientErrors).length > 0) {
    setFormErrors(clientErrors);
    toast.error('Please fix validation errors');
    return;
  }

  // ... API call ...

  // Handle server-side validation errors
  if (response.status === 400 && errorData.details) {
    const serverErrors: ValidationErrors = {};
    errorData.details.forEach(detail => {
      serverErrors[detail.field] = detail.message;
    });
    setFormErrors(serverErrors);
    toast.error('Please fix validation errors');
    return;
  }
};
```

**User Experience:**
- Errors shown inline next to problematic fields
- Error border/styling on invalid fields
- Toast message summarizing issue
- Focus moves to first invalid field

**Prevention:**
- Real-time validation on blur
- Character counters for text inputs
- Disabled submit button until form valid

---

#### Error 10: Use Template When Promotions Not Implemented

**Scenario:** User clicks "Use This Template" but promotions feature doesn't exist yet

**Detection:** Navigation target doesn't exist or feature flag disabled

**Handler:**
```typescript
const handleUseTemplate = () => {
  // Check if promotions feature is available
  const PROMOTIONS_ENABLED = false; // Feature flag

  if (!PROMOTIONS_ENABLED) {
    toast.info('Promotions feature coming soon! Check back later.');
    return;
  }

  // Navigate to promotions builder
  window.location.href = `/promotions/new?template_id=${template.id}`;
};
```

**User Experience:**
- Info toast with friendly message
- User stays on current page
- Button still enabled (not an error)

**Prevention:** Hide button if feature not available, or show "Coming Soon" badge

---

### Error Handling Patterns

**Toast Notifications:**
- **Success:** Green, checkmark icon, auto-dismiss after 3 seconds
- **Error:** Red, X icon, manual dismiss (stays until user clicks)
- **Warning:** Yellow, warning icon, auto-dismiss after 5 seconds
- **Info:** Blue, info icon, auto-dismiss after 4 seconds

**Error Pages:**
- Consistent layout with error code, title, message, and action button
- Maintain global navigation (don't break out of app context)
- Provide clear path forward (link to list, retry button, etc.)
- Log errors server-side for monitoring

**Modal Errors:**
- Keep modal open on error (allow retry)
- Show error message within modal (toast + inline)
- Disable submit button during loading
- Clear errors when user edits fields

**Loading States:**
- Disable interactive elements during async operations
- Show spinner on buttons during loading
- Prevent double-submission
- Timeout long-running operations (>30 seconds)

### Error Logging

All errors should be logged for monitoring:

**Client-side:**
```typescript
console.error('Template detail error:', error);
// Optional: Send to error tracking service (Sentry, etc.)
```

**Server-side:**
```typescript
console.error('API error:', error);
await logError(supabase, {
  route: '/api/promotion-templates/:id',
  error_code: 'template_fetch_failed',
  message: error.message,
  payload: { templateId: id },
  requester_id: user?.id || null,
});
```

## 11. Implementation Steps

### Phase 1: Foundation (Steps 1-3)

#### Step 1: Add New Type Definitions

**File:** `src/types.ts`

**Actions:**
1. Open `src/types.ts`
2. Navigate to end of file
3. Add new section comment: `// Promotion Templates Detail View Types`
4. Add the following interface definitions:
   ```typescript
   /**
    * Props for TemplateDetailView component
    */
   export interface TemplateDetailViewProps {
     initialTemplate: PromotionTemplateDetailDto;
     isAdmin: boolean;
     userId: string;
   }

   /**
    * Props for TemplateDetailHeader component
    */
   export interface TemplateDetailHeaderProps {
     templateName: string;
     isAdmin: boolean;
     isActive: boolean;
     onEditClick: () => void;
     onDeactivateClick: () => void;
   }

   /**
    * Props for TemplateOverviewCard component
    */
   export interface TemplateOverviewCardProps {
     template: PromotionTemplateDetailDto;
   }

   /**
    * Props for TemplateRulesDetailCard component
    */
   export interface TemplateRulesDetailCardProps {
     rules: PromotionTemplateRule[];
   }

   /**
    * Props for UseTemplateCard component
    */
   export interface UseTemplateCardProps {
     templateId: string;
     templateName: string;
     templatePath: PromotionPathType;
     fromLevel: string;
     toLevel: string;
     rulesCount: number;
     isActive: boolean;
     onUseTemplate: () => void;
   }
   ```
5. Save file
6. Run `pnpm lint` to verify no TypeScript errors

**Verification:**
- All interfaces compile without errors
- Types are exported and available for import

---

#### Step 2: Create Astro Page Component

**File:** `src/pages/promotion-templates/[id].astro`

**Actions:**
1. Create new file `src/pages/promotion-templates/[id].astro`
2. Add frontmatter with imports and server-side logic:
   ```astro
   ---
   import Layout from "@/layouts/Layout.astro";
   import { TemplateDetailView } from "@/components/promotion-templates/TemplateDetailView";
   import type { PromotionTemplateDetailDto, ApiError } from "@/types";
   import { z } from "zod";

   // =========================================================================
   // DEVELOPMENT MODE: Authentication Disabled
   // =========================================================================
   const userId = "550e8400-e29b-41d4-a716-446655440100";
   const isAdmin = false;

   // =========================================================================
   // Validate Route Parameter
   // =========================================================================
   const uuidSchema = z.string().uuid();
   const { id } = Astro.params;

   const validation = uuidSchema.safeParse(id);
   if (!validation.success) {
     return Astro.redirect('/404?reason=invalid-id');
   }

   // =========================================================================
   // Fetch Template Data
   // =========================================================================
   const baseUrl = Astro.url.origin;
   const apiUrl = `${baseUrl}/api/promotion-templates/${id}`;

   let template: PromotionTemplateDetailDto | null = null;
   let error: string | null = null;

   try {
     const response = await fetch(apiUrl, {
       headers: {
         Cookie: Astro.request.headers.get("Cookie") || "",
       },
     });

     if (!response.ok) {
       if (response.status === 404) {
         return Astro.redirect('/404?reason=template-not-found');
       }
       const errorData: ApiError = await response.json();
       error = errorData.message || "Failed to load template";
     } else {
       template = await response.json();
     }
   } catch (err) {
     console.error("Error fetching template:", err);
     error = "An unexpected error occurred while loading the template";
   }

   // =========================================================================
   // Handle Errors
   // =========================================================================
   if (error || !template) {
     // Render error page
     return Astro.redirect('/500?reason=fetch-error');
   }
   ---
   ```
3. Add HTML template:
   ```astro
   <Layout title={`${template.name} | Promotion Templates | Badger`}>
     <main class="min-h-screen bg-background">
       <TemplateDetailView
         client:load
         initialTemplate={template}
         userId={userId}
         isAdmin={isAdmin}
       />
     </main>
   </Layout>
   ```
4. Save file

**Verification:**
- Navigate to `/promotion-templates/[valid-uuid]` and verify page loads
- Navigate to `/promotion-templates/invalid-id` and verify redirect to 404
- Navigate to `/promotion-templates/00000000-0000-0000-0000-000000000000` and verify 404 handling

---

#### Step 3: Create Main View Component Scaffolding

**File:** `src/components/promotion-templates/TemplateDetailView.tsx`

**Actions:**
1. Create new file `src/components/promotion-templates/TemplateDetailView.tsx`
2. Add imports and component structure:
   ```typescript
   import { useState } from "react";
   import { toast } from "sonner";
   import type {
     TemplateDetailViewProps,
     PromotionTemplateDetailDto,
     TemplateFormData,
     ApiError,
   } from "@/types";

   export function TemplateDetailView(props: TemplateDetailViewProps) {
     const { initialTemplate, isAdmin } = props;

     // State
     const [template, setTemplate] = useState<PromotionTemplateDetailDto>(initialTemplate);
     const [isEditModalOpen, setIsEditModalOpen] = useState(false);
     const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
     const [isLoading, setIsLoading] = useState(false);

     // Event handlers (stubs for now)
     const handleEditClick = () => setIsEditModalOpen(true);
     const handleDeactivateClick = () => setIsDeactivateModalOpen(true);
     const handleEditModalClose = () => setIsEditModalOpen(false);
     const handleDeactivateModalClose = () => setIsDeactivateModalOpen(false);

     const handleUseTemplate = () => {
       toast.info('Promotions feature coming soon!');
     };

     const handleEditSubmit = async (data: TemplateFormData) => {
       // TODO: Implement in Phase 3
       console.log('Edit submit:', data);
     };

     const handleDeactivateConfirm = async () => {
       // TODO: Implement in Phase 3
       console.log('Deactivate confirm');
     };

     // Render
     return (
       <div className="container mx-auto px-4 py-8 space-y-6">
         {/* TODO: Add child components in Phase 2 */}
         <div className="rounded-lg border border-border bg-card p-6">
           <h1 className="text-2xl font-bold mb-4">{template.name}</h1>
           <pre className="text-xs">{JSON.stringify(template, null, 2)}</pre>
         </div>
       </div>
     );
   }
   ```
3. Save file
4. Run `pnpm lint` to check for errors

**Verification:**
- Component renders with template data
- No TypeScript errors
- Page displays template name and JSON data

---

### Phase 2: UI Components (Steps 4-8)

#### Step 4: Create TemplateDetailHeader Component

**File:** `src/components/promotion-templates/TemplateDetailHeader.tsx`

**Actions:**
1. Create file `src/components/promotion-templates/TemplateDetailHeader.tsx`
2. Implement component:
   ```typescript
   import { Button } from "@/components/ui/button";
   import { Badge } from "@/components/ui/badge";
   import { Pencil, Trash2 } from "lucide-react";
   import type { TemplateDetailHeaderProps } from "@/types";

   export function TemplateDetailHeader({
     templateName,
     isAdmin,
     isActive,
     onEditClick,
     onDeactivateClick,
   }: TemplateDetailHeaderProps) {
     return (
       <div className="space-y-4">
         {/* Breadcrumb */}
         <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
           <a href="/" className="hover:text-foreground transition-colors">Home</a>
           <span>/</span>
           <a href="/promotion-templates" className="hover:text-foreground transition-colors">
             Promotion Templates
           </a>
           <span>/</span>
           <span className="text-foreground" aria-current="page">{templateName}</span>
         </nav>

         {/* Header with title and actions */}
         <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
           <div className="flex-1 flex items-center gap-3 flex-wrap">
             <h1 className="text-3xl font-bold text-foreground">{templateName}</h1>
             {!isActive && (
               <Badge variant="destructive">Inactive</Badge>
             )}
           </div>

           {/* Admin Actions */}
           {isAdmin && (
             <div className="flex gap-2 shrink-0">
               <Button
                 variant="outline"
                 size="default"
                 onClick={onEditClick}
               >
                 <Pencil className="h-4 w-4 mr-2" />
                 Edit
               </Button>
               {isActive && (
                 <Button
                   variant="destructive"
                   size="default"
                   onClick={onDeactivateClick}
                 >
                   <Trash2 className="h-4 w-4 mr-2" />
                   Deactivate
                 </Button>
               )}
             </div>
           )}
         </div>
       </div>
     );
   }
   ```
3. Save file and lint

**Verification:**
- Breadcrumb navigation works
- Admin buttons visible only when `isAdmin={true}`
- Deactivate button hidden when `isActive={false}`
- Inactive badge shows when `isActive={false}`

---

#### Step 5: Create TemplateOverviewCard Component

**File:** `src/components/promotion-templates/TemplateOverviewCard.tsx`

**Actions:**
1. Create file `src/components/promotion-templates/TemplateOverviewCard.tsx`
2. Implement component:
   ```typescript
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
   import { Badge } from "@/components/ui/badge";
   import { ArrowRight } from "lucide-react";
   import type { TemplateOverviewCardProps } from "@/types";

   export function TemplateOverviewCard({ template }: TemplateOverviewCardProps) {
     // Format dates
     const formatDate = (dateString: string | null) => {
       if (!dateString) return null;
       return new Date(dateString).toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
       });
     };

     // Path color mapping
     const getPathBadgeColor = (path: string) => {
       switch (path) {
         case 'technical':
           return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
         case 'financial':
           return 'bg-green-500/10 text-green-700 dark:text-green-400';
         case 'management':
           return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
         default:
           return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
       }
     };

     return (
       <Card>
         <CardHeader>
           <CardTitle>Template Information</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Status */}
           <div className="flex flex-col gap-1">
             <span className="text-sm font-medium text-muted-foreground">Status</span>
             <div>
               <Badge variant={template.is_active ? "default" : "destructive"}>
                 {template.is_active ? "Active" : "Inactive"}
               </Badge>
             </div>
           </div>

           {/* Career Path */}
           <div className="flex flex-col gap-1">
             <span className="text-sm font-medium text-muted-foreground">Career Path</span>
             <div>
               <Badge className={getPathBadgeColor(template.path)}>
                 {template.path.charAt(0).toUpperCase() + template.path.slice(1)}
               </Badge>
             </div>
           </div>

           {/* Level Progression */}
           <div className="flex flex-col gap-1">
             <span className="text-sm font-medium text-muted-foreground">Level Progression</span>
             <div className="flex items-center gap-2 text-base font-medium text-foreground">
               <span>{template.from_level}</span>
               <ArrowRight className="h-4 w-4 text-muted-foreground" />
               <span>{template.to_level}</span>
             </div>
           </div>

           {/* Created Date */}
           <div className="flex flex-col gap-1">
             <span className="text-sm font-medium text-muted-foreground">Created</span>
             <span className="text-base font-medium text-foreground">
               {formatDate(template.created_at)}
             </span>
           </div>

           {/* Updated Date (if exists) */}
           {template.updated_at && (
             <div className="flex flex-col gap-1">
               <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
               <span className="text-base font-medium text-foreground">
                 {formatDate(template.updated_at)}
               </span>
             </div>
           )}

           {/* Deactivated Date (if inactive) */}
           {template.deactivated_at && (
             <div className="flex flex-col gap-1">
               <span className="text-sm font-medium text-muted-foreground">Deactivated</span>
               <span className="text-base font-medium text-destructive">
                 {formatDate(template.deactivated_at)}
               </span>
             </div>
           )}
         </CardContent>
       </Card>
     );
   }
   ```
3. Save and lint

**Verification:**
- Card displays all metadata correctly
- Dates formatted properly
- Path badge has correct color
- Status badge changes based on `is_active`
- Conditional fields (updated_at, deactivated_at) only show when present

---

#### Step 6: Create TemplateRulesDetailCard Component

**File:** `src/components/promotion-templates/TemplateRulesDetailCard.tsx`

**Actions:**
1. Create file `src/components/promotion-templates/TemplateRulesDetailCard.tsx`
2. Implement component (reuses RulesList from list view):
   ```typescript
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
   import { RulesList } from "./RulesList";
   import type { TemplateRulesDetailCardProps } from "@/types";

   export function TemplateRulesDetailCard({ rules }: TemplateRulesDetailCardProps) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>Badge Requirements</CardTitle>
           <CardDescription>
             The following badges are required to use this template for a promotion submission:
           </CardDescription>
         </CardHeader>
         <CardContent>
           <RulesList rules={rules} isCompact={false} />
         </CardContent>
       </Card>
     );
   }
   ```
3. Save and lint

**Verification:**
- Rules display in detailed (non-compact) mode
- Each rule shows quantity, category, and level with proper badges
- Empty state handled by RulesList component

---

#### Step 7: Create UseTemplateCard Component

**File:** `src/components/promotion-templates/UseTemplateCard.tsx`

**Actions:**
1. Create file `src/components/promotion-templates/UseTemplateCard.tsx`
2. Implement component:
   ```typescript
   import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
   import { Button } from "@/components/ui/button";
   import { Alert, AlertDescription } from "@/components/ui/alert";
   import { Rocket, AlertTriangle } from "lucide-react";
   import type { UseTemplateCardProps } from "@/types";

   export function UseTemplateCard({
     templateId,
     templateName,
     templatePath,
     fromLevel,
     toLevel,
     rulesCount,
     isActive,
     onUseTemplate,
   }: UseTemplateCardProps) {
     // Format path name
     const formatPath = (path: string) => {
       return path.charAt(0).toUpperCase() + path.slice(1);
     };

     return (
       <Card className="lg:sticky lg:top-6">
         <CardHeader>
           <CardTitle>Ready to Apply for Promotion?</CardTitle>
           <CardDescription>
             Use this template to start building your promotion submission.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Requirements Summary */}
           <div className="space-y-2">
             <h3 className="text-sm font-medium text-foreground">This template includes:</h3>
             <ul className="space-y-1 text-sm text-muted-foreground">
               <li>• {formatPath(templatePath)} career track</li>
               <li>• Promotion from {fromLevel} to {toLevel}</li>
               <li>• {rulesCount} badge {rulesCount === 1 ? 'requirement' : 'requirements'} to fulfill</li>
             </ul>
           </div>

           {/* Inactive Warning */}
           {!isActive && (
             <Alert variant="destructive">
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>
                 This template has been deactivated and cannot be used for new promotions.
               </AlertDescription>
             </Alert>
           )}

           {/* Helper Text */}
           <p className="text-xs text-muted-foreground">
             You'll be able to select specific badges and review before submitting.
           </p>
         </CardContent>
         <CardFooter>
           <Button
             onClick={onUseTemplate}
             disabled={!isActive}
             className="w-full"
             size="lg"
           >
             <Rocket className="h-4 w-4 mr-2" />
             Use This Template
           </Button>
         </CardFooter>
       </Card>
     );
   }
   ```
3. Save and lint

**Verification:**
- Card displays summary information correctly
- Button disabled when `isActive={false}`
- Warning alert shows when inactive
- Button triggers callback when clicked
- Sticky positioning works on desktop

---

#### Step 8: Integrate Components into TemplateDetailView

**File:** `src/components/promotion-templates/TemplateDetailView.tsx`

**Actions:**
1. Update imports:
   ```typescript
   import { TemplateDetailHeader } from "./TemplateDetailHeader";
   import { TemplateOverviewCard } from "./TemplateOverviewCard";
   import { TemplateRulesDetailCard } from "./TemplateRulesDetailCard";
   import { UseTemplateCard } from "./UseTemplateCard";
   ```
2. Replace placeholder render with actual layout:
   ```typescript
   return (
     <div className="container mx-auto px-4 py-8 space-y-6">
       {/* Header */}
       <TemplateDetailHeader
         templateName={template.name}
         isAdmin={isAdmin}
         isActive={template.is_active}
         onEditClick={handleEditClick}
         onDeactivateClick={handleDeactivateClick}
       />

       {/* Content Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left Column - Main Content */}
         <div className="lg:col-span-2 space-y-6">
           <TemplateOverviewCard template={template} />
           <TemplateRulesDetailCard rules={template.rules} />
         </div>

         {/* Right Column - Sidebar */}
         <div className="lg:col-span-1">
           <UseTemplateCard
             templateId={template.id}
             templateName={template.name}
             templatePath={template.path}
             fromLevel={template.from_level}
             toLevel={template.to_level}
             rulesCount={template.rules.length}
             isActive={template.is_active}
             onUseTemplate={handleUseTemplate}
           />
         </div>
       </div>
     </div>
   );
   ```
3. Save and lint

**Verification:**
- All components render correctly
- Responsive layout works (stacked on mobile, 2-column on desktop)
- Sidebar sticks on desktop when scrolling
- All interactions work (buttons trigger correct handlers)

---

### Phase 3: Functionality (Steps 9-11)

#### Step 9: Implement Edit Template Functionality

**File:** `src/components/promotion-templates/TemplateDetailView.tsx`

**Actions:**
1. Import reusable modal:
   ```typescript
   import { TemplateFormModal } from "./TemplateFormModal";
   ```
2. Implement edit submit handler:
   ```typescript
   const handleEditSubmit = async (data: TemplateFormData) => {
     setIsLoading(true);
     try {
       const response = await fetch(`/api/promotion-templates/${template.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           name: data.name,
           rules: data.rules,
         }),
       });

       if (!response.ok) {
         const errorData: ApiError = await response.json();
         throw new Error(errorData.message || 'Failed to update template');
       }

       const updatedTemplate: PromotionTemplateDetailDto = await response.json();
       setTemplate(updatedTemplate);
       toast.success('Template updated successfully');
       setIsEditModalOpen(false);
     } catch (error) {
       const message = error instanceof Error ? error.message : 'Failed to update template';
       toast.error(message);
     } finally {
       setIsLoading(false);
     }
   };
   ```
3. Add modal to render:
   ```typescript
   <TemplateFormModal
     isOpen={isEditModalOpen}
     mode="edit"
     template={template}
     onClose={handleEditModalClose}
     onSubmit={handleEditSubmit}
   />
   ```
4. Save and test

**Verification:**
- Edit modal opens with current template data pre-filled
- Form validation works
- Successful update refreshes template data
- Success toast appears
- Error handling works (validation, 404, 500, network)

---

#### Step 10: Implement Deactivate Template Functionality

**File:** `src/components/promotion-templates/TemplateDetailView.tsx`

**Actions:**
1. Import reusable modal:
   ```typescript
   import { ConfirmDeactivateModal } from "./ConfirmDeactivateModal";
   ```
2. Implement deactivate confirm handler:
   ```typescript
   const handleDeactivateConfirm = async () => {
     setIsLoading(true);
     try {
       const response = await fetch(`/api/promotion-templates/${template.id}`, {
         method: 'DELETE',
       });

       if (!response.ok) {
         const errorData: ApiError = await response.json();
         throw new Error(errorData.message || 'Failed to deactivate template');
       }

       setTemplate(prev => ({
         ...prev,
         is_active: false,
         deactivated_at: new Date().toISOString(),
       }));

       toast.success('Template deactivated successfully');
       setIsDeactivateModalOpen(false);
     } catch (error) {
       const message = error instanceof Error ? error.message : 'Failed to deactivate template';
       toast.error(message);
     } finally {
       setIsLoading(false);
     }
   };
   ```
3. Add modal to render:
   ```typescript
   <ConfirmDeactivateModal
     isOpen={isDeactivateModalOpen}
     template={template}
     onConfirm={handleDeactivateConfirm}
     onCancel={handleDeactivateModalClose}
   />
   ```
4. Save and test

**Verification:**
- Confirmation modal opens with template name
- Confirm button triggers deactivation
- Template state updates to inactive
- Inactive badge appears in header
- Deactivate button hides
- Use Template button disables
- Success toast appears

---

#### Step 11: Implement Use Template Navigation

**File:** `src/components/promotion-templates/TemplateDetailView.tsx`

**Actions:**
1. Update `handleUseTemplate` function:
   ```typescript
   const handleUseTemplate = () => {
     // Feature flag check (optional)
     const PROMOTIONS_ENABLED = true; // Set to false if promotions not yet implemented

     if (!PROMOTIONS_ENABLED) {
       toast.info('Promotions feature coming soon! Check back later.');
       return;
     }

     // Navigate to promotions builder with template pre-selected
     window.location.href = `/promotions/new?template_id=${template.id}`;
   };
   ```
2. Save and test

**Verification:**
- Button click navigates to `/promotions/new?template_id={id}`
- Template ID passed in query string
- If feature flag disabled, info toast shows instead

---

### Phase 4: Polish & Testing (Steps 12-15)

#### Step 12: Add Loading States and Optimizations

**File:** `src/components/promotion-templates/TemplateDetailView.tsx`

**Actions:**
1. Use loading state to disable buttons during operations
2. Add aria-busy attributes for accessibility
3. Implement proper focus management for modals

**Verification:**
- Buttons disabled during async operations
- Loading spinners show on buttons
- Screen readers announce loading states
- Modal focus trapped correctly

---

#### Step 13: Test Responsive Design

**Actions:**
1. Test on mobile viewport (320px-768px):
   - Verify layout stacks vertically
   - Check touch targets are adequate size (min 44px)
   - Ensure text is readable
   - Verify buttons don't overflow
2. Test on tablet viewport (768px-1024px):
   - Verify layout switches to 2-column appropriately
   - Check spacing and alignment
3. Test on desktop viewport (1024px+):
   - Verify sidebar is sticky
   - Check max-width constraint on content
   - Ensure proper use of screen real estate

**Verification:**
- All breakpoints look good
- No horizontal scrolling
- Touch targets appropriate size
- Typography readable at all sizes

---

#### Step 14: Run Linting and Fix Errors

**Actions:**
1. Run `pnpm lint` from project root
2. Fix any ESLint errors reported
3. Run `pnpm format` to apply consistent formatting
4. Verify all TypeScript types are correct

**Verification:**
- Zero ESLint errors
- Zero TypeScript errors
- Code formatted consistently
- All imports resolve correctly

---

#### Step 15: Test Full User Flows

**Test Scenarios:**

1. **View Active Template (Non-Admin):**
   - Navigate to active template
   - Verify all info displays correctly
   - Verify "Use This Template" button is enabled
   - Verify no admin buttons visible
   - Click "Use This Template" and verify navigation

2. **View Inactive Template (Non-Admin):**
   - Navigate to inactive template
   - Verify "Inactive" badge shows
   - Verify warning alert shows in sidebar
   - Verify "Use This Template" button disabled
   - Verify no admin buttons visible

3. **Edit Template (Admin):**
   - Navigate to template as admin
   - Click "Edit" button
   - Modify template name and rules
   - Submit form
   - Verify success toast
   - Verify data updates in UI

4. **Deactivate Template (Admin):**
   - Navigate to active template as admin
   - Click "Deactivate" button
   - Confirm in modal
   - Verify success toast
   - Verify template shows as inactive
   - Verify "Use This Template" disabled

5. **Error Handling:**
   - Navigate to invalid UUID → Verify 404 redirect
   - Navigate to non-existent template → Verify 404 page
   - Try editing with network disconnected → Verify error toast
   - Try deactivating with server error → Verify error toast and retry

**Verification:**
- All flows complete successfully
- Error scenarios handled gracefully
- User feedback is clear and helpful
- No console errors or warnings

---

### Summary

**Total Steps:** 15 steps organized in 4 phases

**Estimated Time:**
- Phase 1 (Foundation): 1-2 hours
- Phase 2 (UI Components): 3-4 hours
- Phase 3 (Functionality): 2-3 hours
- Phase 4 (Polish & Testing): 1-2 hours
- **Total: 7-11 hours**

**Dependencies:**
- Requires completed templates list view (for reusable components)
- Requires API endpoints functional
- Requires shadcn/ui components installed
- Requires authentication (can be disabled for development)

**Testing Checklist:**
- [ ] Page loads with valid template ID
- [ ] 404 handling for invalid/missing templates
- [ ] Admin buttons visible only to admins
- [ ] Edit modal works correctly
- [ ] Deactivate modal works correctly
- [ ] Use Template navigation works
- [ ] Inactive templates handled correctly
- [ ] All error scenarios tested
- [ ] Responsive design verified
- [ ] Accessibility tested
- [ ] Linting passes
- [ ] No TypeScript errors
