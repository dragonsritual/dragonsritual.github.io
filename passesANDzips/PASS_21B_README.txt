DRAGONSRITUAL — PASS 21B: SEARCH OVERLAY ROUTER FIX

BUG
Clicking SEARCH after navigating through the Astro site could shift the page horizontally but show no search panel.

ROOT CAUSE
ArchiveSearch.astro cached references to the original search DOM. Astro ClientRouter page transitions can replace that DOM. The old delegated click handler remained alive and opened the stale/removed element while still adding html.search-open.

FIX
- Search actions query the CURRENT #archive-search every time.
- Event listeners bind only once.
- Search input is delegated, so replacement inputs continue working.
- astro:before-swap clears the page lock.
- astro:page-load resets/reconnects the current overlay safely.
- scrollbar-gutter: stable prevents the page from jumping horizontally when scrolling is locked.
- Overlay gets an explicit viewport-sized top-level stacking layer.

FILES
- src/components/ArchiveSearch.astro
- src/styles/launch.css

DATABASE CHANGES
None.

TEST
1. Merge src/ into the current site.
2. Hard refresh once.
3. On TODAY click SEARCH: panel should appear.
4. Close it.
5. Navigate to Writer Room / Creator Base Station / Radio.
6. Click SEARCH again after each navigation.
7. The page should no longer jump sideways and the panel should appear every time.
8. Test ESC and the backdrop close button.
9. Test typing and archive results.
