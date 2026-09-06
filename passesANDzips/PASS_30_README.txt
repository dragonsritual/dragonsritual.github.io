DRAGONSRITUAL — PASS 30
DRAGON TV CREATOR ACCESS HARDENING

FIX
The public Dragon TV page remains viewer-first.

The bottom CTA no longer implies that any visitor can enter a production backend.
It now says:
WANT TO BROADCAST?
Dragon TV creator tools are available through approved Creator accounts.
CREATOR ACCESS →

That button goes to /member/, where account access is handled.

SECURE CREATOR TV ROUTE
/creator/tv/ now checks:
- signed-in session
- dr_my_roles()
- dr_my_account_status()
- is_admin()

Allowed:
- admin/director
- creator
- streaming
- radio
- editor
with ACTIVE account status.

Not allowed:
- anonymous visitor
- normal MEMBER-only account
- paused/suspended/removed account

Anonymous visitors are sent to:
/join/?next=/creator/tv/

Member-only users are sent to:
/member/?notice=tv_creator_access

This is a FRONTEND ACCESS GATE backed by the secure DB role RPCs from PASS 25/26.
Actual future streaming keys, billing, payout data and creator analytics must ALSO be protected server/database-side when those systems are built.

NO NEW SQL REQUIRED.
PASS 25/26 role infrastructure is used.

INSTALL
Copy this ZIP over PASS 29/current repo.
npm run dev

TEST
1. Signed out -> click Creator Access -> member/login flow, not studio.
2. MEMBER-only test account -> direct /creator/tv/ -> redirected to member page.
3. Approved CREATOR account -> /creator/tv/ opens.
4. Director account -> /creator/tv/ opens.
