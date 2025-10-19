--
-- migration: create initial schema for 10xbadger
-- created: 2025-10-19 09:00:00 utc
-- purpose: create core tables, indexes, triggers, and rls policies for the 10xbadger application
-- affected: users, catalog_badges, badge_applications, promotion_templates, promotions,
--           promotion_badges, audit_logs, settings
-- special notes:
--  - all sql is written in lowercase for consistency with project conventions
--  - row level security (rls) is enabled on all tables as required; policies are
--    created separately for the 'anon' and 'authenticated' supabase roles where relevant.
--  - this migration creates helper functions and triggers used to maintain timestamps
--  - where the db-plan contained small contradictions (eg: composite pk vs simple pk)
--    this migration chooses safe, referentially-correct options and documents the choices.
--

begin;

-- enable required extensions
-- pgcrypto is used for gen_random_uuid(). safe to create if not exists in all environments.
create extension if not exists pgcrypto;

-- helper: function to refresh updated_at on row updates
create or replace function _10xbadger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- helper: function to set promotion_badges.consumed when a promotion moves to approved
create or replace function _10xbadger_mark_promotion_consumed()
returns trigger
language plpgsql
as $$
begin
  -- only act when status transitions into 'approved'
  if tg_op = 'update' and old.status is distinct from new.status and new.status = 'approved' then
    update promotion_badges set consumed = true where promotion_id = new.id;
  elsif tg_op = 'update' and old.status is distinct from new.status and new.status = 'rejected' then
    -- on rejection, unlock badges: set consumed = false so they can be reused
    update promotion_badges set consumed = false where promotion_id = new.id;
  end if;
  return new;
end;
$$;

-- -------------------------------
-- users
-- -------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  google_sub text not null unique
);

-- enable row level security for users and create granular policies
alter table users enable row level security;

-- users: select policy for anonymous (deny all) - explicit deny for clarity
create policy users_select_anon on users for select to anon using (false);
-- rationale: anonymous connections should not be able to read any user rows

-- users: select policy for authenticated users - allow reading own row or admins
create policy users_select_authenticated on users for select to authenticated using (
  (
    -- allow if the current session user matches this row
    (current_setting('app.current_user_id', true) is not null and id = current_setting('app.current_user_id', true)::uuid)
    or
    -- or if the session is marked as admin
    (current_setting('app.is_admin', true) = 'true')
  )
);
-- rationale: users may read their own profile; admins may read any profile

-- users: update policy for anonymous (deny)
create policy users_update_anon on users for update to anon using (false) with check (false);

-- users: update policy for authenticated users - allow updating non-admin fields for own row
-- users: update policy for authenticated users - allow updating non-admin fields for own row
-- note: policy check must not reference `old`/`new`. to prevent privilege escalation
-- we compare the attempted `is_admin` value against the current stored value via a
-- subquery; only sessions with app.is_admin=true may change the stored is_admin flag.
create policy users_update_authenticated on users for update to authenticated
using (current_setting('app.current_user_id', true) is not null and id = current_setting('app.current_user_id', true)::uuid)
with check (
  (
    -- allow if session is admin
    (current_setting('app.is_admin', true) = 'true')
    or
    -- otherwise ensure the new is_admin matches the existing is_admin value in the table
    (is_admin = (
      select u.is_admin from users u where u.id = current_setting('app.current_user_id', true)::uuid
    ))
  )
);
-- rationale: only admins may change is_admin; normal users can update their profile

-- users: insert policy - disallow anon inserts; authenticated inserts allowed only when
-- the inserted id matches the session user (this prevents creating arbitrary other users)
create policy users_insert_authenticated on users for insert to authenticated
with check (current_setting('app.current_user_id', true) is not null and id = current_setting('app.current_user_id', true)::uuid);

-- -------------------------------
-- catalog_badges
-- -------------------------------
create table if not exists catalog_badges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  level text not null,
  metadata jsonb default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz,
  version int not null default 1
);

-- note: the db-plan suggested a composite primary key (id, version). that pattern
-- complicates foreign key references from applications and other tables. to preserve
-- referential integrity and keep references simple, we keep `id` as the primary key
-- and store `version` as a separate column. the application should snapshot `version`
-- into badge_applications.catalog_badge_version when needed.

alter table catalog_badges enable row level security;

-- catalog_badges is intended to be read publicly for browsing/searching; permit select
-- for both anon and authenticated roles
create policy catalog_badges_select_anon on catalog_badges for select to anon using (true);
create policy catalog_badges_select_authenticated on catalog_badges for select to authenticated using (true);
-- rationale: public catalog browsing should be open. other write operations are restricted.

-- restrict insert/update/delete to admins only (explicit policies for both roles)
-- note: insert policies only support a `with check` clause; using-clause is invalid for inserts.
create policy catalog_badges_insert_authenticated on catalog_badges for insert to authenticated with check (current_setting('app.is_admin', true) = 'true');
create policy catalog_badges_update_authenticated on catalog_badges for update to authenticated using (current_setting('app.is_admin', true) = 'true') with check (current_setting('app.is_admin', true) = 'true');
create policy catalog_badges_delete_authenticated on catalog_badges for delete to authenticated using (current_setting('app.is_admin', true) = 'true');

-- index: full-text search on title
create index if not exists idx_catalog_badges_title_tsv on catalog_badges using gin (to_tsvector('simple', title));
create index if not exists idx_catalog_badges_category_level on catalog_badges (category, level);
create index if not exists idx_catalog_badges_status_created_at on catalog_badges (status, created_at);

-- -------------------------------
-- badge_applications
-- -------------------------------
create table if not exists badge_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references users(id) on delete cascade,
  catalog_badge_id uuid not null references catalog_badges(id),
  catalog_badge_version int not null,
  date_of_application date not null,
  date_of_fulfillment date,
  reason text,
  status text not null default 'draft',
  submitted_at timestamptz,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger to keep updated_at current on modifications
create trigger badge_applications_set_updated_at
before update on badge_applications
for each row execute function _10xbadger_set_updated_at();

alter table badge_applications enable row level security;

-- select policies: anonymous cannot read; authenticated can read own rows or admins can read all
create policy badge_applications_select_anon on badge_applications for select to anon using (false);
create policy badge_applications_select_authenticated on badge_applications for select to authenticated using (
  (
    (current_setting('app.current_user_id', true) is not null and applicant_id = current_setting('app.current_user_id', true)::uuid)
    or (current_setting('app.is_admin', true) = 'true')
  )
);

-- insert: authenticated users may insert applications for themselves
create policy badge_applications_insert_authenticated on badge_applications for insert to authenticated with check (current_setting('app.current_user_id', true) is not null and applicant_id = current_setting('app.current_user_id', true)::uuid);

-- update: allow applicants to update their own drafts; admins may update for review actions
create policy badge_applications_update_authenticated on badge_applications for update to authenticated using (
  (
    (current_setting('app.current_user_id', true) is not null and applicant_id = current_setting('app.current_user_id', true)::uuid and status = 'draft')
    or (current_setting('app.is_admin', true) = 'true')
  )
) with check (
  (
    -- when a user updates their draft, ensure they don't illegitimately change reviewer fields
    (current_setting('app.is_admin', true) = 'true') or (reviewed_by is null and reviewed_at is null)
  )
);

-- delete: disallow deletes by users; only admins can delete if needed
create policy badge_applications_delete_anon on badge_applications for delete to anon using (false);
create policy badge_applications_delete_authenticated on badge_applications for delete to authenticated using (current_setting('app.is_admin', true) = 'true');

create index if not exists idx_badge_applications_applicant_id on badge_applications (applicant_id);
create index if not exists idx_badge_applications_catalog_badge_id on badge_applications (catalog_badge_id);
create index if not exists idx_badge_applications_status on badge_applications (status);
create index if not exists idx_badge_applications_created_at on badge_applications (created_at);

-- -------------------------------
-- promotion_templates
-- -------------------------------
create table if not exists promotion_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null,
  from_level text not null,
  to_level text not null,
  rules jsonb not null,
  is_active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger promotion_templates_set_updated_at
before update on promotion_templates
for each row execute function _10xbadger_set_updated_at();

alter table promotion_templates enable row level security;

create policy promotion_templates_select_anon on promotion_templates for select to anon using (true);
create policy promotion_templates_select_authenticated on promotion_templates for select to authenticated using (true);

-- insert-only policy must use `with check` instead of `using` to validate the incoming row
create policy promotion_templates_insert_authenticated on promotion_templates for insert to authenticated with check (current_setting('app.is_admin', true) = 'true');
create policy promotion_templates_update_authenticated on promotion_templates for update to authenticated using (current_setting('app.is_admin', true) = 'true') with check (current_setting('app.is_admin', true) = 'true');
create policy promotion_templates_delete_authenticated on promotion_templates for delete to authenticated using (current_setting('app.is_admin', true) = 'true');

create index if not exists idx_promotion_templates_path_from_to on promotion_templates (path, from_level, to_level);
create index if not exists idx_promotion_templates_rules_gin on promotion_templates using gin (rules);

-- -------------------------------
-- promotions
-- -------------------------------
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references promotion_templates(id),
  created_by uuid references users(id) on delete set null,
  path text not null,
  from_level text not null,
  to_level text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references users(id),
  rejected_at timestamptz,
  rejected_by uuid references users(id),
  reject_reason text,
  executed boolean not null default false
);

-- trigger to mark/unmark promotion_badges.consumed on status changes
create trigger promotions_set_consumed
after update on promotions
for each row execute function _10xbadger_mark_promotion_consumed();

alter table promotions enable row level security;

create policy promotions_select_anon on promotions for select to anon using (false);
create policy promotions_select_authenticated on promotions for select to authenticated using (
  ((current_setting('app.current_user_id', true) is not null and created_by = current_setting('app.current_user_id', true)::uuid) or (current_setting('app.is_admin', true) = 'true'))
);

create policy promotions_insert_authenticated on promotions for insert to authenticated with check (current_setting('app.current_user_id', true) is not null and created_by = current_setting('app.current_user_id', true)::uuid);

create policy promotions_update_authenticated on promotions for update to authenticated using (
  ((current_setting('app.current_user_id', true) is not null and created_by = current_setting('app.current_user_id', true)::uuid and status = 'draft') or (current_setting('app.is_admin', true) = 'true'))
) with check (
  (
    -- when owner edits, ensure they don't escalate status to approved directly
    (current_setting('app.is_admin', true) = 'true') or (status <> 'approved')
  )
);

create policy promotions_delete_authenticated on promotions for delete to authenticated using (current_setting('app.is_admin', true) = 'true');

create index if not exists idx_promotions_created_by on promotions (created_by);
create index if not exists idx_promotions_status_created_at on promotions (status, created_at);
create index if not exists idx_promotions_template_id on promotions (template_id);

-- -------------------------------
-- promotion_badges
-- -------------------------------
create table if not exists promotion_badges (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions(id) on delete cascade,
  badge_application_id uuid not null references badge_applications(id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null references users(id),
  consumed boolean not null default false
);

-- unique partial index to ensure a badge_application is only linked to one active (unconsumed) promotion
create unique index if not exists ux_promotion_badges_badge_application_unconsumed on promotion_badges(badge_application_id) where consumed = false;
create index if not exists idx_promotion_badges_promotion_id on promotion_badges (promotion_id);

alter table promotion_badges enable row level security;

create policy promotion_badges_select_anon on promotion_badges for select to anon using (false);
create policy promotion_badges_select_authenticated on promotion_badges for select to authenticated using (
  (
    -- allow if the current user owns the linked promotion or is admin
    (current_setting('app.current_user_id', true) is not null and exists (select 1 from promotions p where p.id = promotion_badges.promotion_id and p.created_by = current_setting('app.current_user_id', true)::uuid))
    or (current_setting('app.is_admin', true) = 'true')
  )
);

create policy promotion_badges_insert_authenticated on promotion_badges for insert to authenticated with check (
  (
    -- inserting user must either be admin or the owner of the referenced promotion
    (current_setting('app.is_admin', true) = 'true')
    or (current_setting('app.current_user_id', true) is not null and exists (select 1 from promotions p where p.id = promotion_id and p.created_by = current_setting('app.current_user_id', true)::uuid))
  )
);

create policy promotion_badges_update_authenticated on promotion_badges for update to authenticated using (
  (
    (current_setting('app.is_admin', true) = 'true')
    or (current_setting('app.current_user_id', true) is not null and exists (select 1 from promotions p where p.id = promotion_id and p.created_by = current_setting('app.current_user_id', true)::uuid))
  )
) with check (
  (
    -- ensure the partial unique index constraint intent is preserved: application cannot be re-assigned while consumed=false
    true
  )
);

create policy promotion_badges_delete_authenticated on promotion_badges for delete to authenticated using (current_setting('app.is_admin', true) = 'true');

-- -------------------------------
-- audit_logs
-- -------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

create policy audit_logs_select_anon on audit_logs for select to anon using (false);
create policy audit_logs_select_authenticated on audit_logs for select to authenticated using (current_setting('app.is_admin', true) = 'true');

-- allow inserts from server/service role (represented here by admin flag). application should set app.is_admin
create policy audit_logs_insert_authenticated on audit_logs for insert to authenticated with check (current_setting('app.is_admin', true) = 'true' or (current_setting('app.current_user_id', true) is not null and actor_id = current_setting('app.current_user_id', true)::uuid));

create index if not exists idx_audit_logs_actor_event_created_at on audit_logs (actor_id, event_type, created_at);

-- -------------------------------
-- settings
-- -------------------------------
create table if not exists settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

create policy settings_select_anon on settings for select to anon using (false);
create policy settings_select_authenticated on settings for select to authenticated using (current_setting('app.is_admin', true) = 'true');
-- inserts to settings restricted to admins; validate via with check
create policy settings_insert_authenticated on settings for insert to authenticated with check (current_setting('app.is_admin', true) = 'true');
create policy settings_update_authenticated on settings for update to authenticated using (current_setting('app.is_admin', true) = 'true') with check (current_setting('app.is_admin', true) = 'true');
create policy settings_delete_authenticated on settings for delete to authenticated using (current_setting('app.is_admin', true) = 'true');

create index if not exists idx_settings_updated_at on settings (updated_at);

-- finalize
commit;

-- end migration


