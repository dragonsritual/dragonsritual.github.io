$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro") -or -not(Test-Path "src\styles\launch.css")){
  throw "Run this from the dragonsritual.github.io project root."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\art-test-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @("src\pages\index.astro","src\styles\launch.css")){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

New-Item -ItemType Directory -Force "public\test-art" | Out-Null
Copy-Item ".\DRAGON_ART_TEST_PASS_15\assets\dragon-magazine-reference-test.png" "public\test-art\dragon-magazine-reference-test.png" -Force

$index = Get-Content "src\pages\index.astro" -Raw

if($index -notmatch 'dragon-art-test-feature'){
  $feature = @'
  <section class="dragon-art-test-feature" aria-label="Temporary visual art test">
    <div class="dragon-art-test-feature__image">
      <img src="/test-art/dragon-magazine-reference-test.png" alt="Temporary magazine artwork reference used for local layout testing" />
      <div class="dragon-art-test-feature__wash"></div>

      <div class="dragon-art-test-feature__stamp">
        <span>VISUAL TEST</span>
        <strong>FEATURED WORLD</strong>
      </div>

      <div class="dragon-art-test-feature__title">
        <span>DRAGON / ART TEST</span>
        <h2>THE IMAGE<br/>TAKES THE PAGE</h2>
        <p>Temporary composition test — not production artwork.</p>
      </div>

      <div class="dragon-art-test-feature__rail">
        <span>LIVE</span>
        <strong>DRAGON TV</strong>
        <span>READ</span>
        <strong>FICTION</strong>
        <span>WIRE</span>
        <strong>SPORTS</strong>
      </div>
    </div>
  </section>
'@

  $marker = '<section class="today-hero'
  $pos = $index.IndexOf($marker)
  if($pos -ge 0){
    $end = $index.IndexOf('</section>', $pos)
    if($end -ge 0){
      $end += '</section>'.Length
      $index = $index.Insert($end, "`r`n" + $feature)
    } else {
      throw "Could not locate end of homepage hero."
    }
  } else {
    # Fallback: place directly after giant DRAGON band.
    $marker2 = '</section>'
    $pos2 = $index.IndexOf($marker2)
    if($pos2 -ge 0){
      $pos2 += $marker2.Length
      $index = $index.Insert($pos2, "`r`n" + $feature)
    } else {
      throw "Could not find homepage insertion point."
    }
  }

  Set-Content "src\pages\index.astro" $index -Encoding UTF8
}

@'

/* =========================================================
   TEMPORARY ART TEST — PASS 15
   Local composition test only. Not intended for deployment.
   ========================================================= */

.dragon-art-test-feature{
  width:min(1260px,calc(100% - 36px));
  margin:34px auto 64px;
  border-top:1px solid rgba(227,187,69,.25);
  border-bottom:1px solid rgba(227,187,69,.25);
}

.dragon-art-test-feature__image{
  position:relative;
  min-height:clamp(560px,72vw,920px);
  overflow:hidden;
  background:#050506;
  isolation:isolate;
}

.dragon-art-test-feature__image img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center 18%;
  filter:saturate(.92) contrast(1.03) brightness(.72);
  transform:scale(1.025);
}

.dragon-art-test-feature__wash{
  position:absolute;
  inset:0;
  z-index:1;
  background:
    linear-gradient(90deg,rgba(2,3,5,.88) 0%,rgba(2,3,5,.45) 34%,rgba(2,3,5,.08) 63%,rgba(2,3,5,.58) 100%),
    linear-gradient(180deg,rgba(2,3,5,.08) 40%,rgba(2,3,5,.88) 100%);
}

.dragon-art-test-feature__stamp{
  position:absolute;
  z-index:2;
  top:28px;
  left:30px;
  display:grid;
  gap:6px;
}
.dragon-art-test-feature__stamp span{
  color:var(--launch-gold);
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.18em;
}
.dragon-art-test-feature__stamp strong{
  color:#f4eee5;
  font:800 12px/1 system-ui,sans-serif;
  letter-spacing:.1em;
}

.dragon-art-test-feature__title{
  position:absolute;
  z-index:2;
  left:30px;
  bottom:34px;
  width:min(760px,72%);
}
.dragon-art-test-feature__title>span{
  color:var(--launch-gold);
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.2em;
}
.dragon-art-test-feature__title h2{
  margin:12px 0 10px;
  color:#f3eee6;
  font-family:"Cinzel",Georgia,serif;
  font-size:clamp(44px,7.5vw,108px);
  line-height:.82;
  letter-spacing:-.035em;
  text-shadow:0 2px 18px rgba(0,0,0,.42);
}
.dragon-art-test-feature__title p{
  margin:0;
  color:#c3c0bb;
  font:500 12px/1.4 system-ui,sans-serif;
}

.dragon-art-test-feature__rail{
  position:absolute;
  z-index:2;
  top:28px;
  right:26px;
  width:142px;
  display:grid;
  gap:5px;
  padding:14px;
  border-left:1px solid rgba(227,187,69,.35);
  background:rgba(3,4,6,.34);
  backdrop-filter:blur(6px);
}
.dragon-art-test-feature__rail span{
  margin-top:8px;
  color:var(--launch-gold);
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.18em;
}
.dragon-art-test-feature__rail span:first-child{margin-top:0}
.dragon-art-test-feature__rail strong{
  color:#f1ebe3;
  font:600 16px/1.05 Georgia,serif;
}

@media(max-width:760px){
  .dragon-art-test-feature{
    width:100%;
    margin:18px 0 42px;
    border-left:0;
    border-right:0;
  }
  .dragon-art-test-feature__image{
    min-height:680px;
  }
  .dragon-art-test-feature__image img{
    object-position:center top;
  }
  .dragon-art-test-feature__wash{
    background:
      linear-gradient(180deg,rgba(2,3,5,.12) 20%,rgba(2,3,5,.48) 58%,rgba(2,3,5,.94) 100%);
  }
  .dragon-art-test-feature__stamp{
    top:18px;
    left:16px;
  }
  .dragon-art-test-feature__title{
    left:16px;
    right:16px;
    bottom:22px;
    width:auto;
  }
  .dragon-art-test-feature__title h2{
    font-size:clamp(43px,15vw,72px);
    line-height:.86;
  }
  .dragon-art-test-feature__rail{
    top:18px;
    right:12px;
    width:112px;
    padding:10px;
  }
  .dragon-art-test-feature__rail strong{
    font-size:13px;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 15 ART TEST INSTALLED." -ForegroundColor Green
Write-Host "Temporary reference image added to homepage for LOCAL visual testing." -ForegroundColor Yellow
Write-Host "Do not deploy this copyrighted reference image publicly." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
