DRAGONSRITUAL — PASS 22A
LIVE SITE FOUNDATION / PRIVATE EDITORIAL LOCK

PURPOSE
Prepare the site to be deployed publicly while separating the public institution from the private internal studio.

CRITICAL CHANGE 1 — PUBLIC SITE CAN NOW ACTUALLY GO LIVE
The old SiteLayout contained an emergency launch-lock script that redirected every non-local route except / and /radio/ back to the homepage.
PASS 22A removes that temporary lockdown.

Existing Astro routes can now load on the real deployed domain instead of only localhost.

CRITICAL CHANGE 2 — EDITORIAL IS PRIVATE
/admin/editorial/ is now:
- noindex
- nofollow
- noarchive
- nosnippet
- absent from Archive Search
- absent from public navigation
- rendered without the public LaunchHeader
- rendered without the public Archive Search
- inaccessible to logged-out visitors
- inaccessible to ordinary creator/member accounts

Logged-out direct access redirects silently to /
Authenticated non-editor creator access redirects to /creator/

AUTHORIZED EDITORIAL ACCESS
Currently accepted:
- dragonsritual@proton.me (owner account)
- authenticated accounts carrying one of these role values:
  editor
  editorial
  admin
  director
  founder

The gate tolerates role values in Supabase auth user_metadata or dr_creator_profiles where those fields exist.

IMPORTANT SECURITY NOTE
This is a STATIC Astro / GitHub Pages site. A static host cannot make the URL itself cryptographically nonexistent.
Security therefore comes from:
1. no public links/indexing,
2. client authentication/role gate,
3. Supabase Row Level Security protecting the actual private data.

The editorial HTML shell is not sensitive; manuscript/private database records MUST remain protected by Supabase RLS.
Do not rely on "secret URL" alone.

CREATOR BASE STATION
An Editorial Desk workstation is now shown automatically ONLY for authorized editor/director/founder accounts.
Normal writers/artists do not see that station.

PRIVATE ROUTE SEARCH-ENGINE POLICY
SiteLayout now automatically adds noindex/nofollow/noarchive/nosnippet to:
- /admin/*
- /creator/*
- /writer-room/*
- /contributor-agreement/*
- /join/*
- /reset-password/*

public/robots.txt also asks crawlers not to crawl these routes.

FILES
- src/layouts/SiteLayout.astro
- src/layouts/PrivateStudioLayout.astro       NEW
- src/pages/admin/editorial.astro
- src/pages/creator/index.astro
- public/robots.txt                           NEW

DATABASE CHANGES
None.

INSTALL
Merge these files into your CURRENT project after Pass 21C.

LOCAL TEST
1. npm run dev
2. Public homepage should load.
3. /creator/ should still require an authenticated creator session.
4. Logged out: /admin/editorial/ should immediately return you to /
5. Logged in as ordinary writer: /admin/editorial/ should return to /creator/
6. Logged in as dragonsritual@proton.me: /creator/ should show Editorial Desk.
7. Enter Editorial Desk from Base Station and verify the manuscript queue.

LIVE BUILD CHECK
Before pushing:
npm run build

Then, if the build succeeds:
git add .
git commit -m "Launch public site and lock private editorial studio"
git push origin main

Your existing GitHub Pages workflow should deploy on push to main if it is still present in the repo.

NEXT SECURITY PASS
Before adding additional editors, create an explicit dr_creator_roles/permissions model and verify Supabase RLS policies so editor permission is database-backed rather than primarily metadata-backed.
