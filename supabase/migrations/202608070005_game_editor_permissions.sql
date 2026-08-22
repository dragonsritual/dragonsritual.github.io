-- DragonsRitual v1.0
-- Owner-only game editor permissions.

grant select on table public.platforms to authenticated;
grant select, insert, update on table public.games to authenticated;

drop policy if exists "admins insert games" on public.games;
create policy "admins insert games"
on public.games
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update games" on public.games;
create policy "admins update games"
on public.games
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No DELETE policy is added in v1.0.
-- Games can be marked paused/dropped instead of being destroyed.