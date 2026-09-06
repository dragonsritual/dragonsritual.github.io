DRAGON WRITER ROOM — PASS 16

This is the first REAL creator-writing foundation, not a fake dashboard.

ADDS
- /join/ account creation + sign in using your existing Supabase browser client
- /writer-room/ private fantasy/editorial desk
- New Manuscript / Manuscripts / With Editor / Published
- Title, hook, genre, long-form writing area
- Word count and read-time estimate
- Save Draft to Supabase
- Preview in DRAGON editorial styling
- Send to Editor workflow
- Row Level Security so each writer can only access their own manuscripts
- Mobile layout

INSTALL
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_WRITER_ROOM_PASS_16\APPLY_WRITER_ROOM_PASS_16.ps1

DATABASE — REQUIRED BEFORE WRITER TEST
Open your Supabase project -> SQL Editor -> New query.
Paste and run:
DRAGON_WRITER_ROOM_PASS_16\supabase\WRITER_ROOM_SCHEMA.sql

THEN
npm run build
npm run dev

TEST
http://localhost:4321/join/
http://localhost:4321/writer-room/

BEFORE YOU SEND THE WRITER THE LINK
1. Create your own test account.
2. If Supabase email confirmation is enabled, confirm the email arrives.
3. Save a manuscript.
4. Refresh and confirm it is still in MANUSCRIPTS.
5. Click SEND TO EDITOR and confirm it appears under WITH EDITOR.
6. Deploy the new site.
7. Then send the writer: https://dragonsritual.com/join/

IMPORTANT
Submitted work does NOT auto-publish. You remain editor/publisher.
This pass uses the existing PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_PUBLISHABLE_KEY setup already used by your project. Never expose a Supabase service-role key in the website.
