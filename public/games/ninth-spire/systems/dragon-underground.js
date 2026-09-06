
(function(){
'use strict';
const KEY='ninthSpire.dragonUnderground.v1';
const state=JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
state.account ||= {displayName:'Dragon', accountLevel:1, memberXp:0, badges:['FOUNDING ERA'], status:'LOCAL'};
state.realm ||= {name:'Founding Realm', season:'Founding Era', worldState:'The Tower Listens', online:null};
state.club ||= {books:[], friends:[], groups:[], favorites:[], subscriptions:[], prizes:[]};
state.character ||= {element:'UNBOUND', title:'Apprentice of the Watch', profileColor:'violet'};
save();

window.DRAGON_UNDERGROUND={
  state,
  setElement(element){
    state.character.element=String(element||'UNBOUND').toUpperCase(); save();
    document.documentElement.dataset.memberElement=state.character.element.toLowerCase();
  },
  awardBadge(id){ if(!state.account.badges.includes(id)){state.account.badges.push(id);save();} },
  addBook(book){ state.club.books.push(book);save(); },
  snapshot(){return structuredClone(state);}
};

function inject(){
 if(document.getElementById('du-hud')) return;
 const hud=document.createElement('div'); hud.id='du-hud';
 hud.innerHTML=`<button class="du-sigil" aria-label="Open Dragon Underground identity">◇</button>
 <div class="du-card">
   <header><div><small>DRAGON UNDERGROUND</small><strong>${state.account.displayName}</strong></div><b>${state.account.status}</b></header>
   <nav>
    <button data-du="identity">IDENTITY</button><button data-du="realm">REALM</button>
    <button data-du="books">BOOKS</button><button data-du="honors">HONORS</button>
   </nav>
   <section data-du-panel>
    <p class="du-kicker">MEMBER CHARACTER</p>
    <h3>${state.character.title}</h3>
    <div class="du-stat"><span>ELEMENT</span><b>${state.character.element}</b></div>
    <div class="du-stat"><span>ACCOUNT LEVEL</span><b>${state.account.accountLevel}</b></div>
    <div class="du-stat"><span>BADGES</span><b>${state.account.badges.length}</b></div>
    <p class="du-note">This is the local prototype of the persistent DragonsRitual identity layer. Competitive inventory, prizes, trades and account authority belong on the server when connected.</p>
   </section>
 </div>`;
 document.body.appendChild(hud);
 hud.querySelector('.du-sigil').onclick=()=>hud.classList.toggle('open');
 const panel=hud.querySelector('[data-du-panel]');
 hud.querySelectorAll('[data-du]').forEach(btn=>btn.onclick=()=>{
   const k=btn.dataset.du;
   if(k==='realm') panel.innerHTML=`<p class="du-kicker">REALM STATUS</p><h3>${state.realm.name}</h3><div class="du-stat"><span>ERA</span><b>${state.realm.season}</b></div><div class="du-stat"><span>CONDITION</span><b>${state.realm.worldState}</b></div><div class="du-stat"><span>WIZARDS ONLINE</span><b>—</b></div><p class="du-note">Live population and global events activate only from the authenticated realm service.</p>`;
   if(k==='books') panel.innerHTML=`<p class="du-kicker">MEMBER LIBRARY</p><h3>Books & Grimoires</h3><div class="du-stat"><span>COLLECTED</span><b>${state.club.books.length}</b></div><div class="du-stat"><span>BOOK CLUB BRIDGE</span><b>READY</b></div><p class="du-note">Designed to hold Ninth Spire grimoires separately from real DragonsRitual Book Club reading, while allowing opt-in crossover achievements.</p>`;
   if(k==='honors') panel.innerHTML=`<p class="du-kicker">HONORS</p><h3>Badges & History</h3>${state.account.badges.map(x=>`<div class="du-badge">${x}</div>`).join('')}<p class="du-note">Future honors include game feats, Book Club, events, leagues, creator/community distinctions and redeemable campaigns.</p>`;
   if(k==='identity') panel.innerHTML=`<p class="du-kicker">MEMBER CHARACTER</p><h3>${state.character.title}</h3><div class="du-stat"><span>ELEMENT</span><b>${state.character.element}</b></div><div class="du-stat"><span>ACCOUNT LEVEL</span><b>${state.account.accountLevel}</b></div><div class="du-stat"><span>BADGES</span><b>${state.account.badges.length}</b></div><p class="du-note">The wizard is the optional fantasy manifestation of the DragonsRitual member identity.</p>`;
 });
}
addEventListener('DOMContentLoaded',inject);
})();
