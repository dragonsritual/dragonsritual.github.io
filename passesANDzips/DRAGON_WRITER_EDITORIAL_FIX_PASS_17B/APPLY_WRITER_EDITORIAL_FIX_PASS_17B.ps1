$ErrorActionPreference = "Stop"

if(-not (Test-Path ".git") -or -not (Test-Path "src\pages\writer-room.astro") -or -not (Test-Path "src\pages\admin\editorial.astro")){
  throw "Run this from the dragonsritual.github.io project root AFTER PASS 17."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = ".migration-backups\writer-editorial-17B-$stamp"
New-Item -ItemType Directory -Force -Path "$backup\src\pages\admin" | Out-Null
New-Item -ItemType Directory -Force -Path "$backup\src\styles" | Out-Null

Copy-Item "src\pages\admin\editorial.astro" "$backup\src\pages\admin\editorial.astro" -Force
if(Test-Path "src\styles\writer-studio.css"){
  Copy-Item "src\styles\writer-studio.css" "$backup\src\styles\writer-studio.css" -Force
}

Copy-Item ".\DRAGON_WRITER_EDITORIAL_FIX_PASS_17B\files\src\pages\admin\editorial.astro" "src\pages\admin\editorial.astro" -Force

if(-not (Test-Path "src\styles\writer-studio.css")){
  New-Item -ItemType File -Force -Path "src\styles\writer-studio.css" | Out-Null
}

$marker = "/* DRAGON WRITER / EDITORIAL FIX PASS 17B */"
$currentCss = Get-Content "src\styles\writer-studio.css" -Raw
if($currentCss -notmatch [regex]::Escape($marker)){
  Get-Content ".\DRAGON_WRITER_EDITORIAL_FIX_PASS_17B\files\src\styles\writer-editorial-fix-17B.css" -Raw |
    Add-Content "src\styles\writer-studio.css" -Encoding UTF8
}

Write-Host ""
Write-Host "WRITER / EDITORIAL FIX PASS 17B INSTALLED." -ForegroundColor Green
Write-Host "UI fix installed: loading states + editorial session handling." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT REQUIRED STEP:" -ForegroundColor Yellow
Write-Host "Run supabase\EDITORIAL_PERMISSIONS_FIX_17B.sql in Supabase SQL Editor." -ForegroundColor Yellow
Write-Host ""
Write-Host "Then:" -ForegroundColor Cyan
Write-Host "npm run build" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan
