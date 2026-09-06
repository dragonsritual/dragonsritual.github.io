-- DRAGON WRITER STUDIO — DATABASE FIX 17A
-- SAFE BOOTSTRAP + PASS 17 UPGRADE
-- This replaces the failed PASS 17-only migration when PASS 16 tables are missing.
-- Designed to be re-runnable.

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. BASE CREATOR TABLES (PASS 16 FOUNDATION)
-- =========================================================

create table if not exists public.dr_creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Creator',
  creator_type text not null default 'writer',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dr_writer_manuscripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled manuscript',
  deck text not null default '',
  body text not null default '',
  genre text not null default 'FANTASY',
  status text not null default 'draft'
    check (status in ('draft','submitted','ready','published')),
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dr_writer_manuscripts_user_status_idx
  on public.dr_writer_manuscripts(user_id,status,updated_at desc);

-- =========================================================
-- 2. PASS 17 PROFESSIONAL WRITER STUDIO FIELDS
-- =========================================================

alter table public.dr_writer_manuscripts
  add column if not exists content_type text not null default 'STORY';

alter table public.dr_writer_manuscripts
  add column if not exists intended_section text not null default 'EDITOR DECIDES';

alter table public.dr_writer_manuscripts
  add column if not exists tags text[] not null default '{}';

alter table public.dr_writer_manuscripts
  add column if not exists editor_note text not null default '';

alter table public.dr_writer_manuscripts
  add column if not exists writer_note text not null default '';

alter table public.dr_writer_manuscripts
  add column if not exists cover_url text;

alter table public.dr_writer_manuscripts
  add column if not exists media_urls text[] not null default '{}';

alter table public.dr_writer_manuscripts
  add column if not exists placement text;

alter table public.dr_writer_manuscripts
  add column if not exists rating numeric(2,1);

alter table public.dr_writer_manuscripts
  add column if not exists feedback_count integer not null default 0;

alter table public.dr_creator_profiles
  add column if not exists weekly_word_goal integer not null default 2500;

alter table public.dr_creator_profiles
  add column if not exists badge text not null default 'CONTRIBUTOR';

-- =========================================================
-- 3. EXISTING ACCOUNT BACKFILL
-- Important because the owner's auth account already existed
-- before the creator-profile trigger was installed.
-- =========================================================

insert into public.dr_creator_profiles (user_id, display_name, creator_type)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'display_name',''),
    split_part(u.email,'@',1),
    'Creator'
  ),
  coalesce(
    nullif(u.raw_user_meta_data->>'creator_type',''),
    'writer'
  )
from auth.users u
on conflict (user_id) do nothing;

-- =========================================================
-- 4. AUTOMATIC PROFILE CREATION FOR FUTURE CREATORS
-- =========================================================

create or replace function public.dr_handle_new_creator()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.dr_creator_profiles(user_id,display_name,creator_type)
  values(
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name',''),
      split_part(new.email,'@',1),
      'Creator'
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'creator_type',''),
      'writer'
    )
  )
  on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists dr_on_auth_user_created on auth.users;
create trigger dr_on_auth_user_created
after insert on auth.users
for each row execute procedure public.dr_handle_new_creator();

create or replace function public.dr_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists dr_touch_manuscript on public.dr_writer_manuscripts;
create trigger dr_touch_manuscript
before update on public.dr_writer_manuscripts
for each row execute procedure public.dr_touch_updated_at();

drop trigger if exists dr_touch_creator on public.dr_creator_profiles;
create trigger dr_touch_creator
before update on public.dr_creator_profiles
for each row execute procedure public.dr_touch_updated_at();

-- =========================================================
-- 5. ROW LEVEL SECURITY — WRITER OWNS THEIR PRIVATE WORK
-- =========================================================

alter table public.dr_creator_profiles enable row level security;
alter table public.dr_writer_manuscripts enable row level security;

drop policy if exists "creator own profile select" on public.dr_creator_profiles;
create policy "creator own profile select"
on public.dr_creator_profiles
for select
using(auth.uid()=user_id);

drop policy if exists "creator own profile insert" on public.dr_creator_profiles;
create policy "creator own profile insert"
on public.dr_creator_profiles
for insert
with check(auth.uid()=user_id);

drop policy if exists "creator own profile update" on public.dr_creator_profiles;
create policy "creator own profile update"
on public.dr_creator_profiles
for update
using(auth.uid()=user_id)
with check(auth.uid()=user_id);

drop policy if exists "writer own manuscript select" on public.dr_writer_manuscripts;
create policy "writer own manuscript select"
on public.dr_writer_manuscripts
for select
using(auth.uid()=user_id);

drop policy if exists "writer own manuscript insert" on public.dr_writer_manuscripts;
create policy "writer own manuscript insert"
on public.dr_writer_manuscripts
for insert
with check(auth.uid()=user_id);

drop policy if exists "writer own manuscript update" on public.dr_writer_manuscripts;
create policy "writer own manuscript update"
on public.dr_writer_manuscripts
for update
using(auth.uid()=user_id)
with check(auth.uid()=user_id);

drop policy if exists "writer own manuscript delete" on public.dr_writer_manuscripts;
create policy "writer own manuscript delete"
on public.dr_writer_manuscripts
for delete
using(auth.uid()=user_id);

-- =========================================================
-- 6. STUDIO EDITOR ACCESS
-- =========================================================

create or replace function public.dr_is_editor()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((auth.jwt()->>'email') = 'dragonsritual@proton.me', false)
$$;

drop policy if exists "editor read manuscripts" on public.dr_writer_manuscripts;
create policy "editor read manuscripts"
on public.dr_writer_manuscripts
for select
using(public.dr_is_editor());

drop policy if exists "editor update manuscripts" on public.dr_writer_manuscripts;
create policy "editor update manuscripts"
on public.dr_writer_manuscripts
for update
using(public.dr_is_editor())
with check(public.dr_is_editor());

drop policy if exists "editor read profiles" on public.dr_creator_profiles;
create policy "editor read profiles"
on public.dr_creator_profiles
for select
using(public.dr_is_editor());

-- =========================================================
-- 7. WRITER MEDIA STORAGE
-- =========================================================

insert into storage.buckets(id,name,public)
values('writer-media','writer-media',true)
on conflict(id) do update set public=true;

drop policy if exists "writer media upload" on storage.objects;
create policy "writer media upload"
on storage.objects
for insert
to authenticated
with check(
  bucket_id='writer-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "writer media update" on storage.objects;
create policy "writer media update"
on storage.objects
for update
to authenticated
using(
  bucket_id='writer-media'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check(
  bucket_id='writer-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "writer media delete" on storage.objects;
create policy "writer media delete"
on storage.objects
for delete
to authenticated
using(
  bucket_id='writer-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "writer media public read" on storage.objects;
create policy "writer media public read"
on storage.objects
for select
using(bucket_id='writer-media');

commit;

-- If Supabase reports "Success. No rows returned", the Writer Studio database is ready.
