import * as THREE from "three";

export class Weapon{
constructor(scene,camera,input,titan,player,worldRoot=null,audioSystem=null){
 this.scene=scene;
 this.camera=camera;
 this.input=input;
 this.targets=Array.isArray(titan)?titan:[titan];
 this.titan=this.targets[0] ?? null;
 this.currentTarget=this.titan;
 this.player=player;
 this.worldRoot=worldRoot;
 this.audioSystem=audioSystem;
 this.worldBulletMeshes=[];

 this.raycaster=new THREE.Raycaster();

 if(this.worldRoot){
   this.worldRoot.traverse(o=>{
     if(o.isMesh && o.userData?.blocksBullets){
       this.worldBulletMeshes.push(o);
     }
   });
 }

 this.magSize=36;
 this.ammo=36;
 this.reserve=180;

 this.fireRate=.075;
 this.cooldown=0;

 this.reloading=false;
 this.reloadTimer=0;

 this.hitMarkerTimer=0;

 // Standard Titan rifle round.
 // 0.22 = 22% of damage can pass through intact armor into health.
 this.armorPenetration=.22;

 // v7.4.5 BALLISTIC TRUTH PROFILE
 // Keep weapon/world interaction in one physical-ish tuning profile instead of
 // scattering arbitrary "hits to break" constants through destruction code.
 // Current rifle is treated as a high-velocity intermediate service rifle.
 this.ballistics={
   muzzleVelocityMps:890,
   projectileMassGrams:4.0,
   muzzleEnergyJ:1584,
   wallDamage:2.35,
   brickPenetration:1.0,
   concretePenetration:.62,
   metalPenetration:.18
 };
 this.combatLog=null;

 this.vfxTime=0;
 this.sparkPool=[];
 this.casingPool=[];
 this.tracerPool=[];
 this.activeVfx=[];

 this.initVfxPools();

 // v6.3 COMBAT STABILITY:
 // Persistent muzzle flash resources. Automatic fire must NOT allocate/dispose
 // lights, geometries and materials every 75ms.
 this.muzzleFlashLife=0;
 this.muzzleFlashLight=new THREE.PointLight(0xff8f2a,0,14,.75);
 this.muzzleFlashLight.visible=false;
 this.scene.add(this.muzzleFlashLight);

 this.muzzleFlashCore=new THREE.Mesh(
   new THREE.PlaneGeometry(.20,.20),
   new THREE.MeshBasicMaterial({
     color:0xfff3c0,transparent:true,opacity:0,
     side:THREE.DoubleSide,depthWrite:false
   })
 );
 this.muzzleFlashCore.visible=false;
 this.scene.add(this.muzzleFlashCore);
}

setCombatLog(fn){
 this.combatLog=fn;
}


initVfxPools(){
 // Sharp lightning-like spark shards instead of circular particles.
 const sparkMatA=new THREE.MeshBasicMaterial({
   color:0xffcf63,
   transparent:true,
   opacity:1,
   depthWrite:false
 });
 const sparkMatB=new THREE.MeshBasicMaterial({
   color:0xff5a18,
   transparent:true,
   opacity:1,
   depthWrite:false
 });

 for(let i=0;i<96;i++){
   const geo=new THREE.BufferGeometry();

   // A 2-point line segment authored along local +Y.
   geo.setAttribute(
     "position",
     new THREE.Float32BufferAttribute(
       [0,0,0, 0,1,0],
       3
     )
   );

   const line=new THREE.Line(
     geo,
     (i%3===0?sparkMatB:sparkMatA).clone()
   );

   line.visible=false;
   this.scene.add(line);

   this.sparkPool.push({
     mesh:line,
     vel:new THREE.Vector3(),
     life:0,
     maxLife:0,
     drag:5.0,
     gravity:2.5,
     length:.2,
     width:1
   });
 }

 const casingGeo=new THREE.CylinderGeometry(.025,.025,.12,8);
 const casingMat=new THREE.MeshStandardMaterial({
   color:0xc28d35,
   metalness:.92,
   roughness:.28
 });

 for(let i=0;i<24;i++){
   const m=new THREE.Mesh(casingGeo,casingMat);
   m.visible=false;
   this.scene.add(m);

   this.casingPool.push({
     mesh:m,
     vel:new THREE.Vector3(),
     spin:new THREE.Vector3(),
     life:0,
     maxLife:0
   });
 }

 const tracerGeo=new THREE.BoxGeometry(.012,1,.012);
 const tracerMat=new THREE.MeshBasicMaterial({
   color:0xffc25c,
   transparent:true,
   opacity:.9
 });

 for(let i=0;i<12;i++){
   const m=new THREE.Mesh(tracerGeo,tracerMat.clone());
   m.visible=false;
   this.scene.add(m);

   this.tracerPool.push({
     mesh:m,
     life:0,
     maxLife:0
   });
 }
}

spawnDragonfireBurst(){
 const muzzle=this.player.getMuzzleWorldPosition();
 const aim=this.player.getMuzzleAimRay();

 const worldUp=new THREE.Vector3(0,1,0);

 let right=new THREE.Vector3().crossVectors(
   aim.direction,
   worldUp
 );

 if(right.lengthSq()<.001){
   right.set(1,0,0);
 }else{
   right.normalize();
 }

 const up=new THREE.Vector3()
   .crossVectors(right,aim.direction)
   .normalize();

 const spawnShard=(opts={})=>{
   const s=this.sparkPool.find(x=>x.life<=0);
   if(!s)return;

   s.mesh.visible=true;
   s.mesh.position.copy(muzzle);

   s.mesh.position.addScaledVector(
     aim.direction,
     opts.forward ?? ((Math.random()-.5)*.22)
   );

   s.mesh.position.addScaledVector(
     right,
     opts.right ?? ((Math.random()-.5)*.18)
   );

   s.mesh.position.addScaledVector(
     up,
     opts.up ?? ((Math.random()-.5)*.12)
   );

   s.vel.set(0,0,0)
     .addScaledVector(
       aim.direction,
       opts.forwardVel ?? (Math.random()*1.8)
     )
     .addScaledVector(
       right,
       opts.sideVel ?? ((Math.random()-.5)*2.5)
     )
     .addScaledVector(
       up,
       opts.upVel ?? (1.0+Math.random()*2.0)
     );

   s.maxLife=s.life=
     opts.life ?? (.055+Math.random()*.10);

   s.length=
     opts.length ?? (.16+Math.random()*.28);

   s.mesh.scale.set(
     1,
     s.length,
     1
   );

   const dir=s.vel.clone().normalize();

   if(dir.lengthSq()>.0001){
     s.mesh.quaternion.setFromUnitVectors(
       new THREE.Vector3(0,1,0),
       dir
     );
   }

   s.mesh.material.opacity=
     opts.opacity ?? (.72+Math.random()*.28);
 };

 // -------------------------------------------------------
 // 1) THIN VERTICAL CROWN
 // Short, needle-like sparks that jump upward from the action.
 // These are the constant "machine alive" sparks.
 // -------------------------------------------------------
 const crownCount=
   5+Math.floor(Math.random()*5);

 for(let i=0;i<crownCount;i++){
   spawnShard({
     forward:-.08+Math.random()*.18,
     right:(Math.random()-.5)*.16,
     up:(Math.random()-.5)*.08,
     forwardVel:(Math.random()-.5)*1.4,
     sideVel:(Math.random()-.5)*1.5,
     upVel:2.8+Math.random()*4.8,
     length:.12+Math.random()*.34,
     life:.045+Math.random()*.095,
     opacity:.82+Math.random()*.18
   });
 }

 // -------------------------------------------------------
 // 2) SIDE FAN
 // Medium sparks that kick left/right and fill the weapon/HUD space.
 // -------------------------------------------------------
 const fanCount=
   4+Math.floor(Math.random()*4);

 for(let i=0;i<fanCount;i++){
   const sideSign=
     Math.random()<.5
     ?-1
     :1;

   spawnShard({
     forward:-.10+Math.random()*.24,
     right:sideSign*(.02+Math.random()*.08),
     up:(Math.random()-.5)*.10,
     forwardVel:(Math.random()-.5)*2.0,
     sideVel:sideSign*(3.4+Math.random()*4.8),
     upVel:(Math.random()-.15)*3.0,
     length:.22+Math.random()*.50,
     life:.060+Math.random()*.13,
     opacity:.75+Math.random()*.25
   });
 }

 // -------------------------------------------------------
 // 3) HEAVY DRAGON SLASH
 // Not every bullet. Random dramatic lateral energy discharge.
 // This is deliberately darker/denser and longer.
 // -------------------------------------------------------
 if(Math.random()<.30){
   const sideSign=
     Math.random()<.5
     ?-1
     :1;

   const heavyCount=
     1+Math.floor(Math.random()*3);

   for(let i=0;i<heavyCount;i++){
     spawnShard({
       forward:-.18+Math.random()*.24,
       right:sideSign*(.03+Math.random()*.10),
       up:(Math.random()-.5)*.12,
       forwardVel:-.8+Math.random()*2.4,
       sideVel:sideSign*(7.5+Math.random()*7.5),
       upVel:-.4+Math.random()*3.2,
       length:.58+Math.random()*1.25,
       life:.075+Math.random()*.16,
       opacity:.85+Math.random()*.15
     });
   }
 }

 // -------------------------------------------------------
 // BRASS CASING
 // -------------------------------------------------------
 const casing=this.casingPool.find(x=>x.life<=0);

 if(casing){
   casing.mesh.visible=true;

   casing.mesh.position.copy(muzzle)
     .addScaledVector(aim.direction,-.75)
     .addScaledVector(right,.20)
     .addScaledVector(up,.04);

   casing.mesh.quaternion.copy(
     this.player.rifle.getWorldQuaternion(
       new THREE.Quaternion()
     )
   );

   casing.vel.copy(right)
     .multiplyScalar(2.8+Math.random()*1.8)
     .addScaledVector(up,2.0+Math.random()*1.5)
     .addScaledVector(aim.direction,-.7-Math.random()*.6);

   casing.spin.set(
     10+Math.random()*15,
     14+Math.random()*20,
     8+Math.random()*18
   );

   casing.maxLife=casing.life=
     .75+Math.random()*.45;
 }

 // -------------------------------------------------------
 // SHORT TRACER
 // -------------------------------------------------------
 if(Math.random()<.55){
   const t=this.tracerPool.find(x=>x.life<=0);

   if(t){
     t.mesh.visible=true;

     const len=
       1.8+Math.random()*2.3;

     const center=
       muzzle.clone().addScaledVector(
         aim.direction,
         len*.5
       );

     t.mesh.position.copy(center);
     t.mesh.scale.set(1,len,1);

     t.mesh.quaternion.setFromUnitVectors(
       new THREE.Vector3(0,1,0),
       aim.direction.clone().normalize()
     );

     t.maxLife=t.life=
       .035+Math.random()*.035;

     t.mesh.material.opacity=
       .72+Math.random()*.25;
   }
 }
}

updateVfx(dt){
 // Persistent muzzle flash decay — zero allocations during firing.
 if(this.muzzleFlashLife>0){
   this.muzzleFlashLife-=dt;
   const a=THREE.MathUtils.clamp(this.muzzleFlashLife/.045,0,1);
   this.muzzleFlashLight.intensity=26*a;
   this.muzzleFlashCore.material.opacity=.95*a;
   if(this.muzzleFlashLife<=0){
     this.muzzleFlashLight.visible=false;
     this.muzzleFlashCore.visible=false;
     this.muzzleFlashLight.intensity=0;
   }
 }

 // Sparks
 for(const s of this.sparkPool){
   if(s.life<=0)continue;

   s.life-=dt;

   if(s.life<=0){
     s.mesh.visible=false;
     continue;
   }

   s.vel.y-=s.gravity*dt;

   s.vel.multiplyScalar(
     Math.exp(-s.drag*dt)
   );

   s.mesh.position.addScaledVector(
     s.vel,
     dt
   );

   const a=s.life/s.maxLife;

   // Keep each shard aligned to its travel direction.
   if(s.vel.lengthSq()>.0001){
     const dir=s.vel.clone().normalize();

     s.mesh.quaternion.setFromUnitVectors(
       new THREE.Vector3(0,1,0),
       dir
     );
   }

   // Snap/flicker rather than soft circular fading.
   const flicker=
     .55 +
     Math.random()*.45;

   s.mesh.material.opacity=
     a*flicker;

   s.mesh.scale.y=
     s.length*(.35+.65*a);
 }

 // Casings
 for(const c of this.casingPool){
   if(c.life<=0)continue;

   c.life-=dt;

   if(c.life<=0){
     c.mesh.visible=false;
     continue;
   }

   c.vel.y-=9.8*dt;
   c.mesh.position.addScaledVector(c.vel,dt);

   c.mesh.rotation.x+=c.spin.x*dt;
   c.mesh.rotation.y+=c.spin.y*dt;
   c.mesh.rotation.z+=c.spin.z*dt;
 }

 // Tracers
 for(const t of this.tracerPool){
   if(t.life<=0)continue;

   t.life-=dt;

   if(t.life<=0){
     t.mesh.visible=false;
     continue;
   }

   t.mesh.material.opacity=
     .9*(t.life/t.maxLife);
 }
}


update(dt){
 this.updateVfx(dt);
 this.cooldown=Math.max(0,this.cooldown-dt);
 this.hitMarkerTimer=Math.max(0,this.hitMarkerTimer-dt);

 if(this.reloading){
   this.reloadTimer-=dt;

   if(this.reloadTimer<=0){
     this.finishReload();
   }

   return;
 }

 if(
   this.input.reload &&
   this.ammo<this.magSize &&
   this.reserve>0
 ){
   this.startReload();
 }

 if(
   this.input.fire &&
   this.cooldown<=0 &&
   !this.player.inspectActive &&
   !this.player.swordEquipped
 ){
   this.fire();
 }
}

fire(){
 if(this.ammo<=0){
   this.startReload();
   return;
 }

 this.cooldown=this.fireRate;
 this.ammo--;
 this.player.addWeaponHeat?.();
 this.player.addStress?.(.42,"weapon");
 this.audioSystem?.playPlayerRifle?.(this.player.group.position);

 this.player.addRecoil(
   .022+Math.random()*.010
 );

 // Actual weapon trace uses the STABLE aim rig rather than
 // presentation bob/recoil.
 // -------------------------------------------------------
 // TWO-STAGE THIRD-PERSON AIM
 //
 // STAGE 1: the CENTER-SCREEN CROSSHAIR decides what is hit.
 // This prevents close-range muzzle/camera parallax from making
 // the rifle miss a shoulder that is visibly under the reticle.
 // -------------------------------------------------------
 const crosshairRay=this.player.getCrosshairRay();

 this.raycaster.set(
   crosshairRay.origin,
   crosshairRay.direction
 );

 let hit=null;
 let hitTitan=null;

 for(const candidate of this.targets){
   // v7.5.2: corpses remain valid physical targets while their body is still present,
   // allowing post-mortem armor stripping and modular limb/torso destruction.
   if(!candidate?.group?.visible)continue;

   const candidateHit=candidate.raycastCombat(
     this.raycaster
   );

   if(
     candidateHit &&
     (!hit || candidateHit.distance<hit.distance)
   ){
     hit=candidateHit;
     hitTitan=candidate;
   }
 }

 if(hitTitan){
   this.currentTarget=hitTitan;
   this.titan=hitTitan;
 }

 // World geometry can stop a shot before it reaches a Titan.
 const dynamicWorldMeshes=
   this.worldRoot?.userData?.dynamicBulletMeshes ?? [];

 const allWorldMeshes=
   dynamicWorldMeshes.length
   ?this.worldBulletMeshes.concat(dynamicWorldMeshes)
   :this.worldBulletMeshes;

 const liveWorldMeshes=allWorldMeshes.filter(o=>
   o.visible &&
   o.userData?.blocksBullets
 );

 const worldHits=liveWorldMeshes.length
   ?this.raycaster.intersectObjects(liveWorldMeshes,false)
   :[];

 const wallHit=worldHits[0] ?? null;

 if(
   wallHit &&
   (!hit || wallHit.distance<hit.distance)
 ){
   hit=wallHit;
   hitTitan=null;
 }


 // -------------------------------------------------------
 // STAGE 2: visual/projectile direction comes from the actual muzzle
 // toward the point selected by the crosshair.
 // -------------------------------------------------------
 const muzzleOrigin=this.player.getMuzzleWorldPosition();

 let targetPoint;

 if(hit){
   targetPoint=hit.point.clone();
 }else{
   targetPoint=crosshairRay.origin.clone().addScaledVector(
     crosshairRay.direction,
     120
   );
 }

 const shotDirection=targetPoint.clone()
   .sub(muzzleOrigin)
   .normalize();

 this.flash();
 this.spawnDragonfireBurst();

 if(hit){

   this.spark(hit.point);

   if(!hitTitan){
     hit.object.userData?.onBulletHit?.({
       point:hit.point.clone(),
       direction:shotDirection.clone(),
       damage:this.ballistics.wallDamage,
       energyJ:this.ballistics.muzzleEnergyJ,
       ballistics:this.ballistics
     });

     this.hitMarkerTimer=.045;
     return;
   }

   const anatomy=hitTitan.resolveDamageZone?.(hit) ?? {
     parentZone:hit.object.userData.zone||"body",
     anatomicalZone:hit.object.userData.zone||"body"
   };

   const event=hitTitan.takeHit(
     anatomy.parentZone,
     42,
     {
       shotDirection:shotDirection.clone(),
       armorPenetration:this.armorPenetration,
       hitPoint:hit.point.clone(),
       hitObject:hit.object,
       anatomy
     }
   );

   if(event){
     event.anatomicalZone=anatomy.anatomicalZone;
     event.anatomicalLabel=anatomy.label;
     event.severRoot=anatomy.severRoot;
   }

   if(event && this.combatLog){
     this.combatLog(event);
   }

   this.hitMarkerTimer=.095;
 }
}

startReload(){
 if(
   this.reloading ||
   this.reserve<=0 ||
   this.ammo===this.magSize
 )return;

 this.reloading=true;
 this.reloadTimer=1.55;
 this.audioSystem?.playReload?.();

 this.player.setReloading(true);

 if(this.combatLog){
   this.combatLog({
     type:"reload",
     phase:"start",
     ammo:this.ammo,
     magSize:this.magSize,
     reserve:this.reserve
   });
 }
}

finishReload(){
 const needed=this.magSize-this.ammo;
 const moved=Math.min(needed,this.reserve);

 this.ammo+=moved;
 this.reserve-=moved;

 this.reloading=false;
 this.player.setReloading(false);

 if(this.combatLog){
   this.combatLog({
     type:"reload",
     phase:"complete",
     ammo:this.ammo,
     magSize:this.magSize,
     reserve:this.reserve
   });
 }
}

flash(){
 const muzzlePos=this.player.getMuzzleWorldPosition();

 this.muzzleFlashLight.position.copy(muzzlePos);
 this.muzzleFlashLight.intensity=26;
 this.muzzleFlashLight.visible=true;

 this.muzzleFlashCore.position.copy(muzzlePos);
 this.muzzleFlashCore.lookAt(this.camera.position);
 this.muzzleFlashCore.material.opacity=.95;
 this.muzzleFlashCore.visible=true;

 this.muzzleFlashLife=.045;
}
spark(point){
 // Reuse preallocated spark objects instead of creating GPU resources on every hit.
 for(let i=0;i<3;i++){
   const s=this.sparkPool.find(x=>x.life<=0);
   if(!s)break;

   s.mesh.visible=true;
   s.mesh.position.copy(point);
   s.maxLife=s.life=.07+Math.random()*.09;
   s.length=.08+Math.random()*.13;
   s.mesh.scale.set(1,s.length,1);
   s.mesh.material.opacity=.75+Math.random()*.25;

   s.vel.set(
     (Math.random()-.5)*3.4,
     .6+Math.random()*2.8,
     (Math.random()-.5)*3.4
   );

   const dir=s.vel.clone().normalize();
   if(dir.lengthSq()>.0001){
     s.mesh.quaternion.setFromUnitVectors(
       new THREE.Vector3(0,1,0),
       dir
     );
   }
 }
}
}
