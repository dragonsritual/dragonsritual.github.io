$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.4 - Astro Foundation Migration ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside C:\DEV\PROJECTS\WEBSITE\DragonsRitual\dragonsritual.github.io"
}

if (-not (Test-Path "src\data\gaming.js")) {
    throw "STOPPED: src\data\gaming.js was not found. Make sure v0.3 is installed first."
}

# ------------------------------------------------------------
# UTF-8 WITHOUT BOM helper (prevents the package.json issue)
# ------------------------------------------------------------
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
# 1) LOCAL MIGRATION BACKUP
# ------------------------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v0.4-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$backupFiles = @(
    "package.json",
    "package-lock.json",
    "index.html",
    "src\app\startApp.js",
    "src\main.js",
    "src\components\siteRail.js",
    "src\components\siteHeader.js",
    "src\modules\gaming\gamingModule.js",
    "src\styles\core.css",
    "src\styles\gaming.css",
    ".github\workflows\deploy.yml"
)

foreach ($file in $backupFiles) {
    if (Test-Path $file) {
        $dest = Join-Path $backupDir $file
        $destParent = Split-Path -Parent $dest
        if ($destParent) {
            New-Item -ItemType Directory -Force -Path $destParent | Out-Null
        }
        Copy-Item $file $dest -Force
    }
}

Write-Host "Local migration backup created:" -ForegroundColor Green
Write-Host $backupDir -ForegroundColor Yellow

# ------------------------------------------------------------
# 2) PACKAGE.JSON - ASTRO
# ------------------------------------------------------------
Write-NoBom "package.json" @'
{
  "name": "dragonsritual-site",
  "private": true,
  "version": "0.4.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "latest"
  }
}
'@

# ------------------------------------------------------------
# 3) ASTRO CONFIG
# Custom domain = no base path
# ------------------------------------------------------------
Write-NoBom "astro.config.mjs" @'
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://dragonsritual.com",
  output: "static"
});
'@

# ------------------------------------------------------------
# 4) SHARED SITE LAYOUT
# ------------------------------------------------------------
Write-NoBom "src\layouts\SiteLayout.astro" @'
---
import "../styles/core.css";
import "../styles/gaming.css";

interface Props {
  title?: string;
  description?: string;
}

const {
  title = "DragonsRitual Gaming",
  description = "DragonsRitual gaming broadcasts, schedules, sessions and statistics."
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="generator" content={Astro.generator} />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#08090c" />

    <link rel="canonical" href={Astro.url} />

    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={Astro.url} />

    <meta name="twitter:card" content="summary_large_image" />

    <title>{title}</title>
  </head>

  <body>
    <slot />
  </body>
</html>
'@

# ------------------------------------------------------------
# 5) GLOBAL SITE RAIL - ONLY GAMING EXISTS
# ------------------------------------------------------------
Write-NoBom "src\components\SiteRail.astro" @'
<aside class="site-rail" aria-label="Global site navigation">
  <div class="site-rail__top">
    <a class="site-rail__brand" href="/" aria-label="DragonsRitual home">
      <span class="site-rail__brand-mark">DR</span>

      <span class="site-rail__brand-copy">
        <strong>DRAGONSRITUAL</strong>
        <small>STUDIO NETWORK</small>
      </span>
    </a>

    <div class="site-rail__section-label">SITE</div>

    <nav class="site-rail__nav">
      <a class="site-rail__item is-active" href="/">
        <span class="site-rail__icon">GM</span>

        <span class="site-rail__item-copy">
          <strong>Gaming</strong>
          <small>League & streams</small>
        </span>
      </a>
    </nav>
  </div>

  <div class="site-rail__bottom">
    <div class="site-rail__status">
      <span class="site-rail__status-dot"></span>
      <span>Network Online</span>
    </div>

    <small>ASTRO FOUNDATION</small>
  </div>
</aside>
'@

# ------------------------------------------------------------
# 6) GAMING CONTEXT HEADER
# ------------------------------------------------------------
Write-NoBom "src\components\GamingHeader.astro" @'
<header class="context-header">
  <div class="context-header__identity">
    <span class="context-header__eyebrow">CURRENT FUNCTION</span>
    <strong>GAMING</strong>
  </div>

  <nav class="context-header__nav" aria-label="Gaming section navigation">
    <a class="active" href="/">Overview</a>
    <a href="#schedule">Schedule</a>
    <a href="#stats">Stats</a>
  </nav>
</header>
'@

# ------------------------------------------------------------
# 7) TWITCH PLAYER
# Twitch parent must match the browser's current host.
# ------------------------------------------------------------
Write-NoBom "src\components\TwitchPlayer.astro" @'
<div class="broadcast-screen twitch-screen">
  <iframe
    id="dragonsritual-twitch-player"
    class="twitch-player"
    title="DragonsRitual Twitch stream"
    allowfullscreen
    allow="autoplay; fullscreen"
    loading="eager">
  </iframe>
</div>

<div class="broadcast-meta">
  <div>
    <strong>LIVE BROADCAST</strong>
    <span>TWITCH / DRAGONSRITUAL</span>
  </div>

  <a
    class="broadcast-twitch-link"
    href="https://www.twitch.tv/dragonsritual"
    target="_blank"
    rel="noreferrer"
  >
    OPEN TWITCH →
  </a>
</div>

<script is:inline>
  (() => {
    const frame = document.getElementById("dragonsritual-twitch-player");
    if (!frame) return;

    const parents = new Set([
      window.location.hostname,
      "dragonsritual.com",
      "www.dragonsritual.com",
      "dragonsritual.github.io",
      "localhost"
    ]);

    const url = new URL("https://player.twitch.tv/");
    url.searchParams.set("channel", "dragonsritual");
    url.searchParams.set("autoplay", "false");
    url.searchParams.set("muted", "false");

    [...parents]
      .filter(Boolean)
      .forEach((parent) => url.searchParams.append("parent", parent));

    frame.src = url.toString();
  })();
</script>
'@

# ------------------------------------------------------------
# 8) GAMING PAGE AS REAL ASTRO PAGE
# ------------------------------------------------------------
Write-NoBom "src\pages\index.astro" @'
---
import SiteLayout from "../layouts/SiteLayout.astro";
import SiteRail from "../components/SiteRail.astro";
import GamingHeader from "../components/GamingHeader.astro";
import TwitchPlayer from "../components/TwitchPlayer.astro";
import { gamingData } from "../data/gaming.js";

const data = gamingData;

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
                The display is now rendered as a real Astro page. The data
                layer remains separate so Supabase can replace the temporary
                local records later.
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
          <span>Astro foundation v0.4</span>
        </footer>
      </div>
    </div>
  </div>
</SiteLayout>
'@

# ------------------------------------------------------------
# 9) KEEP CNAME
# ------------------------------------------------------------
Write-NoBom "public\CNAME" @'
dragonsritual.com
'@

# ------------------------------------------------------------
# 10) GITHUB PAGES WORKFLOW
# Existing generic build/upload approach works with Astro's dist/
# ------------------------------------------------------------
Write-NoBom ".github\workflows\deploy.yml" @'
name: Deploy DragonsRitual

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install
        run: npm ci

      - name: Build Astro
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload Astro build
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
'@

# ------------------------------------------------------------
# 11) UPDATE DEV + DEPLOY HELPERS
# ------------------------------------------------------------
Write-NoBom "dev.ps1" @'
$ErrorActionPreference = "Stop"
npm install
npm run dev
'@

Write-NoBom "deploy.ps1" @'
$ErrorActionPreference = "Stop"

npm install
npm run build

git add .
git status

$message = Read-Host "Commit message"

if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "DragonsRitual Astro update"
}

git commit -m $message
git push origin main

Write-Host ""
Write-Host "Pushed to GitHub. GitHub Actions will build and deploy the Astro site." -ForegroundColor Green
'@

# ------------------------------------------------------------
# 12) CLEAN OBSOLETE VITE ENTRY FILES
# These are backed up above.
# ------------------------------------------------------------
$obsolete = @(
    "index.html",
    "src\main.js",
    "src\app\startApp.js",
    "src\components\siteRail.js",
    "src\components\siteHeader.js",
    "src\modules\gaming\gamingModule.js",
    "src\services\twitchService.js"
)

foreach ($file in $obsolete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

# Remove empty old folders when possible
if (Test-Path "src\app") {
    if ((Get-ChildItem "src\app" -Force | Measure-Object).Count -eq 0) {
        Remove-Item "src\app" -Force
    }
}

if (Test-Path "src\modules\gaming") {
    if ((Get-ChildItem "src\modules\gaming" -Force | Measure-Object).Count -eq 0) {
        Remove-Item "src\modules\gaming" -Force
    }
}

# ------------------------------------------------------------
# 13) INSTALL ASTRO + BUILD
# ------------------------------------------------------------
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
}

if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
}

npm install

Write-Host ""
Write-Host "Running Astro production build..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v0.4 ASTRO MIGRATION COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Gaming remains the ONLY public site function." -ForegroundColor Green
Write-Host "Twitch remains connected." -ForegroundColor Green
Write-Host "Astro now owns layouts, routing, SEO-ready HTML and future pages." -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $backupDir -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT COMMAND:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Do NOT deploy until you inspect localhost first." -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
