-- =========================================================
-- PASS 25 — DRAGON PRIVILEGE HARDENING
-- Public signup = MEMBER only.
-- Creator/editor access is DB-assigned.
-- Director/admin access is stored in admin_users and cannot be self-selected.
-- =========================================================

-- Existing secure admin foundation, recreated safely if needed.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "users read own admin membership" on public.admin_users;
create policy "users read own admin membership"
on public.admin_users for select to authenticated
using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.admin_users where user_id=auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Creator/member role registry. This is NOT user_metadata.
create table if not exists public.dr_member_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (
    role in ('member','creator','writer','illustrator','radio','comics','streaming','3d','editor')
  ),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  primary key(user_id,role)
);

alter table public.dr_member_roles enable row level security;
grant select, insert, delete on public.dr_member_roles to authenticated;

drop policy if exists "members read own secure roles" on public.dr_member_roles;
create policy "members read own secure roles"
on public.dr_member_roles for select to authenticated
using (auth.uid()=user_id or public.is_admin());

drop policy if exists "admins assign secure roles" on public.dr_member_roles;
create policy "admins assign secure roles"
on public.dr_member_roles for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins remove secure roles" on public.dr_member_roles;
create policy "admins remove secure roles"
on public.dr_member_roles for delete to authenticated
using (public.is_admin());

create or replace function public.dr_my_roles()
returns text[]
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(array_agg(role order by role),'{}'::text[])
  from public.dr_member_roles
  where user_id=auth.uid();
$$;

revoke all on function public.dr_my_roles() from public;
grant execute on function public.dr_my_roles() to authenticated;

-- Every Auth account automatically receives MEMBER only.
create or replace function public.dr_seed_member_role()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.dr_member_roles(user_id,role)
  values(new.id,'member')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_dr_role on auth.users;
create trigger on_auth_user_created_dr_role
after insert on auth.users
for each row execute procedure public.dr_seed_member_role();

insert into public.dr_member_roles(user_id,role)
select id,'member' from auth.users
on conflict do nothing;

-- Bootstrap the current DragonsRitual owner as the ONLY admin from this migration.
-- This is database-side; changing browser/user metadata cannot manufacture admin access.
insert into public.admin_users(user_id)
select id from auth.users
where lower(email)='dragonsritual@proton.me'
on conflict do nothing;

-- Give the current owner creator/editor workstations too.
insert into public.dr_member_roles(user_id,role)
select u.id,r.role
from auth.users u
cross join (values ('creator'),('writer'),('editor')) as r(role)
where lower(u.email)='dragonsritual@proton.me'
on conflict do nothing;

-- Lock privilege-looking fields on dr_member_profiles.
-- Members may edit identity/profile content, not promote themselves through the REST API.
do $$
begin
  if to_regclass('public.dr_member_profiles') is not null then
    revoke insert, update on public.dr_member_profiles from authenticated;
    grant update(display_name,handle,bio,updated_at) on public.dr_member_profiles to authenticated;
  end if;
end $$;

-- Rebuild member-profile read policy around secure DB admin status.
do $$
begin
  if to_regclass('public.dr_member_profiles') is not null then
    drop policy if exists "member read own profile" on public.dr_member_profiles;
    execute $p$
      create policy "member read own profile"
      on public.dr_member_profiles for select to authenticated
      using (auth.uid()=user_id or public.is_admin())
    $p$;
  end if;
end $$;

-- Director-only named member-event history, if that legacy table exists.
do $$
begin
  if to_regclass('public.dr_member_events') is not null then
    drop policy if exists "director read member events" on public.dr_member_events;
    execute $p$
      create policy "director read member events"
      on public.dr_member_events for select to authenticated
      using (public.is_admin())
    $p$;
  end if;
end $$;

-- First-party anonymous analytics: visitors can insert; ONLY DB admin can read.
do $$
begin
  if to_regclass('public.dr_analytics_sessions') is not null then
    drop policy if exists "director read analytics sessions" on public.dr_analytics_sessions;
    execute $p$
      create policy "director read analytics sessions"
      on public.dr_analytics_sessions for select to authenticated
      using (public.is_admin())
    $p$;
  end if;

  if to_regclass('public.dr_analytics_events') is not null then
    drop policy if exists "director read analytics events" on public.dr_analytics_events;
    execute $p$
      create policy "director read analytics events"
      on public.dr_analytics_events for select to authenticated
      using (public.is_admin())
    $p$;
  end if;
end $$;

-- IMPORTANT:
-- No public/member policy can INSERT into admin_users.
-- No normal member policy can INSERT/DELETE dr_member_roles.
-- Public registration therefore cannot self-select creator/editor/director access.
