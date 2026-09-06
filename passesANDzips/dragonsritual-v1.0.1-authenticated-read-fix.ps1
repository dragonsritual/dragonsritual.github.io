$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v1.0.1 - Authenticated Database Read Fix ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\games.astro")) {
    throw "STOPPED: v1.0 Game Editor was not found."
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )

    $fullPath = Join-Path (Get-Location) $Path
    $parent = Split-Path -Parent $fullPath

    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    [System.IO.File]::WriteAllText($fullPath, $Content, $Utf8NoBom)
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v1.0.1-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# ------------------------------------------------------------
# IMPORTANT CORRECTION
# The three original games ALREADY exist in PostgreSQL.
# The editor showed zero because authenticated users did not yet
# have matching SELECT RLS policies on the public data tables.
# ------------------------------------------------------------

Write-NoBom "supabase\migrations\202608070006_authenticated_read_policies.sql" @'
-- DragonsRitual v1.0.1
-- Fix authenticated reads for admin/editor sessions.
--
-- The original public policies were created for `anon`.
-- Once the owner signs in, requests use the `authenticated` role.
-- Table GRANTs alone are not enough when RLS is enabled.
-- These policies allow authenticated sessions to read the same
-- public catalog data while write operations remain admin-only.

drop policy if exists "authenticated read platforms" on public.platforms;
create policy "authenticated read platforms"
on public.platforms
for select
to authenticated
using (true);

drop policy if exists "authenticated read games" on public.games;
create policy "authenticated read games"
on public.games
for select
to authenticated
using (true);

drop policy if exists "authenticated read streams" on public.streams;
create policy "authenticated read streams"
on public.streams
for select
to authenticated
using (true);

drop policy if exists "authenticated read world locations" on public.world_locations;
create policy "authenticated read world locations"
on public.world_locations
for select
to authenticated
using (true);

drop policy if exists "authenticated read sessions" on public.sessions;
create policy "authenticated read sessions"
on public.sessions
for select
to authenticated
using (true);

drop policy if exists "authenticated read tags" on public.tags;
create policy "authenticated read tags"
on public.tags
for select
to authenticated
using (true);

drop policy if exists "authenticated read categories" on public.categories;
create policy "authenticated read categories"
on public.categories
for select
to authenticated
using (true);

drop policy if exists "authenticated read game tags" on public.game_tags;
create policy "authenticated read game tags"
on public.game_tags
for select
to authenticated
using (true);

drop policy if exists "authenticated read game categories" on public.game_categories;
create policy "authenticated read game categories"
on public.game_categories
for select
to authenticated
using (true);

drop policy if exists "authenticated read session tags" on public.session_tags;
create policy "authenticated read session tags"
on public.session_tags
for select
to authenticated
using (true);

drop policy if exists "authenticated read media" on public.media;
create policy "authenticated read media"
on public.media
for select
to authenticated
using (true);

drop policy if exists "authenticated read article links" on public.article_links;
create policy "authenticated read article links"
on public.article_links
for select
to authenticated
using (true);

-- Sanity check. This returns the three existing game records when run
-- in SQL Editor; the browser editor will see them after this migration.
select
  title,
  status,
  hours_played,
  progress_percent,
  session_count
from public.games
order by title;
'@

Write-NoBom "docs\v1.0.1-authenticated-read-fix.md" @'
# v1.0.1 Authenticated Read Fix

The Game Editor initially showed `0` games even though the public Gaming
page was already reading the seeded PostgreSQL records.

Cause:

- public catalog SELECT RLS policies were scoped to `anon`
- after owner sign-in, Supabase requests use the `authenticated` role
- authenticated had table privileges but no matching row-level SELECT policy

Fix:

`202608070006_authenticated_read_policies.sql`

This adds authenticated SELECT policies for public catalog tables.

Security remains intact:

- authenticated users may read public catalog records
- game INSERT/UPDATE still requires `public.is_admin()`
- session writes still require `public.is_admin()`
- no game DELETE permission exists
'@

npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "v1.0.1 PATCH CREATED" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The existing games were already in PostgreSQL." -ForegroundColor Yellow
Write-Host "This patch fixes authenticated RLS reads in the Game Editor." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Apply migration 202608070006_authenticated_read_policies.sql" -ForegroundColor White
Write-Host "2. Restart npm run dev" -ForegroundColor White
Write-Host "3. Refresh /admin/games/" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
