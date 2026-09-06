DRAGONSRITUAL — PASS 19: THE WRITER'S OFFICE

OBJECTIVE
Transform the Writer Room from a functional contributor dashboard into a prestigious private writing office while preserving the existing Supabase manuscript/editorial workflow.

FILES CHANGED
- src/pages/writer-room.astro
- src/styles/writer-studio.css

DATABASE CHANGES
None.

WHAT CHANGED
- Personalized masthead: “[FIRST NAME]'S ROOM”
- Stronger DragonsRitual writer identity / private-office framing
- Navigation renamed as physical/creative spaces:
  MY DESK / LIBRARY / EDITOR'S TABLE / PUBLISHED WORK / MY OFFICE
- New Desk introduction and quieter professional writing hierarchy
- More editorial, book-like manuscript typography
- Premium sticky navigation and writing action bar
- Upgraded session/goal/publication status strip
- Career area reframed as a DragonsRitual Writer Record
- Existing banner, portrait, themes, profile, manuscripts, autosave, preview,
  editor submission, published work, milestones, and sign-out logic retained
- Responsive treatment for smaller screens

INSTALL
Merge the src folder into the current dragonsritual.github.io project.
This pass is designed to sit on top of PASS 18B/18C/18E. It does not replace
the contributor agreement page.

TEST
1. Keep `npm run dev` running.
2. Open http://localhost:4321/writer-room/
3. Verify the writer's first name appears in the masthead.
4. Test MY DESK, LIBRARY, EDITOR'S TABLE, PUBLISHED WORK, MY OFFICE.
5. Type into a manuscript and verify autosave/save/preview still behave normally.
6. Open MY OFFICE and verify portrait/header/theme controls still work.

KNOWN LIMITATION
This is the major experience/layout pass, not the next backend/editorial workflow pass.
A future pass can add true editorial messages, publication celebrations, revision
history, notifications, and richer career chronology.
