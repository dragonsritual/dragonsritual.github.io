
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
function el(tag,cls,txt){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!=null)x.textContent=txt;return x;}
function ensure(){
 if(document.getElementById('ns-mega-panel'))return;
 const game=document.getElementById('screen-game')||document.body;
 const button=el('button','small-btn ns-world-btn','WORLD');
 button.id='btn-world';button.type='button';
 const menu=document.querySelector('.bottom-menu')||document.querySelector('.menu-tabs')||document.querySelector('.game-menu');
 (menu||game).appendChild(button);

 const ov=el('div','ns-world-overlay hidden');ov.id='ns-mega-panel';
 ov.innerHTML=`<div class="ns-world-window">
 <header><div><small>THE NINTH SPIRE / DRAGON GAMING</small><h2>Tower World</h2></div><button data-ns-close>Back</button></header>
 <nav><button data-ns-tab="wizard" class="active">Wizard</button><button data-ns-tab="fight">Fight</button><button data-ns-tab="league">League</button><button data-ns-tab="wire">Tower Wire</button><button data-ns-tab="collection">Collection</button></nav>
 <main>
  <section data-ns-page="wizard"></section>
  <section data-ns-page="fight" hidden></section>
  <section data-ns-page="league" hidden></section>
  <section data-ns-page="wire" hidden></section>
  <section data-ns-page="collection" hidden></section>
 </main></div>`;
 game.appendChild(ov);
 button.onclick=()=>{ov.classList.remove('hidden');renderAll();};
 ov.querySelector('[data-ns-close]').onclick=()=>ov.classList.add('hidden');
 ov.querySelectorAll('[data-ns-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.nsTab));
}
function switchTab(id){
 document.querySelectorAll('[data-ns-tab]').forEach(b=>b.classList.toggle('active',b.dataset.nsTab===id));
 document.querySelectorAll('[data-ns-page]').forEach(p=>p.hidden=p.dataset.nsPage!==id);
 if(id==='fight')renderFight();if(id==='league')renderLeague();if(id==='wire')renderWire();if(id==='collection')renderCollection();if(id==='wizard')renderWizard();
}
function renderWizard(){
 const p=NS.profile.get(),root=document.querySelector('[data-ns-page="wizard"]'); if(!root)return;
 root.innerHTML=`<div class="ns-card ns-hero">
  <small>ACTIVE WIZARD</small><h3>${p.name||'Unnamed Wizard'}</h3>
  <p>${p.title||'Dustling of the Ninth Spire'}</p>
  <div class="ns-stats"><b>LV ${p.level||1}</b><span>FLOOR ${p.highestFloor||1}</span><span>${p.wins||0} WINS</span><span>${p.leaguePoints||0} LEGACY</span></div>
 </div>
 <div class="ns-grid">
 <div class="ns-card"><small>TOWER RECORD</small><h4>Highest floor</h4><strong>${p.highestFloor||1}</strong></div>
 <div class="ns-card"><small>HUNTS</small><h4>Creatures defeated</h4><strong>${p.wins||0}</strong></div>
 <div class="ns-card"><small>RELICS</small><h4>Items found</h4><strong>${p.itemsFound||0}</strong></div>
 <div class="ns-card"><small>BOSSES</small><h4>Boss kills</h4><strong>${p.bosses||0}</strong></div></div>`;
}
function renderFight(){
 const root=document.querySelector('[data-ns-page="fight"]');if(!root)return;
 const c=NS.combat.get();
 if(!c){const p=NS.profile.get();root.innerHTML=`<div class="ns-card"><small>ACTIVE HUNT</small><h3>Descend into the tower.</h3><p>Choose a floor. Higher floors improve enemy strength and loot potential.</p><div class="ns-floor-row"><button data-floor="-1">−</button><b data-floor-value>${p.highestFloor||1}</b><button data-floor="+1">+</button><button data-start-fight>ENTER FLOOR</button></div></div>`;let f=p.highestFloor||1;const val=root.querySelector('[data-floor-value]');root.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{f=Math.max(1,f+(b.dataset.floor==='-1'?-1:1));val.textContent=f;});root.querySelector('[data-start-fight]').onclick=()=>{NS.combat.start(f);renderFight();};return;}
 root.innerHTML=`<div class="ns-combat">
 <div class="ns-card"><small>WIZARD</small><h3>${NS.profile.get().name}</h3><div class="ns-hp"><i style="width:${Math.max(0,c.player.hp/c.player.maxHp*100)}%"></i></div><p>${c.player.hp}/${c.player.maxHp} HP · ${c.focus} Focus</p></div>
 <div class="ns-vs">VS</div>
 <div class="ns-card"><small>FLOOR ${c.floor}</small><h3>${c.enemy.name}</h3><div class="ns-hp enemy"><i style="width:${Math.max(0,c.enemy.hp/c.enemy.maxHp*100)}%"></i></div><p>${c.enemy.hp}/${c.enemy.maxHp} HP</p></div>
 </div><div class="ns-actions"><button data-act="attack">STAFF STRIKE</button><button data-act="focus">FOCUS</button><button data-act="bolt">ARCANE BOLT</button><button data-act="guard">GUARD</button><button data-act="flee">FLEE</button></div>
 <div class="ns-card ns-battlelog">${c.log.slice(0,8).map(x=>`<p>${x}</p>`).join('')}</div>`;
 root.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{NS.combat.act(b.dataset.act);renderFight();});
}
function renderLeague(){
 const root=document.querySelector('[data-ns-page="league"]');if(!root)return;const p=NS.profile.get();
 root.innerHTML=`<div class="ns-card"><small>FOUNDING ERA</small><h3>Ninth Spire League</h3><p>Permanent wizard history + seasonal competition. Live global standings activate when the DragonsRitual server bridge is connected.</p></div>
 <div class="ns-table"><div><b>#</b><b>Wizard</b><b>Level</b><b>Floor</b><b>Bosses</b><b>Legacy</b></div><div><span>1</span><strong>${p.name||'Unnamed'}</strong><span>${p.level||1}</span><span>${p.highestFloor||1}</span><span>${p.bosses||0}</span><span>${p.leaguePoints||0}</span></div></div>
 <p class="ns-offline-note">${NS.server.enabled()?'LIVE SERVER CONNECTED':'LOCAL PREVIEW — global ranks are intentionally not faked.'}</p>`;
}
function renderWire(){
 const root=document.querySelector('[data-ns-page="wire"]');if(!root)return;const events=NS.profile.get().chronicle||[];
 root.innerHTML=`<div class="ns-card"><small>GLOBAL ACTIVITY</small><h3>The Tower Wire</h3><p>Victories, boss kills, mythic finds, floor records and league milestones become public events when server-connected.</p></div>
 <div class="ns-wire">${events.length?events.slice(0,25).map(e=>`<article><time>${new Date(e.at).toLocaleString()}</time><p>${e.text}</p></article>`).join(''):'<article><p>Your Chronicle is quiet. Enter a fight or explore the tower.</p></article>'}</div>`;
}
function renderCollection(){
 const root=document.querySelector('[data-ns-page="collection"]');if(!root)return;const p=NS.profile.get(),items=p.collection||[];
 root.innerHTML=`<div class="ns-card"><small>COLLECTION LOG</small><h3>${Object.keys(p.uniqueItems||{}).length} unique discoveries</h3><p>Every notable item can preserve provenance: finder, floor, date and future trade history.</p></div><div class="ns-collection">${items.length?items.slice(0,60).map(i=>`<article class="rarity-${i.rarity}"><b>${i.name}</b><span>${i.rarity} · Floor ${i.floor||'?'}</span></article>`).join(''):'<p>No relics logged yet.</p>'}</div>`;
}
function renderAll(){renderWizard();renderLeague();renderWire();renderCollection();}
NS.on('combat:update',renderFight);NS.on('combat:end',e=>{renderFight();renderAll();});
NS.on('profile:update',renderAll);
window.addEventListener('DOMContentLoaded',ensure);
})();
