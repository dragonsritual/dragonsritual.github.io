window.GameCards=(()=>{
const rarities=[{id:"common",name:"Common",weight:60,stat:1,keywords:0},{id:"uncommon",name:"Uncommon",weight:25,stat:1.06,keywords:1},{id:"rare",name:"Rare",weight:10,stat:1.14,keywords:1},{id:"legendary",name:"Legendary",weight:4,stat:1.24,keywords:2},{id:"mythic",name:"Mythic",weight:1,stat:1.38,keywords:2}];
const affinities=[{id:"fire",name:"Fire",icon:"🔥",attack:1.07,hp:.98,speed:1},{id:"water",name:"Water",icon:"💧",attack:.98,hp:1.07,speed:1},{id:"forest",name:"Forest",icon:"♣",attack:1,hp:1.10,speed:.97},{id:"frost",name:"Frost",icon:"❄",attack:1.02,hp:1.04,speed:.96},{id:"thunder",name:"Thunder",icon:"ϟ",attack:1.06,hp:.96,speed:1.08},{id:"air",name:"Air",icon:"◇",attack:1,hp:.96,speed:1.10},{id:"blood",name:"Blood",icon:"◆",attack:1.06,hp:1.02,speed:.99},{id:"void",name:"Void",icon:"✦",attack:1.04,hp:1,speed:1.02}];
const names={knight:["Ser Caldus","Mara Voss","Toren Vale","Brann Reeve","Ilya Stone","Cael Morrow","Sela Thorne","Dara Hale"],archer:["Thorn","Veyra","Rook Fen","Nessa Wren","Corin Rell","Anya Kerr","Mira Dane","Joren Pell"],mage:["Orin","Maelor","Ilyra","Veyl","Sera Mere","Galen Ash","Lysa Voss","Edrin Marden"],orc:["Gor Vek","Morga","Drok","Varn Skullhand","Korga","Ruk Vaal"],orcshaman:["Zhurra","Mog the Seer","Veshka","Ur-Kal","Nokk","Graza"],orcgiant:["Brugor","Thamuk","Grol","Urdan","Krag Voss","Mordruk"]};
const titles={knight:["Holdblade","Oathkeeper","Iron Pilgrim","Gate Warden","Steel Knight"],archer:["Wayfarer","Huntsman","Ridge Stalker","Crow-Eye","Wildshot"],mage:["Ritual Adept","Storm Reader","Ember Seer","Veil Scholar","Hexborn"],orc:["War Raider","Tuskblade","Pit Fighter","Clan Reaver","Warborn"],orcshaman:["Bone Reader","Storm Caller","Hex Speaker","Totem Keeper","Ritual Shaman"],orcgiant:["Siegebreaker","Stone Fist","Gate Crusher","War Colossus","Ironhide"]};
const keywords=[
{id:"bloodbond",name:"Bloodbond",desc:"Heals for a portion of damage dealt.",min:"uncommon",apply:f=>f.lifeSteal+=.08},
{id:"quickening",name:"Quickening",desc:"Moves earlier in the turn order.",min:"uncommon",apply:f=>f.speed+=3},
{id:"warded",name:"Warded",desc:"Begins with increased defense.",min:"uncommon",apply:f=>{f.defense+=3;f.baseDefense+=3}},
{id:"keen",name:"Keen",desc:"Higher critical-hit chance.",min:"rare",apply:f=>f.critChance+=.10},
{id:"ghoststep",name:"Ghoststep",desc:"Can evade incoming attacks.",min:"rare",apply:f=>f.dodgeChance+=.08},
{id:"unyielding",name:"Unyielding",desc:"Substantially increased vitality.",min:"legendary",apply:f=>{f.maxHp=Math.ceil(f.maxHp*1.18);f.hp=f.maxHp}},
{id:"ritualborn",name:"Ritualborn",desc:"Attack and speed rise together.",min:"legendary",apply:f=>{f.attack=Math.ceil(f.attack*1.12);f.speed+=2}},
{id:"mythic_echo",name:"Echo of the Ritual",desc:"Damage, critical chance and sustain rise together.",min:"mythic",apply:f=>{f.attack=Math.ceil(f.attack*1.15);f.critChance+=.08;f.lifeSteal+=.06}}
];
const artifactPool=[
{id:"ironfang",name:"Ironfang",rarity:"common",slot:"weapon",desc:"+4 ATK.",mods:{attack:4}},
{id:"fieldplate",name:"Field Plate",rarity:"common",slot:"armor",desc:"+12 Max HP, +1 DEF.",mods:{maxHp:12,defense:1}},
{id:"swiftcord",name:"Swiftcord",rarity:"common",slot:"charm",desc:"+2 SPD.",mods:{speed:2}},
{id:"emberbrand",name:"Emberbrand",rarity:"uncommon",slot:"weapon",affinity:"fire",desc:"+6 ATK, +4% crit.",mods:{attack:6,critChance:.04}},
{id:"tideglass",name:"Tideglass Pendant",rarity:"uncommon",slot:"charm",affinity:"water",desc:"+18 HP and minor Bloodbond.",mods:{maxHp:18,lifeSteal:.04}},
{id:"thornmantle",name:"Thorn Mantle",rarity:"uncommon",slot:"armor",affinity:"forest",desc:"+3 DEF, +10 HP.",mods:{defense:3,maxHp:10}},
{id:"stormneedle",name:"Stormneedle",rarity:"rare",slot:"weapon",affinity:"thunder",desc:"+8 ATK, +3 SPD, +6% crit.",mods:{attack:8,speed:3,critChance:.06}},
{id:"winterseal",name:"Seal of Winter",rarity:"rare",slot:"charm",affinity:"frost",desc:"+24 HP, +2 DEF, +4% evade.",mods:{maxHp:24,defense:2,dodgeChance:.04}},
{id:"bloodchalice",name:"Blood Chalice",rarity:"legendary",slot:"charm",affinity:"blood",desc:"+12% Bloodbond, +5 ATK.",mods:{lifeSteal:.12,attack:5}},
{id:"voidcrown",name:"Void Crown",rarity:"mythic",slot:"armor",affinity:"void",desc:"+28 HP, +5 DEF, +10% crit, +5 SPD.",mods:{maxHp:28,defense:5,critChance:.10,speed:5}}
];
const boonPool=[
{id:"war_rite",name:"Rite of War",rarity:"common",kind:"boon",desc:"Party ATK +8%.",apply:b=>b.fighters.forEach(f=>f.attack=Math.ceil(f.attack*1.08))},
{id:"deep_breath",name:"Deep Breath",rarity:"common",kind:"boon",desc:"Heal the party 25%.",apply:b=>b.fighters.forEach(f=>f.heal(Math.ceil(f.maxHp*.25)))},
{id:"hardening",name:"Hardening",rarity:"uncommon",kind:"boon",desc:"Party DEF +2.",apply:b=>b.fighters.forEach(f=>{f.defense+=2;f.baseDefense+=2})},
{id:"predators_mark",name:"Predator's Mark",rarity:"rare",kind:"boon",desc:"Party crit chance +8%.",apply:b=>b.fighters.forEach(f=>f.critChance+=.08)},
{id:"red_covenant",name:"Red Covenant",rarity:"legendary",kind:"boon",desc:"Party gains 7% Bloodbond.",apply:b=>b.fighters.forEach(f=>f.lifeSteal+=.07)}
];
const rank=id=>rarities.findIndex(r=>r.id===id);
const weighted=(list,rng)=>{const total=list.reduce((s,x)=>s+(x.weight||1),0);let n=rng()*total;for(const x of list){n-=x.weight||1;if(n<=0)return x}return list[list.length-1]};
const seeded=seed=>{let x=(seed>>>0)||0x6d2b79f5;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const hash=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const drawRarity=rng=>weighted(rarities,rng),drawAffinity=rng=>affinities[Math.floor(rng()*affinities.length)];
function drawFighter(template,rng,slot){
 const rarity=drawRarity(rng),affinity=drawAffinity(rng),classId=template.id;
 const namedChance={common:.22,uncommon:.42,rare:.72,legendary:.96,mythic:1}[rarity.id],isNamed=rng()<namedChance;
 const namePool=names[classId]||names[template.role]||[template.name],titlePool=titles[classId]||titles[template.role]||[template.name];
 const baseName=isNamed?namePool[Math.floor(rng()*namePool.length)]:`${affinity.name} ${titlePool[Math.floor(rng()*titlePool.length)]}`;
 const allowed=keywords.filter(k=>rank(rarity.id)>=rank(k.min)),picked=[];
 while(picked.length<rarity.keywords&&allowed.length){const k=allowed[Math.floor(rng()*allowed.length)];if(!picked.some(x=>x.id===k.id))picked.push(k)}
 const cardId=`fighter:${classId}:${rarity.id}:${affinity.id}:${hash(baseName+":"+picked.map(k=>k.id).join(","))}`;
 return {...template,id:`${classId}_${slot}_${hash(cardId)}`,archetypeId:(template.role||classId),visualArchetypeId:classId,name:baseName,rarity:rarity.id,rarityName:rarity.name,affinity:affinity.id,affinityName:affinity.name,affinityIcon:affinity.icon,cardId,cardTitle:`${rarity.name} ${affinity.name} ${template.name}`,maxHp:Math.ceil(template.maxHp*rarity.stat*affinity.hp),attack:Math.ceil(template.attack*rarity.stat*affinity.attack),speed:Math.max(1,Math.ceil(template.speed*affinity.speed)),keywords:picked.map(k=>({id:k.id,name:k.name,desc:k.desc})),keywordApply:picked.map(k=>k.id),equipment:{weapon:null,armor:null,charm:null}};
}
function drawReward(rng,wave){
 const artifactChance=wave%3!==0?.66:.50,rarity=drawRarity(rng);
 if(rng()<artifactChance){const candidates=artifactPool.filter(a=>rank(a.rarity)<=rank(rarity.id));const item={...candidates[Math.floor(rng()*candidates.length)]};item.kind="artifact";item.cardId=`artifact:${item.id}:${hash(String(wave)+":"+rng())}`;return item}
 const candidates=boonPool.filter(a=>rank(a.rarity)<=rank(rarity.id));const boon=candidates[Math.floor(rng()*candidates.length)];return {...boon,cardId:`boon:${boon.id}:${hash(String(wave)+":"+rng())}`};
}
function createRun(templates,seed=Date.now()>>>0){const rng=seeded(seed),party=[];for(let i=0;i<3;i++){party.push(drawFighter(templates[Math.floor(rng()*templates.length)],rng,i))}const rewards=[];for(let wave=1;wave<=250;wave++)rewards.push(drawReward(rng,wave));return{seed,rng,party,rewards,index:0}}
function applyFighterKeywords(f){for(const id of f.keywordApply||[]){const k=keywords.find(x=>x.id===id);if(k)k.apply(f)}}
function removeArtifact(f,item){for(const[key,val]of Object.entries(item.mods||{})){if(key==="maxHp"){f.maxHp=Math.max(1,f.maxHp-val);f.hp=Math.min(f.hp,f.maxHp)}else if(key==="defense"){f.defense=Math.max(0,f.defense-val);f.baseDefense=Math.max(0,f.baseDefense-val)}else f[key]=(f[key]||0)-val}}
function applyArtifact(f,item){if(!f||!item)return;const slot=item.slot,old=f.equipment?.[slot];if(old)removeArtifact(f,old);f.equipment=f.equipment||{weapon:null,armor:null,charm:null};f.equipment[slot]=item;for(const[key,val]of Object.entries(item.mods||{})){if(key==="maxHp"){f.maxHp+=val;f.hp+=val}else if(key==="defense"){f.defense+=val;f.baseDefense+=val}else f[key]=(f[key]||0)+val}}
function saveDiscovery(card){try{const key="dragonsritual:arcade:collection:v1",data=JSON.parse(localStorage.getItem(key)||'{"cards":{},"recent":[]}'),id=card.cardId||card.id;if(!id)return;if(!data.cards[id])data.cards[id]={...card,count:0,firstSeen:Date.now()};data.cards[id].count=(data.cards[id].count||0)+1;data.cards[id].lastSeen=Date.now();data.recent=[id,...data.recent.filter(x=>x!==id)].slice(0,80);localStorage.setItem(key,JSON.stringify(data))}catch{}}
function getCollection(){try{return JSON.parse(localStorage.getItem("dragonsritual:arcade:collection:v1")||'{"cards":{},"recent":[]}')}catch{return{cards:{},recent:[]}}}
return{rarities,affinities,artifactPool,boonPool,createRun,applyFighterKeywords,applyArtifact,saveDiscovery,getCollection,rarityRank:rank};
})();