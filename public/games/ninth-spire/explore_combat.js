// combat_resolve.js (window/IIFE version)

(function () {
  'use strict';

  function damage(attackerAtk, defenderDef) {
    const raw = (attackerAtk || 1) - (defenderDef || 0);
    return Math.max(1, raw);
  }

  function resolveSimpleCombat(player, enemy) {
    const playerDmg = damage(player.attack || 1, enemy.defense || 0);
    const enemyDmg  = damage(enemy.attack || 1, player.defense || 0);

    enemy.health  = Math.max(0, (enemy.health  || 1) - playerDmg);
    player.health = Math.max(0, (player.health || 1) - enemyDmg);

    const playerWon = enemy.health <= 0;
    const playerLost = player.health <= 0;

    return {
      playerWon,
      playerLost,
      playerDmg,
      enemyDmg,
      enemy
    };
  }

  window.resolveSimpleCombat = resolveSimpleCombat;
})();
