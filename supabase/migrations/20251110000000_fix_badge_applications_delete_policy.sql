--
-- migration: fix badge_applications delete policy to allow users to delete their own drafts
-- created: 2025-11-10 00:00:00 utc
-- purpose: update rls policy to allow users to delete their own draft badge applications
-- affected: badge_applications table delete policy
-- special notes:
--  - users may only delete their own applications that are in 'draft' status
--  - admins can delete any badge application regardless of status
--  - this aligns the rls policy with the business logic in badge-application.service.ts
--

begin;

-- drop the existing overly restrictive delete policy
drop policy if exists badge_applications_delete_authenticated on badge_applications;

-- recreate the delete policy to allow users to delete their own drafts, or admins to delete any
create policy badge_applications_delete_authenticated on badge_applications for delete to authenticated using (
  (
    -- allow if user is admin
    (current_setting('app.is_admin', true) = 'true')
    or
    -- or if user is the applicant and status is 'draft'
    (
      current_setting('app.current_user_id', true) is not null
      and applicant_id = current_setting('app.current_user_id', true)::uuid
      and status = 'draft'
    )
  )
);

commit;

-- end migration
