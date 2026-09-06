
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
NS.DATA = NS.DATA || {};

NS.DATA.rooms = [
 {id:'entry',name:'Entry Hall',floor:1,tags:['stone','safe'],danger:1,lootTier:1},
 {id:'library',name:'Memory Library',floor:2,tags:['books','undead'],danger:2,lootTier:2},
 {id:'alchemy',name:'Alchemical Wing',floor:3,tags:['poison','construct'],danger:3,lootTier:2},
 {id:'quarters',name:'Abandoned Quarters',floor:4,tags:['shade','dream'],danger:4,lootTier:3},
 {id:'observatory',name:'Star Observatory',floor:5,tags:['astral','arcane'],danger:5,lootTier:3},
 {id:'ossuary',name:'The Ossuary',floor:6,tags:['bone','undead'],danger:6,lootTier:4},
 {id:'bell',name:'Bell Chamber',floor:7,tags:['curse','sound'],danger:7,lootTier:4},
 {id:'blackglass',name:'Blackglass Gallery',floor:8,tags:['mirror','arcane'],danger:8,lootTier:5},
 {id:'furnace',name:'The Red Furnace',floor:9,tags:['fire','construct'],danger:9,lootTier:5}
];

NS.DATA.enemyFamilies = [
 {id:'rat',name:'Tower Rat',minFloor:1,baseHp:9,baseAtk:2,baseDef:0,tags:['beast']},
 {id:'skeleton',name:'Archive Skeleton',minFloor:2,baseHp:14,baseAtk:3,baseDef:1,tags:['undead']},
 {id:'slime',name:'Alchemical Slime',minFloor:3,baseHp:18,baseAtk:4,baseDef:1,tags:['ooze','poison']},
 {id:'shade',name:'Sleepwalker Shade',minFloor:4,baseHp:22,baseAtk:5,baseDef:2,tags:['spirit']},
 {id:'wisp',name:'Star Wisp',minFloor:5,baseHp:25,baseAtk:7,baseDef:2,tags:['astral']},
 {id:'bone_scribe',name:'Bone Scribe',minFloor:6,baseHp:31,baseAtk:8,baseDef:3,tags:['undead','caster']},
 {id:'bell_keeper',name:'Bell Keeper',minFloor:7,baseHp:42,baseAtk:10,baseDef:4,tags:['elite','curse'],boss:true},
 {id:'blackglass_knight',name:'Blackglass Knight',minFloor:8,baseHp:48,baseAtk:12,baseDef:6,tags:['elite','mirror']},
 {id:'furnace_colossus',name:'Furnace Colossus',minFloor:9,baseHp:70,baseAtk:14,baseDef:7,tags:['boss','construct'],boss:true}
];

NS.DATA.affixes = {
 prefixes:[
  {id:'ashen',name:'Ashen',minTier:1,mods:{power:1}},
  {id:'watchful',name:'Watchful',minTier:1,mods:{insight:1}},
  {id:'vigorous',name:'Vigorous',minTier:2,mods:{vitality:2}},
  {id:'starforged',name:'Starforged',minTier:3,mods:{power:2,insight:2}},
  {id:'blackglass',name:'Blackglass',minTier:4,mods:{power:3,luck:2}},
  {id:'saintless',name:'Saintless',minTier:5,mods:{power:4,corruption:1}}
 ],
 suffixes:[
  {id:'memory',name:'of Memory',minTier:1,mods:{insight:1}},
  {id:'hunger',name:'of Hunger',minTier:2,mods:{power:2,vitality:-1}},
  {id:'vigil',name:'of the Vigil',minTier:2,mods:{vitality:2}},
  {id:'stars',name:'of Falling Stars',minTier:3,mods:{insight:2,luck:1}},
  {id:'spire',name:'of the Ninth Spire',minTier:4,mods:{power:2,insight:2,vitality:2}}
 ]
};

NS.DATA.bases = [
 {id:'oak_staff',type:'staff',name:'Oak Staff',tier:1,base:{power:1}},
 {id:'bone_wand',type:'staff',name:'Bone Wand',tier:2,base:{power:2,insight:1}},
 {id:'blackglass_staff',type:'staff',name:'Blackglass Staff',tier:4,base:{power:4,insight:2}},
 {id:'patched_robe',type:'robe',name:'Patched Robe',tier:1,base:{vitality:1}},
 {id:'archive_robe',type:'robe',name:'Archive Robe',tier:2,base:{vitality:2,insight:1}},
 {id:'star_mantle',type:'robe',name:'Star Mantle',tier:4,base:{vitality:3,insight:3}},
 {id:'copper_ring',type:'ring',name:'Copper Ring',tier:1,base:{luck:1}},
 {id:'bone_signet',type:'ring',name:'Bone Signet',tier:3,base:{power:1,vitality:1}},
 {id:'blackglass_loop',type:'ring',name:'Blackglass Loop',tier:5,base:{luck:3,insight:2}}
];

NS.DATA.rarities = [
 {id:'common',label:'Common',weight:58,affixes:0,score:1},
 {id:'uncommon',label:'Enchanted',weight:25,affixes:1,score:2},
 {id:'rare',label:'Rare',weight:12,affixes:2,score:4},
 {id:'epic',label:'Relic',weight:4,affixes:3,score:8},
 {id:'legendary',label:'Mythic',weight:1,affixes:4,score:16}
];
})();
