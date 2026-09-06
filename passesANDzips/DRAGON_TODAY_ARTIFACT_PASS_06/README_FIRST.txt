DRAGON TODAY ARTIFACT — PASS 06

WHAT CHANGED
- Removes "Dragon Radio is live."
- Removes "On Dragon."
- DRAGON becomes a graphic stamp/mark.
- Radio occupies the left side of TODAY.
- Fiction feature occupies the old LIVE SIGNAL/right-side prime position.
- Fiction presentation is work-first: story image/art can dominate; writer photo is optional.
- Small CURRENT section sits below instead of a big empty content grid.
- Mobile stacks Radio -> Fiction -> Current cleanly.
- Existing writer/read backend remains.
- Old locked routes remain locked.

RUN FROM PROJECT ROOT:
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_TODAY_ARTIFACT_PASS_06\APPLY_TODAY_ARTIFACT_PASS_06.ps1
npm run build
npm run dev

WRITER DATA:
src/data/featuredWriting.js

When he sends material, update:
title
author
excerpt
image (story/fantasy photograph, optional)
photo (writer profile photo, optional)
bio

Do not publish until you like localhost.
