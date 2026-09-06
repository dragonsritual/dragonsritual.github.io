DRAGONSRITUAL — PASS 20: WRITER STUDIO / DEEP WORK DESK

OBJECTIVE
Make the Writer Room substantially more legible, useful, inspiring and studio-like while preserving the current manuscript/editorial workflow.

SCREENSHOT FIXES
- Removes the giant empty loading region by collapsing the loader to a compact status strip.
- Stops using the account/display name as the giant room title (the screenshot showed “DRAGONSRITUAL'S ROOM”).
- Significantly increases functional font sizes and writing-area legibility.
- Gives the writing surface a readable ~76-character measure.

NEW WRITER EXPERIENCE
- Right studio rail with “From Your Shelf” cover/title feed.
- Built-in current-month calendar UI.
- Reader Signal/analytics area that intentionally shows no fake data until analytics are connected.
- Prominent Draft Safety panel and one-click Save Draft.
- Existing Draft/Library workflow retained.
- Old published/draft manuscripts are pulled into the inspiration rail from dr_writer_manuscripts.
- Strong keyboard focus treatment and larger controls.

AGREEMENT
Adds explicit draft-storage language: Writer Room saving is a convenience, not the writer's sole backup; contributor should keep independent copies of important work.

NOT YET WIRED
- Site-wide events backend: calendar UI is ready, but the current project did not expose a canonical site-events data source to connect safely.
- Reader analytics: UI is ready, but no verified per-author analytics table/source exists in the current project, so the pass does not invent numbers.
- True live “who is viewing me now” can later use Supabase Realtime Presence once public reader identity/privacy rules are decided.

DATABASE CHANGES
None.

INSTALL
Merge src/ over the current project.

TEST
- /writer-room/
- /contributor-agreement/?preview=1
- Save a draft, reopen Library, send a test manuscript to Editor's Table.
- Verify the right rail collapses below the editor on narrower windows.
