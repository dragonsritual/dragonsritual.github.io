-- DRAGON Writer Studio PASS 17
-- Run once in Supabase SQL Editor after PASS 16 schema.
alter table public.dr_writer_manuscripts add column if not exists content_type text not null default 'STORY';
alter table public.dr_writer_manuscripts add column if not exists intended_section text not null default 'EDITOR DECIDES';
alter table public.dr_writer_manuscripts add column if not exists tags text[] not null default '{}';
alter table public.dr_writer_manuscripts add column if not exists editor_note text not null default '';
alter table public.dr_writer_manuscripts add column if not exists writer_note text not null default '';
alter table public.dr_writer_manuscripts add column if not exists cover_url text;
alter table public.dr_writer_manuscripts add column if not exists media_urls text[] not null default '{}';
alter table public.dr_writer_manuscripts add column if not exists placement text;
alter table public.dr_writer_manuscripts add column if not exists rating numeric(2,1);
alter table public.dr_writer_manuscripts add column if not exists feedback_count integer not null default 0;
alter table public.dr_creator_profiles add column if not exists weekly_word_goal integer not null default 2500;
alter table public.dr_creator_profiles add column if not exists badge text not null default 'CONTRIBUTOR';

-- Owner/editor access. Change this email later if your studio owner account changes.
create or replace function public.dr_is_editor() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((auth.jwt()->>'email') = 'dragonsritual@proton.me', false)
$$;

drop policy if exists "editor read manuscripts" on public.dr_writer_manuscripts;
create policy "editor read manuscripts" on public.dr_writer_manuscripts for select using(public.dr_is_editor());
drop policy if exists "editor update manuscripts" on public.dr_writer_manuscripts;
create policy "editor update manuscripts" on public.dr_writer_manuscripts for update using(public.dr_is_editor()) with check(public.dr_is_editor());
drop policy if exists "editor read profiles" on public.dr_creator_profiles;
create policy "editor read profiles" on public.dr_creator_profiles for select using(public.dr_is_editor());

insert into storage.buckets(id,name,public) values('writer-media','writer-media',true) on conflict(id) do update set public=true;
drop policy if exists "writer media upload" on storage.objects;
create policy "writer media upload" on storage.objects for insert to authenticated with check(bucket_id='writer-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "writer media update" on storage.objects;
create policy "writer media update" on storage.objects for update to authenticated using(bucket_id='writer-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "writer media delete" on storage.objects;
create policy "writer media delete" on storage.objects for delete to authenticated using(bucket_id='writer-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "writer media public read" on storage.objects;
create policy "writer media public read" on storage.objects for select using(bucket_id='writer-media');
