-- SQL to create admin user in Supabase Auth
-- Run this in Supabase SQL Editor after applying migrations

-- This creates the admin user in Supabase Auth
-- Email: admin@badger.com
-- Password: 3~FNm)2_<hP50XS'VYro

-- Note: In Supabase local dev, you can also create users via the Studio UI
-- or by using the signUp API endpoint

-- Alternative: Use Supabase Studio:
-- 1. Go to http://127.0.0.1:54323 (Supabase Studio)
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User"
-- 4. Enter:
--    - Email: admin@badger.com
--    - Password: 3~FNm)2_<hP50XS'VYro  
--    - Auto Confirm User: YES (check this box)
-- 5. Click "Create User"
-- 6. The user will be created in auth.users
-- 7. On first login, the user record in public.users will be created/updated with is_admin=true

-- Alternative: Use the registration endpoint:
-- 1. Go to http://localhost:3000/register
-- 2. Register with email: admin@badger.com
-- 3. Use password: 3~FNm)2_<hP50XS'VYro
-- 4. The system will automatically set is_admin=true based on the migration


-- ============================================================================
-- SAMPLE PROMOTION TEMPLATE
-- ============================================================================
--
-- What is this for:
-- This SQL script inserts a sample promotion template into the database for
-- testing and development purposes. Promotion templates define the badge
-- requirements for advancing from one career level to another.
--
-- Template Structure:
-- - name: Human-readable name of the promotion template
-- - path: Career path (technical, financial, or management)
-- - from_level: Starting position level (e.g., "mid", "junior", "S1", "M1")
-- - to_level: Target position level (e.g., "senior", "S2", "M2")
-- - rules: JSONB array of badge requirements with:
--   * category: Badge category ("technical", "organizational", "softskilled", or "any")
--   * level: Badge level ("gold", "silver", or "bronze")
--   * count: Number of badges required at this category/level
-- - is_active: Whether this template is currently active (true/false)
-- - created_by: UUID of the admin user who created the template
--
-- When to use this:
-- - Setting up a new development environment
-- - Testing promotion building functionality
-- - Demonstrating the promotion workflow
-- - Creating sample data for UI development
--
-- Prerequisites:
-- 1. Admin user must exist in the users table
-- 2. Referenced catalog badges must exist and be active
-- 3. Migrations must be applied (promotion_templates table exists)
--
-- How to use:
-- 1. Get admin user ID: SELECT id FROM users WHERE is_admin = true LIMIT 1;
-- 2. Get active badge IDs (optional, for reference):
--    SELECT id, title, category, level FROM catalog_badges WHERE status = 'active';
-- 3. Copy and modify the INSERT statement below
-- 4. Update the created_by UUID to match your admin user
-- 5. Adjust the rules array to match your testing needs
-- 6. Run in psql or Supabase SQL Editor
--
-- Example: Insert Technical Mid-Level to Senior Template

INSERT INTO promotion_templates (name, path, from_level, to_level, rules, is_active, created_by)
VALUES (
  'Technical Mid-Level to Senior',
  'technical',
  'mid',
  'senior',
  '[
    {"category": "technical", "level": "gold", "count": 1},
    {"category": "technical", "level": "silver", "count": 1},
    {"category": "technical", "level": "bronze", "count": 1}
  ]'::jsonb,
  true,
  '7d19ba15-faff-481c-8c1a-60aca7308270'  -- Replace with your admin user ID
)
RETURNING id, name, path, from_level, to_level, jsonb_pretty(rules) as rules;

-- Notes:
-- - The rules field must be a valid JSONB array matching PromotionTemplateRule[] type
-- - Each rule object must have: category, level, count
-- - Valid categories: "technical", "organizational", "softskilled", "any"
-- - Valid levels: "gold", "silver", "bronze"
-- - Count must be a positive integer
-- - RETURNING clause shows the inserted data for verification

