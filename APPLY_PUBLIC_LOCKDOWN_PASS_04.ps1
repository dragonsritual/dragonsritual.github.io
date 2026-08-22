$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git") -or -not (Test-Path "src\pages")) {
    throw "STOPPED: Run this from the dragonsritual.github.io project root."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = ".migration-backups\public-lockdown-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

Write-Host "DRAGON PUBLIC LOCKDOWN PASS 04" -ForegroundColor Cyan
Write-Host "Backing up changed files to $backup"

# 1) Install the already-clean TODAY + layout.
$passRoot = Join-Path $PSScriptRoot "UPDATED_FILES"
foreach ($rel in @("src\pages\index.astro","src\layouts\SiteLayout.astro")) {
    if (Test-Path $rel) {
        $dest = Join-Path $backup $rel
        New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
        Copy-Item $rel $dest -Force
    }
    Copy-Item (Join-Path $passRoot $rel) $rel -Force
}

# 2) Public launch allowlist.
# Keep the source, but move unreleased public routes OUT of src/pages so Astro does not build them.
$heldRoot = "src\_held_public_routes"
New-Item -ItemType Directory -Force -Path $heldRoot | Out-Null

$holdRoutes = @(
    "archive",
    "community",
    "creators",
    "gaming",
    "journal",
    "live",
    "media",
    "projects",
    "tools"
)

foreach ($route in $holdRoutes) {
    $from = "src\pages\$route"
    if (Test-Path $from) {
        $to = Join-Path $heldRoot $route
        if (Test-Path $to) {
            $to = Join-Path $heldRoot "$route-$stamp"
        }
        Move-Item $from $to
        Write-Host "HELD: /$route/" -ForegroundColor DarkGray
    }
}

# Admin stays in source and keeps its existing auth/noindex behavior.
# TODAY and RADIO remain the only normal public content routes.

# 3) Remove legal/process prose from the RADIO PUBLIC PAGE if an earlier pass inserted it.
$radio = "src\pages\radio\index.astro"
if (Test-Path $radio) {
    $radioBackup = Join-Path $backup $radio
    New-Item -ItemType Directory -Force -Path (Split-Path $radioBackup -Parent) | Out-Null
    Copy-Item $radio $radioBackup -Force

    $text = Get-Content $radio -Raw

    # Remove whole paragraph/block elements containing the unwanted public-facing process language.
    $bad = '(?is)<(p|div|aside|section)[^>]*>.*?(shared\s+with\s+permission|fan[- ]?based\s+station|rights?\s+holder|rights?\s+information|records?\s+permission|permission\s+or\s+applicable).*?</\1>'
    $text = [regex]::Replace($text, $bad, '')

    # Clean common leftover literal sentences if they were not wrapped alone.
    $text = [regex]::Replace($text, '(?is)Independent music\s*\.\s*Shared with permission\s*\.?', 'Independent music.')
    $text = [regex]::Replace($text, '(?is)This first public release is a fan[- ]?based station.*?(artist|rights holder)\s*\.?', '')

    [System.IO.File]::WriteAllText(
        (Resolve-Path $radio),
        $text,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

# 4) Make 404 send normal visitors back to TODAY.
$notFound = @'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta http-equiv="refresh" content="0;url=/">
  <title>DragonsRitual</title>
  <script>location.replace("/");</script>
</head>
<body></body>
</html>
'@
if (Test-Path "404.html") { Copy-Item "404.html" (Join-Path $backup "404.html") -Force }
Set-Content -Path "404.html" -Value $notFound -Encoding UTF8

Write-Host ""
Write-Host "LOCKDOWN APPLIED." -ForegroundColor Green
Write-Host "Public build target: TODAY + RADIO only." -ForegroundColor Green
Write-Host "Old public pages were MOVED, not deleted:" -ForegroundColor Yellow
Write-Host "  src\_held_public_routes\"
Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "  npm run build"
Write-Host ""
Write-Host "In the build output, the old public routes should be GONE."
Write-Host "Then:"
Write-Host "  git add -A"
Write-Host '  git commit -m "Lock public launch to Today and Radio"'
Write-Host "  git push origin main"
