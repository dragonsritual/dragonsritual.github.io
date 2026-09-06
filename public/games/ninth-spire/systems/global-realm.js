
(function(){
'use strict';

const NS = window.NINTH_SPIRE = window.NINTH_SPIRE || {};

const LOCAL_NEWS = [
  {
    type:'WORLD NOTICE',
    title:'The Founding Era has begun.',
    body:'Every wizard begins as a name in dust. Tower depth, relic discoveries, victories and Chronicle deeds will shape the first records of the realm.'
  },
  {
    type:'TOWER WEATHER',
    title:'A violet haze clings to the upper windows.',
    body:'Observatory expeditions feel unusually charged. The effect is presently atmospheric in local mode; server world modifiers can later make these notices mechanically real.'
  },
  {
    type:'ARCHIVIST NOTICE',
    title:'The Chronicle is accepting first accounts.',
    body:'Not every action belongs on the public Wire. Boss victories, rare discoveries, new personal depths and major transformations will become the events worth broadcasting.'
  },
  {
    type:'MARKET NOTICE',
    title:'Relic provenance will matter.',
    body:'Future server-minted equipment can preserve who found it, where it was found, and every confirmed trade that followed.'
  },
  {
    type:'LEAGUE NOTICE',
    title:'Founding Era records are being prepared.',
    body:'The first competitive boards are Highest Floor, Legacy, Hunts and Bosses. Local scores remain non-competitive until authenticated server validation is active.'
  }
];

function q(sel){ return document.querySelector(sel); }
function esc(v){
  return String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function profile(){
  try { return NS.profile && NS.profile.get ? NS.profile.get() : null; }
  catch(_) { return null; }
}
function localChronicle(){
  const p = profile();
  const events = Array.isArray(p?.chronicle) ? p.chronicle.slice(0,5) : [];
  if(events.length) return events.map(e => ({
    at:e.at,
    text:e.text || 'A Chronicle entry was recorded.'
  }));
  return [
    {at:new Date().toISOString(), text:'The Tower Wire is quiet. Your first meaningful deed will appear here.'}
  ];
}
function renderLocal(){
  const p = profile();
  const score = q('[data-realm-score]');
  const wiz = q('[data-realm-wizard]');
  if(score) score.textContent = String(p?.leaguePoints || 0);
  if(wiz) wiz.textContent = p?.name ? `${String(p.name).toUpperCase()} · LV ${p.level || 1}` : 'NO WIZARD YET';

  const list = q('[data-realm-wire-list]');
  if(list){
    list.innerHTML = localChronicle().map(e => `
      <article>
        <time>${new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>
        <p>${esc(e.text)}</p>
      </article>
    `).join('');
  }

  const feature = LOCAL_NEWS[Math.floor(Math.random()*LOCAL_NEWS.length)];
  const box = q('[data-realm-feature]');
  if(box){
    box.innerHTML = `<span>${esc(feature.type)}</span><h3>${esc(feature.title)}</h3><p>${esc(feature.body)}</p>`;
  }
}
function setNetwork(active, meta={}){
  const pill=q('[data-realm-network]');
  const mode=q('[data-realm-mode]');
  const online=q('[data-realm-online]');
  const onlineNote=q('[data-realm-online-note]');
  const wireState=q('[data-realm-wire-state]');
  const chatState=q('[data-realm-chat-state]');
  const foot=q('[data-realm-foot]');

  if(pill){
    pill.classList.toggle('is-live',!!active);
    const span=pill.querySelector('span');
    if(span) span.textContent=active?'REALM ONLINE':'LOCAL REALM';
  }
  if(mode) mode.textContent=active?'LIVE NETWORK':'LOCAL PREVIEW';
  if(online) online.textContent=active ? String(meta.online ?? '—') : '—';
  if(onlineNote) onlineNote.textContent=active ? 'IN THE SPIRE NOW' : 'SERVER NOT CONNECTED';
  if(wireState) wireState.textContent=active ? 'LIVE WORLD' : 'LOCAL CHRONICLE';
  if(chatState) chatState.textContent=active ? 'LIVE' : 'OFFLINE';
  if(foot) foot.textContent=active?'REALM SERVICES: ONLINE':'REALM SERVICES: LOCAL';
}
function renderRemote(data){
  if(!data || typeof data!=='object') return;
  setNetwork(true,{online:data.online});

  if(data.era && q('[data-realm-era]')) q('[data-realm-era]').textContent=String(data.era).toUpperCase();
  if(data.condition && q('[data-realm-condition]')) q('[data-realm-condition]').textContent=String(data.condition).toUpperCase();

  if(data.feature){
    const box=q('[data-realm-feature]');
    if(box) box.innerHTML=`<span>${esc(data.feature.type||'WORLD NEWS')}</span><h3>${esc(data.feature.title||'Realm Update')}</h3><p>${esc(data.feature.body||'')}</p>`;
  }

  const wire=q('[data-realm-wire-list]');
  if(wire && Array.isArray(data.wire)){
    wire.innerHTML=data.wire.slice(0,6).map(e=>`
      <article>
        <time>${esc(e.time||'NOW')}</time>
        <p>${esc(e.text||'')}</p>
      </article>`).join('');
  }

  const chat=q('[data-realm-chat-list]');
  if(chat && Array.isArray(data.chat)){
    chat.innerHTML=data.chat.slice(0,5).map(m=>`
      <article>
        <b>${esc(m.wizard||m.user||'Wizard')}</b>
        <p>${esc(m.body||'')}</p>
      </article>`).join('');
  }
}
async function refresh(){
  renderLocal();

  // Production contract:
  // window.NINTH_SPIRE_REALM = {
  //   enabled:true,
  //   bulletinUrl:'/api/ninth-spire/bulletin'
  // }
  const cfg=window.NINTH_SPIRE_REALM || {};
  if(!cfg.enabled || !cfg.bulletinUrl){
    setNetwork(false);
    return;
  }

  try{
    const res=await fetch(cfg.bulletinUrl,{credentials:'include',cache:'no-store'});
    if(!res.ok) throw new Error(String(res.status));
    renderRemote(await res.json());
  }catch(_){
    setNetwork(false);
  }
}

window.addEventListener('DOMContentLoaded',()=>{
  q('[data-realm-refresh]')?.addEventListener('click',refresh);
  refresh();
});

NS.globalRealm={refresh,renderRemote,setNetwork};
})();
