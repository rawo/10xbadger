# Importing Sample Catalog Badges

## Sample Data Overview

The file `catalog_badges_samples.csv` contains 3 sample badge entries for development and testing:

### Badge 1: PostgreSQL Expert (Technical - Gold)
- **ID**: `550e8400-e29b-41d4-a716-446655440001`
- **Category**: technical
- **Level**: gold
- **Status**: active
- **Description**: Advanced PostgreSQL database administration and optimization skills
- **Metadata**: Includes skills array and difficulty level

### Badge 2: Team Leadership (Organizational - Silver)
- **ID**: `550e8400-e29b-41d4-a716-446655440002`
- **Category**: organizational
- **Level**: silver
- **Status**: active
- **Description**: Cross-functional team leadership experience
- **Metadata**: Includes team size, project duration, and skills

### Badge 3: Effective Communication (Soft Skilled - Bronze)
- **ID**: `550e8400-e29b-41d4-a716-446655440003`
- **Category**: softskilled
- **Level**: bronze
- **Status**: active
- **Description**: Communication skills for technical and non-technical audiences
- **Metadata**: Includes communication skills and audience types

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
   - Select the `catalog_badges` table

4. **Import CSV**:
   - Click the "Insert" dropdown button
   - Select "Insert from CSV"
   - Upload `catalog_badges_samples.csv`
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
   COPY catalog_badges (id, title, description, category, level, status, created_by, created_at, deactivated_at, version, metadata)
   FROM '/path/to/catalog_badges_samples.csv'
   DELIMITER ','
   CSV HEADER;
   ```

### Method 3: Supabase CLI

1. **Create a seed file** (if not already seeded):
   ```bash
   # Create seed file
   echo "INSERT INTO catalog_badges (id, title, description, category, level, status, created_by, created_at, version, metadata) VALUES" > supabase/seed.sql
   ```

2. **Add the data** (convert CSV to INSERT statements):
   ```sql
   INSERT INTO catalog_badges (id, title, description, category, level, status, created_by, created_at, deactivated_at, version, metadata)
   VALUES
   (
     '550e8400-e29b-41d4-a716-446655440001',
     'PostgreSQL Expert',
     'Demonstrated advanced knowledge of PostgreSQL database administration, optimization, and performance tuning. Successfully implemented complex queries, indexing strategies, and backup/recovery procedures.',
     'technical',
     'gold',
     'active',
     '550e8400-e29b-41d4-a716-446655440100',
     '2025-01-10T09:00:00Z',
     NULL,
     1,
     '{"skills": ["SQL", "indexing", "query optimization", "performance tuning"], "difficulty": "advanced"}'::jsonb
   ),
   (
     '550e8400-e29b-41d4-a716-446655440002',
     'Team Leadership',
     'Led a cross-functional team of 5-8 engineers to successfully deliver a major project on time and within budget. Demonstrated effective communication, conflict resolution, and project management skills.',
     'organizational',
     'silver',
     'active',
     '550e8400-e29b-41d4-a716-446655440100',
     '2025-01-15T14:30:00Z',
     NULL,
     1,
     '{"team_size": "5-8", "project_duration": "6 months", "skills": ["leadership", "project management", "communication"]}'::jsonb
   ),
   (
     '550e8400-e29b-41d4-a716-446655440003',
     'Effective Communication',
     'Consistently delivers clear and concise presentations to both technical and non-technical audiences. Actively listens, asks clarifying questions, and adapts communication style to audience needs.',
     'softskilled',
     'bronze',
     'active',
     '550e8400-e29b-41d4-a716-446655440100',
     '2025-01-20T10:15:00Z',
     NULL,
     1,
     '{"skills": ["presentation", "active listening", "written communication", "verbal communication"], "audience": "mixed"}'::jsonb
   );
   ```

3. **Run seed**:
   ```bash
   npx supabase db reset  # This will reset and seed the database
   ```

### Method 4: Using Supabase JavaScript Client

If you want to insert programmatically:

```javascript
import { supabaseClient } from './src/db/supabase.client';

const badges = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'PostgreSQL Expert',
    description: 'Demonstrated advanced knowledge of PostgreSQL database administration, optimization, and performance tuning...',
    category: 'technical',
    level: 'gold',
    status: 'active',
    created_by: '550e8400-e29b-41d4-a716-446655440100',
    created_at: '2025-01-10T09:00:00Z',
    version: 1,
    metadata: {
      skills: ['SQL', 'indexing', 'query optimization', 'performance tuning'],
      difficulty: 'advanced'
    }
  },
  // ... other badges
];

const { data, error } = await supabaseClient
  .from('catalog_badges')
  .insert(badges);

if (error) {
  console.error('Error inserting badges:', error);
} else {
  console.log('Successfully inserted badges:', data);
}
```

## Verification

After import, verify the data:

```sql
-- Check total count
SELECT COUNT(*) FROM catalog_badges;

-- View all imported badges
SELECT id, title, category, level, status FROM catalog_badges;

-- Verify metadata is properly stored as JSONB
SELECT title, metadata FROM catalog_badges;
```

Or via the API:

```bash
# Test the endpoint
curl "http://localhost:3000/api/catalog-badges"

# Filter by category
curl "http://localhost:3000/api/catalog-badges?category=technical"

# Filter by level
curl "http://localhost:3000/api/catalog-badges?level=gold"
```

## Notes

- **UUIDs**: The sample data uses pre-generated UUIDs for consistency
- **created_by**: References a user UUID (`550e8400-e29b-41d4-a716-446655440100`) - you may need to create this user first or set it to NULL
- **metadata**: Stored as JSONB - properly escaped in CSV
- **version**: All set to 1 (initial version)
- **status**: All set to 'active' for immediate visibility
- **deactivated_at**: Set to empty/NULL for active badges

## Troubleshooting

### Issue: Foreign Key Constraint Error on created_by

If you get an error about `created_by` foreign key:

**Option 1**: Create the referenced user first:
```sql
INSERT INTO users (id, email, display_name, is_admin, google_sub)
VALUES (
  '550e8400-e29b-41d4-a716-446655440100',
  'admin@example.com',
  'Admin User',
  true,
  'google-oauth-sub-123'
);
```

**Option 2**: Set `created_by` to NULL in the CSV (allowed by schema):
- Change the `created_by` values in the CSV to empty string or NULL

### Issue: JSONB Format Error

If the metadata doesn't import correctly:
- Ensure double quotes are properly escaped in CSV
- Use single quotes for the outer string and double quotes inside JSON
- Or import without metadata and add it later using an UPDATE statement

### Issue: Duplicate Key Error

If badges already exist with these IDs:
- Delete existing badges: `DELETE FROM catalog_badges WHERE id IN ('550e8400-e29b-41d4-a716-446655440001', ...)`
- Or generate new UUIDs in the CSV file

## Creating More Sample Data

To generate more badges, follow this template:

```csv
id,title,description,category,level,status,created_by,created_at,deactivated_at,version,metadata
[UUID],[Badge Title],[Description],[technical|organizational|softskilled],[gold|silver|bronze],[active|inactive],[UUID or NULL],[ISO Timestamp],,1,[JSONB or NULL]
```

**Category Options**: `technical`, `organizational`, `softskilled`
**Level Options**: `gold`, `silver`, `bronze`
**Status Options**: `active`, `inactive`

---

**Happy Testing!** 🎉
