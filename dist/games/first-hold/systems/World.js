import {CONFIG} from '../data/config.js?v=46S';
const rand=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export class World{
  constructor(bus){
    this.bus=bus;
    this.nodes=[];this.forage=[];
    this.buildings=[];this.links=[];
    this.drops=[];this.particles=[];this.floaters=[];this.workers=[];this.farmClock=0;
    this.settlement={baseCapacity:3,population:[],plots:[],nextCitizen:1,food:0,workLog:[]};
    this.spawnResources();this.spawnForage();
  }
  spawnResources(){
    const hall=CONFIG.hall;
    const placeNode=(type,variant,count)=>{
      for(let i=0;i<count;i++){
        let p,tries=0;
        do{
          const ang=Math.random()*Math.PI*2,r=rand(260,1100);
          p={x:hall.x+Math.cos(ang)*r,y:hall.y+Math.sin(ang)*r};
          tries++;
        }while((p.x<90||p.y<90||p.x>CONFIG.world.width-90||p.y>CONFIG.world.height-90)&&tries<20);
        const max=type==='wood'?(3+Math.floor(Math.random()*5)):(4+Math.floor(Math.random()*5));
        this.nodes.push({
          id:crypto.randomUUID?.()||Math.random().toString(36),
          type,x:p.x,y:p.y,remaining:max,max,dead:false,respawn:0,
          variant:type==='wood'?Math.floor(Math.random()*5):variant,
          hitAnim:0
        });
      }
    };
    placeNode('wood',0,CONFIG.resources.treeCount);
    const total=CONFIG.resources.stoneCount;
    placeNode('stone',0,Math.round(total*.52));
    placeNode('iron',3,Math.round(total*.22));
    placeNode('goldore',6,Math.max(2,Math.round(total*.13)));
    placeNode('gemstone',1,Math.max(2,total-Math.round(total*.52)-Math.round(total*.22)-Math.max(2,Math.round(total*.13))));
  }
  spawnForage(){
    const hall=CONFIG.hall;
    for(let i=0;i<34;i++){
      const a=Math.random()*Math.PI*2,r=rand(220,1120);
      this.forage.push({id:Math.random().toString(36),type:Math.random()<.65?'mushroom':'berries',
        x:Math.max(60,Math.min(CONFIG.world.width-60,hall.x+Math.cos(a)*r)),
        y:Math.max(60,Math.min(CONFIG.world.height-60,hall.y+Math.sin(a)*r)),
        remaining:1+Math.floor(Math.random()*3),dead:false,respawn:0});
    }
  }
  nearestForage(player,range=54){
    let best=null,bd=range;
    for(const f of this.forage){if(f.dead)continue;const d=dist(player,f);if(d<bd){best=f;bd=d}}
    return best;
  }
  harvestForage(f){
    if(!f||f.dead)return 0;
    f.remaining--;if(f.remaining<=0){f.dead=true;f.respawn=75+Math.random()*90}
    this.floaters.push({x:f.x,y:f.y-20,text:'+1 FOOD',life:.65,maxLife:.65,type:'food'});
    return 1;
  }

  rollCitizenIdentity(){
    const first=['Mara','Toren','Edrin','Sela','Bran','Ilya','Nessa','Corin','Veya','Rook','Dara','Orin','Tessa','Galen','Mira','Joren','Anya','Bram','Lysa','Cael'];
    const last=['Vale','Thorne','Mere','Rowan','Dane','Voss','Hale','Fen','Kerr','Morrow','Reeve','Stone','Wren','Rell','Marden','Pell'];
    const traits=['Hardy','Quick','Patient','Keen-Eyed','Stoic','Strong','Careful','Restless','Lucky','Steady'];
    const aptitudes=['wood','stone','farming','crafting','combat','arcane'];
    return {
      name:`${first[Math.floor(Math.random()*first.length)]} ${last[Math.floor(Math.random()*last.length)]}`,
      trait:traits[Math.floor(Math.random()*traits.length)],
      aptitude:aptitudes[Math.floor(Math.random()*aptitudes.length)]
    };
  }
  createCitizen(x,y,state='idle'){
    const id=this.rollCitizenIdentity(),n=this.settlement.nextCitizen++;
    return {id:`citizen-${n}`,name:id.name,trait:id.trait,aptitude:id.aptitude,
      x,y,tx:x,ty:y,state,job:'citizen',workId:null,homeId:null,
      speed:38+Math.random()*9,clock:Math.random()*4,seed:Math.random()*20,
      health:50,maxHealth:50,experience:0,level:1,carrying:null,carryAmount:0,targetNodeId:null};
  }
  ensureInitialCitizens(hall){
    if(this.settlement.population.length)return;
    for(let i=0;i<this.settlement.baseCapacity;i++)
      this.settlement.population.push(this.createCitizen(hall.x-40+i*25,hall.y+65+i*4,'idle'));
  }
  housingCapacity(){
    let cap=this.settlement.baseCapacity;
    for(const b of this.buildings)if(b.complete&&b.type==='house')cap+=2+(b.level||1);
    return cap;
  }
  addCitizen(hall){
    if(this.settlement.population.length>=this.housingCapacity())return null;
    const c=this.createCitizen(hall.x,hall.y+85,'arriving');
    this.settlement.population.push(c);return c;
  }
  freeCitizen(preferred=null){
    const free=this.settlement.population.filter(c=>c.job==='citizen'&&c.health>0);
    if(!free.length)return null;
    if(preferred){
      const match=free.find(c=>c.aptitude===preferred);
      if(match)return match;
    }
    return free[0];
  }
  assignJob(c,job,workId=null){
    if(!c)return false;
    c.job=job;c.state='assigned';c.workId=workId;c.clock=0;c.targetNodeId=null;c.carrying=null;return true;
  }
  findHarvestNode(job,x,y,range=720){
    let best=null,bd=range;
    for(const n of this.nodes){
      if(n.dead)continue;
      const valid=job==='lumber'?n.type==='wood':n.type!=='wood';
      if(!valid)continue;
      const d=Math.hypot(n.x-x,n.y-y);
      if(d<bd){best=n;bd=d}
    }
    return best;
  }
  ensureFarmPlots(b){
    if(!b||b.type!=='farm')return [];
    let plots=this.settlement.plots.filter(p=>p.buildingId===b.id);
    const want=Math.min(8,3+(b.level||1)*2);
    while(plots.length<want){
      const i=plots.length,a=(i/want)*Math.PI*2+(b.decorSeed||0)*3;
      const r=66+(i%2)*26;
      const p={id:`${b.id}-plot-${i}`,buildingId:b.id,x:b.x+Math.cos(a)*r,y:b.y+Math.sin(a)*r*.68,
        stage:0,growth:Math.random()*5,ready:false};
      this.settlement.plots.push(p);plots.push(p);
    }
    return plots;
  }

  update(dt){
    for(const f of this.forage){if(f.dead){f.respawn-=dt;if(f.respawn<=0){f.dead=false;f.remaining=1+Math.floor(Math.random()*3)}}}
    for(const n of this.nodes){
      n.hitTime=Math.max(0,(n.hitTime||0)-dt);
      n.hitFlash=Math.max(0,(n.hitFlash||0)-dt);n.hitAnim=Math.max(0,(n.hitAnim||0)-dt);
      if(n.falling){n.fallAge=(n.fallAge||0)+dt;if(n.fallAge>1.4)n.falling=false}
      if(n.dead&&n.respawn>0){n.respawn-=dt;if(n.respawn<=0){n.dead=false;n.remaining=n.max;n.falling=false;n.hitAnim=0;n.hitFlash=0}}
    }
    for(const d of this.drops)d.life-=dt;
    this.drops=this.drops.filter(d=>d.life>0);

    for(const p of this.particles){
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.vx*=Math.pow(.05,dt);p.vy*=Math.pow(.05,dt);
      p.life-=dt;
    }
    this.particles=this.particles.filter(p=>p.life>0);

    for(const f of this.floaters){f.y-=22*dt;f.life-=dt}
    this.floaters=this.floaters.filter(f=>f.life>0);
  }
  nearestNode(player,range=62){
    let best=null,bd=range;
    for(const n of this.nodes){if(n.dead)continue;const d=dist(player,n);if(d<bd){best=n;bd=d}}
    return best;
  }
  harvest(node,amount=1){
    if(!node||node.dead)return null;

    const taken=Math.max(1,Math.min(amount,node.remaining));
    node.remaining-=taken;
    node.hitTime=.15;node.hitFlash=.10;node.hitAnim=.32;

    const type=node.type;
    const palette={
      wood:'#8b744f',stone:'#8a8b85',iron:'#8d664c',
      goldore:'#d4a53f',gemstone:'#c8d1df'
    };
    const color=palette[type]||'#8a8b85';

    for(let i=0;i<5;i++){
      const a=Math.random()*Math.PI*2,s=24+Math.random()*42;
      this.particles.push({
        x:node.x+(Math.random()-.5)*8,y:node.y-4+(Math.random()-.5)*8,
        vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:.28+Math.random()*.18,maxLife:.46,color,size:2+Math.random()*2
      });
    }

    const label={wood:'WOOD',stone:'STONE',iron:'IRON',goldore:'GOLD ORE',gemstone:'GEM'}[type]||type.toUpperCase();
    this.floaters.push({x:node.x,y:node.y-30,text:`-${taken} ${label}`,life:.65,maxLife:.65,type});

    if(node.remaining<=0){
      node.dead=true;node.respawn=node.type==='wood'?(100+Math.random()*70):(145+Math.random()*100);node.falling=node.type==='wood';node.fallAge=0;node.fallDir=(Math.random()-.5)*1.4;
      for(let i=0;i<10;i++){
        const a=Math.random()*Math.PI*2,s=36+Math.random()*65;
        this.particles.push({x:node.x,y:node.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
          life:.38+Math.random()*.26,maxLife:.64,color,size:2+Math.random()*3});
      }

      // Special mining nodes break into world pickups instead of silently becoming a number.
      if(type==='gemstone'){
        this.spawnDrop(node.x,node.y-6,'gemstone',1);
      }else if(type==='goldore'){
        this.spawnDrop(node.x,node.y-6,'gold',Math.max(2,Math.ceil(node.max*.8)));
      }else if(type==='iron'){
        this.spawnDrop(node.x,node.y-6,'iron',Math.max(1,Math.ceil(node.max*.6)));
      }
    }

    // Wood and ordinary stone are carried home. Special ores become pickups when the node breaks.
    if(type==='wood'||type==='stone')return {type,amount:taken};
    return {type,amount:0};
  }
  place(type,x,y){
    const def=CONFIG.build[type];if(!def)return null;
    const b={id:crypto.randomUUID?.()||Math.random().toString(36),type,x,y,level:1,maxHealth:def.hp,health:def.hp,size:def.size,essenceClock:0,construction:0,buildTime:def.buildTime||5,complete:false,
      workerId:null,repairClock:0,foodClock:0,attackClock:0,defenderIds:[],decorSeed:Math.random()};
    this.buildings.push(b);
    if(type==='wall')this.rebuildWallLinks(b);
    else if(type!=='house')this.ensureWorkerFor(b);
    this.bus.emit('build:placed',b);return b;
  }

  rebuildWallLinks(post){
    const range=CONFIG.build.wall.connectRange;
    const degree=(id)=>this.links.filter(l=>l.a===id||l.b===id).length;
    // One deliberate connection per newly placed post.
    // Candidate must have a free connection slot and cannot already be linked.
    const candidate=this.buildings
      .filter(b=>b!==post&&b.type==='wall'&&b.health>0&&degree(b.id)<(CONFIG.build.wall.maxLinks||2))
      .map(b=>({b,d:Math.hypot(b.x-post.x,b.y-post.y)}))
      .filter(x=>x.d<=range)
      .filter(({b})=>!this.links.some(l=>(l.a===post.id&&l.b===b.id)||(l.a===b.id&&l.b===post.id)))
      .sort((a,b)=>a.d-b.d)[0];
    if(candidate){
      const b=candidate.b;
      this.links.push({a:post.id,b:b.id,tier:Math.min(post.level,b.level),health:260,maxHealth:260});
    }
  }
  removeDeadLinks(){
    const alive=new Set(this.buildings.filter(b=>b.health>0).map(b=>b.id));
    this.links=this.links.filter(l=>alive.has(l.a)&&alive.has(l.b));
  }


  ensureWorkerFor(building){
    if(!building||building.type==='wall'||building.type==='house'||building.workerId)return;
    const roleMap={workshop:'smith',farm:'farmer',shrine:'keeper',barracks:'quartermaster',
      archery:'fletcher',stables:'stablehand',tower:'watchman',academy:'apprentice'};
    const aptitude={smith:'crafting',farmer:'farming',keeper:'arcane',quartermaster:'combat',
      fletcher:'crafting',stablehand:'combat',watchman:'combat',apprentice:'arcane'};
    const role=roleMap[building.type]||'builder';
    let c=this.freeCitizen(aptitude[role]);
    if(!c){
      // Settlement can hire a temporary specialist, but this does not increase population capacity.
      c=this.createCitizen(building.x+20,building.y+20,'hired');
      c.name=`${c.name}`;this.settlement.population.push(c);
    }
    this.assignJob(c,role,building.id);
    building.workerId=c.id;c.buildingId=building.id;
    if(!this.workers.some(w=>w.id===c.id))this.workers.push(c);
    this.bus.emit('notice',{type:'growth',text:`${c.name} became the ${role} at the ${CONFIG.build[building.type].name}.`});
  }

  workerFor(building){return this.workers.find(w=>w.id===building.workerId)}

  nearestBuilding(player,range=90){
    let best=null,bd=range;
    for(const b of this.buildings){const d=dist(player,b);if(d<bd){best=b;bd=d}}
    return best;
  }
  collidesBuild(x,y,size){
    if(Math.hypot(x-CONFIG.hall.x,y-CONFIG.hall.y)<CONFIG.hall.radius+size+28)return true;
    return this.buildings.some(b=>Math.hypot(x-b.x,y-b.y)<size+b.size+10);
  }
  spawnDrop(x,y,type,amount=1){this.drops.push({x,y,type,amount,life:30,radius:9})}
}