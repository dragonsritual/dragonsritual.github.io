DRAGON WRITER — AGREEMENT READER PASS 18C

OBJECTIVE
Turn contributor onboarding into a professional desktop clickwrap-style agreement workspace while preserving the existing agreement wording and Supabase acceptance flow.

FILES CHANGED
- src/pages/contributor-agreement.astro
- src/styles/writer-studio.css

WHAT CHANGED
- Desktop (981px+): agreement fits below the 74px site header within one viewport.
- Main browser page does not vertically scroll on desktop agreement screen.
- Left rail contains introduction, short version, identity and acceptance controls.
- Right side is a dedicated, larger legal document reader with internal vertical scrolling.
- Legal copy is intentionally limited to ~72ch rather than stretched excessively wide.
- Agreement title/version remains visible in a sticky reader header while scrolling.
- Acceptance button begins disabled and unlocks after the agreement reaches the end.
- Existing two unchecked consent checkboxes remain required.
- Mobile/tablet deliberately retain natural page scrolling; the review gate detects page progress rather than requiring nested scrolling.
- Keyboard focus is visible on the legal reader.

DATABASE CHANGES
None.

HOW TO TEST
1. Merge this ZIP over the project root.
2. npm run dev
3. Open http://localhost:4321/contributor-agreement/
4. Desktop: verify the browser page itself stays still and only the agreement reader scrolls.
5. Verify ACCEPT & ENTER WRITER ROOM is disabled before reaching the bottom of the agreement.
6. Scroll agreement to the bottom; verify the review status changes and button enables.
7. Verify both checkboxes and legal name are still required.
8. Resize below 981px and verify normal page scrolling returns and the acceptance button unlocks after the agreement section has been read to its bottom.

EXPECTED RESULT
A single-screen desktop onboarding experience that feels like a private professional studio agreement, with a clear reading surface and explicit acceptance area.

KNOWN LIMITATION
This pass improves presentation/assent UX; it is not legal advice and does not substitute for attorney review of the agreement language or jurisdiction-specific enforceability.
