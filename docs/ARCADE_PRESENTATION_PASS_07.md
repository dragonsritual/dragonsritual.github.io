# DragonsRitual Arcade Battle — Presentation Pass 07

## Focus
Dense collectible color language, stable sprite animation scale, artifact reward reliability, and Diablo-style gear comparison readability.

## Changes
- Fixed idle animation size pulsing: sprite silhouette scale is measured once and locked instead of recalculated for every idle frame.
- Increased artifact reward frequency to 76% and prevents two ritual rewards in a row, so artifacts remain a primary collectible event.
- Rebuilt artifact comparison rows around STAT / NOW / AFTER / CHANGE.
- Positive changes are clearly green; losses clearly red; no-change is subdued.
- HP preview now explicitly shows current HP/max and projected HP/max after equip.
- Existing slot/replacement state remains visible.
- Widened and enlarged the artifact reward presentation while keeping three real party sprites side-by-side.
- Added stronger repeated affinity color language to battlefield fighters: affinity strips, ground sigils, readable HP values and compact ATK/DEF/SPD chips.
- Added restrained multicolor accents to command/UI furniture while keeping the dark DragonsRitual shell.
- Native/default white scrollbars remain suppressed/styled; reward comparison surfaces intentionally hide internal bars.

## Design research applied
- Diablo-style equipment readability: a gear choice must communicate the exact before/after consequence to a specific character, not only the item's isolated bonus.
- MTG-style color identity: color is repeated as a mechanical identity language, not merely decorative tinting.
- Collectible-density goal: dark institutional frame + vivid game pieces/effects/icons, so the battlefield feels populated by distinct fantasy identities.

## Validation
- node --check passed for renderer.js
- node --check passed for battle.js
- node --check passed for ritual_draw.js
