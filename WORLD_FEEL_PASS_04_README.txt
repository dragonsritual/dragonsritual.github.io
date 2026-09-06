DRAGONSRITUAL ARCADE BATTLE — WORLD FEEL PASS 04

Built directly on Deep Ritual Pass 03.

GROUNDING
- Reprocessed the imported pull-character sprite frames to remove excessive transparent source padding.
- Grounded units are bottom-anchored consistently so visible feet meet the contact shadow.
- True flying archetypes keep a small intentional hover.
- Imported units such as Lancer and heavier melee archetypes render larger and more consistently.
- Shadows are tighter, darker and directly beneath the sprite baseline.
- Affinity ground sigils now reinforce contact with the battlefield.

IN-WORLD CHARACTER DOSSIER
- Replaced the large centered generic modal with a compact right-side in-world dossier.
- Native white scrollbar is hidden.
- Six stats are compressed into a single compact strip.
- Equipment is a vertical relic list with fantasy slot iconography.
- Rules text is compact.
- Portrait, affinity sigil, rarity, level, role, known art and elemental lore are presented as one world object.
- Mobile falls back to a bottom-sheet presentation.

FANTASY / COLLECTIBLE PRESENTATION
- Affinity colors now carry through Fire / Water / Forest / Frost / Thunder / Air / Blood / Void.
- Added three live party affinity sigils to the HUD.
- Added ground runes, active-unit glow, rarity-aware labels, ritual corner marks and improved intent badges.
- Reveal cards have stronger fantasy-object framing and less dead space.
- Generated characters receive short elemental lore lines.

LAPTOP FIT
- Added a dedicated laptop-height layout at <=820px high.
- Compresses game header, controls and reveal spacing without shrinking the entire game globally.

VALIDATION
- All Arcade Battle JavaScript passes node --check.
- All imported pull-character sprite references verified present.
