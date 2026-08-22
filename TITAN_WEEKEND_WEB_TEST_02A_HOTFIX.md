# TITAN Weekend Web Test 02A — Runtime + Viewport Hotfix

- Enlarges the game stage substantially for desktop/ultrawide screens.
- Uses a realtime-only Supabase client so an unavailable project does not trigger auth refresh retry storms.
- On CHANNEL_ERROR/TIMED_OUT, the room disconnects cleanly and reports ROOM OFFLINE while local TITAN remains usable.
- Adds a TITAN runtime preflight so missing browser-build files are reported explicitly instead of hanging forever at BOOTING 0%.

## Current blocker found in the supplied `armorySystem.zip`
The source archive itself does not contain these files referenced by its own `index.html` / `game.js`:

- `style.css`
- `world.js`
- `titan.js`
- `weapon.js`
- `voidroomTruck.js`

Those exact current files must be copied from the working PROJECT TITAN folder before the browser build can boot. Do not substitute unrelated older files.

## Supabase
The current `.env.local` points at `gwmdakvwebaaticbobui.supabase.co`, which is returning DNS resolution failures on the test machine. Verify the current Project URL and publishable key in Supabase before multiplayer testing.
