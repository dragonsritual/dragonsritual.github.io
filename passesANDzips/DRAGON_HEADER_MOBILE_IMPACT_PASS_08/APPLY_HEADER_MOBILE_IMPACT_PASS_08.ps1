$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\components\LaunchHeader.astro") -or -not(Test-Path "src\styles\launch.css")){
  throw "Run this from the dragonsritual.github.io project root."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\header-mobile-impact-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @("src\components\LaunchHeader.astro","src\styles\launch.css","src\pages\index.astro")){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

Write-Host "DRAGON HEADER + MOBILE IMPACT PASS 08" -ForegroundColor Cyan

# Replace header with a cleaner, mobile-first structure.
@'
---
const path = Astro.url.pathname;
const isToday = path === "/";
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
    <a class:list={["launch-nav-link",{active:isRadio}]} href="/radio/">
      <i></i><span>RADIO</span>
    </a>
  </nav>

  <div class="launch-actions">
    <button class="launch-search" type="button" data-search-open aria-label="Search archive">
      <span class="launch-search__icon" aria-hidden="true"></span>
      <span class="launch-search__label">SEARCH</span>
    </button>

    <a class="launch-listen" href="/radio/">
      <span class="launch-live-dot"></span>
      <span>LISTEN LIVE</span>
    </a>
  </div>
</header>
'@ | Set-Content "src\components\LaunchHeader.astro" -Encoding UTF8

# Insert a giant DRAGON impact band above the board if it doesn't already exist.
$index=Get-Content "src\pages\index.astro" -Raw
if($index -notmatch 'dragon-impact-band'){
  $index=$index.Replace('<main class="today-shell">', @'
<main class="today-shell">
  <section class="dragon-impact-band" aria-label="Dragon">
    <div class="dragon-impact-word">DRAGON</div>
  </section>
'@)
  Set-Content "src\pages\index.astro" $index -Encoding UTF8
}

# Strong overrides, desktop + mobile equally.
@'

/* =========================================================
   DRAGON HEADER + MOBILE IMPACT — PASS 08
   ========================================================= */

.launch-header{
  min-height:72px;
  padding:0 clamp(16px,3vw,42px);
  grid-template-columns:minmax(180px,1fr) auto minmax(180px,1fr);
  gap:18px;
}

.launch-nav{
  justify-self:center;
  display:flex;
  align-items:stretch;
}

.launch-actions{
  justify-self:end;
  display:flex;
  align-items:center;
  gap:12px;
  min-width:0;
}

.launch-search{
  min-height:38px;
  padding:0 12px;
  display:inline-flex;
  align-items:center;
  gap:8px;
  border:1px solid rgba(227,187,69,.22);
  background:rgba(255,255,255,.015);
  color:#c3c8d1;
  border-radius:999px;
  cursor:pointer;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.15em;
  margin:0;
}

.launch-search__icon{
  position:relative;
  width:14px;
  height:14px;
  flex:0 0 auto;
}
.launch-search__icon::before{
  content:"";
  position:absolute;
  width:8px;
  height:8px;
  border:1.5px solid #d8dde5;
  border-radius:50%;
  left:0;
  top:0;
}
.launch-search__icon::after{
  content:"";
  position:absolute;
  width:6px;
  height:1.5px;
  background:#d8dde5;
  transform:rotate(45deg);
  left:8px;
  top:9px;
  transform-origin:left center;
}

.launch-listen{
  min-height:38px;
  padding:0 12px;
  display:inline-flex;
  align-items:center;
  gap:8px;
  border:1px solid rgba(103,237,145,.18);
  border-radius:999px;
  color:#b8bec8;
  text-decoration:none;
  white-space:nowrap;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.14em;
}

.launch-listen:hover,
.launch-search:hover{
  border-color:rgba(227,187,69,.5);
  color:var(--launch-cream);
}

.dragon-impact-band{
  width:100%;
  min-height:190px;
  display:grid;
  place-items:center;
  border-bottom:1px solid rgba(227,187,69,.18);
  overflow:hidden;
}

.dragon-impact-word{
  color:var(--launch-gold);
  font:900 clamp(78px,12vw,170px)/.78 system-ui,sans-serif;
  letter-spacing:.12em;
  text-indent:.12em;
  transform:scaleX(.94);
  text-shadow:0 0 24px rgba(227,187,69,.06);
  user-select:none;
}

@media(max-width:900px){
  .launch-header{
    grid-template-columns:minmax(150px,1fr) auto auto;
    gap:10px;
  }
  .launch-search__label{
    display:none;
  }
  .launch-search{
    width:38px;
    padding:0;
    justify-content:center;
  }
}

/* MOBILE IS A FIRST-CLASS LAYOUT, NOT A SHRUNKEN DESKTOP */
@media(max-width:760px){
  .launch-header{
    min-height:64px;
    padding:0 10px;
    grid-template-columns:minmax(0,1fr) auto;
    grid-template-areas:
      "brand actions"
      "nav nav";
    gap:0 8px;
    align-items:center;
  }

  .launch-brand{
    grid-area:brand;
    min-width:0;
  }

  .launch-wordmark strong{
    font-size:11px;
    letter-spacing:.1em;
  }

  .launch-wordmark small{
    display:none;
  }

  .launch-nav{
    grid-area:nav;
    justify-self:stretch;
    height:42px;
    border-top:1px solid rgba(255,255,255,.035);
  }

  .launch-nav-link{
    flex:1 1 0;
    min-width:0;
    height:42px;
    padding:0 14px;
    flex-direction:row;
    gap:7px;
    font-size:8px;
  }

  .launch-actions{
    grid-area:actions;
    justify-self:end;
    gap:7px;
  }

  .launch-search{
    display:inline-flex !important;
    width:38px;
    height:38px;
    min-height:38px;
    padding:0;
    justify-content:center;
    border-color:rgba(227,187,69,.32);
    background:rgba(227,187,69,.035);
  }

  .launch-search__label{
    display:none;
  }

  .launch-listen{
    min-width:38px;
    width:38px;
    height:38px;
    min-height:38px;
    padding:0;
    justify-content:center;
    border-radius:50%;
  }

  .launch-listen span:last-child{
    display:none;
  }

  .launch-listen .launch-live-dot{
    width:9px;
    height:9px;
  }

  .dragon-impact-band{
    min-height:128px;
    margin-top:8px;
  }

  .dragon-impact-word{
    font-size:clamp(62px,20vw,92px);
    letter-spacing:.07em;
    text-indent:.07em;
  }

  /* Search overlay mobile visibility/contrast */
  .archive-search__head{
    padding:14px 16px;
  }

  .archive-search__head span{
    color:#e3bb45 !important;
    opacity:1;
  }

  .archive-search__head strong{
    color:#f3eee6;
  }

  .archive-search__input-wrap>span{
    color:#a8afba;
  }

  .archive-search__input-wrap input{
    color:#f3eee6;
  }

  .archive-search__input-wrap input::placeholder{
    color:#6e7580;
  }

  .archive-search__group h2{
    color:#e3bb45;
    font-size:9px;
  }

  .archive-search__item strong{
    color:#f0ebe3;
    font-size:19px;
  }

  .archive-search__item span{
    color:#8c939e;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 08 INSTALLED." -ForegroundColor Green
Write-Host "Header spacing fixed; Search made visible; mobile controls restored." -ForegroundColor Green
Write-Host "DRAGON impact band added above TODAY content." -ForegroundColor Yellow
Write-Host ""
Write-Host "Now run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
