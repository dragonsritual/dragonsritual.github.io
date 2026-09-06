# DragonsRitual Arcade Battle — Presentation Pass 06

August 30, 2026

## Source
Built from `DRAGONSRITUAL_ARCADE_PRESENTATION_PASS_05.zip`. The integrated website game at `public/games/arcade-battle/` is the modified runtime.

## Core direction
The pass treats Arcade Battle as a tactical RPG/collectible roguelite rather than a browser form. Reward decisions must be readable before commitment; sprite scale should be determined by visible pixel silhouettes rather than transparent source canvases; affinities and rarity should organize information without overwhelming the battlefield.

## Changes

### 1. Battlefield sprite unification
- Removed the hard-coded 1.08x sprite enlargement from Pass 05.
- Grounding now scans the alpha bounds of each sprite to find the actual visible top, bottom, left and right pixels.
- Visible silhouette height is normalized to a smaller target size, improving cohesion between differently padded source PNGs.
- Normal enemies, fighters, giants, bosses and hovering units receive restrained target-height differences instead of arbitrary raw-image scaling.
- Shadows/sigils/nameplates were tightened to match the smaller combatant presentation.

### 2. Artifact reward becomes an RPG comparison screen
- Reward shell widened to use horizontal laptop/desktop space while remaining height-conscious.
- The actual three party sprites remain the selection controls and idle animate.
- Party reward sprites are slightly smaller and normalized by visible alpha bounds.
- Each bearer shows current HP/max HP and projected HP/max HP after equipping.
- MAX HP, DEF, ATK and SPD display NOW -> AFTER EQUIP -> NET CHANGE.
- Positive changes are visually distinct from losses and unchanged values.
- Existing equipment in the target slot is named and explicitly marked as being replaced.
- Empty slots are clearly identified.
- A `HIGHEST RELATIVE GAIN` cue uses a normalized stat-improvement heuristic to help the player understand which current party member gains the largest relative value. It is advice, not an automatic choice.
- The player still clicks the combatant itself to equip the relic.

### 3. Scrollbar treatment
- Arcade Battle now supplies a game-specific scrollbar treatment globally instead of allowing native white/default browser scrollbars.
- Reward surfaces that should fit in one view are kept overflow-hidden on desktop/laptop.
- Mobile may scroll when physically necessary, but uses the same themed scrollbar language.

### 4. Regression repair
- Fixed a Pass 05 `Second Breath` lethal-save regression in `Combatant.takeDamage()` where an accidental reference to constructor-only `data` could throw when Second Breath triggered.

## Design research translated into this pass
Representative RPG/UI principles reviewed across eras:
- Early Ultima-style equipment interfaces: character + readied equipment + condition need to coexist, so equipment is understood as something happening to a specific person rather than an abstract item list.
- Classic and modern RPG comparison language: show consequences before commitment instead of requiring memorization of current stats.
- Vagante: randomized equipment works because modifiers, replacement risk and run-specific uncertainty create decisions rather than simple upgrades.
- Into the Breach: dangerous tactical play works best when consequential information is exposed before the player commits; this supports Arcade Battle's enemy-intent and reward-comparison philosophy.
- Darkest Dungeon: danger can remain dramatic while critical state information is numerical and explicit.
- Hades: reward presentation can be theatrical without hiding the build information needed to make a choice.
- Magic color philosophy: affinity should create identity, strengths, limitations and recognizable mechanical character rather than merely recoloring UI.
- Pixel presentation: preserve hard pixel edges and normalize visible silhouettes rather than letting transparent padding determine apparent scale.

## Validation
- `node --check` passed for all JavaScript files in `public/games/arcade-battle/src/`.
- A full Astro build could not run because this source ZIP does not include `node_modules`; `npm run build` reports `astro: not found` in the packaging environment.
- `node_modules` is intentionally not added to the packaged website ZIP.

## Primary modified files
- `public/games/arcade-battle/src/battle.js`
- `public/games/arcade-battle/src/renderer.js`
- `public/games/arcade-battle/src/combatant.js`
- `public/games/arcade-battle/style.css`
