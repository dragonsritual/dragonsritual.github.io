window.RitualDraw=(()=>{
const RARITIES=[
 {id:"common",name:"Common",weight:58,stat:1.00,text:0},
 {id:"uncommon",name:"Uncommon",weight:25,stat:1.06,text:1},
 {id:"rare",name:"Rare",weight:11,stat:1.14,text:1},
 {id:"legendary",name:"Legendary",weight:5,stat:1.24,text:2},
 {id:"mythic",name:"Mythic",weight:1,stat:1.38,text:3}
];
const AFFINITIES=[
 {id:"fire",name:"Fire",icon:"🔥",atk:1.07,hp:.98,spd:1.00},
 {id:"water",name:"Water",icon:"💧",atk:.98,hp:1.08,spd:1.00},
 {id:"forest",name:"Forest",icon:"♣",atk:1.00,hp:1.10,spd:.97},
 {id:"frost",name:"Frost",icon:"❄",atk:1.03,hp:1.04,spd:.96},
 {id:"thunder",name:"Thunder",icon:"ϟ",atk:1.06,hp:.96,spd:1.08},
 {id:"air",name:"Air",icon:"◇",atk:1.00,hp:.96,spd:1.10},
 {id:"blood",name:"Blood",icon:"◆",atk:1.06,hp:1.02,spd:.99},
 {id:"void",name:"Void",icon:"✦",atk:1.04,hp:1.00,spd:1.02}
];
const FIRST=["Aldren","Bryn","Cael","Dara","Edrin","Elowen","Galen","Ilya","Joren","Kael","Lysa","Maelor","Mara","Mira","Nessa","Orin","Rook","Sela","Ser Caldus","Thorn","Toren","Veyl","Veyra","Ysra"];
const TITLES=["the Last","of First Hold","the Unbound","Ritual-Born","Grave-Walker","Stormbound","the Red Hand","of the Hollow Gate","the Far-Seer","the Oathless","the Black Banner","of the Ninth Road"];
const TEXT=[
 {id:"bloodbond",name:"Bloodbond",desc:"Heals for 8% of damage dealt.",min:1,apply:f=>f.lifeSteal+=.08},
 {id:"quickening",name:"Quickening",desc:"+3 Speed.",min:1,apply:f=>f.speed+=3},
 {id:"warded",name:"Warded",desc:"+3 Defense.",min:1,apply:f=>{f.defense+=3;f.baseDefense+=3}},
 {id:"keen",name:"Keen",desc:"+10% critical chance.",min:2,apply:f=>f.critChance+=.10},
 {id:"ghoststep",name:"Ghoststep",desc:"+8% evade chance.",min:2,apply:f=>f.dodgeChance+=.08},
 {id:"unyielding",name:"Unyielding",desc:"+18% maximum HP.",min:3,apply:f=>{f.maxHp=Math.ceil(f.maxHp*1.18);f.hp=f.maxHp}},
 {id:"ritualborn",name:"Ritualborn",desc:"+12% Attack and +2 Speed.",min:3,apply:f=>{f.attack=Math.ceil(f.attack*1.12);f.speed+=2}},
 {id:"deathmark",name:"Deathmark",desc:"Deals 15% more damage to wounded enemies.",min:3,flag:"deathmark"},
 {id:"embertouch",name:"Embertouch",desc:"Attacks can inflict Burn.",min:2,flag:"burnOnHit"},
 {id:"bloodprice",name:"Blood Price",desc:"More damage while below half health.",min:3,flag:"bloodPrice"},
 {id:"echo",name:"Echo of the Ritual",desc:"+15% Attack, +8% Crit, +6% Bloodbond.",min:4,apply:f=>{f.attack=Math.ceil(f.attack*1.15);f.critChance+=.08;f.lifeSteal+=.06}},
 {id:"secondbreath",name:"Second Breath",desc:"Once per run, survive a lethal blow at 1 HP.",min:4,flag:"secondBreath"}
];
const ARTIFACTS=[
 {id:"ironfang",name:"Ironfang",rarity:"common",slot:"weapon",desc:"+4 ATK.",mods:{attack:4}},
 {id:"fieldplate",name:"Field Plate",rarity:"common",slot:"armor",desc:"+12 HP, +1 DEF.",mods:{maxHp:12,defense:1}},
 {id:"swiftcord",name:"Swiftcord",rarity:"common",slot:"charm",desc:"+2 SPD.",mods:{speed:2}},
 {id:"glassknife",name:"Glass Knife",rarity:"uncommon",slot:"weapon",desc:"+7 ATK, -8 HP.",mods:{attack:7,maxHp:-8}},
 {id:"emberbrand",name:"Emberbrand",rarity:"uncommon",slot:"weapon",affinity:"fire",desc:"+6 ATK; attacks may Burn.",mods:{attack:6},flag:"burnOnHit"},
 {id:"tideglass",name:"Tideglass Pendant",rarity:"uncommon",slot:"charm",affinity:"water",desc:"+18 HP, +4% Bloodbond.",mods:{maxHp:18,lifeSteal:.04}},
 {id:"thornmantle",name:"Thorn Mantle",rarity:"uncommon",slot:"armor",affinity:"forest",desc:"+10 HP, +3 DEF.",mods:{maxHp:10,defense:3}},
 {id:"stormneedle",name:"Stormneedle",rarity:"rare",slot:"weapon",affinity:"thunder",desc:"+8 ATK, +3 SPD, +6% Crit.",mods:{attack:8,speed:3,critChance:.06}},
 {id:"winterseal",name:"Seal of Winter",rarity:"rare",slot:"charm",affinity:"frost",desc:"+24 HP, +2 DEF, +4% Evade.",mods:{maxHp:24,defense:2,dodgeChance:.04}},
 {id:"windglass",name:"Windglass",rarity:"rare",slot:"charm",affinity:"air",desc:"+5 SPD, +7% Evade.",mods:{speed:5,dodgeChance:.07}},
 {id:"gravekey",name:"Grave-Key",rarity:"rare",slot:"weapon",desc:"+6 ATK; wounded enemies take more damage.",mods:{attack:6},flag:"deathmark"},
 {id:"bloodchalice",name:"Blood Chalice",rarity:"legendary",slot:"charm",affinity:"blood",desc:"+5 ATK, +12% Bloodbond.",mods:{attack:5,lifeSteal:.12}},
 {id:"oathplate",name:"Oathplate of the Gate",rarity:"legendary",slot:"armor",desc:"+36 HP, +5 DEF.",mods:{maxHp:36,defense:5}},
 {id:"stormcrown",name:"Storm Crown",rarity:"legendary",slot:"armor",affinity:"thunder",desc:"+4 SPD, +10% Crit; +10 ATK.",mods:{speed:4,critChance:.10,attack:10}},
 {id:"voidcrown",name:"Void Crown",rarity:"mythic",slot:"armor",affinity:"void",desc:"+28 HP, +5 DEF, +10% Crit, +5 SPD.",mods:{maxHp:28,defense:5,critChance:.10,speed:5}},
 {id:"heartoftheritual",name:"Heart of the Ritual",rarity:"mythic",slot:"charm",desc:"+15% Bloodbond, +12% Crit, +8 ATK.",mods:{lifeSteal:.15,critChance:.12,attack:8},flag:"secondBreath"}
];
const RITES=[
 {id:"war_rite",name:"Rite of War",rarity:"common",kind:"rite",desc:"Party Attack +8%.",apply:b=>b.fighters.forEach(f=>f.attack=Math.ceil(f.attack*1.08))},
 {id:"deep_breath",name:"Deep Breath",rarity:"common",kind:"rite",desc:"Heal the surviving party 28%.",apply:b=>b.getLivingFighters().forEach(f=>f.heal(Math.ceil(f.maxHp*.28)))},
 {id:"hardening",name:"Hardening",rarity:"uncommon",kind:"rite",desc:"Party Defense +2.",apply:b=>b.fighters.forEach(f=>{f.defense+=2;f.baseDefense+=2})},
 {id:"predators_mark",name:"Predator's Mark",rarity:"rare",kind:"rite",desc:"Party Crit +8%.",apply:b=>b.fighters.forEach(f=>f.critChance+=.08)},
 {id:"red_covenant",name:"Red Covenant",rarity:"legendary",kind:"rite",desc:"Party Bloodbond +7%.",apply:b=>b.fighters.forEach(f=>f.lifeSteal+=.07)},
 {id:"mythic_turn",name:"The Ritual Turns",rarity:"mythic",kind:"rite",desc:"Party Attack +15%, Speed +3, Crit +5%.",apply:b=>b.fighters.forEach(f=>{f.attack=Math.ceil(f.attack*1.15);f.speed+=3;f.critChance+=.05})}
];

const rank=id=>RARITIES.findIndex(r=>r.id===id);
const weighted=(list,rng)=>{let total=list.reduce((s,x)=>s+(x.weight||1),0),n=rng()*total;for(const x of list){n-=x.weight||1;if(n<=0)return x}return list[list.length-1]};
const seeded=seed=>{let x=(seed>>>0)||0x6d2b79f5;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const choose=(arr,rng)=>arr[Math.floor(rng()*arr.length)];
function rarity(rng){return weighted(RARITIES,rng)}
function affinity(rng){return choose(AFFINITIES,rng)}
function uniqueText(rng,r,desired){const eligible=TEXT.filter(x=>rank(r.id)>=x.min),out=[];while(out.length<desired&&eligible.length){const x=choose(eligible,rng);if(!out.some(y=>y.id===x.id))out.push(x)}return out}
function drawName(base,rng,r){const namedChance=[.18,.38,.68,.94,1][rank(r.id)];if(rng()>namedChance)return base;const first=choose(FIRST,rng);return rank(r.id)>=3&&rng()<.62?`${first}, ${choose(TITLES,rng)}`:first}
function pullCombatant(template,rng,slot){
 const r=rarity(rng),a=affinity(rng),texts=uniqueText(rng,r,r.text);
 const name=drawName(template.name,rng,r);
 const cardId=`unit:${template.id}:${r.id}:${a.id}:${hash(name+texts.map(t=>t.id).join("-"))}`;
 const lorePool={
 fire:["Ash remembers every oath.","The flame answers first.","Born beneath a red horizon."],
 water:["Still water keeps old names.","The tide returns what war forgets.","A quiet current beneath the blade."],
 forest:["Roots hold what kingdoms lose.","The green road never truly ends.","Old growth, older promise."],
 frost:["Winter sharpens the faithful.","Cold keeps its own counsel.","A breath from the white reaches."],
 thunder:["The sky chose violence.","Stormlight under mortal skin.","One heartbeat ahead of thunder."],
 air:["No chain can hold the horizon.","The high road leaves no tracks.","A blade carried by weather."],
 blood:["Every wound writes a covenant.","The price was paid before battle.","Blood remembers blood."],
 void:["Something answered from beyond.","The empty places have names.","Not every silence is vacant."]
 };
 const lore=choose(lorePool[a.id],rng);
 return {...template,id:`run_${slot}_${hash(cardId)}`,archetypeId:template.id,combatRole:template.combatRole||template.id,name,rarity:r.id,rarityName:r.name,affinity:a.id,affinityName:a.name,affinityIcon:a.icon,cardId,lore,
 maxHp:Math.max(34,Math.ceil(template.maxHp*r.stat*a.hp*.78)),attack:Math.max(5,Math.ceil(template.attack*r.stat*a.atk)),speed:Math.max(3,Math.ceil(template.speed*a.spd)),
 rules:texts.map(t=>({id:t.id,name:t.name,desc:t.desc,flag:t.flag||null})),equipment:{weapon:null,armor:null,charm:null},level:1};
}
function applyRules(f){for(const x of f.rules||[]){const d=TEXT.find(t=>t.id===x.id);d?.apply?.(f);if(d?.flag)f[d.flag]=true}}
function allTemplates(){
 const legacy=(window.GameFighterData||[]).map(x=>({...x,combatRole:x.id,groundMode:"grounded",sourcePack:"Original Arcade Battle"}));
 const originalOrcs=(window.GameEnemyData||[]).map(x=>{
   const role=x.id==="orc_shaman"?"mage":x.id==="orc_giant"?"knight":"knight";
   const effect=role==="mage"
     ? {folder:"assets/effects/Flame",prefix:"Fx_effect12_",frames:6}
     : {folder:"assets/effects/Knight_SwordSlash",prefix:"Fx_effect1_",frames:5};
   return {...x,id:`playable_${x.id}`,combatRole:role,groundMode:"grounded",
     skillName:role==="mage"?"War Chant":"Savage Break",
     effect,sourcePack:"Original Arcade Battle — Orc Host"};
 });
 return [...legacy,...originalOrcs,...(window.GamePullRoster||[])];
}
function createRun(seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0){
 const rng=seeded(seed),pool=allTemplates(),party=[];
 for(let i=0;i<3;i++)party.push(pullCombatant(choose(pool,rng),rng,i));
 return{seed,rng,party,rewardIndex:0,lastRewardKind:null,riteStreak:0};
}
function drawReward(run,wave){
 const rng=run.rng,r=rarity(rng);
 // Artifacts are the primary collectible reward. A rite can appear, but never twice in a row.
 const forceArtifact=run.lastRewardKind==="rite" || (run.riteStreak||0)>=1;
 const artifactRoll=forceArtifact || rng()<.76;
 if(artifactRoll){
   let candidates=ARTIFACTS.filter(a=>rank(a.rarity)<=rank(r.id));
   const item={...choose(candidates,rng)};item.kind="artifact";item.cardId=`artifact:${item.id}:${hash(run.seed+":"+wave+":"+run.rewardIndex++)}`;
   run.lastRewardKind="artifact";run.riteStreak=0;return item;
 }
 let candidates=RITES.filter(x=>rank(x.rarity)<=rank(r.id));
 const rite={...choose(candidates,rng)};rite.cardId=`rite:${rite.id}:${hash(run.seed+":"+wave+":"+run.rewardIndex++)}`;
 run.lastRewardKind="rite";run.riteStreak=(run.riteStreak||0)+1;return rite;
}
function removeArtifact(f,item){if(!item)return;for(const[k,v]of Object.entries(item.mods||{})){if(k==="maxHp"){f.maxHp=Math.max(1,f.maxHp-v);f.hp=Math.min(f.hp,f.maxHp)}else if(k==="defense"){f.defense=Math.max(0,f.defense-v);f.baseDefense=Math.max(0,f.baseDefense-v)}else f[k]=(f[k]||0)-v}if(item.flag)f[item.flag]=false}
function equip(f,item){const old=f.equipment?.[item.slot];if(old)removeArtifact(f,old);f.equipment=f.equipment||{weapon:null,armor:null,charm:null};f.equipment[item.slot]=item;for(const[k,v]of Object.entries(item.mods||{})){if(k==="maxHp"){f.maxHp=Math.max(1,f.maxHp+v);f.hp=Math.max(1,f.hp+v)}else if(k==="defense"){f.defense=Math.max(0,f.defense+v);f.baseDefense=Math.max(0,f.baseDefense+v)}else f[k]=(f[k]||0)+v}if(item.flag)f[item.flag]=true}
function resonance(party){const counts={};for(const f of party)counts[f.affinity]=(counts[f.affinity]||0)+1;const hit=Object.entries(counts).find(([,n])=>n>=2);if(!hit)return null;const a=AFFINITIES.find(x=>x.id===hit[0]);for(const f of party.filter(x=>x.affinity===hit[0])){f.attack=Math.ceil(f.attack*1.05);f.maxHp=Math.ceil(f.maxHp*1.05);f.hp=f.maxHp}return{name:a.name,icon:a.icon,count:hit[1],desc:`${hit[1]} ${a.name} combatants resonate: +5% ATK / HP.`}}
function multiplier(attacker,target){
 if(!attacker?.affinity||!target?.affinity)return 1;
 const strong={fire:"forest",forest:"water",water:"fire",thunder:"water",frost:"air",air:"thunder",blood:"void",void:"frost"};
 if(strong[attacker.affinity]===target.affinity)return 1.15;
 if(strong[target.affinity]===attacker.affinity)return .90;
 return 1;
}
function outgoing(attacker,target,raw){
 let d=raw*multiplier(attacker,target);
 if((attacker.deathmark||attacker.rules?.some(x=>x.flag==="deathmark"))&&target.hp<target.maxHp*.5)d*=1.15;
 if((attacker.bloodPrice||attacker.rules?.some(x=>x.flag==="bloodPrice"))&&attacker.hp<attacker.maxHp*.5)d*=1.18;
 return Math.max(1,Math.floor(d));
}
function onHit(attacker,target){
 if(!target||target.defeated)return;
 if((attacker.burnOnHit||attacker.rules?.some(x=>x.flag==="burnOnHit"))&&Math.random()<.35)target.addStatus({id:"burn",turns:2,power:Math.max(3,Math.floor(attacker.attack*.12))});
}
function lethalSave(target){
 if(target.secondBreath&&!target._secondBreathSpent){target._secondBreathSpent=true;target.defeated=false;target.hp=1;return true}
 return false;
}
function save(card,extra={}){
 try{const key="dragonsritual:arcade:collection:v2",d=JSON.parse(localStorage.getItem(key)||'{"cards":{},"recent":[],"runs":0,"bestWave":0}'),id=card.cardId||card.id;if(!id)return;
 if(!d.cards[id])d.cards[id]={id,kind:extra.kind||card.kind||"fighter",name:card.name,rarity:card.rarity||"common",rarityName:card.rarityName||card.rarity||"Common",affinity:card.affinityName||card.affinity||"",archetype:card.archetypeId||"",slot:card.slot||"",rules:(card.rules||[]).map(x=>x.name),count:0,firstSeen:Date.now()};
 d.cards[id].count++;d.cards[id].lastSeen=Date.now();d.recent=[id,...d.recent.filter(x=>x!==id)].slice(0,120);localStorage.setItem(key,JSON.stringify(d))}catch{}
}
function recordRun(wave){try{const key="dragonsritual:arcade:collection:v2",d=JSON.parse(localStorage.getItem(key)||'{"cards":{},"recent":[],"runs":0,"bestWave":0}');d.runs=(d.runs||0)+1;d.bestWave=Math.max(d.bestWave||0,wave||1);localStorage.setItem(key,JSON.stringify(d))}catch{}}
function collection(){try{return JSON.parse(localStorage.getItem("dragonsritual:arcade:collection:v2")||'{"cards":{},"recent":[],"runs":0,"bestWave":0}')}catch{return{cards:{},recent:[],runs:0,bestWave:0}}}
return{RARITIES,AFFINITIES,ARTIFACTS,TEXT,createRun,drawReward,applyRules,resonance,equip,outgoing,onHit,lethalSave,save,recordRun,collection};
})();