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
  runResonance: null,
  pendingReward: null,
  waitingForRunReveal: false,
  runRecorded: false,

  createParty() {
    this.runPack = window.RitualDraw.createRun();
    this.fighters = this.runPack.party.map(data => {
      const fighter = new window.Combatant(data, "fighter");
      window.RitualDraw.applyRules(fighter);
      window.RitualDraw.save(fighter,{kind:"fighter"});
      return fighter;
    });
    this.runResonance = window.RitualDraw.resonance(this.fighters);
  },

  showRunReveal() {
    const overlay=document.getElementById("runRevealOverlay");
    const body=document.getElementById("runRevealCards");
    const resonance=document.getElementById("resonanceText");
    if(!overlay||!body)return Promise.resolve();

    if(resonance){
      resonance.textContent=this.runResonance
        ? `${this.runResonance.icon} ${this.runResonance.name.toUpperCase()} RESONANCE · ${this.runResonance.desc}`
        : "NO RESONANCE · THREE DIFFERENT AFFINITIES";
    }

    body.innerHTML=this.fighters.map(f=>`
      <article class="ritual-card rarity-${f.rarity}">
        <div class="ritual-card__top">
          <span>${f.rarityName.toUpperCase()}</span>
          <span>${f.affinityIcon} ${f.affinityName.toUpperCase()}</span>
        </div>
        <img src="${f.idleFrames[0]}" alt="${f.name}" class="ritual-card__portrait">
        <h3>${f.name}</h3>
        <small>${(f.combatRole||"fighter").toUpperCase()} · ${f.skillName}</small>
        <div class="ritual-card__stats">HP ${f.maxHp} · ATK ${f.attack} · DEF ${f.defense} · SPD ${f.speed}</div>
        <div class="ritual-card__text">
          ${f.rules?.length?f.rules.map(x=>`<p><b>${x.name}</b> — ${x.desc}</p>`).join(""):"<p>No special text. Pure fundamentals.</p>"}
        </div>
      </article>`).join("");

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");
    this.waitingForRunReveal=true;

    return new Promise(resolve=>{
      const button=document.getElementById("acceptRunButton");
      const done=()=>{
        button?.removeEventListener("click",done);
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden","true");
        this.waitingForRunReveal=false;
        resolve();
      };
      button?.addEventListener("click",done);
    });
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
              affinity: window.RitualDraw.AFFINITIES[Math.floor(Math.random()*window.RitualDraw.AFFINITIES.length)].id,
              affinityName: "",
              affinityIcon: "",

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
    this.score=0;
    this.chain=1;
    this.choosingUpgrade=false;
    this.runUpgrades=[];
    this.pendingReward=null;
    this.runRecorded=false;
    document.getElementById("upgradeOverlay")?.classList.add("hidden");
    this.createParty();
    await this.showRunReveal();
    this.createEnemies();
    this.beginPlanning();
    window.GameUI.writeLog(
      `Run ${this.runPack.seed.toString(16).toUpperCase()} begins. Play what the Ritual dealt you.`
    );
  },

  restart() {
    if (this.runningTurn) return;
    this.wave=1;
    this.round=1;
    this.currentFighterIndex=0;
    this.waitingForTarget=false;
    this.planningComplete=false;
    this.runningTurn=false;
    this.activeTimelineIndex=-1;
    this.score=0;
    this.chain=1;
    this.choosingUpgrade=false;
    this.runUpgrades=[];
    this.currentUpgradeChoices=[];
    this.pendingReward=null;
    document.getElementById("upgradeOverlay")?.classList.add("hidden");
    window.GameUI.hideRestart();
    window.GameUI.finishActionPhase();
    this.start();
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
      (actionName === "skill" && fighter.combatRole === "mage")
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
    if (action === "skill" && fighter.combatRole === "mage") {
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
            window.RitualDraw.outgoing(
              fighter,
              enemy,
              Math.floor(fighter.attack * 1.05)
            )
          );

        totalDamage += actualDamage;
        window.RitualDraw.onHit(fighter,enemy);
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

      window.RitualDraw.onHit(fighter,target);

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

    if (action === "skill" && fighter.combatRole === "archer") {
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
            window.RitualDraw.outgoing(
              fighter,
              target,
              Math.floor(fighter.attack * 0.92)
            )
          );

        totalDamage += actualDamage;
        window.RitualDraw.onHit(fighter,target);
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
      target.takeDamage(
        window.RitualDraw.outgoing(
          fighter,
          target,
          damage
        )
      );

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
      fighter.combatRole === "knight" &&
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
      `${fighter.name} used ${actionLabel} on ${target.name} for ${actualDamage}${isCrit ? " — CRITICAL!" : ""}${action === "skill" && fighter.combatRole === "knight" ? " · ARMOR BROKEN" : ""}.`
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
      target.takeDamage(
        window.RitualDraw.outgoing(
          enemy,
          target,
          damage
        )
      );

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
      if(!this.runRecorded){
        window.RitualDraw.recordRun(this.wave);
        this.runRecorded=true;
      }
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

  showUpgradeChoice() {
    this.choosingUpgrade=true;
    this.pendingReward=window.RitualDraw.drawReward(this.runPack,this.wave);
    const reward=this.pendingReward;
    const overlay=document.getElementById("upgradeOverlay");
    const choices=document.getElementById("upgradeChoices");
    const title=document.getElementById("rewardTitle");
    if(!reward||!overlay||!choices){
      this.advanceAfterReward();
      return;
    }

    window.RitualDraw.save(reward,{kind:reward.kind});
    title.textContent=reward.kind==="artifact"?"ARTIFACT PULLED":"RITUAL PULLED";

    if(reward.kind==="artifact"){
      const previewStats=(fighter)=>{
        const old=fighter.equipment?.[reward.slot]||null;
        const tracked=["maxHp","attack","defense","speed","critChance","dodgeChance","lifeSteal"];
        const values={};
        tracked.forEach(key=>values[key]=Number(fighter[key]||0));
        if(old?.mods){
          Object.entries(old.mods).forEach(([key,val])=>{
            if(!(key in values))return;
            values[key]-=Number(val||0);
          });
        }
        Object.entries(reward.mods||{}).forEach(([key,val])=>{
          if(!(key in values))return;
          values[key]+=Number(val||0);
        });
        values.maxHp=Math.max(1,values.maxHp);
        values.defense=Math.max(0,values.defense);
        const hpDelta=(reward.mods?.maxHp||0)-(old?.mods?.maxHp||0);
        const resultingHp=Math.max(1,Math.min(values.maxHp,fighter.hp+Math.max(0,hpDelta)));
        return{old,values,resultingHp};
      };
      const fmt=(key,val)=>["critChance","dodgeChance","lifeSteal"].includes(key)?`${Math.round(val*100)}%`:Math.round(val);
      const statRow=(fighter,key,label)=>{
        const p=previewStats(fighter),before=Number(fighter[key]||0),after=p.values[key],delta=after-before;
        const cls=delta>0?"gain":delta<0?"loss":"same";
        const sign=delta>0?"+":delta<0?"−":"";
        const deltaText=delta?`${sign}${fmt(key,Math.abs(delta))}`:"NO CHANGE";
        return `<span class="gear-stat ${cls}"><b>${label}</b><i class="stat-now">${fmt(key,before)}</i><strong class="stat-after">${fmt(key,after)}</strong><em class="stat-delta">${deltaText}</em></span>`;
      };
      const living=this.getLivingFighters();
      const fitScore=(fighter)=>{
        const p=previewStats(fighter),v=p.values;
        const rel=(after,before,weight=1)=>weight*((after-before)/Math.max(1,Math.abs(before)));
        return rel(v.maxHp,fighter.maxHp,1.15)+rel(v.defense,fighter.defense,1.05)+rel(v.attack,fighter.attack,.9)+rel(v.speed,fighter.speed,.55)
          +(v.critChance-(fighter.critChance||0))*2.2+(v.dodgeChance-(fighter.dodgeChance||0))*2.0+(v.lifeSteal-(fighter.lifeSteal||0))*1.8;
      };
      const bestFit=living.slice().sort((a,b)=>fitScore(b)-fitScore(a))[0]?.id;
      choices.innerHTML=`
        <article class="artifact-award rarity-${reward.rarity} ${reward.affinity?`affinity-${reward.affinity}`:""}">
          <div class="artifact-award__eyebrow"><span>${reward.rarity.toUpperCase()}</span><span>${reward.slot.toUpperCase()}</span></div>
          <div class="artifact-award__relic">
            <div class="artifact-award__mark">${reward.slot==="weapon"?"⚔":reward.slot==="armor"?"⛨":"✦"}</div>
            <div>
              <small>RELIC DISCOVERED</small>
              <h3>${reward.name}</h3>
              <p>${reward.desc}</p>
            </div>
          </div>
          <div class="artifact-award__rule"><span></span><b>WHO BENEFITS MOST?</b><span></span></div>
          <div class="artifact-compare-legend"><span>STAT</span><span>NOW</span><span>AFTER</span><span>CHANGE</span></div>
          <div class="bearer-lineup">
            ${living.map((f)=>{const p=previewStats(f);return `
              <button type="button" class="bearer-choice rarity-${f.rarity||"common"} affinity-${f.affinity||"none"} ${f.id===bestFit?"recommended-fit":""}" data-fighter-id="${f.id}">
                ${f.id===bestFit?`<span class="fit-badge">HIGHEST RELATIVE GAIN</span>`:""}
                <span class="bearer-choice__identity">
                  <span class="bearer-choice__stage">
                    <span class="bearer-choice__rune">${f.affinityIcon||"◇"}</span>
                    <span class="bearer-choice__shadow"></span>
                    <img src="${f.idleFrames[0]}" data-bearer-sprite="${f.id}" data-frame-index="0" alt="${f.name}">
                  </span>
                  <strong>${f.name}</strong>
                  <small>${f.affinityName||"Unaffined"} · ${f.rarityName||"Common"}</small>
                  <em>${(f.combatRole||"fighter").toUpperCase()}</em>
                </span>
                <span class="bearer-choice__condition"><b>HP ${Math.round(f.hp)} / ${Math.round(f.maxHp)}</b><strong>AFTER ${Math.round(p.resultingHp)} / ${Math.round(p.values.maxHp)}</strong><i>${f.getCondition?.()||"READY"}</i></span>
                <span class="gear-stat-grid">
                  ${statRow(f,"maxHp","MAX HP")}
                  ${statRow(f,"defense","DEF")}
                  ${statRow(f,"attack","ATK")}
                  ${statRow(f,"speed","SPD")}
                </span>
                <span class="bearer-choice__slot ${p.old?"occupied":"empty"}"><b>${reward.slot.toUpperCase()}</b>${p.old?`<span>${p.old.name}</span><em>WILL BE REPLACED</em>`:`<span>EMPTY SLOT</span><em>NO ITEM LOST</em>`}</span>
                <span class="bearer-choice__verdict">${p.old?"COMPARE & EQUIP":"EQUIP RELIC"}</span>
              </button>`}).join("")}
          </div>
          <div class="artifact-award__footer"><span>Click a combatant to bind the relic.</span><button type="button" id="leaveReward" class="reward-leave">LEAVE IT BEHIND</button></div>
        </article>`;
      choices.querySelectorAll("[data-bearer-sprite]").forEach(img=>{
        const fighter=this.fighters.find(f=>f.id===img.dataset.bearerSprite);
        window.GameRenderer?.groundSprite?.(img,fighter,{targetVisible:62});
      });
      choices.querySelectorAll("[data-fighter-id]").forEach(btn=>{
        btn.addEventListener("click",()=>this.equipReward(btn.dataset.fighterId));
      });

      clearInterval(this.rewardIdleTimer);
      this.rewardIdleTimer=setInterval(()=>{
        choices.querySelectorAll("[data-bearer-sprite]").forEach(img=>{
          const fighter=this.fighters.find(f=>f.id===img.dataset.bearerSprite);
          if(!fighter?.idleFrames?.length)return;
          const next=(Number(img.dataset.frameIndex||0)+1)%fighter.idleFrames.length;
          img.dataset.frameIndex=String(next);
          img.src=fighter.idleFrames[next];
        });
      },180);
      document.getElementById("leaveReward")?.addEventListener("click",()=>this.advanceAfterReward(`${reward.name} was left behind.`));
    }else{
      choices.innerHTML=`
        <article class="ritual-card reward-card rarity-${reward.rarity}">
          <div class="ritual-card__top"><span>${reward.rarity.toUpperCase()}</span><span>RITUAL EFFECT</span></div>
          <div class="artifact-mark">✦</div>
          <h3>${reward.name}</h3>
          <p>${reward.desc}</p>
          <button type="button" id="acceptReward" class="reward-accept">ACCEPT THE DRAW</button>
        </article>`;
      document.getElementById("acceptReward")?.addEventListener("click",()=>this.acceptRite());
    }

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");
  },

  equipReward(fighterId) {
    if(!this.choosingUpgrade||this.pendingReward?.kind!=="artifact")return;
    const fighter=this.fighters.find(f=>f.id===fighterId);
    if(!fighter)return;
    const old=fighter.equipment?.[this.pendingReward.slot];
    window.RitualDraw.equip(fighter,this.pendingReward);
    this.runUpgrades.push(this.pendingReward.cardId);
    const text=`${fighter.name} equips ${this.pendingReward.name}${old?`, replacing ${old.name}`:""}.`;
    this.advanceAfterReward(text);
  },

  acceptRite() {
    if(!this.choosingUpgrade||!this.pendingReward)return;
    this.pendingReward.apply?.(this);
    this.runUpgrades.push(this.pendingReward.cardId);
    this.advanceAfterReward(`${this.pendingReward.name} enters the run.`);
  },

  chooseUpgrade(index) {
    if(!this.choosingUpgrade)return;
    if(this.pendingReward?.kind==="artifact"){
      const living=this.getLivingFighters();
      const fighter=living[Math.max(0,Math.min(living.length-1,index))];
      if(fighter)this.equipReward(fighter.id);
    }else{
      this.acceptRite();
    }
  },

  advanceAfterReward(message="") {
    this.choosingUpgrade=false;
    clearInterval(this.rewardIdleTimer);
    this.rewardIdleTimer=null;
    this.pendingReward=null;
    const overlay=document.getElementById("upgradeOverlay");
    overlay?.classList.add("hidden");
    overlay?.setAttribute("aria-hidden","true");

    this.wave+=1;
    this.round=1;
    this.chain=1;

    for(const fighter of this.getLivingFighters()){
      fighter.level=(fighter.level||1)+1;
      const hpGain=Math.max(1,Math.ceil(fighter.maxHp*.015));
      fighter.maxHp+=hpGain;
      const woundPenalty=Math.min(.18,(fighter.wounds||0)*.06);
      const recovery=Math.max(.04,.10-woundPenalty);
      fighter.hp=Math.min(fighter.maxHp,fighter.hp+Math.ceil(fighter.maxHp*recovery));
      fighter.attack+=Math.max(1,Math.ceil(fighter.attack*.018));
      fighter.guarding=false;
    }

    this.createEnemies();
    this.beginPlanning();
    this.updateRunHud();

    const boss=this.wave>1&&this.wave%5===0;
    window.GameUI.setMessage(boss?`BOSS WAVE ${this.wave} — WARLORD`:`Wave ${this.wave}.`);
    if(message)window.GameUI.writeLog(message);
  },

  finishWave() {
    this.runningTurn=false;
    window.GameUI.finishActionPhase();
    this.score+=250*this.wave*this.chain;
    this.updateRunHud();
    window.GameUI.setMessage(`Wave ${this.wave} cleared. The Ritual turns another card.`);
    window.GameUI.setPlanningStatus("DRAW");
    window.GameUI.writeLog(`Wave ${this.wave} cleared. No shop. No reroll. Reveal the next pull.`);
    setTimeout(()=>this.showUpgradeChoice(),650);
  }

};
