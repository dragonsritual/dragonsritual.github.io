$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v1.1 - Session Editor ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\games.astro")) {
    throw "STOPPED: v1.0 Game Editor was not found."
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
$backupDir = Join-Path (Get-Location) ".migration-backups\v1.1-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$targets = @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro",
    "src\styles\admin.css"
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
# 2) SQL MIGRATION - SESSION EDITOR PERMISSIONS
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070007_session_editor_permissions.sql" @'
-- DragonsRitual v1.1
-- Session editor permissions.
--
-- Read policies for authenticated users were added in migration 0006.
-- This migration makes the intended session write permissions explicit.

grant select, insert, update on table public.sessions to authenticated;
grant select on table public.games to authenticated;
grant select on table public.streams to authenticated;

drop policy if exists "admins insert sessions" on public.sessions;
create policy "admins insert sessions"
on public.sessions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update sessions" on public.sessions;
create policy "admins update sessions"
on public.sessions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No DELETE policy in v1.1.
-- Use status=cancelled instead of permanently destroying a session.
'@

# ------------------------------------------------------------
# 3) UPDATE ADMIN OVERVIEW NAV
# ------------------------------------------------------------
$adminIndex = Get-Content "src\pages\admin\index.astro" -Raw

$adminIndex = $adminIndex -replace '<button type="button" disabled>\s*<span>03</span>\s*<strong>Sessions</strong>\s*<em>EDITOR NEXT</em>\s*</button>', @'
<a href="/admin/sessions/">
            <span>03</span>
            <strong>Sessions</strong>
            <em>LIVE</em>
          </a>
'@

$adminIndex = $adminIndex -replace '<span class="admin-next__number">v1\.1</span>\s*<h3>Session Editor</h3>\s*<p>\s*The Game Editor is now live\. Next we add real session logging,\s*stream scheduling, play-time records, and session recaps\.\s*</p>', @'
<span class="admin-next__number">v1.2</span>
              <h3>Schedule + Aggregates</h3>
              <p>
                Game and Session editors are live. Next we connect scheduled
                sessions to the public schedule and add safe stat aggregation.
              </p>
'@

[System.IO.File]::WriteAllText(
    (Resolve-Path "src\pages\admin\index.astro"),
    $adminIndex,
    $Utf8NoBom
)

# ------------------------------------------------------------
# 4) UPDATE GAME EDITOR NAV
# ------------------------------------------------------------
$gamesPage = Get-Content "src\pages\admin\games.astro" -Raw

$gamesPage = $gamesPage -replace '<button type="button" disabled>\s*<span>03</span>\s*<strong>Sessions</strong>\s*<em>NEXT</em>\s*</button>', @'
<a href="/admin/sessions/">
          <span>03</span>
          <strong>Sessions</strong>
          <em>LIVE</em>
        </a>
'@

[System.IO.File]::WriteAllText(
    (Resolve-Path "src\pages\admin\games.astro"),
    $gamesPage,
    $Utf8NoBom
)

# ------------------------------------------------------------
# 5) SESSION EDITOR PAGE
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\sessions.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
---

<AdminLayout title="Session Editor — DragonsRitual">
  <div id="session-auth-loading" class="admin-auth-loading">
    <span>DRAGONSRITUAL CONTROL ROOM</span>
    <strong>Verifying owner access…</strong>
  </div>

  <div id="session-denied" class="admin-login-card" hidden>
    <span class="admin-auth-kicker">ACCESS DENIED</span>
    <h1>Owner access required.</h1>
    <p>You must sign into the authorized DragonsRitual admin account.</p>
    <a class="admin-public-link" href="/admin/">← Return to Control Room</a>
  </div>

  <div id="session-app" class="admin-shell" hidden>
    <aside class="admin-rail">
      <a class="admin-brand" href="/admin/">
        <span class="admin-brand__mark">DR</span>
        <span>
          <strong>CONTROL ROOM</strong>
          <small>DRAGONSRITUAL</small>
        </span>
      </a>

      <div class="admin-rail__label">ADMIN</div>

      <nav class="admin-nav" aria-label="Admin navigation">
        <a href="/admin/">
          <span>01</span>
          <strong>Overview</strong>
        </a>

        <a href="/admin/games/">
          <span>02</span>
          <strong>Games</strong>
          <em>LIVE</em>
        </a>

        <a class="is-active" href="/admin/sessions/">
          <span>03</span>
          <strong>Sessions</strong>
          <em>LIVE</em>
        </a>

        <button type="button" disabled>
          <span>04</span>
          <strong>Schedule</strong>
          <em>NEXT</em>
        </button>

        <button type="button" disabled>
          <span>05</span>
          <strong>Media</strong>
          <em>LATER</em>
        </button>

        <button type="button" disabled>
          <span>06</span>
          <strong>Newsroom</strong>
          <em>LATER</em>
        </button>
      </nav>

      <div class="admin-rail__bottom">
        <button id="session-logout" class="admin-logout" type="button">Sign Out</button>
        <a href="/">← Public Gaming</a>
        <small>SESSION EDITOR v1.1</small>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <span>DRAGONSRITUAL / PLAY RECORDS</span>
          <h1>Session Editor</h1>
        </div>

        <button id="new-session-button" class="admin-primary-button" type="button">
          + New Session
        </button>
      </header>

      <section class="admin-warning admin-warning--secure">
        <strong>OWNER WRITE ACCESS</strong>
        <p>
          Sessions are the historical record beneath each game: scheduled play,
          live streams, completed play time, progress changes, and recap notes.
        </p>
      </section>

      <section class="session-toolbar">
        <label>
          <span>FILTER GAME</span>
          <select id="session-filter-game"></select>
        </label>

        <div class="session-toolbar__metrics">
          <span><strong id="session-total-count">0</strong> sessions</span>
          <span><strong id="session-total-minutes">0</strong> minutes logged</span>
        </div>
      </section>

      <section class="game-editor-layout">
        <article class="admin-panel game-list-panel">
          <header class="admin-panel__header">
            <div>
              <span>DATABASE</span>
              <h2>Sessions</h2>
            </div>
            <span id="session-count" class="admin-readonly">0</span>
          </header>

          <div id="session-list" class="game-admin-list">
            <div class="game-admin-loading">Loading sessions…</div>
          </div>
        </article>

        <article class="admin-panel game-form-panel">
          <header class="admin-panel__header">
            <div>
              <span id="session-form-eyebrow">NEW RECORD</span>
              <h2 id="session-form-title">Create Session</h2>
            </div>
            <span id="session-save-state" class="admin-readonly">NEW</span>
          </header>

          <form id="session-form" class="game-form">
            <input id="session-id" type="hidden" />

            <div class="game-form-grid">
              <label class="game-form-field">
                <span>Game</span>
                <select id="session-game" required></select>
              </label>

              <label class="game-form-field">
                <span>Session Number</span>
                <input id="session-sequence" type="number" min="1" step="1" required />
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Session Title</span>
                <input
                  id="session-title"
                  type="text"
                  required
                  placeholder="Ghost of Yōtei — Session 5"
                />
              </label>

              <label class="game-form-field">
                <span>Status</span>
                <select id="session-status" required>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <label class="game-form-field">
                <span>Twitch / Stream</span>
                <select id="session-stream">
                  <option value="">No linked stream</option>
                </select>
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Scheduled For</span>
                <input id="session-scheduled-for" type="datetime-local" />
              </label>

              <label class="game-form-field">
                <span>Started At</span>
                <input id="session-started-at" type="datetime-local" />
              </label>

              <label class="game-form-field">
                <span>Ended At</span>
                <input id="session-ended-at" type="datetime-local" />
              </label>

              <label class="game-form-field">
                <span>Duration Minutes</span>
                <input id="session-duration" type="number" min="0" step="1" value="0" />
              </label>

              <label class="game-form-field">
                <span>Progress Before %</span>
                <input id="session-progress-before" type="number" min="0" max="100" step="1" />
              </label>

              <label class="game-form-field">
                <span>Progress After %</span>
                <input id="session-progress-after" type="number" min="0" max="100" step="1" />
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Result</span>
                <input
                  id="session-result"
                  type="text"
                  placeholder="Campaign progress / boss defeated / first look"
                />
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Session Notes</span>
                <textarea
                  id="session-notes"
                  rows="7"
                  placeholder="What happened during this session?"
                ></textarea>
              </label>
            </div>

            <div class="session-auto-tools">
              <button id="calculate-duration-button" class="admin-secondary-button" type="button">
                Calculate Duration
              </button>

              <button id="suggest-title-button" class="admin-secondary-button" type="button">
                Suggest Title
              </button>
            </div>

            <div class="game-form-actions">
              <button id="save-session-button" class="admin-primary-button" type="submit">
                Save Session
              </button>

              <button id="reset-session-button" class="admin-secondary-button" type="button">
                Reset
              </button>

              <span id="session-form-message" class="game-form-message" aria-live="polite"></span>
            </div>
          </form>
        </article>
      </section>
    </main>
  </div>

  <script>
    import { requireAdmin } from "../../services/auth/adminGuard";

    const loading = document.querySelector("#session-auth-loading");
    const denied = document.querySelector("#session-denied");
    const app = document.querySelector("#session-app");

    const list = document.querySelector("#session-list");
    const count = document.querySelector("#session-count");
    const totalCount = document.querySelector("#session-total-count");
    const totalMinutes = document.querySelector("#session-total-minutes");
    const filterGame = document.querySelector("#session-filter-game");

    const form = document.querySelector("#session-form");
    const formEyebrow = document.querySelector("#session-form-eyebrow");
    const formTitle = document.querySelector("#session-form-title");
    const saveState = document.querySelector("#session-save-state");
    const message = document.querySelector("#session-form-message");

    const idInput = document.querySelector("#session-id");
    const gameInput = document.querySelector("#session-game");
    const sequenceInput = document.querySelector("#session-sequence");
    const titleInput = document.querySelector("#session-title");
    const statusInput = document.querySelector("#session-status");
    const streamInput = document.querySelector("#session-stream");
    const scheduledInput = document.querySelector("#session-scheduled-for");
    const startedInput = document.querySelector("#session-started-at");
    const endedInput = document.querySelector("#session-ended-at");
    const durationInput = document.querySelector("#session-duration");
    const progressBeforeInput = document.querySelector("#session-progress-before");
    const progressAfterInput = document.querySelector("#session-progress-after");
    const resultInput = document.querySelector("#session-result");
    const notesInput = document.querySelector("#session-notes");

    let supabase;
    let games = [];
    let streams = [];
    let sessions = [];
    let selectedId = null;

    function setMessage(text, type = "") {
      if (!message) return;
      message.textContent = text;
      message.dataset.type = type;
    }

    function setSaveState(text) {
      if (saveState) saveState.textContent = text;
    }

    function toLocalInput(value) {
      if (!value) return "";

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";

      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    }

    function fromLocalInput(value) {
      if (!value) return null;

      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function gameTitle(gameId) {
      return games.find((game) => game.id === gameId)?.title ?? "Unknown Game";
    }

    function streamLabel(streamId) {
      if (!streamId) return "No stream";
      const stream = streams.find((item) => item.id === streamId);
      return stream ? `${stream.provider} / ${stream.channel}` : "Linked stream";
    }

    function nextSequence(gameId) {
      const values = sessions
        .filter((session) => session.game_id === gameId)
        .map((session) => Number(session.sequence ?? 0));

      return values.length ? Math.max(...values) + 1 : 1;
    }

    function suggestTitle() {
      const gameId = gameInput?.value;
      const game = games.find((item) => item.id === gameId);
      if (!game || !titleInput) return;

      const sequence = Number(sequenceInput?.value || nextSequence(gameId));
      titleInput.value = `${game.title} — Session ${sequence}`;
    }

    function resetForm() {
      selectedId = null;
      form?.reset();

      if (idInput) idInput.value = "";
      if (statusInput) statusInput.value = "scheduled";
      if (durationInput) durationInput.value = "0";

      if (games.length > 0 && gameInput) {
        const preferred =
          filterGame?.value && filterGame.value !== "all"
            ? filterGame.value
            : games[0].id;

        gameInput.value = preferred;
        if (sequenceInput) sequenceInput.value = String(nextSequence(preferred));
      }

      if (formEyebrow) formEyebrow.textContent = "NEW RECORD";
      if (formTitle) formTitle.textContent = "Create Session";

      setSaveState("NEW");
      setMessage("");
      suggestTitle();

      document
        .querySelectorAll(".game-admin-item")
        .forEach((item) => item.classList.remove("is-selected"));
    }

    function populateForm(session) {
      selectedId = session.id;

      if (idInput) idInput.value = session.id;
      if (gameInput) gameInput.value = session.game_id;
      if (sequenceInput) sequenceInput.value = String(session.sequence ?? 1);
      if (titleInput) titleInput.value = session.title ?? "";
      if (statusInput) statusInput.value = session.status ?? "scheduled";
      if (streamInput) streamInput.value = session.stream_id ?? "";
      if (scheduledInput) scheduledInput.value = toLocalInput(session.scheduled_for);
      if (startedInput) startedInput.value = toLocalInput(session.started_at);
      if (endedInput) endedInput.value = toLocalInput(session.ended_at);
      if (durationInput) durationInput.value = String(session.duration_minutes ?? 0);
      if (progressBeforeInput) {
        progressBeforeInput.value =
          session.progress_before == null ? "" : String(session.progress_before);
      }
      if (progressAfterInput) {
        progressAfterInput.value =
          session.progress_after == null ? "" : String(session.progress_after);
      }
      if (resultInput) resultInput.value = session.result ?? "";
      if (notesInput) notesInput.value = session.notes ?? "";

      if (formEyebrow) formEyebrow.textContent = "EDIT RECORD";
      if (formTitle) formTitle.textContent = session.title;

      setSaveState("READY");
      setMessage("");

      document
        .querySelectorAll(".game-admin-item")
        .forEach((item) =>
          item.classList.toggle("is-selected", item.dataset.id === session.id)
        );
    }

    function renderGameOptions() {
      if (gameInput) {
        gameInput.innerHTML = "";
        for (const game of games) {
          const option = document.createElement("option");
          option.value = game.id;
          option.textContent = game.title;
          gameInput.appendChild(option);
        }
      }

      if (filterGame) {
        filterGame.innerHTML = "";

        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "All Games";
        filterGame.appendChild(all);

        for (const game of games) {
          const option = document.createElement("option");
          option.value = game.id;
          option.textContent = game.title;
          filterGame.appendChild(option);
        }
      }
    }

    function renderStreamOptions() {
      if (!streamInput) return;

      streamInput.innerHTML = "";

      const none = document.createElement("option");
      none.value = "";
      none.textContent = "No linked stream";
      streamInput.appendChild(none);

      for (const stream of streams) {
        const option = document.createElement("option");
        option.value = stream.id;
        option.textContent = `${stream.provider.toUpperCase()} / ${stream.channel}`;
        streamInput.appendChild(option);
      }
    }

    function filteredSessions() {
      if (!filterGame || filterGame.value === "all") return sessions;
      return sessions.filter((session) => session.game_id === filterGame.value);
    }

    function renderSessions() {
      if (!list) return;

      const visible = filteredSessions();

      list.innerHTML = "";
      if (count) count.textContent = String(visible.length);
      if (totalCount) totalCount.textContent = String(sessions.length);
      if (totalMinutes) {
        totalMinutes.textContent = String(
          sessions.reduce(
            (sum, session) => sum + Number(session.duration_minutes ?? 0),
            0
          )
        );
      }

      if (visible.length === 0) {
        list.innerHTML = `<div class="game-admin-loading">No sessions yet.</div>`;
        return;
      }

      for (const session of visible) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "game-admin-item session-admin-item";
        button.dataset.id = session.id;

        if (session.id === selectedId) button.classList.add("is-selected");

        const top = document.createElement("span");
        top.className = "game-admin-item__top";

        const title = document.createElement("strong");
        title.textContent = session.title;

        const status = document.createElement("em");
        status.textContent = session.status.toUpperCase();

        top.append(title, status);

        const game = document.createElement("small");
        game.textContent =
          `${gameTitle(session.game_id)} · ${Number(session.duration_minutes ?? 0)} min`;

        const stream = document.createElement("small");
        stream.textContent = streamLabel(session.stream_id);

        button.append(top, game, stream);
        button.addEventListener("click", () => populateForm(session));
        list.appendChild(button);
      }
    }

    async function loadData() {
      const [gameResult, streamResult, sessionResult] = await Promise.all([
        supabase
          .from("games")
          .select("id,title,slug,status")
          .order("title"),

        supabase
          .from("streams")
          .select("id,provider,channel,live_url,vod_url")
          .order("created_at", { ascending: true }),

        supabase
          .from("sessions")
          .select(`
            id,
            game_id,
            sequence,
            title,
            status,
            scheduled_for,
            started_at,
            ended_at,
            duration_minutes,
            progress_before,
            progress_after,
            result,
            notes,
            stream_id,
            world_location_id,
            created_at
          `)
          .order("created_at", { ascending: false })
      ]);

      if (gameResult.error) throw gameResult.error;
      if (streamResult.error) throw streamResult.error;
      if (sessionResult.error) throw sessionResult.error;

      games = gameResult.data ?? [];
      streams = streamResult.data ?? [];
      sessions = sessionResult.data ?? [];

      renderGameOptions();
      renderStreamOptions();
      renderSessions();

      if (selectedId) {
        const refreshed = sessions.find((session) => session.id === selectedId);
        if (refreshed) populateForm(refreshed);
      } else {
        resetForm();
      }
    }

    function calculateDuration() {
      if (!startedInput?.value || !endedInput?.value || !durationInput) return;

      const start = new Date(startedInput.value);
      const end = new Date(endedInput.value);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        setMessage("End time must be after start time.", "error");
        return;
      }

      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      durationInput.value = String(minutes);
      setMessage(`Calculated ${minutes} minutes.`, "success");
    }

    async function saveSession(event) {
      event.preventDefault();

      const gameId = gameInput?.value ?? "";
      const title = titleInput?.value?.trim() ?? "";
      const sequence = Number(sequenceInput?.value ?? 0);

      if (!gameId || !title || sequence < 1) {
        setMessage("Game, session number, and title are required.", "error");
        return;
      }

      const progressBefore =
        progressBeforeInput?.value === ""
          ? null
          : Number(progressBeforeInput?.value);

      const progressAfter =
        progressAfterInput?.value === ""
          ? null
          : Number(progressAfterInput?.value);

      const payload = {
        game_id: gameId,
        sequence,
        title,
        status: statusInput?.value ?? "scheduled",
        scheduled_for: fromLocalInput(scheduledInput?.value),
        started_at: fromLocalInput(startedInput?.value),
        ended_at: fromLocalInput(endedInput?.value),
        duration_minutes: Number(durationInput?.value ?? 0),
        progress_before: progressBefore,
        progress_after: progressAfter,
        result: resultInput?.value?.trim() || null,
        notes: notesInput?.value?.trim() || null,
        stream_id: streamInput?.value || null
      };

      setSaveState("SAVING");
      setMessage("Writing session to Supabase…");

      let result;

      if (selectedId) {
        result = await supabase
          .from("sessions")
          .update(payload)
          .eq("id", selectedId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("sessions")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        console.error(result.error);
        setSaveState("ERROR");
        setMessage(result.error.message, "error");
        return;
      }

      selectedId = result.data.id;
      setSaveState("SAVED");
      setMessage("Session saved to PostgreSQL.", "success");

      await loadData();
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
      await loadData();
    }

    gameInput?.addEventListener("change", () => {
      if (!selectedId && sequenceInput) {
        sequenceInput.value = String(nextSequence(gameInput.value));
        suggestTitle();
      }
    });

    sequenceInput?.addEventListener("input", () => {
      if (!selectedId) suggestTitle();
    });

    filterGame?.addEventListener("change", () => {
      renderSessions();

      if (!selectedId) resetForm();
    });

    document
      .querySelector("#new-session-button")
      ?.addEventListener("click", resetForm);

    document
      .querySelector("#reset-session-button")
      ?.addEventListener("click", () => {
        if (!selectedId) {
          resetForm();
          return;
        }

        const session = sessions.find((item) => item.id === selectedId);
        if (session) populateForm(session);
      });

    document
      .querySelector("#calculate-duration-button")
      ?.addEventListener("click", calculateDuration);

    document
      .querySelector("#suggest-title-button")
      ?.addEventListener("click", suggestTitle);

    form?.addEventListener("submit", saveSession);

    document
      .querySelector("#session-logout")
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
# 6) SESSION EDITOR STYLES
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\admin.css" @'

/* ---------------------------------------------------------------
   v1.1 SESSION EDITOR
---------------------------------------------------------------- */

.session-toolbar {
  margin-top: 18px;
  min-height: 64px;
  padding: 10px 14px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  border: 1px solid var(--line);
  background: rgba(17,19,25,.9);
}

.session-toolbar label {
  min-width: 260px;
  display: grid;
  gap: 6px;
}

.session-toolbar label span {
  color: #707783;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: .12em;
}

.session-toolbar select {
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  background: #090a0e;
  color: var(--text);
}

.session-toolbar__metrics {
  display: flex;
  align-items: center;
  gap: 22px;
  color: var(--muted);
  font-size: 9px;
}

.session-toolbar__metrics strong {
  color: var(--text);
  font-size: 11px;
}

.session-admin-item {
  gap: 5px;
}

.session-admin-item small + small {
  color: #59606c;
}

.session-auto-tools {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 720px) {
  .session-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .session-toolbar label {
    min-width: 0;
  }

  .session-toolbar__metrics {
    justify-content: space-between;
  }
}
'@

# ------------------------------------------------------------
# 7) DOCS
# ------------------------------------------------------------
Write-NoBom "docs\session-editor-v1.1.md" @'
# DragonsRitual Session Editor v1.1

Route:

`/admin/sessions/`

Capabilities:

- owner-authenticated access
- list live PostgreSQL session records
- filter sessions by game
- create a session
- edit a session
- scheduled/live/completed/cancelled status
- scheduled date/time
- start and end time
- calculate duration
- progress before/after
- result
- notes
- link a Twitch/stream record
- automatic session title suggestion
- automatic next sequence suggestion

Security:

- Supabase Auth session required
- `admin_users` membership required
- RLS requires `public.is_admin()` for session INSERT/UPDATE
- no DELETE permission in v1.1

Important architecture note:

v1.1 intentionally does not automatically rewrite aggregate game hours,
progress, or session_count. That will be introduced only after historical
session records are ready, to avoid corrupting existing season totals.
'@

# ------------------------------------------------------------
# 8) BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v1.1 SESSION EDITOR COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Created:" -ForegroundColor Cyan
Write-Host "  /admin/sessions/" -ForegroundColor White
Write-Host "  Create/edit session records" -ForegroundColor White
Write-Host "  Game filter" -ForegroundColor White
Write-Host "  Schedule/start/end fields" -ForegroundColor White
Write-Host "  Duration calculator" -ForegroundColor White
Write-Host "  Progress before/after" -ForegroundColor White
Write-Host "  Result + notes" -ForegroundColor White
Write-Host "  Twitch stream link field" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "Apply migration 202608070007_session_editor_permissions.sql before saving." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Apply migration #7 in Supabase SQL Editor." -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:4321/admin/sessions/" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
