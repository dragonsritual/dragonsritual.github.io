-- DRAGON PASS 05 — membership, standing, badges and town programming foundation.
-- REVIEW BEFORE RUNNING. Credits are closed-loop platform units; no cash-out/transfer is implemented here.
create table if not exists public.dragon_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text not null default '',
  bio text not null default '',
  member_type text not null default 'member' check (member_type in ('member','creator','operator','staff')),
  standing integer not null default 0 check (standing >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.dragon_badges (
  id text primary key, name text not null, description text not null default '',
  category text not null default 'community', retired boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.dragon_member_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.dragon_badges(id) on delete cascade,
  awarded_at timestamptz not null default now(), reason text not null default '',
  primary key(user_id,badge_id)
);
create table if not exists public.dragon_programs (
  id uuid primary key default gen_random_uuid(), space_id uuid references public.dragon_spaces(id) on delete cascade,
  title text not null, program_type text not null check(program_type in ('show','live','radio','podcast','event','town_hall')),
  status text not null default 'draft' check(status in ('draft','scheduled','live','ended','cancelled')),
  starts_at timestamptz, recurrence text, description text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.dragon_community_proposals (
  id uuid primary key default gen_random_uuid(), author_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text not null default '', scope text not null default 'community',
  decision_class text not null default 'consultation' check(decision_class in ('owner','staff','consultation','member_vote','operator_vote')),
  status text not null default 'open' check(status in ('open','review','accepted','declined','closed')),
  created_at timestamptz not null default now()
);
alter table public.dragon_profiles enable row level security;
alter table public.dragon_badges enable row level security;
alter table public.dragon_member_badges enable row level security;
alter table public.dragon_programs enable row level security;
alter table public.dragon_community_proposals enable row level security;
create policy "profiles public read" on public.dragon_profiles for select using (true);
create policy "profile owner update" on public.dragon_profiles for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "badges public read" on public.dragon_badges for select using (true);
create policy "member badges public read" on public.dragon_member_badges for select using (true);
create policy "programs public read" on public.dragon_programs for select using (status in ('scheduled','live','ended'));
create policy "proposals public read" on public.dragon_community_proposals for select using (status in ('open','review','accepted','declined','closed'));
create policy "proposal member insert" on public.dragon_community_proposals for insert with check (auth.uid()=author_user_id);
insert into public.dragon_badges(id,name,description,category) values
 ('first-step','First Step','Joined Dragon and established a member identity.','history'),
 ('neighbor','Neighbor','Recognized for meaningfully helping another member.','community'),
 ('published','Published','Published original work through Dragon.','creation'),
 ('broadcaster','Broadcaster','Operated a scheduled Dragon program.','media')
on conflict(id) do nothing;
