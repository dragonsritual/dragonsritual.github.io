DRAGON NAV + SCORES CORRECTION — PASS 12

THIS FIXES THE THINGS THAT WERE MISSING:
- Removes the smaller DRAGON stamp from the homepage.
- Changes the fiction placeholder from DRAGON to FICTION.
- Adds TV to the actual site header: TODAY / TV / RADIO.
- Header live action now points to TV.
- Adds a visible MLB SCORE WIRE to TODAY.
- Score result is hidden by default.
- Adds a visible SPOILERS OFF/ON control beside the score section.
- Preference is remembered locally.
- Individual REVEAL still works.
- Keeps the Dragon TV Scores console mode from PASS 11.

RUN:
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_NAV_SCORES_CORRECTION_PASS_12\APPLY_NAV_SCORES_CORRECTION_PASS_12.ps1
npm run build
npm run dev

CHECK:
http://localhost:4321/
http://localhost:4321/tv/
