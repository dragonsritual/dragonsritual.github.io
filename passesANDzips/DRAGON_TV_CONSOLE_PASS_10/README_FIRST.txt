DRAGON TV INTERACTIVE CONSOLE — PASS 10

CURRENT SETUP
- PS5 Pro -> Twitch
- Twitch channel: dragonsritual
- Project TITAN: visible as IN DEVELOPMENT, not public
- No fake viewers, scores, players, results, or event data
- Discord: built in, disabled until you paste a real invite

DISCORD
Create a dedicated text channel such as #dragon-tv-live in whichever server you choose.
Generate an invite FROM that channel.
Then edit src/data/dragonTV.js:
discordInvite: "YOUR INVITE URL"

RUN
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_TV_CONSOLE_PASS_10\APPLY_DRAGON_TV_CONSOLE_PASS_10.ps1
npm run build
npm run dev

OPEN
http://localhost:4321/tv/
