
(function(){
'use strict';

const ORIGIN = location.origin;
const PLAY_KEY='dragon:ninth-spire:playtime-ms';
const sessionStarted=Date.now();
let committed=0;
function totalPlayTime(){
  let prior=0;
  try{prior=Number(localStorage.getItem(PLAY_KEY)||0)||0}catch(_){}
  return prior + Math.max(0,Date.now()-sessionStarted-committed);
}
function commitPlayTime(){
  const delta=Math.max(0,Date.now()-sessionStarted-committed);
  committed+=delta;
  try{localStorage.setItem(PLAY_KEY,String((Number(localStorage.getItem(PLAY_KEY)||0)||0)+delta))}catch(_){}
}

function stateSnapshot(){
  let game = {};
  let profile = {};
  try { game = window.WF_GAME?.getState?.() || {}; } catch(_) {}
  try { profile = window.NINTH_SPIRE?.profile?.get?.() || {}; } catch(_) {}

  const equipped = game.equipped || {};
  const element =
    game.primaryElement ||
    game.element ||
    game.affinity ||
    profile.element ||
    'UNBOUND';

  return {
    name: String(game.name || profile.name || window.WIZARD_NAME || 'Unnamed Wizard').slice(0,40),
    level: Math.max(1, Number(game.level || profile.level || 1)),
    title: String(profile.title || game.title || 'Dustling of the Ninth Spire').slice(0,80),
    element: String(element).slice(0,24),
    room: String(game.currentRoom || profile.currentRoom || 'entry').slice(0,40),
    highestFloor: Math.max(1, Number(profile.highestFloor || profile.floor || 1)),
    legacy: Math.max(0, Number(profile.leaguePoints || 0)),
    health: Math.max(0, Number(game.healthFloat || game.health || 40)),
    hunger: Math.max(0, Number(game.hunger || 0)),
    energy: Math.max(0, Number(game.energy || 0)),
    power: Number(game.power || 0),
    insight: Number(game.insight || 0),
    vitality: Number(game.vitality || 0),
    corruption: Number(game.corruption || 0),
    equipment: {
      staff: equipped.staff?.name || null,
      robe: equipped.robe?.name || null,
      ring: equipped.ring?.name || null
    },
    playTimeMs: totalPlayTime(),
    updatedAt: new Date().toISOString()
  };
}

function post(type, payload={}){
  if (window.parent === window) return;
  window.parent.postMessage({type, ...payload}, ORIGIN);
}

function publish(){
  post('DRAGON_NINTH_SPIRE_STATE', {character: stateSnapshot()});
}

addEventListener('DOMContentLoaded', ()=>{
  post('DRAGON_NINTH_SPIRE_READY', {version:'50/40A'});
  publish();

  // Parent can provide non-authoritative member display context.
  addEventListener('message', event=>{
    if(event.origin !== ORIGIN) return;
    const data=event.data;
    if(!data || typeof data!=='object') return;
    if(data.type==='DRAGON_SITE_CONTEXT'){
      window.DRAGON_SITE_CONTEXT = Object.freeze({
        displayName:String(data.member?.displayName||'').slice(0,40),
        memberId:String(data.member?.memberId||'').slice(0,80)
      });
    }
  });

  // Publish changes from the modular profile system.
  try {
    window.NINTH_SPIRE?.on?.('profile:update', ()=>publish());
    window.NINTH_SPIRE?.on?.('chronicle:event', e=>{
      publish();
      post('DRAGON_NINTH_SPIRE_EVENT', {
        event: {
          type:String(e?.detail?.type||'chronicle').slice(0,32),
          text:String(e?.detail?.text||'').slice(0,240),
          at:e?.detail?.at || new Date().toISOString()
        }
      });
    });
  } catch(_) {}

  // Legacy game actions do not all emit modular events yet.
  setInterval(()=>{commitPlayTime();publish();}, 5000);
  addEventListener('pagehide', commitPlayTime);
});
})();
