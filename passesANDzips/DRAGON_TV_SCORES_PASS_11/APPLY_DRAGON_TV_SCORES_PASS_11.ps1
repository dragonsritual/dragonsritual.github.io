$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\tv\index.astro") -or -not(Test-Path "src\styles\launch.css")){
  throw "Run this from the dragonsritual.github.io project root after PASS 10."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\dragon-tv-scores-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @("src\pages\tv\index.astro","src\data\dragonTV.js","src\styles\launch.css")){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

# Extend current Dragon TV config rather than replacing it.
$config = Get-Content "src\data\dragonTV.js" -Raw
if($config -notmatch 'spoilerDefault'){
  $config = $config -replace 'export const dragonTV = \{', @'
export const dragonTV = {
  spoilerDefault: false,
  scoreFeed: [
    {
      league: "MLB",
      status: "FINAL",
      away: "SAN FRANCISCO",
      awayShort: "SF",
      awayScore: 2,
      home: "BOSTON",
      homeShort: "BOS",
      homeScore: 3,
      date: "AUG 22"
    }
  ],
'@
  Set-Content "src\data\dragonTV.js" $config -Encoding UTF8
}

$page = Get-Content "src\pages\tv\index.astro" -Raw

# Add spoiler control beside the existing Dragon TV status/header.
if($page -notmatch 'data-spoiler-toggle'){
  $needle = '<main class="dtv-console" data-dtv-console>'
  $replacement = @'
<main class="dtv-console" data-dtv-console>
    <div class="dtv-spoiler-bar">
      <span class="dtv-spoiler-bar__label">RESULTS</span>
      <button class="dtv-spoiler-toggle" type="button" data-spoiler-toggle aria-pressed="false">
        <span class="dtv-spoiler-toggle__ring"><i></i></span>
        <span class="dtv-spoiler-toggle__copy">
          <small>SPOILERS</small>
          <strong data-spoiler-state>OFF</strong>
        </span>
      </button>
    </div>
'@
  $page = $page.Replace($needle,$replacement)
}

# Add Scores command tab before Results.
if($page -notmatch 'data-dtv-tab="scores"'){
  $page = $page.Replace(
    '<button type="button" data-dtv-tab="results">RESULTS</button>',
    '<button type="button" data-dtv-tab="scores">SCORES</button>' + "`r`n      " +
    '<button type="button" data-dtv-tab="results">RESULTS</button>'
  )
}

# Add score panel immediately before results panel.
if($page -notmatch 'data-dtv-panel="scores"'){
  $marker = '<div class="dtv-panel" data-dtv-panel="results" hidden>'
  $scorePanel = @'
<div class="dtv-panel" data-dtv-panel="scores" hidden>
            <div class="dtv-panel__header">
              <div><span class="dtv-label">SCORE WIRE</span><h2>Scores</h2></div>
              <span class="dtv-panel__state">FINAL RESULTS</span>
            </div>

            <div class="dtv-score-wire">
              {dragonTV.scoreFeed?.map((game) => (
                <article class="dtv-score-row" data-spoiler-result>
                  <div class="dtv-score-row__meta">
                    <span>{game.league}</span>
                    <b>{game.status}</b>
                    <small>{game.date}</small>
                  </div>

                  <div class="dtv-score-row__game">
                    <div class="dtv-score-team">
                      <span>{game.awayShort}</span>
                      <strong>{game.away}</strong>
                      <b class="dtv-score-value" data-score-value>{game.awayScore}</b>
                    </div>
                    <div class="dtv-score-divider">—</div>
                    <div class="dtv-score-team">
                      <span>{game.homeShort}</span>
                      <strong>{game.home}</strong>
                      <b class="dtv-score-value" data-score-value>{game.homeScore}</b>
                    </div>
                  </div>

                  <div class="dtv-score-mask" data-score-mask>
                    <span>RESULT HIDDEN</span>
                    <button type="button" data-reveal-score>REVEAL</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          '@
  $page = $page.Replace($marker,$scorePanel + $marker)
}

# Extend existing tab script with scores and spoiler persistence.
$page = $page -replace "results:'RESULTS ARCHIVE'", "scores:'SCORE WIRE',results:'RESULTS ARCHIVE'"

if($page -notmatch 'dragonSpoilers'){
  $scriptEnd = '</script>'
  $spoilerScript = @'

    const spoilerToggle = root.querySelector('[data-spoiler-toggle]');
    const spoilerState = root.querySelector('[data-spoiler-state]');
    const scoreRows = [...root.querySelectorAll('[data-spoiler-result]')];
    const storageKey = 'dragonSpoilers';

    const setSpoilers = (show) => {
      root.classList.toggle('spoilers-on', show);
      spoilerToggle?.setAttribute('aria-pressed', String(show));
      if (spoilerState) spoilerState.textContent = show ? 'ON' : 'OFF';
      try { localStorage.setItem(storageKey, show ? 'on' : 'off'); } catch {}
    };

    let storedSpoilers = false;
    try { storedSpoilers = localStorage.getItem(storageKey) === 'on'; } catch {}
    setSpoilers(storedSpoilers);

    spoilerToggle?.addEventListener('click', () => {
      setSpoilers(!root.classList.contains('spoilers-on'));
    });

    scoreRows.forEach((row) => {
      row.querySelector('[data-reveal-score]')?.addEventListener('click', () => {
        row.classList.add('is-revealed');
      });
    });
'@
  $last = $page.LastIndexOf($scriptEnd)
  if($last -ge 0){
    $page = $page.Insert($last,$spoilerScript)
  }
}

Set-Content "src\pages\tv\index.astro" $page -Encoding UTF8

@'

/* =========================================================
   DRAGON TV SCORE WIRE / SPOILER SYSTEM — PASS 11
   ========================================================= */
.dtv-spoiler-bar{
  min-height:44px;
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:12px;
  border-bottom:1px solid #20232a;
  padding:0 4px;
}
.dtv-spoiler-bar__label{
  color:#4f5661;
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}
.dtv-spoiler-toggle{
  border:0;
  background:transparent;
  color:#8b929d;
  display:flex;
  align-items:center;
  gap:8px;
  padding:5px 2px 5px 8px;
  cursor:pointer;
}
.dtv-spoiler-toggle__ring{
  width:25px;
  height:25px;
  border:1px solid #4a505b;
  border-radius:50%;
  display:grid;
  place-items:center;
  transition:.2s ease;
}
.dtv-spoiler-toggle__ring i{
  width:7px;
  height:7px;
  border:1px solid #707783;
  border-radius:50%;
  transition:.2s ease;
}
.dtv-spoiler-toggle__copy{
  display:grid;
  gap:2px;
  text-align:left;
}
.dtv-spoiler-toggle__copy small{
  color:#555c67;
  font:900 5px/1 system-ui,sans-serif;
  letter-spacing:.15em;
}
.dtv-spoiler-toggle__copy strong{
  color:#9ba2ad;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.12em;
}
.spoilers-on .dtv-spoiler-toggle__ring{
  border-color:var(--launch-gold);
  box-shadow:0 0 0 3px rgba(227,187,69,.05);
}
.spoilers-on .dtv-spoiler-toggle__ring i{
  border-color:var(--launch-gold);
  background:var(--launch-gold);
}
.spoilers-on .dtv-spoiler-toggle__copy strong{color:var(--launch-gold)}

.dtv-score-wire{
  display:grid;
  border-top:1px solid #252831;
}
.dtv-score-row{
  position:relative;
  min-height:106px;
  display:grid;
  grid-template-columns:120px minmax(0,1fr);
  align-items:stretch;
  border:1px solid #252831;
  border-top:0;
  background:#08090c;
  overflow:hidden;
}
.dtv-score-row__meta{
  padding:17px;
  border-right:1px solid #252831;
  display:grid;
  align-content:center;
  gap:7px;
}
.dtv-score-row__meta span{
  color:var(--launch-gold);
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.16em;
}
.dtv-score-row__meta b{
  color:#d7d2ca;
  font:900 8px/1 system-ui,sans-serif;
  letter-spacing:.1em;
}
.dtv-score-row__meta small{
  color:#59606b;
  font:700 6px/1 system-ui,sans-serif;
  letter-spacing:.1em;
}
.dtv-score-row__game{
  display:grid;
  grid-template-columns:1fr 34px 1fr;
  align-items:center;
  gap:8px;
  padding:13px 20px;
}
.dtv-score-team{
  display:grid;
  grid-template-columns:40px minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
}
.dtv-score-team>span{
  width:36px;
  height:36px;
  display:grid;
  place-items:center;
  border:1px solid #30343d;
  color:#9299a4;
  font:900 8px/1 system-ui,sans-serif;
}
.dtv-score-team strong{
  font:600 17px/1 Georgia,serif;
}
.dtv-score-value{
  min-width:32px;
  text-align:center;
  font:700 25px/1 Georgia,serif;
}
.dtv-score-divider{
  color:#4e5560;
  text-align:center;
}
.dtv-score-mask{
  position:absolute;
  left:120px;
  right:0;
  top:0;
  bottom:0;
  z-index:3;
  display:flex;
  justify-content:center;
  align-items:center;
  gap:15px;
  background:rgba(6,7,9,.965);
  backdrop-filter:blur(7px);
}
.dtv-score-mask span{
  color:#737a85;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.18em;
}
.dtv-score-mask button{
  min-height:34px;
  padding:0 15px;
  border:1px solid #343842;
  background:#0b0c10;
  color:#c4bfb7;
  cursor:pointer;
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.14em;
}
.dtv-score-row.is-revealed .dtv-score-mask,
.spoilers-on .dtv-score-mask{
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  transition:opacity .18s ease,visibility .18s ease;
}

@media(max-width:760px){
  .dtv-spoiler-bar{
    min-height:42px;
    padding:0 12px;
  }
  .dtv-score-row{
    grid-template-columns:76px minmax(0,1fr);
    min-height:96px;
  }
  .dtv-score-row__meta{
    padding:11px 9px;
  }
  .dtv-score-row__game{
    grid-template-columns:1fr;
    gap:6px;
    padding:10px 12px;
  }
  .dtv-score-team{
    grid-template-columns:30px 1fr auto;
    gap:8px;
  }
  .dtv-score-team>span{
    width:28px;height:28px;
  }
  .dtv-score-team strong{font-size:14px}
  .dtv-score-value{font-size:20px}
  .dtv-score-divider{display:none}
  .dtv-score-mask{
    left:76px;
    flex-direction:column;
    gap:8px;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 11 INSTALLED." -ForegroundColor Green
Write-Host "Spoilers default OFF and persist per viewer." -ForegroundColor Green
Write-Host "Score Wire added to Dragon TV." -ForegroundColor Green
Write-Host "Boston 3 / San Francisco 2 added as Aug 22 final." -ForegroundColor Green
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
Write-Host "Open: http://localhost:4321/tv/" -ForegroundColor Cyan
