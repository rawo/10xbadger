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

