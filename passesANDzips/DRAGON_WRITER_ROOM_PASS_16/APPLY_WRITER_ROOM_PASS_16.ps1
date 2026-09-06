$ErrorActionPreference="Stop"
if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro") -or -not(Test-Path "src\lib\supabaseBrowser.ts")){throw "Run this from the dragonsritual.github.io project root."}
$stamp=Get-Date -Format "yyyyMMdd-HHmmss"; $backup=".migration-backups\writer-room-$stamp"; New-Item -ItemType Directory -Force -Path $backup|Out-Null
Copy-Item "src\styles\launch.css" "$backup\launch.css" -Force
Copy-Item ".\DRAGON_WRITER_ROOM_PASS_16\files\src\pages\join.astro" "src\pages\join.astro" -Force
Copy-Item ".\DRAGON_WRITER_ROOM_PASS_16\files\src\pages\writer-room.astro" "src\pages\writer-room.astro" -Force
Get-Content ".\DRAGON_WRITER_ROOM_PASS_16\files\src\styles\writer-room.css" -Raw | Add-Content "src\styles\launch.css" -Encoding UTF8
Write-Host ""; Write-Host "PASS 16 INSTALLED." -ForegroundColor Green; Write-Host "Added /join/ and /writer-room/." -ForegroundColor Green; Write-Host "NEXT: run the included Supabase SQL before inviting the writer." -ForegroundColor Yellow; Write-Host "Then: npm run build ; npm run dev" -ForegroundColor Cyan
