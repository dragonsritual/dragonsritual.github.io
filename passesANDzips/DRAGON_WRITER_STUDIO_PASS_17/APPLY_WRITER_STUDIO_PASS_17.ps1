$ErrorActionPreference="Stop"
if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\writer-room.astro")){throw "Run this from the dragonsritual.github.io project root."}
$stamp=Get-Date -Format "yyyyMMdd-HHmmss"; $backup=".migration-backups\writer-studio-$stamp"; New-Item -ItemType Directory -Force -Path $backup|Out-Null
Copy-Item "src\pages\writer-room.astro" "$backup\writer-room.astro" -Force
Copy-Item "src\styles\launch.css" "$backup\launch.css" -Force
if(Test-Path "src\pages\admin\editorial.astro"){Copy-Item "src\pages\admin\editorial.astro" "$backup\editorial.astro" -Force}
Copy-Item ".\DRAGON_WRITER_STUDIO_PASS_17\files\src\pages\writer-room.astro" "src\pages\writer-room.astro" -Force
New-Item -ItemType Directory -Force -Path "src\pages\admin"|Out-Null
Copy-Item ".\DRAGON_WRITER_STUDIO_PASS_17\files\src\pages\admin\editorial.astro" "src\pages\admin\editorial.astro" -Force
Get-Content ".\DRAGON_WRITER_STUDIO_PASS_17\files\src\styles\writer-studio.css" -Raw | Add-Content "src\styles\launch.css" -Encoding UTF8
Write-Host ""; Write-Host "WRITER STUDIO PASS 17 INSTALLED." -ForegroundColor Green
Write-Host "1. Run supabase\WRITER_STUDIO_MIGRATION.sql in Supabase SQL Editor." -ForegroundColor Yellow
Write-Host "2. npm run build" -ForegroundColor Cyan
Write-Host "3. npm run dev" -ForegroundColor Cyan
Write-Host "Writer: /writer-room/   Editor: /admin/editorial/" -ForegroundColor Green
