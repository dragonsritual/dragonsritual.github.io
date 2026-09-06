-- =========================================================
-- PASS 31 — DRAGON TV FOLLOWING + CREATOR CHANNEL FEED
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.dr_creator_channels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text unique,
  display_name text not null,
  channel_type text not null default 'Creator channel',
  avatar_text text,
  description text,
  is_approved boolean not null default false,
  is_active boolean not null default true,
  featured boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dr_creator_follows (
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_user_id,creator_user_id),
  check (follower_user_id <> creator_user_id)
);

create table if not exists public.dr_tv_videos (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  title text not null,
  description text,
  category text,
  thumbnail_url text,
  video_url text,
  duration_seconds integer,
  visibility text not null default 'public' check (visibility in ('public','followers','members','private')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dr_creator_follows_follower_idx on public.dr_creator_follows(follower_user_id,created_at desc);
create index if not exists dr_tv_videos_creator_published_idx on public.dr_tv_videos(creator_user_id,published_at desc);
create index if not exists dr_tv_videos_public_idx on public.dr_tv_videos(status,visibility,published_at desc);

alter table public.dr_creator_channels enable row level security;
alter table public.dr_creator_follows enable row level security;
alter table public.dr_tv_videos enable row level security;

-- Public can discover only approved, active creator channels.
drop policy if exists "public read approved creator channels" on public.dr_creator_channels;
create policy "public read approved creator channels"
on public.dr_creator_channels for select
using (is_approved=true and is_active=true);

-- A signed-in user sees only their own follows.
drop policy if exists "member read own follows" on public.dr_creator_follows;
create policy "member read own follows"
on public.dr_creator_follows for select to authenticated
using (auth.uid()=follower_user_id);

-- Public videos from approved channels are discoverable.
drop policy if exists "public read published tv videos" on public.dr_tv_videos;
create policy "public read published tv videos"
on public.dr_tv_videos for select
using (
  status='published'
  and visibility='public'
  and exists(
    select 1 from public.dr_creator_channels c
    where c.user_id=creator_user_id and c.is_approved=true and c.is_active=true
  )
);

-- Creator may read all of their own video records.
drop policy if exists "creator read own tv videos" on public.dr_tv_videos;
create policy "creator read own tv videos"
on public.dr_tv_videos for select to authenticated
using (auth.uid()=creator_user_id);

-- Follow/unfollow are RPC-only so approval is checked centrally.
create or replace function public.dr_follow_creator(target_creator uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if auth.uid()=target_creator then raise exception 'cannot follow yourself'; end if;

  if not exists(
    select 1 from public.dr_creator_channels
    where user_id=target_creator and is_approved=true and is_active=true
  ) then
    raise exception 'creator channel is not available';
  end if;

  insert into public.dr_creator_follows(follower_user_id,creator_user_id)
  values(auth.uid(),target_creator)
  on conflict do nothing;
end;
$$;

create or replace function public.dr_unfollow_creator(target_creator uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  delete from public.dr_creator_follows
  where follower_user_id=auth.uid() and creator_user_id=target_creator;
end;
$$;

revoke all on function public.dr_follow_creator(uuid) from public;
revoke all on function public.dr_unfollow_creator(uuid) from public;
grant execute on function public.dr_follow_creator(uuid) to authenticated;
grant execute on function public.dr_unfollow_creator(uuid) to authenticated;

-- Admin helpers for approving creator channels.
create or replace function public.dr_admin_upsert_creator_channel(
  target_user uuid,
  new_display_name text,
  new_channel_type text default 'Creator channel',
  new_slug text default null,
  new_featured boolean default false
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;

  if not exists(
    select 1 from public.dr_member_roles
    where user_id=target_user and role in ('creator','writer','illustrator','radio','comics','streaming','3d','editor')
  ) then
    raise exception 'target user is not an approved creator role';
  end if;

  insert into public.dr_creator_channels(
    user_id,slug,display_name,channel_type,is_approved,is_active,featured,approved_at,updated_at
  )
  values(
    target_user,
    coalesce(nullif(new_slug,''),target_user::text),
    left(new_display_name,100),
    left(coalesce(new_channel_type,'Creator channel'),100),
    true,true,new_featured,now(),now()
  )
  on conflict(user_id) do update set
    slug=excluded.slug,
    display_name=excluded.display_name,
    channel_type=excluded.channel_type,
    is_approved=true,
    is_active=true,
    featured=excluded.featured,
    approved_at=coalesce(public.dr_creator_channels.approved_at,now()),
    updated_at=now();
end;
$$;

revoke all on function public.dr_admin_upsert_creator_channel(uuid,text,text,text,boolean) from public;
grant execute on function public.dr_admin_upsert_creator_channel(uuid,text,text,text,boolean) to authenticated;
