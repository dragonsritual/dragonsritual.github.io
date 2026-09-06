$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro") -or -not(Test-Path "src\styles\launch.css")){
  throw "Run this from the dragonsritual.github.io project root."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\world-identity-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
foreach($p in @("src\pages\index.astro","src\styles\launch.css","src\components\LaunchHeader.astro","src\pages\tv\index.astro")){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

Write-Host "DRAGON WORLD IDENTITY PASS 13" -ForegroundColor Cyan

$index = Get-Content "src\pages\index.astro" -Raw

# Remove the polite editorial punctuation / generic section language.
$index = $index.Replace('>Current.</h2>','>THE SIGNAL</h2>')
$index = $index.Replace('>Final.</h2>','>SCORE WIRE</h2>')
$index = $index.Replace('>Current</h2>','>THE SIGNAL</h2>')
$index = $index.Replace('>Final</h2>','>SCORE WIRE</h2>')

# Give the radio feature a transmission identity without changing the actual Dragon Radio brand.
$index = $index.Replace('<span class="launch-eyebrow">SCORE WIRE</span>`r`n          <h2 id="score-wire-title">SCORE WIRE</h2>', '<span class="launch-eyebrow">LIVE SPORTS / SPOILER CONTROL</span>`r`n          <h2 id="score-wire-title">SCORE WIRE</h2>')
$index = $index.Replace('<span class="launch-eyebrow">SCORE WIRE</span>\n          <h2 id="score-wire-title">SCORE WIRE</h2>', '<span class="launch-eyebrow">LIVE SPORTS / SPOILER CONTROL</span>\n          <h2 id="score-wire-title">SCORE WIRE</h2>')

Set-Content "src\pages\index.astro" $index -Encoding UTF8

# TV language: establish the page as a network capable of carrying games, creators, interviews and events.
$tvPath="src\pages\tv\index.astro"
if(Test-Path $tvPath){
  $tv=Get-Content $tvPath -Raw
  $tv=$tv.Replace('DRAGON / TRANSMISSION','DRAGON NETWORK / TRANSMISSION')
  $tv=$tv.Replace('Live games, broadcasts and experiments.','Live games, creators, broadcasts and experiments.')
  $tv=$tv.Replace('Live / Games / Video','Live / Creators / Games / Events')
  Set-Content $tvPath $tv -Encoding UTF8
}

# Stronger, less template-like identity. CSS intentionally overrides prior passes.
@'

/* =========================================================
   DRAGON WORLD IDENTITY — PASS 13
   Goal: less "website sections", more living publication/network.
   ========================================================= */

/* Masthead becomes a true magazine/world title. */
.dragon-title,
.dragon-masthead,
.home-dragon-title{
  letter-spacing:-.055em!important;
  text-shadow:0 0 42px rgba(227,187,69,.06);
}

/* Main home composition: slightly wider and more dramatic. */
.launch-main,
.launch-home,
main.launch-page{
  overflow:hidden;
}

/* THE SIGNAL replaces the generic Current. */
.current-section h2,
.launch-current h2,
.home-current h2{
  text-transform:uppercase;
  letter-spacing:-.025em;
}

/* Break the card-grid politeness: content feels like dispatches in a publication. */
.current-grid,
.launch-current-grid,
.home-current-grid{
  gap:0!important;
  border-top:1px solid rgba(227,187,69,.22);
  border-bottom:1px solid rgba(227,187,69,.13);
}
.current-grid > *,
.launch-current-grid > *,
.home-current-grid > *{
  border-top:0!important;
  border-bottom:0!important;
  min-height:112px;
  transition:background .18s ease, transform .18s ease, border-color .18s ease;
}
.current-grid > *:hover,
.launch-current-grid > *:hover,
.home-current-grid > *:hover{
  background:rgba(227,187,69,.035)!important;
  transform:translateY(-2px);
  border-color:rgba(227,187,69,.34)!important;
}

/* SCORE WIRE: no longer tiny metadata. It is a major live-information object. */
.home-score-wire{
  width:min(1240px,calc(100% - 40px))!important;
  margin:76px auto 0!important;
  padding:34px 0 0!important;
  border-top:1px solid rgba(227,187,69,.34)!important;
  position:relative;
}
.home-score-wire:before{
  content:"DRAGON // LIVE INFORMATION";
  position:absolute;
  top:-7px;
  right:0;
  padding-left:12px;
  background:#06070a;
  color:#5e6470;
  font:800 7px/1 system-ui,sans-serif;
  letter-spacing:.2em;
}
.home-score-wire__head{
  align-items:center!important;
  margin-bottom:22px!important;
}
.home-score-wire__head h2{
  margin:4px 0 0!important;
  font:800 clamp(42px,5vw,72px)/.9 Georgia,serif!important;
  letter-spacing:-.055em!important;
  text-transform:uppercase;
}
.home-score-wire .launch-eyebrow{
  letter-spacing:.2em!important;
}

.home-score-card{
  min-height:190px!important;
  grid-template-columns:180px minmax(0,1fr)!important;
  border:1px solid rgba(227,187,69,.26)!important;
  background:
    linear-gradient(90deg,rgba(227,187,69,.025),transparent 32%),
    #07080b!important;
}
.home-score-card__meta{
  padding:26px!important;
  border-right:1px solid rgba(227,187,69,.22)!important;
  align-content:space-between!important;
}
.home-score-card__meta span{
  font-size:10px!important;
}
.home-score-card__meta strong{
  font-size:13px!important;
}
.home-score-card__meta small{
  font-size:9px!important;
}
.home-score-card__match{
  grid-template-columns:1fr 70px 1fr!important;
  padding:24px 38px!important;
  gap:20px!important;
}
.home-score-card__match>div{
  grid-template-columns:58px minmax(0,1fr) auto!important;
  gap:18px!important;
}
.home-score-card__match>div>span{
  width:56px!important;
  height:56px!important;
  font-size:13px!important;
  border-color:#414650!important;
}
.home-score-card__match strong{
  font:600 clamp(21px,2vw,31px)/1 Georgia,serif!important;
}
.home-score-card__match b{
  font:700 clamp(42px,4vw,66px)/1 Georgia,serif!important;
  color:#f0eadf;
}
.home-score-card__match>i{
  font-size:25px;
}
.home-score-card__mask{
  left:180px!important;
  gap:22px!important;
  background:
    repeating-linear-gradient(135deg,rgba(255,255,255,.012) 0 1px,transparent 1px 9px),
    rgba(7,8,10,.985)!important;
}
.home-score-card__mask span{
  font-size:10px!important;
  letter-spacing:.24em!important;
}
.home-score-card__mask button{
  min-height:48px!important;
  padding:0 22px!important;
  border-color:rgba(227,187,69,.35)!important;
  color:#e3bb45!important;
  font-size:8px!important;
}

/* Spoiler switch gets enough visual weight to read as a control, not fine print. */
.home-spoiler-toggle{
  gap:12px!important;
}
.home-spoiler-toggle__ring{
  width:38px!important;
  height:38px!important;
}
.home-spoiler-toggle__ring i{
  width:11px!important;
  height:11px!important;
}
.home-spoiler-toggle small{font-size:7px!important}
.home-spoiler-toggle strong{font-size:10px!important}

/* TV should read as one machine/network, not a stack of website cards. */
.tv-shell,
.dragon-tv-shell,
.transmission-shell{
  border-color:rgba(227,187,69,.18)!important;
}
.tv-tabs a,
.tv-tabs button,
.transmission-tabs a,
.transmission-tabs button{
  letter-spacing:.16em!important;
}

/* Micro-motion: restrained, console-like. */
.launch-nav-link,
.launch-search,
.launch-listen,
.home-score-card__mask button{
  transition:transform .16s ease,border-color .16s ease,background .16s ease,color .16s ease;
}
.launch-search:hover,
.launch-listen:hover,
.home-score-card__mask button:hover{
  transform:translateY(-1px);
}

/* Mobile is a first-class composition, not a squeezed desktop. */
@media(max-width:760px){
  .home-score-wire{
    width:100%!important;
    margin-top:50px!important;
    padding:26px 14px 0!important;
  }
  .home-score-wire:before{
    display:none;
  }
  .home-score-wire__head{
    align-items:flex-end!important;
    gap:12px!important;
  }
  .home-score-wire__head h2{
    font-size:38px!important;
  }
  .home-score-card{
    min-height:230px!important;
    grid-template-columns:1fr!important;
  }
  .home-score-card__meta{
    min-height:52px;
    padding:12px 14px!important;
    border-right:0!important;
    border-bottom:1px solid rgba(227,187,69,.18)!important;
    grid-template-columns:auto auto 1fr;
    align-items:center!important;
    gap:12px!important;
  }
  .home-score-card__meta small{text-align:right}
  .home-score-card__match{
    grid-template-columns:1fr!important;
    padding:16px!important;
    gap:10px!important;
  }
  .home-score-card__match>div{
    grid-template-columns:42px 1fr auto!important;
    gap:10px!important;
  }
  .home-score-card__match>div>span{
    width:40px!important;
    height:40px!important;
    font-size:10px!important;
  }
  .home-score-card__match strong{font-size:19px!important}
  .home-score-card__match b{font-size:36px!important}
  .home-score-card__mask{
    left:0!important;
    top:52px!important;
    flex-direction:column;
  }
  .home-spoiler-toggle__ring{
    width:34px!important;
    height:34px!important;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 13 INSTALLED." -ForegroundColor Green
Write-Host "CURRENT -> THE SIGNAL; FINAL -> SCORE WIRE." -ForegroundColor Green
Write-Host "MLB Score Wire enlarged dramatically for desktop + mobile." -ForegroundColor Green
Write-Host "Home presentation pushed toward publication/network identity." -ForegroundColor Green
Write-Host "Dragon TV language expanded from gaming to a creator broadcast network." -ForegroundColor Green
Write-Host "Backups saved to: $backup" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
