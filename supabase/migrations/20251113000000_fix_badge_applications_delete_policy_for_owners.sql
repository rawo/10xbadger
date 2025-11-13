-- migration: fix badge_applications delete policy to allow owners to delete drafts
-- created: 2025-11-13 00:00:00 utc
-- purpose: update rls policy to allow users to delete their own draft badge applications
-- affected: badge_applications table delete policy
-- special notes:
--  - users may delete their own applications that are in 'draft' status
--  - admins can delete any badge application
--  - this aligns the rls policy with the business logic in badge-application.service.ts
--  - fixes issue where delete operations fail with "no rows deleted" error
--

begin;

-- drop the existing admin-only delete policy
drop policy if exists badge_applications_delete_authenticated on badge_applications;

-- create new delete policy to allow owners to delete their own drafts, or admins to delete any
create policy badge_applications_delete_authenticated on badge_applications
for delete to authenticated
using (
  is_admin() or (applicant_id = auth.uid() and status = 'draft')
);

commit;

-- end migration
