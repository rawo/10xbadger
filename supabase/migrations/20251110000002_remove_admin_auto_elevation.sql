--
-- migration: remove auto_elevate_admins trigger
-- created: 2025-11-10 00:00:02 utc
-- purpose: align with us-00104 requirement for manual admin assignment
-- affected: users table trigger, elevate_admin_users function
-- special notes:
--  - removes automatic admin elevation based on email address
--  - us-00104 states: "admin rights can be assigned only through database updates"
--  - after this migration, admin assignment must be done via manual update:
--    UPDATE users SET is_admin = TRUE WHERE email = 'admin@company.com';
--  - this trigger was convenient for development but conflicts with requirements
--

begin;

-- drop the trigger
drop trigger if exists auto_elevate_admins on users;

-- drop the function
drop function if exists elevate_admin_users();

commit;

-- end migration
