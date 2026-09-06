
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
const manifest={
 wizard:{
  dustling:{idle:'idle_down_wizard.png',portrait:'idle_down_wizard.png',attack:null,cast:null,hurt:null,death:null},
  apprentice:{idle:'idle_down_wizard.png',portrait:'idle_down_wizard.png',attack:null,cast:null,hurt:null,death:null}
 },
 enemies:{}
};
function resolve(kind,id,anim='idle'){
 const bucket=manifest[kind]||{}; const rec=bucket[id]||bucket.dustling||null;
 return rec?.[anim]||rec?.idle||null;
}
function register(kind,id,record){manifest[kind]=manifest[kind]||{};manifest[kind][id]={...(manifest[kind][id]||{}),...record};}
NS.sprites={manifest,resolve,register};
})();
