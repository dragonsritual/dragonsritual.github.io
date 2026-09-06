window.GameRenderer = {
  idleFrameIndex: 0,
  idleTimer: null,

  fighterPositions: [
    { left: 22, top: 66 },
    { left: 32, top: 79 },
    { left: 42, top: 64 }
  ],

  enemyPositions: [
    { left: 72, top: 35 },
    { left: 82, top: 49 },
    { left: 66, top: 24 }
  ],

  initialize() {
    this.startIdleAnimation();
  },

  startIdleAnimation() {
    if (this.idleTimer) {
      clearInterval(
        this.idleTimer
      );
    }

    this.idleTimer =
      setInterval(() => {
        this.idleFrameIndex =
          (this.idleFrameIndex + 1) %
          6;

        document
          .querySelectorAll(
            ".combatant-sprite-image"
          )
          .forEach(image => {
            const unit =
              this.findCombatant(
                image.dataset
                  .combatantId
              );

            if (
              !unit ||
              unit.defeated ||
              image.dataset.locked ===
                "true" ||
              !unit.idleFrames.length
            ) {
              return;
            }

            image.src =
              unit.idleFrames[
                this.idleFrameIndex %
                  unit.idleFrames
                    .length
              ];
          });
      }, 150);
  },

  findCombatant(combatantId) {
    return window.GameBattle.findUnit(
      combatantId
    );
  },

  renderAll() {
    this.renderFormation(
      document.getElementById(
        "fighterFormation"
      ),
      window.GameBattle.fighters,
      this.fighterPositions
    );

    this.renderFormation(
      document.getElementById(
        "enemyFormation"
      ),
      window.GameBattle.enemies,
      this.enemyPositions
    );

    this.renderTimeline();

    document.getElementById(
      "waveText"
    ).textContent =
      window.GameBattle.wave;
    window.GameBattle.updateRunHud?.();
  },

  renderFormation(
    container,
    units,
    positions
  ) {
    container.innerHTML = "";

    const currentFighter =
      window.GameBattle
        .getCurrentFighter();

    units.forEach((unit, index) => {
      const position =
        positions[index] ||
        positions[0];

      const unitElement =
        document.createElement(
          "div"
        );

      unitElement.className =
        `combatant ${unit.team}${unit.team==="fighter"&&unit.rarity?` rarity-${unit.rarity} affinity-${unit.affinity}`:""}`;

      unitElement.dataset.combatantId =
        unit.id;

      unitElement.style.left =
        `${position.left}%`;

      unitElement.style.top =
        `${position.top}%`;

      if (unit.defeated) {
        unitElement.classList.add(
          "defeated"
        );
      }

      if (unit.guarding) {
        unitElement.classList.add(
          "guarding"
        );
      }

      if (
        currentFighter &&
        currentFighter.id === unit.id &&
        !window.GameBattle
          .planningComplete &&
        !window.GameBattle.runningTurn
      ) {
        unitElement.classList.add(
          "active-planner"
        );
      }

      if (
        unit.team === "enemy" &&
        window.GameBattle
          .waitingForTarget &&
        !unit.defeated
      ) {
        unitElement.classList.add(
          "selectable-target"
        );
      }

      const hpPercent =
        unit.maxHp > 0
          ? Math.max(
              0,
              (unit.hp /
                unit.maxHp) *
                100
            )
          : 0;

      const firstFrame =
        unit.idleFrames[0] || "";

      const intentText =
        unit.team === "enemy"
          ? this.getIntentText(unit)
          : this.getPlanText(unit);

      unitElement.innerHTML = `
        ${
          intentText
            ? `
              <div class="combatant-intent">
                ${intentText}
              </div>
            `
            : ""
        }

        <div class="combatant-sprite-wrap">
          <div class="combatant-shadow"></div>

          <img
            class="combatant-sprite-image"
            data-combatant-id="${unit.id}"
            data-locked="false"
            src="${firstFrame}"
            alt="${unit.name}"
            draggable="false"
          />
        </div>

        <div class="combatant-name">
          ${unit.team==="fighter"&&unit.affinityIcon?`<span class="affinity-mini">${unit.affinityIcon}</span> `:""}${unit.name}${unit.team==="fighter"&&unit.rarityName?`<span class="rarity-mini">${unit.rarityName}</span>`:""}${unit.affix ? `<span class="affix-mark" title="${unit.affix === "BOSS" ? "Boss" : "Elite enemy"}">${unit.affix === "BOSS" ? "★" : "◆"}</span>` : ""}${unit.statuses?.length ? `<span class="status-marks">${unit.statuses.map(s => s.id === "burn" ? "🔥" : s.id === "bleed" ? "🩸" : s.id === "sunder" ? "⬇" : "").join("")}</span>` : ""}
        </div>

        <div class="health-bar">
          <div
            class="health-bar-fill"
            style="width:${hpPercent}%"
          ></div>
        </div>
      `;

      container.appendChild(
        unitElement
      );
    });
  },

  getPlanText(unit) {
    if (!unit.plannedAction) {
      return "";
    }

    const actionLabel =
      window.GameBattle
        .getActionLabel(
          unit,
          unit.plannedAction
        );

    if (
      unit.plannedAction ===
      "guard"
    ) {
      return actionLabel;
    }

    const target =
      window.GameBattle.findUnit(
        unit.targetId
      );

    return target
      ? `${actionLabel} → ${target.name}`
      : actionLabel;
  },

  getIntentText(unit) {
    if (!unit.intentAction) {
      return "";
    }

    const actionLabel =
      window.GameBattle
        .getActionLabel(
          unit,
          unit.intentAction
        );

    if (
      unit.intentAction ===
      "guard"
    ) {
      return actionLabel;
    }

    const target =
      window.GameBattle.findUnit(
        unit.intentTargetId
      );

    return target
      ? `${actionLabel} → ${target.name}`
      : actionLabel;
  },

  showInspect(unit) {
    const overlay=document.getElementById("inspectOverlay"),body=document.getElementById("inspectBody");if(!overlay||!body||!unit)return;
    const equipment=Object.entries(unit.equipment||{}).map(([slot,item])=>`<div class="inspect-equip"><span>${slot.toUpperCase()}</span><b>${item?.name||"EMPTY"}</b><small>${item?.desc||""}</small></div>`).join("");
    body.innerHTML=`<div class="inspect-rarity rarity-text-${unit.rarity}">${(unit.rarityName||"Common").toUpperCase()} · ${unit.affinityIcon||""} ${(unit.affinityName||"").toUpperCase()}</div><div class="inspect-head"><img src="${unit.idleFrames[0]}" alt="${unit.name}"><div><h2>${unit.name}</h2><p>${(unit.archetypeId||"fighter").toUpperCase()}</p></div></div><div class="inspect-stats"><span>HP <b>${unit.hp}/${unit.maxHp}</b></span><span>ATK <b>${unit.attack}</b></span><span>DEF <b>${unit.defense}</b></span><span>SPD <b>${unit.speed}</b></span><span>CRIT <b>${Math.round((unit.critChance||0)*100)}%</b></span><span>DODGE <b>${Math.round((unit.dodgeChance||0)*100)}%</b></span></div><h3>TEXT</h3><div class="inspect-keywords">${unit.keywords?.length?unit.keywords.map(k=>`<p><b>${k.name}</b> — ${k.desc}</p>`).join(""):"<p>No special text. Pure fundamentals.</p>"}</div><h3>ARTIFACTS</h3><div class="inspect-equipment">${equipment}</div>`;
    overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");
  },
  hideInspect(){const o=document.getElementById("inspectOverlay");o?.classList.add("hidden");o?.setAttribute("aria-hidden","true")},
  showCollection() {
    const overlay=document.getElementById("collectionOverlay"),body=document.getElementById("collectionBody");if(!overlay||!body)return;
    const data=window.GameCards.getCollection(),ids=data.recent||[];
    body.innerHTML=ids.length?ids.map(id=>{const c=data.cards[id];if(!c)return"";return`<article class="collection-entry rarity-${c.rarity||"common"}"><small>${(c.kind||"card").toUpperCase()} · ${(c.rarityName||c.rarity||"common").toUpperCase()}</small><b>${c.name}</b><span>${c.affinity||c.slot||c.archetype||""}</span><em>SEEN ${c.count||1}×</em></article>`}).join(""):`<p class="empty-collection">No cards encountered yet. Start a run and crack the Ritual open.</p>`;
    overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");
  },
  hideCollection(){const o=document.getElementById("collectionOverlay");o?.classList.add("hidden");o?.setAttribute("aria-hidden","true")},

  renderTimeline() {
  const timeline =
    document.getElementById(
      "timelineBar"
    );

  const roundText =
    document.getElementById(
      "roundText"
    );

  if (roundText) {
    roundText.textContent =
      window.GameBattle.round;
  }

  if (!timeline) {
    return;
  }

  const entries =
    window.GameBattle
      .getTimelineEntries();

  timeline.innerHTML =
    entries
      .map((entry, index) => {
        const unit = entry.unit;

        const portrait =
          unit.idleFrames[0] || "";

        const actionLabel =
          window.GameBattle
            .getActionLabel(
              unit,
              entry.action
            );

        const isActive =
          window.GameBattle
            .activeTimelineIndex ===
          index;

        const isFinished =
          window.GameBattle
            .runningTurn &&
          window.GameBattle
            .activeTimelineIndex >
            index;

        let actionSymbol = "?";

        if (
          entry.action === "attack" ||
          entry.action === "heavy"
        ) {
          actionSymbol = "⚔";
        }

        if (entry.action === "skill") {
          actionSymbol = "✦";
        }

        if (entry.action === "guard") {
          actionSymbol = "◆";
        }

        return `
          <div
            class="
              turn-token
              ${entry.team}
              ${isActive ? "active" : ""}
              ${isFinished ? "finished" : ""}
            "
            title="${unit.name}: ${actionLabel}"
          >
            <img
              class="turn-token-frame"
              src="assets/ui/image_1.png"
              alt=""
              draggable="false"
            />

            <div class="turn-token-portrait-window">
              <img
                class="turn-token-portrait"
                src="${portrait}"
                alt="${unit.name}"
                draggable="false"
              />
            </div>

            <span class="turn-action-symbol">
              ${actionSymbol}
            </span>
          </div>
        `;
      })
      .join("");
},

  updateHealth(combatantId) {
    const unit =
      this.findCombatant(
        combatantId
      );

    const element =
      document.querySelector(
        `.combatant[data-combatant-id="${combatantId}"]`
      );

    if (!unit || !element) {
      return;
    }

    const fill =
      element.querySelector(
        ".health-bar-fill"
      );

    if (fill) {
      const hpPercent =
        unit.maxHp > 0
          ? Math.max(
              0,
              Math.min(
                100,
                (unit.hp / unit.maxHp) * 100
              )
            )
          : 0;

      fill.style.width =
        `${hpPercent}%`;
    }

    element.classList.toggle(
      "defeated",
      unit.defeated
    );
  },

  playAttack(combatantId) {
    const unit =
      this.findCombatant(
        combatantId
      );

    const image =
      document.querySelector(
        `.combatant-sprite-image[data-combatant-id="${combatantId}"]`
      );

    const element =
      document.querySelector(
        `.combatant[data-combatant-id="${combatantId}"]`
      );

    if (!unit || !image || !element) {
      return;
    }

    image.dataset.locked = "true";

    if (unit.attackFrame) {
      image.src =
        unit.attackFrame;
    }

    element.classList.add(
      "attacking"
    );

    setTimeout(() => {
      element.classList.remove(
        "attacking"
      );

      image.dataset.locked =
        "false";

      if (unit.idleFrames.length) {
        image.src =
          unit.idleFrames[
            this.idleFrameIndex %
              unit.idleFrames.length
          ];
      }
    }, 360);
  },

  playHit(combatantId) {
    const unit =
      this.findCombatant(
        combatantId
      );

    const image =
      document.querySelector(
        `.combatant-sprite-image[data-combatant-id="${combatantId}"]`
      );

    const element =
      document.querySelector(
        `.combatant[data-combatant-id="${combatantId}"]`
      );

    if (!unit || !image || !element) {
      return;
    }

    image.dataset.locked = "true";

    if (unit.hitFrame) {
      image.src =
        unit.hitFrame;
    }

    element.classList.add("hit");

    setTimeout(() => {
      element.classList.remove(
        "hit"
      );

      image.dataset.locked =
        "false";

      if (unit.idleFrames.length) {
        image.src =
          unit.idleFrames[
            this.idleFrameIndex %
              unit.idleFrames.length
          ];
      }
    }, 280);
  },

  playGuard(combatantId) {
    const element =
      document.querySelector(
        `.combatant[data-combatant-id="${combatantId}"]`
      );

    if (!element) {
      return;
    }

    element.classList.add(
      "guard-pulse"
    );

    setTimeout(() => {
      element.classList.remove(
        "guard-pulse"
      );
    }, 500);
  },

  focusCombatant(combatantId) {
  const battlefield =
    document.getElementById(
      "battlefield"
    );

  battlefield.classList.add(
    "resolving-action"
  );

  document
    .querySelectorAll(".combatant")
    .forEach(element => {
      const isActive =
        element.dataset.combatantId ===
        combatantId;

      element.classList.toggle(
        "current-actor",
        isActive
      );

      element.classList.toggle(
        "background-unit",
        !isActive
      );
    });
},

clearCombatFocus() {
  const battlefield =
    document.getElementById(
      "battlefield"
    );

  battlefield.classList.remove(
    "resolving-action"
  );

  document
    .querySelectorAll(".combatant")
    .forEach(element => {
      element.classList.remove(
        "current-actor",
        "background-unit"
      );
    });
},

shakeBattlefield(strength = 8) {
  const battlefield =
    document.getElementById(
      "battlefield"
    );

  battlefield.animate(
    [
      {
        transform:
          "translate(0, 0)"
      },
      {
        transform:
          `translate(${-strength}px, 1px)`
      },
      {
        transform:
          `translate(${strength}px, -1px)`
      },
      {
        transform:
          `translate(${
            -Math.floor(
              strength / 2
            )
          }px, 0)`
      },
      {
        transform:
          "translate(0, 0)"
      }
    ],
    {
      duration: 260,
      easing: "ease-out"
    }
  );
}
};
