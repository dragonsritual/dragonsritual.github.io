window.GameBattle = {
  fighters: [],
  enemies: [],

  wave: 1,
  round: 1,

  currentFighterIndex: 0,
  waitingForTarget: false,
  planningComplete: false,
  runningTurn: false,

  activeTimelineIndex: -1,
  score: 0,
  chain: 1,
  choosingUpgrade: false,
  runUpgrades: [],
  currentUpgradeChoices: [],
  runPack: null,
  pendingReward: null,
  waitingForRunReveal: false,

  createParty() {
    const seed=(Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0;
    this.runPack=window.GameCards.createRun(window.GameFighterData,seed);
    this.fighters=this.runPack.party.map(data=>{
      const fighter=new window.Combatant(data,"fighter");
      window.GameCards.applyFighterKeywords(fighter);
      window.GameCards.saveDiscovery({cardId:data.cardId,kind:"fighter",name:data.name,rarity:data.rarity,rarityName:data.rarityName,affinity:data.affinityName,archetype:data.archetypeId,keywords:data.keywords.map(k=>k.name)});
      return fighter;
    });
  },

  showRunReveal() {
    const overlay=document.getElementById("runRevealOverlay"),body=document.getElementById("runRevealCards");
    if(!overlay||!body)return Promise.resolve();
    body.innerHTML=this.fighters.map(f=>`<article class="draw-card rarity-${f.rarity}"><div class="draw-rarity">${f.rarityName.toUpperCase()} · ${f.affinityIcon} ${f.affinityName.toUpperCase()}</div><img src="${f.idleFrames[0]}" alt="${f.name}" class="draw-portrait"><h3>${f.name}</h3><div class="draw-class">${(f.archetypeId||"fighter").toUpperCase()}</div><div class="draw-stats">HP ${f.maxHp} · ATK ${f.attack} · DEF ${f.defense} · SPD ${f.speed}</div><div class="draw-keywords">${f.keywords.length?f.keywords.map(k=>`<b>${k.name}</b> — ${k.desc}`).join("<br>"):"No special text. Pure fundamentals."}</div></article>`).join("");
    overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");this.waitingForRunReveal=true;
    return new Promise(resolve=>{const button=document.getElementById("acceptRunButton");const done=()=>{button.removeEventListener("click",done);overlay.classList.add("hidden");overlay.setAttribute("aria-hidden","true");this.waitingForRunReveal=false;resolve()};button.addEventListener("click",done)});
  },

  createEnemies() {
    const bossWave =
      this.wave > 1 &&
      this.wave % 5 === 0;

    const enemyCount = bossWave
      ? 1
      : Math.min(
          1 + Math.floor(this.wave / 2),
          3
        );

    const enemyRoster = bossWave
      ? [window.GameEnemyData[2]]
      : window.GameEnemyData.slice(0, enemyCount);

    this.enemies =
      enemyRoster.map(data => {
          const hpScale =
            1 +
            (this.wave - 1) * 0.16;

          const attackScale =
            1 +
            (this.wave - 1) * 0.1;

          const affixes =
            this.wave >= 3
              ? [null, null, "Frenzied", "Armored", "Vampiric"]
              : [null];

          const affix =
            affixes[
              Math.floor(
                Math.random() * affixes.length
              )
            ];

          const boss =
            bossWave
              ? {
                  hp: 2.15,
                  attack: 1.35,
                  defense: 5,
                  speed: 1.08,
                  name: `WARLORD ${data.name.toUpperCase()}`
                }
              : {
                  hp: 1,
                  attack: 1,
                  defense: 0,
                  speed: 1,
                  name: null
                };

          const affixMods =
            affix === "Frenzied"
              ? { attack: 1.22, speed: 1.18, hp: 0.90 }
              : affix === "Armored"
                ? { attack: 0.95, speed: 0.90, hp: 1.35 }
                : affix === "Vampiric"
                  ? { attack: 1.08, speed: 1.0, hp: 1.08 }
                  : { attack: 1, speed: 1, hp: 1 };

          return new window.Combatant(
            {
              ...data,
              name: boss.name || (
                affix
                  ? `${affix} ${data.name}`
                  : data.name
              ),
              affix: bossWave ? "BOSS" : affix,

              maxHp: Math.floor(
                data.maxHp *
                hpScale *
                affixMods.hp *
                boss.hp
              ),

              attack: Math.floor(
                data.attack *
                attackScale *
                affixMods.attack *
                boss.attack
              ),

              defense:
                data.defense +
                boss.defense,

              speed: Math.max(
                1,
                Math.floor(
                  data.speed *
                  affixMods.speed *
                  boss.speed
                )
              ),

              lifeSteal:
                affix === "Vampiric"
                  ? 0.25
                  : 0
            },
            "enemy"
          );
        });
  },

  delay(milliseconds) {
    return new Promise(resolve => {
      setTimeout(
        resolve,
        milliseconds
      );
    });
  },

  async start() {
    window.GameUI.hideRestart();
    this.score=0;this.chain=1;this.choosingUpgrade=false;this.runUpgrades=[];this.pendingReward=null;
    document.getElementById("upgradeOverlay")?.classList.add("hidden");
    this.createParty();
    await this.showRunReveal();
    this.createEnemies();
    this.beginPlanning();
    window.GameUI.writeLog(`Run ${this.runPack.seed.toString(16).toUpperCase()} begins. Play what the Ritual dealt you.`);
  },

  restart() {
    if(this.runningTurn)return;
    this.wave=1;this.round=1;this.currentFighterIndex=0;this.waitingForTarget=false;this.planningComplete=false;this.runningTurn=false;this.activeTimelineIndex=-1;
    this.score=0;this.chain=1;this.choosingUpgrade=false;this.runUpgrades=[];this.currentUpgradeChoices=[];this.pendingReward=null;
    document.getElementById("upgradeOverlay")?.classList.add("hidden");window.GameUI.hideRestart();window.GameUI.finishActionPhase();this.start();
  },

  getLivingFighters() {
    return this.fighters.filter(
      fighter => !fighter.defeated
    );
  },

  getLivingEnemies() {
    return this.enemies.filter(
      enemy => !enemy.defeated
    );
  },

  findUnit(unitId) {
    return [
      ...this.fighters,
      ...this.enemies
    ].find(unit => unit.id === unitId);
  },

  getCurrentFighter() {
    return (
      this.getLivingFighters()[
        this.currentFighterIndex
      ] || null
    );
  },

  beginPlanning() {
    this.runningTurn = false;
    this.waitingForTarget = false;
    this.planningComplete = false;
    this.currentFighterIndex = 0;
    this.activeTimelineIndex = -1;

    window.GameUI.finishActionPhase();

    for (const fighter of this.fighters) {
      fighter.clearPlan();
    }

    this.generateEnemyIntents();

    window.GameRenderer.renderAll();
    this.updatePlanningMessage();
  },

  generateEnemyIntents() {
    const targets =
      this.getLivingFighters();

    for (
      const enemy of
      this.getLivingEnemies()
    ) {
      enemy.clearIntent();

      const target =
        targets[
          Math.floor(
            Math.random() *
            targets.length
          )
        ];

      const roll = Math.random();

      if (roll < 0.17) {
        enemy.intentAction = "guard";
        enemy.intentTargetId = null;
      } else if (roll < 0.43) {
        enemy.intentAction = "heavy";
        enemy.intentTargetId =
          target?.id || null;
      } else {
        enemy.intentAction = "attack";
        enemy.intentTargetId =
          target?.id || null;
      }
    }
  },

  updatePlanningMessage() {
    const fighter =
      this.getCurrentFighter();

    if (this.planningComplete) {
      window.GameUI.setMessage(
        "Party ready. Press EXECUTE."
      );

      window.GameUI.setPlanningStatus(
        "READY"
      );

      window.GameUI.updateCommandPanel(
        null,
        true,
        false
      );

      window.GameRenderer.renderAll();
      return;
    }

    if (!fighter) return;

    if (this.waitingForTarget) {
      window.GameUI.setMessage(
        `${fighter.name}: choose an enemy target.`
      );

      window.GameUI.setPlanningStatus(
        `${fighter.name.toUpperCase()} TARGET`
      );
    } else {
      window.GameUI.setMessage(
        `${fighter.name}: choose an action.`
      );

      window.GameUI.setPlanningStatus(
        fighter.name.toUpperCase()
      );
    }

    window.GameUI.updateCommandPanel(
      fighter,
      false,
      this.waitingForTarget
    );

    window.GameRenderer.renderAll();
  },

  chooseAction(actionName) {
    if (
      this.runningTurn ||
      this.planningComplete
    ) {
      return;
    }

    const fighter =
      this.getCurrentFighter();

    if (!fighter) return;

    fighter.plannedAction =
      actionName;

    fighter.targetId = null;

    if (
      actionName === "guard" ||
      (actionName === "skill" && fighter.archetypeId === "mage")
    ) {
      this.confirmCurrentFighter();
      return;
    }

    this.waitingForTarget = true;
    this.updatePlanningMessage();
  },

  selectCombatant(unitId) {
    if (
      this.runningTurn ||
      this.planningComplete ||
      !this.waitingForTarget
    ) {
      return;
    }

    const target =
      this.getLivingEnemies().find(
        enemy => enemy.id === unitId
      );

    if (!target) return;

    const fighter =
      this.getCurrentFighter();

    if (!fighter) return;

    fighter.targetId = target.id;

    window.GameUI.writeLog(
      `${fighter.name}: ${this.getActionLabel(
        fighter,
        fighter.plannedAction
      )} → ${target.name}`
    );

    this.confirmCurrentFighter();
  },

  confirmCurrentFighter() {
    const fighter =
      this.getCurrentFighter();

    if (!fighter) return;

    if (
      fighter.plannedAction ===
      "guard"
    ) {
      window.GameUI.writeLog(
        `${fighter.name}: Guard`
      );
    }

    this.waitingForTarget = false;
    this.currentFighterIndex += 1;

    if (
      this.currentFighterIndex >=
      this.getLivingFighters().length
    ) {
      this.planningComplete = true;
    }

    this.updatePlanningMessage();
  },

  getActionLabel(unit, actionName) {
    if (actionName === "skill") {
      return unit.skillName;
    }

    if (actionName === "guard") {
      return "Guard";
    }

    if (actionName === "heavy") {
      return "Heavy Attack";
    }

    if (actionName === "attack") {
      return "Attack";
    }

    return "Waiting";
  },

  getTimelineEntries() {
    const fighters =
      this.getLivingFighters().map(
        fighter => ({
          unit: fighter,
          team: "fighter",
          action:
            fighter.plannedAction ||
            "waiting",
          targetId: fighter.targetId
        })
      );

    const enemies =
      this.getLivingEnemies().map(
        enemy => ({
          unit: enemy,
          team: "enemy",
          action:
            enemy.intentAction ||
            "waiting",
          targetId:
            enemy.intentTargetId
        })
      );

    return [
      ...fighters,
      ...enemies
    ].sort(
      (a, b) =>
        b.unit.speed -
        a.unit.speed
    );
  },

  async executeTurn() {
    if (
      this.runningTurn ||
      !this.planningComplete
    ) {
      return;
    }

    this.runningTurn = true;
    this.activeTimelineIndex = -1;

    window.GameUI.updateCommandPanel(
      null,
      false,
      false
    );

    window.GameUI.setPlanningStatus(
      `ROUND ${this.round}`
    );

    window.GameUI.setMessage(
      "Actions resolving..."
    );

    window.GameRenderer.renderAll();

    await window.GameUI.showActionPhase();

    const queue =
      this.getTimelineEntries();

    for (
      let index = 0;
      index < queue.length;
      index += 1
    ) {
      if (
        this.getLivingFighters().length === 0 ||
        this.getLivingEnemies().length === 0
      ) {
        break;
      }

      const entry = queue[index];

      if (entry.unit.defeated) {
        continue;
      }

      this.activeTimelineIndex = index;

      window.GameRenderer.renderTimeline();
      window.GameRenderer.focusCombatant(
        entry.unit.id
      );

      if (entry.team === "fighter") {
        await this.resolveFighterAction(
          entry
        );
      } else {
        await this.resolveEnemyAction(
          entry
        );
      }

      window.GameRenderer.clearCombatFocus();

      await this.delay(260);
    }

    this.activeTimelineIndex = -1;
    window.GameRenderer.renderTimeline();

    await this.delay(300);

    this.finishTurn();
  },

  getActionDuration(action) {
    if (action === "guard") {
      return 1050;
    }

    if (
      action === "skill" ||
      action === "heavy"
    ) {
      return 1900;
    }

    return 1500;
  },

  async resolveFighterAction(entry) {
    const fighter = entry.unit;
    const action = entry.action;

    const actionLabel =
      this.getActionLabel(
        fighter,
        action
      );

    const duration =
      this.getActionDuration(action);

    window.GameUI.startActionResolution(
      fighter.name,
      actionLabel,
      duration
    );

    if (action === "guard") {
      await this.delay(430);

      fighter.guarding = true;

      window.GameRenderer.playGuard(
        fighter.id
      );

      window.GameUI.writeLog(
        `${fighter.name} guards.`
      );

      await this.delay(
        duration - 430
      );

      return;
    }

    let target =
      this.getLivingEnemies().find(
        enemy =>
          enemy.id === entry.targetId
      );

    if (!target) {
      target =
        this.getLivingEnemies()[0];
    }

    if (!target) return;

    /* Class skills now behave differently instead of sharing
       one generic damage multiplier. */
    if (action === "skill" && fighter.archetypeId === "mage") {
      await this.delay(760);

      window.GameRenderer.playAttack(
        fighter.id
      );

      await this.delay(250);

      const targets = [
        ...this.getLivingEnemies()
      ];

      window.GameUI.markImpact();

      let totalDamage = 0;

      for (const enemy of targets) {
        window.GameEffects.playEffect(
          fighter.effect,
          enemy.id
        );

        const actualDamage =
          enemy.takeDamage(
            Math.floor(
              fighter.attack * 1.05
            )
          );

        totalDamage += actualDamage;
        if (!enemy.defeated) {
          enemy.addStatus({
            id: "burn",
            turns: 3,
            power: Math.max(
              4,
              Math.floor(fighter.attack * 0.20)
            )
          });
        }

        window.GameRenderer.updateHealth(
          enemy.id
        );
        window.GameRenderer.playHit(
          enemy.id
        );
        window.GameEffects.showDamage(
          enemy.id,
          actualDamage
        );
      }

      window.GameRenderer.shakeBattlefield(
        13
      );

      if ((fighter.lifeSteal || 0) > 0) {
        fighter.heal(
          Math.max(
            1,
            Math.floor(totalDamage * fighter.lifeSteal)
          )
        );
      }
      this.score += totalDamage * this.chain;
      this.chain = Math.min(9, this.chain + 1);
      this.updateRunHud();

      window.GameUI.writeLog(
        `${fighter.name} used ${actionLabel} for ${totalDamage} total damage · BURNING.`
      );

      await this.delay(
        Math.max(
          250,
          duration - 1010
        )
      );

      return;
    }

    if (action === "skill" && fighter.archetypeId === "archer") {
      await this.delay(650);

      window.GameRenderer.playAttack(
        fighter.id
      );

      let totalDamage = 0;

      for (let shot = 0; shot < 2; shot += 1) {
        if (target.defeated) break;

        await this.delay(shot === 0 ? 180 : 260);

        window.GameEffects.playEffect(
          fighter.effect,
          target.id
        );

        window.GameUI.markImpact();

        const actualDamage =
          target.takeDamage(
            Math.floor(
              fighter.attack * 0.92
            )
          );

        totalDamage += actualDamage;
        if (!target.defeated) {
          target.addStatus({
            id: "bleed",
            turns: 3,
            power: Math.max(
              3,
              Math.floor(fighter.attack * 0.15)
            )
          });
        }

        window.GameRenderer.updateHealth(
          target.id
        );
        window.GameRenderer.playHit(
          target.id
        );
        window.GameEffects.showDamage(
          target.id,
          actualDamage
        );
      }

      window.GameRenderer.shakeBattlefield(9);

      if ((fighter.lifeSteal || 0) > 0) {
        fighter.heal(
          Math.max(
            1,
            Math.floor(totalDamage * fighter.lifeSteal)
          )
        );
      }
      this.score += totalDamage * this.chain;
      this.chain = Math.min(9, this.chain + 1);
      this.updateRunHud();

      window.GameUI.writeLog(
        `${fighter.name} used ${actionLabel} on ${target.name} for ${totalDamage} · BLEEDING.`
      );

      await this.delay(420);
      return;
    }

    let damage = fighter.attack;

    if (action === "skill") {
      damage = Math.floor(
        fighter.attack * 1.8
      );
    }

    await this.delay(
      action === "skill"
        ? 760
        : 560
    );

    window.GameRenderer.playAttack(
      fighter.id
    );

    await this.delay(250);

    window.GameEffects.playEffect(
      fighter.effect,
      target.id
    );

    window.GameUI.markImpact();

    const isCrit =
      Math.random() <
      (fighter.critChance || 0);

    if (isCrit) {
      damage = Math.floor(
        damage * 1.65
      );
    }

    const actualDamage =
      target.takeDamage(damage);

    if ((fighter.lifeSteal || 0) > 0) {
      fighter.heal(
        Math.max(
          1,
          Math.floor(
            actualDamage *
            fighter.lifeSteal
          )
        )
      );
    }

    this.score +=
      actualDamage *
      this.chain +
      (isCrit ? 25 : 0);

    this.chain =
      Math.min(
        9,
        this.chain + 1
      );

    this.updateRunHud();

    window.GameRenderer.updateHealth(
      target.id
    );

    window.GameRenderer.playHit(
      target.id
    );

    window.GameEffects.showDamage(
      target.id,
      actualDamage
    );

    window.GameRenderer.shakeBattlefield(
      action === "skill" ? 12 : 7
    );

    if (
      action === "skill" &&
      fighter.archetypeId === "knight" &&
      !target.defeated
    ) {
      target.addStatus({
        id: "sunder",
        turns: 3,
        power: 2
      });
      target.defense = Math.max(
        0,
        target.baseDefense - 2
      );
    }

    window.GameUI.writeLog(
      `${fighter.name} used ${actionLabel} on ${target.name} for ${actualDamage}${isCrit ? " — CRITICAL!" : ""}${action === "skill" && fighter.archetypeId === "knight" ? " · ARMOR BROKEN" : ""}.`
    );

    const elapsed =
      action === "skill"
        ? 1010
        : 810;

    await this.delay(
      Math.max(
        250,
        duration - elapsed
      )
    );
  },

  async resolveEnemyAction(entry) {
    const enemy = entry.unit;
    const action = entry.action;

    const actionLabel =
      this.getActionLabel(
        enemy,
        action
      );

    const duration =
      this.getActionDuration(action);

    window.GameUI.startActionResolution(
      enemy.name,
      actionLabel,
      duration
    );

    if (action === "guard") {
      await this.delay(430);

      enemy.guarding = true;

      window.GameRenderer.playGuard(
        enemy.id
      );

      window.GameUI.writeLog(
        `${enemy.name} guards.`
      );

      await this.delay(
        duration - 430
      );

      return;
    }

    let target =
      this.getLivingFighters().find(
        fighter =>
          fighter.id ===
          entry.targetId
      );

    if (!target) {
      target =
        this.getLivingFighters()[0];
    }

    if (!target) return;

    let damage = enemy.attack;

    if (action === "heavy") {
      damage = Math.floor(
        enemy.attack * 1.45
      );
    }

    await this.delay(
      action === "heavy"
        ? 760
        : 560
    );

    window.GameRenderer.playAttack(
      enemy.id
    );

    await this.delay(250);

    window.GameUI.markImpact();

    if (
      Math.random() <
      (target.dodgeChance || 0)
    ) {
      this.chain = 1;
      this.updateRunHud();

      window.GameEffects.showDamage(
        target.id,
        "DODGE"
      );

      window.GameUI.writeLog(
        `${target.name} evaded ${enemy.name}.`
      );

      await this.delay(
        Math.max(
          250,
          duration - 810
        )
      );

      return;
    }

    const actualDamage =
      target.takeDamage(damage);

    if ((enemy.lifeSteal || 0) > 0) {
      enemy.heal(
        Math.max(
          1,
          Math.floor(
            actualDamage *
            enemy.lifeSteal
          )
        )
      );
    }

    this.chain = 1;
    this.updateRunHud();

    window.GameRenderer.updateHealth(
      target.id
    );

    window.GameRenderer.playHit(
      target.id
    );

    window.GameEffects.showDamage(
      target.id,
      actualDamage
    );

    window.GameRenderer.shakeBattlefield(
      action === "heavy" ? 14 : 8
    );

    window.GameUI.writeLog(
      `${enemy.name} used ${actionLabel} on ${target.name} for ${actualDamage}.`
    );

    const elapsed =
      action === "heavy"
        ? 1010
        : 810;

    await this.delay(
      Math.max(
        250,
        duration - elapsed
      )
    );
  },

  resolveEndOfRoundStatuses() {
    const units = [
      ...this.fighters,
      ...this.enemies
    ];

    for (const unit of units) {
      if (unit.defeated) continue;
      const events =
        unit.tickStatuses?.() || [];

      for (const event of events) {
        window.GameRenderer.updateHealth(
          unit.id
        );
        window.GameEffects.showDamage(
          unit.id,
          event.damage
        );
        window.GameUI.writeLog(
          `${unit.name} takes ${event.damage} ${event.id.toUpperCase()} damage.`
        );
      }
    }
  },

  finishTurn() {
    window.GameUI.hideActionResolution();
    window.GameRenderer.clearCombatFocus();
    window.GameRenderer.renderAll();
    this.resolveEndOfRoundStatuses();
    window.GameRenderer.renderAll();

    if (
      this.getLivingEnemies().length === 0
    ) {
      this.finishWave();
      return;
    }

    if (
      this.getLivingFighters().length === 0
    ) {
      this.runningTurn = false;

      window.GameUI.finishActionPhase();

      window.GameUI.setMessage(
        "The party was defeated."
      );

      window.GameUI.setPlanningStatus(
        "DEFEAT"
      );

      window.GameUI.writeLog(
        "The party was defeated."
      );

      document
        .getElementById("upgradeOverlay")
        ?.classList.add("hidden");

      this.choosingUpgrade = false;
      window.GameUI.showRestart();

      return;
    }

    for (const unit of [
      ...this.fighters,
      ...this.enemies
    ]) {
      unit.guarding = false;
    }

    this.round += 1;

    setTimeout(() => {
      this.beginPlanning();
    }, 650);
  },

  updateRunHud() {
    const score =
      document.getElementById(
        "scoreText"
      );

    const chain =
      document.getElementById(
        "chainText"
      );

    if (score) {
      score.textContent =
        Math.floor(
          this.score
        ).toLocaleString();
    }

    if (chain) {
      chain.textContent =
        `x${this.chain}`;
    }
  },

  getNextRunPull() {
    if(!this.runPack)return null;
    const reward=this.runPack.rewards[this.runPack.index++]||null;
    if(reward)window.GameCards.saveDiscovery({cardId:reward.cardId,kind:reward.kind||"boon",name:reward.name,rarity:reward.rarity,slot:reward.slot||null,affinity:reward.affinity||null,desc:reward.desc});
    return reward;
  },

  showUpgradeChoice() {
    this.choosingUpgrade=true;this.pendingReward=this.getNextRunPull();
    const reward=this.pendingReward,overlay=document.getElementById("upgradeOverlay"),choices=document.getElementById("upgradeChoices"),title=document.getElementById("drawTitle");
    if(!reward||!overlay||!choices){this.advanceAfterReward();return}
    title.textContent=reward.kind==="artifact"?"ARTIFACT PULLED":"RITUAL PULLED";
    const rarity=(reward.rarity||"common").toUpperCase();
    if(reward.kind==="artifact"){
      choices.innerHTML=`<article class="draw-card reward-card rarity-${reward.rarity}"><div class="draw-rarity">${rarity} · ${reward.affinity?reward.affinity.toUpperCase()+" · ":""}${reward.slot.toUpperCase()}</div><div class="artifact-glyph">◆</div><h3>${reward.name}</h3><p>${reward.desc}</p><div class="equip-question">WHO CARRIES IT?</div><div class="equip-buttons">${this.fighters.filter(f=>!f.defeated).map(f=>`<button type="button" data-equip-index="${this.fighters.indexOf(f)}">${f.name}</button>`).join("")}</div><button type="button" class="discard-draw" id="discardDraw">LEAVE IT BEHIND</button></article>`;
      choices.querySelectorAll("[data-equip-index]").forEach(btn=>btn.addEventListener("click",()=>this.claimArtifact(Number(btn.dataset.equipIndex))));
      document.getElementById("discardDraw")?.addEventListener("click",()=>this.advanceAfterReward("left behind"));
    }else{
      choices.innerHTML=`<article class="draw-card reward-card rarity-${reward.rarity||"common"}"><div class="draw-rarity">${rarity} · RITUAL EFFECT</div><div class="artifact-glyph">✦</div><h3>${reward.name}</h3><p>${reward.desc}</p><button type="button" class="claim-draw" id="claimDraw">ACCEPT WHAT WAS DRAWN</button></article>`;
      document.getElementById("claimDraw")?.addEventListener("click",()=>this.claimBoon());
    }
    overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");
  },

  claimArtifact(index) {
    if(!this.choosingUpgrade||this.pendingReward?.kind!=="artifact")return;
    const fighter=this.fighters[index];if(!fighter)return;
    const previous=fighter.equipment?.[this.pendingReward.slot];
    window.GameCards.applyArtifact(fighter,this.pendingReward);this.runUpgrades.push(this.pendingReward.cardId);
    window.GameUI.writeLog(`${fighter.name} equips ${this.pendingReward.name}${previous?`, replacing ${previous.name}`:""}.`);
    this.advanceAfterReward();
  },

  claimBoon() {
    if(!this.choosingUpgrade||!this.pendingReward)return;
    this.pendingReward.apply?.(this);this.runUpgrades.push(this.pendingReward.cardId);
    window.GameUI.writeLog(`${this.pendingReward.name} enters the run.`);this.advanceAfterReward();
  },

  chooseUpgrade(index) {
    if(this.pendingReward?.kind==="artifact")this.claimArtifact(Math.max(0,Math.min(this.fighters.length-1,index)));
    else this.claimBoon();
  },

  advanceAfterReward(note="") {
    const reward=this.pendingReward;this.choosingUpgrade=false;this.pendingReward=null;
    const overlay=document.getElementById("upgradeOverlay");overlay?.classList.add("hidden");overlay?.setAttribute("aria-hidden","true");
    this.wave+=1;this.round=1;this.chain=1;this.createEnemies();
    for(const fighter of this.getLivingFighters()){fighter.heal(Math.floor(fighter.maxHp*.12));fighter.guarding=false}
    this.beginPlanning();this.updateRunHud();
    const boss=this.wave>1&&this.wave%5===0;window.GameUI.setMessage(boss?`BOSS WAVE ${this.wave} — WARLORD`:`Wave ${this.wave}.`);
    if(note)window.GameUI.writeLog(`${reward?.name||"The pull"} ${note}. Wave ${this.wave} begins.`);
  },

  finishWave() {
    this.runningTurn=false;window.GameUI.finishActionPhase();this.score+=250*this.wave*this.chain;this.updateRunHud();
    window.GameUI.setMessage(`Wave ${this.wave} cleared. The next card is being revealed.`);window.GameUI.setPlanningStatus("DRAW");
    window.GameUI.writeLog(`Wave ${this.wave} cleared. You do not shop — you reveal.`);
    setTimeout(()=>this.showUpgradeChoice(),650);
  }

};
