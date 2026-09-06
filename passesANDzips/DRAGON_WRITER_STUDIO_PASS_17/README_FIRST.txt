DRAGON WRITER STUDIO — PASS 17

PURPOSE
Turns the working PASS 16 Writer Room into a professional contributor desk with an editor-controlled publishing gate.

INSTALL
1) Extract DRAGON_WRITER_STUDIO_PASS_17 into the ROOT of dragonsritual.github.io.
2) PowerShell from project root:
   Set-ExecutionPolicy -Scope Process Bypass
   .\DRAGON_WRITER_STUDIO_PASS_17\APPLY_WRITER_STUDIO_PASS_17.ps1
3) Supabase Dashboard > SQL Editor > New query.
   Paste/run: DRAGON_WRITER_STUDIO_PASS_17\supabase\WRITER_STUDIO_MIGRATION.sql
4) npm run build
5) npm run dev

TEST
Writer: http://localhost:4321/writer-room/
Owner editorial desk: http://localhost:4321/admin/editorial/

WORKFLOW
Writer signs in -> creates/organizes manuscript -> uploads optional art -> previews -> SEND TO EDITOR.
Submission remains non-public. Owner opens Editorial Desk -> reviews -> adds editor note -> chooses placement -> RETURN / READY / PUBLISH.
Published status is now an editorial approval state. Connecting that status to automatic front-page article generation is deliberately a later publishing-pipeline pass; PASS 17 does not pretend to publish an Astro static page by itself.

SECURITY
The SQL editor policy recognizes dragonsritual@proton.me as the studio editor account. Change that email in dr_is_editor() if the owner account changes.
