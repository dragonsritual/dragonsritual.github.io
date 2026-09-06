// enemydata.js (NON-module version)
// Keep this file loaded BEFORE renderer.js

(function () {
  'use strict';

  const ENEMIES = {
    entry: [
      { id: 'rat', name: 'Tower Rat', level: 1, health: 6, attack: 1, defense: 0 }
    ],
    library: [
      { id: 'skeleton', name: 'Library Skeleton', level: 2, health: 10, attack: 2, defense: 1 }
    ],
    alchemy: [
      { id: 'slime', name: 'Alchemical Slime', level: 2, health: 12, attack: 2, defense: 0 }
    ],
    quarters: [
      { id: 'shade', name: 'Sleepwalker Shade', level: 3, health: 14, attack: 3, defense: 1 }
    ],
    observatory: [
      { id: 'star_wisp', name: 'Star Wisp', level: 4, health: 18, attack: 4, defense: 1 }
    ]
  };

  function pickEnemy(roomId) {
    const list = ENEMIES[roomId] || [];
    if (!list.length) return null;
    return { ...list[Math.floor(Math.random() * list.length)] };
  }

  // Called by renderer.js if present
  window.runExploreEncounter = function (player, roomId) {
    const enemy = pickEnemy(roomId);

    if (!enemy) {
      return { type: "no_combat", text: "The halls were quiet." };
    }

    return {
      type: "combat",
      enemy,
      text: `A hostile presence stirred: ${enemy.name}.`
    };
  };

  // Very small deterministic resolver
  window.resolveSimpleCombat = function (player, enemy) {
    const pAtk = Math.max(1, (player.attack || 1) - (enemy.defense || 0));
    const eAtk = Math.max(1, (enemy.attack || 1) - (player.defense || 0));

    // One exchange (simple)
    const playerDmg = pAtk;
    const enemyDmg  = eAtk;

    enemy.health = Math.max(0, (enemy.health || 1) - playerDmg);
    player.health = Math.max(0, (player.health || 1) - enemyDmg);

    return {
      playerDmg,
      enemyDmg,
      playerWon: enemy.health <= 0 && player.health > 0,
      playerLost: player.health <= 0
    };
  };

  // Optional debug access
  window.WF_ENEMIES = ENEMIES;

})();
