DRAGONSRITUAL — PASS 24: DIRECTOR LAUNCH ANALYTICS

PURPOSE
Give Dragon a serious private analytics room for watching the site launch and grow without a third-party ad tracker.

RESEARCH BASIS
This pass follows the same core measurement ideas used by modern analytics systems:
- page views
- sessions
- referrer/source attribution
- UTM campaign attribution
- landing pages
- top pages
- device/browser classes
- events/clicks
- session duration
- funnels/paths
It is intentionally first-party and cookieless.

PRIVACY / DATA MINIMIZATION
Removed the signup tracking-consent checkbox.
The analytics system does NOT store:
- IP address
- persistent cross-session visitor ID
- cookies
- browser fingerprint
- passwords
- form values
- manuscript/message text
- browsing behavior on other sites

It DOES store anonymous per-tab/session activity inside DragonsRitual:
- session start
- landing page
- referrer domain
- UTM campaign fields
- coarse device/browser/viewport/language
- page views
- internal clicks
- outbound destination DOMAIN only
- approximate page duration

Because session ID lives in sessionStorage, it disappears when that browser session ends. Analytics therefore measures SESSIONS, not a permanent person ID.

DIRECTOR PAGE
/admin/analytics/

DASHBOARD
- Sessions
- Page views
- Average session time
- Bounce rate
- Live sessions (last 5 minutes)
- Campaign sessions
- Traffic channels
- Referring domains
- Landing pages
- Top pages
- Exit pages
- Devices
- Campaign performance
- Recent anonymous session paths
- Click a session to inspect its chronological trail
- Production-only vs include-local-testing toggle
- Today / 7 days / 30 days / all-time filters

CAMPAIGN URL BUILDER
Build UTM-tagged URLs for:
- Instagram
- Facebook
- Pinterest
- Google
- TikTok
- Reddit
- newsletters
- paid ads
- creator campaigns
etc.

Example:
https://dragonsritual.com/?utm_source=instagram&utm_medium=social&utm_campaign=launch_wave_01&utm_content=bio_link

The dashboard will then identify Instagram / launch_wave_01 traffic rather than leaving it buried in Direct/None.

IMPORTANT ABOUT DIRECT / NONE
Some apps and private-message systems do not pass a referrer. Those visits can appear as Direct / None. Using UTM-tagged links reduces that ambiguity.

DATABASE SETUP
Run:
supabase/migrations/20260828_dr_first_party_analytics.sql
in the Supabase SQL Editor.

PASS 23 MEMBER SQL
Keep the member tables from PASS 23. PASS 24 adds separate anonymous analytics tables.

FILES
- src/pages/admin/analytics.astro NEW
- src/styles/director-analytics.css NEW
- src/components/MemberTracker.astro REBUILT
- src/components/MemberDock.astro UPDATED
- src/pages/member/index.astro UPDATED
- src/pages/join.astro UPDATED
- supabase/migrations/20260828_dr_first_party_analytics.sql NEW

TEST
1. Merge pass.
2. Run analytics SQL in Supabase.
3. npm run dev
4. Browse several site pages.
5. Open /admin/analytics/
6. Set filter to INCLUDE LOCAL TESTING.
7. Verify sessions/page views/path data.
8. Try the campaign builder.
9. Open a tagged localhost link manually, e.g.
   http://localhost:4321/?utm_source=instagram&utm_medium=social&utm_campaign=test_launch
10. Navigate around, then refresh analytics. Test campaign should appear.

PRODUCTION
When dragonsritual.com goes live, dashboard defaults to PRODUCTION ONLY, so localhost development traffic will not pollute your launch numbers.

LEGAL NOTE
This design deliberately avoids persistent IDs/cookies and personally identifying analytics. You should still maintain a plain-language Privacy Policy describing first-party site analytics and review requirements for jurisdictions/audiences you target before commercial launch.
