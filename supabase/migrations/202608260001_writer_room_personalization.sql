-- DRAGON WRITER ROOM — PERSONAL OFFICE PROFILE
-- Adds cross-device personalization fields to the existing writer profile.

alter table public.dr_creator_profiles
  add column if not exists avatar_url text,
  add column if not exists header_url text,
  add column if not exists room_theme text default 'ember';

alter table public.dr_creator_profiles
  drop constraint if exists dr_creator_profiles_room_theme_check;

alter table public.dr_creator_profiles
  add constraint dr_creator_profiles_room_theme_check
  check (room_theme is null or room_theme in ('ember', 'ink', 'forest', 'wine'));
