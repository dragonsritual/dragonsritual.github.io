$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\tv\index.astro") -or -not(Test-Path "src\pages\index.astro")){
  throw "Run this from the dragonsritual.github.io project root after PASS 13."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\dragon-network-experience-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @(
  "src\pages\tv\index.astro",
  "src\pages\index.astro",
  "src\data\dragonTV.js",
  "src\styles\launch.css"
)){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

Write-Host "DRAGON NETWORK EXPERIENCE PASS 14" -ForegroundColor Cyan

@'
export const dragonTV = {
  provider: "twitch",
  channel: "dragonsritual",
  discordInvite: "",
  discordChannelName: "dragon-tv-live",
  station: "DRAGON TV",
  status: "STANDBY",
  program: "PS5 PRO / TWITCH",

  channels: [
    { id:"main", label:"CH 01", title:"DRAGON TV", type:"LIVE / MIXED", active:true },
    { id:"creator", label:"CH 02", title:"CREATOR FEED", type:"ART / TALK / PERFORMANCE", active:false },
    { id:"events", label:"CH 03", title:"EVENTS", type:"INTERVIEWS / SPECIALS", active:false }
  ],

  transmission: {
    title: "DRAGON TV",
    subtitle: "Live games, creator broadcasts, interviews and experiments.",
    platform: "TWITCH",
    source: "PS5 PRO"
  },

  standby: {
    headline: "SIGNAL STANDBY",
    copy: "The channel is quiet. The network is not."
  },

  projectTitan: {
    visible: true,
    state: "IN DEVELOPMENT",
    title: "PROJECT TITAN",
    note: "Competitive test framework is being built.",
    enabled: false
  },

  schedule: [
    { time:"—", title:"Next broadcast", meta:"Not scheduled yet" }
  ],

  scoreFeed: [
    {
      league:"MLB",
      status:"FINAL",
      away:"SAN FRANCISCO",
      awayShort:"SF",
      awayScore:2,
      home:"BOSTON",
      homeShort:"BOS",
      homeScore:3,
      date:"AUG 22"
    }
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
<SiteLayout title="Dragon TV — DragonsRitual" description="Dragon TV network: live broadcasts, creators, games and events.">
  <LaunchHeader />

  <main class="dtv-console dtv-console--network" data-dtv-console>
    <header class="dtv-console__top">
      <div class="dtv-console__identity">
        <span class="dtv-console__eyebrow">DRAGON NETWORK / TRANSMISSION SYSTEM</span>
        <h1>DRAGON TV</h1>
      </div>

      <div class="dtv-console__signal">
        <span class="launch-live-dot"></span>
        <span>{dragonTV.status}</span>
        <b>{dragonTV.program}</b>
      </div>
    </header>

    <section class="dtv-channel-strip" aria-label="Dragon TV channels">
      {dragonTV.channels.map((channel) => (
        <button class:list={["dtv-channel",{"is-active":channel.active}]} type="button" data-network-channel={channel.id}>
          <span>{channel.label}</span>
          <strong>{channel.title}</strong>
          <small>{channel.type}</small>
        </button>
      ))}
    </section>

    <nav class="dtv-tabs" aria-label="Dragon TV console modes">
      <button class="is-active" type="button" data-dtv-tab="live">LIVE</button>
      <button type="button" data-dtv-tab="event">EVENT</button>
      <button type="button" data-dtv-tab="players">PLAYERS</button>
      <button type="button" data-dtv-tab="schedule">SCHEDULE</button>
      <button type="button" data-dtv-tab="scores">SCORES</button>
      <button type="button" data-dtv-tab="results">RESULTS</button>
      {
        hasDiscord
          ? <a class="dtv-tabs__discord" href={dragonTV.discordInvite} target="_blank" rel="noreferrer">LIVE ROOM ↗</a>
          : <button class="dtv-tabs__discord is-disabled" type="button" disabled>LIVE ROOM</button>
      }
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

        {
          hasDiscord
            ? <a class="dtv-live-room" href={dragonTV.discordInvite} target="_blank" rel="noreferrer">
                <span>LIVE ROOM</span><strong>ENTER DISCORD ↗</strong><small>#{dragonTV.discordChannelName}</small>
              </a>
            : <div class="dtv-live-room is-disabled">
                <span>LIVE ROOM</span><strong>DISCORD READY</strong><small>Add channel invite in config</small>
              </div>
        }
      </aside>

      <section class="dtv-stage">
        <header class="dtv-stage__head">
          <div>
            <span class="dtv-label">NOW TRANSMITTING</span>
            <strong>{dragonTV.transmission.title}</strong>
          </div>
          <div class="dtv-stage__head-right">
            <span>{dragonTV.status}</span>
            <b>CH 01</b>
          </div>
        </header>

        <div class="dtv-player-shell">
          <div id="dragon-tv-player" class="dtv-player"></div>
          <div class="dtv-player__fallback" id="dragon-tv-fallback">
            <span>DRAGON TV</span>
            <strong>{dragonTV.standby.headline}</strong>
            <small>{dragonTV.standby.copy}</small>

            <div class="dtv-standby-grid">
              <article>
                <span>UP NEXT</span>
                <strong>{dragonTV.schedule[0]?.title || "Not scheduled"}</strong>
                <small>{dragonTV.schedule[0]?.meta || ""}</small>
              </article>
              <article>
                <span>CHANNEL 02</span>
                <strong>CREATOR FEED</strong>
                <small>Reserved for artist / writer / performance broadcasts.</small>
              </article>
              <article>
                <span>CHANNEL 03</span>
                <strong>EVENTS</strong>
                <small>Interviews, specials and live programming.</small>
              </article>
            </div>
          </div>
        </div>

        <section class="dtv-hud" aria-label="Broadcast HUD">
          <div class="dtv-hud__primary">
            <span class="dtv-label">CURRENT MODE</span>
            <strong id="dtv-hud-title">LIVE BROADCAST</strong>
          </div>
          <div class="dtv-hud__stat"><span>EVENT</span><b>—</b></div>
          <div class="dtv-hud__stat"><span>ROUND</span><b>—</b></div>
          <div class="dtv-hud__stat"><span>SCORE</span><b>—</b></div>
        </section>

        <section class="dtv-deck">
          <div class="dtv-panel is-active" data-dtv-panel="live">
            <div class="dtv-panel__header">
              <div><span class="dtv-label">TRANSMISSION DECK</span><h2>Live</h2></div>
              <span class="dtv-panel__state">{dragonTV.status}</span>
            </div>

            <div class="dtv-live-grid">
              <article><span>NOW</span><strong>{dragonTV.transmission.title}</strong><p>{dragonTV.transmission.subtitle}</p></article>
              <article><span>NETWORK</span><strong>3 CHANNELS</strong><p>Gaming, creators and events share one broadcast system.</p></article>
              <article><span>LIVE ROOM</span><strong>{hasDiscord ? "CONNECTED" : "READY"}</strong><p>{hasDiscord ? `#${dragonTV.discordChannelName}` : "Add a Discord invite to activate."}</p></article>
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="event" hidden>
            <div class="dtv-panel__header">
              <div><span class="dtv-label">EVENT MODE</span><h2>Event</h2></div>
              <span class="dtv-panel__state">PREP</span>
            </div>

            <div class="dtv-event-card">
              <div class="dtv-event-card__mark">TITAN</div>
              <div><span>{dragonTV.projectTitan.state}</span><strong>{dragonTV.projectTitan.title}</strong><p>{dragonTV.projectTitan.note}</p></div>
              <button type="button" disabled>LOCKED</button>
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="players" hidden>
            <div class="dtv-panel__header">
              <div><span class="dtv-label">ROSTER</span><h2>Players</h2></div>
              <span class="dtv-panel__state">0 ACTIVE</span>
            </div>
            <div class="dtv-empty"><strong>No public roster yet.</strong><span>Player profiles will appear here when competitive testing opens.</span></div>
          </div>

          <div class="dtv-panel" data-dtv-panel="schedule" hidden>
            <div class="dtv-panel__header">
              <div><span class="dtv-label">PROGRAMMING</span><h2>Schedule</h2></div>
              <span class="dtv-panel__state">LOCAL</span>
            </div>
            <div class="dtv-schedule">
              {dragonTV.schedule.map((item) => (
                <div class="dtv-schedule__row"><time>{item.time}</time><strong>{item.title}</strong><span>{item.meta}</span></div>
              ))}
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="scores" hidden>
            <div class="dtv-panel__header">
              <div><span class="dtv-label">SCORE WIRE</span><h2>Scores</h2></div>
              <span class="dtv-panel__state">FINAL RESULTS</span>
            </div>

            <div class="dtv-score-wire">
              {dragonTV.scoreFeed?.map((game) => (
                <article class="dtv-score-row" data-spoiler-result>
                  <div class="dtv-score-row__meta">
                    <span>{game.league}</span><b>{game.status}</b><small>{game.date}</small>
                  </div>
                  <div class="dtv-score-row__game">
                    <div class="dtv-score-team"><span>{game.awayShort}</span><strong>{game.away}</strong><b>{game.awayScore}</b></div>
                    <div class="dtv-score-divider">—</div>
                    <div class="dtv-score-team"><span>{game.homeShort}</span><strong>{game.home}</strong><b>{game.homeScore}</b></div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div class="dtv-panel" data-dtv-panel="results" hidden>
            <div class="dtv-panel__header">
              <div><span class="dtv-label">ARCHIVE</span><h2>Results</h2></div>
              <span class="dtv-panel__state">EMPTY</span>
            </div>
            <div class="dtv-empty"><strong>No internal results yet.</strong><span>Finished Dragon events and matches will remain here.</span></div>
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

    const labels = {
      live:'LIVE BROADCAST',
      event:'EVENT MODE',
      players:'PLAYER ROSTER',
      schedule:'PROGRAM SCHEDULE',
      scores:'SCORE WIRE',
      results:'RESULTS ARCHIVE'
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const target = tab.dataset.dtvTab;
      tabs.forEach((b) => b.classList.toggle('is-active', b === tab));
      panels.forEach((p) => {
        const on = p.dataset.dtvPanel === target;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      if(hudTitle) hudTitle.textContent = labels[target] || 'DRAGON TV';
    }));

    const mount = document.getElementById('dragon-tv-player');
    if(provider === 'twitch' && mount && channel){
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

# Home identity: make THE SIGNAL less card-like and Score Wire stronger.
$index = Get-Content "src\pages\index.astro" -Raw
$index = $index.Replace('>THE SIGNAL<','>TRANSMISSIONS<')
$index = $index.Replace('>SCORE WIRE<','>SCORE WIRE<')
Set-Content "src\pages\index.astro" $index -Encoding UTF8

@'

/* =========================================================
   DRAGON NETWORK EXPERIENCE — PASS 14
   ========================================================= */

.dtv-channel-strip{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  border:1px solid #2b2e36;
  border-bottom:0;
  background:#07080a;
}
.dtv-channel{
  min-height:72px;
  padding:12px 16px;
  border:0;
  border-right:1px solid #23262d;
  background:transparent;
  color:#747b86;
  display:grid;
  align-content:center;
  gap:5px;
  text-align:left;
  cursor:pointer;
}
.dtv-channel:last-child{border-right:0}
.dtv-channel span{
  color:#5f6672;
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}
.dtv-channel strong{
  color:#d8d3cb;
  font:600 16px/1.1 Georgia,serif;
}
.dtv-channel small{
  color:#5d6470;
  font:700 6px/1 system-ui,sans-serif;
  letter-spacing:.1em;
}
.dtv-channel.is-active{
  background:
    linear-gradient(180deg,rgba(227,187,69,.05),transparent 70%),
    #0a0b0f;
  box-shadow:inset 0 2px 0 var(--launch-gold);
}
.dtv-channel.is-active span,
.dtv-channel.is-active strong{color:var(--launch-gold)}

.dtv-player__fallback{
  background:
    radial-gradient(circle at 50% 42%,rgba(80,28,48,.24),transparent 28%),
    linear-gradient(180deg,#030406,#020304 75%);
}
.dtv-player__fallback strong{
  letter-spacing:.025em;
}
.dtv-player__fallback small{
  max-width:520px;
  text-align:center;
}
.dtv-standby-grid{
  width:min(860px,88%);
  margin-top:34px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}
.dtv-standby-grid article{
  min-height:110px;
  padding:14px;
  display:flex;
  flex-direction:column;
  border:1px solid #262a31;
  background:rgba(9,10,13,.82);
  text-align:left;
}
.dtv-standby-grid article>span{
  color:var(--launch-gold);
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}
.dtv-standby-grid article strong{
  margin-top:auto;
  font:600 17px/1.1 Georgia,serif;
}
.dtv-standby-grid article small{
  margin-top:7px;
  text-align:left;
  color:#717985;
  line-height:1.4;
}

.dtv-hud__stat b{
  font-variant-numeric:tabular-nums;
}

/* HOME: less polite-grid, more editorial transmission wall */
.today-feed-grid{
  gap:0!important;
  border-top:1px solid #2a2d34;
  border-bottom:1px solid #2a2d34;
}
.today-feed-card{
  min-height:104px!important;
  border:0!important;
  border-right:1px solid #2a2d34!important;
  background:transparent!important;
  padding:18px 20px!important;
}
.today-feed-card:nth-child(2n){border-right:0!important}
.today-feed-card:hover{
  background:rgba(227,187,69,.025)!important;
}
.today-feed-card strong{
  font-size:21px!important;
}
.today-feed-card b{
  color:var(--launch-gold)!important;
}

/* Score Wire becomes a real object, not a thin content box */
.home-score-wire{
  margin-top:72px!important;
}
.home-score-wire__head{
  margin-bottom:18px!important;
}
.home-score-wire__head h2{
  font-size:clamp(40px,5.4vw,74px)!important;
  line-height:.88!important;
  letter-spacing:-.02em!important;
}
.home-score-card{
  min-height:150px!important;
  grid-template-columns:150px minmax(0,1fr)!important;
}
.home-score-card__meta{
  padding:22px!important;
}
.home-score-card__match{
  padding:18px 28px!important;
}
.home-score-card__match>div{
  grid-template-columns:48px minmax(0,1fr) 64px!important;
  gap:16px!important;
}
.home-score-card__match>div>span{
  width:44px!important;height:44px!important;
  font-size:10px!important;
}
.home-score-card__match strong{
  font-size:24px!important;
}
.home-score-card__match b{
  font-size:38px!important;
}
.home-score-card__mask{
  left:150px!important;
}
.home-score-card__mask span{
  font-size:8px!important;
}
.home-score-card__mask button{
  min-height:40px!important;
  padding:0 18px!important;
}

@media(max-width:900px){
  .dtv-channel-strip{
    grid-template-columns:1fr;
  }
  .dtv-channel{
    border-right:0;
    border-bottom:1px solid #23262d;
  }
  .dtv-channel:last-child{border-bottom:0}
}

@media(max-width:760px){
  .dtv-channel-strip{
    display:flex;
    overflow-x:auto;
    scrollbar-width:none;
  }
  .dtv-channel-strip::-webkit-scrollbar{display:none}
  .dtv-channel{
    min-width:190px;
    min-height:66px;
    border-right:1px solid #23262d;
    border-bottom:0;
  }
  .dtv-standby-grid{
    width:92%;
    grid-template-columns:1fr;
    margin-top:20px;
  }
  .dtv-standby-grid article{
    min-height:78px;
  }

  .today-feed-card{
    min-height:88px!important;
    border-right:0!important;
    border-bottom:1px solid #2a2d34!important;
  }

  .home-score-wire{
    margin-top:46px!important;
  }
  .home-score-wire__head h2{
    font-size:42px!important;
  }
  .home-score-card{
    min-height:118px!important;
    grid-template-columns:76px minmax(0,1fr)!important;
  }
  .home-score-card__meta{
    padding:10px 8px!important;
  }
  .home-score-card__match{
    padding:11px 12px!important;
  }
  .home-score-card__match>div{
    grid-template-columns:30px 1fr auto!important;
    gap:8px!important;
  }
  .home-score-card__match>div>span{
    width:30px!important;height:30px!important;
    font-size:8px!important;
  }
  .home-score-card__match strong{
    font-size:15px!important;
  }
  .home-score-card__match b{
    font-size:24px!important;
  }
  .home-score-card__mask{
    left:76px!important;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 14 INSTALLED." -ForegroundColor Green
Write-Host "Dragon TV now behaves as a multi-channel network foundation." -ForegroundColor Green
Write-Host "Standby state upgraded; encoding artifacts removed." -ForegroundColor Green
Write-Host "Homepage transmissions and Score Wire pushed harder." -ForegroundColor Green
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
