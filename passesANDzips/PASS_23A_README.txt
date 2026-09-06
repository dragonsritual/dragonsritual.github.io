DRAGONSRITUAL — PASS 23A: MEMBER DOCK POLISH

PURPOSE
Polish the global account/member control before production launch.

CHANGES
- SIGN IN / JOIN is forcibly hidden when already authenticated
- Signed-in menu no longer exposes the user's email address in the everyday panel
- Member / Creator / Director access label replaces email in the compact menu
- Account panel feels visually attached to the bottom-right profile trigger
- Better spacing and larger touch targets
- Menu closes cleanly when navigating
- Mobile turns the member control into a full-width bottom-sheet style account control
- Safe-area aware bottom spacing on phones

DATABASE CHANGES
None.

INSTALL
Merge src/ over PASS 23/current project.

TEST
1. Signed out: bottom control says MEMBER SIGN IN.
2. Signed in: SIGN IN / JOIN should disappear.
3. Director account should show MY MEMBER HOME, CREATOR BASE STATION, MEMBER CONTROL, SIGN OUT.
4. Normal member should only show MY MEMBER HOME + SIGN OUT.
5. On a narrow/mobile viewport the menu should open as a bottom sheet.
