
$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\tv\index.astro") -or -not(Test-Path "src\styles\launch.css")){
  throw "Run this from the dragonsritual.github.io project root after PASS 09."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\dragon-tv-console-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @("src\pages\tv\index.astro","src\data\dragonTV.js","src\styles\launch.css")){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

@'
export const dragonTV = {
  provider: "twitch",
  channel: "dragonsritual",
  discordInvite: "",
  discordChannelName: "dragon-tv-live",
  station: "DRAGON TV",
  status: "STANDBY",
  program: "PS5 PRO / TWITCH",
  transmission: {
    title: "DRAGON TV",
    subtitle: "Live games, broadcasts and experiments.",
    platform: "TWITCH",
    source: "PS5 PRO"
  },
  projectTitan: {
    visible: true,
    state: "IN DEVELOPMENT",
    title: "PROJECT TITAN",
    note: "Competitive test framework is being built.",
    enabled: false
  },
  schedule: [
    { time: "—", title: "Next broadcast", meta: "Not scheduled yet" }
  ]
};
'@ | Set-Content "src\data\dragonTV.js" -Encoding UTF8

@'
---
import SiteLayout from "../../layouts/SiteLayout.astro";
import LaunchHeader from "../../components/LaunchHeader.astro";
import { dragonTV } from "../../data/dragonTV.js";
const hasDiscord = Boolean(dragonTV.discordInvite);
---
<SiteLayout title="Dragon TV — DragonsRitual" description="Dragon TV live broadcasts, games and programs.">
  <LaunchHeader />

  <main class="dtv-console" data-dtv-console>
    <header class="dtv-console__top">
      <div class="dtv-console__identity">
        <span class="dtv-console__eyebrow">DRAGON / TRANSMISSION</span>
        <h1>DRAGON TV</h1>
      </div>
      <div class="dtv-console__signal">
        <span class="launch-live-dot"></span>
        <span>{dragonTV.status}</span>
        <b>{dragonTV.program}</b>
      </div>
    </header>

    <nav class="dtv-tabs" aria-label="Dragon TV console modes">
      <button class="is-active" type="button" data-dtv-tab="live">LIVE</button>
      <button type="button" data-dtv-tab="event">EVENT</button>
      <button type="button" data-dtv-tab="players">PLAYERS</button>
      <button type="button" data-dtv-tab="schedule">SCHEDULE</button>
      <button type="button" data-dtv-tab="results">RESULTS</button>
      {hasDiscord
        ? <a class="dtv-tabs__discord" href={dragonTV.discordInvite} target="_blank" rel="noreferrer">DISCORD ↗</a>
        : <button class="dtv-tabs__discord is-disabled" type="button" disabled>DISCORD</button>}
    </nav>

    <div class="dtv-layout">
      <aside class="dtv-rail">
        <section class="dtv-rail__block">
          <span class="dtv-label">TRANSMISSION</span>
          <strong>{dragonTV.transmission.title}</strong>
          <small>{dragonTV.transmission.subtitle}</small>
        </section>

        <section class="dtv-rail__readout">
          <div><span>PLATFORM</span><b>{dragonTV.transmission.platform}</b></div>
          <div><span>SOURCE</span><b>{dragonTV.transmission.source}</b></div>
          <div><span>VIEWERS</span><b>—</b></div>
          <div><span>STATUS</span><b>{dragonTV.status}</b></div>
        </section>

        <section class="dtv-rail__block dtv-rail__titan">
          <span class="dtv-label">GAME LAB</span>
          <strong>{dragonTV.projectTitan.title}</strong>
          <small>{dragonTV.projectTitan.state}</small>
          <p>{dragonTV.projectTitan.note}</p>
          <button type="button" disabled>NOT PUBLIC YET</button>
        </section>

        {hasDiscord
          ? <a class="dtv-live-room" href={dragonTV.discordInvite} target="_blank" rel="noreferrer">
              <span>LIVE ROOM</span><strong>ENTER DISCORD ↗</strong><small>#{dragonTV.discordChannelName}</small>
            </a>
          : <div class="dtv-live-room is-disabled">
              <span>LIVE ROOM</span><strong>DISCORD READY</strong><small>Add channel invite in config</small>
            </div>}
      </aside>

      <section class="dtv-stage">
        <header class="dtv-stage__head">
          <div><span class="dtv-label">NOW TRANSMITTING</span><strong>{dragonTV.transmission.title}</strong></div>
          <div class="dtv-stage__head-right"><span>{dragonTV.status}</span><b>CH 01</b></div>
        </header>

        <div class="dtv-player-shell">
          <div id="dragon-tv-player" class="dtv-player"></div>
          <div class="dtv-player__fallback" id="dragon-tv-fallback">
            <span>DRAGON TV</span><strong>STANDBY</strong><small>Start a Twitch broadcast from PS5 Pro when ready.</small>
          </div>
        </div>

        <section class="dtv-hud">
          <div class="dtv-hud__primary"><span class="dtv-label">CURRENT MODE</span><strong id="dtv-hud-title">LIVE BROADCAST</strong></div>
          <div class="dtv-hud__stat"><span>EVENT</span><b>—</b></div>
          <div class="dtv-hud__stat"><span>ROUND</span><b>—</b></div>
          <div class="dtv-hud__stat"><span>SCORE</span><b>—</b></div>
        </section>

        <section class="dtv-deck">
          <div class="dtv-panel is-active" data-dtv-panel="live">
            <div class="dtv-panel__header"><div><span class="dtv-label">TRANSMISSION DECK</span><h2>Live</h2></div><span class="dtv-panel__state">{dragonTV.status}</span></div>
            <div class="dtv-live-grid">
              <article><span>NOW</span><strong>{dragonTV.transmission.title}</strong><p>{dragonTV.transmission.subtitle}</p></article>
              <article><span>NEXT</span><strong>{dragonTV.schedule[0]?.title || "Not scheduled"}</strong><p>{dragonTV.schedule[0]?.meta || ""}</p></article>
              <article><span>PLATFORM</span><strong>Twitch</strong><p>Broadcast from PS5 Pro.</p></article>
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="event" hidden>
            <div class="dtv-panel__header"><div><span class="dtv-label">COMPETITIVE MODE</span><h2>Event</h2></div><span class="dtv-panel__state">PREP</span></div>
            <div class="dtv-event-card">
              <div class="dtv-event-card__mark">TITAN</div>
              <div><span>{dragonTV.projectTitan.state}</span><strong>{dragonTV.projectTitan.title}</strong><p>{dragonTV.projectTitan.note}</p></div>
              <button type="button" disabled>LOCKED</button>
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="players" hidden>
            <div class="dtv-panel__header"><div><span class="dtv-label">ROSTER</span><h2>Players</h2></div><span class="dtv-panel__state">0 ACTIVE</span></div>
            <div class="dtv-empty"><strong>No public roster yet.</strong><span>Player profiles will appear here when competitive testing opens.</span></div>
          </div>

          <div class="dtv-panel" data-dtv-panel="schedule" hidden>
            <div class="dtv-panel__header"><div><span class="dtv-label">PROGRAMMING</span><h2>Schedule</h2></div><span class="dtv-panel__state">LOCAL</span></div>
            <div class="dtv-schedule">
              {dragonTV.schedule.map((item) => (
                <div class="dtv-schedule__row"><time>{item.time}</time><strong>{item.title}</strong><span>{item.meta}</span></div>
              ))}
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="results" hidden>
            <div class="dtv-panel__header"><div><span class="dtv-label">ARCHIVE</span><h2>Results</h2></div><span class="dtv-panel__state">EMPTY</span></div>
            <div class="dtv-empty"><strong>No results yet.</strong><span>Finished matches and events will remain here when competition begins.</span></div>
          </div>
        </section>
      </section>
    </div>
  </main>

  <script define:vars={{ provider: dragonTV.provider, channel: dragonTV.channel }}>
    const root = document.querySelector('[data-dtv-console]');
    const tabs = [...root.querySelectorAll('[data-dtv-tab]')];
    const panels = [...root.querySelectorAll('[data-dtv-panel]')];
    const hudTitle = root.querySelector('#dtv-hud-title');
    const labels = {live:'LIVE BROADCAST',event:'EVENT MODE',players:'PLAYER ROSTER',schedule:'PROGRAM SCHEDULE',results:'RESULTS ARCHIVE'};
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const target = tab.dataset.dtvTab;
      tabs.forEach((b) => b.classList.toggle('is-active', b === tab));
      panels.forEach((p) => { const on = p.dataset.dtvPanel === target; p.hidden = !on; p.classList.toggle('is-active', on); });
      if (hudTitle) hudTitle.textContent = labels[target] || 'DRAGON TV';
    }));

    const mount = document.getElementById('dragon-tv-player');
    if (provider === 'twitch' && mount && channel) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(window.location.hostname)}&autoplay=false&muted=false`;
      iframe.allowFullscreen = true;
      iframe.allow = 'autoplay; fullscreen';
      iframe.title = 'Dragon TV Twitch broadcast';
      mount.appendChild(iframe);
    }
  </script>
</SiteLayout>
'@ | Set-Content "src\pages\tv\index.astro" -Encoding UTF8

@'
/* DRAGON TV INTERACTIVE CONSOLE — PASS 10 */
.dtv-console{width:min(1540px,calc(100% - 36px));margin:0 auto;padding:26px 0 80px;--dtv-line:#2b2e36}
.dtv-console__top{min-height:86px;display:flex;align-items:end;justify-content:space-between;gap:24px;padding:0 4px 18px;border-bottom:1px solid var(--dtv-line)}
.dtv-console__eyebrow,.dtv-label{color:var(--launch-gold);font:900 6px/1 system-ui,sans-serif;letter-spacing:.19em}
.dtv-console__identity h1{margin:7px 0 0;font-family:"Cinzel",Georgia,serif;font-size:clamp(32px,4.2vw,62px);line-height:.9}
.dtv-console__signal{display:grid;grid-template-columns:auto auto;gap:5px 8px;align-items:center;justify-items:end;color:#76e596;font:900 7px/1 system-ui,sans-serif;letter-spacing:.14em}
.dtv-console__signal b{grid-column:1/-1;color:#737a86;font-size:7px}
.dtv-tabs{min-height:48px;display:flex;align-items:stretch;border-bottom:1px solid var(--dtv-line);overflow-x:auto;scrollbar-width:none}
.dtv-tabs button,.dtv-tabs a{min-width:96px;min-height:48px;padding:0 17px;border:0;border-right:1px solid #1f2229;background:transparent;color:#717985;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap;cursor:pointer;font:900 7px/1 system-ui,sans-serif;letter-spacing:.14em}
.dtv-tabs button.is-active{color:#f2eee7;box-shadow:inset 0 -2px 0 var(--launch-gold);background:rgba(227,187,69,.025)}
.dtv-tabs__discord{margin-left:auto!important}.dtv-tabs .is-disabled{opacity:.35;cursor:not-allowed}
.dtv-layout{display:grid;grid-template-columns:245px minmax(0,1fr);border:1px solid var(--dtv-line);border-top:0}
.dtv-rail{background:#07080a;border-right:1px solid var(--dtv-line);display:flex;flex-direction:column}
.dtv-rail__block{padding:20px 18px;border-bottom:1px solid var(--dtv-line);display:grid;gap:7px}
.dtv-rail__block strong{font:600 18px/1.1 Georgia,serif}.dtv-rail__block small,.dtv-rail__block p{margin:0;color:#767d89;font:400 10px/1.5 system-ui,sans-serif}
.dtv-rail__readout>div{min-height:56px;padding:12px 18px;border-bottom:1px solid #1f2228;display:flex;flex-direction:column;justify-content:center;gap:5px}
.dtv-rail__readout span{color:#5f6671;font:900 6px/1 system-ui,sans-serif;letter-spacing:.16em}.dtv-rail__readout b{color:#d5d0c8;font:700 10px/1 system-ui,sans-serif}
.dtv-rail__titan{margin-top:auto}.dtv-rail__titan button{margin-top:7px;min-height:36px;border:1px solid #2a2d34;background:#0d0e12;color:#5f6671;font:900 6px/1 system-ui,sans-serif}
.dtv-live-room{padding:17px 18px;display:grid;gap:5px;background:rgba(92,81,191,.055);color:inherit;text-decoration:none;border-top:1px solid rgba(123,113,255,.15)}.dtv-live-room.is-disabled{opacity:.45}
.dtv-live-room>span{color:#7c83a4;font:900 6px/1 system-ui,sans-serif;letter-spacing:.16em}.dtv-live-room strong{font:800 10px/1 system-ui,sans-serif}.dtv-live-room small{color:#676e7b}
.dtv-stage{min-width:0;background:#050608}.dtv-stage__head{min-height:68px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--dtv-line)}
.dtv-stage__head>div:first-child{display:grid;gap:7px}.dtv-stage__head strong{font:600 20px/1 Georgia,serif}.dtv-stage__head-right{display:grid;gap:5px;text-align:right}
.dtv-stage__head-right span{color:#72e993;font:900 7px/1 system-ui,sans-serif}.dtv-stage__head-right b{color:#626975;font:900 6px/1 system-ui,sans-serif}
.dtv-player-shell{position:relative;width:100%;aspect-ratio:16/9;background:#010203;border-bottom:1px solid var(--dtv-line);overflow:hidden}
.dtv-player,.dtv-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:2}.dtv-player__fallback{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;background:#020304}
.dtv-player__fallback span{color:var(--launch-gold);font:900 7px/1 system-ui,sans-serif}.dtv-player__fallback strong{font-family:"Cinzel",Georgia,serif;font-size:clamp(36px,6vw,82px)}.dtv-player__fallback small{color:#68707c}
.dtv-hud{min-height:86px;display:grid;grid-template-columns:minmax(220px,1.6fr) repeat(3,minmax(100px,.55fr));border-bottom:1px solid var(--dtv-line);background:#08090c}
.dtv-hud>div{padding:15px 18px;border-left:1px solid var(--dtv-line);display:grid;align-content:center;gap:7px}.dtv-hud>div:first-child{border-left:0}.dtv-hud__primary strong{font:600 19px/1 Georgia,serif}.dtv-hud__stat span{color:#646b77;font:900 6px/1 system-ui,sans-serif}.dtv-hud__stat b{font:700 17px/1 Georgia,serif}
.dtv-deck{min-height:280px;background:#08090c}.dtv-panel{padding:20px 22px 24px}.dtv-panel[hidden]{display:none}
.dtv-panel__header{min-height:58px;display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid #20232a;margin-bottom:16px;padding-bottom:14px}.dtv-panel__header h2{margin:6px 0 0;font:500 30px/1 Georgia,serif}.dtv-panel__state{color:#6e7581;font:900 7px/1 system-ui,sans-serif}
.dtv-live-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.dtv-live-grid article{min-height:120px;padding:16px;border:1px solid #252831;background:#0a0b0f;display:flex;flex-direction:column}
.dtv-live-grid article>span{color:var(--launch-gold);font:900 6px/1 system-ui,sans-serif}.dtv-live-grid article strong{margin-top:auto;font:600 18px/1.1 Georgia,serif}.dtv-live-grid article p{margin:7px 0 0;color:#747b87;font-size:10px}
.dtv-event-card{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:18px;align-items:center;min-height:132px;border:1px solid #282b33;padding:16px;background:#090a0d}.dtv-event-card__mark{height:92px;display:grid;place-items:center;border:1px solid rgba(227,187,69,.28);color:var(--launch-gold);font-family:"Cinzel",Georgia,serif;font-size:18px;font-weight:900}.dtv-event-card>div:nth-child(2){display:grid;gap:6px}.dtv-event-card span{color:#777e89;font:900 6px/1 system-ui,sans-serif}.dtv-event-card strong{font:600 22px/1 Georgia,serif}.dtv-event-card p{margin:0;color:#737a86;font-size:10px}.dtv-event-card button{min-height:38px;padding:0 14px;border:1px solid #292c34;background:#0d0e11;color:#555c66}
.dtv-empty{min-height:150px;display:grid;place-content:center;justify-items:center;gap:7px;color:#747b86;text-align:center}.dtv-empty strong{color:#ded9d1;font:500 23px/1 Georgia,serif}.dtv-empty span{font-size:10px}
.dtv-schedule__row{min-height:64px;display:grid;grid-template-columns:80px minmax(150px,1fr) 1fr;align-items:center;gap:14px;border-top:1px solid #20232a}.dtv-schedule__row:first-child{border-top:0}.dtv-schedule time{color:var(--launch-gold);font:900 8px/1 system-ui,sans-serif}.dtv-schedule strong{font:600 15px/1 Georgia,serif}.dtv-schedule span{color:#707783;font-size:10px}
@media(max-width:900px){.dtv-console{width:100%;padding-top:12px}.dtv-console__top{padding:0 14px 14px}.dtv-layout{grid-template-columns:1fr;border-left:0;border-right:0}.dtv-rail{display:none}}
@media(max-width:760px){.dtv-console{padding-bottom:50px}.dtv-console__top{min-height:70px;align-items:center}.dtv-console__identity h1{font-size:29px}.dtv-console__eyebrow{display:none}.dtv-console__signal b{display:none}.dtv-tabs{min-height:50px;padding:0 8px;gap:4px;background:#07080a}.dtv-tabs button,.dtv-tabs a{min-width:76px;min-height:44px;padding:0 11px;border:1px solid transparent}.dtv-tabs__discord{margin-left:0!important}.dtv-stage__head{min-height:60px;padding:12px 14px}.dtv-stage__head strong{font-size:17px}.dtv-hud{min-height:72px;grid-template-columns:1fr repeat(3,64px)}.dtv-hud>div{padding:10px 8px}.dtv-hud__primary strong{font-size:15px}.dtv-hud__stat b{font-size:13px}.dtv-panel{padding:16px 12px 20px}.dtv-live-grid{grid-template-columns:1fr}.dtv-live-grid article{min-height:88px}.dtv-event-card{grid-template-columns:66px 1fr}.dtv-event-card button{grid-column:1/-1}.dtv-schedule__row{grid-template-columns:54px 1fr}.dtv-schedule__row span{grid-column:2}}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host "PASS 10 INSTALLED." -ForegroundColor Green
Write-Host "Twitch/PS5 Pro configured. TITAN is visible but locked as IN DEVELOPMENT." -ForegroundColor Yellow
Write-Host "Discord stays disabled until you add a specific channel invite." -ForegroundColor Yellow
Write-Host "Now run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
