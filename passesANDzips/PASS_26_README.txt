DRAGONSRITUAL — PASS 26
PROFESSIONAL MEMBER ADMINISTRATION

WHAT THIS ADDS
/admin/members/ becomes a full Director member-administration desk.

MAIN TABLE
- Search by name, email, handle or role
- Filter by account status
- Filter by member / creator / editor
- Joined date
- Last active field foundation
- Roles
- Badge count
- Account status
- Click any row to open the member drawer

MEMBER DRAWER
1. MEMBERSHIP STATUS
   ACTIVE
   PAUSED
   SUSPENDED
   REMOVE MEMBER

2. ROLE / WORKSTATION ASSIGNMENT
   MEMBER
   CREATOR
   WRITER
   ILLUSTRATOR
   RADIO
   COMICS
   STREAMING
   3D
   EDITOR

3. BADGES
   First Step
   Creator
   Published
   Broadcaster
   Collaborator
   Founding Member
   Featured
   Mentor

4. PAGE ALLOWANCE
   Add explicit route paths such as:
   /special-room/
   /creator/private-project/
   /classes/founding-cohort/

5. DIRECTOR NOTES
   Private notes visible only to admin.

6. ADMIN HISTORY
   Records status, role, badge, permission and note changes.

SECURITY
- All mutation actions go through SECURITY DEFINER RPC functions.
- Every function checks public.is_admin().
- Browser metadata is NOT trusted.
- The role editor CANNOT assign admin/director/founder.
- Suspended/removed accounts automatically lose non-member roles.
- "Remove Member" is a SOFT REMOVAL, not Auth deletion.
- Actual deletion of a Supabase Auth user requires a server-side Admin API/service role and is intentionally NOT exposed to browser JavaScript.

DATABASE
Run:
supabase/migrations/20260828_dr_member_admin.sql

RUN IT AFTER PASS 25 SECURITY SQL.

IMPORTANT
This migration depends on:
- dr_member_profiles
- dr_member_roles
- admin_users
- public.is_admin()

TEST
1. Merge PASS 26.
2. Run 20260828_dr_member_admin.sql in Supabase SQL Editor.
3. npm run dev
4. Sign in as Director.
5. Open:
   http://localhost:4321/admin/members/
6. Pick a test account.
7. Assign WRITER and save.
8. Sign into that test account separately.
9. It should now receive creator/workstation access.
10. Suspend the test account and verify creator access disappears.

PROFESSIONAL NEXT LAYERS
- invitations / onboarding pipeline
- teams and departments
- project assignments
- creator contracts
- moderation notes
- member communications
- billing/subscriptions
- data export / GDPR deletion workflow
- server-side hard-delete account action
- permissions editor tied to actual route guards
