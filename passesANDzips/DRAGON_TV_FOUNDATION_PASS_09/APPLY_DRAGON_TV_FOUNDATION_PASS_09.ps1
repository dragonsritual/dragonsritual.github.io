$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro") -or -not(Test-Path "src\layouts\SiteLayout.astro")){
  throw "Run this from the dragonsritual.github.io project root."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\dragon-tv-foundation-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @(
  "src\layouts\SiteLayout.astro",
  "src\styles\launch.css",
  "src\pages\index.astro",
  "src\data\siteArchive.js"
)){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

New-Item -ItemType Directory -Force "src\pages\tv","src\data" | Out-Null

# Add Cinzel font to the global document, once.
$layout=Get-Content "src\layouts\SiteLayout.astro" -Raw
if($layout -notmatch 'fonts.googleapis.com/css2\?family=Cinzel'){
  $fontLinks=@'
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&display=swap" rel="stylesheet">
'@
  $layout=$layout.Replace('</head>',"$fontLinks`r`n  </head>")
  Set-Content "src\layouts\SiteLayout.astro" $layout -Encoding UTF8
}

# Streaming config: one place to change provider/channel later.
@'
export const dragonTV = {
  provider: "twitch",
  channel: "dragonsritual",
  title: "DRAGON TV",
  status: "STANDBY",
  program: "Live / Games / Broadcasts",
  leftPanelTitle: "CHANNEL",
  leftItems: [
    { label: "LIVE", value: "DRAGON TV" },
    { label: "PROGRAM", value: "STANDBY" },
    { label: "NEXT", value: "PROJECT TITAN" }
  ]
};
'@ | Set-Content "src\data\dragonTV.js" -Encoding UTF8

# DRAGON TV page: left tall rail, right main stage, internal header/footer.
@'
---
import SiteLayout from "../../layouts/SiteLayout.astro";
import LaunchHeader from "../../components/LaunchHeader.astro";
import { dragonTV } from "../../data/dragonTV.js";
---
<SiteLayout title="Dragon TV — DragonsRitual" description="Dragon TV live broadcasts, games and programs.">
  <LaunchHeader />

  <main class="tv-shell">
    <section class="tv-grid">
      <aside class="tv-rail">
        <div class="tv-rail__mark">DRAGON TV</div>
        <div class="tv-rail__status"><span class="launch-live-dot"></span>{dragonTV.status}</div>

        <div class="tv-rail__stack">
          {dragonTV.leftItems.map((item) => (
            <div class="tv-rail__item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <a class="tv-rail__link" href="/">TODAY →</a>
      </aside>

      <section class="tv-stage">
        <header class="tv-stage__header">
          <div>
            <span class="tv-kicker">DRAGON / BROADCAST</span>
            <h1>{dragonTV.title}</h1>
          </div>
          <div class="tv-stage__meta">
            <span>{dragonTV.status}</span>
            <strong>{dragonTV.program}</strong>
          </div>
        </header>

        <div class="tv-player-frame">
          <div id="dragon-tv-player" class="tv-player"></div>
          <div class="tv-player__fallback" id="dragon-tv-fallback">
            <span>DRAGON TV</span>
            <strong>STANDBY</strong>
            <small>Broadcast window ready.</small>
          </div>
        </div>

        <footer class="tv-stage__footer">
          <div>
            <span>UP NEXT</span>
            <strong>Project TITAN</strong>
          </div>
          <div>
            <span>CHANNEL</span>
            <strong>DRAGON TV</strong>
          </div>
          <div>
            <span>ROOM</span>
            <strong>PUBLIC</strong>
          </div>
        </footer>

        <section class="tv-understage">
          <div class="tv-understage__block">
            <span>RECENT</span>
            <strong>Broadcast archive</strong>
            <p>Recent streams and clips will live here.</p>
          </div>
          <div class="tv-understage__block">
            <span>COMMUNITY</span>
            <strong>Comments / live room</strong>
            <p>Reserved for the live audience layer.</p>
          </div>
        </section>
      </section>
    </section>
  </main>

  <script define:vars={{ provider: dragonTV.provider, channel: dragonTV.channel }}>
    const host = window.location.hostname;
    const mount = document.getElementById("dragon-tv-player");
    const fallback = document.getElementById("dragon-tv-fallback");

    if (provider === "twitch" && mount && channel) {
      const iframe = document.createElement("iframe");
      iframe.src =
        `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(host)}&autoplay=false&muted=false`;
      iframe.allowFullscreen = true;
      iframe.allow = "autoplay; fullscreen";
      iframe.title = "Dragon TV live stream";
      mount.appendChild(iframe);
      if (fallback) fallback.remove();
    }
  </script>
</SiteLayout>
'@ | Set-Content "src\pages\tv\index.astro" -Encoding UTF8

# Add TV to search archive if archive registry exists and no TV item yet.
if(Test-Path "src\data\siteArchive.js"){
  $archive=Get-Content "src\data\siteArchive.js" -Raw
  if($archive -notmatch 'title:\s*"Dragon TV"'){
    $archive=$archive -replace 'export const archiveEntries = \[', @'
export const archiveEntries = [
  { title:"Dragon TV", category:"DRAGON TV", type:"Live video", href:"/tv/", keywords:["dragon tv","stream","video","live","gaming","broadcast"], description:"Dragon TV" },
'@
    Set-Content "src\data\siteArchive.js" $archive -Encoding UTF8
  }
}

# Add TV link to current feed on TODAY if not already present.
$index=Get-Content "src\pages\index.astro" -Raw
if($index -notmatch 'href="/tv/"'){
  $marker='</div>`r`n    </section>`r`n  </main>'
  # Safer injection: append card inside first today-feed-grid close.
  $needle='</div>`r`n    </section>'
  $tvcard=@'
        <a class="today-feed-card" href="/tv/">
          <div>
            <span class="today-feed-card__type">DRAGON TV</span>
            <strong>Broadcast</strong>
            <small>Live / Games / Video</small>
          </div>
          <b>WATCH →</b>
        </a>
'@
  $idx=$index.IndexOf('<div class="today-feed-grid">')
  if($idx -ge 0){
    $close=$index.IndexOf('</div>',$idx)
    # find the closing div after the two existing cards by searching forward twice more
    $close=$index.IndexOf('</div>',$close+6)
    $close=$index.IndexOf('</div>',$close+6)
    if($close -ge 0){
      $index=$index.Insert($close,$tvcard)
      Set-Content "src\pages\index.astro" $index -Encoding UTF8
    }
  }
}

# CSS: fantasy-adjacent DRAGON + strong TV layout.
@'

/* =========================================================
   DRAGON TV FOUNDATION — PASS 09
   ========================================================= */

/* DRAGON: mythic/editorial, not medieval costume */
.dragon-impact-word{
  font-family:"Cinzel", Georgia, serif !important;
  font-weight:900 !important;
  letter-spacing:.075em !important;
  text-indent:.075em !important;
  transform:none !important;
}

.tv-shell{
  width:min(1480px,calc(100% - 48px));
  margin:0 auto;
  padding:34px 0 80px;
}

.tv-grid{
  display:grid;
  grid-template-columns:250px minmax(0,1fr);
  gap:14px;
  align-items:stretch;
}

.tv-rail{
  min-height:760px;
  border:1px solid #292c34;
  background:#090a0d;
  padding:22px 18px;
  display:flex;
  flex-direction:column;
}

.tv-rail__mark{
  color:var(--launch-gold);
  font-family:"Cinzel",Georgia,serif;
  font-size:25px;
  font-weight:900;
  letter-spacing:.05em;
  border-bottom:1px solid rgba(227,187,69,.22);
  padding-bottom:18px;
}

.tv-rail__status{
  display:flex;
  align-items:center;
  gap:8px;
  margin-top:18px;
  color:#9299a4;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.16em;
}

.tv-rail__stack{
  margin-top:32px;
  display:grid;
}
.tv-rail__item{
  padding:16px 0;
  border-top:1px solid #20232a;
  display:grid;
  gap:6px;
}
.tv-rail__item span,
.tv-stage__footer span,
.tv-understage__block>span{
  color:#686f7b;
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}
.tv-rail__item strong{
  color:#e7e2da;
  font:600 14px/1.25 Georgia,serif;
}
.tv-rail__link{
  margin-top:auto;
  color:var(--launch-gold);
  text-decoration:none;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.14em;
}

.tv-stage{
  min-width:0;
  border:1px solid #292c34;
  background:#08090c;
}

.tv-stage__header{
  min-height:96px;
  padding:20px 24px;
  display:flex;
  justify-content:space-between;
  gap:24px;
  align-items:end;
  border-bottom:1px solid #292c34;
}
.tv-kicker{
  color:var(--launch-gold);
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.18em;
}
.tv-stage__header h1{
  margin:7px 0 0;
  font-family:"Cinzel",Georgia,serif;
  font-size:clamp(30px,4vw,52px);
  line-height:.92;
  letter-spacing:.025em;
}
.tv-stage__meta{
  text-align:right;
  display:grid;
  gap:6px;
}
.tv-stage__meta span{
  color:#6ee28f;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.14em;
}
.tv-stage__meta strong{
  color:#7c8490;
  font:700 8px/1 system-ui,sans-serif;
  letter-spacing:.08em;
}

.tv-player-frame{
  position:relative;
  width:100%;
  aspect-ratio:16/9;
  min-height:420px;
  background:#020304;
  border-bottom:1px solid #292c34;
  overflow:hidden;
}
.tv-player,
.tv-player iframe{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  border:0;
}
.tv-player__fallback{
  position:absolute;
  inset:0;
  display:grid;
  place-content:center;
  justify-items:center;
  gap:8px;
  background:
    radial-gradient(circle at 50% 44%,rgba(76,30,47,.25),transparent 30%),
    #030406;
}
.tv-player__fallback span{
  color:var(--launch-gold);
  font:900 8px/1 system-ui,sans-serif;
  letter-spacing:.2em;
}
.tv-player__fallback strong{
  font-family:"Cinzel",Georgia,serif;
  font-size:clamp(34px,6vw,76px);
}
.tv-player__fallback small{
  color:#6f7681;
}

.tv-stage__footer{
  min-height:88px;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  border-bottom:1px solid #292c34;
}
.tv-stage__footer>div{
  padding:18px 20px;
  display:grid;
  align-content:center;
  gap:7px;
  border-left:1px solid #292c34;
}
.tv-stage__footer>div:first-child{border-left:0}
.tv-stage__footer strong{
  font:600 15px/1.2 Georgia,serif;
}

.tv-understage{
  display:grid;
  grid-template-columns:1fr 1fr;
}
.tv-understage__block{
  min-height:150px;
  padding:22px 24px;
  border-left:1px solid #292c34;
}
.tv-understage__block:first-child{border-left:0}
.tv-understage__block strong{
  display:block;
  margin-top:9px;
  font:600 21px/1.1 Georgia,serif;
}
.tv-understage__block p{
  color:#747b86;
  font-size:11px;
  line-height:1.55;
  margin:10px 0 0;
}

@media(max-width:900px){
  .tv-shell{
    width:min(100% - 24px,1000px);
    padding-top:20px;
  }
  .tv-grid{
    grid-template-columns:1fr;
  }
  .tv-rail{
    min-height:0;
    padding:16px;
  }
  .tv-rail__stack{
    grid-template-columns:repeat(3,1fr);
    gap:12px;
    margin-top:18px;
  }
  .tv-rail__item{
    border-top:1px solid #20232a;
  }
  .tv-rail__link{
    margin-top:18px;
  }
}

@media(max-width:760px){
  .dragon-impact-word{
    letter-spacing:.045em !important;
    text-indent:.045em !important;
    font-size:clamp(54px,17vw,84px) !important;
  }
  .tv-shell{
    width:100%;
    padding:0 0 54px;
  }
  .tv-grid{
    gap:0;
  }
  .tv-rail,
  .tv-stage{
    border-left:0;
    border-right:0;
  }
  .tv-rail__mark{
    font-size:21px;
  }
  .tv-rail__stack{
    grid-template-columns:1fr;
    gap:0;
  }
  .tv-stage__header{
    min-height:82px;
    padding:16px;
    align-items:center;
  }
  .tv-stage__header h1{
    font-size:30px;
  }
  .tv-stage__meta strong{
    display:none;
  }
  .tv-player-frame{
    min-height:0;
    aspect-ratio:16/9;
  }
  .tv-stage__footer{
    min-height:76px;
  }
  .tv-stage__footer>div{
    padding:14px 10px;
  }
  .tv-stage__footer strong{
    font-size:12px;
  }
  .tv-understage{
    grid-template-columns:1fr;
  }
  .tv-understage__block{
    border-left:0;
    border-top:1px solid #292c34;
    min-height:120px;
    padding:18px 16px;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 09 INSTALLED." -ForegroundColor Green
Write-Host "Cinzel applied to the giant DRAGON mark." -ForegroundColor Green
Write-Host "Dragon TV foundation available at /tv/." -ForegroundColor Green
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
