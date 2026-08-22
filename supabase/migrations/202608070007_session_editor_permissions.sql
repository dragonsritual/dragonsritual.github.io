-- DragonsRitual v1.1
-- Session editor permissions.
--
-- Read policies for authenticated users were added in migration 0006.
-- This migration makes the intended session write permissions explicit.

grant select, insert, update on table public.sessions to authenticated;
grant select on table public.games to authenticated;
grant select on table public.streams to authenticated;

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

-- No DELETE policy in v1.1.
-- Use status=cancelled instead of permanently destroying a session.