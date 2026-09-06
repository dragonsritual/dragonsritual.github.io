
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
const KEY='profile-v2';
function fresh(){return {
 wizardId:NS.uid(), createdAt:NS.nowIso(), public:true,
 title:'Dustling of the Ninth Spire', floor:1, highestFloor:1,
 fights:0,wins:0,losses:0,flees:0,bosses:0,damageDealt:0,damageTaken:0,
 kills:{}, rooms:{entry:1}, itemsFound:0, rarityFound:{},
 uniqueItems:{}, collection:[], goldEarned:0, leaguePoints:0,
 streak:0,bestStreak:0,chronicle:[],lastSeen:NS.nowIso()
};}
let p=Object.assign(fresh(), NS.storage.get(KEY,{}));
function syncFromGame(){
 const g=window.WF_GAME?.getState?.();
 if(!g)return p;
 p.name=(g.name||window.WIZARD_NAME||p.name||'Unnamed Wizard');
 p.level=Number(g.level||1);
 p.aspect=String(g.currentFormId||g.form||'dustling');
 p.currentRoom=g.currentRoom||p.currentRoom||'entry';
 p.lastSeen=NS.nowIso();
 p.highestFloor=Math.max(p.highestFloor||1,p.floor||1);
 save(false); return p;
}
function save(emit=true){NS.storage.set(KEY,p); if(emit)NS.emit('profile:update',structuredClone(p));}
function chron(type,text,meta={}){
 p.chronicle.unshift({id:NS.uid(),at:NS.nowIso(),type,text:NS.safeText(text),meta});
 p.chronicle=p.chronicle.slice(0,200); save();
 NS.emit('chronicle:event',p.chronicle[0]);
}
function recomputeScore(){
 const uniqueKills=Object.keys(p.kills||{}).length;
 const uniqueLoot=Object.keys(p.uniqueItems||{}).length;
 p.leaguePoints =
   (p.level||1)*25 + (p.highestFloor||1)*120 + (p.wins||0)*8 +
   (p.bosses||0)*250 + uniqueKills*40 + uniqueLoot*15 +
   (p.bestStreak||0)*20;
 save(false); return p.leaguePoints;
}
NS.profile={
 get:()=>syncFromGame(),
 save:()=>{recomputeScore();save();},
 chron,
 recordRoom(roomId,floor){
   p.rooms[roomId]=(p.rooms[roomId]||0)+1;
   p.floor=Math.max(1,Number(floor)||p.floor||1);
   p.highestFloor=Math.max(p.highestFloor||1,p.floor);
   recomputeScore();save();
 },
 recordFight(result){
   p.fights++; p.damageDealt+=result.damageDealt||0;p.damageTaken+=result.damageTaken||0;
   if(result.outcome==='win'){
     p.wins++;p.streak++;p.bestStreak=Math.max(p.bestStreak,p.streak);
     const n=result.enemy?.name||'Unknown';
     p.kills[n]=(p.kills[n]||0)+1;
     if(result.enemy?.boss)p.bosses++;
   } else if(result.outcome==='flee'){p.flees++;p.streak=0;}
   else {p.losses++;p.streak=0;}
   recomputeScore();save();
 },
 recordItem(item){
   p.itemsFound++;
   p.rarityFound[item.rarity]=(p.rarityFound[item.rarity]||0)+1;
   p.uniqueItems[item.name]=(p.uniqueItems[item.name]||0)+1;
   p.collection.unshift({id:item.id,name:item.name,rarity:item.rarity,type:item.type,floor:item.floor,foundAt:item.foundAt});
   p.collection=p.collection.slice(0,500);
   recomputeScore();save();
 }
};
window.addEventListener('wizardNamed',e=>{p.name=e.detail?.name||p.name;save();});
setInterval(syncFromGame,5000);
})();
