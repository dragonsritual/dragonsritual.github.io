// inventory.js - Wizard Feeder RPG Inventory (Viewfinder UI)
(function () {
  'use strict';

  const SLOT_TYPES = new Set(['staff', 'robe', 'ring', 'amulet', 'weapon', 'armor']);

  function game() {
    return window.WF_GAME || {};
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

  function normalizeItem(item) {
  const it = Object.assign({}, item);

  if (!it.id) {
    const base = (it.name || 'item').toLowerCase().replace(/\s+/g, '-');
    it.id = base + '-' + Date.now() + '-' + Math.floor(Math.random() * 9999);
  }

  if (!it.type && it.slot) it.type = it.slot;

  // --- SLOT/TYPE ALIASES (so robes always land in the robe slot) ---
  const ALIAS = {
    armor: 'robe',
    chest: 'robe',
    clothes: 'robe',
    clothing: 'robe',
    robe: 'robe',
    staff: 'staff',
    ring: 'ring',
    weapon: 'weapon'
  };

  if (it.slot && ALIAS[it.slot]) it.slot = ALIAS[it.slot];
  if (it.type && ALIAS[it.type]) it.type = ALIAS[it.type];

  return it;
}

  function categoryOf(item) {
    if (item.category) return item.category;

    const t = (item.type || '').toLowerCase();

    if (t === 'staff' || t === 'weapon') return 'weapons';
    if (t === 'robe' || t === 'ring' || t === 'amulet' || t === 'armor') return 'armor';

    return 'items';
  }

  function isEquipable(item) {
  const t = (item.type || '').toLowerCase();
  return SLOT_TYPES.has(t);
}

function isConsumable(item) {
  const t = (item.type || '').toLowerCase();
  if (item.isConsumable) return true;
  return t === 'potion' || t === 'consumable';
}

function slotFor(item) {
  const t = item && item.type;

  //support BOTH naming styles:
  // - old: weapon/armor
  // - current: staff/robe
  if (t === 'staff' || t === 'weapon') return 'staff';
  if (t === 'robe' || t === 'armor') return 'robe';
  if (t === 'ring') return 'ring';
  if (t === 'amulet') return 'amulet';

   return null;
}

function ensureEquippedShape(state) {
  if (!state) return;
  if (!state.equipped || typeof state.equipped !== 'object') {
    state.equipped = {};
  }
  const eq = state.equipped;

  // Normalize across legacy + future-proof keys.
  // We keep your current slots (staff/robe/ring) as the "source of truth" the UI shows,
  // but we also mirror to weapon/armor/mainHand/body so other code stays compatible.
  const staff = (eq.staff !== undefined ? eq.staff : undefined);
  const robe  = (eq.robe  !== undefined ? eq.robe  : undefined);

  const staffResolved = (staff !== undefined ? staff : (eq.weapon !== undefined ? eq.weapon : eq.mainHand));
  const robeResolved  = (robe  !== undefined ? robe  : (eq.armor  !== undefined ? eq.armor  : eq.body));

  const finalStaff = staffResolved || null;
  const finalRobe  = robeResolved  || null;

  if (eq.ring === undefined) eq.ring = null;
  if (eq.amulet === undefined) eq.amulet = null;

  eq.staff = finalStaff;
  eq.weapon = finalStaff;
  eq.mainHand = finalStaff;

  eq.robe = finalRobe;
  eq.armor = finalRobe;
  eq.body = finalRobe;

  // Ensure keys exist even if null (helps UI logic)
  if (eq.staff === undefined) eq.staff = null;
  if (eq.robe === undefined) eq.robe = null;
}

function getEquippedFromState(state, slot) {
  if (!state) return null;
  ensureEquippedShape(state);
  const eq = state.equipped || {};
  if (slot === 'staff') return eq.staff || eq.weapon || eq.mainHand || null;
  if (slot === 'robe')  return eq.robe  || eq.armor  || eq.body    || null;
  if (slot === 'ring')  return eq.ring  || null;
  if (slot === 'amulet') return eq.amulet || null;
  return (eq && eq[slot]) || null;
}

function setEquippedOnState(state, slot, itemOrNull) {
  if (!state) return;
  ensureEquippedShape(state);
  const eq = state.equipped;

  const v = itemOrNull || null;

  if (slot === 'staff') {
    eq.staff = v; eq.weapon = v; eq.mainHand = v;
  } else if (slot === 'robe') {
    eq.robe = v; eq.armor = v; eq.body = v;
  } else if (slot === 'ring') {
    eq.ring = v;
  } else if (slot === 'amulet') {
    eq.amulet = v;
  } else {
    eq[slot] = v;
  }
}


  function bonusesText(item) {
    const b = item.bonuses;
    if (!b) return '';

    const parts = [];
    Object.keys(b).forEach(k => {
      const v = b[k];
      if (typeof v === 'number' && v !== 0) {
        const sign = v > 0 ? '+' : '';
        parts.push(`${sign}${v} ${k}`);
      }
    });

    return parts.join(' • ');
  }

  // DOM refs
  let overlay, closeBtn, tabBtns, pages;
  let detailOverlay, detailCloseBtn, detailTitleEl, detailMetaEl, detailBonusesEl, detailActionBtn;
  let detailItem = null;
  let listWeapons, listArmor, listItems;

  
  function ensureDetailOverlay() {
    const invWindow = document.getElementById('inventory-window');
    if (!invWindow) return;
    if (document.getElementById('inv-detail-overlay')) return;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="inv-detail-overlay" class="inv-detail-overlay hidden" aria-hidden="true">
        <div class="inv-card">
          <div class="inv-card-header">
            <div class="inv-card-headtext">
              <div id="inv-card-title" class="inv-card-title">Item</div>
              <div id="inv-card-meta" class="inv-card-meta"></div>
            </div>
            <button id="inv-card-close" class="wf-panel-close" type="button">Back</button>
          </div>

          <div id="inv-card-bonuses" class="inv-card-bonuses"></div>

          <div class="inv-card-actions">
            <button id="inv-card-action" class="primary-btn small" type="button">Equip</button>
          </div>
        </div>
      </div>
    `;
    invWindow.appendChild(wrap.firstElementChild);
  }

function cacheDom() {
    overlay     = document.getElementById('inventory-overlay');
    closeBtn    = document.getElementById('inventory-close');

    tabBtns     = Array.from(document.querySelectorAll('#inventory-overlay .inv-tab'));
    pages       = Array.from(document.querySelectorAll('#inventory-overlay .inv-page'));

    listWeapons = document.getElementById('inv-weapons-list');
    listArmor   = document.getElementById('inv-armor-list');
    listItems   = document.getElementById('inv-items-list');

    // Ensure the item-detail card exists (it isn't in index.html by default)
    ensureDetailOverlay();

    detailOverlay   = document.getElementById('inv-detail-overlay');
    detailCloseBtn  = document.getElementById('inv-card-close');
    detailTitleEl   = document.getElementById('inv-card-title');
    detailMetaEl    = document.getElementById('inv-card-meta');
    detailBonusesEl = document.getElementById('inv-card-bonuses');
    detailActionBtn = document.getElementById('inv-card-action');
  }

  function setActiveTab(key) {
    tabBtns.forEach(b => b.classList.toggle('is-active', b.dataset.tab === key));
    pages.forEach(p => p.classList.toggle('is-active', p.dataset.page === key));
  }

  function clearList(el, emptyText) {
    if (!el) return;

    el.innerHTML = '';
    el.classList.remove('inv-empty');

    // We'll re-add empty state later if needed
    el.dataset.emptyText = emptyText || '';
  }

  function setEmpty(el, text) {
    if (!el) return;
    el.classList.add('inv-empty');
    el.textContent = text;
  }

  function makeRow(item, state) {
  const row = document.createElement('div');
  row.className = 'inv-row';

  const left = document.createElement('div');

  const name = document.createElement('div');
  name.className = 'inv-name';
  name.textContent = item.name || 'Unknown';

  const meta = document.createElement('div');
  meta.className = 'inv-meta';

  const typeLabel = (item.type || item.slot || 'item');
  const rarityLabel = item.rarityLabel || item.rarity || 'Common';
  meta.textContent = `${rarityLabel} • ${typeLabel}`;

  left.appendChild(name);
  left.appendChild(meta);

  const bonusStr = bonusesText(item);
  if (bonusStr) {
    const bonus = document.createElement('div');
    bonus.className = 'inv-bonus';
    bonus.textContent = bonusStr;
    left.appendChild(bonus);
  }

  const right = document.createElement('div');
  right.className = 'inv-actions';

  if (isEquipable(item)) {
    const slot = slotFor(item);
    if (slot) {
      const eq = getEquippedFromState(state, slot);
      const isEquipped = !!(eq && eq.id === item.id);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-equip-btn' + (isEquipped ? ' is-equipped' : '');
      btn.textContent = isEquipped ? 'Unequip' : 'Equip';

      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleEquip(item);
      });

      right.appendChild(btn);
    }
  } else if (isConsumable(item)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inv-equip-btn';
    btn.textContent = 'Use';

    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      useItem(item);
    });

    right.appendChild(btn);
  }

  row.appendChild(left);
  row.appendChild(right);


  // Clicking the row opens a detail card (ignore clicks on buttons)
  row.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('button')) return;
    openDetail(item);
  });

  return row;
}

  function openDetail(item) {
    cacheDom();
    if (!detailOverlay || !item) return;

    detailItem = item;

    if (detailTitleEl) detailTitleEl.textContent = item.name || 'Item';

    const cat = categoryOf(item);
    const typeLabel = (item.type || cat || 'item').toString();
    const rarity = (item.rarity || 'Common').toString();
    if (detailMetaEl) detailMetaEl.textContent = `${rarity} • ${typeLabel}`;

    if (detailBonusesEl) {
      const b = item.bonuses || {};
      const entries = Object.entries(b).filter(([k,v]) => typeof v === 'number' && v !== 0);
      if (!entries.length) {
        detailBonusesEl.textContent = 'No modifiers.';
      } else {
        detailBonusesEl.innerHTML = entries.map(([k,v]) => {
          const sign = v > 0 ? '+' : '';
          const label = k.replace(/_/g,' ');
          return `<div class="inv-bonus-row"><span class="inv-bonus-key">${label}</span><span class="inv-bonus-val">${sign}${v}</span></div>`;
        }).join('');
      }
    }

    if (detailActionBtn) {
      const s = getState() || {};
      const slot = slotFor(item);

      if (item.isConsumable || item.type === 'potion') {
        detailActionBtn.textContent = 'Use';
        detailActionBtn.disabled = false;
      } else if (slot) {
        ensureEquippedShape(s);
        const eq = getEquippedFromState(s, slot);
        const isEquipped = eq && eq.id === item.id;
        detailActionBtn.textContent = isEquipped ? 'Unequip' : 'Equip';
        detailActionBtn.disabled = false;
      } else {
        detailActionBtn.textContent = 'Close';
        detailActionBtn.disabled = false;
      }
    }

    detailOverlay.classList.remove('hidden');
    detailOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDetail() {
    cacheDom();
    if (!detailOverlay) return;
    detailOverlay.classList.add('hidden');
    detailOverlay.setAttribute('aria-hidden', 'true');
    detailItem = null;
  }


  function maxHealthFor(state) {
  // mirror renderer.js logic: base 40 + 6 per Vitality
  const vit = Number(state && state.vitality) || 0;
  return 40 + vit * 6;
}

function resolvePotionHeal(item) {
  // Prefer explicit heal value
  const raw = Number(item && item.heal);
  if (Number.isFinite(raw) && raw > 0) return raw;

  const id = String(item && item.id || '').toLowerCase();
  const name = String(item && item.name || '').toLowerCase();

  // Shop potions (by id/name conventions)
  if (id.includes('potion_strong') || name.includes('strong')) return 80;
  if (id.includes('potion_lite') || name.includes('lite')) return 20;
  if (id.includes('potion') || name === 'potion') return 45;

  // Legacy size-based names
  if (name.includes('small')) return 12;
  if (name.includes('medium')) return 22;
  if (name.includes('large')) return 35;

  // Safe fallback
  return 10;
}

function useItem(item) {
  const g = game();
  const state = getState();
  if (!state) return;

  const heal = resolvePotionHeal(item);
  const hpMax = maxHealthFor(state);

  // Use numeric, even if healthFloat exists but is NaN
  const hf = Number(state.healthFloat);
  const h  = Number(state.health);
  const before = Number.isFinite(hf) ? hf : (Number.isFinite(h) ? h : 0);

  const after = Math.min(hpMax, before + heal);

  state.healthFloat = after;
  state.health = Math.round(after);

  emitGameUpdate('health', { health: state.health, healthFloat: state.healthFloat });

  // remove this one potion from inventory (by id, because UI uses normalized copies)
  const inv = state.inventory || [];
  const id = item && item.id;
  let idx = -1;

  if (id) {
    idx = inv.findIndex(x => x && x.id === id);
  }

  if (idx === -1) {
    // fallback: match by name + heal (for older saves without ids)
    const nm = (item && item.name) || '';
    const hv = Number(item && item.heal);
    idx = inv.findIndex(x =>
      x &&
      x.name === nm &&
      (Number.isFinite(hv) ? Number(x.heal) === hv : true)
    );
  }

  if (idx !== -1) inv.splice(idx, 1);

  emitGameUpdate('inventory', { inventory: state.inventory });

  if (g.pushLog) {
    const beforeR = Math.round(before);
    const afterR  = Math.round(after);
    const gained  = Math.max(0, afterR - beforeR);

    if (gained <= 0) {
      g.pushLog(`He drinks ${item.name}. No effect (already at full health, heal +${heal}).`);
    } else {
      g.pushLog(`He drinks ${item.name}. (+${gained} health)`);
    }
  }

  if (g.updateUi) g.updateUi();
  if (g.save) g.save();

  render();
}


  function render() {
    cacheDom();
    const state = getState();
    if (!state || !overlay) return;
    ensureEquippedShape(state);

    clearList(listWeapons, 'No weapons yet.');
    clearList(listArmor,   'No armor yet.');
    clearList(listItems,   'The satchel is empty.');

    const weapons = [];
    const armor   = [];
    const items   = [];

    state.inventory.forEach(raw => {
      const item = normalizeItem(raw);
      // Keep normalized copy in state
      Object.assign(raw, item);

      const cat = categoryOf(item);
      if (cat === 'weapons') weapons.push(item);
      else if (cat === 'armor') armor.push(item);
      else items.push(item);
    });

    weapons.forEach(it => listWeapons && listWeapons.appendChild(makeRow(it, state)));
    armor.forEach(it => listArmor && listArmor.appendChild(makeRow(it, state)));
    items.forEach(it => listItems && listItems.appendChild(makeRow(it, state)));

    if (weapons.length === 0) setEmpty(listWeapons, 'No weapons yet.');
    if (armor.length === 0)   setEmpty(listArmor, 'No armor yet.');
    if (items.length === 0)   setEmpty(listItems, 'The satchel is empty.');

    // Save after normalization
    const g = game();
    if (g.save) g.save();
  }

  function toggleEquip(item) {
    const state = getState();
    if (!state) return;

    const slot = slotFor(item);
    if (!slot) return;

    ensureEquippedShape(state);

    const currently = getEquippedFromState(state, slot);
    const g = game();

    if (currently && currently.id === item.id) {
      setEquippedOnState(state, slot, null);
      if (g.pushLog) g.pushLog(`You unequip ${item.name}.`);
    } else {
      setEquippedOnState(state, slot, item);
      if (g.pushLog) g.pushLog(`You equip ${item.name}.`);
    }

    emitGameUpdate('equipment', { equipped: state.equipped });
    if (state.stats) emitGameUpdate('stats', { stats: state.stats });

    if (g.updateUi) g.updateUi();
    if (g.save) g.save();

    render();
  }

  function emitGameUpdate(kind, payload) {
  window.dispatchEvent(new CustomEvent('wf:update', {
    detail: { kind, payload, t: Date.now() }
  }));
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
    closeDetail();
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function toggle() {
    cacheDom();
    if (!overlay) return;
    if (overlay.classList.contains('hidden')) open();
    else close();
  }

  function addItem(item) {
    const state = getState();
    if (!state) return;

    const it = normalizeItem(item);
    state.inventory.push(it);

    const g = game();
    if (g.pushLog) g.pushLog(`Item acquired: ${it.name}.`);
    if (g.updateUi) g.updateUi();
    if (g.save) g.save();

    render();
  }

  function bindUi() {
    cacheDom();
    if (!overlay) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }
    // Detail card controls (Back + Equip/Unequip)
    if (detailCloseBtn) {
      detailCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDetail();
      });
    }

    if (detailActionBtn) {
      detailActionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!detailItem) return;

        // Use consumables; otherwise toggle equip state. Then refresh the card label.
        if (isConsumable(detailItem)) {
          useItem(detailItem);
          openDetail(detailItem);
        } else {
          toggleEquip(detailItem);
          openDetail(detailItem);
        }
      });
    }

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setActiveTab(btn.dataset.tab);
      });
    });

    // Default tab
    setActiveTab('weapons');
  }

  // Init after DOM
  window.addEventListener('DOMContentLoaded', () => {
    bindUi();
    render();
  });

  // Public API expected by index dev seed
  window.WF_Inventory = {
    open,
    close,
    toggle,
    render,
    addItem
  };

  // --- minimal global export for renderer binding ---
  // Bridge the renderer-facing API (WFInventory) to the Viewfinder UI API (WF_Inventory)

  window.WFInventory = window.WFInventory || {};

  window.WFInventory.open = function () {
    if (window.WF_Inventory && typeof window.WF_Inventory.open === 'function') {
      window.WF_Inventory.open();
    }
  };

  window.WFInventory.close = function () {
    if (window.WF_Inventory && typeof window.WF_Inventory.close === 'function') {
      window.WF_Inventory.close();
    }
  };

  window.WFInventory.toggle = function () {
    if (window.WF_Inventory && typeof window.WF_Inventory.toggle === 'function') {
      window.WF_Inventory.toggle();
    }
  };

  window.WFInventory.render = function () {
    if (window.WF_Inventory && typeof window.WF_Inventory.render === 'function') {
      window.WF_Inventory.render();
    }
  };

  window.WFInventory.addItem = function (item) {
    if (window.WF_Inventory && typeof window.WF_Inventory.addItem === 'function') {
      window.WF_Inventory.addItem(item);
    }
  };

  // Optional no-op for compatibility
  window.WFInventory.init = window.WFInventory.init || function () {};

})();