DRAGON — THE NINTH SPIRE SITE INTEGRATION PASS 40A

THIS IS A WEBSITE DELTA PASS.
Copy its contents into your current DragonsRitual repo and replace/merge matching paths.

It does NOT overwrite DAILY, TV, Radio, Books, admin, analytics, membership, or Word of the Day.

NEW
- actual Ninth Spire Pass 50 browser files in public/games/ninth-spire/
- /gaming/ninth-spire/ route
- gaming hub updated
- old /gaming/wizard-feeder/ redirects
- website ↔ game postMessage bridge
- local character summary displayed around the embedded game
- fullscreen game control
- responsive browser-first wrapper
- reusable profile character-card component for the next integration pass

TEST
npm run dev
Open:
http://localhost:4321/gaming/
then:
http://localhost:4321/gaming/ninth-spire/

You should see the real game inside DragonsRitual rather than an empty placeholder.

IMPORTANT
This is still LOCAL character persistence. Do not treat localStorage as secure inventory,
leaderboard, trade, prize, or account authority. Supabase integration is the next backend step.
