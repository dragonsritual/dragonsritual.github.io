# Dragon Radio — Weekend 01

Fast static launch pass for the existing Astro/GitHub site.

- Mobile-first /radio/ receiver
- Play/pause, previous/next, seek, volume
- Now Playing + queue
- Track manifest at public/radio/library.json
- Audio folder at public/radio/audio/
- Artwork folder at public/radio/artwork/

This pass deliberately does not depend on Supabase because the current Supabase hostname is failing DNS. That means the weekend station is a curated playlist served from the deployed site, not yet a synchronized 24/7 broadcast server.

To update the station, add approved audio files and edit library.json, then commit/push the site. A true phone Radio Desk with remote queue changes is the next backend pass after the public receiver is online.
