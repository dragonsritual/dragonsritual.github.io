// enemygen.js (window/IIFE version)
// Requires enemydata.js to set:
// window.ENEMY_TEMPLATES and window.ENEMY_AFFIXES

(function () {
  'use strict';

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(randFloat(min, max + 1));
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  const RARITIES = [
    { id: "common",   mult: 1.00, chance: 70 },
    { id: "uncommon", mult: 1.15, chance: 20 },
    { id: "rare",     mult: 1.35, chance: 8  },
    { id: "elite",    mult: 1.70, chance: 2  }
  ];

  function rollRarity() {
    const roll = randInt(1, 100);
    let sum = 0;
    for (const r of RARITIES) {
      sum += r.chance;
      if (roll <= sum) return r;
    }
    return RARITIES[0];
  }

  function pickTemplateForLevel(playerLevel, templates) {
    const maxTier = clamp(1 + Math.floor(playerLevel / 3), 1, 3);
    const candidates = templates.filter(t => (t.tier || 1) <= maxTier);
    return candidates.length ? pick(candidates) : pick(templates);
  }

  function roomDifficultyMod(roomId) {
    if (roomId === 'observatory') return 1.15;
    if (roomId === 'alchemy')     return 1.10;
    if (roomId === 'library')     return 1.10;
    return 1.00;
  }

  function generateEnemy(level = 1, roomId = 'entry') {
    const templates = (window.ENEMY_TEMPLATES && window.ENEMY_TEMPLATES.length)
      ? window.ENEMY_TEMPLATES
      : [
          { id: "skeleton", name: "Skeleton", tier: 1, tags: ["undead"], baseHealth: 6, baseAttack: 2, baseDefense: 0 }
        ];

    const affixes = window.ENEMY_AFFIXES || { prefixes: [], suffixes: [] };

    const template = pickTemplateForLevel(level, templates);
    const rarity = rollRarity();

    const levelScalar = 1 + (level - 1) * 0.18;
    const variance = randFloat(0.9, 1.15);
    const roomMult = roomDifficultyMod(roomId);

    const statMult = levelScalar * rarity.mult * variance * roomMult;

    const health  = Math.max(1, Math.round((template.baseHealth  || 5) * statMult));
    const attack  = Math.max(1, Math.round((template.baseAttack  || 1) * statMult * 0.9));
    const defense = Math.max(0, Math.round((template.baseDefense || 0) * statMult * 0.8));

    const prefix = (affixes.prefixes && affixes.prefixes.length && Math.random() < 0.6)
      ? pick(affixes.prefixes) + " "
      : "";

    const suffix = (affixes.suffixes && affixes.suffixes.length && Math.random() < 0.5)
      ? " " + pick(affixes.suffixes)
      : "";

    const name = `${prefix}${template.name || 'Enemy'}${suffix}`;

    return {
      id: template.id || 'enemy',
      name,
      tier: template.tier || 1,
      rarity: rarity.id,
      tags: template.tags || [],
      health,
      maxHealth: health,
      attack,
      defense,
      roomId
    };
  }

  window.generateEnemy = generateEnemy;
})();
