$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.7 - Mobile/PWA Foundation ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "astro.config.mjs")) {
    throw "STOPPED: Astro foundation was not found."
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

# ------------------------------------------------------------
# 1) BACKUP
# ------------------------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v0.7-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$backupTargets = @(
    "src\layouts\SiteLayout.astro",
    "src\styles\core.css",
    "README.md"
)

foreach ($file in $backupTargets) {
    if (Test-Path $file) {
        $dest = Join-Path $backupDir $file
        $destParent = Split-Path -Parent $dest
        if ($destParent) {
            New-Item -ItemType Directory -Force -Path $destParent | Out-Null
        }
        Copy-Item $file $dest -Force
    }
}

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $backupDir -ForegroundColor Yellow

# ------------------------------------------------------------
# 2) PWA MANIFEST
# ------------------------------------------------------------
Write-NoBom "public\manifest.webmanifest" @'
{
  "name": "DragonsRitual Network",
  "short_name": "DragonsRitual",
  "description": "DragonsRitual gaming, live broadcasts, stats, and future connected-world experiences.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#08090c",
  "theme_color": "#08090c",
  "categories": ["games", "entertainment"],
  "icons": [
    {
      "src": "/icons/dr-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/dr-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
'@

# ------------------------------------------------------------
# 3) INSTALLABLE APP ICONS
# ------------------------------------------------------------
New-Item -ItemType Directory -Force -Path "public\icons" | Out-Null

[System.IO.File]::WriteAllBytes(
    (Join-Path (Get-Location) "public\icons\dr-192.png"),
    [System.Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAADoUlEQVR4nO3XMWiUdxjH8ecudzSJBw4OBSmYYLEtglL3QotSOjjZgq4dqlB06+DSLl3SsZOCQzsGKp1EKChSCNYsoq2gxFJTaBEytASCbYnmHFKChMPB35l7A5/P9B7vy8szfHn+77XGJ3oFL6o96gHY3gREREBEBEREQEQERERARAREREBEBEREQEQERERARAREREBEBEREQEQERERARAREREBEBESkM5S3PLh0eCjvYStNH72av8QGIiIgIsM5wjYMZSvyUg33e8MGIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICKdUQ/QCHe/f+/2wnJV9fvV7bSravaHPy9eebhxt6puLyy3qlVVOybGvrxwv6rm7/w9sokbQ0BVVaurayfO3ly/nhwfq6oLnx989O+Tqro8t7S6ulZVGw+8MdX7+rP9VfXB6fnRjNskjjAiNtBm64tn5pv7X5zcV1WX55Y2PbDw+8qru14ZwWSNJKDB7i6uTO2eHHjrnbd3/fSzr5//OcKI2ECDddqtx4/769fdbruqZmcOdcbaVbX3tcn3P70xyuGaRECDHdy3897iyvr1pn9hpz7c89GR3VV17rvFEU3XII4wIjbQZjt7nao6+/HrX33768AH5m79debE9NYO1VwCqqrqdtuzM4eqqt+vzlirqs5fXLzxy+C/Wr/98ejNqV5VtVuttX5/K+dsIEcYERuoquqtY9eec/fA8R+f/fnPf0/e/eT6S55o27CBiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiIiAiAiIiICICIiIgIgIiEhnuK97cOnwcF9Iw9lARAREpDU+0Rv1DGxjNhARAREREBEBEREQEQERERARAREREBEBEREQEQERERARAREREBEBEREQEQERERARAREREBEBEXkK9G1uvehcPa8AAAAASUVORK5CYII=")
)

[System.IO.File]::WriteAllBytes(
    (Join-Path (Get-Location) "public\icons\dr-512.png"),
    [System.Convert]::FromBase64String("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IEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAogQAIEoAAKIEACBKAACiBAAgSgAAouYnvYAtduHUkUkvAWA62AEARAkAQJQAAEQJAECUAABECQBAlAAARM0sLi1Peg0ATIAdAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAEQJAECUAABECQBAlAAARAkAQJQAAET9C5UDcT0N3pltAAAAAElFTkSuQmCC")
)

# ------------------------------------------------------------
# 4) OFFLINE PAGE
# ------------------------------------------------------------
Write-NoBom "public\offline.html" @'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#08090c" />
  <title>DragonsRitual — Offline</title>
  <style>
    html,body{margin:0;min-height:100%;background:#08090c;color:#f4f1e9;font-family:system-ui,sans-serif}
    body{min-height:100vh;display:grid;place-items:center;padding:24px}
    main{max-width:620px;border:1px solid rgba(255,255,255,.12);padding:32px;background:#111319}
    span{color:#e7bd4f;font-size:11px;font-weight:800;letter-spacing:.18em}
    h1{font-family:Georgia,serif;font-size:42px;margin:10px 0 14px}
    p{color:#9298a5;line-height:1.65}
  </style>
</head>
<body>
  <main>
    <span>DRAGONSRITUAL NETWORK</span>
    <h1>You are offline.</h1>
    <p>The network could not reach the internet. Previously cached pages may still work. Live Twitch, realtime data, account rewards, and future world services require a connection.</p>
  </main>
</body>
</html>
'@

# ------------------------------------------------------------
# 5) SERVICE WORKER
# Intentionally conservative: cache our own shell, never Twitch/API calls.
# ------------------------------------------------------------
Write-NoBom "public\sw.js" @'
const CACHE_VERSION = "dragonsritual-shell-v0.7";
const SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/dr-192.png",
  "/icons/dr-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept third-party services such as Twitch or Supabase.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/offline.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
'@

# ------------------------------------------------------------
# 6) SHARED DEVICE-CAPABILITY MODULE
# This does NOT award anything by itself.
# It gives future account/reward systems a clean client signal.
# ------------------------------------------------------------
Write-NoBom "src\services\deviceService.ts" @'
export type DeviceClass = "mobile" | "tablet" | "desktop";

export interface DeviceCapabilities {
  deviceClass: DeviceClass;
  touch: boolean;
  standalone: boolean;
  reducedMotion: boolean;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
}

export function getDeviceCapabilities(): DeviceCapabilities {
  const width = window.innerWidth;
  const touch =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  const deviceClass: DeviceClass =
    width <= 700 ? "mobile" :
    width <= 1100 ? "tablet" :
    "desktop";

  return {
    deviceClass,
    touch,
    standalone,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewportWidth: width,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1
  };
}
'@

# ------------------------------------------------------------
# 7) CONTINUITY EVENT CONTRACT
# Future Supabase realtime/account layer can consume these events.
# ------------------------------------------------------------
Write-NoBom "src\services\continuityService.ts" @'
import { getDeviceCapabilities } from "./deviceService";

export interface ContinuityPresence {
  accountId?: string;
  page: string;
  gameId?: string;
  sessionId?: string;
  worldLocationId?: string;
  occurredAt: string;
  device: ReturnType<typeof getDeviceCapabilities>;
}

export function createContinuityPresence(
  context: Omit<ContinuityPresence, "occurredAt" | "device">
): ContinuityPresence {
  return {
    ...context,
    occurredAt: new Date().toISOString(),
    device: getDeviceCapabilities()
  };
}

/*
  v0.7 intentionally does NOT transmit this data.

  Later, authenticated users can opt into continuity so the same account
  can move between desktop, browser, PWA, and official mobile app.

  Examples:
  - resume the same live/game page on a phone
  - follow a realtime market or world event while away from the PC
  - claim mobile-specific rewards after secure server validation
  - hand off a future Realms world location between devices
*/
'@

# ------------------------------------------------------------
# 8) SITE LAYOUT: PWA + MOBILE META
# ------------------------------------------------------------
Write-NoBom "src\layouts\SiteLayout.astro" @'
---
import "../styles/core.css";
import "../styles/gaming.css";

interface Props {
  title?: string;
  description?: string;
}

const {
  title = "DragonsRitual Gaming",
  description = "DragonsRitual gaming broadcasts, schedules, sessions and statistics."
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="generator" content={Astro.generator} />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#08090c" />

    <meta name="application-name" content="DragonsRitual" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="DragonsRitual" />

    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icons/dr-192.png" />
    <link rel="apple-touch-icon" href="/icons/dr-192.png" />
    <link rel="canonical" href={Astro.url} />

    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={Astro.url} />

    <meta name="twitter:card" content="summary_large_image" />

    <title>{title}</title>
  </head>

  <body>
    <slot />

    <script is:inline>
      (() => {
        const isLocal =
          location.hostname === "localhost" ||
          location.hostname === "127.0.0.1";

        if (!isLocal && "serviceWorker" in navigator) {
          window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js").catch((error) => {
              console.warn("DragonsRitual service worker registration failed.", error);
            });
          });
        }
      })();
    </script>
  </body>
</html>
'@

# ------------------------------------------------------------
# 9) MOBILE SAFE-AREA + RESPONSIVE FOUNDATION
# No new visual site sections are added.
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\core.css" @'

/* ---------------------------------------------------------------
   v0.7 MOBILE / INSTALLABLE APP FOUNDATION
---------------------------------------------------------------- */
html {
  min-height: 100%;
  background: var(--bg);
}

body {
  min-height: 100vh;
  min-height: 100dvh;
}

.site-rail {
  padding-left: env(safe-area-inset-left, 0px);
}

.context-header {
  padding-top: env(safe-area-inset-top, 0px);
}

@media (max-width: 700px) {
  body {
    overscroll-behavior-y: none;
  }

  .site-rail {
    height: calc(62px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .app-main {
    padding-bottom: calc(62px + env(safe-area-inset-bottom, 0px));
  }

  .context-header {
    padding-left: max(14px, env(safe-area-inset-left, 0px));
    padding-right: max(14px, env(safe-area-inset-right, 0px));
  }
}

@media (display-mode: standalone) {
  body {
    user-select: none;
  }

  input,
  textarea,
  [contenteditable="true"] {
    user-select: text;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
'@

# ------------------------------------------------------------
# 10) CROSS-DEVICE BACKEND BLUEPRINT
# This migration is NOT applied automatically.
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070002_cross_device_foundation.sql" @'
-- DragonsRitual v0.7
-- Cross-device/account foundation.
-- Apply only after the v0.6 initial schema exists.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_class text not null check (device_class in ('mobile','tablet','desktop')),
  app_surface text not null check (
    app_surface in ('web','pwa','android','ios','desktop')
  ),
  last_page text,
  game_id uuid references public.games(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  world_location_id uuid references public.world_locations(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reward_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  reward_type text not null,
  surface_requirement text check (
    surface_requirement is null or
    surface_requirement in ('web','pwa','android','ios','desktop','mobile-any')
  ),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.reward_definitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  claim_source text not null,
  verification_data jsonb not null default '{}'::jsonb,
  unique(reward_id, user_id)
);

create table if not exists public.live_channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  channel_type text not null check (
    channel_type in ('market','world-event','score','stream','custom')
  ),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.live_channel_events (
  id bigint generated by default as identity primary key,
  channel_id uuid not null references public.live_channels(id) on delete cascade,
  payload jsonb not null,
  occurred_at timestamptz not null default now()
);

create index if not exists device_sessions_user_idx
  on public.device_sessions(user_id);

create index if not exists device_sessions_last_seen_idx
  on public.device_sessions(last_seen_at desc);

create index if not exists reward_claims_user_idx
  on public.reward_claims(user_id);

create index if not exists live_channel_events_channel_idx
  on public.live_channel_events(channel_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.device_sessions enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.reward_claims enable row level security;
alter table public.live_channels enable row level security;
alter table public.live_channel_events enable row level security;

-- Public catalog data only.
create policy "public read active rewards"
on public.reward_definitions
for select to anon, authenticated
using (active = true);

create policy "public read active live channels"
on public.live_channels
for select to anon, authenticated
using (active = true);

create policy "public read live channel events"
on public.live_channel_events
for select to anon, authenticated
using (true);

-- Authenticated users can see only their own profile/device/claims.
create policy "users read own profile"
on public.profiles
for select to authenticated
using (auth.uid() = id);

create policy "users update own profile"
on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users read own device sessions"
on public.device_sessions
for select to authenticated
using (auth.uid() = user_id);

create policy "users insert own device sessions"
on public.device_sessions
for insert to authenticated
with check (auth.uid() = user_id);

create policy "users update own device sessions"
on public.device_sessions
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own reward claims"
on public.reward_claims
for select to authenticated
using (auth.uid() = user_id);

-- Important:
-- No client-side INSERT policy is created for reward_claims.
-- Reward claims should later be issued by trusted server logic,
-- not by a browser saying "I am a phone."
'@

# ------------------------------------------------------------
# 11) ARCHITECTURE NOTES
# ------------------------------------------------------------
Write-NoBom "docs\mobile-architecture.md" @'
# DragonsRitual Mobile Architecture

The mobile experience is not a separate copy of the website.

## Surfaces

One account can eventually move among:

- responsive browser
- installed PWA
- Android app
- iOS app
- desktop app
- browser 3D world
- downloadable 3D game

All surfaces consume shared backend services.

## Immediate v0.7 capability

The Astro site is now PWA-ready:

- web app manifest
- installable icons
- standalone display mode
- safe-area handling for modern phones
- conservative offline shell
- device-capability service
- continuity event contract

No rewards or tracking are active yet.

## Future handoff

A signed-in player can move from desktop to phone without losing context.

Example:

Desktop:
Watching/playing Session 42 at Founders Valley Forge.

Phone:
Opens DragonsRitual and receives a "Continue Session 42" surface.

Later the reverse handoff can return the player to desktop.

## Mobile-only experiences

Good candidates:

- companion inventory
- market/watchlist
- live world-event alerts
- map
- character/status screen
- stream continuation
- voting
- timed community events
- camera/photo upload
- second-screen controls
- verified mobile reward claims

## Reward security

Never award meaningful rewards based only on CSS viewport or user-agent.

Browser signals are trivial to spoof.

For valuable/exclusive rewards:
- user must be authenticated
- server validates eligibility
- official Android/iOS apps can later add stronger app/device attestation
- server writes the reward claim

## Official app path

Phase 1: responsive Astro web app
Phase 2: installable PWA
Phase 3: Capacitor-based Android/iOS app using the same web UI where sensible
Phase 4: platform-specific native features when they actually add value
'@

# ------------------------------------------------------------
# 12) README NOTE
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "README.md" @'

## v0.7 Mobile/PWA foundation

DragonsRitual now includes an installable mobile-web foundation and
cross-device continuity model.

The public visual scope remains Gaming only.

No mobile-exclusive rewards are issued yet. The backend migration
reserves secure structures for profiles, device sessions, live channels,
and server-validated reward claims.
'@

# ------------------------------------------------------------
# 13) VERIFY BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v0.7 MOBILE/PWA FOUNDATION COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Added without adding new public site sections:" -ForegroundColor Cyan
Write-Host "  Installable PWA manifest + icons" -ForegroundColor White
Write-Host "  Mobile safe-area support" -ForegroundColor White
Write-Host "  Conservative offline shell" -ForegroundColor White
Write-Host "  Device capability service" -ForegroundColor White
Write-Host "  Cross-device continuity contract" -ForegroundColor White
Write-Host "  Future secure rewards/live-channel SQL migration" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Supabase migrations were NOT applied automatically." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host "Then inspect http://localhost:4321" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
