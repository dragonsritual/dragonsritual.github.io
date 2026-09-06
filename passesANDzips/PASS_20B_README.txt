DRAGONSRITUAL — PASS 20B: OXBLOOD MATERIAL ROOM

PURPOSE
Turn the user's physical deep-red binder reference into a genuine Writer Room material language rather than a minor accent-color change.

DESIGN DECISION
The room carries the oxblood color. The manuscript remains black/charcoal.
This keeps long-form writing calm and readable while making the surrounding office unmistakably personal.

CHANGES
- Deep oxblood / dried-wine / leather-inspired room palette
- Oxblood masthead, navigation, manuscript controls and studio rail
- Black/charcoal manuscript "paper" with warm ivory type
- Warm parchment/aged-red accents instead of bright/neon red
- Subtle CSS-only grain/material variation (no image dependency)
- Oxblood library/profile/career surfaces
- Calendar, shelf, analytics and draft-safety modules inherit the material theme
- Ember swatch visually becomes the flagship Oxblood option
- Responsive behavior preserved

DATABASE CHANGES
None.

FILES
- src/pages/writer-room.astro
- src/styles/writer-studio.css
- src/pages/contributor-agreement.astro
The page/agreement files are carried forward from PASS 20 unchanged so this ZIP can safely sit directly on top of PASS 19/20.

TEST
1. Merge src/ into the project.
2. Keep npm run dev running.
3. Refresh /writer-room/
4. Compare the oxblood room around the black manuscript.
5. Check MY OFFICE and theme controls.
6. Check mobile/narrow window behavior.
