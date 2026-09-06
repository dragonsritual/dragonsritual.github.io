
(function(){
'use strict';
const NS = window.NINTH_SPIRE = window.NINTH_SPIRE || {};
NS.VERSION = '0.41.0';
NS.events = NS.events || new EventTarget();
NS.emit = function(type, detail){ NS.events.dispatchEvent(new CustomEvent(type,{detail})); };
NS.on = function(type, fn){ NS.events.addEventListener(type, fn); return ()=>NS.events.removeEventListener(type,fn); };
NS.clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
NS.uid = ()=> (crypto && crypto.randomUUID ? crypto.randomUUID() : 'ns-'+Date.now()+'-'+Math.floor(Math.random()*1e9));
NS.nowIso = ()=>new Date().toISOString();
NS.safeText = v=>String(v??'').slice(0,240);
NS.storage = {
  get(key, fallback){
    try { const v=localStorage.getItem('ninth-spire:'+key); return v ? JSON.parse(v) : fallback; }
    catch(_){ return fallback; }
  },
  set(key, value){
    try { localStorage.setItem('ninth-spire:'+key, JSON.stringify(value)); } catch(_){}
  }
};
})();
