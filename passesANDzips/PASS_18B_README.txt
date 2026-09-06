DRAGON WEBSITE — WRITER PERSONAL OFFICE PASS 18B
Date: 2026-08-26

OBJECTIVE
1. Repair the Contributor Agreement presentation so it reads like a professional private-studio onboarding document instead of raw full-width text.
2. Make the Writer Room feel like the writer's own private office.

FILES CHANGED
- src/pages/contributor-agreement.astro
- src/pages/writer-room.astro
- src/styles/writer-studio.css
- supabase/migrations/202608260001_writer_room_personalization.sql

WHAT CHANGED
- Dedicated agreement layout: constrained document width, readable typography, short-version panel, legal-document card, and professional acceptance section.
- Writer masthead now supports a personalized wide header image and profile portrait.
- My Career now includes an office personalization panel.
- Writer can choose a profile image and wide header image.
- Four starter room themes: Ember, Ink, Forest, Wine.
- Theme and images preview immediately.
- Personalization is cached locally so the room still works before the SQL migration is applied.
- Added optional Supabase profile columns so personalization can follow the writer across devices.
- Existing manuscript, autosave, submission, preview, career, agreement gate, and editor workflow code is preserved.
- Cleaned mojibake characters in writer-room.astro.

DATABASE CHANGE
Run the included SQL migration in Supabase to persist avatar_url, header_url, and room_theme across devices.
If you do not run it yet, the Writer Room still previews/saves the office look on that browser/device and falls back gracefully.

HOW TO INSTALL
Copy the folders in this ZIP over the matching folders in the current dragonsritual.github.io project.
Do not replace the whole project with only these files; merge/overwrite these matching files.

HOW TO TEST
1. From the project root run: npm run dev
2. Open http://localhost:4321/contributor-agreement/
3. Verify the agreement is centered, readable, and professionally formatted.
4. Open http://localhost:4321/writer-room/
5. Open MY CAREER.
6. Upload a profile image and wide header image.
7. Try Ember / Ink / Forest / Wine themes.
8. Click SAVE MY OFFICE.
9. Return to WRITE and verify the portrait/header/theme remain on the Writer Room.

VALIDATION
JavaScript syntax for both modified pages passed Node syntax validation.
The sandbox could not run the Astro build because node_modules was correctly omitted from the uploaded source ZIP.
