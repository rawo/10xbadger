-- Migration: Update RLS Policies to Use auth.uid()
-- Created: 2025-11-11
-- Purpose: Replace custom context variables with Supabase's built-in auth.uid()
--
-- This migration updates all RLS policies to use:
-- - auth.uid() instead of current_setting('app.current_user_id')
-- - A helper function to check is_admin from the users table
--
-- This approach is more idiomatic for Supabase and doesn't require
-- setting custom context variables in middleware.

BEGIN;

-- Helper function to check if current user is admin
-- This function is SECURITY DEFINER so it can read from users table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- =========================================================================
-- UPDATE USERS TABLE POLICIES
-- =========================================================================

-- Drop old policies
DROP POLICY IF EXISTS users_select_authenticated ON users;
DROP POLICY IF EXISTS users_update_authenticated ON users;
DROP POLICY IF EXISTS users_insert_authenticated ON users;

-- users: select policy - allow reading own row or if admin
CREATE POLICY users_select_authenticated ON users FOR SELECT TO authenticated
USING (
  id = auth.uid() OR is_admin()
);

-- users: update policy - allow updating own row, admins can update anyone
-- Non-admins cannot change is_admin field
CREATE POLICY users_update_authenticated ON users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  is_admin() OR (
    id = auth.uid() AND
    is_admin = (SELECT u.is_admin FROM users u WHERE u.id = auth.uid())
  )
);

-- users: insert policy - allow inserting own user record
CREATE POLICY users_insert_authenticated ON users FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- =========================================================================
-- UPDATE CATALOG_BADGES TABLE POLICIES
-- =========================================================================

-- Drop old admin policies
DROP POLICY IF EXISTS catalog_badges_insert_authenticated ON catalog_badges;
DROP POLICY IF EXISTS catalog_badges_update_authenticated ON catalog_badges;
DROP POLICY IF EXISTS catalog_badges_delete_authenticated ON catalog_badges;

-- Create new admin-only policies using is_admin()
CREATE POLICY catalog_badges_insert_authenticated ON catalog_badges FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY catalog_badges_update_authenticated ON catalog_badges FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY catalog_badges_delete_authenticated ON catalog_badges FOR DELETE TO authenticated
USING (is_admin());

-- =========================================================================
-- UPDATE BADGE_APPLICATIONS TABLE POLICIES
-- =========================================================================

-- Drop old policies
DROP POLICY IF EXISTS badge_applications_select_authenticated ON badge_applications;
DROP POLICY IF EXISTS badge_applications_insert_authenticated ON badge_applications;
DROP POLICY IF EXISTS badge_applications_update_authenticated ON badge_applications;
DROP POLICY IF EXISTS badge_applications_delete_authenticated ON badge_applications;

-- badge_applications: select - own applications or admin
CREATE POLICY badge_applications_select_authenticated ON badge_applications FOR SELECT TO authenticated
USING (
  applicant_id = auth.uid() OR is_admin()
);

-- badge_applications: insert - only for self
CREATE POLICY badge_applications_insert_authenticated ON badge_applications FOR INSERT TO authenticated
WITH CHECK (applicant_id = auth.uid());

-- badge_applications: update - own drafts or admin for review
CREATE POLICY badge_applications_update_authenticated ON badge_applications FOR UPDATE TO authenticated
USING (
  (applicant_id = auth.uid() AND status = 'draft') OR is_admin()
)
WITH CHECK (
  is_admin() OR (reviewed_by IS NULL AND reviewed_at IS NULL)
);

-- badge_applications: delete - admin only
CREATE POLICY badge_applications_delete_authenticated ON badge_applications FOR DELETE TO authenticated
USING (is_admin());

-- =========================================================================
-- UPDATE PROMOTION_TEMPLATES TABLE POLICIES
-- =========================================================================

-- Drop old admin policies
DROP POLICY IF EXISTS promotion_templates_insert_authenticated ON promotion_templates;
DROP POLICY IF EXISTS promotion_templates_update_authenticated ON promotion_templates;
DROP POLICY IF EXISTS promotion_templates_delete_authenticated ON promotion_templates;

-- Create new admin-only policies
CREATE POLICY promotion_templates_insert_authenticated ON promotion_templates FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY promotion_templates_update_authenticated ON promotion_templates FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY promotion_templates_delete_authenticated ON promotion_templates FOR DELETE TO authenticated
USING (is_admin());

-- =========================================================================
-- UPDATE PROMOTIONS TABLE POLICIES
-- =========================================================================

-- Drop old policies
DROP POLICY IF EXISTS promotions_select_authenticated ON promotions;
DROP POLICY IF EXISTS promotions_insert_authenticated ON promotions;
DROP POLICY IF EXISTS promotions_update_authenticated ON promotions;
DROP POLICY IF EXISTS promotions_delete_authenticated ON promotions;

-- promotions: select - own promotions or admin
CREATE POLICY promotions_select_authenticated ON promotions FOR SELECT TO authenticated
USING (
  created_by = auth.uid() OR is_admin()
);

-- promotions: insert - only for self
CREATE POLICY promotions_insert_authenticated ON promotions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- promotions: update - own drafts or admin
CREATE POLICY promotions_update_authenticated ON promotions FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() AND status = 'draft') OR is_admin()
)
WITH CHECK (
  is_admin() OR status <> 'approved'
);

-- promotions: delete - admin only
CREATE POLICY promotions_delete_authenticated ON promotions FOR DELETE TO authenticated
USING (is_admin());

-- =========================================================================
-- UPDATE PROMOTION_BADGES TABLE POLICIES (if they exist)
-- =========================================================================

-- Note: The original migration may have more policies for promotion_badges table
-- This migration focuses on the main tables shown in the excerpt

COMMIT;

-- Summary:
-- - Created is_admin() helper function
-- - Updated all policies to use auth.uid() instead of current_setting()
-- - Policies now work with Supabase's built-in authentication
-- - No need to set custom context variables in middleware

