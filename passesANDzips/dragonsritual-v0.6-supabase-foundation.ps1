$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.6 - Supabase/PostgreSQL Foundation ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\domain\schemas.ts")) {
    throw "STOPPED: v0.5 Data Foundation was not found. Install v0.5 first."
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )

    $fullPath = Join-Path (Get-Location) $Path
    $parent = Split-Path -Parent $fullPath

    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    [System.IO.File]::WriteAllText($fullPath, $Content, $Utf8NoBom)
}

# ------------------------------------------------------------
# 1) BACKUP
# ------------------------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v0.6-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$backupTargets = @(
    "package.json",
    "package-lock.json",
    ".gitignore",
    "src\services\dataService.ts",
    "src\services\gamingDashboardService.ts"
)

foreach ($file in $backupTargets) {
    if (Test-Path $file) {
        $dest = Join-Path $backupDir $file
        $destParent = Split-Path -Parent $dest
        if ($destParent) {
            New-Item -ItemType Directory -Force -Path $destParent | Out-Null
        }
        Copy-Item $file $dest -Force
    }
}

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $backupDir -ForegroundColor Yellow

# ------------------------------------------------------------
# 2) PACKAGE.JSON
# ------------------------------------------------------------
Write-NoBom "package.json" @'
{
  "name": "dragonsritual-site",
  "private": true,
  "version": "0.6.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "data:validate": "node scripts/validate-data.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.0",
    "astro": "latest",
    "zod": "^3.25.0"
  }
}
'@

# ------------------------------------------------------------
# 3) NEVER COMMIT LOCAL SECRETS
# ------------------------------------------------------------
Write-NoBom ".gitignore" @'
node_modules/
dist/
.astro/
.env
.env.local
.env.*.local
.DS_Store
Thumbs.db
*.log
.migration-backups/
'@

Write-NoBom ".env.example" @'
# Copy this file to .env.local.
# Values come from the Supabase Project Connect dialog.

PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

# Keep local data as the default until Supabase is fully configured.
PUBLIC_DR_DATA_PROVIDER=local
'@

# ------------------------------------------------------------
# 4) DATABASE MIGRATION
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070001_initial_dragonsritual_schema.sql" @'
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
'@

# ------------------------------------------------------------
# 5) SUPABASE CLIENT
# ------------------------------------------------------------
Write-NoBom "src\lib\supabase.ts" @'
import { createClient } from "@supabase/supabase-js";

export function hasSupabaseConfig() {
  return Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL &&
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function createSupabaseClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
'@

# ------------------------------------------------------------
# 6) SUPABASE DATA ADAPTER
# ------------------------------------------------------------
Write-NoBom "src\data\supabaseDataSource.ts" @'
import type { DragonsRitualDataSource } from "./dataSource";
import type {
  Article,
  Game,
  Session,
  Stream,
  WorldLocation
} from "../domain/schemas";
import { createSupabaseClient } from "../lib/supabase";

function gameStatus(value: string): Game["status"] {
  return value as Game["status"];
}

function sessionStatus(value: string): Session["status"] {
  return value as Session["status"];
}

export const supabaseDataSource: DragonsRitualDataSource = {
  async listGames() {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("games")
      .select(`
        id,
        slug,
        title,
        platform_id,
        status,
        release_date,
        developer,
        publisher,
        started_at,
        completed_at,
        hours_played,
        progress_percent,
        session_count,
        last_played_at,
        current_objective,
        summary,
        cover_url
      `)
      .order("title");

    if (error) throw error;

    return (data ?? []).map((row): Game => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      platformId: row.platform_id,
      status: gameStatus(row.status),
      releaseDate: row.release_date,
      developer: row.developer,
      publisher: row.publisher,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      hoursPlayed: Number(row.hours_played ?? 0),
      progressPercent: Number(row.progress_percent ?? 0),
      sessionCount: Number(row.session_count ?? 0),
      lastPlayedAt: row.last_played_at,
      currentObjective: row.current_objective,
      summary: row.summary,
      coverMediaId: null,
      tagIds: [],
      categoryIds: []
    }));
  },

  async getGameBySlug(slug) {
    const games = await this.listGames();
    return games.find((game) => game.slug === slug) ?? null;
  },

  async listSessionsForGame(gameId) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("game_id", gameId)
      .order("sequence", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row): Session => ({
      id: row.id,
      gameId: row.game_id,
      sequence: row.sequence,
      title: row.title,
      status: sessionStatus(row.status),
      scheduledFor: row.scheduled_for,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes ?? 0,
      progressBefore: row.progress_before == null ? null : Number(row.progress_before),
      progressAfter: row.progress_after == null ? null : Number(row.progress_after),
      result: row.result,
      notes: row.notes,
      streamId: row.stream_id,
      articleId: null,
      worldLocationId: row.world_location_id,
      mediaIds: [],
      tagIds: []
    }));
  },

  async listUpcomingSessions() {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "scheduled")
      .order("scheduled_for", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row): Session => ({
      id: row.id,
      gameId: row.game_id,
      sequence: row.sequence,
      title: row.title,
      status: sessionStatus(row.status),
      scheduledFor: row.scheduled_for,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes ?? 0,
      progressBefore: row.progress_before == null ? null : Number(row.progress_before),
      progressAfter: row.progress_after == null ? null : Number(row.progress_after),
      result: row.result,
      notes: row.notes,
      streamId: row.stream_id,
      articleId: null,
      worldLocationId: row.world_location_id,
      mediaIds: [],
      tagIds: []
    }));
  },

  async listArticles(): Promise<Article[]> {
    // Article body/editorial workflow will come from Sanity in v0.7.
    return [];
  },

  async getArticleBySlug(_slug): Promise<Article | null> {
    return null;
  },

  async getStream(id) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("streams")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      provider: data.provider as Stream["provider"],
      channel: data.channel,
      liveUrl: data.live_url,
      vodUrl: data.vod_url,
      externalId: data.external_id,
      startedAt: data.started_at,
      endedAt: data.ended_at
    };
  },

  async getWorldLocation(id) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("world_locations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      type: data.location_type as WorldLocation["type"],
      gameId: data.game_id,
      parentLocationId: data.parent_location_id,
      coordinates:
        data.x == null || data.y == null || data.z == null
          ? null
          : { x: data.x, y: data.y, z: data.z },
      deepLink: data.deep_link
    };
  }
};
'@

# ------------------------------------------------------------
# 7) PROVIDER SWITCH
# ------------------------------------------------------------
Write-NoBom "src\services\dataService.ts" @'
import { localDataSource } from "../data/localDataSource";
import { supabaseDataSource } from "../data/supabaseDataSource";
import { hasSupabaseConfig } from "../lib/supabase";
import type { DragonsRitualDataSource } from "../data/dataSource";

const requestedProvider =
  import.meta.env.PUBLIC_DR_DATA_PROVIDER?.toLowerCase() ?? "local";

const useSupabase =
  requestedProvider === "supabase" && hasSupabaseConfig();

export const dataService: DragonsRitualDataSource =
  useSupabase ? supabaseDataSource : localDataSource;

export const activeDataProvider = useSupabase ? "supabase" : "local";
'@

# ------------------------------------------------------------
# 8) GAMING VIEW MODEL NOW RESOLVES PLATFORM FROM PROVIDER
# ------------------------------------------------------------
Write-NoBom "src\services\gamingDashboardService.ts" @'
import { dataService, activeDataProvider } from "./dataService";
import { seedData } from "../data/seed";
import { createSupabaseClient, hasSupabaseConfig } from "../lib/supabase";

function formatDate(date: string | null) {
  if (!date) return "—";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(parsed);
}

async function getPlatformNames() {
  if (activeDataProvider === "supabase" && hasSupabaseConfig()) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("platforms")
      .select("id,name");

    if (error) throw error;

    return new Map((data ?? []).map((platform) => [platform.id, platform.name]));
  }

  return new Map(
    seedData.platforms.map((platform) => [platform.id, platform.name])
  );
}

export async function getGamingDashboard() {
  const games = await dataService.listGames();
  const platformMap = await getPlatformNames();

  return {
    season: "2026",
    platform: "PS5 Pro",
    provider: activeDataProvider,

    queue: games
      .filter((game) => game.status === "queued" || game.status === "active")
      .slice(0, 3)
      .map((game, index) => ({
        id: game.id,
        title: game.title,
        platform: platformMap.get(game.platformId) ?? "Unknown",
        status: index === 0 ? "UP NEXT" : "QUEUE"
      })),

    // Schedule remains local until we begin entering actual Sessions.
    schedule: [
      {
        date: "AUG 07",
        game: "Ghost of Yōtei",
        type: "Campaign",
        status: "Scheduled"
      },
      {
        date: "AUG 10",
        game: "Death Stranding 2",
        type: "First Look",
        status: "Scheduled"
      },
      {
        date: "AUG 13",
        game: "Final Fantasy VII Rebirth",
        type: "Return",
        status: "Planned"
      }
    ],

    games: games.map((game) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      platform: platformMap.get(game.platformId) ?? "Unknown",
      status:
        game.status === "active"
          ? "Active"
          : game.status === "queued"
            ? "Queued"
            : game.status,
      sessions: game.sessionCount,
      hours: game.hoursPlayed,
      progress: game.progressPercent,
      lastPlayed: formatDate(game.lastPlayedAt),
      result: game.currentObjective ?? "—"
    }))
  };
}
'@

# ------------------------------------------------------------
# 9) LOCAL ENV SETUP HELPER
# ------------------------------------------------------------
Write-NoBom "setup-supabase.ps1" @'
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Connect DragonsRitual to Supabase ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Use the values from Supabase Dashboard -> your project -> Connect." -ForegroundColor Yellow
Write-Host "Use the PUBLIC/PUBLISHABLE key, never a secret/service-role key." -ForegroundColor Yellow
Write-Host ""

$url = Read-Host "Supabase Project URL"
$key = Read-Host "Supabase Publishable Key"

if ([string]::IsNullOrWhiteSpace($url)) {
    throw "Project URL cannot be empty."
}

if ([string]::IsNullOrWhiteSpace($key)) {
    throw "Publishable key cannot be empty."
}

$content = @"
PUBLIC_SUPABASE_URL=$url
PUBLIC_SUPABASE_PUBLISHABLE_KEY=$key
PUBLIC_DR_DATA_PROVIDER=supabase
"@

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) ".env.local"),
    $content,
    $utf8
)

Write-Host ""
Write-Host ".env.local created. It is ignored by Git." -ForegroundColor Green
Write-Host "Restart npm run dev after changing environment variables." -ForegroundColor Cyan
'@

# ------------------------------------------------------------
# 10) DATABASE INSTRUCTIONS
# ------------------------------------------------------------
Write-NoBom "docs\supabase-setup.md" @'
# DragonsRitual Supabase Setup

## Architecture

Supabase/PostgreSQL owns structured relational data:

- platforms
- games
- sessions
- schedules
- streams
- tags/categories
- media relationships
- world locations
- Sanity article relationship IDs

Sanity will later own rich editorial article content.

## Security

The public Astro site uses only the Supabase Project URL and a
publishable key.

Never put a service-role key, secret key, or database password in
browser code or GitHub.

RLS is enabled by the initial migration. Public visitors receive
SELECT-only access through explicit policies.

## Local configuration

Run:

    .\setup-supabase.ps1

Then restart:

    npm run dev

The `.env.local` file is excluded from Git.

## Database schema

Migration:

    supabase/migrations/202608070001_initial_dragonsritual_schema.sql

This file is the source-controlled schema definition for the project.
'@

# ------------------------------------------------------------
# 11) INSTALL / BUILD
# ------------------------------------------------------------
npm install

Write-Host ""
Write-Host "Running Astro build with LOCAL provider..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v0.6 SUPABASE FOUNDATION COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Nothing has been sent to your Supabase account yet." -ForegroundColor Yellow
Write-Host "Your site still uses LOCAL data until you explicitly connect it." -ForegroundColor Yellow
Write-Host ""
Write-Host "Created:" -ForegroundColor Cyan
Write-Host "  PostgreSQL migration" -ForegroundColor White
Write-Host "  RLS read-only public policies" -ForegroundColor White
Write-Host "  Supabase client" -ForegroundColor White
Write-Host "  Supabase data adapter" -ForegroundColor White
Write-Host "  Local/Supabase provider switch" -ForegroundColor White
Write-Host "  Safe .env.local setup helper" -ForegroundColor White
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $backupDir -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT: create your Supabase project in the browser." -ForegroundColor Cyan
Write-Host "Then we will apply the migration and run setup-supabase.ps1." -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
