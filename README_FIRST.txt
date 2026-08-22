DRAGON PUBLIC COPY CLEANUP — PASS 03
====================================

THIS IS A SMALL CORRECTION PASS ON TOP OF THE SITE YOU ALREADY HAVE.

CHANGES
- TODAY headline: "Dragon Radio is live."
- Public copy is factual: "Independent music, podcasts and interviews."
- Removed Dragon Underground explanations from TODAY.
- Removed "worth discovering" / "worth stopping for" language.
- Removed fake-number / crowd / business-plan statements.
- Removed public archive explanation.
- Removed public TITAN / next-door explanation for now.
- TODAY now contains only actual public-facing Radio content.
- Footer no longer advertises Dragon Underground.
- Dragon Rail swipe/navigation script is DISABLED on / and /radio/.
- Dragon Rail code/file is NOT removed. Hidden/development pages can still use it locally.

INSTALL
Extract this ZIP into the root of dragonsritual.github.io and replace the two matching files.

THEN
npm run build
npm run dev

CHECK
http://localhost:4321/
http://localhost:4321/radio/

IMPORTANT RAIL TEST
On TODAY and RADIO, trackpad/two-finger horizontal movement should no longer activate the old department rail or expose hidden sections.
