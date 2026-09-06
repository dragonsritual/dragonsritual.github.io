DRAGONSRITUAL — PASS 31
DRAGON TV FOLLOWING / PERSONAL CHANNEL MIX

WHAT FOLLOW MEANS
Follow is not cosmetic anymore.
A signed-in member can follow an APPROVED Dragon creator channel.

The public TV page gains:
- FOLLOW / FOLLOWING state
- a subtle FOLLOWING counter
- a right-side Following drawer
- newest content from followed channels
- a "For You / Your Channel Mix" reel-style rail
- followed creators are prioritized in the feed, not made exclusive
- discovery content still appears so the feed does not become repetitive

UNFOLLOW UX
The Following drawer is intentionally quiet.
Each followed creator row has a ••• menu.
Open it -> UNFOLLOW.
This avoids a tacky red UNFOLLOW button permanently sitting beside every creator.

NEW VIDEOS
When an approved followed creator publishes a dr_tv_videos row:
- it can appear in NEW FROM YOUR CHANNELS
- it receives priority in YOUR CHANNEL MIX
- it remains available in the creator's channel/archive later

FEED PHILOSOPHY
Do NOT simply turn follow into "only show followed creators."
Current foundation uses roughly:
2 followed items -> 1 discovery item
when both pools are available.
Later ranking can use recency, completion/watch-time, category interest,
manual editorial boosts and diversity limits.

APPROVAL
Only dr_creator_channels with:
is_approved=true
is_active=true
appear publicly or can be followed.

SQL REQUIRED
Run:
supabase/migrations/20260828_dr_tv_following.sql

This depends on PASS 25/26:
- admin_users / is_admin()
- dr_member_roles

NEW TABLES
dr_creator_channels
dr_creator_follows
dr_tv_videos

SECURITY
- users can read only their own follow list
- follows/unfollows use secure RPCs
- RPC refuses unapproved/inactive channels
- public reads only approved channels + published public videos
- admin creator-channel approval uses is_admin()
- no creator is automatically public just because they have a Creator role

IMPORTANT
Actual video upload/transcoding/storage and autoplay playback are NOT faked here.
This pass builds the correct social/discovery/data layer first.
When media pipeline is connected, the feed already has the structure to consume it.

INSTALL
1. Merge PASS 31.
2. Run 20260828_dr_tv_following.sql in Supabase SQL Editor.
3. npm run dev
4. /tv/
