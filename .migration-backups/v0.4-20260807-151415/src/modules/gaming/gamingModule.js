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
