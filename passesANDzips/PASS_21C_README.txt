DRAGONSRITUAL — PASS 21C: DRAGON ARCHIVE DISCOVERY CHAMBER

PURPOSE
Transform the public SEARCH overlay from a normal site utility into the first version of a signature DragonsRitual archive/discovery experience.

THIS PASS INCLUDES PASS 21B
The Astro ClientRouter/stale-overlay search fix is carried forward. You do not need to install 21B separately if installing 21C.

WHAT IS REAL NOW
- Full-screen Discovery Chamber presentation
- Live archive search using the existing siteArchive.js data
- Multi-thread search chips
- ENTER adds a search as a persistent thread
- + THREAD adds a second/third/etc subject
- × removes individual threads
- Multiple threads use AND logic: results must match every active subject
- Category filtering
- ALL / PEOPLE / ART / WRITING / MUSIC-RADIO / VIDEO / GAMES / COMICS / ARCHIVE
- Hover/focus Discovery Window that previews metadata for a result
- Existing result links still navigate to their real destination
- Search remains transition-safe across Astro navigation
- Screen-shift/scrollbar fix from 21B retained
- Responsive mobile layout

ARCHITECTURE ESTABLISHED
Quick Search -> Multi-Thread Search -> Discovery Window -> Explore Results -> future dedicated Discovery Room.

INTENTIONALLY FOUNDATION-ONLY
- The dedicated full results page is not faked yet. EXPLORE RESULTS stores the current search state for the future page and explains that the full Archive index is required.
- Video/audio preview surfaces are prepared visually but do not autoplay fake media.
- Deep filters such as publication, date, world, character, collaboration and archive era need structured archive data first.
- Relationship graphs need Dragon Archive records/IDs first.

WHY
The public side should eventually feel like a museum/library/media archive whose search becomes more powerful as DragonsRitual accumulates creators and history.

FILES
- src/components/ArchiveSearch.astro
- src/styles/launch.css

DATABASE CHANGES
None.

TEST
1. Merge src/ over the current project.
2. Hard refresh once.
3. Open SEARCH.
4. Type "radio" and verify live results.
5. Press ENTER: RADIO should become a removable search thread.
6. Try another thread.
7. Remove a thread with ×.
8. Try category filters.
9. Hover/focus a result and watch the Discovery Window update.
10. Navigate away, then open Search again to verify the 21B router fix remains working.
