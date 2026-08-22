# PROJECT TITAN — Weekend Web Test 01

This pass creates `/gaming/project-titan/` as the public Dragon game frame.

## Included now
- PROJECT TITAN game-frame route.
- Shareable `?room=WEEKEND-01` invite room.
- Supabase Realtime Presence roster using the existing PUBLIC Supabase browser client.
- Random local callsign.
- Copy Invite control.
- Responsive player / game / room frame.
- Explicit `/public/titan/index.html` mount point for the actual browser game.
- Gaming hub now links directly to PROJECT TITAN.

## Important
The included `/public/titan/index.html` is deliberately a placeholder. It does NOT pretend to be PROJECT TITAN. The actual browser-capable TITAN files must be supplied from the TITAN project next.

Never expose a Supabase service-role or secret key in browser code. This pass uses the existing publishable-key client only.
