class Combatant {
  constructor(data, team) {
    this.id = data.id;
    this.name = data.name;
    this.team = team;

    this.maxHp = data.maxHp;
    this.hp = data.maxHp;

    this.attack = data.attack;
    this.defense = data.defense;
    this.speed = data.speed;

    this.skillName = data.skillName || "Power Attack";

    this.idleFrames = data.idleFrames || [];
    this.attackFrame = data.attackFrame || "";
    this.hitFrame = data.hitFrame || "";
    this.effect = data.effect || null;
    this.critChance = data.critChance || 0.08;
    this.dodgeChance = data.dodgeChance || 0;
    this.lifeSteal = data.lifeSteal || 0;
    this.affix = data.affix || null;
    this.archetypeId = data.archetypeId || data.id;
    this.rarity = data.rarity || "common";
    this.rarityName = data.rarityName || "Common";
    this.affinity = data.affinity || null;
    this.affinityName = data.affinityName || "";
    this.affinityIcon = data.affinityIcon || "";
    this.cardId = data.cardId || null;
    this.cardTitle = data.cardTitle || "";
    this.keywords = data.keywords || [];
    this.keywordApply = data.keywordApply || [];
    this.equipment = data.equipment || {weapon:null,armor:null,charm:null};
    this.statuses = [];
    this.baseDefense = data.defense;

    this.guarding = false;
    this.defeated = false;

    this.plannedAction = null;
    this.targetId = null;

    this.intentAction = null;
    this.intentTargetId = null;
  }

  addStatus(status) {
    const existing = this.statuses.find(s => s.id === status.id);
    if (existing) {
      existing.turns = Math.max(existing.turns, status.turns);
      existing.power = Math.max(existing.power || 0, status.power || 0);
    } else {
      this.statuses.push({ ...status });
    }
  }

  hasStatus(id) {
    return this.statuses.some(status => status.id === id);
  }

  tickStatuses() {
    const events = [];
    for (const status of this.statuses) {
      if (status.id === "burn" || status.id === "bleed") {
        const damage = Math.max(1, status.power || 1);
        this.hp = Math.max(0, this.hp - damage);
        if (this.hp <= 0) this.defeated = true;
        events.push({ id: status.id, damage });
      }
      status.turns -= 1;
    }
    this.statuses = this.statuses.filter(status => status.turns > 0);
    if (!this.hasStatus("sunder")) this.defense = this.baseDefense;
    return events;
  }

  takeDamage(amount) {
    const guardMultiplier =
      this.guarding ? 0.45 : 1;

    const reducedDamage = Math.max(
      1,
      Math.floor(
        (amount - this.defense) *
        guardMultiplier
      )
    );

    this.hp = Math.max(
      0,
      this.hp - reducedDamage
    );

    if (this.hp <= 0) {
      this.defeated = true;
    }

    return reducedDamage;
  }

  heal(amount) {
    this.hp = Math.min(
      this.maxHp,
      this.hp + amount
    );
  }

  clearPlan() {
    this.plannedAction = null;
    this.targetId = null;
    this.guarding = false;
  }

  clearIntent() {
    this.intentAction = null;
    this.intentTargetId = null;
  }
}

window.Combatant = Combatant;
