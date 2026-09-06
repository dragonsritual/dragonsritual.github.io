DRAGON CONTRIBUTOR AGREEMENT — PASS 18
=========================================

WHAT IT DOES
- Adds a full DragonsRitual Contributor Agreement page.
- Requires authenticated writers to accept Version 1.0 before Writer Room access.
- Stores acceptance on their Supabase creator profile.
- Stores: typed name, agreement version, acceptance timestamp.
- Keeps unpublished/private DragonsRitual material confidential.
- Keeps the contributor's original copyright with the contributor unless another written deal says otherwise.
- Makes publication editorially controlled.
- Clarifies that contributor access alone does not promise payment or create employment.
- Adds SIGN OUT INSTEAD if a person does not wish to accept.

STANDARD INSTALL — EXACTLY LIKE OUR OLD PASSES
-----------------------------------------------

1) PowerShell from your website project root:

Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18\APPLY_CONTRIBUTOR_AGREEMENT_PASS_18.ps1

2) Supabase Dashboard > SQL Editor > New query.

Open:
DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18\supabase\CONTRIBUTOR_AGREEMENT_PASS_18.sql

Copy EVERYTHING inside that SQL file.
Paste into Supabase.
Click RUN QUERY.

Expected:
Success. No rows returned

3) Back in PowerShell:

npm run build
npm run dev

4) Test:

http://localhost:4321/writer-room/

Because your account has not accepted Version 1.0 yet, Writer Room should automatically send you to:

http://localhost:4321/contributor-agreement/

Type your name.
Check both boxes.
Click ACCEPT & ENTER WRITER ROOM.

You should then enter Writer Room normally.

5) Test sign out/sign in once.
After the agreement has been accepted, future logins should go directly into Writer Room without asking again.

IMPORTANT
- Do NOT run old PASS 17 migration files again.
- PASS 18 only needs its own SQL file.
- The agreement is a practical contributor-access agreement, not individualized legal advice.
- For long-term commercial reliance, have a Tennessee attorney review the final language.
