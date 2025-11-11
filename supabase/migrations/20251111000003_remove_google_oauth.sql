-- Migration: Remove Google OAuth Fields
-- Created: 2025-11-11
-- Purpose: Remove google_sub column as we're using email/password authentication only

BEGIN;

-- Remove the unique constraint on google_sub
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_google_sub_key;

-- Make google_sub nullable and not unique
ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;

-- For existing rows, set google_sub to NULL
UPDATE users SET google_sub = NULL WHERE google_sub IS NOT NULL;

-- Drop the column entirely
ALTER TABLE users DROP COLUMN IF EXISTS google_sub;

COMMIT;

-- Note: This migration removes Google OAuth support from the users table
-- The system now uses email/password authentication only via Supabase Auth

