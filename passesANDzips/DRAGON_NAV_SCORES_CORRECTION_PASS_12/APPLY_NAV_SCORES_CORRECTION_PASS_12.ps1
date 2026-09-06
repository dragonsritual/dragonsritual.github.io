$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro") -or -not(Test-Path "src\components\LaunchHeader.astro")){
  throw "Run this from the dragonsritual.github.io project root."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\nav-scores-correction-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @(
  "src\pages\index.astro",
  "src\components\LaunchHeader.astro",
  "src\components\WriterFeature.astro",
  "src\styles\launch.css"
)){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

Write-Host "DRAGON NAV + SCORES CORRECTION PASS 12" -ForegroundColor Cyan

# 1) Definitive public header: TODAY / TV / RADIO.
@'
---
const path = Astro.url.pathname;
const isToday = path === "/";
const isTV = path.startsWith("/tv");
const isRadio = path.startsWith("/radio");
---
<header class="launch-header">
  <a class="launch-brand" href="/" aria-label="DragonsRitual Today">
    <span class="launch-mark">DR</span>
    <span class="launch-wordmark">
      <strong>DRAGONSRITUAL</strong>
      <small>MEDIA / CULTURE / PLAY</small>
    </span>
  </a>

  <nav class="launch-nav" aria-label="Public navigation">
    <a class:list={["launch-nav-link",{active:isToday}]} href="/">
      <i></i><span>TODAY</span>
    </a>
    <a class:list={["launch-nav-link",{active:isTV}]} href="/tv/">
      <i></i><span>TV</span>
    </a>
    <a class:list={["launch-nav-link",{active:isRadio}]} href="/radio/">
      <i></i><span>RADIO</span>
    </a>
  </nav>

  <div class="launch-actions">
    <button class="launch-search" type="button" data-search-open aria-label="Search archive">
      <span class="launch-search__icon" aria-hidden="true"></span>
      <span class="launch-search__label">SEARCH</span>
    </button>

    <a class="launch-listen" href="/tv/">
      <span class="launch-live-dot"></span>
      <span>WATCH LIVE</span>
    </a>
  </div>
</header>
'@ | Set-Content "src\components\LaunchHeader.astro" -Encoding UTF8

# 2) Remove the redundant smaller DRAGON stamp from TODAY.
$index = Get-Content "src\pages\index.astro" -Raw
$index = [regex]::Replace(
  $index,
  '(?is)\s*<div class="dragon-stamp"[^>]*>DRAGON</div>\s*',
  "`r`n"
)

# 3) Add a real visible score wire on TODAY, not hidden behind Dragon TV tabs.
if($index -notmatch 'home-score-wire'){
  $insert = @'
    <section class="home-score-wire" aria-labelledby="score-wire-title">
      <div class="home-score-wire__head">
        <div>
          <span class="launch-eyebrow">SCORE WIRE</span>
          <h2 id="score-wire-title">Final.</h2>
        </div>

        <button class="home-spoiler-toggle" type="button" data-home-spoiler-toggle aria-pressed="false">
          <span class="home-spoiler-toggle__ring"><i></i></span>
          <span><small>SPOILERS</small><strong data-home-spoiler-state>OFF</strong></span>
        </button>
      </div>

      <article class="home-score-card" data-home-score>
        <div class="home-score-card__meta">
          <span>MLB</span>
          <strong>FINAL</strong>
          <small>AUG 22</small>
        </div>

        <div class="home-score-card__match">
          <div><span>SF</span><strong>San Francisco</strong><b>2</b></div>
          <i>—</i>
          <div><span>BOS</span><strong>Boston</strong><b>3</b></div>
        </div>

        <div class="home-score-card__mask" data-home-score-mask>
          <span>RESULT HIDDEN</span>
          <button type="button" data-home-score-reveal>REVEAL</button>
        </div>
      </article>
    </section>
'@
  $footerMarker = '<footer class="launch-footer">'
  $index = $index.Replace($footerMarker, $insert + "`r`n  " + $footerMarker)
}

# 4) Add spoiler behavior to TODAY.
if($index -notmatch 'dragonSportsSpoilers'){
  $script = @'
  <script>
    const spoilerRoot = document.querySelector('.home-score-wire');
    const spoilerToggle = document.querySelector('[data-home-spoiler-toggle]');
    const spoilerState = document.querySelector('[data-home-spoiler-state]');
    const scoreCard = document.querySelector('[data-home-score]');
    const storageKey = 'dragonSportsSpoilers';

    const setSpoilers = (show) => {
      spoilerRoot?.classList.toggle('spoilers-on', show);
      spoilerToggle?.setAttribute('aria-pressed', String(show));
      if (spoilerState) spoilerState.textContent = show ? 'ON' : 'OFF';
      try { localStorage.setItem(storageKey, show ? 'on' : 'off'); } catch {}
    };

    let stored = false;
    try { stored = localStorage.getItem(storageKey) === 'on'; } catch {}
    setSpoilers(stored);

    spoilerToggle?.addEventListener('click', () => {
      setSpoilers(!spoilerRoot?.classList.contains('spoilers-on'));
    });

    document.querySelector('[data-home-score-reveal]')?.addEventListener('click', () => {
      scoreCard?.classList.add('is-revealed');
    });
  </script>
'@
  $index = $index.Replace('</SiteLayout>', $script + "`r`n</SiteLayout>")
}

Set-Content "src\pages\index.astro" $index -Encoding UTF8

# 5) Fiction placeholder should not repeat DRAGON either.
if(Test-Path "src\components\WriterFeature.astro"){
  $writer = Get-Content "src\components\WriterFeature.astro" -Raw
  $writer = $writer.Replace('<span>DRAGON</span>','<span>FICTION</span>')
  Set-Content "src\components\WriterFeature.astro" $writer -Encoding UTF8
}

# 6) CSS: visible score wire, deliberate header, mobile-first.
@'

/* =========================================================
   NAV + HOME SCORE WIRE CORRECTION — PASS 12
   ========================================================= */

.dragon-stamp{display:none!important}

.launch-nav{
  gap:4px;
}
.launch-nav-link{
  min-width:76px;
}
.launch-actions{
  gap:10px;
}

.home-score-wire{
  width:min(1120px,100%);
  margin:54px auto 0;
  padding-top:28px;
  border-top:1px solid rgba(227,187,69,.18);
}
.home-score-wire__head{
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap:20px;
  margin-bottom:16px;
}
.home-score-wire__head h2{
  margin:5px 0 0;
  font:500 clamp(30px,3.4vw,44px)/1 Georgia,serif;
}
.home-spoiler-toggle{
  display:flex;
  align-items:center;
  gap:9px;
  padding:5px 0 5px 8px;
  border:0;
  background:transparent;
  color:#9da4ae;
  cursor:pointer;
}
.home-spoiler-toggle__ring{
  width:28px;
  height:28px;
  display:grid;
  place-items:center;
  border:1px solid #505661;
  border-radius:50%;
}
.home-spoiler-toggle__ring i{
  width:8px;
  height:8px;
  border:1px solid #737a85;
  border-radius:50%;
}
.home-spoiler-toggle>span:last-child{
  display:grid;
  gap:2px;
  text-align:left;
}
.home-spoiler-toggle small{
  color:#626975;
  font:900 5px/1 system-ui,sans-serif;
  letter-spacing:.16em;
}
.home-spoiler-toggle strong{
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.12em;
}
.home-score-wire.spoilers-on .home-spoiler-toggle__ring{
  border-color:var(--launch-gold);
}
.home-score-wire.spoilers-on .home-spoiler-toggle__ring i{
  border-color:var(--launch-gold);
  background:var(--launch-gold);
}
.home-score-wire.spoilers-on .home-spoiler-toggle strong{
  color:var(--launch-gold);
}

.home-score-card{
  position:relative;
  min-height:104px;
  display:grid;
  grid-template-columns:120px minmax(0,1fr);
  border:1px solid #252831;
  background:#08090c;
  overflow:hidden;
}
.home-score-card__meta{
  padding:16px;
  border-right:1px solid #252831;
  display:grid;
  align-content:center;
  gap:7px;
}
.home-score-card__meta span{
  color:var(--launch-gold);
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.16em;
}
.home-score-card__meta strong{
  font:900 8px/1 system-ui,sans-serif;
  letter-spacing:.1em;
}
.home-score-card__meta small{
  color:#606773;
  font:700 6px/1 system-ui,sans-serif;
}
.home-score-card__match{
  display:grid;
  grid-template-columns:1fr 30px 1fr;
  align-items:center;
  gap:10px;
  padding:14px 20px;
}
.home-score-card__match>div{
  display:grid;
  grid-template-columns:36px minmax(0,1fr) auto;
  align-items:center;
  gap:11px;
}
.home-score-card__match>div>span{
  width:34px;height:34px;
  display:grid;place-items:center;
  border:1px solid #30343d;
  color:#949ba5;
  font:900 8px/1 system-ui,sans-serif;
}
.home-score-card__match strong{
  font:600 17px/1 Georgia,serif;
}
.home-score-card__match b{
  font:700 25px/1 Georgia,serif;
}
.home-score-card__match>i{
  color:#4f5661;
  font-style:normal;
  text-align:center;
}
.home-score-card__mask{
  position:absolute;
  left:120px;right:0;top:0;bottom:0;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:14px;
  background:rgba(7,8,10,.97);
  backdrop-filter:blur(7px);
}
.home-score-card__mask span{
  color:#747b86;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.18em;
}
.home-score-card__mask button{
  min-height:34px;
  padding:0 14px;
  border:1px solid #353943;
  background:#0b0c10;
  color:#cbc5bc;
  cursor:pointer;
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.14em;
}
.home-score-card.is-revealed .home-score-card__mask,
.home-score-wire.spoilers-on .home-score-card__mask{
  opacity:0;
  visibility:hidden;
  pointer-events:none;
}

@media(max-width:760px){
  .launch-nav-link{
    min-width:0;
    padding:0 9px;
  }

  .home-score-wire{
    margin-top:38px;
    padding:24px 12px 0;
  }
  .home-score-wire__head{
    align-items:center;
  }
  .home-score-wire__head h2{
    font-size:28px;
  }
  .home-score-card{
    min-height:98px;
    grid-template-columns:72px minmax(0,1fr);
  }
  .home-score-card__meta{
    padding:10px 8px;
  }
  .home-score-card__match{
    grid-template-columns:1fr;
    padding:10px 12px;
    gap:7px;
  }
  .home-score-card__match>div{
    grid-template-columns:28px 1fr auto;
    gap:8px;
  }
  .home-score-card__match>div>span{
    width:28px;height:28px;
  }
  .home-score-card__match strong{
    font-size:14px;
  }
  .home-score-card__match b{
    font-size:20px;
  }
  .home-score-card__match>i{
    display:none;
  }
  .home-score-card__mask{
    left:72px;
    flex-direction:column;
    gap:8px;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 12 INSTALLED." -ForegroundColor Green
Write-Host "Removed redundant small DRAGON stamp." -ForegroundColor Green
Write-Host "TV is now in the main header." -ForegroundColor Green
Write-Host "MLB Score Wire is now visible on TODAY, with Spoilers OFF by default." -ForegroundColor Green
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
