DRAGON TV SCORE WIRE — PASS 11

ADDS
- SPOILERS OFF/ON control above the Dragon TV console.
- Default is OFF.
- Viewer preference persists in localStorage.
- Individual REVEAL button works even while global spoilers remain OFF.
- SCORES becomes a real interactive Dragon TV console mode.
- Initial Aug 22 MLB final:
  San Francisco 2
  Boston 3
- No MLB/team logos or copied MLB visual presentation.
- Mobile-specific scoreboard layout.

IMPORTANT
The initial score is static editorial data. This pass does NOT pretend to provide a licensed/live MLB data feed.
Later we can connect a legitimate sports-data source and reuse this exact interface.

RUN
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_TV_SCORES_PASS_11\APPLY_DRAGON_TV_SCORES_PASS_11.ps1
npm run build
npm run dev

OPEN
http://localhost:4321/tv/
