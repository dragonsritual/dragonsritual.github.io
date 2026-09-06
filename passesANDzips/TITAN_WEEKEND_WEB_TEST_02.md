# PROJECT TITAN — WEEKEND WEB TEST 02

## What changed
- Mounted the supplied PROJECT TITAN Three.js/browser game into `public/titan/`.
- Preserved the Dragon Game Frame at `/gaming/project-titan/`.
- Preserved Supabase room Presence/invite foundation.
- Excluded Electron-only shell files, local Oracle Python server, package metadata, and the unused 115 MB Mixamo retarget source asset.
- Included the runtime Quaternius SWAT model/animation files and only the five weapon WAV files referenced by current source.

## Important
This pass makes the actual local TITAN game load inside the website. It does **not** make combat multiplayer yet. Supabase Presence is the room/roster foundation; gameplay synchronization is the next pass after the browser build is verified.

## Test
Run `npm run dev`, then open:
`http://localhost:4321/gaming/project-titan/?room=WEEKEND-01`

Click inside the center game viewport. Verify the game boots, pointer lock/mouse look works, WASD works, shooting works, audio loads, and no missing-file errors appear in DevTools.

The screenshot from WEB TEST 01 showed `CHANNEL_ERROR` for Supabase Presence. That is separate from the game mount and needs to be diagnosed before the public multiplayer test.
