DRAGONSRITUAL ARCADE BATTLE — WEBSITE DEEP RITUAL PASS 03

BASE
- Built directly on WEBSITE PASS 02, where /gaming/arcade-battle/ points to the ORIGINAL itch.io Arcade Battle.
- The separate Guard / Strike / Affinity prototype remains buried at /public/games/ritual-card-prototype/.

THE RUN IS THE BOOSTER
- No pre-run character selection.
- Press Start and the Ritual automatically cracks open a 3-combatant lineup.
- The lineup is revealed, then the original Arcade Battle battlefield begins.
- Duplicate archetypes are allowed.

PLAYABLE PULL POOL
- 54 registered visual archetypes in this pass:
  * 3 original Arcade Battle heroes
  * 3 original Arcade Battle Orc enemy archetypes made pull-capable
  * 48 extracted/licensed character archetypes from the user's Tiny RPG 01, Tiny RPG 02 and Oboro character-animation packs
- Generated sprite strips were sliced into web-friendly individual idle/attack/hurt frames.
- 384 generated sprite image references verified with 0 missing files.

CARD IDENTITY
- Common / Uncommon / Rare / Legendary / Mythic.
- Fire / Water / Forest / Frost / Thunder / Air / Blood / Void.
- Named and title-based pulls.
- Higher rarity can carry more rules text.
- Current rules include Bloodbond, Quickening, Warded, Keen, Ghoststep, Unyielding, Ritualborn, Deathmark, Embertouch, Blood Price, Echo of the Ritual and Second Breath.
- Same-affinity party pulls can create Resonance.

ORIGINAL GAMEPLAY PRESERVED
- The existing battlefield.
- Turn planning.
- Enemy intent.
- Turn-order timeline.
- Animated attacks.
- Knight-style Sunder, Archer-style Bleed, Mage-style Burn behavior.
- Critical hits, dodge, lifesteal, elites, boss waves, score and chain.

ELEMENTS
- Affinity now influences combat through an advantage relationship.
- Strong matchups deal +15%; disadvantaged matchups deal 10% less.
- This is intentionally a first mechanical layer, not just a colored rarity badge.

RUN REWARDS
- The old 3-choice boon shop is removed.
- Every wave reveals ONE generated run card.
- No reroll.
- The pull can be a Ritual effect or Artifact.
- Artifacts have Weapon / Armor / Charm slots.
- You choose who equips the artifact, not which reward was drawn.
- Replacing an occupied slot removes the old item's stat contribution.

ARTIFACT EXAMPLES
Ironfang, Field Plate, Swiftcord, Glass Knife, Emberbrand, Tideglass Pendant,
Thorn Mantle, Stormneedle, Seal of Winter, Windglass, Grave-Key,
Blood Chalice, Oathplate of the Gate, Storm Crown, Void Crown,
Heart of the Ritual.

RUN GROWTH
- Surviving combatants gain a level after each reward/wave transition.
- Small HP/Attack growth keeps pulled characters developing during the run.
- Death still ends the run.

INSPECTION
- Click a friendly combatant when not choosing a target.
- Shows rarity, affinity, level, role, skill, HP/ATK/DEF/SPD/crit/evade,
  rules text, artifact slots and art-source pack.

COLLECTION
- COLLECTION button records discovered fighter/artifact/rite cards locally.
- Tracks repeat sightings, runs, best wave and unique cards encountered.
- Collection is HISTORY/DISCOVERY only.
- It does not let a player inject their best Mythic into a future run.

SCALING
- Identity is compositional: visual archetype × rarity × affinity × generated identity × rules text × equipment.
- This produces a very large card possibility space without manually authoring one million objects.
- More user-owned character/effect packs can be registered into the same system later.

VALIDATION
- All Arcade Battle JavaScript files pass node --check.
- 384 generated sprite references checked: 0 missing.
- Ritual Draw engine smoke-tested in Node.
