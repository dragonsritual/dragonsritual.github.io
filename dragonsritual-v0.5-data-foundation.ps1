$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.5 - Professional Data Foundation ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside your dragonsritual.github.io repository."
}

if (-not (Test-Path "astro.config.mjs")) {
    throw "STOPPED: Astro foundation was not found. Install v0.4 first."
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
# 1) BACKUP CURRENT ASTRO DATA LAYER
# ------------------------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v0.5-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$backupTargets = @(
    "package.json",
    "package-lock.json",
    "src\data\gaming.js",
    "src\pages\index.astro",
    "README.md"
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
# 2) UPDATE PACKAGE.JSON
# ------------------------------------------------------------
Write-NoBom "package.json" @'
{
  "name": "dragonsritual-site",
  "private": true,
  "version": "0.5.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "data:validate": "node scripts/validate-data.mjs"
  },
  "dependencies": {
    "astro": "latest",
    "zod": "^3.25.0"
  }
}
'@

# ------------------------------------------------------------
# 3) DOMAIN ENUMS / CONSTANTS
# ------------------------------------------------------------
Write-NoBom "src\domain\constants.ts" @'
export const PLATFORM_CODES = [
  "ps5-pro",
  "ps5",
  "pc",
  "browser",
  "mac",
  "other"
] as const;

export const GAME_STATUS_CODES = [
  "queued",
  "active",
  "completed",
  "paused",
  "dropped",
  "replay"
] as const;

export const SESSION_STATUS_CODES = [
  "scheduled",
  "live",
  "completed",
  "cancelled"
] as const;

export const ARTICLE_STATUS_CODES = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived"
] as const;

export const STREAM_PROVIDER_CODES = [
  "twitch",
  "youtube",
  "other"
] as const;

export const MEDIA_TYPE_CODES = [
  "image",
  "video",
  "clip",
  "audio"
] as const;

export const WORLD_LOCATION_TYPE_CODES = [
  "region",
  "town",
  "building",
  "interior",
  "landmark",
  "dungeon",
  "coordinates"
] as const;
'@

# ------------------------------------------------------------
# 4) PROFESSIONAL DATA SCHEMAS
# ------------------------------------------------------------
Write-NoBom "src\domain\schemas.ts" @'
import { z } from "zod";
import {
  ARTICLE_STATUS_CODES,
  GAME_STATUS_CODES,
  MEDIA_TYPE_CODES,
  PLATFORM_CODES,
  SESSION_STATUS_CODES,
  STREAM_PROVIDER_CODES,
  WORLD_LOCATION_TYPE_CODES
} from "./constants";

const id = z.string().min(2);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const url = z.string().url();

export const platformSchema = z.object({
  id,
  code: z.enum(PLATFORM_CODES),
  name: z.string().min(1),
  manufacturer: z.string().nullable().default(null),
  active: z.boolean().default(true)
});

export const tagSchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  description: z.string().nullable().default(null)
});

export const categorySchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  description: z.string().nullable().default(null)
});

export const worldLocationSchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  type: z.enum(WORLD_LOCATION_TYPE_CODES),
  gameId: id.nullable().default(null),
  parentLocationId: id.nullable().default(null),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }).nullable().default(null),
  deepLink: z.string().nullable().default(null)
});

export const gameSchema = z.object({
  id,
  slug,
  title: z.string().min(1),
  platformId: id,
  status: z.enum(GAME_STATUS_CODES),
  releaseDate: z.string().nullable().default(null),
  developer: z.string().nullable().default(null),
  publisher: z.string().nullable().default(null),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  hoursPlayed: z.number().nonnegative().default(0),
  progressPercent: z.number().min(0).max(100).default(0),
  sessionCount: z.number().int().nonnegative().default(0),
  lastPlayedAt: z.string().nullable().default(null),
  currentObjective: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  coverMediaId: id.nullable().default(null),
  tagIds: z.array(id).default([]),
  categoryIds: z.array(id).default([])
});

export const streamSchema = z.object({
  id,
  provider: z.enum(STREAM_PROVIDER_CODES),
  channel: z.string().min(1),
  liveUrl: url,
  vodUrl: url.nullable().default(null),
  externalId: z.string().nullable().default(null),
  startedAt: isoDateTime.nullable().default(null),
  endedAt: isoDateTime.nullable().default(null)
});

export const sessionSchema = z.object({
  id,
  gameId: id,
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  status: z.enum(SESSION_STATUS_CODES),
  scheduledFor: isoDateTime.nullable().default(null),
  startedAt: isoDateTime.nullable().default(null),
  endedAt: isoDateTime.nullable().default(null),
  durationMinutes: z.number().int().nonnegative().default(0),
  progressBefore: z.number().min(0).max(100).nullable().default(null),
  progressAfter: z.number().min(0).max(100).nullable().default(null),
  result: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  streamId: id.nullable().default(null),
  articleId: id.nullable().default(null),
  worldLocationId: id.nullable().default(null),
  mediaIds: z.array(id).default([]),
  tagIds: z.array(id).default([])
});

export const articleSchema = z.object({
  id,
  slug,
  title: z.string().min(1),
  subtitle: z.string().nullable().default(null),
  excerpt: z.string().nullable().default(null),
  status: z.enum(ARTICLE_STATUS_CODES),
  authorId: id,
  publishedAt: isoDateTime.nullable().default(null),
  scheduledFor: isoDateTime.nullable().default(null),
  heroMediaId: id.nullable().default(null),
  relatedGameIds: z.array(id).default([]),
  relatedSessionIds: z.array(id).default([]),
  tagIds: z.array(id).default([]),
  categoryIds: z.array(id).default([]),
  seo: z.object({
    title: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
    socialImageMediaId: id.nullable().default(null),
    canonicalUrl: url.nullable().default(null)
  }).default({})
});

export const authorSchema = z.object({
  id,
  slug,
  displayName: z.string().min(1),
  bio: z.string().nullable().default(null),
  avatarMediaId: id.nullable().default(null)
});

export const mediaSchema = z.object({
  id,
  type: z.enum(MEDIA_TYPE_CODES),
  title: z.string().nullable().default(null),
  alt: z.string().nullable().default(null),
  url,
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  durationSeconds: z.number().nonnegative().nullable().default(null),
  capturedAt: isoDateTime.nullable().default(null),
  gameId: id.nullable().default(null),
  sessionId: id.nullable().default(null),
  worldLocationId: id.nullable().default(null)
});

export const databaseSeedSchema = z.object({
  platforms: z.array(platformSchema),
  tags: z.array(tagSchema),
  categories: z.array(categorySchema),
  authors: z.array(authorSchema),
  games: z.array(gameSchema),
  streams: z.array(streamSchema),
  sessions: z.array(sessionSchema),
  articles: z.array(articleSchema),
  media: z.array(mediaSchema),
  worldLocations: z.array(worldLocationSchema)
});

export type Platform = z.infer<typeof platformSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Author = z.infer<typeof authorSchema>;
export type Game = z.infer<typeof gameSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Media = z.infer<typeof mediaSchema>;
export type WorldLocation = z.infer<typeof worldLocationSchema>;
export type DatabaseSeed = z.infer<typeof databaseSeedSchema>;
'@

# ------------------------------------------------------------
# 5) RELATIONSHIP VALIDATION
# ------------------------------------------------------------
Write-NoBom "src\domain\validateRelationships.ts" @'
import type { DatabaseSeed } from "./schemas";

export function validateRelationships(data: DatabaseSeed) {
  const errors: string[] = [];

  const ids = <T extends { id: string }>(items: T[]) =>
    new Set(items.map((item) => item.id));

  const platformIds = ids(data.platforms);
  const gameIds = ids(data.games);
  const sessionIds = ids(data.sessions);
  const streamIds = ids(data.streams);
  const articleIds = ids(data.articles);
  const authorIds = ids(data.authors);
  const mediaIds = ids(data.media);
  const tagIds = ids(data.tags);
  const categoryIds = ids(data.categories);
  const locationIds = ids(data.worldLocations);

  for (const game of data.games) {
    if (!platformIds.has(game.platformId)) {
      errors.push(`Game ${game.id} references missing platform ${game.platformId}`);
    }

    for (const value of game.tagIds) {
      if (!tagIds.has(value)) errors.push(`Game ${game.id} references missing tag ${value}`);
    }

    for (const value of game.categoryIds) {
      if (!categoryIds.has(value)) errors.push(`Game ${game.id} references missing category ${value}`);
    }

    if (game.coverMediaId && !mediaIds.has(game.coverMediaId)) {
      errors.push(`Game ${game.id} references missing cover media ${game.coverMediaId}`);
    }
  }

  for (const session of data.sessions) {
    if (!gameIds.has(session.gameId)) {
      errors.push(`Session ${session.id} references missing game ${session.gameId}`);
    }

    if (session.streamId && !streamIds.has(session.streamId)) {
      errors.push(`Session ${session.id} references missing stream ${session.streamId}`);
    }

    if (session.articleId && !articleIds.has(session.articleId)) {
      errors.push(`Session ${session.id} references missing article ${session.articleId}`);
    }

    if (session.worldLocationId && !locationIds.has(session.worldLocationId)) {
      errors.push(`Session ${session.id} references missing world location ${session.worldLocationId}`);
    }

    for (const value of session.mediaIds) {
      if (!mediaIds.has(value)) errors.push(`Session ${session.id} references missing media ${value}`);
    }
  }

  for (const article of data.articles) {
    if (!authorIds.has(article.authorId)) {
      errors.push(`Article ${article.id} references missing author ${article.authorId}`);
    }

    for (const value of article.relatedGameIds) {
      if (!gameIds.has(value)) errors.push(`Article ${article.id} references missing game ${value}`);
    }

    for (const value of article.relatedSessionIds) {
      if (!sessionIds.has(value)) errors.push(`Article ${article.id} references missing session ${value}`);
    }

    for (const value of article.tagIds) {
      if (!tagIds.has(value)) errors.push(`Article ${article.id} references missing tag ${value}`);
    }

    for (const value of article.categoryIds) {
      if (!categoryIds.has(value)) errors.push(`Article ${article.id} references missing category ${value}`);
    }

    if (article.heroMediaId && !mediaIds.has(article.heroMediaId)) {
      errors.push(`Article ${article.id} references missing hero media ${article.heroMediaId}`);
    }
  }

  for (const media of data.media) {
    if (media.gameId && !gameIds.has(media.gameId)) {
      errors.push(`Media ${media.id} references missing game ${media.gameId}`);
    }

    if (media.sessionId && !sessionIds.has(media.sessionId)) {
      errors.push(`Media ${media.id} references missing session ${media.sessionId}`);
    }

    if (media.worldLocationId && !locationIds.has(media.worldLocationId)) {
      errors.push(`Media ${media.id} references missing world location ${media.worldLocationId}`);
    }
  }

  for (const location of data.worldLocations) {
    if (location.gameId && !gameIds.has(location.gameId)) {
      errors.push(`World location ${location.id} references missing game ${location.gameId}`);
    }

    if (location.parentLocationId && !locationIds.has(location.parentLocationId)) {
      errors.push(`World location ${location.id} references missing parent ${location.parentLocationId}`);
    }
  }

  return errors;
}
'@

# ------------------------------------------------------------
# 6) SEED DATA
# This is temporary local content, shaped exactly like future DB records.
# ------------------------------------------------------------
Write-NoBom "src\data\seed.ts" @'
import type { DatabaseSeed } from "../domain/schemas";

export const seedData: DatabaseSeed = {
  platforms: [
    {
      id: "platform-ps5-pro",
      code: "ps5-pro",
      name: "PlayStation 5 Pro",
      manufacturer: "Sony",
      active: true
    }
  ],

  tags: [
    {
      id: "tag-campaign",
      slug: "campaign",
      name: "Campaign",
      description: "Main campaign play sessions."
    }
  ],

  categories: [
    {
      id: "category-gaming",
      slug: "gaming",
      name: "Gaming",
      description: "DragonsRitual gaming coverage."
    }
  ],

  authors: [
    {
      id: "author-dragonsritual",
      slug: "dragonsritual",
      displayName: "DragonsRitual",
      bio: null,
      avatarMediaId: null
    }
  ],

  games: [
    {
      id: "game-ghost-of-yotei",
      slug: "ghost-of-yotei",
      title: "Ghost of Yōtei",
      platformId: "platform-ps5-pro",
      status: "active",
      releaseDate: null,
      developer: null,
      publisher: null,
      startedAt: "2026-08-01",
      completedAt: null,
      hoursPlayed: 11.8,
      progressPercent: 28,
      sessionCount: 4,
      lastPlayedAt: "2026-08-05",
      currentObjective: "Campaign progress",
      summary: null,
      coverMediaId: null,
      tagIds: ["tag-campaign"],
      categoryIds: ["category-gaming"]
    },
    {
      id: "game-death-stranding-2",
      slug: "death-stranding-2",
      title: "Death Stranding 2",
      platformId: "platform-ps5-pro",
      status: "queued",
      releaseDate: null,
      developer: null,
      publisher: null,
      startedAt: null,
      completedAt: null,
      hoursPlayed: 0,
      progressPercent: 0,
      sessionCount: 0,
      lastPlayedAt: null,
      currentObjective: "Not started",
      summary: null,
      coverMediaId: null,
      tagIds: [],
      categoryIds: ["category-gaming"]
    },
    {
      id: "game-ff7-rebirth",
      slug: "final-fantasy-vii-rebirth",
      title: "Final Fantasy VII Rebirth",
      platformId: "platform-ps5-pro",
      status: "active",
      releaseDate: null,
      developer: null,
      publisher: null,
      startedAt: null,
      completedAt: null,
      hoursPlayed: 19.4,
      progressPercent: 41,
      sessionCount: 7,
      lastPlayedAt: "2026-07-29",
      currentObjective: "Story progress",
      summary: null,
      coverMediaId: null,
      tagIds: ["tag-campaign"],
      categoryIds: ["category-gaming"]
    }
  ],

  streams: [
    {
      id: "stream-twitch-live",
      provider: "twitch",
      channel: "dragonsritual",
      liveUrl: "https://www.twitch.tv/dragonsritual",
      vodUrl: null,
      externalId: null,
      startedAt: null,
      endedAt: null
    }
  ],

  sessions: [
    {
      id: "session-ghost-004",
      gameId: "game-ghost-of-yotei",
      sequence: 4,
      title: "Ghost of Yōtei — Session 4",
      status: "completed",
      scheduledFor: null,
      startedAt: "2026-08-05T19:00:00-04:00",
      endedAt: "2026-08-05T21:30:00-04:00",
      durationMinutes: 150,
      progressBefore: 22,
      progressAfter: 28,
      result: "Campaign progress",
      notes: null,
      streamId: null,
      articleId: null,
      worldLocationId: null,
      mediaIds: [],
      tagIds: ["tag-campaign"]
    }
  ],

  articles: [],

  media: [],

  worldLocations: []
};
'@

# ------------------------------------------------------------
# 7) DATA SOURCE INTERFACE
# UI talks to this contract, not directly to local files/Supabase/Sanity.
# ------------------------------------------------------------
Write-NoBom "src\data\dataSource.ts" @'
import type {
  Article,
  Game,
  Session,
  Stream,
  WorldLocation
} from "../domain/schemas";

export interface DragonsRitualDataSource {
  listGames(): Promise<Game[]>;
  getGameBySlug(slug: string): Promise<Game | null>;
  listSessionsForGame(gameId: string): Promise<Session[]>;
  listUpcomingSessions(): Promise<Session[]>;
  listArticles(): Promise<Article[]>;
  getArticleBySlug(slug: string): Promise<Article | null>;
  getStream(id: string): Promise<Stream | null>;
  getWorldLocation(id: string): Promise<WorldLocation | null>;
}
'@

# ------------------------------------------------------------
# 8) LOCAL REPOSITORY
# Future Supabase adapter implements the same interface.
# ------------------------------------------------------------
Write-NoBom "src\data\localDataSource.ts" @'
import { databaseSeedSchema } from "../domain/schemas";
import { validateRelationships } from "../domain/validateRelationships";
import { seedData } from "./seed";
import type { DragonsRitualDataSource } from "./dataSource";

const parsed = databaseSeedSchema.parse(seedData);
const relationshipErrors = validateRelationships(parsed);

if (relationshipErrors.length > 0) {
  throw new Error(
    `DragonsRitual data relationship validation failed:\n${relationshipErrors.join("\n")}`
  );
}

export const localDataSource: DragonsRitualDataSource = {
  async listGames() {
    return [...parsed.games];
  },

  async getGameBySlug(slug) {
    return parsed.games.find((game) => game.slug === slug) ?? null;
  },

  async listSessionsForGame(gameId) {
    return parsed.sessions
      .filter((session) => session.gameId === gameId)
      .sort((a, b) => b.sequence - a.sequence);
  },

  async listUpcomingSessions() {
    return parsed.sessions
      .filter((session) => session.status === "scheduled")
      .sort((a, b) =>
        String(a.scheduledFor ?? "").localeCompare(String(b.scheduledFor ?? ""))
      );
  },

  async listArticles() {
    return [...parsed.articles];
  },

  async getArticleBySlug(slug) {
    return parsed.articles.find((article) => article.slug === slug) ?? null;
  },

  async getStream(id) {
    return parsed.streams.find((stream) => stream.id === id) ?? null;
  },

  async getWorldLocation(id) {
    return parsed.worldLocations.find((location) => location.id === id) ?? null;
  }
};
'@

# ------------------------------------------------------------
# 9) PUBLIC DATA SERVICE
# This is the only import pages should normally use.
# ------------------------------------------------------------
Write-NoBom "src\services\dataService.ts" @'
import { localDataSource } from "../data/localDataSource";
import type { DragonsRitualDataSource } from "../data/dataSource";

/*
  DATA PROVIDER SWITCH

  v0.5: localDataSource
  future: supabaseDataSource

  Public pages/services should depend on this exported contract,
  not on raw seed files or database libraries.
*/

export const dataService: DragonsRitualDataSource = localDataSource;
'@

# ------------------------------------------------------------
# 10) GAMING DASHBOARD VIEW MODEL
# Keeps presentation-specific formatting outside the DB layer.
# ------------------------------------------------------------
Write-NoBom "src\services\gamingDashboardService.ts" @'
import { dataService } from "./dataService";
import { seedData } from "../data/seed";

function formatDate(date: string | null) {
  if (!date) return "—";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(parsed);
}

export async function getGamingDashboard() {
  const games = await dataService.listGames();

  const platformMap = new Map(
    seedData.platforms.map((platform) => [platform.id, platform])
  );

  return {
    season: "2026",
    platform: "PS5 Pro",

    queue: games
      .filter((game) => game.status === "queued" || game.status === "active")
      .slice(0, 3)
      .map((game, index) => ({
        id: game.id,
        title: game.title,
        platform: platformMap.get(game.platformId)?.name ?? "Unknown",
        status: index === 0 ? "UP NEXT" : "QUEUE"
      })),

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
      platform: platformMap.get(game.platformId)?.name ?? "Unknown",
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
# 11) UPDATE ASTRO PAGE TO USE SERVICE, NOT RAW DATA
# Preserve visual layout.
# ------------------------------------------------------------
Write-NoBom "src\pages\index.astro" @'
---
import SiteLayout from "../layouts/SiteLayout.astro";
import SiteRail from "../components/SiteRail.astro";
import GamingHeader from "../components/GamingHeader.astro";
import TwitchPlayer from "../components/TwitchPlayer.astro";
import { getGamingDashboard } from "../services/gamingDashboardService";

const data = await getGamingDashboard();

const totalSessions = data.games.reduce((sum, game) => sum + game.sessions, 0);
const totalHours = data.games.reduce((sum, game) => sum + game.hours, 0).toFixed(1);
const activeGames = data.games.filter((game) => game.status === "Active").length;
---

<SiteLayout
  title={`DragonsRitual Gaming — Season ${data.season}`}
  description="DragonsRitual gaming broadcasts, upcoming schedule, session history and season statistics."
>
  <div class="app-shell">
    <SiteRail />

    <div class="app-main">
      <GamingHeader />

      <div class="app-page">
        <main class="page-shell">
          <section class="page-intro">
            <span>DRAGONSRITUAL / GAMING</span>
            <h1>Season {data.season}</h1>
            <p>
              Broadcasts, schedules, game history and a living statistical
              record of what gets played.
            </p>
          </section>

          <section class="broadcast-layout">
            <aside class="panel broadcast-side">
              <div class="panel-label">GAME QUEUE</div>

              <div class="queue-list">
                {data.queue.map((item, index) => (
                  <a class="queue-item" href="#stats">
                    <span class="queue-rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.platform}</small>
                    </span>

                    <em>{item.status}</em>
                  </a>
                ))}
              </div>
            </aside>

            <section class="broadcast-main">
              <TwitchPlayer />
            </section>

            <aside class="panel broadcast-side season-panel">
              <div class="panel-label">SEASON {data.season}</div>

              <dl class="season-stats">
                <div>
                  <dt>Platform</dt>
                  <dd>{data.platform}</dd>
                </div>

                <div>
                  <dt>Games Active</dt>
                  <dd>{activeGames}</dd>
                </div>

                <div>
                  <dt>Sessions</dt>
                  <dd>{totalSessions}</dd>
                </div>

                <div>
                  <dt>Hours Logged</dt>
                  <dd>{totalHours}</dd>
                </div>
              </dl>

              <a class="text-link" href="#stats">
                View full season ledger →
              </a>
            </aside>
          </section>

          <section class="schedule-strip" id="schedule">
            <div class="schedule-title">
              <span>DR SCHEDULE</span>
              <strong>UPCOMING</strong>
            </div>

            {data.schedule.map((item) => (
              <a class="schedule-game" href="#stats">
                <time>{item.date}</time>

                <span>
                  <strong>{item.game}</strong>
                  <small>{item.type}</small>
                </span>

                <em>{item.status}</em>
              </a>
            ))}
          </section>

          <section class="league-section" id="stats">
            <div class="section-heading">
              <div>
                <span>SEASON LEDGER</span>
                <h2>Gaming Statistics</h2>
              </div>

              <p>
                This page now reads through the DragonsRitual data service.
                The visual layer is no longer tied to a temporary JSON-like
                gaming file, preparing it for PostgreSQL.
              </p>
            </div>

            <div class="table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Status</th>
                    <th>GP</th>
                    <th>Hours</th>
                    <th>Progress</th>
                    <th>Last Played</th>
                    <th>Result</th>
                    <th>Recap</th>
                  </tr>
                </thead>

                <tbody>
                  {data.games.map((game) => (
                    <tr>
                      <td>
                        <a class="game-title" href="#stats">{game.title}</a>
                        <small>{game.platform}</small>
                      </td>

                      <td>
                        <span class="status-pill">{game.status}</span>
                      </td>

                      <td>{game.sessions}</td>
                      <td>{game.hours}</td>

                      <td>
                        <div class="progress-cell">
                          <span>{game.progress}%</span>

                          <div class="progress-track">
                            <i style={`width:${Number(game.progress) || 0}%`}></i>
                          </div>
                        </div>
                      </td>

                      <td>{game.lastPlayed}</td>
                      <td>{game.result}</td>
                      <td><span class="recap-link">COMING LATER</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <footer class="site-footer">
          <strong>DRAGONSRITUAL</strong>
          <span>Data foundation v0.5</span>
        </footer>
      </div>
    </div>
  </div>
</SiteLayout>
'@

# ------------------------------------------------------------
# 12) NODE VALIDATION SCRIPT
# ------------------------------------------------------------
Write-NoBom "scripts\validate-data.mjs" @'
import { databaseSeedSchema } from "../src/domain/schemas.ts";
import { validateRelationships } from "../src/domain/validateRelationships.ts";
import { seedData } from "../src/data/seed.ts";

try {
  const parsed = databaseSeedSchema.parse(seedData);
  const relationshipErrors = validateRelationships(parsed);

  if (relationshipErrors.length > 0) {
    console.error("Relationship validation failed:");
    relationshipErrors.forEach((error) => console.error(` - ${error}`));
    process.exit(1);
  }

  console.log("DragonsRitual data validation passed.");
  console.log(`Platforms: ${parsed.platforms.length}`);
  console.log(`Games: ${parsed.games.length}`);
  console.log(`Sessions: ${parsed.sessions.length}`);
  console.log(`Streams: ${parsed.streams.length}`);
  console.log(`Articles: ${parsed.articles.length}`);
  console.log(`Media: ${parsed.media.length}`);
  console.log(`World locations: ${parsed.worldLocations.length}`);
} catch (error) {
  console.error("Schema validation failed.");
  console.error(error);
  process.exit(1);
}
'@

# ------------------------------------------------------------
# 13) DATABASE BLUEPRINT DOCUMENT
# ------------------------------------------------------------
Write-NoBom "docs\data-architecture.md" @'
# DragonsRitual Data Architecture v0.5

The public interface is intentionally separated from storage.

## Core entities

- Platform
- Game
- Session
- Stream
- Article
- Author
- Tag
- Category
- Media
- WorldLocation

## Primary relationship chain

Game
→ Session
→ Stream
→ Article
→ Media
→ WorldLocation

A session may connect to a Twitch stream, article/recap, screenshots,
and eventually an exact location inside a DragonsRitual game world.

## Storage boundaries

### Supabase / PostgreSQL
Planned source of truth for:
- games
- platforms
- sessions
- schedules
- streams
- statistics
- world locations
- relational identifiers

### Sanity
Planned editorial source of truth for:
- article body
- editorial workflow
- drafts
- rich media composition
- newsroom publishing

Articles will retain relational IDs that connect editorial records to
games/sessions in PostgreSQL.

### Astro
Presentation and routing layer.

Astro pages should call the service layer rather than importing database
clients directly.

## Adapters

`src/data/dataSource.ts` defines the application data contract.

Current:
- `localDataSource`

Future:
- `supabaseDataSource`

Changing the backing store should not require rewriting page components.

## Deep-link future

`WorldLocation.deepLink` is reserved for links such as:

`/realms/play?location=founders-valley-forge`

This creates a future bridge between articles, sessions, the website,
and the playable 3D world.
'@

# ------------------------------------------------------------
# 14) README
# ------------------------------------------------------------
Write-NoBom "README.md" @'
# DragonsRitual Network

Astro-based modular DragonsRitual platform.

## Current public function

Gaming / Streaming.

## Architecture status

### v0.4
Astro frontend foundation.

### v0.5
Professional data/domain foundation:
- typed domain entities
- runtime schema validation
- relationship validation
- storage-independent data source contract
- local adapter
- gaming dashboard service
- Supabase-ready backend boundary
- Sanity-ready editorial relationship model
- world-location deep-link preparation

## Run

```powershell
npm run dev
```

## Build

```powershell
npm run build
```

## Validate data

```powershell
npm run data:validate
```

## Important rule

UI/pages should not directly depend on Supabase, Sanity, or temporary
seed files. They should consume application services so backend systems
can change independently.
'@

# ------------------------------------------------------------
# 15) REMOVE OLD v0.4 RAW GAMING DATA FILE
# No longer part of production architecture.
# ------------------------------------------------------------
if (Test-Path "src\data\gaming.js") {
    Remove-Item "src\data\gaming.js" -Force
}

# ------------------------------------------------------------
# 16) INSTALL, CHECK, BUILD
# ------------------------------------------------------------
npm install

Write-Host ""
Write-Host "Running data validation..." -ForegroundColor Cyan
# Astro/Vite will validate imported TypeScript during build;
# use Astro build as authoritative validation.
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v0.5 DATA FOUNDATION COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Created:" -ForegroundColor Cyan
Write-Host "  Domain schemas + types" -ForegroundColor White
Write-Host "  Relationship validator" -ForegroundColor White
Write-Host "  Local storage adapter" -ForegroundColor White
Write-Host "  Storage-independent data service" -ForegroundColor White
Write-Host "  Gaming dashboard view model" -ForegroundColor White
Write-Host "  Supabase-ready backend boundary" -ForegroundColor White
Write-Host "  Sanity-ready article relationships" -ForegroundColor White
Write-Host "  World-location/deep-link model" -ForegroundColor White
Write-Host ""
Write-Host "VISIBLE SITE SHOULD REMAIN ESSENTIALLY THE SAME." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $backupDir -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then inspect http://localhost:4321" -ForegroundColor White
Write-Host "Do NOT deploy until inspected." -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
