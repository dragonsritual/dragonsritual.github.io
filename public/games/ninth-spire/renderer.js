// renderer.js - Dust-to-Wizard evolution with ARPG-style stats
// Shared by full + demo (demo sets window.IS_DEMO = true)

(function () {
  'use strict';
})();

  // ==============================================================
  // Flags / Limits
  // ==============================================================

  const IS_DEMO = !!window.IS_DEMO;
  const MAX_LEVEL = IS_DEMO ? 3 : 12;

  function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

  // ==============================================================
  // FORMS / EVOLUTIONS
  // ==============================================================

  const FORMS = [
    {
      id: 'dustling',
      name: 'Dustling',
      minLevel: 1,
      path: 'neutral',
      desc: 'A nobody dragged in from the road. No power yet.'
    },
    {
      id: 'wanderer',
      name: 'Wanderer',
      minLevel: 2,
      path: 'neutral',
      desc: 'A grim traveller, starting to listen to the tower\'s whispers.'
    },
    {
      id: 'apprentice',
      name: 'Apprentice',
      minLevel: 3,
      path: 'neutral',
      desc: 'A fledgling student of the arcane.'
    },
    {
      id: 'war-wizard',
      name: 'War Wizard',
      minLevel: 6,
      path: 'neutral',
      desc: 'Steel in his gaze, sigils on his scars.'
    },
    {
      id: 'archmage',
      name: 'Archmage',
      minLevel: 9,
      path: 'neutral',
      desc: 'The tower itself hums when he breathes.'
    },
    {
      id: 'sun-sage',
      name: 'Sun Sage',
      minLevel: 11,
      path: 'light',
      desc: 'Light bends towards his will, yet he remains gentle.'
    },
    {
      id: 'void-ascendant',
      name: 'Void Ascendant',
      minLevel: 11,
      path: 'dark',
      desc: 'The stars blink when he looks back at them.'
    }
  ];

  const WEAPONS = [
  { id:'staff-ash', name:'Ash Staff', slot:'staff', rarity:'common', bonus:{ power: +2, atk:+1 }, element:null },
  { id:'staff-ember', name:'Ember Staff', slot:'staff', rarity:'uncommon', bonus:{ power:+4 }, element:'fire', onHit:{ burn:0.15 } },
  { id:'staff-frost', name:'Frost Cane', slot:'staff', rarity:'uncommon', bonus:{ power:+3, def:+1 }, element:'ice', onHit:{ freeze:0.10 } },
  { id:'staff-spark', name:'Spark Rod', slot:'staff', rarity:'uncommon', bonus:{ power:+3 }, element:'lightning', onHit:{ shock:0.12 } },

  { id:'wand-needle', name:'Needle Wand', slot:'weapon', rarity:'common', bonus:{ atk:+2, crit:+1 }, element:null },
  { id:'blade-ritual', name:'Ritual Blade', slot:'weapon', rarity:'uncommon', bonus:{ atk:+4 }, element:'arcane' },
  { id:'dagger-venom', name:'Venom Dagger', slot:'weapon', rarity:'rare', bonus:{ atk:+3, crit:+3 }, element:'poison', onHit:{ poison:0.20 } },

  { id:'ring-cinder', name:'Cinder Ring', slot:'ring', rarity:'uncommon', bonus:{ power:+2 }, element:'fire' },
  { id:'ring-ward', name:'Ward Ring', slot:'ring', rarity:'uncommon', bonus:{ def:+2, hp:+5 } },

  { id:'robe-apprentice', name:"Apprentice Robe", slot:'robe', rarity:'common', bonus:{ def:+1, hp:+6 } },
  { id:'robe-sigil', name:"Sigil Robe", slot:'robe', rarity:'rare', bonus:{ def:+2, power:+3 }, element:'arcane' },
  { id:'robe-thundersilk', name:"Thundersilk Robe", slot:'robe', rarity:'rare', bonus:{ def:+2, power:+2 }, element:'lightning' },
];

  // ==============================================================
  // Name screen UX helpers
  // ==============================================================

  function getNameInputEl() {
    return (
      document.getElementById('name-input') ||
      document.getElementById('wizard-name-input') ||
      document.querySelector('#screen-name input[type="text"]') ||
      document.querySelector('#screen-name input') ||
      document.querySelector('.name-input')
    );
  }

  function getNameContinueBtn() {
    return (
      document.getElementById('btn-name-continue') ||
      document.getElementById('btn-continue-name') ||
      document.querySelector('#screen-name button[data-action="continue"]') ||
      document.querySelector('#screen-name .btn-continue') ||
      document.querySelector('#screen-name button')
    );
  }

  function focusNameInputSoon() {
    setTimeout(() => {
      const input = getNameInputEl();
      if (!input) return;
      input.focus();
      const val = input.value || '';
      try { input.setSelectionRange(val.length, val.length); } catch (_) {}
    }, 0);
  }

  function bindEnterToNameContinue() {
    const input = getNameInputEl();
    if (!input) return;

    if (input.dataset.enterBound === '1') return;
    input.dataset.enterBound = '1';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = getNameContinueBtn();
        if (btn) btn.click();
      }
    });
  }

  function setupNameScreenUx() {
    const input = getNameInputEl();
    const btn   = getNameContinueBtn();
    if (!input) return;

    if (input.dataset.nameUxBound === '1') return;
    input.dataset.nameUxBound = '1';

    if (btn) {
      const sync = () => {
        const val = (input.value || '').trim();
        btn.disabled = val.length === 0;
      };
      input.addEventListener('input', sync);
      sync();
    }

    focusNameInputSoon();
    bindEnterToNameContinue();
  }

  // ==============================================================
  // Small utilities
  // ==============================================================

  function xpNeededFor(level) {
    return 25 + (level - 1) * 25;
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function bumpStat(key, amount) {
    state[key] = Math.max(0, state[key] + amount);
  }

  // ==============================================================
  // Canvas / UI
  // ==============================================================

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const wizardImg = new Image();
  wizardImg.src = 'assets/wizard/idle_down.png';

  // ==============================================================
  // Wizard robe sprite swap (TEMP)
  // - When a robe is equipped:  idle_down_robe01.png
  // - When robe is unequipped:  idle_down.png
  // You can later set robe.idleDownSprite = 'assets/wizard/idle_down_robe02.png' etc.
  // ==============================================================
  const WIZARD_IDLE_BASE = 'assets/wizard/idle_down.png';
  const WIZARD_IDLE_ROBE_FALLBACK = 'assets/wizard/idle_down_robe01.png';

  let _wfWizardIdleSrc = null;

  function refreshWizardSpriteFromGear(force = false) {
    // NOTE: do NOT touch `state` until after it's initialized (this function is only called later).
    let robe = null;
    try { robe = (state && state.equipped) ? state.equipped.robe : null; } catch (e) { robe = null; }

    const nextSrc = robe
      ? (typeof robe.idleDownSprite === 'string' && robe.idleDownSprite.trim() ? robe.idleDownSprite.trim() : WIZARD_IDLE_ROBE_FALLBACK)
      : WIZARD_IDLE_BASE;

    if (!force && _wfWizardIdleSrc === nextSrc) return;
    _wfWizardIdleSrc = nextSrc;

    // Avoid reload spam
    try {
      const cur = (wizardImg && wizardImg.src) ? String(wizardImg.src) : '';
      if (cur.endsWith(nextSrc)) return;
    } catch (e) {}

    // Swap sprite sheet
    wizardSpriteReady = false;
    wizardImg.onload = () => { wizardSpriteReady = true; };
    wizardImg.src = nextSrc;
  }



  const WIZARD_FRAME_COUNT  = 8;
  const WIZARD_FRAME_WIDTH  = 96;
  const WIZARD_FRAME_HEIGHT = 80;

  const bgImg = new Image();
  bgImg.src = 'assets/backgrounds/tower_room.png';

  let bgReady = false;
  bgImg.onload = () => { bgReady = true; };

  const WIZARD_SCALE = 3.5;

  let wizardSpriteReady = false;
  wizardImg.onload = () => { wizardSpriteReady = true; };

  let wizardFrame     = 0;
  let wizardAnimTime  = 0;

  // IMPORTANT: wizard visibility state used by explore rules
  let wizardVisible   = true;

  // Legacy local exploration flags (kept conceptually)
  let isExploringLegacy             = false;
  let exploreSecondsRemainingLegacy = 0;
  let exploreTargetRoomLegacy       = null;
  let exploreStartedAtLegacy        = 0;
  let exploreSpentEnergyLegacy      = 0;
  let exploreSpentHungerLegacy      = 0;

  // ==============================================================
  // DOM refs
  // ==============================================================

  const elLevel  = document.getElementById('stat-level');
  const elForm   = document.getElementById('stat-form');
  const elName   = document.getElementById('stat-name');

  const elTowerTimeText  = document.getElementById('towerTimeText');
  const elTowerTimeEmoji = document.getElementById('towerTimeEmoji');
  const elTowerTimeTextGame  = document.getElementById('towerTimeTextGame');
  const elTowerTimeEmojiGame = document.getElementById('towerTimeEmojiGame');

  const elPower  = document.getElementById('stat-power');
  const elInsight= document.getElementById('stat-insight');
  const elVital  = document.getElementById('stat-vitality');
  const elCorrupt= document.getElementById('stat-corruption');
  const elXp     = document.getElementById('stat-xp');
  const elHealth = document.getElementById('stat-health');
  const elHunger = document.getElementById('stat-hunger');
  const elEnergy = document.getElementById('stat-energy');
  const elMood   = document.getElementById('stat-mood');
  const elKP     = document.getElementById('stat-kp');

  

  // HUD upgrades (created dynamically if missing)
  let elGoal1 = document.getElementById('next-goal-line1');
  let elGoal2 = document.getElementById('next-goal-line2');
  let elEquippedStrip = document.getElementById('equipped-strip');
const elLog    = document.getElementById('log');
  const elNotifyText = document.getElementById('notify-text');
  const elShopTicker = document.getElementById('shop-ticker');
  const elShopTickerText = document.getElementById('shop-ticker-text');

  const elActivityLabel  = document.getElementById('activity-label');
  const elAwaySign       = document.getElementById('away-sign');

  const elExploreOverlay = document.getElementById('explore-result');
  const elExploreBody    = document.getElementById('explore-body');
  const btnExploreClose  = document.getElementById('btn-explore-close');

  function isExploreResultsOpen() {
    return !!(elExploreOverlay && !elExploreOverlay.classList.contains('hidden'));
  }

  const btnFeed =
    document.getElementById('btn-feed') ||
    document.getElementById('btn-feed-rations');

  const btnMeditate = document.getElementById('btn-meditate');
  const btnStudy    = document.getElementById('btn-study');
  const btnRitual   = document.getElementById('btn-ritual');

  const btnExplore   = document.getElementById('btn-explore');
  const btnTrain     = document.getElementById('btn-train');
  const btnRest      = document.getElementById('btn-rest');
  const btnSacrifice = document.getElementById('btn-sacrifice');

  const btnLore      = document.getElementById('btn-lore');
  const loreOverlay  = document.getElementById('lore-overlay');
  const loreBody     = document.getElementById('lore-body');
  const loreList     = document.getElementById('lore-list');
  const btnLoreClose = document.getElementById('btn-lore-close');

  // MAIN MENU lore overlay buttons (JSON-driven)
  const btnMenuLore = document.getElementById('btn-menu-lore');
  const btnCloseMenuLore = document.getElementById('btn-menu-lore-close');

  // Legacy menu lore modal (if still present in older HTML)
  const legacyMenuLoreModal = document.getElementById("modal-menu-lore");

  const elRoomLabelGame = document.getElementById('room-label-game');

  const btnInventory = document.getElementById('btn-inventory');
  const btnCharacter = document.getElementById('btn-character');
  const btnShop = document.getElementById('btn-shop');

  // =============================================================
// Bottom menu toggles (Inventory / Character / Shop)
// Click again = close
// =============================================================
function setupBottomMenuToggles() {
  const toggle = (overlayId) => {
    const el = document.getElementById(overlayId);
    if (!el) {
      console.warn(`[toggle] missing #${overlayId}`);
      return;
    }
    el.classList.toggle('hidden');
    el.setAttribute('aria-hidden', el.classList.contains('hidden') ? 'true' : 'false');

    // Shop: refresh when opening
    if (overlayId === 'shop-overlay' && !el.classList.contains('hidden')) {
      if (typeof renderShop === 'function') renderShop();
    }

    // Character: re-render when opening (so stats populate)
    if (overlayId === 'character-overlay' && !el.classList.contains('hidden')) {
      if (window.WF_Character && typeof window.WF_Character.render === 'function') {
        window.WF_Character.render();
      }
    }
  };

  // Toggle open/close on button click
  document.getElementById('btn-inventory')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggle('inventory-overlay');
  });

  document.getElementById('btn-shop')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggle('shop-overlay');
  });

  document.getElementById('btn-character')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Prefer your character module (it creates the overlay if missing)
    if (window.WF_Character && typeof window.WF_Character.toggle === 'function') {
      window.WF_Character.toggle();
    } else {
      toggle('character-overlay');
    }
  });

  // Close buttons
  document.getElementById('inventory-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('inventory-overlay')?.classList.add('hidden');
  });

  document.getElementById('btn-shop-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('shop-overlay')?.classList.add('hidden');
  });

  document.getElementById('character-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('character-overlay')?.classList.add('hidden');
  });
}

// Export so bootAfterState can call it safely
window.setupBottomMenuToggles = setupBottomMenuToggles;

  // Fallback inventory overlay DOM (created if missing)
  let inventoryOverlay = document.getElementById('inventory-overlay');
  let inventoryBody = document.getElementById('inventory-body');
  let btnInventoryClose = document.getElementById('btn-inventory-close');

  // Fallback shop overlay DOM (created if missing)
  let shopOverlay = document.getElementById('shop-overlay');
  let shopBody = document.getElementById('shop-body');
  let btnShopClose = document.getElementById('btn-shop-close');

  let menuLoreOpenSeq = 0;

  // ==============================================================
  // Tower Rooms
  // ==============================================================

  const ROOM_IDS = ['entry', 'library', 'alchemy', 'quarters', 'observatory'];

  const ROOM_NAMES = {
    entry:       'Entry Hall',
    library:     'Library',
    alchemy:     'Alchemy Lab',
    quarters:    'Sleeping Quarters',
    observatory: 'High Observatory'
  };

  const EXPLORE_DURATION_SECONDS = 12;

  const EXPLORE_PANIC_LINES = [
    'He only had one small panic attack walking through the dark halls.',
    'At one point a door slammed behind him and he pretended not to jump.',
    'He spent a full minute standing very still, convincing himself the shadows were not moving.'
  ];

  const EXPLORE_LOOT_LINES = [
    'He comes back empty-handed, but insists the experience was “useful”.',
    'He returns with a heel of stale bread wrapped carefully in cloth.',
    'He found a robe someone forgot; it smells faintly of sage and chalk.',
    'He drags in a staff that might be legendary or might just be a very dramatic stick. “I found this in a broom closet,” he says.',
    'Tucked under his arm is a small, wide-eyed creature that may or may not now live in the tower. You will have to decide what to do with it later.'
  ];

  // ==============================================================
  // SIMPLE ROOM LOOT TABLES
  // ==============================================================

  const ROOM_LOOT_TABLES = {
    library: ['common_robe', 'common_staff', 'glyph_fragment'],
    alchemy: ['common_vial', 'uncommon_vial', 'rare_ink'],
    quarters: ['rations', 'common_cloak'],
    observatory: ['uncommon_staff', 'rare_robe', 'legendary_star_shard'],
    entry: ['rations', 'common_misc']
  };

  const ITEM_CATALOG = {
    common_staff: {
      type: 'staff', rarity: 'common', rarityLabel: 'Common',
      name: 'Common Staff',
      bonuses: { power: 1 }
    },
    uncommon_staff: {
      type: 'staff', rarity: 'uncommon', rarityLabel: 'Uncommon',
      name: 'Uncommon Staff',
      bonuses: { power: 2 }
    },
    common_robe: {
      type: 'robe', rarity: 'common', rarityLabel: 'Common',
      name: 'Common Robe',
      bonuses: { vitality: 1 }
    },
    rare_robe: {
      type: 'robe', rarity: 'rare', rarityLabel: 'Rare',
      name: 'Rare Robe',
      bonuses: { vitality: 3, insight: 1 }
    },
    common_cloak: {
      type: 'robe', rarity: 'common', rarityLabel: 'Common',
      name: 'Common Cloak',
      bonuses: { vitality: 1 }
    },
    common_vial: {
      type: 'misc', rarity: 'common', rarityLabel: 'Common',
      name: 'Common Vial',
      bonuses: {}
    },
    uncommon_vial: {
      type: 'misc', rarity: 'uncommon', rarityLabel: 'Uncommon',
      name: 'Uncommon Vial',
      bonuses: {}
    },
    rare_ink: {
      type: 'misc', rarity: 'rare', rarityLabel: 'Rare',
      name: 'Rare Ink',
      bonuses: {}
    },
    glyph_fragment: {
      type: 'misc', rarity: 'uncommon', rarityLabel: 'Uncommon',
      name: 'Glyph Fragment',
      bonuses: {}
    },
    legendary_star_shard: {
      type: 'misc', rarity: 'legendary', rarityLabel: 'Legendary',
      name: 'Legendary Star Shard',
      bonuses: {}
    },
    common_misc: {
      type: 'misc', rarity: 'common', rarityLabel: 'Common',
      name: 'Common Curio',
      bonuses: {}
    },
    rations: {
      type: 'rations', rarity: 'common', rarityLabel: 'Common',
      name: 'Rations',
      bonuses: {}
    },
    // --- Gems / Curios ---
    onyx: { type: 'misc', rarity: 'uncommon', rarityLabel: 'Uncommon', name: 'Onyx', bonuses: {} },
    black_tourmaline: { type: 'misc', rarity: 'uncommon', rarityLabel: 'Uncommon', name: 'Black Tourmaline', bonuses: {} },
    selenite: { type: 'misc', rarity: 'common', rarityLabel: 'Common', name: 'Selenite', bonuses: {} },
    turquoise: { type: 'misc', rarity: 'uncommon', rarityLabel: 'Uncommon', name: 'Turquoise', bonuses: {} },
    amethyst: { type: 'misc', rarity: 'uncommon', rarityLabel: 'Uncommon', name: 'Amethyst', bonuses: {} },
    ruby: { type: 'misc', rarity: 'rare', rarityLabel: 'Rare', name: 'Ruby', bonuses: {} },
    sapphire: { type: 'misc', rarity: 'rare', rarityLabel: 'Rare', name: 'Sapphire', bonuses: {} },
    emerald: { type: 'misc', rarity: 'rare', rarityLabel: 'Rare', name: 'Emerald', bonuses: {} },

  };

   const SHOP_ITEMS = [
  {
    id: 'lite_potion',
    name: 'Lite Potion',
    desc: 'A thin violet draught.',
    cost: 10,
    heal: 20,
    rarity: 'Common',
    type: 'consumable',
  },
  {
    id: 'potion',
    name: 'Potion',
    desc: 'A steady brew with a warm pulse.',
    cost: 20,
    heal: 45,
    rarity: 'Uncommon',
    type: 'consumable',
  },
  {
    id: 'strong_potion',
    name: 'Strong Potion',
    desc: 'Heavy and bright. The tower approves.',
    cost: 35,
    heal: 80,
    rarity: 'Rare',
    type: 'consumable',
  },

  // --- Food ---
  { id: 'ration_pack', name: 'Ration Pack', desc: 'A bundle of dry bread and salted meat.', cost: 15, amount: 3, rarity: 'Common', type: 'rations' },
  // --- Gear (catalog) ---
  { id: 'shop_common_staff', type: 'catalog', catalogId: 'common_staff', cost: 60, desc: 'A humble staff with a faint hum.' },
  { id: 'shop_uncommon_staff', type: 'catalog', catalogId: 'uncommon_staff', cost: 110, desc: 'A better grip. Sharper focus.' },
  { id: 'shop_common_cloak', type: 'catalog', catalogId: 'common_cloak', cost: 55, desc: 'A simple cloak to steady the form.' },
  { id: 'shop_uncommon_robe', type: 'catalog', catalogId: 'uncommon_robe', cost: 100, desc: 'Woven to protect the inner light.' },

  // --- Gems (catalog) ---
  { id: 'shop_selenite', type: 'catalog', catalogId: 'selenite', cost: 18, desc: 'Moon-white shard. Light as ash.' },
  { id: 'shop_onyx', type: 'catalog', catalogId: 'onyx', cost: 35, desc: 'A black stone that drinks glare.' },
  { id: 'shop_black_tourmaline', type: 'catalog', catalogId: 'black_tourmaline', cost: 35, desc: 'A warding stone. Rough and true.' },
  { id: 'shop_turquoise', type: 'catalog', catalogId: 'turquoise', cost: 45, desc: 'Blue-green charm with old stories.' },
  { id: 'shop_amethyst', type: 'catalog', catalogId: 'amethyst', cost: 55, desc: 'Violet clarity in a shard.' },
  { id: 'shop_ruby', type: 'catalog', catalogId: 'ruby', cost: 95, desc: 'Red heat. Rare trade-stone.' },
  { id: 'shop_sapphire', type: 'catalog', catalogId: 'sapphire', cost: 95, desc: 'Deep blue. Rare trade-stone.' },
  { id: 'shop_emerald', type: 'catalog', catalogId: 'emerald', cost: 110, desc: 'Green brilliance. Rare trade-stone.' },

];
const ITEM_DEFS = Object.fromEntries(SHOP_ITEMS.map(it => [it.id, it]));

  // ==============================================================
  // Limited-time shop specials (rare / legendary stock)
  // ==============================================================

  const SHOP_SPECIAL_OFFERS = [
    // Pulls from ITEM_CATALOG (buildCatalogItem)
    { offerId: 'rare_robe',           kind: 'catalog', catalogId: 'rare_robe',           cost: 120 },
    { offerId: 'rare_ink',            kind: 'catalog', catalogId: 'rare_ink',            cost: 90  },
    { offerId: 'glyph_fragment',      kind: 'catalog', catalogId: 'glyph_fragment',      cost: 60  },
    { offerId: 'legendary_star_shard',kind: 'catalog', catalogId: 'legendary_star_shard',cost: 250 }
  ];

  const SHOP_SPECIAL_DURATION_MS = 35_000;   // how long the offer lasts once it appears
  const SHOP_SPECIAL_CHECK_MIN_S = 25;       // roll window (seconds)
  const SHOP_SPECIAL_CHECK_MAX_S = 45;
  const SHOP_SPECIAL_CHANCE = 0.22;          // chance per roll

  let shopSpecialRollIn = randInt(SHOP_SPECIAL_CHECK_MIN_S, SHOP_SPECIAL_CHECK_MAX_S);

  function getOfferMeta(offer) {
    if (!offer) return null;
    if (offer.kind === 'catalog') {
      const base = ITEM_CATALOG[offer.catalogId];
      if (!base) return null;
      return {
        name: base.name || offer.catalogId,
        rarityLabel: base.rarityLabel || 'Rare',
        type: base.type || 'misc'
      };
    }
    return {
      name: offer.name || offer.offerId,
      rarityLabel: offer.rarity || 'Rare',
      type: offer.type || 'misc'
    };
  }

  function startShopSpecial(offer) {
    const meta = getOfferMeta(offer);
    if (!meta) return;
    state.shopSpecial = {
      offerId: offer.offerId,
      expiresAt: Date.now() + SHOP_SPECIAL_DURATION_MS
    };
    // Immediately show ticker
    showShopTicker(`🛒 LIMITED STOCK: ${meta.name} (${meta.rarityLabel}) — ${Math.ceil(SHOP_SPECIAL_DURATION_MS/1000)}s`);
    // If shop is already open, refresh it so the offer appears
    if (shopOverlay && !shopOverlay.classList.contains('hidden')) {
      renderShop();
    }
  }

  function clearShopSpecial() {
    state.shopSpecial = null;
    hideShopTicker();
    if (shopOverlay && !shopOverlay.classList.contains('hidden')) {
      renderShop();
    }
  }

  function getActiveShopSpecial() {
    const spec = state.shopSpecial;
    if (!spec || !spec.offerId) return null;

    const offer = SHOP_SPECIAL_OFFERS.find(o => o.offerId === spec.offerId);
    if (!offer) return null;

    const msLeft = (spec.expiresAt || 0) - Date.now();
    if (msLeft <= 0) {
      clearShopSpecial();
      return null;
    }

    return { offer, msLeft };
  }

  function tickShopSpecial(seconds) {
    // If active: update countdown & expire
    const active = getActiveShopSpecial();
    if (active) {
      const meta = getOfferMeta(active.offer);
      const sLeft = Math.max(0, Math.ceil(active.msLeft / 1000));
      if (meta) showShopTicker(`🛒 LIMITED STOCK: ${meta.name} (${meta.rarityLabel}) — ${sLeft}s`);

      // Keep the countdown live in the Shop overlay too (when open)
      if (shopOverlay && !shopOverlay.classList.contains('hidden') && shopBody) {
        const timerEl = shopBody.querySelector('[data-special-timer="1"]');
        if (timerEl) timerEl.textContent = `${sLeft}s left`;

        // Extra “something special is happening” urgency near the end
        const cardEl = shopBody.querySelector('.shop-item--special');
        if (cardEl) cardEl.classList.toggle('is-expiring', sLeft <= 10);
      }

      return;
    }

    // Not active: count down to next roll
    shopSpecialRollIn -= seconds;
    if (shopSpecialRollIn > 0) return;

    // Reset roll timer first (so even if start fails, we don't spam)
    shopSpecialRollIn = randInt(SHOP_SPECIAL_CHECK_MIN_S, SHOP_SPECIAL_CHECK_MAX_S);

    // Roll chance
    if (Math.random() > SHOP_SPECIAL_CHANCE) return;

    // Pick a random offer
    const offer = SHOP_SPECIAL_OFFERS[Math.floor(Math.random() * SHOP_SPECIAL_OFFERS.length)];
    if (offer) startShopSpecial(offer);
  }


  function buildCatalogItem(itemId) {
    const base = ITEM_CATALOG[itemId];
    if (!base) return null;

    return {
      id: `${itemId}-${Date.now()}-${Math.floor(Math.random()*9999)}`,
      type: base.type,
      rarity: base.rarity,
      rarityLabel: base.rarityLabel,
      name: base.name,
      bonuses: base.bonuses || {},
      catalogId: itemId
    };
  }

  function rollRoomTableLoot(roomId) {
    const table = ROOM_LOOT_TABLES[roomId];
    if (!table || !table.length) return null;
    const id = table[Math.floor(Math.random() * table.length)];
    return buildCatalogItem(id);
  }

  function computeDerivedStats(state) {
  const base = state.baseStats || { power: 0, atk: 0, def: 0, hp: 0, crit: 0 };
  const eq = state.equipped || {};

  // Example: staff gives power/atk
  let bonus = { power: 0, atk: 0, def: 0, hp: 0, crit: 0 };

  const add = (item) => {
    if (!item) return;
    const b = item.bonus || item.stats || {};
    bonus.power += (b.power || 0);
    bonus.atk   += (b.atk || 0);
    bonus.def   += (b.def || 0);
    bonus.hp    += (b.hp || 0);
    bonus.crit  += (b.crit || 0);
  };

  add(eq.staff);
  add(eq.robe);
  add(eq.ring);
  add(eq.weapon); // if you add later

  return {
    power: base.power + bonus.power,
    atk:   base.atk   + bonus.atk,
    def:   base.def   + bonus.def,
    hp:    base.hp    + bonus.hp,
    crit:  base.crit  + bonus.crit
  };
}

function renderAllUI() {
  // Safe UI refresh hook used by inventory.js / character.js
  const g = window.WF_GAME;
  const s = (g && typeof g.getState === 'function') ? g.getState() : null;
  if (!s) return;

  try { if (typeof updateUi === 'function') updateUi(); } catch (e) {}

  // If viewfinder overlays are present, ask them to re-render.
  try { if (window.WF_Inventory && typeof window.WF_Inventory.render === 'function') window.WF_Inventory.render(); } catch (e) {}
  try { if (window.WF_Character && typeof window.WF_Character.render === 'function') window.WF_Character.render(); } catch (e) {}
}

window.addEventListener('wf:update', () => {
  try { refreshWizardSpriteFromGear(); } catch (e) {}
  try { renderAllUI(); } catch (e) { /* keep game running */ }
});
// ==============================================================
  // ARPG-like procedural loot scaffolding
  // ==============================================================

  const RARITIES = [
    { id: 'common',    label: 'Common',    weight: 55, color: '#cfcfe8' },
    { id: 'uncommon',  label: 'Uncommon',  weight: 25, color: '#7ed957' },
    { id: 'rare',      label: 'Rare',      weight: 12, color: '#5aa6ff' },
    { id: 'magick',    label: 'Magick',    weight: 5,  color: '#d88cff' },
    { id: 'legendary', label: 'Legendary', weight: 2,  color: '#ffb35a' },
    { id: 'mythic',    label: 'Mythic',    weight: 1,  color: '#ff5ad9' }
  ];

  const ITEM_TYPES = ['staff', 'robe', 'ring'];

  const ROOM_LOOT_BIAS = {
    entry:       { staff: 1, robe: 1, ring: 0 },
    library:     { staff: 2, robe: 1, ring: 1 },
    alchemy:     { staff: 1, robe: 1, ring: 2 },
    quarters:    { staff: 0, robe: 2, ring: 1 },
    observatory: { staff: 2, robe: 0, ring: 2 }
  };

  const STAFF_NAMES = [
    'Ashen Rod', 'Wind-Thread Staff', 'Bone-Script Cane', 'Starfork', 'Grave-Lumen Wand'
  ];
  const ROBE_NAMES = [
    'Robe of Quiet Steps', 'Dustweave Vestment', 'Moon-Thread Robe', 'Sable Archivist Mantle'
  ];
  const RING_NAMES = [
    'Ring of Luck', 'Sigil Loop', 'Glimmer Band', 'Watcher’s Circle'
  ];

  function rollWeighted(list) {
    const total = list.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    for (const it of list) {
      r -= it.weight;
      if (r <= 0) return it;
    }
    return list[list.length - 1];
  }

  function pickRarity(extraFind = 0) {
    const boosted = RARITIES.map(r => {
      let w = r.weight;
      if (extraFind > 0) {
        if (r.id === 'rare') w += extraFind * 0.6;
        if (r.id === 'magick') w += extraFind * 0.35;
        if (r.id === 'legendary') w += extraFind * 0.15;
        if (r.id === 'mythic') w += extraFind * 0.08;
        if (r.id === 'common') w = Math.max(1, w - extraFind * 1.1);
      }
      return { ...r, weight: w };
    });
    return rollWeighted(boosted);
  }

  function pickItemTypeForRoom(roomId) {
    const bias = ROOM_LOOT_BIAS[roomId] || { staff: 1, robe: 1, ring: 1 };
    const pool = [];
    ITEM_TYPES.forEach(t => {
      const n = bias[t] || 1;
      for (let i = 0; i < n; i++) pool.push(t);
    });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function randomNameForType(type) {
    const list =
      type === 'staff' ? STAFF_NAMES :
      type === 'robe' ? ROBE_NAMES :
      RING_NAMES;
    return list[Math.floor(Math.random() * list.length)];
  }

  function buildItem(type, rarity) {
    const baseName = randomNameForType(type);
    const name = rarity.id === 'common'
      ? baseName
      : `${baseName} (${rarity.label})`;

    const bonuses = { power: 0, insight: 0, vitality: 0, luck: 0, spirit: 0 };

    if (type === 'staff') {
      bonuses.power =
        1 +
        (rarity.id === 'rare' ? 1 : 0) +
        (rarity.id === 'magick' ? 2 : 0) +
        (rarity.id === 'legendary' ? 3 : 0) +
        (rarity.id === 'mythic' ? 4 : 0);
    }
    if (type === 'robe') {
      bonuses.vitality =
        1 +
        (rarity.id === 'rare' ? 1 : 0) +
        (rarity.id === 'magick' ? 2 : 0) +
        (rarity.id === 'legendary' ? 3 : 0) +
        (rarity.id === 'mythic' ? 4 : 0);
      bonuses.insight =
        (rarity.id === 'magick' || rarity.id === 'legendary' || rarity.id === 'mythic') ? 1 : 0;
    }
    if (type === 'ring') {
      bonuses.luck =
        1 +
        (rarity.id === 'rare' ? 1 : 0) +
        (rarity.id === 'magick' ? 2 : 0) +
        (rarity.id === 'legendary' ? 3 : 0) +
        (rarity.id === 'mythic' ? 4 : 0);
      bonuses.spirit =
        (rarity.id === 'magick' || rarity.id === 'legendary' || rarity.id === 'mythic') ? 1 : 0;
    }

    return {
      id: `${type}-${Date.now()}-${Math.floor(Math.random()*9999)}`,
      type,
      rarity: rarity.id,
      rarityLabel: rarity.label,
      name,
      bonuses
    };
  }

  // ==============================================================
  // Book discovery tables
  // ==============================================================

  const DISCOVERABLE_SUBJECTS = ['tower', 'orders', 'goblins', 'dragons', 'wizardcraft'];

  const ROOM_BOOK_TABLES = {
    entry:       ['tower'],
    library:     ['tower', 'orders', 'goblins', 'dragons', 'wizardcraft'],
    alchemy:     ['wizardcraft', 'orders'],
    quarters:    ['tower'],
    observatory: ['dragons', 'wizardcraft', 'tower']
  };

  const SUBJECT_LORE_TIERS = {
    tower: [
      [
        'The tower is older than its current stones.',
        'Its rooms shift not by magic alone, but by memory.'
      ],
      [
        'Caretakers before you left marginal notes in ash-gray ink.',
        'Some floors are said to exist only on nights when the moon is thin.'
      ],
      [
        'A sealed stairwell is rumored to lead to a chamber that records every name ever spoken inside these walls.'
      ]
    ],
    orders: [
      [
        'The Orders are less a government and more a persistent echo.',
        'They regulate what the tower pretends is unregulated.'
      ],
      [
        'Some Orders were founded to protect the weak.',
        'Others were founded to define who the weak should be.'
      ],
      [
        'An unspoken war simmers between parchment law and blood-earned privilege.'
      ]
    ],
    goblins: [
      [
        'Goblins overwhelm the careless. Treat every skirmish like a numbers game.',
        'If your energy is low, delay the hunt—exhaustion is how goblins win.',
        'A simple staff or robe dramatically improves survival in early encounters.'
      ],
      [
        'Prioritize stamina management: feed if hunger is dipping before risky actions.',
        'Meditate to stabilize energy, then explore or study—avoid chaining risks while drained.',
        'Higher vitality reduces the punishment from bad rolls during hostile encounters.'
      ],
      [
        'Veteran notes: enter deeper halls only after you have at least one equipped gear piece.',
        'Luck helps you find better tools before the tower throws stronger threats at you.',
        'If injuries spike often, shift routine toward rest + steady upgrades before further exploration.'
      ]
    ],
    dragons: [
      [
        'Dragons do not hoard gold because they need it.',
        'They hoard it because memory sticks to metal.'
      ],
      [
        'A dragon’s first fire is said to ignite a private constellation only it can see.',
        'Some become scholars of the stars; others become hunters of them.'
      ],
      [
        'The oldest dragon texts imply there are “sleeping names” that can unmake kingdoms if sung correctly.'
      ]
    ],
    wizardcraft: [
      [
        'Wizardcraft is not a single discipline.',
        'It is a violent agreement between will and consequence.'
      ],
      [
        'Ritual circles serve as contracts.',
        'Meditation serves as the negotiation of the soul’s fine print.'
      ],
      [
        'A forbidden appendix describes a method of training spirit to read glyphs written in living light.'
      ]
    ]
  };

  function buildSubjectLoreText(subject, count) {
    const tiers = SUBJECT_LORE_TIERS[subject] || [];
    const safeCount = Math.max(0, count || 0);

    const paragraphs = [];
    const tierCount =
      safeCount >= 5 ? 3 :
      safeCount >= 3 ? 2 :
      safeCount >= 1 ? 1 :
      0;

    for (let i = 0; i < tierCount; i++) {
      const lines = tiers[i] || [];
      if (lines.length) paragraphs.push(lines.join(' '));
    }

    if (!paragraphs.length) {
      return 'The Codex has not yet recovered enough fragments to speak with confidence.';
    }

    return paragraphs.map(p => `<p>${p}</p>`).join('');
  }

  // ==============================================================
  // State
  // ==============================================================

  const state = {
    level: 1,
    xp: 0,
    gold: 50,
    shopSpecial: null,

    knowledgePoints: 0,

    health: 0,
    hunger: 100,
    energy: 0,
    mood: 'Dusty',

    alive: true,
    secondsAlive: 0,

    hungerFloat: 100,
    energyFloat: 0,
    healthFloat: 0,

    light: 0,
    dark: 0,

    feedCount: 0,
    meditateCount: 0,
    studyCount: 0,
    ritualCount: 0,

    idleSeconds: 0,

    sleepTimer: 0,

    power: 0,
    insight: 0,
    vitality: 0,
    corruption: 0,

    spirit: 0,
    spiritFloat: 0,
    spiritMax: 5,

    currentFormId: 'dustling',
    currentRoom: 'entry',

    isExploring: false,
    exploreSecondsLeft: 0,
    exploreTotalSeconds: 0,
    exploreStartEnergy: 0,
    exploreStartClock: '',
    exploreRoom: 'entry',

    rations: 3,
    lastRationDay: 1,

    inventory: [],
    equipped: {
      staff: null,
      robe: null,
      ring: null
    },

    notifyMode: 'thoughts',
    lastFedAt: -9999,

    lastAmbientThoughtAt: 0,
    lastAmbientThoughtType: '',

    discoveredLore: {
      tower: 0,
      orders: 0,
      goblins: 0,
      dragons: 0,
      wizardcraft: 0
    },

    orbFlags: {
      lore: false,
      journal: false,
      loot: false,
      alert: false,
      danger: false
    }
  };

  // ==============================================================
  // Survival tick values
  // ==============================================================

  const HUNGER_DECAY_PER_SEC = 0.06;
  const ENERGY_REGEN_PER_SEC = 0.02;
  const STARVATION_HEALTH_LOSS = 0.5;

  const DAY_LENGTH_SECONDS = 600;

  // ==============================================================
  // Day helpers
  // ==============================================================

  function getDayNumber() {
    return Math.floor(state.secondsAlive / DAY_LENGTH_SECONDS) + 1;
  }

  function getDayPhase() {
    const t = (state.secondsAlive % DAY_LENGTH_SECONDS) / DAY_LENGTH_SECONDS;
    if (t < 0.20) return 'Dawn';
    if (t < 0.50) return 'Day';
    if (t < 0.75) return 'Dusk';
    return 'Night';
  }

  function formatTowerClock() {
    const day     = getDayNumber();
    const phase   = getDayPhase();
    const within  = state.secondsAlive % DAY_LENGTH_SECONDS;
    const minutes = Math.floor(within / 60);
    const seconds = within % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    let emoji = '☀️';
    if (phase === 'Dusk' || phase === 'Night') emoji = '🌙';

    return {
      text: `Day ${day} • ${mm}:${ss} • ${phase}`,
      emoji
    };
  }

  function updateTowerTimeUi() {
    const info = formatTowerClock();
    if (elTowerTimeText)      elTowerTimeText.textContent      = info.text;
    if (elTowerTimeEmoji)     elTowerTimeEmoji.textContent     = info.emoji;
    if (elTowerTimeTextGame)  elTowerTimeTextGame.textContent  = info.text;
    if (elTowerTimeEmojiGame) elTowerTimeEmojiGame.textContent = info.emoji;
  }

  // ==============================================================
  // Max stats
  // ==============================================================

  function gearBonusStatLocal(state, key) {
  const eq = state.equipped || {};
  const staff = eq.staff, robe = eq.robe, ring = eq.ring;

  let v = 0;
  [staff, robe, ring].forEach(it => {
    if (it && it.bonuses && typeof it.bonuses[key] === 'number') v += it.bonuses[key];
  });
  return v;
}

function maxHealthFor(state) {
  // mirror renderer.js logic: base 40 + 6 per Vitality (including gear)
  const vit = (state.vitality || 0) + gearBonusStatLocal(state, 'vitality');
  return 40 + vit * 6;
}

function maxEnergy() {
  return 20 + effectiveInsight() * 4;
}

  function maxSpirit() {
    const ring = state.equipped && state.equipped.ring;
    const bonus = ring && ring.bonuses ? (ring.bonuses.spirit || 0) : 0;
    return (state.spiritMax || 5) + bonus;
  }

  function maxHealth() {
  return maxHealthFor(state);
}

  state.healthFloat = maxHealth();
  state.energyFloat = maxEnergy();
  state.spiritFloat = 0;

  state.health = Math.round(state.healthFloat);
  state.energy = Math.round(state.energyFloat);
  state.spirit = Math.round(state.spiritFloat);

  // ==============================================================
  // Logging
  // ==============================================================

  const logs = [];
  const MAX_LOG_LINES = 40;
  let lastFate = null;

  function playVoiceCue(_key) {}

  function formatTimeStamp() {
    const m = Math.floor(state.secondsAlive / 60);
    const s = state.secondsAlive % 60;
    return `[${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}]`;
  }

  function pushLog(msg) {
    const stamp = formatTimeStamp();
    logs.unshift(stamp + ' ' + msg);
    if (logs.length > MAX_LOG_LINES) logs.pop();
    if (elLog) elLog.innerHTML = logs.map(line => `<div>${line}</div>`).join('');

    if (elNotifyText && state.notifyMode === 'log') {
      elNotifyText.textContent = msg;
    }
    try {
      window.dispatchEvent(new CustomEvent('ns:legacy-log',{detail:{message:msg,secondsAlive:state.secondsAlive}}));
    } catch (_) {}
  }

  function pushThought(msg) {
    if (elNotifyText) elNotifyText.textContent = msg;
    const stamp = formatTimeStamp();
    logs.unshift(stamp + ' ' + msg);
    if (logs.length > MAX_LOG_LINES) logs.pop();
    if (elLog) elLog.innerHTML = logs.map(line => `<div>${line}</div>`).join('');
  }


  // ==============================================================
  // Shop ticker (bottom overlay in the viewfinder)
  // ==============================================================

  function showShopTicker(text) {
    if (!elShopTicker || !elShopTickerText) return;
    elShopTickerText.textContent = text || '';
    elShopTicker.classList.remove('hidden');
    elShopTicker.setAttribute('aria-hidden', 'false');
  }

  function hideShopTicker() {
    if (!elShopTicker) return;
    elShopTicker.classList.add('hidden');
    elShopTicker.setAttribute('aria-hidden', 'true');
    if (elShopTickerText) elShopTickerText.textContent = '';
  }



  // ==============================================================
  // Rations helpers
  // ==============================================================

  function getRations() {
    return Math.max(0, state.rations || 0);
  }

  function addRations(amount, logLine) {
    state.rations = Math.max(0, (state.rations || 0) + amount);
    if (logLine) pushLog(logLine);
  }

  // ==============================================================
  // Equipment helpers
  // ==============================================================

  function getEquipped(type) {
    return state.equipped ? state.equipped[type] : null;
  }

  function totalLuck() {
    const ring = getEquipped('ring');
    return ring && ring.bonuses ? (ring.bonuses.luck || 0) : 0;
  }

  function gearBonusStat(key) {
    const staff = getEquipped('staff');
    const robe  = getEquipped('robe');
    const ring  = getEquipped('ring');

    let v = 0;
    [staff, robe, ring].forEach(it => {
      if (it && it.bonuses && it.bonuses[key]) v += it.bonuses[key];
    });

    return v;
  }

  function effectivePower() {
    return state.power + gearBonusStat('power');
  }

  function effectiveVitality() {
    return state.vitality + gearBonusStat('vitality');
  }

  function effectiveInsight() {
    return state.insight + gearBonusStat('insight');
  }

  function autoEquipIfBetter(item) {
    if (!item || !item.type) return;

    if (item.type !== 'staff' && item.type !== 'robe' && item.type !== 'ring') {
      pushLog(`He stores ${item.name}.`);
      return;
    }

    const slot = item.type;
    const current = getEquipped(slot);

    const score = (it) => {
      if (!it) return 0;
      const b = it.bonuses || {};
      return (b.power||0) + (b.vitality||0) + (b.insight||0) + (b.luck||0) + (b.spirit||0);
    };

    if (!current || score(item) > score(current)) {
      state.equipped[slot] = item;
      pushLog(`He equips ${item.name}.`);
      try { refreshWizardSpriteFromGear(true); } catch (e) {}
      setOrb('loot', true, { pulse: true });
    } else {
      pushLog(`He stores ${item.name} for later.`);
      setOrb('loot', true, { pulse: true });
    }
  }

  // ==============================================================
  // Inventory overlay auto-creation
  // ==============================================================

  function ensureInventoryOverlayExists() {
    // Prefer the real HTML overlay if it exists
if (!inventoryOverlay) inventoryOverlay = document.getElementById('inventory-overlay');
if (!btnInventoryClose) btnInventoryClose =
  document.getElementById('inventory-close') || document.getElementById('btn-inventory-close');

// Pick one place to render inventory for now (use your Items tab list)
if (!inventoryBody) inventoryBody =
  document.getElementById('inv-items-list') || document.getElementById('inventory-body');

// Wire close button once
if (btnInventoryClose && !btnInventoryClose.__wfBound) {
  btnInventoryClose.__wfBound = true;
  btnInventoryClose.addEventListener('click', closeInventory);
}

// If we have the HTML pieces, stop here (do NOT rebuild/replace your overlay)
if (inventoryOverlay && inventoryBody && btnInventoryClose) return;
    if (inventoryOverlay && inventoryBody && btnInventoryClose) return;

    if (!inventoryOverlay) {
      inventoryOverlay = document.createElement('div');
      inventoryOverlay.id = 'inventory-overlay';
      inventoryOverlay.className = 'hidden';
      inventoryOverlay.style.position = 'fixed';
      inventoryOverlay.style.inset = '0';
      inventoryOverlay.style.background = 'rgba(6, 5, 12, 0.65)';
      inventoryOverlay.style.backdropFilter = 'blur(6px)';
      inventoryOverlay.style.zIndex = '9999';
      inventoryOverlay.style.display = 'flex';
      inventoryOverlay.style.alignItems = 'center';
      inventoryOverlay.style.justifyContent = 'center';
      document.body.appendChild(inventoryOverlay);
    }

    const card = document.createElement('div');
    card.style.width = 'min(520px, 92vw)';
    card.style.maxHeight = '80vh';
    card.style.overflow = 'auto';
    card.style.background = 'linear-gradient(180deg, #1a1430, #0b0818)';
    card.style.border = '1px solid #3f325f';
    card.style.borderRadius = '12px';
    card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
    card.style.padding = '14px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '10px';

    const h = document.createElement('div');
    h.textContent = 'Inventory';
    h.style.fontSize = '18px';
    h.style.fontWeight = '700';
    h.style.color = '#f4f0ff';

    btnInventoryClose = document.createElement('button');
    btnInventoryClose.id = 'btn-inventory-close';
    btnInventoryClose.textContent = 'Close';
    btnInventoryClose.style.padding = '6px 10px';
    btnInventoryClose.style.borderRadius = '8px';
    btnInventoryClose.style.border = '1px solid #3f325f';
    btnInventoryClose.style.background = '#120d24';
    btnInventoryClose.style.color = '#f4f0ff';
    btnInventoryClose.style.cursor = 'pointer';

    header.appendChild(h);
    header.appendChild(btnInventoryClose);

    inventoryBody = document.createElement('div');
    inventoryBody.id = 'inventory-body';
    inventoryBody.style.marginTop = '10px';

    card.appendChild(header);
    card.appendChild(inventoryBody);

    inventoryOverlay.innerHTML = '';
    inventoryOverlay.appendChild(card);

    btnInventoryClose.addEventListener('click', closeInventory);
  }

  function notifyInventoryChanged() {
    if (inventoryOverlay && !inventoryOverlay.classList.contains('hidden')) {
      renderInventory();
    }
    const api = window.WFInventory || window.InventoryUI;
    if (api) {
      if (typeof api.onStateChanged === 'function') {
        api.onStateChanged({ state });
      } else if (typeof api.refresh === 'function') {
        api.refresh({ state });
      } else if (typeof api.render === 'function') {
        api.render({ state });
      }
    }
  }

  function renderInventory() {
    ensureInventoryOverlayExists();
    if (!inventoryBody) return;

    const inv = state.inventory || [];
    if (!inv.length) {
      inventoryBody.innerHTML = '<p style="color:#d9d3ff;">The satchel is empty.</p>';
      return;
    }

    const rows = inv.map(it => {
      const isGear = (it.type === 'staff' || it.type === 'robe' || it.type === 'ring');
      const bonuses = it.bonuses || {};
      const bonusText = Object.keys(bonuses)
        .filter(k => bonuses[k])
        .map(k => `${k}+${bonuses[k]}`)
        .join(' • ');

      let btn = '';

if (isGear) {
  btn = `<button data-equip="${it.id}" class="inv-equip-btn"
            style="padding:4px 8px;border-radius:8px;border:1px solid #3f325f;background:#120d24;color:#f4f0ff;cursor:pointer;">
            Equip
         </button>`;
} else if (it && it.isConsumable && it.type === 'potion') {
  const healAmt = Number(it.heal || 0);
  btn = `<button data-use="${it.id}" class="inv-use-btn"
            style="padding:4px 8px;border-radius:8px;border:1px solid #3f325f;background:#120d24;color:#f4f0ff;cursor:pointer;">
            Use (+${healAmt} HP)
         </button>`;
}

      return `
        <div class="inv-row"
             style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;
                    padding:8px 6px;border-bottom:1px solid rgba(120,100,180,0.25);">
          <div class="inv-name" style="color:#f4f0ff;">
            <strong>${it.name}</strong>
            ${bonusText ? `<div style="font-size:11px;color:#bfb6ff;margin-top:2px;">${bonusText}</div>` : ''}
          </div>
          <div class="inv-type" style="font-size:11px;color:#c9c2ff;text-transform:uppercase;">
            ${it.type}
          </div>
          <div class="inv-actions">${btn}</div>
        </div>
      `;
    });

    inventoryBody.innerHTML = rows.join('');

    // Bind once using event delegation (prevents nesting bugs + duplicate listeners)
if (inventoryBody.dataset.bound !== '1') {
  inventoryBody.dataset.bound = '1';

  inventoryBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-equip], button[data-use]');
    if (!btn) return;

    // EQUIP
    const equipId = btn.getAttribute('data-equip');
    if (equipId) {
      const inv = state.inventory || [];
      const item = inv.find(x => x.id === equipId);
      if (!item) return;

      state.equipped[item.type] = item;
      pushLog(`He equips ${item.name}.`);
      setOrb('loot', true, { pulse: true });
      updateUi();
      renderInventory();
      return;
    }

    // USE (POTION)
    const useId = btn.getAttribute('data-use');
    if (useId) {
      if (!state.alive) return;

      const invNow = state.inventory || [];
      const idx = invNow.findIndex(x => x.id === useId);
      if (idx < 0) return;

      const item = invNow[idx];
      const healAmt = Number(item.heal || 0);

      if (healAmt <= 0) {
        pushLog(`${item.name} fizzles. (No healing value set.)`);
        return;
      }

      const before = Math.round(state.healthFloat || state.health || 0);

      state.healthFloat = clamp((state.healthFloat || 0) + healAmt, 0, maxHealth());
      state.health = Math.round(state.healthFloat);

      // REMOVE the consumed item
      invNow.splice(idx, 1);
      state.inventory = invNow;

      const after = state.health;
      pushLog(`He drinks ${item.name}. Health: ${before} → ${after}.`);

      setOrb('alert', true, { pulse: true });
      notifyInventoryChanged();
      updateUi();
      renderInventory();
      return;
    }
  });
}

  }

  function openInventory() {
    const api = window.WFInventory || window.InventoryUI;
    if (api && typeof api.open === 'function') {
      api.open({ state, pushLog, setOrb, updateUi });
      return;
    }
    ensureInventoryOverlayExists();
    renderInventory();
    if (!inventoryOverlay) return;
    inventoryOverlay.classList.remove('hidden');
  }

  function closeInventory() {
    if (!inventoryOverlay) return;
    inventoryOverlay.classList.add('hidden');
  }

  // ==============================================================
  // Shop overlay
  // ==============================================================

  function ensureShopOverlayExists() {
    // Prefer the real HTML overlay if it exists
if (!shopOverlay) shopOverlay = document.getElementById('shop-overlay');
if (!btnShopClose) btnShopClose = document.getElementById('btn-shop-close');

// Your HTML uses #shop-list, renderer fallback uses #shop-body — support both
if (!shopBody) shopBody = document.getElementById('shop-list') || document.getElementById('shop-body');

// Wire close button once
if (btnShopClose && !btnShopClose.__wfBound) {
  btnShopClose.__wfBound = true;
  btnShopClose.addEventListener('click', closeShop);
}

if (shopOverlay && shopBody && btnShopClose) return;
  if (shopOverlay && shopBody && btnShopClose) return;

  // Pick a host that matches your game "viewfinder"
  const host = getGameFrameEl(); // you already have this helper

  if (!shopOverlay) {
    shopOverlay = document.createElement('div');
    shopOverlay.id = 'shop-overlay';
    shopOverlay.className = 'hidden';

    // IMPORTANT: anchor to the host instead of the whole window
    shopOverlay.style.position = (host === document.body) ? 'fixed' : 'absolute';
    shopOverlay.style.inset = '0';

    shopOverlay.style.background = 'rgba(6, 5, 12, 0.65)';
    shopOverlay.style.backdropFilter = 'blur(6px)';
    shopOverlay.style.zIndex = '9999';
    shopOverlay.style.display = 'flex';
    shopOverlay.style.alignItems = 'center';
    shopOverlay.style.justifyContent = 'center';

    // Ensure host can contain absolutely-positioned overlays
    if (host !== document.body) {
      const cs = window.getComputedStyle(host);
      if (cs.position === 'static') host.style.position = 'relative';
      host.appendChild(shopOverlay);
    } else {
      document.body.appendChild(shopOverlay);
    }
  }

  const card = document.createElement('div');

  // Fit inside the viewfinder with padding, and scroll internally
  card.style.width = 'min(480px, 92%)';
  card.style.height = 'calc(100% - 28px)';
  card.style.maxHeight = 'calc(100% - 28px)';

  card.style.overflow = 'hidden';              // prevent card itself from growing
  card.style.display = 'flex';                 // key: allow header + body layout
  card.style.flexDirection = 'column';

  card.style.background = 'linear-gradient(180deg, #1a1430, #0b0818)';
  card.style.border = '1px solid #3f325f';
  card.style.borderRadius = '12px';
  card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
  card.style.padding = '12px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '10px';
  header.style.flex = '0 0 auto';              // header stays fixed

  const h = document.createElement('div');
  h.textContent = 'Tower Shop';
  h.style.fontSize = '18px';
  h.style.fontWeight = '700';
  h.style.letterSpacing = '0.04em';
  h.style.textTransform = 'uppercase';
  h.style.color = '#f7f3ff';

  const goldSpan = document.createElement('div');
  goldSpan.id = 'shop-gold-display';
  goldSpan.style.fontSize = '12px';
  goldSpan.style.color = '#e2d7ff';

  btnShopClose = document.createElement('button');
  btnShopClose.id = 'btn-shop-close';
  btnShopClose.textContent = 'Close';
  btnShopClose.style.padding = '6px 10px';
  btnShopClose.style.borderRadius = '8px';
  btnShopClose.style.border = '1px solid #3f325f';
  btnShopClose.style.background = '#120d24';
  btnShopClose.style.color = '#f4f0ff';
  btnShopClose.style.cursor = 'pointer';

  header.appendChild(h);
  header.appendChild(goldSpan);
  header.appendChild(btnShopClose);

  shopBody = document.createElement('div');
  shopBody.id = 'shop-body';
  shopBody.style.marginTop = '10px';
  shopBody.style.flex = '1 1 auto';            // body takes remaining space
  shopBody.style.overflow = 'auto';            // scroll list
  shopBody.style.minHeight = '0';              // IMPORTANT for flex scroll areas

  card.appendChild(header);
  card.appendChild(shopBody);

  shopOverlay.innerHTML = '';
  shopOverlay.appendChild(card);

  btnShopClose.addEventListener('click', closeShop);
}

  function renderShop() {
  ensureShopOverlayExists();
  if (!shopBody) return;

  const gold = state.gold || 0;
  const rows = [];

  // Limited-time special
  const active = getActiveShopSpecial();
  if (active) {
    const meta = getOfferMeta(active.offer);
    const afford = gold >= active.offer.cost;
    const sLeft = Math.max(0, Math.ceil(active.msLeft / 1000));

    const rarityLabel = (meta && meta.rarityLabel) ? meta.rarityLabel : 'Rare';
    const raritySlug = String(rarityLabel).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    rows.push(`
      <div class="shop-item shop-item--special" data-rarity="${raritySlug}" data-special="1">
        <div class="shop-left">
          <div class="shop-name">⭐ LIMITED: ${meta ? meta.name : active.offer.offerId}</div>
          <div class="shop-desc">This stock fades soon. Claim it before it vanishes.</div>
          <div class="shop-meta">
            <span class="shop-cost">Cost: ${active.offer.cost} gold</span>
            <span class="shop-cost shop-rarity" data-special-rarity="1">${rarityLabel}</span>
            <span class="shop-cost shop-timer" data-special-timer="1" aria-live="polite">${sLeft}s left</span>
          </div>
        </div>
        <div class="shop-right">
          <button class="shop-buy" data-special-offer-id="${active.offer.offerId}" ${afford ? '' : 'disabled'}>Buy</button>
        </div>
      </div>
    `);
  }

  // Normal shop items
  rows.push(...SHOP_ITEMS.map(it => {
    const afford = gold >= it.cost;

    // Catalog items (gear/gems)
    if (it.type === 'catalog') {
      const base = ITEM_CATALOG[it.catalogId];
      const name = (base && base.name) ? base.name : it.catalogId;
      const rarityLabel = (base && base.rarityLabel) ? base.rarityLabel : 'Common';
      const typeLabel = (base && base.type) ? base.type : 'item';

      return `
        <div class="shop-item">
          <div class="shop-left">
            <div class="shop-name">${name}</div>
            ${it.desc ? `<div class="shop-desc">${it.desc}</div>` : ''}
            <div class="shop-meta">
              <span class="shop-cost">Cost: ${it.cost} gold</span>
              <span class="shop-cost">${typeLabel}</span>
              <span class="shop-cost">${rarityLabel}</span>
            </div>
          </div>
          <div class="shop-right">
            <button class="shop-buy" data-item-id="${it.id}" ${afford ? '' : 'disabled'}>Buy</button>
          </div>
        </div>
      `;
    }

    // Rations
    if (it.type === 'rations') {
      return `
        <div class="shop-item">
          <div class="shop-left">
            <div class="shop-name">${it.name}</div>
            ${it.desc ? `<div class="shop-desc">${it.desc}</div>` : ''}
            <div class="shop-meta">
              <span class="shop-cost">Cost: ${it.cost} gold</span>
              <span class="shop-cost">Food: +${Number(it.amount || 1)} rations</span>
              <span class="shop-cost">${it.rarity}</span>
            </div>
          </div>
          <div class="shop-right">
            <button class="shop-buy" data-item-id="${it.id}" ${afford ? '' : 'disabled'}>Buy</button>
          </div>
        </div>
      `;
    }

    // Potions (default)
    return `
      <div class="shop-item">
        <div class="shop-left">
          <div class="shop-name">${it.name}</div>
          ${it.desc ? `<div class="shop-desc">${it.desc}</div>` : ''}
          <div class="shop-meta">
            <span class="shop-cost">Cost: ${it.cost} gold</span>
            <span class="shop-cost">Heal: +${it.heal}</span>
            <span class="shop-cost">${it.rarity}</span>
          </div>
        </div>
        <div class="shop-right">
          <button class="shop-buy" data-item-id="${it.id}" ${afford ? '' : 'disabled'}>Buy</button>
        </div>
      </div>
    `;
  }));
  shopBody.innerHTML = rows.join('');

  const goldSpan = document.getElementById('shop-gold-display');
  if (goldSpan) goldSpan.textContent = `Gold: ${gold}`;

  if (shopBody.dataset.bound !== '1') {
    shopBody.dataset.bound = '1';
    shopBody.addEventListener('click', (e) => {
      const specialBtn = e.target.closest('button.shop-buy[data-special-offer-id]');
      if (specialBtn && !specialBtn.disabled) {
        buySpecialOffer(specialBtn.getAttribute('data-special-offer-id'));
        return;
      }

      const btn = e.target.closest('button.shop-buy[data-item-id]');
      if (!btn || btn.disabled) return;
      buyShopItem(btn.getAttribute('data-item-id'));
    });
  }
}

  function buyShopItem(itemId) {
  const item = SHOP_ITEMS.find(x => x.id === itemId);
  if (!item) return;

  const goldHave = Number(state.gold || 0);

  if (goldHave < item.cost) {
    pushLog('He fumbles for coins he does not have.');
    setOrb('alert', true, { pulse: true });
    return;
  }

  state.gold = goldHave - Number(item.cost || 0);

  // -------------------------
  // Food / rations purchase
  // -------------------------
  if (item.type === 'rations') {
    const amt = Math.max(1, Math.floor(Number(item.amount || 1)));
    state.rations = (Number(state.rations) || 0) + amt;

    pushLog(`He buys ${item.name}. (+${amt} rations)`);
    renderShop();
    updateUi();
    try { window.dispatchEvent(new Event('wf:update')); } catch (e) {}
    return;
  }

  // -------------------------
  // Catalog purchase (gear/gems)
  // -------------------------
  if (item.type === 'catalog') {
    if (!Array.isArray(state.inventory)) state.inventory = [];

    const bought = buildCatalogItem(item.catalogId);
    if (bought) {
      state.inventory.push(bought);

      if (typeof autoEquipIfBetter === 'function') {
        autoEquipIfBetter(bought);
      }

      pushLog(`He buys ${bought.name}. It vanishes into the satchel.`);
      notifyInventoryChanged();
    } else {
      pushLog('The item slips between realities. Nothing happens.');
    }

    renderShop();
    updateUi();
    try { window.dispatchEvent(new Event('wf:update')); } catch (e) {}
    return;
  }

  // -------------------------
  // Potion purchase (default)
  // -------------------------
  const potion = {
    id: item.id + '_' + Date.now(),
    name: item.name,
    type: 'potion',
    rarity: item.rarity || 'Common',
    heal: Number(item.heal || 0),
    bonuses: {},
    isConsumable: true
  };

  if (!Array.isArray(state.inventory)) state.inventory = [];
  state.inventory.push(potion);
  pushLog(`He buys ${item.name}. It vanishes into the satchel.`);
  notifyInventoryChanged();
  renderShop();
  updateUi();
  try { window.dispatchEvent(new Event('wf:update')); } catch (e) {}
}

function buySpecialOffer(offerId) {
    const active = getActiveShopSpecial();
    if (!active || !active.offer || active.offer.offerId !== offerId) return;

    const offer = active.offer;
    const meta = getOfferMeta(offer);

    if ((state.gold || 0) < offer.cost) {
      pushLog('He fumbles for coins he does not have.');
      setOrb('alert', true, { pulse: true });
      return;
    }

    state.gold = (state.gold || 0) - offer.cost;

    if (offer.kind === 'catalog') {
      const item = buildCatalogItem(offer.catalogId);
      if (item) {
        state.inventory.push(item);
        pushLog(`He buys ${meta ? meta.name : offer.offerId}. It hums with quiet power.`);
      } else {
        pushLog('The item slips between realities. Nothing happens.');
      }
    } else if (offer.kind === 'consumable') {
      const potion = {
        id: (offer.offerId || 'special') + '_' + Date.now(),
        name: meta ? meta.name : (offer.name || 'Special Item'),
        type: 'potion',
        rarity: meta ? meta.rarityLabel : (offer.rarity || 'Rare'),
        heal: Number(offer.heal || 0),
        bonuses: {},
        isConsumable: true
      };
      state.inventory.push(potion);
      pushLog(`He buys ${potion.name}. It vanishes into the satchel.`);
    }

    // One-and-done: clear the special after purchase
    clearShopSpecial();

    notifyInventoryChanged();
    renderShop();
    updateUi();
  }


  function openShop() {
    ensureShopOverlayExists();
    renderShop();
    if (!shopOverlay) return;
    shopOverlay.classList.remove('hidden');
  }

  function closeShop() {
    if (!shopOverlay) return;
    shopOverlay.classList.add('hidden');
  }

  
  // ==============================================================
  // Character external hook
  // ==============================================================

  function openCharacter() {
    const api = window.WFCharacter || window.CharacterUI;
    if (api && typeof api.open === 'function') {
      api.open({ state, pushLog, setOrb, updateUi });
      return;
    }
    pushLog('Character screen is not bound yet. This will awaken soon.');
    setOrb('alert', true, { pulse: true });
  }

  // ==============================================================
  // Movement flavor
  // ==============================================================

  function moveToRandomRoom(fromExplore) {
    if (!state.currentRoom) state.currentRoom = 'entry';

    const candidates = ROOM_IDS.filter(id => id !== state.currentRoom);
    const next = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : state.currentRoom;

    state.currentRoom = next;

    const niceName = ROOM_NAMES[next] || 'somewhere in the tower';
    const N = (state.name && state.name.trim()) || (window.WIZARD_NAME && String(window.WIZARD_NAME).trim()) || 'The Dustling';
    const roomMove = {
      library: [
        `${N} disappears between the chained shelves of the Library; a little later, a ladder rolls by itself somewhere in the dark.`,
        `The tower loses track of ${N} for a moment. He is found in the Library with dust on his sleeves and one book lying open that he swears he did not touch.`,
        `${N} has gone to the Library. From the hall comes the dry whisper of pages turning long after his footsteps stop.`
      ],
      alchemy: [
        `${N} follows the smell of copper and bitter herbs into the Alchemy Lab. Glass answers glass behind the closed door.`,
        `A thin green light leaks beneath the Alchemy Lab door. ${N} is inside, rearranging bottles whose labels have faded to ghosts.`,
        `${N} wanders into the Alchemy Lab; soon the tower smells faintly of rain, vinegar, and something metallic.`
      ],
      observatory: [
        `${N} climbs toward the High Observatory. The stairwell grows colder with every turn.`,
        `By the time you notice his absence, ${N} is beneath the Observatory dome, watching a star that does not appear on the chart.`,
        `${N} has climbed to the High Observatory. Above him, the old brass rings begin moving without being wound.`
      ],
      entry: [
        `${N} returns to the Entry Hall and stands beneath the old arch as though listening for someone on the other side.`,
        `Footsteps descend through the Spire. ${N} appears again in the Entry Hall, carrying the tower's cold with him.`,
        `${N} drifts back to the Entry Hall. For several breaths he simply watches the door.`
      ]
    };
    const pool = roomMove[next] || [
      `${N} leaves without announcement and is later found in the ${niceName.toLowerCase()}.`,
      `The tower carries ${N}'s footsteps elsewhere. He has moved into the ${niceName.toLowerCase()}.`
    ];
    pushLog(pool[Math.floor(Math.random() * pool.length)]);

    updateUi();
  }

  function maybeWanderTower() {
    if (!state.alive) return;
    if (state.idleSeconds < 60) return;
    if (state.idleSeconds % 30 !== 0) return;
    if (Math.random() > 0.4) return;
    moveToRandomRoom(false);
  }

  function maybePushAmbientThought() {
    if (!state.alive) return;
    if (state.idleSeconds < 20 || state.idleSeconds % 5 !== 0 || Math.random() > 0.42) return;

    const now = state.secondsAlive;
    if (now - (state.lastAmbientThoughtAt || 0) < 12) return;

    const N = (state.name && state.name.trim()) || (window.WIZARD_NAME && String(window.WIZARD_NAME).trim()) || 'The Dustling';
    const room = state.currentRoom || 'entry';
    let type = 'neutral';
    let options = [];

    if (state.hunger < 25) {
      type='hungry';
      options=[
        `${N} presses a hand to his stomach. "Even revelation is difficult on an empty belly."`,
        `${N} pauses at the smell of the pantry stores, then forces himself onward. Hunger has begun making decisions for him.`,
        `For the third time, ${N} checks the ration shelf. He closes it more carefully than before.`,
        `${N}'s concentration breaks with an audible growl from his stomach. "Fine," he tells it. "I heard you."`
      ];
      playVoiceCue('idle_hungry');
    } else if (state.energy < 20) {
      type='tired';
      options=[
        `${N} catches himself reading the same line twice. The letters have begun to swim.`,
        `${N} leans against the cold stone and shuts his eyes for what he insists will be only a moment.`,
        `A candle gutters beside ${N}. He watches it with the solemn sympathy of someone nearly as exhausted.`,
        `${N} rubs the bridge of his nose. "Tomorrow's mind may understand what tonight's cannot."`
      ];
      playVoiceCue('idle_tired');
    } else if (state.spirit >= 2) {
      type='spirit';
      options=[
        `${N} holds his breath. For one impossible instant, the glyphs seem to breathe in his place.`,
        `"There is a rhythm under the stone," ${N} whispers. "I couldn't hear it before."`,
        `${N} traces an old mark in the mortar without touching it. A faint warmth follows his fingertip.`,
        `The silence around ${N} changes pitch. He notices. The tower notices that he notices.`
      ];
      playVoiceCue('idle_spirit');
    } else {
      type='lonely';
      const byRoom={
        library:[
          `${N} reads a marginal note written in a dead hand, then quietly answers it aloud.`,
          `A book settles somewhere above. ${N} looks up. "You could at least tell me which shelf."`,
          `${N} finds a pressed black flower between two pages. He studies it longer than the text.`,
          `"Who chained all of these?" ${N} asks the Library. The chains give a small metallic answer.`
        ],
        alchemy:[
          `${N} lifts a stoppered vial toward the light. "That is definitely moving." He puts it back.`,
          `Something clicks inside the Alchemy Lab wall. ${N} waits. It does not click again.`,
          `${N} writes a careful label, considers it, then adds a second warning beneath the first.`,
          `A blue flame briefly appears beneath an empty vessel. ${N} decides not to mention it to anyone.`
        ],
        observatory:[
          `${N} counts seven familiar stars and an eighth that should not be there.`,
          `"If you can see me," ${N} tells the night through the Observatory glass, "you have the advantage."`,
          `The brass orrery advances one notch by itself. ${N} slowly removes his hand from the table.`,
          `${N} watches the moon cross a cracked pane and wonders which of them the tower is actually measuring.`
        ],
        entry:[
          `${N} hears a knock from the far side of the great door. There is no second knock.`,
          `"I wonder who stood here before me," ${N} says, studying the worn stones beneath his boots.`,
          `${N} tests the iron latch, not to leave, but to make certain something else cannot enter.`,
          `Wind moves through the Entry Hall though every door is shut. ${N} turns toward it anyway.`
        ]
      };
      options=(byRoom[room]||[
        `${N} stops walking. Somewhere deeper in the Spire, something has matched his footsteps.`,
        `${N} whispers his own name once, as if testing whether the tower has learned it yet.`,
        `For a while ${N} says nothing. The tower fills the silence for him.`
      ]);
      playVoiceCue('idle_lonely');
    }

    if (type === state.lastAmbientThoughtType && now - state.lastAmbientThoughtAt < 24) return;
    state.lastAmbientThoughtAt = now;
    state.lastAmbientThoughtType = type;
    pushThought(options[Math.floor(Math.random() * options.length)]);
  }

  // ==============================================================
  // Milestones & Rare Events
  // ==============================================================

  const unlockedMilestones = new Set();
  const triggeredEvents    = new Set();

  function unlockMilestone(id, name, description) {
    if (unlockedMilestones.has(id)) return;
    unlockedMilestones.add(id);

    if (!state.milestones) state.milestones = [];
    state.milestones.push({ id, name, description, atSeconds: state.secondsAlive });

    pushLog(description || `The Codex quietly inks a new page: "${name}".`);
    setOrb('alert', true, { pulse: true });
  }

  function alignmentScore() {
    return state.light - state.dark;
  }

  function checkMilestones() {
    if (!state.alive) return;

    const day    = getDayNumber();
    const align  = alignmentScore();
    const level  = state.level;
    const rituals = state.ritualCount || 0;
    const feeds   = state.feedCount   || 0;

    if (day >= 3) {
      unlockMilestone('first-vigil', 'First Vigil',
        'The Codex marks "First Vigil": he has survived three full tower days under your care.');
    }
    if (level >= 3) {
      unlockMilestone('first-ascent', 'First Ascent',
        'A neat note appears in the margin: "First Ascent"—the day he stopped being just a dustling.');
    }
    if (rituals >= 3) {
      unlockMilestone('first-rites', 'First Rites',
        'The deeper pages darken slightly. "First Rites" is written in ink that never quite dries.');
    }
    if (feeds >= 10) {
      unlockMilestone('stew-keeper', 'Stew Keeper',
        'Another hand—warmer, friendlier—adds "Stew Keeper" beside your name. At least you kept him fed.');
    }
    if (align >= 6) {
      unlockMilestone('tilt-light', 'Leaning Toward Light',
        'The tower underlines several entries in gold. It has noticed the shape of his kindness.');
    }
    if (align <= -6) {
      unlockMilestone('tilt-dark', 'Leaning Toward Shadow',
        'A colder ink circles your more ruthless choices. "Leaning Toward Shadow," the Codex observes.');
    }
  }

  function triggerEventOnce(id, fn) {
    if (triggeredEvents.has(id)) return;
    triggeredEvents.add(id);
    fn();
  }

  function checkRareEvents() {
    if (!state.alive) return;

    const day    = getDayNumber();
    const phase  = getDayPhase();
    const roomId = state.currentRoom || 'entry';

    if (day >= 2 && phase === 'Night' && state.meditateCount >= 3) {
      triggerEventOnce('dream-visitor', () => {
        pushLog('That night, something knocks from the inside of his dreams. He wakes knowing a sigil he never studied.');
        setOrb('lore', true, { pulse: true });
      });
    }

    if (roomId === 'library' && state.studyCount >= 5 && state.dark >= 3) {
      triggerEventOnce('ink-backwards', () => {
        pushLog('On one page, a line of ink drags itself backward, rewriting a sentence you would rather not have read.');
        setOrb('lore', true, { pulse: true });
      });
    }

    if (state.hunger === 0 && state.health < maxHealth() * 0.4) {
      triggerEventOnce('tower-judges', () => {
        pushLog('A colder hand adds a note in the margin: "Caretaker: inattentive?" The tower is keeping score.');
        setOrb('alert', true, { pulse: true });
      });
    }
  }

  // ==============================================================
  // Forms
  // ==============================================================

  function pickForm() {
    const level = state.level;
    const align = alignmentScore();

    let form = FORMS[0];
    for (const f of FORMS) {
      if (level >= f.minLevel && f.path === 'neutral') {
        form = f;
      }
    }

    if (level >= 11 && !IS_DEMO) {
      if (align >= 6) {
        form = FORMS.find(f => f.id === 'sun-sage') || form;
      } else if (align <= -6) {
        form = FORMS.find(f => f.id === 'void-ascendant') || form;
      } else {
        form = FORMS.find(f => f.id === 'archmage') || form;
      }
    }

    return form;
  }

  function updateFormIfNeeded() {
    const old = state.currentFormId;
    const form = pickForm();
    state.currentFormId = form.id;
    state.formName = form.name;
    if (form.id !== old) {
      pushLog(`His aspect shifts: he is now the ${form.name}.`);
      pushLog(`✨ EVOLUTION — ${form.name} ✨`);
      playEvolveFx();
      setOrb('alert', true, { pulse: true });
    }
  }

  function getCurrentForm() {
    return FORMS.find(f => f.id === state.currentFormId) || FORMS[0];
  }

  // ==============================================================
  // Lore / Tower Codex
  // ==============================================================

  const SUBJECT_COLORS = {
    chronicle: '#caa9ff',
    goblins:   '#7ed957',
    dragons:   '#ff7575',
    tower:     '#8ab4ff',
    orders:    '#f4d067',
    arcana:    '#d88cff',
    wizardcraft: '#d88cff'
  };

  const WIZARDS_HANDBOOK_ENTRY = {
    id: 'wizard-handbook',
    label: 'Wizard’s Handbook',
    subject: 'wizardcraft',
    kind: 'blog',
    title: 'Wizard’s Handbook',
    subtitle: 'A practical Codex for surviving, learning, and mastering new runs.',
    sections: [
      {
        heading: 'The Core Loop',
        body: [
          'This is a survival-and-growth tower sim. Your wizard is fragile at first and becomes formidable through careful routines.',
          'Feed to stabilize the body, meditate to tune the mind, study to grow power and knowledge, and explore to acquire gear and lore.'
        ],
        list: [
          'Feed rations to restore hunger and build vitality.',
          'Meditate to regain energy and sometimes earn Knowledge Points.',
          'Study Magic early; Study Glyphs once spirit is stable.',
          'Explore for equipment, rations, and codex fragments.',
          'Rest to recover when energy or health dips.'
        ]
      },
      {
        heading: 'Spirit & Glyph Study',
        body: [
          'Spirit is your gateway into deeper wizardcraft.',
          'When spirit is strong, Study Glyphs becomes available and yields better Knowledge Point momentum.'
        ],
        list: [
          'Meditate when not freshly fed to more reliably gain spirit.',
          'Avoid draining energy to zero before trying glyph study.',
          'A ring with spirit or luck can change the whole run.'
        ]
      },
      {
        heading: 'Risk Management',
        body: [
          'The tower is unforgiving to neglect. Your biggest early threats are starvation and exhaustion.',
          'Exploration can injure or kill an unprepared wizard—especially without gear.'
        ],
        list: [
          'If hunger is low, feed before long study chains.',
          'If health falls near critical, rest or slow down risky actions.',
          'Explore more confidently once you have at least a staff or robe equipped.'
        ]
      },
      {
        heading: 'Light vs Dark Paths',
        body: [
          'Your choices subtly shape alignment.',
          'Strong positive alignment can open brighter ascensions; deep negative alignment can unlock colder, more dangerous outcomes.'
        ],
        list: [
          'Feeding and steady care nudge light.',
          'Dark Ritual and Sacrifice accelerate power at a steep bodily cost.',
          'Neutral play is viable; extremes are sharper and more specialized.'
        ]
      },
      {
        heading: 'Using Death as Progress',
        body: [
          'The Last Fate entry is not just flavor. It is your post-run teacher.',
          'Each run teaches you what your routine lacked.'
        ],
        list: [
          'If he starved: reduce long study streaks without food.',
          'If he fell in exploration: delay risky exploring until gear or levels rise.',
          'If he lacked power: invest Knowledge Points earlier and keep spirit stable.',
          'If corruption spiked too early: balance rituals with feeding and rest.'
        ]
      },
      {
        heading: 'A Simple Early-Game Routine',
        body: [
          'If you want a reliable start, use this pattern for the first tower days.'
        ],
        list: [
          'Feed if hunger < 60.',
          'Meditate once or twice to stabilize energy and build spirit.',
          'Study Magic when energy is healthy.',
          'Explore once you are not starving and have some spirit/gear.',
          'Rest if health dips or energy crashes.'
        ]
      }
    ]
  };

  const LORE_ENTRIES = [
    {
      id: 'codex',
      label: 'Wizard',
      subject: 'chronicle',
      dynamic: true,
      kind: 'wizard'
    },
    WIZARDS_HANDBOOK_ENTRY
  ];

  const JSON_LORE_FILES = [
    'tower',
    'orders',
    'goblins',
    'dragons',
    'wizardcraft'
  ];

  let currentLoreId = 'codex';
  let loreMenuBuilt = false;
  let loreJsonRequested = false;

  function buildLoreText() {
    const form    = getCurrentForm();
    const minutes = Math.floor(state.secondsAlive / 60);
    const seconds = state.secondsAlive % 60;
    const align   = alignmentScore();

    const dayNum   = getDayNumber();
    const dayPhase = getDayPhase();

    const wizName =
      (state.name && state.name.trim()) ||
      (window.WIZARD_NAME && String(window.WIZARD_NAME).trim()) ||
      'the Dustling';

    let pathLine;
    if (align >= 6) {
      pathLine = 'The tower quietly admits it shelters something close to a saint.';
    } else if (align <= -6) {
      pathLine = 'His shadow has grown long; the void whispers his name with interest.';
    } else {
      pathLine = 'The tower still weighs his heart on unseen scales.';
    }

    const feeds       = state.feedCount      || 0;
    const meditations = state.meditateCount  || 0;
    const studies     = state.studyCount     || 0;
    const rituals     = state.ritualCount    || 0;
    const totalActs   = feeds + meditations + studies + rituals;

    let habitLine;
    if (totalActs === 0) {
      habitLine = 'So far he mostly stands in the quiet, watching dust spin in the lamplight.';
    } else {
      const most = Math.max(feeds, meditations, studies, rituals);
      if (most === feeds) {
        habitLine = 'Meals come often enough; the tower knows the smell of stew and bread.';
      } else if (most === meditations) {
        habitLine = 'He spends long stretches with eyes closed, listening for currents in the stone.';
      } else if (most === studies) {
        habitLine = 'Ink stains his fingers; the margins of his grimoires are dense with notes.';
      } else {
        habitLine = 'The chalk circle on the floor rarely has time to fade before it is redrawn.';
      }
    }

    let ritualLine;
    if (rituals === 0) {
      ritualLine = 'The deeper rites of the tower remain mostly theoretical… for now.';
    } else if (rituals === 1) {
      ritualLine = 'He has stepped into the circle once; the tower still remembers the echo.';
    } else if (rituals < 5) {
      ritualLine = `He has bled through ${rituals} dark rituals; the lines between worlds thin.`;
    } else {
      ritualLine = `The tower floor is a palimpsest of circles and sigils. Dark rites: ${rituals}.`;
    }

    const opening =
      `${wizName} began as a ${FORMS[0].name.toLowerCase()}, left at the tower doors like an unsolved problem.\n` +
      `It is now Day ${dayNum} of his vigil (${minutes}m ${seconds}s in your care), and the tower records the following.`;

    const shape =
      `He currently wears the aspect of the ${form.name}.\n` +
      `Power: ${state.power}, Insight: ${state.insight}, ` +
      `Vitality: ${state.vitality}, Corruption: ${state.corruption}.`;

    const hungerLine =
      state.hunger > 70
        ? 'He walks the halls with a full belly and cautious eyes.'
        : state.hunger > 30
          ? 'Hunger has become a quiet companion, nudging but not ruling him.'
          : 'Hunger scratches his ribs like a locked-in beast; even the tower can hear it.';

    const healthLine =
      state.health > 0
        ? `His body still holds together at ${state.health} health as ${dayPhase.toLowerCase()} settles over the stone.`
        : 'His body failed the test; only this entry in the Codex remembers his shape.';

    return [
      opening,
      '',
      shape,
      pathLine,
      habitLine,
      ritualLine,
      hungerLine,
      healthLine
    ].join('\n');
  }

  // PASS 45 — Living Chronicle narrative engine.
  // The same game state can be illuminated through different literary lenses each time.
  let chronicleReading = 0;

  function chroniclePick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function chronicleEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function buildWizardBlogHtml() {
    chronicleReading += 1;
    const form = getCurrentForm();
    const align = alignmentScore();
    const dayNum = getDayNumber();
    const dayPhase = getDayPhase();
    const clock = formatTowerClock();
    const wizName = (state.name && state.name.trim()) || (window.WIZARD_NAME && String(window.WIZARD_NAME).trim()) || 'The Dustling';
    const N = chronicleEscape(wizName);
    const roomId = state.currentRoom || 'entry';
    const roomName = ROOM_NAMES[roomId] || 'an unnamed chamber';
    const feeds = state.feedCount || 0, meditations = state.meditateCount || 0, studies = state.studyCount || 0, rituals = state.ritualCount || 0;
    const minutes = Math.floor(state.secondsAlive / 60), seconds = state.secondsAlive % 60;
    const hp = state.health / Math.max(1, maxHealth()), en = state.energy / Math.max(1, maxEnergy());
    const equipped = [getEquipped('staff'), getEquipped('robe'), getEquipped('ring')].filter(Boolean);
    const gearNames = equipped.map(x => chronicleEscape(x.name));

    const roomAtmosphere = {
      entry: [
        'The Entry Hall keeps the cold of every visitor who ever hesitated beneath its arch.',
        'At the threshold, old mortar exhales rain though no storm has touched the Spire.',
        'The iron doors have stopped groaning when he passes. Whether this is welcome or recognition is not recorded.'
      ],
      library: [
        'The library is awake around him: vellum ticking softly, chains settling, dead arguments breathing dust.',
        'He reads beneath shelves built for men twice his height, while forbidden indexes whisper behind their clasps.',
        'Some books open willingly now. Others have begun turning their spines toward the wall.'
      ],
      alchemy: [
        'Copper sweats green in the alchemy room and the glassware holds smells for which there are no polite names.',
        'Blue flame trembles beneath a retort. Something inside it knocks once when he looks away.',
        'The laboratory remembers explosions better than recipes; every black mark has a date and most have a name.'
      ],
      quarters: [
        'His narrow quarters contain a bed, a basin, and exactly enough silence for regret to become articulate.',
        'In the sleeping chamber, candlewax has begun forming shapes that resemble coastlines from no known map.',
        'He paces six steps from bed to door. On the seventh, the tower sometimes supplies a step that is not there.'
      ],
      observatory: [
        'Above the clouds, the observatory turns beneath stars whose oldest names have been deliberately scratched away.',
        'The brass orrery moves without being wound. One black planet has appeared that was not there yesterday.',
        'He stands where the roof opens to the night and discovers that some constellations are easier to see with closed eyes.'
      ]
    };

    const condition = !state.alive
      ? chroniclePick(['The body is gone. The record is not.', 'No pulse remains, yet the ink refuses to dry.', 'The Spire has lost a tenant and gained a ghost of facts.'])
      : hp < .35
        ? chroniclePick(['Pain has made a careful accountant of him; each stair is paid for in breath.', 'He moves as cracked glass moves: still whole, but under negotiation.', 'Blood has taught his robes a darker alphabet.'])
        : state.hunger < 25
          ? chroniclePick(['Hunger walks half a pace behind him and has begun offering advice.', 'His stomach speaks during lessons now. The books pretend not to hear.', 'The face in the polished brass is sharper than it was yesterday.'])
          : en < .3
            ? chroniclePick(['Fatigue has put fog between one thought and the next.', 'He reads the same sentence three times and receives three different warnings.', 'Sleep follows him through the halls like a patient animal.'])
            : chroniclePick(['His step is sound and his hands are steady enough for dangerous work.', 'For this hour at least, flesh and will are in agreement.', 'He carries the useful tiredness of someone becoming difficult to kill.']);

    const path = !state.alive
      ? 'The balance is irrelevant to the dead, but not necessarily to what comes after them.'
      : align >= 6
        ? chroniclePick(['Light has begun arriving before he calls for it.', 'The kinder wards no longer test him at every doorway.', 'There are old powers in the tower that have started using his name without contempt.'])
        : align <= -6
          ? chroniclePick(['His shadow occasionally completes gestures he has not yet made.', 'The lower wards recognize him too quickly.', 'Something below the sealed floors has learned the rhythm of his footsteps.'])
          : chroniclePick(['The scales remain level, which is not the same thing as innocence.', 'No order has claimed him. No abyss has finished its offer.', 'He still possesses the rare privilege of becoming several different kinds of monster—or none.']);

    const habitPairs = [
      [feeds, 'The kitchens have become part of his strategy; survival, he has learned, is also a discipline.'],
      [meditations, 'He spends long intervals listening to the stone until the silence develops layers.'],
      [studies, 'Ink disappears faster than food. His margins are becoming a second, more argumentative book.'],
      [rituals, 'The ritual floor is redrawn so often that chalk has entered the cracks between the stones.']
    ].sort((a,b)=>b[0]-a[0]);
    const habit = habitPairs[0][0] ? habitPairs[0][1] : 'He has not yet established a habit. The tower dislikes an unreadable pattern.';

    const omen = chroniclePick([
      'A moth with silver wings was found dead inside a locked hourglass.',
      'At third bell, every flame in the western stair leaned downward.',
      'A raven struck the observatory glass from the inside. No raven was found.',
      'For eleven breaths, the tower cast a shadow toward the moon.',
      'Someone wrote the wizard’s name in frost beneath a warm brazier.',
      'The ninth stair rang like a sword when stepped upon.',
      'A sealed book in the lower stacks laughed once and returned to silence.',
      'The well water reflected dawn several hours too early.'
    ]);

    const quote = !state.alive ? chroniclePick([
      '“Do not call this an ending merely because I stopped breathing.”',
      '“I thought the tower was testing me. Perhaps I was testing the tower.”'
    ]) : state.hunger < 20 ? '“There are philosophies that survive an empty stomach. I have not found one.”'
      : state.energy < 20 ? '“One more page. Then I will become sensible.”'
      : state.spirit >= 3 ? '“The glyphs are awake tonight. I can feel them choosing where to look.”'
      : align >= 6 ? '“Power should leave fewer ruins than it found.”'
      : align <= -6 ? '“Every prohibition is a map drawn by someone who reached the place first.”'
      : chroniclePick(['“I am not trapped here. I am being measured.”','“The tower keeps secrets badly. It puts doors around them.”','“If I survive long enough, perhaps the impossible will become routine.”']);

    const gear = gearNames.length
      ? `<div class="chronicle-relic"><span>RELICS BORNE</span><strong>${gearNames.join(' · ')}</strong><small>${chroniclePick(['Objects remember hands. These have begun remembering his.','None are merely equipment now; use has already started turning them into biography.','The Codex notes every relic because relics have an unfortunate habit of becoming evidence.'])}</small></div>`
      : `<div class="chronicle-relic empty"><span>RELICS BORNE</span><strong>None worthy of a name.</strong><small>The empty spaces in an inventory are prophecies of a practical kind.</small></div>`;

    const milestoneText = state.milestones && state.milestones.length
      ? state.milestones.slice(-4).map(m => `<li>${chronicleEscape(m.name)}</li>`).join('')
      : '<li>No deed has yet forced the archivists to sharpen a new quill.</li>';

    const voices = [
      {name:'THE TOWER’S OWN ACCOUNT', cls:'tower', intro:`On ${chronicleEscape(clock.text)}, the Ninth Spire acknowledges ${N}, ${chronicleEscape(form.name)}-formed, alive beneath its roof.`, body:`${chroniclePick(roomAtmosphere[roomId] || roomAtmosphere.entry)} ${condition} ${habit} ${path}`, note:'The building is not considered an impartial witness.'},
      {name:'A PAGE FROM THE BLACK LEDGER', cls:'ledger', intro:`Subject: ${N}. Day ${dayNum}. Level ${state.level}. Classification remains disputed.`, body:`Power ${state.power}; Insight ${state.insight}; Vitality ${state.vitality}; Corruption ${state.corruption}. ${condition} ${path}`, note:'Copied from a ledger whose previous keeper removed his own name from every page.'},
      {name:'THE NIGHT SCRIBE’S TESTIMONY', cls:'scribe', intro:`I saw ${N} in the ${chronicleEscape(roomName)} and pretended I had not. That is the safest courtesy one can offer a growing wizard.`, body:`${chroniclePick(roomAtmosphere[roomId] || roomAtmosphere.entry)} ${habit} ${condition}`, note:'The scribe’s handwriting deteriorates whenever dark rites are mentioned.'},
      {name:'A RUMOR AMONG THE SERVANTS', cls:'rumor', intro:`They say ${N} has reached level ${state.level}. They say stranger things too.`, body:`${path} ${chroniclePick(roomAtmosphere[roomId] || roomAtmosphere.entry)} No two servants agree on what happened, which is usually how the true stories begin.`, note:'Rumor is filed as evidence only after it becomes dangerous.'},
      {name:'MARGINALIA IN AN UNKNOWN HAND', cls:'margin', intro:`Beside the official record someone has written: “Watch ${N} carefully.”`, body:`${condition} ${habit} Beneath that, in different ink: “No. Let the wizard believe no one is watching.”`, note:'The two inks are separated in age by approximately three centuries.'}
    ];
    const voice = chroniclePick(voices);

    const formats = ['folio','dossier','ballad','palimpsest'];
    const format = chroniclePick(formats);
    const chapterTitle = chroniclePick([
      `The Hour the Spire Took Notice`, `Concerning ${N} and the Unquiet Stone`, `A Small History of Dangerous Becoming`,
      `The ${chronicleEscape(dayPhase)} Record`, `Wherein the Apprentice Is Weighed`, `The Book of One More Day`
    ]);

    const modeExtra = format === 'ballad'
      ? `<div class="chronicle-verse">Not crown, nor blood, nor master’s word<br>makes wizardry endure;<br>the hand that reaches through the dark<br>returns no longer pure.</div>`
      : format === 'dossier'
        ? `<div class="chronicle-seal">ARCHIVAL STATUS <b>${state.alive ? 'ACTIVE' : 'SEALED'}</b> · WATCH ${dayNum} · ${chronicleEscape(dayPhase.toUpperCase())}</div>`
        : format === 'palimpsest'
          ? `<div class="chronicle-erasure">[Three lines here have been scraped from the vellum. The knife marks are recent.]</div>`
          : `<div class="chronicle-dropcap">${N.charAt(0)}</div>`;

    return `
      <article class="wizard-chronicle ${format}">
        <header class="chronicle-masthead">
          <div class="chronicle-kicker">THE LIVING CHRONICLE · ILLUMINATION ${chronicleReading}</div>
          <h1>${chapterTitle}</h1>
          <div class="chronicle-deck">A changing account of ${N}, recorded on Day ${dayNum} at ${chronicleEscape(clock.text)}.</div>
          <div class="chronicle-rule"><i></i><span>✦</span><i></i></div>
        </header>
        ${modeExtra}
        <section class="chronicle-voice ${voice.cls}">
          <h2>${voice.name}</h2>
          <p class="chronicle-lead">${voice.intro}</p>
          <p>${voice.body}</p>
          <small>${voice.note}</small>
        </section>
        <aside class="chronicle-omen"><span>OMEN RECORDED WITHOUT EXPLANATION</span><p>${omen}</p></aside>
        <blockquote class="chronicle-quote">${quote}<cite>— attributed to ${N}; authenticity uncertain</cite></blockquote>
        ${gear}
        <section class="chronicle-deeds"><h2>DEEDS THE SPIRE HAS NOT FORGOTTEN</h2><ul>${milestoneText}</ul></section>
        <section class="chronicle-numbers">
          <div><b>${state.level}</b><span>LEVEL</span></div><div><b>${state.power}</b><span>POWER</span></div><div><b>${state.insight}</b><span>INSIGHT</span></div><div><b>${state.corruption}</b><span>CORRUPTION</span></div>
        </section>
        <footer class="chronicle-footer">
          <p>${minutes}m ${seconds}s under watch · ${feeds} meals · ${meditations} meditations · ${studies} studies · ${rituals} dark rites</p>
          <button type="button" class="chronicle-reread" id="chronicle-reread">Turn the page — tell it another way</button>
          <small>The Ninth Spire never tells a life exactly the same way twice.</small>
        </footer>
      </article>`;
  }

  function getLoreEntry(id) {
    return LORE_ENTRIES.find(e => e.id === id) || LORE_ENTRIES[0];
  }

  function loadLoreFromFile(baseName) {
    const path = `lore/${baseName}.json`;
    return fetch(path)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!data || !data.id) return;

        const already = LORE_ENTRIES.some(e => e.id === data.id);
        if (already) return;

        const entry = {
          id: data.id,
          label: data.label || data.id,
          subject: data.subject || 'chronicle',
          text: Array.isArray(data.text)
            ? data.text.join('\n')
            : (data.text || ''),
          kind: data.kind || 'plain',
          title: data.title || '',
          subtitle: data.subtitle || '',
          sections: Array.isArray(data.sections) ? data.sections : null
        };

        LORE_ENTRIES.push(entry);

        if (loreOverlay && !loreOverlay.classList.contains('hidden')) {
          loreMenuBuilt = false;
          renderLoreMenu();
        }
      })
      .catch(err => {
        console.error('Failed to load lore file:', path, err);
      });
  }

  function ensureLoreJsonLoaded() {
    if (loreJsonRequested) return;
    loreJsonRequested = true;
    JSON_LORE_FILES.forEach(loadLoreFromFile);

    DISCOVERABLE_SUBJECTS.forEach(sub => {
      const id = `subject-${sub}`;
      if (!LORE_ENTRIES.some(e => e.id === id)) {
        LORE_ENTRIES.push({
          id,
          label: sub.charAt(0).toUpperCase() + sub.slice(1),
          subject: sub,
          kind: 'subject_dynamic',
          dynamic: false
        });
      }
    });
  }

  const ALWAYS_VISIBLE_LORE_IDS = new Set(['codex', 'last-fate', 'wizard-handbook']);

  function getDiscoveryCountForEntry(entry) {
    if (!entry) return 0;

    const subj = entry.subject;
    if (DISCOVERABLE_SUBJECTS.includes(subj)) {
      return (state.discoveredLore && state.discoveredLore[subj]) || 0;
    }

    if (entry.id && entry.id.startsWith('subject-')) {
      const s = entry.id.replace('subject-', '');
      return (state.discoveredLore && state.discoveredLore[s]) || 0;
    }

    return 999;
  }

  function isLoreEntryVisible(entry) {
    if (!entry) return false;
    if (ALWAYS_VISIBLE_LORE_IDS.has(entry.id)) return true;
    if (entry.id === 'codex') return true;

    const subj = entry.subject;
    if (DISCOVERABLE_SUBJECTS.includes(subj)) {
      return getDiscoveryCountForEntry(entry) > 0;
    }

    if (entry.id && entry.id.startsWith('subject-')) {
      return getDiscoveryCountForEntry(entry) > 0;
    }

    return true;
  }

  function renderBlogHtml(entry) {
    const title    = entry.title || entry.label || '';
    const subtitle = entry.subtitle || '';
    const sections = entry.sections || [];

    let html = '';
    if (title) html += `<h1>${title}</h1>`;
    if (subtitle) html += `<p class="lead">${subtitle}</p>`;

    sections.forEach(sec => {
      if (sec.heading) html += `<h2>${sec.heading}</h2>`;

      if (Array.isArray(sec.body)) {
        sec.body.forEach(p => { html += `<p>${p}</p>`; });
      }

      if (Array.isArray(sec.list)) {
        html += '<ol>';
        sec.list.forEach(item => { html += `<li>${item}</li>`; });
        html += '</ol>';
      }
    });

    return html;
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(255,255,255,${alpha})`;
    const h = hex.replace('#', '').trim();
    if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function applyLoreItemStyles(el, entry, isActive) {
    const col = SUBJECT_COLORS[entry.subject] || '#f4f0ff';
    el.style.borderColor = col;

    if (isActive) {
      el.classList.add('active');
      el.style.color = col;
      el.style.background = hexToRgba(col, 0.14);
      el.style.boxShadow = `0 0 0 1px ${hexToRgba(col, 0.18)} inset`;
      el.style.fontWeight = '700';
    } else {
      el.classList.remove('active');
      el.style.color = col;
      el.style.background = 'transparent';
      el.style.boxShadow = 'none';
      el.style.fontWeight = '';
    }
  }

  function renderLoreMenu() {
    if (!loreList) return;
    loreList.innerHTML = '';

    const visibleEntries = LORE_ENTRIES.filter(isLoreEntryVisible);

    visibleEntries.forEach(entry => {
      const color = SUBJECT_COLORS[entry.subject] || '#f4f0ff';

      const item = document.createElement('div');
      item.className = 'lore-entry';
      item.dataset.id = entry.id;
      item.textContent = entry.label;
      item.style.borderColor = color;
      item.style.color = color;

      if (entry.id === 'codex') item.classList.add('wizard-entry');

      item.tabIndex = 0;
      item.addEventListener('click', () => showLoreEntry(entry.id));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showLoreEntry(entry.id);
        }
      });

      loreList.appendChild(item);
    });

    loreMenuBuilt = true;
  }

  function showLoreEntry(id) {
    if (!loreBody || !loreList) return;

    currentLoreId = id;
    const entry = getLoreEntry(id);

    let html = '';

    if (entry.id === 'codex' && entry.kind === 'wizard') {
      html = buildWizardBlogHtml();
    }
    else if (entry.kind === 'subject_dynamic') {
      const subject = entry.id.replace('subject-', '');
      const count = (state.discoveredLore && state.discoveredLore[subject]) || 0;
      html = `
        <h1>${entry.label}</h1>
        <p class="lead">Fragments recovered: ${count}</p>
        ${buildSubjectLoreText(subject, count)}
      `;
    }
    else if (entry.kind === 'blog' && entry.sections) {
      html = renderBlogHtml(entry);
    }
    else if (entry.dynamic) {
      html = buildLoreText()
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
    else if (entry.text) {
      html = entry.text
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    loreBody.innerHTML = html;

    const items = loreList.querySelectorAll('.lore-entry');
    items.forEach(el => {
      const eid = el.dataset.id;
      const e   = getLoreEntry(eid);
      applyLoreItemStyles(el, e, eid === id);
    });
  }

  function openLore() {
    if (!loreOverlay) return;
    ensureLoreJsonLoaded();
    loreMenuBuilt = false;
    renderLoreMenu();
    showLoreEntry(currentLoreId || 'codex');
    loreOverlay.classList.remove('hidden');
    clearOrb('lore');
  }

  if (loreBody) {
    loreBody.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('#chronicle-reread') : null;
      if (!btn) return;
      loreBody.innerHTML = buildWizardBlogHtml();
      loreBody.scrollTop = 0;
    });
  }

  function closeLore() {
    if (!loreOverlay) return;
    loreOverlay.classList.add('hidden');
  }

  // ==============================================================
  // MAIN MENU LORE (JSON-driven overlay)
  // ==============================================================

  async function openMenuLore() {
  const overlay = document.getElementById('menu-lore-overlay');
  const listEl  = document.getElementById('menu-lore-list');
  const bodyEl  = document.getElementById('menu-lore-body');

  if (!overlay || !listEl || !bodyEl) {
    openMenuLoreLegacy();
    return;
  }

  // token to invalidate earlier calls
  const seq = ++menuLoreOpenSeq;

  overlay.classList.remove('hidden');
  listEl.innerHTML = '';
  bodyEl.innerHTML = '<div class="subtle">Loading lore...</div>';

  let entries = [];
  try {
    // NOTE: loadLoreFromFile doesn't return entries; see optional improvement below.
    await Promise.all(JSON_LORE_FILES.map(loadLoreFromFile));
  } catch (err) {
    console.warn('[Lore] Menu JSON load failed:', err);
  }

  // If another open started while we awaited, abort this render.
  if (seq !== menuLoreOpenSeq) return;

  // Build from current LORE_ENTRIES (your existing fallback logic)
  entries = LORE_ENTRIES
    .filter(e => e.kind === 'blog' || e.text || e.dynamic || e.kind === 'wizard');

  // Dedupe by id just in case
  const seen = new Set();
  entries = entries.filter(e => e && e.id && !seen.has(e.id) && (seen.add(e.id), true));

  if (!entries.length) {
    bodyEl.innerHTML = '<div class="lore-text"><p>No lore volumes found.</p></div>';
    return;
  }

  entries.sort((a, b) => {
    const A = (a.label || a.title || a.id || '').toLowerCase();
    const B = (b.label || b.title || b.id || '').toLowerCase();
    return A.localeCompare(B);
  });

  // Clear again right before append (extra safety)
  listEl.innerHTML = '';

  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'lore-entry';
    item.textContent = entry.label || entry.title || entry.id;

    item.addEventListener('click', () => {
      Array.from(listEl.children).forEach(c => c.classList.remove('active'));
      item.classList.add('active');

      if (entry.kind === 'blog' && Array.isArray(entry.sections)) {
        bodyEl.innerHTML = renderBlogHtml(entry);
      } else if (entry.id === 'codex' && entry.kind === 'wizard') {
        bodyEl.innerHTML = buildWizardBlogHtml();
      } else if (Array.isArray(entry.text)) {
        bodyEl.innerHTML = `
          <div class="lore-text">
            ${entry.text.map(p => `<p>${p}</p>`).join('')}
          </div>
        `;
      } else if (typeof entry.text === 'string' && entry.text.trim()) {
        bodyEl.innerHTML = `
          <div class="lore-text">
            ${entry.text.split('\n\n').map(p => `<p>${p}</p>`).join('')}
          </div>
        `;
      } else {
        bodyEl.innerHTML = `
          <div class="lore-text">
            <p>${entry.subtitle || 'A volume with missing ink.'}</p>
          </div>
        `;
      }
    });

    listEl.appendChild(item);
  });

  const first = listEl.querySelector('.lore-entry');
  if (first) first.click();
}

  function closeMenuLore() {
    // New overlay
    const overlay = document.getElementById('menu-lore-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Legacy modal fallback
    if (legacyMenuLoreModal) legacyMenuLoreModal.classList.add('hidden');
  }

  // Legacy compatibility
  function renderLoreEntries(listEl, contentEl, entries) {
    if (!listEl || !contentEl) return;

    listEl.innerHTML = "";

    function setActive(btn) {
      listEl.querySelectorAll(".lore-entry").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }

    function renderContent(entry) {
      const title = entry.title ?? "";
      const body = (entry.body ?? "").replace(/\n/g, "<br>");
      contentEl.innerHTML = `
        <h1>${title}</h1>
        <p>${body}</p>
      `;
    }

    entries.forEach((e, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lore-entry";
      btn.textContent = e.title ?? `Entry ${idx + 1}`;

      btn.addEventListener("click", () => {
        setActive(btn);
        renderContent(e);
      });

      listEl.appendChild(btn);
    });

    if (entries.length > 0) {
      const firstBtn = listEl.querySelector(".lore-entry");
      if (firstBtn) setActive(firstBtn);
      renderContent(entries[0]);
    } else {
      contentEl.innerHTML = `<div class="lore-empty">No entries yet.</div>`;
    }
  }

  function openMenuLoreLegacy() {
    const modal = document.getElementById("modal-menu-lore");
    const titleEl = document.getElementById("menu-lore-title");
    const listEl = document.getElementById("menu-lore-list");
    const contentEl = document.getElementById("menu-lore-content");

    if (!modal || !titleEl || !listEl || !contentEl) return;

    titleEl.textContent = "Lore Library";

    const entries = [];
    if (typeof window.MENU_LORE_LIBRARY !== "undefined") {
      window.MENU_LORE_LIBRARY.forEach(sec => {
        const sectionEntries = sec.entries();
        sectionEntries.forEach(e => entries.push({ title: e.title, body: e.body }));
      });
    }

    renderLoreEntries(listEl, contentEl, entries);
    modal.classList.remove("hidden");
  }

  // ==============================================================
  // Book discovery award
  // ==============================================================

  function discoverLoreFragment(subject) {
    if (!subject) return;
    if (!state.discoveredLore) state.discoveredLore = {};
    if (state.discoveredLore[subject] == null) state.discoveredLore[subject] = 0;

    state.discoveredLore[subject] += 1;

    const pretty = subject.charAt(0).toUpperCase() + subject.slice(1);

    pushLog(`He returns with a torn page. <strong>${pretty}</strong> lore fragment recovered.`);
    setOrb('lore', true, { pulse: true });

    if (loreOverlay && !loreOverlay.classList.contains('hidden')) {
      loreMenuBuilt = false;
      renderLoreMenu();
    }
  }

  function rollBookFragmentForRoom(roomId) {
    const table = ROOM_BOOK_TABLES[roomId];
    if (!table || !table.length) return null;

    let chance = 0.25;
    if (roomId === 'library') chance = 0.45;
    if (roomId === 'observatory') chance = 0.35;

    chance += totalLuck() * 0.02;
    if (Math.random() > chance) return null;

    return table[Math.floor(Math.random() * table.length)];
  }

  // ==============================================================
  // Orbs
  // ==============================================================

  const ORB_TYPES = [
    { id: 'lore',    label: 'Lore',    color: '#caa9ff' },
    { id: 'journal', label: 'Journal', color: '#8ab4ff' },
    { id: 'loot',    label: 'Loot',    color: '#7ed957' },
    { id: 'alert',   label: 'Notice',  color: '#f4d067' },
    { id: 'danger',  label: 'Danger',  color: '#ff7575' }
  ];

  ORB_TYPES.forEach(t => {
    if (state.orbFlags[t.id] == null) state.orbFlags[t.id] = false;
  });

  let orbTrayEl = null;
  const orbElsById = {};
  let orbStylesInjected = false;

  function getGameFrameEl() {
    const byId =
      document.getElementById('screen-game') ||
      document.getElementById('screen-wizard') ||
      document.getElementById('game-screen');

    if (byId) return byId;

    if (canvas) {
      const frame = canvas.closest('.frame');
      if (frame) return frame;
    }

    return document.querySelector('.frame') || document.body;
  }

  function injectOrbStylesOnce() {
    if (orbStylesInjected) return;
    orbStylesInjected = true;

    const style = document.createElement('style');
    style.id = 'orb-style-tag';
    style.textContent = `
      .orb-tray {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        margin: 0;
        border: none;
        background: transparent;
        backdrop-filter: none;
      }
      .orb-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        border: none;
        opacity: 0;
        box-shadow: none;
        cursor: pointer;
        pointer-events: none;
        transition:
          opacity 120ms ease,
          box-shadow 160ms ease,
          transform 160ms ease,
          filter 160ms ease;
      }
      .orb-dot.on {
        opacity: 1;
        pointer-events: auto;
        filter: saturate(1.15);
        box-shadow:
          0 0 4px currentColor,
          0 0 10px color-mix(in srgb, currentColor 70%, transparent);
        transform: translateY(-0.5px);
      }
      .orb-dot.pulse {
        animation: orbPulse 0.8s ease-out 1;
      }
      @keyframes orbPulse {
        0%   { transform: scale(1);    opacity: 0.6; }
        40%  { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(1);    opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureOrbTrayExists() {
    injectOrbStylesOnce();

    const host = getGameFrameEl();

    if (host && host !== document.body) {
      const computed = window.getComputedStyle(host);
      if (computed.position === 'static') host.style.position = 'relative';
    }

    if (orbTrayEl && orbTrayEl.parentElement !== host) {
      orbTrayEl.remove();
      orbTrayEl = null;
    }
    if (orbTrayEl) return;

    orbTrayEl = document.createElement('div');
    orbTrayEl.className = 'orb-tray';
    orbTrayEl.id = 'orb-tray';
    orbTrayEl.setAttribute('aria-label', 'Notifications');

    orbTrayEl.style.position = (host === document.body) ? 'fixed' : 'absolute';
    orbTrayEl.style.top = '8px';
    orbTrayEl.style.right = '8px';
    orbTrayEl.style.zIndex = '60';

    ORB_TYPES.forEach(t => {
      const dot = document.createElement('span');
      dot.id = `orb-${t.id}`;
      dot.className = 'orb-dot';
      dot.title = t.label;

      dot.style.background = t.color;
      dot.style.color = t.color;

      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        handleOrbClick(t.id);
      });

      orbTrayEl.appendChild(dot);
      orbElsById[t.id] = dot;
    });

    host.appendChild(orbTrayEl);
  }

  function renderOrbs() {
    ensureOrbTrayExists();
    ORB_TYPES.forEach(t => {
      const on = !!(state.orbFlags && state.orbFlags[t.id]);
      const el = orbElsById[t.id];
      if (el) el.classList.toggle('on', on);
    });
  }

  function setOrb(id, on, opts = {}) {
    if (!state.orbFlags) state.orbFlags = {};
    state.orbFlags[id] = !!on;

    ensureOrbTrayExists();
    const el = orbElsById[id] || document.getElementById(`orb-${id}`);
    if (!el) return;

    el.classList.toggle('on', !!on);

    if (opts.pulse) {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    } else {
      el.classList.remove('pulse');
    }
  }

  function clearOrb(id) {
    setOrb(id, false, { pulse: false });
  }

  function handleOrbClick(id) {
    if (id === 'lore') {
      openLore();
      clearOrb('lore');
      return;
    }
    if (id === 'journal') {
      pushLog('The journal is not yet bound. This orb will awaken later.');
      clearOrb('journal');
      return;
    }
    if (id === 'loot') {
      openInventory();
      clearOrb('loot');
      return;
    }
    if (id === 'alert') {
      pushLog('The tower has nothing more to say right now.');
      clearOrb('alert');
      return;
    }
    if (id === 'danger') {
      pushLog('A warning burns in red: attend his body before the tower claims him.');
      return;
    }
  }

  function updateDangerOrbFromStats() {
    if (!state || !state.alive) {
      clearOrb('danger');
      return;
    }

    const hpMax = maxHealth();
    const enMax = maxEnergy();

    const lowHp = state.health <= Math.ceil(hpMax * 0.35);
    const lowH  = state.hunger <= 12;
    const lowE  = state.energy <= Math.ceil(enMax * 0.15);

    setOrb('danger', (lowHp || lowH || lowE), { pulse: (lowHp || lowH || lowE) });
  }

  // ==============================================================
  // Mood / XP / Actions
  // ==============================================================

  function updateMood() {
    if (!state.alive) {
      state.mood = 'Faded';
      return;
    }
    if (state.health < 20) {
      state.mood = 'Wounded';
    } else if (state.hunger < 25) {
      state.mood = 'Starving';
    } else if (state.energy > 80) {
      state.mood = 'Charged';
    } else if (state.energy < 15) {
      state.mood = 'Drained';
    } else {
      const align = alignmentScore();
      if (align >= 8) state.mood = 'Serene';
      else if (align <= -8) state.mood = 'Unnerving';
      else state.mood = 'Calm';
    }
  }

  function gainXp(amount) {
    if (!state.alive) return;
    state.xp += amount;

    while (state.level < MAX_LEVEL && state.xp >= xpNeededFor(state.level)) {
      state.xp -= xpNeededFor(state.level);
      state.level++;
      try { window.dispatchEvent(new CustomEvent('ns:legacy-level',{detail:{level:state.level}})); } catch (_) {}

      bumpStat('power', 1);
      bumpStat('insight', 1);
      bumpStat('vitality', 1);

      state.knowledgePoints = (state.knowledgePoints || 0) + 1;
      pushLog('The tower grants him 1 Knowledge Point, to be spent on deeper studies.');
      setOrb('alert', true, { pulse: true });

      state.healthFloat = clamp(state.healthFloat + 10, 0, maxHealth());

      pushLog(`A rung higher: Level ${state.level}. His frame and mind harden.`);
      updateFormIfNeeded();
    }

    if (IS_DEMO && state.level >= MAX_LEVEL) {
      const needed = xpNeededFor(state.level);
      if (state.xp > needed - 1) {
        state.xp = needed - 1;
        pushLog('Demo cap: his true ascension waits in the full version.');
      }
    }
  }

  function registerAction(kind) {
    state.idleSeconds = 0;

    if (kind === 'feed')      state.feedCount++;
    if (kind === 'meditate')  state.meditateCount++;
    if (kind === 'study')     state.studyCount++;
    if (kind === 'ritual')    state.ritualCount++;
  }

  function ifWizardAway() {
    if (state.isExploring) {
      pushLog('He is still out exploring the tower halls. Wait for him to return.');
      return true;
    }
    return false;
  }

  // ==============================================================
  // Spirit
  // ==============================================================

  function addSpirit(amount) {
    const m = maxSpirit();
    state.spiritFloat = clamp((state.spiritFloat || 0) + amount, 0, m);
    state.spirit = Math.round(state.spiritFloat);
  }

  function spendSpirit(amount) {
    state.spiritFloat = clamp((state.spiritFloat || 0) - amount, 0, maxSpirit());
    state.spirit = Math.round(state.spiritFloat);
  }

  // ==============================================================
  // Time skip helper
  // ==============================================================

  function skipTowerTime(seconds) {
    if (!seconds || seconds <= 0) return;

    const hpMax = maxHealth();
    const enMax = maxEnergy();

    state.secondsAlive += seconds;

    state.hungerFloat = clamp(state.hungerFloat - HUNGER_DECAY_PER_SEC * seconds, 0, 100);
    state.energyFloat = clamp(state.energyFloat + ENERGY_REGEN_PER_SEC * seconds, 0, enMax);

    state.spiritFloat = clamp((state.spiritFloat || 0) - 0.02 * seconds, 0, maxSpirit());

    if (state.hungerFloat <= 0) {
      state.healthFloat = clamp(
        state.healthFloat - STARVATION_HEALTH_LOSS * Math.ceil(seconds / 2),
        0,
        hpMax
      );
    }

    state.healthFloat = clamp(state.healthFloat, 0, hpMax);

    state.hunger = Math.round(state.hungerFloat);
    state.energy = Math.round(state.energyFloat);
    state.health = Math.round(state.healthFloat);
    state.spirit = Math.round(state.spiritFloat);

    updateTowerTimeUi();
  }

  // ==============================================================
  // Core actions
  // ==============================================================

  

// =============================================================
// Action Result Cards (immediate feedback in the viewfinder)
// =============================================================
function snapshotActionStats(st) {
  return {
    level: Number(st?.level ?? 0),
    xp: Number(st?.xp ?? 0),
    kp: Number(st?.kp ?? 0),
    gold: Number(st?.gold ?? 0),
    power: Number(st?.power ?? 0),
    insight: Number(st?.insight ?? 0),
    vitality: Number(st?.vitality ?? 0),
    corruption: Number(st?.corruption ?? 0),
    health: Number(st?.health ?? 0),
    hunger: Number(st?.hunger ?? 0),
    energy: Number(st?.energy ?? 0)
  };
}

function diffActionStats(before, after) {
  const out = [];
  const keys = ['health','hunger','energy','power','insight','vitality','corruption','xp','kp','gold','level'];
  const label = {
    health:'Health', hunger:'Hunger', energy:'Energy',
    power:'Power', insight:'Insight', vitality:'Vitality', corruption:'Corruption',
    xp:'XP', kp:'KP', gold:'Gold', level:'Level'
  };
  for (const k of keys) {
    const b = Number(before?.[k] ?? 0);
    const a = Number(after?.[k] ?? 0);
    const d = a - b;
    if (!d) continue;
    const sign = d > 0 ? '+' : '';
    out.push(`${label[k]} ${sign}${d}`);
  }
  return out;
}

function ensureActionResultOverlay() {
  if (document.getElementById('action-result')) return;

  const vf = document.getElementById('viewfinder');
  if (!vf) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="action-result" class="vf-overlay hidden" aria-hidden="true">
      <div class="vf-modal">
        <div class="vf-modal__header">
          <div id="action-result-title" class="vf-modal__title">RESULT</div>
        </div>
        <div class="vf-modal__body">
          <div id="action-result-text" style="white-space:pre-line;"></div>
          <div id="action-result-changes" style="white-space:pre-line; margin-top:10px; font-size:12px; opacity:0.95;"></div>
        </div>
        <div class="vf-modal__footer">
          <button id="btn-action-result-close" class="primary-btn small" type="button">OK</button>
        </div>
      </div>
    </div>
  `;
  vf.appendChild(wrap.firstElementChild);

  const btn = document.getElementById('btn-action-result-close');
  if (btn) btn.addEventListener('click', hideActionResult);
}

function showActionResult(title, text, changes) {
  // Allow disabling via: state.ui = { showResultCards:false }
  try {
    const st = window.WF_GAME?.getState?.();
    if (st?.ui?.showResultCards === false) return;
  } catch (_) {}

  ensureActionResultOverlay();

  const overlay = document.getElementById('action-result');
  if (!overlay) return;

  const tEl = document.getElementById('action-result-title');
  const bEl = document.getElementById('action-result-text');
  const cEl = document.getElementById('action-result-changes');

  if (tEl) tEl.textContent = title || 'RESULT';
  if (bEl) bEl.textContent = text || '';
  if (cEl) {
    if (changes && changes.length) cEl.textContent = `Changes:\n• ${changes.join('\n• ')}`;
    else cEl.textContent = '';
  }

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideActionResult() {
  const overlay = document.getElementById('action-result');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}


function feedWizard() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    const r = getRations();
    if (r <= 0) {
      pushLog('Your pantry is empty. No rations remain.');
      updateUi();
      return;
    }

    registerAction('feed');

    const __before = snapshotActionStats(state);


    state.rations = r - 1;
    state.lastFedAt = state.secondsAlive;

    state.hungerFloat = clamp(state.hungerFloat + 22, 0, 100);
    state.light += 1;
    bumpStat('vitality', 1);
    gainXp(2);

    pushLog('You share rough bread and stew. A little color returns to his cheeks.');
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Feed Rations", "He eats in silence. The tower listens.", diffActionStats(__before, __after));

  }

  function meditate() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    registerAction('meditate');

    const __before = snapshotActionStats(state);


    if (state.hunger <= 5) {
      pushLog('Too empty to feel the ley-lines. Feed him first.');
      return;
    }

    state.hungerFloat = clamp(state.hungerFloat - 3, 0, 100);
    state.energyFloat = clamp(state.energyFloat + 18, 0, maxEnergy());
    state.light += 1;
    bumpStat('insight', 1);

    const ateRecently = (state.secondsAlive - (state.lastFedAt || 0)) < 180;

    if (!ateRecently) {
      addSpirit(1);
    } else {
      pushLog('His breath is steady, but the meal still weighs on the mind. The meditation feels muted.');
    }

    const timeSkip = 300 + Math.floor(Math.random() * 301);
    skipTowerTime(timeSkip);

    const kpChance = ateRecently ? 0.15 : 0.35;
    if (Math.random() < kpChance) {
      state.knowledgePoints = (state.knowledgePoints || 0) + 1;
      pushLog('A quiet clarity settles in. +1 Knowledge Point.');
      setOrb('alert', true, { pulse: true });
    }

    gainXp(4);
    pushLog('He slows his breath. The tower floor hums softly beneath him.');
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Meditate", "He folds into stillness. Thoughts sharpen.", diffActionStats(__before, __after));

  }

  function studyGlyphs() {
    if (!state.alive) return false;

    const spiritGate = 2;

    if (state.spirit < spiritGate) {
      pushLog('The glyphs remain inert. His spirit must be steadier before he can read them.');
      return false;
    }
    if (state.energy < 18) {
      pushLog('His mind is too dull to hold the shapes. Restore his energy first.');
      return false;
    }
    if (state.hunger < 10) {
      pushLog('His stomach drowns out the whisper of runes.');
      return false;
    }

    registerAction('study');

    const __before = snapshotActionStats(state);


    state.energyFloat = clamp(state.energyFloat - 18, 0, maxEnergy());
    state.hungerFloat = clamp(state.hungerFloat - 5, 0, 100);

    spendSpirit(1);

    const spiritTier = state.spirit + 1;
    const luck = totalLuck();

    const kpGain = 1 + (spiritTier >= 3 ? 1 : 0) + (luck >= 2 ? 1 : 0);
    state.knowledgePoints = (state.knowledgePoints || 0) + kpGain;

    bumpStat('power', 1);
    bumpStat('insight', 1);

    const xpGain = 8 + state.level * 2 + spiritTier;
    gainXp(xpGain);

    pushLog(`He reads living glyphs by candle-end. The tower yields ${kpGain} Knowledge Point${kpGain > 1 ? 's' : ''}.`);
    setOrb('alert', true, { pulse: true });
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Study Glyphs", "Ink, ash, and whispered symbols. Knowledge takes its toll.", diffActionStats(__before, __after));

    return true;
  }

  function studySpell() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    if (state.spirit >= 2) {
      const did = studyGlyphs();
      if (did) return;
    }

    registerAction('study');

    if (state.energy < 20) {
      pushLog('His mind is too dull to track glyphs. Restore his energy first.');
      return;
    }
    if (state.hunger < 10) {
      pushLog('His stomach drowns out the whisper of runes.');
      return;
    }

    state.energyFloat = clamp(state.energyFloat - 20, 0, maxEnergy());
    state.hungerFloat = clamp(state.hungerFloat - 6, 0, 100);

    bumpStat('power', 1);
    gainXp(10 + state.level * 2);

    pushLog('Chalk, ink, and muttered syllables. The shapes on the page stick this time.');
    updateFormIfNeeded();
    updateUi();
  }

  function darkRitual() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    registerAction('ritual');

    const __before = snapshotActionStats(state);


    if (IS_DEMO) {
      pushLog('The deeper rites are sealed in the full grimoire.');
      return;
    }
    if (state.energy < 40 || state.health < 30) {
      pushLog('The ritual would rip him apart in this state. He needs more strength.');
      return;
    }

    state.energyFloat = clamp(state.energyFloat - 40, 0, maxEnergy());
    state.healthFloat = clamp(state.healthFloat - 15, 0, maxHealth());

    state.dark += 3;
    state.light = Math.max(0, state.light - 1);
    bumpStat('power', 1);
    bumpStat('corruption', 2);

    gainXp(40);
    pushLog('The tower chills. Ink runs uphill. Something answers from the dark.');
    setOrb('alert', true, { pulse: true });
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Dark Ritual", "Candles gutter. Something answers back.", diffActionStats(__before, __after));

  }

  function trainBody() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    registerAction('train');

    const __before = snapshotActionStats(state);


    if (state.energy < 10 || state.hunger < 15) {
      pushLog('He needs food and strength before he can train his body.');
      return;
    }

    state.energyFloat = clamp(state.energyFloat - 12, 0, maxEnergy());
    state.hungerFloat = clamp(state.hungerFloat - 8, 0, 100);

    bumpStat('power', 1);
    bumpStat('vitality', 1);
    gainXp(6);

    pushLog('He moves through slow, careful drills until sweat beads on his brow.');
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Train Body", "He trains until his hands tremble. Discipline hardens.", diffActionStats(__before, __after));

  }

  function restWizard() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    registerAction('rest');

    const __before = snapshotActionStats(state);


    const hpMax = maxHealth();
    const enMax = maxEnergy();

    state.sleepTimer = 12;

    state.energyFloat = clamp(state.energyFloat + 16, 0, enMax);
    state.healthFloat = clamp(state.healthFloat + 10, 0, hpMax);
    state.hungerFloat = clamp(state.hungerFloat - 4, 0, 100);

    state.light += 1;
    gainXp(2);

    pushLog('He stretches out on the narrow cot and lets the tower fall quiet around him.');
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Rest", "He sleeps \u2014 not peacefully, but enough.", diffActionStats(__before, __after));

  }

  function sacrificeWizard() {
    if (!state.alive) return;
    if (ifWizardAway()) return;

    registerAction('sacrifice');

    const __before = snapshotActionStats(state);


    if (IS_DEMO) {
      pushLog('True sacrifice is sealed away in the full grimoires.');
      return;
    }

    if (state.health < 35 || state.energy < 30) {
      pushLog('The sacrifice would take more than he has to give right now.');
      return;
    }

    const hpMax = maxHealth();

    state.healthFloat = clamp(state.healthFloat - 25, 0, hpMax);
    state.energyFloat = clamp(state.energyFloat - 30, 0, maxEnergy());

    state.dark += 5;
    state.light = Math.max(0, state.light - 2);

    bumpStat('power', 1);
    bumpStat('corruption', 3);
    gainXp(60);

    pushLog('Something in the tower answers hungrily. The Codex inks this as sacrifice.');
    setOrb('alert', true, { pulse: true });
    updateFormIfNeeded();
    updateUi();

    const __after = snapshotActionStats(state);
    showActionResult("Sacrifice", "A cruel bargain. The tower remembers.", diffActionStats(__before, __after));

  }

  // ==============================================================
  // Exploration (wizard disappears; returns after close)
  // ==============================================================

  function exploreWizard() {
    if (!state.alive) return;

    if (isExploreResultsOpen()) {
      pushLog('Close the exploration report before sending him out again.');
      return;
    }

    if (state.isExploring || isExploringLegacy) {
      pushLog('He is already somewhere in the tower halls.');
      return;
    }

    registerAction('study');

    if (state.hunger < 5) {
      pushLog('He is too hungry to wander the tower. Feed him first.');
      return;
    }
    if (state.energy < 4) {
      pushLog('He is too drained to explore. Let him rest or meditate first.');
      return;
    }

    const candidates = ROOM_IDS.slice();
    const target = candidates[Math.floor(Math.random() * candidates.length)];

    const beforeEnergy = state.energyFloat;
    const beforeHunger = state.hungerFloat;

    state.hungerFloat = clamp(state.hungerFloat - 5, 0, 100);
    state.energyFloat = clamp(state.energyFloat - 4, 0, maxEnergy());

    exploreSpentEnergyLegacy = Math.round(beforeEnergy - state.energyFloat);
    exploreSpentHungerLegacy = Math.round(beforeHunger - state.hungerFloat);

    state.hunger = Math.round(state.hungerFloat);
    state.energy = Math.round(state.energyFloat);

    const dur = 12 + Math.floor(Math.random() * 7);

    state.isExploring = true;
    state.exploreSecondsLeft = dur;
    state.exploreTotalSeconds = dur;
    state.exploreStartEnergy = Math.round(beforeEnergy);
    state.exploreStartClock = formatTowerClock().text;
    state.exploreRoom = target;

    isExploringLegacy = true;
    exploreSecondsRemainingLegacy = dur;
    exploreTargetRoomLegacy = target;
    exploreStartedAtLegacy = state.secondsAlive;

    // Wizard disappears while exploring
    wizardVisible = false;
    if (elAwaySign) elAwaySign.classList.remove('hidden');

    const roomName = ROOM_NAMES[target] || 'the tower halls';
    if (elActivityLabel) {
      elActivityLabel.textContent = `Exploring ${roomName} (${dur}s)`;
    }

    pushLog(`He slips out to explore the ${roomName.toLowerCase()}.`);
    updateUi();
  }

    // --------------------------------------------------------------
  // State accessor (used by applyDamage + other helpers)
  // --------------------------------------------------------------
  function getState() {
    return state;
  }

  // --- DAMAGE HELPERS ---------------------------------------------
function _num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function _getHPRef(s) {
  // Prefer nested stats object if you have one, otherwise use root state.
  if (s && s.stats && typeof s.stats === 'object') {
    const st = s.stats;
    const hpKey =
      ('hp' in st) ? 'hp' :
      ('health' in st) ? 'health' :
      null;

    const maxKey =
      ('maxHp' in st) ? 'maxHp' :
      ('max_hp' in st) ? 'max_hp' :
      ('maxHealth' in st) ? 'maxHealth' :
      ('max_health' in st) ? 'max_health' :
      null;

    if (hpKey) return { obj: st, hpKey, maxKey };
  }

  const hpKey =
    (s && 'hp' in s) ? 'hp' :
    (s && 'health' in s) ? 'health' :
    'hp';

  const maxKey =
    (s && 'maxHp' in s) ? 'maxHp' :
    (s && 'max_hp' in s) ? 'max_hp' :
    (s && 'maxHealth' in s) ? 'maxHealth' :
    (s && 'max_health' in s) ? 'max_health' :
    null;

  return { obj: s, hpKey, maxKey };
}

/**
 * applyDamage(rawDamage, sourceName?)
 * - Subtracts damage from player HP/health (supports either s.hp/s.health OR s.stats.hp/s.stats.health)
 * - Applies defense reduction if available
 * - Saves + refreshes UI if those functions exist
 */
function applyDamage(rawDamage, sourceName) {
  const s = getState ? getState() : null;
  if (!s) return 0;

  const dmgIn = Math.max(0, Math.floor(_num(rawDamage, 0)));

  // Try to find defense in common places
  const defense =
    _num((s.stats && (s.stats.defense ?? s.stats.def)) ?? s.defense ?? s.def ?? 0, 0);

  const finalDmg = Math.max(0, dmgIn - defense);

  const ref = _getHPRef(s);

  // Initialize HP if missing
  if (ref.obj && (ref.obj[ref.hpKey] == null)) {
    const mx = ref.maxKey && ref.obj[ref.maxKey] != null ? _num(ref.obj[ref.maxKey], 10) : 10;
    ref.obj[ref.hpKey] = mx;
    if (ref.maxKey && ref.obj[ref.maxKey] == null) ref.obj[ref.maxKey] = mx;
  }

  // Apply
  const cur = _num(ref.obj[ref.hpKey], 0);
  ref.obj[ref.hpKey] = Math.max(0, cur - finalDmg);

  // Optional log
  if (typeof addLog === 'function' && finalDmg > 0) {
    addLog(`${sourceName || 'Something'} hits you for ${finalDmg}.`);
  }

  // Optional UI refresh hooks (safe-guarded)
  if (typeof renderHUD === 'function') renderHUD();
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof refreshUI === 'function') refreshUI();

  // Save if your project has it
  if (typeof saveState === 'function') saveState();

  return finalDmg;
}

  function resolveExploreEncounter(roomId) {
  const roomName = ROOM_NAMES[roomId] || 'the tower';
  const luck = totalLuck();

  const enemyChanceBase = 0.30;
  const lootChanceBase  = 0.70;

  const results = {
    roomName,
    enemy: null,
    loot: null,
    rationFound: 0,
    survived: true,
    injury: 0,
    narration: [],
    bookSubject: null,
    text: ''
  };

  const willLoot = Math.random() < (lootChanceBase + luck * 0.04);

  if (willLoot) {
    if (Math.random() < 0.7) {
      const tableItem = rollRoomTableLoot(roomId);
      if (tableItem) {
        if (tableItem.type === 'rations') {
          results.rationFound += 1;
        } else {
          results.loot = tableItem;
        }
      }
    }

    if (!results.loot && results.rationFound <= 0) {
      const type = pickItemTypeForRoom(roomId);
      const rarity = pickRarity(luck);
      results.loot = buildItem(type, rarity);
    }
  }

  if (Math.random() < 0.18) {
    results.rationFound += 1;
  }

  results.bookSubject = rollBookFragmentForRoom(roomId);

  const enemyRoll = Math.random() < (enemyChanceBase + luck * 0.03);

  if (enemyRoll) {
    const enemyName = 'Skeletons';
    results.enemy = enemyName;

    const hasStaff = !!getEquipped('staff');
    const hasRobe  = !!getEquipped('robe');

    const power = effectivePower();
    const vit   = effectiveVitality();

    const gearScore  = (hasStaff ? 2 : 0) + (hasRobe ? 2 : 0);
    const levelScore = Math.floor(state.level / 2);
    const hpRatio    = clamp(state.healthFloat / maxHealth(), 0, 1);

    const noGearPenalty = gearScore === 0 ? 3 : 0;

    const readiness =
      power +
      vit +
      gearScore +
      levelScore +
      Math.floor(hpRatio * 3) -
      noGearPenalty;

    const day = getDayNumber();
    const roomMod =
      roomId === 'observatory' ? 3 :
      roomId === 'alchemy'     ? 2 :
      roomId === 'library'     ? 2 :
      1;

    const difficulty = 4 + Math.floor(day / 2) + roomMod;

    results.narration.push(
      `He ran into ${enemyName.toLowerCase()} in the ${roomName.toLowerCase()}.`
    );

    if (readiness >= difficulty) {
      results.narration.push(
        gearScore > 0
          ? 'Well-equipped and wary, he drove them back into the dark between stones.'
          : 'Ill-equipped and exposed, he survived by luck and frantic footwork.'
      );

      gainXp(6 + roomMod);
      results.text = `He fought off ${enemyName.toLowerCase()}.`;

    } else {
      results.injury = randInt(2, 6) + roomMod;
      applyDamage(results.injury);

      results.narration.push(
        'They caught him off-guard, and the tower took note of his weakness.'
      );

      results.survived = state.healthFloat > 0;

      if (!results.survived) {
        results.narration.push(
          'The tower records this as a lesson written too late.'
        );
        results.text = `He fell to ${enemyName.toLowerCase()}.`;
      } else {
        results.narration.push(
          'He escaped with bruises that will ache when the tower grows quiet.'
        );
        results.text = `He escaped ${enemyName.toLowerCase()} with injuries.`;
      }
    }
  }

  return results;
}

  let exploreOverlayStyled = false;

  function applyExploreOverlayStyles() {
    const elExploreOverlay = document.getElementById('explore-result');
  const canvas = document.getElementById('gameCanvas');

    if (!elExploreOverlay) return;

    const canvasEl = document.getElementById('gameCanvas');
    const host =
      (canvasEl && canvasEl.closest('.game-column')) ||
      getGameFrameEl();

    if (host && elExploreOverlay.parentElement !== host) {
      elExploreOverlay.remove();
      host.appendChild(elExploreOverlay);
    }

    if (host) {
      const computed = window.getComputedStyle(host);
      if (computed.position === 'static') host.style.position = 'relative';
    }

    exploreOverlayStyled = true;
  }

  function closeExploreResults() {
    if (elExploreOverlay) elExploreOverlay.classList.add('hidden');

    // Wizard returns ONLY after you close results
    wizardVisible = true;

    if (elAwaySign) elAwaySign.classList.add('hidden');

    renderNextGoal();
    renderEquippedStrip();

    updateActivityLabel();
    updateUi();
  }

function finishExploration() {
  if (!state.isExploring && !isExploringLegacy) return;

  state.isExploring = false;
  isExploringLegacy = false;

  if (elAwaySign) elAwaySign.classList.add('hidden');

  // Support both new + legacy naming
  const roomId =
    state.exploreTargetRoom ||
    state.exploreRoom ||
    exploreTargetRoomLegacy ||
    state.currentRoom ||
    'entry';

  const roomName = ROOM_NAMES[roomId] || 'the tower';
  const endClock = formatTowerClock();

  // ---- 1) Base exploration outcome (your existing system)
  const baseOutcome = resolveExploreEncounter(roomId) || {};

  // ---- 2) Optional lightweight combat overlay (new system)
  // This is designed to be non-destructive if you haven't loaded the new files yet.
  let combatOutcome = null;

  try {
    if (typeof window.runExploreEncounter === "function") {
      const player = {
        level: state.level,
        health: (state.healthFloat ?? state.health),
        attack: (state.attack ?? 1),
        defense: (state.defense ?? 0)
      };

      const encounter = window.runExploreEncounter(player, roomId);

      if (encounter && encounter.type && encounter.type !== "no_combat") {
        const enemy = encounter.enemy;

        if (enemy && typeof window.resolveSimpleCombat === "function") {
          const result = window.resolveSimpleCombat(player, enemy);

          // Write back updated player health to your real state
          if (typeof state.healthFloat === "number") {
            state.healthFloat = player.health;
          } else {
            state.health = player.health;
          }

          if (result.playerLost) {
            combatOutcome = {
              enemy,
              survived: false,
              playerLost: true,
              playerWon: false,
              injury: result.enemyDmg ?? 0,
              narration: [
                `He was defeated by <strong>${enemy.name}</strong>.`
              ],
              text: `He fought ${enemy.name} and was defeated.`,
            };
          } else if (result.playerWon) {
            combatOutcome = {
              enemy,
              survived: true,
              playerLost: false,
              playerWon: true,
              injury: result.enemyDmg ?? 0,
              narration: [
                `He overcame <strong>${enemy.name}</strong>.`
              ],
              text: `He defeated ${enemy.name}!`,
            };
          } else {
            combatOutcome = {
              enemy,
              survived: true,
              injury: result.enemyDmg ?? 0,
              playerLost: false,
              playerWon: false,
              narration: [
                `He clashed with <strong>${enemy.name}</strong>. He dealt ${result.playerDmg ?? 0} and took ${result.enemyDmg ?? 0}.`
              ],
              text: `He clashed with ${enemy.name}.`,
            };
          }
        } else {
          // If resolveSimpleCombat isn't loaded, still allow narrative text from encounter
          combatOutcome = {
            enemy,
            survived: true,
            injury: 0,
            narration: [encounter.text || `A hostile presence stirred in the ${roomName}.`],
            text: encounter.text || `A tense moment passed in the ${roomName}.`
          };
        }
      } else if (encounter && encounter.type === "no_combat" && encounter.text) {
        // Optional harmless flavor line
        combatOutcome = { text: encounter.text };
      }
    }
  } catch (e) {
    // Fail silently to avoid breaking your exploration flow
    combatOutcome = null;
  }

  // ---- 3) Merge outcomes safely
  // Keep your base structure intact for rations/loot/lore logic.
  const outcome = {
    ...baseOutcome
  };

  // If combat happened, merge the enemy/narration/injury/survival without deleting base fields.
  if (combatOutcome) {
    if (combatOutcome.enemy) outcome.enemy = combatOutcome.enemy;

    const baseNarr = Array.isArray(baseOutcome.narration) ? baseOutcome.narration : [];
    const combNarr = Array.isArray(combatOutcome.narration) ? combatOutcome.narration : [];
    const mergedNarr = [...baseNarr, ...combNarr].filter(Boolean);

    if (mergedNarr.length) outcome.narration = mergedNarr;

    const baseInjury = Number(baseOutcome.injury || 0);
    const combInjury = Number(combatOutcome.injury || 0);
    // Display-only injury merge (doesn't double-apply damage)
    outcome.injury = baseInjury + combInjury;

    if (typeof combatOutcome.survived === "boolean") {
      // Combat loss should override survival
      outcome.survived = combatOutcome.survived;
    }

    // If your baseOutcome doesn't already supply a text line, use combat text
    if (!baseOutcome.text && combatOutcome.text) {
      outcome.text = combatOutcome.text;
    }
  }


  // ==========================================================
  // GOLD DROP (on successful exploration combat)
  // ==========================================================
  outcome.goldFound = 0;

  // If you used the combat overlay, use that win state.
  // Otherwise fallback to the baseOutcome text (legacy).
  const didWinFight =
    (combatOutcome && combatOutcome.playerWon === true) ||
    (!combatOutcome && baseOutcome && (baseOutcome.text || '').includes('fought off'));

  if (didWinFight) {
    const luck = (typeof totalLuck === 'function') ? totalLuck() : 0;

    // 45% base + 3% per luck (cap at 90%)
    const dropChance = Math.min(0.90, 0.45 + (Number(luck) * 0.03));

    if (Math.random() < dropChance) {
      const levelBonus = Math.floor((Number(state.level) || 1) / 2);
      const amount = (typeof randInt === 'function')
        ? randInt(2, 6) + levelBonus
        : (2 + Math.floor(Math.random() * 5)) + levelBonus; // fallback 2..6

      outcome.goldFound = amount;
      state.gold = (Number(state.gold) || 0) + amount;

      if (typeof pushLog === 'function') pushLog(`+${amount} gold.`);
    }
  }

  // ---- 4) Your existing reward/discovery logic
  if (outcome.rationFound > 0) {
    addRations(outcome.rationFound, 'He returns with stale bread wrapped carefully in cloth.');
    setOrb('alert', true, { pulse: true });
  }

  if (outcome.loot) {
    state.inventory.push(outcome.loot);
    autoEquipIfBetter(outcome.loot);
    setOrb('loot', true, { pulse: true });
    notifyInventoryChanged();
  }

  if (outcome.bookSubject) {
    discoverLoreFragment(outcome.bookSubject);
  }

  if (outcome.survived === false) handleDeath();

  applyExploreOverlayStyles();

  // ---- 5) Your existing overlay copy
  if (elExploreBody && elExploreOverlay) {
    const wizName =
      (state.name && state.name.trim()) ||
      (window.WIZARD_NAME && String(window.WIZARD_NAME).trim()) ||
      'The wizard';

    const duration    = state.exploreTotalSeconds || exploreSecondsRemainingLegacy || 0;
    const energyStart = state.exploreStartEnergy || state.energy;
    const energySpent = Math.max(0, energyStart - state.energy);

    const panicLine = EXPLORE_PANIC_LINES[
      Math.floor(Math.random() * EXPLORE_PANIC_LINES.length)
    ];

    const lines = [];

    lines.push(`<strong>${wizName} returns from the ${roomName}.</strong>`);
    lines.push(`Time away: ${duration} seconds.`);
    lines.push(`Energy spent: ${energySpent}.`);
    lines.push(`Hunger spent: ${exploreSpentHungerLegacy || 0}.`);
    lines.push(`He left at: ${state.exploreStartClock || 'unknown time'}.`);
    lines.push(`He returned at: ${endClock.text}.`);
    lines.push(`Notes: ${panicLine}`);

    // If we have a general outcome.text line, include it cleanly
    if (outcome.text) {
      lines.push('');
      lines.push(outcome.text);
    }

    if (outcome.enemy) {
      lines.push('');
      if (Array.isArray(outcome.narration) && outcome.narration.length) {
        outcome.narration.forEach(n => lines.push(n));
      } else {
        lines.push(`A hostile encounter occurred in the ${roomName}.`);
      }

      if (outcome.injury > 0 && outcome.survived !== false) {
        lines.push(`He suffered <strong>${outcome.injury}</strong> damage in the encounter.`);
      }

      if (outcome.survived === false) {
        lines.push('<strong>He died because he was not well prepared or equipped.</strong>');
      }
    }

    if (outcome.loot) {
      lines.push('');
      lines.push(`He found: <strong>${outcome.loot.name}</strong>.`);
    } else {
      const EMPTY_LINES = [
  'He comes back empty-handed, but insists the experience was “useful”.',
  'He returns with nothing but dust on his sleeves and a strange look in his eye.',
  'He found no salvage worth keeping this time.'
];
lines.push(EMPTY_LINES[Math.floor(Math.random() * EMPTY_LINES.length)]);
    }

    if (outcome.goldFound > 0) {
      lines.push(`He also recovered <strong>${outcome.goldFound}</strong> gold.`);
    }

    if (outcome.rationFound > 0) {
      lines.push(`He also recovered <strong>${outcome.rationFound}</strong> ration${outcome.rationFound > 1 ? 's' : ''}.`);
    }

    if (outcome.bookSubject) {
      const pretty = outcome.bookSubject.charAt(0).toUpperCase() + outcome.bookSubject.slice(1);
      lines.push(`A torn codex page appears among his belongings: <strong>${pretty}</strong>.`);
    }

    elExploreBody.innerHTML = lines.map(l => `<p>${l}</p>`).join('');
    elExploreOverlay.classList.remove('hidden');
  }

  if (state.alive) {
    pushLog(`He returns from the ${roomName.toLowerCase()}, brushing dust from his sleeves.`);
  }

  try {
    window.dispatchEvent(new CustomEvent('ns:legacy-exploration',{detail:{
      roomId, roomName,
      enemy: outcome.enemy && (outcome.enemy.name || outcome.enemy),
      survived: outcome.survived !== false,
      loot: outcome.loot || null,
      goldFound: outcome.goldFound || 0,
      rationFound: outcome.rationFound || 0,
      level: state.level
    }}));
  } catch (_) {}

  updateActivityLabel();
  updateUi();
}

  function tickExplorationLegacy() {
    if (!isExploringLegacy) return;

    if (exploreSecondsRemainingLegacy > 0) {
      exploreSecondsRemainingLegacy--;

      const roomName = ROOM_NAMES[exploreTargetRoomLegacy] || 'the tower halls';
      if (elActivityLabel) {
        elActivityLabel.textContent =
          `Exploring ${roomName} (${exploreSecondsRemainingLegacy}s)`;
      }

      if (exploreSecondsRemainingLegacy === 0) {
        finishExploration();
      }
    }
  }

  // ==============================================================
  // Fate
  // ==============================================================

  function classifyFate() {
    const day      = getDayNumber();
    const align    = alignmentScore();
    const level    = state.level;
    const hunger   = state.hunger;
    const rituals  = state.ritualCount || 0;
    const feeds    = state.feedCount   || 0;
    const minutes  = Math.floor(state.secondsAlive / 60);

    const wizName =
      (state.name && state.name.trim()) ||
      (window.WIZARD_NAME && String(window.WIZARD_NAME).trim()) ||
      'the Dustling';

    let id, title, summary;

    if (state.secondsAlive < 60) {
      id = 'brief-spark';
      title = 'The Brief Spark';
      summary = 'He barely had time to become a problem, let alone a person.';
    }
    else if (hunger === 0) {
      id = 'starved-candle';
      title = 'The Starved Candle';
      summary = 'He burned attention on study and ritual while the body underneath him emptied out.';
    }
    else if (align >= 6 && rituals <= 1) {
      id = 'saint-of-stairs';
      title = 'Saint of the High Stairs';
      summary = 'He climbed as far as he could without ever quite learning how to hate.';
    }
    else if (align <= -6 && rituals >= 3) {
      id = 'hollow-ascendant';
      title = 'Hollow Ascendant';
      summary = 'Power came. The bill arrived early.';
    }
    else if (level >= 5 && day >= 5 && feeds >= 8) {
      id = 'tower-veteran';
      title = 'Tower Veteran';
      summary = 'He lasted longer than most, long enough for the tower to miss his footsteps.';
    }
    else {
      id = 'quiet-failure';
      title = 'The Quiet Failure';
      summary = 'Nothing spectacular, nothing apocalyptic—just one more life that never fully chose a side.';
    }

    const codexText = [
      `${wizName} began as a dust-covered nobody at the tower doors and ended as "${title}".`,
      '',
      `He survived for ${minutes} minute(s), reaching level ${level} by the time his story closed.`,
      `Along the way he ate ${feeds} recorded meals and stepped into ${rituals} ritual circles.`,
      '',
      `The Codex files this fate under "${title}" with the following note:`,
      `"${summary}"`
    ].join('\n');

    return { id, title, summary, codexText };
  }

  function recordFateInLore(fate) {
    lastFate = fate;

    const entryId = 'last-fate';
    const text    = fate.codexText;

    let entry = LORE_ENTRIES.find(e => e.id === entryId);
    if (!entry) {
      entry = {
        id: entryId,
        label: 'Last Fate',
        subject: 'chronicle',
        text,
        dynamic: false
      };
      LORE_ENTRIES.push(entry);
    } else {
      entry.text = text;
    }
  }

  function handleDeath() {
    if (!state.alive) return;

    state.alive = false;
    state.healthFloat = 0;
    state.health = 0;

    const fate = classifyFate();
    recordFateInLore(fate);

    pushLog('His spark goes out. The tower keeps your secret.');
    pushLog(`The Codex quietly files this end under: "${fate.title}".`);

    setOrb('danger', true, { pulse: true });
    setOrb('lore', true, { pulse: true });

    currentLoreId = 'last-fate';
    updateUi();
  }

  // ==============================================================
  // Activity label
  // ==============================================================

  function updateActivityLabel() {
    if (!elActivityLabel) return;

    if (state.isExploring) {
      const roomId   = state.exploreRoom || state.currentRoom || 'entry';
      const roomName = ROOM_NAMES[roomId] || 'the tower';
      const remaining = state.exploreSecondsLeft || 0;
      const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      elActivityLabel.textContent = `Exploring ${roomName} (${mm}:${ss})`;
    } else {
      elActivityLabel.textContent = '';
    }
  }

  // ==============================================================
  // UI
  // ==============================================================

  
function raritySlugFromItem(item) {
  if (!item) return 'common';
  const r = String(item.rarity || item.rarityLabel || 'common').toLowerCase();
  // normalize a few labels
  if (r.includes('uncommon')) return 'uncommon';
  if (r.includes('legend')) return 'legendary';
  if (r.includes('myth')) return 'mythic';
  if (r.includes('epic') || r.includes('purple') || r.includes('magick')) return 'epic';
  if (r.includes('rare')) return 'rare';
  return 'common';
}

function formatBonusLines(item) {
  if (!item) return [];
  const b = item.bonus || item.bonuses || item.stats || {};
  const rows = [];
  const push = (label, v) => {
    if (v === undefined || v === null) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return;
    rows.push(`${n > 0 ? '+' : ''}${n} ${label}`);
  };

  push('Power', b.power);
  push('Insight', b.insight);
  push('Vitality', b.vitality);
  push('Corruption', b.corruption);
  push('HP', b.hp);
  push('DEF', b.def);
  push('ATK', b.atk);
  push('Crit', b.crit);
  push('Energy', b.energy);
  push('Hunger', b.hunger);

  return rows.slice(0, 3);
}


// ==============================================================
  // HUD layout helpers (Next Goal card + Equipped strip positioning)
  // ==============================================================

  function injectHudUpgradeStylesOnce() {
    if (document.getElementById('wf-hud-upgrades-style')) return;
    const style = document.createElement('style');
    style.id = 'wf-hud-upgrades-style';
    style.textContent = `
      .side-panel.wf-hud-upgrades .side-top{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;}
      .side-panel.wf-hud-upgrades .next-goal-card{flex:1 1 0;padding:6px;background:rgba(10,7,24,.8);border:1px solid rgba(117,95,176,.35);border-radius:4px;}
      .side-panel.wf-hud-upgrades .next-goal-title{font-size:11px;opacity:.85;margin-bottom:4px;letter-spacing:.2px;}
      .side-panel.wf-hud-upgrades .next-goal-line{font-size:10px;line-height:1.2;opacity:.92;}
      .side-panel.wf-hud-upgrades .next-goal-card{flex:0 0 140px; max-width:140px;}
      .side-panel.wf-hud-upgrades .stats-panel{flex:1 1 auto; min-width:260px; margin-left:auto;}
      .side-panel.wf-hud-upgrades #equipped-strip{display:flex;align-items:center;gap:6px;max-width:65%;overflow:hidden;}
      .side-panel.wf-hud-upgrades #equipped-strip .equip-pill{max-width:180px;}
      .side-panel.wf-hud-upgrades #equipped-strip .equip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;max-width:140px;}
      .log-title{display:flex;align-items:center;justify-content:space-between;}
      .log-title #equipped-strip{display:flex;align-items:center;gap:6px;max-width:70%;overflow:hidden;}
      .log-title #equipped-strip .equip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;max-width:140px;}
    `;
    document.head.appendChild(style);
  }

  let hidStrayNextGoalMini = false;

 function ensureHudUpgradesLayout() {
  injectHudUpgradeStylesOnce();

  const sidePanel = document.querySelector('.side-panel');
  if (sidePanel) {
    sidePanel.classList.add('wf-hud-upgrades');

    const sideTop = sidePanel.querySelector('.side-top');
    if (sideTop) {
      // Ensure expected containers exist (match index.html structure)
      let sideHints = sideTop.querySelector('.side-hints');
      let sideStats = sideTop.querySelector('.side-stats');

      if (!sideHints) {
        sideHints = document.createElement('div');
        sideHints.className = 'side-hints';
        sideTop.insertBefore(sideHints, sideTop.firstChild);
      }
      if (!sideStats) {
        sideStats = document.createElement('div');
        sideStats.className = 'side-stats';
        sideTop.appendChild(sideStats);
      }

      // 1) Remove the OLD/extra JS-created Next Goal card if it exists
      const strayGoalCard = document.getElementById('next-goal-card');
      if (strayGoalCard) strayGoalCard.remove();

      // 2) If a .stats-panel exists from older code, move stat rows BACK into .side-stats and remove it
      const statsPanel = sidePanel.querySelector('.stats-panel');
      if (statsPanel) {
        statsPanel.querySelectorAll('.stat-row').forEach((row) => sideStats.appendChild(row));
        statsPanel.remove();
      }

      // 3) Ensure the REAL #next-goal card lives inside .side-hints (your index.html one)
      const goalCard = document.getElementById('next-goal');
      if (goalCard && goalCard.parentElement !== sideHints) {
        goalCard.remove();
        sideHints.prepend(goalCard);
      }

      // ---- Quick Panel card under Next Goal
let quick = document.getElementById('quick-panel');
if (!quick) {
  quick = document.createElement('div');
  quick.id = 'quick-panel';
  quick.className = 'quick-panel';
  quick.innerHTML = `
    <div class="quick-title">QUICK</div>
    <div class="quick-body">
      <div class="quick-line" id="quick-line1">Tip: Explore to find missing gear.</div>
      <div class="quick-line" id="quick-line2">Hint: Meditate to raise Spirit.</div>
    </div>
  `;
}
if (quick.parentElement !== sideHints) {
  quick.remove();
  sideHints.appendChild(quick);
}

      // 4) Remove any stray stat-row that says Next Goal (just in case)
      sidePanel.querySelectorAll('.stat-row').forEach((row) => {
        const labelSpan = row.querySelector('span:first-child');
        const label = labelSpan ? labelSpan.textContent.trim() : '';
        if (label === 'Next Goal') row.remove();
      });
    }
  }

  // ---- Equipped strip on the Tower Log header line
  const logTitle = document.querySelector('.log-title');
  if (logTitle) {
    let eq = document.getElementById('equipped-strip');
    if (!eq) {
      eq = document.createElement('div');
      eq.id = 'equipped-strip';
    }
    if (eq.parentElement !== logTitle) {
      eq.remove();
      logTitle.appendChild(eq);
    }
  }

  // Refresh cached refs for renderers
  elGoal1 = document.getElementById('next-goal-line1');
  elGoal2 = document.getElementById('next-goal-line2');
  elEquippedStrip = document.getElementById('equipped-strip');
}

function renderEquippedStrip() {
  if (!elEquippedStrip) return;
  const eq = state.equipped || {};
  const slots = [
    { key: 'staff', label: 'Staff', icon: '🪄' },
    { key: 'robe',  label: 'Robe',  icon: '🧥' },
    { key: 'ring',  label: 'Ring',  icon: '💍' }
  ];

  elEquippedStrip.innerHTML = slots.map(s => {
    const it = eq[s.key];
    const rarity = raritySlugFromItem(it);
    const name = it ? (it.name || s.label) : `No ${s.label}`;
    const bonusLines = it ? formatBonusLines(it) : [];
    const tooltip = it
      ? `${name}\n${(it.rarityLabel || it.rarity || '').toString()}${bonusLines.length ? `\n${bonusLines.join('\n')}` : ''}`
      : `${name}\n(Equip gear for bonuses)`;

    return `
      <span class="equip-pill ${it ? '' : 'is-empty'}" data-slot="${s.key}" data-rarity="${rarity}" title="${tooltip.replace(/"/g, '&quot;')}">
        <span class="equip-slot">${s.icon}</span>
        <span class="equip-name">${name}</span>
      </span>
    `;
  }).join('');

  // Let players jump straight to inventory to change gear
  elEquippedStrip.querySelectorAll('.equip-pill').forEach(p => {
    p.addEventListener('click', () => {
      if (window.WF_Inventory && typeof window.WF_Inventory.open === 'function') window.WF_Inventory.open();
      else if (window.WFInventory && typeof window.WFInventory.open === 'function') window.WFInventory.open();
    }, { once: true });
  });
}

function getNextGoalLines() {
  const lines = [];

  // 1) Emergency: hunger
  if (state.alive && state.hunger <= 15) {
    lines.push('Hunger is low — Feed to avoid HP drain.');
  }

  // 2) Unlock: Study Glyphs
  if (state.alive && (state.spirit || 0) < 2) {
    lines.push('Meditate to raise Spirit (2) — unlock Study Glyphs.');
  }

  // 3) Gear chase
  const eq = state.equipped || {};
  if (!eq.staff || !eq.robe || !eq.ring) {
    const missing = [
      !eq.staff ? 'Staff' : null,
      !eq.robe ? 'Robe' : null,
      !eq.ring ? 'Ring' : null
    ].filter(Boolean);
    lines.push(`Explore for gear — missing: ${missing.join(', ')}.`);
  }

  // 4) Next form milestone
  const form = getCurrentForm();
  const next = FORMS
    .filter(f => f.path === 'neutral' && f.minLevel > form.minLevel)
    .sort((a, b) => a.minLevel - b.minLevel)[0];

  if (next && state.level < next.minLevel) {
    lines.push(`Reach Level ${next.minLevel} to become ${next.name}.`);
  }

  if (!lines.length) {
    lines.push('Keep exploring — hunt gear, build stats, and push the next evolution.');
  }

  return [lines[0], lines[1] || ''];
}

function renderNextGoal() {
  if (!elGoal1) return;
  const [l1, l2] = getNextGoalLines();
  elGoal1.textContent = l1 || '—';
  if (elGoal2) elGoal2.textContent = l2 || '';
}

function playEvolveFx() {
  const frame = document.querySelector('.frame');
  if (frame) {
    frame.classList.remove('wf-evolve-shake');
    // force reflow so the animation can retrigger
    void frame.offsetWidth;
    frame.classList.add('wf-evolve-shake');
    setTimeout(() => frame.classList.remove('wf-evolve-shake'), 450);
  }
  if (elForm) {
    elForm.classList.remove('wf-evolve-pulse');
    void elForm.offsetWidth;
    elForm.classList.add('wf-evolve-pulse');
    setTimeout(() => elForm.classList.remove('wf-evolve-pulse'), 1100);
  }
}

  function updateUi() {
    const form = getCurrentForm();

    if (elLevel)  elLevel.textContent  = state.level;
    if (elForm)   elForm.textContent   = form.name;
    if (elName)   elName.textContent   = state.name || '—';

    if (elPower)   elPower.textContent   = effectivePower();
    if (elInsight) elInsight.textContent = effectiveInsight();
    if (elVital)   elVital.textContent   = effectiveVitality();
    if (elCorrupt) elCorrupt.textContent = state.corruption + gearBonusStat('corruption');

    // --- WF: tag the Corruption stat row for special styling (CSS hooks)
if (elCorrupt) {
  const crRow = elCorrupt.closest('.stat-row');
  if (crRow) {
    crRow.classList.add('is-corruption');
    const v = Number(elCorrupt.textContent || 0);
    crRow.classList.toggle('has-corruption', v > 0);
  }
}

    if (elXp)     elXp.textContent     = state.xp;
    if (elHealth) elHealth.textContent = state.health;
    if (elHunger) elHunger.textContent = state.hunger;
    if (elEnergy) elEnergy.textContent = state.energy;
    if (elMood)   elMood.textContent   = state.mood;
    if (elKP)     elKP.textContent     = state.knowledgePoints;

    if (elRoomLabelGame) {
      const roomId = state.currentRoom || 'entry';
      elRoomLabelGame.textContent = ROOM_NAMES[roomId] || 'Tower';
    }
    {
      const btnFeedEl = document.getElementById('btn-feed-rations') || document.getElementById('btn-feed');
      if (btnFeedEl) {
        const r = getRations();
        btnFeedEl.textContent = `Feed rations(${r})`;
        btnFeedEl.disabled = !state.alive || r <= 0;
        btnFeedEl.style.whiteSpace = 'nowrap';
      }
    }
    {
      const btnStudyEl = document.getElementById('btn-study');
      if (btnStudyEl) {
        btnStudyEl.textContent = (state.alive && state.spirit >= 2)
          ? 'Study Glyphs'
          : 'Study Magic';
      }
    }
    {
      const btnExploreEl = document.getElementById('btn-explore');
      if (btnExploreEl) {
        const lockedByReport = isExploreResultsOpen();
        btnExploreEl.disabled = !state.alive || state.isExploring || lockedByReport;
      }
    }

    renderNextGoal();
    renderEquippedStrip();

    updateActivityLabel();
    renderOrbs();
  }

    // ==============================================================
  // Viewfinder game bridge for Inventory / Character panels
  // ==============================================================

  window.WF_GAME = window.WF_GAME || {
    getState() {
      return state;
    },
    //save: saveGame,
    pushLog,
    setOrb,
    updateUi
  };

  // ==============================================================
  // External UI binding
  // ==============================================================

  function bindExternalUIs() {
    const inv = window.WFInventory || window.InventoryUI;
    const chr = window.WFCharacter || window.CharacterUI;

    if (inv && typeof inv.init === 'function') {
      inv.init({ state, pushLog, setOrb, updateUi });
    }
    if (chr && typeof chr.init === 'function') {
      chr.init({ state, pushLog, setOrb, updateUi });
    }
  }

  window.addEventListener('load', bindExternalUIs);
  setTimeout(bindExternalUIs, 0);
window.addEventListener('openMenuLore', openMenuLore);

  // ==============================================================
  // Button bindings (safe DOM lookups; avoids ReferenceError if vars are missing)
  // ==============================================================

  // Actions
  document.getElementById('btn-feed')?.addEventListener('click', feedWizard);
  document.getElementById('btn-feed-rations')?.addEventListener('click', feedWizard);
  document.getElementById('btn-meditate')?.addEventListener('click', meditate);
  document.getElementById('btn-study')?.addEventListener('click', studySpell);
  document.getElementById('btn-ritual')?.addEventListener('click', darkRitual);
  document.getElementById('btn-explore')?.addEventListener('click', exploreWizard);
  document.getElementById('btn-train')?.addEventListener('click', trainBody);
  document.getElementById('btn-rest')?.addEventListener('click', restWizard);
  document.getElementById('btn-sacrifice')?.addEventListener('click', sacrificeWizard);

  // Bottom bar
  document.getElementById('btn-lore')?.addEventListener('click', openLore);
  document.getElementById('btn-lore-close')?.addEventListener('click', closeLore);
  document.getElementById('btn-explore-close')?.addEventListener('click', closeExploreResults);
  document.getElementById('btn-menu-lore')?.addEventListener('click', openMenuLore);
  document.getElementById('btn-menu-lore-close')?.addEventListener('click', closeMenuLore);

  // =============================================================
// Bottom menu toggles (Inventory / Character / Shop)
// Click button again = close
// Uses your REAL HTML ids
// =============================================================
function setupBottomMenuToggles() {
  // prevent double-binding if boot runs more than once
  if (document.body.dataset.bottomMenuTogglesBound === '1') return;
  document.body.dataset.bottomMenuTogglesBound = '1';

  const map = {
    'btn-inventory': { overlay: 'inventory-overlay', closeIds: ['inventory-close'] },
    'btn-shop':      { overlay: 'shop-overlay',      closeIds: ['btn-shop-close'], onOpen: () => {
      if (typeof renderShop === 'function') renderShop();
    }},
    'btn-character': { overlay: 'character-overlay', closeIds: ['btn-character-close'] }
  };

  function get(overlayId) {
    const el = document.getElementById(overlayId);
    if (!el) console.warn(`[toggle] missing overlay #${overlayId}`);
    return el;
  }

  function setOpen(overlayId, open) {
    const el = get(overlayId);
    if (!el) return;
    el.classList.toggle('hidden', !open);
    el.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  function toggle(overlayId) {
    const el = get(overlayId);
    if (!el) return false;
    const openNow = el.classList.contains('hidden'); // if hidden -> open it
    setOpen(overlayId, openNow);
    return openNow;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    // bottom menu buttons
    const cfg = map[btn.id];
    if (cfg) {
      e.preventDefault();
      const opened = toggle(cfg.overlay);
      if (opened && typeof cfg.onOpen === 'function') cfg.onOpen();
      return;
    }

    // close buttons (delegated)
    for (const key in map) {
      const c = map[key];
      if (c.closeIds && c.closeIds.includes(btn.id)) {
        e.preventDefault();
        setOpen(c.overlay, false);
        return;
      }
    }
  });
}

  // ==============================================================
  // Boot (run AFTER state exists)
  // ==============================================================

  function bootAfterState() {
    bindExternalUIs();
     window.setupBottomMenuToggles?.();
    ensureOrbTrayExists();
    ensureHudUpgradesLayout();
    applyExploreOverlayStyles();
    updateTowerTimeUi();
    updateUi();
    try { refreshWizardSpriteFromGear(true); } catch (e) {}
    setupNameScreenUx();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAfterState);
  } else {
    bootAfterState();
  }
  // ==============================================================
  // Core survival tick + exploration tick
  // ==============================================================

  function tickSurvival(dt) {
    if (!state.alive) return;

    state.secondsAlive += 1;
    state.idleSeconds += 1;

    const hpMax = maxHealth();
    const enMax = maxEnergy();

    state.hungerFloat = clamp(state.hungerFloat - HUNGER_DECAY_PER_SEC, 0, 100);
    state.energyFloat = clamp(state.energyFloat + ENERGY_REGEN_PER_SEC, 0, enMax);

    // slow spirit fade over time
    state.spiritFloat = clamp((state.spiritFloat || 0) - 0.02, 0, maxSpirit());

    if (state.hungerFloat <= 0) {
      state.healthFloat = clamp(state.healthFloat - STARVATION_HEALTH_LOSS, 0, hpMax);
    }

    state.hunger = Math.round(state.hungerFloat);
    state.energy = Math.round(state.energyFloat);
    state.health = Math.round(state.healthFloat);
    state.spirit = Math.round(state.spiritFloat);

    if (state.health <= 0) {
      handleDeath();
      return;
    }

    updateMood();
    updateTowerTimeUi();
    checkMilestones();
    checkRareEvents();
    maybeWanderTower();
    maybePushAmbientThought();
    updateDangerOrbFromStats();

    updateUi();
  }

  function tickExplorationModern() {
    if (!state.isExploring) return;

    if (state.exploreSecondsLeft > 0) {
      state.exploreSecondsLeft--;

      const roomName = ROOM_NAMES[state.exploreRoom] || 'the tower halls';
      if (elActivityLabel) {
        elActivityLabel.textContent =
          `Exploring ${roomName} (${state.exploreSecondsLeft}s)`;
      }

      if (state.exploreSecondsLeft === 0) {
        finishExploration();
      }
    }
  }

  // ==============================================================
  // Animation
  // ==============================================================

  function updateWizardAnim(dtSeconds) {
    if (!wizardSpriteReady) return;
    wizardAnimTime += dtSeconds;

    const FRAME_TIME = 0.16;
    const total = WIZARD_FRAME_COUNT;

    wizardFrame = Math.floor((wizardAnimTime / FRAME_TIME) % total);
  }

  // ==============================================================
  // Drawing
  // ==============================================================

  function drawBackground(w, h) {
    if (!ctx) return;

    if (bgReady) {
      const scale = Math.max(w / bgImg.width, h / bgImg.height);
      const drawW = bgImg.width * scale;
      const drawH = bgImg.height * scale;
      const dx = (w - drawW) / 2;
      const dy = (h - drawH) / 2;

      ctx.drawImage(bgImg, dx, dy, drawW, drawH);
      return;
    }

    // fallback painted room
    ctx.fillStyle = '#070410';
    ctx.fillRect(0, 0, w, h);

    const wallTop    = 8;
    const wallHeight = h - 52;

    const wallGrad = ctx.createLinearGradient(0, wallTop, 0, wallTop + wallHeight);
    wallGrad.addColorStop(0,   '#151029');
    wallGrad.addColorStop(0.4, '#1c1436');
    wallGrad.addColorStop(1.0, '#11081f');

    ctx.fillStyle = wallGrad;
    ctx.fillRect(16, wallTop, w - 32, wallHeight);

    ctx.strokeStyle = 'rgba(40, 28, 70, 0.7)';
    ctx.lineWidth = 1;

    for (let y = wallTop + 10; y < wallTop + wallHeight; y += 14) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(w - 18, y);
      ctx.stroke();
    }

    for (let x = 30; x < w - 30; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, wallTop + 8);
      ctx.lineTo(x, wallTop + wallHeight - 8);
      ctx.stroke();
    }

    // simple window glow
    const windowCenterX = w / 2;
    const windowCenterY = wallTop + 36;

    const windowGrad = ctx.createRadialGradient(
      windowCenterX, windowCenterY, 4,
      windowCenterX, windowCenterY, 40
    );
    windowGrad.addColorStop(0.0, '#f7e7a2');
    windowGrad.addColorStop(0.4, '#e3c97a');
    windowGrad.addColorStop(1.0, 'rgba(243, 217, 140, 0)');

    ctx.fillStyle = windowGrad;
    ctx.beginPath();
    ctx.arc(windowCenterX, windowCenterY, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWizard(w, h) {
    if (!ctx || !wizardSpriteReady) return;
    if (!wizardVisible) return;

    const frameX = wizardFrame * WIZARD_FRAME_WIDTH;
    const frameY = 0;

    const drawW = WIZARD_FRAME_WIDTH  * WIZARD_SCALE;
    const drawH = WIZARD_FRAME_HEIGHT * WIZARD_SCALE;

    const x = (w - drawW) / 2;
    const y = (h - drawH) / 2 + 30;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      wizardImg,
      frameX, frameY, WIZARD_FRAME_WIDTH, WIZARD_FRAME_HEIGHT,
      x, y, drawW, drawH
    );
  }

  function draw() {
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    drawBackground(w, h);
    drawWizard(w, h);

    // Optional subtle room label if you want it visually in-canvas later
  }

  // ==============================================================
  // Main loop
  // ==============================================================

  let lastFrameTime = performance.now();
  let survivalAccumulator = 0;

  function loop(now) {
    const dtMs = now - lastFrameTime;
    lastFrameTime = now;

    const dtSeconds = Math.max(0, Math.min(0.05, dtMs / 1000));

    updateWizardAnim(dtSeconds);

    // Run "1-second" survival ticks accurately
    survivalAccumulator += dtMs;
    while (survivalAccumulator >= 1000) {
      survivalAccumulator -= 1000;

      // Modern + legacy explore countdowns
      tickExplorationModern();
      tickExplorationLegacy();

            // Limited-time shop specials
      tickShopSpecial(1);

// Survival tick
      tickSurvival(1);
    }

    draw();
    requestAnimationFrame(loop);
  }

  if (canvas && ctx) {
    requestAnimationFrame(loop);
  }


