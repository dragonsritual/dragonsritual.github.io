DRAGONSRITUAL — PASS 25
DRAGON EDITION MASTHEAD + SECURE MEMBER/CREATOR/DIRECTOR ROLES

PUBLIC HOMEPAGE
Adds the beginning of a magazine / comic / museum issue identity directly under DRAGON:
- ISSUE NO. 001 at far left
- live date at far right (updates in browser)
- thin right-to-left DRAGON WIRE centered between them
- two fine gold divider rules
- wire width deliberately stays narrower than the DRAGON title
- hover pauses the wire
- reduced-motion users get a stationary/scrollable treatment
- mobile gets a two-row issue/date + wire treatment

Wire language:
DRAGON RADIO — LIVE SIGNAL
FICTION — NEW WORLDS OPEN
ILLUSTRATION — THE IMAGE TAKES THE PAGE
DRAGON ARCHIVE — FOLLOW THE CONNECTIONS
CREATORS — WORK IN PROGRESS
GAMES · COMICS · MUSIC · WORLDS

This is the first layer of the "fantasy museum / magazine / archive" identity.
It does NOT overwrite launch.css, so earlier search/layout work remains intact.

SECURITY FIX
Public CREATE ACCOUNT no longer writes:
creator_type:'writer'

A new account is MEMBER only.

PASS 25 adds database-backed dr_member_roles:
member
creator
writer
illustrator
radio
comics
streaming
3d
editor

Director/admin is NOT stored in editable user metadata.
It uses the existing secure admin_users table + public.is_admin().

The frontend now asks Supabase:
dr_my_roles()
is_admin()

instead of trusting:
user_metadata.role
user_metadata.creator_type
user_metadata.studio_role
a hard-coded frontend email check

A visitor cannot choose Admin, Director, Creator, Writer or Editor while registering.

DATABASE BOOTSTRAP
The migration automatically:
- gives every existing/new Auth account the role MEMBER
- puts dragonsritual@proton.me into admin_users
- gives that owner account creator + writer + editor roles

RUN THIS SQL AFTER PASS 23/24 SQL:
supabase/migrations/20260828_dr_privilege_hardening.sql

IMPORTANT
If your true owner/login email is NOT dragonsritual@proton.me, STOP and change that email in the SQL before running it.

FILES
src/pages/index.astro
src/styles/dragon-edition-strip.css                         NEW
src/pages/join.astro
src/components/MemberDock.astro
src/pages/member/index.astro
src/pages/creator/index.astro
src/pages/admin/analytics.astro
src/pages/admin/members.astro
src/pages/admin/editorial.astro
supabase/migrations/20260828_dr_privilege_hardening.sql    NEW

TEST
1. Merge the pass.
2. Run the privilege SQL.
3. npm run dev
4. Homepage: verify ISSUE 001 / scrolling wire / current date.
5. Existing owner login: Member menu should show DIRECTOR, Creator Base Station, Analytics, Member Control.
6. Open Creator Base Station: Writer + Editorial should be available to owner.
7. Create a fresh test account with another email:
   - it should become MEMBER only
   - it must NOT show Creator Base Station
   - it must NOT show Analytics / Member Control
   - direct /admin/analytics/ should reject it
   - direct /admin/members/ should reject it
   - direct /creator/ should reject it
8. Do not push live until this fresh-account test passes.

NEXT PASS
Production dragonsritual.com + full mobile launch/readiness.
