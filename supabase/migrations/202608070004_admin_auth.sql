-- DragonsRitual v0.9
-- Owner/admin authorization foundation.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

grant usage on schema public to authenticated;
grant select on table public.admin_users to authenticated;

-- Authenticated users may only see whether THEY are an admin.
drop policy if exists "users read own admin membership" on public.admin_users;
create policy "users read own admin membership"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

-- Secure helper used by future write policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Authenticated clients may attempt updates, but RLS below permits
-- them only when public.is_admin() is true.
grant update on table public.games to authenticated;

drop policy if exists "admins update games" on public.games;
create policy "admins update games"
on public.games
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Sessions are prepared for the next editor pass.
grant insert, update, delete on table public.sessions to authenticated;

drop policy if exists "admins insert sessions" on public.sessions;
create policy "admins insert sessions"
on public.sessions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update sessions" on public.sessions;
create policy "admins update sessions"
on public.sessions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete sessions" on public.sessions;
create policy "admins delete sessions"
on public.sessions
for delete
to authenticated
using (public.is_admin());

-- IMPORTANT:
-- No browser/client is allowed to add itself to admin_users.
-- The initial owner is bootstrapped manually in the Supabase SQL Editor.