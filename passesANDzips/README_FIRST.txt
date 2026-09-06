DRAGON PUBLIC LOCKDOWN — PASS 04

PURPOSE
- Stop waiting and lock the first public release down.
- TODAY and RADIO remain public.
- Old experimental public routes are NOT deleted. They are moved out of src/pages into:
    src/_held_public_routes/
  so Astro will not generate public HTML for them.
- The Dragon Rail stays disabled on TODAY/RADIO.
- Removes public Radio permission/rightsholder/process prose if an earlier pass inserted it.
- 404 returns visitors to TODAY.
- Admin is left intact with its existing auth/noindex behavior.

INSTALL
1. Put this folder in the root of dragonsritual.github.io.
2. Run:
   .\DRAGON_PUBLIC_LOCKDOWN_PASS_04\APPLY_PUBLIC_LOCKDOWN_PASS_04.ps1
3. Run:
   npm run build

IMPORTANT CHECK
The build should still show /index.html and /radio/index.html.
The old routes /archive, /community, /creators, /gaming, /journal, /live,
 /media, /projects and /tools should no longer appear in the generated route list.

PUBLISH
git add -A
git commit -m "Lock public launch to Today and Radio"
git push origin main
