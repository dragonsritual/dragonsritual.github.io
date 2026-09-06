# PROJECT TITAN — WEEKEND WEB TEST 03

Purpose: restore the actual browser runtime after TEST 02 showed missing core files.

## Restored runtime
- public/titan/titan.js
- public/titan/world.js
- public/titan/weapon.js
- public/titan/voidroomTruck.js
- public/titan/style.css

## Browser compatibility
- Added public/titan/worldMedia.js so optional VOIDROOM media cannot block game boot.
- Added the current 2K brick texture used by world.js.
- Added the Lightbody utility truck runtime asset set referenced by voidroomTruck.js.
- Added poster assets referenced by world.js.
- The large optional VOIDROOM video is intentionally not shipped in this weekend web pass; the in-world screen falls back to a no-signal display instead of generating a 404.

## Preserved from TEST 02A
- Larger gameplay frame.
- Supabase room failure degrades to ROOM OFFLINE rather than retry-spamming forever.

## Validation
- Local JavaScript module syntax checked with Node.
- Local relative JS import graph checked: no missing local JS module imports remain.

## Still separate
Supabase DNS/project configuration remains separate from TITAN boot. The current project hostname shown in the browser console must resolve before Presence/multiplayer can work.
