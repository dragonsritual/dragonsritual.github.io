$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v1.2 - Live Schedule + Safe Session Aggregation ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\sessions.astro")) {
    throw "STOPPED: v1.1 Session Editor was not found."
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
$backupDir = Join-Path (Get-Location) ".migration-backups\v1.2-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$targets = @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro",
    "src\pages\admin\schedule.astro",
    "src\services\gamingDashboardService.ts",
    "src\styles\admin.css",
    "src\styles\gaming.css"
)

foreach ($file in $targets) {
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
# 2) SQL MIGRATION
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070008_schedule_aggregation.sql" @'
-- DragonsRitual v1.2
-- Live schedule + safe session-driven aggregate statistics.

alter table public.games
add column if not exists session_stats_enabled boolean not null default false;

grant update (session_stats_enabled) on public.games to authenticated;

-- Internal recalculation function.
-- It only changes a game when that game's session_stats_enabled flag is true.
create or replace function public.recalculate_game_stats_internal(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  enabled boolean;
  completed_count integer;
  total_hours numeric(10,2);
  latest_progress numeric(5,2);
  latest_played date;
begin
  select session_stats_enabled
  into enabled
  from public.games
  where id = p_game_id;

  if coalesce(enabled, false) = false then
    return;
  end if;

  select
    count(*) filter (where status = 'completed'),
    coalesce(
      round(
        (sum(duration_minutes) filter (where status = 'completed'))::numeric / 60.0,
        2
      ),
      0
    ),
    (
      select s.progress_after
      from public.sessions s
      where s.game_id = p_game_id
        and s.status = 'completed'
        and s.progress_after is not null
      order by coalesce(s.ended_at, s.started_at, s.created_at) desc
      limit 1
    ),
    (
      select coalesce(s.started_at, s.ended_at)::date
      from public.sessions s
      where s.game_id = p_game_id
        and s.status = 'completed'
        and (s.started_at is not null or s.ended_at is not null)
      order by coalesce(s.ended_at, s.started_at, s.created_at) desc
      limit 1
    )
  into completed_count, total_hours, latest_progress, latest_played
  from public.sessions
  where game_id = p_game_id;

  update public.games
  set
    session_count = coalesce(completed_count, 0),
    hours_played = coalesce(total_hours, 0),
    progress_percent = coalesce(latest_progress, progress_percent),
    last_played_at = coalesce(latest_played, last_played_at)
  where id = p_game_id;
end;
$$;

revoke all on function public.recalculate_game_stats_internal(uuid) from public;

-- Admin-facing RPC.
create or replace function public.recalculate_game_stats(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  perform public.recalculate_game_stats_internal(p_game_id);
end;
$$;

revoke all on function public.recalculate_game_stats(uuid) from public;
grant execute on function public.recalculate_game_stats(uuid) to authenticated;

-- Trigger keeps enabled games synchronized after session changes.
create or replace function public.sync_game_stats_from_session_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_game_stats_internal(old.game_id);
    return old;
  end if;

  perform public.recalculate_game_stats_internal(new.game_id);

  if tg_op = 'UPDATE' and old.game_id is distinct from new.game_id then
    perform public.recalculate_game_stats_internal(old.game_id);
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_sync_game_stats on public.sessions;

create trigger sessions_sync_game_stats
after insert or update or delete on public.sessions
for each row
execute function public.sync_game_stats_from_session_change();

-- Existing games stay OFF by default.
-- This protects historical totals until the owner decides a game's session
-- history is complete enough to become authoritative.
'@

# ------------------------------------------------------------
# 3) LIVE GAMING DASHBOARD SERVICE
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

function formatScheduleDate(value: string | null) {
  if (!value) return "TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit"
  })
    .format(date)
    .toUpperCase();
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
  const [games, upcomingSessions] = await Promise.all([
    dataService.listGames(),
    dataService.listUpcomingSessions()
  ]);

  const platformMap = await getPlatformNames();
  const gameMap = new Map(games.map((game) => [game.id, game]));

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

    schedule: upcomingSessions.slice(0, 4).map((session) => {
      const game = gameMap.get(session.gameId);

      return {
        id: session.id,
        date: formatScheduleDate(session.scheduledFor),
        game: game?.title ?? "Unknown Game",
        type: session.result || session.title,
        status:
          session.status === "live"
            ? "Live"
            : session.status === "scheduled"
              ? "Scheduled"
              : session.status
      };
    }),

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
# 4) UPDATE PUBLIC SCHEDULE STRIP TO HANDLE EMPTY/LIVE DATA
# ------------------------------------------------------------
$indexPath = "src\pages\index.astro"
$indexContent = Get-Content $indexPath -Raw

$oldSchedule = @'
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
'@

$newSchedule = @'
            {data.schedule.length > 0 ? (
              data.schedule.map((item) => (
                <a class="schedule-game" href="#stats">
                  <time>{item.date}</time>

                  <span>
                    <strong>{item.game}</strong>
                    <small>{item.type}</small>
                  </span>

                  <em>{item.status}</em>
                </a>
              ))
            ) : (
              <div class="schedule-empty">
                No upcoming sessions scheduled.
              </div>
            )}
'@

if ($indexContent.Contains($oldSchedule)) {
    $indexContent = $indexContent.Replace($oldSchedule, $newSchedule)
    [System.IO.File]::WriteAllText(
        (Resolve-Path $indexPath),
        $indexContent,
        $Utf8NoBom
    )
}
else {
    Write-Host "NOTE: public schedule markup differed; no replacement was made." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 5) SCHEDULE ADMIN PAGE
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\schedule.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
---

<AdminLayout title="Schedule — DragonsRitual">
  <div id="schedule-auth-loading" class="admin-auth-loading">
    <span>DRAGONSRITUAL CONTROL ROOM</span>
    <strong>Loading schedule…</strong>
  </div>

  <div id="schedule-denied" class="admin-login-card" hidden>
    <span class="admin-auth-kicker">ACCESS DENIED</span>
    <h1>Owner access required.</h1>
    <a class="admin-public-link" href="/admin/">← Return to Control Room</a>
  </div>

  <div id="schedule-app" class="admin-shell" hidden>
    <aside class="admin-rail">
      <a class="admin-brand" href="/admin/">
        <span class="admin-brand__mark">DR</span>
        <span>
          <strong>CONTROL ROOM</strong>
          <small>DRAGONSRITUAL</small>
        </span>
      </a>

      <div class="admin-rail__label">ADMIN</div>

      <nav class="admin-nav">
        <a href="/admin/"><span>01</span><strong>Overview</strong></a>
        <a href="/admin/games/"><span>02</span><strong>Games</strong><em>LIVE</em></a>
        <a href="/admin/sessions/"><span>03</span><strong>Sessions</strong><em>LIVE</em></a>
        <a class="is-active" href="/admin/schedule/"><span>04</span><strong>Schedule</strong><em>LIVE</em></a>
        <button type="button" disabled><span>05</span><strong>Media</strong><em>LATER</em></button>
        <button type="button" disabled><span>06</span><strong>Newsroom</strong><em>LATER</em></button>
      </nav>

      <div class="admin-rail__bottom">
        <button id="schedule-logout" class="admin-logout" type="button">Sign Out</button>
        <a href="/">← Public Gaming</a>
        <small>SCHEDULE v1.2</small>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <span>DRAGONSRITUAL / LIVE SCHEDULE</span>
          <h1>Schedule</h1>
        </div>

        <a class="admin-primary-button admin-button-link" href="/admin/sessions/">
          + Create Session
        </a>
      </header>

      <section class="admin-warning admin-warning--secure">
        <strong>PUBLIC FEED ACTIVE</strong>
        <p>
          Scheduled session records now feed the public Gaming page automatically.
          Edit the underlying session in the Session Editor.
        </p>
      </section>

      <section class="schedule-admin-grid">
        <article class="admin-panel">
          <header class="admin-panel__header">
            <div>
              <span>UPCOMING</span>
              <h2>Scheduled Sessions</h2>
            </div>
            <span id="schedule-count" class="admin-readonly">0</span>
          </header>

          <div id="schedule-list" class="schedule-admin-list">
            <div class="game-admin-loading">Loading scheduled sessions…</div>
          </div>
        </article>

        <article class="admin-panel">
          <header class="admin-panel__header">
            <div>
              <span>STAT SAFETY</span>
              <h2>Session Aggregation</h2>
            </div>
          </header>

          <div class="aggregation-explainer">
            <p>
              Existing games keep their current manual totals until you explicitly
              enable session-driven statistics for that game.
            </p>

            <p>
              When enabled, completed sessions become authoritative for:
              session count, total hours, latest progress, and last-played date.
            </p>

            <a href="/admin/games/">Manage game settings →</a>
          </div>
        </article>
      </section>
    </main>
  </div>

  <script>
    import { requireAdmin } from "../../services/auth/adminGuard";

    const loading = document.querySelector("#schedule-auth-loading");
    const denied = document.querySelector("#schedule-denied");
    const app = document.querySelector("#schedule-app");
    const list = document.querySelector("#schedule-list");
    const count = document.querySelector("#schedule-count");

    let supabase;

    function formatDate(value) {
      if (!value) return "TBD";

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "TBD";

      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    }

    async function loadSchedule() {
      const [{ data: games, error: gameError }, { data: sessions, error: sessionError }] =
        await Promise.all([
          supabase.from("games").select("id,title"),
          supabase
            .from("sessions")
            .select("id,game_id,title,status,scheduled_for,result")
            .in("status", ["scheduled", "live"])
            .order("scheduled_for", { ascending: true })
        ]);

      if (gameError) throw gameError;
      if (sessionError) throw sessionError;

      const gameMap = new Map((games ?? []).map((game) => [game.id, game.title]));
      const rows = sessions ?? [];

      if (count) count.textContent = String(rows.length);
      if (!list) return;

      list.innerHTML = "";

      if (rows.length === 0) {
        list.innerHTML = `<div class="game-admin-loading">No upcoming sessions scheduled.</div>`;
        return;
      }

      for (const session of rows) {
        const item = document.createElement("a");
        item.className = "schedule-admin-item";
        item.href = "/admin/sessions/";

        const date = document.createElement("time");
        date.textContent = formatDate(session.scheduled_for);

        const body = document.createElement("span");
        const strong = document.createElement("strong");
        strong.textContent = session.title;

        const small = document.createElement("small");
        small.textContent =
          `${gameMap.get(session.game_id) ?? "Unknown Game"} · ${session.result ?? "Scheduled play"}`;

        body.append(strong, small);

        const status = document.createElement("em");
        status.textContent = session.status.toUpperCase();

        item.append(date, body, status);
        list.appendChild(item);
      }
    }

    async function boot() {
      const auth = await requireAdmin();
      supabase = auth.supabase;

      loading?.setAttribute("hidden", "");

      if (!auth.ok) {
        denied?.removeAttribute("hidden");
        return;
      }

      app?.removeAttribute("hidden");
      await loadSchedule();
    }

    document
      .querySelector("#schedule-logout")
      ?.addEventListener("click", async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        location.href = "/admin/";
      });

    boot().catch((error) => {
      console.error(error);
      loading?.setAttribute("hidden", "");
      denied?.removeAttribute("hidden");
    });
  </script>
</AdminLayout>
'@

# ------------------------------------------------------------
# 6) ENABLE SCHEDULE NAV IN EXISTING ADMIN PAGES
# ------------------------------------------------------------
foreach ($page in @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro"
)) {
    $content = Get-Content $page -Raw

    $content = $content -replace '<button type="button" disabled>\s*<span>04</span>\s*<strong>Schedule</strong>\s*<em>(NEXT|EDITOR NEXT)</em>\s*</button>', @'
<a href="/admin/schedule/">
          <span>04</span>
          <strong>Schedule</strong>
          <em>LIVE</em>
        </a>
'@

    [System.IO.File]::WriteAllText(
        (Resolve-Path $page),
        $content,
        $Utf8NoBom
    )
}

# ------------------------------------------------------------
# 7) ADD SESSION STATS CONTROL TO GAME EDITOR
# ------------------------------------------------------------
$gamesPath = "src\pages\admin\games.astro"
$gamesContent = Get-Content $gamesPath -Raw

$gamesContent = $gamesContent.Replace(
'            <input id="game-id" type="hidden" />',
@'
            <input id="game-id" type="hidden" />

            <div class="aggregation-control">
              <label class="aggregation-toggle">
                <input id="game-session-stats-enabled" type="checkbox" />
                <span>
                  <strong>Session-driven statistics</strong>
                  <small>
                    OFF by default. Enable only when this game's completed
                    session history is complete enough to become authoritative.
                  </small>
                </span>
              </label>

              <button
                id="recalculate-game-button"
                class="admin-secondary-button"
                type="button"
              >
                Recalculate From Sessions
              </button>
            </div>
'@
)

$gamesContent = $gamesContent.Replace(
'    const summaryInput = document.querySelector("#game-summary");',
@'
    const summaryInput = document.querySelector("#game-summary");
    const sessionStatsEnabledInput = document.querySelector("#game-session-stats-enabled");
'@
)

$gamesContent = $gamesContent.Replace(
'      if (summaryInput) summaryInput.value = game.summary ?? "";',
@'
      if (summaryInput) summaryInput.value = game.summary ?? "";
      if (sessionStatsEnabledInput) {
        sessionStatsEnabledInput.checked = Boolean(game.session_stats_enabled);
      }
'@
)

$gamesContent = $gamesContent.Replace(
'            summary
          `)',
@'
            summary,
            session_stats_enabled
          `)
'@
)

$gamesContent = $gamesContent.Replace(
'        summary: summaryInput?.value?.trim() || null
      };',
@'
        summary: summaryInput?.value?.trim() || null,
        session_stats_enabled: Boolean(sessionStatsEnabledInput?.checked)
      };
'@
)

$insertAnchor = @'
    async function boot() {
'@

$recalcFunction = @'
    async function recalculateSelectedGame() {
      if (!selectedId) {
        setMessage("Select an existing game first.", "error");
        return;
      }

      if (!sessionStatsEnabledInput?.checked) {
        setMessage(
          "Enable Session-driven statistics and save the game first.",
          "error"
        );
        return;
      }

      setSaveState("CALCULATING");
      setMessage("Recalculating from completed sessions…");

      const { error } = await supabase.rpc("recalculate_game_stats", {
        p_game_id: selectedId
      });

      if (error) {
        console.error(error);
        setSaveState("ERROR");
        setMessage(error.message, "error");
        return;
      }

      setSaveState("SAVED");
      setMessage("Game totals recalculated from sessions.", "success");
      await loadData();
    }

'@

if ($gamesContent.Contains($insertAnchor)) {
    $gamesContent = $gamesContent.Replace($insertAnchor, $recalcFunction + $insertAnchor)
}

$gamesContent = $gamesContent.Replace(
'    form?.addEventListener("submit", saveGame);',
@'
    form?.addEventListener("submit", saveGame);

    document
      .querySelector("#recalculate-game-button")
      ?.addEventListener("click", recalculateSelectedGame);
'@
)

[System.IO.File]::WriteAllText(
    (Resolve-Path $gamesPath),
    $gamesContent,
    $Utf8NoBom
)

# ------------------------------------------------------------
# 8) ADMIN + PUBLIC STYLES
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\admin.css" @'

/* ---------------------------------------------------------------
   v1.2 SCHEDULE + SAFE AGGREGATION
---------------------------------------------------------------- */

.admin-button-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.schedule-admin-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1.35fr .65fr;
  gap: 12px;
}

.schedule-admin-list {
  display: grid;
}

.schedule-admin-item {
  min-height: 72px;
  padding: 14px 16px;

  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  gap: 16px;

  border-bottom: 1px solid var(--line);
  color: var(--text);
}

.schedule-admin-item:last-child {
  border-bottom: 0;
}

.schedule-admin-item:hover {
  background: rgba(255,255,255,.025);
}

.schedule-admin-item time {
  color: var(--accent);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .06em;
}

.schedule-admin-item strong,
.schedule-admin-item small {
  display: block;
}

.schedule-admin-item strong {
  font-size: 11px;
}

.schedule-admin-item small {
  margin-top: 5px;
  color: var(--muted);
  font-size: 8px;
}

.schedule-admin-item em {
  color: var(--accent);
  font-size: 7px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: .08em;
}

.aggregation-explainer {
  padding: 20px 18px;
}

.aggregation-explainer p {
  margin: 0 0 14px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.7;
}

.aggregation-explainer a {
  color: var(--accent);
  font-size: 9px;
  font-weight: 900;
}

.aggregation-control {
  margin-bottom: 18px;
  padding: 14px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  border: 1px solid rgba(231,189,79,.18);
  background: rgba(231,189,79,.035);
}

.aggregation-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.aggregation-toggle input {
  margin-top: 3px;
}

.aggregation-toggle strong,
.aggregation-toggle small {
  display: block;
}

.aggregation-toggle strong {
  color: var(--text);
  font-size: 9px;
}

.aggregation-toggle small {
  margin-top: 4px;
  max-width: 560px;
  color: var(--muted);
  font-size: 8px;
  line-height: 1.5;
}

@media (max-width: 850px) {
  .schedule-admin-grid {
    grid-template-columns: 1fr;
  }

  .schedule-admin-item {
    grid-template-columns: 1fr;
  }

  .aggregation-control {
    align-items: stretch;
    flex-direction: column;
  }
}
'@

Add-Content -Encoding UTF8 "src\styles\gaming.css" @'

/* v1.2 live schedule */
.schedule-empty {
  min-height: 100%;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  color: #747b87;
  font-size: 9px;
  letter-spacing: .04em;
}
'@

# ------------------------------------------------------------
# 9) DOCS
# ------------------------------------------------------------
Write-NoBom "docs\v1.2-schedule-aggregation.md" @'
# DragonsRitual v1.2

## Live schedule

The public Gaming schedule now comes from real `sessions` records with
status `scheduled`.

Use `/admin/sessions/` to create/edit a scheduled session.

Use `/admin/schedule/` to inspect the public-facing schedule queue.

## Safe game aggregation

A new `games.session_stats_enabled` flag is OFF by default.

This prevents incomplete historical session data from overwriting existing
manual season totals.

When enabled for a game, completed sessions become authoritative for:

- session_count
- hours_played
- progress_percent (latest completed progress_after)
- last_played_at

The session trigger automatically recalculates enabled games after session
INSERT/UPDATE/DELETE.

The Game Editor also exposes a manual "Recalculate From Sessions" action.

## Safety

Do not enable session-driven statistics on an existing game until its
completed session history is sufficiently complete.
'@

# ------------------------------------------------------------
# 10) BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v1.2 COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Added:" -ForegroundColor Cyan
Write-Host "  Real public schedule from Supabase sessions" -ForegroundColor White
Write-Host "  /admin/schedule/" -ForegroundColor White
Write-Host "  Safe opt-in session statistics aggregation" -ForegroundColor White
Write-Host "  Automatic aggregation trigger" -ForegroundColor White
Write-Host "  Manual Recalculate From Sessions button" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "Apply migration 202608070008_schedule_aggregation.sql before testing." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Apply migration #8 in Supabase SQL Editor." -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Open /admin/schedule/ and /admin/games/" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
