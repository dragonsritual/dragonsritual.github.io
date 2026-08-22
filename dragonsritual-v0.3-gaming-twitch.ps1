$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.3 - Gaming Only + Twitch Broadcast ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

# ---------------------------
# GLOBAL SITE RAIL: GAMING ONLY
# ---------------------------
@'
export function siteRail() {
  return `
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
        <small>DR v0.3</small>
      </div>
    </aside>
  `;
}
'@ | Set-Content -Encoding UTF8 "src/components/siteRail.js"

# ---------------------------
# TWITCH HELPER
# ---------------------------
@'
const TWITCH_CHANNEL = "dragonsritual";

function getTwitchParents() {
  const host = window.location.hostname || "localhost";

  const parents = new Set([
    host,
    "dragonsritual.com",
    "www.dragonsritual.com",
    "dragonsritual.github.io",
    "localhost"
  ]);

  return [...parents].filter(Boolean);
}

export function getTwitchPlayerUrl() {
  const url = new URL("https://player.twitch.tv/");
  url.searchParams.set("channel", TWITCH_CHANNEL);
  url.searchParams.set("autoplay", "false");
  url.searchParams.set("muted", "false");

  getTwitchParents().forEach((parent) => {
    url.searchParams.append("parent", parent);
  });

  return url.toString();
}

export function getTwitchChannelUrl() {
  return `https://www.twitch.tv/${TWITCH_CHANNEL}`;
}
'@ | Set-Content -Encoding UTF8 "src/services/twitchService.js"

# ---------------------------
# GAMING MODULE WITH TWITCH PLAYER
# ---------------------------
@'
import { getTwitchPlayerUrl, getTwitchChannelUrl } from "../../services/twitchService.js";

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function queuePanel(queue) {
  return `
    <aside class="panel broadcast-side">
      <div class="panel-label">GAME QUEUE</div>
      <div class="queue-list">
        ${queue.map((item, index) => `
          <a class="queue-item" href="#stats">
            <span class="queue-rank">${String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>${esc(item.title)}</strong>
              <small>${esc(item.platform)}</small>
            </span>
            <em>${esc(item.status)}</em>
          </a>
        `).join("")}
      </div>
    </aside>
  `;
}

function broadcastCenter() {
  return `
    <section class="broadcast-main">
      <div class="broadcast-screen twitch-screen">
        <iframe
          class="twitch-player"
          src="${getTwitchPlayerUrl()}"
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
          href="${getTwitchChannelUrl()}"
          target="_blank"
          rel="noreferrer"
        >
          OPEN TWITCH →
        </a>
      </div>
    </section>
  `;
}

function seasonPanel(data) {
  const totalSessions = data.games.reduce((sum, game) => sum + game.sessions, 0);
  const totalHours = data.games.reduce((sum, game) => sum + game.hours, 0).toFixed(1);
  const active = data.games.filter((game) => game.status === "Active").length;

  return `
    <aside class="panel broadcast-side season-panel">
      <div class="panel-label">SEASON ${esc(data.season)}</div>
      <dl class="season-stats">
        <div><dt>Platform</dt><dd>${esc(data.platform)}</dd></div>
        <div><dt>Games Active</dt><dd>${active}</dd></div>
        <div><dt>Sessions</dt><dd>${totalSessions}</dd></div>
        <div><dt>Hours Logged</dt><dd>${totalHours}</dd></div>
      </dl>
      <a class="text-link" href="#stats">View full season ledger →</a>
    </aside>
  `;
}

function scheduleStrip(schedule) {
  return `
    <section class="schedule-strip" id="schedule">
      <div class="schedule-title">
        <span>DR SCHEDULE</span>
        <strong>UPCOMING</strong>
      </div>
      ${schedule.map((item) => `
        <a class="schedule-game" href="#stats">
          <time>${esc(item.date)}</time>
          <span>
            <strong>${esc(item.game)}</strong>
            <small>${esc(item.type)}</small>
          </span>
          <em>${esc(item.status)}</em>
        </a>
      `).join("")}
    </section>
  `;
}

function statsTable(games) {
  return `
    <section class="league-section" id="stats">
      <div class="section-heading">
        <div>
          <span>SEASON LEDGER</span>
          <h2>Gaming Statistics</h2>
        </div>
        <p>Each game, session and result lives as structured data so this can grow into a real stats backend later.</p>
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
            ${games.map((game) => `
              <tr>
                <td>
                  <a class="game-title" href="#stats">${esc(game.title)}</a>
                  <small>${esc(game.platform)}</small>
                </td>
                <td><span class="status-pill">${esc(game.status)}</span></td>
                <td>${esc(game.sessions)}</td>
                <td>${esc(game.hours)}</td>
                <td>
                  <div class="progress-cell">
                    <span>${esc(game.progress)}%</span>
                    <div class="progress-track"><i style="width:${Number(game.progress) || 0}%"></i></div>
                  </div>
                </td>
                <td>${esc(game.lastPlayed)}</td>
                <td>${esc(game.result)}</td>
                <td><span class="recap-link">COMING LATER</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function renderGamingModule(data) {
  return `
    <main class="page-shell">
      <section class="page-intro">
        <span>DRAGONSRITUAL / GAMING</span>
        <h1>Season ${esc(data.season)}</h1>
        <p>Broadcasts, schedules, game history and a living statistical record of what gets played.</p>
      </section>

      <section class="broadcast-layout">
        ${queuePanel(data.queue)}
        ${broadcastCenter()}
        ${seasonPanel(data)}
      </section>

      ${scheduleStrip(data.schedule)}
      ${statsTable(data.games)}
    </main>
  `;
}
'@ | Set-Content -Encoding UTF8 "src/modules/gaming/gamingModule.js"

# ---------------------------
# APP SHELL: NO EXTRA MODULE PROMISES
# ---------------------------
@'
import "../styles/core.css";
import "../styles/gaming.css";
import { siteRail } from "../components/siteRail.js";
import { siteHeader } from "../components/siteHeader.js";
import { getGamingDashboard } from "../services/gamingService.js";
import { renderGamingModule } from "../modules/gaming/gamingModule.js";

export async function startApp(root) {
  const gaming = await getGamingDashboard();

  root.innerHTML = `
    <div class="app-shell">
      ${siteRail()}

      <div class="app-main">
        ${siteHeader()}

        <div class="app-page">
          ${renderGamingModule(gaming)}

          <footer class="site-footer">
            <strong>DRAGONSRITUAL</strong>
            <span>Gaming system v0.3</span>
          </footer>
        </div>
      </div>
    </div>
  `;
}
'@ | Set-Content -Encoding UTF8 "src/app/startApp.js"

# ---------------------------
# PATCH GAMING CSS FOR REAL PLAYER
# ---------------------------
@'

/* v0.3 Twitch broadcast */
.twitch-screen {
  height: auto;
  min-height: 0;
  aspect-ratio: 16 / 9;
  display: block;
  background: #000;
}

.twitch-player {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 300px;
  border: 0;
  background: #000;
}

.broadcast-meta {
  min-height: 48px;
  height: auto;
  gap: 16px;
}

.broadcast-meta > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.broadcast-meta > div span {
  color: var(--muted);
  font-size: 8px;
  letter-spacing: .12em;
}

.broadcast-twitch-link {
  color: var(--accent);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .1em;
  white-space: nowrap;
}

.broadcast-twitch-link:hover {
  color: var(--text);
}
'@ | Add-Content -Encoding UTF8 "src/styles/gaming.css"

npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "v0.3 APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host "Only Gaming remains in global site navigation." -ForegroundColor Green
Write-Host "Twitch channel connected: twitch.tv/dragonsritual" -ForegroundColor Green
Write-Host ""
Write-Host "Run: npm run dev" -ForegroundColor Cyan
Write-Host "Then refresh/open localhost:5173" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
