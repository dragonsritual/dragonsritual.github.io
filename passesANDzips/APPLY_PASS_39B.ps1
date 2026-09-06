param([string]$Repo=".")
$ErrorActionPreference="Stop"
$pass=Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item "$pass\src\pages\index.astro" "$Repo\src\pages\index.astro" -Force
Copy-Item "$pass\src\components\WordOfTheDay.astro" "$Repo\src\components\WordOfTheDay.astro" -Force
Copy-Item "$pass\src\styles\word-of-day.css" "$Repo\src\styles\word-of-day.css" -Force
Write-Host "Dragon Word of the Day PASS 39B installed." -ForegroundColor Green
