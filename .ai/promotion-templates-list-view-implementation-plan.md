# View Implementation Plan: Promotion Templates List

## 1. Overview

The Promotion Templates List view displays a paginated, filterable, and sortable list of promotion templates. Promotion templates define the badge requirements needed for engineers to be eligible for promotion to specific position levels within different career paths (technical, financial, management). This view serves both standard users who need to understand promotion requirements and administrators who can create, edit, and deactivate templates.

**Key Features:**
- Browse all active promotion templates in a responsive grid layout
- Filter by career path, source level, target level, and active status
- Sort by name or creation date
- View detailed badge requirements (rules) for each template
- Admin capabilities: create new templates, edit existing ones, and deactivate obsolete templates
- Pagination support for large template catalogs
- Loading states and error handling

## 2. View Routing

**Primary Route:** `/promotion-templates`

**Example URLs:**
- `/promotion-templates` - Default view (active templates, sorted by name)
- `/promotion-templates?path=technical` - Filter by technical path
- `/promotion-templates?from_level=S1&to_level=S2` - Filter by level transition
- `/promotion-templates?is_active=false` - View deactivated templates
- `/promotion-templates?sort=created_at&order=desc` - Sort by newest first
- `/promotion-templates?offset=20&limit=10` - Pagination

**Navigation:**
- Accessible from main navigation menu
- Linked from promotion builder when selecting a template
- Linked from dashboard "Quick Actions" section

## 3. Component Structure

```
PromotionTemplatesPage.astro (SSR Entry Point)
└── PromotionTemplatesView (React Component, client:load)
    ├── TemplateListHeader
    │   ├── Page title and description
    │   └── Button "Create Template" (admin only)
    ├── TemplateFilterBar
    │   ├── Select (Path: technical/financial/management)
    │   ├── Input (From Level: e.g., S1, J2, M1)
    │   ├── Input (To Level: e.g., S2, J3, M2)
    │   ├── Switch (Active/Inactive toggle)
    │   ├── Select (Sort by: name/created_at)
    │   └── Select (Order: asc/desc)
    ├── TemplateGrid
    │   ├── Loading skeleton (6 placeholder cards)
    │   ├── TemplateCard (for each template)
    │   │   ├── Card header (template name, path badge, levels)
    │   │   ├── RulesList (badge requirements)
    │   │   ├── Metadata (created date, created by)
    │   │   └── Action buttons (Edit, Deactivate - admin only)
    │   └── TemplateEmptyState (when no templates match filters)
    ├── Pagination
    │   ├── Page info (showing X-Y of Z)
    │   ├── Previous/Next buttons
    │   └── Page size selector
    ├── TemplateFormModal (Create/Edit)
    │   ├── Modal header (title varies by mode)
    │   ├── Input (Template name)
    │   ├── Select (Career path)
    │   ├── Input (From level)
    │   ├── Input (To level)
    │   ├── RulesBuilder (dynamic array of rules)
    │   │   └── RuleInput (category, level, count) - repeatable
    │   └── Action buttons (Cancel, Save)
    └── ConfirmDeactivateModal
        ├── Warning message
        ├── Template name display
        └── Action buttons (Cancel, Confirm)
```

## 4. Component Details

### PromotionTemplatesPage.astro

**Component Description:**
Server-side rendered page component that serves as the entry point for the promotion templates list view. Handles initial data fetching, authentication checks, and hydrates the React view component with server-rendered data.

**Main Elements:**
- `Layout` wrapper with page metadata (title, description)
- Server-side authentication check (currently disabled for development)
- API call to `GET /api/promotion-templates` with default query parameters
- Error boundary for 401, 500, and network errors
- `PromotionTemplatesView` React component with `client:load` directive

**Handled Events:**
None (SSR component)

**Validation Conditions:**
- Validate user authentication (production mode)
- Check API response status (200 OK, 401 Unauthorized, 500 Server Error)
- Validate initial data structure matches `PaginatedResponse<PromotionTemplateListItemDto>`

**Types:**
- `PaginatedResponse<PromotionTemplateListItemDto>` - Initial data from API
- `ApiError` - Error responses

**Props:**
N/A (Top-level page component)

---

### PromotionTemplatesView

**Component Description:**
Main React orchestration component that manages the state of the templates list, handles filtering, sorting, pagination, and coordinates all user interactions. Delegates rendering to child components and manages modal states for create/edit/deactivate operations.

**Main Elements:**
- State management for templates, filters, sort options, pagination
- `TemplateListHeader` with admin-only create button
- `TemplateFilterBar` for filtering and sorting
- `TemplateGrid` displaying template cards
- `Pagination` component for navigating pages
- `TemplateFormModal` for create/edit operations
- `ConfirmDeactivateModal` for deactivation confirmation

**Handled Events:**
- Filter changes → Fetch filtered templates
- Sort changes → Fetch sorted templates
- Page navigation → Fetch next/previous page
- Create template → Open form modal in create mode
- Edit template → Open form modal in edit mode with pre-filled data
- Deactivate template → Open confirmation modal
- Form submit → POST or PUT API call
- Deactivate confirm → DELETE API call

**Validation Conditions:**
- Verify user is admin before showing admin actions
- Ensure pagination offset doesn't exceed total count
- Validate filter values match expected enums and formats

**Types:**
- `PromotionTemplatesViewProps` - Component interface
- `TemplateFilters` - Filter state object
- `TemplateSortOptions` - Sort configuration
- `PromotionTemplateListItemDto[]` - Templates array
- `PaginationMetadata` - Pagination info

**Props:**
```typescript
interface PromotionTemplatesViewProps {
  initialData: PaginatedResponse<PromotionTemplateListItemDto>;
  isAdmin: boolean;
  userId: string;
}
```

---

### TemplateListHeader

**Component Description:**
Header section displaying the page title, description, and admin-only "Create Template" button. Provides context about the promotion templates system and entry point for creating new templates.

**Main Elements:**
- Page title: "Promotion Templates"
- Description explaining promotion templates purpose
- "Create Template" button (visible only to admins)

**Handled Events:**
- Create button click → Trigger `onCreateClick` callback

**Validation Conditions:**
- Only render "Create Template" button if `isAdmin` is true

**Types:**
- `TemplateListHeaderProps` - Component interface

**Props:**
```typescript
interface TemplateListHeaderProps {
  isAdmin: boolean;
  onCreateClick: () => void;
}
```

---

### TemplateFilterBar

**Component Description:**
Filter and sort controls allowing users to narrow down the template list by path, levels, active status, and change sort order. Updates URL query parameters and triggers API calls when filters change.

**Main Elements:**
- Path select dropdown (technical, financial, management, or all)
- From level input field (e.g., "S1", "J2", "M1")
- To level input field (e.g., "S2", "J3", "M2")
- Active/Inactive switch (default: active only)
- Sort by select (name, created_at)
- Sort order select (asc, desc)
- Clear filters button

**Handled Events:**
- Path select change → Update filter and trigger `onFilterChange`
- From level input change → Debounced filter update
- To level input change → Debounced filter update
- Active toggle change → Immediate filter update
- Sort field change → Trigger `onSortChange`
- Sort order change → Trigger `onSortChange`
- Clear filters → Reset to defaults and trigger `onFilterChange`

**Validation Conditions:**
- Path must be one of: technical, financial, management (or empty for all)
- From level and to level are free-text (validated by backend)
- is_active must be boolean
- sort must be one of: name, created_at
- order must be one of: asc, desc

**Types:**
- `TemplateFilterBarProps` - Component interface
- `TemplateFilters` - Filter state
- `TemplateSortOptions` - Sort configuration

**Props:**
```typescript
interface TemplateFilterBarProps {
  filters: TemplateFilters;
  sortOptions: TemplateSortOptions;
  onFilterChange: (filters: TemplateFilters) => void;
  onSortChange: (sortOptions: TemplateSortOptions) => void;
}
```

---

### TemplateGrid

**Component Description:**
Responsive grid layout displaying template cards. Handles loading states with skeleton placeholders and empty states when no templates match the current filters.

**Main Elements:**
- Grid container (responsive: 1 column mobile, 2 columns tablet, 3 columns desktop)
- Loading skeleton (6 placeholder cards with animated pulse)
- Template cards (one per template)
- Empty state component when no templates found

**Handled Events:**
- Template card click → Navigate to template detail or trigger callback
- Template edit → Propagate to parent
- Template deactivate → Propagate to parent

**Validation Conditions:**
- Show loading state when `isLoading` is true
- Show empty state when `templates.length === 0` and not loading
- Show template cards when templates array has items

**Types:**
- `TemplateGridProps` - Component interface
- `PromotionTemplateListItemDto[]` - Templates array

**Props:**
```typescript
interface TemplateGridProps {
  templates: PromotionTemplateListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  onTemplateClick?: (id: string) => void;
  onEditClick: (template: PromotionTemplateListItemDto) => void;
  onDeactivateClick: (template: PromotionTemplateListItemDto) => void;
}
```

---

### TemplateCard

**Component Description:**
Individual card displaying a single promotion template with its name, path, level transition, badge requirements (rules), and admin action buttons. Provides a compact, scannable view of template details.

**Main Elements:**
- Card header with template name (large, bold)
- Path badge (color-coded: technical=blue, financial=green, management=purple)
- Level transition display (from_level → to_level)
- Rules list showing badge requirements
- Created date and created by metadata
- Action buttons (Edit, Deactivate) - admin only
- Inactive badge if template is deactivated

**Handled Events:**
- Card click → Navigate to template detail or trigger `onClick` callback
- Edit button click → Trigger `onEdit` callback
- Deactivate button click → Trigger `onDeactivate` callback

**Validation Conditions:**
- Show Edit and Deactivate buttons only if `isAdmin` is true
- Show "Inactive" badge if `template.is_active` is false
- Ensure rules array is not empty before rendering

**Types:**
- `TemplateCardProps` - Component interface
- `PromotionTemplateListItemDto` - Template data

**Props:**
```typescript
interface TemplateCardProps {
  template: PromotionTemplateListItemDto;
  isAdmin: boolean;
  onClick?: (id: string) => void;
  onEdit: (template: PromotionTemplateListItemDto) => void;
  onDeactivate: (template: PromotionTemplateListItemDto) => void;
}
```

---

### RulesList

**Component Description:**
Displays the list of badge requirements (rules) for a promotion template. Each rule shows the required badge category, level, and count. Can be rendered in compact mode for cards or detailed mode for forms.

**Main Elements:**
- List container (ordered or unordered)
- Rule items, each showing:
  - Category (with color-coded badge or text)
  - Level (with level-specific badge or icon)
  - Count (number of badges required)
- Empty state message if rules array is empty

**Handled Events:**
None (display-only component)

**Validation Conditions:**
- rules must be a non-empty array
- Each rule must have category, level, and count
- category must be: technical, organizational, softskilled, or any
- level must be: gold, silver, bronze
- count must be a positive integer

**Types:**
- `RulesListProps` - Component interface
- `PromotionTemplateRule[]` - Rules array

**Props:**
```typescript
interface RulesListProps {
  rules: PromotionTemplateRule[];
  isCompact?: boolean; // Compact mode for cards
  className?: string;
}
```

---

### TemplateFormModal

**Component Description:**
Modal dialog for creating new promotion templates or editing existing ones. Contains a form with inputs for template name, path, level transition, and a dynamic rules builder. Validates input and submits to API on save.

**Main Elements:**
- Modal overlay and container
- Modal header with title ("Create Template" or "Edit Template")
- Form with controlled inputs:
  - Template name (text input, required, 1-200 chars)
  - Career path (select: technical, financial, management)
  - From level (text input, required, 1-20 chars)
  - To level (text input, required, 1-20 chars)
- Rules builder section:
  - Add rule button
  - Dynamic list of rule inputs (category, level, count)
  - Remove rule button per rule
  - Validation: no duplicate category+level pairs, 1-50 rules
- Form footer with Cancel and Save buttons
- Loading state during submission

**Handled Events:**
- Form field change → Update local form state
- Add rule → Append new empty rule to rules array
- Remove rule → Remove rule from array
- Form submit → Validate and call `onSubmit` callback
- Cancel → Call `onClose` callback
- Modal backdrop click → Call `onClose` callback

**Validation Conditions:**
- **name:** Required, 1-200 characters, trimmed, unique across templates
- **path:** Required, must be one of: technical, financial, management
- **from_level:** Required, 1-20 characters (free text but should match position levels)
- **to_level:** Required, 1-20 characters (should represent next level after from_level)
- **rules:** Array with 1-50 items
  - Each rule must have:
    - **category:** technical | organizational | softskilled | any
    - **level:** gold | silver | bronze
    - **count:** Integer, 1-100
  - No duplicate (category, level) pairs
- Form cannot be submitted while validating or if validation fails
- Show field-level errors below each invalid input

**Types:**
- `TemplateFormModalProps` - Component interface
- `TemplateFormData` - Form state object
- `PromotionTemplateListItemDto` - Existing template data (edit mode)
- `PromotionTemplateRule` - Individual rule

**Props:**
```typescript
interface TemplateFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  template?: PromotionTemplateListItemDto; // Required for edit mode
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
}
```

---

### ConfirmDeactivateModal

**Component Description:**
Confirmation dialog for deactivating a promotion template. Warns the user that deactivation is a soft delete (template is preserved but marked inactive) and existing promotions using this template remain valid.

**Main Elements:**
- Modal overlay and container
- Warning icon and title
- Template name display
- Explanation text: "This template will be deactivated but preserved for historical reference. Existing promotions using this template remain valid."
- Cancel and Confirm buttons
- Loading state during deactivation

**Handled Events:**
- Confirm button click → Call `onConfirm` callback
- Cancel button click → Call `onCancel` callback
- Modal backdrop click → Call `onCancel` callback

**Validation Conditions:**
- Template must not be null/undefined
- Confirm button disabled while loading

**Types:**
- `ConfirmDeactivateModalProps` - Component interface
- `PromotionTemplateListItemDto` - Template to deactivate

**Props:**
```typescript
interface ConfirmDeactivateModalProps {
  isOpen: boolean;
  template: PromotionTemplateListItemDto | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

---

### TemplateEmptyState

**Component Description:**
Empty state component displayed when no templates match the current filters or when no templates exist in the system. Provides helpful messaging and action prompts based on context (admin vs. standard user, filtered vs. unfiltered).

**Main Elements:**
- Empty state icon (e.g., folder or template icon)
- Contextual message:
  - If no filters: "No promotion templates have been created yet."
  - If filters active: "No templates match your current filters."
- Contextual action:
  - If admin and no templates: "Create Template" button
  - If filters active: "Clear Filters" button

**Handled Events:**
- Create template button → Trigger create modal
- Clear filters button → Reset filters to defaults

**Validation Conditions:**
None

**Types:**
- `TemplateEmptyStateProps` - Component interface

**Props:**
```typescript
interface TemplateEmptyStateProps {
  hasFilters: boolean;
  isAdmin: boolean;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}
```

---

### Pagination

**Component Description:**
Pagination controls for navigating through pages of templates. Shows current page range, total count, and provides next/previous navigation with optional page size selector.

**Main Elements:**
- Page info text (e.g., "Showing 1-20 of 45")
- Previous button (disabled on first page)
- Next button (disabled on last page)
- Page size selector (10, 20, 50, 100 items per page)

**Handled Events:**
- Previous button click → Decrement offset by limit
- Next button click → Increment offset by limit
- Page size change → Reset offset to 0, update limit

**Validation Conditions:**
- offset must be >= 0
- limit must be 1-100
- Previous button disabled when offset === 0
- Next button disabled when offset + limit >= total

**Types:**
- `PaginationProps` - Component interface
- `PaginationMetadata` - Pagination state

**Props:**
```typescript
interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
}
```

## 5. Types

### Existing Types (from types.ts)

```typescript
// Promotion template with typed rules field
export interface PromotionTemplateDto extends Omit<PromotionTemplateRow, "rules"> {
  rules: PromotionTemplateRule[];
}

// List item (same as DTO)
export type PromotionTemplateListItemDto = PromotionTemplateDto;

// Rule definition
export interface PromotionTemplateRule {
  category: BadgeCategoryType | "any";
  level: BadgeLevelType;
  count: number;
}

// Pagination wrapper
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface PaginationMetadata {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Command types
export interface CreatePromotionTemplateCommand {
  name: string;
  path: PromotionPathType;
  from_level: string;
  to_level: string;
  rules: PromotionTemplateRule[];
}

export interface UpdatePromotionTemplateCommand {
  name?: string;
  rules?: PromotionTemplateRule[];
}

// Enums
export type PromotionPathType = "technical" | "financial" | "management";
export type BadgeCategoryType = "technical" | "organizational" | "softskilled";
export type BadgeLevelType = "gold" | "silver" | "bronze";
```

### New View-Specific Types

```typescript
/**
 * Filter state for templates list
 */
export interface TemplateFilters {
  path?: PromotionPathType;
  from_level?: string;
  to_level?: string;
  is_active: boolean;
}

/**
 * Sort options for templates list
 */
export interface TemplateSortOptions {
  sort: 'created_at' | 'name';
  order: 'asc' | 'desc';
}

/**
 * Form data for creating/editing templates
 */
export interface TemplateFormData {
  name: string;
  path: PromotionPathType;
  from_level: string;
  to_level: string;
  rules: PromotionTemplateRule[];
}

/**
 * Component Props Interfaces
 * (Defined in Component Details section above)
 */
export interface PromotionTemplatesViewProps {
  initialData: PaginatedResponse<PromotionTemplateListItemDto>;
  isAdmin: boolean;
  userId: string;
}

export interface TemplateListHeaderProps {
  isAdmin: boolean;
  onCreateClick: () => void;
}

export interface TemplateFilterBarProps {
  filters: TemplateFilters;
  sortOptions: TemplateSortOptions;
  onFilterChange: (filters: TemplateFilters) => void;
  onSortChange: (sortOptions: TemplateSortOptions) => void;
}

export interface TemplateGridProps {
  templates: PromotionTemplateListItemDto[];
  isLoading: boolean;
  isAdmin: boolean;
  onTemplateClick?: (id: string) => void;
  onEditClick: (template: PromotionTemplateListItemDto) => void;
  onDeactivateClick: (template: PromotionTemplateListItemDto) => void;
}

export interface TemplateCardProps {
  template: PromotionTemplateListItemDto;
  isAdmin: boolean;
  onClick?: (id: string) => void;
  onEdit: (template: PromotionTemplateListItemDto) => void;
  onDeactivate: (template: PromotionTemplateListItemDto) => void;
}

export interface RulesListProps {
  rules: PromotionTemplateRule[];
  isCompact?: boolean;
  className?: string;
}

export interface TemplateFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  template?: PromotionTemplateListItemDto;
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
}

export interface ConfirmDeactivateModalProps {
  isOpen: boolean;
  template: PromotionTemplateListItemDto | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export interface TemplateEmptyStateProps {
  hasFilters: boolean;
  isAdmin: boolean;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

export interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
}
```

## 6. State Management

State for the Promotion Templates List view is managed within the `PromotionTemplatesView` React component using local state (useState) and effects (useEffect). A custom hook is **recommended but optional** for better organization and reusability.

### Local State Variables

```typescript
const [templates, setTemplates] = useState<PromotionTemplateListItemDto[]>(initialData.data);
const [pagination, setPagination] = useState<PaginationMetadata>(initialData.pagination);
const [filters, setFilters] = useState<TemplateFilters>({
  is_active: true, // Default to active templates only
});
const [sortOptions, setSortOptions] = useState<TemplateSortOptions>({
  sort: 'name',
  order: 'asc',
});
const [isLoading, setIsLoading] = useState(false);
const [isFormModalOpen, setIsFormModalOpen] = useState(false);
const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
const [selectedTemplate, setSelectedTemplate] = useState<PromotionTemplateListItemDto | null>(null);
const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
const [templateToDeactivate, setTemplateToDeactivate] = useState<PromotionTemplateListItemDto | null>(null);
```

### State Update Flow

1. **Initial Load:**
   - Server fetches data via GET /api/promotion-templates (default: is_active=true, sort=name, order=asc, limit=20, offset=0)
   - Data passed as `initialData` prop
   - Component initializes state from `initialData`

2. **Filter Changes:**
   - User interacts with TemplateFilterBar
   - `onFilterChange` callback updates `filters` state
   - useEffect detects filter change, triggers API call
   - Reset offset to 0 to show first page of filtered results

3. **Sort Changes:**
   - User changes sort field or order
   - `onSortChange` callback updates `sortOptions` state
   - useEffect detects sort change, triggers API call

4. **Pagination:**
   - User clicks next/previous or changes page size
   - Update `pagination.offset` or `pagination.limit`
   - useEffect detects pagination change, triggers API call

5. **Create Template:**
   - Admin clicks "Create Template"
   - Set `formMode` to 'create', `isFormModalOpen` to true
   - User fills form and submits
   - POST /api/promotion-templates
   - On success: add new template to `templates` array, close modal, show toast

6. **Edit Template:**
   - Admin clicks "Edit" on template card
   - Set `formMode` to 'edit', `selectedTemplate` to clicked template, `isFormModalOpen` to true
   - User modifies form and submits
   - PUT /api/promotion-templates/:id
   - On success: update template in `templates` array, close modal, show toast

7. **Deactivate Template:**
   - Admin clicks "Deactivate" on template card
   - Set `templateToDeactivate` to clicked template, `isDeactivateModalOpen` to true
   - User confirms deactivation
   - DELETE /api/promotion-templates/:id
   - On success: remove template from list (if is_active filter is true), close modal, show toast

### Recommended Custom Hook (Optional)

```typescript
function usePromotionTemplates(
  initialData: PaginatedResponse<PromotionTemplateListItemDto>,
  isAdmin: boolean
) {
  // State variables (as listed above)

  // Fetch templates with current filters, sort, and pagination
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        is_active: filters.is_active.toString(),
        sort: sortOptions.sort,
        order: sortOptions.order,
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      if (filters.path) queryParams.set('path', filters.path);
      if (filters.from_level) queryParams.set('from_level', filters.from_level);
      if (filters.to_level) queryParams.set('to_level', filters.to_level);

      const response = await fetch(`/api/promotion-templates?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch templates');

      const data: PaginatedResponse<PromotionTemplateListItemDto> = await response.json();
      setTemplates(data.data);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  // Create template
  const createTemplate = async (data: TemplateFormData) => {
    const response = await fetch('/api/promotion-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create template');
    const created: PromotionTemplateDto = await response.json();
    setTemplates(prev => [created, ...prev]);
    toast.success('Template created successfully');
  };

  // Update template
  const updateTemplate = async (id: string, data: Partial<TemplateFormData>) => {
    const response = await fetch(`/api/promotion-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update template');
    const updated: PromotionTemplateDto = await response.json();
    setTemplates(prev => prev.map(t => t.id === id ? updated : t));
    toast.success('Template updated successfully');
  };

  // Deactivate template
  const deactivateTemplate = async (id: string) => {
    const response = await fetch(`/api/promotion-templates/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to deactivate template');
    if (filters.is_active) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    } else {
      // Refetch to show updated is_active status
      await fetchTemplates();
    }
    toast.success('Template deactivated successfully');
  };

  // Effects
  useEffect(() => {
    fetchTemplates();
  }, [filters, sortOptions, pagination.offset, pagination.limit]);

  return {
    templates,
    pagination,
    filters,
    sortOptions,
    isLoading,
    setFilters,
    setSortOptions,
    setPagination,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
  };
}
```

## 7. API Integration

### GET /api/promotion-templates

**Purpose:** Fetch paginated list of promotion templates with filtering and sorting

**Request:**
- Method: GET
- URL: `/api/promotion-templates`
- Query Parameters (all optional):
  - `path`: PromotionPathType (technical | financial | management)
  - `from_level`: string (e.g., "S1", "J2", "M1")
  - `to_level`: string (e.g., "S2", "J3", "M2")
  - `is_active`: boolean (default: true)
  - `sort`: 'created_at' | 'name' (default: 'name')
  - `order`: 'asc' | 'desc' (default: 'asc')
  - `limit`: number (1-100, default: 20)
  - `offset`: number (>=0, default: 0)

**Response:**
- Status: 200 OK
- Type: `PaginatedResponse<PromotionTemplateListItemDto>`
- Body:
```typescript
{
  data: PromotionTemplateListItemDto[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    has_more: boolean
  }
}
```

**Error Responses:**
- 400 Bad Request: Invalid query parameters
- 401 Unauthorized: Authentication required (production)
- 500 Internal Server Error: Server error

**Usage:**
- Initial page load
- Filter changes
- Sort changes
- Pagination changes

---

### POST /api/promotion-templates

**Purpose:** Create a new promotion template (admin only)

**Request:**
- Method: POST
- URL: `/api/promotion-templates`
- Headers: `Content-Type: application/json`
- Type: `CreatePromotionTemplateCommand`
- Body:
```typescript
{
  name: string,           // 1-200 chars, required
  path: PromotionPathType, // required
  from_level: string,     // 1-20 chars, required
  to_level: string,       // 1-20 chars, required
  rules: PromotionTemplateRule[] // 1-50 items, required
}
```

**Response:**
- Status: 201 Created
- Type: `PromotionTemplateDto`
- Body: Created template object

**Error Responses:**
- 400 Bad Request: Validation error
- 401 Unauthorized: Not authenticated (production)
- 403 Forbidden: Not admin (production)
- 409 Conflict: Template with name already exists
- 500 Internal Server Error: Server error

**Usage:**
- Creating a new template via TemplateFormModal

---

### PUT /api/promotion-templates/:id

**Purpose:** Update an existing promotion template (admin only)

**Request:**
- Method: PUT
- URL: `/api/promotion-templates/:id`
- Path Parameters: `id` (UUID)
- Headers: `Content-Type: application/json`
- Type: `UpdatePromotionTemplateCommand`
- Body (all fields optional, at least one required):
```typescript
{
  name?: string,    // 1-200 chars
  rules?: PromotionTemplateRule[] // 1-50 items
}
```

**Response:**
- Status: 200 OK
- Type: `PromotionTemplateDto`
- Body: Updated template object

**Error Responses:**
- 400 Bad Request: Validation error or no fields provided
- 401 Unauthorized: Not authenticated (production)
- 403 Forbidden: Not admin (production)
- 404 Not Found: Template not found
- 500 Internal Server Error: Server error

**Usage:**
- Editing an existing template via TemplateFormModal

---

### DELETE /api/promotion-templates/:id

**Purpose:** Deactivate (soft delete) a promotion template (admin only)

**Request:**
- Method: DELETE
- URL: `/api/promotion-templates/:id`
- Path Parameters: `id` (UUID)

**Response:**
- Status: 200 OK
- Body:
```typescript
{
  message: "Promotion template deactivated successfully"
}
```

**Error Responses:**
- 400 Bad Request: Invalid UUID format
- 401 Unauthorized: Not authenticated (production)
- 403 Forbidden: Not admin (production)
- 404 Not Found: Template not found
- 500 Internal Server Error: Server error

**Usage:**
- Deactivating a template via ConfirmDeactivateModal

## 8. User Interactions

### 1. Viewing Templates List

**User Action:** User navigates to `/promotion-templates`

**System Response:**
1. Server-side: Fetch templates with default params (is_active=true, sort=name, limit=20, offset=0)
2. Render page with initial data
3. Display templates in responsive grid
4. Show pagination controls if total > limit

**UI Feedback:**
- Page title: "Promotion Templates"
- Description explaining templates
- Grid of template cards
- Filter bar with default values
- Loading skeleton during initial load

---

### 2. Filtering Templates

**User Action:** User changes filters (path, from_level, to_level, is_active)

**System Response:**
1. Update filter state
2. Reset offset to 0 (first page)
3. Debounce input changes (500ms)
4. Fetch templates with new filters
5. Update templates list and pagination

**UI Feedback:**
- Loading indicator on grid
- Filter values persist in UI
- Grid updates with filtered results
- Pagination resets to page 1
- Show empty state if no results
- URL query params update (shareable state)

---

### 3. Sorting Templates

**User Action:** User changes sort field (name/created_at) or order (asc/desc)

**System Response:**
1. Update sort options state
2. Fetch templates with new sort
3. Update templates list

**UI Feedback:**
- Loading indicator on grid
- Sort controls show active selection
- Grid re-orders immediately
- Pagination maintains current page

---

### 4. Navigating Pages

**User Action:** User clicks next/previous button or changes page size

**System Response:**
1. Calculate new offset based on action
2. Update pagination state
3. Fetch templates with new offset/limit
4. Update templates list

**UI Feedback:**
- Loading indicator on grid
- Pagination controls show current page
- Previous button disabled on first page
- Next button disabled on last page
- Scroll to top of grid

---

### 5. Creating Template (Admin)

**User Action:** Admin clicks "Create Template" button

**System Response:**
1. Open TemplateFormModal in create mode
2. Initialize form with empty fields
3. Set rules to empty array (user must add at least one)

**User Action:** Admin fills form and clicks "Save"

**System Response:**
1. Validate form fields (client-side with Zod)
2. If valid: POST /api/promotion-templates
3. If 201 Created:
   - Add new template to templates list
   - Close modal
   - Show success toast
4. If error:
   - Show error toast
   - Highlight invalid fields
   - Keep modal open

**UI Feedback:**
- Modal opens with smooth animation
- Form fields show validation errors on blur
- Submit button disabled if form invalid
- Loading state on submit button during API call
- Success toast: "Template created successfully"
- Error toast: "Failed to create template: [error message]"

---

### 6. Editing Template (Admin)

**User Action:** Admin clicks "Edit" button on template card

**System Response:**
1. Open TemplateFormModal in edit mode
2. Pre-fill form with template data
3. User can modify name or rules only (path and levels are immutable)

**User Action:** Admin modifies form and clicks "Save"

**System Response:**
1. Validate changed fields
2. If valid: PUT /api/promotion-templates/:id with only changed fields
3. If 200 OK:
   - Update template in templates list
   - Close modal
   - Show success toast
4. If error:
   - Show error toast
   - Highlight invalid fields
   - Keep modal open

**UI Feedback:**
- Modal opens with template data pre-filled
- Path, from_level, to_level fields are read-only or disabled
- Submit button shows "Save Changes"
- Loading state during API call
- Success toast: "Template updated successfully"
- Error toast: "Failed to update template: [error message]"

---

### 7. Deactivating Template (Admin)

**User Action:** Admin clicks "Deactivate" button on template card

**System Response:**
1. Open ConfirmDeactivateModal
2. Show template name and warning message

**User Action:** Admin clicks "Confirm"

**System Response:**
1. DELETE /api/promotion-templates/:id
2. If 200 OK:
   - If is_active filter is true: remove template from list
   - If is_active filter is false: refetch to show updated status
   - Close modal
   - Show success toast
3. If error:
   - Show error toast
   - Keep modal open

**UI Feedback:**
- Confirmation modal with warning icon
- Clear explanation of deactivation consequences
- Confirm button shows "Deactivate Template"
- Loading state during API call
- Success toast: "Template deactivated successfully"
- Error toast: "Failed to deactivate template: [error message]"

---

### 8. Clearing Filters

**User Action:** User clicks "Clear Filters" button

**System Response:**
1. Reset filters to defaults:
   - path: undefined (all)
   - from_level: undefined (all)
   - to_level: undefined (all)
   - is_active: true
2. Reset offset to 0
3. Fetch templates with default filters
4. Update URL query params

**UI Feedback:**
- Filter controls reset to default values
- Grid updates with unfiltered results
- Loading indicator during fetch
- URL updates to /promotion-templates (no query params)

## 9. Conditions and Validation

### Filter Validation (TemplateFilterBar)

**Conditions:**
- `path`: Optional, must be one of: technical, financial, management, or empty
- `from_level`: Optional, free text (1-20 chars), validated by backend
- `to_level`: Optional, free text (1-20 chars), validated by backend
- `is_active`: Boolean, default true

**Component-Level Verification:**
- Select dropdown for path ensures valid values
- Input fields trim whitespace
- Switch component ensures boolean value

**Effect on Interface:**
- Invalid path not possible (select dropdown)
- Invalid levels result in no results (backend validation)
- Filter changes trigger immediate API call (debounced for text inputs)

---

### Sort Validation (TemplateFilterBar)

**Conditions:**
- `sort`: Must be one of: created_at, name
- `order`: Must be one of: asc, desc

**Component-Level Verification:**
- Select dropdowns ensure valid values
- Default to name/asc if not specified

**Effect on Interface:**
- Sort changes trigger immediate API call
- Grid re-orders without re-filtering

---

### Pagination Validation (Pagination Component)

**Conditions:**
- `limit`: Integer, 1-100, default 20
- `offset`: Integer, >= 0, default 0
- `offset + limit` should not exceed total (but backend handles gracefully)

**Component-Level Verification:**
- Page size select has predefined valid options (10, 20, 50, 100)
- Previous button disabled when offset === 0
- Next button disabled when has_more === false

**Effect on Interface:**
- Invalid pagination not possible (controlled inputs)
- Disabled buttons provide clear visual feedback
- Page info shows current range (e.g., "Showing 21-40 of 45")

---

### Create Template Validation (TemplateFormModal - Create Mode)

**Conditions (from Zod schema):**

**name:**
- Required
- String, 1-200 characters
- Trimmed automatically
- Must be unique across all templates (backend check)

**path:**
- Required
- Must be one of: technical, financial, management

**from_level:**
- Required
- String, 1-20 characters
- Should correspond to a valid position level (not strictly validated, but recommended)

**to_level:**
- Required
- String, 1-20 characters
- Should represent next level progression from from_level

**rules:**
- Required
- Array with 1-50 items
- Each rule must have:
  - **category:** technical | organizational | softskilled | any
  - **level:** gold | silver | bronze
  - **count:** Integer, 1-100
- No duplicate (category, level) pairs allowed

**Component-Level Verification:**
- Real-time validation using Zod schema
- Show error message below each invalid field on blur
- Submit button disabled if any validation errors exist
- Count duplicate rules and show error: "Duplicate rule for [category]:[level]"

**Effect on Interface:**
- Field-level errors appear below inputs (red text)
- Invalid fields highlighted with red border
- Form cannot be submitted while invalid
- Error messages are specific and actionable

---

### Edit Template Validation (TemplateFormModal - Edit Mode)

**Conditions (from Zod schema):**

**name:**
- Optional (can be updated)
- String, 1-200 characters if provided
- Trimmed automatically

**path, from_level, to_level:**
- Cannot be updated (immutable)
- Fields disabled or read-only in edit mode

**rules:**
- Optional (can be updated)
- If provided: same validation as create mode
- Array with 1-50 items
- No duplicate (category, level) pairs

**At least one field must be provided for update**

**Component-Level Verification:**
- Only name and rules are editable
- Same validation logic as create mode for editable fields
- Submit button disabled if no changes made or validation fails

**Effect on Interface:**
- Path/level fields visually disabled (grayed out)
- Only editable fields show validation errors
- Submit button enabled only if changes are valid

---

### Deactivate Template Validation (ConfirmDeactivateModal)

**Conditions:**
- Template must exist and be active
- User must confirm action

**Component-Level Verification:**
- Template object must not be null
- Confirm button requires explicit click (no accidental deactivation)

**Effect on Interface:**
- Modal prevents accidental deactivation
- Clear warning message about consequences
- Confirm button shows loading state during API call

## 10. Error Handling

### 1. Network Errors

**Scenario:** API call fails due to network issues (offline, timeout, DNS failure)

**Handling:**
- Catch fetch errors in try/catch blocks
- Show error toast: "Network error. Please check your connection and try again."
- Keep current data visible in grid
- Provide "Retry" button or allow user to manually refresh

**UI Feedback:**
- Error toast with descriptive message
- Grid shows last successful data
- No loading state persists

---

### 2. Validation Errors (400 Bad Request)

**Scenario:** User submits invalid data (e.g., duplicate template name, invalid rule format)

**Handling:**
- Parse `ApiError` response with `details` array
- Map field errors to form inputs
- Show field-level error messages
- Prevent form submission until fixed

**UI Feedback:**
- Red border on invalid fields
- Error message below each field
- Submit button remains disabled
- Toast: "Please fix validation errors"

---

### 3. Unauthorized (401)

**Scenario:** User session expired or not authenticated

**Handling:**
- Redirect to login page
- Show toast: "Your session has expired. Please log in again."
- Preserve return URL for post-login redirect

**UI Feedback:**
- Immediate redirect to /login
- Toast notification before redirect

---

### 4. Forbidden (403)

**Scenario:** Non-admin user attempts admin action (create, edit, deactivate)

**Handling:**
- This should be prevented by UI (admin buttons not shown)
- If backend returns 403, show error toast
- Hide admin action buttons

**UI Feedback:**
- Toast: "You don't have permission to perform this action"
- Modal closes if open

---

### 5. Not Found (404)

**Scenario:** Template doesn't exist (e.g., deleted by another user while editing)

**Handling:**
- Show error toast: "Template not found. It may have been deleted."
- Remove template from local cache
- Close modal if open
- Redirect to templates list if on detail page

**UI Feedback:**
- Toast with explanation
- Template removed from grid
- Modal closes

---

### 6. Conflict (409)

**Scenario:** Duplicate template name when creating or updating

**Handling:**
- Parse conflict error message
- Show specific error on name field
- Keep form open with current values
- User can modify name and retry

**UI Feedback:**
- Error message on name field: "A template with this name already exists"
- Submit button remains enabled for retry
- Toast: "Template name already exists"

---

### 7. Internal Server Error (500)

**Scenario:** Unexpected server error

**Handling:**
- Log error details to console (development)
- Show generic error toast: "Something went wrong. Please try again later."
- Provide support contact if error persists
- Retry button for fetch operations

**UI Feedback:**
- Toast: "An unexpected error occurred. Please try again."
- For form submissions: keep form open, allow retry
- For fetch operations: show retry button

---

### 8. Empty State (No Results)

**Scenario:** No templates match current filters or no templates exist

**Handling:**
- Distinguish between "no templates exist" and "no matches for filters"
- Show appropriate empty state component

**UI Feedback:**
- If no filters: "No promotion templates have been created yet." + Create button (admin)
- If filters active: "No templates match your current filters." + Clear Filters button
- Empty state icon and helpful messaging

---

### 9. Loading State Failures

**Scenario:** API call takes too long or hangs

**Handling:**
- Set timeout for API calls (e.g., 30 seconds)
- If timeout: show error toast, stop loading state
- Allow user to retry

**UI Feedback:**
- Loading skeleton/spinner has maximum duration
- After timeout: error toast + retry button
- Current data remains visible if available

---

### 10. Concurrent Modification

**Scenario:** Admin A edits template while Admin B deactivates it

**Handling:**
- Backend returns 404 on PUT if template deactivated
- Show error toast explaining conflict
- Refresh template list to show current state

**UI Feedback:**
- Toast: "This template was modified by another user. Refreshing..."
- Automatically refetch templates
- Close edit modal

## 11. Implementation Steps

### Phase 1: Foundation Setup (Steps 1-3)

**Step 1: Create Type Definitions**
- Location: `src/types.ts`
- Add new types to existing file:
  - `TemplateFilters`
  - `TemplateSortOptions`
  - `TemplateFormData`
  - All component prop interfaces (PromotionTemplatesViewProps, TemplateListHeaderProps, etc.)
- Verify existing types are sufficient (PromotionTemplateDto, PromotionTemplateRule, etc.)

**Step 2: Create Astro Page**
- Location: `src/pages/promotion-templates.astro`
- Implement server-side rendering:
  - Add authentication check (currently disabled for development)
  - Fetch initial templates: GET /api/promotion-templates (default params)
  - Handle fetch errors (401, 500, network)
  - Pass initialData to React component
  - Use Layout with appropriate title and meta tags

**Step 3: Create Main View Component**
- Location: `src/components/promotion-templates/PromotionTemplatesView.tsx`
- Implement state management:
  - Initialize state from initialData prop
  - Define all state variables (templates, pagination, filters, sort, modals)
  - Implement useEffect for fetching on filter/sort/pagination changes
- Implement placeholder UI with temporary divs to verify data flow
- Test state updates with browser devtools

---

### Phase 2: Display Components (Steps 4-8)

**Step 4: Create TemplateListHeader**
- Location: `src/components/promotion-templates/TemplateListHeader.tsx`
- Implement:
  - Page title and description
  - Create button (conditionally rendered if isAdmin)
  - Styling with Tailwind classes
- Use shadcn/ui Button component

**Step 5: Create TemplateFilterBar**
- Location: `src/components/promotion-templates/TemplateFilterBar.tsx`
- Implement:
  - Select for path filter (technical/financial/management/all)
  - Input for from_level (with debounce)
  - Input for to_level (with debounce)
  - Switch for is_active toggle
  - Select for sort field (name/created_at)
  - Select for sort order (asc/desc)
  - Clear filters button
- Use shadcn/ui Select, Input, Switch components
- Implement debounce for text inputs (500ms)

**Step 6: Create RulesList**
- Location: `src/components/promotion-templates/RulesList.tsx`
- Implement:
  - Map rules array to list items
  - Display category with color-coded badge
  - Display level with level-specific styling
  - Display count prominently
  - Support compact mode for cards and detailed mode for forms
- Use shadcn/ui Badge component for category/level

**Step 7: Create TemplateCard**
- Location: `src/components/promotion-templates/TemplateCard.tsx`
- Implement:
  - Card header with template name
  - Path badge (color-coded)
  - Level transition display (from → to)
  - RulesList integration
  - Created date and creator metadata
  - Admin action buttons (Edit, Deactivate)
  - Inactive badge if !is_active
  - Click handler for card body
- Use shadcn/ui Card and Badge components

**Step 8: Create TemplateGrid and TemplateEmptyState**
- Location: `src/components/promotion-templates/TemplateGrid.tsx`
- Implement:
  - Responsive grid layout (1/2/3 columns)
  - Loading skeleton with 6 placeholder cards
  - Map templates to TemplateCard components
  - Empty state when templates.length === 0
- Location: `src/components/promotion-templates/TemplateEmptyState.tsx`
- Implement:
  - Contextual messaging (no templates vs. no matches)
  - Action button (Create or Clear Filters)
  - Icon and styling

---

### Phase 3: Action Components (Steps 9-11)

**Step 9: Create Pagination**
- Location: `src/components/promotion-templates/Pagination.tsx`
- Implement:
  - Page info text (Showing X-Y of Z)
  - Previous/Next buttons with disabled states
  - Page size selector
  - Calculate and display current page number
- Use shadcn/ui Button and Select components

**Step 10: Create TemplateFormModal**
- Location: `src/components/promotion-templates/TemplateFormModal.tsx`
- Implement:
  - Modal with Dialog component from shadcn/ui
  - Form with controlled inputs
  - Name input with validation
  - Path select (disabled in edit mode)
  - From/to level inputs (disabled in edit mode)
  - Rules builder:
    - Add rule button
    - Dynamic list of rule inputs
    - Remove rule button per rule
    - Validation: no duplicates, 1-50 rules
  - Form validation using Zod schema
  - Submit handler (create or update)
  - Loading state during submission
- Use shadcn/ui Dialog, Input, Select, Button components

**Step 11: Create ConfirmDeactivateModal**
- Location: `src/components/promotion-templates/ConfirmDeactivateModal.tsx`
- Implement:
  - Confirmation dialog
  - Warning icon and message
  - Template name display
  - Explanation of soft delete
  - Cancel and Confirm buttons
  - Loading state during deactivation
- Use shadcn/ui Dialog, Button components

---

### Phase 4: Integration & Polish (Steps 12-15)

**Step 12: Wire Up PromotionTemplatesView**
- Replace placeholder UI with actual components
- Connect event handlers:
  - Filter changes → update state and fetch
  - Sort changes → update state and fetch
  - Pagination changes → update state and fetch
  - Create click → open form modal in create mode
  - Edit click → open form modal in edit mode with template data
  - Deactivate click → open confirm modal
- Implement API call functions:
  - fetchTemplates (GET with query params)
  - createTemplate (POST)
  - updateTemplate (PUT)
  - deactivateTemplate (DELETE)
- Add error handling with toast notifications

**Step 13: Implement URL State Sync (Optional)**
- Update URL query params when filters/sort/pagination change
- Parse URL on page load to restore state
- Enable shareable filter URLs

**Step 14: Add Loading and Error States**
- Show loading skeleton during fetch
- Show toast notifications for errors
- Implement retry logic for failed requests
- Add debouncing for filter inputs

**Step 15: Testing, Linting, and Cleanup**
- Test all user interactions:
  - View templates list
  - Apply filters (path, levels, active status)
  - Change sort order
  - Navigate pages
  - Create template (admin)
  - Edit template (admin)
  - Deactivate template (admin)
  - Handle errors (network, validation, auth)
- Run linter: `pnpm lint`
- Fix any linting errors
- Test responsive design (mobile, tablet, desktop)
- Verify accessibility (keyboard navigation, ARIA labels)
- Validate against WCAG 2.1 AA standards

---

### Phase 5: Optional Enhancements

**Step 16: Add Bulk Actions (Optional)**
- Checkbox per template card
- Bulk deactivate selected templates
- Requires backend support for bulk operations

**Step 17: Add Template Preview (Optional)**
- Quick view modal showing full template details
- Triggered by clicking template card
- Read-only display of all template information

**Step 18: Add Export Functionality (Optional)**
- Export templates to CSV or JSON
- Useful for admin reporting and backup

**Step 19: Add Search Functionality (Optional)**
- Full-text search across template names
- Debounced input with backend query
- Highlight matching text in results

**Step 20: Performance Optimization**
- Implement React Query or SWR for caching
- Add optimistic updates for create/edit/delete
- Lazy load template cards for very large lists
- Implement virtual scrolling if list exceeds 100 items

---

## Summary

This implementation plan provides a comprehensive guide for building the Promotion Templates List view. The plan is organized into 5 phases with 15 core steps and 5 optional enhancement steps. Following this plan will result in a fully functional, accessible, and maintainable view that adheres to the PRD requirements and tech stack conventions.

**Key Deliverables:**
- 11 React components (1 main view + 10 child components)
- 1 Astro SSR page
- Full CRUD functionality for promotion templates (admin)
- Filtering, sorting, and pagination
- Comprehensive error handling
- Responsive design for all screen sizes
- Accessibility compliance (WCAG 2.1 AA)

**Estimated Effort:** 3-5 days for a senior frontend developer following this plan step-by-step.
