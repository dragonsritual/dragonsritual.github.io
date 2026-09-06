import {CONFIG,COLORS} from '../data/config.js?v=46S';
import {EventBus} from './EventBus.js?v=46S';
import {Input} from './Input.js?v=46S';
import {World} from '../systems/World.js?v=46S';
import {WaveSystem} from '../systems/WaveSystem.js?v=46S';
import {BuildSystem} from '../systems/BuildSystem.js?v=46S';
import {HUD} from '../ui/HUD.js?v=46S';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export class Game{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.bus=new EventBus();this.input=new Input(canvas);
    this.resize();addEventListener('resize',()=>this.resize());
    this.running=false;this.last=0;this.gatherClock=0;this.attackClock=0;this.bolts=[];this.paused=false;this.pendingLevels=0;
    this.debugCollision=false;this._collisionLatch=false;
    this.images={};
    const assetMap={
      worker:'/games/first-hold/assets/human/worker_walk.png?v=46S',
      workerAxe:'/games/first-hold/assets/human/worker_axe_attack.png?v=46S',
      workerPickaxe:'/games/first-hold/assets/human/worker_pickaxe_attack.png?v=46S',
      knight:'/games/first-hold/assets/human/knight_walk.png?v=46S',
      knightAttack:'/games/first-hold/assets/human/knight_attack.png?v=46S',
      swordsmanWalk:'/games/first-hold/assets/units/swordsman_walk.png?v=46S',
      swordsmanAttack:'/games/first-hold/assets/units/swordsman_attack.png?v=46S',
      archerWalk:'/games/first-hold/assets/units/archer_walk.png?v=46S',
      archerAttack:'/games/first-hold/assets/units/archer_attack.png?v=46S',
      stableKnightWalk:'/games/first-hold/assets/units/knight_walk_unit.png?v=46S',
      stableKnightAttack:'/games/first-hold/assets/units/knight_attack_unit.png?v=46S',
      orc:'/games/first-hold/assets/orc/warrior_walk.png?v=46S',
      berserk:'/games/first-hold/assets/orc/berserk_walk.png?v=46S',
      castle:'/games/first-hold/assets/human/castle_atlas.png?v=46S',
      blacksmith:'/games/first-hold/assets/human/blacksmith_atlas.png?v=46S',
      barracks:'/games/first-hold/assets/human/barracks_atlas.png?v=46S',
      archery:'/games/first-hold/assets/human/archery_atlas.png?v=46S',
      stables:'/games/first-hold/assets/human/stables_atlas.png?v=46S',
      farm:'/games/first-hold/assets/human/farm_atlas.png?v=46S',
      shrine:'/games/first-hold/assets/shrine/shrine_premade.png?v=46S',
      treeOak:'/games/first-hold/assets/world/tree_oak_hit.png?v=46S',
      treeHickory:'/games/first-hold/assets/world/tree_hickory_hit.png?v=46S',
      treePine:'/games/first-hold/assets/world/tree_pine_hit.png?v=46S',
      treeWillow:'/games/first-hold/assets/world/tree_willow_hit.png?v=46S',
      treeBirch:'/games/first-hold/assets/world/tree_birch_hit.png?v=46S',
      miningNodes:'/games/first-hold/assets/world/mining_nodes.png?v=46S',
      builder:'/games/first-hold/assets/workers/builder_human.png?v=46S',
      fire:'/games/first-hold/assets/fx/fire32.png?v=46S',
      smoke:'/games/first-hold/assets/fx/smoke32x48.png?v=46S',
      wallWood:'/games/first-hold/assets/world/wall_wood.png?v=46S',
      wallStone:'/games/first-hold/assets/world/wall_stone.png?v=46S',
      crops:'/games/first-hold/assets/world/farm_crops.png?v=46S'
    };
    for(const [key,src] of Object.entries(assetMap)){
      const im=new Image();
      im.onload=()=>console.info(`[FIRST HOLD 46S] loaded ${key}`,im.naturalWidth,im.naturalHeight);
      im.onerror=()=>console.error(`[FIRST HOLD 46S] FAILED ${key}`,src);
      im.src=src;
      this.images[key]=im;
    }
    console.info('[FIRST HOLD 46S] runtime renderer active');
    this.record=this.readRecord();
    this.reset();
    this.bindUI();
    this.bindEvents();
  }
  readWizard(){
    let c=null;try{c=JSON.parse(localStorage.getItem('dragon:ninth-spire:character')||'null')}catch{}
    return c||{name:'Dragon',level:1,element:'UNBOUND'};
  }
  readRecord(){try{return JSON.parse(localStorage.getItem('dragon:first-hold:record')||'{}')}catch{return{}}}
  saveRecord(){
    const earnedXP=Math.max(0,Math.floor(this.waves.totalKills*4+this.waves.wave*35+this.state.survival/8));
    const r={
      bestWave:Math.max(this.record.bestWave||0,this.waves.wave),
      bestTime:Math.max(this.record.bestTime||0,this.state.survival),
      bestKills:Math.max(this.record.bestKills||0,this.waves.totalKills),
      accountXP:(this.record.accountXP||0)+earnedXP,
      runs:(this.record.runs||0)+1,
      lastRunXP:earnedXP
    };
    this.record=r;localStorage.setItem('dragon:first-hold:record',JSON.stringify(r));
    return earnedXP;
  }
  reset(){
    this._gameOverCommitted=false;
    const wc=this.readWizard();
    this.bus=new EventBus();this.world=new World(this.bus);this.waves=new WaveSystem(this.bus);
    this.state={bank:{wood:0,stone:0,gold:0,essence:0,iron:0,gems:0,provisions:0,food:0},survival:0,bestWave:this.record.bestWave||0,totalGold:0,upgrades:{power:1,vitality:1,speed:1},holdLevel:1,holdGrowth:0,running:false,progress:{gathered:false,built:false,survived:false,invested:false}};
    this.hall={x:CONFIG.hall.x,y:CONFIG.hall.y,radius:CONFIG.hall.radius,maxHealth:CONFIG.hall.maxHealth,health:CONFIG.hall.maxHealth,attackClock:0};
    // The Hearth is part of every run, not a build-menu structure. It begins cold.
    this.hearth={x:CONFIG.hall.x-205,y:CONFIG.hall.y+126,lit:false,fuel:0,maxFuel:120,food:0,cooking:null,cooked:0};
    this.world.ensureInitialCitizens(this.hall);
    this.player={x:CONFIG.hall.x-120,y:CONFIG.hall.y+50,radius:CONFIG.player.radius,maxHealth:CONFIG.player.maxHealth,health:CONFIG.player.maxHealth,speed:CONFIG.player.speed,damage:CONFIG.player.attackDamage,castRate:1,carry:{wood:0,stone:0,food:0},xp:0,level:Math.max(1,Number(wc.level)||1),name:wc.name||'Dragon',affinity:wc.element||wc.affinity||'UNBOUND',dead:false,respawn:0,
      facingX:1,facingY:0,action:'idle',actionTime:0,actionDuration:0,
      toolTier:1,weaponTier:1,gatherPower:1,meleeDamage:CONFIG.player.meleeDamage};
    this.build=new BuildSystem(this.bus,this.world,this.state);this.hud=new HUD(this.bus,this.state,this.waves);
    this.camera={x:CONFIG.hall.x,y:CONFIG.hall.y};
    this.gatherClock=0;this.attackClock=0;this.bolts=[];this.towerBolts=[];this.arcaneBolts=[];this.wizardDefenders=[];this.settlementDefenders=[];this.defenderBolts=[];this.bloodParticles=[];this.bloodDecals=[];this.impactFX=[];this.bindEvents();
    document.getElementById('wizardName').textContent=this.player.name.toUpperCase();
    document.getElementById('wizardAffinity').textContent=String(this.player.affinity).toUpperCase();
    document.getElementById('wizardLevel').textContent=this.player.level;
    document.getElementById('bestWave').textContent=this.state.bestWave;
  }
  bindEvents(){
    this.bus.on('notice',e=>this.broadcast(e.type||'realm',e.text));
    this.bus.on('wave:start',e=>this.broadcast('combat',`Incursion ${e.wave} has begun at the First Hold.`));
    this.bus.on('wave:end',e=>{this.state.progress.survived=true;this.state.totalGold+=e.reward;this.broadcast('growth',`The First Hold survived Wave ${e.wave} and earned ${e.reward} Gold.`)});
    this.bus.on('build:placed',b=>{this.state.progress.built=true;this.broadcast('build',`${this.player.name} raised a ${CONFIG.build[b.type].name} in the First Hold.`)});
    this.bus.on('build:upgraded',b=>{this.state.progress.invested=true;this.world.ensureWorkerFor(b);this.broadcast('build',`${CONFIG.build[b.type].name} advanced to Tier ${b.level}.`)});
    this.bus.on('enemy:killed',e=>{this.gainXP(14+this.waves.wave*2);this.spawnBlood(e.enemy.x,e.enemy.y,10,true);if(Math.random()<.72)this.world.spawnDrop(e.enemy.x,e.enemy.y,'gold',1+Math.floor(this.waves.wave/3));if(Math.random()<.16)this.world.spawnDrop(e.enemy.x+8,e.enemy.y,'essence',1)});
  }
  bindUI(){
    document.querySelectorAll('[data-build]').forEach(b=>b.addEventListener('click',()=>{this.selectBuild(b.dataset.build);this.closeBuildMenu()}));
    document.querySelector('[data-build-menu-close]')?.addEventListener('click',()=>this.closeBuildMenu());
    document.querySelectorAll('[data-upgrade]').forEach(b=>b.addEventListener('click',()=>this.buyPlayerUpgrade(b.dataset.upgrade)));
    document.querySelectorAll('[data-level-choice]').forEach(b=>b.addEventListener('click',()=>this.chooseLevelUp(b.dataset.levelChoice)));
    document.querySelector('[data-feed-hold]')?.addEventListener('click',()=>this.feedHold());
    document.querySelectorAll('[data-build-filter]').forEach(btn=>btn.addEventListener('click',()=>this.filterBuildMenu(btn.dataset.buildFilter)));
    addEventListener('keydown',e=>this.handleBuildHotkey(e));
  }

  filterBuildMenu(filter='all'){
    document.querySelectorAll('[data-build-filter]').forEach(b=>b.classList.toggle('is-active',b.dataset.buildFilter===filter));
    document.querySelectorAll('.build-grid [data-build]').forEach(card=>{
      const tags=(card.dataset.buildTags||'').split(' ');
      card.hidden=filter!=='all'&&!tags.includes(filter);
    });
  }
  handleBuildHotkey(e){
    if(e.repeat)return;
    const now=performance.now();
    const code=e.code;
    if(code==='KeyB'){
      e.preventDefault();
      if(this._buildChordUntil&&now<this._buildChordUntil){
        this._buildChordUntil=0;this.selectBuild('barracks');this.closeBuildMenu();return;
      }
      this._buildChordUntil=now+1800;
      const el=document.getElementById('buildMenu');if(el){el.hidden=false;this.filterBuildMenu('all')}
      const hint=document.getElementById('buildHint');if(hint)hint.textContent='BUILD COMMAND: W Wall · B Barracks · L Blacksmith · A Archery · S Stables · N Shrine · F Farm · H House · T Tower · M Academy';
      return;
    }
    if(!this._buildChordUntil||now>this._buildChordUntil)return;
    const map={KeyW:'wall',KeyL:'workshop',KeyA:'archery',KeyS:'stables',KeyN:'shrine',KeyF:'farm',KeyH:'house',KeyT:'tower',KeyM:'academy'};
    const type=map[code];
    if(type){e.preventDefault();this._buildChordUntil=0;this.selectBuild(type);this.closeBuildMenu();}
  }

  selectBuild(type){
    this.build.select(type);
    document.querySelectorAll('[data-build]').forEach(b=>b.classList.toggle('is-active',b.dataset.build===this.build.selected));
    document.getElementById('buildHint').textContent=this.build.selected?`Place ${CONFIG.build[this.build.selected].name} with the mouse. ESC cancels.`:'Press B or choose a structure.';
  }
  toggleBuildMenu(){
    const el=document.getElementById('buildMenu');if(!el)return;
    el.hidden=!el.hidden;
  }
  closeBuildMenu(){const el=document.getElementById('buildMenu');if(el)el.hidden=true}
  start(){
    this.running=true;this.state.running=true;this.last=performance.now();requestAnimationFrame(t=>this.loop(t));
    this.bus.emit('notice',{type:'realm',text:'The First Hold is founded. Gather before the first incursion.'});
  }
  resize(){
    const dpr=Math.min(devicePixelRatio||1,2),r=this.canvas.getBoundingClientRect();
    this.canvas.width=Math.max(1,Math.floor(r.width*dpr));
    this.canvas.height=Math.max(1,Math.floor(r.height*dpr));
    this.dpr=dpr;

    // Large displays should not turn the entire game into miniature sprites.
    // Keep laptop scale familiar and progressively zoom the world on ultrawide/4K.
    const widthZoom=Math.max(1,Math.min(1.55,r.width/1920));
    const heightGuard=r.height<720?.94:r.height<850?1:1.04;
    this.worldZoom=Math.max(.94,Math.min(1.55,widthZoom*heightGuard));
  }
  loop(t){
    if(!this.running)return;
    const dt=Math.min(.033,(t-this.last)/1000||0);this.last=t;
    if(!this.paused)this.update(dt);this.draw();
    requestAnimationFrame(tt=>this.loop(tt));
  }

  // PASS 46H — world-space collision uses ground footprints, never full sprite rectangles.
  getStructureFootprints(){
    const fp=[];
    const h=this.hall;
    // Ground footprint only: player may visually pass behind upper castle art,
    // but cannot walk through the masonry at its base.
    if(h) fp.push({
      // 46S: align the collision rectangle to the castle's visible masonry/base.
      // Shape/size from 46R retained; only the world-space anchor is corrected.
      x:h.x+48,
      y:h.y+20,
      rx:104,
      ry:45,
      shape:'rect',
      type:'hold',
      ref:h
    });

    // Resource nodes live in this.world.nodes, not this.nodes.
    for(const n of (this.world?.nodes||[])){
      if(n.dead)continue;
      if(n.type==='wood') fp.push({x:n.x,y:n.y+2,rx:13,ry:9,type:'tree',ref:n});
      else fp.push({x:n.x,y:n.y+1,rx:9,ry:6,type:n.type,ref:n});
    }

    // Placed structures live in this.world.buildings.
    for(const b of (this.world?.buildings||[])){
      let rx=28,ry=18;
      if(b.type==='workshop'){rx=42;ry=24}
      else if(b.type==='barracks'||b.type==='archery'){rx=48;ry=26}
      else if(b.type==='stables'){rx=52;ry=28}
      else if(b.type==='farm'){rx=44;ry=23}
      else if(b.type==='shrine'){rx=34;ry=20}
      else if(b.type==='tower'){rx=26;ry=18}
      else if(b.type==='academy'){rx=56;ry=30}
      else if(b.type==='wall'){rx=10;ry=10}
      fp.push({x:b.x,y:b.y+5,rx,ry,type:b.type,ref:b});
    }
    return fp;
  }

  resolvePlayerStructureCollision(oldX,oldY){
    const p=this.player;if(!p||p.dead)return;
    const pr=8;
    for(const f of this.getStructureFootprints()){
      if(f.shape==='rect'){
        const left=f.x-f.rx-pr,right=f.x+f.rx+pr,top=f.y-f.ry-pr,bottom=f.y+f.ry+pr;
        if(p.x>left&&p.x<right&&p.y>top&&p.y<bottom){
          const dl=p.x-left,dr=right-p.x,dt=p.y-top,db=bottom-p.y;
          const mn=Math.min(dl,dr,dt,db);
          if(mn===dl)p.x=left;else if(mn===dr)p.x=right;else if(mn===dt)p.y=top;else p.y=bottom;
        }
        continue;
      }
      let dx=p.x-f.x,dy=p.y-f.y;const rx=f.rx+pr,ry=f.ry+pr;
      const q=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry);
      if(q<1){
        if(Math.abs(dx)+Math.abs(dy)<.001){dx=p.x-oldX;dy=p.y-oldY;if(!dx&&!dy)dy=1}
        const k=1/Math.sqrt(Math.max(q,.0001));p.x=f.x+dx*k;p.y=f.y+dy*k;
      }
    }
  }

  worldDepthY(o){
    // Sort by the point where the object touches the ground.
    return (o?.y||0)+(o?.depthFoot||0);
  }

  update(dt){
    const __oldPX=this.player?.x??0,__oldPY=this.player?.y??0;
    if(this.hall.health<=0){this.gameOver();return}
    this.state.survival+=dt;this.world.update(dt);this.waves.update(dt,this.state);
    this.updatePlayer(dt);this.updateHearth(dt);this.updateBolts(dt);this.updateEnemies(dt);this.updateBuildings(dt);this.updateLivingSettlement(dt);this.updateSettlementWorkers(dt);this.updateAutonomousGatherers(dt);this.updateMilitaryBuildings(dt);this.updateTowers(dt);this.updateWizardAcademies(dt);this.updateBlood(dt);this.updateHall(dt);this.pickups();
    this.camera.x+=(this.player.x-this.camera.x)*Math.min(1,dt*6);this.camera.y+=(this.player.y-this.camera.y)*Math.min(1,dt*6);
    // 46I: collision MUST run after every movement/update system has changed positions.
    this.resolvePlayerStructureCollision(__oldPX,__oldPY);
    this.hud.update(this.player,this.hall);
    const pop=document.getElementById('settlementPop');
    if(pop)pop.textContent=`POP ${this.world.settlement.population.length}/${this.world.housingCapacity()} · FOOD ${this.state.bank.food||0}`;
    this.updateProgress();
    if(this._structurePanelTime>0){this._structurePanelTime-=dt;if(this._structurePanelTime<=0){const el=document.getElementById('structurePanel');if(el)el.hidden=true}}
  }
  updatePlayer(dt){
    const p=this.player;
    if(p.dead){this.gameOver('player');return}
    let dx=(this.input.down('KeyD')||this.input.down('ArrowRight')?1:0)-(this.input.down('KeyA')||this.input.down('ArrowLeft')?1:0);
    let dy=(this.input.down('KeyS')||this.input.down('ArrowDown')?1:0)-(this.input.down('KeyW')||this.input.down('ArrowUp')?1:0);
    if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;p.facingX=dx;p.facingY=dy;p.x=clamp(p.x+dx*p.speed*dt,24,CONFIG.world.width-24);p.y=clamp(p.y+dy*p.speed*dt,24,CONFIG.world.height-24)}
    p.actionTime=Math.max(0,(p.actionTime||0)-dt);if(p.actionTime<=0)p.action='idle';
    this.gatherClock-=dt;this.attackClock-=dt;
    // Hold E for continuous harvesting/actions so players don't have to hammer the key.
    if(this.input.down('KeyE')){
      this._eHoldClock=(this._eHoldClock||0)-dt;
      if(this._eHoldClock<=0){
        this.contextAction();
        this._eHoldClock=.14;
      }
    }else{
      this._eHoldClock=0;
      this._inspectHeld=false;
    }
    if(this.input.down('Equal')&&!this._zoomPlusLatch){
      this._zoomPlusLatch=true;this.worldZoom=Math.min(1.8,(this.worldZoom||1)+.1);
      this.bus.emit('notice',{type:'realm',text:`WORLD SCALE ${Math.round(this.worldZoom*100)}%`});
    }
    if(!this.input.down('Equal'))this._zoomPlusLatch=false;
    if(this.input.down('Minus')&&!this._zoomMinusLatch){
      this._zoomMinusLatch=true;this.worldZoom=Math.max(.82,(this.worldZoom||1)-.1);
      this.bus.emit('notice',{type:'realm',text:`WORLD SCALE ${Math.round(this.worldZoom*100)}%`});
    }
    if(!this.input.down('Minus'))this._zoomMinusLatch=false;

    if(this.input.down('KeyQ')&&!this._foodLatch){
      this._foodLatch=true;
      if((this.player.carry.food||0)>0&&this.player.health<this.player.maxHealth){
        this.player.carry.food--;this.player.health=Math.min(this.player.maxHealth,this.player.health+8);
        this.bus.emit('notice',{type:'growth',text:'You ate wild forage. +8 health. Cooked provisions will eventually be much stronger.'});
      }
    }
    if(!this.input.down('KeyQ'))this._foodLatch=false;
    if(this.input.down('F3')&&!this._collisionLatch){this._collisionLatch=true;this.debugCollision=!this.debugCollision;this.bus.emit('notice',{type:'realm',text:`WORLD DEBUG ${this.debugCollision?'ON':'OFF'} — collision, depth anchors and ranges visible.`})}
    if(!this.input.down('F3'))this._collisionLatch=false;
    if(this.input.down('KeyF')&&!this._fLatch){this._fLatch=true;this.meleeAttack()}
    if(!this.input.down('KeyF'))this._fLatch=false;
    if(this.input.down('Space')&&this.attackClock<=0)this.attack(null,false);
    if(this.input.consumeClick()){
      if(this.build.selected){const pos=this.screenToWorld(this.input.mouse.x,this.input.mouse.y);if(this.build.place(pos.x,pos.y))this.selectBuild(null)}
      else if(this.attackClock<=0)this.attack(null,false);
    }
    const buildKeys=[['Digit1','wall'],['Digit2','workshop'],['Digit3','shrine'],['Digit4','barracks'],['Digit5','archery'],['Digit6','stables'],['Digit7','farm'],['Digit8','tower'],['Digit9','academy']];
    for(const [key,type] of buildKeys){if(this.input.down(key)&&!this._buildKeyLatch?.[key]){this._buildKeyLatch=this._buildKeyLatch||{};this._buildKeyLatch[key]=true;this.selectBuild(type)}if(!this.input.down(key)&&this._buildKeyLatch)this._buildKeyLatch[key]=false}
    if(this.input.down('Escape')){this.selectBuild(null);this.closeBuildMenu()}
    if(this.input.down('KeyU')&&!this._uLatch){this._uLatch=true;this.build.upgradeNearby(p)}
    if(!this.input.down('KeyU'))this._uLatch=false;
    if(dist(p,this.hall)<150&&(p.carry.wood||p.carry.stone||p.carry.food)){this.state.bank.wood+=p.carry.wood;this.state.bank.stone+=p.carry.stone;this.state.bank.food+=(p.carry.food||0);const amount=p.carry.wood+p.carry.stone+(p.carry.food||0);p.carry.wood=0;p.carry.stone=0;p.carry.food=0;this.bus.emit('notice',{type:'growth',text:`${p.name} deposited ${amount} shared materials.`})}
  }
  contextAction(){
    // Fixed outdoor hearth: E lights/refuels it and manages simple run-based cooking.
    if(this.hearth&&dist(this.player,this.hearth)<72){
      const h=this.hearth;
      if(!h.lit){
        if((this.player.carry.wood||0)>0){this.player.carry.wood--;h.fuel=Math.min(h.maxFuel,h.fuel+32);h.lit=true;this.bus.emit('notice',{type:'realm',text:'The First Hold hearth catches. Keep feeding it Wood.'});}
        else this.bus.emit('notice',{type:'realm',text:'The hearth is cold. Carry Wood here and hold E to kindle it.'});
      }else if(h.cooking){
        this.bus.emit('notice',{type:'realm',text:`Cooking ${h.cooking.name}: ${Math.ceil(h.cooking.time)}s remaining.`});
      }else if(h.cooked>0){
        h.cooked--;this.player.health=Math.min(this.player.maxHealth,this.player.health+28);this.bus.emit('notice',{type:'growth',text:'You eat a hot camp meal. +28 health.'});
      }else if((this.player.carry.food||0)>0){
        this.player.carry.food--;h.cooking={name:'FORAGED STEW',time:12,total:12};this.bus.emit('notice',{type:'growth',text:'Foraged Stew begins cooking over the hearth.'});
      }else if((this.player.carry.wood||0)>0&&h.fuel<h.maxFuel-12){
        this.player.carry.wood--;h.fuel=Math.min(h.maxFuel,h.fuel+32);this.bus.emit('notice',{type:'realm',text:'Wood added to the hearth.'});
      }else this.bus.emit('notice',{type:'realm',text:'The hearth is burning. Bring Food to cook, or Wood to keep it alive.'});
      return;
    }

    // Forage first. Mushrooms/berries are emergency healing OR valuable pantry stock.
    const forage=this.world.nearestForage?.(this.player,54);
    if(forage&&this.gatherClock<=0){
      const got=this.world.harvestForage(forage);
      if(got){
        this.player.carry.food=(this.player.carry.food||0)+got;
        this.player.health=Math.min(this.player.maxHealth,this.player.health+2);
        this.gatherClock=.28;
        this.bus.emit('notice',{type:'growth',text:`Foraged ${got} food. Bring it to the Hold for better meals, or use it as emergency sustenance.`});
      }
      return;
    }
    const b=this.world.nearestBuilding(this.player,92);
    if(b){
      if(!this._inspectHeld){this.showBuildingPanel(b);this._inspectHeld=true}
      return;
    }
    if(dist(this.player,this.hall)<158){
      if(!this._inspectHeld){this.showHoldPanel();this._inspectHeld=true}
      return;
    }
    this._inspectHeld=false;
    this.gather();
  }
  meleeAttack(){
    if(this.player.dead||this.attackClock>0)return;
    const target=this.nearestEnemy(this.player,CONFIG.player.meleeRange+34);
    let dx=this.player.facingX||1,dy=this.player.facingY||0;
    if(target){
      const d=Math.hypot(target.x-this.player.x,target.y-this.player.y)||1;
      dx=(target.x-this.player.x)/d;dy=(target.y-this.player.y)/d;
      this.player.facingX=dx;this.player.facingY=dy;
    }
    this.attackClock=Math.max(.18,(CONFIG.player.meleeCooldown-(this.player.weaponTier-1)*.035)/this.player.castRate);
    this.player.action='melee';this.player.actionTime=.58;this.player.actionDuration=.58;
    if(target){
      this.damageEnemy(target,this.player.meleeDamage,'physical');
      target.flash=.10;this.spawnBlood(target.x,target.y,5,false);
      target.x+=dx*10;target.y+=dy*10;
      if(target.health<=0)this.waves.kill(target);
    }
  }
  showHoldPanel(){
    const el=document.getElementById('structurePanel');if(!el)return;
    el.hidden=false;
    el.innerHTML=`<small>SETTLEMENT CORE</small><h3>FIRST HOLD · T${this.state.holdLevel}</h3><div class="structure-meter"><i style="width:${Math.max(0,this.hall.health/this.hall.maxHealth*100)}%"></i></div><p>Deposit materials here. Feed the Hold to expand durability and construction reach.</p><b>E CLOSE · FEED THE HOLD FROM RIGHT HUD</b>`;
    this._structurePanelTime=5;
  }
  buildingRoleText(b){
    const t=b.type,l=b.level;
    const roles={
      workshop:`Forge T${l}: tools gather ${this.player.gatherPower} per strike; weapons increase melee damage.`,
      shrine:`Generates ${l} Essence every 10 seconds.`,
      barracks:`Maintains ${l} melee defender${l>1?'s':''} around the settlement.`,
      archery:`Maintains ${l} ranged defender${l>1?'s':''} with long sight lines.`,
      stables:`Maintains ${l} mounted patrol${l>1?'s':''}; each tier also improves your movement speed.`,
      farm:`Produces provisions. Higher tiers improve passive recovery near the Hold.`,
      tower:`Slow autonomous defense. T${l} improves range, damage and firing cadence.`,
      academy:`Supports ${l} autonomous wizard defender${l>1?'s':''} and arcane projectiles.`,
      wall:`Connects to one nearest eligible post. T2 becomes stone; T3 becomes arcane.`,
    };
    return roles[t]||CONFIG.build[t]?.description||'Settlement structure.';
  }
  showBuildingPanel(b){
    const el=document.getElementById('structurePanel');if(!el)return;
    el.hidden=false;
    const hp=Math.max(0,b.health/b.maxHealth*100);
    const state=b.complete?`T${b.level}`:`BUILD ${Math.floor((b.construction||0)*100)}%`;
    el.innerHTML=`<small>${CONFIG.build[b.type].category||'STRUCTURE'} · ${state}</small><h3>${CONFIG.build[b.type].name}</h3><div class="structure-meter"><i style="width:${hp}%"></i></div><p>${this.buildingRoleText(b)}</p><b>U UPGRADE NEARBY · E INSPECT</b>`;
    this._structurePanelTime=5;
  }
  feedHold(){
    const lv=this.state.holdLevel||1;
    const cost={wood:10+lv*5,stone:8+lv*4,gold:6+lv*4};
    const b=this.state.bank;
    if(b.wood<cost.wood||b.stone<cost.stone||b.gold<cost.gold){this.bus.emit('notice',{type:'growth',text:`Hold growth requires ${cost.wood} Wood, ${cost.stone} Stone and ${cost.gold} Gold.`});return}
    b.wood-=cost.wood;b.stone-=cost.stone;b.gold-=cost.gold;
    this.state.holdGrowth=(this.state.holdGrowth||0)+1;
    this.state.holdLevel++;
    this.hall.maxHealth+=240;this.hall.health=Math.min(this.hall.maxHealth,this.hall.health+240);
    this.state.progress.invested=true;
    this.bus.emit('notice',{type:'growth',text:`The First Hold has been provisioned and advances to Settlement Tier ${this.state.holdLevel}. Its defenses and reach grow stronger.`});
  }
  gather(){
    if(this.gatherClock>0)return;
    const node=this.world.nearestNode(this.player,68);if(!node)return;
    const carried=this.player.carry.wood+this.player.carry.stone;
    if(carried>=CONFIG.player.carryMax){this.bus.emit('notice',{type:'realm',text:'Your pack is full. Return to the Hold.'});this.gatherClock=.8;return}
    const room=CONFIG.player.carryMax-carried;
    const amount=Math.max(1,Math.min(this.player.gatherPower||1,room,node.remaining));
    this.player.action=node.type==='wood'?'chop':'mine';this.player.actionTime=.34;this.player.actionDuration=.34;
    this.player.facingX=node.x-this.player.x;this.player.facingY=node.y-this.player.y;
    const result=this.world.harvest(node,amount);
    if(result){
      this.state.progress.gathered=true;
      this.player.carry[result.type]+=result.amount;
      this.gatherClock=Math.max(.20,CONFIG.player.gatherRate-(this.player.toolTier-1)*.045);
      this.player.x+=(this.player.x-node.x)*.01;this.player.y+=(this.player.y-node.y)*.01;
    }
  }
  attack(forcedTarget=null){
    if(this.player.dead||this.attackClock>0)return;
    let target=forcedTarget||this.nearestEnemy(this.player,500);
    let wx,wy;
    if(target){wx=target.x;wy=target.y}
    else if(this.input.mouse.x||this.input.mouse.y){const p=this.screenToWorld(this.input.mouse.x,this.input.mouse.y);wx=p.x;wy=p.y}
    else{wx=this.player.x+this.player.facingX*100;wy=this.player.y+this.player.facingY*100}
    let dx=wx-this.player.x,dy=wy-this.player.y,l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    this.player.facingX=dx;this.player.facingY=dy;
    this.attackClock=Math.max(.12,(CONFIG.player.attackCooldown-(this.state.upgrades.power-1)*.025)/this.player.castRate);
    this.player.action='cast';this.player.actionTime=.20;this.player.actionDuration=.20;
    this.bolts.push({x:this.player.x,y:this.player.y,vx:dx*CONFIG.player.boltSpeed,vy:dy*CONFIG.player.boltSpeed,radius:6,life:1.2,damage:this.player.damage,element:'arcane'});
  }
  damageEnemy(e,amount,element='physical'){
    if(!e||e.health<=0)return 0;
    let dmg=amount;
    if(e.resist&&e.resist[element])dmg*=1-e.resist[element];
    if(e.ward>0){
      const absorbed=Math.min(e.ward,dmg);e.ward-=absorbed;dmg-=absorbed;
      this.impactFX.push({x:e.x,y:e.y,life:.20,maxLife:.20,type:'ward'});
    }
    if(dmg>0)e.health-=dmg;
    return dmg;
  }
  updateBolts(dt){
    for(const b of this.bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of this.waves.enemies){if(dist(b,e)<b.radius+e.radius){this.damageEnemy(e,b.damage,b.element||'arcane');e.flash=.08;this.spawnBlood(e.x,e.y,2,false);b.life=0;if(e.health<=0)this.waves.kill(e);break}}}
    this.bolts=this.bolts.filter(b=>b.life>0&&b.x>0&&b.y>0&&b.x<CONFIG.world.width&&b.y<CONFIG.world.height);
  }
  updateEnemies(dt){
    for(const e of [...this.waves.enemies]){
      e.flash=Math.max(0,e.flash-dt);e.attackClock-=dt;
      if(e.elite&&e.affix==='BERSERKER'&&e.health<e.maxHealth*.40){e._rage=1}else e._rage=0;
      let target=this.hall,td=dist(e,this.hall),targetType='hall';
      if(!this.player.dead){const pd=dist(e,this.player);if(pd<td&&pd<190){target=this.player;td=pd;targetType='player'}}
      for(const b of this.world.buildings){if(b.health<=0)continue;const bd=dist(e,b);if(bd<td){target=b;td=bd;targetType='building'}}
      const reach=(target.radius||target.size||24)+e.radius+5;
      if(td>reach){
        let dx=(target.x-e.x)/td,dy=(target.y-e.y)/td;
        // Cohort behavior: raiders arrive as loose warbands instead of one overlapping blob.
        // Frontliners bias inward; flankers hold lateral offset; elites naturally become anchors.
        const tx=-dy,ty=dx;
        const desiredLane=(e.lane||0)*(e.role==='flanker'?38:22);
        dx+=tx*desiredLane/Math.max(90,td);dy+=ty*desiredLane/Math.max(90,td);
        let sx=0,sy=0;
        for(const o of this.waves.enemies){
          if(o===e)continue;
          const ox=e.x-o.x,oy=e.y-o.y,od=Math.hypot(ox,oy)||1;
          if(od<42){const push=(42-od)/42;sx+=(ox/od)*push;sy+=(oy/od)*push}
        }
        dx+=sx*.72;dy+=sy*.72;
        const dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;
        const roleSpeed=e.role==='flanker'?1.08:e.role==='brute'?.88:1;
        e.x+=dx*e.speed*roleSpeed*(e._rage?1.22:1)*dt;e.y+=dy*e.speed*roleSpeed*(e._rage?1.22:1)*dt;
      }
      else if(e.attackClock<=0){e.attackClock=CONFIG.enemy.attackCooldown;if(targetType==='player'){this.player.health-=e.damage*(e._rage?1.2:1);if(e.elite&&e.affix==='LEECHING')e.health=Math.min(e.maxHealth,e.health+e.damage*.35);if(this.player.health<=0){this.player.health=0;this.player.dead=true;this.bus.emit('notice',{type:'combat',text:`${this.player.name} fell. This First Hold run is over.`})}}else{target.health-=e.damage*(e._rage?1.2:1);if(e.elite&&e.affix==='LEECHING')e.health=Math.min(e.maxHealth,e.health+e.damage*.25);if(targetType==='building'&&target.health<=0){this.bus.emit('notice',{type:'combat',text:`A ${CONFIG.build[target.type].name} has been destroyed.`});this.world.buildings=this.world.buildings.filter(x=>x!==target)}}}
    }
  }
  updateBuildings(dt){
    let shrines=0,workshopLevel=0;
    for(const b of this.world.buildings){
      if(!b.complete){
        b.construction=Math.min(1,(b.construction||0)+dt/(b.buildTime||5));
        if(b.construction>=1){b.complete=true;b.construction=1;this.bus.emit('notice',{type:'build',text:`${CONFIG.build[b.type].name} completed.`})}
      }
    }
    for(const b of this.world.buildings){if(!b.complete)continue;if(b.type==='shrine'){shrines+=b.level;b.essenceClock+=dt;if(b.essenceClock>=10){b.essenceClock-=10;this.state.bank.essence+=b.level;this.bus.emit('notice',{type:'growth',text:`The Shrine yields ${b.level} Essence.`})}}if(b.type==='workshop')workshopLevel=Math.max(workshopLevel,b.level);
      if(b.type==='farm'){
        b.foodClock=(b.foodClock||0)+dt;
        // T1 farm grows basic food. T2+ also behaves as the first kitchen/pantry loop:
        // gathered wild food is converted into stronger provisions.
        if(b.foodClock>=12){
          b.foodClock-=12;
          let made=b.level;
          if(b.level>=2&&this.state.bank.food>0){
            const used=Math.min(this.state.bank.food,b.level);
            this.state.bank.food-=used;made+=used*2;
            this.bus.emit('notice',{type:'growth',text:`The settlement cook turned ${used} wild food into ${used*2} extra provisions.`});
          }
          this.state.bank.provisions+=made;
        }
      }
    }
    this.workshopLevel=workshopLevel;this.shrinePower=shrines;
    const stableTier=Math.max(0,...this.world.buildings.filter(b=>b.complete&&b.type==='stables').map(b=>b.level));
    this.player.speed=CONFIG.player.speed+(this.state.upgrades.speed-1)*18+stableTier*10;
    const farmTier=Math.max(0,...this.world.buildings.filter(b=>b.complete&&b.type==='farm').map(b=>b.level));
    if(farmTier&&dist(this.player,this.hall)<250&&this.state.bank.provisions>0&&this.player.health<this.player.maxHealth){
      this._rationClock=(this._rationClock||0)+dt;
      if(this._rationClock>=8){this._rationClock=0;this.state.bank.provisions--;this.player.health=Math.min(this.player.maxHealth,this.player.health+8+farmTier*4)}
    }
    const forgeTier=Math.max(1,workshopLevel||1);
    if(forgeTier!==this.player.toolTier){
      const previous=this.player.toolTier;
      this.player.toolTier=forgeTier;this.player.weaponTier=forgeTier;
      this.player.gatherPower=forgeTier;
      this.player.meleeDamage=CONFIG.player.meleeDamage+(forgeTier-1)*CONFIG.player.meleeDamagePerForgeTier;
      if(forgeTier>previous)this.bus.emit('notice',{type:'growth',text:`BLACKSMITH T${forgeTier}: ${forgeTier===2?'Iron':'Masterwork'} tools and weapons forged. Gathering now yields ${forgeTier} per strike; melee damage increased.`});
    }
    const forge=document.getElementById('forgeStatus');
    if(forge)forge.innerHTML=`<b>BLACKSMITH T${forgeTier}</b><span>${forgeTier===1?'Crude tools · +1 resource/strike':forgeTier===2?'Iron tools · +2 resources/strike · stronger melee':'Masterwork tools · +3 resources/strike · strongest melee'}</span>`;
  }

  updateLivingSettlement(dt){
    const s=this.world.settlement;if(!s)return;
    const move=(a,tx,ty,speed=a.speed||40)=>{
      const dx=tx-a.x,dy=ty-a.y,d=Math.hypot(dx,dy)||1;
      if(d<3){a.x=tx;a.y=ty;return true}
      const step=Math.min(d,speed*dt);a.x+=dx/d*step;a.y+=dy/d*step;return false;
    };

    this._citizenArrivalClock=(this._citizenArrivalClock||0)+dt;
    this._foodClock=(this._foodClock||0)+dt;

    // Houses attract citizens up to housing capacity.
    if(this._citizenArrivalClock>=30){
      this._citizenArrivalClock=0;
      if(this.world.buildings.some(b=>b.type==='house'&&b.complete)){
        const c=this.world.addCitizen(this.hall);
        if(c)this.bus.emit('notice',{type:'growth',text:`${c.name} arrived at First Hold. ${c.trait} · aptitude: ${c.aptitude}.`});
      }
    }

    // Farms create real plots and grow them continuously.
    for(const b of this.world.buildings){
      if(b.type!=='farm'||!b.complete)continue;
      const plots=this.world.ensureFarmPlots(b);
      for(const p of plots){
        if(p.ready)continue;
        p.growth+=dt*(1+(b.level||1)*.15);
        p.stage=p.growth>=18?3:p.growth>=12?2:p.growth>=6?1:0;
        if(p.growth>=18)p.ready=true;
      }
    }

    // Unassigned citizens live independently: wander, visit buildings, shelter from raids.
    const destinations=this.world.buildings.filter(b=>b.complete&&b.type!=='wall');
    for(const c of s.population){
      if(c.job!=='citizen')continue;
      c.clock+=dt;
      let threat=null,td=145;
      for(const e of this.waves.enemies){const d=dist(c,e);if(d<td){td=d;threat=e}}
      if(threat){c.state='shelter';move(c,this.hall.x+(c.seed%40)-20,this.hall.y+50,c.speed*1.5);continue}
      if(!c.tx||Math.hypot(c.tx-c.x,c.ty-c.y)<5||c.clock>7+(c.seed%5)){
        c.clock=0;
        const d=destinations.length?destinations[Math.floor((c.seed+performance.now()/6500)%destinations.length)]:null;
        if(d){c.tx=d.x+(Math.random()-.5)*(d.size||40);c.ty=d.y+(d.size||40)*.45;c.state='walking'}
        else {c.tx=this.hall.x+(Math.random()-.5)*170;c.ty=this.hall.y+(Math.random()-.5)*110;c.state='walking'}
      }
      if(move(c,c.tx,c.ty,c.speed))c.state='idle';
    }

    // Population consumes food gently.
    if(this._foodClock>=25){
      this._foodClock=0;
      const need=Math.max(1,Math.ceil(s.population.length/3));
      if((this.state.bank.provisions||0)>=need)this.state.bank.provisions-=need;
      else if((this.state.bank.food||0)>=need)this.state.bank.food-=need;
      else this.bus.emit('notice',{type:'realm',text:'Food stores are low. Settlement labor will slow if shortages continue.'});
    }
  }

  updateAutonomousGatherers(dt){
    const s=this.world.settlement;if(!s)return;
    const move=(a,tx,ty,speed=a.speed||42)=>{
      const dx=tx-a.x,dy=ty-a.y,d=Math.hypot(dx,dy)||1;
      a.facingX=dx/d;a.facingY=dy/d;
      if(d<4){a.x=tx;a.y=ty;return true}
      const step=Math.min(d,speed*dt);a.x+=dx/d*step;a.y+=dy/d*step;return false;
    };

    // Hold growth unlocks autonomous crews instead of forcing Dragon to do every job forever.
    const lumberWanted=Math.min(2,Math.max(0,(this.state.holdLevel||1)-1));
    const minerWanted=Math.min(2,Math.max(0,(this.state.holdLevel||1)-2));
    const count=j=>s.population.filter(c=>c.job===j).length;

    while(count('lumber')<lumberWanted){
      const c=this.world.freeCitizen('wood');if(!c)break;
      this.world.assignJob(c,'lumber');this.bus.emit('notice',{type:'growth',text:`${c.name} joined the lumber crew.`});
    }
    while(count('miner')<minerWanted){
      const c=this.world.freeCitizen('stone');if(!c)break;
      this.world.assignJob(c,'miner');this.bus.emit('notice',{type:'growth',text:`${c.name} joined the mining crew.`});
    }

    for(const c of s.population){
      if(c.job!=='lumber'&&c.job!=='miner')continue;
      c.clock+=dt;

      let threat=null,td=135;
      for(const e of this.waves.enemies){const d=dist(c,e);if(d<td){td=d;threat=e}}
      if(threat){c.state='shelter';move(c,this.hall.x,this.hall.y+45,c.speed*1.55);continue}

      if(c.carrying){
        c.state='hauling';
        if(move(c,this.hall.x+(c.seed%45)-22,this.hall.y+58,c.speed)){
          const amount=c.carryAmount||1;
          if(c.carrying==='wood')this.state.bank.wood+=amount;
          else if(c.carrying==='stone')this.state.bank.stone+=amount;
          else if(c.carrying==='iron')this.state.bank.iron+=amount;
          else if(c.carrying==='gold')this.state.bank.gold+=amount;
          else if(c.carrying==='gem')this.state.bank.gems+=amount;
          c.experience+=amount;
          if(c.experience>=c.level*10){c.experience=0;c.level++;this.bus.emit('notice',{type:'growth',text:`${c.name} reached Level ${c.level} ${c.job}.`})}
          c.carrying=null;c.carryAmount=0;c.targetNodeId=null;c.clock=0;
        }
        continue;
      }

      let node=this.world.nodes.find(n=>n.id===c.targetNodeId&&!n.dead);
      if(!node){node=this.world.findHarvestNode(c.job,c.x,c.y);c.targetNodeId=node?.id||null}
      if(!node){c.state='idle';continue}

      c.state=c.job==='lumber'?'logging':'mining';
      if(!move(c,node.x,node.y+7,c.speed))continue;

      const cadence=Math.max(.6,1.35-(c.level-1)*.08-(c.trait==='Quick'?.12:0));
      if(c.clock>=cadence){
        c.clock=0;
        const power=1+(c.level>=3?1:0);
        const taken=Math.min(power,node.remaining);
        node.remaining-=taken;node.hitAnim=.3;node.hitFlash=.15;
        c.carrying=node.type==='wood'?'wood':node.type==='iron'?'iron':node.type==='goldore'?'gold':node.type==='gemstone'?'gem':'stone';
        c.carryAmount=taken;
        if(node.remaining<=0){
          node.dead=true;node.respawn=node.type==='wood'?(100+Math.random()*70):(145+Math.random()*100);
          node.falling=node.type==='wood';node.fallAge=0;node.fallDir=(Math.random()-.5)*1.4;
        }
      }
    }
  }

  updateSettlementWorkers(dt){
    const move=(w,tx,ty,speed=w.speed||44)=>{
      const dx=tx-w.x,dy=ty-w.y,d=Math.hypot(dx,dy)||1;
      w.facingX=dx/d;w.facingY=dy/d;
      if(d<4){w.x=tx;w.y=ty;return true}
      const step=Math.min(d,speed*dt);w.x+=dx/d*step;w.y+=dy/d*step;return false;
    };

    for(const b of this.world.buildings){
      if(b.type==='wall'||b.type==='house')continue;
      this.world.ensureWorkerFor(b);
      const w=this.world.workerFor(b);if(!w)continue;
      w.clock=(w.clock||0)+dt;w.jobClock=(w.jobClock||0)+dt;

      let threat=null,td=160;
      for(const e of this.waves.enemies){const d=dist(w,e);if(d<td){td=d;threat=e}}
      if(threat){
        w.state='flee';move(w,this.hall.x+(w.seed%50)-25,this.hall.y+48,w.speed*1.5);continue;
      }

      if(!b.complete){
        w.state='build';
        if(move(w,b.x+b.size*.55,b.y+b.size*.28,50))w.frame=((w.frame||0)+dt*8)%6;
        continue;
      }

      if(b.health<b.maxHealth*.96&&this.state.bank.gold>0&&(this.state.bank.wood>0||this.state.bank.stone>0)){
        w.state='repair';
        if(move(w,b.x+b.size*.58,b.y+b.size*.28,50)&&w.clock>=1.15){
          w.clock=0;this.state.bank.gold--;
          if(this.state.bank.stone>0)this.state.bank.stone--;else this.state.bank.wood--;
          b.health=Math.min(b.maxHealth,b.health+Math.max(18,b.maxHealth*.045));
        }
        continue;
      }

      const phase=(w.jobClock+(w.seed||0))%12;
      if(w.job==='farmer'){
        const plots=this.world.ensureFarmPlots(b),ready=plots.find(p=>p.ready);
        if(ready){
          w.state='harvest';
          if(move(w,ready.x,ready.y,48)&&w.clock>=.85){
            w.clock=0;ready.ready=false;ready.growth=0;ready.stage=0;
            this.state.bank.food=(this.state.bank.food||0)+1+(b.level||1);
            this.state.bank.provisions=(this.state.bank.provisions||0)+1;
            w.experience=(w.experience||0)+1;
          }
        }else{
          const p=plots[Math.floor((phase/12)*Math.max(1,plots.length))%Math.max(1,plots.length)];
          if(p){w.state='tending';move(w,p.x,p.y,44)}
        }
      }else if(w.job==='smith'||w.job==='fletcher'){
        if(phase<3){w.state='hauling';w.carrying='crate';move(w,this.hall.x+60,this.hall.y+50)}
        else if(phase<5){w.state='return';move(w,b.x+25,b.y+25)}
        else {w.carrying=null;w.state='working';move(w,b.x+25,b.y+25);w.frame=((w.frame||0)+dt*9)%6}
      }else if(['quartermaster','stablehand','watchman'].includes(w.job)){
        const a=(w.seed||0)+Math.floor(phase/3)*1.57,r=b.size+38;
        w.state=phase<9?'patrol':'working';
        move(w,phase<9?b.x+Math.cos(a)*r:b.x+22,phase<9?b.y+Math.sin(a)*r*.65:b.y+22,46);
      }else if(['keeper','apprentice'].includes(w.job)){
        const a=(w.seed||0)+phase*.2;
        w.state=phase<4?'walking':'working';
        move(w,phase<4?b.x+Math.cos(a)*(b.size+25):b.x+20,phase<4?b.y+Math.sin(a)*(b.size+18)*.6:b.y+20,42);
      }
    }
  }

  spawnBlood(x,y,count=5,makeDecal=false){
    // There is no neutral blood-splatter sheet in the library; keep generic combat blood lightweight.
    const cap=120;
    for(let i=0;i<count&&this.bloodParticles.length<cap;i++){
      const a=Math.random()*Math.PI*2,s=30+Math.random()*85;
      this.bloodParticles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-10,life:.24+Math.random()*.28,maxLife:.52,size:1.3+Math.random()*2.4});
    }
    if(makeDecal&&this.bloodDecals.length<70)this.bloodDecals.push({x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,r:3+Math.random()*5,life:55});
  }
  updateBlood(dt){
    for(const p of this.bloodParticles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.life-=dt}
    this.bloodParticles=this.bloodParticles.filter(p=>p.life>0);
    for(const d of this.bloodDecals)d.life-=dt;
    this.bloodDecals=this.bloodDecals.filter(d=>d.life>0);
    for(const f of this.impactFX)f.life-=dt;
    this.impactFX=this.impactFX.filter(f=>f.life>0);
  }
  syncAcademyWizards(building){
    if(!building.complete)return;
    const desired=Math.max(1,Math.min(3,building.level));
    const existing=this.wizardDefenders.filter(w=>w.academyId===building.id);
    while(existing.length<this.wizardDefenders.filter(w=>w.academyId===building.id).length){}
    let count=this.wizardDefenders.filter(w=>w.academyId===building.id).length;
    while(count<desired){
      const i=count;
      const ang=(i/Math.max(1,desired))*Math.PI*2;
      this.wizardDefenders.push({id:Math.random().toString(36),academyId:building.id,x:building.x+Math.cos(ang)*86,y:building.y+Math.sin(ang)*64,homeX:building.x,homeY:building.y,attackClock:.4+i*.2,action:'idle',actionTime:0,facingX:1,facingY:0});
      count++;
      this.bus.emit('notice',{type:'growth',text:`Wizard Academy T${building.level}: an arcane defender joins the Hold.`});
    }
  }
  updateWizardAcademies(dt){
    for(const b of this.world.buildings){
      if(b.type!=='academy'||!b.complete)continue;
      this.syncAcademyWizards(b);
    }
    for(const w of this.wizardDefenders){
      const academy=this.world.buildings.find(b=>b.id===w.academyId&&b.health>0);
      if(!academy)continue;
      w.attackClock-=dt;w.actionTime=Math.max(0,(w.actionTime||0)-dt);if(w.actionTime<=0)w.action='idle';
      const target=this.nearestEnemy(w,430+academy.level*35);
      if(target){
        const d=Math.hypot(target.x-w.x,target.y-w.y);
        w.facingX=target.x-w.x;w.facingY=target.y-w.y;
        if(d>240){
          const dx=(target.x-w.x)/d,dy=(target.y-w.y)/d;
          w.x+=dx*42*dt;w.y+=dy*42*dt;
        }
        if(w.attackClock<=0){
          w.attackClock=Math.max(.75,1.65-(academy.level-1)*.28);
          w.action='attack';w.actionTime=.58;
          const dx=(target.x-w.x)/(d||1),dy=(target.y-w.y)/(d||1);
          this.arcaneBolts.push({x:w.x,y:w.y,vx:dx*360,vy:dy*360,life:1.5,damage:18+academy.level*6,radius:7});
        }
      }else{
        const ang=((Number(String(w.id).charCodeAt(0))||1)%10)/10*Math.PI*2;
        const tx=academy.x+Math.cos(ang)*92,ty=academy.y+Math.sin(ang)*70;
        const d=Math.hypot(tx-w.x,ty-w.y);
        if(d>8){w.x+=(tx-w.x)/d*28*dt;w.y+=(ty-w.y)/d*28*dt}
      }
    }
    for(const p of this.defenderBolts){
      c.save();c.strokeStyle='#d4c2a1';c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);c.stroke();c.restore();
    }
    for(const p of this.arcaneBolts){
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      for(const e of this.waves.enemies){
        if(Math.hypot(p.x-e.x,p.y-e.y)<p.radius+e.radius){
          this.damageEnemy(e,p.damage,'fire');e.flash=.1;p.life=0;this.spawnBlood(e.x,e.y,2,false);this.impactFX.push({x:e.x,y:e.y,life:.32,maxLife:.32,type:'arcane'});
          if(e.health<=0)this.waves.kill(e);break;
        }
      }
    }
    this.arcaneBolts=this.arcaneBolts.filter(p=>p.life>0);
  }

  syncDefenders(building,kind){
    if(!building.complete)return;
    const desired=Math.max(1,Math.min(3,building.level));
    let count=this.settlementDefenders.filter(d=>d.buildingId===building.id).length;
    while(count<desired){
      const i=count,ang=(i/Math.max(1,desired))*Math.PI*2;
      this.settlementDefenders.push({
        id:Math.random().toString(36),buildingId:building.id,kind,
        x:building.x+Math.cos(ang)*72,y:building.y+Math.sin(ang)*58,
        facingX:1,facingY:0,attackClock:.3+i*.15,action:'idle',actionTime:0
      });
      count++;
      this.bus.emit('notice',{type:'growth',text:`${CONFIG.build[building.type].name} T${building.level}: ${kind} defender assigned.`});
    }
  }
  updateMilitaryBuildings(dt){
    for(const b of this.world.buildings){
      if(!b.complete)continue;
      if(b.type==='barracks')this.syncDefenders(b,'swordsman');
      if(b.type==='archery')this.syncDefenders(b,'archer');
      if(b.type==='stables')this.syncDefenders(b,'knight');
    }
    for(const d of this.settlementDefenders){
      const home=this.world.buildings.find(b=>b.id===d.buildingId&&b.health>0);
      if(!home)continue;
      d.attackClock-=dt;d.actionTime=Math.max(0,(d.actionTime||0)-dt);if(d.actionTime<=0)d.action='idle';
      const isArcher=d.kind==='archer';
      const range=isArcher?330:(d.kind==='knight'?70:58);
      const target=this.nearestEnemy(d,isArcher?390:240);
      if(target){
        const dd=Math.hypot(target.x-d.x,target.y-d.y)||1;
        d.facingX=target.x-d.x;d.facingY=target.y-d.y;
        if(dd>range){
          const sp=d.kind==='knight'?92:58;
          d.x+=(target.x-d.x)/dd*sp*dt;d.y+=(target.y-d.y)/dd*sp*dt;
        }else if(d.attackClock<=0){
          d.action='attack';d.actionTime=d.kind==='archer'?1.0:.58;
          d.attackClock=d.kind==='archer'?1.55:(d.kind==='knight'?.85:1.05);
          if(isArcher){
            const vx=(target.x-d.x)/dd*480,vy=(target.y-d.y)/dd*480;
            this.defenderBolts.push({x:d.x,y:d.y-6,vx,vy,life:1.2,damage:18+home.level*4,radius:4});
          }else{
            this.damageEnemy(target,(d.kind==='knight'?24:18)+home.level*5,'physical');
            this.spawnBlood(target.x,target.y,3,false);
            if(target.health<=0)this.waves.kill(target);
          }
        }
      }else{
        const seed=(String(d.id).charCodeAt(0)||1)%12;
        const ang=seed/12*Math.PI*2;
        const tx=home.x+Math.cos(ang)*82,ty=home.y+Math.sin(ang)*62;
        const dd=Math.hypot(tx-d.x,ty-d.y);
        if(dd>10){d.x+=(tx-d.x)/dd*30*dt;d.y+=(ty-d.y)/dd*30*dt}
      }
    }
    for(const p of this.defenderBolts){
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      for(const e of this.waves.enemies){
        if(Math.hypot(p.x-e.x,p.y-e.y)<p.radius+e.radius){
          this.damageEnemy(e,p.damage,'physical');e.flash=.08;p.life=0;this.spawnBlood(e.x,e.y,2,false);
          if(e.health<=0)this.waves.kill(e);break;
        }
      }
    }
    this.defenderBolts=this.defenderBolts.filter(p=>p.life>0);
  }

  updateTowers(dt){
    for(const b of this.world.buildings){
      if(b.type!=='tower'||!b.complete||b.health<=0)continue;
      b.attackClock=(b.attackClock||0)-dt;
      const range=(CONFIG.build.tower.range||330)+(b.level-1)*55;
      const e=this.nearestEnemy(b,range);
      if(e&&b.attackClock<=0){
        const cooldown=Math.max(.85,(CONFIG.build.tower.cooldown||2.8)-(b.level-1)*.65);
        b.attackClock=cooldown;
        const d=Math.hypot(e.x-b.x,e.y-b.y)||1;
        this.towerBolts.push({x:b.x,y:b.y-36,vx:(e.x-b.x)/d*520,vy:(e.y-b.y)/d*520,life:1.2,damage:(CONFIG.build.tower.damage||28)+(b.level-1)*9,radius:5,tier:b.level});
      }
    }
    for(const p of this.towerBolts){
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      for(const e of this.waves.enemies){
        if(Math.hypot(p.x-e.x,p.y-e.y)<p.radius+e.radius){
          this.damageEnemy(e,p.damage,'physical');e.flash=.10;p.life=0;this.spawnBlood(e.x,e.y,3,false);this.impactFX.push({x:e.x,y:e.y,life:.24,maxLife:.24,type:'tower'});
          if(e.health<=0)this.waves.kill(e);break;
        }
      }
    }
    this.towerBolts=this.towerBolts.filter(p=>p.life>0);
  }

  updateHall(dt){
    this.hall.attackClock-=dt;
    const tier=Math.max(1,this.state.holdLevel||1);
    const range=250+Math.min(120,(tier-1)*28);
    const cooldown=Math.max(1.0,2.45-(tier-1)*.40);
    if(this.hall.attackClock<=0&&this.waves.enemies.length){
      const e=this.nearestEnemy(this.hall,range);
      if(e){
        const d=Math.hypot(e.x-this.hall.x,e.y-this.hall.y)||1;
        this.hall.attackClock=cooldown;
        this.towerBolts.push({
          x:this.hall.x,y:this.hall.y-48,
          vx:(e.x-this.hall.x)/d*430,vy:(e.y-this.hall.y+48)/d*430,
          life:1.35,damage:10+tier*3,radius:4,tier:Math.min(3,tier),
          source:'hold'
        });
      }
    }
  }
  pickups(){
    for(const d of [...this.world.drops]){
      if(dist(d,this.player)>=28)continue;
      if(d.type==='gold'){this.state.bank.gold+=d.amount;this.state.totalGold+=d.amount}
      else if(d.type==='essence')this.state.bank.essence+=d.amount;
      else if(d.type==='iron')this.state.bank.iron+=d.amount;
      else if(d.type==='gemstone')this.state.bank.gems+=d.amount;
      d.life=0;
      const pretty={gold:'Gold',essence:'Essence',iron:'Iron Ore',gemstone:'Gemstone'}[d.type]||d.type;
      this.bus.emit('notice',{type:'growth',text:`Picked up ${d.amount} ${pretty}.`});
    }
  }
  nearestEnemy(obj,range=9999){let best=null,bd=range;for(const e of this.waves.enemies){const d=dist(obj,e);if(d<bd){best=e;bd=d}}return best}
  gainXP(n){
    this.player.xp+=n;let need=100+(this.player.level-1)*55;
    while(this.player.xp>=need){this.player.xp-=need;this.player.level++;this.pendingLevels++;this.bus.emit('notice',{type:'growth',text:`${this.player.name} reached Level ${this.player.level}. Choose an ascension.`});this.broadcast('growth',`${this.player.name} reached Level ${this.player.level} in the First Hold.`);need=100+(this.player.level-1)*55} if(this.pendingLevels>0)this.openLevelUp();
  }
  openLevelUp(){
    const el=document.getElementById('levelup');if(!el)return;this.paused=true;el.hidden=false;
  }
  chooseLevelUp(type){
    if(type==='power')this.player.damage+=6;
    if(type==='vitality'){this.player.maxHealth+=24;this.player.health=Math.min(this.player.maxHealth,this.player.health+24)}
    if(type==='haste'){this.player.castRate*=1.10;this.player.speed+=8}
    this.pendingLevels=Math.max(0,this.pendingLevels-1);
    this.bus.emit('notice',{type:'growth',text:`Ascension chosen: ${type.toUpperCase()}.`});
    if(this.pendingLevels<=0){this.paused=false;document.getElementById('levelup').hidden=true}
  }
  buyPlayerUpgrade(type){
    const c=CONFIG.upgrades[type],b=this.state.bank;if(b.gold<c.gold||b.essence<c.essence){this.bus.emit('notice',{type:'growth',text:'The Realm lacks Gold or Essence for that training.'});return}
    b.gold-=c.gold;b.essence-=c.essence;this.state.progress.invested=true;this.state.upgrades[type]++;
    if(type==='power')this.player.damage+=6;
    if(type==='vitality'){this.player.maxHealth+=25;this.player.health+=25}
    if(type==='speed')this.player.speed+=18;
    this.bus.emit('notice',{type:'growth',text:`${type[0].toUpperCase()+type.slice(1)} advanced to Tier ${this.state.upgrades[type]}.`});
  }
  broadcast(type,text){
    try{parent.postMessage({type:'DRAGON_REALM_EVENT',event:{type:type==='growth'?'character':type,tone:type==='combat'?'crimson':type==='build'?'gold':type==='growth'?'violet':'blue',text}},location.origin)}catch{}
  }
  updateProgress(){
    const p=this.state.progress;
    const order=['gather','build','survive','invest'];
    const done={gather:p.gathered,build:p.built,survive:p.survived,invest:p.invested};
    let active=order.find(k=>!done[k])||'invest';

    for(const k of order){
      const el=document.querySelector(`[data-progress-step="${k}"]`);
      if(!el) continue;
      el.classList.toggle('is-done',!!done[k]);
      el.classList.toggle('is-active',k===active&&!done[k]);
    }

    const text={
      gather:'Gather Wood or Stone with E, then return to the Hold to deposit it.',
      build:'Use 1, 2 or 3 to choose a structure, then click near the Hold to place it.',
      survive:'Prepare for the next incursion and keep the Hold alive until every enemy is defeated.',
      invest:'Spend your Gold and Essence on a wizard upgrade or improve a nearby structure with U.'
    };
    const box=document.getElementById('progressSummary');
    if(box) box.textContent=text[active]||'Keep expanding the Hold and surviving stronger waves.';
  }
  gameOver(reason='hold'){
    if(this._gameOverCommitted)return;
    this._gameOverCommitted=true;
    this.running=false;this.state.running=false;const earnedXP=this.saveRecord();
    document.getElementById('endTime').textContent=this.hud.time(this.state.survival);
    document.getElementById('endWave').textContent=this.waves.wave;
    document.getElementById('endKills').textContent=this.waves.totalKills;
    document.getElementById('endGold').textContent=this.state.totalGold;
    const xp=document.getElementById('endAccountXP');if(xp)xp.textContent=`+${earnedXP}`;
    const title=document.getElementById('endReason');if(title)title.textContent=reason==='player'?'THE FOUNDER HAS FALLEN':'THE HOLD HAS FALLEN';
    document.getElementById('gameover').hidden=false;
    this.broadcast('combat',`${reason==='player'?this.player.name+' fell':'The First Hold fell'} on Wave ${this.waves.wave} after ${this.hud.time(this.state.survival)}.`);
  }
  screenToWorld(sx,sy){const d=this.dpr||1,scale=d*(this.worldZoom||1);return{x:this.camera.x+(sx*d-this.canvas.width/2)/scale,y:this.camera.y+(sy*d-this.canvas.height/2)/scale}}
  worldToScreen(x,y){const d=this.dpr||1,scale=d*(this.worldZoom||1);return{x:((x-this.camera.x)*scale+this.canvas.width/2)/d,y:((y-this.camera.y)*scale+this.canvas.height/2)/d}}
  draw(){
    const c=this.ctx,dpr=this.dpr||1,zoom=this.worldZoom||1,w=this.canvas.width,h=this.canvas.height;c.clearRect(0,0,w,h);
    c.fillStyle=COLORS.ground;c.fillRect(0,0,w,h);
    const worldScale=dpr*zoom;
    c.save();c.translate(w/2-this.camera.x*worldScale,h/2-this.camera.y*worldScale);c.scale(worldScale,worldScale);
    this.drawGround(c);this.drawBlood(c);this.drawWorldProps(c);this.drawResources(c);this.drawParticles(c);this.drawDrops(c);this.drawFarmPlots(c);this.drawBuildings(c);this.drawHearth(c);this.drawCitizens(c);this.drawSettlementWorkers(c);this.drawMilitaryDefenders(c);this.drawWizardDefenders(c);this.drawHall(c);this.drawBolts(c);this.drawDefenseProjectiles(c);this.drawEnemies(c);this.drawPlayer(c);this.drawForegroundCanopies(c);this.drawBuildGhost(c);if(this.debugCollision)this.drawCollisionDebug(c);
    c.restore();this.drawVignette(c,w,h);
  }

  updateHearth(dt){
    const h=this.hearth;if(!h)return;
    if(h.lit){
      h.fuel=Math.max(0,h.fuel-dt*.72);
      if(h.fuel<=0){h.lit=false;h.cooking=null;this.bus.emit('notice',{type:'realm',text:'The First Hold hearth has gone cold.'});}
    }
    if(h.lit&&h.cooking){
      h.cooking.time-=dt;
      if(h.cooking.time<=0){
        h.cooking=null;h.cooked++;this.bus.emit('notice',{type:'growth',text:'A hot camp meal is ready at the hearth.'});
      }
    }
  }

  drawHearth(c){
    const h=this.hearth;if(!h)return;
    // Outdoor cooking ring. Uses the project's existing authored fire FX when lit.
    c.save();
    c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(h.x,h.y+5,28,9,0,0,Math.PI*2);c.fill();
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9;c.fillStyle=i%2?'#756b61':'#918376';
      c.beginPath();c.ellipse(h.x+Math.cos(a)*18,h.y+Math.sin(a)*8,5,3.5,a,0,Math.PI*2);c.fill();
    }
    // crossed logs
    c.strokeStyle='#6f4b31';c.lineWidth=5;c.beginPath();c.moveTo(h.x-13,h.y+4);c.lineTo(h.x+13,h.y-4);c.moveTo(h.x-13,h.y-4);c.lineTo(h.x+13,h.y+4);c.stroke();
    if(h.lit){
      const img=this.images.fire;
      if(img?.complete&&img.naturalWidth){
        const fw=32,fh=32,cols=Math.max(1,Math.floor(img.naturalWidth/fw));
        const frame=Math.floor(performance.now()/90)%cols;
        c.imageSmoothingEnabled=false;c.drawImage(img,frame*fw,0,fw,fh,h.x-24,h.y-43,48,48);
      }else{
        c.fillStyle='#d88d35';c.beginPath();c.arc(h.x,h.y-9,11,0,Math.PI*2);c.fill();
      }
    }
    if(dist(this.player,h)<125){
      c.textAlign='center';c.font='700 8px Cinzel';c.fillStyle='#e2c88f';
      const status=!h.lit?'COLD — BRING WOOD':h.cooking?`${h.cooking.name} · ${Math.ceil(h.cooking.time)}s`:h.cooked?`MEAL READY · E TO EAT`:`HEARTH · FUEL ${Math.ceil(h.fuel)}`;
      c.fillText(status,h.x,h.y-52);
      c.font='600 6px Cinzel';c.fillStyle='#a9988b';c.fillText('E · TEND / COOK',h.x,h.y-43);
    }
    c.restore();
  }

  drawCollisionDebug(c){
    c.save();c.lineWidth=1.5;c.font='700 7px monospace';c.textAlign='center';

    const ellipse=(x,y,rx,ry,label,stroke,fill='rgba(0,0,0,0)')=>{
      c.setLineDash([5,3]);c.strokeStyle=stroke;c.fillStyle=fill;
      c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();
      c.setLineDash([]);c.fillStyle=stroke;c.fillText(label,x,y-ry-3);
      // Ground/depth anchor.
      c.fillRect(x-2,y-2,4,4);
      c.beginPath();c.moveTo(x-7,y);c.lineTo(x+7,y);c.moveTo(x,y-7);c.lineTo(x,y+7);c.stroke();
    };
    const circle=(x,y,r,label,stroke)=>ellipse(x,y,r,r,label,stroke,'rgba(0,0,0,.04)');

    // Static blocking footprints: castle, tree trunks, ores, buildings, wall posts.
    for(const f of this.getStructureFootprints()){
      const col=f.type==='tree'?'rgba(92,232,129,.96)':
        f.type==='hold'?'rgba(255,205,72,.98)':
        f.type==='wall'?'rgba(244,155,73,.96)':'rgba(102,191,255,.96)';
      if(f.shape==='rect'){
        c.setLineDash([5,3]);c.strokeStyle=col;c.fillStyle='rgba(255,255,255,.025)';
        c.fillRect(f.x-f.rx,f.y-f.ry,f.rx*2,f.ry*2);c.strokeRect(f.x-f.rx,f.y-f.ry,f.rx*2,f.ry*2);c.setLineDash([]);
        c.fillStyle=col;c.fillText(`HOLD ${Math.round(f.rx*2)}x${Math.round(f.ry*2)}`,f.x,f.y-f.ry-3);
        c.fillRect(f.x-2,f.y-2,4,4);
      }else ellipse(f.x,f.y,f.rx,f.ry,`${f.type.toUpperCase()} ${Math.round(f.rx)}x${Math.round(f.ry)}`,col,'rgba(255,255,255,.025)');
    }

    // Player physical body.
    circle(this.player.x,this.player.y,this.player.radius||8,'PLAYER', 'rgba(255,91,145,.98)');

    // Enemy body / melee contact radii.
    for(const e of this.waves.enemies){
      circle(e.x,e.y,e.radius||10,`ENEMY ${Math.round(e.radius||10)}`,'rgba(255,88,88,.92)');
    }

    // Named citizens/workers. These are agent bodies even where hard blocking is intentionally light.
    const seen=new Set();
    for(const a of [...(this.world.settlement?.population||[]),...(this.world.workers||[])]){
      if(!a||seen.has(a.id))continue;seen.add(a.id);
      circle(a.x,a.y,7,`${(a.job||a.role||'CITIZEN').toUpperCase()} BODY`,'rgba(188,129,255,.88)');
    }

    // Military/wizard defender bodies.
    for(const a of (this.settlementDefenders||[]))circle(a.x,a.y,a.radius||8,'DEFENDER','rgba(83,224,224,.88)');
    for(const a of (this.wizardDefenders||[]))circle(a.x,a.y,a.radius||8,'WIZARD','rgba(176,116,255,.92)');

    // Projectiles: hit circles + travel vectors.
    const shots=[...(this.bolts||[]),...(this.towerBolts||[]),...(this.arcaneBolts||[]),...(this.defenderBolts||[])];
    c.setLineDash([2,2]);
    for(const b of shots){
      circle(b.x,b.y,b.radius||3,'','rgba(255,245,154,.82)');
      if(Number.isFinite(b.vx)&&Number.isFinite(b.vy)){
        const m=Math.hypot(b.vx,b.vy)||1;c.strokeStyle='rgba(255,245,154,.45)';
        c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x+b.vx/m*22,b.y+b.vy/m*22);c.stroke();
      }
    }
    c.setLineDash([]);

    // Build frontier around the Hold: useful for understanding why placement is accepted/rejected.
    c.strokeStyle='rgba(255,255,255,.30)';c.setLineDash([10,7]);c.beginPath();c.arc(this.hall.x,this.hall.y,520,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.fillStyle='rgba(255,255,255,.58)';c.fillText('BUILD FRONTIER',this.hall.x,this.hall.y-524);

    // World boundary.
    c.strokeStyle='rgba(255,255,255,.42)';c.strokeRect(0,0,CONFIG.world.width,CONFIG.world.height);

    // Legend follows camera in world space.
    const lx=this.camera.x-315/(this.worldZoom||1),ly=this.camera.y-185/(this.worldZoom||1);
    c.textAlign='left';c.font='700 8px monospace';c.fillStyle='rgba(5,7,8,.78)';c.fillRect(lx,ly,196,78);
    c.fillStyle='#f1e8d4';c.fillText('F3 WORLD DEBUG',lx+8,ly+13);
    c.fillStyle='rgba(255,205,72,.98)';c.fillText('GOLD = HOLD',lx+8,ly+27);
    c.fillStyle='rgba(92,232,129,.96)';c.fillText('GREEN = TREE TRUNK',lx+8,ly+39);
    c.fillStyle='rgba(102,191,255,.96)';c.fillText('BLUE = STRUCTURE / ORE',lx+8,ly+51);
    c.fillStyle='rgba(255,91,145,.98)';c.fillText('PINK/RED = PLAYER / ENEMY',lx+8,ly+63);
    c.fillStyle='rgba(188,129,255,.88)';c.fillText('PURPLE = CITIZEN / WORKER',lx+8,ly+75);
    c.restore();
  }

  drawGridFrame(c,img,x,y,cellW,cellH,frame=0,row=0,scale=1,flip=false){
    if(!img?.complete||!img.naturalWidth)return false;
    const cols=Math.max(1,Math.floor(img.naturalWidth/cellW));
    const rows=Math.max(1,Math.floor(img.naturalHeight/cellH));
    const f=((frame%cols)+cols)%cols;
    const r=Math.max(0,Math.min(rows-1,row));
    c.save();
    c.translate(x,y);
    if(flip)c.scale(-1,1);
    c.imageSmoothingEnabled=false;
    c.drawImage(img,f*cellW,r*cellH,cellW,cellH,-cellW*scale/2,-cellH*scale*.78,cellW*scale,cellH*scale);
    c.restore();
    return true;
  }

  drawStripFrame(c,img,x,y,frameW,frameH,frame=0,scale=1){
    if(!img?.complete||!img.naturalWidth)return false;
    const cols=Math.max(1,Math.floor(img.naturalWidth/frameW));
    const f=((frame%cols)+cols)%cols;
    c.save();
    c.translate(x,y);
    c.imageSmoothingEnabled=false;
    c.drawImage(img,f*frameW,0,frameW,frameH,-frameW*scale/2,-frameH*scale*.72,frameW*scale,frameH*scale);
    c.restore();
    return true;
  }

  drawWholeImage(c,img,x,y,targetH,flip=false,anchor=.82){
    if(!img?.complete||!img.naturalWidth)return false;
    const scale=targetH/img.naturalHeight;
    const w=img.naturalWidth*scale;
    const h=targetH;
    c.save();
    c.translate(x,y);
    if(flip)c.scale(-1,1);
    c.imageSmoothingEnabled=false;
    c.drawImage(img,-w/2,-h*anchor,w,h);
    c.restore();
    return true;
  }

  drawGround(c){
    c.fillStyle='#142018';c.fillRect(0,0,CONFIG.world.width,CONFIG.world.height);

    // Broad, flat top-down terrain language: no perspective grid fighting the pixel art.
    const glow=c.createRadialGradient(this.hall.x,this.hall.y,40,this.hall.x,this.hall.y,520);
    glow.addColorStop(0,'rgba(75,78,48,.16)');glow.addColorStop(.55,'rgba(43,54,35,.10)');glow.addColorStop(1,'rgba(20,32,24,0)');
    c.fillStyle=glow;c.fillRect(this.hall.x-540,this.hall.y-540,1080,1080);

    // Worn settlement paths sit flat on the ground rather than pretending to be a 3D grid.
    c.save();c.strokeStyle='rgba(99,82,58,.10)';c.lineWidth=42;c.lineCap='round';
    for(const [x,y] of [[this.hall.x+520,this.hall.y],[this.hall.x-520,this.hall.y],[this.hall.x,this.hall.y+420],[this.hall.x,this.hall.y-420]]){
      c.beginPath();c.moveTo(this.hall.x,this.hall.y);c.lineTo(x,y);c.stroke();
    }
    c.restore();
  }
  drawResources(c){
    const trees=[this.images.treeOak,this.images.treeHickory,this.images.treePine,this.images.treeWillow,this.images.treeBirch];
    const nodes=this.world.nodes.filter(n=>!n.dead).slice().sort((a,b)=>a.y-b.y);
    for(const n of nodes){
      const hit=n.hitAnim>0;
      const frame=hit?Math.min(2,Math.floor((.32-n.hitAnim)/.106)):0;
      if(n.type==='wood'){
        const img=trees[n.variant%trees.length];
        if(img?.complete&&img.naturalWidth){
          const fw=img.naturalWidth/3,fh=img.naturalHeight/2,row=n.variant%2;
          const targetH=86+(n.variant%3)*12,scale=targetH/fh;
          // Shadow belongs directly beneath the trunk/base, not offset far away.
          c.save();c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(n.x,n.y+4,18+targetH*.08,7+targetH*.025,0,0,Math.PI*2);c.fill();c.restore();
          c.save();c.translate(n.x,n.y);c.imageSmoothingEnabled=false;
          c.drawImage(img,frame*fw,row*fh,fw,fh,-fw*scale/2,-fh*scale*.88,fw*scale,fh*scale);c.restore();
        }
      }else{
        const img=this.images.miningNodes;if(!img?.complete||!img.naturalWidth)continue;

        // REAL ATLAS LAYOUT:
        // the ore bodies are 8x8 sprites, spaced in 16px columns.
        // Each vertical column contains multiple depletion/damage stages.
        // 46D/46E incorrectly sampled 24x24 blocks, which literally captured
        // three ore stages stacked on top of one another.
        const fw=8,fh=8;
        const atlas={
          stone:{x:40,scale:2.35},
          gemstone:{x:56,scale:2.55},
          iron:{x:72,scale:2.45},
          goldore:{x:88,scale:2.55}
        };
        const cell=atlas[n.type]||atlas.stone;

        // Five visible mine states live vertically from y=24 through y=56.
        // As the node is depleted, it visibly breaks down instead of staying static.
        const ratio=Math.max(0,Math.min(1,n.remaining/Math.max(1,n.max)));
        const depletionStage=Math.min(4,Math.floor((1-ratio)*5));
        const sx=cell.x;
        const sy=24+depletionStage*8;

        c.save();
        c.fillStyle='rgba(0,0,0,.20)';
        c.beginPath();c.ellipse(n.x,n.y+3,9,3.5,0,0,Math.PI*2);c.fill();
        c.restore();

        c.save();c.translate(n.x,n.y);c.imageSmoothingEnabled=false;
        c.drawImage(img,sx,sy,fw,fh,-fw*cell.scale/2,-fh*cell.scale*.86,fw*cell.scale,fh*cell.scale);
        c.restore();

        if(n.type==='goldore'){
          const glow=c.createRadialGradient(n.x,n.y-8,1,n.x,n.y-8,24);
          glow.addColorStop(0,'rgba(238,190,61,.20)');glow.addColorStop(1,'rgba(238,190,61,0)');
          c.fillStyle=glow;c.beginPath();c.arc(n.x,n.y-8,24,0,Math.PI*2);c.fill();
        }
        if(n.type==='gemstone'){
          const glow=c.createRadialGradient(n.x,n.y-8,1,n.x,n.y-8,22);
          glow.addColorStop(0,'rgba(190,208,234,.19)');glow.addColorStop(1,'rgba(190,208,234,0)');
          c.fillStyle=glow;c.beginPath();c.arc(n.x,n.y-8,22,0,Math.PI*2);c.fill();
        }
      }
    }
  }

  drawForegroundCanopies(c){
    const img=this.images.tree;
    if(!img?.complete||!img.naturalWidth)return;
    const actors=[this.player,...(this.waves?.enemies||[]),...(this.settlementWorkers||[])].filter(Boolean);
    for(const n of (this.world?.nodes||[])){
      if(n.dead||n.type!=='wood')continue;
      // If an actor's feet are above/behind this trunk and horizontally beneath the canopy,
      // redraw the canopy over that actor. The trunk remains in the normal world pass.
      const covered=actors.some(a=>a.y<n.y+5 && a.y>n.y-92 && Math.abs(a.x-n.x)<42);
      if(!covered)continue;
      c.save();c.globalAlpha=.995;c.imageSmoothingEnabled=false;
      // Use the same authored tree frame, but clip to upper ~78% so the trunk/contact area is not doubled.
      const fw=32,fh=48,scale=2.55;
      c.beginPath();c.rect(n.x-fw*scale/2-2,n.y-fh*scale*.92-2,fw*scale+4,fh*scale*.70);c.clip();
      c.drawImage(img,0,0,fw,fh,n.x-fw*scale/2,n.y-fh*scale*.82,fw*scale,fh*scale);
      c.restore();
    }
  }

  drawParticles(c){
    for(const p of this.world.particles){
      const alpha=Math.max(0,p.life/(p.maxLife||1));
      c.globalAlpha=alpha;
      c.fillStyle=p.color;
      c.beginPath();c.arc(p.x,p.y,p.size,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;

    for(const f of this.world.floaters){
      const alpha=Math.max(0,f.life/(f.maxLife||1));
      c.globalAlpha=alpha;
      c.fillStyle=f.type==='wood'?'#b79a69':'#b2b4ae';
      c.font='700 9px Cinzel';
      c.textAlign='center';
      c.fillText(f.text,f.x,f.y);
    }
    c.globalAlpha=1;
  }


  drawStructureDamageFX(c,s){
    if(!s)return;
    const max=s.maxHp||s.hpMax||0,hp=s.hp??max;
    if(!max||hp>=max)return;
    const r=Math.max(0,Math.min(1,hp/max));
    c.save();
    // Cheap procedural smoke/fire: no extra texture memory and only appears on damaged structures.
    if(r<.70){
      const t=performance.now()*.001;
      c.globalAlpha=.18+(1-r)*.22;
      c.fillStyle='#9b9289';
      for(let i=0;i<3;i++){
        const yy=s.y-28-i*10-((t*10+i*7)%8);
        c.beginPath();c.arc(s.x+10+i*5,yy,5+i*2,0,Math.PI*2);c.fill();
      }
    }
    if(r<.38){
      c.globalAlpha=.82;c.fillStyle='#d79a42';
      c.beginPath();c.moveTo(s.x-7,s.y+5);c.lineTo(s.x,s.y-18);c.lineTo(s.x+7,s.y+5);c.fill();
      c.fillStyle='#7f2d22';
      c.beginPath();c.moveTo(s.x-4,s.y+5);c.lineTo(s.x,s.y-9);c.lineTo(s.x+4,s.y+5);c.fill();
    }
    c.restore();
  }

  drawBuildingAtlas(c,img,x,y,base,stage=3,tier=1,targetH=110){
    if(!img?.complete||!img.naturalWidth)return false;
    // Pack math from the creator's own _Info.txt:
    // 7 states per color: pre-build, construction 1, construction 2, complete,
    // damaged 1, damaged 2, destroyed. Three color rows.
    // Each atlas cell is 2*base wide by 3*base high.
    const cellW=base*2, cellH=base*3;
    const groupWidth=cellW*7;
    const colorGroup=0; // red faction, first group
    const sx=colorGroup*groupWidth+Math.max(0,Math.min(6,stage))*cellW;
    const sy=0;
    const scale=targetH/cellH;
    c.save();
    c.imageSmoothingEnabled=false;
    c.drawImage(img,sx,sy,cellW,cellH,x-cellW*scale/2,y-cellH*scale*.72,cellW*scale,cellH*scale);
    c.restore();
    return true;
  }

  buildingStage(b){
    if(!b.complete){
      const p=b.construction||0;
      return p<.20?0:p<.58?1:2;
    }
    const hp=b.health/Math.max(1,b.maxHealth);
    if(hp<=0)return 6;
    if(hp<.34)return 5;
    if(hp<.67)return 4;
    return 3;
  }


  drawRotatedLinkTile(c,img,a,b,height=18){
    if(!img?.complete||!img.naturalWidth)return false;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
    c.save();c.translate((a.x+b.x)/2,(a.y+b.y)/2);c.rotate(ang);c.imageSmoothingEnabled=false;
    c.drawImage(img,-len/2,-height/2,len,height);c.restore();return true;
  }
  drawDamageFX(c,b){
    const hp=b.health/Math.max(1,b.maxHealth);
    if(hp>.58)return;
    const now=performance.now();
    if(hp<=.58){
      const smoke=this.images.smoke;if(smoke?.complete&&smoke.naturalWidth){
        const frame=Math.floor(now/100)%Math.max(1,Math.floor(smoke.naturalWidth/32));
        c.save();c.globalAlpha=hp<.28?.82:.48;c.imageSmoothingEnabled=false;
        c.drawImage(smoke,frame*32,0,32,48,b.x-24,b.y-b.size*.95,48,72);c.restore();
      }
    }
    if(hp<=.30){
      const fire=this.images.fire;if(fire?.complete&&fire.naturalWidth){
        const frame=Math.floor(now/100)%Math.max(1,Math.floor(fire.naturalWidth/32));
        c.save();c.imageSmoothingEnabled=false;
        c.drawImage(fire,frame*32,0,32,32,b.x-22,b.y-b.size*.55,44,44);c.restore();
      }
    }
  }
  drawFarmPlots(c){
    const plots=this.world?.settlement?.plots||[];
    for(const p of plots){
      c.save();c.translate(p.x,p.y);
      c.fillStyle='rgba(58,39,24,.72)';c.beginPath();c.ellipse(0,0,18,9,0,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(151,113,65,.50)';c.lineWidth=1;
      for(let y=-5;y<=5;y+=5){c.beginPath();c.moveTo(-14,y);c.lineTo(14,y);c.stroke()}
      const stalks=p.stage===0?1:p.stage===1?3:p.stage===2?5:7;
      c.strokeStyle='#829154';c.fillStyle=p.ready?'#d1aa4d':'#6f8848';
      for(let i=0;i<stalks;i++){
        const x=-10+(i%4)*6,y=3-Math.floor(i/4)*4;
        c.beginPath();c.moveTo(x,y);c.lineTo(x,y-7-p.stage*2);c.stroke();
        if(p.stage>=2){c.beginPath();c.arc(x+2,y-8-p.stage*2,2,0,Math.PI*2);c.fill()}
      }
      c.restore();
    }
  }

  drawCitizens(c){
    const s=this.world?.settlement;if(!s)return;
    const workplaceIds=new Set((this.world?.workers||[]).map(w=>w.id));
    for(const p of s.population){
      if(workplaceIds.has(p.id))continue;
      c.save();
      c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(p.x,p.y+2,8,3,0,0,Math.PI*2);c.fill();

      const img=p.job==='lumber'?this.images.workerAxe:p.job==='miner'?this.images.workerPickaxe:this.images.builder;
      const active=['logging','mining'].includes(p.state);
      if(img?.complete&&img.naturalWidth>=32){
        const cols=Math.max(1,Math.floor(img.naturalWidth/32));
        const frame=active?Math.floor(performance.now()/120)%cols:Math.floor(performance.now()/180+(p.seed||0))%cols;
        c.imageSmoothingEnabled=false;c.drawImage(img,frame*32,0,32,32,p.x-24,p.y-46,48,48);
      }else{
        c.fillStyle='#c4a47c';c.beginPath();c.arc(p.x,p.y-8,5,0,Math.PI*2);c.fill();
        c.fillStyle='#725344';c.fillRect(p.x-4,p.y-3,8,11);
      }

      if(p.carrying){c.fillStyle='#8b6b45';c.fillRect(p.x+7,p.y-8,8,7);c.strokeStyle='#c3a36d';c.strokeRect(p.x+7,p.y-8,8,7)}
      if(dist(this.player,p)<120){
        c.textAlign='center';c.font='700 7px Cinzel';c.fillStyle='#ead9c1';c.fillText((p.name||'CITIZEN').toUpperCase(),p.x,p.y-45);
        c.font='700 6px Cinzel';c.fillStyle='#9d8790';c.fillText(`LV ${p.level||1} · ${(p.job||'citizen').toUpperCase()} · ${p.trait||''}`,p.x,p.y-38);
      }
      if(p.state==='shelter'){c.textAlign='center';c.font='700 7px Cinzel';c.fillStyle='#d79a91';c.fillText('SHELTER',p.x,p.y-52)}
      c.restore();
    }
  }

  drawSettlementWorkers(c){
    for(const w of this.world?.workers||[]){
      const b=this.world.buildings.find(x=>x.id===w.buildingId);if(!b)continue;
      c.save();
      c.fillStyle='rgba(0,0,0,.24)';c.beginPath();c.ellipse(w.x,w.y+2,9,3.5,0,0,Math.PI*2);c.fill();

      let img=this.images.builder;
      if(w.job==='smith'||w.job==='fletcher')img=this.images.workerAxe;
      const cols=img?.naturalWidth?Math.max(1,Math.floor(img.naturalWidth/32)):1;
      const active=['working','build','repair','harvest','tending'].includes(w.state);
      const frame=active?Math.floor(performance.now()/125)%cols:Math.floor(performance.now()/180+(w.seed||0))%cols;
      if(img?.complete&&img.naturalWidth>=32){
        c.imageSmoothingEnabled=false;c.drawImage(img,frame*32,0,32,32,w.x-25,w.y-48,50,50);
      }else{
        c.fillStyle='#b58b63';c.beginPath();c.arc(w.x,w.y-8,6,0,Math.PI*2);c.fill();
        c.fillStyle='#6e4a38';c.fillRect(w.x-5,w.y-2,10,12);
      }

      if(w.carrying){c.fillStyle='#8b6b45';c.fillRect(w.x+8,w.y-8,8,7);c.strokeStyle='#c3a36d';c.strokeRect(w.x+8,w.y-8,8,7)}
      if((w.job==='smith'||w.job==='fletcher')&&w.state==='working'){
        c.fillStyle='#e5a84e';for(let i=0;i<3;i++)c.fillRect(w.x+10+i*3,w.y-14-i*3,2,2);
      }
      if(dist(this.player,w)<120){
        c.textAlign='center';c.font='700 7px Cinzel';c.fillStyle='#ead9c1';c.fillText((w.name||w.job||'WORKER').toUpperCase(),w.x,w.y-48);
        c.font='700 6px Cinzel';c.fillStyle='#9d8790';c.fillText(`LV ${w.level||1} · ${(w.job||'worker').toUpperCase()} · ${w.trait||''}`,w.x,w.y-41);
      }
      if(['build','repair','flee'].includes(w.state)){
        c.textAlign='center';c.font='700 7px Cinzel';c.fillStyle=w.state==='flee'?'#d79a91':'#d8c8b0';
        c.fillText(w.state==='build'?'BUILDING':w.state==='repair'?'REPAIRING':'FLEEING',w.x,w.y-56);
      }
      c.restore();
    }
  }

  drawBlood(c){
    for(const d of (this.bloodDecals||[])){
      c.save();c.globalAlpha=Math.min(.32,(d.life/8)*.32);c.fillStyle='#6e161d';
      c.beginPath();c.ellipse(d.x,d.y,d.r,d.r*.55,0,0,Math.PI*2);c.fill();c.restore();
    }
    for(const p of (this.bloodParticles||[])){
      c.save();c.globalAlpha=Math.max(0,p.life/Math.max(.001,p.maxLife));c.fillStyle='#9b2028';
      c.beginPath();c.arc(p.x,p.y,p.size,0,Math.PI*2);c.fill();c.restore();
    }
  }

  drawDefenseProjectiles(c){
    for(const p of (this.towerBolts||[])){
      if(p.source==='hold'){
        const len=16,mag=Math.hypot(p.vx,p.vy)||1,ux=p.vx/mag,uy=p.vy/mag;
        c.save();c.strokeStyle='#d8c6a1';c.lineWidth=2;
        c.beginPath();c.moveTo(p.x-ux*len*.5,p.y-uy*len*.5);c.lineTo(p.x+ux*len*.5,p.y+uy*len*.5);c.stroke();
        c.fillStyle='#a98a58';c.beginPath();c.arc(p.x+ux*8,p.y+uy*8,2,0,Math.PI*2);c.fill();c.restore();
      }else{
        c.fillStyle=p.tier>=3?'#cda96f':'#d7c6a4';c.beginPath();c.arc(p.x,p.y,p.radius,0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(220,200,160,.35)';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);c.stroke();
      }
    }
    for(const p of (this.defenderBolts||[])){
      c.save();c.strokeStyle='#d4c2a1';c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);c.stroke();c.restore();
    }
    for(const p of (this.arcaneBolts||[])){
      const glow=c.createRadialGradient(p.x,p.y,1,p.x,p.y,16);
      glow.addColorStop(0,'rgba(190,118,221,.5)');glow.addColorStop(1,'rgba(120,70,160,0)');
      c.fillStyle=glow;c.beginPath();c.arc(p.x,p.y,16,0,Math.PI*2);c.fill();
      c.fillStyle='#b787ce';c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();
    }
    for(const f of (this.impactFX||[])){
      c.save();c.globalAlpha=Math.max(0,f.life/Math.max(.001,f.maxLife));
      c.strokeStyle=f.type==='ward'?'#8568a8':f.type==='arcane'?'#b77fd4':'#d5b889';c.lineWidth=2;
      c.beginPath();c.arc(f.x,f.y,(1-f.life/f.maxLife)*18+3,0,Math.PI*2);c.stroke();c.restore();
    }
  }

  drawMilitaryDefenders(c){
    for(const d of this.settlementDefenders.slice().sort((a,b)=>a.y-b.y)){
      const ax=Math.abs(d.facingX||0),ay=Math.abs(d.facingY||0);
      let row=0;if(ay>ax)row=d.facingY<0?1:0;else row=d.facingX<0?3:2;
      const attacking=d.action==='attack';
      let img,cols=4,frame=0,scale=2.45;
      if(d.kind==='archer'){
        img=attacking?this.images.archerAttack:this.images.archerWalk;cols=attacking?12:4;
        frame=attacking?Math.min(cols-1,Math.floor((1-d.actionTime/1.0)*cols)):Math.floor(performance.now()/160)%4;
      }else if(d.kind==='knight'){
        img=attacking?this.images.stableKnightAttack:this.images.stableKnightWalk;cols=attacking?6:4;scale=2.65;
        frame=attacking?Math.min(5,Math.floor((1-d.actionTime/.58)*6)):Math.floor(performance.now()/145)%4;
      }else{
        img=attacking?this.images.swordsmanAttack:this.images.swordsmanWalk;cols=attacking?6:4;
        frame=attacking?Math.min(5,Math.floor((1-d.actionTime/.58)*6)):Math.floor(performance.now()/150)%4;
      }
      c.fillStyle='rgba(0,0,0,.20)';c.beginPath();c.ellipse(d.x,d.y+6,13,6,0,0,Math.PI*2);c.fill();
      this.drawGridFrame(c,img,d.x,d.y+4,32,32,frame,row,scale,false);
    }
  }

  drawWizardDefenders(c){
    for(const w of this.wizardDefenders){
      const academy=this.world.buildings.find(b=>b.id===w.academyId&&b.health>0);if(!academy)continue;
      const ax=Math.abs(w.facingX||0),ay=Math.abs(w.facingY||0);
      let row=0;if(ay>ax)row=w.facingY<0?1:0;else row=w.facingX<0?3:2;
      const attacking=w.action==='attack';
      const img=attacking?this.images.wizardAttack:this.images.wizardIdle;
      const cols=attacking?6:16;
      const frame=attacking?Math.min(5,Math.floor((1-w.actionTime/.58)*6)):Math.floor(performance.now()/200)%16;
      this.drawGridFrame(c,img,w.x,w.y,32,32,frame,row,2.6,false);
      c.fillStyle='#c8a8d5';c.font='700 6px Cinzel';c.textAlign='center';c.fillText('ACADEMY WIZARD',w.x,w.y-30);
    }
  }
  drawWorldProps(c){
    // Sparse decorative layer: enough life without turning 499 source props into a browser tax.
    const props=[this.images.forestProp1,this.images.forestProp2];
    const anchors=[[this.hall.x-180,this.hall.y+150],[this.hall.x+190,this.hall.y-130],[this.hall.x+220,this.hall.y+130]];
    anchors.forEach((a,i)=>{const im=props[i%props.length];if(im?.complete&&im.naturalWidth)this.drawWholeImage(c,im,a[0],a[1],50,false,.82)});
  }
  drawBuildingDecor(c,b){
    if(!b.complete)return;
    if(b.type==='academy'){
      const props=[this.images.academyProp1,this.images.academyProp2,this.images.academyProp3];
      const pts=[[-72,48],[74,42],[0,86]];
      props.forEach((im,i)=>{if(im?.complete&&im.naturalWidth)this.drawWholeImage(c,im,b.x+pts[i][0],b.y+pts[i][1],34,false,.82)});
    }else if(b.type==='tower'||b.type==='barracks'){
      const props=[this.images.castleProp1,this.images.castleProp2,this.images.castleProp3];
      const pts=[[-52,34],[50,38],[0,62]];
      props.forEach((im,i)=>{if(im?.complete&&im.naturalWidth)this.drawWholeImage(c,im,b.x+pts[i][0],b.y+pts[i][1],28,false,.82)});
    }
  }

  drawHall(c){
    const h=this.hall;
    c.fillStyle=COLORS.shadow;
    c.beginPath();c.ellipse(h.x,h.y+40,188,52,0,0,Math.PI*2);c.fill();
    this.drawBuildingAtlas(c,this.images.castle,h.x,h.y+84,64,3,1,430);
    c.fillStyle='#d8bc83';c.font='700 13px Cinzel';c.textAlign='center';
    c.fillText(`FIRST HOLD · T${this.state.holdLevel||1}`,h.x,h.y+214);
  }
  drawBuildings(c){
    this.world.removeDeadLinks?.();

    for(const l of this.world.links||[]){
      const a=this.world.buildings.find(b=>b.id===l.a),b=this.world.buildings.find(b=>b.id===l.b);
      if(!a||!b)continue;
      const tier=Math.min(a.level,b.level);
      if(tier>=3){
        c.save();c.lineCap='round';
        c.strokeStyle='rgba(151,112,185,.18)';c.lineWidth=16;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
        c.strokeStyle='#aa7ccc';c.lineWidth=4;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();
      }else{
        const img=tier>=2?this.images.wallStone:this.images.wallWood;
        if(!this.drawRotatedLinkTile(c,img,a,b,tier>=2?24:20)){
          c.strokeStyle=tier>=2?'#8b8580':'#80684b';c.lineWidth=tier>=2?10:7;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
        }
      }
    }

    for(const b of this.world.buildings){
      c.fillStyle=COLORS.shadow;
      c.beginPath();c.ellipse(b.x,b.y+5,b.size*.70,b.size*.28,0,0,Math.PI*2);c.fill();

      const stage=this.buildingStage(b);
      if(b.type==='house'){
        const s=1+(b.level-1)*.12;
        c.save();c.translate(b.x,b.y);c.scale(s,s);
        c.fillStyle='rgba(0,0,0,.24)';c.beginPath();c.ellipse(0,18,34,11,0,0,Math.PI*2);c.fill();
        c.fillStyle='#7a5a3d';c.fillRect(-24,-10,48,30);
        c.fillStyle='#4d2f2b';c.beginPath();c.moveTo(-31,-10);c.lineTo(0,-35);c.lineTo(31,-10);c.closePath();c.fill();
        c.fillStyle='#d0b77b';c.fillRect(-5,7,10,13);c.fillStyle='#a88752';c.fillRect(-17,-2,8,7);
        c.restore();
        if(!b.complete){c.fillStyle='rgba(222,195,126,.75)';c.font='700 8px Cinzel';c.textAlign='center';c.fillText(`BUILD ${Math.round((b.construction/b.buildTime)*100)}%`,b.x,b.y-43)}
        continue;
      }
      if(b.type==='wall'){
        c.fillStyle=b.level>=3?'#65506f':'#5c4936';
        c.fillRect(b.x-6,b.y-22,12,43);
        c.fillStyle=b.level>=3?'#a177b7':'#927453';
        c.beginPath();c.moveTo(b.x-8,b.y-22);c.lineTo(b.x,b.y-31);c.lineTo(b.x+8,b.y-22);c.closePath();c.fill();
      }else if(b.type==='workshop'){
        this.drawBuildingAtlas(c,this.images.blacksmith,b.x,b.y+31,32,stage,b.level,145);
        this.drawStructureDamageFX(c,b);
      }else if(b.type==='barracks'){
        this.drawBuildingAtlas(c,this.images.barracks,b.x,b.y+34,48,stage,b.level,172);
        this.drawStructureDamageFX(c,b);
      }else if(b.type==='archery'){
        this.drawBuildingAtlas(c,this.images.archery,b.x,b.y+34,48,stage,b.level,172);
        this.drawStructureDamageFX(c,b);
      }else if(b.type==='stables'){
        this.drawBuildingAtlas(c,this.images.stables,b.x,b.y+34,48,stage,b.level,176);
        this.drawStructureDamageFX(c,b);
      }else if(b.type==='farm'){
        this.drawBuildingAtlas(c,this.images.farm,b.x,b.y+28,32,stage,b.level,132);
        this.drawStructureDamageFX(c,b);
      }else if(b.type==='shrine'){
        if(!this.drawWholeImage(c,this.images.shrine,b.x,b.y+24,122,false,.82)){
          c.fillStyle=COLORS.shrine;c.beginPath();c.arc(b.x,b.y,b.size*.55,0,Math.PI*2);c.fill();
        }
        const glow=c.createRadialGradient(b.x,b.y,2,b.x,b.y,48);
        glow.addColorStop(0,'rgba(128,107,147,.22)');glow.addColorStop(1,'rgba(128,107,147,0)');
        c.fillStyle=glow;c.beginPath();c.arc(b.x,b.y,48,0,Math.PI*2);c.fill();
      }else if(b.type==='tower'){
        const h=b.complete?205:90+115*(b.construction||0);
        this.drawWholeImage(c,this.images.tower,b.x,b.y+46,h,false,.94);
      }else if(b.type==='academy'){
        if(b.complete&&this.images.spellCircle?.complete){
          const im=this.images.spellCircle;const frame=Math.floor(performance.now()/110)%Math.max(1,Math.floor(im.naturalWidth/64));
          c.save();c.globalAlpha=.45;c.imageSmoothingEnabled=false;c.drawImage(im,frame*64,0,64,64,b.x-64,b.y+35,128,128);c.restore();
        }
        const h=b.complete?250:110+140*(b.construction||0);
        c.save();c.globalAlpha=b.complete?1:.45+.55*(b.construction||0);this.drawWholeImage(c,this.images.academy,b.x,b.y+58,h,false,.93);c.restore();
      }
      if(!b.complete){
        c.fillStyle='rgba(10,8,10,.88)';c.fillRect(b.x-32,b.y+b.size*.72,64,5);
        c.fillStyle='#b59155';c.fillRect(b.x-32,b.y+b.size*.72,64*(b.construction||0),5);
      }

      c.fillStyle='#c9b7aa';c.font='700 9px Cinzel';c.textAlign='center';c.fillText(b.complete?`T${b.level}`:`${Math.floor((b.construction||0)*100)}%`,b.x,b.y+b.size+15);
      if(b.health<b.maxHealth){
        c.fillStyle='#15090b';c.fillRect(b.x-25,b.y-b.size-13,50,4);
        c.fillStyle='#96343d';c.fillRect(b.x-25,b.y-b.size-13,50*b.health/b.maxHealth,4);
      }
    }
  }
  drawEnemies(c){
    const frame=Math.floor(performance.now()/140)%4;
    const elementStyle={
      fire:{color:'#d86242',icon:'▲'},frost:{color:'#77b8d8',icon:'✦'},
      venom:{color:'#78a55c',icon:'◆'},arcane:{color:'#a27ac4',icon:'◇'}
    };
    for(const e of this.waves.enemies.slice().sort((a,b)=>a.y-b.y)){
      c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(e.x,e.y+6,e.elite?17:13,e.elite?8:6,0,0,Math.PI*2);c.fill();

      if(e.elite&&e.element){
        const es=elementStyle[e.element.id]||elementStyle.arcane;
        const pulse=1+Math.sin(performance.now()/170)*.08;
        c.save();c.globalAlpha=.55;c.strokeStyle=es.color;c.lineWidth=2;
        c.beginPath();c.ellipse(e.x,e.y+5,24*pulse,11*pulse,0,0,Math.PI*2);c.stroke();c.restore();
      }

      const img=e.elite?this.images.berserk:this.images.orc;
      const flip=e.x<this.hall.x;
      if(!this.drawGridFrame(c,img,e.x,e.y+5,32,32,frame,0,e.elite?2.9:2.55,flip)){
        c.fillStyle=e.flash?'#e49b98':COLORS.enemy;c.beginPath();c.arc(e.x,e.y,e.radius,0,Math.PI*2);c.fill();
      }

      if(e.elite){
        const es=elementStyle[e.element?.id]||elementStyle.arcane;
        c.textAlign='center';
        c.font='800 9px Cinzel';c.fillStyle='#ead9d1';c.fillText(e.name,e.x,e.y-58);
        c.font='800 7px Cinzel';c.fillStyle=es.color;c.fillText(`LV ${e.level}  ${es.icon} ${e.element.id.toUpperCase()}  ·  ${e.affix}`,e.x,e.y-47);
        c.fillStyle='rgba(20,7,9,.95)';c.fillRect(e.x-34,e.y-41,68,6);
        c.fillStyle='#b83f49';c.fillRect(e.x-33,e.y-40,66*Math.max(0,e.health/e.maxHealth),4);
        if(e.maxWard>0&&e.ward>0){c.fillStyle='#675083';c.fillRect(e.x-33,e.y-34,66*(e.ward/e.maxWard),2)}
      }else if(e.health<e.maxHealth){
        c.fillStyle='#18080a';c.fillRect(e.x-22,e.y-42,44,5);
        c.fillStyle='#b84249';c.fillRect(e.x-22,e.y-42,44*e.health/e.maxHealth,5);
      }
    }
  }
  drawPlayer(c){
    const p=this.player;

    if(p.dead){
      c.fillStyle='rgba(180,150,160,.25)';
      c.beginPath();c.arc(p.x,p.y,20,0,Math.PI*2);c.fill();
      c.fillStyle='#b99ea8';c.font='700 10px Cinzel';c.textAlign='center';
      c.fillText(`${Math.ceil(p.respawn)}s`,p.x,p.y+4);
      return;
    }

    // Tight ground-contact shadow. The actor is drawn immediately after it.
    c.fillStyle='rgba(0,0,0,.24)';
    c.beginPath();c.ellipse(p.x,p.y+1,15,4.5,0,0,Math.PI*2);c.fill();

    const moving=
      this.input.down('KeyW')||this.input.down('KeyA')||
      this.input.down('KeyS')||this.input.down('KeyD');

    const ax=Math.abs(p.facingX||0), ay=Math.abs(p.facingY||0);
    // Authored sheet direction order: RIGHT, LEFT, DOWN, UP.
    let row=0;
    if(ay>ax) row=p.facingY<0?3:2;
    else row=p.facingX<0?1:0;

    let img=p.level>=4?this.images.knight:this.images.worker;
    let frame=moving?Math.floor(performance.now()/135)%4:0;
    let scale=3.35;

    // Worker profession animations.
    if(p.level<4&&(p.action==='melee'||p.action==='chop'||p.action==='mine')){
      img=p.action==='mine'?this.images.workerPickaxe:this.images.workerAxe;
      const cols=6;
      frame=Math.max(0,Math.min(
        cols-1,
        Math.floor((1-(p.actionTime/Math.max(.001,p.actionDuration)))*cols)
      ));
      scale=3.45;
    }

    // Mounted Knight now uses the real authored Knight attack sheet.
    if(p.level>=4&&p.action==='melee'){
      img=this.images.knightAttack;
      const cols=6;
      frame=Math.max(0,Math.min(
        cols-1,
        Math.floor((1-(p.actionTime/Math.max(.001,p.actionDuration)))*cols)
      ));
      scale=3.60;
    }

    const rendered=this.drawGridFrame(
      c,img,p.x,p.y+5,32,32,frame,row,scale,false
    );

    // Strong diagnostic fallback: if an asset ever fails, never leave only a shadow.
    if(!rendered){
      c.fillStyle=COLORS.player;
      c.beginPath();c.arc(p.x,p.y,14,0,Math.PI*2);c.fill();
      c.fillStyle='#f0d6eb';c.font='800 8px Cinzel';c.textAlign='center';
      c.fillText('ACTOR ASSET',p.x,p.y-24);
    }

    // Clean classic top-down nameplate: name, then compact HP bar, both above actor.
    c.textAlign='center';
    c.fillStyle='#eadde2';
    c.font='800 9px Cinzel';
    c.fillText(p.name,p.x,p.y-78);

    c.fillStyle='rgba(16,7,9,.96)';
    c.fillRect(p.x-32,p.y-71,64,6);
    c.fillStyle='#a33b49';
    c.fillRect(p.x-31,p.y-70,62*Math.max(0,p.health/p.maxHealth),4);
  }

  drawBolts(c){
    for(const b of this.bolts){
      const glow=c.createRadialGradient(b.x,b.y,1,b.x,b.y,15);
      glow.addColorStop(0,'rgba(199,164,211,.32)');
      glow.addColorStop(.45,'rgba(182,139,199,.12)');
      glow.addColorStop(1,'rgba(182,139,199,0)');
      c.fillStyle=glow;c.beginPath();c.arc(b.x,b.y,15,0,Math.PI*2);c.fill();
      c.fillStyle=COLORS.bolt;c.beginPath();c.arc(b.x,b.y,b.radius*.7,0,Math.PI*2);c.fill();
    }
  }
  drawDrops(c){
    for(const d of this.world.drops){
      const pulse=1+Math.sin(performance.now()/160+d.x)*.08;
      let core='#b8934c',glow='rgba(184,147,76,.22)';
      if(d.type==='essence'){core='#8e6fa2';glow='rgba(142,111,162,.24)'}
      if(d.type==='iron'){core='#9a6b4e';glow='rgba(154,107,78,.22)'}
      if(d.type==='gemstone'){core='#d4e4f2';glow='rgba(198,220,239,.30)'}
      const gr=c.createRadialGradient(d.x,d.y,1,d.x,d.y,18*pulse);gr.addColorStop(0,glow);gr.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=gr;c.beginPath();c.arc(d.x,d.y,18*pulse,0,Math.PI*2);c.fill();
      c.fillStyle=core;
      if(d.type==='gemstone'){
        c.save();c.translate(d.x,d.y);c.rotate(Math.PI/4);c.fillRect(-6,-6,12,12);c.restore();
      }else{
        c.beginPath();c.arc(d.x,d.y,6,0,Math.PI*2);c.fill();
      }
    }
  }
  drawBuildGhost(c){
    if(!this.build.selected)return;const p=this.screenToWorld(this.input.mouse.x,this.input.mouse.y),def=CONFIG.build[this.build.selected],bad=this.world.collidesBuild(p.x,p.y,def.size)||Math.hypot(p.x-this.hall.x,p.y-this.hall.y)>520;
    c.fillStyle=bad?'rgba(185,72,79,.12)':'rgba(177,155,103,.10)';c.strokeStyle=bad?'#b9484f':'#b19b67';c.lineWidth=2;c.setLineDash([7,5]);c.beginPath();c.arc(p.x,p.y,def.size,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
  }
  drawVignette(c,w,h){const g=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.42)');c.fillStyle=g;c.fillRect(0,0,w,h)}
}