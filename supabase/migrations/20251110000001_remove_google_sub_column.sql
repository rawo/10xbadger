--
-- migration: remove google_sub column from users table
-- created: 2025-11-10 00:00:01 utc
-- purpose: remove google oauth sso remnants, align with email/password authentication
-- affected: users table
-- special notes:
--  - removes google_sub column which was used for google oauth
--  - removes unique constraint on google_sub
--  - required before implementing email/password authentication (auth-spec section 2.2.1)
--  - no data loss: column will be empty or contain unused values
--

begin;

-- drop unique constraint first
alter table users drop constraint if exists users_google_sub_key;

-- drop the google_sub column
alter table users drop column if exists google_sub;

commit;

-- end migration
