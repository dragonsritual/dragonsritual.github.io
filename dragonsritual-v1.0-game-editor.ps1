$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v1.0 - Real Game Editor ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\index.astro")) {
    throw "STOPPED: v0.9 Admin Auth was not found."
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
$backupDir = Join-Path (Get-Location) ".migration-backups\v1.0-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$targets = @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
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
# 2) SQL MIGRATION: ADMIN INSERT + PLATFORM READ
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070005_game_editor_permissions.sql" @'
-- DragonsRitual v1.0
-- Owner-only game editor permissions.

grant select on table public.platforms to authenticated;
grant select, insert, update on table public.games to authenticated;

drop policy if exists "admins insert games" on public.games;
create policy "admins insert games"
on public.games
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update games" on public.games;
create policy "admins update games"
on public.games
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No DELETE policy is added in v1.0.
-- Games can be marked paused/dropped instead of being destroyed.
'@

# ------------------------------------------------------------
# 3) REUSABLE ADMIN AUTH GUARD
# ------------------------------------------------------------
Write-NoBom "src\services\auth\adminGuard.ts" @'
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

export async function requireAdmin() {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) {
    return {
      ok: false as const,
      reason: "signed-out" as const,
      user: null,
      supabase
    };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      ok: false as const,
      reason: "unauthorized" as const,
      user: session.user,
      supabase
    };
  }

  return {
    ok: true as const,
    reason: null,
    user: session.user,
    supabase
  };
}
'@

# ------------------------------------------------------------
# 4) UPDATE ADMIN OVERVIEW NAV TO ENABLE GAMES
# ------------------------------------------------------------
$adminIndex = Get-Content "src\pages\admin\index.astro" -Raw
$adminIndex = $adminIndex -replace '<button type="button" disabled>\s*<span>02</span>\s*<strong>Games</strong>\s*<em>EDITOR NEXT</em>\s*</button>', @'
<a href="/admin/games/">
            <span>02</span>
            <strong>Games</strong>
            <em>LIVE</em>
          </a>
'@
$adminIndex = $adminIndex -replace '<span class="admin-next__number">v1\.0</span>\s*<h3>Real Controls</h3>\s*<p>\s*Edit progress, hours, status, current objective, create sessions,\s*and schedule upcoming play directly from DragonsRitual\.\s*</p>', @'
<span class="admin-next__number">v1.1</span>
              <h3>Session Editor</h3>
              <p>
                The Game Editor is now live. Next we add real session logging,
                stream scheduling, play-time records, and session recaps.
              </p>
'@
[System.IO.File]::WriteAllText(
    (Resolve-Path "src\pages\admin\index.astro"),
    $adminIndex,
    $Utf8NoBom
)

# ------------------------------------------------------------
# 5) REAL GAME EDITOR PAGE
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\games.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
---

<AdminLayout title="Game Editor — DragonsRitual">
  <div id="games-auth-loading" class="admin-auth-loading">
    <span>DRAGONSRITUAL CONTROL ROOM</span>
    <strong>Verifying owner access…</strong>
  </div>

  <div id="games-denied" class="admin-login-card" hidden>
    <span class="admin-auth-kicker">ACCESS DENIED</span>
    <h1>Owner access required.</h1>
    <p>You must sign into the authorized DragonsRitual admin account.</p>
    <a class="admin-public-link" href="/admin/">← Return to Control Room</a>
  </div>

  <div id="games-app" class="admin-shell" hidden>
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

        <a class="is-active" href="/admin/games/">
          <span>02</span>
          <strong>Games</strong>
          <em>LIVE</em>
        </a>

        <button type="button" disabled>
          <span>03</span>
          <strong>Sessions</strong>
          <em>NEXT</em>
        </button>

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
        <button id="games-logout" class="admin-logout" type="button">Sign Out</button>
        <a href="/">← Public Gaming</a>
        <small>GAME EDITOR v1.0</small>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <span>DRAGONSRITUAL / DATABASE</span>
          <h1>Game Editor</h1>
        </div>

        <button id="new-game-button" class="admin-primary-button" type="button">
          + New Game
        </button>
      </header>

      <section class="admin-warning admin-warning--secure">
        <strong>OWNER WRITE ACCESS</strong>
        <p>
          Changes here write directly to Supabase/PostgreSQL and update the
          public Gaming page after refresh/rebuild.
        </p>
      </section>

      <section class="game-editor-layout">
        <article class="admin-panel game-list-panel">
          <header class="admin-panel__header">
            <div>
              <span>DATABASE</span>
              <h2>Games</h2>
            </div>
            <span id="game-count" class="admin-readonly">—</span>
          </header>

          <div id="game-list" class="game-admin-list">
            <div class="game-admin-loading">Loading games…</div>
          </div>
        </article>

        <article class="admin-panel game-form-panel">
          <header class="admin-panel__header">
            <div>
              <span id="form-eyebrow">SELECT RECORD</span>
              <h2 id="form-title">Game Details</h2>
            </div>
            <span id="save-state" class="admin-readonly">IDLE</span>
          </header>

          <form id="game-form" class="game-form">
            <input id="game-id" type="hidden" />

            <div class="game-form-grid">
              <label class="game-form-field game-form-field--wide">
                <span>Title</span>
                <input id="game-title" type="text" required placeholder="Game title" />
              </label>

              <label class="game-form-field">
                <span>Slug</span>
                <input id="game-slug" type="text" required placeholder="game-title" />
              </label>

              <label class="game-form-field">
                <span>Platform</span>
                <select id="game-platform" required></select>
              </label>

              <label class="game-form-field">
                <span>Status</span>
                <select id="game-status" required>
                  <option value="queued">Queued</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                  <option value="dropped">Dropped</option>
                  <option value="replay">Replay</option>
                </select>
              </label>

              <label class="game-form-field">
                <span>Hours Played</span>
                <input id="game-hours" type="number" min="0" step="0.1" value="0" />
              </label>

              <label class="game-form-field">
                <span>Progress %</span>
                <input id="game-progress" type="number" min="0" max="100" step="1" value="0" />
              </label>

              <label class="game-form-field">
                <span>Session Count</span>
                <input id="game-sessions" type="number" min="0" step="1" value="0" />
              </label>

              <label class="game-form-field">
                <span>Last Played</span>
                <input id="game-last-played" type="date" />
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Current Objective / Result</span>
                <input id="game-objective" type="text" placeholder="Campaign progress" />
              </label>

              <label class="game-form-field">
                <span>Developer</span>
                <input id="game-developer" type="text" />
              </label>

              <label class="game-form-field">
                <span>Publisher</span>
                <input id="game-publisher" type="text" />
              </label>

              <label class="game-form-field">
                <span>Release Date</span>
                <input id="game-release-date" type="date" />
              </label>

              <label class="game-form-field">
                <span>Started Playing</span>
                <input id="game-started-at" type="date" />
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Summary</span>
                <textarea id="game-summary" rows="5" placeholder="Private/public game summary groundwork."></textarea>
              </label>
            </div>

            <div class="game-form-actions">
              <button id="save-game-button" class="admin-primary-button" type="submit">
                Save Game
              </button>

              <button id="reset-game-button" class="admin-secondary-button" type="button">
                Reset
              </button>

              <span id="game-form-message" class="game-form-message" aria-live="polite"></span>
            </div>
          </form>
        </article>
      </section>
    </main>
  </div>

  <script>
    import { requireAdmin } from "../../services/auth/adminGuard";

    const loading = document.querySelector("#games-auth-loading");
    const denied = document.querySelector("#games-denied");
    const app = document.querySelector("#games-app");

    const list = document.querySelector("#game-list");
    const gameCount = document.querySelector("#game-count");
    const form = document.querySelector("#game-form");
    const formEyebrow = document.querySelector("#form-eyebrow");
    const formTitle = document.querySelector("#form-title");
    const saveState = document.querySelector("#save-state");
    const message = document.querySelector("#game-form-message");

    const idInput = document.querySelector("#game-id");
    const titleInput = document.querySelector("#game-title");
    const slugInput = document.querySelector("#game-slug");
    const platformInput = document.querySelector("#game-platform");
    const statusInput = document.querySelector("#game-status");
    const hoursInput = document.querySelector("#game-hours");
    const progressInput = document.querySelector("#game-progress");
    const sessionsInput = document.querySelector("#game-sessions");
    const lastPlayedInput = document.querySelector("#game-last-played");
    const objectiveInput = document.querySelector("#game-objective");
    const developerInput = document.querySelector("#game-developer");
    const publisherInput = document.querySelector("#game-publisher");
    const releaseDateInput = document.querySelector("#game-release-date");
    const startedAtInput = document.querySelector("#game-started-at");
    const summaryInput = document.querySelector("#game-summary");

    let supabase;
    let games = [];
    let platforms = [];
    let selectedId = null;

    function slugify(value) {
      return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }

    function setMessage(text, type = "") {
      if (!message) return;
      message.textContent = text;
      message.dataset.type = type;
    }

    function setSaveState(text) {
      if (saveState) saveState.textContent = text;
    }

    function resetForm() {
      selectedId = null;
      form?.reset();

      if (idInput) idInput.value = "";
      if (hoursInput) hoursInput.value = "0";
      if (progressInput) progressInput.value = "0";
      if (sessionsInput) sessionsInput.value = "0";
      if (statusInput) statusInput.value = "queued";

      if (formEyebrow) formEyebrow.textContent = "NEW RECORD";
      if (formTitle) formTitle.textContent = "Create Game";

      setMessage("");
      setSaveState("NEW");

      document
        .querySelectorAll(".game-admin-item")
        .forEach((item) => item.classList.remove("is-selected"));
    }

    function populateForm(game) {
      selectedId = game.id;

      if (idInput) idInput.value = game.id;
      if (titleInput) titleInput.value = game.title ?? "";
      if (slugInput) slugInput.value = game.slug ?? "";
      if (platformInput) platformInput.value = game.platform_id ?? "";
      if (statusInput) statusInput.value = game.status ?? "queued";
      if (hoursInput) hoursInput.value = String(game.hours_played ?? 0);
      if (progressInput) progressInput.value = String(game.progress_percent ?? 0);
      if (sessionsInput) sessionsInput.value = String(game.session_count ?? 0);
      if (lastPlayedInput) lastPlayedInput.value = game.last_played_at ?? "";
      if (objectiveInput) objectiveInput.value = game.current_objective ?? "";
      if (developerInput) developerInput.value = game.developer ?? "";
      if (publisherInput) publisherInput.value = game.publisher ?? "";
      if (releaseDateInput) releaseDateInput.value = game.release_date ?? "";
      if (startedAtInput) startedAtInput.value = game.started_at ?? "";
      if (summaryInput) summaryInput.value = game.summary ?? "";

      if (formEyebrow) formEyebrow.textContent = "EDIT RECORD";
      if (formTitle) formTitle.textContent = game.title;

      setMessage("");
      setSaveState("READY");

      document
        .querySelectorAll(".game-admin-item")
        .forEach((item) =>
          item.classList.toggle("is-selected", item.dataset.id === game.id)
        );
    }

    function renderPlatforms() {
      if (!platformInput) return;

      platformInput.innerHTML = "";

      for (const platform of platforms) {
        const option = document.createElement("option");
        option.value = platform.id;
        option.textContent = platform.name;
        platformInput.appendChild(option);
      }
    }

    function renderGames() {
      if (!list) return;

      list.innerHTML = "";
      if (gameCount) gameCount.textContent = String(games.length);

      if (games.length === 0) {
        list.innerHTML = `<div class="game-admin-loading">No games yet.</div>`;
        return;
      }

      for (const game of games) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "game-admin-item";
        button.dataset.id = game.id;

        if (game.id === selectedId) {
          button.classList.add("is-selected");
        }

        const platform =
          platforms.find((item) => item.id === game.platform_id)?.name ?? "Unknown";

        const top = document.createElement("span");
        top.className = "game-admin-item__top";

        const title = document.createElement("strong");
        title.textContent = game.title;

        const status = document.createElement("em");
        status.textContent = game.status.toUpperCase();

        top.append(title, status);

        const meta = document.createElement("small");
        meta.textContent =
          `${platform} · ${Number(game.progress_percent ?? 0)}% · ${Number(game.hours_played ?? 0)}h`;

        button.append(top, meta);
        button.addEventListener("click", () => populateForm(game));

        list.appendChild(button);
      }
    }

    async function loadData() {
      const [platformResult, gameResult] = await Promise.all([
        supabase
          .from("platforms")
          .select("id,name,code")
          .eq("active", true)
          .order("name"),

        supabase
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
            summary
          `)
          .order("title")
      ]);

      if (platformResult.error) throw platformResult.error;
      if (gameResult.error) throw gameResult.error;

      platforms = platformResult.data ?? [];
      games = gameResult.data ?? [];

      renderPlatforms();
      renderGames();

      if (games.length > 0 && !selectedId) {
        populateForm(games[0]);
      } else if (games.length === 0) {
        resetForm();
      }
    }

    async function saveGame(event) {
      event.preventDefault();

      const title = titleInput?.value?.trim() ?? "";
      const slug = slugInput?.value?.trim() ?? "";

      if (!title || !slug || !platformInput?.value) {
        setMessage("Title, slug, and platform are required.", "error");
        return;
      }

      const payload = {
        title,
        slug,
        platform_id: platformInput.value,
        status: statusInput?.value ?? "queued",
        hours_played: Number(hoursInput?.value ?? 0),
        progress_percent: Number(progressInput?.value ?? 0),
        session_count: Number(sessionsInput?.value ?? 0),
        last_played_at: lastPlayedInput?.value || null,
        current_objective: objectiveInput?.value?.trim() || null,
        developer: developerInput?.value?.trim() || null,
        publisher: publisherInput?.value?.trim() || null,
        release_date: releaseDateInput?.value || null,
        started_at: startedAtInput?.value || null,
        summary: summaryInput?.value?.trim() || null
      };

      setSaveState("SAVING");
      setMessage("Writing to Supabase…");

      let result;

      if (selectedId) {
        result = await supabase
          .from("games")
          .update(payload)
          .eq("id", selectedId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("games")
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
      setMessage("Saved to PostgreSQL.", "success");

      await loadData();

      const refreshed = games.find((game) => game.id === selectedId);
      if (refreshed) populateForm(refreshed);
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

    titleInput?.addEventListener("input", () => {
      if (!selectedId && slugInput && !slugInput.dataset.touched) {
        slugInput.value = slugify(titleInput.value);
      }
    });

    slugInput?.addEventListener("input", () => {
      slugInput.dataset.touched = "true";
    });

    document
      .querySelector("#new-game-button")
      ?.addEventListener("click", resetForm);

    document
      .querySelector("#reset-game-button")
      ?.addEventListener("click", () => {
        if (!selectedId) {
          resetForm();
          return;
        }

        const game = games.find((item) => item.id === selectedId);
        if (game) populateForm(game);
      });

    form?.addEventListener("submit", saveGame);

    document
      .querySelector("#games-logout")
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
# 6) GAME EDITOR STYLES
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\admin.css" @'

/* ---------------------------------------------------------------
   v1.0 GAME EDITOR
---------------------------------------------------------------- */

.admin-auth-loading {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
}

.admin-auth-loading[hidden] {
  display: none !important;
}

.admin-auth-loading span {
  color: var(--accent);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .18em;
}

.admin-auth-loading strong {
  font: 700 24px/1.1 Georgia, serif;
}

.admin-primary-button,
.admin-secondary-button {
  min-height: 40px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.admin-primary-button {
  border: 1px solid rgba(231,189,79,.55);
  background: rgba(231,189,79,.09);
  color: var(--accent);
}

.admin-primary-button:hover {
  background: rgba(231,189,79,.14);
}

.admin-secondary-button {
  border: 1px solid var(--line);
  background: transparent;
  color: #8d949f;
}

.game-editor-layout {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(260px, .7fr) minmax(560px, 1.8fr);
  gap: 12px;
}

.game-list-panel {
  align-self: start;
}

.game-admin-list {
  display: grid;
}

.game-admin-loading {
  padding: 24px 18px;
  color: var(--muted);
  font-size: 10px;
}

.game-admin-item {
  width: 100%;
  min-height: 70px;
  padding: 14px 16px;

  display: grid;
  gap: 7px;

  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.game-admin-item:last-child {
  border-bottom: 0;
}

.game-admin-item:hover,
.game-admin-item.is-selected {
  background: rgba(255,255,255,.025);
}

.game-admin-item.is-selected {
  box-shadow: inset 2px 0 0 var(--accent);
}

.game-admin-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.game-admin-item strong {
  font-size: 11px;
}

.game-admin-item em {
  color: var(--accent);
  font-size: 7px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: .08em;
}

.game-admin-item small {
  color: #717885;
  font-size: 8px;
}

.game-form {
  padding: 18px;
}

.game-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.game-form-field {
  display: grid;
  gap: 7px;
}

.game-form-field--wide {
  grid-column: 1 / -1;
}

.game-form-field > span {
  color: #7d8490;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.game-form-field input,
.game-form-field select,
.game-form-field textarea {
  width: 100%;
  border: 1px solid var(--line);
  outline: 0;
  background: #090a0e;
  color: var(--text);
}

.game-form-field input,
.game-form-field select {
  min-height: 42px;
  padding: 0 11px;
}

.game-form-field textarea {
  padding: 11px;
  resize: vertical;
  line-height: 1.55;
}

.game-form-field input:focus,
.game-form-field select:focus,
.game-form-field textarea:focus {
  border-color: rgba(231,189,79,.6);
}

.game-form-actions {
  margin-top: 20px;
  padding-top: 18px;

  display: flex;
  align-items: center;
  gap: 9px;

  border-top: 1px solid var(--line);
}

.game-form-message {
  margin-left: auto;
  color: #8b929e;
  font-size: 9px;
}

.game-form-message[data-type="success"] {
  color: #84c995;
}

.game-form-message[data-type="error"] {
  color: #dc8181;
}

@media (max-width: 1000px) {
  .game-editor-layout {
    grid-template-columns: 1fr;
  }

  .game-admin-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .game-admin-item {
    border-right: 1px solid var(--line);
  }
}

@media (max-width: 640px) {
  .game-form-grid {
    grid-template-columns: 1fr;
  }

  .game-form-field--wide {
    grid-column: auto;
  }

  .game-admin-list {
    grid-template-columns: 1fr;
  }

  .game-form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .game-form-message {
    margin-left: 0;
  }
}
'@

# ------------------------------------------------------------
# 7) DOCUMENTATION
# ------------------------------------------------------------
Write-NoBom "docs\game-editor-v1.md" @'
# DragonsRitual Game Editor v1.0

Route:

`/admin/games/`

Capabilities:

- authenticated owner-only access
- list live PostgreSQL game records
- select and edit an existing game
- create a new game
- title
- slug
- platform
- status
- hours played
- progress
- session count
- last-played date
- current objective/result
- developer
- publisher
- release date
- started-playing date
- summary

Security:

- Supabase Auth validates the session
- `admin_users` validates owner/admin membership
- RLS requires `public.is_admin()` for INSERT/UPDATE
- no DELETE permission is enabled in v1.0

Next:

Session Editor v1.1.
'@

# ------------------------------------------------------------
# 8) BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v1.0 GAME EDITOR COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Created:" -ForegroundColor Cyan
Write-Host "  /admin/games/ editor" -ForegroundColor White
Write-Host "  Owner auth guard" -ForegroundColor White
Write-Host "  Create game form" -ForegroundColor White
Write-Host "  Edit game form" -ForegroundColor White
Write-Host "  Live Supabase reads/writes" -ForegroundColor White
Write-Host "  Owner-only RLS migration" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "Apply migration 202608070005_game_editor_permissions.sql before using Save." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Copy migration #5 into Supabase SQL Editor and Run it." -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:4321/admin/games/" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
