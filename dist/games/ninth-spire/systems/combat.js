
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
let active=null;
function gameState(){return window.WF_GAME?.getState?.()||{};}
function roomForFloor(floor){const rooms=NS.DATA.rooms.filter(r=>r.floor<=floor);return rooms[rooms.length-1]||NS.DATA.rooms[0];}
function enemyForFloor(floor){
 const pool=NS.DATA.enemyFamilies.filter(e=>e.minFloor<=floor);
 const base=pool[Math.floor(Math.random()*pool.length)]||pool[0];
 const scalar=1+(floor-1)*.14;
 return {...base,id:NS.uid(),level:Math.max(1,Math.ceil(floor*.8)),maxHp:Math.round(base.baseHp*scalar),hp:Math.round(base.baseHp*scalar),atk:Math.round(base.baseAtk*scalar),def:Math.round(base.baseDef*scalar)};
}
function playerStats(){
 const s=gameState(),eq=s.equipped||{};
 const bonus=k=>Object.values(eq).filter(Boolean).reduce((a,it)=>a+Number(it?.bonuses?.[k]||0),0);
 return {
  maxHp:Math.max(10,Number(s.healthFloat||s.health||40)),
  hp:Math.max(1,Number(s.healthFloat||s.health||40)),
  power:Number(s.power||0)+bonus('power'),
  insight:Number(s.insight||0)+bonus('insight'),
  vitality:Number(s.vitality||0)+bonus('vitality'),
  level:Number(s.level||1)
 };
}
function start(floor){
 const f=Math.max(1,Number(floor)||NS.profile.get().floor||1), room=roomForFloor(f),enemy=enemyForFloor(f),player=playerStats();
 active={id:NS.uid(),floor:f,room,enemy,player,turn:1,guard:false,focus:0,log:[`A ${enemy.name} emerges in ${room.name}.`],damageDealt:0,damageTaken:0};
 NS.emit('combat:start',active);return active;
}
function enemyTurn(){
 if(!active||active.enemy.hp<=0)return;
 const e=active.enemy,p=active.player;
 let dmg=Math.max(1,e.atk-Math.floor(p.vitality*.35)-(active.guard?3:0)+Math.floor(Math.random()*3)-1);
 if(active.guard)dmg=Math.max(1,Math.floor(dmg*.55));
 p.hp=Math.max(0,p.hp-dmg);active.damageTaken+=dmg;
 active.log.unshift(`${e.name} hits for ${dmg}.`);
 active.guard=false;
}
function finish(outcome){
 const result={outcome,enemy:active.enemy,floor:active.floor,room:active.room,damageDealt:active.damageDealt,damageTaken:active.damageTaken};
 if(outcome==='win'){
   const item=Math.random()<.72?NS.loot.build(active.floor,null,0,active.room.name):null;
   result.item=item;
   if(item){NS.profile.recordItem(item); const s=gameState(); if(s.inventory)s.inventory.push(item); window.dispatchEvent(new CustomEvent('wf:inventory-changed'));}
   NS.profile.recordRoom(active.room.id,active.floor);
   NS.profile.recordFight(result);
   NS.profile.chron('victory',`${NS.profile.get().name} defeated ${active.enemy.name} on Floor ${active.floor}.`,{floor:active.floor,enemy:active.enemy.name,item:item?.name});
   NS.emit('combat:end',result);
 } else {
   NS.profile.recordFight(result);
   NS.profile.chron(outcome,outcome==='flee'?`${NS.profile.get().name} escaped ${active.enemy.name}.`:`${NS.profile.get().name} was defeated by ${active.enemy.name}.`,{floor:active.floor,enemy:active.enemy.name});
   NS.emit('combat:end',result);
 }
 active=null;return result;
}
function act(kind){
 if(!active)return;
 const p=active.player,e=active.enemy;
 if(kind==='attack'){
   const dmg=Math.max(1,2+p.power+Math.floor(p.level*.5)-e.def+Math.floor(Math.random()*4));
   e.hp=Math.max(0,e.hp-dmg);active.damageDealt+=dmg;active.log.unshift(`Staff strike deals ${dmg}.`);
 } else if(kind==='bolt'){
   const cost=2;if(active.focus<cost){active.log.unshift('You need 2 Focus.');NS.emit('combat:update',active);return;}
   active.focus-=cost;const dmg=Math.max(2,5+p.insight+Math.floor(p.level*.65)-Math.floor(e.def*.5)+Math.floor(Math.random()*5));
   e.hp=Math.max(0,e.hp-dmg);active.damageDealt+=dmg;active.log.unshift(`Arcane Bolt tears through for ${dmg}.`);
 } else if(kind==='focus'){
   const gain=2+Math.floor(p.insight/4);active.focus=Math.min(8,active.focus+gain);active.log.unshift(`You gather ${gain} Focus.`);
 } else if(kind==='guard'){
   active.guard=true;active.focus=Math.min(8,active.focus+1);active.log.unshift('You brace and gain 1 Focus.');
 } else if(kind==='flee'){
   const chance=.45+Math.min(.25,p.insight*.02);
   if(Math.random()<chance)return finish('flee');
   active.log.unshift('The escape route closes.');
 }
 if(e.hp<=0)return finish('win');
 enemyTurn();
 if(p.hp<=0)return finish('loss');
 active.turn++;NS.emit('combat:update',active);return active;
}
NS.combat={start,act,get:()=>active};
})();
