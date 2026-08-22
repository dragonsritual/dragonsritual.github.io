-- DragonsRitual v0.6
-- Initial relational gaming/world data model.
-- Editorial article BODY will later live in Sanity.
-- The article_links table below stores the cross-system relationship.

create extension if not exists pgcrypto;

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  manufacturer text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  platform_id uuid not null references public.platforms(id) on delete restrict,
  status text not null check (status in ('queued','active','completed','paused','dropped','replay')),
  release_date date,
  developer text,
  publisher text,
  started_at date,
  completed_at date,
  hours_played numeric(10,2) not null default 0 check (hours_played >= 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  session_count integer not null default 0 check (session_count >= 0),
  last_played_at date,
  current_objective text,
  summary text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('twitch','youtube','other')),
  channel text not null,
  live_url text not null,
  vod_url text,
  external_id text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.world_locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  location_type text not null check (
    location_type in ('region','town','building','interior','landmark','dungeon','coordinates')
  ),
  game_id uuid references public.games(id) on delete cascade,
  parent_location_id uuid references public.world_locations(id) on delete set null,
  x double precision,
  y double precision,
  z double precision,
  deep_link text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  title text not null,
  status text not null check (status in ('scheduled','live','completed','cancelled')),
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  progress_before numeric(5,2) check (progress_before between 0 and 100),
  progress_after numeric(5,2) check (progress_after between 0 and 100),
  result text,
  notes text,
  stream_id uuid references public.streams(id) on delete set null,
  world_location_id uuid references public.world_locations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, sequence)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text
);

create table if not exists public.game_tags (
  game_id uuid not null references public.games(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (game_id, tag_id)
);

create table if not exists public.game_categories (
  game_id uuid not null references public.games(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (game_id, category_id)
);

create table if not exists public.session_tags (
  session_id uuid not null references public.sessions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (session_id, tag_id)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('image','video','clip','audio')),
  title text,
  alt_text text,
  url text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  captured_at timestamptz,
  game_id uuid references public.games(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  world_location_id uuid references public.world_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.article_links (
  id uuid primary key default gen_random_uuid(),
  sanity_document_id text not null unique,
  slug text not null unique,
  game_id uuid references public.games(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  world_location_id uuid references public.world_locations(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists games_platform_id_idx on public.games(platform_id);
create index if not exists sessions_game_id_idx on public.sessions(game_id);
create index if not exists sessions_status_idx on public.sessions(status);
create index if not exists sessions_scheduled_for_idx on public.sessions(scheduled_for);
create index if not exists media_game_id_idx on public.media(game_id);
create index if not exists media_session_id_idx on public.media(session_id);
create index if not exists world_locations_game_id_idx on public.world_locations(game_id);
create index if not exists article_links_game_id_idx on public.article_links(game_id);
create index if not exists article_links_session_id_idx on public.article_links(session_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platforms_set_updated_at on public.platforms;
create trigger platforms_set_updated_at
before update on public.platforms
for each row execute procedure public.set_updated_at();

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
before update on public.games
for each row execute procedure public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute procedure public.set_updated_at();

-- RLS: public site is read-only.
alter table public.platforms enable row level security;
alter table public.games enable row level security;
alter table public.streams enable row level security;
alter table public.world_locations enable row level security;
alter table public.sessions enable row level security;
alter table public.tags enable row level security;
alter table public.categories enable row level security;
alter table public.game_tags enable row level security;
alter table public.game_categories enable row level security;
alter table public.session_tags enable row level security;
alter table public.media enable row level security;
alter table public.article_links enable row level security;

-- Anonymous/public visitors may READ published network data.
-- No browser policy grants INSERT/UPDATE/DELETE.
create policy "public read platforms"
on public.platforms for select to anon using (true);

create policy "public read games"
on public.games for select to anon using (true);

create policy "public read streams"
on public.streams for select to anon using (true);

create policy "public read world locations"
on public.world_locations for select to anon using (true);

create policy "public read sessions"
on public.sessions for select to anon using (true);

create policy "public read tags"
on public.tags for select to anon using (true);

create policy "public read categories"
on public.categories for select to anon using (true);

create policy "public read game tags"
on public.game_tags for select to anon using (true);

create policy "public read game categories"
on public.game_categories for select to anon using (true);

create policy "public read session tags"
on public.session_tags for select to anon using (true);

create policy "public read media"
on public.media for select to anon using (true);

create policy "public read article links"
on public.article_links for select to anon using (true);

-- Seed the first platform and current gaming records.
insert into public.platforms (code, name, manufacturer)
values ('ps5-pro', 'PlayStation 5 Pro', 'Sony')
on conflict (code) do update
set name = excluded.name,
    manufacturer = excluded.manufacturer;

with platform as (
  select id from public.platforms where code = 'ps5-pro'
)
insert into public.games (
  slug, title, platform_id, status, hours_played, progress_percent,
  session_count, last_played_at, current_objective
)
select
  values_to_insert.slug,
  values_to_insert.title,
  platform.id,
  values_to_insert.status,
  values_to_insert.hours_played,
  values_to_insert.progress_percent,
  values_to_insert.session_count,
  values_to_insert.last_played_at,
  values_to_insert.current_objective
from platform
cross join (
  values
    ('ghost-of-yotei','Ghost of Yōtei','active',11.8,28,4,date '2026-08-05','Campaign progress'),
    ('death-stranding-2','Death Stranding 2','queued',0,0,0,null,'Not started'),
    ('final-fantasy-vii-rebirth','Final Fantasy VII Rebirth','active',19.4,41,7,date '2026-07-29','Story progress')
) as values_to_insert(
  slug,title,status,hours_played,progress_percent,session_count,last_played_at,current_objective
)
on conflict (slug) do update
set title = excluded.title,
    platform_id = excluded.platform_id,
    status = excluded.status,
    hours_played = excluded.hours_played,
    progress_percent = excluded.progress_percent,
    session_count = excluded.session_count,
    last_played_at = excluded.last_played_at,
    current_objective = excluded.current_objective;

insert into public.streams (provider, channel, live_url)
select 'twitch', 'dragonsritual', 'https://www.twitch.tv/dragonsritual'
where not exists (
  select 1
  from public.streams
  where provider = 'twitch' and channel = 'dragonsritual'
);