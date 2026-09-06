# DragonsRitual Arcade Battle — Presentation Pass 05

August 30, 2026

## Focus
- Artifact reward presentation now stages the actual living party as the equipment choice, using each combatant's real idle sprite frames.
- Reward sprites and battlefield sprites use alpha-aware bottom grounding so transparent padding in source PNGs no longer makes grounded units appear to float.
- First mortality pass introduces smaller run vitality, Bloodied/Critical states, persistent wound marks, reduced between-wave recovery after wounds, and slower vitality growth.

## Mortality model (first implementation)
- Ritual-drawn fighter vitality is 78% of the prior RPG-scale base before rarity/affinity adjustments, with a 34 HP floor.
- Crossing 50% life marks a wound and visibly enters BLOODIED state.
- Crossing 25% marks another wound and visibly enters CRITICAL state.
- Wounds persist for the run and reduce between-wave recovery by 6 percentage points each (recovery floors at 4%).
- Between-wave max-life growth is reduced from 2.5% to 1.5%; baseline recovery is reduced from 14% to 10%.
- Existing Defense, Guard, evade, Bloodbond, artifacts, enemy intent, Second Breath and healing systems remain intact, so survival is tactical rather than random instant death.

## Validation
- `node --check` passed for the four modified JavaScript files.
- A full Astro build could not be completed in the packaging environment because dependencies/node_modules were not present; `npm ci` could not complete within the environment timeout. No node_modules are included in this ZIP.

## Modified files
- `public/games/arcade-battle/src/battle.js`
- `public/games/arcade-battle/src/combatant.js`
- `public/games/arcade-battle/src/renderer.js`
- `public/games/arcade-battle/src/data/ritual_draw.js`
- `public/games/arcade-battle/style.css`
