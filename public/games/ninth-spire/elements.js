// elements.js — PASS 50: complete elemental grimoire
(function () {
  'use strict';
  const MOUNT_ID='element-overlays';
  let openKey=null;
  const ELEMENT_TEMPLATES={
    fire: `
      <div id="element-fire" class="vf-overlay element-overlay element-fire hidden" aria-hidden="true">
        <div class="vf-element">
          <div class="vf-element__header">
            <div class="vf-element__title">🔥 FIRE</div>
            <button class="vf-close" type="button" data-el-close="fire" aria-label="Close FIRE">✕</button>
          </div>
          <div class="vf-element__scroll">
            <div class="vf-element__sigil">🔥</div>
            <div class="vf-element__section"><div class="vf-label">Attunement</div><div class="vf-value">Fire I</div><div class="vf-school">First Discipline of Cinder</div></div>
            <div class="vf-element__section"><div class="vf-label">Discoveries</div><ul class="vf-list"><li>Charred Stone</li><li class="locked">Unknown Ember</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Spells</div><ul class="vf-list"><li><strong>Spark</strong> <span class="meta">Cost: 2 Mana</span></li><li class="locked">Ignite <span class="meta">Requires Fire I</span></li><li class="locked">Flame Ward <span class="meta">Knowledge ≥ 2</span></li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Passives</div><ul class="vf-list"><li class="locked">Burning Resolve</li><li class="locked">Smoldering Mind</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Mastery Road</div><div class="vf-mastery"><span>I · Initiate</span><span>II · Adept</span><span>III · Magus</span><span>IV · Master</span></div></div>
            <div class="vf-element__lore">“Fire does not answer anger. It answers will.”</div>
          </div>
        </div>
      </div>`
,

    frost: `
      <div id="element-frost" class="vf-overlay element-overlay element-frost hidden" aria-hidden="true">
        <div class="vf-element">
          <div class="vf-element__header">
            <div class="vf-element__title">❄ FROST</div>
            <button class="vf-close" type="button" data-el-close="frost" aria-label="Close FROST">✕</button>
          </div>
          <div class="vf-element__scroll">
            <div class="vf-element__sigil">❄</div>
            <div class="vf-element__section"><div class="vf-label">Attunement</div><div class="vf-value">Frost I</div><div class="vf-school">First Discipline of Rime</div></div>
            <div class="vf-element__section"><div class="vf-label">Discoveries</div><ul class="vf-list"><li>Rimed Glass</li><li class="locked">Unmelted Tear</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Spells</div><ul class="vf-list"><li><strong>Rime Touch</strong> <span class="meta">Cost: 2 Mana</span></li><li class="locked">Stillblood <span class="meta">Requires Frost I</span></li><li class="locked">White Silence <span class="meta">Insight ≥ 2</span></li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Passives</div><ul class="vf-list"><li class="locked">Winter Patience</li><li class="locked">Cold Memory</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Mastery Road</div><div class="vf-mastery"><span>I · Initiate</span><span>II · Adept</span><span>III · Magus</span><span>IV · Master</span></div></div>
            <div class="vf-element__lore">“Frost is the discipline of refusing the world its next movement.”</div>
          </div>
        </div>
      </div>`
,

    poison: `
      <div id="element-poison" class="vf-overlay element-overlay element-poison hidden" aria-hidden="true">
        <div class="vf-element">
          <div class="vf-element__header">
            <div class="vf-element__title">☠ VENOM</div>
            <button class="vf-close" type="button" data-el-close="poison" aria-label="Close VENOM">✕</button>
          </div>
          <div class="vf-element__scroll">
            <div class="vf-element__sigil">☠</div>
            <div class="vf-element__section"><div class="vf-label">Attunement</div><div class="vf-value">Venom I</div><div class="vf-school">First Discipline of Bane</div></div>
            <div class="vf-element__section"><div class="vf-label">Discoveries</div><ul class="vf-list"><li>Bitter Root</li><li class="locked">Black Vial</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Spells</div><ul class="vf-list"><li><strong>Bitter Breath</strong> <span class="meta">Cost: 2 Mana</span></li><li class="locked">Venom Thread <span class="meta">Requires Venom I</span></li><li class="locked">Miasma Seal <span class="meta">Knowledge ≥ 2</span></li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Passives</div><ul class="vf-list"><li class="locked">Toxin Lore</li><li class="locked">Serpent's Measure</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Mastery Road</div><div class="vf-mastery"><span>I · Initiate</span><span>II · Adept</span><span>III · Magus</span><span>IV · Master</span></div></div>
            <div class="vf-element__lore">“Every poison is a lesson in proportion; every cure, a confession.”</div>
          </div>
        </div>
      </div>`
,

    water: `
      <div id="element-water" class="vf-overlay element-overlay element-water hidden" aria-hidden="true">
        <div class="vf-element">
          <div class="vf-element__header">
            <div class="vf-element__title">💧 WATER</div>
            <button class="vf-close" type="button" data-el-close="water" aria-label="Close WATER">✕</button>
          </div>
          <div class="vf-element__scroll">
            <div class="vf-element__sigil">💧</div>
            <div class="vf-element__section"><div class="vf-label">Attunement</div><div class="vf-value">Water I</div><div class="vf-school">First Discipline of Tide</div></div>
            <div class="vf-element__section"><div class="vf-label">Discoveries</div><ul class="vf-list"><li>Moonwater</li><li class="locked">Drowned Pearl</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Spells</div><ul class="vf-list"><li><strong>Scrying Drop</strong> <span class="meta">Cost: 2 Mana</span></li><li class="locked">Mending Current <span class="meta">Requires Water I</span></li><li class="locked">Mirror Pool <span class="meta">Insight ≥ 2</span></li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Passives</div><ul class="vf-list"><li class="locked">Patient Current</li><li class="locked">Deep Listening</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Mastery Road</div><div class="vf-mastery"><span>I · Initiate</span><span>II · Adept</span><span>III · Magus</span><span>IV · Master</span></div></div>
            <div class="vf-element__lore">“Water remembers the shape of every vessel and belongs to none.”</div>
          </div>
        </div>
      </div>`
,

    storm: `
      <div id="element-storm" class="vf-overlay element-overlay element-storm hidden" aria-hidden="true">
        <div class="vf-element">
          <div class="vf-element__header">
            <div class="vf-element__title">⚡ STORM</div>
            <button class="vf-close" type="button" data-el-close="storm" aria-label="Close STORM">✕</button>
          </div>
          <div class="vf-element__scroll">
            <div class="vf-element__sigil">⚡</div>
            <div class="vf-element__section"><div class="vf-label">Attunement</div><div class="vf-value">Storm I</div><div class="vf-school">First Discipline of Volt</div></div>
            <div class="vf-element__section"><div class="vf-label">Discoveries</div><ul class="vf-list"><li>Fulgurite</li><li class="locked">Bottled Thunder</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Spells</div><ul class="vf-list"><li><strong>Static Needle</strong> <span class="meta">Cost: 2 Mana</span></li><li class="locked">Arc Step <span class="meta">Requires Storm I</span></li><li class="locked">Thunder Ward <span class="meta">Power ≥ 2</span></li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Passives</div><ul class="vf-list"><li class="locked">Quickened Nerve</li><li class="locked">Stormsense</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Mastery Road</div><div class="vf-mastery"><span>I · Initiate</span><span>II · Adept</span><span>III · Magus</span><span>IV · Master</span></div></div>
            <div class="vf-element__lore">“The storm is not chaos. It is a law moving faster than fear.”</div>
          </div>
        </div>
      </div>`
,

    stone: `
      <div id="element-stone" class="vf-overlay element-overlay element-stone hidden" aria-hidden="true">
        <div class="vf-element">
          <div class="vf-element__header">
            <div class="vf-element__title">◉ STONE</div>
            <button class="vf-close" type="button" data-el-close="stone" aria-label="Close STONE">✕</button>
          </div>
          <div class="vf-element__scroll">
            <div class="vf-element__sigil">◉</div>
            <div class="vf-element__section"><div class="vf-label">Attunement</div><div class="vf-value">Stone I</div><div class="vf-school">First Discipline of Root</div></div>
            <div class="vf-element__section"><div class="vf-label">Discoveries</div><ul class="vf-list"><li>Loadstone</li><li class="locked">Buried Name</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Spells</div><ul class="vf-list"><li><strong>Gravel Ward</strong> <span class="meta">Cost: 2 Mana</span></li><li class="locked">Iron Skin <span class="meta">Requires Stone I</span></li><li class="locked">Fault Sign <span class="meta">Vitality ≥ 2</span></li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Passives</div><ul class="vf-list"><li class="locked">Mountain Breath</li><li class="locked">Graven Memory</li></ul></div>
            <div class="vf-element__section"><div class="vf-label">Mastery Road</div><div class="vf-mastery"><span>I · Initiate</span><span>II · Adept</span><span>III · Magus</span><span>IV · Master</span></div></div>
            <div class="vf-element__lore">“Stone keeps no diary. It simply remains long enough to become one.”</div>
          </div>
        </div>
      </div>`

  };
  const $=id=>document.getElementById(id);
  function ensureMounted(){
    const mount=$(MOUNT_ID); if(!mount) return null;
    if(!mount.dataset.built){ mount.innerHTML=Object.values(ELEMENT_TEMPLATES).join('\n'); mount.dataset.built='1'; }
    return mount;
  }
  function hideAll(){
    Object.keys(ELEMENT_TEMPLATES).forEach(key=>{const el=$(`element-${key}`); if(el){el.classList.add('hidden');el.setAttribute('aria-hidden','true');}});
    const canvas=$('gameCanvas'); if(canvas) canvas.style.visibility='visible';
    openKey=null;
  }
  function show(key){
    hideAll(); const el=$(`element-${key}`); if(!el)return;
    el.classList.remove('hidden'); el.setAttribute('aria-hidden','false');
    const canvas=$('gameCanvas'); if(canvas) canvas.style.visibility='hidden';
    openKey=key;
  }
  function toggle(key){ openKey===key ? hideAll() : show(key); }
  function bind(){
    const map={fire:'spell-fire',frost:'spell-frost',poison:'spell-poison',water:'spell-water',storm:'spell-light',stone:'spell-earth'};
    Object.entries(map).forEach(([key,id])=>{const btn=$(id); if(btn) btn.addEventListener('click',()=>toggle(key));});
    document.addEventListener('click',e=>{const t=e.target;if(!(t instanceof HTMLElement))return;if(t.getAttribute('data-el-close'))hideAll();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openKey)hideAll();});
  }
  window.addEventListener('DOMContentLoaded',()=>{ensureMounted();bind();});
  window.addEventListener('showGameScreen',ensureMounted);
})();
