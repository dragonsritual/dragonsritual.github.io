import {CONFIG} from '../data/config.js?v=46S';
const rand=(a,b)=>a+Math.random()*(b-a);

export class WaveSystem{
  constructor(bus){
    this.bus=bus;this.wave=1;this.phase='prep';this.timer=CONFIG.prepSeconds;this.enemies=[];this.spawnQueue=0;this.spawnClock=0;this.totalKills=0;this.eliteSpawnedThisWave=false;
  }
  update(dt,worldState){
    this.timer-=dt;
    if(this.phase==='prep'&&this.timer<=0)this.beginWave();
    if(this.phase==='combat'){
      if(this.spawnQueue>0){this.spawnClock-=dt;if(this.spawnClock<=0){this.spawnEnemy();this.spawnQueue--;this.spawnClock=.42}}
      if(this.spawnQueue===0&&this.enemies.length===0){this.endWave(worldState)}
    }
  }
  beginWave(){
    this.phase='combat';this.timer=0;this.eliteSpawnedThisWave=false;
    const earlyCounts={1:3,2:5,3:7};
    this.spawnQueue=earlyCounts[this.wave]??(CONFIG.enemy.baseCount+(this.wave-1)*CONFIG.enemy.perWave);
    this.spawnClock=.2;
    this.bus.emit('wave:start',{wave:this.wave,count:this.spawnQueue});
  }
  endWave(worldState){
    const reward=10+this.wave*4;
    worldState.bank.gold+=reward;
    this.bus.emit('wave:end',{wave:this.wave,reward});
    this.wave++;this.phase='prep';this.timer=CONFIG.interWaveSeconds;
  }
  spawnEnemy(){
    const side=Math.floor(Math.random()*4);let x,y;
    if(side===0){x=rand(20,CONFIG.world.width-20);y=20}
    if(side===1){x=CONFIG.world.width-20;y=rand(20,CONFIG.world.height-20)}
    if(side===2){x=rand(20,CONFIG.world.width-20);y=CONFIG.world.height-20}
    if(side===3){x=20;y=rand(20,CONFIG.world.height-20)}

    const earlyScale=this.wave===1?.82:this.wave===2?.92:this.wave===3?1.0:null;
    const scale=earlyScale??(1+(this.wave-3)*CONFIG.enemy.healthScale);
    const eliteChance=this.wave>=4?Math.min(.45,.12+(this.wave-4)*.04):0;
    const elite=!this.eliteSpawnedThisWave&&Math.random()<eliteChance;
    if(elite)this.eliteSpawnedThisWave=true;

    const elements=[
      {id:'fire',icon:'▲',color:'#d86242'},
      {id:'frost',icon:'✦',color:'#77b8d8'},
      {id:'venom',icon:'◆',color:'#78a55c'},
      {id:'arcane',icon:'◇',color:'#a27ac4'}
    ];
    const affixes=['BERSERKER','WARDED','SWIFT','LEECHING'];
    const first=['Grim','Vhal','Mord','Krag','Zor','Thorn','Riven','Dread','Gor','Mal'];
    const second=['fang','maw','scar','hide','claw','bane','spite','born','gaze','heart'];
    const titles={
      fire:['the Emberbound','of Cinders','the Ash-Walker'],
      frost:['the Wintermarked','of Pale Ice','the Cold-Blooded'],
      venom:['the Mireborn','of the Green Rot','the Venomed'],
      arcane:['the Rift-Touched','of the Violet Ward','the Spellscarred']
    };

    const element=elite?elements[Math.floor(Math.random()*elements.length)]:null;
    const affix=elite?affixes[Math.floor(Math.random()*affixes.length)]:null;
    const level=Math.max(1,this.wave*3+Math.floor(Math.random()*4)-1);
    const name=elite
      ?`${first[Math.floor(Math.random()*first.length)]}${second[Math.floor(Math.random()*second.length)]} ${titles[element.id][Math.floor(Math.random()*titles[element.id].length)]}`
      :'Raider';

    const enemy={
      id:Math.random().toString(36),x,y,radius:CONFIG.enemy.radius,
      maxHealth:CONFIG.enemy.baseHealth*scale*(elite?2.65:1),
      health:CONFIG.enemy.baseHealth*scale*(elite?2.65:1),
      speed:CONFIG.enemy.speed*(1+Math.min(.35,(this.wave-1)*.025))*(affix==='SWIFT'?1.22:1),
      damage:CONFIG.enemy.damage*scale*(this.wave<=2?.78:1)*(elite?1.28:1),
      attackClock:0,flash:0,elite,level,name,element,affix,
      ward:affix==='WARDED'?(45+level*3):0,maxWard:affix==='WARDED'?(45+level*3):0,
      resist:elite?{[element.id]:.48}:null,
      // Lightweight warband metadata: enough for readable formation without expensive pathfinding.
      cohort:Math.floor((this.spawnQueue||0)/3),
      lane:[-1,0,1][Math.floor(Math.random()*3)],
      role:elite?'brute':(Math.random()<.28?'flanker':'front')
    };
    this.enemies.push(enemy);
    if(elite)this.bus.emit('notice',{type:'combat',text:`ELITE SIGHTED — ${enemy.name}, Level ${enemy.level} ${enemy.element.id.toUpperCase()} ${enemy.affix}.`});
  }
  kill(enemy){
    const i=this.enemies.indexOf(enemy);if(i>=0)this.enemies.splice(i,1);
    this.totalKills++;this.bus.emit('enemy:killed',{enemy,wave:this.wave,total:this.totalKills});
  }
}