DRAGON NETWORK EXPERIENCE — PASS 14

WHAT CHANGED
- Dragon TV is now explicitly a NETWORK, not just a gaming page.
- Adds 3 channel concepts:
  CH 01 DRAGON TV
  CH 02 CREATOR FEED
  CH 03 EVENTS
- Standby screen becomes active network programming space.
- Keeps PS5 Pro -> Twitch live stream.
- Keeps TITAN visible but locked / in development.
- Fixes bad encoding artifacts in event/round/score fields.
- Keeps LIVE / EVENT / PLAYERS / SCHEDULE / SCORES / RESULTS.
- Homepage THE SIGNAL becomes TRANSMISSIONS.
- Homepage feed loses some of the generic card-template feeling.
- Score Wire becomes substantially larger and easier to read.
- Mobile gets its own channel strip and scoreboard sizing.

RUN
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_NETWORK_EXPERIENCE_PASS_14\APPLY_DRAGON_NETWORK_EXPERIENCE_PASS_14.ps1
npm run build
npm run dev

CHECK
http://localhost:4321/
http://localhost:4321/tv/
