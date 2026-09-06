$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Get-Location

Write-Host "DRAGONSRITUAL PASS 27 — DAILY" -ForegroundColor Yellow

$files = @(
  "src/pages/index.astro",
  "src/pages/join.astro"
)
foreach ($rel in $files) {
  $src = Join-Path $root $rel
  $dst = Join-Path $project $rel
  if (Test-Path $src) {
    New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
    Copy-Item $src $dst -Force
    Write-Host "Updated $rel"
  }
}

$header = Join-Path $project "src/components/LaunchHeader.astro"
if (Test-Path $header) {
  $text = Get-Content $header -Raw
  $before = $text
  $text = $text -replace '>TODAY<','>DAILY<'
  $text = $text -replace 'aria-label="Today"','aria-label="Daily"'
  $text = $text -replace 'title="Today"','title="Daily"'
  if ($text -ne $before) {
    Set-Content -Path $header -Value $text -Encoding utf8
    Write-Host "Updated src/components/LaunchHeader.astro: TODAY -> DAILY"
  } else {
    Write-Host "LaunchHeader found; no exact TODAY label needed changing."
  }
} else {
  Write-Host "LaunchHeader.astro not found in this project; skipped header patch."
}

Write-Host "PASS 27 applied. Run: npm run dev" -ForegroundColor Green
