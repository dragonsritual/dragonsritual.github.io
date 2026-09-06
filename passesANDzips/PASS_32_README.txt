DRAGONSRITUAL — PASS 32
TURN ON DRAGON TV

CORE CHANGE
/TV/ now behaves like turning on a television, not arriving at a catalog.

AT THE TOP
A real Dragon TV signal/player is already running.
If a published item has video_url:
- the video attempts muted autoplay
- WATCH turns sound on
- PLAY/PAUSE
- SOUND/MUTE
- previous / next
- automatic rotation

If the item has no real video_url yet:
- the same television UI still works as a channel preview using thumbnail/art fallback
- no fake video is invented

THE TUNER
Viewer can switch:
MY MIX
TOP HITS
RECENT
DISCOVER

MY MIX
For signed-in users, following changes what Dragon TV turns on to.

Important behavior:
- FIRST, one recent video from each followed creator gets a chance in rotation
- discovery programming remains mixed in
- later videos from followed creators continue after the first round

This prevents one prolific creator from consuming the entire personalized signal.

If user follows nobody:
MY MIX naturally behaves as a discovery signal.

FOLLOW
Following a creator now immediately rebuilds the top TV rotation.
The hero can say:
FROM A CHANNEL YOU FOLLOW

So FOLLOW is not merely a stored list.
It actively changes what the television shows when that member returns.

CLICKING A VIDEO BELOW
A card in NEW FROM YOUR CHANNELS or YOUR CHANNEL MIX tunes the big player at the top to that video and scrolls back to the signal.

MENTAL MODEL
Dragon TV should feel like:
1. Click TV.
2. TV is already on.
3. See what is happening in Dragon right now.
4. Want more control? Tune Top Hits / Recent / Discover.
5. Follow people you like.
6. The default MY MIX becomes increasingly yours over time.
7. Still encounter new creators.

This is intentionally NOT search-first.

DATA
Uses the PASS 31:
dr_creator_channels
dr_creator_follows
dr_tv_videos

NO NEW SQL REQUIRED for PASS 32.

REAL MEDIA
Actual upload/storage/transcoding is still the next media infrastructure step.
The player will use dr_tv_videos.video_url as soon as real published media exists.

INSTALL
Merge over PASS 31/current repository.
npm run dev
Open /tv/
