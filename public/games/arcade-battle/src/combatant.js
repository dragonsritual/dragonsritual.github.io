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
    this.combatRole = data.combatRole || data.id;
    this.rarity = data.rarity || "common";
    this.rarityName = data.rarityName || "Common";
    this.affinity = data.affinity || null;
    this.affinityName = data.affinityName || "";
    this.affinityIcon = data.affinityIcon || "";
    this.cardId = data.cardId || null;
    this.rules = data.rules || [];
    this.equipment = data.equipment || { weapon:null, armor:null, charm:null };
    this.level = data.level || 1;
    this.sourcePack = data.sourcePack || "";

    this.statuses = [];
    this.baseDefense = data.defense;

    this.guarding = false;
    this.defeated = false;
    // Mortality pass: wounds are run-persistent danger markers.
    this.wounds = data.wounds || 0;
    this._woundThresholds = new Set();

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
        this.updateWounds();
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

    this.updateWounds();

    if (this.hp <= 0) {
      this.defeated = true;
      if (window.RitualDraw?.lethalSave?.(this)) {
        this.defeated = false;
        this.hp = 1;
        this.updateWounds();
      }
    }

    return reducedDamage;
  }

  updateWounds() {
    if (this.team !== "fighter" || this.maxHp <= 0 || this.hp <= 0) return;
    const ratio = this.hp / this.maxHp;
    for (const threshold of [0.5, 0.25]) {
      if (ratio <= threshold && !this._woundThresholds.has(threshold)) {
        this._woundThresholds.add(threshold);
        this.wounds += 1;
      }
    }
  }

  getCondition() {
    if (this.defeated || this.hp <= 0) return "FALLEN";
    const ratio = this.hp / this.maxHp;
    if (ratio <= 0.25) return "CRITICAL";
    if (ratio <= 0.5) return "BLOODIED";
    if (this.wounds > 0) return `WOUNDED ×${this.wounds}`;
    return "READY";
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
