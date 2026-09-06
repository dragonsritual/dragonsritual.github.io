DRAGON WRITER / EDITORIAL FIX — PASS 17B
==============================================

PURPOSE
This is a focused correction pass. It does NOT redesign the Writer Room again.

FIXES
1. Editorial Desk "permission denied for table dr_writer_manuscripts".
2. OPENING YOUR DESK / loading text remaining visible after the desk loads.
3. Editorial Desk refreshes the authenticated session before querying.
4. Editorial Desk confirms you are using dragonsritual@proton.me.
5. Editorial queue shows contributor display name instead of raw UUID.
6. Editorial Desk now has a clean SIGN OUT action.

PRECISE INSTALL
---------------

A) Extract DRAGON_WRITER_EDITORIAL_FIX_PASS_17B into:
   C:\DEV\PROJECTS\WEBSITE\DragonsRitual\dragonsritual.github.io

B) From that project root in PowerShell:

   Set-ExecutionPolicy -Scope Process Bypass
   .\DRAGON_WRITER_EDITORIAL_FIX_PASS_17B\APPLY_WRITER_EDITORIAL_FIX_PASS_17B.ps1

C) Supabase:
   Authentication should already be working.
   Go to SQL Editor > New query.

   Open:
   DRAGON_WRITER_EDITORIAL_FIX_PASS_17B\supabase\EDITORIAL_PERMISSIONS_FIX_17B.sql

   Copy ALL contents into Supabase and click RUN QUERY.

   EXPECT:
   Success. No rows returned

D) Back in PowerShell:

   npm run build
   npm run dev

E) TEST IN THIS ORDER:

   1. http://localhost:4321/writer-room/
      - OPENING YOUR DESK should disappear.
      - Writer Room should remain usable.

   2. Create a tiny test manuscript:
      Title: TEST SUBMISSION
      Body: 2-3 sentences, at least 10 words.
      Click SAVE NOW.
      Click SEND TO EDITOR.

   3. Open:
      http://localhost:4321/admin/editorial/

      EXPECT:
      - No red permission error.
      - TEST SUBMISSION appears in INBOX.
      - Your writer display name appears instead of a UUID.

   4. Open TEST SUBMISSION.
      Add editor note: TEST APPROVED
      Choose a placement.
      Click MARK READY.

   5. Click READY tab.
      Confirm TEST SUBMISSION appears there.

   6. Open it and click APPROVE / PUBLISH STATE.
      Click PUBLISHED.
      Confirm it appears.

WHEN THAT WORKS
The private creator -> editor approval loop is working.
Then we can deploy the site and give the writer their /join/ link.

IMPORTANT
Do NOT run the old PASS 17 migration again.
PASS 17A remains your database foundation.
PASS 17B only fixes permissions + UI/session behavior.
