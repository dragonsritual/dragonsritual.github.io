import * as THREE from "three";
import { ProceduralTitanGear } from "./proceduralGear.js?v=4.8.12";
import { classifyTitanHit } from "./humanoidDamageRig.js?v=7.6.1";

// v7.6.1 — smooth procedural body primitive.  Unlike BoxGeometry this gives
// the field rig broad planar anatomy with genuinely rounded corners/edges.
function makeRoundedBodyGeometry(width,height,depth,radius=.16,segments=5){
 const hw=width*.5,hh=height*.5,r=Math.min(radius,hw-.001,hh-.001);
 const shape=new THREE.Shape();
 shape.moveTo(-hw+r,-hh);
 shape.lineTo(hw-r,-hh); shape.quadraticCurveTo(hw,-hh,hw,-hh+r);
 shape.lineTo(hw,hh-r); shape.quadraticCurveTo(hw,hh,hw-r,hh);
 shape.lineTo(-hw+r,hh); shape.quadraticCurveTo(-hw,hh,-hw,hh-r);
 shape.lineTo(-hw,-hh+r); shape.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
 const g=new THREE.ExtrudeGeometry(shape,{
   depth:Math.max(.02,depth-r*.65),bevelEnabled:true,bevelSegments:segments,
   steps:1,bevelSize:r*.32,bevelThickness:r*.32,curveSegments:segments
 });
 g.translate(0,0,-Math.max(.02,depth-r*.65)*.5);
 g.computeVertexNormals();
 return g;
}

// v7.7.0 — anatomical soft-volume generator for the armor-ready base mannequin.
// A profile is revolved into a smooth closed volume, then flattened in Z so the
// body reads as human rather than as stacked primitives.  Each major body mass
// remains a separate rigid/articulated region for future procedural armor.
function makeAnatomicalVolume(profile,depthScale=.62,radialSegments=24){
 const pts=profile.map(([y,r])=>new THREE.Vector2(r,y));
 const g=new THREE.LatheGeometry(pts,radialSegments);
 g.scale(1,1,depthScale);
 g.computeVertexNormals();
 return g;
}

function makeLimbCapsule(radius,length,depthScale=.92){
 const g=new THREE.CapsuleGeometry(radius,Math.max(.02,length-radius*2),8,16);
 g.scale(1,1,depthScale);
 g.computeVertexNormals();
 return g;
}

export class Titan{
constructor(scene,player,options={}){
 this.scene=scene;
 this.player=player;
 this.worldRoot=options.worldRoot ?? null;
 this.spawnGrace=options.spawnGrace ?? 3.25;
 this.losRaycaster=new THREE.Raycaster();

 // v6.3: cached/throttled LOS. Architecture raycasts do not belong at 60 Hz per enemy.
 this.losCheckTimer=Math.random()*.08;
 this.cachedHasLOS=false;
 this.worldOccluders=[];
 this.refreshWorldOccluders();
 this.group=new THREE.Group();

 this.id=options.id ?? "TITAN-01";
 this.displayName=options.name ?? this.id;
 this.homePosition=(options.position?.clone?.() ?? new THREE.Vector3(0,0,-28));
 this.behavior=options.behavior ?? "guard";
 this.activationRadius=options.activationRadius ?? 58;
 this.homeYaw=options.yaw ?? 0;
 this.awake=false;

 // v7.1 sensory memory / roaming. Detection is evidence, not a magic radius.
 this.sensoryContext=options.sensoryContext ?? null;
 this.hearingTimer=Math.random()*.12;
 this.heardPlayer=false;
 this.visualSuspicion=0;
 this.audioSuspicion=0;
 this.lastKnownTimer=0;
 this.roamAngle=Math.random()*Math.PI*2;
 this.roamRadius=options.roamRadius ?? (this.behavior==="patrol"?18:7);
 this.roamTarget=this.homePosition.clone();
 this.roamRetarget=1+Math.random()*3;

 this.archetype=options.archetype ?? "heavy";
 const ENEMY_ARCHETYPES={
   heavy:{label:"HEAVY ENFORCER",health:1000,armor:275,speed:2.40,scale:[1.11,1.11,1.11],reactionMass:1.15,preferredRange:18,aggression:.64,flankBias:.18,coverBias:.42,weapon:"rifle"},
   assault:{label:"ASSAULT",health:520,armor:150,speed:3.35,scale:[1.00,1.00,1.00],reactionMass:.82,preferredRange:12,aggression:.86,flankBias:.56,coverBias:.55,weapon:"rifle"},
   sniper:{label:"SNIPER",health:360,armor:85,speed:2.65,scale:[.98,1.06,.98],reactionMass:.66,preferredRange:42,aggression:.42,flankBias:.28,coverBias:.92,weapon:"rifle"},
   knife:{label:"KNIFER",health:300,armor:60,speed:4.35,scale:[.96,.98,.96],reactionMass:.52,preferredRange:1.8,aggression:1.0,flankBias:.95,coverBias:.20,weapon:"knife"}
 };
 this.archetypeProfile=ENEMY_ARCHETYPES[this.archetype]??ENEMY_ARCHETYPES.heavy;
 this.displayRole=this.archetypeProfile.label;
 this.enemyName=options.enemyName ?? "UNKNOWN CONTACT";
 this.callSign=options.callSign ?? this.enemyName.toUpperCase();
 this.eliteBrain=null;
 this.eliteIntent=null;
 this.aiBlackboard={
   state:"idle",target:null,lastSeenPosition:new THREE.Vector3(),lastHeardPosition:new THREE.Vector3(),
   coverTarget:null,flankSide:0,suppression:0,confidence:1,pain:0,morale:1,
   preferredRange:this.archetypeProfile.preferredRange,aggression:this.archetypeProfile.aggression,
   flankBias:this.archetypeProfile.flankBias,coverBias:this.archetypeProfile.coverBias
 };

 this.health=this.archetypeProfile.health;
 this.maxHealth=this.health;

 this.armor=this.archetypeProfile.armor;
 this.maxArmor=this.armor;

 this.alive=true;

 // v4.6.6 DEATH PERFORMANCE — lethal hits transition through reaction,
 // knee collapse and directional fall rather than teleporting to a corpse pose.
 this.deathPerformance=null;
 this.deathSettled=false;

 // v4.7.9 CORPSE GROUND CONTACT
 // Reused Box3: only evaluated during death performance, not normal combat.
 this.deathGroundBox=new THREE.Box3();
 this.deathGroundCorrection=0;

 // -------------------------------------------------------
 // DRAGON PHYSICS — ENEMY MASS / RESISTANCE MODEL
 // -------------------------------------------------------
 this.mass=620;                    // fictional powered-armor mass
 this.baseSpeed=this.archetypeProfile?.speed??2.40;
 this.speed=this.baseSpeed;

 this.linearImpulse=new THREE.Vector3();
 this.angularImpulse=new THREE.Vector3();

 this.stability=100;
 this.maxStability=100;

 this.stagger=0;
 this.staggerTimer=0;
 this.brace=0;
 this.braceTarget=0;

 this.hitRecover=0;
 this.headSnap=0;
 this.chestKick=0;
 this.shoulderTwist=0;
 this.locomotionClock=Math.random()*Math.PI*2;
 this.meleePoseClock=0;

 this.reactionRig={
   leftShoulder:{kick:0,yaw:0,roll:0},
   rightShoulder:{kick:0,yaw:0,roll:0},
   torsoYaw:0,torsoRoll:0,torsoPitch:0,
   pelvisYaw:0,pelvisRoll:0,
   leftLegKick:0,rightLegKick:0,
   leftKneeBend:0,rightKneeBend:0,
   leftLegRoll:0,rightLegRoll:0,
   recoilTime:0,
   rootKickX:0,rootKickZ:0,
   rootYaw:0,
   hitPulse:0
 };

 this.attackCooldown=0;

 // v2.7 RETURN FIRE
 this.fireCooldown=.65;
 this.burstShotsLeft=0;
 this.burstGap=0;
 this.enemyTracers=[];
 this.enemyMuzzleFlashes=[];

 // v7.4.6 ENEMY BALLISTIC WORLD INTERACTION
 // Enemy rifles use the same physical-world rule as the player: architecture can
 // intercept a shot. A blocked shot damages the struck wall, cancels the rest of
 // the burst, and forces pursuit instead of dumping ammunition into cover.
 this.enemyBallistics={
   muzzleVelocityMps:820,
   projectileMassGrams:4.0,
   muzzleEnergyJ:1345,
   wallDamage:2.15
 };
 // v7.5.1: conditional corner-breach suppression. Titans only commit a
 // magazine through masonry after a shot strikes cover immediately beside a
 // player they genuinely had sight of. Once sight is lost they keep aiming at
 // the LAST SEEN location, never the player's hidden live position.
 this.coverBreachMode=false;
 this.coverBreachShotsLeft=0;
 this.coverBreachMagSize=20;
 this.coverBreachAimPoint=new THREE.Vector3();
 this.enemyShotRaycaster=new THREE.Raycaster();
 this.enemyShotWorldCandidates=[];

 // v4.8.12 OPENING FIREFIGHT HOT PATH
 // Preallocate enemy-shot presentation. No geometry/material/light creation while bullets fly.
 this.enemyFirePool={tracers:[],lights:[],tracerCursor:0,lightCursor:0};
 const enemyTracerGeo=new THREE.BufferGeometry();
 enemyTracerGeo.setAttribute("position",new THREE.Float32BufferAttribute([0,0,0,0,0,1],3));
 for(let i=0;i<18;i++){
   const line=new THREE.Line(
     enemyTracerGeo,
     new THREE.LineBasicMaterial({color:0xffc05a,transparent:true,opacity:0,depthWrite:false})
   );
   line.visible=false;
   this.scene.add(line);
   this.enemyFirePool.tracers.push(line);
 }
 for(let i=0;i<8;i++){
   const light=new THREE.PointLight(0xff9a38,0,18,1.35);
   light.visible=false;
   this.scene.add(light);
   this.enemyFirePool.lights.push(light);
 }

 this.weaponDropped=false;
 this.droppedWeapon=null;

 this.detachedPieces=[];
 this.ejectedArmor=[];
 this.cachedDetachVisuals=new Map();
 this.traumaMarks=[];
 this.impactFlashes=[];
 this.armorFractures=[];
 this.hitSequence=0;

 this.arcadeArmorFx=[];
 this.arcadeFireFx=[];
 this.arcadeFailureModes={
   leftShoulder:"fly",
   rightShoulder:"fly",
   head:"pop",
   chest:"burn"
 };

 // ARCADE ARMOR CORE:
 // clean, independent destructible objects with forced readable failure.
 this.lastCombatZone="NONE";
 this.lastArmorHitCount=0;

 // BLACK-inspired impact response layer.
 // These are presentation effects only: they never decide whether armor detaches.
 this.armorImpactDebris=[];
 this.armorImpactMarks=[];

 // v4.8.12 COMBAT FX PREWARM
 // The opening firefight used to allocate/compile fresh meshes/materials on the first bullet.
 // Pools are created at spawn time and reused during combat.
 this.impactFxPools={
   hot:[],
   scar:[],
   chip:[],
   ray:[],
   spark:[]
 };

 const hotGeo=new THREE.SphereGeometry(.035,7,5);
 const hotMat=new THREE.MeshBasicMaterial({
   color:0xffd27a,transparent:true,opacity:0,depthWrite:false
 });
 for(let i=0;i<8;i++){
   const m=new THREE.Mesh(hotGeo,hotMat.clone());
   m.visible=false;m.userData.pooledImpactFx=true;
   this.scene.add(m);this.impactFxPools.hot.push(m);
 }

 const scarGeo=new THREE.CircleGeometry(.07,8);
 const scarMat=new THREE.MeshBasicMaterial({
   color:0x17191a,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide
 });
 for(let i=0;i<16;i++){
   const m=new THREE.Mesh(scarGeo,scarMat.clone());
   m.visible=false;m.userData.pooledImpactFx=true;
   this.scene.add(m);this.impactFxPools.scar.push(m);
 }

 const chipGeo=new THREE.BoxGeometry(.05,.05,.04);
 const chipMats=[
   new THREE.MeshStandardMaterial({color:0x46515a,metalness:.72,roughness:.38}),
   new THREE.MeshStandardMaterial({color:0xb86725,metalness:.72,roughness:.38})
 ];
 for(let i=0;i<32;i++){
   const m=new THREE.Mesh(chipGeo,chipMats[i%4===0?1:0]);
   m.visible=false;m.userData.pooledImpactFx=true;
   this.scene.add(m);this.impactFxPools.chip.push(m);
 }

 const rayGeo=new THREE.BufferGeometry();
 rayGeo.setAttribute("position",new THREE.Float32BufferAttribute([0,0,0,0,0,1],3));
 const rayMat=new THREE.LineBasicMaterial({
   color:0xffa12d,transparent:true,opacity:0,depthWrite:false
 });
 for(let i=0;i<20;i++){
   const line=new THREE.Line(rayGeo,rayMat.clone());
   line.visible=false;line.userData.pooledImpactFx=true;
   this.scene.add(line);this.impactFxPools.ray.push(line);
 }

 const sparkGeo=new THREE.BoxGeometry(.035,.14,.022);
 const sparkMats=[
   new THREE.MeshBasicMaterial({color:0xff7a22}),
   new THREE.MeshBasicMaterial({color:0xfff0a0})
 ];
 for(let i=0;i<48;i++){
   const m=new THREE.Mesh(sparkGeo,sparkMats[i%4===0?1:0]);
   m.visible=false;m.userData.pooledTransient=true;
   this.scene.add(m);this.impactFxPools.spark.push(m);
 }

 this.impactPoolCursor={hot:0,scar:0,chip:0,ray:0,spark:0};

 // v7.7.3 FOUNDATION BLOOD — stylized, large, pooled and bounded.
 // No geometry/material creation occurs when a bullet hits flesh.
 this.bloodFxPools={drops:[],mist:[]};
 this.bloodPoolCursor={drop:0,mist:0};

 const bloodDropGeo=new THREE.BoxGeometry(.07,.07,.19);
 const bloodDropMat=new THREE.MeshBasicMaterial({
   color:0xc20b12,transparent:true,opacity:0,depthWrite:false,toneMapped:false
 });
 for(let i=0;i<40;i++){
   const m=new THREE.Mesh(bloodDropGeo,bloodDropMat.clone());
   m.visible=false;
   m.userData.pooledBloodFx=true;
   m.userData.life=0;
   m.userData.maxLife=0;
   m.userData.velocity=new THREE.Vector3();
   m.userData.spin=new THREE.Vector3();
   this.scene.add(m);
   this.bloodFxPools.drops.push(m);
 }

 const bloodMistGeo=new THREE.SphereGeometry(.16,7,5);
 const bloodMistMat=new THREE.MeshBasicMaterial({
   color:0xe0141d,transparent:true,opacity:0,depthWrite:false,toneMapped:false
 });
 for(let i=0;i<10;i++){
   const m=new THREE.Mesh(bloodMistGeo,bloodMistMat.clone());
   m.visible=false;
   m.userData.pooledBloodFx=true;
   m.userData.life=0;
   m.userData.maxLife=0;
   m.userData.velocity=new THREE.Vector3();
   this.scene.add(m);
   this.bloodFxPools.mist.push(m);
 }


 // PASS 11 persistent collision blood; all resources are fixed-size pools.
 this.bloodFxPools.splats=[];this.bloodPoolCursor.splat=0;
 const bloodSplatGeo=new THREE.PlaneGeometry(.52,.52);
 // Twelve shared stain atlases: irregular perimeter, satellite drops, dark/thick core.
 // The pool reuses these textures/materials forever; nothing is allocated when bullets hit.
 this.bloodSplatMaterials=[];
 const bloodPalette=[[128,3,8],[151,7,12],[105,2,6],[177,10,14],[88,1,5],[137,4,9]];
 for(let variant=0;variant<12;variant++){
   const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");
   const [r,g,b]=bloodPalette[variant%bloodPalette.length];
   x.clearRect(0,0,128,128);
   const cx=64+(Math.random()-.5)*8,cy=64+(Math.random()-.5)*8;
   x.beginPath();
   const lobes=22;
   for(let k=0;k<=lobes;k++){
     const a=k/lobes*Math.PI*2;
     const rr=34*(.72+Math.random()*.42)+(k%5===0?Math.random()*13:0);
     const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr*(.72+variant%3*.10);
     if(k===0)x.moveTo(px,py);else x.lineTo(px,py);
   }
   x.closePath();x.fillStyle=`rgba(${r},${g},${b},.94)`;x.fill();
   // viscous darker center / thickness
   const grd=x.createRadialGradient(cx,cy,2,cx,cy,34);grd.addColorStop(0,`rgba(${Math.max(35,r-65)},0,3,.88)`);grd.addColorStop(.55,`rgba(${r},${g},${b},.34)`);grd.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=grd;x.fillRect(18,18,92,92);
   // satellite droplets and thin spines
   for(let q=0;q<7+(variant%5);q++){const a=Math.random()*Math.PI*2,rad=39+Math.random()*21,sz=1.4+Math.random()*4.2;x.beginPath();x.arc(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad,sz,0,Math.PI*2);x.fillStyle=`rgba(${r},${g},${b},${.55+Math.random()*.4})`;x.fill();}
   const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;
   this.bloodSplatMaterials.push(new THREE.MeshBasicMaterial({map:tex,color:0xffffff,transparent:true,opacity:.96,alphaTest:.035,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:THREE.DoubleSide,toneMapped:false}));
 }
 for(let i=0;i<96;i++){const m=new THREE.Mesh(bloodSplatGeo,this.bloodSplatMaterials[i%this.bloodSplatMaterials.length]);m.visible=false;m.userData.life=0;this.scene.add(m);this.bloodFxPools.splats.push(m);}
 this.bloodCollisionRay=new THREE.Raycaster();this.bloodCollisionStart=new THREE.Vector3();this.bloodCollisionEnd=new THREE.Vector3();this.bloodCollisionDelta=new THREE.Vector3();this.bloodSplatNormal=new THREE.Vector3();

 this.arcadeArmor={
   // v7.5.5 ARMOR-FIRST: armor must visibly absorb a short burst before failure.
   // The values are intentionally deterministic so the player learns the combat language:
   // armor reacts -> armor weakens -> armor ejects -> anatomy becomes vulnerable.
   leftShoulder:{hits:0,forceBreakHits:4,ejectChance:[0,0,0,0,1]},
   rightShoulder:{hits:0,forceBreakHits:4,ejectChance:[0,0,0,0,1]},
   head:{hits:0,forceBreakHits:3,ejectChance:[0,0,0,1]},
   chest:{hits:0,forceBreakHits:8,ejectChance:[0,0,0,0,0,0,0,0,1]}
 };

 // Damage presentation tuning: deliberately exaggerated for readability.
 this.impactPoseGain=2.15;
 this.impactPushGain=1.75;
 this.fractureVisualGain=1.0;

 this.zoneHP={
   leftShoulder:{hp:38,max:38,label:"LEFT SHOULDER ARMOR",broken:false},
   rightShoulder:{hp:38,max:38,label:"RIGHT SHOULDER ARMOR",broken:false},
   head:{hp:50,max:50,label:"HELMET ARMOR",broken:false},
   chest:{hp:120,max:120,label:"CHEST ARMOR",broken:false},
   body:{hp:1000,max:1000,label:"BODY",broken:false},
   // v7.5.5: exposed anatomy fails quickly, but not from an accidental single graze.
   // Rifle baseline (~42) means arms usually separate on the 2nd clean exposed hit;
   // legs/knees take roughly 2-3 focused hits. Catastrophic failure is then lethal.
   leftArm:{hp:74,max:74,label:"LEFT ARM",broken:false},
   rightArm:{hp:74,max:74,label:"RIGHT ARM",broken:false},
   leftLeg:{hp:92,max:92,label:"LEFT LEG",broken:false},
   rightLeg:{hp:92,max:92,label:"RIGHT LEG",broken:false},
   leftKnee:{hp:68,max:68,label:"LEFT KNEE",broken:false},
   rightKnee:{hp:68,max:68,label:"RIGHT KNEE",broken:false},
   core:{hp:1000,max:1000,label:"CORE",broken:false}
 };

 // v7.5.2 — persistent corpse damage / modular body breakup.
 // These are cheap logical HP pools. Geometry only becomes independent when a
 // section is actually severed, keeping the intact/dead actor inexpensive.
 this.postMortemIntegrity={
   head:80,leftArm:125,rightArm:125,leftLeg:165,rightLeg:165,
   torsoUpper:260,torsoLower:220
 };
 this.severedBodyZones=new Set();
 this.severedBodyPieces=[];
 this.postMortemTorsoStage=0;
 this.bodyDismemberRoots={};

 // DRAGON PHYSICS — each armor piece is now an independent live structure.
 this.armorState={
   leftShoulder:{
     zone:"leftShoulder",
     mesh:null,
     restPos:new THREE.Vector3(),
     restRot:new THREE.Euler(),
     shake:0,
     looseness:0,
     crush:0,
     detachThreshold:.96,
     failureMode:null
   },
   rightShoulder:{
     zone:"rightShoulder",
     mesh:null,
     restPos:new THREE.Vector3(),
     restRot:new THREE.Euler(),
     shake:0,
     looseness:0,
     crush:0,
     detachThreshold:.96,
     failureMode:null
   },
   head:{
     zone:"head",
     mesh:null,
     restPos:new THREE.Vector3(),
     restRot:new THREE.Euler(),
     shake:0,
     looseness:0,
     crush:0,
     detachThreshold:.94,
     failureMode:null
   },
   chest:{
     zone:"chest",
     mesh:null,
     restPos:new THREE.Vector3(),
     restRot:new THREE.Euler(),
     shake:0,
     looseness:0,
     crush:0,
     detachThreshold:.985,
     failureMode:null
   }
 };

 const under=new THREE.MeshStandardMaterial({
   color:0x11171b,
   roughness:.78,
   metalness:.12
 });

 const armorPalette={
   heavy:0x252d34,
   assault:0x2c3438,
   sniper:0x30363a,
   knife:0x24292d
 };
 const armor=new THREE.MeshStandardMaterial({
   color:armorPalette[this.archetype]??0x293239,
   metalness:.72,
   roughness:.40
 });

 const exposed=new THREE.MeshStandardMaterial({
   color:0x7d2722,
   emissive:0x250000,
   roughness:.58
 });

 // v4.8.12 EXPOSED HUMAN LAYER
 // Armor sits over this layer. When plates eject, actual skin is revealed.
 const skinToneByRole={
   heavy:0x9b6b52,
   assault:0x8c5f49,
   sniper:0xa8795d,
   knife:0x7f5443
 };
 const skin=new THREE.MeshStandardMaterial({
   color:skinToneByRole[this.archetype]??0x95664f,
   roughness:.86,
   metalness:0
 });

 const body=new THREE.Mesh(
   new THREE.BoxGeometry(1.7,2.5,.9),
   under
 );
 body.position.y=1.9;
 body.userData.zone="body";
 body.material=body.material.clone();
 body.material.colorWrite=false;
 body.material.depthWrite=false;
 body.material.transparent=true;
 body.material.opacity=0;
 this.group.add(body);

 // -------------------------------------------------------
 // SEGMENTED CHEST ARMOR
 // Six independent plates over the torso so damage can be localized.
 // -------------------------------------------------------
 this.chest=new THREE.Group();
 this.chest.position.set(0,2.25,-.48);
 this.chest.userData.zone="chest";
 this.chest.userData.isArmorObject=true;

 this.chestPanels=[];

 const chestPanelData=[
   {id:"chestUL",x:-.34,y:.42,w:.62,h:.62},
   {id:"chestUR",x:.34,y:.42,w:.62,h:.62},
   {id:"chestML",x:-.34,y:-.18,w:.62,h:.56},
   {id:"chestMR",x:.34,y:-.18,w:.62,h:.56},
   {id:"chestLL",x:-.34,y:-.72,w:.62,h:.48},
   {id:"chestLR",x:.34,y:-.72,w:.62,h:.48}
 ];

 for(const d of chestPanelData){
   const panel=new THREE.Mesh(
     new THREE.BoxGeometry(d.w,d.h,.22),
     armor.clone()
   );

   panel.position.set(d.x,d.y,0);
   panel.userData.zone="chest";
   panel.userData.chestPanelId=d.id;
   panel.userData.isArmorObject=true;
   panel.castShadow=true;
   panel.receiveShadow=true;

   this.chest.add(panel);
   this.chestPanels.push({
     id:d.id,
     mesh:panel,
     hp:42,
     max:42,
     dents:0,
     broken:false
   });
 }

 this.group.add(this.chest);

 // BARE CHEST sits directly behind the removable plates.
 // It is a BODY target, not armor. Broken panel = exposed lethal torso.
 this.bareChest=new THREE.Mesh(
   new THREE.CylinderGeometry(.54,.68,1.52,12,1,false),
   skin
 );
 this.bareChest.scale.z=.62;
 this.bareChest.position.set(0,2.22,-.20);
 this.bareChest.userData.zone="body";
 this.bareChest.userData.isArmorObject=false;
 this.group.add(this.bareChest);

 this.bareAbdomen=new THREE.Mesh(
   new THREE.CylinderGeometry(.45,.53,.68,12),
   skin
 );
 this.bareAbdomen.scale.z=.62;
 this.bareAbdomen.position.set(0,1.18,-.18);
 this.bareAbdomen.userData.zone="body";
 this.bareAbdomen.userData.isArmorObject=false;
 this.group.add(this.bareAbdomen);

 this.core=new THREE.Mesh(
   new THREE.BoxGeometry(.7,.9,.18),
   exposed
 );
 this.core.position.set(0,2.25,-.86);
 this.core.visible=false;
 this.core.userData.zone="core";
 this.group.add(this.core);

 // Actual round head underneath the helmet.
 this.skull=new THREE.Mesh(
   new THREE.SphereGeometry(.285,24,18),
   new THREE.MeshStandardMaterial({
     color:0x6b4f43,
     roughness:.82
   })
 );
 this.skull.scale.set(.94,1.10,.90);
 this.skull.position.y=3.78;
 this.skull.userData.zone="head";
 this.skull.userData.isArmorObject=false;
 this.group.add(this.skull);

 // Helmet is a separate armor object sitting ON the head.
 this.head=new THREE.Mesh(
   new THREE.SphereGeometry(.34,12,9),
   armor
 );
 this.head.scale.set(1.06,.88,1.06);
 this.head.position.y=3.92;
 this.head.userData.zone="head";
 this.head.userData.isArmorObject=true;
 this.group.add(this.head);

 // Front brow/jaw plate gives the helmet visible mass.
 this.helmetBrow=new THREE.Mesh(
   new THREE.BoxGeometry(.54,.16,.16),
   armor
 );
 this.helmetBrow.position.set(0,3.90,-.39);
 this.helmetBrow.userData.zone="head";
 this.helmetBrow.userData.isArmorObject=true;
 this.group.add(this.helmetBrow);
 // Tactical face/optic assembly: smaller silhouette, readable hostile eye line.
 this.helmetFace=new THREE.Mesh(
   new THREE.BoxGeometry(.46,.21,.12),
   new THREE.MeshStandardMaterial({
     color:0x11171b,
     metalness:.78,
     roughness:.28
   })
 );
 this.helmetFace.position.set(0,3.78,-.42);
 this.helmetFace.rotation.x=-.08;
 this.helmetFace.userData.zone="head";
 this.helmetFace.userData.isArmorObject=true;
 this.group.add(this.helmetFace);

 const eyeColor=
   this.archetype==="sniper"?0xffc35a:
   this.archetype==="knife"?0xff5438:
   0xff8a35;

 this.helmetEyeSlit=new THREE.Mesh(
   new THREE.BoxGeometry(.34,.042,.026),
   new THREE.MeshBasicMaterial({
     color:eyeColor,
     transparent:true,
     opacity:.90
   })
 );
 this.helmetEyeSlit.position.set(0,3.83,-.496);
 this.group.add(this.helmetEyeSlit);

 // Neck seal visually connects head to torso instead of floating sphere-on-box.
 this.neckSeal=new THREE.Mesh(
   new THREE.CylinderGeometry(.25,.31,.30,10),
   skin
 );
 this.neckSeal.position.set(0,3.43,-.02);
 this.group.add(this.neckSeal);


 // v7.7.0 FACE / CLAVICLE LANDMARKS — subtle forms, not ball-joint decoration.
 this.faceJaw=new THREE.Mesh(makeRoundedBodyGeometry(.38,.20,.31,.085,7),skin);
 this.faceJaw.position.set(0,3.62,-.13);
 this.faceJaw.scale.set(.88,1,.88);
 this.faceJaw.userData.zone="head";
 this.group.add(this.faceJaw);

 this.faceNose=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.07,5,10),skin);
 this.faceNose.rotation.x=Math.PI*.5;
 this.faceNose.position.set(0,3.78,-.285);
 this.faceNose.userData.zone="head";
 this.group.add(this.faceNose);

 this.clavicleBar=new THREE.Mesh(
   makeRoundedBodyGeometry(1.12,.18,.38,.08,7),skin
 );
 this.clavicleBar.position.set(0,2.67,-.07);
 this.clavicleBar.userData.zone="body";
 this.group.add(this.clavicleBar);

 // -------------------------------------------------------
 // UNDERLYING ROUND SHOULDERS
 // Human/suit shoulder volume exists independently of armor.
 // -------------------------------------------------------
 const shoulderBodyMat=skin;

 this.leftShoulderBody=new THREE.Mesh(
   new THREE.SphereGeometry(.225,16,12),
   shoulderBodyMat
 );
 // PASS 06: player-mannequin-derived deltoid. Enemy mass comes from thickness,
 // not a giant detached shoulder sphere.
 this.leftShoulderBody.scale.set(1.16,1.06,1.04);
 this.leftShoulderBody.position.set(-.64,2.64,-.01);
 this.leftShoulderBody.userData.zone="body";
 this.group.add(this.leftShoulderBody);

 this.rightShoulderBody=this.leftShoulderBody.clone();
 this.rightShoulderBody.position.x=.68;
 this.rightShoulderBody.userData.zone="body";
 this.group.add(this.rightShoulderBody);

 // -------------------------------------------------------
 // SHOULDER ARMOR SHELLS
 // Each pad is ONE destructible armor object visually composed of
 // front + top + back faces, sitting just above the rounded shoulder.
 //
 // The group gets ONE HP pool and ONE hit zone.
 // -------------------------------------------------------
 const makeShoulderShell=(side)=>{
   const g=new THREE.Group();
   const sx=side<0?-1:1;

   const shellMat=armor;

   const front=new THREE.Mesh(
     new THREE.BoxGeometry(.62,.40,.16),
     shellMat
   );
   front.position.set(0,.02,-.48);
   front.userData.zone=side<0?"leftShoulder":"rightShoulder";
   front.userData.armorShellPart=true;
   g.add(front);

   const top=new THREE.Mesh(
     new THREE.BoxGeometry(.62,.14,.62),
     shellMat
   );
   top.position.set(0,.30,-.02);
   top.userData.zone=side<0?"leftShoulder":"rightShoulder";
   top.userData.armorShellPart=true;
   g.add(top);

   const back=new THREE.Mesh(
     new THREE.BoxGeometry(.62,.36,.16),
     shellMat
   );
   back.position.set(0,.00,.42);
   back.userData.zone=side<0?"leftShoulder":"rightShoulder";
   back.userData.armorShellPart=true;
   g.add(back);

   const outer=new THREE.Mesh(
     new THREE.BoxGeometry(.15,.34,.50),
     shellMat
   );
   outer.position.set(.31*sx,.02,-.02);
   outer.userData.zone=side<0?"leftShoulder":"rightShoulder";
   outer.userData.armorShellPart=true;
   g.add(outer);

   // Small mount below the shell.
   const mount=new THREE.Mesh(
     new THREE.BoxGeometry(.22,.14,.28),
     shellMat
   );
   mount.position.set(.08*sx,-.28,.02);
   mount.userData.zone=side<0?"leftShoulder":"rightShoulder";
   mount.userData.armorShellPart=true;
   g.add(mount);

   g.position.set(.70*sx,2.87,0);
   g.rotation.z=-.06*sx;
   g.userData.zone=side<0?"leftShoulder":"rightShoulder";
   g.userData.armorShell=true;

   g.traverse(o=>{
     if(o.isMesh){
       o.castShadow=true;
       o.userData.zone=g.userData.zone;
       o.userData.armorShellRoot=g;
       o.userData.isArmorObject=true;
     }
   });

   this.group.add(g);
   return g;
 };

 this.leftShoulder=makeShoulderShell(-1);
 this.rightShoulder=makeShoulderShell(1);

 // Mount aliases kept for compatibility, but mount is now part of shell group.
 this.leftShoulderMount=null;
 this.rightShoulderMount=null;

 // -------------------------------------------------------
 // ARMOR SHELL HIT DETECTION
 // Shoulder shells are made from real visible front/top/back/outer meshes.
 // No oversized invisible shoulder proxy is needed anymore.
 // Helmet/chest keep small explicit proxies for reliability.
 // -------------------------------------------------------
 const hitProxyMat=new THREE.MeshBasicMaterial({
   transparent:true,
   opacity:0,
   depthWrite:false,
   colorWrite:false
 });

 this.headHitbox=new THREE.Mesh(
   new THREE.SphereGeometry(.46,10,8),
   hitProxyMat
 );
 this.headHitbox.position.copy(this.head.position);
 this.headHitbox.scale.set(1.05,.90,1.05);
 this.headHitbox.userData.zone="head";
 this.headHitbox.userData.isArmorHitbox=true;
 this.group.add(this.headHitbox);

 this.chestHitbox=null; // v4.8.12: real chest plates are the armor hitboxes.


 // v4.7.7 HUMANOID FIELD-SUIT VISUAL
 const suitUnder=new THREE.MeshStandardMaterial({
   color:0x0d1215,roughness:.76,metalness:.16
 });
 const suitArmor=new THREE.MeshStandardMaterial({
   color:armorPalette[this.archetype]??0x293239,
   roughness:.38,metalness:.72
 });
 const fabric=new THREE.MeshStandardMaterial({
   color:this.archetype==="sniper"?0x2c302c:0x181d1f,
   roughness:.92,metalness:.02
 });

 // Tapered armored torso instead of a rectangular Roblox-like block.
 this.mirrorTorso=new THREE.Mesh(
   makeAnatomicalVolume([[-.76,.40],[-.60,.49],[-.30,.57],[.08,.61],[.38,.58],[.64,.49],[.76,.34]],.60,28),
   suitUnder
 );
 this.mirrorTorso.position.set(0,2.18,.06);
 // PASS 07 WALKING TANK: intentionally massive, compact torso.
 // Width/depth sell mass; reduced vertical scale keeps him from becoming lanky.
 this.mirrorTorso.scale.set(1.24,.76,1.20);
 this.mirrorTorso.userData.zone="body";
 this.group.add(this.mirrorTorso);

 // Waist/abdomen articulates separately.
 this.mirrorAbdomen=new THREE.Mesh(
   makeAnatomicalVolume([[-.31,.36],[-.18,.40],[.02,.42],[.20,.40],[.31,.37]],.64,24),
   fabric
 );
 this.mirrorAbdomen.position.set(0,1.10,.10);
 this.mirrorAbdomen.userData.zone="body";
 this.group.add(this.mirrorAbdomen);

 // Pelvis shell helps the silhouette transition naturally into the legs.
 this.fieldPelvis=new THREE.Mesh(
   makeAnatomicalVolume([[-.24,.40],[-.12,.49],[.08,.50],[.24,.43]],.70,28),
   skin
 );
 this.fieldPelvis.position.set(0,.66,.06);
 this.fieldPelvis.rotation.x=.03;
 this.fieldPelvis.userData.zone="body";
 this.group.add(this.fieldPelvis);

 // Backpack / life-support module: smaller and tighter than the old giant slab.
 this.fieldPack=new THREE.Group();
 this.fieldPack.position.set(0,2.20,.62);
 const packCore=new THREE.Mesh(new THREE.BoxGeometry(.68,.96,.30),suitArmor);
 packCore.position.z=.10;
 this.fieldPack.add(packCore);
 const packTop=new THREE.Mesh(new THREE.BoxGeometry(.54,.18,.36),suitArmor);
 packTop.position.set(0,.62,.08);
 this.fieldPack.add(packTop);
 for(const sx of [-1,1]){
   const canister=new THREE.Mesh(
     new THREE.CylinderGeometry(.10,.10,.72,8),
     new THREE.MeshStandardMaterial({color:0x1b2227,roughness:.42,metalness:.72})
   );
   canister.position.set(.42*sx,.02,.12);
   this.fieldPack.add(canister);
 }
 this.group.add(this.fieldPack);

 // Articulated arm pivots; hit reaction rig can finally rotate real visible arms.
 this.armRigs={};
 const makeFieldArm=(side)=>{
   const key=side<0?"left":"right";
   const shoulderPivot=new THREE.Group();
   shoulderPivot.position.set(.67*side,2.59,-.01);
   this.group.add(shoulderPivot);

   // WALKING TANK arm: short upper segment, oversized circumference.
   const upper=new THREE.Mesh(
     makeLimbCapsule(.205,.36,.96),
     skin
   );
   upper.position.set(0,-.285,0);
   upper.userData.zone=key==="left"?"leftArm":"rightArm";
   upper.userData.anatomyPart="upperArm";

   // Match the player's hierarchy: shoulder -> upper-arm joint -> elbow.
   const upperTwist=new THREE.Group();
   upperTwist.position.set(.08*side,-.04,0);
   shoulderPivot.add(upperTwist);
   upperTwist.add(upper);

   const elbowPivot=new THREE.Group();
   elbowPivot.position.set(0,-.55,0);
   upperTwist.add(elbowPivot);

   const elbow=new THREE.Mesh(
     makeLimbCapsule(.175,.18,.95),
     skin
   );
   elbow.scale.set(1,.88,1);
   elbow.userData.zone=key==="left"?"leftArm":"rightArm";
   elbowPivot.add(elbow);

   // Player: r=.105 len=.34. Same proportions, slightly heavier enemy thickness.
   const fore=new THREE.Mesh(
     makeLimbCapsule(.185,.34,.94),
     skin
   );
   fore.position.set(0,-.27,-.01);
   fore.userData.zone=key==="left"?"leftArm":"rightArm";
   fore.userData.anatomyPart="forearm";
   elbowPivot.add(fore);

   const glove=new THREE.Mesh(
     makeRoundedBodyGeometry(.24,.28,.22,.08,6),
     skin
   );
   const wristPivot=new THREE.Group();
   wristPivot.position.set(0,-.52,-.01);
   elbowPivot.add(wristPivot);
   glove.position.set(0,-.12,-.04);
   glove.userData.zone=key==="left"?"leftArm":"rightArm";
   glove.userData.anatomyPart="hand";
   wristPivot.add(glove);

   const handSocket=new THREE.Object3D();
   handSocket.position.set(0,-.12,-.12);
   wristPivot.add(handSocket);

   this.armRigs[key]={shoulderPivot,upperTwist,elbowPivot,wristPivot,handSocket,upper,fore,glove};
   this.bodyDismemberRoots[key+"Arm"]=shoulderPivot;
 };
 makeFieldArm(-1);
 makeFieldArm(1);

 // Archetype differences now come primarily from overall body scale/equipment,
 // not exaggerated shoulder/torso deformation.
 if(this.archetype==="heavy"){
   this.fieldPack.scale.set(1.06,1.06,1.06);
 }else if(this.archetype==="sniper"){
   this.fieldPack.scale.set(.88,.92,.86);
 }else if(this.archetype==="knife"){
   this.fieldPack.visible=false;
 }else if(this.archetype==="sniper"){
   this.mirrorTorso.scale.x*=.86;
   this.fieldPack.scale.set(.82,.88,.80);
 }else if(this.archetype==="knife"){
   this.mirrorTorso.scale.x*=.82;
   this.fieldPack.visible=false;
 }
 // Register independent armor structures.
 this.armorState.leftShoulder.mesh=this.leftShoulder;
 this.armorState.rightShoulder.mesh=this.rightShoulder;
 this.armorState.head.mesh=this.head;
 this.armorState.chest.mesh=this.chest;

 for(const state of Object.values(this.armorState)){
   if(!state.mesh)continue;
   state.restPos.copy(state.mesh.position);
   state.restRot.copy(state.mesh.rotation);
 }

 this.legs=[];
 this.legRigs={};

 for(const sx of [-.34,.34]){
   const key=sx<0?"left":"right";
   const upperPivot=new THREE.Group();
   upperPivot.position.set(sx,1.48,0);
   this.group.add(upperPivot);

   // WALKING TANK leg: short, thick thigh with an unmistakably separate left/right stance.
   const upper=new THREE.Mesh(
     makeLimbCapsule(.255,.44,.96),
     skin
   );
   upper.position.set(0,-.34,0);
   upper.userData.zone=key==="left"?"leftLeg":"rightLeg";
   upperPivot.add(upper);

   const kneePivot=new THREE.Group();
   kneePivot.position.set(0,-.66,0);
   upperPivot.add(kneePivot);

   const knee=new THREE.Mesh(
     makeLimbCapsule(.205,.18,.95),
     skin
   );
   knee.scale.set(1,.88,1);
   knee.userData.zone=key==="left"?"leftKnee":"rightKnee";
   kneePivot.add(knee);

   const lowerPivot=new THREE.Group();
   lowerPivot.position.set(0,-.05,0);
   kneePivot.add(lowerPivot);

   // Player shin: r=.12 len=.40.
   const lower=new THREE.Mesh(
     makeLimbCapsule(.205,.40,.95),
     skin
   );
   lower.position.set(0,-.31,.015);

   const boot=new THREE.Mesh(
     makeRoundedBodyGeometry(.31,.22,.48,.08,5),
     skin
   );
   const anklePivot=new THREE.Group();
   anklePivot.position.set(0,-.60,.015);
   lowerPivot.add(anklePivot);
   boot.position.set(0,-.08,-.16);
   boot.userData.zone=key==="left"?"leftLeg":"rightLeg";
   anklePivot.add(boot);
   lower.userData.zone=key==="left"?"leftLeg":"rightLeg";
   lowerPivot.add(lower);

   this.legs.push(upper,lower);
   this.legRigs[key]={upperPivot,kneePivot,lowerPivot,anklePivot,upper,knee,lower,boot};
   this.bodyDismemberRoots[key+"Leg"]=upperPivot;
 }

 // v7.6.1 HIGH-QUALITY ANATOMICAL ARTICULATION CHAIN
 // Pelvis -> abdomen/lumbar -> rib cage -> neck/head.  Child parts are attached
 // with world transforms preserved, so looking/impact motion travels through the
 // body like a person rather than rotating a floating head on a rigid block.
 this.poseRig={
   pelvis:new THREE.Group(),abdomen:new THREE.Group(),ribcage:new THREE.Group(),neck:new THREE.Group(),
   lookPitch:0,targetLookPitch:0
 };
 this.poseRig.pelvis.position.set(0,.72,0);
 this.poseRig.abdomen.position.set(0,.52,0);
 this.poseRig.ribcage.position.set(0,.46,0);
 this.poseRig.neck.position.set(0,1.62,0);
 this.group.add(this.poseRig.pelvis);
 this.poseRig.pelvis.add(this.poseRig.abdomen);
 this.poseRig.abdomen.add(this.poseRig.ribcage);
 this.poseRig.ribcage.add(this.poseRig.neck);
 this.group.updateMatrixWorld(true);
 const attachSafe=(parent,obj)=>{if(obj){parent.attach(obj);}};
 attachSafe(this.poseRig.pelvis,this.fieldPelvis);
 for(const leg of Object.values(this.legRigs))attachSafe(this.poseRig.pelvis,leg.upperPivot);
 attachSafe(this.poseRig.abdomen,this.mirrorAbdomen);
 attachSafe(this.poseRig.ribcage,this.mirrorTorso);
 attachSafe(this.poseRig.ribcage,this.bareChest);
 attachSafe(this.poseRig.ribcage,this.chest);
 attachSafe(this.poseRig.ribcage,this.core);
 attachSafe(this.poseRig.ribcage,this.fieldPack);
 attachSafe(this.poseRig.ribcage,this.clavicleBar);
 attachSafe(this.poseRig.ribcage,this.leftShoulderBody);
 attachSafe(this.poseRig.ribcage,this.rightShoulderBody);
 attachSafe(this.poseRig.ribcage,this.leftShoulder);
 attachSafe(this.poseRig.ribcage,this.rightShoulder);
 for(const arm of Object.values(this.armRigs))attachSafe(this.poseRig.ribcage,arm.shoulderPivot);
 for(const obj of [this.neckSeal,this.skull,this.faceJaw,this.faceNose,this.head,this.helmetBrow,this.helmetFace,this.helmetEyeSlit])attachSafe(this.poseRig.neck,obj);

 // Direct body sections used by post-mortem dismemberment. The head remains
 // separate from helmet armor so armor can still be shot off first.
 this.bodyDismemberRoots.head=this.skull;
 this.bodyDismemberRoots.torsoUpper=[this.bareChest,this.mirrorTorso];
 this.bodyDismemberRoots.torsoLower=[this.bareAbdomen,this.mirrorAbdomen,this.fieldPelvis];

 this.proceduralGear=new ProceduralTitanGear(
   this.group,
   {accent:this.archetype==="sniper"?0xa67b45:0x7a3f28,variant:1}
 );
 this.proceduralGear.group.scale.setScalar(.92);

 // v7.8.0 CLEAN BODY REBUILD / SHOWCASE LOCK.
 // The old Titan accumulated several generations of armor, suit and wearable geometry.
 // Hiding only the obvious chest/helmet roots was not sufficient: legacy child meshes
 // could still dominate the silhouette.  The base-character phase now uses an explicit
 // whitelist.  Gameplay/armor state stays alive, but ONLY the production mannequin,
 // weapon and non-body presentation are allowed to render. Armor will be reintroduced
 // deliberately, one fitted structure at a time, in the armor pass.
 this.baseBodyShowcase=true;
 this.baseBodyMeshes=new Set([
   this.skull,this.faceJaw,this.faceNose,this.neckSeal,this.clavicleBar,
   this.leftShoulderBody,this.rightShoulderBody,
   this.mirrorTorso,this.mirrorAbdomen,this.fieldPelvis,
   ...Object.values(this.armRigs).flatMap(a=>[a.upper,a.fore,a.glove,...a.elbowPivot.children.filter(o=>o.isMesh)]),
   ...Object.values(this.legRigs).flatMap(l=>[l.upper,l.knee,l.lower,l.boot])
 ].filter(Boolean));
 for(const mesh of this.baseBodyMeshes){
   mesh.visible=true;
   mesh.userData.baseMannequinVisual=true;
   mesh.castShadow=true;
   mesh.receiveShadow=true;
 }
 // Hard-disable every known pre-redesign visual root. This is intentionally stronger
 // than the previous pass and prevents update/damage code from exposing old geometry.
 this.legacyVisualRoots=[
   body,this.chest,this.bareChest,this.bareAbdomen,this.core,
   this.head,this.helmetBrow,this.helmetFace,this.helmetEyeSlit,
   this.leftShoulder,this.rightShoulder,this.fieldPack,this.proceduralGear?.group
 ].filter(Boolean);
 for(const root of this.legacyVisualRoots){
   root.visible=false;
   root.traverse?.(o=>{if(o.isMesh)o.visible=false;});
 }
 // The mannequin itself uses continuous soft volumes and a single coherent material
 // family so the articulation can be judged without armor/noise obscuring the joints.
 for(const mesh of this.baseBodyMeshes){
   if(mesh.material){
     mesh.material=skin;
     mesh.visible=true;
   }
 }


 // PASS 08 CLEAN TANK RESTART -------------------------------------------------
 // Hide the entire previous mannequin whitelist. It remains allocated only so the
 // existing damage code is not broken while this new body is proven.
 for(const mesh of this.baseBodyMeshes??[])mesh.visible=false;
 this.baseBodyShowcase=false;

 const tankRoot=new THREE.Group();
 tankRoot.name="TITAN_CLEAN_TANK";
 this.group.add(tankRoot);
 this.cleanTankRoot=tankRoot;

 const tankSkin=new THREE.MeshStandardMaterial({color:0x71868a,roughness:.88,metalness:.03});
 const tankJoint=new THREE.MeshStandardMaterial({color:0x46565a,roughness:.92,metalness:.04});
 const tankGunMat=new THREE.MeshStandardMaterial({color:0x171d20,roughness:.55,metalness:.55});
 const mkBox=(w,h,d,mat=tankSkin)=>{
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=true;m.receiveShadow=true;return m;
 };
 const mkCap=(r,len,mat=tankSkin)=>{
   const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,10),mat);m.castShadow=true;m.receiveShadow=true;return m;
 };
 const mkBall=(r,mat=tankSkin)=>{
   const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);m.castShadow=true;m.receiveShadow=true;return m;
 };

 // ONE LARGE ROUNDED TORSO.
 // A single stretched sphere gives us the simple massive chest requested without
 // returning to the fragmented mannequin look.
 const tankTorso=mkBall(1.0);
 tankTorso.scale.set(.94,.76,.56);
 tankTorso.position.set(0,2.28,0);
 tankTorso.userData.zone="body";
 tankTorso.userData.cleanTankPart="torso";
 tankRoot.add(tankTorso);

 // SMALL HEAD, CENTERED AND TUCKED INTO THE BODY.
 const tankHead=mkBall(.30);
 tankHead.scale.set(.92,1.02,.92);
 tankHead.position.set(0,3.18,-.02);
 tankHead.userData.zone="head";
 tankRoot.add(tankHead);
 const tankNeck=mkCap(.17,.08,tankJoint);
 tankNeck.position.set(0,2.98,0);
 tankNeck.userData.zone="head";
 tankRoot.add(tankNeck);

 const tankArms={};
 const makeTankArm=(side,key)=>{
   const shoulder=new THREE.Group();
   shoulder.position.set(.98*side,2.68,0);
   tankRoot.add(shoulder);

   const upper=mkCap(.30,.46);
   upper.position.set(0,-.40,0);
   upper.userData.zone=key+"Arm";
   shoulder.add(upper);

   const elbow=new THREE.Group();
   elbow.position.set(0,-.80,0);
   shoulder.add(elbow);
   const elbowMass=mkBall(.255,tankJoint);
   elbowMass.userData.zone=key+"Arm";
   elbow.add(elbowMass);

   const fore=mkCap(.27,.42);
   fore.position.set(0,-.38,0);
   fore.userData.zone=key+"Arm";
   elbow.add(fore);

   const hand=mkBox(.38,.36,.40,tankJoint);
   hand.position.set(0,-.75,-.02);
   hand.userData.zone=key+"Arm";
   elbow.add(hand);

   tankArms[key]={shoulder,upper,elbow,fore,hand};
 };
 makeTankArm(-1,"left"); makeTankArm(1,"right");
 this.cleanTankArms=tankArms;

 const tankLegs={};
 const makeTankLeg=(side,key)=>{
   const hip=new THREE.Group();
   hip.position.set(.48*side,1.48,0);
   tankRoot.add(hip);

   const thigh=mkCap(.35,.48);
   thigh.position.set(0,-.42,0);
   thigh.userData.zone=key+"Leg";
   hip.add(thigh);

   const knee=new THREE.Group();
   knee.position.set(0,-.84,0);
   hip.add(knee);
   const kneeMass=mkBox(.56,.36,.50,tankJoint);
   kneeMass.userData.zone=key+"Knee";
   knee.add(kneeMass);

   const shin=mkCap(.30,.44);
   shin.position.set(0,-.40,.01);
   shin.userData.zone=key+"Leg";
   knee.add(shin);

   const foot=mkBox(.58,.28,.72,tankJoint);
   foot.position.set(0,-.78,-.15);
   foot.userData.zone=key+"Leg";
   knee.add(foot);

   tankLegs[key]={hip,thigh,knee,shin,foot};
 };
 makeTankLeg(-1,"left"); makeTankLeg(1,"right");
 this.cleanTankLegs=tankLegs;

 // SIMPLE RIFLE, PHYSICALLY PARENTED TO THE RIGHT HAND.
 const rifle=new THREE.Group();
 tankArms.right.hand.add(rifle);
 // Rifle is authored along -Z, which is TITAN forward. Keep it aligned directly
 // with the hand instead of rotating it out of the palm.
 rifle.position.set(0,-.02,-.34);
 rifle.rotation.set(0,0,0);
 const recv=mkBox(.34,.34,.82,tankGunMat); recv.position.z=-.30; rifle.add(recv);
 const tankBarrel=mkBox(.14,.14,.72,tankGunMat); tankBarrel.position.z=-1.05; rifle.add(tankBarrel);
 const grip=mkBox(.15,.34,.18,tankGunMat); grip.position.set(0,-.27,-.24); rifle.add(grip);
 const cleanTankMuzzle=new THREE.Object3D(); cleanTankMuzzle.position.set(0,0,-1.46); rifle.add(cleanTankMuzzle);
 this.cleanTankGun=rifle; this.cleanTankMuzzle=cleanTankMuzzle;
 this.cleanTankRig={root:tankRoot,torso:tankTorso,head:tankHead,arms:tankArms,legs:tankLegs,rifle};
 this.bodyDismemberRoots.head=tankHead;
 this.bodyDismemberRoots.leftArm=tankArms.left.shoulder; this.bodyDismemberRoots.rightArm=tankArms.right.shoulder;
 this.bodyDismemberRoots.leftLeg=tankLegs.left.hip; this.bodyDismemberRoots.rightLeg=tankLegs.right.hip;
 this.bodyDismemberRoots.torsoUpper=[tankTorso]; this.bodyDismemberRoots.torsoLower=[];

 // Standing floor calibration from actual rendered bounds. This keeps feet above
 // the ground regardless of later body proportion changes.
 const cleanTankStandingBox=new THREE.Box3().setFromObject(tankRoot);
 if(Number.isFinite(cleanTankStandingBox.min.y)){
   const desiredFootClearance=.025;
   tankRoot.position.y+=desiredFootClearance-cleanTankStandingBox.min.y;
   this.cleanTankStandingOffset=tankRoot.position.y;
 }
 // ---------------------------------------------------------------------------

this.group.position.copy(this.homePosition);
 this.group.rotation.y=this.homeYaw;
 const aScale=this.archetypeProfile?.scale??[1,1,1];
 this.group.scale.set(aScale[0],aScale[1],aScale[2]);
 // Visor-linked in-world identity plate.
 const npCanvas=document.createElement("canvas");
 npCanvas.width=512;npCanvas.height=96;
 const np=npCanvas.getContext("2d");
 np.clearRect(0,0,512,96);
 np.fillStyle="rgba(4,10,13,.72)";
 np.fillRect(26,15,460,66);
 np.strokeStyle="rgba(255,204,82,.90)";
 np.lineWidth=3;
 np.strokeRect(26,15,460,66);
 np.fillStyle="#ffe394";
 np.font="700 26px Arial";
 np.textAlign="center";
 np.fillText(this.enemyName.toUpperCase(),256,48);
 np.fillStyle="rgba(213,239,244,.88)";
 np.font="700 15px Arial";
 np.fillText(`${this.displayRole} // ${this.callSign}`,256,70);

 const npTex=new THREE.CanvasTexture(npCanvas);
 npTex.colorSpace=THREE.SRGBColorSpace;
 const npMat=new THREE.SpriteMaterial({
   map:npTex,
   transparent:true,
   depthTest:false,
   depthWrite:false
 });
 this.nameplate=new THREE.Sprite(npMat);
 this.nameplate.scale.set(2.85,.54,1);
 this.nameplate.position.set(0,4.78,0);
 this.nameplate.visible=false;
 this.nameplate.renderOrder=1001;
 this.group.add(this.nameplate);


 this.group.traverse(o=>{
   if(o.isMesh){
     o.castShadow=true;
     o.userData.titan=this;
   }
 });


 // -------------------------------------------------------
 // ENEMY RIFLE — simple but physically visible.
 // -------------------------------------------------------
 const enemyGunMat=new THREE.MeshStandardMaterial({
   color:0x66717a,
   metalness:.88,
   roughness:.22,
   emissive:0x11181d,
   emissiveIntensity:.38
 });

 this.enemyRifle=new THREE.Group();
 this.enemyRifle.position.set(.72,1.96,-.72);
 this.enemyRifle.rotation.set(-.055,-.045,-.055);
 this.group.add(this.enemyRifle);

 const receiver=new THREE.Mesh(
   new THREE.BoxGeometry(.36,.30,1.52),
   enemyGunMat
 );
 receiver.position.z=-.62;
 this.enemyRifle.add(receiver);

 const stockMat=new THREE.MeshStandardMaterial({
   color:0x252b30,metalness:.48,roughness:.46
 });
 const stockBody=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.62),stockMat);
 stockBody.position.set(0,-.02,.48);
 stockBody.rotation.x=-.08;
 this.enemyRifle.add(stockBody);

 const stockNeck=new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.42),stockMat);
 stockNeck.position.set(0,-.01,.10);
 this.enemyRifle.add(stockNeck);

 const buttPad=new THREE.Mesh(new THREE.BoxGeometry(.48,.50,.14),stockMat);
 buttPad.position.set(0,-.02,.84);
 buttPad.rotation.x=-.10;
 this.enemyRifle.add(buttPad);

 const cheekRest=new THREE.Mesh(new THREE.BoxGeometry(.34,.13,.46),stockMat);
 cheekRest.position.set(0,.24,.43);
 this.enemyRifle.add(cheekRest);

 const barrel=new THREE.Mesh(
   new THREE.CylinderGeometry(.052,.052,1.36,10),
   enemyGunMat
 );
 barrel.rotation.x=Math.PI/2;
 barrel.position.z=-1.95;
 this.enemyRifle.add(barrel);
 const muzzleHousing=new THREE.Mesh(
   new THREE.BoxGeometry(.20,.17,.32),
   new THREE.MeshStandardMaterial({
     color:0x9aa4ac,
     metalness:.92,
     roughness:.16,
     emissive:0x3a1d08,
     emissiveIntensity:.50
   })
 );
 muzzleHousing.position.z=-2.50;
 this.enemyRifle.add(muzzleHousing);

 const enemyGunLamp=new THREE.Mesh(
   new THREE.SphereGeometry(.055,8,6),
   new THREE.MeshBasicMaterial({color:0xff3a18})
 );
 enemyGunLamp.position.set(.18,.14,-1.62);
 this.enemyRifle.add(enemyGunLamp);

 this.enemyMuzzle=new THREE.Object3D();
 this.enemyMuzzle.position.set(0,0,-2.72);
 this.enemyRifle.add(this.enemyMuzzle);

 // Clean tank owns the visible weapon. Keep the legacy rifle alive only as the
 // ballistic muzzle/reference transform until weapon firing is migrated.
 if(this.cleanTankGun)this.enemyRifle.visible=false;
 if(this.cleanTankMuzzle)this.enemyMuzzle=this.cleanTankMuzzle;

 if(this.archetypeProfile?.weapon==="knife"){
   this.enemyRifle.visible=false;
   this.enemyKnife=new THREE.Group();
   this.enemyKnife.position.set(.58,1.72,-.36);
   this.enemyKnife.rotation.set(.12,-.20,-.22);
   const grip=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.42),new THREE.MeshStandardMaterial({color:0x17191b,roughness:.58,metalness:.28}));
   grip.position.z=.16;this.enemyKnife.add(grip);
   const blade=new THREE.Mesh(new THREE.BoxGeometry(.065,.035,.62),new THREE.MeshStandardMaterial({color:0xc7d0d5,roughness:.18,metalness:.94}));
   blade.position.z=-.34;this.enemyKnife.add(blade);
   this.group.add(this.enemyKnife);
 }

 // Separate raycast layers: armor first, body second.
 this.armorRaycastObjects=[];
 this.bodyRaycastObjects=[];

 this.group.traverse(o=>{
   if(!o.isMesh)return;
   if(o.userData.combatIgnore)return;

   const z=o.userData.zone;

   if(
     o.userData.isArmorObject ||
     o.userData.armorShellPart ||
     o.userData.isArmorHitbox
   ){
     this.armorRaycastObjects.push(o);
   }else{
     this.bodyRaycastObjects.push(o);
   }
 });

 // Prebuild detachable helmet/chest visuals before gameplay.
 this.cacheDetachVisual("head",this.head);
 this.cacheDetachVisual("helmetBrow",this.helmetBrow);
 this.cacheDetachVisual("chest",this.chest);

 scene.add(this.group);
}

refreshWorldOccluders(){
 this.worldOccluders=[];
 this.worldRoot?.updateMatrixWorld?.(true);
 this.worldRoot?.traverse?.(o=>{
   if(!o.isMesh)return;
   if(o.userData?.isBuildingWall || o.userData?.blocksBullets){
     if(!o.userData.cachedCollisionBox){
       o.userData.cachedCollisionBox=new THREE.Box3().setFromObject(o);
       o.userData.cachedCollisionCenter=o.userData.cachedCollisionBox.getCenter(new THREE.Vector3());
     }
     this.worldOccluders.push(o);
   }
 });
}

hasLineOfSight(){
 const eye=this.group.position.clone().add(new THREE.Vector3(0,3.15,0));
 const target=this.player.group.position.clone().add(new THREE.Vector3(0,1.72,0));
 const delta=target.clone().sub(eye), distance=delta.length();
 if(distance<.01)return true;
 this.losRaycaster.set(eye,delta.normalize());
 this.losRaycaster.far=Math.max(0,distance-.35);
 const hits=this.losRaycaster.intersectObjects(this.worldOccluders,false);
 return !hits.some(h=>h.object.visible!==false);
}

enforceBaseBodyShowcase(){
 if(!this.baseBodyShowcase)return;
 for(const root of this.legacyVisualRoots??[]){
   root.visible=false;
   root.traverse?.(o=>{if(o.isMesh)o.visible=false;});
 }
 for(const mesh of this.baseBodyMeshes??[]){
   // Detached/dismembered pieces are allowed to remain detached; do not resurrect them.
   if(!mesh.userData?.detachedBodyPart)mesh.visible=true;
 }
}

resolveEnemyWorldCollision(previousPosition){
 const radius=.72, y=this.group.position.y+1.45;
 for(const wall of this.worldOccluders){
   if(!wall.visible || !wall.userData?.isBuildingWall)continue;
   const box=wall.userData.cachedCollisionBox; if(!box)continue;
   const p=this.group.position;
   if(y<box.min.y || y>box.max.y)continue;
   if(p.x>=box.min.x-radius && p.x<=box.max.x+radius && p.z>=box.min.z-radius && p.z<=box.max.z+radius){
     this.group.position.copy(previousPosition);
     this.linearImpulse.set(0,0,0);
     return true;
   }
 }
 return false;
}

updateMannequinPose(dt){
 // PASS 08: clean tank owns presentation. No legacy pose code runs.
 if(this.cleanTankRig){
   // DeathPerformance becomes the sole owner of the body once vitality reaches zero.
   // This prevents walking knees/arms from continuing underneath a corpse.
   if(!this.alive)return;
   const r=this.cleanTankRig;
   this.walkPhase=(this.walkPhase??0)+dt*(this.awake?5.0:1.0);
   const phase=this.walkPhase;
   const moving=this.awake && this.speed>.05;
   const stride=moving?Math.sin(phase)*.28:0;
   const liftL=moving?Math.max(0,Math.sin(phase)):0;
   const liftR=moving?Math.max(0,Math.sin(phase+Math.PI)):0;
   const damp=(a,b,k=12)=>THREE.MathUtils.lerp(a,b,1-Math.exp(-k*dt));

   // Wide, heavy stomp. Hips swing; knees only bend backward.
   const L=r.legs.left,R=r.legs.right;
   L.hip.rotation.x=damp(L.hip.rotation.x,stride);
   R.hip.rotation.x=damp(R.hip.rotation.x,-stride);
   L.hip.rotation.z=damp(L.hip.rotation.z,.02);
   R.hip.rotation.z=damp(R.hip.rotation.z,-.02);
   L.knee.rotation.x=damp(L.knee.rotation.x,-liftL*.52);
   R.knee.rotation.x=damp(R.knee.rotation.x,-liftR*.52);

   // Two huge arms, simple elbows. Right hand owns gun.
   const LA=r.arms.left,RA=r.arms.right;
   RA.shoulder.rotation.x=damp(RA.shoulder.rotation.x,.92);
   RA.shoulder.rotation.y=damp(RA.shoulder.rotation.y,.08);
   RA.shoulder.rotation.z=damp(RA.shoulder.rotation.z,-.10);
   RA.elbow.rotation.x=damp(RA.elbow.rotation.x,1.00);

   LA.shoulder.rotation.x=damp(LA.shoulder.rotation.x,.88);
   LA.shoulder.rotation.y=damp(LA.shoulder.rotation.y,-.08);
   LA.shoulder.rotation.z=damp(LA.shoulder.rotation.z,.14);
   LA.elbow.rotation.x=damp(LA.elbow.rotation.x,1.04);

   r.torso.rotation.z=damp(r.torso.rotation.z,moving?Math.sin(phase*.5)*.012:0,8);
   if(this.player?.group&&this.cleanTankGun){
     const gw=this._cleanGunWorld??(this._cleanGunWorld=new THREE.Vector3()),tw=this._cleanGunTarget??(this._cleanGunTarget=new THREE.Vector3()),op=this._cleanGunOpposite??(this._cleanGunOpposite=new THREE.Vector3());
     this.cleanTankGun.getWorldPosition(gw);tw.copy(this.player.group.position);tw.y+=1.55;op.copy(gw).multiplyScalar(2).sub(tw);this.cleanTankGun.lookAt(op);
   }
   return;
 }

 // v7.6.2 FULL MANNEQUIN MOTION LAYER
 // A reusable procedural pose layer for rifle locomotion, aiming and two-handed melee.
 // It deliberately animates JOINTS, not mesh positions: hips, knees, ankles, lumbar,
 // rib cage, shoulders, elbows and wrists all contribute to a single pose.
 if(!this.alive || !this.armRigs || !this.legRigs)return;
 const speedNow=this.speed||0;
 const moving=speedNow>.20 && (this.aiBlackboard?.state!=="search_last_seen");
 const run01=THREE.MathUtils.clamp(speedNow/Math.max(.1,this.baseSpeed),0,1);
 this.locomotionClock+=(moving?(5.4+run01*2.6):1.8)*dt;
 const phase=this.locomotionClock;
 const stride=moving?Math.sin(phase)*(.34+.20*run01):0;
 const liftL=moving?Math.max(0,Math.sin(phase)):.0;
 const liftR=moving?Math.max(0,-Math.sin(phase)):.0;
 const L=this.legRigs.left,R=this.legRigs.right;
 const damp=(v,t,l=13)=>THREE.MathUtils.damp(v,t,l,dt);
 if(L&&R){
   // Heavy stomp: restrained stride keeps thick legs from visually crossing.
   L.upperPivot.rotation.x=damp(L.upperPivot.rotation.x,stride*.62);
   R.upperPivot.rotation.x=damp(R.upperPivot.rotation.x,-stride*.62);
   L.upperPivot.rotation.z=damp(L.upperPivot.rotation.z,.035);
   R.upperPivot.rotation.z=damp(R.upperPivot.rotation.z,-.035);
   // Same hinge convention as the player mannequin: knee bends backward toward +Z.
   L.kneePivot.rotation.x=damp(L.kneePivot.rotation.x,-liftL*(.58+.22*run01));
   R.kneePivot.rotation.x=damp(R.kneePivot.rotation.x,-liftR*(.58+.22*run01));
   L.lowerPivot.rotation.x=damp(L.lowerPivot.rotation.x,0);
   R.lowerPivot.rotation.x=damp(R.lowerPivot.rotation.x,0);
   L.anklePivot.rotation.x=damp(L.anklePivot.rotation.x,-stride*.24+liftL*.20);
   R.anklePivot.rotation.x=damp(R.anklePivot.rotation.x,stride*.24+liftR*.20);
   L.upperPivot.rotation.z=damp(L.upperPivot.rotation.z,moving?-.025:0);
   R.upperPivot.rotation.z=damp(R.upperPivot.rotation.z,moving?.025:0);
 }
 const LA=this.armRigs.left,RA=this.armRigs.right;
 const melee=this.archetypeProfile?.weapon==="knife";
 const inMelee=melee && this.attackCooldown>.55;
 this.meleePoseClock=damp(this.meleePoseClock,inMelee?1:0,11);
 if(melee){
   // Guard -> committed diagonal swing. Both clavicle/shoulder and elbow participate.
   const a=this.meleePoseClock;
   RA.shoulderPivot.rotation.x=damp(RA.shoulderPivot.rotation.x,THREE.MathUtils.lerp(-.25,-1.42,a));
   RA.shoulderPivot.rotation.y=damp(RA.shoulderPivot.rotation.y,THREE.MathUtils.lerp(-.20,.48,a));
   RA.shoulderPivot.rotation.z=damp(RA.shoulderPivot.rotation.z,THREE.MathUtils.lerp(-.18,-.62,a));
   RA.elbowPivot.rotation.x=damp(RA.elbowPivot.rotation.x,THREE.MathUtils.lerp(-.72,-.20,a));
   RA.wristPivot.rotation.z=damp(RA.wristPivot.rotation.z,THREE.MathUtils.lerp(.10,-.42,a));
   LA.shoulderPivot.rotation.x=damp(LA.shoulderPivot.rotation.x,moving?-stride*.42:.12);
   LA.elbowPivot.rotation.x=damp(LA.elbowPivot.rotation.x,-.18);
 }else{
   // PASS 07 WALKING TANK: intentionally simple, stable two-hand forward guard.
   // Avoid clever offsets until the shared combat rig is proven.
   const bob=moving?Math.sin(phase*2)*.018:0;

   LA.shoulderPivot.rotation.x=damp(LA.shoulderPivot.rotation.x,.12+bob);
   RA.shoulderPivot.rotation.x=damp(RA.shoulderPivot.rotation.x,.12+bob);
   LA.shoulderPivot.rotation.y=damp(LA.shoulderPivot.rotation.y,-.08);
   RA.shoulderPivot.rotation.y=damp(RA.shoulderPivot.rotation.y,.08);
   LA.shoulderPivot.rotation.z=damp(LA.shoulderPivot.rotation.z,.08);
   RA.shoulderPivot.rotation.z=damp(RA.shoulderPivot.rotation.z,-.08);

   LA.upperTwist.rotation.x=damp(LA.upperTwist.rotation.x,.72);
   RA.upperTwist.rotation.x=damp(RA.upperTwist.rotation.x,.72);
   LA.upperTwist.rotation.z=damp(LA.upperTwist.rotation.z,.18);
   RA.upperTwist.rotation.z=damp(RA.upperTwist.rotation.z,-.18);

   LA.elbowPivot.rotation.x=damp(LA.elbowPivot.rotation.x,-.88);
   RA.elbowPivot.rotation.x=damp(RA.elbowPivot.rotation.x,-.88);
   LA.elbowPivot.rotation.y=damp(LA.elbowPivot.rotation.y,0);
   RA.elbowPivot.rotation.y=damp(RA.elbowPivot.rotation.y,0);
   LA.wristPivot.rotation.x=damp(LA.wristPivot.rotation.x,0);
   RA.wristPivot.rotation.x=damp(RA.wristPivot.rotation.x,0);
   LA.wristPivot.rotation.z=damp(LA.wristPivot.rotation.z,0);
   RA.wristPivot.rotation.z=damp(RA.wristPivot.rotation.z,0);
 }
 // Small counter-rotation through the hips/spine keeps running from looking robotic.
 if(this.poseRig){
   this.poseRig.pelvis.rotation.y+=moving?Math.sin(phase)*.035:0;
   this.poseRig.abdomen.rotation.y-=moving?Math.sin(phase)*.025:0;
   this.poseRig.ribcage.rotation.z+=moving?Math.sin(phase)*.012:0;
 }
}

updateReactionRig(dt){
 const r=this.reactionRig;if(!r)return;

 // Deliberately exaggerated test rig. Fast local limb motion, slower torso/pelvis follow-through.
 const limbDecay=Math.exp(-14.0*dt);
 const torsoDecay=Math.exp(-3.8*dt);
 const pelvisDecay=Math.exp(-3.0*dt);
 const rootDecay=Math.exp(-4.4*dt);

 for(const side of ["leftShoulder","rightShoulder"]){
   r[side].kick*=limbDecay;r[side].yaw*=limbDecay;r[side].roll*=limbDecay;
 }
 r.torsoYaw*=torsoDecay;r.torsoRoll*=torsoDecay;r.torsoPitch*=torsoDecay;
 r.pelvisYaw*=pelvisDecay;r.pelvisRoll*=pelvisDecay;
 r.leftLegKick*=limbDecay;r.rightLegKick*=limbDecay;
 r.leftKneeBend*=limbDecay;r.rightKneeBend*=limbDecay;
 r.leftLegRoll*=limbDecay;r.rightLegRoll*=limbDecay;
 r.rootKickX*=rootDecay;r.rootKickZ*=rootDecay;r.rootYaw*=rootDecay;
 r.hitPulse=Math.max(0,r.hitPulse-dt);

 const lArm=this.armRigs?.left?.shoulderPivot;
 const rr=this.armRigs?.right?.shoulderPivot;
 if(lArm){lArm.rotation.x+=r.leftShoulder.kick;lArm.rotation.y+=r.leftShoulder.yaw;lArm.rotation.z+=r.leftShoulder.roll;}
 if(rr){rr.rotation.x+=r.rightShoulder.kick;rr.rotation.y+=r.rightShoulder.yaw;rr.rotation.z+=r.rightShoulder.roll;}

 // Natural look chain: the rib cage carries most vertical aim, lumbar follows,
 // and the neck/head finishes the motion. Reaction offsets are layered on top.
 if(this.poseRig){
   const eye=this.group.position.y+3.45;
   const targetY=(this.player?.group?.position?.y??0)+1.62;
   const dx=(this.player?.group?.position?.x??this.group.position.x)-this.group.position.x;
   const dz=(this.player?.group?.position?.z??this.group.position.z)-this.group.position.z;
   const planar=Math.max(.5,Math.hypot(dx,dz));
   this.poseRig.targetLookPitch=THREE.MathUtils.clamp(-Math.atan2(targetY-eye,planar),-.48,.58);
   this.poseRig.lookPitch=THREE.MathUtils.damp(this.poseRig.lookPitch,this.poseRig.targetLookPitch,7.5,dt);
   const look=this.poseRig.lookPitch;
   this.poseRig.pelvis.rotation.set(0,r.pelvisYaw*.22,r.pelvisRoll*.20);
   this.poseRig.abdomen.rotation.set(look*.22,r.pelvisYaw*.58,r.pelvisRoll*.62);
   this.poseRig.ribcage.rotation.set(look*.54+r.torsoPitch,r.torsoYaw,r.torsoRoll);
   this.poseRig.neck.rotation.set(look*.24,0,0);
 }

 const ll=this.legRigs?.left,rl=this.legRigs?.right;
 if(ll){
   ll.upperPivot.rotation.x=r.leftLegKick;
   ll.upperPivot.rotation.z=r.leftLegRoll;
   ll.kneePivot.rotation.x=r.leftKneeBend;
 }
 if(rl){
   rl.upperPivot.rotation.x=r.rightLegKick;
   rl.upperPivot.rotation.z=r.rightLegRoll;
   rl.kneePivot.rotation.x=r.rightKneeBend;
 }

 // Whole-body recoil makes the response impossible to miss while testing.
 if(this.alive && r.hitPulse>0){
   this.group.rotation.x=THREE.MathUtils.lerp(this.group.rotation.x,r.rootKickZ*.16,.35);
   this.group.rotation.z=THREE.MathUtils.lerp(this.group.rotation.z,-r.rootKickX*.18,.35);
   this.group.rotation.y+=r.rootYaw*dt*3.2;
 }
}

applyRigImpact(zone,damage,shotDirection){
 const r=this.reactionRig;if(!r)return;
 const dir=shotDirection?.clone?.().normalize?.()??new THREE.Vector3(0,0,1);
 const inv=this.group.getWorldQuaternion(new THREE.Quaternion()).invert();
 const local=dir.clone().applyQuaternion(inv);

 // EXTREME test gain: prove the articulation first, then reduce.
 const force=THREE.MathUtils.clamp((damage/24)*2.25,1.25,4.25);
 r.hitPulse=.42;
 r.rootKickX+=local.x*.32*force;
 r.rootKickZ+=local.z*.30*force;
 r.rootYaw+=local.x*.18*force;

 if(zone==="leftShoulder"||zone==="rightShoulder"){
   const left=zone==="leftShoulder", sh=left?r.leftShoulder:r.rightShoulder, sign=left?-1:1;

   // Shoulder is the primary mover. Sign is based on actual hit side, not a fixed global lean.
   sh.kick+=(-local.z*.62-local.y*.20)*force;
   sh.yaw+=(local.x*.58+sign*.34)*force;
   sh.roll+=(-sign*.86+local.x*.22)*force;

   // Torso follows the struck shoulder in the same kinetic chain.
   r.torsoYaw+=sign*.46*force+local.x*.22*force;
   r.torsoRoll+=-sign*.44*force;
   r.torsoPitch+=-local.z*.22*force;

   // Pelvis lags with smaller counter-balance.
   r.pelvisYaw+=sign*.15*force;
   r.pelvisRoll+=-sign*.13*force;
 }else if(zone==="leftKnee"||zone==="rightKnee"){
   const left=zone==="leftKnee";
   if(left){r.leftKneeBend+=1.15*force;r.leftLegKick+=.38*force;r.leftLegRoll-=.30*force;}
   else{r.rightKneeBend+=1.15*force;r.rightLegKick+=.38*force;r.rightLegRoll+=.30*force;}
   r.pelvisRoll+=(left?-.24:.24)*force;
   r.torsoRoll+=(left?-.30:.30)*force;
   r.torsoPitch+=.12*force;
   this.staggerTimer=Math.max(this.staggerTimer,1.05);
 }else if(zone==="leftLeg"||zone==="rightLeg"){
   const left=zone==="leftLeg";
   if(left){r.leftLegKick+=.72*force;r.leftLegRoll-=.38*force;r.leftKneeBend+=.38*force;}
   else{r.rightLegKick+=.72*force;r.rightLegRoll+=.38*force;r.rightKneeBend+=.38*force;}
   r.pelvisRoll+=(left?-.18:.18)*force;
   r.torsoRoll+=(left?-.20:.20)*force;
 }else if(zone==="head"){
   r.torsoPitch+=-local.z*.42*force;
   r.torsoYaw+=local.x*.32*force;
   r.torsoRoll+=-local.x*.28*force;
   if(this.poseRig?.neck){
     this.poseRig.neck.rotation.x+=-local.z*.18*force;
     this.poseRig.neck.rotation.z+=-local.x*.16*force;
   }
 }else{
   r.torsoPitch+=-local.z*.30*force;
   r.torsoYaw+=local.x*.25*force;
   r.torsoRoll+=-local.x*.20*force;
   r.pelvisYaw+=local.x*.08*force;
 }

 // Huge but bounded prototype limits.
 r.torsoYaw=THREE.MathUtils.clamp(r.torsoYaw,-1.05,1.05);
 r.torsoRoll=THREE.MathUtils.clamp(r.torsoRoll,-.90,.90);
 r.torsoPitch=THREE.MathUtils.clamp(r.torsoPitch,-.80,.80);
 r.pelvisYaw=THREE.MathUtils.clamp(r.pelvisYaw,-.42,.42);
 r.pelvisRoll=THREE.MathUtils.clamp(r.pelvisRoll,-.42,.42);
 for(const side of ["leftShoulder","rightShoulder"]){
   r[side].kick=THREE.MathUtils.clamp(r[side].kick,-1.25,1.25);
   r[side].yaw=THREE.MathUtils.clamp(r[side].yaw,-1.35,1.35);
   r[side].roll=THREE.MathUtils.clamp(r[side].roll,-1.45,1.45);
 }
 r.leftKneeBend=THREE.MathUtils.clamp(r.leftKneeBend,0,1.65);
 r.rightKneeBend=THREE.MathUtils.clamp(r.rightKneeBend,0,1.65);
}


enforceCorpseGroundContact(){
 const d=this.deathPerformance;
 if(!d)return;

 // Reuse the existing Box3 object so this safety check creates no per-frame geometry.
 const box=this.deathGroundBox ?? (this.deathGroundBox=new THREE.Box3());
 const target=this.cleanTankRoot?.visible ? this.cleanTankRoot : this.group;
 box.setFromObject(target);

 if(!Number.isFinite(box.min.y))return;

 // groundY is the enemy root's standing floor reference captured at death start.
 // Small clearance prevents z-fighting without visually hovering.
 const floorY=(d.groundY??d.startPos?.y??0)+.015;
 if(box.min.y<floorY){
   const correction=floorY-box.min.y;
   // Hard correction: no corpse body part is allowed below the floor.
   this.group.position.y+=correction;
   this.deathGroundCorrection=(this.deathGroundCorrection??0)+correction;
 }
}

beginDeathPerformance(shotDirection=new THREE.Vector3(0,0,1),hitPoint=null,zone="body",quality="LETHAL"){
 if(this.deathPerformance)return;

 const dir=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 const inv=this.group.getWorldQuaternion(new THREE.Quaternion()).invert();
 const localDir=dir.clone().applyQuaternion(inv);

 // FIX 4.7.0: these were accidentally referenced without being declared in 4.6.9,
 // which aborted death setup BEFORE weapon drop / fall performance.
 const side=Math.abs(localDir.x)>.34;
 const directional=side
   ?(localDir.x>0?"fallRight":"fallLeft")
   :(localDir.z<0?"fallBack":"fallForward");

 const allStyles=[
   "fallBack","fallForward","fallLeft","fallRight",
   "fallForwardLeft","fallForwardRight","fallBackLeft","fallBackRight"
 ];
 let style;

 // Direction matters, but does not force the same death every time.
 const r=Math.random();
 if(r<.42){
   style=directional;
 }else{
   const alternatives=allStyles.filter(x=>x!==directional);
   style=alternatives[(Math.random()*alternatives.length)|0];
 }

 // Exposed headshots favor violent backward/side collapse, but still vary.
 if(zone==="head"){
   const headRoll=Math.random();
   if(headRoll<.44)style="fallBack";
   else if(headRoll<.68)style="fallLeft";
   else if(headRoll<.92)style="fallRight";
   else style="fallForward";
 }

 const startPos=this.group.position.clone();
 const startRot=this.group.rotation.clone();
 const headStart=this.skull?.rotation?.clone?.() ?? new THREE.Euler();
 const helmetStart=this.head?.rotation?.clone?.() ?? new THREE.Euler();
 const chestStart=this.chest?.rotation?.clone?.() ?? new THREE.Euler();

 // Three readable collapse families:
 // knee = obvious knee buckle;
 // direct = immediate upper-body failure;
 // stumble = a short off-balance transition before the fall.
 const collapseRoll=Math.random();
 const collapseMode=
   zone==="head"
   ?(collapseRoll<.82?"knee":collapseRoll<.92?"stumble":"direct")
   :(collapseRoll<.62?"knee":collapseRoll<.82?"direct":"stumble");

 let kneeMode="none";
 if(collapseMode==="knee"){
   kneeMode=Math.random()<.5?"left":"right";
 }

 if(this.nameplate)this.nameplate.visible=false;

 this.deathPerformance={
   time:0,
   groundY:startPos.y,
   duration:zone==="head"
     ?((this.archetype==="heavy"?2.18:1.96)+Math.random()*.24)
     :collapseMode==="direct"
     ?(1.10+Math.random()*.20)
     :((this.archetype==="heavy"?1.82:1.58)+Math.random()*.26),
   style,
   direction:dir,
   localDir,
   startPos,
   startRot,
   headStart,
   helmetStart,
   chestStart,
   zone,
   quality,
   kneeDepth:collapseMode==="knee"?(.34+Math.random()*.22):(.10+Math.random()*.12),
   kneeMode,
   collapseMode,
   fallAmount:1.08+Math.random()*.30,
   twist:(Math.random()-.5)*.42,

   // Weight simulation state. Not a canned frame count: once support is lost,
   // angular speed builds as the center of mass tips farther outside the base.
   fallProgress:0,
   angularSpeed:0,
   angularAccel:this.archetype==="heavy"?.78:1.02,
   bodyMass:this.archetype==="heavy"?1.45:1.0
 };

 // Weapon drop is guaranteed at death start.
 this.linearImpulse.set(0,0,0);
 this.angularImpulse.set(0,0,0);
 this.dropWeapon(dir);

 console.info("[TITAN DEATH]",{
   zone,
   quality,
   style,
   collapseMode,
   kneeMode,
   weaponDropped:this.weaponDropped
 });
}

updateDeathPerformance(dt){
 const d=this.deathPerformance;
 if(!d || this.deathSettled)return;

 d.time+=dt;
 const t=d.time;
 const total=d.duration;

 // Phase 1: 0–~0.14s — sharp hit performance. Head and upper torso react first.
 const hitEnd=d.zone==="head"?.22:.16;

 // v4.7.3 WEIGHT PASS: reach the kneel, HOLD it, then commit to the fall.
 const kneeReachEnd=
   d.zone==="head" && d.collapseMode==="knee" ?.74:
   d.collapseMode==="knee" ?.58:
   d.collapseMode==="stumble" ?.42:.26;

 const kneeHoldEnd=
   d.zone==="head" && d.collapseMode==="knee"
     ?(this.archetype==="heavy"?1.42:1.27)
     :d.collapseMode==="knee"
     ?(this.archetype==="heavy"?1.10:.94)
     :kneeReachEnd;

 const fallEnd=total;

 const smooth=(x)=>x*x*(3-2*x);
 const clamp01=(x)=>THREE.MathUtils.clamp(x,0,1);

 if(t<=hitEnd){
   const a=smooth(clamp01(t/hitEnd));
   const headSign=d.localDir.z<0?-1:1;
   const yawSign=d.localDir.x>=0?1:-1;

   if(this.skull?.visible){
     this.skull.rotation.x=d.headStart.x-headSign*a*.58;
     this.skull.rotation.z=d.headStart.z-yawSign*a*.24;
   }
   if(this.head?.visible){
     this.head.rotation.x=d.helmetStart.x-headSign*a*.30;
     this.head.rotation.z=d.helmetStart.z-yawSign*a*.12;
   }
   if(this.chest?.visible){
     this.chest.rotation.x=d.chestStart.x-headSign*a*.11;
     this.chest.rotation.z=d.chestStart.z-yawSign*a*.055;
   }
   this.group.position.copy(d.startPos).addScaledVector(d.direction,-.10*a);
   this.enforceCorpseGroundContact();
   return;
 }

 // Hold part of the head snap while the legs give way.
 if(t<=kneeHoldEnd){
   const a=smooth(clamp01((t-hitEnd)/(kneeReachEnd-hitEnd)));
   const headSign=d.localDir.z<0?-1:1;
   const yawSign=d.localDir.x>=0?1:-1;

   // Head/upper torso reaction continues while the lower body folds underneath.
   if(this.skull?.visible){
     this.skull.rotation.x=THREE.MathUtils.lerp(
       d.headStart.x-headSign*.58,
       d.headStart.x+headSign*.10,
       a
     );
     this.skull.rotation.z=THREE.MathUtils.lerp(
       d.headStart.z-yawSign*.24,
       d.headStart.z-yawSign*.08,
       a
     );
   }

   // REAL KNEEL SILHOUETTE:
   // thighs remain elevated/forward, knees fold, shins rotate back/down toward floor.
   const ll=this.legRigs?.left;
   const rr=this.legRigs?.right;

   let leftKnee=0,rightKnee=0,leftThigh=0,rightThigh=0,leftShin=0,rightShin=0;
   if(d.collapseMode==="knee"){
     if(d.kneeMode==="left"){
       leftKnee=1.46; leftThigh=-.48; leftShin=-1.18;
       rightKnee=.82; rightThigh=-.26; rightShin=-.74;
     }else{
       rightKnee=1.46; rightThigh=-.48; rightShin=-1.18;
       leftKnee=.82; leftThigh=-.26; leftShin=-.74;
     }
   }else if(d.collapseMode==="stumble"){
     leftKnee=.42; rightKnee=.36;
     leftThigh=-.12; rightThigh=-.10;
     leftShin=-.34; rightShin=-.30;
   }else{
     leftKnee=.20; rightKnee=.18;
     leftShin=-.16; rightShin=-.14;
   }

   if(ll){
     ll.upperPivot.rotation.x=THREE.MathUtils.lerp(0,leftThigh,a);
     ll.kneePivot.rotation.x=THREE.MathUtils.lerp(0,leftKnee,a);
     ll.lowerPivot.rotation.x=THREE.MathUtils.lerp(0,leftShin,a);
     ll.upperPivot.rotation.z=THREE.MathUtils.lerp(0,d.kneeMode==="left"?-.10:.02,a);
   }
   if(rr){
     rr.upperPivot.rotation.x=THREE.MathUtils.lerp(0,rightThigh,a);
     rr.kneePivot.rotation.x=THREE.MathUtils.lerp(0,rightKnee,a);
     rr.lowerPivot.rotation.x=THREE.MathUtils.lerp(0,rightShin,a);
     rr.upperPivot.rotation.z=THREE.MathUtils.lerp(0,d.kneeMode==="right"?.10:-.02,a);
   }

   // CLEAN TANK KNEEL: this is the visible body now.
   const cleanL=this.cleanTankRig?.legs?.left;
   const cleanR=this.cleanTankRig?.legs?.right;
   if(cleanL&&cleanR){
     let lK=.18,rK=.18,lHip=.05,rHip=.05;
     if(d.collapseMode==="knee"){
       if(d.kneeMode==="left"){
         lK=1.48;rK=1.08;lHip=.42;rHip=.30;
       }else{
         rK=1.48;lK=1.08;rHip=.42;lHip=.30;
       }
     }else if(d.collapseMode==="stumble"){
       lK=.45;rK=.38;lHip=.12;rHip=.10;
     }

     // Negative X is the same backward-knee convention used by living locomotion.
     cleanL.hip.rotation.x=THREE.MathUtils.lerp(0,lHip,a);
     cleanR.hip.rotation.x=THREE.MathUtils.lerp(0,rHip,a);
     cleanL.knee.rotation.x=THREE.MathUtils.lerp(0,-lK,a);
     cleanR.knee.rotation.x=THREE.MathUtils.lerp(0,-rK,a);
   }

   // Arms go heavy/dead instead of trying to retain a combat pose.
   const cleanLA=this.cleanTankRig?.arms?.left;
   const cleanRA=this.cleanTankRig?.arms?.right;
   if(cleanLA&&cleanRA){
     cleanLA.shoulder.rotation.x=THREE.MathUtils.lerp(cleanLA.shoulder.rotation.x,.20,a*.55);
     cleanRA.shoulder.rotation.x=THREE.MathUtils.lerp(cleanRA.shoulder.rotation.x,.18,a*.55);
     cleanLA.elbow.rotation.x=THREE.MathUtils.lerp(cleanLA.elbow.rotation.x,.22,a*.55);
     cleanRA.elbow.rotation.x=THREE.MathUtils.lerp(cleanRA.elbow.rotation.x,.18,a*.55);
   }

   // Lower root until the bent shins visually meet the ground, but DO NOT bury body.
   const kneelDrop=d.collapseMode==="knee" ? .76 : (d.collapseMode==="stumble"?.38:.18);
   this.group.position.x=THREE.MathUtils.lerp(d.startPos.x,d.startPos.x-d.direction.x*.10,a);
   this.group.position.z=THREE.MathUtils.lerp(d.startPos.z,d.startPos.z-d.direction.z*.10,a);
   this.group.position.y=THREE.MathUtils.lerp(d.startPos.y,d.startPos.y-kneelDrop,a);

   // Quads remain visibly elevated while chest starts pitching toward eventual fall.
   if(this.chest?.visible){
     this.chest.rotation.x=THREE.MathUtils.lerp(d.chestStart.x,d.chestStart.x+(d.style==="fallForward"?.16:-.08),a);
   }

   // Full-kneel hold: a slight suspension/settle sells body mass without sinking.
   if(a>=.999 && t>kneeReachEnd){
     const holdT=THREE.MathUtils.clamp((t-kneeReachEnd)/Math.max(.001,kneeHoldEnd-kneeReachEnd),0,1);
     const settle=Math.sin(holdT*Math.PI)*.018*(this.archetype==="heavy"?1.35:1);
     this.group.position.y=(d.startPos.y-kneelDrop)-settle;
     if(this.chest?.visible)this.chest.rotation.x+=Math.sin(holdT*Math.PI)*.018;
   }

   this.enforceCorpseGroundContact();
   return;
 }

 const fallRaw=clamp01((t-kneeHoldEnd)/(fallEnd-kneeHoldEnd));

 // WEIGHT PASS: integrate angular acceleration instead of mapping time directly to pose.
 // As the center of mass tips farther, torque increases. Heavy bodies begin reluctantly
 // but become unstoppable once committed.
 const torqueGain=1.0+d.fallProgress*2.7;
 d.angularSpeed+=d.angularAccel*torqueGain*dt/d.bodyMass;
 d.fallProgress=clamp01(d.fallProgress+d.angularSpeed*dt);
 const a=smooth(d.fallProgress);

 let targetX=d.startRot.x;
 let targetZ=d.startRot.z;

 if(d.collapseMode==="stumble"){
   this.group.position.x+=Math.sin(a*Math.PI)*(-d.direction.x*.018);
   this.group.position.z+=Math.sin(a*Math.PI)*(-d.direction.z*.028);
 }
 if(d.style==="fallBack")targetX=d.startRot.x-1.18*d.fallAmount;
 if(d.style==="fallForward")targetX=d.startRot.x+1.18*d.fallAmount;
 if(d.style==="fallLeft")targetZ=d.startRot.z+1.08*d.fallAmount;
 if(d.style==="fallRight")targetZ=d.startRot.z-1.08*d.fallAmount;
 if(d.style==="fallForwardLeft"){targetX=d.startRot.x+.94*d.fallAmount;targetZ=d.startRot.z+.82*d.fallAmount;}
 if(d.style==="fallForwardRight"){targetX=d.startRot.x+.94*d.fallAmount;targetZ=d.startRot.z-.82*d.fallAmount;}
 if(d.style==="fallBackLeft"){targetX=d.startRot.x-.94*d.fallAmount;targetZ=d.startRot.z+.82*d.fallAmount;}
 if(d.style==="fallBackRight"){targetX=d.startRot.x-.94*d.fallAmount;targetZ=d.startRot.z-.82*d.fallAmount;}

 this.group.rotation.x=THREE.MathUtils.lerp(d.startRot.x,targetX,a);
 this.group.rotation.z=THREE.MathUtils.lerp(d.startRot.z,targetZ,a);
 this.group.rotation.y=THREE.MathUtils.lerp(d.startRot.y,d.startRot.y+d.twist,a);

 // Center of mass starts moving only after the body has clearly committed.
 const massShift=a*a;
 const lateralSign=
   d.style.includes("Left")||d.style==="fallLeft" ?-1:
   d.style.includes("Right")||d.style==="fallRight" ?1:0;
 this.group.position.x+=lateralSign*.055*massShift;

 // Continue lowering while falling so the body makes contact instead of
 // rotating around a floating center.
 const corpseDrop=d.collapseMode==="knee" ? .82 : .68;
 this.group.position.y=THREE.MathUtils.lerp(
   d.startPos.y-(d.collapseMode==="knee"?.76:d.kneeDepth),
   d.startPos.y-corpseDrop,
   a
 );
 this.group.position.x=THREE.MathUtils.lerp(
   d.startPos.x-d.direction.x*.14,
   d.startPos.x-d.direction.x*.36,
   a
 );
 this.group.position.z=THREE.MathUtils.lerp(
   d.startPos.z-d.direction.z*.14,
   d.startPos.z-d.direction.z*.36,
   a
 );

 // Whatever the fall direction/rotation, the rendered body may never pass below floor.
 this.enforceCorpseGroundContact();

 if(a>=.999){
   // Do not force a guessed corpse Y after bounds correction. Freeze the final
   // weighted fall exactly where the real body first clears the floor.
   this.enforceCorpseGroundContact();
   this.deathSettled=true;

   // Snapshot corpse state: no locomotion process owns these joints from here on.
   if(this.cleanTankRig){
     this.cleanTankRig.root.updateMatrixWorld(true);
   }

   const dist=this.player?.group?.position?.distanceTo?.(this.group.position)??999;
   if(dist<22 && this.player){
     const mass=this.archetypeProfile?.reactionMass??1;
     const falloff=THREE.MathUtils.clamp(1-dist/22,0,1);
     const shake=.070*mass*falloff;
     this.player.cameraImpact.x+=(Math.random()-.5)*shake;
     this.player.cameraImpact.y+=shake*.72;
     this.player.cameraImpact.z+=(Math.random()-.5)*shake*.55;
     this.player.cameraImpactRoll+=(Math.random()-.5)*shake*.45;
   }
 }
}

 updatePassiveRoam(dt){
  if(this.behavior!=="patrol")return;
  this.roamRetarget-=dt;
  if(this.roamRetarget<=0 || this.group.position.distanceTo(this.roamTarget)<1.8){
   this.roamAngle+=.75+(Math.random()-.5)*1.5;
   const r=this.roamRadius*(.45+Math.random()*.55);
   this.roamTarget.copy(this.homePosition).add(new THREE.Vector3(Math.sin(this.roamAngle)*r,0,Math.cos(this.roamAngle)*r));
   this.roamRetarget=4+Math.random()*7;
  }
  const d=this.roamTarget.clone().sub(this.group.position);d.y=0;
  if(d.lengthSq()<.02)return;
  d.normalize();
  const previous=this.group.position.clone();
  this.group.position.addScaledVector(d,this.baseSpeed*.28*dt);
  this.resolveEnemyWorldCollision(previous);
  this.group.rotation.y=THREE.MathUtils.damp(this.group.rotation.y,Math.atan2(-d.x,-d.z),3.0,dt);
 }

 sampleHearing(dt,dist){
  this.hearingTimer-=dt;
  if(this.hearingTimer>0)return this.heardPlayer;
  this.hearingTimer=.11+Math.random()*.06;

  const ctx=this.sensoryContext?.()||{};
  const playerSpeed=this.player?.velocity?.length?.()??0;
  const run01=THREE.MathUtils.clamp(playerSpeed/7.5,0,1);
  const shot=ctx.playerGunshot?1:0;
  const sword=ctx.playerMelee?.55:0;
  const movementNoise=.12+run01*.70;
  const sourceNoise=Math.max(movementNoise,shot,sword);

  // VOIDROOM's loud wall system raises the local noise floor. This does not make guards deaf;
  // it shortens useful hearing range and makes quiet movement disappear into the music.
  const masking=THREE.MathUtils.clamp(ctx.voidroomMasking??0,0,.82);
  const rainMask=THREE.MathUtils.clamp((ctx.rainIntensity??0)*.24,0,.24);
  const effectiveNoise=sourceNoise*(1-masking)*(1-rainMask);
  const hearingRange=8+effectiveNoise*70;
  this.heardPlayer=dist<hearingRange && effectiveNoise>.12;
  if(this.heardPlayer){
   this.aiBlackboard.lastHeardPosition.copy(this.player.group.position);
   this.audioSuspicion=THREE.MathUtils.clamp(this.audioSuspicion+.34+effectiveNoise*.35,0,1);
   this.lastKnownTimer=5.5;
  }else{
   this.audioSuspicion=Math.max(0,this.audioSuspicion-.055);
  }
  return this.heardPlayer;
 }


update(dt){
 this.spawnGrace=Math.max(0,this.spawnGrace-dt);
 this.updateArmorImpactResponse(dt);
 this.updateEnemyFireFx(dt);
 this.updateMannequinPose(dt);
 this.updateReactionRig(dt);
 this.proceduralGear?.update(dt,null,this.enemyMuzzleFlashLife>0?1:0);

 if(!this.alive){
   this.updateDeathPerformance(dt);
   this.updateDetachedArmor(dt);
   this.updateSeveredBodyPieces(dt);
   this.updateDroppedWeapon(dt);
   this.updateBloodFx(dt);
   return;
 }

 this.attackCooldown=Math.max(
   0,
   this.attackCooldown-dt
 );

 this.staggerTimer=Math.max(
   0,
   this.staggerTimer-dt
 );

 this.hitRecover=Math.max(
   0,
   this.hitRecover-dt
 );

 // -------------------------------------------------------
 // DRAGON PHYSICS — RESISTANCE / RECOVERY
 // -------------------------------------------------------

 // Brace climbs while under repeated fire, then decays.
 this.braceTarget=
   this.hitRecover>0
   ?1
   :0;

 this.brace=THREE.MathUtils.damp(
   this.brace,
   this.braceTarget,
   this.hitRecover>0?4.5:2.0,
   dt
 );

 // Stability slowly recovers if the enemy is still upright.
 this.stability=THREE.MathUtils.damp(
   this.stability,
   this.maxStability,
   this.staggerTimer>0?0.6:3.2,
   dt
 );

 // Translational bullet push decays under powered suit resistance.
 const resistRate=
   5.5 + this.brace*5.5;

 this.linearImpulse.multiplyScalar(
   Math.exp(-resistRate*dt)
 );

 // Angular hit reaction also gets servo-corrected.
 this.angularImpulse.multiplyScalar(
   Math.exp(-(7.5+this.brace*6.0)*dt)
 );

 // Physically displace enemy from accumulated impact impulse, but never through architecture.
 const preImpulsePosition=this.group.position.clone();
 this.group.position.addScaledVector(this.linearImpulse,dt);
 this.resolveEnemyWorldCollision(preImpulsePosition);

 // Body/head reactions.
 this.headSnap=THREE.MathUtils.damp(
   this.headSnap,
   0,
   12,
   dt
 );

 this.chestKick=THREE.MathUtils.damp(
   this.chestKick,
   0,
   10,
   dt
 );

 this.shoulderTwist=THREE.MathUtils.damp(
   this.shoulderTwist,
   0,
   10,
   dt
 );

 // Local body deformation pose while keeping locomotion active.
 if(this.head?.visible){
   this.head.rotation.x=
     THREE.MathUtils.damp(
       this.head.rotation.x,
       this.headSnap,
       14,
       dt
     );
 }

 if(this.chest?.visible){
   this.chest.rotation.x=
     THREE.MathUtils.damp(
       this.chest.rotation.x,
       this.chestKick,
       14,
       dt
     );

   this.chest.rotation.z=
     THREE.MathUtils.damp(
       this.chest.rotation.z,
       this.shoulderTwist*.45,
       12,
       dt
     );
 }

 this.group.rotation.x=
   THREE.MathUtils.damp(
     this.group.rotation.x,
     this.angularImpulse.x,
     9,
     dt
   );

 this.group.rotation.z=
   THREE.MathUtils.damp(
     this.group.rotation.z,
     this.angularImpulse.z,
     9,
     dt
   );

 // -------------------------------------------------------
 // LOCOMOTION — ADVANCE THROUGH FIRE
 // -------------------------------------------------------
 const toPlayer=
   this.player.group.position
     .clone()
     .sub(this.group.position);

 const dist=toPlayer.length();

 // Throttled line-of-sight sampling.
 this.losCheckTimer-=dt;
 if(this.spawnGrace<=0 && this.losCheckTimer<=0){
   this.cachedHasLOS=this.hasLineOfSight();
   this.losCheckTimer=(this.awake?.075:.20)+Math.random()*.025;
 }
 const hasLOS=this.spawnGrace<=0 && this.cachedHasLOS;
 const sensory=this.sensoryContext?.()||{};
 const rainVisionPenalty=1-THREE.MathUtils.clamp((sensory.rainIntensity??0)*.22,0,.22);
 const sightRange=this.activationRadius*rainVisionPenalty;
 const visible=hasLOS && dist<=sightRange;
 const heard=this.spawnGrace<=0 && this.sampleHearing(dt,dist);

 // Optional simulated-player brain. It receives only perception already earned by
 // this Titan (LOS/hearing), so advanced behavior does not become wall-hacking.
 this.eliteIntent=this.eliteBrain?.update?.(dt,{hasLOS:visible,heard,dist,toPlayer}) ?? null;
 if(this.eliteIntent?.state)this.aiBlackboard.state=this.eliteIntent.state;

 if(visible){
   // Recognition takes time at the edge of vision; close/obvious targets resolve quickly.
   const proximity=1-THREE.MathUtils.clamp(dist/Math.max(1,sightRange),0,1);
   this.visualSuspicion=THREE.MathUtils.clamp(this.visualSuspicion+dt*(.55+proximity*2.2),0,1);
   this.aiBlackboard.lastSeenPosition.copy(this.player.group.position);
   this.lastKnownTimer=6.5;
 }else{
   this.visualSuspicion=Math.max(0,this.visualSuspicion-dt*.24);
 }
 this.lastKnownTimer=Math.max(0,this.lastKnownTimer-dt);

 this.awake=
   this.spawnGrace<=0 && (
     this.visualSuspicion>.34 ||
     this.audioSuspicion>.48 ||
     this.hitRecover>0 ||
     this.health<this.maxHealth ||
     this.lastKnownTimer>0
   );

 if(!this.awake){
   this.updatePassiveRoam(dt);
   if(this.behavior!=="patrol"){
    this.group.rotation.y=THREE.MathUtils.damp(this.group.rotation.y,this.homeYaw,2.4,dt);
   }
   this.linearImpulse.multiplyScalar(Math.exp(-8*dt));
   this.angularImpulse.multiplyScalar(Math.exp(-8*dt));
   this.updateDetachedArmor(dt);
   this.updateTraumaFx(dt);
   this.updateBloodFx(dt);
   this.updateArcadeFx(dt);
   return;
 }

 // -------------------------------------------------------
 // LIVE RETURN FIRE
 // Titan engages in bursts while advancing.
 // -------------------------------------------------------
 this.fireCooldown=Math.max(0,this.fireCooldown-dt);
 this.burstGap=Math.max(0,this.burstGap-dt);

 // -------------------------------------------------------
 // FACE THE ACTUAL TARGET BEFORE FIRING
 //
 // Titan's authored forward axis is -Z (the rifle barrel also extends down -Z).
 // The previous atan2 calculation aligned +Z to the player, which made the
 // character visually fight BACKWARDS while the ballistic ray still hit.
 // -------------------------------------------------------
 const breachFiring=
   this.coverBreachMode &&
   this.coverBreachShotsLeft>0 &&
   this.lastKnownTimer>0;

 const breachAimDelta=breachFiring
   ?this.coverBreachAimPoint.clone().sub(this.group.position)
   :null;
 const desiredYaw=hasLOS
   ?Math.atan2(toPlayer.x,toPlayer.z)+Math.PI
   :breachFiring
     ?Math.atan2(breachAimDelta.x,breachAimDelta.z)+Math.PI
     :this.homeYaw;

 this.group.rotation.y=
   THREE.MathUtils.damp(
     this.group.rotation.y,
     desiredYaw,
     7.5,
     dt
   );

 // Smallest signed angular difference, so he has to visually turn toward you
 // before a burst is allowed to leave the muzzle.
 const facingError=Math.atan2(
   Math.sin(desiredYaw-this.group.rotation.y),
   Math.cos(desiredYaw-this.group.rotation.y)
 );

 const aimLocked=
   (hasLOS || breachFiring) &&
   Math.abs(facingError)<THREE.MathUtils.degToRad(breachFiring?20:16);

 if(aimLocked && dist<42 && dist>6){
   if(!breachFiring && this.burstShotsLeft<=0 && this.fireCooldown<=0){
     this.burstShotsLeft=3+Math.floor(Math.random()*4);
     this.fireCooldown=1.15+Math.random()*.75;
   }

   if(breachFiring && this.burstShotsLeft<=0){
     this.burstShotsLeft=this.coverBreachShotsLeft;
   }

   if(this.burstShotsLeft>0 && this.burstGap<=0){
     this.fireAtPlayer(dist,breachFiring);
     this.burstShotsLeft--;
     if(breachFiring){
       this.coverBreachShotsLeft=Math.max(0,this.coverBreachShotsLeft-1);
       if(this.coverBreachShotsLeft<=0){
         this.coverBreachMode=false;
         this.burstShotsLeft=0;
         this.fireCooldown=Math.max(this.fireCooldown,.85);
       }
     }
     this.burstGap=breachFiring
       ?(.075+Math.random()*.035)
       :(.095+Math.random()*.055);
   }
 }

 let locomotionScale=1;

 // Heavy stagger slows, but does not always stop.
 if(this.staggerTimer>0){
   locomotionScale=
     this.stagger>.75
     ?.18
     :.42;
 }else{
   locomotionScale=
     .72 + this.brace*.18;
 }

 // Damaged armor doesn't magically stop the powered suit,
 // but low core health reduces confidence/drive.
 const healthScale=
   .72 +
   (this.health/this.maxHealth)*.28;

 this.speed=
   this.baseSpeed *
   locomotionScale *
   healthScale;

 if(this.eliteIntent?.moveDirection && this.awake && dist>4.4){
   // Elite rival movement is tactical rather than a straight-line chase. World
   // collision still belongs to Titan so the brain cannot bypass architecture.
   const eliteMove=this.eliteIntent.moveDirection;
   if(eliteMove.lengthSq()>.0001){
     const previousPosition=this.group.position.clone();
     this.group.position.addScaledVector(eliteMove,this.speed*dt);
     this.resolveEnemyWorldCollision(previousPosition);
   }
 }else if(hasLOS && dist<55 && dist>4.4){
   toPlayer.y=0;
   toPlayer.normalize();
   const previousPosition=this.group.position.clone();
   this.group.position.addScaledVector(toPlayer,this.speed*dt);
   this.resolveEnemyWorldCollision(previousPosition);
 }else if(!hasLOS && this.lastKnownTimer>0){
   // v7.4.6 FIRST PURSUIT FOUNDATION: once cover breaks LOS, do not stand in
   // place shooting the obstruction. Move toward the last observed location.
   // Full cover selection/flanking/pathfinding remains a later AI pass.
   const pursuit=this.aiBlackboard.lastSeenPosition.clone().sub(this.group.position);
   pursuit.y=0;
   if(pursuit.lengthSq()>2.25){
     pursuit.normalize();
     const previousPosition=this.group.position.clone();
     this.group.position.addScaledVector(pursuit,this.speed*dt*.92);
     this.resolveEnemyWorldCollision(previousPosition);
     this.aiBlackboard.state="pursue_last_seen";
   }else{
     this.aiBlackboard.state="search_last_seen";
   }
 }else if(
   hasLOS && dist<=4.4 &&
   this.attackCooldown<=0
 ){
   this.player.damage(24);
   this.attackCooldown=1.15;
 }

 if(this.alive){
   const terrainY=this.worldRoot?.userData?.heightAt?.(this.group.position.x,this.group.position.z);
   if(Number.isFinite(terrainY))this.group.position.y=THREE.MathUtils.damp(this.group.position.y,terrainY,20,dt);
 }

 this.enforceBaseBodyShowcase();
 this.updateLiveArmor(dt);
 this.syncArmorMounts();
 this.enforceBaseBodyShowcase();
 this.updateEjectedArmor(dt);
 this.updateDetachedArmor(dt);
 this.updateTraumaFx(dt);
 this.updateBloodFx(dt);
 this.updateArcadeFx(dt);
}




cacheDetachVisual(key,source){
 if(!source || this.cachedDetachVisuals.has(key))return;
 const saved=[];
 source.traverse(o=>{saved.push([o,o.userData]);o.userData={};});
 let visual=null;
 try{visual=source.clone(true);}
 finally{for(const [o,data] of saved)o.userData=data;}
 if(!visual)return;
 visual.traverse(o=>{
   o.userData={cachedDetachVisual:true};
   if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
 });
 visual.visible=false;
 this.scene.add(visual);
 this.cachedDetachVisuals.set(key,visual);
}

takeCachedDetachVisual(source){
 const key=
   source===this.head?"head":
   source===this.helmetBrow?"helmetBrow":
   source===this.chest?"chest":
   null;
 if(!key)return null;
 const visual=this.cachedDetachVisuals.get(key)??null;
 if(visual)this.cachedDetachVisuals.delete(key);
 return visual;
}

cloneVisualTree(source){
 if(!source)return null;

 // THREE.Object3D.clone()/copy() JSON-serializes userData internally.
 // TITAN's live meshes intentionally carry runtime references such as:
 //   userData.titan -> Titan -> scene -> Object3D -> userData -> Titan
 // and shoulder parts can also carry userData.armorShellRoot -> Object3D.
 //
 // Those references are valid for gameplay but MUST NOT be serialized.
 // Temporarily remove userData while Three clones the visual hierarchy,
 // then restore the live source objects immediately.
 const saved=[];

 source.traverse(o=>{
   saved.push([o,o.userData]);
   o.userData={};
 });

 let clone=null;

 try{
   clone=source.clone(true);
 }finally{
   for(const [o,userData] of saved){
     o.userData=userData;
   }
 }

 // Detached/dropped visuals must not inherit gameplay ownership refs.
 clone?.traverse(o=>{
   o.userData={};
 });

 return clone;
}

dropWeapon(shotDirection=null){
 const sourceWeapon=this.archetypeProfile?.weapon==="knife"
   ?this.enemyKnife
   :(this.cleanTankGun??this.enemyRifle);
 if(this.weaponDropped || !sourceWeapon)return this.droppedWeapon;

 this.weaponDropped=true;
 sourceWeapon.updateMatrixWorld(true);

 const model=this.cloneVisualTree(sourceWeapon);
 const worldPos=new THREE.Vector3();
 const worldQuat=new THREE.Quaternion();
 const worldScale=new THREE.Vector3();

 sourceWeapon.getWorldPosition(worldPos);
 sourceWeapon.getWorldQuaternion(worldQuat);
 sourceWeapon.getWorldScale(worldScale);

 model.position.copy(worldPos);
 model.quaternion.copy(worldQuat);
 model.scale.copy(worldScale);

 model.traverse(o=>{
   if(o.isMesh){
     o.castShadow=true;
     o.receiveShadow=true;
   }
 });

 this.scene.add(model);
 sourceWeapon.visible=false;

 const impulse=
   shotDirection?.clone?.().normalize?.() ??
   new THREE.Vector3(0,0,-1);

 this.droppedWeapon={
   model,
   ownerId:this.id,
   label:this.archetypeProfile?.weapon==="knife"?"COMBAT KNIFE":"TITAN RIFLE",
   // Recovered weapon is a physical ammunition source too.
   // Later this can mirror the enemy's exact live magazine state.
   magAmmo:Math.floor(12+Math.random()*25),
   reserveAmmo:Math.floor(18+Math.random()*55),
   ammoType:"titan_rifle_standard",
   picked:false,
   grounded:false,
   velocity:impulse.multiplyScalar(1.8).add(
     new THREE.Vector3(
       (Math.random()-.5)*1.2,
       3.2,
       (Math.random()-.5)*1.2
     )
   ),
   angularVelocity:new THREE.Vector3(
     (Math.random()-.5)*5,
     (Math.random()-.5)*5,
     (Math.random()-.5)*5
   )
 };

 return this.droppedWeapon;
}

updateDroppedWeapon(dt){
 const d=this.droppedWeapon;
 if(!d || d.picked || !d.model)return;

 if(!d.grounded){
   d.velocity.y-=9.8*dt;
   d.model.position.addScaledVector(d.velocity,dt);

   d.model.rotation.x+=d.angularVelocity.x*dt;
   d.model.rotation.y+=d.angularVelocity.y*dt;
   d.model.rotation.z+=d.angularVelocity.z*dt;

   d.angularVelocity.multiplyScalar(Math.exp(-2.2*dt));

   if(d.model.position.y<=.18){
     d.model.position.y=.18;

     if(Math.abs(d.velocity.y)>.7){
       d.velocity.y=Math.abs(d.velocity.y)*.26;
       d.velocity.x*=.55;
       d.velocity.z*=.55;
       d.angularVelocity.multiplyScalar(.52);
     }else{
       d.velocity.set(0,0,0);
       d.angularVelocity.multiplyScalar(.2);
       d.grounded=true;
       d.model.rotation.x=1.24;
       d.model.rotation.z+=.24;
     }
   }
 }
}



fireAtPlayer(distance,breachFiring=false){
 if(!this.alive || !this.enemyMuzzle)return;

 const muzzle=new THREE.Vector3();
 this.enemyMuzzle.getWorldPosition(muzzle);
 this.audioSystem?.playEnemyRifle?.(muzzle,distance);

 // Pick a visible armor zone. This is intentionally learnable:
 // torso/shoulders are hit more often than helmet.
 const r=Math.random();
 const playerChestOpen=this.player.playerArmorZones?.chest?.broken;

 let zone;
 if(playerChestOpen && r>.68){
   zone="abdomen";
 }else{
   zone=
     r<.12?"helmet":
     r<.37?"leftShoulder":
     r<.62?"rightShoulder":
     "chest";
 }

 // Local player target points.
 const localTarget={
   helmet:new THREE.Vector3(0,2.34,0),
   leftShoulder:new THREE.Vector3(-.68,1.98,0),
   rightShoulder:new THREE.Vector3(.68,1.98,0),
   chest:new THREE.Vector3(0,1.76,0),
   abdomen:new THREE.Vector3(0,1.28,0)
 }[zone].clone();

 let target=localTarget.applyMatrix4(this.player.group.matrixWorld);

 // During a committed masonry breach, the Titan is NOT allowed to track a
 // hidden player through the wall. He drills the last location he actually saw.
 if(breachFiring){
   target=this.coverBreachAimPoint.clone();
   target.y+=1.55;
 }

 // Distance-based spread. Suppression tightens into a small destructive cone
 // around the remembered corner rather than spraying an entire facade.
 const spread=(breachFiring?.032:.055) + distance*(breachFiring?.0012:.0024);
 target.x+=(Math.random()-.5)*spread*distance;
 target.y+=(Math.random()-.5)*spread*distance*.65;
 target.z+=(Math.random()-.5)*spread*distance;

 const dir=target.clone().sub(muzzle).normalize();

 // Determine hit using angular miss test around the player's central mass.
 const playerCenter=this.player.group.position.clone().add(new THREE.Vector3(0,1.65,0));
 const closest=muzzle.clone().addScaledVector(
   dir,
   playerCenter.clone().sub(muzzle).dot(dir)
 );
 const missDistance=closest.distanceTo(playerCenter);

 const playerHit=missDistance < .92;

 // -------------------------------------------------------
 // v7.4.6 BALLISTIC COVER / WALL IMPACT
 //
 // LOS decides whether the AI is allowed to START/continue an engagement, but
 // the fired round still performs its own ballistic world query. This matters
 // for partial cover and for the short cached-LOS window while the player ducks
 // behind a wall. The first piece of architecture along the shot wins.
 // -------------------------------------------------------
 const maxShotDistance=playerHit
   ?Math.max(.01,muzzle.distanceTo(target))
   :70;

 this.enemyShotRaycaster.set(muzzle,dir);
 this.enemyShotRaycaster.near=0;
 this.enemyShotRaycaster.far=maxShotDistance;

 const dynamicWorldMeshes=this.worldRoot?.userData?.dynamicBulletMeshes ?? [];
 const candidates=this.enemyShotWorldCandidates;
 candidates.length=0;

 for(const wall of this.worldOccluders){
   if(wall?.visible!==false && wall?.userData?.blocksBullets)candidates.push(wall);
 }
 for(const wall of dynamicWorldMeshes){
   if(wall?.visible!==false && wall?.userData?.blocksBullets)candidates.push(wall);
 }

 const wallHits=candidates.length
   ?this.enemyShotRaycaster.intersectObjects(candidates,false)
   :[];
 const wallHit=wallHits[0] ?? null;

 if(wallHit){
   const end=wallHit.point;
   this.spawnEnemyTracer(muzzle,end,false);

   wallHit.object.userData?.onBulletHit?.({
     point:wallHit.point.clone(),
     direction:dir.clone(),
     damage:this.enemyBallistics.wallDamage,
     energyJ:this.enemyBallistics.muzzleEnergyJ,
     ballistics:this.enemyBallistics,
     source:"enemy"
   });

   const impactNearPlayer=wallHit.point.distanceTo(playerCenter)<3.6;
   const sawPlayerAtCommit=this.cachedHasLOS && this.lastKnownTimer>0;

   // v7.5.1 CORNER BREACH SHOWCASE:
   // If the Titan truly saw Dragon at the corner and a committed shot clips the
   // masonry immediately beside that sighting, he recognizes penetrable cover
   // and commits one magazine to the LAST SEEN point. This is intentionally
   // conditional so AI does not waste ammunition on arbitrary walls.
   if(!breachFiring && sawPlayerAtCommit && impactNearPlayer){
     this.coverBreachMode=true;
     this.coverBreachShotsLeft=this.coverBreachMagSize;
     this.coverBreachAimPoint.copy(this.player.group.position);
     this.aiBlackboard.lastSeenPosition.copy(this.player.group.position);
     this.lastKnownTimer=Math.max(this.lastKnownTimer,5.0);
     this.burstShotsLeft=this.coverBreachShotsLeft;
     this.fireCooldown=0;
     this.aiBlackboard.state="breach_suppress";
     return {blockedByWorld:true,wallHit,breachStarted:true};
   }

   if(breachFiring){
     // Stay on the remembered corner until the suppression magazine is spent.
     this.lastKnownTimer=Math.max(this.lastKnownTimer,2.0);
     this.aiBlackboard.state="breach_suppress";
     return {blockedByWorld:true,wallHit,breachContinues:true};
   }

   // Ordinary obstruction: one committed round may chip cover, then stop
   // wasting ammo and pursue the last known player location.
   this.burstShotsLeft=0;
   this.fireCooldown=Math.max(this.fireCooldown,.28);
   this.cachedHasLOS=false;
   this.losCheckTimer=0;
   this.aiBlackboard.lastSeenPosition.copy(this.player.group.position);
   this.lastKnownTimer=Math.max(this.lastKnownTimer,4.5);
   this.aiBlackboard.state="pursue_last_seen";
   return {blockedByWorld:true,wallHit};
 }

 const hit=playerHit;
 const end=hit
   ?target
   :muzzle.clone().addScaledVector(dir,70);

 this.spawnEnemyTracer(muzzle,end,hit);

 // Every enemy shot emits real scene light, including misses. In darkness this
 // briefly reveals the shooter, nearby wall faces, pavement and cover.
 const lightPool=this.enemyFirePool?.lights;
 if(lightPool?.length){
   const muzzleLight=lightPool[this.enemyFirePool.lightCursor++%lightPool.length];
   muzzleLight.position.copy(muzzle);
   muzzleLight.intensity=34;
   muzzleLight.visible=true;
   this.enemyMuzzleFlashes.push({light:muzzleLight,life:.075,maxLife:.075,pooled:true});
 }

 if(hit){
   const damage=9+Math.floor(Math.random()*6);

   const result=this.player.takeIncomingHit(
     zone,
     damage,
     dir
   );

   return result;
 }

 // Near miss still gets a tiny camera/reticle pressure response.
 if(missDistance<1.65){
   this.player.hitYaw+=(Math.random()-.5)*.035;
   this.player.reticleVelocity.x+=(Math.random()-.5)*30;
   this.player.addStress?.(1.8+(1.65-missDistance)*1.5,"incoming");
 }

 return null;
}

spawnEnemyTracer(start,end,hit){
 const pool=this.enemyFirePool?.tracers;
 if(!pool?.length)return;
 const line=pool[this.enemyFirePool.tracerCursor++%pool.length];
 const delta=end.clone().sub(start);
 const len=Math.max(.001,delta.length());
 line.position.copy(start);
 line.scale.set(1,1,len);
 line.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize());
 line.material.color.setHex(hit?0xff8a32:0xffc05a);
 line.material.opacity=.92;
 line.visible=true;
 this.enemyTracers.push({mesh:line,life:.055,maxLife:.055,pooled:true});
}

updateEnemyFireFx(dt){
 for(const t of this.enemyTracers){
   if(t.life<=0)continue;
   t.life-=dt;
   t.mesh.material.opacity=Math.max(0,t.life/t.maxLife);

   if(t.life<=0){
     t.mesh.visible=false;
     t.mesh.material.opacity=0;
   }
 }

 for(const f of this.enemyMuzzleFlashes){
   if(f.life<=0)continue;
   f.life-=dt;
   if(f.life<=0){
     f.light.intensity=0;
     f.light.visible=false;
   }
 }

 this.enemyTracers=this.enemyTracers.filter(x=>x.life>0);
 this.enemyMuzzleFlashes=this.enemyMuzzleFlashes.filter(x=>x.life>0);

 if(this.enemyTracers.length>36){
   const overflow=this.enemyTracers.splice(0,this.enemyTracers.length-36);
   for(const t of overflow){
     t.mesh.visible=false;
     t.mesh.material.opacity=0;
   }
 }

 if(this.enemyMuzzleFlashes.length>12){
   const overflow=this.enemyMuzzleFlashes.splice(0,this.enemyMuzzleFlashes.length-12);
   for(const f of overflow){f.light.intensity=0;f.light.visible=false;}
 }
}



flashArmorPiece(zone){
 const mesh=this.armorState[zone]?.mesh;
 if(!mesh || !mesh.visible)return;
 // Reuse existing material. update() restores emissive smoothly.
 const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
 for(const mat of mats){
   if(!mat)continue;
   if(mat.emissive){
     if(mat.userData._titanBaseEmissive===undefined)mat.userData._titanBaseEmissive=mat.emissive.getHex();
     if(mat.userData._titanBaseEmissiveIntensity===undefined)mat.userData._titanBaseEmissiveIntensity=mat.emissiveIntensity??1;
     mat.emissive.setHex(0xff4a00);
     mat.emissiveIntensity=2.5;
     mat.userData._titanFlashLife=.065;
   }
 }
}

acquireImpactFx(type){
 const pool=this.impactFxPools?.[type];
 if(!pool?.length)return null;
 const idx=this.impactPoolCursor[type]++%pool.length;
 const obj=pool[idx];
 obj.visible=true;
 if(obj.material?.opacity!==undefined)obj.material.opacity=1;
 obj.scale.set(1,1,1);
 obj.rotation.set(0,0,0);
 return obj;
}

spawnArcadeSparks(hitPoint,shotDirection,count=7){
 const p=hitPoint?.clone() ?? this.group.position.clone();
 const dir=shotDirection.clone().normalize();

 for(let i=0;i<count;i++){
   const shard=this.acquireImpactFx("spark");
   if(!shard)break;

   shard.position.copy(p);
   shard.scale.set(
     .55+Math.random()*1.0,
     .50+Math.random()*1.35,
     .50+Math.random()*.85
   );

   const spread=new THREE.Vector3(
     (Math.random()-.5)*1.8,
     .4+Math.random()*1.6,
     (Math.random()-.5)*1.8
   ).normalize();

   this.detachedPieces.push({
     mesh:shard,
     transient:true,
     pooled:true,
     vel:dir.clone()
       .multiplyScalar(2+Math.random()*4)
       .addScaledVector(spread,3+Math.random()*7),
     spin:new THREE.Vector3(
       12+Math.random()*20,
       12+Math.random()*20,
       12+Math.random()*20
     ),
     life:.45+Math.random()*.9
   });
 }
}

spawnArcadeFire(mesh){
 if(!mesh || !mesh.visible)return;

 const localAnchor=new THREE.Object3D();
 localAnchor.position.copy(mesh.position);
 this.group.add(localAnchor);

 this.arcadeFireFx.push({
   anchor:localAnchor,
   life:2.6,
   timer:0
 });
}

updateArcadeFx(dt){
 for(const fx of this.arcadeFireFx){
   if(fx.life<=0)continue;

   fx.life-=dt;
   fx.timer-=dt;

   if(fx.life<=0){
     this.group.remove(fx.anchor);
     continue;
   }

   if(fx.timer<=0){
     fx.timer=.045+Math.random()*.035;

     const flame=new THREE.Mesh(
       new THREE.ConeGeometry(
         .045+Math.random()*.055,
         .18+Math.random()*.24,
         5
       ),
       new THREE.MeshBasicMaterial({
         color:Math.random()<.35?0xffd35a:0xff5a18,
         transparent:true,
         opacity:.92
       })
     );

     fx.anchor.getWorldPosition(flame.position);
     flame.position.x+=(Math.random()-.5)*.22;
     flame.position.y+=.12+Math.random()*.24;
     flame.position.z+=(Math.random()-.5)*.16;
     flame.rotation.z+=(Math.random()-.5)*.45;

     this.scene.add(flame);

     this.arcadeArmorFx.push({
       mesh:flame,
       life:.16+Math.random()*.18,
       vel:new THREE.Vector3(
         (Math.random()-.5)*.35,
         .7+Math.random()*.8,
         (Math.random()-.5)*.35
       )
     });
   }
 }

 for(const fx of this.arcadeArmorFx){
   if(fx.life<=0)continue;

   fx.life-=dt;

   if(fx.life<=0){
     this.scene.remove(fx.mesh);
     fx.mesh.geometry?.dispose?.();
     fx.mesh.material?.dispose?.();
     continue;
   }

   fx.mesh.position.addScaledVector(fx.vel,dt);
   fx.mesh.material.opacity=Math.max(0,fx.life/.3);
 }

 this.arcadeArmorFx=this.arcadeArmorFx.filter(x=>x.life>0);
 this.arcadeFireFx=this.arcadeFireFx.filter(x=>x.life>0);

 // Fire is dramatic, but it cannot create an unbounded number of meshes.
 while(this.arcadeArmorFx.length>36){
   const fx=this.arcadeArmorFx.shift();
   this.scene.remove(fx.mesh);
   fx.mesh.geometry?.dispose?.();
   fx.mesh.material?.dispose?.();
 }
}

destroyArmorArcade(zone,shotDirection,hitPoint){
 const state=this.armorState[zone];
 const mesh=state?.mesh;

 if(!mesh || !mesh.visible)return false;

 const mode=this.arcadeFailureModes[zone] ?? "fly";
 const dir=shotDirection.clone().normalize();
 const point=hitPoint?.clone() ?? mesh.getWorldPosition(new THREE.Vector3());

 // Always give a huge readable spark burst at failure.
 this.spawnArcadeSparks(
   point,
   dir,
   mode==="crumble"?28:18
 );

 if(mode==="fly" || mode==="pop"){
   // Plate leaves the body clearly and immediately.
   this.detachArmorMesh(
     mesh,
     dir,
     zone,
     point
   );



   if(zone==="head" && this.helmetBrow?.visible){
     this.detachArmorMesh(this.helmetBrow,dir,zone,point);
   }
 }

 if(mode==="crumble" && zone!=="leftShoulder" && zone!=="rightShoulder"){
   // Shoulder plate disintegrates into obvious chunks instead of simply vanishing.
   const worldPos=mesh.getWorldPosition(new THREE.Vector3());
   mesh.visible=false;

   for(let i=0;i<18;i++){
     const chunk=new THREE.Mesh(
       new THREE.BoxGeometry(
         .08+Math.random()*.18,
         .05+Math.random()*.16,
         .06+Math.random()*.14
       ),
       mesh.material.clone()
     );

     chunk.position.copy(worldPos).add(
       new THREE.Vector3(
         (Math.random()-.5)*.38,
         (Math.random()-.5)*.28,
         (Math.random()-.5)*.30
       )
     );

     this.scene.add(chunk);

     this.detachedPieces.push({
       mesh:chunk,
       vel:dir.clone()
         .multiplyScalar(4+Math.random()*7)
         .add(new THREE.Vector3(
           (Math.random()-.5)*6,
           2+Math.random()*6,
           (Math.random()-.5)*6
         )),
       spin:new THREE.Vector3(
         8+Math.random()*18,
         8+Math.random()*18,
         8+Math.random()*18
       ),
       life:1.4+Math.random()*1.5
     });
   }

   if(this.rightShoulderMount?.visible){
     this.detachArmorMesh(this.rightShoulderMount,dir,zone,point);
   }
 }

 if(mode==="burn"){
   // Chest burns briefly, then drops away.
   this.spawnArcadeFire(mesh);

   setTimeout(()=>{
     if(mesh.visible){
       this.detachArmorMesh(mesh,dir,zone,point);
     }
   },450);
 }

 // Disable armor proxy immediately so exposed body can be hit next.

 if(zone==="head" && this.headHitbox){
   this.headHitbox.visible=false;
 }
 if(zone==="chest" && this.chestHitbox){
   this.chestHitbox.visible=false;
 }

 return true;
}


updateLiveArmor(dt){
 // IMPORTANT:
 // Armor is COMPLETELY STILL unless it was physically hit.
 // No idle sinusoidal shake. No random wobble.
 // Damage level only changes how violently a future hit moves the plate.

 for(const [zone,state] of Object.entries(this.armorState)){
   const mesh=state.mesh;
   const section=this.zoneHP[zone];

   if(!mesh || !section || !mesh.visible)continue;

   // Detached armor is no longer controlled by the enemy's mounted armor system.
   if(
     (zone==="leftShoulder" || zone==="rightShoulder") &&
     mesh.parent!==this.group
   ){
     continue;
   }

   const hpRatio=
     THREE.MathUtils.clamp(
       section.hp/section.max,
       0,
       1
     );

   const damageLevel=1-hpRatio;

   // More damaged mounts have less resistance to a new impact.
   state.looseness=
     THREE.MathUtils.clamp(
       damageLevel,
       0,
       1
     );

   // Decay hit-only impulses back toward perfect rest.
   state.shake=THREE.MathUtils.damp(
     state.shake,
     0,
     15,
     dt
   );

   state.hitRotX=THREE.MathUtils.damp(
     state.hitRotX ?? 0,
     0,
     13,
     dt
   );

   state.hitRotY=THREE.MathUtils.damp(
     state.hitRotY ?? 0,
     0,
     13,
     dt
   );

   state.hitRotZ=THREE.MathUtils.damp(
     state.hitRotZ ?? 0,
     0,
     13,
     dt
   );

   state.hitOffsetX=THREE.MathUtils.damp(
     state.hitOffsetX ?? 0,
     0,
     14,
     dt
   );

   state.hitOffsetY=THREE.MathUtils.damp(
     state.hitOffsetY ?? 0,
     0,
     14,
     dt
   );

   state.hitOffsetZ=THREE.MathUtils.damp(
     state.hitOffsetZ ?? 0,
     0,
     14,
     dt
   );

   // Return exactly to mounted rest pose between impacts.
   mesh.position.set(
     state.restPos.x + (state.hitOffsetX ?? 0),
     state.restPos.y + (state.hitOffsetY ?? 0),
     state.restPos.z + (state.hitOffsetZ ?? 0)
   );

   mesh.rotation.set(
     state.restRot.x + (state.hitRotX ?? 0),
     state.restRot.y + (state.hitRotY ?? 0),
     state.restRot.z + (state.hitRotZ ?? 0)
   );

   // No passive crushing. The plate stays solid until struck.
   mesh.scale.set(1,1,1);

   // Helmet brow only follows a current helmet impact.
   if(zone==="head" && this.helmetBrow?.visible){
     this.helmetBrow.position.set(
       (state.hitOffsetX ?? 0)*.75,
       3.90 + (state.hitOffsetY ?? 0)*.75,
       -.39 + (state.hitOffsetZ ?? 0)*.75
     );

     this.helmetBrow.rotation.set(
       (state.hitRotX ?? 0)*.75,
       (state.hitRotY ?? 0)*.75,
       (state.hitRotZ ?? 0)*.75
     );
   }
 }
}


syncArmorMounts(){
 // Shoulder shell is the mounted object itself.
 // Helmet/chest proxies follow their visual armor.
 if(this.headHitbox){
   this.headHitbox.position.copy(this.head.position);
   this.headHitbox.rotation.copy(this.head.rotation);
 }

 if(this.chestHitbox){
   this.chestHitbox.position.copy(this.chest.position);
   this.chestHitbox.rotation.copy(this.chest.rotation);
 }
}


kickArmor(zone,damage,critical,penetrated,shotDirection=null){
 const state=this.armorState[zone];
 const section=this.zoneHP[zone];

 if(!state || !section || !state.mesh?.visible)return;

 const hpRatio=
   THREE.MathUtils.clamp(
     section.hp/section.max,
     0,
     1
   );

 const damageLevel=1-hpRatio;

 // Fresh armor resists movement.
 // Damaged armor gives more and more on EACH NEW HIT.
 const mountGive=
   .35 + damageLevel*1.65;

 const impact=
   (damage/31) *
   (critical?1.45:1) *
   (penetrated?1.10:1) *
   mountGive;

 state.shake=Math.min(
   1.5,
   (state.shake ?? 0) + impact*.60
 );

 // Directional shove from projectile.
 const dir=
   shotDirection?.clone().normalize() ??
   new THREE.Vector3(0,0,1);

 // Convert world shot direction roughly into local body direction.
 const invQuat=new THREE.Quaternion();
 this.group.getWorldQuaternion(invQuat);
 invQuat.invert();
 const localDir=dir.clone().applyQuaternion(invQuat);

 state.hitOffsetX=(state.hitOffsetX ?? 0) + localDir.x*.10*impact;
 state.hitOffsetY=(state.hitOffsetY ?? 0) + localDir.y*.07*impact;
 state.hitOffsetZ=(state.hitOffsetZ ?? 0) + localDir.z*.20*impact;

 // Rotate plate around its mount from the hit.
 state.hitRotX=(state.hitRotX ?? 0) - localDir.y*.16*impact;
 state.hitRotY=(state.hitRotY ?? 0) + localDir.x*.30*impact;

 // Shoulder armor gets very readable kick around Z.
 if(zone==="leftShoulder"){
   state.hitRotZ=(state.hitRotZ ?? 0) + .12*impact;
 }

 if(zone==="rightShoulder"){
   state.hitRotZ=(state.hitRotZ ?? 0) - .12*impact;
 }

 // Helmet snaps separately over the round head.
 if(zone==="head"){
   state.hitRotX=(state.hitRotX ?? 0) + .16*impact;
   state.hitOffsetZ=(state.hitOffsetZ ?? 0) + .05*impact;
 }

 // Chest plate gives backward on impact, but only when struck.
 if(zone==="chest"){
   state.hitRotX=(state.hitRotX ?? 0) + .09*impact;
   state.hitOffsetZ=(state.hitOffsetZ ?? 0) + .045*impact;
 }
 this.flashArmorPiece(zone);
}

chooseFailureMode(zone,critical,penetrated){
 if(penetrated && critical)return "explode";
 if(zone==="chest" && critical)return "smash";
 if(zone==="head" && critical)return "explode";
 if(Math.random()<.34)return "smash";
 if(Math.random()<.48)return "explode";
 return "pop";
}

applyFailurePose(zone,mode,hitPoint,shotDirection){
 const state=this.armorState[zone];
 const mesh=state?.mesh;

 if(!state || !mesh)return;

 state.failureMode=mode;

 if(mode==="smash"){
   // Plate crushes inward before leaving / disappearing.
   mesh.scale.x*=1.08;
   mesh.scale.y*=.72;
   mesh.scale.z*=.58;

   mesh.position.addScaledVector(
     shotDirection.clone().normalize(),
     .13
   );
 }

 if(mode==="explode"){
   // The violent debris burst is handled by detachArmorMesh;
   // here we give the parent piece an extra chaotic pre-failure twist.
   mesh.rotation.x+=(Math.random()-.5)*.45;
   mesh.rotation.y+=(Math.random()-.5)*.45;
   mesh.rotation.z+=(Math.random()-.5)*.55;
 }

 if(mode==="pop"){
   mesh.rotation.z+=(Math.random()-.5)*.20;
 }
}



spawnArmorImpactResponse(zone,hitPoint,shotDirection,hitNumber=1){
 const dir=shotDirection.clone().normalize();

 const hot=this.acquireImpactFx("hot");
 if(hot){
   hot.position.copy(hitPoint).addScaledVector(dir,-.018);
   hot.scale.setScalar(1);
   this.armorImpactMarks.push({mesh:hot,life:.10,maxLife:.10,grow:true,pooled:true});
 }

 const scar=this.acquireImpactFx("scar");
 if(scar){
   const scarScale=(.055+Math.min(hitNumber,3)*.012)/.07;
   scar.scale.setScalar(scarScale);
   scar.position.copy(hitPoint).addScaledVector(dir,-.028);
   const n=dir.clone().negate();
   scar.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
   scar.material.opacity=.82;
   this.armorImpactMarks.push({mesh:scar,life:2.8,maxLife:2.8,grow:false,pooled:true});
 }

 // More violent with repeated focused fire, still hard-capped by the prewarmed pool.
 const chipCount=Math.min(16,6+Math.max(1,hitNumber)*3);
 for(let i=0;i<chipCount;i++){
   const chip=this.acquireImpactFx("chip");
   if(!chip)break;
   chip.position.copy(hitPoint);
   chip.scale.set(
     .55+Math.random()*.85,
     .35+Math.random()*.85,
     .40+Math.random()*.70
   );

   const spray=new THREE.Vector3(
     (Math.random()-.5)*1.5,
     .20+Math.random()*1.15,
     (Math.random()-.5)*1.5
   );
   const vel=dir.clone()
     .multiplyScalar(1.4+Math.random()*2.8)
     .add(spray.multiplyScalar(1.8+Math.random()*2.4));

   chip.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
   this.armorImpactDebris.push({
     mesh:chip,vel,
     spin:new THREE.Vector3((Math.random()-.5)*18,(Math.random()-.5)*18,(Math.random()-.5)*18),
     life:.55+Math.random()*.65,
     pooled:true
   });
 }

 const fractureRayCount=Math.min(10,4+Math.max(1,hitNumber));
 for(let i=0;i<fractureRayCount;i++){
   const line=this.acquireImpactFx("ray");
   if(!line)break;
   const tangent=new THREE.Vector3(
     Math.random()-.5,
     Math.random()-.15,
     Math.random()-.5
   ).normalize();
   tangent.addScaledVector(dir,-tangent.dot(dir)).normalize();
   const len=.10+Math.random()*.22;
   line.position.copy(hitPoint);
   line.scale.set(1,1,len);
   line.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tangent);
   line.material.opacity=.95;
   this.armorImpactMarks.push({
     mesh:line,life:.08+Math.random()*.08,maxLife:.16,grow:false,pooled:true
   });
 }
}

updateArmorImpactResponse(dt){
 // Restore reused armor materials after their tiny hit flash.
 for(const state of Object.values(this.armorState||{})){
   const mesh=state?.mesh;if(!mesh)continue;
   const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(const mat of mats){
     if(!mat?.userData?._titanFlashLife)continue;
     mat.userData._titanFlashLife-=dt;
     if(mat.userData._titanFlashLife<=0){
       mat.userData._titanFlashLife=0;
       mat.emissive?.setHex(mat.userData._titanBaseEmissive??0x000000);
       mat.emissiveIntensity=mat.userData._titanBaseEmissiveIntensity??1;
     }
   }
 }
 for(const d of this.armorImpactDebris){
   if(d.life<=0)continue;
   d.life-=dt;
   d.vel.y-=8.5*dt;
   d.mesh.position.addScaledVector(d.vel,dt);
   d.mesh.rotation.x+=d.spin.x*dt;
   d.mesh.rotation.y+=d.spin.y*dt;
   d.mesh.rotation.z+=d.spin.z*dt;

   if(d.life<=0){
     if(d.pooled || d.mesh.userData?.pooledImpactFx){
       d.mesh.visible=false;
       if(d.mesh.material?.opacity!==undefined)d.mesh.material.opacity=0;
     }else{
       this.scene.remove(d.mesh);
       d.mesh.geometry?.dispose?.();
       d.mesh.material?.dispose?.();
     }
   }
 }

 for(const m of this.armorImpactMarks){
   if(m.life<=0)continue;
   m.life-=dt;

   if(m.mesh.material){
     const fade=THREE.MathUtils.clamp(m.life/m.maxLife,0,1);
     m.mesh.material.opacity*=Math.min(1,fade*1.8);
   }

   if(m.grow){
     const k=1+dt*8;
     m.mesh.scale.multiplyScalar(k);
   }

   if(m.life<=0){
     if(m.pooled || m.mesh.userData?.pooledImpactFx){
       m.mesh.visible=false;
       if(m.mesh.material?.opacity!==undefined)m.mesh.material.opacity=0;
     }else{
       this.scene.remove(m.mesh);
       m.mesh.geometry?.dispose?.();
       m.mesh.material?.dispose?.();
     }
   }
 }

 if(this.armorImpactDebris.length>180){
   this.armorImpactDebris=this.armorImpactDebris.filter(x=>x.life>0);
 }
 if(this.armorImpactMarks.length>120){
   this.armorImpactMarks=this.armorImpactMarks.filter(x=>x.life>0);
 }
}


ejectActualArmorGroup(group,shotDirection,hitPoint,zone){
 if(!group || group.visible===false)return false;

 // Capture the exact world transform BEFORE re-parenting.
 const worldPos=new THREE.Vector3();
 const worldQuat=new THREE.Quaternion();
 const worldScale=new THREE.Vector3();

 group.updateMatrixWorld(true);
 group.matrixWorld.decompose(
   worldPos,
   worldQuat,
   worldScale
 );

 // Remove THE REAL armor object from the enemy.
 // No clone. No duplicate. No hidden original left attached.
 this.group.remove(group);

 // Put that same object into world space.
 this.scene.add(group);

 group.position.copy(worldPos);
 group.quaternion.copy(worldQuat);
 group.scale.copy(worldScale);
 group.visible=true;

 // Remove every child of this armor group from the armor hit list immediately.
 const removed=new Set();
 group.traverse(o=>{
   if(o.isMesh){
     removed.add(o);
     o.userData.detachedArmor=true;
     o.userData.isArmorObject=false;
     o.userData.armorShellPart=false;
   }
 });

 this.armorRaycastObjects=
   this.armorRaycastObjects.filter(o=>!removed.has(o));

 const dir=shotDirection.clone().normalize();

 // Strong, unmistakable arcade launch.
 const side=
   zone==="leftShoulder"
   ?new THREE.Vector3(-1,.25,0)
   :new THREE.Vector3(1,.25,0);

 const velocity=dir.clone()
   .multiplyScalar(11.5)
   .addScaledVector(side,9.0)
   .add(new THREE.Vector3(
     0,
     8.5,
     0
   ));

 this.ejectedArmor.push({
   mesh:group,
   vel:velocity,
   spin:new THREE.Vector3(
     5.5+(Math.random()*4),
     8.5+(Math.random()*6),
     6.0+(Math.random()*5)
   ),
   life:5.0
 });

 // Burst from the actual separation point.
 this.spawnArcadeSparks(
   hitPoint ?? worldPos,
   dir,
   24
 );

 return true;
}

updateEjectedArmor(dt){
 for(const p of this.ejectedArmor){
   if(p.life<=0)continue;

   p.life-=dt;

   p.vel.y-=9.8*dt;

   p.mesh.position.addScaledVector(
     p.vel,
     dt
   );

   p.mesh.rotation.x+=p.spin.x*dt;
   p.mesh.rotation.y+=p.spin.y*dt;
   p.mesh.rotation.z+=p.spin.z*dt;

   // Do NOT immediately hide it. Let player watch the armor leave.
   if(p.life<=0){
     p.mesh.visible=false;
   }
 }
}


updateDetachedArmor(dt){
 for(const p of this.detachedPieces){
   if(p.life<=0)continue;

   p.life-=dt;

   if(p.life<=0){
     if(p.pooled || p.mesh.userData?.pooledTransient){
       p.mesh.visible=false;
     }else{
       this.scene.remove(p.mesh);

       // Only dispose one-shot generated debris. Detached armor may share geometry/material.
       if(p.transient){
         p.mesh.geometry?.dispose?.();
         if(Array.isArray(p.mesh.material)){
           for(const m of p.mesh.material)m?.dispose?.();
         }else{
           p.mesh.material?.dispose?.();
         }
       }
     }
     continue;
   }

   p.vel.y-=9.8*dt;
   p.mesh.position.addScaledVector(p.vel,dt);
   p.mesh.rotation.x+=p.spin.x*dt;
   p.mesh.rotation.y+=p.spin.y*dt;
   p.mesh.rotation.z+=p.spin.z*dt;
 }

 // IMPORTANT: dead entries used to remain forever. Sustained fire therefore
 // forced every frame to iterate through hundreds/thousands of expired objects.
 this.detachedPieces=this.detachedPieces.filter(p=>p.life>0);

 // Absolute safety budget for live debris.
 if(this.detachedPieces.length>40){
   const overflow=this.detachedPieces.splice(0,this.detachedPieces.length-40);
   for(const p of overflow){
     this.scene.remove(p.mesh);
     if(p.transient){
       p.mesh.geometry?.dispose?.();
       if(Array.isArray(p.mesh.material)){
         for(const m of p.mesh.material)m?.dispose?.();
       }else{
         p.mesh.material?.dispose?.();
       }
     }
   }
 }
}


spawnPersistentBloodSplat(hit,scale=1){
 const p=this.bloodFxPools?.splats;if(!p?.length||!hit?.object||!hit?.point)return;
 const s=p[this.bloodPoolCursor.splat++%p.length];this.scene.attach(s);s.visible=true;s.position.copy(hit.point);
 const n=this.bloodSplatNormal.set(0,0,1);if(hit.face?.normal)n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
 s.position.addScaledVector(n,.009);s.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
 const z=THREE.MathUtils.clamp((.55+Math.random()*.9)*scale,.30,1.65);s.scale.set(z*(.78+Math.random()*.45),z*(.78+Math.random()*.45),1);s.material.opacity=.82+Math.random()*.16;s.userData.life=55+Math.random()*55;
 if(hit.object.userData?.titan===this||hit.object.userData?.cleanTankPart)hit.object.attach(s);
}
traceBloodDropCollision(drop,from,to){
 const d=this.bloodCollisionDelta.copy(to).sub(from),len=d.length();if(len<.001)return false;this.bloodCollisionRay.set(from,d.multiplyScalar(1/len));this.bloodCollisionRay.far=len+.04;
 const c=this._bloodCollisionCandidates??(this._bloodCollisionCandidates=[]);c.length=0;
 for(const o of this.worldOccluders??[])if(o?.visible!==false)c.push(o);
 for(const o of this.worldRoot?.userData?.dynamicBulletMeshes??[])if(o?.visible!==false&&o?.userData?.blocksBullets)c.push(o);
 for(const o of this.bodyRaycastObjects??[])if(o?.visible!==false)c.push(o);
 const h=c.length?this.bloodCollisionRay.intersectObjects(c,false):[];if(!h.length)return false;this.spawnPersistentBloodSplat(h[0],drop.scale.length()*.72);return true;
}

spawnBloodImpact(hitPoint,shotDirection,intensity=1,severed=false){
 const point=hitPoint?.clone?.() ?? this.group.position.clone().add(new THREE.Vector3(0,2.1,0));
 const dir=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 const strength=THREE.MathUtils.clamp(intensity,.55,2.4);

 // Big immediate old-school red cloud.
 const mistPool=this.bloodFxPools?.mist;
 if(mistPool?.length){
   const mist=mistPool[this.bloodPoolCursor.mist++%mistPool.length];
   mist.visible=true;
   mist.position.copy(point).addScaledVector(dir,.05);
   mist.scale.setScalar(1.05+.72*strength+(severed?.65:0));
   mist.material.opacity=.82;
   mist.userData.maxLife=mist.userData.life=.18+(severed?.08:0);
   mist.userData.velocity.copy(dir).multiplyScalar(1.4+strength*1.1);
 }

 // Chunky ballistic droplets. Pool reuse means sustained fire remains bounded.
 const count=Math.min(36,Math.round(16+strength*7+(severed?10:0)));
 const drops=this.bloodFxPools?.drops;
 if(!drops?.length)return;

 for(let i=0;i<count;i++){
   const d=drops[this.bloodPoolCursor.drop++%drops.length];
   const spread=new THREE.Vector3(
     (Math.random()-.5)*1.25,
     (Math.random()-.18)*.95,
     (Math.random()-.5)*1.25
   );
   const launch=dir.clone()
     .multiplyScalar(4.5+Math.random()*5.5+strength*2.0)
     .addScaledVector(spread,3.0+Math.random()*4.0);

   d.visible=true;
   d.position.copy(point).add(new THREE.Vector3(
     (Math.random()-.5)*.09,
     (Math.random()-.5)*.09,
     (Math.random()-.5)*.09
   ));
   d.scale.set(
     .65+Math.random()*.55,
     .65+Math.random()*.55,
     .9+Math.random()*1.35
   );
   d.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),launch.clone().normalize());
   d.material.opacity=.95;
   d.userData.velocity.copy(launch);
   d.userData.spin.set(
     (Math.random()-.5)*12,
     (Math.random()-.5)*12,
     (Math.random()-.5)*12
   );
   d.userData.maxLife=d.userData.life=.48+Math.random()*.34+(severed?.18:0);
 }
}

updateBloodFx(dt){
 const drops=this.bloodFxPools?.drops ?? [];
 for(const d of drops){
   if(!d.visible)continue;
   d.userData.life-=dt;
   if(d.userData.life<=0){
     d.visible=false;
     d.material.opacity=0;
     continue;
   }
   const prev=this.bloodCollisionStart.copy(d.position);

   d.userData.velocity.y-=12.5*dt;

   this.bloodCollisionEnd.copy(d.position).addScaledVector(d.userData.velocity,dt);

   if(this.traceBloodDropCollision(d,prev,this.bloodCollisionEnd)){d.visible=false;d.material.opacity=0;d.userData.life=0;continue;}

   d.position.copy(this.bloodCollisionEnd);

   d.rotation.x+=d.userData.spin.x*dt;
   d.rotation.y+=d.userData.spin.y*dt;
   d.rotation.z+=d.userData.spin.z*dt;
   const a=THREE.MathUtils.clamp(d.userData.life/Math.max(.001,d.userData.maxLife),0,1);
   d.material.opacity=Math.min(.95,a*1.25);
 }

 const splats=this.bloodFxPools?.splats??[];
 for(const s of splats){if(!s.visible)continue;s.userData.life-=dt;if(s.userData.life<=0){s.visible=false;s.material.opacity=0;this.scene.attach(s);}else if(s.userData.life<8)s.material.opacity=Math.min(s.material.opacity,s.userData.life/8*.82);}
 const mist=this.bloodFxPools?.mist ?? [];
 for(const m of mist){
   if(!m.visible)continue;
   m.userData.life-=dt;
   if(m.userData.life<=0){
     m.visible=false;
     m.material.opacity=0;
     continue;
   }
   m.position.addScaledVector(m.userData.velocity,dt);
   m.userData.velocity.multiplyScalar(Math.exp(-7*dt));
   const a=THREE.MathUtils.clamp(m.userData.life/Math.max(.001,m.userData.maxLife),0,1);
   m.material.opacity=.72*a;
   m.scale.multiplyScalar(1+dt*3.8);
 }
}


spawnImpactTrauma(hitPoint,shotDirection,zone,damage,critical,penetrated){
 // v4.8.12: zero-allocation combat path.
 // The pooled BLACK/arcade impact response already supplies hot point, scar,
 // chips and fracture rays. Do not build a second set of transient objects.
 const point=hitPoint?.clone() ?? this.group.position.clone().add(new THREE.Vector3(0,2.4,0));
 this.spawnArmorImpactResponse(zone,point,shotDirection,critical?2:1);
}

updateTraumaFx(dt){
 const retire=(item)=>{
   if(!item?.mesh)return;
   this.scene.remove(item.mesh);
   item.mesh.geometry?.dispose?.();
   if(Array.isArray(item.mesh.material)){
     for(const m of item.mesh.material)m?.dispose?.();
   }else{
     item.mesh.material?.dispose?.();
   }
 };

 for(const f of this.impactFlashes){
   if(f.life<=0)continue;
   f.life-=dt;
   if(f.life<=0){
     retire(f);
     continue;
   }
   const a=f.life/f.maxLife;
   f.mesh.material.opacity=a;
   f.mesh.scale.setScalar(1+(1-a)*1.8);
 }

 for(const m of this.traumaMarks){
   if(m.life<=0)continue;
   m.life-=dt;
   if(m.life<=0)retire(m);
 }

 for(const f of this.armorFractures){
   if(f.life<=0)continue;
   f.life-=dt;
   if(f.life<=0)retire(f);
 }

 this.impactFlashes=this.impactFlashes.filter(x=>x.life>0);
 this.traumaMarks=this.traumaMarks.filter(x=>x.life>0);
 this.armorFractures=this.armorFractures.filter(x=>x.life>0);

 // Live budgets keep sustained automatic fire bounded.
 const trim=(arr,max)=>{
   while(arr.length>max){
     const item=arr.shift();
     retire(item);
   }
 };
 trim(this.impactFlashes,8);
 trim(this.traumaMarks,14);
 trim(this.armorFractures,18);
}

detachArmorMesh(obj,shotDirection,zone,hitPoint=null){
 if(!obj || obj.visible===false)return null;

 const worldPos=new THREE.Vector3();
 const worldQuat=new THREE.Quaternion();
 const worldScale=new THREE.Vector3();
 obj.updateMatrixWorld(true);
 obj.matrixWorld.decompose(worldPos,worldQuat,worldScale);

 // Crucial: use a visual cloned during startup, not during the bullet frame.
 let chunk=this.takeCachedDetachVisual(obj);
 if(!chunk){
   console.warn(`[TITAN PERF] uncached detach fallback: ${zone}`);
   chunk=this.cloneVisualTree(obj);
   if(!chunk){obj.visible=false;return null;}
 }

 chunk.position.copy(worldPos);
 chunk.quaternion.copy(worldQuat);
 chunk.scale.copy(worldScale);
 chunk.visible=true;
 chunk.updateMatrixWorld(true);

 obj.visible=false;

 const dir=shotDirection.clone().normalize();
 const origin=hitPoint?.clone() ?? worldPos.clone();
 const radial=worldPos.clone().sub(origin);
 if(radial.lengthSq()<.001){
   radial.set(Math.random()-.5,.35+Math.random(),Math.random()-.5);
 }
 radial.normalize();

 const vel=dir.clone()
   .multiplyScalar(15+Math.random()*7)
   .addScaledVector(radial,6+Math.random()*6)
   .add(new THREE.Vector3(0,4+Math.random()*4,0));

 this.detachedPieces.push({
   mesh:chunk,
   vel,
   spin:new THREE.Vector3(
     6+Math.random()*9,
     7+Math.random()*10,
     5+Math.random()*9
   ),
   life:5
 });

 // All failure particles are pooled/prewarmed.
 this.spawnArcadeSparks(origin,dir,14);
 this.spawnArmorImpactResponse(zone,origin,dir,3);

 return chunk;
}
breakZone(zone,shotDirection,hitPoint=null){
 const z=this.zoneHP[zone];

 if(!z || z.broken)return false;

 z.broken=true;

 // Shoulders use ejectActualArmorGroup() in registerArcadeArmorHit().
 // This branch is only a safety fallback.
 if(zone==="leftShoulder" || zone==="rightShoulder"){
   return this.ejectActualArmorGroup(
     zone==="leftShoulder"
       ?this.leftShoulder
       :this.rightShoulder,
     shotDirection,
     hitPoint,
     zone
   );
 }

 return this.destroyArmorArcade(
   zone,
   shotDirection,
   hitPoint
 );
}

applyImpactPhysics(zone,damage,shotDirection,critical,penetrated){
 const dir=
   shotDirection.clone().normalize();
 this.applyRigImpact(zone,damage,shotDirection);

 // Heavy armor should resist most translational bullet force.
 const baseImpulse=
   (damage/31) * this.impactPushGain *
   (critical?1.30:1) *
   (penetrated?1.16:1);

 let impulseScale=.28;

 if(zone==="head"){
   impulseScale=.34;
 }
 if(zone==="chest"){
   impulseScale=.30;
 }
 if(zone==="leftShoulder" || zone==="rightShoulder"){
   impulseScale=.38;
 }

 // Bracing lowers pushback but doesn't eliminate visible reaction.
 const braceResistance=
   1 - this.brace*.42;

 this.linearImpulse.addScaledVector(
   dir,
   baseImpulse *
   impulseScale *
   braceResistance
 );

 // Zone-specific visible resistance.
 if(zone==="head"){
   this.headSnap+=
     .26 * this.impactPoseGain *
     baseImpulse;

   this.angularImpulse.x+=
     -.045 *
     baseImpulse;
 }

 if(zone==="chest"){
   this.chestKick+=
     .20 * this.impactPoseGain *
     baseImpulse;

   this.angularImpulse.x+=
     -.030 *
     baseImpulse;
 }

 if(zone==="leftShoulder"){
   this.shoulderTwist+=
     .22 * this.impactPoseGain *
     baseImpulse;

   this.angularImpulse.z+=
     .050 *
     baseImpulse;
 }

 if(zone==="rightShoulder"){
   this.shoulderTwist-=
     .22 * this.impactPoseGain *
     baseImpulse;

   this.angularImpulse.z-=
     .050 *
     baseImpulse;
 }

 // Clamp exaggerated presentation so it remains heavy rather than cartoon-launching.
 this.headSnap=THREE.MathUtils.clamp(this.headSnap,-.58,.58);
 this.chestKick=THREE.MathUtils.clamp(this.chestKick,-.42,.42);
 this.shoulderTwist=THREE.MathUtils.clamp(this.shoulderTwist,-.62,.62);
 this.angularImpulse.x=THREE.MathUtils.clamp(this.angularImpulse.x,-.22,.22);
 this.angularImpulse.z=THREE.MathUtils.clamp(this.angularImpulse.z,-.30,.30);

 // Stability loss controls stagger rather than raw HP alone.
 const zoneSection=this.zoneHP[zone];
 const structuralWeakness=
   zoneSection
   ?1 + (1-zoneSection.hp/zoneSection.max)*.85
   :1;

 const stabilityDamage=
   damage *
   structuralWeakness *
   (critical?1.25:1) *
   (
     zone==="head"
     ?1.15
     :zone==="chest"
     ?.80
     :.68
   );

 this.stability=Math.max(
   0,
   this.stability-stabilityDamage
 );

 this.hitRecover=.34;

 // Stagger threshold.
 if(this.stability<=0){
   this.stagger=
     critical
     ?1
     :.72;

   this.staggerTimer=
     critical
     ?.72
     :.46;

   this.stability=
     24;
 }

 return{
   stability:Math.ceil(this.stability),
   staggered:this.staggerTimer>0
 };
}







applyArmorDamageStage(zone,hitObject,hpRatio,shotDirection){
 // No new render objects: progressively distort the EXISTING struck armor.
 const severity=THREE.MathUtils.clamp(1-hpRatio,0,1);
 if(severity<=.01)return;
 const root=hitObject?.userData?.armorShellRoot || hitObject;
 if(root?.rotation){
   const side=zone==="leftShoulder"?-1:zone==="rightShoulder"?1:0;
   root.rotation.z+=(Math.random()-.5)*(.025+.075*severity) + side*.018*severity;
   root.rotation.x+=(Math.random()-.5)*(.020+.050*severity);
 }
 if(zone==="head"){
   if(this.helmetBrow?.visible)this.helmetBrow.rotation.z+=(Math.random()-.5)*(.025+.07*severity);
   if(this.helmetFace?.visible)this.helmetFace.rotation.y+=(Math.random()-.5)*(.02+.05*severity);
 }
}

removeFromCombatRaycasts(root){
 if(!root)return;
 const removed=new Set();
 if(root.isMesh)removed.add(root);
 root.traverse?.(o=>{if(o.isMesh)removed.add(o);});
 this.bodyRaycastObjects=this.bodyRaycastObjects.filter(o=>!removed.has(o));
 this.armorRaycastObjects=this.armorRaycastObjects.filter(o=>!removed.has(o));
}

severBodyZone(zone,shotDirection,hitPoint=null){
 if(this.severedBodyZones.has(zone))return false;
 const root=this.bodyDismemberRoots?.[zone];
 if(!root || Array.isArray(root))return false;

 // If shoulder armor is still present, let the EXISTING famous armor ejection
 // path fire first. Its launch/spin behavior is deliberately untouched.
 if(zone==="leftArm" && !this.zoneHP.leftShoulder.broken){
   this.zoneHP.leftShoulder.hp=0;this.zoneHP.leftShoulder.broken=true;
   this.ejectActualArmorGroup(this.leftShoulder,shotDirection,hitPoint,"leftShoulder");
 }
 if(zone==="rightArm" && !this.zoneHP.rightShoulder.broken){
   this.zoneHP.rightShoulder.hp=0;this.zoneHP.rightShoulder.broken=true;
   this.ejectActualArmorGroup(this.rightShoulder,shotDirection,hitPoint,"rightShoulder");
 }

 root.updateMatrixWorld?.(true);
 const worldPos=new THREE.Vector3(),worldQuat=new THREE.Quaternion(),worldScale=new THREE.Vector3();
 root.matrixWorld.decompose(worldPos,worldQuat,worldScale);
 if(root.parent)root.parent.remove(root);
 this.scene.add(root);
 root.position.copy(worldPos);root.quaternion.copy(worldQuat);root.scale.copy(worldScale);root.visible=true;
 this.removeFromCombatRaycasts(root);

 const dir=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 const radial=new THREE.Vector3((Math.random()-.5)*.7,.25+Math.random()*.35,(Math.random()-.5)*.7).normalize();
 const massScale=(zone.includes("Leg")?0.72:zone.includes("Arm")?0.90:1.0);
 this.severedBodyPieces.push({
   mesh:root,
   vel:dir.clone().multiplyScalar((8.0+Math.random()*4.8)*massScale)
     .addScaledVector(radial,5.2+Math.random()*3.8)
     .add(new THREE.Vector3(0,3.6+Math.random()*3.4,0)),
   spin:new THREE.Vector3((Math.random()-.5)*8,(Math.random()-.5)*9,(Math.random()-.5)*8),
   life:18
 });
 this.severedBodyZones.add(zone);
 this.spawnBloodImpact(hitPoint??worldPos,dir,2.15,true);
 // Keep a very small impact accent, but flesh breakup is now visually blood-led.
 this.spawnArcadeSparks(hitPoint??worldPos,dir,4);
 return true;
}

breakDownTorso(stage,shotDirection,hitPoint){
 if(stage<=this.postMortemTorsoStage)return false;
 this.postMortemTorsoStage=stage;
 const hideList=stage===1?this.bodyDismemberRoots.torsoUpper:this.bodyDismemberRoots.torsoLower;
 for(const obj of hideList||[]){
   if(!obj?.visible)continue;
   obj.visible=false;
   this.removeFromCombatRaycasts(obj);
 }
 const point=hitPoint?.clone?.() ?? this.group.position.clone().add(new THREE.Vector3(0,2,0));
 const dir=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 // Use the existing pooled impact reserve rather than creating torso debris meshes.
 this.spawnArmorImpactResponse("chest",point,dir,stage+2);
 this.spawnArcadeSparks(point,dir,stage===1?22:30);
 return true;
}

takePostMortemHit(zone,baseDamage,context={}){
 const shotDirection=context.shotDirection?.clone?.() ?? new THREE.Vector3(0,0,1);
 const hitPoint=context.hitPoint?.clone?.() ?? this.group.position.clone().add(new THREE.Vector3(0,2,0));
 const hitObject=context.hitObject??null;

 // Armor remains interactive on a corpse. This intentionally reuses the live
 // armor failure/ejection functions so the famous armor behavior stays identical.
 if(zone==="chest"){
   const panel=this.getChestPanelFromHitObject(hitObject);
   if(panel && !panel.broken){
     const broke=this.damageChestPanel(panel,14,shotDirection,hitPoint);
     this.zoneHP.chest.hp=this.getChestAggregateHP();
     return{type:"postmortem",zone,armorBreak:broke,killed:true};
   }
 }
 if((zone==="leftShoulder"||zone==="rightShoulder"||zone==="head") && !this.zoneHP[zone]?.broken){
   this.registerArcadeArmorHit(zone,shotDirection,hitPoint);
   return{type:"postmortem",zone,armorBreak:this.zoneHP[zone]?.broken,killed:true};
 }

 // Knees resolve into their owning leg for physical separation.
 if(zone==="leftKnee")zone="leftLeg";
 if(zone==="rightKnee")zone="rightLeg";
 if(zone==="body"||zone==="core"||zone==="chest"){
   const key=this.postMortemTorsoStage===0?"torsoUpper":"torsoLower";
   this.postMortemIntegrity[key]=Math.max(0,this.postMortemIntegrity[key]-Math.max(18,baseDamage));
   this.spawnImpactTrauma(hitPoint,shotDirection,"body",baseDamage,false,true);
   this.spawnBloodImpact(hitPoint,shotDirection,1.35,false);
   if(this.postMortemIntegrity.torsoUpper<=0 && this.postMortemTorsoStage===0)this.breakDownTorso(1,shotDirection,hitPoint);
   else if(this.postMortemIntegrity.torsoLower<=0 && this.postMortemTorsoStage===1)this.breakDownTorso(2,shotDirection,hitPoint);
   return{type:"postmortem",zone:"body",killed:true};
 }

 const key=zone;
 if(!(key in this.postMortemIntegrity))return{type:"postmortem",zone,killed:true};
 this.postMortemIntegrity[key]=Math.max(0,this.postMortemIntegrity[key]-Math.max(20,baseDamage));
 this.spawnImpactTrauma(hitPoint,shotDirection,zone,baseDamage,false,true);
 this.spawnBloodImpact(hitPoint,shotDirection,1.25,false);
 if(this.postMortemIntegrity[key]<=0)this.severBodyZone(key,shotDirection,hitPoint);
 return{type:"postmortem",zone:key,killed:true,severed:this.severedBodyZones.has(key)};
}

updateSeveredBodyPieces(dt){
 for(const p of this.severedBodyPieces){
   if(p.life<=0)continue;
   p.life-=dt;
   p.vel.y-=9.8*dt;
   p.mesh.position.addScaledVector(p.vel,dt);
   p.mesh.rotation.x+=p.spin.x*dt;
   p.mesh.rotation.y+=p.spin.y*dt;
   p.mesh.rotation.z+=p.spin.z*dt;
   // cheap ground settle; no rigid-body solver required.
   if(p.mesh.position.y<.10){
     p.mesh.position.y=.10;
     p.vel.y=Math.abs(p.vel.y)*.18;
     p.vel.x*=.78;p.vel.z*=.78;p.spin.multiplyScalar(.84);
   }
   if(p.life<=0)p.mesh.visible=false;
 }
 this.severedBodyPieces=this.severedBodyPieces.filter(p=>p.life>0);
}

resolveDamageZone(hit){
 return classifyTitanHit(this,hit);
}

raycastCombat(raycaster){
 // Raycast armor and body as separate target layers.
 // This prevents the rounded shoulder/body from stealing an armor shot.
 const armorHits=raycaster.intersectObjects(
   this.armorRaycastObjects.filter(o=>o.visible),
   false
 );

 const bodyHits=raycaster.intersectObjects(
   this.bodyRaycastObjects.filter(o=>o.visible),
   false
 );

 const armorHit=armorHits[0] ?? null;
 const bodyHit=bodyHits[0] ?? null;

 if(armorHit && bodyHit){
   // Armor is a shell sitting on the body. If the armor surface is
   // anywhere in front of OR essentially coincident with body depth,
   // treat it as armor.
   if(armorHit.distance <= bodyHit.distance + .35){
     return armorHit;
   }

   return bodyHit;
 }

 const chosen=armorHit ?? bodyHit ?? null;

 if(chosen){
   this.lastCombatZone=
     chosen.object?.userData?.zone ?? "body";
 }

 return chosen;
}

registerArcadeArmorHit(zone,shotDirection,hitPoint){
 const rule=this.arcadeArmor[zone];
 const section=this.zoneHP[zone];

 if(!rule || !section || section.broken){
   return false;
 }

 rule.hits++;
 this.lastArmorHitCount=rule.hits;

 // -------------------------------------------------------
 // v7.5.5 ARMOR-FIRST FAILURE LANGUAGE
 // Shoulder pads absorb four direct rifle hits. Every hit still kicks/dents/marks
 // the existing armor, but NONE of that damage leaks into anatomy. On the fourth
 // clean hit the exact existing armor-ejection path is used unchanged.
 // -------------------------------------------------------
 if(zone==="leftShoulder" || zone==="rightShoulder"){
   const hitsToBreak=rule.forceBreakHits||4;
   const remain=Math.max(0,hitsToBreak-rule.hits);
   section.hp=Math.max(0,Math.round(section.max*(remain/hitsToBreak)));

   if(rule.hits>=hitsToBreak || section.hp<=0){
     section.hp=0;
     section.broken=true;
     return this.ejectActualArmorGroup(
       zone==="leftShoulder" ? this.leftShoulder : this.rightShoulder,
       shotDirection,hitPoint,zone
     );
   }
   return false;
 }

 // Helmet absorbs a short, readable burst before exposing the skull.
 if(zone==="head"){
   const hitsToBreak=rule.forceBreakHits||3;
   section.hp=Math.max(0,section.max*(1-rule.hits/hitsToBreak));
   if(rule.hits>=hitsToBreak || section.hp<=0){
     section.hp=0;
     return this.breakZone(zone,shotDirection,hitPoint);
   }
   return false;
 }

 // Chest can take more punishment.
 if(zone==="chest"){
   section.hp=Math.max(0,section.hp-24);

   if(rule.hits>=6 || section.hp<=0){
     section.hp=0;
     return this.breakZone(zone,shotDirection,hitPoint);
   }

   return false;
 }

 return false;
}



getChestPanelFromHitObject(object){
 if(!object)return null;

 const id=object.userData?.chestPanelId;
 if(!id)return null;

 return this.chestPanels.find(p=>p.id===id) ?? null;
}

damageChestPanel(panel,damage,shotDirection,hitPoint){
 if(!panel || panel.broken)return false;

 panel.hp=Math.max(0,panel.hp-damage);
 panel.dents++;

 // v7.5.2: readable progressive armor failure without adding permanent meshes.
 // The struck panel deforms locally; its existing detach/ejection behavior is unchanged.
 const severity=1-(panel.hp/Math.max(1,panel.max));
 panel.mesh.rotation.z+=(Math.random()-.5)*(.035+.08*severity);
 panel.mesh.rotation.y+=(Math.random()-.5)*(.025+.06*severity);

 // Immediate readable dent / give.
 const ratio=panel.hp/panel.max;
 const dentAmount=.025 + (1-ratio)*.065;

 panel.mesh.scale.z=
   Math.max(.48,1-dentAmount*(1+panel.dents*.22));

 panel.mesh.position.z+=
   .015 + (1-ratio)*.025;

 panel.mesh.rotation.x+=(Math.random()-.5)*.045;
 panel.mesh.rotation.y+=(Math.random()-.5)*.055;
 panel.mesh.rotation.z+=(Math.random()-.5)*.045;

 this.spawnArmorImpactResponse(
   "chest",
   hitPoint,
   shotDirection,
   panel.dents
 );

 // At zero, THIS PANEL ONLY shatters/ejects.
 if(panel.hp<=0){
   panel.broken=true;

   const worldPos=new THREE.Vector3();
   const worldQuat=new THREE.Quaternion();
   const worldScale=new THREE.Vector3();

   panel.mesh.updateMatrixWorld(true);
   panel.mesh.matrixWorld.decompose(
     worldPos,
     worldQuat,
     worldScale
   );

   this.chest.remove(panel.mesh);
   this.scene.add(panel.mesh);

   panel.mesh.position.copy(worldPos);
   panel.mesh.quaternion.copy(worldQuat);
   panel.mesh.scale.copy(worldScale);

   // Remove from armor raycasts so exposed torso can receive shots.
   this.armorRaycastObjects=
     this.armorRaycastObjects.filter(o=>o!==panel.mesh);

   const dir=shotDirection.clone().normalize();

   this.ejectedArmor.push({
     mesh:panel.mesh,
     vel:dir.clone()
       .multiplyScalar(7.5+Math.random()*4)
       .add(new THREE.Vector3(
         (Math.random()-.5)*4,
         3.5+Math.random()*4,
         (Math.random()-.5)*3
       )),
     spin:new THREE.Vector3(
       7+Math.random()*10,
       8+Math.random()*12,
       6+Math.random()*10
     ),
     life:4
   });

   // Small local shatter around the exact panel break.
   this.spawnArcadeSparks(
     hitPoint,
     shotDirection,
     22
   );

   return true;
 }

 return false;
}

getChestAggregateHP(){
 return this.chestPanels.reduce(
   (sum,p)=>sum+Math.max(0,p.hp),
   0
 );
}

getChestAggregateMax(){
 return this.chestPanels.reduce(
   (sum,p)=>sum+p.max,
   0
 );
}


detachBodyBurstMesh(obj,shotDirection,hitPoint,velocityScale=1){
 if(!obj || !obj.visible || obj.userData?.titanDetachedBody)return false;
 obj.updateMatrixWorld?.(true);
 const worldPos=new THREE.Vector3(),worldQuat=new THREE.Quaternion(),worldScale=new THREE.Vector3();
 obj.matrixWorld.decompose(worldPos,worldQuat,worldScale);
 obj.parent?.remove(obj);
 this.scene.add(obj);
 obj.position.copy(worldPos);obj.quaternion.copy(worldQuat);obj.scale.copy(worldScale);
 obj.userData.titanDetachedBody=true;
 this.removeFromCombatRaycasts(obj);
 const dir=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 const radial=worldPos.clone().sub(hitPoint??worldPos);
 if(radial.lengthSq()<.0001)radial.set(Math.random()-.5,.35+Math.random(),Math.random()-.5);
 radial.normalize();
 this.severedBodyPieces.push({
   mesh:obj,
   vel:dir.clone().multiplyScalar((8+Math.random()*5)*velocityScale)
     .addScaledVector(radial,(4+Math.random()*5)*velocityScale)
     .add(new THREE.Vector3(0,(3+Math.random()*4)*velocityScale,0)),
   spin:new THREE.Vector3((Math.random()-.5)*12,(Math.random()-.5)*14,(Math.random()-.5)*12),
   life:18
 });
 return true;
}

burstExposedTorso(shotDirection,hitPoint){
 // No new geometry: violently detach EXISTING torso surfaces. This gives a real
 // visible catastrophic event instead of simply setting HP to zero and falling.
 let count=0;
 for(const obj of [this.bareChest,this.mirrorTorso]){
   if(this.detachBodyBurstMesh(obj,shotDirection,hitPoint,1.12))count++;
 }
 // One adjacent limb can be torn free by a center-mass catastrophic hit. This is
 // intentionally deterministic enough to read but varied enough not to repeat.
 const side=(hitPoint?.x ?? this.group.position.x) < this.group.position.x ? "leftArm" : "rightArm";
 if(!this.severedBodyZones.has(side)){
   const root=this.bodyDismemberRoots?.[side];
   if(root && this.severBodyZone(side,shotDirection,hitPoint))count++;
 }
 const p=hitPoint?.clone?.() ?? this.group.position.clone().add(new THREE.Vector3(0,2.2,0));
 const d=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 this.spawnArmorImpactResponse("chest",p,d,5);
 this.spawnArcadeSparks(p,d,30);
 return count>0;
}

applyLiveDismemberment(zone,shotDirection,hitPoint){
 // v7.5.3 — Soldier-of-Fortune-inspired *zonal* combat breakup, implemented
 // with TITAN's existing detachable hierarchy instead of pre-fragmenting actors.
 // A limb becomes an independent object only at catastrophic local failure.
 let severZone=zone;
 if(zone==="leftKnee")severZone="leftLeg";
 if(zone==="rightKnee")severZone="rightLeg";
 if(!["head","leftArm","rightArm","leftLeg","rightLeg"].includes(severZone))return false;
 if(this.severedBodyZones.has(severZone))return true;

 const severed=this.severBodyZone(severZone,shotDirection,hitPoint);
 if(!severed)return false;
 const burstPoint=hitPoint?.clone?.() ?? this.group.position.clone().add(new THREE.Vector3(0,2,0));
 const burstDir=shotDirection?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,1);
 // Cheap, pooled catastrophe punctuation; no permanent new meshes.
 this.spawnArmorImpactResponse(severZone==="head"?"head":"chest",burstPoint,burstDir,5);
 this.spawnArcadeSparks(burstPoint,burstDir,28);

 if(severZone==="head"){
   this.health=0;
   this.zoneHP.body.hp=0;this.zoneHP.core.hp=0;
   this.alive=false;
   this.beginDeathPerformance(shotDirection,hitPoint,"head","CATASTROPHIC CRANIAL");
   return true;
 }

 if(severZone.endsWith("Arm")){
   // TITAN BODY RULE: limb failure is devastating but does NOT secretly zero core HP.
   // Weapon handling is interrupted and the actor is heavily destabilized.
   this.stability=Math.max(0,this.stability-72);
   this.stagger=1;this.staggerTimer=Math.max(this.staggerTimer,1.35);
   this.burstShotsLeft=0;this.fireCooldown=Math.max(this.fireCooldown,1.15);
 }else{
   // Missing legs compromise mobility/stance, but the chest/head remain the lethal core.
   const remainingLegs=(this.severedBodyZones.has("leftLeg")?0:1)+(this.severedBodyZones.has("rightLeg")?0:1);
   const speedFactor=remainingLegs<=0?.16:.46;
   this.baseSpeed=Math.max(.22,this.baseSpeed*speedFactor);
   this.speed=Math.min(this.speed,this.baseSpeed);
   this.stability=Math.max(0,this.stability-88);
   this.stagger=1;this.staggerTimer=Math.max(this.staggerTimer,1.8);
   this.burstShotsLeft=0;
 }
 this.zoneHP.body.hp=this.health;
 this.zoneHP.core.hp=this.health;
 return true;
}

takeHit(zone,baseDamage,context={}){
 // v7.6.0 anatomical rig: detailed sub-zones resolve into the proven parent
 // damage paths while remaining available to reactions/logging/network events.
 const anatomy=context.anatomy ?? null;
 if(anatomy?.parentZone)zone=anatomy.parentZone;
 context.anatomicalZone=context.anatomicalZone ?? anatomy?.anatomicalZone ?? zone;
 // v4.6.2: the helmet is a real removable armor layer.
 // Exposed skull lethality is resolved after that armor layer has failed.
 const rawZone=String(zone||"body").toLowerCase();

 if(!this.alive){
   return this.takePostMortemHit(zone,baseDamage,context);
 }

 if(!this.zoneHP[zone]){
   zone="body";
 }

 const shotDirection=
   context.shotDirection?.clone() ??
   new THREE.Vector3(0,0,1);

 const hitPoint=
   context.hitPoint?.clone() ??
   this.group.position.clone().add(new THREE.Vector3(0,2.3,0));

 const armorPenetration=
   THREE.MathUtils.clamp(
     context.armorPenetration ?? 0,
     0,
     1
   );

 const section=
   this.zoneHP[zone];

 // -------------------------------------------------------
 // ARCADE ARMOR PATH
 // Shoulder / helmet / chest are independent removable armor items.
 // Direct hits always count toward THEIR OWN destruction.
 // -------------------------------------------------------
 const hitObject=context.hitObject ?? null;
 const chestPanel=
   zone==="chest"
   ?this.getChestPanelFromHitObject(hitObject)
   :null;

 const isRemovableArmor=
   zone==="leftShoulder" ||
   zone==="rightShoulder" ||
   zone==="head" ||
   zone==="chest";

 if(isRemovableArmor && !section.broken){

   // -----------------------------------------------------
   // SEGMENTED CHEST PATH
   // Direct chest hits damage the exact panel struck.
   // -----------------------------------------------------
   if(zone==="chest" && chestPanel){
     const beforeHP=chestPanel.hp;

     this.kickArmor(
       zone,
       baseDamage,
       false,
       false,
       shotDirection
     );

     this.flashArmorPiece(zone);

     const brokePanel=this.damageChestPanel(
       chestPanel,
       14,
       shotDirection,
       hitPoint
     );

     const chestHP=this.getChestAggregateHP();
     const chestMax=this.getChestAggregateMax();

     this.zoneHP.chest.hp=chestHP;
     this.zoneHP.chest.max=chestMax;

     this.armor=
       Math.max(0,this.zoneHP.leftShoulder.hp) +
       Math.max(0,this.zoneHP.rightShoulder.hp) +
       Math.max(0,this.zoneHP.head.hp) +
       chestHP;

     const dealt=beforeHP-chestPanel.hp;

     return{
       type:"damage",
       zone:"chest",
       label:`CHEST ${chestPanel.id}`,
       damage:dealt,
       critical:false,
       critChance:0,
       armorDamage:dealt,
       coreDamage:0,
       penetrated:false,
       armorPenetration:0,
       sectionHP:Math.ceil(chestPanel.hp),
       sectionMax:chestPanel.max,
       totalArmor:Math.ceil(this.armor),
       totalArmorMax:this.maxArmor,
       coreHP:Math.ceil(this.health),
       coreMax:this.maxHealth,
       armorBreak:brokePanel,
       stability:Math.ceil(this.stability),
       staggered:false,
       killed:false
     };
   }

   const beforeHP=section.hp;

   this.kickArmor(
     zone,
     baseDamage,
     false,
     false,
     shotDirection
   );

   this.flashArmorPiece(zone);
   this.applyArmorDamageStage?.(zone,hitObject,section.hp/Math.max(1,section.max),shotDirection);
   this.spawnArcadeSparks(hitPoint,shotDirection,10);

   const nextHitNumber=(this.arcadeArmor[zone]?.hits ?? 0)+1;
   this.spawnArmorImpactResponse(
     zone,
     hitPoint,
     shotDirection,
     nextHitNumber
   );

   const broke=this.registerArcadeArmorHit(
     zone,
     shotDirection,
     hitPoint
   );

   // Recalculate simple total removable armor pool.
   this.armor=
     Math.max(0,this.zoneHP.leftShoulder.hp) +
     Math.max(0,this.zoneHP.rightShoulder.hp) +
     Math.max(0,this.zoneHP.head.hp) +
     Math.max(0,this.zoneHP.chest.hp);

   const dealt=beforeHP-section.hp;

   return{
     type:"damage",
     zone,
     label:section.label,
     damage:dealt,
     critical:false,
     critChance:0,
     armorDamage:dealt,
     coreDamage:0,
     penetrated:false,
     armorPenetration:0,
     sectionHP:Math.ceil(section.hp),
     sectionMax:section.max,
     totalArmor:Math.ceil(this.armor),
     totalArmorMax:this.maxArmor,
     coreHP:Math.ceil(this.health),
     coreMax:this.maxHealth,
     armorBreak:broke,
     stability:Math.ceil(this.stability),
     staggered:false,
     killed:false
   };
 }

 // -------------------------------------------------------
 // EXPOSED HEAD — NON-BULLET-SPONGE LETHALITY
 // Center = immediate kill. Off-center = roughly 2 shots.
 // Edge/glancing = roughly 3 shots. Helmet still protects first.
 // -------------------------------------------------------
 if(zone==="head" && section.broken && !context?.melee){
   let placement=.55;

   if(context.hitObject===this.skull && context.hitPoint){
     const local=this.skull.worldToLocal(context.hitPoint.clone());
     const nx=local.x/.31;
     const ny=local.y/.322;
     placement=Math.sqrt(nx*nx+ny*ny);
   }

   let anatomyDamage=540;
   let quality="CRANIAL";

   if(placement<.40){
     anatomyDamage=1200;
     quality="CRANIAL CENTER";
   }else if(placement>=.74){
     anatomyDamage=370;
     quality="GLANCING HEAD";
   }

   this.health=Math.max(0,this.health-anatomyDamage);
   this.zoneHP.body.hp=this.health;
   this.zoneHP.core.hp=this.health;

   this.spawnImpactTrauma(hitPoint,shotDirection,"head",anatomyDamage,true,true);
   this.spawnBloodImpact(hitPoint,shotDirection,placement<.40?1.85:1.35,false);
   const physics=this.applyImpactPhysics("head",anatomyDamage,shotDirection,true,true);

   if(this.health<=0){
     // High-energy exposed-head impacts can physically remove the head during
     // combat, not only after the corpse settles.
     this.applyLiveDismemberment("head",shotDirection,hitPoint);
     if(this.alive){
       this.alive=false;
       this.beginDeathPerformance(shotDirection,hitPoint,"head",quality);
     }
   }

   return{
     type:"damage",zone:"head",label:quality,damage:anatomyDamage,
     critical:true,critChance:1,armorDamage:0,coreDamage:anatomyDamage,
     penetrated:true,armorPenetration:1,sectionHP:0,sectionMax:section.max,
     totalArmor:Math.ceil(this.armor),totalArmorMax:this.maxArmor,
     coreHP:Math.ceil(this.health),coreMax:this.maxHealth,armorBreak:false,
     stability:physics.stability,staggered:physics.staggered,killed:!this.alive
   };
 }

 // -------------------------------------------------------
 // EXPOSED ARMS — independently damageable after shoulder armor is defeated.
 // Focused live fire can catastrophically separate them during combat.
 // -------------------------------------------------------
 if(zone==="leftArm"||zone==="rightArm"){
   const limb=this.zoneHP[zone];
   const limbDamage=Math.max(30,baseDamage*.92);
   limb.hp=Math.max(0,limb.hp-limbDamage);
   const coreDamage=0;
   // Local limb trauma does not silently drain the global HP pool. The visible
   // catastrophic separation is the decisive event, not an invisible health bar.
   this.health=Math.max(0,this.health-coreDamage);
   this.zoneHP.body.hp=this.health;
   this.zoneHP.core.hp=this.health;
   this.applyRigImpact(zone==="leftArm"?"leftShoulder":"rightShoulder",limbDamage,shotDirection);
   this.spawnBloodImpact(hitPoint,shotDirection,1.15,false);
   this.stability=Math.max(0,this.stability-20);
   if(limb.hp<=0 && !limb.broken){
     limb.broken=true;
     this.applyLiveDismemberment(zone,shotDirection,hitPoint);
   }
   if(this.health<=0 && this.alive){
     this.alive=false;
     this.beginDeathPerformance(shotDirection,hitPoint,zone,"UPPER LIMB LETHAL");
   }
   return{
     type:"damage",zone,label:limb.label,damage:Math.round(limbDamage),
     critical:false,critChance:0,armorDamage:0,coreDamage,
     penetrated:true,armorPenetration:1,sectionHP:Math.ceil(limb.hp),sectionMax:limb.max,
     totalArmor:Math.ceil(this.armor),totalArmorMax:this.maxArmor,
     coreHP:Math.ceil(this.health),coreMax:this.maxHealth,armorBreak:limb.broken,
     stability:Math.ceil(this.stability),staggered:this.staggerTimer>0,killed:!this.alive
   };
 }

 // -------------------------------------------------------
 // LOWER BODY — shootable legs / knees.
 // Not instant kills: they produce mobility/stagger consequences and local HP loss.
 // -------------------------------------------------------
 if(zone==="leftKnee"||zone==="rightKnee"||zone==="leftLeg"||zone==="rightLeg"){
   const isKnee=zone.endsWith("Knee");
   const limb=this.zoneHP[zone];
   const limbDamage=isKnee?Math.max(36,baseDamage*1.12):Math.max(30,baseDamage*.90);
   limb.hp=Math.max(0,limb.hp-limbDamage);

   // Some physiological damage, but the real penalty is movement/stance.
   const coreDamage=0;
   // Same rule for legs: visible local failure drives lethality; no hidden HP bleed.
   this.health=Math.max(0,this.health-coreDamage);
   this.zoneHP.body.hp=this.health;
   this.zoneHP.core.hp=this.health;

   this.applyRigImpact(zone,limbDamage,shotDirection);
   this.spawnBloodImpact(hitPoint,shotDirection,isKnee?1.35:1.1,false);
   this.stability=Math.max(0,this.stability-(isKnee?45:24));

   if(limb.hp<=0 && !limb.broken){
     limb.broken=true;
     this.applyLiveDismemberment(zone,shotDirection,hitPoint);
   }

   if(this.health<=0 && this.alive){
     this.alive=false;
     this.beginDeathPerformance(shotDirection,hitPoint,zone,"LOWER BODY LETHAL");
   }

   return{
     type:"damage",zone,label:limb.label,damage:Math.round(limbDamage),
     critical:isKnee,critChance:isKnee?1:0,armorDamage:0,coreDamage,
     penetrated:true,armorPenetration:1,
     sectionHP:Math.ceil(limb.hp),sectionMax:limb.max,
     totalArmor:Math.ceil(this.armor),totalArmorMax:this.maxArmor,
     coreHP:Math.ceil(this.health),coreMax:this.maxHealth,
     armorBreak:limb.broken,stability:Math.ceil(this.stability),
     staggered:this.staggerTimer>0,killed:!this.alive
   };
 }

 // FOUNDATION BODY RULE: an exposed torso is vulnerable, bloody and physically reactive,
 // but a normal rifle round does NOT make the whole actor shatter. Torso/core vitality is
 // depleted over repeated hits; catastrophic torso breakup is reserved for corpse damage
 // or future genuinely high-energy weapon classes.
 if(zone==="body" && rawZone==="body"){
   const torsoDamage=Math.max(72,Math.round(baseDamage*2.05));
   this.health=Math.max(0,this.health-torsoDamage);
   this.zoneHP.body.hp=this.health;
   this.zoneHP.core.hp=this.health;

   this.spawnImpactTrauma(hitPoint,shotDirection,"body",torsoDamage,false,true);
   this.spawnBloodImpact(hitPoint,shotDirection,1.45,false);
   const physics=this.applyImpactPhysics("body",torsoDamage,shotDirection,false,true);

   if(this.health<=0 && this.alive){
     this.alive=false;
     this.beginDeathPerformance(shotDirection,hitPoint,"body","TORSO LETHAL");
   }

   return{
     type:"damage",zone:"body",label:"EXPOSED TORSO",damage:torsoDamage,
     critical:false,critChance:0,armorDamage:0,coreDamage:torsoDamage,
     penetrated:true,armorPenetration:1,
     sectionHP:Math.ceil(this.health),sectionMax:section.max,
     totalArmor:Math.ceil(this.armor),totalArmorMax:this.maxArmor,
     coreHP:Math.ceil(this.health),coreMax:this.maxHealth,armorBreak:false,
     stability:physics.stability,staggered:physics.staggered,killed:!this.alive
   };
 }

 let critChance=.05;

 if(zone==="head"){
   critChance=.20;
 }

 if(zone==="core"){
   critChance=1;
 }

 const critical=
   Math.random()<critChance;

 const critMultiplier=
   critical
   ?1.5
   :1;

 const rawDamage=
   Math.max(
     1,
     Math.round(
       baseDamage*critMultiplier
     )
   );

 let armorDamage=0;
 let coreDamage=0;
 let armorBreak=false;
 let penetrated=false;

 // -------------------------------------------------------
 // ARMOR PENETRATION
 //
 // AP rounds can split damage:
 // part to armor, part directly to health.
 // -------------------------------------------------------
 if(zone==="core" && this.armor<=0){
   coreDamage=rawDamage;

   this.health=Math.max(
     0,
     this.health-coreDamage
   );

   section.hp=this.health;

   penetrated=true;

 }else if(zone==="body"){
   // Underlying body is a separate high-HP target.
   coreDamage=rawDamage;
   this.health=Math.max(
     0,
     this.health-coreDamage
   );

   section.hp=this.health;
   penetrated=true;

 }else if(this.armor>0){
   const throughDamage=
     Math.round(
       rawDamage *
       armorPenetration
     );

   const stoppedDamage=
     rawDamage-throughDamage;

   armorDamage=
     Math.max(
       1,
       stoppedDamage
     );

   coreDamage=
     Math.max(
       0,
       throughDamage
     );

   penetrated=
     coreDamage>0;

   this.armor=Math.max(
     0,
     this.armor-armorDamage
   );

   section.hp=Math.max(
     0,
     section.hp-armorDamage
   );

   // Total armor is just the sum of still-present armor piece HP.
   this.armor=
     Math.max(0,this.zoneHP.leftShoulder.hp) +
     Math.max(0,this.zoneHP.rightShoulder.hp) +
     Math.max(0,this.zoneHP.head.hp) +
     Math.max(0,this.zoneHP.chest.hp);

   if(coreDamage>0){
     this.health=Math.max(
       0,
       this.health-coreDamage
     );
   }

   if(
     section.hp<=0 &&
     !section.broken
   ){
     armorBreak=
       this.breakZone(
         zone,
         shotDirection,
         hitPoint
       );
   }

   if(this.armor<=0){
     this.armor=0;
     this.core.visible=true;
   }

 }else{
   coreDamage=rawDamage;

   this.health=Math.max(
     0,
     this.health-coreDamage
   );

   penetrated=true;
 }

 // Every bullet now leaves a localized physical story at its actual hit point.
 this.spawnImpactTrauma(
   hitPoint,
   shotDirection,
   zone,
   rawDamage,
   critical,
   penetrated
 );
 if(penetrated && (zone==="body"||zone==="core"||this.armor<=0)){
   this.spawnBloodImpact(hitPoint,shotDirection,critical?1.5:1.0,false);
 }

 this.kickArmor(
   zone,
   rawDamage,
   critical,
   penetrated,
   shotDirection
 );

 const physics=
   this.applyImpactPhysics(
     zone,
     rawDamage,
     shotDirection,
     critical,
     penetrated
   );

 if(this.health<=0){
   this.alive=false;
   this.beginDeathPerformance(shotDirection,hitPoint,zone,critical?"CRITICAL":"LETHAL");
 }

 return{
   type:"damage",

   zone,
   label:section.label,

   damage:rawDamage,

   critical,
   critChance,

   armorDamage,
   coreDamage,

   penetrated,
   armorPenetration,

   sectionHP:Math.ceil(section.hp),
   sectionMax:section.max,

   totalArmor:Math.ceil(this.armor),
   totalArmorMax:this.maxArmor,

   coreHP:Math.ceil(this.health),
   coreMax:this.maxHealth,

   armorBreak,

   stability:
     physics.stability,

   staggered:
     physics.staggered,

   killed:!this.alive
 };
}
}
