-- Migration: Seed Initial Admin User
-- Created: 2025-11-11
-- Purpose: Create the initial admin account for the system
--
-- This migration creates a seed admin user that can be used to:
-- 1. Access the system initially
-- 2. Promote other users to admin
-- 3. Manage the application
--
-- IMPORTANT: Change the password after first login!
-- Default credentials:
--   Email: admin@badger.com
--   Password: 3~FNm)2_<hP50XS'VYro

BEGIN;

-- Insert the admin user if it doesn't already exist
-- We use a subquery to check if the user exists to make this migration idempotent
INSERT INTO users (
  id,
  email,
  display_name,
  is_admin,
  last_seen_at
)
SELECT
  gen_random_uuid(),
  'admin@badger.com',
  'System Administrator',
  true,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@badger.com'
);

COMMIT;

-- Post-migration steps:
-- 1. Register the admin user in Supabase Auth:
--    - Email: admin@badger.com
--    - Password: 3~FNm)2_<hP50XS'VYro
-- 2. The user record will be created/updated on first login
-- 3. Change the password immediately after first login for security
--
-- To manually create the auth user in Supabase, you can:
-- 1. Use the Supabase Dashboard (Authentication > Users > Add User)
-- 2. Or use the API/CLI
-- 3. Or the user can self-register and then be promoted via UPDATE users SET is_admin = true WHERE email = 'admin@badger.com'

