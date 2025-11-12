# E2E Test Setup Guide

This guide explains how to set up and run E2E tests for the 10xbadger application.

## Prerequisites

1. **Running Application**: The application must be running at `http://localhost:3000` (or set `BASE_URL` env var)
2. **Test Database**: A dedicated test database with test data
3. **Test Users**: Test user accounts configured in Supabase Auth

## Test User Setup

The E2E tests require two types of users:

### Standard User
- **Email**: `testuser@example.com` (or set `TEST_USER_EMAIL`)
- **Password**: `TestPassword123!` (or set `TEST_USER_PASSWORD`)
- **Role**: Standard user
- **Purpose**: Testing regular user flows

### Admin User
- **Email**: `admin@example.com` (or set `TEST_ADMIN_EMAIL`)
- **Password**: `AdminPassword123!` (or set `TEST_ADMIN_PASSWORD`)
- **Role**: Administrator
- **Purpose**: Testing admin-only features

### Creating Test Users in Supabase

```sql
-- Create standard test user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'testuser@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Create admin test user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role
) VALUES (
  gen_random_uuid(),
  'admin@example.com',
  crypt('AdminPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'admin'
);
```

**Note**: Adjust the SQL based on your actual Supabase schema and authentication setup.

## Environment Variables

Create a `.env.test` file in the project root:

```env
# Base URL for E2E tests
BASE_URL=http://localhost:3000

# Test user credentials
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=TestPassword123!

# Admin user credentials
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!

# Second test user (for multi-user scenarios)
TEST_USER2_EMAIL=testuser2@example.com
TEST_USER2_PASSWORD=TestPassword123!

# Test data IDs (should exist in test database)
TEST_BADGE_TECHNICAL_GOLD=badge-tech-gold-001
TEST_BADGE_TECHNICAL_SILVER=badge-tech-silver-001
TEST_BADGE_ORG_BRONZE=badge-org-bronze-001
TEST_TEMPLATE_SENIOR=template-senior-001
```

## Running E2E Tests

### Run All Tests
```bash
pnpm test:e2e
```

### Run Specific Test Suite
```bash
# Authentication tests
pnpm test:e2e --grep "Authentication"

# Login page tests
pnpm test:e2e --grep "Login Page"

# Badge application tests
pnpm test:e2e --grep "Badge Application"
```

### Run Single Test
```bash
pnpm test:e2e --grep "AUTH-01"
```

### Run with UI Mode (Interactive)
```bash
pnpm test:e2e:ui
```

### Run in Debug Mode
```bash
pnpm test:e2e:debug
```

## Test Categories

### ✅ Tests That Work Without Authentication
These tests verify authentication and access control:
- **AUTH-03**: Protected route redirects
- **Login Page**: UI rendering and validation

### ⚠️ Tests Requiring Test Users
These tests require valid test credentials:
- **AUTH-01**: Successful login
- **AUTH-02**: Failed login
- **AUTH-04**: Admin access control
- **AUTH-05**: Logout
- **Badge Application**: Full lifecycle
- **Admin Review**: Accept/reject applications
- **Promotions**: Creation and validation

## Test Structure

```
e2e/
├── Authentication.spec.ts      # Auth flow tests (AUTH-01 to AUTH-05)
├── LoginPage.spec.ts           # Login page UI tests
├── pages/                      # Page Object Models
│   └── LoginPage.ts
├── helpers/                    # Test helpers
│   └── auth.ts                # Login/logout helpers
├── test-config.ts             # Test configuration
├── SETUP.md                   # This file
└── README.md                  # General E2E docs
```

## Troubleshooting

### Test users not working
1. Verify users exist in Supabase Auth
2. Check email is confirmed (`email_confirmed_at` is set)
3. Verify password is correct
4. Check user roles (admin vs standard)

### Tests timing out
1. Ensure application is running at BASE_URL
2. Check network connectivity
3. Increase timeouts in `test-config.ts`
4. Use `--timeout` flag: `pnpm test:e2e --timeout=60000`

### Authentication failing
1. Check Supabase is running (`npx supabase status`)
2. Verify environment variables are set
3. Check application logs for auth errors
4. Clear browser storage: Add `storageState: undefined` to test

### Skipped tests
Some tests are marked with `.skip()` because they require:
- Admin user setup
- Specific test data in database
- External services configured

Remove `.skip()` once prerequisites are met.

## Best Practices

1. **Isolate test data**: Use dedicated test users/data
2. **Clean up**: Reset database state between test runs
3. **Don't commit credentials**: Use environment variables
4. **Run in CI**: Set up GitHub Actions with test database
5. **Use Page Objects**: Maintain POMs for easier updates

## Next Steps

1. Set up test users in Supabase Auth
2. Populate test database with sample badges/templates
3. Run authentication tests to verify setup
4. Remove `.skip()` from tests once prerequisites are met
5. Add more E2E tests for critical user flows
