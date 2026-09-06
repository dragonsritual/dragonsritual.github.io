DRAGON WRITER STUDIO — DATABASE FIX 17A

WHY THIS EXISTS
PASS 17 assumed the PASS 16 database schema had already been run.
Your Supabase project did not have dr_writer_manuscripts yet, so the PASS 17 migration stopped immediately.

THIS FIX
- Creates the missing PASS 16 base tables if needed.
- Adds every PASS 17 field.
- Backfills creator profiles for accounts that already exist.
- Recreates the writer/editor security policies.
- Creates the writer-media storage bucket.
- Is designed to be safe to re-run.

DO THIS
1. Supabase > SQL Editor > New query.
2. Delete the old failed SQL from the editor.
3. Open DRAGON_WRITER_STUDIO_DATABASE_FIX_17A.sql.
4. Copy ALL contents.
5. Paste into Supabase.
6. Click RUN QUERY.
7. Expected result: Success. No rows returned.

DO NOT re-run the old WRITER_STUDIO_MIGRATION.sql after this.
Then return to PowerShell and run:
npm run build
npm run dev
