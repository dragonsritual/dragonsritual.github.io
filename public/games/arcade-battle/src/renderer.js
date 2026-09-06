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

    const sigils=document.getElementById("runSigils");
    if(sigils){
      sigils.innerHTML=(window.GameBattle.fighters||[]).map(f=>`
        <span class="run-sigil affinity-${f.affinity||"none"} rarity-${f.rarity||"common"}" title="${f.name} · ${f.rarityName||"Common"} ${f.affinityName||""}">
          <i>${f.affinityIcon||"◇"}</i>
        </span>`).join("");
    }
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
        `combatant ${unit.team}${unit.team==="fighter"&&unit.rarity?` rarity-${unit.rarity} affinity-${unit.affinity}`:""} ${unit.groundMode==="hover"?"unit-hover":"unit-grounded"}`;

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
          <div class="combatant-ground-sigil">${unit.team==="fighter"&&unit.affinityIcon?unit.affinityIcon:""}</div>
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
          ${unit.team==="fighter"&&unit.affinityIcon?`<span class="affinity-glyph">${unit.affinityIcon}</span> `:""}${unit.name}${unit.team==="fighter"&&unit.rarityName?` <span class="rarity-chip">${unit.rarityName}</span>`:""}${unit.affix ? `<span class="affix-mark" title="${unit.affix === "BOSS" ? "Boss" : "Elite enemy"}">${unit.affix === "BOSS" ? "★" : "◆"}</span>` : ""}${unit.statuses?.length ? `<span class="status-marks">${unit.statuses.map(s => s.id === "burn" ? "🔥" : s.id === "bleed" ? "🩸" : s.id === "sunder" ? "⬇" : "").join("")}</span>` : ""}
        </div>

        <div class="combatant-affinity-strip ${unit.affinity?`affinity-${unit.affinity}`:""}">
          <span>${unit.affinityIcon|| (unit.team==="enemy"?"◆":"◇")}</span>
          <b>${unit.affinityName||unit.affinity|| (unit.team==="enemy"?"HOSTILE":"UNAFFINED")}</b>
          <em>${unit.team==="fighter"?(unit.rarityName||"Common"):(unit.affix||"Enemy")}</em>
        </div>
        <div class="health-readout"><b>${Math.max(0,Math.round(unit.hp))}</b><span>/</span>${Math.round(unit.maxHp)} HP</div>
        <div class="health-bar">
          <div class="health-bar-fill" style="width:${hpPercent}%"></div>
        </div>
        <div class="combatant-mini-stats">
          <span title="Attack">⚔ ${Math.round(unit.attack||0)}</span>
          <span title="Defense">⛨ ${Math.round(unit.defense||0)}</span>
          <span title="Speed">➤ ${Math.round(unit.speed||0)}</span>
        </div>
        ${unit.team==="fighter"?`<div class="mortality-state ${unit.hp/unit.maxHp<=.25?"critical":unit.hp/unit.maxHp<=.5?"bloodied":unit.wounds?"wounded":"ready"}">${unit.getCondition?.()||"READY"}</div>`:""}
      `;

      container.appendChild(
        unitElement
      );

      // Ground visible pixels rather than the transparent PNG canvas.
      const sprite = unitElement.querySelector(".combatant-sprite-image");
      if (sprite) this.groundSprite(sprite, unit);
    });
  },


  groundSprite(image, unit=null, options={}) {
    const measure = () => {
      try {
        if (image.dataset.scaleLocked === "true" && !options.force) return;
        if (!image.naturalWidth || !image.naturalHeight) return;
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently:true });
        ctx.drawImage(image,0,0);
        const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let top=0,bottom=canvas.height-1,left=0,right=canvas.width-1;
        const rowHasAlpha=(y)=>{for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>12)return true;return false};
        const colHasAlpha=(x)=>{for(let y=0;y<canvas.height;y++)if(data[(y*canvas.width+x)*4+3]>12)return true;return false};
        while(top<canvas.height&&!rowHasAlpha(top))top++;
        while(bottom>=0&&!rowHasAlpha(bottom))bottom--;
        while(left<canvas.width&&!colHasAlpha(left))left++;
        while(right>=0&&!colHasAlpha(right))right--;
        if(bottom<top||right<left)return;

        const rendered = image.getBoundingClientRect().height || 96;
        const bottomPad=Math.max(0,canvas.height-1-bottom);
        const visibleHeight=Math.max(1,bottom-top+1);
        const visibleWidth=Math.max(1,right-left+1);
        const visibleFraction=visibleHeight/canvas.height;
        const role=String(unit?.combatRole||"").toLowerCase();
        const isBoss=unit?.affix==="BOSS";
        const isGiant=/giant|rider|brute|ogre/.test(String(unit?.id||"")+" "+String(unit?.archetypeId||""));
        let targetVisible=Number(options.targetVisible)||64;
        if(!options.targetVisible){
          if(unit?.team==="enemy")targetVisible=66;
          if(isGiant)targetVisible=72;
          if(isBoss)targetVisible=78;
          if(unit?.groundMode==="hover")targetVisible=61;
          if(role==="mage"||role==="archer")targetVisible-=2;
        }
        const rawScale=targetVisible/Math.max(1,rendered*visibleFraction);
        const scale=Math.max(.68,Math.min(1.18,rawScale));
        const nudge=Math.min(16,(bottomPad/canvas.height)*rendered*scale);
        image.style.setProperty("--sprite-scale", scale.toFixed(3));
        image.style.setProperty("--ground-nudge", `${nudge.toFixed(2)}px`);
        image.style.setProperty("--visible-ratio", (visibleWidth/visibleHeight).toFixed(3));
        image.dataset.scaleLocked = "true";
      } catch {}
    };
    image.addEventListener("load", measure);
    if (image.complete) measure();
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
    const overlay=document.getElementById("inspectOverlay");
    const body=document.getElementById("inspectBody");
    if(!overlay||!body||!unit)return;

    const equipment=Object.entries(unit.equipment||{}).map(([slot,item])=>`
      <div class="inspect-equip-row ${item?`has-item rarity-${item.rarity||"common"}`:""}">
        <span class="inspect-equip-icon">${slot==="weapon"?"⚔":slot==="armor"?"⛨":"✦"}</span>
        <span class="inspect-equip-copy">
          <small>${slot.toUpperCase()}</small>
          <b>${item?.name||"EMPTY"}</b>
          ${item?.desc?`<em>${item.desc}</em>`:""}
        </span>
      </div>`).join("");

    const rules=unit.rules?.length
      ? unit.rules.map(x=>`<div class="inspect-rule"><b>✧ ${x.name}</b><span>${x.desc}</span></div>`).join("")
      : `<div class="inspect-rule inspect-rule--plain"><b>◌ Fundamentals</b><span>No special rules text.</span></div>`;

    body.innerHTML=`
      <div class="world-sheet rarity-${unit.rarity||"common"} affinity-${unit.affinity||"none"}">
        <header class="world-sheet__header">
          <div class="world-sheet__sigil">${unit.affinityIcon||"◇"}</div>
          <div class="world-sheet__identity">
            <small>${(unit.rarityName||"Common").toUpperCase()} · ${(unit.affinityName||"Unbound").toUpperCase()}</small>
            <h2>${unit.name}</h2>
            <p>LV ${unit.level||1} · ${(unit.combatRole||"fighter").toUpperCase()}</p>
          </div>
          <img src="${unit.idleFrames[0]}" alt="${unit.name}" class="world-sheet__portrait">
        </header>

        <div class="world-sheet__lore">“${unit.lore||"The Ritual remembers every name."}”</div>

        <div class="world-sheet__stats">
          <span><small>HP</small><b>${unit.hp}/${unit.maxHp}</b></span>
          <span><small>ATK</small><b>${unit.attack}</b></span>
          <span><small>DEF</small><b>${unit.defense}</b></span>
          <span><small>SPD</small><b>${unit.speed}</b></span>
          <span><small>CRIT</small><b>${Math.round((unit.critChance||0)*100)}%</b></span>
          <span><small>EVA</small><b>${Math.round((unit.dodgeChance||0)*100)}%</b></span>
        </div>

        <div class="world-sheet__skill">
          <small>KNOWN ART</small>
          <b>${unit.skillName}</b>
        </div>

        <section class="world-sheet__section">
          <h3>✦ RITUAL TEXT</h3>
          ${rules}
        </section>

        <section class="world-sheet__section">
          <h3>◆ RELICS CARRIED</h3>
          <div class="inspect-equip-list">${equipment}</div>
        </section>
      </div>`;

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");
  },

  hideInspect() {
    const overlay=document.getElementById("inspectOverlay");
    overlay?.classList.add("hidden");
    overlay?.setAttribute("aria-hidden","true");
  },

  showCollection() {
    const overlay=document.getElementById("collectionOverlay");
    const body=document.getElementById("collectionBody");
    const meta=document.getElementById("collectionMeta");
    if(!overlay||!body)return;

    const data=window.RitualDraw.collection();
    const ids=data.recent||[];
    if(meta)meta.textContent=`RUNS ${data.runs||0} · BEST WAVE ${data.bestWave||0} · UNIQUE CARDS ${Object.keys(data.cards||{}).length}`;

    body.innerHTML=ids.length
      ? ids.map(id=>{
          const c=data.cards[id];
          if(!c)return"";
          return `
            <article class="collection-entry rarity-${c.rarity||"common"}">
              <small>${(c.kind||"CARD").toUpperCase()} · ${(c.rarityName||c.rarity||"COMMON").toUpperCase()}</small>
              <b>${c.name}</b>
              <span>${c.affinity||c.slot||c.archetype||""}</span>
              <em>SEEN ${c.count||1}×</em>
            </article>`;
        }).join("")
      : `<p class="empty-collection">No cards encountered yet. Crack open a run.</p>`;

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");
  },

  hideCollection() {
    const overlay=document.getElementById("collectionOverlay");
    overlay?.classList.add("hidden");
    overlay?.setAttribute("aria-hidden","true");
  },

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
