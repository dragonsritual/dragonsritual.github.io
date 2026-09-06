// character.js - Wizard Feeder Character Sheet (Viewfinder UI)
(function () {
  'use strict';

  function game() {
    return window.WF_GAME || {};
  }

  function ensureEquippedShape(state) {
    if (!state) return;
    if (!state.equipped || typeof state.equipped !== 'object') state.equipped = {};
    const eq = state.equipped;

    // Resolve across legacy + future keys
    const staffResolved = (eq.staff !== undefined ? eq.staff : (eq.weapon !== undefined ? eq.weapon : eq.mainHand));
    const robeResolved  = (eq.robe  !== undefined ? eq.robe  : (eq.armor  !== undefined ? eq.armor  : eq.body));

    const staff = staffResolved || null;
    const robe  = robeResolved  || null;

    if (eq.ring === undefined) eq.ring = null;
    if (eq.amulet === undefined) eq.amulet = null;

    eq.staff = staff; eq.weapon = staff; eq.mainHand = staff;
    eq.robe  = robe;  eq.armor  = robe;  eq.body = robe;

    if (eq.staff === undefined) eq.staff = null;
    if (eq.robe === undefined) eq.robe = null;
  }

  function getState() {
    const g = game();
    const s = g.getState ? g.getState() : null;
    if (!s) return null;

    if (!Array.isArray(s.inventory)) s.inventory = [];
    if (!s.equipped) s.equipped = { staff: null, robe: null, ring: null, amulet: null };
    ensureEquippedShape(s);

    return s;
  }

  function getEquipped(state, slot) {
    if (!state) return null;
    ensureEquippedShape(state);
    const eq = state.equipped || {};
    if (slot === 'staff') return eq.staff || eq.weapon || eq.mainHand || null;
    if (slot === 'robe')  return eq.robe  || eq.armor  || eq.body    || null;
    if (slot === 'ring')  return eq.ring  || null;
    if (slot === 'amulet') return eq.amulet || null;
    return eq[slot] || null;
  }

  let overlay, closeBtn;

  function ensureOverlay() {
    overlay = document.getElementById('character-overlay');
    if (overlay) return;

    const vf = document.getElementById('viewfinder');
    if (!vf) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="character-overlay" class="wf-overlay hidden" aria-hidden="true">
        <div id="character-window" class="wf-panel">
          <div class="wf-panel-header">
            <div class="wf-panel-title">Character</div>
            <button id="character-close" class="wf-panel-close" type="button">Close</button>
          </div>

          <div class="wf-panel-body">
            <div class="char-block">
              <div class="char-section-title">Identity</div>
              <div class="char-row"><span>Name</span><span id="char-name">—</span></div>
              <div class="char-row"><span>Aspect</span><span id="char-form">—</span></div>
              <div class="char-row"><span>Level</span><span id="char-level">—</span></div>
              <div class="char-row"><span>XP</span><span id="char-xp">—</span></div>
            </div>

            <div class="char-block">
              <div class="char-section-title">Core Stats</div>
              <div class="char-row"><span>Power</span><span id="char-power">—</span></div>
              <div class="char-row"><span>Insight</span><span id="char-insight">—</span></div>
              <div class="char-row"><span>Vitality</span><span id="char-vitality">—</span></div>
              <div class="char-row"><span>Corruption</span><span id="char-corruption">—</span></div>
              <div class="char-row"><span>Health</span><span id="char-health">—</span></div>
              <div class="char-row"><span>Hunger</span><span id="char-hunger">—</span></div>
              <div class="char-row"><span>Energy</span><span id="char-energy">—</span></div>
              <div class="char-row"><span>Gold</span><span id="char-gold">—</span></div>
            </div>

            <div class="char-block">
              <div class="char-section-title">Equipped</div>
              <div class="char-row"><span>Staff</span><span id="char-eq-staff">—</span></div>
              <div class="char-row"><span>Robe</span><span id="char-eq-robe">—</span></div>
              <div class="char-row"><span>Ring</span><span id="char-eq-ring">—</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    vf.appendChild(wrapper.firstElementChild);
    overlay = document.getElementById('character-overlay');
  }

  function cacheDom() {
    ensureOverlay();
    closeBtn = document.getElementById('character-close');
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function render() {
    cacheDom();
    const state = getState();
    if (!state) return;

    setText('char-name', state.name || window.WIZARD_NAME || '—');

    const formName =
      (typeof window.getCurrentForm === 'function' && window.getCurrentForm() && window.getCurrentForm().name) ||
      state.formName || state.form || 'Dustling';
    setText('char-form', formName);

    setText('char-level', String(state.level ?? 1));
    setText('char-xp', String(state.xp ?? 0));

    // Match HUD logic by calling the renderer's shared API when available.
    const api = window.WF_API || {};

    const power    = (api.effectivePower)    ? api.effectivePower()    : (state.power ?? 0);
    const insight  = (api.effectiveInsight)  ? api.effectiveInsight()  : (state.insight ?? 0);
    const vitality = (api.effectiveVitality) ? api.effectiveVitality() : (state.vitality ?? 0);

    const corruptBonus = (api.gearBonusStat) ? api.gearBonusStat('corruption') : 0;
    const corruption = (state.corruption ?? 0) + (Number(corruptBonus) || 0);

    setText('char-power', String(power));
    setText('char-insight', String(insight));
    setText('char-vitality', String(vitality));
    setText('char-corruption', String(corruption));

    // IMPORTANT: use the same current values the right-side HUD shows (state.health/state.energy/state.hunger),
    // and only compute max values via the renderer API (if present).
    const hpMax = (api.maxHealth) ? api.maxHealth() : 0;
    const hpCur = Math.round(Number(state.health ?? state.healthFloat ?? 0));

    const enMax = (api.maxEnergy) ? api.maxEnergy() : 0;
    const enCur = Math.round(Number(state.energy ?? state.energyFloat ?? 0));

    setText('char-health', hpMax ? `${hpCur} / ${hpMax}` : String(hpCur));
    setText('char-hunger', String(Math.round(Number(state.hunger ?? state.hungerFloat ?? 0))));
    setText('char-energy', enMax ? `${enCur} / ${enMax}` : String(enCur));

    setText('char-gold', String(Math.floor(Number(state.gold ?? 0))));

    setText('char-eq-staff', getEquipped(state, 'staff') ? getEquipped(state, 'staff').name : '—');
    setText('char-eq-robe',  getEquipped(state, 'robe')  ? getEquipped(state, 'robe').name  : '—');
    setText('char-eq-ring',  getEquipped(state, 'ring')  ? getEquipped(state, 'ring').name  : '—');
  }

  function open() {
    cacheDom();
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    render();
  }

  function close() {
    cacheDom();
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function toggle() {
    cacheDom();
    if (!overlay) return;
    if (overlay.classList.contains('hidden')) open();
    else close();
  }

  function bindUi() {
    cacheDom();
    if (closeBtn && !closeBtn.__wfBound) {
      closeBtn.__wfBound = true;
      closeBtn.addEventListener('click', close);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    bindUi();
    render(); // prime values so first-open isn't blank
  });

  // Update whenever the rest of the game broadcasts changes (gear, potions, etc.)
  window.addEventListener('wf:update', () => {
    try { render(); } catch (e) {}
  });

  window.WF_Character = { open, close, toggle, render };

  // --- renderer-facing bridge ---
  window.WFCharacter = window.WFCharacter || {};
  window.WFCharacter.open = () => window.WF_Character && window.WF_Character.open();
  window.WFCharacter.close = () => window.WF_Character && window.WF_Character.close();
  window.WFCharacter.toggle = () => window.WF_Character && window.WF_Character.toggle();
  window.WFCharacter.render = () => window.WF_Character && window.WF_Character.render();
  window.WFCharacter.init = window.WFCharacter.init || function () {};
})();
 