
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
const cfg=window.NINTH_SPIRE_SERVER || {enabled:false};
async function call(path,body){
 if(!cfg.enabled||!cfg.baseUrl)return {offline:true};
 const res=await fetch(cfg.baseUrl+path,{method:'POST',headers:{'content-type':'application/json',...(cfg.headers||{})},credentials:'include',body:JSON.stringify(body||{})});
 if(!res.ok)throw new Error('Server '+res.status);return res.json();
}
NS.server={
 enabled:()=>!!cfg.enabled,
 pushEvent:event=>call('/game-event',{game:'ninth-spire',event}),
 saveProfile:profile=>call('/wizard-save',{game:'ninth-spire',profile}),
 getLeague:()=>call('/league',{game:'ninth-spire'}),
 trade:payload=>call('/trade',{game:'ninth-spire',...payload}),
 shopBuy:payload=>call('/shop-buy',{game:'ninth-spire',...payload})
};
NS.on('chronicle:event',e=>{ if(cfg.enabled)NS.server.pushEvent(e.detail).catch(()=>{}); });
NS.on('profile:update',e=>{ if(cfg.enabled)NS.server.saveProfile(e.detail).catch(()=>{}); });
})();
