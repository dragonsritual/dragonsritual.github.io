DRAGONSRITUAL — PASS 23: STREAMLINED MEMBER SYSTEM + MEMBER TRAIL

WHY
The site had multiple hidden login/logout paths and the Base Station was starting to feel like the only account UI.
This pass gives DragonsRitual ONE member identity system.

THREE ACCOUNT EXPERIENCES
1. MEMBER
   - /join/ -> /member/
   - public audience account
   - profile, handle, bio, activity consent
2. CREATOR
   - same member account
   - /member/ shows ENTER CREATOR BASE STATION
   - creator roles still control workstations
3. DIRECTOR / YOU
   - same member account
   - /member/ shows MEMBER CONTROL
   - /admin/members/ shows private per-user cards and trails

GLOBAL PROFILE CONTROL
A Wix-like member/profile control appears in the bottom-right on SiteLayout and PrivateStudioLayout pages.
Signed out: MEMBER SIGN IN
Signed in: name + MEMBER / CREATOR / DIRECTOR
Menu:
- My Member Home
- Creator Base Station (creator only)
- Member Control (director only)
- Sign Out

MEMBER CARD / TRAIL
When the database migration is installed, every signed-up account gets a dr_member_profiles row.
If the member opts in to activity history, DragonsRitual records:
- session start
- page view
- internal button/link click
- page leave + approximate duration

It explicitly DOES NOT record:
- passwords
- form values
- text typed into manuscripts
- private message contents
- off-site browsing destinations

/admin/members/ gives the director:
- member cards
- join date
- member / creator / director classification
- session count
- page-view count
- approximate signed-in time
- click-through chronological trail
- search/filter

The trail is the linear non-map visualization requested:
TIME -> VIEWED PAGE -> CLICKED -> NEXT PAGE -> LEFT PAGE -> etc.

IMPORTANT PRIVACY DESIGN
This is consent-based for the custom activity trail.
New signups see the disclosure.
Existing users can enable/disable the activity trail from /member/.
The director sees private member analytics; other members cannot read each other's trails.

DATABASE SETUP REQUIRED
Run:
supabase/migrations/20260828_dr_member_system.sql
in the Supabase SQL Editor.

The SQL:
- creates dr_member_profiles
- creates dr_member_events
- adds RLS
- auto-creates cards for new Auth accounts
- backfills existing Auth accounts into member profiles
- gives only the member access to their own profile
- gives only director/founder/admin access to all member activity

IMPORTANT
Change the hard-coded owner email in the SQL and frontend later if your director account changes.

FILES
- src/components/MemberDock.astro NEW
- src/components/MemberTracker.astro NEW
- src/styles/member-system.css NEW
- src/pages/member/index.astro NEW
- src/pages/admin/members.astro NEW
- src/pages/join.astro UPDATED
- src/layouts/SiteLayout.astro UPDATED
- src/layouts/PrivateStudioLayout.astro UPDATED
- supabase/migrations/20260828_dr_member_system.sql NEW

TEST ORDER
1. Merge PASS 23.
2. Run the SQL migration in Supabase.
3. npm run dev
4. Open /join/
5. Sign in -> should land at /member/
6. Member dock should show your identity.
7. /member/ should show Creator and Director doors for your owner account.
8. Open /admin/members/ -> existing Auth accounts should have cards.
9. Enable activity trail on your /member/ profile and save.
10. Browse a few pages and click around.
11. Return to /admin/members/, open your card, and verify the timeline.

THIS PASS DOES NOT MAKE THE SITE LIVE.
It only cleans up account/member architecture so live deployment can happen afterward with a clear user model.
