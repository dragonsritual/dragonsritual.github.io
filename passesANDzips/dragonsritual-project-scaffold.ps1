$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual Project Scaffold ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this script from inside your dragonsritual.github.io repository."
}

if (-not (Test-Path "astro.config.mjs")) {
    throw "STOPPED: Astro project not detected. Make sure you are in the DragonsRitual repo."
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Ensure-Dir {
    param([Parameter(Mandatory=$true)][string]$Path)

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
        Write-Host "Created folder: $Path" -ForegroundColor DarkGray
    }
}

function Ensure-File {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )

    $fullPath = Join-Path (Get-Location) $Path
    $parent = Split-Path -Parent $fullPath

    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    if (-not (Test-Path $fullPath)) {
        [System.IO.File]::WriteAllText($fullPath, $Content, $Utf8NoBom)
        Write-Host "Created file:   $Path" -ForegroundColor Green
    }
    else {
        Write-Host "Kept existing:  $Path" -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# 1) CREATE PROFESSIONAL PROJECT STRUCTURE
# ------------------------------------------------------------
$folders = @(
    "src\components",
    "src\components\common",
    "src\components\gaming",
    "src\components\journal",
    "src\layouts",
    "src\pages",
    "src\pages\gaming",
    "src\pages\journal",
    "src\pages\admin",
    "src\services",
    "src\services\gaming",
    "src\services\journal",
    "src\services\auth",
    "src\lib",
    "src\domain",
    "src\data",
    "src\styles",
    "src\utils",
    "src\config",
    "src\types",
    "src\features",
    "src\features\gaming",
    "src\features\journal",
    "src\features\auth",
    "src\features\world",
    "public\assets",
    "public\images",
    "public\icons",
    "scripts",
    "docs",
    "supabase",
    "supabase\migrations",
    "supabase\seed",
    "tests",
    "tests\unit",
    "tests\integration"
)

foreach ($folder in $folders) {
    Ensure-Dir $folder
}

# ------------------------------------------------------------
# 2) CORE APP CONFIG
# ------------------------------------------------------------
Ensure-File "src\config\site.ts" @'
export const SITE = {
  name: "DragonsRitual",
  title: "DragonsRitual Network",
  description: "Gaming, streams, statistics, articles, and connected-world experiences.",
  url: "https://dragonsritual.com"
} as const;
'@

Ensure-File "src\config\navigation.ts" @'
export interface SiteNavItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

export const siteNavigation: SiteNavItem[] = [
  {
    id: "gaming",
    label: "Gaming",
    href: "/",
    enabled: true
  }
];

/*
  IMPORTANT:
  Add future global sections here ONLY when you intentionally build them.

  Example later:
  {
    id: "journal",
    label: "Journal",
    href: "/journal",
    enabled: true
  }
*/
'@

# ------------------------------------------------------------
# 3) SHARED TYPES
# ------------------------------------------------------------
Ensure-File "src\types\common.ts" @'
export type ID = string;

export interface Timestamped {
  createdAt?: string;
  updatedAt?: string;
}
'@

# ------------------------------------------------------------
# 4) SERVICES - CLEAN ENTRY POINTS
# ------------------------------------------------------------
Ensure-File "src\services\gaming\index.ts" @'
export { getGamingDashboard } from "../gamingDashboardService";
'@

Ensure-File "src\services\journal\index.ts" @'
/*
  Sanity-backed journal service will live here.

  Planned responsibilities:
  - list published articles
  - get article by slug
  - resolve related game/session IDs
  - preview drafts for authenticated editors
*/
'@

Ensure-File "src\services\auth\index.ts" @'
/*
  Supabase Auth service will live here.

  Planned responsibilities:
  - sign in
  - sign out
  - session retrieval
  - profile loading
  - admin/editor permission checks
*/
'@

# ------------------------------------------------------------
# 5) FEATURE BOUNDARIES
# ------------------------------------------------------------
Ensure-File "src\features\gaming\README.md" @'
# Gaming Feature

Owns:
- league dashboard
- schedules
- statistics
- game records
- session records
- Twitch relationships

Does not own:
- authentication
- article body content
- global navigation
'@

Ensure-File "src\features\journal\README.md" @'
# Journal Feature

Future Sanity-powered editorial system.

Owns:
- newsroom
- article cards
- article pages
- categories
- tags
- rich editorial content
- related game/session references
'@

Ensure-File "src\features\auth\README.md" @'
# Auth Feature

Future Supabase Auth integration.

Owns:
- account session
- sign in / sign out
- user profile
- admin/editor authorization
'@

Ensure-File "src\features\world\README.md" @'
# World Feature

Reserved for future browser/desktop 3D world integration.

Owns:
- world locations
- deep links
- live world state
- Realms entry points
'@

# ------------------------------------------------------------
# 6) COMPONENT PLACEHOLDERS
# ------------------------------------------------------------
Ensure-File "src\components\common\SectionHeading.astro" @'
---
interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
}

const {
  eyebrow,
  title,
  description
} = Astro.props;
---

<header class="section-heading">
  <div>
    {eyebrow && <span>{eyebrow}</span>}
    <h2>{title}</h2>
  </div>

  {description && <p>{description}</p>}
</header>
'@

Ensure-File "src\components\gaming\README.md" @'
# Gaming Components

Put Gaming-only UI components here.

Examples:
- GameQueue.astro
- TwitchBroadcast.astro
- SeasonStats.astro
- ScheduleStrip.astro
- GamingStatsTable.astro
- GameCard.astro
'@

Ensure-File "src\components\journal\README.md" @'
# Journal Components

Future components:
- ArticleCard.astro
- FeaturedStory.astro
- ArticleMeta.astro
- RelatedStories.astro
- RichArticleBody.astro
'@

# ------------------------------------------------------------
# 7) PAGE PLACEHOLDERS
# These DO NOT become public navigation automatically.
# ------------------------------------------------------------
Ensure-File "src\pages\gaming\README.md" @'
# Gaming Routes

The public Gaming dashboard currently lives at `/`.

Future optional routes may include:
- /gaming/games/[slug]
- /gaming/sessions/[id]
- /gaming/schedule
'@

Ensure-File "src\pages\journal\README.md" @'
# Journal Routes

Reserved for when the Sanity-backed newsroom is ready.

Planned:
- /journal
- /journal/[slug]
'@

Ensure-File "src\pages\admin\README.md" @'
# Admin Routes

Reserved for the future authenticated DragonsRitual control panel.

Planned:
- /admin
- /admin/games
- /admin/sessions
- /admin/articles
- /admin/media
- /admin/world
'@

# ------------------------------------------------------------
# 8) SUPABASE DOCUMENTATION / SEED STRUCTURE
# ------------------------------------------------------------
Ensure-File "supabase\seed\README.md" @'
# Supabase Seed Data

Optional repeatable seed scripts belong here.

Do not put passwords, service-role keys, or project secrets in this folder.
'@

Ensure-File "supabase\README.md" @'
# Supabase

Database schema changes belong in `supabase/migrations`.

Rules:
- migrations are source controlled
- never edit production schema manually without recording the migration
- public browser access uses RLS
- never expose a service-role key in Astro client code
'@

# ------------------------------------------------------------
# 9) TEST PLACEHOLDERS
# ------------------------------------------------------------
Ensure-File "tests\README.md" @'
# Tests

Future structure:

- unit: services, schemas, utilities
- integration: Supabase/Sanity/service relationships
'@

# ------------------------------------------------------------
# 10) SCRIPT HELPERS
# ------------------------------------------------------------
Ensure-File "scripts\README.md" @'
# Scripts

Keep small maintenance scripts here.

Examples:
- validate data
- import gaming records
- generate reports
- verify migrations
- build metadata

Avoid giant scripts that rewrite the whole project.
'@

# ------------------------------------------------------------
# 11) PROJECT ARCHITECTURE DOCUMENT
# ------------------------------------------------------------
Ensure-File "docs\project-architecture.md" @'
# DragonsRitual Project Architecture

## Primary rule

Every major function is a module/system.

The UI should not directly own database logic.

## Layers

### Astro
Presentation, routes, layouts, SEO.

### Services
Application-facing logic.

### Supabase / PostgreSQL
Structured relational data:
- games
- sessions
- streams
- schedules
- world locations
- profiles
- rewards
- live channels

### Sanity
Editorial publishing:
- article body
- drafts
- structured editorial blocks
- newsroom workflow

### Future 3D Runtime
Three.js / WebGPU / desktop wrapper.

## Public site scope

Only Gaming is currently public.

Future navigation items are added only after their corresponding system is intentionally built.
'@

# ------------------------------------------------------------
# 12) SHOW TREE
# ------------------------------------------------------------
Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "PROJECT SCAFFOLD COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "No existing source files were overwritten." -ForegroundColor Yellow
Write-Host "Only missing folders/files were created." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Run: npm run build" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Keep using http://localhost:4321" -ForegroundColor White
Write-Host ""
Write-Host "After that, return to Supabase SQL Editor so we can apply the real migrations." -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
