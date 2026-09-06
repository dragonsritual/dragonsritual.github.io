
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
window.addEventListener('ns:legacy-level',e=>{
 const p=NS.profile.get();NS.profile.chron('level',`${p.name} reached Level ${e.detail?.level||p.level}.`,{level:e.detail?.level});
 NS.profile.save();
});
window.addEventListener('ns:legacy-exploration',e=>{
 const d=e.detail||{}, room=NS.DATA.rooms.find(r=>r.id===d.roomId);
 NS.profile.recordRoom(d.roomId,room?.floor||NS.profile.get().floor||1);
 if(d.loot){
   const existing=d.loot;
   const normalized={id:existing.id||NS.uid(),name:existing.name||'Unknown Relic',rarity:existing.rarity||'common',type:existing.type||'item',floor:room?.floor||1,foundAt:NS.nowIso()};
   NS.profile.recordItem(normalized);
 }
 const p=NS.profile.get();
 NS.profile.chron('explore',`${p.name} returned from ${d.roomName||'the tower'}${d.enemy?` after encountering ${d.enemy}`:''}${d.loot?` carrying ${d.loot.name}`:''}.`,d);
});
})();
