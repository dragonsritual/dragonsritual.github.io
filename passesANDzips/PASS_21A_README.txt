DRAGONSRITUAL — PASS 21A: CREATOR BASE STATION / ROLE ROUTING

OBJECTIVE
Give every signed-in creator a permanent internal-studio home that knows what kind of creator they are and directs them to the correct workstation. Creators should never need to remember hidden site URLs.

NEW ROUTE
/creator/

LOGIN FLOW
Before:
  /join/ -> /writer-room/

After:
  /join/ -> /creator/ -> assigned workstation

CURRENT ROLE SUPPORT
- writer / author / writing -> Writer's Room
- illustrator / artist / art / illustration -> Illustrator Studio foundation
- radio / music / dj / broadcaster -> Radio Station
- comics / comic -> Comics Workshop foundation
- streaming -> Broadcast Station foundation
- 3d -> 3D Workshop foundation

The page reads dr_creator_profiles.creator_type / creator_types when available and falls back to Supabase auth user_metadata. Comma-separated and array-style multi-role data are tolerated so multi-role creators can be supported later without changing the base routing model.

IMPORTANT
Existing creator signup behavior still creates a writer metadata role because the current join flow was originally built for the first writer. This preserves the current working invitation path. A later creator-onboarding pass should move role assignment to invitation/admin controls rather than public self-selection.

DRAGON NETWORK FOUNDATION
Adds a shared Dragon Network bar to:
- Creator Base Station
- Writer Room

It currently provides:
- Base Station navigation
- Dragon Radio navigation
- rotating studio-wire foundation messages

It intentionally does NOT pretend that a live notification/event backend exists yet.

SHARED STUDIO SYSTEMS SHOWN ON BASE STATION
- Assignments
- Messages
- Files
- Calendar
- Dragon Points
- Creator Record

These are architectural doors/status areas, not fake completed systems.

FILES CHANGED / ADDED
- src/pages/creator/index.astro       NEW
- src/components/DragonNetworkBar.astro NEW
- src/styles/creator-base.css         NEW
- src/pages/join.astro                UPDATED
- src/pages/writer-room.astro         UPDATED

DATABASE CHANGES
None.

HOW TO TEST
1. Merge src/ into the current project.
2. Keep npm run dev running.
3. Sign out, then open /join/.
4. Sign in with the existing writer account.
5. Confirm login lands on /creator/ instead of directly in /writer-room/.
6. Confirm Writer's Room appears as ASSIGNED and ENTER STATION opens /writer-room/.
7. Confirm the Dragon Network bar appears on Base Station and Writer Room.
8. Confirm BASE STATION from Writer Room returns to /creator/.
9. Confirm RADIO opens /radio/.
10. Sign out from the Base Station and confirm the session closes.

EXPECTED RESULT
A creator now understands where they are, what their role is, and where to work without memorizing URLs. The Base Station becomes the internal-studio front door for future Writer, Illustrator, Radio, Comics, Streaming, 3D and multi-role creators.

KNOWN LIMITATIONS / NEXT PASS
- Assignments/messages/files/points are not yet backed by their own tables.
- Network wire uses safe foundation messages rather than fabricated activity.
- Radio control is navigation-only; persistent live playback/unmute state comes later.
- Role assignment itself should eventually be controlled by invitation/admin workflows.
- Normal viewer/member dashboard architecture is still separate and can be built without exposing creator stations.
