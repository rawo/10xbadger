# Importing Sample Admin User

## Sample Data Overview

The file `users_sample.csv` contains 1 admin user for development and testing:

### Admin User Details
- **ID**: `550e8400-e29b-41d4-a716-446655440100`
- **Email**: admin@goodcompany.com
- **Display Name**: Admin User
- **Is Admin**: `true` ✅
- **Google Sub**: `google-oauth-sub-admin-123456`
- **Created At**: 2025-01-01T08:00:00Z
- **Last Seen At**: 2025-01-22T15:30:00Z

**Important**: This user ID matches the `created_by` field in the sample catalog badges, so import this user **before** importing the badges to avoid foreign key constraint errors.

## Why This User?

This admin user is needed to:
1. ✅ Satisfy foreign key constraint for `catalog_badges.created_by`
2. ✅ Test admin-only features in the API
3. ✅ Simulate a real user scenario in development

## How to Import to Supabase

### Method 1: Supabase Studio (GUI)

1. **Start Supabase** (if using local):
   ```bash
   npx supabase start
   ```

2. **Open Supabase Studio**:
   - Local: http://localhost:54323
   - Or use your hosted Supabase dashboard

3. **Navigate to Table Editor**:
   - Go to "Table Editor" in the left sidebar
   - Select the `users` table

4. **Import CSV**:
   - Click the "Insert" dropdown button
   - Select "Insert from CSV"
   - Upload `users_sample.csv`
   - Verify column mapping is correct
   - Click "Import"

### Method 2: SQL Command (psql)

1. **Connect to Supabase database**:
   ```bash
   # Local Supabase
   psql postgresql://postgres:postgres@localhost:54322/postgres

   # Or get connection string from Supabase dashboard
   ```

2. **Copy CSV to database**:
   ```sql
   COPY users (id, email, display_name, is_admin, google_sub, created_at, last_seen_at)
   FROM '/path/to/users_sample.csv'
   DELIMITER ','
   CSV HEADER;
   ```

### Method 3: Direct SQL Insert

```sql
INSERT INTO users (id, email, display_name, is_admin, google_sub, created_at, last_seen_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440100',
  'admin@goodcompany.com',
  'Admin User',
  true,
  'google-oauth-sub-admin-123456',
  '2025-01-01T08:00:00Z',
  '2025-01-22T15:30:00Z'
);
```

### Method 4: Using Supabase JavaScript Client

If you want to insert programmatically:

```javascript
import { supabaseClient } from './src/db/supabase.client';

const adminUser = {
  id: '550e8400-e29b-41d4-a716-446655440100',
  email: 'admin@goodcompany.com',
  display_name: 'Admin User',
  is_admin: true,
  google_sub: 'google-oauth-sub-admin-123456',
  created_at: '2025-01-01T08:00:00Z',
  last_seen_at: '2025-01-22T15:30:00Z'
};

const { data, error } = await supabaseClient
  .from('users')
  .insert([adminUser]);

if (error) {
  console.error('Error inserting admin user:', error);
} else {
  console.log('Successfully inserted admin user:', data);
}
```

## Verification

After import, verify the user was created correctly:

### Via SQL:
```sql
-- Check if user exists
SELECT * FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440100';

-- Verify admin status
SELECT email, display_name, is_admin FROM users WHERE is_admin = true;

-- Check all users
SELECT id, email, display_name, is_admin FROM users;
```

### Via Supabase Studio:
1. Go to "Table Editor" → `users` table
2. Look for "admin@goodcompany.com"
3. Verify `is_admin` column shows `true`

## Testing Admin Features

With this admin user imported, you can now test admin features in the API:

### Enable Admin Mode in Code
1. Open `src/pages/api/catalog-badges.ts`
2. Change line 40: `const isAdmin = false;` to `const isAdmin = true;`
3. Restart dev server: `pnpm dev`

### Test Admin-Only Features
```bash
# Test filtering by inactive status (admin only)
curl "http://localhost:3000/api/catalog-badges?status=inactive"

# Expected: 200 OK with inactive badges (instead of 403 Forbidden)
```

### Revert to Non-Admin Mode
1. Change `const isAdmin = true;` back to `const isAdmin = false;`
2. Restart dev server

## Import Order

⚠️ **Important**: Follow this order to avoid foreign key errors:

1. **First**: Import `users_sample.csv` (this file)
2. **Then**: Import `catalog_badges_samples.csv`

The badges reference this user's ID in the `created_by` field, so the user must exist first.

## Customization

You can modify the user details as needed:

### Email Domain
Change `admin@goodcompany.com` to match your company domain:
- `admin@yourcompany.com`
- `dev@example.com`
- Any valid email format

### Display Name
Change `Admin User` to any name:
- Your actual name
- `System Administrator`
- `Dev Admin`
- etc.

### Admin Status
- Keep `is_admin: true` for admin features
- Change to `false` for regular user testing

### Google Sub
The `google_sub` field is used for Google OAuth authentication:
- In development, this can be any unique string
- In production, this will be provided by Google OAuth
- Format: typically `google-oauth-sub-[unique-id]`

## Creating Additional Users

To create more users (for testing), follow this template:

```csv
id,email,display_name,is_admin,google_sub,created_at,last_seen_at
[NEW-UUID],[email],[name],[true/false],[google-sub],[ISO Timestamp],[ISO Timestamp or empty]
```

Example for a non-admin user:
```csv
550e8400-e29b-41d4-a716-446655440101,engineer@goodcompany.com,John Engineer,false,google-oauth-sub-engineer-789012,2025-01-05T10:00:00Z,2025-01-22T14:00:00Z
```

### Generate UUIDs
- Online: https://www.uuidgenerator.net/
- Command line: `uuidgen` (Mac/Linux) or `New-Guid` (PowerShell)
- Node.js: `crypto.randomUUID()`

## Troubleshooting

### Issue: Duplicate Key Error

If the user already exists:

**Option 1**: Delete existing user first
```sql
DELETE FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440100';
```

**Option 2**: Update existing user instead
```sql
UPDATE users
SET
  email = 'admin@goodcompany.com',
  display_name = 'Admin User',
  is_admin = true,
  google_sub = 'google-oauth-sub-admin-123456'
WHERE id = '550e8400-e29b-41d4-a716-446655440100';
```

**Option 3**: Use a different UUID
- Generate a new UUID
- Update both `users_sample.csv` and `catalog_badges_samples.csv` with the new ID

### Issue: Email Already Exists

If the email is already in use:

```sql
-- Check existing emails
SELECT id, email FROM users WHERE email = 'admin@goodcompany.com';

-- Either delete the existing user or change the email in the CSV
```

### Issue: Authentication Integration

**Note**: This user is created in the `users` table directly, not via Supabase Auth.

For full authentication integration:
1. This approach works for development/testing
2. In production, users should be created via Supabase Auth
3. The `users` table can sync with Supabase Auth via database triggers

## Database Schema Notes

From `database.types.ts`, the users table has:

**Required Fields**:
- ✅ `email` (string, NOT NULL, UNIQUE)
- ✅ `display_name` (string, NOT NULL)
- ✅ `google_sub` (string, NOT NULL, UNIQUE)

**Optional Fields**:
- `id` (UUID, auto-generated if not provided)
- `is_admin` (boolean, defaults to `false`)
- `created_at` (timestamp, auto-generated if not provided)
- `last_seen_at` (timestamp, nullable)

**Constraints**:
- Email must be unique
- `google_sub` must be unique
- No relationships/foreign keys to other tables

## Security Considerations

⚠️ **For Development Only**

This sample user is for **development and testing only**. Before deploying to production:

1. **Remove sample users** with predictable credentials
2. **Use real Google OAuth** for authentication
3. **Set proper admin permissions** via your authentication system
4. **Don't hardcode** user credentials in code or version control
5. **Use environment variables** for sensitive configuration

## Next Steps

After importing the admin user:

1. ✅ Import catalog badges: See `.ai/import-sample-badges.md`
2. ✅ Test the API endpoint: `curl "http://localhost:3000/api/catalog-badges"`
3. ✅ Test admin features: Change `isAdmin` to `true` in code
4. ✅ Create additional users as needed for testing

---

**Ready to import!** 🚀

This admin user will own all the sample badges and enable you to test the full functionality of the catalog badges API.
