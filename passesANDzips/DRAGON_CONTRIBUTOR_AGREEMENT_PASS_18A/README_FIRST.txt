DRAGON CONTRIBUTOR AGREEMENT - PASS 18A HOTFIX

WHY
The original PASS 18 PowerShell file was saved with characters that Windows PowerShell decoded incorrectly.
That broke the script parser before it could install the pass.

IMPORTANT
Your log shows PASS 18 FAILED AT PARSE TIME.
Do NOT run the broken PASS 18 installer again.
PASS 17B remains intact.

KEEP the existing folder:
DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18

Extract this new folder beside it:
DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18A

RUN FROM PROJECT ROOT:

Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18A\APPLY_CONTRIBUTOR_AGREEMENT_PASS_18A.ps1

THEN SUPABASE:
SQL Editor > New query
Open:
DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18\supabase\CONTRIBUTOR_AGREEMENT_PASS_18.sql
Copy all > paste > Run query

THEN:
npm run build
npm run dev

TEST:
http://localhost:4321/writer-room/

Expected:
You are redirected to /contributor-agreement/ until Version 1.0 is accepted.
