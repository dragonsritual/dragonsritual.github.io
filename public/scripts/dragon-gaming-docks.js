(()=>{
  if(window.__DRAGON_GAMING_DOCK_CONTROLLER__) return;
  window.__DRAGON_GAMING_DOCK_CONTROLLER__=true;
  const WIRE_STATE='dragon:gaming:realm-wire:state';
  const WIRE_STORE='dragon:gaming:realm-wire';
  const seed=[
    {type:'system',tone:'green',text:'Dragon Gaming Network link established.',at:Date.now()-540000},
    {type:'realm',tone:'blue',text:'The Ninth Spire reports stable passage through the upper chambers.',at:Date.now()-430000},
    {type:'discovery',tone:'gold',text:'A sealed archive entry has been added to the Realm index.',at:Date.now()-320000},
    {type:'combat',tone:'crimson',text:'WORLD EVENT: Vhalzur, the Buried Mouth remains engaged at the Ossuary Gate.',at:Date.now()-210000},
    {type:'character',tone:'violet',text:'Wizard character records are synchronized with Dragon Gaming.',at:Date.now()-90000}
  ];
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=t=>new Date(t||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const label=t=>({character:'WIZARD',combat:'COMBAT',discovery:'FOUND',realm:'REALM',system:'SYSTEM',chat:'GLOBAL'})[t]||'REALM';
  const tone=e=>e.tone||({character:'violet',combat:'crimson',discovery:'gold',realm:'blue',system:'green',chat:'cyan'})[e.type]||'silver';
  function readWire(){try{const v=JSON.parse(localStorage.getItem(WIRE_STORE)||'[]');if(Array.isArray(v)&&v.length)return v}catch{};try{localStorage.setItem(WIRE_STORE,JSON.stringify(seed))}catch{};return seed}
  function saveWire(items){try{localStorage.setItem(WIRE_STORE,JSON.stringify(items.slice(0,100)))}catch{}}
  function applyWireState(root,next){
    if(!root)return;
    if(!['collapsed','normal','expanded'].includes(next))next='normal';
    root.dataset.wireState=next;
    root.classList.toggle('is-collapsed',next==='collapsed');
    root.classList.toggle('is-normal',next==='normal');
    root.classList.toggle('is-expanded',next==='expanded');
    const rail=root.closest('[data-spire-game-rail]'); if(rail) rail.dataset.wireMode=next;
    try{localStorage.setItem(WIRE_STATE,next)}catch{}
    window.dispatchEvent(new CustomEvent('dragon:wire:state',{detail:{state:next}}));
    if(next==='expanded')setTimeout(()=>root.querySelector('[data-wire-input]')?.focus(),100);
    requestAnimationFrame(syncSpireRail);
  }
  function renderWire(root){
    if(!root)return;
    const filter=root.dataset.filter||'all',items=readWire(),shown=filter==='all'?items:items.filter(x=>x.type===filter),stream=root.querySelector('[data-wire-stream]');
    if(stream)stream.innerHTML=shown.map(e=>`<article class="realm-wire__entry tone--${tone(e)}"><time>${clock(e.at)}</time><span class="realm-wire__type">${label(e.type)}</span><p>${esc(e.text)}</p></article>`).join('');
    const newest=items[0]; if(newest){const t=root.querySelector('[data-wire-ticker-text]'),c=root.querySelector('[data-wire-collapsed-text]');if(t)t.textContent=newest.text;if(c)c.textContent=newest.text;}
  }
  function loadWizard(root,detail){
    if(!root)return; let ch=detail||null;
    if(!ch){try{ch=JSON.parse(localStorage.getItem('dragon:ninth-spire:character')||'null')}catch{}}
    ch=ch||{};
    const name=ch.name||'Dragon',level=Math.max(1,Number(ch.level)||1),hp=Math.max(0,Number(ch.health??38)),en=Math.max(0,Number(ch.energy??16)),maxHp=Math.max(hp,Number(ch.maxHealth)||100),maxEn=Math.max(en,Number(ch.maxEnergy)||100);
    const set=(sel,val)=>{const el=root.querySelector(sel);if(el)el.textContent=val};
    set('[data-wizard-name]',name); set('[data-wizard-level]',String(level)); set('[data-wizard-health-label]',String(Math.round(hp))); set('[data-wizard-energy-label]',String(Math.round(en))); set('[data-wizard-affinity]',String(ch.element||ch.affinity||ch.aspect||'UNBOUND AFFINITY').toUpperCase());
    const hb=root.querySelector('[data-wizard-health]');if(hb)hb.style.width=Math.min(100,hp/maxHp*100)+'%'; const eb=root.querySelector('[data-wizard-energy]');if(eb)eb.style.width=Math.min(100,en/maxEn*100)+'%';
  }

  function syncSpireRail(){
    const rail=document.querySelector('[data-spire-game-rail]');
    if(!rail) return;

    const wire=rail.querySelector('[data-realm-wire]');
    const wizard=rail.querySelector('[data-active-wizard]');
    if(!wire || !wizard) return;

    const isMobile=window.innerWidth<=980;
    if(isMobile){
      wire.style.removeProperty('bottom');
      wizard.style.removeProperty('bottom');
      return;
    }

    const memberClearance=92;
    const gap=10;
    const state=wire.dataset.wireState||'normal';

    wire.style.setProperty('bottom',`${memberClearance}px`,'important');
    wire.style.setProperty('right','14px','important');

    if(state==='expanded'){
      wizard.style.setProperty('display','none','important');
      return;
    }

    wizard.style.removeProperty('display');

    // The wizard's BOTTOM is always the Realm Wire's top + gap.
    // Because its bottom is anchored, opening the wizard simply grows it upward.
    const wireHeight=Math.max(38,Math.round(wire.getBoundingClientRect().height));
    wizard.style.setProperty('bottom',`${memberClearance + wireHeight + gap}px`,'important');
    wizard.style.setProperty('right','14px','important');
  }

  let railResizeObserver=null;
  function observeSpireRail(){
    const rail=document.querySelector('[data-spire-game-rail]');
    if(!rail) return;
    const wire=rail.querySelector('[data-realm-wire]');
    const wizard=rail.querySelector('[data-active-wizard]');
    railResizeObserver?.disconnect();
    if('ResizeObserver' in window){
      railResizeObserver=new ResizeObserver(()=>requestAnimationFrame(syncSpireRail));
      if(wire) railResizeObserver.observe(wire);
      if(wizard) railResizeObserver.observe(wizard);
    }
    requestAnimationFrame(syncSpireRail);
  }

  function hydrate(){
    document.querySelectorAll('[data-realm-wire]').forEach(root=>{let state='normal';try{state=localStorage.getItem(WIRE_STATE)||'normal'}catch{};applyWireState(root,state);renderWire(root)});
    document.querySelectorAll('[data-active-wizard]').forEach(root=>loadWizard(root));
    observeSpireRail();
  }
  document.addEventListener('click',e=>{
    const root=e.target.closest('[data-realm-wire]');
    if(root){
      if(e.target.closest('[data-wire-minus]')){e.preventDefault();applyWireState(root,root.dataset.wireState==='expanded'?'normal':'collapsed');return}
      if(e.target.closest('[data-wire-plus]')){e.preventDefault();applyWireState(root,root.dataset.wireState==='collapsed'?'normal':'expanded');return}
      if(e.target.closest('[data-wire-restore]')){e.preventDefault();applyWireState(root,'normal');return}
      const filter=e.target.closest('[data-wire-filter]');if(filter){root.dataset.filter=filter.dataset.wireFilter||'all';root.querySelectorAll('[data-wire-filter]').forEach(b=>b.classList.toggle('is-active',b===filter));renderWire(root);return}
    }
    const wiz=e.target.closest('[data-active-wizard]');
    if(wiz&&e.target.closest('[data-wizard-open]')){e.preventDefault();wiz.classList.toggle('is-open');requestAnimationFrame(syncSpireRail)}
  },true);
  document.addEventListener('submit',e=>{
    const form=e.target.closest('[data-wire-form]');if(!form)return;e.preventDefault();const root=form.closest('[data-realm-wire]'),input=form.querySelector('[data-wire-input]'),text=input?.value.trim();if(!text)return;
    const items=readWire();items.unshift({type:'chat',tone:'cyan',text:`YOU: ${text}`,at:Date.now()});saveWire(items);if(input)input.value='';root.dataset.filter='all';renderWire(root);
  },true);
  window.addEventListener('dragon:ninth-spire:update',e=>document.querySelectorAll('[data-active-wizard]').forEach(r=>loadWizard(r,e.detail)));
  window.addEventListener('dragon:wizard:update',e=>document.querySelectorAll('[data-active-wizard]').forEach(r=>loadWizard(r,e.detail)));
  window.addEventListener('dragon:realm:event',e=>{const ev=e.detail||{},items=readWire();items.unshift({type:ev.type||'realm',tone:ev.tone,text:ev.text||'The Realm has changed.',at:Date.now()});saveWire(items);document.querySelectorAll('[data-realm-wire]').forEach(renderWire)});
  window.addEventListener('storage',e=>{if(e.key===WIRE_STORE||e.key===WIRE_STATE)hydrate();if(e.key==='dragon:ninth-spire:character')document.querySelectorAll('[data-active-wizard]').forEach(r=>loadWizard(r))});
  window.addEventListener('resize',syncSpireRail);
  document.addEventListener('astro:page-load',hydrate);
  document.addEventListener('DOMContentLoaded',hydrate,{once:true});
  hydrate();
})();