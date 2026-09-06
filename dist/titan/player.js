import * as THREE from "three";
import { ProceduralTitanGear } from "./proceduralGear.js?v=4.8.20";
import { DragonCape } from "./capePhysics.js?v=7.5.2";
import { QuaterniusNativeRig } from "./quaterniusNativeRig.js?v=18.0.0";

export class Player{
constructor(scene,camera,input,worldRoot=null){
 this.scene=scene;
 this.worldRoot=worldRoot;
 this.worldCollisionMeshes=[];
 this.camera=camera;
 this.input=input;
 this.group=new THREE.Group();

 this.yaw=0;
 this.pitch=0.02;
 this.inspectYaw=0;
 this.inspectPitch=0;
 this.inspectActive=false;
 this.aimBlend=0;
 this.aiming=false;

 this.health=100;
 this.armor=100;

 // v4.7.8 MERCENARY ECONOMY FOUNDATION
 // Later this comes from contracts, bounties, loot sales and multiplayer trade.
 this.credits=650;

 // v2.7 PLAYER ARMOR — separate removable zones.
 this.playerArmorZones={
   helmet:{hp:100,max:100,broken:false},
   leftShoulder:{hp:40,max:40,broken:false},
   rightShoulder:{hp:40,max:40,broken:false},
   chest:{hp:90,max:90,broken:false}
 };
 this.lastIncomingHit=null;
 this.visorDamage=0;
 this.droppedHelmet=null;
 this.visorRaised=false;
 this.flashlightEnabled=false;
 this.flashlightRig=new THREE.Group();
 this.flashlightRig.name="player_flashlight_rig";

 // Body/chest-mounted lamp: readable cone, deliberately not a night-killer.
 this.flashlight=new THREE.SpotLight(
   0xfff0cf,
   260,        // deliberately strong field lamp
   48,
   THREE.MathUtils.degToRad(36),
   .66,
   1.65
 );
 this.flashlight.castShadow=false; // performance-first for browser/Electron
 // PREWARM: stay in the renderer's light list from frame 1.
 // F changes intensity only, avoiding first-use shader compilation hitch.
 this.flashlight.visible=true;
 this.flashlight.intensity=0;
 this.flashlight.position.set(.34,2.25,-.42);

 this.flashlightTarget=new THREE.Object3D();
 this.flashlightTarget.position.set(.34,1.92,-13.5);

 this.group.add(this.flashlight);
 this.group.add(this.flashlightTarget);
 this.flashlight.target=this.flashlightTarget;

 // Small emissive lens so other players can later see the light unit on the armor.
 const flashlightHousing=new THREE.Mesh(
   new THREE.BoxGeometry(.22,.16,.28),
   new THREE.MeshStandardMaterial({
     color:0x111820,
     roughness:.38,
     metalness:.72
   })
 );
 flashlightHousing.position.set(.34,2.28,-.34);
 this.group.add(flashlightHousing);

 this.flashlightLens=new THREE.Mesh(
   new THREE.CircleGeometry(.07,14),
   new THREE.MeshBasicMaterial({
     color:0xfff3d2,
     transparent:true,
     opacity:.16
   })
 );
 this.flashlightLens.position.set(.34,2.28,-.49);
 this.flashlightLens.rotation.y=Math.PI;
 this.group.add(this.flashlightLens);

 this.helmetProfile={
   id:"titan_starter",
   name:"TITAN STARTER VISOR",
   tier:1,
   chips:{targetHighlight:true,rangefinder:true,nightVision:true},
   nightVisionStrength:.34
 };

 // HELMET SERVICE / VARIANT FOUNDATION.
 // Merchants can repair, replace, downgrade, or install chips without rewriting combat code.
 this.helmetCatalog={
   titan_starter:{
     id:"titan_starter",
     name:"TITAN STARTER VISOR",
     tier:1,
     maxDurability:100,
     chips:{targetHighlight:true,rangefinder:true,nightVision:true},
     nightVisionStrength:.34,
     repairCostPerPoint:2,
     purchasePrice:420
   },
   field_shell:{
     id:"field_shell",
     name:"FIELD SHELL",
     tier:0,
     maxDurability:100,
     chips:{targetHighlight:false,rangefinder:true,nightVision:false},
     nightVisionStrength:0,
     repairCostPerPoint:1,
     purchasePrice:190
   },
   recon_mk2:{
     id:"recon_mk2",
     name:"RECON MK II",
     tier:2,
     maxDurability:100,
     chips:{targetHighlight:true,rangefinder:true,nightVision:true},
     nightVisionStrength:.50,
     repairCostPerPoint:4,
     purchasePrice:860
   }
 };

 // Pooled electrical helmet-hit FX. No new geometry/material allocation during firefights.
 this.helmetSparkPool=[];
 this.helmetSparkCursor=0;
 const helmetSparkMat=new THREE.MeshBasicMaterial({
   color:0xffd35c,
   transparent:true,
   opacity:0,
   depthWrite:false
 });
 for(let i=0;i<28;i++){
   const spark=new THREE.Mesh(
     new THREE.BoxGeometry(.018,.018,.12),
     helmetSparkMat.clone()
   );
   spark.visible=false;
   spark.userData.velocity=new THREE.Vector3();
   spark.userData.life=0;
   spark.userData.maxLife=.18;
   this.scene.add(spark);
   this.helmetSparkPool.push(spark);
 }
 this.helmetArcLight=new THREE.PointLight(0x79dfff,0,2.8,2);
 this.helmetArcLight.visible=false;
 this.scene.add(this.helmetArcLight);

 this.cameraImpact=new THREE.Vector3();
 this.cameraImpactRoll=0;
 this.cameraTurnRoll=0;
 this.cameraTurnRollTarget=0;
 this.cameraRollLimit=THREE.MathUtils.degToRad(2.2);
 this.weaponHeat=0;
 this.weaponHeatMax=100;
 this.weaponHeatDecay=16;
 this.weaponHeatPerShot=6.2;
 this.heatMeshes=[];

 // v4.5.1 NERVES / STRESS
 this.stress=0;
 this.stressMax=100;
 this.stressCombatHold=0;
 this.stressSwayYaw=0;
 this.stressSwayPitch=0;
 this.stressBreathPhase=0;
 this.cigarettes=3;
 this.smoking=false;this.smokeTime=0;this.smokeDuration=180;this.smokeReliefPerSecond=0;
 this.cigaretteRemaining=1;this.cigaretteDragging=false;this.cigaretteDragTime=0;this.cigarettePuffs=0;
 this.smoking=false;
 this.smokeTime=0;
 this.smokeDuration=11.5;
 this.smokeReliefPerSecond=3.4;
 this.ballisticPose={
   torsoPitch:0,torsoYaw:0,torsoRoll:0,abdomenPitch:0,
   headPitch:0,headYaw:0,
   leftShoulderPitch:0,leftShoulderYaw:0,leftShoulderRoll:0,
   rightShoulderPitch:0,rightShoulderYaw:0,rightShoulderRoll:0,
   leftArmPitch:0,leftArmRoll:0,rightArmPitch:0,rightArmRoll:0
 };
 this.velocity=new THREE.Vector3();
 this.walkSpeed=6.5;
 this.runSpeed=10.4;
 this.accel=17;
 this.brake=31;


 this.suitTime=0;
 this.breathTime=0;

 // DRAGON PHYSICS — powered armor body simulation
 this.stepPhase=0;
 this.bodyBobY=0;
 this.bodyBobX=0;
 this.bodyRoll=0;
 this.bodyPitch=0;
 this.bodyYawLag=0;
 this.bodyCompression=0;
 this.bodyRecovery=0;
 this.stepImpulse=0;
 this.lastStepSign=1;
 this.massVisual=1.0;
 this.powerAssist=0;
 this.powerAssistTarget=0;
 this.stopImpulse=0;
 this.turnImpulse=0;
 this.recoilPitch=0;
 this.recoilYaw=0;
 this.hitPitch=0;
 this.hitYaw=0;
 this.isReloading=false;

 this.weaponKick=0;
 this.weaponVibration=0;
 this.weaponShotPulse=0;
 this.meleeStrike=0;
 this.meleeStrikeSerial=0;
 this.meleeAnimTime=-1;
 this.meleeAnimDuration=.50;
 this.weaponShotIndex=0;
 // PASS 07 — layered master-rig impulses (weapon -> arms -> shoulder -> torso).
 this.masterRecoil=0; this.masterRecoilVelocity=0;
 this.masterHitHead=0; this.masterHitChest=0; this.masterHitShoulderL=0; this.masterHitShoulderR=0;
 this.masterHitYaw=0; this.masterHitRoll=0;

 this.weaponAimQuat=new THREE.Quaternion();
 this.weaponAimQuatTarget=new THREE.Quaternion();
 this.weaponAimLocalDir=new THREE.Vector3(0,0,-1);
 this.weaponAimPoint=new THREE.Vector3();
 this.weaponAimReady=false;

 this.reticleLag=new THREE.Vector2();
 this.reticleVelocity=new THREE.Vector2();

 // v3.6 RECOVERED EQUIPMENT RIG
 this.backWeaponAnchor=new THREE.Group();
 this.backWeaponAnchor.position.set(.22,2.28,.84);
 this.group.add(this.backWeaponAnchor);

 this.backWeapon=null;
 this.backWeaponMeta=null;
 // Sling rig: stock rides above the right shoulder; barrel crosses down toward the opposite hip.
this.backWeaponBaseRotation=new THREE.Euler(-1.50,-.18,-.88);
 this.backWeaponSwing=new THREE.Vector3();
 this.backWeaponSwingVelocity=new THREE.Vector3();
 this.backWeaponPrevVelocity=new THREE.Vector3();
 this.backWeaponHeave=0;

 // v4.4.2 heavy back equipment: independent greatsword rig.
 this.backSwordAnchor=new THREE.Group();
 this.backSwordAnchor.position.set(-.10,2.46,.88);
 this.group.add(this.backSwordAnchor);
 this.backSword=null;
 this.backSwordRoll=0;
 this.backSwordRollVel=0;
 this.backSwordPrevVelocity=new THREE.Vector3();

 // v4.4.3 usable melee rig.
 this.swordHandAnchor=new THREE.Group();
 this.swordHandAnchor.position.set(.78,1.96,-.40);
 this.group.add(this.swordHandAnchor);

 this.swordEquipped=false;
 this.swordSwinging=false;
 this.swordSwingTime=0;
 this.swordSwingDuration=.62;
 this.swordSwingSerial=0;
 this.swordHitSerial=-1;
 this.swordHitWindow=false;
 this.swordPrevBase=new THREE.Vector3();
 this.swordPrevMid=new THREE.Vector3();
 this.swordPrevTip=new THREE.Vector3();
 this.swordPrevValid=false;
 this.swordControlYaw=0;
 this.swordControlPitch=0;
 this.swordBladeSpeed=0;
 this.swordControlActive=false;

 const armorDark=new THREE.MeshStandardMaterial({color:0x252b30,metalness:.82,roughness:.29});
 const armorMid=new THREE.MeshStandardMaterial({color:0x46515a,metalness:.78,roughness:.31});
 const armorEdge=new THREE.MeshStandardMaterial({color:0x69747d,metalness:.68,roughness:.35});
 const under=new THREE.MeshStandardMaterial({color:0x101417,roughness:.78});
 const ceramicDark=new THREE.MeshStandardMaterial({
   color:0x171c20,metalness:.28,roughness:.54
 });
 const gunMat=new THREE.MeshStandardMaterial({color:0x20262a,metalness:.9,roughness:.23});
 const gunEdge=new THREE.MeshStandardMaterial({color:0x59636a,metalness:.84,roughness:.25});

 const roundedBoxGeometry=(w,h,d,r=Math.min(w,h,d)*.16)=>{
   r=Math.max(.018,Math.min(r,w*.28,h*.28));
   const sh=new THREE.Shape(); const x=-w/2,y=-h/2;
   sh.moveTo(x+r,y); sh.lineTo(x+w-r,y); sh.quadraticCurveTo(x+w,y,x+w,y+r);
   sh.lineTo(x+w,y+h-r); sh.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
   sh.lineTo(x+r,y+h); sh.quadraticCurveTo(x,y+h,x,y+h-r);
   sh.lineTo(x,y+r); sh.quadraticCurveTo(x,y,x+r,y);
   const g=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:Math.min(r*.42,d*.16),bevelThickness:Math.min(r*.34,d*.12),curveSegments:3});
   g.translate(0,0,-d/2); g.computeVertexNormals(); return g;
 };
 const box=(name,size,pos,mat,parent=this.group)=>{
   const armorLike=/armor|plate|shoulder|gauntlet|shin|knee|helmet|backpack|pelvis/i.test(name);
   const geo=armorLike?roundedBoxGeometry(...size):new THREE.BoxGeometry(...size);
   const m=new THREE.Mesh(geo,mat);
   m.name=name;m.position.set(...pos);parent.add(m);m.castShadow=true;return m;
 };
 const cyl=(name,r1,r2,h,pos,rot,mat,parent=this.group,seg=10)=>{
   const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat);
   m.name=name;m.position.set(...pos);m.rotation.set(...rot);parent.add(m);m.castShadow=true;return m;
 };

 const cone=(name,r,h,pos,rot,mat,parent=this.group,seg=10)=>{
   const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat);
   m.name=name;m.position.set(...pos);m.rotation.set(...rot);parent.add(m);m.castShadow=true;return m;
 };

 const wedge=(name,w,h,d,pos,rot,mat,parent=this.group)=>{
   // Trapezoid/wedge panel: gives anime-mecha / heavy industrial silhouette
   // without adding another rectangular box.
   const hw=w/2,hh=h/2,hd=d/2;
   const verts=new Float32Array([
     -hw,-hh,-hd,   hw,-hh,-hd,   hw*.72, hh,-hd,  -hw*.72, hh,-hd,
     -hw,-hh, hd,   hw,-hh, hd,   hw*.72, hh, hd,  -hw*.72, hh, hd
   ]);
   const idx=[
     0,1,2, 0,2,3,
     4,6,5, 4,7,6,
     0,4,5, 0,5,1,
     1,5,6, 1,6,2,
     2,6,7, 2,7,3,
     3,7,4, 3,4,0
   ];
   const g=new THREE.BufferGeometry();
   g.setAttribute("position",new THREE.BufferAttribute(verts,3));
   g.setIndex(idx);g.computeVertexNormals();
   const m=new THREE.Mesh(g,mat);
   m.name=name;m.position.set(...pos);m.rotation.set(...rot);parent.add(m);m.castShadow=true;
   return m;
 };


 const bodyCapsule=(name,r,length,pos,rot,scale,mat,parent=this.group)=>{
   const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,length,8,14),mat);
   m.name=name;m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);
   m.castShadow=true;parent.add(m);return m;
 };

 const ellipsoid=(name,r,pos,scale,mat,parent=this.group,seg=16)=>{
   const m=new THREE.Mesh(new THREE.SphereGeometry(r,seg,12),mat);
   m.name=name;m.position.set(...pos);m.scale.set(...scale);
   m.castShadow=true;parent.add(m);return m;
 };

 const taperedPlate=(name,topW,bottomW,h,d,pos,rot,mat,parent=this.group)=>{
   const ht=h/2,hd=d/2,tw=topW/2,bw=bottomW/2;
   const verts=new Float32Array([
     -bw,-ht,-hd, bw,-ht,-hd, tw,ht,-hd, -tw,ht,-hd,
     -bw,-ht, hd, bw,-ht, hd, tw,ht, hd, -tw,ht, hd
   ]);
   const idx=[
     0,1,2,0,2,3, 4,6,5,4,7,6,
     0,4,5,0,5,1, 1,5,6,1,6,2,
     2,6,7,2,7,3, 3,7,4,3,4,0
   ];
   const g=new THREE.BufferGeometry();
   g.setAttribute("position",new THREE.BufferAttribute(verts,3));
   g.setIndex(idx);g.computeVertexNormals();
   const m=new THREE.Mesh(g,mat);
   m.name=name;m.position.set(...pos);m.rotation.set(...rot);
   parent.add(m);m.castShadow=true;return m;
 };

 // v4.8.20 BODY LAB // PROCEDURAL HUMAN FOUNDATION
 const anatomyMat=new THREE.MeshStandardMaterial({color:0x936652,roughness:.91,metalness:0});
 this.skinMaterial=anatomyMat;
 const trouserMat=new THREE.MeshStandardMaterial({color:0x151718,roughness:.94,metalness:.01});

 this.pelvisBody=ellipsoid("pelvisBody",.34,[0,1.02,.01],[1.02,.74,.78],anatomyMat);
 this.abdomen=bodyCapsule("abdomen",.235,.34,[0,1.35,0],[0,0,0],[1.06,1,.72],anatomyMat);
 this.torso=ellipsoid("torso",.43,[0,1.74,0],[1.16,1.17,.70],anatomyMat);
 this.pecL=ellipsoid("pecL",.225,[-.205,1.84,-.115],[1.22,.72,.55],anatomyMat);
 this.pecR=ellipsoid("pecR",.225,[ .205,1.84,-.115],[1.22,.72,.55],anatomyMat);
 this.trapL=bodyCapsule("trapL",.095,.25,[-.18,2.05,-.015],[0,0,-.72],[1,1,.82],anatomyMat);
 this.trapR=bodyCapsule("trapR",.095,.25,[ .18,2.05,-.015],[0,0,.72],[1,1,.82],anatomyMat);
 this.neckCore=bodyCapsule("neckCore",.125,.16,[0,2.18,.005],[0,0,0],[1.03,1,.90],anatomyMat);
 this.headCore=ellipsoid("headCore",.245,[0,2.47,0],[.88,1.14,.91],anatomyMat);
 this.jawCore=ellipsoid("jawCore",.16,[0,2.36,-.035],[.92,.66,.82],anatomyMat);
 this.trouserPelvis=ellipsoid("trouserPelvis",.34,[0,1.00,.015],[1.02,.68,.80],trouserMat);

 // VARIANT 02 — GRIM CUIRASS.
 // Broad human ribcage, split breastplates, inward taper and segmented abdomen.
 this.chestArmor=taperedPlate("chestArmor_V2",1.13,.70,.67,.16,[0,1.78,-.34],[0,0,0],armorMid);

 taperedPlate("pecPlateL",.53,.39,.34,.10,[-.265,1.91,-.455],[.02,.035,.025],armorEdge);
 taperedPlate("pecPlateR",.53,.39,.34,.10,[ .265,1.91,-.455],[.02,-.035,-.025],armorEdge);
 taperedPlate("ribCageL",.42,.29,.27,.09,[-.205,1.59,-.445],[.02,.025,.055],armorDark);
 taperedPlate("ribCageR",.42,.29,.27,.09,[ .205,1.59,-.445],[.02,-.025,-.055],armorDark);
 taperedPlate("sternumKeel",.17,.11,.62,.12,[0,1.76,-.505],[0,0,0],ceramicDark);

 for(let i=0;i<4;i++){
   const yy=1.46-i*.105, ww=.54-i*.055;
   const seg=taperedPlate("abdPlate_"+i,ww,ww-.055,.075,.075,[0,yy,-.382],[.035,0,0],i%2?armorDark:armorMid);
   seg.rotation.x=.035+i*.012;
 }
 taperedPlate("backPlate_V2",1.00,.66,.72,.15,[0,1.76,.32],[0,Math.PI,0],armorDark);

 // Layered backpack / reactor silhouette.
 box("backpack",[.62,.72,.28],[0,1.73,.48],armorDark);
 box("backpackTop",[.50,.22,.22],[0,2.11,.48],armorMid);
 box("backpackL",[.18,.48,.20],[-.40,1.75,.46],armorEdge);
 box("backpackR",[.18,.48,.20],[.40,1.75,.46],armorEdge);

 // v4.8.20 ADVANCED MERCENARY ARMOR CONSTRUCTION
 // Secondary plates / beveled rails / collar / asymmetric field hardware.
 const armorAccent=new THREE.MeshStandardMaterial({
   color:0x7e3429,metalness:.62,roughness:.38
 });

 const strapMat=new THREE.MeshStandardMaterial({
   color:0x302b24,roughness:.96,metalness:.01
 });

 // v4.8.20 FIELD-HARDENED DETAIL LAYER
 // Armored gorget + harness make the suit read as equipment worn by a human.
 wedge("gorgetL",.42,.18,.28,[-.25,2.12,-.12],[-.04,.05,-.10],armorDark);
 wedge("gorgetR",.42,.18,.28,[ .25,2.12,-.12],[-.04,-.05,.10],armorDark);

 const harnessMat=new THREE.MeshStandardMaterial({color:0x24201b,roughness:.97,metalness:.02});
 const strapL=box("harnessL",[.075,.73,.045],[-.27,1.72,-.535],harnessMat);
 const strapR=box("harnessR",[.075,.73,.045],[ .27,1.72,-.535],harnessMat);
 strapL.rotation.z=-.17;strapR.rotation.z=.17;

 box("battleBelt",[.84,.12,.18],[0,1.13,-.10],harnessMat);
 for(const [x,y,z,sc] of [
   [-.31,1.08,-.22,1.0],[-.08,1.06,-.25,.88],[.18,1.07,-.24,1.05],[.37,1.10,-.16,.78]
 ]){
   const pouch=box("fieldPouch",[.20*sc,.22,.13],[x,y,z],harnessMat);
   pouch.rotation.z=x*.10;
 }

 taperedPlate("scarredReplacementPlate",.29,.22,.25,.065,[.36,1.84,-.555],[0,-.02,-.075],armorAccent);

 const boltMat=new THREE.MeshStandardMaterial({color:0x777b7c,metalness:.88,roughness:.28});
 for(const [x,y,z] of [
   [-.46,2.00,-.53],[.46,2.00,-.53],[-.37,1.69,-.52],[.37,1.69,-.52],
   [-.10,1.97,-.57],[.10,1.97,-.57]
 ]){
   const b=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.022,9),boltMat);
   b.rotation.x=Math.PI/2;b.position.set(x,y,z);b.castShadow=true;this.group.add(b);
 }

 for(const yy of [1.82,1.73,1.64]) box("sternumVent",[.13,.026,.020],[0,yy,-.577],gunMat);

 wedge("hipSkirtL",.40,.40,.19,[-.36,1.00,-.01],[0,.04,.18],armorDark);
 wedge("hipSkirtR",.40,.40,.19,[ .36,1.00,-.01],[0,-.04,-.18],armorDark);

 wedge("reactorFinL",.18,.57,.10,[-.40,2.00,.60],[-.12,0,-.18],armorEdge);
 wedge("reactorFinR",.18,.57,.10,[ .40,2.00,.60],[-.12,0,.18],armorEdge);
 cyl("utilityCanister",.105,.105,.46,[-.48,1.74,.50],[0,0,0],gunMat,this.group,12);

 // Battle gouges on the mismatched replacement plate.
 for(const [yy,rz] of [[1.90,-.20],[1.84,.12],[1.78,-.08]]){
   const gouge=box("armorGouge",[.13,.012,.012],[.36,yy,-.594],gunMat);
   gouge.rotation.z=rz;
 }

 // Physical cable from reactor/backplate toward right shoulder.
 const cableCurve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(.27,2.04,.47),
   new THREE.Vector3(.48,2.03,.37),
   new THREE.Vector3(.59,1.98,.16),
   new THREE.Vector3(.64,1.91,-.02)
 ]);
 const cable=new THREE.Mesh(
   new THREE.TubeGeometry(cableCurve,16,.026,7,false),
   new THREE.MeshStandardMaterial({color:0x090b0c,roughness:.86,metalness:.08})
 );
 cable.castShadow=true;this.group.add(cable);

 // Procedural decals: permanent model-space markings that move with the armor.
 const decalCanvas=document.createElement("canvas");
 decalCanvas.width=512;decalCanvas.height=256;
 const dx=decalCanvas.getContext("2d");
 dx.clearRect(0,0,512,256);
 dx.fillStyle="rgba(232,226,200,.92)";
 dx.font="900 54px Arial";dx.fillText("TITAN",28,68);
 dx.fillStyle="rgba(218,113,62,.96)";
 dx.fillRect(28,91,245,17);
 dx.fillStyle="rgba(235,232,214,.82)";
 dx.font="800 29px monospace";dx.fillText("DR-017 // MERC",28,145);
 dx.font="700 20px monospace";dx.fillText("LIVE ARMOR // 09",28,184);
 dx.strokeStyle="rgba(240,222,165,.80)";dx.lineWidth=4;
 dx.strokeRect(350,36,105,105);
 dx.beginPath();dx.moveTo(360,130);dx.lineTo(444,46);dx.stroke();

 const decalTex=new THREE.CanvasTexture(decalCanvas);
 decalTex.colorSpace=THREE.SRGBColorSpace;
 const decalMat=new THREE.MeshBasicMaterial({
   map:decalTex,transparent:true,depthWrite:false,polygonOffset:true,
   polygonOffsetFactor:-2,polygonOffsetUnits:-2
 });
 this.chestDecal=new THREE.Mesh(new THREE.PlaneGeometry(.30,.15),decalMat);
 this.chestDecal.position.set(-.27,1.79,-.592);
 this.chestDecal.renderOrder=5;
 this.group.add(this.chestDecal);

 // Helmet with jaw/visor pieces.
 // Actual head remains when helmet armor is lost.
 this.headCore=new THREE.Mesh(
   new THREE.SphereGeometry(.255,14,10),
   new THREE.MeshStandardMaterial({color:0x8a6654,roughness:.88,metalness:0})
 );
 this.headCore.scale.set(.92,1.05,.92);
 this.headCore.position.set(0,2.30,0);
 this.headCore.castShadow=true;
 this.group.add(this.headCore);

 this.helmet=new THREE.Group();
 this.helmet.position.set(0,2.33,0);
 this.group.add(this.helmet);
 this.helmetShell=new THREE.Mesh(new THREE.IcosahedronGeometry(.31,1),armorMid);
 const helmetShell=this.helmetShell;
 helmetShell.scale.set(.94,.92,1.02);helmetShell.castShadow=true;this.helmet.add(helmetShell);
 // v4.8.20 VISOR FRAME
 // The old solid visor slab completely covered the animated glass.
 // Keep only a mechanical frame around the physical lens.
 box("visorFrameTop",[.47,.045,.055],[0,.105,-.292],gunMat,this.helmet);
 box("visorFrameBottom",[.43,.035,.050],[0,-.070,-.292],gunMat,this.helmet);
 box("visorFrameL",[.040,.16,.050],[-.215,.015,-.292],gunMat,this.helmet);
 box("visorFrameR",[.040,.16,.050],[.215,.015,-.292],gunMat,this.helmet);

 box("jawL",[.13,.18,.12],[-.16,-.16,-.19],armorDark,this.helmet);
 box("jawR",[.13,.18,.12],[.16,-.16,-.19],armorDark,this.helmet);
 box("helmetBrow",[.48,.09,.10],[0,.14,-.23],armorEdge,this.helmet);

 // Layered helmet shell: side rails, crown rib, sensor pack, cheek bevels.
 const crown=box("helmetCrown",[.24,.10,.31],[0,.255,.015],armorDark,this.helmet);
 crown.rotation.x=.08;
 const railL=box("helmetRailL",[.07,.26,.34],[-.285,.025,.015],gunMat,this.helmet);
 const railR=box("helmetRailR",[.07,.26,.34],[.285,.025,.015],gunMat,this.helmet);
 railL.rotation.z=-.05;railR.rotation.z=.05;
 box("helmetSensor",[.11,.08,.12],[.22,.20,-.19],armorAccent,this.helmet);
 wedge("helmetCheekL",.16,.22,.10,[-.19,-.10,-.235],[0,0,.06],armorMid,this.helmet);
 wedge("helmetCheekR",.16,.22,.10,[.19,-.10,-.235],[0,0,-.06],armorMid,this.helmet);
 wedge("helmetRearFin",.19,.22,.10,[0,.12,.255],[-.18,0,0],armorDark,this.helmet);

 const antenna=new THREE.Mesh(
   new THREE.CylinderGeometry(.012,.016,.25,7),
   gunMat
 );
 antenna.position.set(.25,.31,.05);antenna.rotation.z=-.13;this.helmet.add(antenna);

 // v4.8.20 PHYSICAL VISOR HINGE
 // The actual visor glass now rotates on the helmet when G raises/lowers it.
 this.visorHinge=new THREE.Group();
 this.visorHinge.name="visorHinge";
 this.visorHinge.position.set(0,.135,-.245);
 this.helmet.add(this.visorHinge);

 this.visorTech=new THREE.Group();
 this.visorTech.name="visorTech";
 // Offset downward from hinge so rotation visibly sweeps the lens upward.
 this.visorTech.position.set(0,-.105,-.055);
 this.visorHinge.add(this.visorTech);
 this.visorPhysicalBlend=0;

 const visorLensMat=new THREE.MeshPhysicalMaterial({
   color:0x1b6a88,
   transparent:true,
   opacity:.72,
   transmission:.05,
   roughness:.18,
   metalness:.15,
   emissive:0x0e5d78,
   emissiveIntensity:.72,
   clearcoat:.55,
   clearcoatRoughness:.08
 });
 this.visorLens=new THREE.Mesh(new THREE.BoxGeometry(.405,.145,.015),visorLensMat);
 this.visorTech.add(this.visorLens);

 this.visorGlyphs=[];
 const glyphMat=new THREE.MeshBasicMaterial({
   color:0x7fe9ff,transparent:true,opacity:.72,depthWrite:false
 });
 for(let i=0;i<8;i++){
   const bar=new THREE.Mesh(
     new THREE.PlaneGeometry(.018+Math.random()*.045,.005+Math.random()*.008),
     glyphMat.clone()
   );
   bar.position.set(
     -.17+Math.random()*.34,
     -.045+Math.random()*.09,
     -.012
   );
   bar.rotation.z=(Math.random()-.5)*.25;
   this.visorTech.add(bar);
   this.visorGlyphs.push(bar);
 }
 this.visorTechTime=0;


 // v4.5.1 PHYSICAL CIGARETTE / EMBER / SMOKE
 this.cigaretteRig=new THREE.Group();
 this.cigaretteRig.position.set(.075,-.055,-.285);
 this.cigaretteRig.rotation.set(-.05,.05,.02);
 this.cigaretteRig.visible=false;
 this.headCore.add(this.cigaretteRig);

 const cigarettePaper=new THREE.MeshStandardMaterial({
   color:0xf0eadb,
   emissive:0x17130e,
   emissiveIntensity:.18,
   roughness:.82
 });
 const cigaretteFilter=new THREE.MeshStandardMaterial({color:0xa56a3d,roughness:.94});
 const emberMat=new THREE.MeshStandardMaterial({
   color:0x471008,emissive:0xff4a12,emissiveIntensity:2.5,roughness:.6
 });

 const cigBody=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.30,10),cigarettePaper);
 cigBody.rotation.x=Math.PI/2;
 cigBody.position.z=-.15;
 this.cigaretteRig.add(cigBody);

 const cigFilter=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.07,10),cigaretteFilter);
 cigFilter.rotation.x=Math.PI/2;
 cigFilter.position.z=-.035;
 this.cigaretteRig.add(cigFilter);

 this.cigaretteEmber=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.014,10),emberMat);
 this.cigaretteEmber.rotation.x=Math.PI/2;
 this.cigaretteEmber.position.z=-.305;
 this.cigaretteRig.add(this.cigaretteEmber);

 this.cigaretteLight=new THREE.PointLight(0xff4d16,0,.8,2.0);
 this.cigaretteLight.position.set(0,0,-.33);
 this.cigaretteRig.add(this.cigaretteLight);

 this.cigaretteSmoke=[];
 for(let i=0;i<7;i++){
   const mat=new THREE.MeshBasicMaterial({color:0xbcc4c8,transparent:true,opacity:.16,depthWrite:false});
   const puff=new THREE.Mesh(new THREE.SphereGeometry(.035+i*.006,6,5),mat);
   puff.visible=false;
   puff.userData.age=Math.random()*2;
   puff.userData.life=1.7+Math.random()*.8;
   this.scene.add(puff);
   this.cigaretteSmoke.push(puff);
 }

 // Separate exhale plume: emitted from the mouth after releasing a drag.
 this.exhaleSmoke=[];
 this.exhaleBurst=0;
 this.spentCigaretteButts=[];
 for(let i=0;i<12;i++){
   const mat=new THREE.MeshBasicMaterial({
     color:0xd3d9dc,transparent:true,opacity:0,depthWrite:false
   });
   const puff=new THREE.Mesh(new THREE.SphereGeometry(.055,7,5),mat);
   puff.visible=false;
   puff.userData.age=0;
   puff.userData.life=1.6;
   puff.userData.velocity=new THREE.Vector3();
   this.scene.add(puff);
   this.exhaleSmoke.push(puff);
 }

 // v4.8.20 HEAVY MECHA-MERCENARY SHOULDERS
 // Human shoulder core + overlapping shell + wedge plate + fin + spikes.
 const shoulder=(side)=>{
   const x=.66*side;
   const root=new THREE.Group();
   root.position.set(x,1.94,0);
   this.group.add(root);

   const core=new THREE.Mesh(new THREE.SphereGeometry(.21,16,12),anatomyMat);
   core.scale.set(1.18,.98,1.02);
   core.position.set(.005*side,-.015,-.005);
   core.name="shoulderCore";core.castShadow=true;root.add(core);

   // Curved inner pauldron.
   const shell=new THREE.Mesh(
     new THREE.DodecahedronGeometry(.34,1),
     armorMid
   );
   shell.name="shoulderShell";
   shell.scale.set(1.18,.72,1.08);
   shell.position.set(.08*side,.09,.02);
   shell.rotation.z=-.11*side;
   shell.castShadow=true;
   root.add(shell);

   // Wide trapezoid makes the silhouette read less like stacked cubes.
   const blade=wedge(
     "shoulderBlade",
     .64,.26,.20,
     [.12*side,.18,-.08],
     [-.08,0,-.18*side],
     armorEdge,
     root
   );

   // Lower floating plate.
   const lower=wedge(
     "shoulderLowerPlate",
     .48,.18,.16,
     [.13*side,-.10,-.08],
     [.08,0,-.10*side],
     armorDark,
     root
   );

   // Mecha fin / antenna profile.
   const fin=wedge(
     "shoulderFin",
     .14,.38,.08,
     [.30*side,.29,.05],
     [0,0,-.12*side],
     gunMat,
     root
   );

   // Two real geometry spikes per shoulder, angled up and outward.
   const spikeA=cone(
     "shoulderSpikeA",.075,.34,
     [.28*side,.37,-.02],
     [0,0,-side*THREE.MathUtils.degToRad(34)],
     armorEdge,
     root,
     10
   );
   const spikeB=cone(
     "shoulderSpikeB",.058,.26,
     [.39*side,.22,.08],
     [0,0,-side*THREE.MathUtils.degToRad(57)],
     armorDark,
     root,
     9
   );

   root.userData.bodyCore=core;
   root.userData.armorMeshes=[shell,blade,lower,fin,spikeA,spikeB];
   return root;
 };
 this.leftShoulder=shoulder(-1);
 this.rightShoulder=shoulder(1);

 // Arms / gauntlets: asymmetric shouldered firing pose.
 // Camera-side arm braces the receiver; off-hand reaches forward under handguard.
 this.rightUpper=bodyCapsule("rightUpperArm",.145,.29,[.60,1.65,-.17],[0,0,-.06],[1.10,1,.96],anatomyMat);
 const rightUpper=this.rightUpper;
 rightUpper.rotation.x=-.38; rightUpper.rotation.z=-.12;
 this.rightArmPlate=box("rightArmPlate",[.32,.34,.32],[.65,1.72,-.20],armorDark); const rightPlate=this.rightArmPlate;
 rightPlate.rotation.x=-.30;
 this.rightFore=bodyCapsule("rightForearm",.13,.32,[.56,1.44,-.47],[-.44,0,-.03],[1.02,1,.88],anatomyMat);
 const rightFore=this.rightFore;
 rightFore.rotation.x=-1.02;
 this.rightGauntlet=box("rightGauntlet",[.28,.23,.32],[.56,1.52,-.72],armorDark); const rightHand=this.rightGauntlet;
 rightHand.rotation.x=-.70;

 this.leftUpper=bodyCapsule("leftUpperArm",.145,.30,[-.57,1.63,-.12],[0,0,.05],[1.10,1,.96],anatomyMat);
 const leftUpper=this.leftUpper;
 leftUpper.rotation.x=-.62; leftUpper.rotation.z=.18;
 this.leftArmPlate=box("leftArmPlate",[.31,.34,.31],[-.60,1.69,-.17],armorDark); const leftPlate=this.leftArmPlate;
 leftPlate.rotation.x=-.42;
 this.leftFore=bodyCapsule("leftForearm",.13,.33,[-.36,1.42,-.61],[-.58,0,.04],[1.02,1,.88],anatomyMat);
 this.rightElbow=ellipsoid("rightElbow",.115,[.60,1.50,-.32],[1,.86,.92],anatomyMat);
 this.leftElbow=ellipsoid("leftElbow",.115,[-.48,1.50,-.36],[1,.86,.92],anatomyMat);
 const leftFore=this.leftFore;
 leftFore.rotation.x=-1.18; leftFore.rotation.z=-.34;
 this.leftGauntlet=box("leftGauntlet",[.28,.23,.32],[-.18,1.51,-.92],armorDark); const leftHand=this.leftGauntlet;
 leftHand.rotation.x=-.82;
 // Forearm armor gets directional fins instead of pure rectangular gauntlets.
 const rForeBlade=wedge("rightForeBlade",.30,.34,.12,[.66,1.47,-.50],[-.95,0,-.10],armorEdge);
 const lForeBlade=wedge("leftForeBlade",.30,.34,.12,[-.40,1.45,-.65],[-1.12,0,.13],armorEdge);

 this.basePose={
   torso:this.torso.rotation.clone(),
   abdomen:this.abdomen.rotation.clone(),
   helmet:this.helmet.rotation.clone(),
   leftShoulder:this.leftShoulder.rotation.clone(),
   rightShoulder:this.rightShoulder.rotation.clone(),
   leftUpper:this.leftUpper.rotation.clone(),
   leftFore:this.leftFore.rotation.clone(),
   rightUpper:this.rightUpper.rotation.clone(),
   rightFore:this.rightFore.rotation.clone()
 };
 // v4.1 ARTICULATED POWERED LEGS — hip -> knee -> ankle chain.
 // These are actual joint hierarchies, not sliding Lego blocks.
 const makeLeg=(side)=>{
   const hip=new THREE.Group();
   hip.name=side<0?"leftHipJoint":"rightHipJoint";
   hip.position.set(.23*side,1.14,0);
   this.group.add(hip);

   // Upper leg narrows toward the knee. Armor floats over a darker undersuit core.
   const thighCore=box("thighCore",[.27,.56,.31],[0,-.27,0],under,hip);
   const thighPlate=box("thighPlate",[.35,.43,.23],[0,-.23,-.18],armorMid,hip);
   thighPlate.scale.set(.96,1,.92);

   const kneeJoint=new THREE.Group();
   kneeJoint.name=side<0?"leftKneeJoint":"rightKneeJoint";
   kneeJoint.position.set(0,-.56,0);
   hip.add(kneeJoint);

   // Separate kneecap rides with the lower leg, giving the bend a readable joint.
   const knee=box("kneeArmor",[.36,.18,.27],[0,.01,-.20],armorEdge,kneeJoint);
   knee.rotation.x=-.06;
   const shinCore=box("shinCore",[.25,.43,.29],[0,-.23,.015],under,kneeJoint);
   const shinPlate=box("shinArmor",[.31,.38,.23],[0,-.22,-.17],armorDark,kneeJoint);
   shinPlate.scale.set(.93,1,.90);

   const ankle=new THREE.Group();
   ankle.name=side<0?"leftAnkleJoint":"rightAnkleJoint";
   ankle.position.set(0,-.46,0);
   kneeJoint.add(ankle);
   const boot=box("bootArmor",[.34,.18,.50],[0,-.02,-.09],gunMat,ankle);
   boot.rotation.x=.035;

   return {hip,kneeJoint,ankle,thighCore,thighPlate,knee,shinCore,shinPlate,boot};
 };
 this.leftLeg=makeLeg(-1);
 this.rightLeg=makeLeg(1);

 // Rifle root is independently animated for true synchronized shot physics.
 this.rifleBasePosition=new THREE.Vector3(.72,1.67,-.18);
 this.rifle=new THREE.Group();
 this.rifle.position.copy(this.rifleBasePosition);
 // Camera-side firing stance: the weapon sits high and outside the torso
 // so its receiver/stock remain visible while the barrel converges on aim.
 this.rifleBaseYaw=-0.115;
 this.rifleBaseRoll=-0.035;
 this.rifle.rotation.y=this.rifleBaseYaw;
 this.rifle.rotation.z=this.rifleBaseRoll;
 this.group.add(this.rifle);

 box("rifleReceiver",[.22,.25,1.03],[0,0,-.48],gunMat,this.rifle);
 box("rifleTopRail",[.13,.10,.84],[0,.16,-.50],gunEdge,this.rifle);
 box("rifleStock",[.26,.30,.48],[0,-.02,.23],armorDark,this.rifle);
 box("rifleMagazine",[.18,.40,.26],[0,-.28,-.48],armorDark,this.rifle);
 box("rifleGrip",[.14,.31,.16],[0,-.25,-.15],gunMat,this.rifle);
 box("rifleHandguard",[.25,.22,.72],[0,.01,-1.27],armorMid,this.rifle);
 cyl("rifleBarrel",.035,.035,.82,[0,.01,-1.98],[Math.PI/2,0,0],gunMat,this.rifle,10);
 cyl("muzzleBrake",.07,.07,.20,[0,.01,-2.42],[Math.PI/2,0,0],gunEdge,this.rifle,8);
 box("optic",[.14,.15,.25],[0,.25,-.55],gunEdge,this.rifle);

 // Muzzle socket used by Weapon for perfectly timed flash.
 this.muzzle=new THREE.Object3D();
 this.muzzle.position.set(0,.01,-2.54);
 this.rifle.add(this.muzzle);
 // Diegetic ammo HUD anchor: sits above/along the rifle handguard, not at muzzle tip.
 this.weaponHudAnchor=new THREE.Object3D();
 this.weaponHudAnchor.position.set(.24,.22,-1.18);
 this.rifle.add(this.weaponHudAnchor);

 this.rifle.traverse(o=>{
   if(!o.isMesh || !o.material)return;

   // Weapon gets private material instances. Heat cannot leak into body armor.
   if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());
   else o.material=o.material.clone();

   const mats=Array.isArray(o.material)?o.material:[o.material];
   for(const mat of mats){
     if(!mat.color)continue;
     mat.userData=mat.userData||{};
     mat.userData.baseColor=mat.color.clone();
     mat.userData.baseEmissive=mat.emissive?.clone?.() ?? new THREE.Color(0x000000);
   }
   this.heatMeshes.push(o);
 });


 // v4.8.21 MASTER PLAYER BODY // clean armor-ready mannequin
 // The old powered-armor construction remains as gameplay/hitbox infrastructure,
 // but is visually suppressed.  This is the actual player presentation mesh.
 this.buildMasterPlayerBody();

 this.proceduralGear=new ProceduralTitanGear(this.group,{accent:0x9cff18,variant:0});
 this.proceduralGear.group && (this.proceduralGear.group.visible=false);
 this.dragonCape=new DragonCape(this.group,{
   width:1.34,
   height:1.72,
   cols:11,
   rows:15
 });
 if(this.dragonCape?.group)this.dragonCape.group.visible=false;
 if(this.dragonCape?.mesh)this.dragonCape.mesh.visible=false;
 this.suppressLegacyPlayerVisuals();

 this.buildArmorVisualRegistry();

 // PASS 17 — QUATERNIUS NATIVE-RIG PROOF.
 // No retargeting and no homemade joint correction: this downloaded SWAT rig
 // receives the animation library authored for its own CharacterArmature.
 this.nativeHumanoidRig=new QuaterniusNativeRig(this.group,{
   modelUrl:"./assets/characters/quaternius/Swat.fbx",
   animationsUrl:"./assets/characters/quaternius/Animations.fbx",
   referenceObject:this.masterBodyVisual,
   faceYaw:Math.PI,
   diagnostics:true
 });
 this.nativeHumanoidRig.load().then(()=>{
   // FOUNDATION RESTORE: the downloaded SWAT exists only as a hidden calibration/
   // animation-reference rig. The procedural TITAN body remains the visible,
   // authoritative combat character for armor layering and anatomical damage.
   if(this.nativeHumanoidRig?.root)this.nativeHumanoidRig.root.visible=false;
   if(this.nativeHumanoidRig?.model){
     this.nativeHumanoidRig.model.visible=false;
     this.nativeHumanoidRig.model.traverse(o=>{if(o.isMesh)o.visible=false;});
   }
   if(this.masterBodyVisual)this.masterBodyVisual.visible=true;
   if(this.rifle)this.rifle.visible=true;
   console.info("[TITAN BODY] PROCEDURAL MASTER RESTORED // native rig hidden as reference.");
 }).catch(err=>{
   if(this.masterBodyVisual)this.masterBodyVisual.visible=true;
   if(this.rifle)this.rifle.visible=true;
   console.error("[TITAN BODY] Native reference failed; procedural master remains active.",err);
 });

 // v4.8.20 SHOWCASE SPAWN
// Starts outside every hostile activation radius so the game opens calmly.
// No AI/combat behavior has been changed.
this.group.position.set(-30,0,40);
 scene.add(this.group);

 if(this.worldRoot){
   this.refreshWorldCollision();
 }
}

suppressLegacyPlayerVisuals(){
 const keep=new Set();
 if(this.masterBodyVisual)this.masterBodyVisual.traverse(o=>keep.add(o));
 if(this.rifle)this.rifle.traverse(o=>keep.add(o));
 if(this.backWeaponAnchor)this.backWeaponAnchor.traverse(o=>keep.add(o));
 if(this.backSwordAnchor)this.backSwordAnchor.traverse(o=>keep.add(o));
 if(this.swordHandAnchor)this.swordHandAnchor.traverse(o=>keep.add(o));
 if(this.flashlightRig)this.flashlightRig.traverse(o=>keep.add(o));
 this.group.traverse(o=>{
   if(o===this.group||keep.has(o))return;
   if(o.isMesh)o.visible=false;
 });
}

buildMasterPlayerBody(){
 const skin=new THREE.MeshStandardMaterial({color:0xa9745d,roughness:.82,metalness:0});
 const skinDark=new THREE.MeshStandardMaterial({color:0x805744,roughness:.88,metalness:0});
 const suit=new THREE.MeshStandardMaterial({color:0x171b1e,roughness:.88,metalness:.02});
 const sole=new THREE.MeshStandardMaterial({color:0x0b0d0f,roughness:.96,metalness:0});
 const root=new THREE.Group(); root.name='MASTER_PLAYER_BODY'; root.userData.masterBody=true;
 // FOUNDATION CAMERA FIT: preserve the approved camera position/angle and scale the
 // complete authored body uniformly around its ground contact. 0.94 is intentionally
 // subtle: it drops the shoulder/head silhouette without changing limb proportions.
 const MASTER_BODY_SCALE=.94;
 root.scale.setScalar(MASTER_BODY_SCALE);
 // The original sole sat ~0.015m above the ground with root Y=.42. Because scaling
 // happens around the body root, lower the root slightly so the feet keep the same
 // ground relationship instead of appearing to float.
 root.position.y=.396;
 root.userData.masterBodyScale=MASTER_BODY_SCALE;
 root.userData.soleOffset=.396;
 this.group.add(root);
 this.masterBodyVisual=root;
 const cap=(parent,name,r,len,pos=[0,0,0],scale=[1,1,1],mat=skin)=>{
   const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,10,18),mat); m.name=name; m.position.set(...pos); m.scale.set(...scale); m.castShadow=true; parent.add(m); return m;
 };
 const ell=(parent,name,r,pos,scale,mat=skin,seg=24)=>{
   const m=new THREE.Mesh(new THREE.SphereGeometry(r,seg,16),mat); m.name=name; m.position.set(...pos); m.scale.set(...scale); m.castShadow=true; parent.add(m); return m;
 };
 const joint=(parent,name,pos)=>{const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;};
 // Pelvis / spine hierarchy
 const pelvis=joint(root,'pelvis',[0,1.02,0]); this.masterPelvis=pelvis;
 ell(pelvis,'pelvisMass',.33,[0,0,0],[1.04,.72,.80],suit);
 const lumbar=joint(pelvis,'lumbar',[0,.26,0]); this.masterLumbar=lumbar;
 cap(lumbar,'abdomen',.225,.28,[0,.13,0],[1.02,1,.76],skin);
 const chest=joint(lumbar,'ribcage',[0,.42,0]); this.masterChest=chest;
 ell(chest,'ribcageMass',.40,[0,.12,0],[1.20,1.08,.72],skin);
 ell(chest,'leftPectoral',.215,[-.205,.17,-.11],[1.25,.68,.58],skin);
 ell(chest,'rightPectoral',.215,[.205,.17,-.11],[1.25,.68,.58],skin);
 cap(chest,'leftClavicle',.065,.28,[-.17,.37,-.01],[1,1,.85],skin).rotation.z=-Math.PI/2+.12;
 cap(chest,'rightClavicle',.065,.28,[.17,.37,-.01],[1,1,.85],skin).rotation.z=Math.PI/2-.12;
 // Neck/head hierarchy
 const neck=joint(chest,'neck',[0,.47,0]); this.masterNeck=neck;
 cap(neck,'neckMass',.115,.16,[0,.08,0],[1.02,1,.92],skin);
 const head=joint(neck,'head',[0,.29,0]); this.masterHead=head;
 ell(head,'cranium',.235,[0,.06,0],[.90,1.10,.92],skin);
 ell(head,'jaw',.155,[0,-.075,-.035],[.95,.70,.84],skinDark);
 ell(head,'nose',.045,[0,.015,-.225],[.70,1.15,1.15],skin,16);
 // Arms: shoulder -> upper -> elbow -> forearm -> wrist -> hand
 const makeArm=(side)=>{
   const sh=joint(chest,side<0?'leftShoulder':'rightShoulder',[.49*side,.28,0]);
   ell(sh,'deltoid',.17,[.04*side,-.01,0],[1.05,.98,.98],skin);
   const upper=joint(sh,side<0?'leftUpperArmJoint':'rightUpperArmJoint',[.08*side,-.06,0]);
   cap(upper,'upperArm',.125,.34,[0,-.25,0],[1.02,1,.94],skin);
   const elbow=joint(upper,side<0?'leftElbow':'rightElbow',[0,-.50,0]);
   ell(elbow,'elbowMass',.105,[0,0,-.01],[1,.84,.92],skinDark);
   const fore=joint(elbow,side<0?'leftForearmJoint':'rightForearmJoint',[0,-.02,0]);
   cap(fore,'forearm',.105,.34,[0,-.24,-.01],[1.02,1,.88],skin);
   const wrist=joint(fore,side<0?'leftWrist':'rightWrist',[0,-.47,-.01]);
   ell(wrist,'wristMass',.078,[0,0,0],[.95,.80,.92],skinDark);
   const hand=ell(wrist,'hand',.105,[0,-.13,-.025],[.80,1.18,.62],skin);
   return {sh,upper,elbow,fore,wrist,hand};
 };
 this.masterLeftArm=makeArm(-1); this.masterRightArm=makeArm(1);
 // Legs: hip -> thigh -> knee -> shin -> ankle -> foot
 const makeLeg=(side)=>{
   const hip=joint(pelvis,side<0?'leftHip':'rightHip',[.22*side,-.05,0]);
   ell(hip,'hipMass',.15,[0,-.03,0],[1.05,.95,.96],skin);
   cap(hip,'thigh',.155,.42,[0,-.31,0],[1.04,1,.95],skin);
   const knee=joint(hip,side<0?'leftKnee':'rightKnee',[0,-.61,0]);
   ell(knee,'kneecap',.115,[0,-.01,-.035],[1,.82,.92],skinDark);
   const shin=joint(knee,side<0?'leftShin':'rightShin',[0,-.04,0]);
   cap(shin,'calfShin',.12,.40,[0,-.29,.015],[.96,1,.92],skin);
   const ankle=joint(shin,side<0?'leftAnkle':'rightAnkle',[0,-.57,.015]);
   ell(ankle,'ankleMass',.085,[0,0,0],[.92,.82,.90],skinDark);
   const foot=ell(ankle,'foot',.13,[0,-.08,-.12],[.90,.58,1.55],sole);
   return {hip,knee,shin,ankle,foot};
 };
 this.masterLeftLeg=makeLeg(-1); this.masterRightLeg=makeLeg(1);
 // Neutral pose is slightly relaxed, not a rigid T pose.
 this.masterLeftArm.sh.rotation.z=.10; this.masterRightArm.sh.rotation.z=-.10;
 this.masterLeftArm.upper.rotation.z=.08; this.masterRightArm.upper.rotation.z=-.08;
 this.masterBodyBase={
   leftUpper:this.masterLeftArm.upper.rotation.clone(), rightUpper:this.masterRightArm.upper.rotation.clone(),
   leftFore:this.masterLeftArm.fore.rotation.clone(), rightFore:this.masterRightArm.fore.rotation.clone()
 };
}

updateMasterPlayerBody(dt,move01,sprint){
 const root=this.masterBodyVisual;if(!root)return;
 const phase=this.stepPhase||this.suitTime||0;
 const walk=Math.sin(phase), cycle=Math.cos(phase);
 const fwd=THREE.MathUtils.clamp(this.input?.moveY||0,-1,1);
 const strafe=THREE.MathUtils.clamp(this.input?.moveX||0,-1,1);
 const locomotion=Math.min(1,Math.hypot(fwd,strafe))*move01;
 const stride=locomotion*(sprint?.76:.50);

 // Critically damped additive impulses. These sit ON TOP of locomotion/aim.
 this.masterRecoilVelocity+=(-this.masterRecoil*120-this.masterRecoilVelocity*18)*dt;
 this.masterRecoil=Math.max(0,this.masterRecoil+this.masterRecoilVelocity*dt);
 const hitDecay=Math.exp(-11*dt);
 this.masterHitHead*=hitDecay; this.masterHitChest*=hitDecay;
 this.masterHitShoulderL*=hitDecay; this.masterHitShoulderR*=hitDecay;
 this.masterHitYaw*=hitDecay; this.masterHitRoll*=hitDecay;
 const recoil=this.masterRecoil;

 // Weight-bearing pelvis. Backpedal stays lower; strafing shifts weight over support leg.
 const crouch=locomotion*(.035+(fwd<-.1?.035:0));
 root.position.y=THREE.MathUtils.damp(root.position.y,.42-crouch,14,dt);
 this.masterPelvis.rotation.z=THREE.MathUtils.damp(this.masterPelvis.rotation.z,-walk*.030*locomotion-strafe*.035,12,dt);
 this.masterPelvis.rotation.y=THREE.MathUtils.damp(this.masterPelvis.rotation.y,walk*.045*fwd-strafe*.035,12,dt);
 this.masterLumbar.rotation.z=THREE.MathUtils.damp(this.masterLumbar.rotation.z,walk*.022*locomotion+this.masterHitRoll*.35,12,dt);
 this.masterLumbar.rotation.y=THREE.MathUtils.damp(this.masterLumbar.rotation.y,-walk*.035*fwd+this.masterHitYaw*.28,12,dt);
 this.masterChest.rotation.z=THREE.MathUtils.damp(this.masterChest.rotation.z,-walk*.030*locomotion+this.masterHitRoll*.55,12,dt);
 this.masterChest.rotation.y=THREE.MathUtils.damp(this.masterChest.rotation.y,walk*.045*fwd+this.masterHitYaw*.60,12,dt);
 this.masterChest.rotation.x=THREE.MathUtils.damp(this.masterChest.rotation.x,-this.pitch*.30+(sprint?-.07:0)+recoil*.12+this.masterHitChest,14,dt);
 this.masterNeck.rotation.x=THREE.MathUtils.damp(this.masterNeck.rotation.x,this.pitch*.18+this.masterHitHead*.38,15,dt);
 this.masterHead.rotation.x=THREE.MathUtils.damp(this.masterHead.rotation.x,this.pitch*.36+this.masterHitHead,18,dt);

 // Direction-aware gait. Knees remain softly flexed even while aiming/backpedaling.
 const poseLeg=(leg,sign)=>{
   const forwardSwing=walk*sign*stride*fwd;
   const sideSwing=cycle*sign*stride*strafe*.42;
   const baseKnee=locomotion*(sprint?.10:.065)+(fwd<0?locomotion*.07:0);
   const kneeFlex=baseKnee+Math.max(0,-forwardSwing)*.82+Math.abs(sideSwing)*.20;
   leg.hip.rotation.x=THREE.MathUtils.damp(leg.hip.rotation.x,forwardSwing,14,dt);
   leg.hip.rotation.z=THREE.MathUtils.damp(leg.hip.rotation.z,-sideSwing*.35-strafe*.025*sign,14,dt);
   // Anatomical hinge: with TITAN facing local -Z, knee flexion must rotate the
   // lower leg toward +Z (behind the thigh). Positive X was folding the shin
   // forward and visually reading like a backwards knee.
   leg.knee.rotation.x=THREE.MathUtils.damp(leg.knee.rotation.x,-kneeFlex,17,dt);
   // Counter-rotate the ankle against the corrected knee hinge so the sole
   // remains readable instead of inheriting the full calf pitch.
   leg.ankle.rotation.x=THREE.MathUtils.damp(leg.ankle.rotation.x,-forwardSwing*.30+kneeFlex*.30,17,dt);
   leg.ankle.rotation.z=THREE.MathUtils.damp(leg.ankle.rotation.z,sideSwing*.12,17,dt);
 };
 poseLeg(this.masterLeftLeg,1); poseLeg(this.masterRightLeg,-1);

 const L=this.masterLeftArm,R=this.masterRightArm;
 const weaponReady=this.aiming||this.isReloading||this.input?.fire;
 if(weaponReady){
   // Rifle pose. Firing hand/stock side absorbs most rearward impulse while
   // support arm stays planted on the fore-end. Recoil propagates outward:
   // weapon -> wrist/forearm -> elbow -> upper arm -> shoulder -> rib cage.
   L.sh.rotation.x=THREE.MathUtils.damp(L.sh.rotation.x,.34+recoil*.05+this.masterHitShoulderL,18,dt);
   R.sh.rotation.x=THREE.MathUtils.damp(R.sh.rotation.x,.25+recoil*.34+this.masterHitShoulderR,20,dt);
   L.sh.rotation.y=THREE.MathUtils.damp(L.sh.rotation.y,-.10,18,dt);
   R.sh.rotation.y=THREE.MathUtils.damp(R.sh.rotation.y,.12+recoil*.10,20,dt);
   L.upper.rotation.x=THREE.MathUtils.damp(L.upper.rotation.x,1.02+recoil*.08,18,dt);
   R.upper.rotation.x=THREE.MathUtils.damp(R.upper.rotation.x,.80+recoil*.26,20,dt);
   L.upper.rotation.z=THREE.MathUtils.damp(L.upper.rotation.z,.33,18,dt);
   R.upper.rotation.z=THREE.MathUtils.damp(R.upper.rotation.z,-.27,18,dt);
   L.elbow.rotation.x=THREE.MathUtils.damp(L.elbow.rotation.x,-1.08+recoil*.05,20,dt);
   R.elbow.rotation.x=THREE.MathUtils.damp(R.elbow.rotation.x,-1.27+recoil*.20,22,dt);
   L.fore.rotation.x=THREE.MathUtils.damp(L.fore.rotation.x,-.06,20,dt);
   R.fore.rotation.x=THREE.MathUtils.damp(R.fore.rotation.x,-.05+recoil*.12,22,dt);
   L.wrist.rotation.x=THREE.MathUtils.damp(L.wrist.rotation.x,.03,22,dt);
   R.wrist.rotation.x=THREE.MathUtils.damp(R.wrist.rotation.x,-.02+recoil*.08,24,dt);
 }else{
   const swing=walk*locomotion*(sprint?.50:.30)*Math.max(.35,Math.abs(fwd));
   L.sh.rotation.x=THREE.MathUtils.damp(L.sh.rotation.x,swing,11,dt); R.sh.rotation.x=THREE.MathUtils.damp(R.sh.rotation.x,-swing,11,dt);
   L.upper.rotation.x=THREE.MathUtils.damp(L.upper.rotation.x,swing,11,dt); R.upper.rotation.x=THREE.MathUtils.damp(R.upper.rotation.x,-swing,11,dt);
   L.upper.rotation.z=THREE.MathUtils.damp(L.upper.rotation.z,.08,11,dt); R.upper.rotation.z=THREE.MathUtils.damp(R.upper.rotation.z,-.08,11,dt);
   L.elbow.rotation.x=THREE.MathUtils.damp(L.elbow.rotation.x,-.16,11,dt); R.elbow.rotation.x=THREE.MathUtils.damp(R.elbow.rotation.x,-.16,11,dt);
   L.fore.rotation.x=THREE.MathUtils.damp(L.fore.rotation.x,0,11,dt); R.fore.rotation.x=THREE.MathUtils.damp(R.fore.rotation.x,0,11,dt);
   L.wrist.rotation.x=THREE.MathUtils.damp(L.wrist.rotation.x,0,11,dt); R.wrist.rotation.x=THREE.MathUtils.damp(R.wrist.rotation.x,0,11,dt);
 }
}

setReloading(v){this.isReloading=v;}


triggerMeleeStrike(){
 // v7.4.9 — cheap visual close-combat impulse. Hit testing remains event-based
 // in game.js, so no projectile/physics object is created for melee.
 this.meleeStrike=1;
 this.meleeAnimTime=0;
 this.meleeStrikeSerial++;
 this.cameraImpact.x-=.025;
 this.cameraImpact.y-=.018;
 this.cameraImpact.z+=.035;
 this.cameraImpactRoll-=.012;
}

addRecoil(amount=.028){
 const control=this.aiming?.72:1;
 this.recoilPitch=Math.min(.16,this.recoilPitch+amount*control);
 this.recoilYaw+=(Math.random()-.5)*amount*.45*control;

 // Exact shot event: kick + violent high-frequency gun vibration.
 this.weaponKick=Math.min(.22,this.weaponKick+.085);
 this.weaponVibration=Math.min(1,this.weaponVibration+.72);
 this.weaponShotPulse=1;
 this.weaponShotIndex++;
 // Feed the same exact shot into the visible anatomical chain.
 this.masterRecoilVelocity=Math.min(2.8,this.masterRecoilVelocity+1.35+amount*8);
 this.masterRecoil=Math.min(.20,this.masterRecoil+.035);

 this.reticleVelocity.x+=(Math.random()-.5)*55;
 this.reticleVelocity.y-=38+Math.random()*16;
}


refreshWorldCollision(){
 this.worldCollisionMeshes=[];
 this.worldRoot?.updateMatrixWorld?.(true);

 this.worldRoot?.traverse?.(o=>{
   if(
     o.isMesh &&
     o.userData?.isBuildingWall
   ){
     const box=new THREE.Box3().setFromObject(o);
     const center=new THREE.Vector3();
     box.getCenter(center);

     o.userData.cachedCollisionBox=box;
     o.userData.cachedCollisionCenter=center;
     this.worldCollisionMeshes.push(o);
   }
 });
}

resolveWorldCollision(previousPosition){
 if(!this.worldCollisionMeshes.length)return;

 // simple capsule-ish horizontal collision using AABB expansion around player root
 const playerRadius=.48;
 const playerY=this.group.position.y+1.15;

 const px=this.group.position.x;
 const pz=this.group.position.z;

 const dynamicWalls=this.worldRoot?.userData?.dynamicCollisionMeshes ?? [];
 const collisionSources=
   dynamicWalls.length
   ?this.worldCollisionMeshes.concat(dynamicWalls)
   :this.worldCollisionMeshes;

 for(const wall of collisionSources){
   if(!wall.visible || !wall.userData?.isBuildingWall)continue;

   const box=wall.userData.cachedCollisionBox;
   const center=wall.userData.cachedCollisionCenter;
   if(!box || !center)continue;

   const dx=center.x-px;
   const dz=center.z-pz;
   if(dx*dx+dz*dz>36)continue;

   const insideXZ=
     px>=box.min.x-playerRadius &&
     px<=box.max.x+playerRadius &&
     pz>=box.min.z-playerRadius &&
     pz<=box.max.z+playerRadius;

   const insideY=
     playerY>=box.min.y &&
     playerY<=box.max.y+1.7;

   if(insideXZ && insideY){
     this.group.position.x=previousPosition.x;
     this.group.position.z=previousPosition.z;
     break;
   }
 }
}



attachRecoveredWeapon(model,meta={}){
 if(!model)return false;

 if(this.backWeapon){
   this.backWeaponAnchor.remove(this.backWeapon);
 }

 model.removeFromParent();

 this.backWeapon=model;
 this.backWeaponMeta=meta;

 model.position.set(0,0,0);
 model.rotation.copy(this.backWeaponBaseRotation);
 model.scale.setScalar(.58);

 model.traverse(o=>{
   if(o.isMesh){
     o.castShadow=true;
     o.receiveShadow=true;
   }
 });

 this.backWeaponAnchor.add(model);

 this.backWeaponSwing.set(0,0,0);
 this.backWeaponSwingVelocity.set(0,0,0);
 this.backWeaponPrevVelocity.copy(this.velocity);

 return true;
}

attachGreatsword(model){
 if(!model)return false;
 if(this.backSword)this.backSword.removeFromParent();

 model.removeFromParent();
 this.backSword=model;
 this.backSwordAnchor.add(model);

 model.position.set(0,0,0);
 // Hilt high over shoulder, thin blade travels down across opposite hip.
 model.rotation.set(Math.PI,.10,-.58);
 model.scale.setScalar(.60);
 model.traverse(o=>{
   if(o.isMesh){
     o.castShadow=true;
     o.receiveShadow=true;
   }
 });

 this.swordEquipped=false;
 this.swordSwinging=false;
 this.swordSwingTime=0;
 this.swordPrevValid=false;
 this.backSwordRoll=0;
 this.backSwordRollVel=0;
 this.backSwordPrevVelocity.copy(this.velocity);
 return true;
}

toggleGreatsword(){
 if(!this.backSword || this.swordSwinging)return false;

 this.swordEquipped=!this.swordEquipped;
 this.swordPrevValid=false;

 if(this.swordEquipped){
   this.backSword.removeFromParent();
   this.swordHandAnchor.add(this.backSword);
   this.backSword.position.set(0,0,0);
   // Ready pose: blade high/right, angled forward enough to read clearly.
   this.backSword.rotation.set(-.18,.16,-2.22);
 }else{
   this.backSword.removeFromParent();
   this.backSwordAnchor.add(this.backSword);
   this.backSword.position.set(0,0,0);
   this.backSword.rotation.set(Math.PI,.10,-.58);
 }
 return true;
}

startGreatswordSwing(){
 if(!this.backSword || !this.swordEquipped || this.swordSwinging)return false;
 this.swordSwinging=true;
 this.swordSwingTime=0;
 this.swordSwingSerial++;
 this.swordHitWindow=false;
 this.swordPrevValid=false;
 return true;
}

getGreatswordBladePoints(){
 if(!this.backSword || !this.swordEquipped)return null;

 const base=this.backSword.getObjectByName("bladeBaseMarker");
 const mid=this.backSword.getObjectByName("bladeMidMarker");
 const tip=this.backSword.getObjectByName("bladeTipMarker");
 if(!base || !mid || !tip)return null;

 return{
   base:base.getWorldPosition(new THREE.Vector3()),
   mid:mid.getWorldPosition(new THREE.Vector3()),
   tip:tip.getWorldPosition(new THREE.Vector3())
 };
}

getGreatswordSweep(){
 const points=this.getGreatswordBladePoints();
 if(!points)return null;

 const sweep={
   serial:this.swordSwingSerial,
   active:this.swordSwinging && this.swordHitWindow,
   base:points.base,
   mid:points.mid,
   tip:points.tip,
   prevBase:this.swordPrevBase.clone(),
   prevMid:this.swordPrevMid.clone(),
   prevTip:this.swordPrevTip.clone(),
   previousValid:this.swordPrevValid
 };

 this.swordPrevBase.copy(points.base);
 this.swordPrevMid.copy(points.mid);
 this.swordPrevTip.copy(points.tip);
 this.swordPrevValid=true;
 return sweep;
}

updateGreatswordPhysics(dt,right){
 if(!this.backSword)return;

 // =======================================================
 // DRAWN / ACTIVE MELEE
 // =======================================================
 if(this.swordEquipped){
   this.swordHandAnchor.position.set(
     .66+this.bodyBobX*.10,
     1.82+this.bodyBobY*.15,
     -.58
   );

   // RMB = PHYSICAL BLADE CONTROL. Mouse delta drives the actual sword.
   // Release RMB and the weapon settles into a guarded two-handed pose.
   this.swordControlActive=!!this.input.rmbHeld;
   const dx=this.input.lookX;
   const dy=this.input.lookY;

   if(this.swordControlActive){
     const beforeYaw=this.swordControlYaw;
     const beforePitch=this.swordControlPitch;
     this.swordControlYaw=THREE.MathUtils.clamp(this.swordControlYaw-dx*2.7,-1.55,1.55);
     this.swordControlPitch=THREE.MathUtils.clamp(this.swordControlPitch+dy*2.35,-1.05,1.05);
     const angular=Math.hypot(this.swordControlYaw-beforeYaw,this.swordControlPitch-beforePitch)/Math.max(dt,.001);
     this.swordBladeSpeed=THREE.MathUtils.damp(this.swordBladeSpeed,angular,18,dt);
   }else{
     this.swordControlYaw=THREE.MathUtils.damp(this.swordControlYaw,0,7.5,dt);
     this.swordControlPitch=THREE.MathUtils.damp(this.swordControlPitch,0,7.5,dt);
     this.swordBladeSpeed=THREE.MathUtils.damp(this.swordBladeSpeed,0,8,dt);
   }

   // Two-handed guard foundation: broad lateral control plus vertical cuts.
   const targetX=-.34+this.swordControlPitch*.72;
   const targetY=.10-this.swordControlYaw*.18;
   const targetZ=-1.72+this.swordControlYaw;
   this.backSword.rotation.x=THREE.MathUtils.damp(this.backSword.rotation.x,targetX,18,dt);
   this.backSword.rotation.y=THREE.MathUtils.damp(this.backSword.rotation.y,targetY,18,dt);
   this.backSword.rotation.z=THREE.MathUtils.damp(this.backSword.rotation.z,targetZ,18,dt);

   // Damage is enabled only while controlling the blade and actually moving it.
   this.swordHitWindow=this.swordControlActive && this.swordBladeSpeed>.42;
   if(this.swordHitWindow)this.swordSwingSerial++;
   return;
 }

 // =======================================================
 // SHEATHED / BACK CARRY
 // =======================================================
 const safeDt=Math.max(.001,dt);
 const accel=this.velocity.clone().sub(this.backSwordPrevVelocity).divideScalar(safeDt);
 this.backSwordPrevVelocity.copy(this.velocity);

 const lateral=accel.dot(right);
 const target=THREE.MathUtils.clamp(-lateral*.010-this.input.lookX*.12,-.18,.18);
 this.backSwordRollVel+=(target-this.backSwordRoll)*30*dt;
 this.backSwordRollVel*=Math.exp(-6.8*dt);
 this.backSwordRoll+=this.backSwordRollVel*dt;

 const capeSurface=this.dragonCape?.getBackSurfaceDepth?.()??.70;
 this.backSwordAnchor.position.set(
   -.08+this.bodyBobX*.08,
   2.46+this.bodyBobY*.16,
   Math.max(.84,capeSurface+.18)
 );
 this.backSword.rotation.set(
   Math.PI+.03*this.weaponShotPulse,
   .10,
   -.58+this.backSwordRoll
 );
}


updateRecoveredWeaponPhysics(dt,forward,right){
 if(!this.backWeapon)return;

 const safeDt=Math.max(dt,.001);
 const acceleration=this.velocity
   .clone()
   .sub(this.backWeaponPrevVelocity)
   .divideScalar(safeDt);

 this.backWeaponPrevVelocity.copy(this.velocity);

 const forwardAccel=acceleration.dot(forward);
 const lateralAccel=acceleration.dot(right);

 const targetPitch=THREE.MathUtils.clamp(
   forwardAccel*.012-this.stopImpulse*.62-this.weaponShotPulse*.035,
   -.24,.22
 );

 const targetRoll=THREE.MathUtils.clamp(
   -lateralAccel*.014-
   (this.velocity.dot(right)/this.runSpeed)*.095+
   Math.sin(performance.now()*.035)*this.weaponShotPulse*.025,
   -.30,.30
 );

 const targetYaw=THREE.MathUtils.clamp(
   this.input.lookX*.46,
   -.16,.16
 );

 const targets=[targetPitch,targetYaw,targetRoll];
 const spring=36;
 const damping=7.8;

 for(let i=0;i<3;i++){
   const error=targets[i]-this.backWeaponSwing.getComponent(i);

   this.backWeaponSwingVelocity.setComponent(
     i,
     this.backWeaponSwingVelocity.getComponent(i)+error*spring*dt
   );

   this.backWeaponSwingVelocity.setComponent(
     i,
     this.backWeaponSwingVelocity.getComponent(i)*Math.exp(-damping*dt)
   );

   this.backWeaponSwing.setComponent(
     i,
     this.backWeaponSwing.getComponent(i)+
     this.backWeaponSwingVelocity.getComponent(i)*dt
   );
 }

 this.backWeaponHeave=THREE.MathUtils.damp(
   this.backWeaponHeave,
   this.bodyBobY*.42,
   9,
   dt
 );

 // The carried weapon now rides on the ACTUAL simulated cape surface.
 // This is why the previous pass still looked wrong: the cape's torso
 // collision pushes cloth to roughly Z .70 in player space, while the
 // weapon was only at Z .57 — physically underneath it.
 const capeSurface=this.dragonCape?.getBackSurfaceDepth?.() ?? .68;

 // Small clearance represents sling / scabbard / weapon thickness.
 // A damped value prevents cloth jitter from making the weapon buzz.
 const desiredBackDepth=Math.max(.78,capeSurface+.13);
 this.backWeaponVisualDepth=THREE.MathUtils.damp(
   this.backWeaponVisualDepth ?? desiredBackDepth,
   desiredBackDepth,
   14,
   dt
 );

 this.backWeaponAnchor.position.set(
   .18+this.bodyBobX*.12,
   2.28+this.backWeaponHeave,
   this.backWeaponVisualDepth
 );

 this.backWeapon.rotation.set(
   this.backWeaponBaseRotation.x+this.backWeaponSwing.x,
   this.backWeaponBaseRotation.y+this.backWeaponSwing.y,
   this.backWeaponBaseRotation.z+this.backWeaponSwing.z
 );
}


update(dt){
 this.updateHelmetElectricalFx(dt);
 this.updateFlashlight(dt);
 this.updateDroppedHelmet(dt);
 const previousWorldPosition=this.group.position.clone();
 this.input.update();
 this.updateStress(dt);
 this.updateVisorTech(dt);
 this.updateExhaleSmoke(dt);
 this.updateSpentCigaretteButts(dt);
 const lookX=this.input.lookX;
 const lookY=this.input.lookY;

 this.inspectActive=this.input.peek;

 if(this.inspectActive){
   this.inspectYaw-=lookX;
   this.inspectPitch+=lookY;
   this.inspectYaw=THREE.MathUtils.clamp(this.inspectYaw,THREE.MathUtils.degToRad(-170),THREE.MathUtils.degToRad(170));
   this.inspectPitch=THREE.MathUtils.clamp(this.inspectPitch,THREE.MathUtils.degToRad(-28),THREE.MathUtils.degToRad(34));
 }else{
   this.yaw-=lookX;
   this.pitch+=lookY;
   this.pitch=THREE.MathUtils.clamp(this.pitch,-.48,.52);
   this.inspectYaw=THREE.MathUtils.damp(this.inspectYaw,0,11,dt);
   this.inspectPitch=THREE.MathUtils.damp(this.inspectPitch,0,11,dt);
 }


 this.group.rotation.y=this.yaw;

 const forward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
 const right=new THREE.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
 const wish=new THREE.Vector3().addScaledVector(forward,this.input.moveY).addScaledVector(right,this.input.moveX);
 if(wish.lengthSq()>1)wish.normalize();

 this.aiming=!!this.input.aimHeld && !this.inspectActive;
 const sprint=this.input.sprint&&this.input.moveY>.15&&!this.isReloading&&!this.aiming;
 const aimMoveScale=this.aiming?.58:1;
 const speed=(sprint?this.runSpeed:this.walkSpeed)*(this.isReloading?.55:1)*aimMoveScale;
 const target=wish.multiplyScalar(speed);
 const rate=target.lengthSq()>.001?this.accel:this.brake;
 this.velocity.lerp(target,1-Math.exp(-rate*dt));
 if(target.lengthSq()<.001&&this.velocity.length()<.06)this.velocity.set(0,0,0);
 this.group.position.addScaledVector(this.velocity,dt);
 if(previousWorldPosition)this.resolveWorldCollision(previousWorldPosition);
 const terrainY=this.worldRoot?.userData?.heightAt?.(this.group.position.x,this.group.position.z);
 if(Number.isFinite(terrainY))this.group.position.y=THREE.MathUtils.damp(this.group.position.y,terrainY,18,dt);

 const moving=this.velocity.length();
 const move01=THREE.MathUtils.clamp(moving/this.runSpeed,0,1);
 this.updateMasterPlayerBody(dt,move01,sprint);
 this.nativeHumanoidRig?.update(dt);
 // Movement cadence stays heavy even when translation speed is high.
 this.suitTime+=dt*(moving>.15?(sprint?6.8:4.25):.8);

 // -------------------------------------------------------
 // DRAGON PHYSICS — POWERED ARMOR BODY SIMULATION
 // -------------------------------------------------------
 const movingNow=moving>.12;
 const speedRatio=THREE.MathUtils.clamp(moving/this.runSpeed,0,1);

 // AI-assisted suit servos help under high load, but the human body
 // still has to throw the armor forward every step.
 this.powerAssistTarget=
   movingNow
   ?THREE.MathUtils.clamp(.30+speedRatio*.55+(sprint?.14:0),0,1)
   :0;

 this.powerAssist=THREE.MathUtils.damp(
   this.powerAssist,
   this.powerAssistTarget,
   3.5,
   dt
 );

 const oldPhase=this.stepPhase;
 this.stepPhase+=dt*(movingNow?(sprint?7.1:4.6):1.15);

 // Detect each footfall half-cycle and inject a real impulse.
 const oldSin=Math.sin(oldPhase);
 const newSin=Math.sin(this.stepPhase);

 if(movingNow && Math.sign(oldSin)!==Math.sign(newSin)){
   const sign=newSin>=0?1:-1;
   this.lastStepSign=sign;

   const baseImpact=(sprint?.085:.050)*(0.55+speedRatio*.8);

   // More powered assist reduces effort, but never removes mass.
   this.stepImpulse+=baseImpact*(1-this.powerAssist*.28);
   this.bodyRoll+=sign*(sprint?.030:.020)*(0.65+speedRatio*.5);
   this.bodyYawLag+=sign*(sprint?.022:.014);
   this.bodyCompression+=sprint?.035:.020;
 }

 // Forward acceleration pitches the suit into the load.
 const localForwardSpeed=
   this.velocity.dot(forward);

 const desiredPitch=
   THREE.MathUtils.clamp(
     -localForwardSpeed/this.runSpeed*(sprint?.055:.035),
     -.08,
     .035
   );

 this.bodyPitch=THREE.MathUtils.damp(
   this.bodyPitch,
   desiredPitch,
   4.2,
   dt
 );

 // Direction changes create shoulder/torso lag.
 const lateralSpeed=
   this.velocity.dot(right);

 const desiredRoll=
   THREE.MathUtils.clamp(
     -lateralSpeed/this.runSpeed*.045,
     -.055,
     .055
   );

 this.bodyRoll=THREE.MathUtils.damp(
   this.bodyRoll,
   desiredRoll,
   4.8,
   dt
 );

 // Turning the camera/player creates rotational inertia.
 const desiredYawLag=
   THREE.MathUtils.clamp(
     -this.input.lookX*1.8,
     -.065,
     .065
   );

 this.bodyYawLag=THREE.MathUtils.damp(
   this.bodyYawLag,
   desiredYawLag,
   7.5,
   dt
 );

 // Sudden stops compress the armor and throw the body forward slightly.
 const noInput=
   Math.abs(this.input.moveX)<.01 &&
   Math.abs(this.input.moveY)<.01;

 if(noInput && moving>.9){
   this.stopImpulse=Math.min(
     .09,
     this.stopImpulse+dt*.45
   );
 }

 this.stopImpulse=THREE.MathUtils.damp(
   this.stopImpulse,
   0,
   10,
   dt
 );

 this.stepImpulse=THREE.MathUtils.damp(
   this.stepImpulse,
   0,
   13,
   dt
 );

 this.bodyCompression=THREE.MathUtils.damp(
   this.bodyCompression,
   0,
   11,
   dt
 );

 // Layered torso/head displacement:
 // - slow suit heave
 // - sharper foot impact
 // - tiny powered servo stabilization
 const slowHeave=
   Math.sin(this.stepPhase*.5)*
   (sprint?.030:.022)*
   speedRatio;

 const footHeave=
   Math.abs(Math.sin(this.stepPhase))*
   (sprint?.070:.045)*
   speedRatio;

 this.bodyBobY=
   slowHeave -
   footHeave -
   this.stepImpulse -
   this.bodyCompression*.35 -
   this.stopImpulse*.55;

 this.bodyBobX=
   Math.sin(this.stepPhase*.5)*
   (sprint?.032:.020)*
   speedRatio;


 // v2.8 — localized ballistic animation solver.
 const bp=this.ballisticPose;
 for(const k of Object.keys(bp)){
   bp[k]=THREE.MathUtils.damp(bp[k],0,k.includes("head")?10.5:8.2,dt);
 }

 this.torso.rotation.set(
   this.basePose.torso.x+bp.torsoPitch,
   this.basePose.torso.y+bp.torsoYaw,
   this.basePose.torso.z+bp.torsoRoll
 );

 this.abdomen.rotation.x=this.basePose.abdomen.x+bp.abdomenPitch;
 this.abdomen.rotation.z=this.basePose.abdomen.z-bp.torsoRoll*.22;

 this.helmet.rotation.x=this.basePose.helmet.x+bp.headPitch;
 this.helmet.rotation.y=this.basePose.helmet.y+bp.headYaw;
 this.helmet.rotation.z=this.basePose.helmet.z+bp.torsoRoll*.18;

 this.leftShoulder.rotation.set(
   this.basePose.leftShoulder.x+bp.leftShoulderPitch,
   this.basePose.leftShoulder.y+bp.leftShoulderYaw,
   this.basePose.leftShoulder.z+bp.leftShoulderRoll
 );
 this.rightShoulder.rotation.set(
   this.basePose.rightShoulder.x+bp.rightShoulderPitch,
   this.basePose.rightShoulder.y+bp.rightShoulderYaw,
   this.basePose.rightShoulder.z+bp.rightShoulderRoll
 );

 this.leftUpper.rotation.x=this.basePose.leftUpper.x+bp.leftArmPitch;
 this.leftUpper.rotation.z=this.basePose.leftUpper.z+bp.leftArmRoll;
 this.leftFore.rotation.x=this.basePose.leftFore.x+bp.leftArmPitch*.55;
 this.leftFore.rotation.z=this.basePose.leftFore.z+bp.leftArmRoll*.35;

 this.rightUpper.rotation.x=this.basePose.rightUpper.x+bp.rightArmPitch;
 this.rightUpper.rotation.z=this.basePose.rightUpper.z+bp.rightArmRoll;
 this.rightFore.rotation.x=this.basePose.rightFore.x+bp.rightArmPitch*.55;
 this.rightFore.rotation.z=this.basePose.rightFore.z+bp.rightArmRoll*.35;

 // v7.5.2 — low-poly first-person melee authored as a readable ARM ARC, not
 // a gun translation. Wind-up -> accelerated shoulder/elbow swing -> follow-through.
 if(this.meleeAnimTime>=0){
   const p=THREE.MathUtils.clamp(this.meleeAnimTime/this.meleeAnimDuration,0,1);
   const smooth=t=>t*t*(3-2*t);
   const wind=smooth(THREE.MathUtils.clamp(p/.28,0,1));
   const hit=smooth(THREE.MathUtils.clamp((p-.28)/.30,0,1));
   const recover=smooth(THREE.MathUtils.clamp((p-.66)/.34,0,1));
   const drive=(1-recover);
   const upperOffset=(.72*wind-1.42*hit)*drive;
   const foreOffset=(.50*wind-1.72*hit)*drive;
   this.rightUpper.rotation.x+=upperOffset;
   this.rightUpper.rotation.z+=(-.18*wind+.34*hit)*drive;
   this.rightFore.rotation.x+=foreOffset;
   this.rightFore.rotation.z+=(.12*wind-.28*hit)*drive;
   this.rightShoulder.rotation.x+=(.18*wind-.48*hit)*drive;
   this.rightShoulder.rotation.z+=(.08*wind-.20*hit)*drive;
 }

 // v4.1 PROCEDURAL GAIT SOLVER.
 // Opposed hip swing + planted-knee flex + ankle compensation makes the Titan
 // step through the ground instead of floating above it. Strafe has its own
 // weight shift so the legs still read correctly when moving sideways.
 if(this.leftLeg&&this.rightLeg){
   const fwd01=THREE.MathUtils.clamp(localForwardSpeed/this.runSpeed,-1,1);
   const side01=THREE.MathUtils.clamp(lateralSpeed/this.runSpeed,-1,1);
   const gaitAmount=THREE.MathUtils.clamp(speedRatio*1.22,0,1);
   const phase=this.stepPhase;
   const stride=(sprint?.58:.42)*gaitAmount;
   const lateralStride=.18*Math.abs(side01)*gaitAmount;

   const poseLeg=(leg,phaseOffset,sideSign)=>{
     const wave=Math.sin(phase+phaseOffset);
     const lift=Math.max(0,Math.sin(phase+phaseOffset));
     const plant=Math.max(0,-Math.sin(phase+phaseOffset));

     // Hip drives the thigh. Forward/backward locomotion dominates, while
     // strafing opens/closes the leg slightly at the hip.
     const hipPitch=wave*stride*(Math.abs(fwd01)>.08?Math.sign(fwd01):1);
     const hipRoll=-side01*sideSign*lateralStride + Math.sin(phase+phaseOffset)*side01*.055;
     leg.hip.rotation.x=THREE.MathUtils.damp(leg.hip.rotation.x,hipPitch,13,dt);
     leg.hip.rotation.z=THREE.MathUtils.damp(leg.hip.rotation.z,hipRoll,13,dt);

     // Knee bends most while the foot is in swing, then nearly straightens
     // under load. Never hyperextends.
     const kneeBend=(.06 + lift*(sprint?.72:.54) + plant*.045)*gaitAmount;
     // Correct human hinge direction. TITAN faces local -Z, so flexion sends
     // the calf toward +Z behind the knee, not forward through the kneecap.
     leg.kneeJoint.rotation.x=THREE.MathUtils.damp(leg.kneeJoint.rotation.x,-kneeBend,15,dt);

     // Ankle counter-rotates to keep the boot visually planted and gives a
     // small toe-off at the end of each stride.
     const anklePitch=-hipPitch*.38+kneeBend*.48+plant*.12*gaitAmount;
     leg.ankle.rotation.x=THREE.MathUtils.damp(leg.ankle.rotation.x,anklePitch,17,dt);

     // Tiny vertical compression only at the joint chain; avoids skating.
     // Ground-safe hip baseline. The old .92 value put the boot sole below Y=0.
     // Swing leg gets a small lift; planted leg compresses without penetrating the floor.
     const footClearance=lift*.055*gaitAmount;
     const loadCompression=plant*.010*gaitAmount;
     leg.hip.position.y=1.14+footClearance-loadCompression;
   };

   poseLeg(this.leftLeg,0,-1);
   poseLeg(this.rightLeg,Math.PI,1);
 }

 // Physical suit body rotates under the camera.
 this.group.rotation.x=this.bodyPitch-this.stopImpulse*.45;
 this.group.rotation.z=this.bodyRoll;
 this.group.rotation.y=this.yaw+this.bodyYawLag;
 this.breathTime+=dt*(sprint?2.25:1);

 this.recoilPitch=THREE.MathUtils.damp(this.recoilPitch,0,16,dt);
 this.recoilYaw=THREE.MathUtils.damp(this.recoilYaw,0,17,dt);
 this.hitPitch=THREE.MathUtils.damp(this.hitPitch,0,9,dt);
 this.hitYaw=THREE.MathUtils.damp(this.hitYaw,0,9,dt);
 this.cameraImpact.multiplyScalar(Math.exp(-10*dt));
 this.cameraImpactRoll=THREE.MathUtils.damp(this.cameraImpactRoll,0,10,dt);
 this.updateWeaponHeat(dt);

 // Rifle recoil/vibration simulation.
 this.weaponKick=THREE.MathUtils.damp(this.weaponKick,0,22,dt);
 this.weaponVibration=THREE.MathUtils.damp(this.weaponVibration,0,28,dt);
 this.weaponShotPulse=THREE.MathUtils.damp(this.weaponShotPulse,0,38,dt);
 this.meleeStrike=THREE.MathUtils.damp(this.meleeStrike,0,11,dt);
 if(this.meleeAnimTime>=0){
   this.meleeAnimTime+=dt;
   if(this.meleeAnimTime>=this.meleeAnimDuration)this.meleeAnimTime=-1;
 }

 const vibration=this.weaponVibration;
 const t=performance.now()*.001;
 const microX=Math.sin(t*92+this.weaponShotIndex)*.018*vibration;
 const microY=Math.sin(t*127+this.weaponShotIndex*.7)*.014*vibration;
 const microRoll=Math.sin(t*111+this.weaponShotIndex*.3)*.026*vibration;

 const armorCarryX=this.bodyBobX*.55;
 const armorCarryY=this.bodyBobY*.28;
 const armorCarryRoll=this.bodyRoll*.30;

 const aimGunX=THREE.MathUtils.lerp(0,.13,this.aimBlend);
 const aimGunY=THREE.MathUtils.lerp(0,.16,this.aimBlend);
 const aimGunZ=THREE.MathUtils.lerp(0,.10,this.aimBlend);
 const melee=this.meleeStrike;
 const meleeP=this.meleeAnimTime>=0?THREE.MathUtils.clamp(this.meleeAnimTime/this.meleeAnimDuration,0,1):1;
 const meleeArc=this.meleeAnimTime>=0?Math.sin(meleeP*Math.PI):0;
 // Rifle is pulled across the torso to clear the striking arm instead of simply
 // being shoved forward. This preserves the low-poly readable silhouette.
 const meleeGunX=-.32*meleeArc;
 const meleeGunY=-.14*meleeArc;
 const meleeGunZ=.12*meleeArc;
 this.rifle.position.set(
   this.rifleBasePosition.x+aimGunX+microX+armorCarryX+meleeGunX,
   this.rifleBasePosition.y+aimGunY+microY+armorCarryY+meleeGunY,
   this.rifleBasePosition.z+aimGunZ+this.weaponKick+meleeGunZ
 );
 // -------------------------------------------------------
 // FULL-LENGTH WEAPON CONVERGENCE / PHYSICAL AIMING
 //
 // The rifle is no longer just cosmetically angled.
 // Its entire local -Z axis (stock -> receiver -> barrel -> muzzle)
 // is solved toward the same world-space aim point as the reticle.
 // -------------------------------------------------------
 if(this.stableAimPoint){
   const rifleWorldPos=new THREE.Vector3();
   this.rifle.getWorldPosition(rifleWorldPos);

   const desiredWorldDir=this.stableAimPoint.clone()
     .sub(rifleWorldPos)
     .normalize();

   // Convert desired world direction into player-local space because
   // the rifle is a child of the armored body.
   const parentWorldQuat=new THREE.Quaternion();
   this.group.getWorldQuaternion(parentWorldQuat);

   const inverseParentQuat=parentWorldQuat.clone().invert();

   const desiredLocalDir=desiredWorldDir.clone()
     .applyQuaternion(inverseParentQuat)
     .normalize();

   this.weaponAimLocalDir.lerp(
     desiredLocalDir,
     1-Math.exp(-(this.aiming?28:18)*dt)
   ).normalize();

   // Three.js rifle model is authored pointing along local -Z.
   this.weaponAimQuatTarget.setFromUnitVectors(
     new THREE.Vector3(0,0,-1),
     this.weaponAimLocalDir
   );

   if(!this.weaponAimReady){
     this.weaponAimQuat.copy(this.weaponAimQuatTarget);
     this.weaponAimReady=true;
   }else{
     this.weaponAimQuat.slerp(
       this.weaponAimQuatTarget,
       1-Math.exp(-(this.aiming?30:20)*dt)
     );
   }

   // Physical recoil is layered AFTER the aim solve.
   // That means the whole weapon remains pointed at the target,
   // but every shot visibly kicks it off-line and it returns.
   const recoilEuler=new THREE.Euler(
     (this.isReloading?.32:0)+this.weaponKick*.72+microY*.8,
     microX*.30,
     this.rifleBaseRoll+(this.isReloading?-.18:0)+microRoll+armorCarryRoll-.32*meleeArc,
     "YXZ"
   );

   const recoilQuat=new THREE.Quaternion().setFromEuler(recoilEuler);

   this.rifle.quaternion.copy(this.weaponAimQuat).multiply(recoilQuat);
 }

 const spring=44,damping=12;
 this.reticleVelocity.x+=(-this.reticleLag.x*spring)*dt;
 this.reticleVelocity.y+=(-this.reticleLag.y*spring)*dt;
 this.reticleVelocity.multiplyScalar(Math.exp(-damping*dt));
 this.reticleLag.addScaledVector(this.reticleVelocity,dt);
 this.reticleLag.x=THREE.MathUtils.clamp(this.reticleLag.x,-70,70);
 this.reticleLag.y=THREE.MathUtils.clamp(this.reticleLag.y,-70,70);

 this.updateRecoveredWeaponPhysics(dt,forward,right);
 this.updateGreatswordPhysics(dt,right);
 this.proceduralGear?.update(dt,this.velocity,this.weaponShotPulse);
 this.dragonCape?.update(
   dt,
   this.velocity,
   this.weaponShotPulse,
   THREE.MathUtils.clamp(this.input.lookX*1.4,-1,1)
 );
 this.updateCamera(dt,move01,sprint);
}

updateCamera(dt,move01,sprint){
 const stepPhase=this.stepPhase;

 // Dragon Physics camera rides inside the armor, not above it like a drone.
 const idleBreath=
   Math.sin(this.breathTime)*.011*
   (1+move01*.25);

 const servoBreath=
   Math.sin(this.breathTime*.47+.8)*.004;

 const walkVertical=
   this.bodyBobY*.72;

 const walkSide=
   this.bodyBobX*.58;

 const suitRoll=THREE.MathUtils.clamp((this.bodyRoll*.42),-.11,.11);

 const sprintCompression=
   -this.bodyCompression*.16 -
   this.stopImpulse*.24;

 this.aimBlend=THREE.MathUtils.damp(
   this.aimBlend,
   this.aiming?1:0,
   this.aiming?13:10,
   dt
 );

 const pivot=this.group.position.clone().add(new THREE.Vector3(
   walkSide,2.34+idleBreath+servoBreath+walkVertical+sprintCompression,0
 ));

 const gameplayForward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
 const gameplayRight=new THREE.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));

 // NORMAL: massive Titan presentation camera.
 const carriedGearSetback=this.backWeapon ? .34 : 0;
 const gameplayBack=(sprint?1.54:1.37)+carriedGearSetback;
 const gameplayShoulder=.68+walkSide;
 const gameplayCamera=pivot.clone()
   .addScaledVector(gameplayForward,-gameplayBack)
   .addScaledVector(gameplayRight,gameplayShoulder)
   .add(new THREE.Vector3(0,.13,0));

 // AIM: deliberately tighter weapon-side shoulder camera.
 // It moves forward and farther right so the receiver/handguard becomes readable
 // rather than disappearing behind the shoulder armor.
 const aimCamera=pivot.clone()
   .addScaledVector(gameplayForward,-.78)
   .addScaledVector(gameplayRight,1.02)
   .add(new THREE.Vector3(0,.22,0));

 const combatCamera=gameplayCamera.clone().lerp(aimCamera,this.aimBlend);

 // Existing rubber-band inspection camera.
 const orbitYaw=this.yaw+this.inspectYaw;
 const orbitForward=new THREE.Vector3(-Math.sin(orbitYaw),0,-Math.cos(orbitYaw));
 const orbitRight=new THREE.Vector3(Math.cos(orbitYaw),0,-Math.sin(orbitYaw));
 const inspectCamera=pivot.clone()
   .addScaledVector(orbitForward,-2.65)
   .addScaledVector(orbitRight,.18)
   .add(new THREE.Vector3(0,.22+Math.sin(this.inspectPitch)*1.10,0));

 const inspectBlend=this.inspectActive?1:THREE.MathUtils.clamp(
   (Math.abs(this.inspectYaw)+Math.abs(this.inspectPitch))*2.5,0,1
 );


 // -------------------------------------------------------
 // v3.2.2 CAMERA TURN STABILIZER
 // Keep the armored body expressive, but keep the VIEW horizon stable.
 // -------------------------------------------------------
 const turnInput=
   THREE.MathUtils.clamp(
     this.input?.mouseDX ?? this.input?.lookDeltaX ?? 0,
     -18,
     18
   );

 this.cameraTurnRollTarget=
   THREE.MathUtils.clamp(
     -turnInput*.0014,
     -this.cameraRollLimit,
     this.cameraRollLimit
   );

 this.cameraTurnRoll=
   THREE.MathUtils.damp(
     this.cameraTurnRoll,
     this.cameraTurnRollTarget,
     12,
     dt
   );

 const desiredCamera=combatCamera.clone()
   .lerp(inspectCamera,inspectBlend)
   .add(this.cameraImpact);

 this.camera.up.set(0,1,0);
 this.camera.position.lerp(desiredCamera,1-Math.exp(-24*dt));

 const stableAimDirection=new THREE.Vector3(
   -Math.sin(this.yaw)*Math.cos(this.pitch),
   Math.sin(this.pitch),
   -Math.cos(this.yaw)*Math.cos(this.pitch)
 ).normalize();

 const stableAimPoint=pivot.clone().addScaledVector(stableAimDirection,120);

 if(this.inspectActive||inspectBlend>.02){
   const inspectTarget=this.group.position.clone().add(new THREE.Vector3(
     0,1.55+Math.sin(this.inspectPitch)*.25,0
   ));
   this.camera.up.set(0,1,0);
   this.camera.lookAt(inspectTarget);
 }else{
   const presentationRotation=new THREE.Euler(
     this.recoilPitch+this.hitPitch+this.stressSwayPitch,
     this.recoilYaw+this.hitYaw+this.stressSwayYaw,0,"YXZ"
   );
   const visualAimDirection=stableAimDirection.clone().applyEuler(presentationRotation);

   // Normal framing stays slightly downward.
   // Aim mode removes most of that bias and drives the view into the weapon line.
   const normalBias=-.72;
   const aimBias=-.10;
   const verticalBias=THREE.MathUtils.lerp(normalBias,aimBias,this.aimBlend);

   const visualTarget=pivot.clone()
     .addScaledVector(visualAimDirection,120)
     .add(new THREE.Vector3(0,verticalBias,0));

   this.camera.up.set(0,1,0);
   this.camera.lookAt(visualTarget);

   // QUATERNION-SAFE HORIZON:
   // lookAt() uses world-up. We never rewrite Euler.z after lookAt,
   // because that can flip the camera when Euler decomposition changes.
   const hitRoll=THREE.MathUtils.clamp(
     this.cameraImpactRoll,
     THREE.MathUtils.degToRad(-2.4),
     THREE.MathUtils.degToRad(2.4)
   );

   if(Math.abs(hitRoll)>.0001){
     this.camera.rotateZ(hitRoll);
   }
 }

 // Clear visual transition into precision shoulder aim.
 const targetFov=this.inspectActive?70:(this.aiming?61:(sprint?77:73));
 this.camera.fov=THREE.MathUtils.damp(this.camera.fov,targetFov,this.aiming?13:9,dt);
 this.camera.updateProjectionMatrix();

 this.stableAimOrigin=pivot;
 this.stableAimDirection=stableAimDirection;
 this.stableAimPoint=stableAimPoint;
}
getCrosshairWorldPoint(distance=120){
 if(this.stableAimPoint){
   return this.stableAimPoint.clone();
 }

 return this.camera.position.clone().add(
   new THREE.Vector3(0,0,-1)
     .applyQuaternion(this.camera.quaternion)
     .multiplyScalar(distance)
 );
}


getCrosshairRay(){
 // True center-screen camera ray.
 // This is what the player visually means when the crosshair is on something.
 const direction=new THREE.Vector3();
 this.camera.getWorldDirection(direction);

 return{
   origin:this.camera.position.clone(),
   direction:direction.normalize()
 };
}


getMuzzleAimRay(){
 const muzzlePos=this.getMuzzleWorldPosition();
 const target=this.getCrosshairWorldPoint();

 return {
   origin:muzzlePos,
   direction:target.sub(muzzlePos).normalize()
 };
}


applyBallisticPoseImpulse(zone,amount,direction){
 const bp=this.ballisticPose;
 const dir=direction?.clone().normalize() ?? new THREE.Vector3(0,0,1);

 const inv=new THREE.Quaternion();
 this.group.getWorldQuaternion(inv);
 inv.invert();
 const local=dir.clone().applyQuaternion(inv);

 const strength=THREE.MathUtils.clamp(amount/14,.45,1.35);
 const side=THREE.MathUtils.clamp(local.x,-1,1);
 const vertical=THREE.MathUtils.clamp(local.y,-1,1);

 if(zone==="helmet"){
   bp.headPitch+=(.18+Math.abs(vertical)*.10)*strength;
   bp.headYaw+=-side*.24*strength;
   bp.torsoPitch+=.055*strength;
   bp.torsoRoll+=-side*.045*strength;
 }

 if(zone==="leftShoulder"){
   bp.leftShoulderPitch+=.12*strength;
   bp.leftShoulderYaw+=.16*strength;
   bp.leftShoulderRoll+=.22*strength;
   bp.leftArmPitch+=.16*strength;
   bp.leftArmRoll+=.24*strength;
   bp.torsoYaw+=.10*strength;
   bp.torsoRoll+=.085*strength;
   bp.torsoPitch+=.04*strength;
 }

 if(zone==="rightShoulder"){
   bp.rightShoulderPitch+=.12*strength;
   bp.rightShoulderYaw-=.16*strength;
   bp.rightShoulderRoll-=.22*strength;
   bp.rightArmPitch+=.16*strength;
   bp.rightArmRoll-=.24*strength;
   bp.torsoYaw-=.10*strength;
   bp.torsoRoll-=.085*strength;
   bp.torsoPitch+=.04*strength;
 }

 if(zone==="chest"){
   bp.torsoPitch+=.15*strength;
   bp.torsoYaw+=-side*.075*strength;
   bp.torsoRoll+=-side*.07*strength;
   bp.abdomenPitch-=.075*strength;
   bp.leftArmPitch+=.045*strength;
   bp.rightArmPitch+=.045*strength;
 }

 if(zone==="abdomen"){
   bp.abdomenPitch+=.19*strength;
   bp.torsoPitch-=.07*strength;
   bp.headPitch-=.035*strength;
   bp.leftArmPitch+=.065*strength;
   bp.rightArmPitch+=.065*strength;
 }

 bp.torsoPitch=THREE.MathUtils.clamp(bp.torsoPitch,-.18,.32);
 bp.torsoYaw=THREE.MathUtils.clamp(bp.torsoYaw,-.30,.30);
 bp.torsoRoll=THREE.MathUtils.clamp(bp.torsoRoll,-.26,.26);
 bp.abdomenPitch=THREE.MathUtils.clamp(bp.abdomenPitch,-.18,.30);
 bp.headPitch=THREE.MathUtils.clamp(bp.headPitch,-.28,.38);
 bp.headYaw=THREE.MathUtils.clamp(bp.headYaw,-.38,.38);
 bp.leftShoulderRoll=THREE.MathUtils.clamp(bp.leftShoulderRoll,-.35,.42);
 bp.rightShoulderRoll=THREE.MathUtils.clamp(bp.rightShoulderRoll,-.42,.35);
}



addWeaponHeat(amount=this.weaponHeatPerShot){
 this.weaponHeat=Math.min(this.weaponHeatMax,this.weaponHeat+amount);
}

updateWeaponHeat(dt){
 this.weaponHeat=Math.max(0,this.weaponHeat-this.weaponHeatDecay*dt);
 const h=this.weaponHeat/this.weaponHeatMax;

 const warm=new THREE.Color(0x6d2115);
 const hot=new THREE.Color(0xe63a18);
 const whiteHot=new THREE.Color(0xff2c10);

 for(const mesh of this.heatMeshes){
   const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(const mat of mats){
     if(!mat?.color)continue;

     const base=mat.userData?.baseColor ?? new THREE.Color(0x30363b);
     const c=base.clone();

     if(h>.22)c.lerp(warm,THREE.MathUtils.smoothstep(h,.22,.55));
     if(h>.52)c.lerp(hot,THREE.MathUtils.smoothstep(h,.52,.82));
     if(h>.82)c.lerp(whiteHot,THREE.MathUtils.smoothstep(h,.82,1));

     mat.color.copy(c);

     if(mat.emissive){
       if(h>.58){
         const e=THREE.MathUtils.smoothstep(h,.58,1);
         mat.emissive.setRGB(e*.75,e*.08,0);
         mat.emissiveIntensity=.25+e*2.4;
       }else{
         mat.emissive.copy(mat.userData?.baseEmissive ?? new THREE.Color());
         mat.emissiveIntensity=0;
       }
     }
   }
 }
}


updateVisorTech(dt){
 // Physical glass follows the same raised/closed state as the HUD.
 const visorTarget=this.visorRaised?1:0;
 this.visorPhysicalBlend=THREE.MathUtils.damp(
   this.visorPhysicalBlend??0,
   visorTarget,
   5.8,
   dt
 );
 if(this.visorHinge){
   // About 112 degrees upward, with eased mechanical travel.
   const eased=this.visorPhysicalBlend*this.visorPhysicalBlend*(3-2*this.visorPhysicalBlend);
   this.visorHinge.rotation.x=-eased*THREE.MathUtils.degToRad(112);
 }

 this.visorTechTime+=dt;
 const helmetHP=this.playerArmorZones?.helmet?.hp ?? 0;
 const active=helmetHP>0 && this.helmet?.visible!==false;

 if(this.visorTech)this.visorTech.visible=active;
 if(!active)return;

 if(this.visorLens?.material){
   this.visorLens.material.emissiveIntensity=.62+Math.sin(this.visorTechTime*2.4)*.18;
 }
 for(let i=0;i<this.visorGlyphs.length;i++){
   const g=this.visorGlyphs[i];
   g.position.x+=dt*(.012+.004*i);
   if(g.position.x>.19)g.position.x=-.19;
   g.material.opacity=.42+.28*Math.sin(this.visorTechTime*3.1+i*.8);
 }
}

addStress(amount,reason="combat"){
 if(!Number.isFinite(amount)||amount<=0)return;
 this.stress=THREE.MathUtils.clamp(this.stress+amount,0,this.stressMax);
 this.stressCombatHold=Math.max(this.stressCombatHold,reason==="incoming"?5.5:3.0);
}

startSmoking(){
 // Current prototype keeps control while "downed"; smoking is blocked only
 // by inventory/state, not the temporary health<=0 dev condition.
 if(this.smoking||this.cigarettes<=0)return false;
 this.cigarettes--;this.smoking=true;this.smokeTime=0;this.cigaretteRemaining=1;
 this.cigaretteDragging=false;this.cigaretteDragTime=0;this.cigarettePuffs=0;
 this.cigaretteRig.visible=true;
 this.cigaretteRig.updateMatrixWorld(true);
 console.info("[CIG DEBUG] Player.startSmoking 4.6.1", {
   cigarettes:this.cigarettes,
   rigVisible:this.cigaretteRig.visible,
   rigChildren:this.cigaretteRig.children.length,
   parent:this.cigaretteRig.parent?.name||this.cigaretteRig.parent?.type
 });
 return true;
}
beginCigaretteDrag(){
 if(!this.smoking||this.cigaretteRemaining<=0)return false;
 this.cigaretteDragging=true;return true;
}
endCigaretteDrag(){
 if(!this.smoking||!this.cigaretteDragging)return 0;
 this.cigaretteDragging=false;
 const strength=THREE.MathUtils.clamp(this.cigaretteDragTime/1.6,.18,1);
 this.cigaretteDragTime=0;this.cigarettePuffs++;
 const relief=4.5+strength*10.5;
 this.stress=Math.max(0,this.stress-relief);
 this.stressCombatHold=Math.max(0,this.stressCombatHold-strength*1.8);
 this.spawnExhalePlume(strength);
 return relief;
}
spawnExhalePlume(strength=.5){
 const mouthLocal=new THREE.Vector3(.04,-.055,-.255);
 const mouthWorld=this.headCore.localToWorld(mouthLocal.clone());
 const forward=new THREE.Vector3(0,0,-1)
   .applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()))
   .normalize();

 const count=Math.max(3,Math.round(4+strength*8));
 for(let i=0;i<count && i<this.exhaleSmoke.length;i++){
   const puff=this.exhaleSmoke[i];
   puff.visible=true;
   puff.userData.age=0;
   puff.userData.life=1.25+strength*.95+Math.random()*.28;
   puff.position.copy(mouthWorld).add(new THREE.Vector3(
     (Math.random()-.5)*.055,
     (Math.random()-.5)*.035,
     (Math.random()-.5)*.035
   ));
   puff.scale.setScalar(.55+strength*.45);
   puff.material.opacity=.15+.13*strength;
   puff.userData.velocity.copy(forward).multiplyScalar(.32+.34*strength)
     .add(new THREE.Vector3(
       (Math.random()-.5)*.07,
       .07+Math.random()*.08,
       (Math.random()-.5)*.05
     ));
 }
}

updateExhaleSmoke(dt){
 for(const puff of this.exhaleSmoke??[]){
   if(!puff.visible)continue;
   puff.userData.age+=dt;
   const a=puff.userData.age/puff.userData.life;
   if(a>=1){puff.visible=false;puff.material.opacity=0;continue;}
   puff.position.addScaledVector(puff.userData.velocity,dt);
   puff.userData.velocity.y+=dt*.045;
   puff.userData.velocity.multiplyScalar(Math.exp(-.55*dt));
   puff.scale.multiplyScalar(1+dt*(.42+.55*a));
   puff.material.opacity=(.20*(1-a))*(.7+.3*Math.sin((1-a)*Math.PI));
 }
}

dropSpentCigaretteButt(){
 const headWorld=this.headCore.getWorldPosition(new THREE.Vector3());
 const forward=new THREE.Vector3(0,0,-1)
   .applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()))
   .normalize();

 const buttMat=new THREE.MeshStandardMaterial({
   color:0x9b6a43,roughness:.96,metalness:0
 });
 const emberMat=new THREE.MeshStandardMaterial({
   color:0x2a0a05,emissive:0xff3d0d,emissiveIntensity:.45,roughness:.75
 });

 const butt=new THREE.Group();
 const filter=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.065,10),buttMat);
 filter.rotation.x=Math.PI/2;
 butt.add(filter);

 const ember=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.012,10),emberMat);
 ember.rotation.x=Math.PI/2;
 ember.position.z=-.038;
 butt.add(ember);

 butt.position.copy(headWorld).addScaledVector(forward,.28);
 butt.position.y-=.15;
 butt.rotation.set(
   Math.random()*Math.PI,
   Math.random()*Math.PI,
   Math.random()*Math.PI
 );
 butt.userData.velocity=new THREE.Vector3(
   (Math.random()-.5)*.22,
   -.20-Math.random()*.12,
   (Math.random()-.5)*.22
 ).addScaledVector(forward,.10);
 butt.userData.age=0;
 butt.userData.settled=false;
 this.scene.add(butt);
 this.spentCigaretteButts.push(butt);
}

updateSpentCigaretteButts(dt){
 for(const butt of this.spentCigaretteButts){
   if(butt.userData.settled)continue;
   butt.userData.age+=dt;
   butt.userData.velocity.y-=2.4*dt;
   butt.position.addScaledVector(butt.userData.velocity,dt);
   butt.rotation.x+=dt*2.1;
   butt.rotation.z+=dt*1.3;

   // Current prototype ground plane is approximately y=0.
   if(butt.position.y<=.025){
     butt.position.y=.025;
     butt.userData.velocity.set(0,0,0);
     butt.userData.settled=true;
     butt.rotation.x=Math.PI/2;
   }
 }
}

stopSmoking(dropButt=false){
 if(dropButt && this.smoking)this.dropSpentCigaretteButt();
 this.smoking=false;this.cigaretteDragging=false;this.smokeTime=0;this.cigaretteRemaining=0;
 if(this.cigaretteRig)this.cigaretteRig.visible=false;
 if(this.cigaretteLight)this.cigaretteLight.intensity=0;
 for(const puff of this.cigaretteSmoke??[])puff.visible=false;
}
updateStress(dt){
 this.stressCombatHold=Math.max(0,this.stressCombatHold-dt);
 this.stressBreathPhase+=dt*(1+this.stress*.012);
 const passive=this.stressCombatHold>0?.08:.62;
 this.stress=Math.max(0,this.stress-passive*dt);

 if(this.smoking){
   this.smokeTime+=dt;
   if(this.cigaretteDragging){
     this.cigaretteDragTime=Math.min(2.8,this.cigaretteDragTime+dt);
     const strength=THREE.MathUtils.clamp(this.cigaretteDragTime/1.25,.12,1);
     this.cigaretteRemaining=Math.max(0,this.cigaretteRemaining-dt*(.045+.055*strength));
     // continuous small calming effect while actively inhaling
     this.stress=Math.max(0,this.stress-dt*(1.3+strength*2.2));
     if(this.cigaretteLight)this.cigaretteLight.intensity=2.2+strength*6.5;
     if(this.cigaretteEmber?.material)this.cigaretteEmber.material.emissiveIntensity=4+strength*8;
   }else{
     this.cigaretteRemaining=Math.max(0,this.cigaretteRemaining-dt*.0035);
     if(this.cigaretteLight)this.cigaretteLight.intensity=.08;
     if(this.cigaretteEmber?.material)this.cigaretteEmber.material.emissiveIntensity=.55;
   }

   // Shorten the physical cigarette as it burns toward the filter.
   if(this.cigaretteRig){
     const body=this.cigaretteRig.children?.[0];
     if(body?.scale){body.scale.y=Math.max(.08,this.cigaretteRemaining);body.position.z=-(.035+.145*this.cigaretteRemaining);}
     if(this.cigaretteEmber)this.cigaretteEmber.position.z=-(.09+.275*this.cigaretteRemaining);
     if(this.cigaretteLight)this.cigaretteLight.position.z=-(.10+.28*this.cigaretteRemaining);
   }

   const tip=this.cigaretteEmber?.getWorldPosition?.(new THREE.Vector3());
   if(tip){
     for(let i=0;i<this.cigaretteSmoke.length;i++){
       const puff=this.cigaretteSmoke[i];
       puff.userData.age+=dt;
       if(this.cigaretteDragging&&puff.userData.age>=puff.userData.life){
         puff.userData.age=0;puff.userData.life=1.3+Math.random()*.8;
         puff.position.copy(tip).add(new THREE.Vector3((Math.random()-.5)*.035,.02+Math.random()*.035,(Math.random()-.5)*.035));
         puff.scale.setScalar(.65);puff.visible=true;
       }
       if(!puff.visible)continue;
       const a=puff.userData.age/puff.userData.life;
       puff.position.y+=dt*(.13+a*.20);puff.position.x+=Math.sin(this.smokeTime*1.7+i)*dt*.018;
       puff.position.z+=Math.cos(this.smokeTime*1.3+i*.8)*dt*.012;puff.scale.setScalar(.65+a*2.4);
       puff.material.opacity=.18*(1-a);
       if(a>=1)puff.visible=false;
     }
   }
   if(this.cigaretteRemaining<=.025)this.stopSmoking(true);
 }

 const n=this.stress/this.stressMax;
 const breath=Math.sin(this.stressBreathPhase*2.25);
 const tremor=Math.sin(this.stressBreathPhase*13.7)+Math.sin(this.stressBreathPhase*19.2)*.45;
 const high=THREE.MathUtils.smoothstep(n,.32,1);
 this.stressSwayYaw=breath*.0022*n+tremor*.00125*high;
 this.stressSwayPitch=Math.cos(this.stressBreathPhase*2)*.0018*n+tremor*.00085*high;
}

takeIncomingHit(zone,amount,direction=null){
 const isUnarmoredZone=zone==="abdomen";
 const z=isUnarmoredZone ? null : (this.playerArmorZones[zone] ?? this.playerArmorZones.chest);

 // INTENSE CAMERA / SUIT IMPULSE ON EVERY CONFIRMED BULLET.
 const dir=direction?.clone().normalize() ?? new THREE.Vector3(0,0,1);

 this.applyBallisticPoseImpulse(zone,amount,dir);
 // Localized additive body response. Gameplay damage remains unchanged.
 const impulse=THREE.MathUtils.clamp(amount/45,.10,.55);
 const localDir=dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-this.yaw);
 this.masterHitYaw+=THREE.MathUtils.clamp(localDir.x*impulse,-.32,.32);
 this.masterHitRoll+=THREE.MathUtils.clamp(-localDir.x*impulse*.55,-.20,.20);
 if(zone==="helmet"||zone==="head") this.masterHitHead+=impulse*(localDir.z>=0?1:-.72);
 else if(zone==="leftShoulder") this.masterHitShoulderL+=impulse*.75;
 else if(zone==="rightShoulder") this.masterHitShoulderR+=impulse*.75;
 else this.masterHitChest+=impulse*.28;

 this.hitPitch+=(Math.random()*.095)+.065;
 this.hitYaw+=(Math.random()-.5)*.15;
 this.cameraImpact.x+=(Math.random()-.5)*.10;
 this.cameraImpact.y+=(Math.random()-.5)*.075;
 this.cameraImpact.z+=.08;
 this.cameraImpactRoll+=(Math.random()-.5)*.055;

 this.reticleVelocity.x+=(Math.random()-.5)*150;
 this.reticleVelocity.y+=(Math.random()-.5)*130;

 let armorDamage=0;
 let healthDamage=0;
 let armorBreak=false;

 if(z && !z.broken && z.hp>0){
   armorDamage=Math.min(z.hp,amount);
   z.hp-=armorDamage;

   if(zone==="helmet"){
     const condition=Math.max(.05,z.hp/z.max);
     this.spawnHelmetElectricalSparks(
       amount*(1+(1-condition)*.85),
       dir
     );
   }

   const overflow=Math.max(0,amount-armorDamage);
   healthDamage=overflow;

   if(z.hp<=0){
     z.hp=0;
     z.broken=true;
     armorBreak=true;

     if(zone==="helmet"){
       // HELMET OFF, not HEAD OFF. The destroyed shell becomes persistent world debris.
       this.dropHelmetToGround(dir);
       if(this.helmet)this.helmet.visible=false;
       if(this.headCore)this.headCore.visible=true;
     }

     if(zone==="leftShoulder"){
       for(const m of this.leftShoulder.userData.armorMeshes ?? []){
         m.visible=false;
       }
     }

     if(zone==="rightShoulder"){
       for(const m of this.rightShoulder.userData.armorMeshes ?? []){
         m.visible=false;
       }
     }

     if(zone==="chest"){
       if(this.chestArmor)this.chestArmor.visible=false;
     }
   }
 }else{
   healthDamage=amount;
 }

 this.health=Math.max(0,this.health-healthDamage);

 this.addStress(3.4+armorDamage*.11+healthDamage*.34+(armorBreak?8.5:0),"incoming");

 // Recompute aggregate armor for legacy HUD.
 this.armor=Object.values(this.playerArmorZones)
   .reduce((sum,a)=>sum+Math.max(0,a.hp),0);

 this.lastIncomingHit={
   zone,
   armorDamage,
   healthDamage,
   armorBreak,
   health:this.health,
   armor:this.armor,
   time:performance.now()
 };

 return this.lastIncomingHit;
}

buildArmorVisualRegistry(){
 this.armorVisualGroups={helmet:new Set(),leftShoulder:new Set(),rightShoulder:new Set(),chest:new Set(),limbs:new Set()};
 if(this.helmet)this.armorVisualGroups.helmet.add(this.helmet);
 for(const m of this.leftShoulder?.userData?.armorMeshes??[])this.armorVisualGroups.leftShoulder.add(m);
 for(const m of this.rightShoulder?.userData?.armorMeshes??[])this.armorVisualGroups.rightShoulder.add(m);

 const chestNames=/^(chestArmor_V2|pecPlate|ribCage|sternumKeel|abdPlate_|gorget|harness|battleBelt|fieldPouch|scarredReplacementPlate|sternumVent|hipSkirt|reactorFin|utilityCanister|armorGouge|chestDecal|backPlate_V2|backpack|backpackTop|backpackL|backpackR|chestWing|chestKeel|lowerRib|collarArmor|utilityRail|replacementPlate|leftEquipmentRail)/i;
 const limbNames=/^(rightArmPlate|leftArmPlate|rightGauntlet|leftGauntlet|rightForeBlade|leftForeBlade|thighPlate|kneeArmor|shinArmor|bootArmor)$/i;
 this.group.traverse(o=>{
   if(!o.isMesh)return;
   const n=o.name||"";
   if(chestNames.test(n))this.armorVisualGroups.chest.add(o);
   if(limbNames.test(n))this.armorVisualGroups.limbs.add(o);
 });
 if(this.chestArmor)this.armorVisualGroups.chest.add(this.chestArmor);
 if(this.chestDecal)this.armorVisualGroups.chest.add(this.chestDecal);
}

setArmorGroupVisible(slot,visible){
 const set=this.armorVisualGroups?.[slot];
 if(!set)return false;
 // BODY LAB: while the master player mannequin is active, legacy armor must never
 // leak back over it. Armor will be rebuilt deliberately in later passes.
 const show=!!visible && !this.masterBodyVisual;
 for(const o of set)o.visible=show;
 return true;
}

setFittingArmorVisible(visible){
 const on=!!visible;
 if(!this.armorVisualGroups)this.buildArmorVisualRegistry();
 for(const slot of ["helmet","leftShoulder","rightShoulder","chest","limbs"])this.setArmorGroupVisible(slot,on);
 if(!on){
   this.visorRaised=true;
   this.flashlightEnabled=false;
   if(this.flashlight)this.flashlight.intensity=0;
 }
 if(this.flashlightLens)this.flashlightLens.visible=on;
 if(this.proceduralGear?.group)this.proceduralGear.group.visible=on&&!this.masterBodyVisual;
 if(this.dragonCape?.group)this.dragonCape.group.visible=on&&!this.masterBodyVisual;
 if(this.backWeaponAnchor)this.backWeaponAnchor.visible=on;
 if(this.backSwordAnchor)this.backSwordAnchor.visible=on;
 return on;
}

stripAllArmorForFitting(){
 this.setFittingArmorVisible(false);
 for(const slot of ["helmet","leftShoulder","rightShoulder","chest"]){
   const z=this.playerArmorZones?.[slot]; if(z){z.hp=0;z.broken=true;}
 }
 this.armor=0;
 return true;
}

restoreAllArmorForFitting(){
 this.setFittingArmorVisible(true);
 this.applyArmoryItem({id:"titan",slot:"helmet",armor:30});
 this.applyArmoryItem({id:"grim_v2",slot:"chest",armor:90});
 this.applyArmoryItem({id:"siege",slot:"shoulder",armor:40});
 return true;
}

applyArmoryItem(item){
 if(!item)return false;
 if(!this.armorVisualGroups)this.buildArmorVisualRegistry();

 if(item.slot==="helmet"){
   this.setArmorGroupVisible("helmet",true);
   const map={titan:"titan_starter",scout:"field_shell"};
   this.equipHelmetVariant(map[item.id]||"titan_starter");
   const scout=item.id==="scout";
   for(const n of ["helmetCrown","helmetRearFin","helmetSensor"]){
     const o=this.helmet?.getObjectByName(n); if(o)o.visible=!scout;
   }
   for(const n of ["helmetRailL","helmetRailR"]){
     const o=this.helmet?.getObjectByName(n); if(o)o.scale.set(1,scout?.72:1,1);
   }
   if(this.visorLens?.material){
     this.visorLens.material.color.setHex(scout?0x4ec7cf:0x1b6a88);
     this.visorLens.material.emissive?.setHex?.(scout?0x1a8f98:0x0e5d78);
   }
   const z=this.playerArmorZones.helmet; z.max=item.armor||30;z.hp=z.max;z.broken=false;
 }

 if(item.slot==="chest"){
   this.setArmorGroupVisible("chest",true);
   const field=item.id==="field_cuirass";
   for(const o of this.armorVisualGroups.chest){
     const n=o.name||"";
     if(/^(reactorFin|utilityCanister|scarredReplacementPlate|armorGouge|backpackL|backpackR|backpackTop)$/i.test(n))o.visible=!field;
     else o.visible=true;
   }
   if(this.chestArmor)this.chestArmor.scale.set(field?.92:1,field?.96:1,field?.86:1);
   const z=this.playerArmorZones.chest;z.max=item.armor||90;z.hp=z.max;z.broken=false;
 }

 if(item.slot==="shoulder"){
   const light=item.id==="raider";
   for(const side of ["leftShoulder","rightShoulder"]){
     this.setArmorGroupVisible(side,true);
     for(const o of this.armorVisualGroups[side]){
       const n=o.name||"";
       if(/shoulderSpikeB|shoulderFin/i.test(n))o.visible=!light;
       else o.visible=true;
       if(/shoulderShell/i.test(n))o.scale.set(light?.88:1.18,light?.63:.72,light?.96:1.08);
     }
   }
   for(const slot of ["leftShoulder","rightShoulder"]){
     const z=this.playerArmorZones[slot];z.max=item.armor||40;z.hp=z.max;z.broken=false;
   }
 }

 this.armor=Object.values(this.playerArmorZones||{}).reduce((sum,a)=>sum+Math.max(0,a.hp),0);
 return true;
}

canAfford(cost){
 return this.credits>=Math.max(0,Math.round(cost||0));
}

spendCredits(cost){
 cost=Math.max(0,Math.round(cost||0));
 if(!this.canAfford(cost))return false;
 this.credits-=cost;
 return true;
}

addCredits(amount){
 this.credits=Math.max(0,this.credits+Math.round(amount||0));
 return this.credits;
}

getHelmetDurability(){
 const z=this.playerArmorZones?.helmet;
 if(!z?.max)return 0;
 return Math.round(THREE.MathUtils.clamp(z.hp/z.max,0,1)*100);
}

spawnHelmetElectricalSparks(amount=12,direction=new THREE.Vector3(0,0,1)){
 if(!this.helmetSparkPool?.length || !this.helmet?.visible)return;

 const origin=this.helmet.getWorldPosition(new THREE.Vector3());
 const dir=direction.clone().normalize();

 const count=THREE.MathUtils.clamp(
   Math.round(5+amount*.18),
   5,
   14
 );

 for(let i=0;i<count;i++){
   const spark=this.helmetSparkPool[this.helmetSparkCursor++%this.helmetSparkPool.length];
   spark.visible=true;
   spark.material.opacity=1;
   spark.position.copy(origin).add(new THREE.Vector3(
     (Math.random()-.5)*.42,
     (Math.random()-.5)*.34,
     (Math.random()-.5)*.38
   ));

   const outward=new THREE.Vector3(
     (Math.random()-.5)*1.7,
     .35+Math.random()*1.8,
     (Math.random()-.5)*1.7
   );

   // Bullet direction contributes, but sparks kick mostly outward/up from electronics.
   spark.userData.velocity
     .copy(dir)
     .multiplyScalar(.8+Math.random()*1.7)
     .add(outward);

   spark.userData.life=.10+Math.random()*.22;
   spark.userData.maxLife=spark.userData.life;
   spark.scale.set(1,1,.8+Math.random()*2.4);
   spark.rotation.set(
     Math.random()*Math.PI,
     Math.random()*Math.PI,
     Math.random()*Math.PI
   );
 }

 this.helmetArcLight.position.copy(origin);
 this.helmetArcLight.intensity=2.2+Math.min(3,amount*.05);
 this.helmetArcLight.visible=true;
}

updateHelmetElectricalFx(dt){
 let any=false;
 for(const spark of this.helmetSparkPool||[]){
   if(!spark.visible)continue;
   any=true;
   spark.userData.life-=dt;

   if(spark.userData.life<=0){
     spark.visible=false;
     spark.material.opacity=0;
     continue;
   }

   const a=spark.userData.life/spark.userData.maxLife;
   spark.userData.velocity.y-=7.2*dt;
   spark.position.addScaledVector(spark.userData.velocity,dt);
   spark.rotation.x+=dt*18;
   spark.rotation.z+=dt*24;
   spark.material.opacity=a;
   spark.scale.z=.65+a*1.7;
 }

 if(this.helmetArcLight){
   this.helmetArcLight.intensity=THREE.MathUtils.damp(
     this.helmetArcLight.intensity,
     0,
     24,
     dt
   );
   if(this.helmetArcLight.intensity<.03){
     this.helmetArcLight.intensity=0;
     this.helmetArcLight.visible=false;
   }
 }
}

getHelmetServiceQuote(targetDurability=100){
 const current=this.getHelmetDurability();
 const target=THREE.MathUtils.clamp(Math.round(targetDurability),current,100);
 const missing=target-current;
 const profile=this.helmetCatalog?.[this.helmetProfile?.id] ?? this.helmetCatalog?.titan_starter;
 return{
   current,
   target,
   missing,
   cost:missing*(profile?.repairCostPerPoint??2),
   profile:profile?.name??this.helmetProfile?.name??"HELMET"
 };
}

serviceHelmet(targetDurability=100){
 const z=this.playerArmorZones?.helmet;
 if(!z)return null;

 const target=THREE.MathUtils.clamp(Math.round(targetDurability),1,100);
 const hpTarget=z.max*(target/100);
 z.hp=Math.max(z.hp,hpTarget);
 z.broken=false;

 if(this.helmet){
   this.helmet.visible=true;
 }
 if(this.headCore){
   this.headCore.visible=true;
 }

 // Once serviced, the old destroyed shell on the street remains evidence/debris.
 this.visorDamage=Math.max(0,Math.ceil(4*(1-z.hp/z.max)));
 this.armor=Object.values(this.playerArmorZones)
   .reduce((sum,a)=>sum+Math.max(0,a.hp),0);

 return this.getHelmetServiceQuote(target);
}

equipHelmetVariant(id){
 const item=this.helmetCatalog?.[id];
 if(!item)return false;

 this.installHelmetProfile(item);
 const z=this.playerArmorZones.helmet;
 z.max=item.maxDurability??100;
 z.hp=z.max;
 z.broken=false;
 if(this.helmet)this.helmet.visible=true;

 return true;
}

toggleFlashlight(forceState=null){
 const next=forceState===null ? !this.flashlightEnabled : !!forceState;
 this.flashlightEnabled=next;

 if(this.flashlight){
   this.flashlight.visible=true;
   this.flashlight.intensity=next?260:0;
 }
 if(this.flashlightLens){
   this.flashlightLens.material.opacity=next?.92:.16;
 }
 return this.flashlightEnabled;
}

updateFlashlight(dt){
 if(!this.flashlight)return;

 // Slight powered-lamp response rather than a perfectly static videogame beam.
 const targetIntensity=this.flashlightEnabled?260:0;
 this.flashlight.intensity=THREE.MathUtils.damp(
   this.flashlight.intensity,
   targetIntensity,
   18,
   dt
 );

 if(this.flashlightLens){
   const targetOpacity=this.flashlightEnabled?.92:.16;
   this.flashlightLens.material.opacity=THREE.MathUtils.damp(
     this.flashlightLens.material.opacity,
     targetOpacity,
     14,
     dt
   );
 }
}

dropHelmetToGround(direction=new THREE.Vector3(0,0,1)){
 if(this.droppedHelmet)return this.droppedHelmet;

 const dropped=this.helmet.clone(true);
 dropped.name="dropped_player_helmet";
 dropped.visible=true;

 // Preserve the helmet's current world location, then detach it into the scene.
 const wp=new THREE.Vector3();
 this.helmet.getWorldPosition(wp);
 dropped.position.copy(wp);
 dropped.quaternion.copy(this.helmet.getWorldQuaternion(new THREE.Quaternion()));
 dropped.scale.copy(this.helmet.getWorldScale(new THREE.Vector3(1,1,1)));

 const dir=direction.clone().normalize();
 dropped.userData.dropVelocity=new THREE.Vector3(dir.x*1.7,2.2,dir.z*1.7);
 dropped.userData.dropSpin=new THREE.Vector3(1.8,2.5,1.2);
 dropped.userData.settled=false;
 dropped.userData.age=0;

 this.scene.add(dropped);
 this.droppedHelmet=dropped;
 return dropped;
}

updateDroppedHelmet(dt){
 const h=this.droppedHelmet;
 if(!h || h.userData.settled)return;

 h.userData.age+=dt;
 const v=h.userData.dropVelocity;
 v.y-=9.8*dt;
 h.position.addScaledVector(v,dt);
 h.rotation.x+=h.userData.dropSpin.x*dt;
 h.rotation.y+=h.userData.dropSpin.y*dt;
 h.rotation.z+=h.userData.dropSpin.z*dt;

 // Prototype ground plane is y=0. Keep the broken helmet permanently in-world.
 if(h.position.y<=.30){
   h.position.y=.30;
   v.set(0,0,0);
   h.userData.settled=true;
   h.rotation.x=1.18;
   h.rotation.z=.34;
 }
}

repairHelmet(amount=Infinity){
 const z=this.playerArmorZones.helmet;
 if(!z)return false;
 z.hp=Math.min(z.max,z.hp+(Number.isFinite(amount)?Math.max(0,amount):z.max));
 z.broken=z.hp<=0;
 if(z.hp>0){
   z.broken=false;
   this.helmet.visible=true;
   this.headCore.visible=true;
   this.visorDamage=Math.max(0,Math.ceil(4*(1-z.hp/z.max)));
 }
 this.armor=Object.values(this.playerArmorZones).reduce((sum,a)=>sum+Math.max(0,a.hp),0);
 return true;
}

installHelmetProfile(profile={}){
 this.helmetProfile={...this.helmetProfile,...profile,chips:{...this.helmetProfile.chips,...(profile.chips||{})}};
 return this.helmetProfile;
}

damage(amount){
 // Legacy melee/fallback damage enters through chest.
 return this.takeIncomingHit(
   "chest",
   amount,
   new THREE.Vector3(0,0,1)
 );
}

getAimRay(){
 return{
   origin:this.stableAimOrigin?.clone()??this.camera.position.clone(),
   direction:this.stableAimDirection?.clone()??new THREE.Vector3(0,0,-1)
 };
}


getWeaponHudWorldPosition(){
 const p=new THREE.Vector3();
 if(this.weaponHudAnchor){
   this.weaponHudAnchor.getWorldPosition(p);
 }else{
   this.rifle.getWorldPosition(p);
 }
 return p;
}

getMuzzleWorldPosition(){
 const p=new THREE.Vector3();
 this.muzzle.getWorldPosition(p);
 return p;
}
}
