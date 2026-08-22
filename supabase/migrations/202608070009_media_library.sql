-- DragonsRitual v1.3
-- Media library + private owner upload bucket.

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'dragonsritual-media',
  'dragonsritual-media',
  true,
  52428800
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Public visitors can view files from the public media bucket.
drop policy if exists "public read dragonsritual media objects" on storage.objects;
create policy "public read dragonsritual media objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'dragonsritual-media');

-- Only an authorized DragonsRitual admin may upload/update/delete.
drop policy if exists "admins insert dragonsritual media objects" on storage.objects;
create policy "admins insert dragonsritual media objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
);

drop policy if exists "admins update dragonsritual media objects" on storage.objects;
create policy "admins update dragonsritual media objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
)
with check (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
);

drop policy if exists "admins delete dragonsritual media objects" on storage.objects;
create policy "admins delete dragonsritual media objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
);

grant select, insert, update on table public.media to authenticated;

drop policy if exists "admins insert media records" on public.media;
create policy "admins insert media records"
on public.media
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update media records" on public.media;
create policy "admins update media records"
on public.media
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No database-row DELETE yet. We keep records durable until the cleanup
-- workflow is intentionally designed.