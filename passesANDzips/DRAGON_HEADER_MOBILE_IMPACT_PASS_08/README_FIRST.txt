DRAGON HEADER + MOBILE IMPACT — PASS 08

FIXES
- LISTEN LIVE no longer crams under TODAY.
- SEARCH is more visible on desktop.
- SEARCH is explicitly visible on mobile.
- Header is redesigned as a true two-row mobile header.
- TODAY / RADIO remain large touch targets on mobile.
- Search and Live each get dedicated compact mobile controls.
- DRAGON gets a large centered impact band above the homepage content.

RUN
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_HEADER_MOBILE_IMPACT_PASS_08\APPLY_HEADER_MOBILE_IMPACT_PASS_08.ps1
npm run build
npm run dev

TEST BOTH:
Desktop: http://localhost:4321/
Mobile emulator: same URL, narrow viewport
Search: click icon or press /
