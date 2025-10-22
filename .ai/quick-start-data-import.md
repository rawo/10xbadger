# Quick Start: Import Sample Data

This guide helps you quickly set up sample data for testing the Catalog Badges API.

## 📦 Sample Data Files

- **`users_sample.csv`** - 1 admin user
- **`catalog_badges_samples.csv`** - 3 catalog badges (technical, organizational, soft-skilled)

## ⚡ Quick Import Steps

### Step 1: Start Supabase
```bash
npx supabase start
```

### Step 2: Open Supabase Studio
Open in browser: http://localhost:54323

### Step 3: Import User (Do This First!)
1. Go to **Table Editor** → `users` table
2. Click **Insert** → **Insert from CSV**
3. Upload `users_sample.csv`
4. Click **Import**
5. Verify: You should see "Admin User" (admin@goodcompany.com)

### Step 4: Import Badges (Do This Second!)
1. Go to **Table Editor** → `catalog_badges` table
2. Click **Insert** → **Insert from CSV**
3. Upload `catalog_badges_samples.csv`
4. Click **Import**
5. Verify: You should see 3 badges

⚠️ **Order matters!** Import user first, then badges (badges reference the user ID).

## 🧪 Test the API

Start the dev server:
```bash
pnpm dev
```

Test basic endpoint:
```bash
curl "http://localhost:3000/api/catalog-badges"
```

Expected response: 3 badges in JSON format

## 📊 What You Get

### Admin User
- **Email**: admin@goodcompany.com
- **Name**: Admin User
- **Admin**: Yes ✅
- **ID**: 550e8400-e29b-41d4-a716-446655440100

### 3 Sample Badges

| Badge | Category | Level | Status |
|-------|----------|-------|--------|
| PostgreSQL Expert | Technical | Gold 🏆 | Active |
| Team Leadership | Organizational | Silver 🥈 | Active |
| Effective Communication | Soft Skilled | Bronze 🥉 | Active |

## 🎯 Test Scenarios

### Test 1: Get All Badges
```bash
curl "http://localhost:3000/api/catalog-badges"
```
Expected: All 3 badges

### Test 2: Filter by Category
```bash
curl "http://localhost:3000/api/catalog-badges?category=technical"
```
Expected: PostgreSQL Expert badge only

### Test 3: Filter by Level
```bash
curl "http://localhost:3000/api/catalog-badges?level=gold"
```
Expected: PostgreSQL Expert badge only

### Test 4: Search
```bash
curl "http://localhost:3000/api/catalog-badges?q=Communication"
```
Expected: Effective Communication badge

### Test 5: Sort by Title
```bash
curl "http://localhost:3000/api/catalog-badges?sort=title&order=asc"
```
Expected: Badges sorted alphabetically

### Test 6: Pagination
```bash
curl "http://localhost:3000/api/catalog-badges?limit=2&offset=0"
```
Expected: First 2 badges with pagination metadata

### Test 7: Admin Feature (Requires Code Change)
1. Open `src/pages/api/catalog-badges.ts`
2. Change `const isAdmin = false;` to `const isAdmin = true;`
3. Restart server
4. Test:
```bash
curl "http://localhost:3000/api/catalog-badges?status=active"
```
Expected: 200 OK (instead of 403)

## 🔧 Alternative: SQL Import

If you prefer SQL, connect to the database:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

Then run:
```sql
-- Import user
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

-- Import badges (see .ai/import-sample-badges.md for full SQL)
```

## 📚 Detailed Documentation

For more details, see:
- **User Import**: `.ai/import-sample-user.md`
- **Badges Import**: `.ai/import-sample-badges.md`
- **API Testing**: `.ai/catalog-badges-testing-guide.md`

## 🐛 Troubleshooting

### Error: Foreign Key Constraint on created_by
**Solution**: Import the user FIRST, then the badges

### Error: Duplicate Key
**Solution**: Delete existing data first:
```sql
DELETE FROM catalog_badges;
DELETE FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440100';
```
Then re-import in order: users → badges

### Error: Cannot connect to Supabase
**Solution**: Make sure Supabase is running:
```bash
npx supabase start
```

### API returns empty array
**Solution**:
1. Verify data was imported (check in Supabase Studio)
2. Check that badges have `status = 'active'`
3. Check server logs for errors

## ✅ Success Checklist

After import, you should be able to:

- [ ] View all 3 badges via API
- [ ] Filter by category (technical, organizational, softskilled)
- [ ] Filter by level (gold, silver, bronze)
- [ ] Search by title
- [ ] Sort by title or created_at
- [ ] Use pagination (limit/offset)
- [ ] See proper pagination metadata (total, has_more)
- [ ] Get validation errors for invalid params

## 🎉 You're Ready!

Your development environment now has:
✅ 1 admin user
✅ 3 sample badges
✅ Fully functional API endpoint
✅ Test data for all scenarios

Start building! 🚀
