DRAGON TV FOUNDATION — PASS 09

WHAT THIS DOES
- Changes the giant DRAGON masthead to Cinzel: fantasy/editorial, but still broad enough for music, games, art, sci-fi and culture.
- Adds /tv/ with:
  left tall channel panel
  large bordered 16:9 stream stage
  internal program header
  thick information footer
  recent/community reserved areas
- Uses Twitch as the first playback provider through the official embed.
- Provider/channel are centralized in src/data/dragonTV.js.
- Mobile is first-class: the side rail collapses above the stream and the player remains 16:9.
- Adds Dragon TV to the global searchable archive when PASS 07 exists.

RUN
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_TV_FOUNDATION_PASS_09\APPLY_DRAGON_TV_FOUNDATION_PASS_09.ps1
npm run build
npm run dev

TEST
http://localhost:4321/
http://localhost:4321/tv/

IMPORTANT
Twitch requires the correct parent domain for embeds. This pass derives it from the current hostname, so localhost and dragonsritual.com work without separate hard-coded versions.

NEXT STREAMING DECISION
Do not build our own video transport blindly.
We should choose deliberately between:
1. Twitch embed now (fastest)
2. YouTube Live embed
3. Cloudflare Stream/WebRTC-WHIP for a future native Dragon TV stream with much lower latency and more control.
