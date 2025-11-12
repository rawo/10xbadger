-- Migration: Remove Google OAuth Fields
-- Created: 2025-11-11
-- Purpose: Remove google_sub column as we're using email/password authentication only

BEGIN;

-- Remove the unique constraint on google_sub (if exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_google_sub_key;

-- Make google_sub nullable and not unique (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='users' AND column_name='google_sub') THEN
    ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;
    UPDATE users SET google_sub = NULL WHERE google_sub IS NOT NULL;
    ALTER TABLE users DROP COLUMN google_sub;
  END IF;
END $$;

COMMIT;

-- Note: This migration removes Google OAuth support from the users table
-- The system now uses email/password authentication only via Supabase Auth

