# REST API Plan - Badger MVP

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Authentication | `users` | Google Workspace SSO authentication and session management |
| User | `users` | User profile and current user information |
| Catalog Badges | `catalog_badges` | Badge definitions in the catalog |
| Badge Applications | `badge_applications` | Badge application instances (draft, submitted, reviewed) |
| Promotion Templates | `promotion_templates` | Template definitions for promotion requirements |
| Promotions | `promotions` | Promotion instances (draft, submitted, reviewed) |
| Promotion Badges | `promotion_badges` | Junction table linking promotions to badge applications |
| Position Levels | Configuration file | Position levels and requirements (read-only) |

## 2. Endpoints

### 2.1 Authentication Endpoints

#### `GET /api/auth/google`
**Description**: Initiates Google OAuth flow and redirects to Google consent screen.

**Query Parameters**: None

**Response**: HTTP 302 redirect to Google OAuth consent screen

**Success Codes**:
- `302 Found` - Redirect to Google OAuth

**Error Codes**:
- `500 Internal Server Error` - OAuth configuration error

---

#### `GET /api/auth/callback`
**Description**: Handles OAuth callback from Google, validates domain, creates/updates user session.

**Query Parameters**:
- `code` (string, required) - OAuth authorization code
- `state` (string, required) - CSRF protection state

**Response**: HTTP 302 redirect to application dashboard

**Success Codes**:
- `302 Found` - Redirect to dashboard with session cookie set

**Error Codes**:
- `401 Unauthorized` - Invalid OAuth code or domain not allowed
  ```json
  {
    "error": "unauthorized",
    "message": "Email domain @example.com is not allowed. Please use your company email."
  }
  ```
- `500 Internal Server Error` - OAuth processing error

**Business Logic**:
- Validate email domain matches company domain (e.g., `@goodcompany.com`)
- Create user record if first login
- Set `google_sub` from OAuth token
- Create session cookie/JWT

---

#### `GET /api/me`
**Description**: Returns current authenticated user information.

**Authentication**: Required

**Query Parameters**: None

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@goodcompany.com",
  "display_name": "John Doe",
  "is_admin": false,
  "created_at": "2025-01-15T10:30:00Z",
  "last_seen_at": "2025-01-22T14:20:00Z"
}
```

**Success Codes**:
- `200 OK` - User information returned

**Error Codes**:
- `401 Unauthorized` - No valid session

---

#### `POST /api/auth/logout`
**Description**: Logs out the current user and invalidates session.

**Authentication**: Required

**Request Payload**: None

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

**Success Codes**:
- `200 OK` - Logout successful

**Error Codes**:
- `401 Unauthorized` - No valid session

---

### 2.2 Catalog Badge Endpoints

#### `GET /api/catalog-badges`
**Description**: Lists catalog badges with filtering, search, and pagination. Returns only `active` badges for non-admin users.

**Authentication**: Required

**Query Parameters**:
- `category` (string, optional) - Filter by category: `technical`, `organizational`, `softskilled`
- `level` (string, optional) - Filter by level: `gold`, `silver`, `bronze`
- `q` (string, optional) - Full-text search on title and content
- `status` (string, optional, admin only) - Filter by status: `active`, `inactive` (default: `active`)
- `sort` (string, optional) - Sort field: `created_at`, `title` (default: `created_at`)
- `order` (string, optional) - Sort order: `asc`, `desc` (default: `desc`)
- `limit` (number, optional) - Page size (default: 20, max: 100)
- `offset` (number, optional) - Page offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "PostgreSQL Expert",
      "description": "Demonstrated advanced knowledge of PostgreSQL...",
      "category": "technical",
      "level": "gold",
      "status": "active",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-01-10T09:00:00Z",
      "deactivated_at": null,
      "version": 1,
      "metadata": {}
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Success Codes**:
- `200 OK` - Badges returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid query parameters
  ```json
  {
    "error": "invalid_parameter",
    "message": "Invalid category value. Must be one of: technical, organizational, softskilled"
  }
  ```

**Business Logic**:
- Non-admin users see only `status='active'` badges
- Admin users can filter by any status
- Full-text search uses GIN index on title

---

#### `GET /api/catalog-badges/:id`
**Description**: Retrieves a single catalog badge by ID.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Catalog badge ID

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL...",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": null,
  "version": 1,
  "metadata": {}
}
```

**Success Codes**:
- `200 OK` - Badge returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Badge not found
  ```json
  {
    "error": "not_found",
    "message": "Catalog badge not found"
  }
  ```

---

#### `POST /api/catalog-badges`
**Description**: Creates a new catalog badge (admin only).

**Authentication**: Required (admin only)

**Request Payload**:
```json
{
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL database administration and optimization",
  "category": "technical",
  "level": "gold",
  "metadata": {}
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge of PostgreSQL...",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-22T15:30:00Z",
  "deactivated_at": null,
  "version": 1,
  "metadata": {}
}
```

**Success Codes**:
- `201 Created` - Badge created

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
  ```json
  {
    "error": "forbidden",
    "message": "Admin access required"
  }
  ```
- `400 Bad Request` - Invalid request body
  ```json
  {
    "error": "validation_error",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      },
      {
        "field": "category",
        "message": "Category must be one of: technical, organizational, softskilled"
      }
    ]
  }
  ```

**Validation**:
- `title` - required, non-empty string, max 200 characters
- `description` - optional string, max 2000 characters
- `category` - required, enum: `technical`, `organizational`, `softskilled`
- `level` - required, enum: `gold`, `silver`, `bronze`
- `metadata` - optional JSON object

---

#### `PUT /api/catalog-badges/:id`
**Description**: Updates an existing catalog badge and increments version (admin only).

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Catalog badge ID

**Request Payload**:
```json
{
  "title": "PostgreSQL Expert (Updated)",
  "description": "Updated description...",
  "category": "technical",
  "level": "gold",
  "metadata": {}
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert (Updated)",
  "description": "Updated description...",
  "category": "technical",
  "level": "gold",
  "status": "active",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": null,
  "version": 2,
  "metadata": {}
}
```

**Success Codes**:
- `200 OK` - Badge updated

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Badge not found
- `400 Bad Request` - Invalid request body

**Business Logic**:
- Automatically increments `version` field
- Cannot change `status` via this endpoint (use deactivate endpoint)
- Existing badge applications reference the old version via `catalog_badge_version`

---

#### `POST /api/catalog-badges/:id/deactivate`
**Description**: Deactivates a catalog badge (admin only). Sets status to `inactive` and records timestamp.

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Catalog badge ID

**Request Payload**: None

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "PostgreSQL Expert",
  "description": "Demonstrated advanced knowledge...",
  "category": "technical",
  "level": "gold",
  "status": "inactive",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-10T09:00:00Z",
  "deactivated_at": "2025-01-22T16:00:00Z",
  "version": 2,
  "metadata": {}
}
```

**Success Codes**:
- `200 OK` - Badge deactivated

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Badge not found
- `409 Conflict` - Badge already inactive

**Business Logic**:
- Sets `status = 'inactive'`
- Sets `deactivated_at = NOW()`
- Deactivated badges excluded from catalog search for non-admin users
- Existing badge applications remain valid

---

### 2.3 Badge Application Endpoints

#### `GET /api/badge-applications`
**Description**: Lists badge applications with filtering and pagination. Users see only their own applications; admins see all.

**Authentication**: Required

**Query Parameters**:
- `status` (string, optional) - Filter by status: `draft`, `submitted`, `accepted`, `rejected`, `used_in_promotion`
- `applicant_id` (UUID, optional, admin only) - Filter by applicant
- `catalog_badge_id` (UUID, optional) - Filter by catalog badge
- `sort` (string, optional) - Sort field: `created_at`, `submitted_at` (default: `created_at`)
- `order` (string, optional) - Sort order: `asc`, `desc` (default: `desc`)
- `limit` (number, optional) - Page size (default: 20, max: 100)
- `offset` (number, optional) - Page offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440010",
      "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
      "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
      "catalog_badge_version": 1,
      "date_of_application": "2025-01-15",
      "date_of_fulfillment": "2025-01-20",
      "reason": "Led database optimization project that improved query performance by 40%",
      "status": "submitted",
      "submitted_at": "2025-01-21T10:00:00Z",
      "reviewed_by": null,
      "reviewed_at": null,
      "review_reason": null,
      "created_at": "2025-01-20T14:30:00Z",
      "updated_at": "2025-01-21T10:00:00Z",
      "catalog_badge": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "PostgreSQL Expert",
        "category": "technical",
        "level": "gold"
      }
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Success Codes**:
- `200 OK` - Applications returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid query parameters

**Business Logic**:
- Non-admin users: Filter automatically by `applicant_id = current_user.id`
- Admin users: Can filter by any applicant or see all
- Include catalog badge details in response

---

#### `GET /api/badge-applications/:id`
**Description**: Retrieves a single badge application. Users can only view their own; admins can view all.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Badge application ID

**Response**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project...",
  "status": "accepted",
  "submitted_at": "2025-01-21T10:00:00Z",
  "reviewed_by": "550e8400-e29b-41d4-a716-446655440002",
  "reviewed_at": "2025-01-22T09:30:00Z",
  "review_reason": "Well documented achievements",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-22T09:30:00Z",
  "catalog_badge": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "PostgreSQL Expert",
    "description": "Demonstrated advanced knowledge...",
    "category": "technical",
    "level": "gold",
    "version": 1
  },
  "applicant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "email": "john.doe@goodcompany.com"
  }
}
```

**Success Codes**:
- `200 OK` - Application returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not applicant and not admin
- `404 Not Found` - Application not found

---

#### `POST /api/badge-applications`
**Description**: Creates a new badge application in draft status.

**Authentication**: Required

**Request Payload**:
```json
{
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project that improved query performance by 40%"
}
```

**Response**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project...",
  "status": "draft",
  "submitted_at": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "review_reason": null,
  "created_at": "2025-01-22T15:45:00Z",
  "updated_at": "2025-01-22T15:45:00Z"
}
```

**Success Codes**:
- `201 Created` - Application created

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid request body
- `404 Not Found` - Catalog badge not found

**Validation**:
- `catalog_badge_id` - required, must exist and be active
- `date_of_application` - required, valid ISO date
- `date_of_fulfillment` - optional, valid ISO date, must be >= date_of_application
- `reason` - optional string, max 2000 characters

**Business Logic**:
- Sets `applicant_id = current_user.id` (from session)
- Sets `catalog_badge_version` from current catalog badge version
- Sets `status = 'draft'`

---

#### `PUT /api/badge-applications/:id`
**Description**: Updates a badge application. Only draft applications can be edited by owner.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Badge application ID

**Request Payload**:
```json
{
  "date_of_application": "2025-01-16",
  "date_of_fulfillment": "2025-01-21",
  "reason": "Updated reason with more details..."
}
```

**Response**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-16",
  "date_of_fulfillment": "2025-01-21",
  "reason": "Updated reason with more details...",
  "status": "draft",
  "submitted_at": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "review_reason": null,
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-22T16:00:00Z"
}
```

**Success Codes**:
- `200 OK` - Application updated

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not applicant or application is not in draft status
- `404 Not Found` - Application not found
- `400 Bad Request` - Invalid request body

**Business Logic**:
- Only editable if `status = 'draft'` and `applicant_id = current_user.id`
- Cannot change `catalog_badge_id`, `applicant_id`, or `status` via this endpoint
- Updates `updated_at` timestamp

---

#### `DELETE /api/badge-applications/:id`
**Description**: Deletes a badge application. Only draft applications can be deleted by owner.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Badge application ID

**Response**:
```json
{
  "message": "Badge application deleted successfully"
}
```

**Success Codes**:
- `200 OK` - Application deleted

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not applicant or application is not in draft status
- `404 Not Found` - Application not found

**Business Logic**:
- Only deletable if `status = 'draft'` and `applicant_id = current_user.id`

---

#### `POST /api/badge-applications/:id/submit`
**Description**: Submits a draft badge application for admin review. Transitions status from `draft` to `submitted`.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Badge application ID

**Request Payload**: None

**Response**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project...",
  "status": "submitted",
  "submitted_at": "2025-01-22T16:15:00Z",
  "reviewed_by": null,
  "reviewed_at": null,
  "review_reason": null,
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-22T16:15:00Z"
}
```

**Success Codes**:
- `200 OK` - Application submitted

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not applicant
- `404 Not Found` - Application not found
- `409 Conflict` - Application not in draft status
  ```json
  {
    "error": "invalid_status",
    "message": "Only draft applications can be submitted",
    "current_status": "submitted"
  }
  ```

**Business Logic**:
- Validates `status = 'draft'` and `applicant_id = current_user.id`
- Sets `status = 'submitted'`
- Sets `submitted_at = NOW()`
- Application becomes read-only for applicant

---

#### `POST /api/badge-applications/:id/accept`
**Description**: Accepts a submitted badge application (admin only). Transitions status to `accepted`.

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Badge application ID

**Request Payload**:
```json
{
  "review_reason": "Well documented achievements and clear impact"
}
```

**Response**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project...",
  "status": "accepted",
  "submitted_at": "2025-01-21T10:00:00Z",
  "reviewed_by": "550e8400-e29b-41d4-a716-446655440002",
  "reviewed_at": "2025-01-22T09:30:00Z",
  "review_reason": "Well documented achievements and clear impact",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-22T09:30:00Z"
}
```

**Success Codes**:
- `200 OK` - Application accepted

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Application not found
- `409 Conflict` - Application not in submitted status

**Validation**:
- `review_reason` - optional string, max 2000 characters

**Business Logic**:
- Validates `status = 'submitted'`
- Sets `status = 'accepted'`
- Sets `reviewed_by = current_user.id`
- Sets `reviewed_at = NOW()`
- Badge becomes available for promotion use

---

#### `POST /api/badge-applications/:id/reject`
**Description**: Rejects a submitted badge application (admin only). Transitions status to `rejected`.

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Badge application ID

**Request Payload**:
```json
{
  "review_reason": "Insufficient evidence provided for achievement"
}
```

**Response**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "applicant_id": "550e8400-e29b-41d4-a716-446655440000",
  "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
  "catalog_badge_version": 1,
  "date_of_application": "2025-01-15",
  "date_of_fulfillment": "2025-01-20",
  "reason": "Led database optimization project...",
  "status": "rejected",
  "submitted_at": "2025-01-21T10:00:00Z",
  "reviewed_by": "550e8400-e29b-41d4-a716-446655440002",
  "reviewed_at": "2025-01-22T09:30:00Z",
  "review_reason": "Insufficient evidence provided for achievement",
  "created_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-22T09:30:00Z"
}
```

**Success Codes**:
- `200 OK` - Application rejected

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Application not found
- `409 Conflict` - Application not in submitted status

**Validation**:
- `review_reason` - required string, non-empty, max 2000 characters

**Business Logic**:
- Validates `status = 'submitted'`
- Sets `status = 'rejected'`
- Sets `reviewed_by = current_user.id`
- Sets `reviewed_at = NOW()`

---

### 2.4 Promotion Template Endpoints

#### `GET /api/promotion-templates`
**Description**: Lists promotion templates with filtering and pagination.

**Authentication**: Required

**Query Parameters**:
- `path` (string, optional) - Filter by path: `technical`, `financial`, `management`
- `from_level` (string, optional) - Filter by source level
- `to_level` (string, optional) - Filter by target level
- `is_active` (boolean, optional) - Filter by active status (default: true)
- `sort` (string, optional) - Sort field: `created_at`, `name` (default: `name`)
- `order` (string, optional) - Sort order: `asc`, `desc` (default: `asc`)
- `limit` (number, optional) - Page size (default: 20, max: 100)
- `offset` (number, optional) - Page offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440020",
      "name": "S1 to S2 - Technical Path",
      "path": "technical",
      "from_level": "S1",
      "to_level": "S2",
      "rules": [
        {
          "category": "technical",
          "level": "silver",
          "count": 6
        },
        {
          "category": "any",
          "level": "gold",
          "count": 1
        }
      ],
      "is_active": true,
      "created_by": "550e8400-e29b-41d4-a716-446655440002",
      "created_at": "2025-01-05T10:00:00Z",
      "updated_at": "2025-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Success Codes**:
- `200 OK` - Templates returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid query parameters

---

#### `GET /api/promotion-templates/:id`
**Description**: Retrieves a single promotion template by ID.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion template ID

**Response**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440020",
  "name": "S1 to S2 - Technical Path",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "rules": [
    {
      "category": "technical",
      "level": "silver",
      "count": 6
    },
    {
      "category": "any",
      "level": "gold",
      "count": 1
    },
    {
      "category": "any",
      "level": "silver",
      "count": 4
    }
  ],
  "is_active": true,
  "created_by": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-01-05T10:00:00Z",
  "updated_at": "2025-01-05T10:00:00Z"
}
```

**Success Codes**:
- `200 OK` - Template returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Template not found

---

#### `POST /api/promotion-templates`
**Description**: Creates a new promotion template (admin only).

**Authentication**: Required (admin only)

**Request Payload**:
```json
{
  "name": "S1 to S2 - Technical Path",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "rules": [
    {
      "category": "technical",
      "level": "silver",
      "count": 6
    },
    {
      "category": "any",
      "level": "gold",
      "count": 1
    }
  ]
}
```

**Response**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440020",
  "name": "S1 to S2 - Technical Path",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "rules": [
    {
      "category": "technical",
      "level": "silver",
      "count": 6
    },
    {
      "category": "any",
      "level": "gold",
      "count": 1
    }
  ],
  "is_active": true,
  "created_by": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-01-22T17:00:00Z",
  "updated_at": "2025-01-22T17:00:00Z"
}
```

**Success Codes**:
- `201 Created` - Template created

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `400 Bad Request` - Invalid request body

**Validation**:
- `name` - required, non-empty string, max 200 characters
- `path` - required, enum: `technical`, `financial`, `management`
- `from_level` - required, valid position level (e.g., `S1`, `J2`, `M1`)
- `to_level` - required, valid position level, must be immediate next level from `from_level`
- `rules` - required, array of rule objects:
  - Each rule: `{ category: string, level: string, count: number }`
  - `category` - enum: `technical`, `organizational`, `softskilled`, `any`
  - `level` - enum: `gold`, `silver`, `bronze`
  - `count` - positive integer

**Business Logic**:
- Sets `created_by = current_user.id`
- Sets `is_active = true`
- Validates level progression using position levels configuration

---

#### `PUT /api/promotion-templates/:id`
**Description**: Updates an existing promotion template (admin only).

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Promotion template ID

**Request Payload**:
```json
{
  "name": "S1 to S2 - Technical Path (Updated)",
  "rules": [
    {
      "category": "technical",
      "level": "silver",
      "count": 7
    }
  ]
}
```

**Response**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440020",
  "name": "S1 to S2 - Technical Path (Updated)",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "rules": [
    {
      "category": "technical",
      "level": "silver",
      "count": 7
    }
  ],
  "is_active": true,
  "created_by": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-01-05T10:00:00Z",
  "updated_at": "2025-01-22T17:15:00Z"
}
```

**Success Codes**:
- `200 OK` - Template updated

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Template not found
- `400 Bad Request` - Invalid request body

**Business Logic**:
- Cannot change `path`, `from_level`, `to_level` (create new template instead)
- Updates `updated_at` timestamp

---

#### `POST /api/promotion-templates/:id/deactivate`
**Description**: Deactivates a promotion template (admin only). Sets `is_active = false`.

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Promotion template ID

**Request Payload**: None

**Response**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440020",
  "name": "S1 to S2 - Technical Path",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "rules": [
    {
      "category": "technical",
      "level": "silver",
      "count": 6
    },
    {
      "category": "any",
      "level": "gold",
      "count": 1
    }
  ],
  "is_active": false,
  "created_by": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-01-05T10:00:00Z",
  "updated_at": "2025-01-22T17:30:00Z"
}
```

**Success Codes**:
- `200 OK` - Template deactivated

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Template not found
- `409 Conflict` - Template already inactive

**Business Logic**:
- Sets `is_active = false`
- Updates `updated_at` timestamp
- Deactivated templates excluded from new promotion creation
- Existing promotions using this template remain valid

---

### 2.5 Promotion Endpoints

#### `GET /api/promotions`
**Description**: Lists promotions with filtering and pagination. Users see only their own; admins see all.

**Authentication**: Required

**Query Parameters**:
- `status` (string, optional) - Filter by status: `draft`, `submitted`, `approved`, `rejected`
- `created_by` (UUID, optional, admin only) - Filter by creator
- `path` (string, optional) - Filter by path
- `template_id` (UUID, optional) - Filter by template
- `sort` (string, optional) - Sort field: `created_at`, `submitted_at` (default: `created_at`)
- `order` (string, optional) - Sort order: `asc`, `desc` (default: `desc`)
- `limit` (number, optional) - Page size (default: 20, max: 100)
- `offset` (number, optional) - Page offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440030",
      "template_id": "750e8400-e29b-41d4-a716-446655440020",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "path": "technical",
      "from_level": "S1",
      "to_level": "S2",
      "status": "draft",
      "created_at": "2025-01-22T10:00:00Z",
      "submitted_at": null,
      "approved_at": null,
      "approved_by": null,
      "rejected_at": null,
      "rejected_by": null,
      "reject_reason": null,
      "executed": false,
      "badge_count": 5,
      "template": {
        "id": "750e8400-e29b-41d4-a716-446655440020",
        "name": "S1 to S2 - Technical Path"
      }
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Success Codes**:
- `200 OK` - Promotions returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid query parameters

**Business Logic**:
- Non-admin users: Filter automatically by `created_by = current_user.id`
- Include badge count and template summary

---

#### `GET /api/promotions/:id`
**Description**: Retrieves a single promotion with detailed badge application information.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "submitted",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T16:30:00Z",
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": false,
  "template": {
    "id": "750e8400-e29b-41d4-a716-446655440020",
    "name": "S1 to S2 - Technical Path",
    "rules": [
      {
        "category": "technical",
        "level": "silver",
        "count": 6
      }
    ]
  },
  "badge_applications": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440010",
      "catalog_badge_id": "550e8400-e29b-41d4-a716-446655440001",
      "catalog_badge": {
        "title": "PostgreSQL Expert",
        "category": "technical",
        "level": "silver"
      },
      "date_of_fulfillment": "2025-01-20",
      "status": "used_in_promotion"
    }
  ],
  "creator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "email": "john.doe@goodcompany.com"
  }
}
```

**Success Codes**:
- `200 OK` - Promotion returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not creator and not admin
- `404 Not Found` - Promotion not found

---

#### `POST /api/promotions`
**Description**: Creates a new promotion in draft status.

**Authentication**: Required

**Request Payload**:
```json
{
  "template_id": "750e8400-e29b-41d4-a716-446655440020"
}
```

**Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "draft",
  "created_at": "2025-01-22T18:00:00Z",
  "submitted_at": null,
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": false
}
```

**Success Codes**:
- `201 Created` - Promotion created

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid template_id
- `404 Not Found` - Template not found or not active

**Validation**:
- `template_id` - required, must exist and be active

**Business Logic**:
- Sets `created_by = current_user.id`
- Copies `path`, `from_level`, `to_level` from template for fast queries
- Sets `status = 'draft'`
- Validates user's current level matches template's `from_level` (future enhancement)

---

#### `DELETE /api/promotions/:id`
**Description**: Deletes a promotion. Only draft promotions can be deleted by owner.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Response**:
```json
{
  "message": "Promotion deleted successfully"
}
```

**Success Codes**:
- `200 OK` - Promotion deleted

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not creator or promotion is not in draft status
- `404 Not Found` - Promotion not found

**Business Logic**:
- Only deletable if `status = 'draft'` and `created_by = current_user.id`
- Cascades delete to `promotion_badges` (unlocks badge applications)

---

#### `POST /api/promotions/:id/badges`
**Description**: Adds badge applications to a promotion draft. Creates reservation.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Request Payload**:
```json
{
  "badge_application_ids": [
    "650e8400-e29b-41d4-a716-446655440010",
    "650e8400-e29b-41d4-a716-446655440011"
  ]
}
```

**Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "status": "draft",
  "badge_applications": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440010",
      "catalog_badge": {
        "title": "PostgreSQL Expert",
        "category": "technical",
        "level": "silver"
      }
    }
  ],
  "message": "2 badge(s) added successfully"
}
```

**Success Codes**:
- `200 OK` - Badges added

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not creator or promotion is not in draft status
- `404 Not Found` - Promotion not found
- `400 Bad Request` - Badge application not found or not accepted
  ```json
  {
    "error": "invalid_badge_application",
    "message": "Badge application 650e8400-e29b-41d4-a716-446655440010 is not in accepted status",
    "badge_application_id": "650e8400-e29b-41d4-a716-446655440010"
  }
  ```
- `409 Conflict` - Badge already reserved by another promotion
  ```json
  {
    "error": "reservation_conflict",
    "message": "Badge application is already assigned to another promotion",
    "conflict_type": "badge_already_reserved",
    "badge_application_id": "650e8400-e29b-41d4-a716-446655440010",
    "owning_promotion_id": "850e8400-e29b-41d4-a716-446655440031"
  }
  ```

**Validation**:
- `badge_application_ids` - required, non-empty array of UUIDs
- Each badge application must exist
- Each badge application must have `status = 'accepted'`
- Each badge application must not be reserved (checked via unique constraint)

**Business Logic**:
- Creates `promotion_badges` records with `consumed = false`
- Sets `assigned_by = current_user.id`
- Updates badge application `status = 'used_in_promotion'` (or keep as accepted until promotion submitted)
- Catches unique constraint violation (SQLSTATE 23505) and returns structured 409 error

---

#### `DELETE /api/promotions/:id/badges`
**Description**: Removes badge applications from a promotion draft. Releases reservation.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Request Payload**:
```json
{
  "badge_application_ids": [
    "650e8400-e29b-41d4-a716-446655440010"
  ]
}
```

**Response**:
```json
{
  "message": "1 badge(s) removed successfully"
}
```

**Success Codes**:
- `200 OK` - Badges removed

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not creator or promotion is not in draft status
- `404 Not Found` - Promotion or badge application not found

**Business Logic**:
- Deletes `promotion_badges` records
- Reverts badge application status from `used_in_promotion` to `accepted`
- Only allowed if `promotion.status = 'draft'`

---

#### `GET /api/promotions/:id/validation`
**Description**: Validates promotion against template requirements and returns eligibility status.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Response**:
```json
{
  "promotion_id": "850e8400-e29b-41d4-a716-446655440030",
  "is_valid": false,
  "requirements": [
    {
      "category": "technical",
      "level": "silver",
      "required": 6,
      "current": 4,
      "satisfied": false
    },
    {
      "category": "any",
      "level": "gold",
      "required": 1,
      "current": 0,
      "satisfied": false
    },
    {
      "category": "any",
      "level": "silver",
      "required": 4,
      "current": 4,
      "satisfied": true
    }
  ],
  "missing": [
    {
      "category": "technical",
      "level": "silver",
      "count": 2
    },
    {
      "category": "any",
      "level": "gold",
      "count": 1
    }
  ]
}
```

**Success Codes**:
- `200 OK` - Validation result returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not creator and not admin
- `404 Not Found` - Promotion not found

**Business Logic**:
- Counts badge applications by category and level
- Compares against template rules
- Returns exact-match validation (no level equivalence)
- Used for real-time UI preview

---

#### `POST /api/promotions/:id/submit`
**Description**: Submits a promotion for admin review. Validates template compliance and finalizes reservation.

**Authentication**: Required

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Request Payload**: None

**Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "submitted",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T18:30:00Z",
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": false
}
```

**Success Codes**:
- `200 OK` - Promotion submitted

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not creator
- `404 Not Found` - Promotion not found
- `409 Conflict` - Promotion not in draft status or validation failed
  ```json
  {
    "error": "validation_failed",
    "message": "Promotion does not meet template requirements",
    "missing": [
      {
        "category": "technical",
        "level": "silver",
        "count": 2
      }
    ]
  }
  ```

**Business Logic**:
- Validates `status = 'draft'` and `created_by = current_user.id`
- Performs exact-match template validation
- Sets `status = 'submitted'`
- Sets `submitted_at = NOW()`
- Updates all associated badge applications to `status = 'used_in_promotion'`
- Promotion becomes read-only for creator

---

#### `POST /api/promotions/:id/approve`
**Description**: Approves a submitted promotion (admin only). Consumes badge reservations.

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Request Payload**: None

**Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "approved",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T18:30:00Z",
  "approved_at": "2025-01-23T09:00:00Z",
  "approved_by": "550e8400-e29b-41d4-a716-446655440002",
  "rejected_at": null,
  "rejected_by": null,
  "reject_reason": null,
  "executed": true
}
```

**Success Codes**:
- `200 OK` - Promotion approved

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Promotion not found
- `409 Conflict` - Promotion not in submitted status

**Business Logic**:
- Validates `status = 'submitted'`
- Sets `status = 'approved'`
- Sets `approved_by = current_user.id`
- Sets `approved_at = NOW()`
- Sets `executed = true` (MVP: approval implies execution)
- Sets `consumed = true` on all `promotion_badges` records
- Badge applications remain `status = 'used_in_promotion'` (cannot be reused)

---

#### `POST /api/promotions/:id/reject`
**Description**: Rejects a submitted promotion (admin only). Unlocks badge reservations.

**Authentication**: Required (admin only)

**Path Parameters**:
- `id` (UUID, required) - Promotion ID

**Request Payload**:
```json
{
  "reject_reason": "Insufficient evidence for technical leadership"
}
```

**Response**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440030",
  "template_id": "750e8400-e29b-41d4-a716-446655440020",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "path": "technical",
  "from_level": "S1",
  "to_level": "S2",
  "status": "rejected",
  "created_at": "2025-01-22T10:00:00Z",
  "submitted_at": "2025-01-22T18:30:00Z",
  "approved_at": null,
  "approved_by": null,
  "rejected_at": "2025-01-23T09:00:00Z",
  "rejected_by": "550e8400-e29b-41d4-a716-446655440002",
  "reject_reason": "Insufficient evidence for technical leadership",
  "executed": false
}
```

**Success Codes**:
- `200 OK` - Promotion rejected

**Error Codes**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not admin
- `404 Not Found` - Promotion not found
- `409 Conflict` - Promotion not in submitted status

**Validation**:
- `reject_reason` - required string, non-empty, max 2000 characters

**Business Logic**:
- Validates `status = 'submitted'`
- Sets `status = 'rejected'`
- Sets `rejected_by = current_user.id`
- Sets `rejected_at = NOW()`
- Deletes `promotion_badges` records (or sets `consumed = false`)
- Reverts badge application `status` from `used_in_promotion` to `accepted` (unlocks badges)

---

### 2.6 Position Levels Endpoint

#### `GET /api/position-levels`
**Description**: Returns position levels configuration (read-only from deployed config file).

**Authentication**: Required

**Query Parameters**: None

**Response**:
```json
{
  "positions": {
    "technical": {
      "J1": {
        "next_level": "J2",
        "required_badges": {
          "technical": [
            { "level": "bronze", "count": 3 }
          ]
        }
      },
      "J2": {
        "next_level": "S1",
        "required_badges": {
          "technical": [
            { "level": "silver", "count": 4 }
          ],
          "organizational": [
            { "level": "bronze", "count": 2 }
          ]
        }
      },
      "S1": {
        "next_level": "S2",
        "required_badges": {
          "technical": [
            { "level": "silver", "count": 6 }
          ],
          "any": [
            { "level": "gold", "count": 1 }
          ]
        }
      }
    },
    "financial": {
      "J1": {
        "next_level": "J2",
        "required_badges": {}
      }
    },
    "management": {
      "M1": {
        "next_level": "M2",
        "required_badges": {}
      }
    }
  }
}
```

**Success Codes**:
- `200 OK` - Position levels returned

**Error Codes**:
- `401 Unauthorized` - Not authenticated

**Business Logic**:
- Reads from static configuration file deployed with application
- Used for validating promotion template creation
- Used for level progression validation

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Method**: Google Workspace SSO (OAuth 2.0 / OIDC)

**Implementation**:
1. **OAuth Flow**:
   - User clicks "Sign in with Google" → redirects to `/api/auth/google`
   - Server redirects to Google OAuth consent screen
   - User authenticates and consents
   - Google redirects to `/api/auth/callback?code=...&state=...`
   - Server exchanges code for tokens and retrieves user profile
   - Server validates email domain (e.g., `@goodcompany.com`)
   - Server creates/updates user record in `users` table
   - Server creates session (JWT or cookie-based)

2. **Session Management**:
   - **Option A - JWT**: Issue JWT with claims: `{ user_id, email, is_admin, google_sub }`
     - Store in httpOnly, secure cookie
     - Validate signature on every request
     - Short expiry (1 hour) with refresh token

   - **Option B - Supabase Auth**: Leverage Supabase Auth with Google provider
     - Configure Google OAuth in Supabase
     - Supabase handles token management
     - Use Supabase SDK to check session on server

3. **Domain Restriction**:
   - Extract email from OAuth token
   - Validate: `email.endsWith('@goodcompany.com')`
   - Reject with 401 if domain doesn't match

4. **Admin Seeding**:
   - Seed initial admin accounts via database migration
   - Set `is_admin = true` for specific emails in `users` table

### 3.2 Authorization

**Role-Based Access Control (RBAC)**:

| Endpoint Pattern | Admin | Standard User |
|------------------|-------|---------------|
| `GET /api/me` | ✓ | ✓ |
| `GET /api/catalog-badges` | ✓ (all statuses) | ✓ (active only) |
| `POST /api/catalog-badges` | ✓ | ✗ |
| `PUT /api/catalog-badges/:id` | ✓ | ✗ |
| `POST /api/catalog-badges/:id/deactivate` | ✓ | ✗ |
| `GET /api/badge-applications` | ✓ (all users) | ✓ (own only) |
| `POST /api/badge-applications` | ✓ | ✓ |
| `PUT /api/badge-applications/:id` | ✗ | ✓ (own draft only) |
| `POST /api/badge-applications/:id/submit` | ✗ | ✓ (own only) |
| `POST /api/badge-applications/:id/accept` | ✓ | ✗ |
| `POST /api/badge-applications/:id/reject` | ✓ | ✗ |
| `GET /api/promotion-templates` | ✓ | ✓ |
| `POST /api/promotion-templates` | ✓ | ✗ |
| `PUT /api/promotion-templates/:id` | ✓ | ✗ |
| `POST /api/promotion-templates/:id/deactivate` | ✓ | ✗ |
| `GET /api/promotions` | ✓ (all users) | ✓ (own only) |
| `POST /api/promotions` | ✓ | ✓ |
| `DELETE /api/promotions/:id` | ✗ | ✓ (own draft only) |
| `POST /api/promotions/:id/badges` | ✗ | ✓ (own draft only) |
| `POST /api/promotions/:id/submit` | ✗ | ✓ (own only) |
| `POST /api/promotions/:id/approve` | ✓ | ✗ |
| `POST /api/promotions/:id/reject` | ✓ | ✗ |

**Implementation**:
- Middleware checks `current_user.is_admin` from session
- For user-scoped resources, filter by `user_id` or check ownership
- Return `403 Forbidden` if user lacks permission

**Row-Level Security (RLS)**:
- Optionally implement PostgreSQL RLS policies (see db-plan.md)
- Set session variables: `app.current_user_id`, `app.is_admin`
- Policies enforce data isolation at database level

---

## 4. Validation and Business Logic

### 4.1 Validation Conditions by Resource

#### Catalog Badges
- `title`: required, non-empty, max 200 chars
- `description`: optional, max 2000 chars
- `category`: required, enum: `technical`, `organizational`, `softskilled`
- `level`: required, enum: `gold`, `silver`, `bronze`
- `status`: enum: `active`, `inactive` (database constraint)
- **Business Rule**: Deactivated badges cannot be used for new applications

#### Badge Applications
- `catalog_badge_id`: required, must reference active badge
- `date_of_application`: required, valid ISO date
- `date_of_fulfillment`: optional, valid ISO date, >= `date_of_application`
- `reason`: optional, max 2000 chars
- `status`: enum: `draft`, `submitted`, `accepted`, `rejected`, `used_in_promotion` (database constraint)
- **Status Transitions**:
  - `draft` → `submitted` (user)
  - `submitted` → `accepted` (admin)
  - `submitted` → `rejected` (admin)
  - `accepted` → `used_in_promotion` (when added to promotion)
- **Business Rules**:
  - Only `draft` applications editable by owner
  - Only `submitted` applications reviewable by admin
  - Only `accepted` applications can be added to promotions
  - `catalog_badge_version` snapshot preserved on creation

#### Promotion Templates
- `name`: required, non-empty, max 200 chars
- `path`: required, enum: `technical`, `financial`, `management`
- `from_level`: required, valid position level
- `to_level`: required, valid position level, must be immediate next level
- `rules`: required, array of `{ category, level, count }`
  - `category`: enum: `technical`, `organizational`, `softskilled`, `any`
  - `level`: enum: `gold`, `silver`, `bronze`
  - `count`: positive integer
- **Business Rules**:
  - Level progression validated against position levels config
  - `any` category matches badges of any category

#### Promotions
- `template_id`: required, must reference active template
- `status`: enum: `draft`, `submitted`, `approved`, `rejected` (database constraint)
- **Status Transitions**:
  - `draft` → `submitted` (user, after validation)
  - `submitted` → `approved` (admin)
  - `submitted` → `rejected` (admin)
- **Business Rules**:
  - User's current level must match template's `from_level` (future)
  - Only immediate next level promotions allowed
  - Exact-match template validation required for submission
  - Badge reservations enforced via unique constraint
  - Approval consumes badges (cannot be reused)
  - Rejection unlocks badges

### 4.2 Business Logic Implementation

#### Badge Reservation (Optimistic Concurrency)
**Implementation**:
1. When adding badge to promotion:
   - Insert into `promotion_badges` with `consumed = false`
   - Unique partial index: `UNIQUE (badge_application_id) WHERE consumed = false`
2. If constraint violated (SQLSTATE 23505):
   - Catch exception
   - Query to find `owning_promotion_id`
   - Return HTTP 409 with structured error:
     ```json
     {
       "error": "reservation_conflict",
       "conflict_type": "badge_already_reserved",
       "badge_application_id": "...",
       "owning_promotion_id": "..."
     }
     ```
3. UI displays modal with link to owning promotion

#### Template Validation (Exact-Match)
**Algorithm**:
```
For each rule in template.rules:
  Count badges in promotion where:
    - category matches (or rule.category = 'any')
    - level matches exactly
  If count < rule.count:
    Add to missing list
Return is_valid = (missing list is empty)
```

**No Level Equivalence**:
- Gold badge does NOT satisfy silver requirement
- Silver badge does NOT satisfy bronze requirement

**Implementation**:
- Perform validation on `GET /api/promotions/:id/validation` (real-time preview)
- Perform validation on `POST /api/promotions/:id/submit` (server-side check)
- Reject submission if validation fails

#### Level Progression Validation
**Implementation**:
1. Read position levels config file
2. For given `path` and `from_level`:
   - Check `positions[path][from_level].next_level`
   - Validate `to_level` matches `next_level`
3. Reject if levels are not sequential

#### Approval/Rejection Logic
**On Approval**:
- Set `promotion.status = 'approved'`
- Set `promotion.approved_by`, `approved_at`
- Set `promotion.executed = true`
- Update all `promotion_badges.consumed = true`
- Badge applications remain `status = 'used_in_promotion'`

**On Rejection**:
- Set `promotion.status = 'rejected'`
- Set `promotion.rejected_by`, `rejected_at`, `reject_reason`
- Delete `promotion_badges` records (or set `consumed = false`)
- Revert badge applications: `status = 'accepted'`

#### Catalog Badge Versioning
**Implementation**:
- On `PUT /api/catalog-badges/:id`:
  - Increment `version` field
- On `POST /api/badge-applications`:
  - Store `catalog_badge_version = catalog_badges.version`
- Badge applications always reference specific version
- Historical references preserved even if badge definition changes

---

## 5. Error Handling

### 5.1 Standard Error Response Format
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {} // Optional, for validation errors
}
```

### 5.2 Common HTTP Status Codes
- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST creating resource
- `400 Bad Request` - Validation error, malformed request
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Business logic conflict (reservation, status transition)
- `500 Internal Server Error` - Unexpected server error

### 5.3 Specific Error Scenarios

**Domain Not Allowed** (401):
```json
{
  "error": "unauthorized",
  "message": "Email domain @example.com is not allowed. Please use your company email."
}
```

**Admin Required** (403):
```json
{
  "error": "forbidden",
  "message": "Admin access required"
}
```

**Validation Failed** (400):
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

**Reservation Conflict** (409):
```json
{
  "error": "reservation_conflict",
  "message": "Badge application is already assigned to another promotion",
  "conflict_type": "badge_already_reserved",
  "badge_application_id": "650e8400-e29b-41d4-a716-446655440010",
  "owning_promotion_id": "850e8400-e29b-41d4-a716-446655440031"
}
```

**Invalid Status Transition** (409):
```json
{
  "error": "invalid_status",
  "message": "Only draft applications can be submitted",
  "current_status": "submitted"
}
```

**Template Validation Failed** (409):
```json
{
  "error": "validation_failed",
  "message": "Promotion does not meet template requirements",
  "missing": [
    {
      "category": "technical",
      "level": "silver",
      "count": 2
    }
  ]
}
```

---

## 6. Additional Considerations

### 6.1 Pagination
- Use `limit` and `offset` for pagination
- Default: `limit=20`, max: `limit=100`
- Return `pagination` object in list responses:
  ```json
  {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
  ```

### 6.2 Filtering and Sorting
- Query parameters for filtering: `?status=draft&category=technical`
- Query parameter for sorting: `?sort=created_at&order=desc`
- Default sorting varies by resource (usually `created_at desc`)

### 6.3 Logging and Monitoring
**Events to Log**:
- Auth failures (invalid domain, OAuth errors)
- Reservation conflicts (409 responses)
- Admin actions (approve, reject)
- Status transitions

**Log Format**:
```json
{
  "timestamp": "2025-01-22T18:30:00Z",
  "event_type": "reservation.conflict",
  "actor_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "badge_application_id": "...",
    "owning_promotion_id": "..."
  }
}
```

**Storage**:
- Write to `audit_logs` table for auth failures and conflicts
- Use application logging framework for general logs

### 6.4 Rate Limiting
- Implement rate limiting on authentication endpoints (prevent brute force)
- Consider per-user rate limits on write operations
- Use standard HTTP 429 response for rate limit exceeded

### 6.5 CORS Configuration
- Allow requests from frontend domain (e.g., `https://badger.goodcompany.com`)
- Set appropriate CORS headers for API endpoints

### 6.6 API Versioning
- MVP uses unversioned endpoints (`/api/...`)
- Future: introduce versioning (`/api/v1/...`, `/api/v2/...`)

---

## 7. Summary

This API plan provides a comprehensive REST API design for the Badger MVP, covering:

- **8 main resources** mapped to database tables
- **40+ endpoints** covering authentication, CRUD operations, and business workflows
- **Role-based access control** with admin and standard user roles
- **Optimistic concurrency control** for badge reservations
- **Exact-match template validation** for promotions
- **Comprehensive error handling** with structured conflict responses
- **Status transition workflows** for badge applications and promotions
- **Domain-restricted SSO** via Google Workspace

The API design aligns with:
- Database schema constraints and indexes
- PRD functional requirements and user stories
- Tech stack (Astro, React, Supabase)
- RESTful best practices

All business logic, validation rules, and authorization requirements from the PRD and database schema are implemented through appropriate endpoints and validation logic.
