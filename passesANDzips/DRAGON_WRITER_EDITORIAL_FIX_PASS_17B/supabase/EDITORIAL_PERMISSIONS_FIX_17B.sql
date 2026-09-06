-- DRAGON WRITER / EDITORIAL PERMISSIONS FIX — PASS 17B
-- Safe to run after DATABASE FIX 17A.
-- This does NOT delete manuscripts or users.

begin;

-- PostgREST requires SQL privileges in addition to RLS policies.
grant usage on schema public to authenticated;

grant select, insert, update, delete
on table public.dr_writer_manuscripts
to authenticated;

grant select, insert, update
on table public.dr_creator_profiles
to authenticated;

-- Ensure the editor helper can be executed while RLS evaluates policies.
grant execute on function public.dr_is_editor() to authenticated;

-- Re-create explicit editor policies in case PASS 17A was interrupted.
drop policy if exists "editor read manuscripts" on public.dr_writer_manuscripts;
create policy "editor read manuscripts"
on public.dr_writer_manuscripts
for select
to authenticated
using (public.dr_is_editor());

drop policy if exists "editor update manuscripts" on public.dr_writer_manuscripts;
create policy "editor update manuscripts"
on public.dr_writer_manuscripts
for update
to authenticated
using (public.dr_is_editor())
with check (public.dr_is_editor());

drop policy if exists "editor read profiles" on public.dr_creator_profiles;
create policy "editor read profiles"
on public.dr_creator_profiles
for select
to authenticated
using (public.dr_is_editor());

commit;

-- Expected result in Supabase:
-- Success. No rows returned
