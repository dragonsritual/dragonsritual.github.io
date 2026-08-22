$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.8 - Admin Dashboard Shell ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "astro.config.mjs")) {
    throw "STOPPED: Astro project not detected."
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
$backupDir = Join-Path (Get-Location) ".migration-backups\v0.8-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$targets = @(
    "src\pages\admin\index.astro",
    "src\layouts\AdminLayout.astro",
    "src\styles\admin.css",
    "src\features\admin\README.md"
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

# ------------------------------------------------------------
# 2) ADMIN FEATURE DOCUMENTATION
# ------------------------------------------------------------
Write-NoBom "src\features\admin\README.md" @'
# Admin Feature

The DragonsRitual control room.

v0.8 is intentionally READ-ONLY.

Current purpose:
- verify Supabase connection
- inspect live game records
- show system status
- establish admin navigation and visual language

Next:
- Supabase Auth
- owner/admin access gate
- create/edit games
- create/edit sessions
- schedule streams
- manage media
- connect Sanity newsroom

Important:
No database mutation controls should be enabled before authentication
and authorization are in place.
'@

# ------------------------------------------------------------
# 3) ADMIN LAYOUT
# ------------------------------------------------------------
Write-NoBom "src\layouts\AdminLayout.astro" @'
---
import "../styles/core.css";
import "../styles/admin.css";

interface Props {
  title?: string;
}

const {
  title = "DragonsRitual Control Room"
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <meta name="theme-color" content="#08090c" />
    <title>{title}</title>
  </head>

  <body class="admin-body">
    <slot />
  </body>
</html>
'@

# ------------------------------------------------------------
# 4) ADMIN DASHBOARD PAGE
# READ-ONLY UNTIL AUTH IS BUILT
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\index.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
import { getGamingDashboard } from "../../services/gamingDashboardService";
import { activeDataProvider } from "../../services/dataService";

const data = await getGamingDashboard();

const totalGames = data.games.length;
const totalSessions = data.games.reduce((sum, game) => sum + game.sessions, 0);
const totalHours = data.games
  .reduce((sum, game) => sum + Number(game.hours || 0), 0)
  .toFixed(1);

const activeGames = data.games.filter((game) => game.status === "Active").length;
---

<AdminLayout title="DragonsRitual Control Room">
  <div class="admin-shell">
    <aside class="admin-rail">
      <a class="admin-brand" href="/admin">
        <span class="admin-brand__mark">DR</span>
        <span>
          <strong>CONTROL ROOM</strong>
          <small>DRAGONSRITUAL</small>
        </span>
      </a>

      <div class="admin-rail__label">ADMIN</div>

      <nav class="admin-nav" aria-label="Admin navigation">
        <a class="is-active" href="/admin">
          <span>01</span>
          <strong>Overview</strong>
        </a>

        <button type="button" disabled>
          <span>02</span>
          <strong>Games</strong>
          <em>AUTH NEXT</em>
        </button>

        <button type="button" disabled>
          <span>03</span>
          <strong>Sessions</strong>
          <em>AUTH NEXT</em>
        </button>

        <button type="button" disabled>
          <span>04</span>
          <strong>Schedule</strong>
          <em>AUTH NEXT</em>
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
        <a href="/">← Public Gaming</a>
        <small>READ-ONLY v0.8</small>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <span>DRAGONSRITUAL / SYSTEM</span>
          <h1>Control Room</h1>
        </div>

        <div class="admin-status">
          <span class:list={[
            "admin-status__dot",
            activeDataProvider === "supabase" && "is-live"
          ]}></span>

          <div>
            <strong>{activeDataProvider.toUpperCase()}</strong>
            <small>DATA PROVIDER</small>
          </div>
        </div>
      </header>

      <section class="admin-warning">
        <strong>READ-ONLY FOUNDATION</strong>
        <p>
          This page can inspect the live database, but it cannot create,
          edit, or delete records yet. Authentication and owner-only
          authorization come next.
        </p>
      </section>

      <section class="admin-metrics" aria-label="System metrics">
        <article>
          <span>DATABASE</span>
          <strong>{activeDataProvider === "supabase" ? "ONLINE" : "LOCAL"}</strong>
          <small>Active provider</small>
        </article>

        <article>
          <span>GAMES</span>
          <strong>{totalGames}</strong>
          <small>{activeGames} active</small>
        </article>

        <article>
          <span>SESSIONS</span>
          <strong>{totalSessions}</strong>
          <small>Season total</small>
        </article>

        <article>
          <span>HOURS</span>
          <strong>{totalHours}</strong>
          <small>Logged play time</small>
        </article>
      </section>

      <section class="admin-grid">
        <article class="admin-panel admin-panel--wide">
          <header class="admin-panel__header">
            <div>
              <span>LIVE DATABASE</span>
              <h2>Game Records</h2>
            </div>

            <span class="admin-readonly">READ ONLY</span>
          </header>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Status</th>
                  <th>Sessions</th>
                  <th>Hours</th>
                  <th>Progress</th>
                  <th>Last Played</th>
                  <th>Current Result</th>
                </tr>
              </thead>

              <tbody>
                {data.games.map((game) => (
                  <tr>
                    <td>
                      <strong>{game.title}</strong>
                      <small>{game.platform}</small>
                    </td>
                    <td>
                      <span class="admin-pill">{game.status}</span>
                    </td>
                    <td>{game.sessions}</td>
                    <td>{game.hours}</td>
                    <td>{game.progress}%</td>
                    <td>{game.lastPlayed}</td>
                    <td>{game.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article class="admin-panel">
          <header class="admin-panel__header">
            <div>
              <span>SYSTEM</span>
              <h2>Backend</h2>
            </div>
          </header>

          <dl class="admin-system-list">
            <div>
              <dt>Frontend</dt>
              <dd>Astro</dd>
            </div>

            <div>
              <dt>Database</dt>
              <dd>Supabase / PostgreSQL</dd>
            </div>

            <div>
              <dt>Publishing</dt>
              <dd>Sanity — pending</dd>
            </div>

            <div>
              <dt>Desktop</dt>
              <dd>Planned</dd>
            </div>

            <div>
              <dt>Mobile</dt>
              <dd>PWA foundation</dd>
            </div>

            <div>
              <dt>3D World</dt>
              <dd>Reserved</dd>
            </div>
          </dl>
        </article>

        <article class="admin-panel">
          <header class="admin-panel__header">
            <div>
              <span>NEXT SYSTEM</span>
              <h2>Owner Access</h2>
            </div>
          </header>

          <div class="admin-next">
            <span class="admin-next__number">v0.9</span>
            <h3>Supabase Auth</h3>
            <p>
              Owner login, protected admin access, session handling,
              authorization checks, and a secure path toward real edit controls.
            </p>

            <div class="admin-next__tags">
              <span>LOGIN</span>
              <span>OWNER ROLE</span>
              <span>PROTECTED ADMIN</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  </div>
</AdminLayout>
'@

# ------------------------------------------------------------
# 5) ADMIN STYLES
# ------------------------------------------------------------
Write-NoBom "src\styles\admin.css" @'
:root {
  --admin-rail: 230px;
}

.admin-body {
  margin: 0;
  min-width: 320px;
  background: #07080b;
  color: var(--text);
}

.admin-shell {
  min-height: 100vh;
}

.admin-rail {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--admin-rail);
  z-index: 30;

  display: flex;
  flex-direction: column;

  background:
    linear-gradient(180deg, rgba(18,20,26,.99), rgba(8,9,12,.99));
  border-right: 1px solid var(--line);
}

.admin-brand {
  min-height: 92px;
  padding: 0 18px;

  display: flex;
  align-items: center;
  gap: 12px;

  border-bottom: 1px solid var(--line);
}

.admin-brand__mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;

  border: 1px solid rgba(231,189,79,.65);
  color: var(--accent);
  font: 800 13px/1 Georgia, serif;
}

.admin-brand strong,
.admin-brand small {
  display: block;
}

.admin-brand strong {
  font-size: 11px;
  letter-spacing: .11em;
}

.admin-brand small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 7px;
  letter-spacing: .18em;
}

.admin-rail__label {
  padding: 20px 18px 8px;
  color: #5f6672;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .2em;
}

.admin-nav {
  padding: 0 10px;
  display: grid;
  gap: 3px;
}

.admin-nav a,
.admin-nav button {
  min-height: 50px;
  padding: 0 12px;

  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 9px;

  border: 1px solid transparent;
  background: transparent;
  color: #878e9b;
  text-align: left;
}

.admin-nav a.is-active {
  border-color: rgba(231,189,79,.2);
  background: rgba(231,189,79,.055);
  color: var(--text);
}

.admin-nav span {
  color: #555c68;
  font: 700 8px/1 ui-monospace, monospace;
}

.admin-nav strong {
  font-size: 10px;
  letter-spacing: .05em;
}

.admin-nav em {
  color: #5e6570;
  font-size: 7px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: .08em;
}

.admin-nav button:disabled {
  opacity: .58;
}

.admin-rail__bottom {
  margin-top: auto;
  padding: 18px;
  display: grid;
  gap: 8px;

  border-top: 1px solid var(--line);
}

.admin-rail__bottom a {
  color: var(--accent);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .08em;
}

.admin-rail__bottom small {
  color: #59606c;
  font-size: 7px;
  letter-spacing: .12em;
}

.admin-main {
  margin-left: var(--admin-rail);
  min-height: 100vh;
  padding: 0 34px 70px;
}

.admin-topbar {
  min-height: 114px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;

  border-bottom: 1px solid var(--line);
}

.admin-topbar > div:first-child > span,
.admin-panel__header span,
.admin-metrics article > span {
  color: var(--accent);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .18em;
}

.admin-topbar h1 {
  margin: 6px 0 0;
  font: 700 36px/1 Georgia, serif;
}

.admin-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7f4750;
}

.admin-status__dot.is-live {
  background: #76c68c;
  box-shadow: 0 0 15px rgba(118,198,140,.45);
}

.admin-status strong,
.admin-status small {
  display: block;
}

.admin-status strong {
  font-size: 10px;
  letter-spacing: .12em;
}

.admin-status small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 7px;
  letter-spacing: .12em;
}

.admin-warning {
  margin-top: 22px;
  padding: 16px 18px;

  display: flex;
  align-items: center;
  gap: 20px;

  border: 1px solid rgba(231,189,79,.22);
  background: rgba(231,189,79,.045);
}

.admin-warning strong {
  color: var(--accent);
  font-size: 9px;
  letter-spacing: .12em;
  white-space: nowrap;
}

.admin-warning p {
  margin: 0;
  color: #a5abb5;
  font-size: 11px;
  line-height: 1.6;
}

.admin-metrics {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.admin-metrics article {
  min-height: 128px;
  padding: 18px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  border: 1px solid var(--line);
  background: rgba(17,19,25,.92);
}

.admin-metrics article strong {
  margin-top: 10px;
  font: 700 30px/1 Georgia, serif;
}

.admin-metrics article small {
  margin-top: 8px;
  color: var(--muted);
  font-size: 9px;
}

.admin-grid {
  margin-top: 18px;

  display: grid;
  grid-template-columns: 1.25fr .75fr;
  gap: 12px;
}

.admin-panel {
  border: 1px solid var(--line);
  background: rgba(17,19,25,.92);
}

.admin-panel--wide {
  grid-column: 1 / -1;
}

.admin-panel__header {
  min-height: 76px;
  padding: 16px 18px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-bottom: 1px solid var(--line);
}

.admin-panel__header h2 {
  margin: 6px 0 0;
  font: 700 22px/1 Georgia, serif;
}

.admin-readonly {
  padding: 6px 8px;
  border: 1px solid var(--line);
  color: #747b87 !important;
}

.admin-table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

.admin-table th {
  padding: 11px 14px;
  color: #707783;

  border-bottom: 1px solid var(--line);

  font-size: 8px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .14em;
}

.admin-table td {
  padding: 16px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 11px;
}

.admin-table tbody tr:last-child td {
  border-bottom: 0;
}

.admin-table td strong,
.admin-table td small {
  display: block;
}

.admin-table td strong {
  font-size: 12px;
}

.admin-table td small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 8px;
}

.admin-pill {
  display: inline-block;
  padding: 5px 7px;
  border: 1px solid var(--line);

  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.admin-system-list {
  margin: 0;
  padding: 6px 18px 18px;
}

.admin-system-list div {
  padding: 14px 0;
  display: flex;
  justify-content: space-between;
  gap: 18px;

  border-bottom: 1px solid var(--line);
}

.admin-system-list div:last-child {
  border-bottom: 0;
}

.admin-system-list dt {
  color: var(--muted);
  font-size: 9px;
}

.admin-system-list dd {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
}

.admin-next {
  padding: 22px 18px 24px;
}

.admin-next__number {
  color: var(--accent);
  font: 700 12px/1 ui-monospace, monospace;
}

.admin-next h3 {
  margin: 12px 0 8px;
  font: 700 28px/1 Georgia, serif;
}

.admin-next p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.admin-next__tags {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.admin-next__tags span {
  padding: 6px 7px;
  border: 1px solid var(--line);

  color: #888f9a;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: .08em;
}

@media (max-width: 1050px) {
  :root {
    --admin-rail: 74px;
  }

  .admin-brand {
    justify-content: center;
    padding: 0;
  }

  .admin-brand > span:last-child,
  .admin-rail__label,
  .admin-nav strong,
  .admin-nav em,
  .admin-rail__bottom small {
    display: none;
  }

  .admin-nav a,
  .admin-nav button {
    grid-template-columns: 1fr;
    justify-items: center;
    padding: 0;
  }

  .admin-rail__bottom {
    padding: 14px 5px;
    text-align: center;
  }

  .admin-rail__bottom a {
    font-size: 0;
  }

  .admin-rail__bottom a::after {
    content: "←";
    font-size: 14px;
  }

  .admin-metrics {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  :root {
    --admin-rail: 0px;
  }

  .admin-rail {
    display: none;
  }

  .admin-main {
    margin-left: 0;
    padding: 0 14px 50px;
  }

  .admin-topbar {
    min-height: 96px;
  }

  .admin-topbar h1 {
    font-size: 30px;
  }

  .admin-warning {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .admin-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .admin-grid {
    grid-template-columns: 1fr;
  }

  .admin-panel--wide {
    grid-column: auto;
  }
}
'@

# ------------------------------------------------------------
# 6) BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v0.8 ADMIN SHELL COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin route created: /admin/" -ForegroundColor Cyan
Write-Host "It is READ-ONLY and intentionally NOT linked in public navigation." -ForegroundColor Yellow
Write-Host "No edit/delete controls exist yet." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host "Open: http://localhost:4321/admin/" -ForegroundColor White
Write-Host ""
Write-Host "After inspection, v0.9 will add Supabase Auth and owner-only access." -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
