export const CONFIG={
  world:{width:3400,height:2200,grid:40},
  player:{radius:18,speed:220,maxHealth:120,attackDamage:22,attackCooldown:.38,boltSpeed:620,gatherRate:.36,carryMax:36,meleeRange:58,meleeDamage:28,meleeDamagePerForgeTier:10,meleeCooldown:.48},
  hall:{x:1300,y:800,radius:88,maxHealth:1800},
  prepSeconds:58,
  interWaveSeconds:40,
  enemy:{baseCount:4,perWave:1,baseHealth:42,healthScale:.12,speed:66,damage:9,attackCooldown:1.15,radius:15},
  resources:{treeCount:56,stoneCount:34,nodeRespawn:0,treeYield:5,stoneYield:5},
  build:{
    wall:{name:'Wall Post',category:'DEFENSE',hotkey:'1',cost:{wood:4,stone:1,gold:0,essence:0},hp:180,size:16,connectRange:250,maxLinks:2,buildTime:2.5,description:'Connect posts into a defensive perimeter.'},
    workshop:{name:'Blacksmith',category:'CRAFT',hotkey:'2',cost:{wood:16,stone:14,gold:0,essence:0},hp:520,size:54,buildTime:7,description:'Strengthens the Hold and unlocks martial upgrades.',atlas:'blacksmith'},
    shrine:{name:'Shrine',category:'ARCANE',hotkey:'3',cost:{wood:10,stone:16,gold:0,essence:0},hp:440,size:54,buildTime:8,description:'Generates Essence over time.',atlas:'shrine'},
    barracks:{name:'Barracks',category:'MILITARY',hotkey:'4',cost:{wood:22,stone:12,gold:8,essence:0},hp:700,size:70,buildTime:9,description:'Foundation for melee defenders and future troop production.',atlas:'barracks'},
    archery:{name:'Archery Range',category:'MILITARY',hotkey:'5',cost:{wood:26,stone:10,gold:10,essence:0},hp:620,size:70,buildTime:9,description:'Ranged defense and future archer production.',atlas:'archery'},
    stables:{name:'Stables',category:'MILITARY',hotkey:'6',cost:{wood:30,stone:16,gold:18,essence:0},hp:760,size:72,buildTime:11,description:'Unlocks mounted progression and rapid response.',atlas:'stables'},
    farm:{name:'Farmstead',category:'ECONOMY',hotkey:'7',cost:{wood:18,stone:6,gold:4,essence:0},hp:420,size:52,buildTime:6,description:'Settlement economy foundation; future food and population support.',atlas:'farm'},
    house:{name:'House',category:'SETTLEMENT',hotkey:'H',cost:{wood:14,stone:5,gold:0,essence:0},hp:360,size:46,buildTime:5,description:'Adds housing capacity and attracts new citizens.',atlas:'house'},
    tower:{name:'Watchtower',category:'DEFENSE',hotkey:'8',cost:{wood:42,stone:58,gold:48,essence:4},hp:900,size:58,buildTime:12,description:'Expensive static defense. Slow, deliberate shots; upgrades increase cadence and range.',range:330,damage:28,cooldown:2.8},
    academy:{name:'Wizard Academy',category:'ARCANE',hotkey:'9',cost:{wood:54,stone:72,gold:82,essence:18},hp:980,size:88,buildTime:16,description:'Trains autonomous wizards and unlocks advanced arcane defense.'}
  },
  upgrades:{power:{gold:20,essence:3},vitality:{gold:25,essence:4},speed:{gold:30,essence:2}}
};
export const COLORS={
  ground:'#182019',grid:'rgba(210,220,190,.035)',road:'#25241d',tree:'#42563b',tree2:'#596948',
  trunk:'#594936',stone:'#656863',stone2:'#85877f',hall:'#4c3030',hallRoof:'#70524c',wall:'#665442',
  workshop:'#4e4640',shrine:'#52465d',shrineGlow:'#806b93',enemy:'#8d3339',enemy2:'#b75b5e',
  player:'#c5b0ca',bolt:'#c6a4d1',gold:'#b8934c',essence:'#82689b',shadow:'rgba(0,0,0,.28)'
};