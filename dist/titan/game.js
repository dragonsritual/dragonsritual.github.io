console.info("PROJECT TITAN BUILD 7.9.0 // ORGANIC TERRAIN WORLD");
import * as THREE from "three";

import {buildWorld} from "./world.js?v=7.9.0";
import {Input} from "./input.js?v=5.3.0";
import {Player} from "./player.js?v=7.9.0";
import {Titan} from "./titan.js?v=7.9.0";
import {Necromancer} from "./necromancer.js?v=7.9.0";
import {ElitePlayerAI} from "./elitePlayerAI.js?v=7.7.2";
import {Weapon} from "./weapon.js?v=6.3.0";
import {CollectionSystem} from "./collectionSystem.js?v=5.3.0";
import {RealtimeArmory} from "./armorySystem.js?v=5.3.0";
import {TitanAudioSystem} from "./audioSystem.js?v=6.3.0";
// v7.4.3 PERFORMANCE TEST: ORACLE module intentionally not imported.
// This prevents the ORACLE/LM/TTS implementation graph from entering renderer memory.
import {installVoidroomTruck} from "./voidroomTruck.js?v=5.2.0";
// v7.4.4 PERF ISOLATION: weather module intentionally not imported.
// Source remains untouched and can be restored after baseline measurement.

const scene=new THREE.Scene();

scene.background=new THREE.Color(
  0x8798a6
);

scene.fog=new THREE.Fog(
  0x8798a6,
  55,
  260
);

const camera=new THREE.PerspectiveCamera(
  73,
  innerWidth/innerHeight,
  .1,
  900
);

const renderer=new THREE.WebGLRenderer({
  antialias:true,
  powerPreference:"high-performance"
});

// ------------------------------------------------------------
// v2.5.1 — SUN / ARMOR READABILITY LIGHTING FOUNDATION
// Real-time raster lighting now; future RT/path-trace mode can replace/augment this.
// ------------------------------------------------------------
const titanSun=new THREE.DirectionalLight(0xfff2d6,3.25);
titanSun.position.set(-18,28,12);
titanSun.castShadow=true;

titanSun.shadow.mapSize.set(1024,1024);
titanSun.shadow.camera.left=-38;
titanSun.shadow.camera.right=38;
titanSun.shadow.camera.top=38;
titanSun.shadow.camera.bottom=-38;
titanSun.shadow.camera.near=.5;
titanSun.shadow.camera.far=100;
titanSun.shadow.bias=-0.00035;
titanSun.shadow.normalBias=.035;
scene.add(titanSun);

const titanSkyFill=new THREE.HemisphereLight(
  0x9fc4e0,
  0x303027,
  1.10
);
scene.add(titanSkyFill);

// Low cool fill keeps the shadow side of armor readable without flattening it.
const titanArmorFill=new THREE.DirectionalLight(0x88a8bf,.55);
titanArmorFill.position.set(16,9,-16);
scene.add(titanArmorFill);

// renderer shadow setup
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

// Modern tone mapping helps bright metal highlights without blowing out the scene.
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

scene.traverse(o=>{
  if(o.isMesh){
    o.castShadow=true;
    o.receiveShadow=true;
  }
});


renderer.setSize(
  innerWidth,
  innerHeight
);

renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.2));

renderer.shadowMap.enabled=true;
renderer.shadowMap.type=
  THREE.PCFSoftShadowMap;

document.body.prepend(
  renderer.domElement
);

scene.add(
  new THREE.HemisphereLight(
    0xd8ecff,
    0x38422e,
    1.35
  )
);

const sun=
  new THREE.DirectionalLight(
    0xfff0ce,
    2.5
  );

sun.position.set(
  70,
  90,
  40
);

sun.castShadow=true;
sun.shadow.mapSize.set(
  1024,
  1024
);

scene.add(sun);

// v4.5 PROCEDURAL CELESTIAL SKY — no external skybox assets required.
const celestialRoot=new THREE.Group();
scene.add(celestialRoot);

const starGeo=new THREE.BufferGeometry();
const starCount=900;
const starPos=new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){
 const theta=Math.random()*Math.PI*2;
 const phi=Math.acos(THREE.MathUtils.lerp(.05,.95,Math.random()));
 const r=360;
 starPos[i*3]=Math.sin(phi)*Math.cos(theta)*r;
 starPos[i*3+1]=Math.abs(Math.cos(phi))*r+35;
 starPos[i*3+2]=Math.sin(phi)*Math.sin(theta)*r;
}
starGeo.setAttribute("position",new THREE.BufferAttribute(starPos,3));
const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xe9f2ff,size:1.25,sizeAttenuation:true,transparent:true,opacity:0}));
celestialRoot.add(stars);

const moon=new THREE.Mesh(new THREE.SphereGeometry(11,24,16),new THREE.MeshBasicMaterial({color:0xdbe8ff}));
celestialRoot.add(moon);
const planetA=new THREE.Mesh(new THREE.SphereGeometry(18,24,16),new THREE.MeshBasicMaterial({color:0x8d6d62}));
celestialRoot.add(planetA);
const planetB=new THREE.Mesh(new THREE.SphereGeometry(7,20,14),new THREE.MeshBasicMaterial({color:0x8296b4}));
celestialRoot.add(planetB);

const cloudGroup=new THREE.Group();
celestialRoot.add(cloudGroup);
const cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.16,depthWrite:false});
for(let i=0;i<18;i++){
 const c=new THREE.Mesh(new THREE.SphereGeometry(THREE.MathUtils.randFloat(8,18),10,7),cloudMat);
 c.scale.set(THREE.MathUtils.randFloat(1.8,3.8),THREE.MathUtils.randFloat(.22,.45),THREE.MathUtils.randFloat(.8,1.5));
 c.position.set(THREE.MathUtils.randFloatSpread(300),THREE.MathUtils.randFloat(70,105),THREE.MathUtils.randFloatSpread(300));
 cloudGroup.add(c);
}

const moonLight=new THREE.DirectionalLight(0x9db7df,0);
scene.add(moonLight);

// v3.7 DAY / NIGHT. Six real minutes = one full prototype day.
let worldClock=.23;
const DAY_LENGTH_SECONDS=360;
const daySky=new THREE.Color(0x8798a6);
const duskSky=new THREE.Color(0x6f6671);
const nightSky=new THREE.Color(0x07101c);
const dawnSky=new THREE.Color(0x8a7668);

function updateDayNight(dt){
 worldClock=(worldClock+dt/DAY_LENGTH_SECONDS)%1;
 const angle=worldClock*Math.PI*2-Math.PI*.5;
 const elevation=Math.sin(angle);
 const daylight=THREE.MathUtils.smoothstep(elevation,-.18,.32);
 const twilight=1-Math.abs(THREE.MathUtils.clamp(elevation*3,-1,1));

 titanSun.position.set(Math.cos(angle)*55,elevation*62,Math.sin(angle)*42);
 sun.position.copy(titanSun.position).multiplyScalar(1.35);
 titanSun.intensity=.08+daylight*3.15;
 sun.intensity=.04+daylight*2.15;
 titanSkyFill.intensity=.16+daylight*.94;
 titanArmorFill.intensity=.14+daylight*.42;

 const sky=nightSky.clone().lerp(daySky,daylight);
 if(twilight>.08 && daylight>.08)sky.lerp(elevation<0?duskSky:dawnSky,twilight*.34);
 scene.background.copy(sky);
 if(scene.fog)scene.fog.color.copy(sky);
 renderer.toneMappingExposure=.58+daylight*.47;

 // Night fixtures become meaningful pools of visibility rather than a global
 // brightness cheat. Their intensity is driven by darkness below.
 const darkness=1-daylight;
 stars.material.opacity=THREE.MathUtils.smoothstep(darkness,.35,.9)*.92;
 moon.visible=darkness>.22;
 planetA.visible=darkness>.30;
 planetB.visible=darkness>.42;
 moon.position.set(-Math.cos(angle)*245,Math.max(55,-elevation*210+70),-Math.sin(angle)*245);
 planetA.position.set(-180,145,-255);
 planetB.position.set(220,105,-310);
 moonLight.position.copy(moon.position).normalize().multiplyScalar(80);
 moonLight.intensity=darkness*.48;
 cloudMat.opacity=.06+daylight*.15;
 cloudGroup.rotation.y+=dt*.0025;
 for(const fixture of nightCombatLights){
   fixture.light.intensity=fixture.base*darkness;
 }
}

// v3.8 NIGHT COMBAT LIGHTING — sparse pools around streets / VOIDROOM.
// Muzzle flashes remain separate dynamic lights, so gunfire can reveal a
// shooter standing in otherwise black space down the road.
const nightCombatLights=[];
function addNightPool(x,y,z,color=0xffb35c,intensity=5.2,distance=18){
 const light=new THREE.PointLight(color,0,distance,1.7);
 light.position.set(x,y,z);
 scene.add(light);
 nightCombatLights.push({light,base:intensity});
}
addNightPool(24,4.2,17,0xffa447,7.0,22); // VOIDROOM entrance
addNightPool(31,3.5,4,0xff7b38,4.5,16);
addNightPool(8,4.4,3,0x9fb9ff,3.2,17);
addNightPool(-18,4.1,-8,0xffc36a,3.8,18);
addNightPool(48,4.0,-8,0x91aaff,3.4,17);

// v4.8.10 LOW-LATENCY AUDIO OUTPUT
// "interactive" asks Web Audio for the lowest practical output latency.
// Bluetooth transport latency still belongs to Windows/headset hardware.
try{
 const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
 if(AudioContextCtor && THREE.AudioContext?.setContext){
   const titanLowLatencyContext=new AudioContextCtor({latencyHint:"interactive"});
   THREE.AudioContext.setContext(titanLowLatencyContext);
   console.info("[TITAN AUDIO] low-latency context",{
     latencyHint:"interactive",
     baseLatency:titanLowLatencyContext.baseLatency,
     outputLatency:titanLowLatencyContext.outputLatency,
     sampleRate:titanLowLatencyContext.sampleRate
   });
 }
}catch(err){
 console.warn("[TITAN AUDIO] low-latency context fallback",err);
}

const audioListener=new THREE.AudioListener();
camera.add(audioListener);

const sandbox=buildWorld(scene,{audioListener});
const voidroomTruck=installVoidroomTruck(scene);
const titanAudio=new TitanAudioSystem(camera,sandbox.root,audioListener);
const collections=new CollectionSystem();
collections.registerPosters(sandbox.collectiblePosters);

if(!sandbox || !Array.isArray(sandbox.spawnPoints)){
  throw new Error(
    "SANDBOX WORLD DID NOT INITIALIZE. Hard-refresh the browser (Ctrl+F5)."
  );
}

const input=new Input();

// v5.3 — MENU -> GAME CONTROL HANDOFF
// Closing an interactive overlay should immediately give mouse-look back.
// The close click/key is swallowed for a moment so it can NEVER fire the gun.
let pointerLockResumePending=false;

function canRequestWorldPointerLock(){
  return (
    matchMedia("(pointer:fine)").matches &&
    document.visibilityState==="visible" &&
    document.hasFocus() &&
    renderer?.domElement?.isConnected &&
    renderer.domElement.ownerDocument===document &&
    document.pointerLockElement!==renderer.domElement
  );
}

async function safeRequestWorldPointerLock(){
  if(!canRequestWorldPointerLock()){
    pointerLockResumePending=true;
    return false;
  }

  try{
    input.suppressCombatInput?.(420);
    const result=renderer.domElement.requestPointerLock?.();
    if(result && typeof result.then==="function")await result;
    pointerLockResumePending=false;
    return document.pointerLockElement===renderer.domElement;
  }catch(err){
    // Detached DevTools / inactive-document focus can invalidate a pointer-lock
    // request. This is a recoverable input-state issue, not a fatal game error.
    const name=String(err?.name||"");
    const msg=String(err?.message||"");
    if(name==="WrongDocumentError" || /not valid for pointer lock|pointer lock/i.test(msg)){
      pointerLockResumePending=true;
      console.info("[TITAN INPUT] pointer lock deferred until game window regains focus");
      return false;
    }
    console.warn("[TITAN INPUT] pointer lock request failed",err);
    pointerLockResumePending=true;
    return false;
  }
}

function resumeWorldControl({delay=0}={}){
  input.setUiCaptured?.(false);
  input.suppressCombatInput?.(420);
  input.fire=false;
  input.fireHeld=false;
  input.firePressed=false;
  input.aimHeld=false;
  input.rmbHeld=false;

  if(delay>0)setTimeout(()=>safeRequestWorldPointerLock(),delay);
  else safeRequestWorldPointerLock();
}

// Any UI system can call this callback when it closes.
collections.onClose=()=>resumeWorldControl();

// Extra safety: acquiring pointer lock never counts as a weapon press.
document.addEventListener("pointerlockchange",()=>{
  if(document.pointerLockElement===renderer.domElement){
    input.suppressCombatInput?.(180);
    input.fire=false;
    input.fireHeld=false;
    input.firePressed=false;
  }
});

const player=new Player(
  scene,
  camera,
  input,
  sandbox.root
);

// Flashlight SpotLight exists from frame 1 at intensity 0.
// This prewarms the light shader path before the player presses F.
console.info("[TITAN PERF] flashlight prewarmed // intensity-only toggle");

function createArmorTechServiceBay(){
 const group=new THREE.Group();
 group.name="armor_tech_service_bay";

 // Purposefully away from the TV wall: street-side service point near the Voidroom district.
 group.position.set(20.5,0,-9.5);

 const metal=new THREE.MeshStandardMaterial({
   color:0x20282d,roughness:.44,metalness:.72
 });
 const dark=new THREE.MeshStandardMaterial({
   color:0x101518,roughness:.72,metalness:.20
 });
 const cloth=new THREE.MeshStandardMaterial({
   color:0x34302a,roughness:.92,metalness:.02
 });

 // Workbench / repair console
 const bench=new THREE.Mesh(new THREE.BoxGeometry(2.4,.16,.82),metal);
 bench.position.set(1.05,.92,.28);
 group.add(bench);

 const legA=new THREE.Mesh(new THREE.BoxGeometry(.16,.90,.16),dark);
 legA.position.set(.18,.45,.28);group.add(legA);
 const legB=legA.clone();legB.position.x=1.92;group.add(legB);

 const terminal=new THREE.Group();
 terminal.position.set(1.18,1.24,.24);
 const terminalBody=new THREE.Mesh(new THREE.BoxGeometry(.72,.56,.38),metal);
 terminal.add(terminalBody);
 const screen=new THREE.Mesh(
   new THREE.PlaneGeometry(.54,.32),
   new THREE.MeshBasicMaterial({color:0x49d9ef,transparent:true,opacity:.75})
 );
 screen.position.set(0,.03,-.196);
 screen.rotation.y=Math.PI;
 terminal.add(screen);
 group.add(terminal);

 // Actual technician NPC — intentionally human-scale, not another giant Titan.
 const tech=new THREE.Group();
 tech.position.set(-.55,0,.05);

 const pelvis=new THREE.Mesh(new THREE.BoxGeometry(.72,.38,.44),dark);
 pelvis.position.y=.82;tech.add(pelvis);

 const torso=new THREE.Mesh(
   new THREE.CylinderGeometry(.42,.52,1.12,8),
   cloth
 );
 torso.scale.z=.72;
 torso.position.y=1.55;tech.add(torso);

 const head=new THREE.Mesh(
   new THREE.SphereGeometry(.25,12,9),
   new THREE.MeshStandardMaterial({color:0x8a6754,roughness:.86})
 );
 head.position.y=2.37;tech.add(head);

 const cap=new THREE.Mesh(
   new THREE.CylinderGeometry(.28,.30,.13,10),
   new THREE.MeshStandardMaterial({color:0x121719,roughness:.52,metalness:.25})
 );
 cap.position.y=2.55;tech.add(cap);

 for(const sx of [-1,1]){
   const arm=new THREE.Mesh(new THREE.CylinderGeometry(.10,.12,.82,7),cloth);
   arm.position.set(.52*sx,1.50,0);
   arm.rotation.z=.08*sx;
   tech.add(arm);

   const leg=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.92,7),dark);
   leg.position.set(.25*sx,.35,0);
   tech.add(leg);
 }

 const apron=new THREE.Mesh(
   new THREE.PlaneGeometry(.62,.72),
   new THREE.MeshStandardMaterial({color:0x2b383b,roughness:.88,side:THREE.DoubleSide})
 );
 apron.position.set(0,1.43,-.39);
 apron.rotation.y=Math.PI;
 tech.add(apron);

 // Small tool light / welding lamp gives the location identity at night.
 const workLight=new THREE.PointLight(0xffc369,5.0,7.0,2);
 workLight.position.set(.6,2.15,.1);
 group.add(workLight);

 group.add(tech);
 scene.add(group);

 return{
   group,
   tech,
   terminal,
   label:"MAREK VOSS // ARMOR TECH",
   getPosition(){
     return tech.getWorldPosition(new THREE.Vector3());
   }
 };
}

const armorTechTerminal=createArmorTechServiceBay();

function createArmorFittingRack(){
 const group=new THREE.Group();
 group.name="voidroom_armor_fitting_rack";
 group.position.set(24.8,0,-11.3);

 const metal=new THREE.MeshStandardMaterial({color:0x222a2d,metalness:.74,roughness:.38});
 const dark=new THREE.MeshStandardMaterial({color:0x0f1315,metalness:.38,roughness:.72});
 const accent=new THREE.MeshStandardMaterial({color:0x6f342b,metalness:.58,roughness:.48});

 const base=new THREE.Mesh(new THREE.BoxGeometry(2.5,.14,1.1),dark);
 base.position.y=.07;group.add(base);

 const left=new THREE.Mesh(new THREE.BoxGeometry(.12,2.75,.12),metal);
 left.position.set(-1.05,1.38,0);group.add(left);
 const right=left.clone();right.position.x=1.05;group.add(right);
 const top=new THREE.Mesh(new THREE.BoxGeometry(2.2,.12,.12),metal);
 top.position.set(0,2.72,0);group.add(top);

 for(const x of [-.72,-.36,0,.36,.72]){
   const hook=new THREE.Mesh(new THREE.BoxGeometry(.06,.32,.18),metal);
   hook.position.set(x,2.42,-.07);group.add(hook);
 }

 const panel=new THREE.Mesh(new THREE.BoxGeometry(.72,.48,.14),accent);
 panel.position.set(0,1.35,-.44);group.add(panel);

 const lamp=new THREE.PointLight(0xffc98a,3.6,6.5,2);
 lamp.position.set(0,2.45,.45);group.add(lamp);

 scene.add(group);
 return{
   group,panel,
   getPosition(){return panel.getWorldPosition(new THREE.Vector3());}
 };
}
const armorFittingRack=createArmorFittingRack();

const armorTechMenu=document.getElementById("armorTechMenu");
const armorTechCondition=document.getElementById("armorTechCondition");
const armorTechBar=document.getElementById("armorTechBar");
const armorTechQuote=document.getElementById("armorTechQuote");
const armorTechCredits=document.getElementById("armorTechCredits");
const armorTechDiagnosis=document.getElementById("armorTechDiagnosis");
const armorTechServicePane=document.getElementById("armorTechServicePane");
const armorTechInspect=document.getElementById("armorTechInspect");
const armorTechWork=document.getElementById("armorTechWork");
const armorTechWorkLabel=document.getElementById("armorTechWorkLabel");
const armorTechWorkPct=document.getElementById("armorTechWorkPct");
const armorTechWorkBar=document.getElementById("armorTechWorkBar");

let armorTechOpen=false;
let armorTechInspected=false;
let armorTechBusy=false;
let armorTechJobTimer=null;

function repairCostFor(targetDurability){
 const current=player.getHelmetDurability();
 const target=Math.min(100,Math.max(current,targetDurability));
 const profile=player.helmetCatalog?.[player.helmetProfile?.id]??player.helmetCatalog?.titan_starter;
 const perPoint=profile?.repairCostPerPoint??2;
 const points=Math.max(0,target-current);

 // Destroyed electrical helmets require a bench reconstruction fee.
 const rebuildFee=current<=0 ? 140 : 0;
 return points*perPoint+rebuildFee;
}

function refreshArmorTechMenu(){
 const durability=player.getHelmetDurability();
 if(armorTechCondition)armorTechCondition.textContent=`${durability} / 100`;
 if(armorTechBar)armorTechBar.style.width=`${durability}%`;
 if(armorTechCredits)armorTechCredits.textContent=`${player.credits} CR`;

 const targets=[
   [25,Math.min(100,durability+25),"repairCost25"],
   [50,Math.min(100,durability+50),"repairCost50"],
   [100,100,"repairCost100"]
 ];
 for(const [,target,id] of targets){
   const el=document.getElementById(id);
   if(!el)continue;
   const cost=repairCostFor(target);
   el.textContent=
     target<=durability
       ?"NO WORK REQUIRED"
       :`${target-durability>0?"+":""}${target-durability} DUR // ${cost} CR`;
 }

 if(armorTechDiagnosis){
   if(!armorTechInspected){
     armorTechDiagnosis.textContent="AWAITING INSPECTION";
   }else if(durability<=0){
     armorTechDiagnosis.textContent="SHELL DEAD // POWER BUS FAILURE // BENCH REBUILD REQUIRED";
   }else if(durability<30){
     armorTechDiagnosis.textContent="CRITICAL // OPTICS + POWER DELIVERY UNSTABLE";
   }else if(durability<65){
     armorTechDiagnosis.textContent="DAMAGED // SEALS, OPTICS AND ELECTRICAL BUS DEGRADED";
   }else if(durability<100){
     armorTechDiagnosis.textContent="SERVICEABLE // FIELD DAMAGE PRESENT";
   }else{
     armorTechDiagnosis.textContent="FULLY SERVICEABLE";
   }
 }

 armorTechServicePane?.classList.toggle("locked",!armorTechInspected||armorTechBusy);

 if(armorTechQuote && !armorTechBusy){
   armorTechQuote.textContent=
     armorTechInspected
       ?`${player.helmetProfile?.name??"HELMET"} // authorize only the work you want.`
       :"Marek needs to inspect the helmet before quoting work.";
 }
}

function setArmorTechCaptured(active){
 input.setUiCaptured?.(active);
 if(active){
   input.fireHeld=false;
   input.firePressed=false;
   input.aimHeld=false;
 }
}

function openArmorTechMenu(){
 armorTechOpen=true;
 armorTechInspected=false;
 refreshArmorTechMenu();
 armorTechMenu?.classList.add("visible");
 setArmorTechCaptured(true);
 document.exitPointerLock?.();
}

function closeArmorTechMenu(){
 if(armorTechBusy)return;
 armorTechOpen=false;
 armorTechMenu?.classList.remove("visible");
 setArmorTechCaptured(false);
 resumeWorldControl();
}

function runArmorInspection(){
 if(armorTechBusy)return;
 armorTechInspected=true;
 refreshArmorTechMenu();
 collections.showToast("MAREK VOSS // INSPECTION COMPLETE");
}

function beginArmorTechJob({label,durationMs,cost,onComplete}){
 if(armorTechBusy || !armorTechInspected)return;

 cost=Math.max(0,Math.round(cost||0));
 if(cost<=0){
   collections.showToast("MAREK VOSS // NO WORK REQUIRED");
   return;
 }
 if(!player.canAfford(cost)){
   collections.showToast(`MAREK VOSS // NEED ${cost} CR // YOU HAVE ${player.credits}`);
   return;
 }

 // Money is committed when Marek starts the job, not after magic instant repair.
 if(!player.spendCredits(cost))return;

 armorTechBusy=true;
 armorTechServicePane?.classList.add("locked");
 if(armorTechInspect)armorTechInspect.disabled=true;
 if(armorTechQuote)armorTechQuote.textContent=`AUTHORIZED // ${cost} CR // MAREK IS WORKING`;
 if(armorTechWorkLabel)armorTechWorkLabel.textContent=label;
 if(armorTechWorkPct)armorTechWorkPct.textContent="0%";
 if(armorTechWorkBar)armorTechWorkBar.style.width="0%";
 armorTechWork?.classList.add("active");
 refreshArmorTechMenu();

 const start=performance.now();
 const duration=Math.max(650,durationMs||1800);

 const tick=()=>{
   const pct=THREE.MathUtils.clamp((performance.now()-start)/duration,0,1);
   if(armorTechWorkPct)armorTechWorkPct.textContent=`${Math.round(pct*100)}%`;
   if(armorTechWorkBar)armorTechWorkBar.style.width=`${pct*100}%`;

   if(pct<1){
     armorTechJobTimer=requestAnimationFrame(tick);
     return;
   }

   armorTechJobTimer=null;
   onComplete?.();
   armorTechBusy=false;
   armorTechInspected=true;
   if(armorTechInspect)armorTechInspect.disabled=false;
   armorTechWork?.classList.remove("active");
   if(armorTechWorkLabel)armorTechWorkLabel.textContent="BENCH IDLE";
   if(armorTechWorkPct)armorTechWorkPct.textContent="0%";
   if(armorTechWorkBar)armorTechWorkBar.style.width="0%";
   refreshArmorTechMenu();
   collections.showToast(`MAREK VOSS // ${label} COMPLETE`);
 };

 armorTechJobTimer=requestAnimationFrame(tick);
}

document.getElementById("armorTechClose")?.addEventListener("click",e=>{
 e.preventDefault();e.stopPropagation();closeArmorTechMenu();
});
armorTechInspect?.addEventListener("click",e=>{
 e.preventDefault();e.stopPropagation();runArmorInspection();
});

armorTechMenu?.addEventListener("pointerdown",e=>{
 e.stopPropagation();
 setArmorTechCaptured(true);
});
armorTechMenu?.addEventListener("mousedown",e=>{
 e.preventDefault();
 e.stopPropagation();
 setArmorTechCaptured(true);
});
armorTechMenu?.addEventListener("mouseup",e=>{
 e.stopPropagation();
 input.fireHeld=false;
 input.firePressed=false;
});
armorTechMenu?.addEventListener("click",e=>e.stopPropagation());

document.querySelectorAll("[data-armor-repair]").forEach(btn=>{
 btn.addEventListener("click",e=>{
   e.preventDefault();e.stopPropagation();
   if(!armorTechInspected||armorTechBusy)return;

   const mode=Number(btn.dataset.armorRepair||0);
   const current=player.getHelmetDurability();
   const target=mode>=100?100:Math.min(100,current+mode);
   const cost=repairCostFor(target);

   const duration=
     current<=0?3400:
     mode>=100?2700:
     mode>=50?2100:
     1450;

   beginArmorTechJob({
     label:current<=0?"POWER BUS REBUILD":mode>=100?"FULL HELMET REBUILD":mode>=50?"BENCH SERVICE":"FIELD PATCH",
     durationMs:duration,
     cost,
     onComplete:()=>player.serviceHelmet(target)
   });
 });
});

document.querySelectorAll("[data-helmet-variant]").forEach(btn=>{
 btn.addEventListener("click",e=>{
   e.preventDefault();e.stopPropagation();
   if(!armorTechInspected||armorTechBusy)return;

   const id=btn.dataset.helmetVariant;
   const item=player.helmetCatalog?.[id];
   if(!item)return;
   const cost=item.purchasePrice??0;

   beginArmorTechJob({
     label:`INSTALL ${item.name}`,
     durationMs:id==="recon_mk2"?3200:2400,
     cost,
     onComplete:()=>player.equipHelmetVariant(id)
   });
 });
});

const titanNames=[
  "TITAN-VOID-01",
  "TITAN-VOID-02",
  "TITAN-BLOCK-03",
  "TITAN-WH-09",
  "TITAN-RURAL-05",
  "TITAN-TREELINE-06"
];
const titanArchetypes=["heavy","assault","assault","sniper","knife","sniper"];
const enemyNamePool=[
  "Mason Rourke",
  "Elias Venn",
  "Darius Cole",
  "Victor Hale",
  "Jonah Mercer",
  "Silas Knox",
  "Caleb Ward",
  "Rafe Dalton",
  "Nolan Pike",
  "Gideon Cross",
  "Marcus Vale",
  "Tobias Kane"
];

const armory=new RealtimeArmory({
  player,
  input,
  toast:text=>collections.showToast(text),
  onClose:()=>resumeWorldControl()
});

const titans=sandbox.spawnPoints.map((spawn,i)=>
  new Titan(
    scene,
    player,
    {
      id:titanNames[i] ?? `TITAN-${String(i+1).padStart(2,"0")}`,
      name:titanNames[i] ?? `TITAN-${i+1}`,
      position:spawn.position,
      yaw:spawn.yaw,
      behavior:spawn.behavior,
      archetype:titanArchetypes[i] ?? "heavy",
      enemyName:enemyNamePool[i%enemyNamePool.length],
      callSign:`DR-${String(i+1).padStart(2,"0")}`,
      worldRoot:sandbox.root,
      spawnGrace:3.25+i*.18,
      activationRadius:
        spawn.behavior==="hangout"
        ?46
        :58
    }
  )
);

for(const hostile of titans)hostile.audioSystem=titanAudio;

const graveNecromancer=new Necromancer(scene,player,sandbox.root);

// FOUNDATION WEEKEND: the first contact is a simulated rival player, not a
// generic PvE difficulty sponge. ROOK uses the same perception gates as Titans
// but adds memory, prediction, range control, strafing and flanking decisions.
const foundationAce=titans[0];
if(foundationAce){
  foundationAce.enemyName="Rook Mercer";
  foundationAce.callSign="ROOK";
  foundationAce.displayName="FOUNDATION ACE // ROOK";
  foundationAce.id="FOUNDATION-ACE-ROOK";
  // Temporary Foundation test staging: place ROOK close enough to find immediately.
  foundationAce.group.position.set(-8,0,24);
  foundationAce.homePosition.copy(foundationAce.group.position);
  foundationAce.homeYaw=Math.PI*.72;
  foundationAce.activationRadius=82;
  foundationAce.spawnGrace=1.0;
  foundationAce.eliteBrain=new ElitePlayerAI(foundationAce,player,{callsign:"ROOK",skill:.94});
  foundationAce.aiBlackboard.state="assess";
  console.info("[TITAN AI] FOUNDATION ACE ONLINE // ROOK // nearby test spawn // skill 0.94 // fair perception");
}
let titan=titans[0];

// v7.4.4 — WEATHER HARD OFF / PERFORMANCE ISOLATION.
// The previous rain path updates 2400 drops + 620 streak segments + visor canvas work.
// Do not construct it during this baseline so we can measure its actual FPS/RAM cost.
const WEATHER_ENABLED=false;
const drySensory=Object.freeze({rainIntensity:0,voidroomMasking:0,playerGunshot:false,playerMelee:false});
const livingWeather=Object.freeze({
  enabled:false, intensity:0, streaks:null,
  sensory(){return drySensory;}, update(){}, noteGunshot(){}, noteMelee(){}
});
for(const hostile of titans)hostile.sensoryContext=()=>livingWeather.sensory();
console.info("[TITAN PERF] WEATHER HARD OFF — rain geometry/visor canvas not constructed");

const weapon=new Weapon(
  scene,
  camera,
  input,
  titans,
  player,
  sandbox.root,
  titanAudio
);

// v7.4.3 — ORACLE HARD OFF / PERFORMANCE BASELINE.
// Preserve all ORACLE source files, but do not import or construct them.
// The tiny frozen facade keeps existing gameplay event calls harmless without
// timers, DOM, audio graphs, localStorage, LM requests, TTS probes, or update work.
const ORACLE_ENABLED=false;
const oracle=Object.freeze({
  enabled:false,
  magnum:null,
  observe(){},
  update(){},
  speak(){},
  probeNeural(){return Promise.resolve(false);},
  magnumStatus(){return {enabled:false,available:false,busy:false,mode:"HARD_OFF"};}
});
window.ORACLE=oracle;
console.info("[TITAN PERF] ORACLE HARD OFF — module not imported; LM/TTS/timers inactive");


function getActiveTitan(){
 if(weapon.currentTarget?.alive){
   return weapon.currentTarget;
 }

 let best=null;
 let bestDist=Infinity;

 for(const t of titans){
   if(!t.alive)continue;
   const d=player.group.position.distanceTo(t.group.position);
   if(d<bestDist){
     best=t;
     bestDist=d;
   }
 }

 return best ?? weapon.currentTarget ?? titans[0];
}


const lootPrompt=document.getElementById("lootPrompt");
const lootPromptText=document.getElementById("lootPromptText");
let lootInteractLatch=false;
let cigaretteToggleLatch=false;
let cigaretteDragLatch=false;

const combatLogPinned=
  document.getElementById("combatLogPinned");

const combatLogLines=
  document.getElementById("combatLogLines");

const combatLogPulse=
  document.getElementById("combatLogPulse");

const combatLogPinnedEntries=[];
const combatLogEntries=[];

function pushCombatLog(event){
  if(!event)return;

  // ORACLE sees the same combat events as the HUD, but decides for itself
  // whether they are important enough to speak about.
  if(typeof oracle!=="undefined"){
    if(event.type==="damage"){
      if(event.killed)oracle.observe("kill",{event},65);
      else if(event.armorBreak)oracle.observe("armorBreak",{event},58);
      else if(event.critical)oracle.observe("criticalHit",{event},45);
    }else if(event.type==="reload" && event.phase==="start"){
      oracle.observe("reload",{event},25);
    }
  }

  if(!combatLogLines && !combatLogPinned)return;

  let text="";
  let className="system";
  let fill=45;

  if(event.type==="damage"){
    className=
      event.armorBreak
      ?"break"
      :(event.critical?"critical":"damage");

    const hpText=
      `${event.sectionHP}/${event.sectionMax}`;

    const critText=
      event.critical
      ?` · CRITICAL x1.5`
      :"";

    const breakText=
      event.armorBreak
      ?` · ARMOR BREAK`
      :"";

    const apText=
      event.penetrated && event.coreDamage>0
      ?` · AP ${event.coreDamage} CORE`
      :"";

    const staggerText=
      event.staggered
      ?` · STAGGER`
      :"";

    text=
      `${event.label}  ${hpText} HP  ·  -${event.damage}${critText}${apText}${breakText}${staggerText}`;

    fill=
      event.sectionMax>0
      ?THREE.MathUtils.clamp(
        (event.sectionHP/event.sectionMax)*100,
        8,
        100
      )
      :100;

    if(event.killed){
      text=
        `TARGET TERMINATED  ·  CORE 0/${event.coreMax}`;
      className="break";
      fill=100;
    }
  }

  if(event.type==="reload"){
    className="reload";

    if(event.phase==="start"){
      text=
        `RELOADING  ·  MAG ${event.ammo}/${event.magSize}  ·  RES ${event.reserve}`;
      fill=68;
    }else{
      text=
        `MAG READY  ·  ${event.ammo}/${event.magSize}  ·  RES ${event.reserve}`;
      fill=100;
    }
  }

  if(!text)return;

  const line=document.createElement("div");
  line.className=`combat-log__line ${className}`;
  line.style.setProperty("--fill",`${fill}%`);

  const tag=document.createElement("span");
  tag.className="tag";
  tag.textContent=
    className==="critical"
    ?"CRIT"
    :className==="break"
    ?"BREAK"
    :className==="reload"
    ?"SYS"
    :"HIT";

  const body=document.createElement("span");
  body.textContent=text;

  line.append(tag,body);

  // -------------------------------------------------------
  // PRIORITY LANE
  // Critical hits, armor breaks and kills are pinned above.
  // -------------------------------------------------------
  const priority=
    className==="critical" ||
    className==="break";

  if(priority && combatLogPinned){
    combatLogPinned.appendChild(line);
    combatLogPinnedEntries.push(line);

    // Keep only the latest 3 important events.
    // They remain long enough to actually be read.
    while(combatLogPinnedEntries.length>3){
      const old=combatLogPinnedEntries.shift();

      if(old){
        old.classList.add("fade-out");

        setTimeout(()=>{
          old.remove();
        },190);
      }
    }

    // Auto-retire priority events after 6.5 sec if newer events
    // have not already pushed them out.
    setTimeout(()=>{
      const idx=combatLogPinnedEntries.indexOf(line);

      if(idx!==-1){
        combatLogPinnedEntries.splice(idx,1);
        line.classList.add("fade-out");

        setTimeout(()=>{
          line.remove();
        },190);
      }
    },6500);

  }else if(combatLogLines){
    // -----------------------------------------------------
    // LIVE LANE
    // Regular hits and reload events blaze through below.
    // -----------------------------------------------------
    combatLogLines.appendChild(line);
    combatLogEntries.push(line);

    // Keep only the latest 4 ordinary events.
    while(combatLogEntries.length>4){
      const old=combatLogEntries.shift();

      if(old){
        old.classList.add("fade-out");

        setTimeout(()=>{
          old.remove();
        },190);
      }
    }

    // Ordinary hits have a shorter readable life.
    setTimeout(()=>{
      const idx=combatLogEntries.indexOf(line);

      if(idx!==-1){
        combatLogEntries.splice(idx,1);
        line.classList.add("fade-out");

        setTimeout(()=>{
          line.remove();
        },190);
      }
    },2200);
  }

  if(combatLogPulse){
    combatLogPulse.textContent=
      priority
      ?"LOCK"
      :"LIVE";

    combatLogPulse.style.opacity="1";

    clearTimeout(pushCombatLog._pulseTimer);

    pushCombatLog._pulseTimer=setTimeout(()=>{
      combatLogPulse.textContent="LIVE";
      combatLogPulse.style.opacity=".45";
    },260);
  }
}

weapon.setCombatLog(pushCombatLog);

// ------------------------------------------------------------
// v2.7 — PLAYER LIVE-FIRE SIMULATOR FEEDBACK
// ------------------------------------------------------------
let lastProcessedIncomingTime=0;

function armorText(zone){
 const z=player.playerArmorZones[zone];
 return z ? `${Math.ceil(z.hp)}/${z.max}${z.broken?"  OPEN":""}` : "--";
}

function growProceduralVisorCrack(severity=1){
 const group=document.getElementById("proceduralVisorCracks");
 if(!group)return;

 // v3.8: localized visor damage. A hit makes a small star/chip instead of
 // drawing a windshield-sized spider web across the player's view.
 const existing=group.children.length;
 const critical=player.visorDamage>=4;
 const count=critical ? 2 : 1;
 const cx=170+Math.random()*620;
 const cy=105+Math.random()*340;

 for(let branch=0;branch<count;branch++){
   let x=cx+(Math.random()-.5)*10;
   let y=cy+(Math.random()-.5)*10;
   let angle=Math.random()*Math.PI*2;
   const segments=critical ? 3+Math.floor(Math.random()*2) : 2+Math.floor(Math.random()*2);
   let d=`M${x.toFixed(1)} ${y.toFixed(1)}`;

   for(let i=0;i<segments;i++){
     angle+=(Math.random()-.5)*.58;
     const len=(critical?15:8)+Math.random()*(critical?20:13);
     x+=Math.cos(angle)*len;
     y+=Math.sin(angle)*len;
     d+=` L${x.toFixed(1)} ${y.toFixed(1)}`;
   }

   const path=document.createElementNS("http://www.w3.org/2000/svg","path");
   path.setAttribute("d",d);
   path.classList.add("procedural-crack");
   path.style.opacity=String(.28+Math.random()*.28);
   path.style.strokeWidth=String(.42+Math.random()*.38);
   group.appendChild(path);
 }

 // Keep the center of the view usable. Old cracks age out instead of
 // accumulating forever. Critical damage can retain a little more.
 const cap=critical?10:6;
 while(group.children.length>cap)group.removeChild(group.firstChild);
}

function pulseIncomingHit(result){
 const flash=document.getElementById("incomingHitFlash");
 if(flash){
   flash.classList.remove("hit");
   void flash.offsetWidth;
   flash.classList.add("hit");
 }

 document.body.classList.remove("screen-hit");
 void document.body.offsetWidth;
 document.body.classList.add("screen-hit");

 const visor=document.getElementById("visorDamage");
 if(visor){
   if(result.zone==="helmet" || result.healthDamage>0){
     player.visorDamage=Math.min(4,player.visorDamage+1);
   }
   visor.className.baseVal = player.visorDamage>0
     ?`damage-${player.visorDamage}`
     :"";
   if(result.zone==="helmet" && result.armorBreak){
     player.visorDamage=0;
     visor.className.baseVal="";
     const cracks=document.getElementById("proceduralVisorCracks");
     if(cracks)cracks.replaceChildren();
   }else if(result.zone==="helmet"){
     growProceduralVisorCrack(3);
   }else if(result.healthDamage>6 && Math.random()<.18){
     growProceduralVisorCrack(1);
   }
 }

 const last=document.getElementById("pcsLast");
 if(last){
   last.textContent=
     `${result.zone.toUpperCase()} HIT • -${result.armorDamage} ARMOR`+
     (result.healthDamage?` • -${result.healthDamage} CORE`:"")+
     (result.armorBreak?" • ARMOR LOST":"");
 }
}

function updatePlayerCombatStatus(){
 const h=document.getElementById("pcsHelmet");
 const l=document.getElementById("pcsLeft");
 const r=document.getElementById("pcsRight");
 const c=document.getElementById("pcsChest");

 if(h)h.textContent=armorText("helmet");
 if(l)l.textContent=armorText("leftShoulder");
 if(r)r.textContent=armorText("rightShoulder");
 if(c)c.textContent=armorText("chest");

 const incoming=player.lastIncomingHit;
 if(incoming && incoming.time>lastProcessedIncomingTime){
   lastProcessedIncomingTime=incoming.time;
   pulseIncomingHit(incoming);
 }
}


// ------------------------------------------------------------
// PROJECT TITAN v2.5 — COMBAT SIMULATOR / AFTER ACTION LEARNING
// ------------------------------------------------------------
const sim={
 startedAt:performance.now(),
 shots:0,
 hits:0,
 armorBreaks:0,
 zoneHits:{},
 lastZone:"NONE",
 lastHP:null,
 cardShown:false,
 deathDetectedAt:null,
 knownDead:new Set(),
 lastDefeated:null,
 cardHideTimer:null,
 cardManualVisible:false
};

const simEl=id=>document.getElementById(id);

function simLabel(zone){
 return ({
   leftShoulder:"LEFT SHOULDER",
   rightShoulder:"RIGHT SHOULDER",
   head:"HELMET",
   chest:"CHEST",
   body:"BODY"
 })[zone] || String(zone||"SCANNING").toUpperCase();
}

function updateSimulatorHUD(){
 titan=getActiveTitan();
 if(!titan)return;

 const zone=titan.lastCombatZone || "NONE";
 const hp=titan.zoneHP?.[zone];
 const rule=titan.arcadeArmor?.[zone];

 simEl("simContact").textContent=
   titan.enemyName ??
   titan.displayName ??
   titan.id ??
   "UNKNOWN CONTACT";
 simEl("simZone").textContent=simLabel(zone);

 if(hp){
   const pct=Math.max(0,Math.min(100,(hp.hp/hp.max)*100));
   simEl("simArmorBar").style.width=pct+"%";
   simEl("simArmorState").textContent=
     hp.broken ? "BREACHED / EXPOSED" :
     pct<=45 ? "FAILING" :
     pct<100 ? "DAMAGED" : "INTACT";
   simEl("simHits").textContent=rule?.hits ?? 0;

   if(hp.broken){
     simEl("simHint").textContent="ARMOR OPEN — SHIFT FIRE TO EXPOSED STRUCTURE";
   }else if(zone==="leftShoulder" || zone==="rightShoulder"){
     simEl("simHint").textContent="ISOLATED PLATE — REPEAT HITS TO FORCE EJECTION";
   }else if(zone==="head"){
     simEl("simHint").textContent="HIGH-VALUE ARMOR ZONE";
   }else{
     simEl("simHint").textContent="FIND A PLATE. HOLD FIRE ON ONE ZONE UNTIL IT FAILS.";
   }
 }else{
   simEl("simArmorBar").style.width="0%";
   simEl("simArmorState").textContent="NO ARMOR DATA";
   simEl("simHint").textContent="AIM AT A VISIBLE ARMOR PLATE";
 }

 // Approximate tactical range from camera to titan root.
 if(titan?.group && camera){
   simEl("simRange").textContent=camera.position.distanceTo(titan.group.position).toFixed(1)+" m";
 }

 // Detect a new registered hit from the target state without disturbing combat code.
 if(zone!=="NONE" && hp){
   const key=zone+":"+hp.hp+":"+(rule?.hits??0)+":"+hp.broken;
   if(sim._lastImpactKey!==key){
     sim._lastImpactKey=key;
     sim.hits++;
     sim.zoneHits[zone]=(sim.zoneHits[zone]||0)+1;

     const previous=sim.lastHP;
     const dealt=(sim.lastZone===zone && previous!=null)
       ?Math.max(0,previous-hp.hp)
       :Math.max(0,hp.max-hp.hp);

     simEl("simImpact").textContent=simLabel(zone);
     simEl("simDamage").textContent=dealt || "IMPACT";
     simEl("simResult").textContent=
       hp.broken ? "ARMOR FAILURE" :
       hp.hp/hp.max<=.45 ? "STRUCTURE WEAK" : "ABSORBED";

     if(hp.broken && !sim["_broken_"+zone]){
       sim["_broken_"+zone]=true;
       sim.armorBreaks++;
     }

     sim.lastZone=zone;
     sim.lastHP=hp.hp;
   }
 }

 const deadTitans=titans.filter(t=>!t.alive);
 const deadCount=deadTitans.length;

 for(const dead of deadTitans){
   const deadId=dead.id ?? dead.displayName ?? String(titans.indexOf(dead));

   if(!sim.knownDead.has(deadId)){
     sim.knownDead.add(deadId);
     sim.lastDefeated=dead;
     sim.lastDeadCount=deadCount;
     sim.deathDetectedAt=performance.now();
     sim.cardShown=false;
     break;
   }
 }

 if(
   sim.deathDetectedAt!==null &&
   !sim.cardShown &&
   performance.now()-sim.deathDetectedAt>=1150
 ){
   sim.cardShown=true;
   showAfterActionCard();
   sim.deathDetectedAt=null;
 }
}

function showAfterActionCard(){
 const elapsed=(performance.now()-sim.startedAt)/1000;
 // Existing weapon state does not expose a universal fired-shot counter,
 // so use confirmed combat hits as the minimum verified sample.
 const shots=Math.max(sim.shots,sim.hits);
 const accuracy=shots?Math.round((sim.hits/shots)*100):0;
 const best=Object.entries(sim.zoneHits).sort((a,b)=>b[1]-a[1])[0]?.[0] || "NONE";

 let grade="C";
 if(sim.armorBreaks>=2)grade="A";
 else if(sim.armorBreaks>=1)grade="B";

 let lesson="Study where armor separated from the body, then look for the same construction on the next enemy.";
 if(best==="leftShoulder" || best==="rightShoulder")
   lesson="Shoulder shells are independent armor. Concentrated fire defeats the attachment and exposes the rounded shoulder underneath.";
 if(best==="head")
   lesson="Helmet armor can fail rapidly. Confirm the target zone before spending ammunition on heavier torso protection.";

 const defeated=sim.lastDefeated;

 simEl("aacTitle").textContent=
   defeated?.enemyName ??
   defeated?.displayName ??
   defeated?.id ??
   "CONTACT DOWN";

 simEl("aacTime").textContent=elapsed.toFixed(1)+"s";
 simEl("aacShots").textContent=shots;
 simEl("aacHits").textContent=sim.hits;
 simEl("aacAccuracy").textContent=accuracy+"%";
 simEl("aacBreaks").textContent=sim.armorBreaks;
 simEl("aacBest").textContent=simLabel(best);
 simEl("aacGrade").textContent=grade;
 simEl("aacLesson").textContent=lesson;

 const loadout=document.getElementById("aacLoadout");
 if(loadout){
   loadout.textContent="RIFLE // MODULAR HEAVY // TIER I";
 }

 const card=document.getElementById("afterActionCard");
 card.classList.remove("aac-hidden");
 sim.cardManualVisible=false;

 if(sim.cardHideTimer){
   clearTimeout(sim.cardHideTimer);
 }

 sim.cardHideTimer=setTimeout(()=>{
   if(!sim.cardManualVisible){
     card.classList.add("aac-hidden");
   }
 },4800);
}


const armorTestReadout=document.createElement("div");
armorTestReadout.id="armorTestReadout";
armorTestReadout.style.cssText=`
 position:fixed;
 left:50%;
 top:64px;
 transform:translateX(-50%);
 z-index:99;
 color:#fff;
 font:800 12px/1.35 Segoe UI,Arial,sans-serif;
 letter-spacing:.08em;
 text-align:center;
 text-shadow:0 2px 5px #000;
 pointer-events:none;
 opacity:.92;
`;
document.body.appendChild(armorTestReadout);

function updateArmorTestReadout(){
 titan=getActiveTitan();
 if(!titan)return;

 const zone=titan.lastCombatZone || "NONE";
 const rule=titan.arcadeArmor?.[zone];
 const hp=titan.zoneHP?.[zone];

 if(rule && hp){
   const attached=
     (zone==="leftShoulder" && titan.leftShoulder?.parent===titan.group) ||
     (zone==="rightShoulder" && titan.rightShoulder?.parent===titan.group);

   const stateText=
     hp.broken
     ?"EJECTED"
     :(attached?"ATTACHED":"OFF BODY");

   armorTestReadout.textContent=
     `${titan.displayName} // ${hp.label} • ${hp.hp}/${hp.max} HP • HIT ${rule.hits}/${rule.forceBreakHits} • ${stateText}`;
 }else{
   armorTestReadout.textContent=
     `${titan.displayName} // ${String(zone).toUpperCase()}`;
 }
}


// Initial system line so the widget does not feel dead at spawn.
pushCombatLog({
  type:"reload",
  phase:"complete",
  ammo:weapon.ammo,
  magSize:weapon.magSize,
  reserve:weapon.reserve
});


// HUD
const healthEl=
  document.getElementById("health");

const playerArmorEl=
  document.getElementById("playerArmor");

const ammoEl=
  document.getElementById("ammo");

const enemyArmorEl=
  document.getElementById("enemyArmor");

const enemyHealthEl=
  document.getElementById("enemyHealth");

const fpsEl=
  document.getElementById("fps");

const message=
  document.getElementById("message");

// Double-layer crosshair UI.
const nearReticle=
  document.getElementById("nearReticle");

const hitMarker=
  document.getElementById("hitMarker");

const aimSystem=
  document.getElementById("aimSystem");

renderer.domElement.addEventListener(
  "pointerdown",
  ()=>{
    if(document.pointerLockElement!==renderer.domElement){
      // Manual/focus-return fallback. This activation is swallowed so returning
      // from DevTools or UI can NEVER become an accidental rifle shot.
      input.suppressCombatInput?.(420);
      safeRequestWorldPointerLock();
    }
  },
  {capture:true}
);

// Detached DevTools makes the game document temporarily inactive. Do not attempt
// pointer lock while DevTools owns focus; reacquire safely when the player returns.
window.addEventListener("focus",()=>{
  if(pointerLockResumePending && !input.uiCaptured){
    input.suppressCombatInput?.(420);
    // Give Chromium one frame to mark the renderer document fully active.
    requestAnimationFrame(()=>safeRequestWorldPointerLock());
  }
});

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible" && pointerLockResumePending && !input.uiCaptured){
    requestAnimationFrame(()=>safeRequestWorldPointerLock());
  }
});

document.addEventListener("pointerlockerror",()=>{
  pointerLockResumePending=true;
  input.suppressCombatInput?.(420);
  console.info("[TITAN INPUT] pointer lock not available yet; waiting for game focus");
});

// Pointer-lock look.
// Positive mouse Y means moving the mouse DOWN.
// Player handles it as normal non-inverted input.
addEventListener(
  "mousemove",
  e=>{
    if(
      document.pointerLockElement===
      renderer.domElement
    ){
      input.lookX+=
        e.movementX*.00215;

      input.lookY+=
        e.movementY*-.00215;
    }
  }
);

const clock=
  new THREE.Clock();

let frames=0;
let fpsTime=0;
let slowHudTimer=0;
let mediumHudTimer=0;
let lastLoopWallTime=performance.now();
let lastLongFrameReport=0;
let perfPressure=0;
let perfRecovery=0;


// ------------------------------------------------------------
// v7.5.0 — TITAN DEVELOPMENT PROFILER (F3)
// Inspired by Chromium/Electron/Three.js production profiling practice:
// keep telemetry sampled, separate JS heap / process RAM / GPU object counts,
// and time major runtime stages only while the profiler is visible.
// ------------------------------------------------------------
const titanDevProfiler={
  active:false, panel:null, body:null, samples:[], section:Object.create(null),
  frameMs:0, frameMax:0, longFrames:0, lastProcess:null, processPending:false,
  nextUiAt:0, nextProcessAt:0, baselineMemory:null,
  ensure(){
    if(this.panel)return;
    const el=document.createElement("section");
    el.id="titanDevProfiler";
    el.innerHTML=`<header><b>TITAN DEV PROFILER</b><span>F3 TOGGLE</span></header><pre></pre>`;
    document.body.appendChild(el);
    this.panel=el;this.body=el.querySelector("pre");
  },
  toggle(){
    this.ensure();this.active=!this.active;this.panel.classList.toggle("visible",this.active);
    if(this.active){this.samples.length=0;this.section=Object.create(null);this.frameMax=0;this.longFrames=0;this.baselineMemory=null;this.nextProcessAt=0;}
  },
  mark(name,start){
    if(!this.active)return;
    const ms=performance.now()-start;
    const q=this.section[name]||(this.section[name]={avg:0,max:0,last:0,n:0});
    q.last=ms;q.max=Math.max(q.max,ms);q.n++;q.avg=q.n===1?ms:q.avg*.92+ms*.08;
  },
  frame(ms){
    this.frameMs=ms;
    if(!this.active)return;
    this.frameMax=Math.max(this.frameMax,ms);if(ms>50)this.longFrames++;
    this.samples.push(ms);if(this.samples.length>600)this.samples.shift();
  },
  async pollProcess(now){
    if(!this.active||this.processPending||now<this.nextProcessAt)return;
    this.nextProcessAt=now+1000;this.processPending=true;
    try{this.lastProcess=await window.titanDesktop?.getProcessMetrics?.();}catch{}
    this.processPending=false;
  },
  fmtMB(kb){return Number.isFinite(kb)?(kb/1024).toFixed(1)+" MB":"n/a";},
  update(now){
    if(!this.active||now<this.nextUiAt)return;
    this.nextUiAt=now+250;this.pollProcess(now);
    const a=this.samples.slice().sort((x,y)=>x-y);
    const avg=a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
    const p95=a.length?a[Math.min(a.length-1,Math.floor(a.length*.95))]:0;
    const heap=performance.memory;
    const proc=this.lastProcess?.metrics||[];
    let workingKB=0,privateKB=0,cpu=0;
    const types=Object.create(null);
    for(const m of proc){
      const mem=m.memory||{};const wk=mem.workingSetSize??mem.residentSet??0;const pk=mem.privateBytes??mem.private??0;
      workingKB+=wk;privateKB+=pk;cpu+=Number(m.cpu)||0;
      const key=m.type||m.name||"Other";const row=types[key]||(types[key]={kb:0,cpu:0,n:0});row.kb+=wk;row.cpu+=Number(m.cpu)||0;row.n++;
    }
    if(this.baselineMemory==null&&workingKB)this.baselineMemory=workingKB;
    const delta=this.baselineMemory!=null?workingKB-this.baselineMemory:0;
    const ri=renderer.info;
    const awake=titans.reduce((n,t)=>n+(t.alive&&t.awake?1:0),0);
    const sections=Object.entries(this.section).sort((x,y)=>y[1].avg-x[1].avg).slice(0,10);
    const procRows=Object.entries(types).sort((x,y)=>y[1].kb-x[1].kb).slice(0,7);
    const lines=[
      `FRAME   now ${this.frameMs.toFixed(1)} ms | avg ${avg.toFixed(1)} | p95 ${p95.toFixed(1)} | max ${this.frameMax.toFixed(1)} | >50ms ${this.longFrames}`,
      `FPS     ~${this.frameMs>0?(1000/this.frameMs).toFixed(0):"-"} current | pixelRatio ${titanPerfGovernor.currentPixelRatio.toFixed(2)} | pressure ${titanPerfGovernor.pressure.toFixed(2)}`,
      `WEBGL   calls ${ri.render.calls} | tris ${ri.render.triangles} | geo ${ri.memory.geometries} | tex ${ri.memory.textures}`,
      `WORLD   titans ${titans.length} (${awake} awake) | dynamic wall meshes ${sandbox.root?.userData?.dynamicBulletMeshes?.length??0}`,
      heap?`JS HEAP used ${(heap.usedJSHeapSize/1048576).toFixed(1)} MB | total ${(heap.totalJSHeapSize/1048576).toFixed(1)} MB | limit ${(heap.jsHeapSizeLimit/1048576).toFixed(0)} MB`:`JS HEAP performance.memory unavailable`,
      `ELECTRON total working ${this.fmtMB(workingKB)} | private ${this.fmtMB(privateKB)} | Δ since F3 ${this.fmtMB(delta)} | CPU Σ ${cpu.toFixed(1)}%`,
      ``,
      `HOT SECTIONS (rolling avg / max ms):`,
      ...sections.map(([k,v])=>`${k.padEnd(18)} ${v.avg.toFixed(2).padStart(6)} / ${v.max.toFixed(2).padStart(6)}`),
      ``,
      `ELECTRON PROCESSES:`,
      ...procRows.map(([k,v])=>`${k.padEnd(18)} ${this.fmtMB(v.kb).padStart(9)} | ${v.cpu.toFixed(1).padStart(5)}% | x${v.n}`),
      ``,
      `NOTE: F3 telemetry is sampled; use F12 Performance/Memory traces for heap allocation + flame-chart proof.`
    ];
    this.body.textContent=lines.join("\n");
  }
};
window.TITAN_DEV_PROFILER=titanDevProfiler;
window.addEventListener("keydown",e=>{if(e.code==="F3"&&!e.repeat){e.preventDefault();titanDevProfiler.toggle();}});

function updateReticles(dt){
  const x=player.reticleLag.x;
  const y=player.reticleLag.y;

  nearReticle.style.transform=
    `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

  // Inspection orbit is for looking at the character/weapon,
  // so the combat reticle fades instead of pretending the
  // player is still actively aiming through the camera.
  aimSystem.style.opacity=
    player.inspectActive
    ?".18"
    :"1";

  if(weapon.hitMarkerTimer>0){
    hitMarker.classList.add("active");
  }else{
    hitMarker.classList.remove("active");
  }
}


const weaponHud=document.getElementById("weaponHud");
const weaponHudAmmo=document.getElementById("weaponHudAmmo");
const weaponHudMagSize=document.getElementById("weaponHudMagSize");
const weaponHudReserve=document.getElementById("weaponHudReserve");
const weaponHudBars=document.getElementById("weaponHudBars");
const weaponHudReloadFill=document.getElementById("weaponHudReloadFill");
const weaponHudReloadText=document.getElementById("weaponHudReloadText");

let lastWeaponHudAmmo=weapon.ammo;
let weaponHudTickTimer=0;

// 12 compact magazine-segment indicators.
for(let i=0;i<12;i++){
  const seg=document.createElement("span");
  seg.className="weapon-hud__bar";
  weaponHudBars.appendChild(seg);
}

const titanVisorMotion={targetX:0,targetY:0,x:0,y:0};
window.addEventListener("mousemove",(e)=>{
  if(document.body.classList.contains("helmet-off"))return;
  titanVisorMotion.targetX=THREE.MathUtils.clamp((e.clientX/window.innerWidth-.5)*2,-1,1);
  titanVisorMotion.targetY=THREE.MathUtils.clamp((e.clientY/window.innerHeight-.5)*2,-1,1);
},{passive:true});

function updateTitanVisorMotion(dt){
  const visor=document.getElementById("visorTint");
  const hud=document.getElementById("visorHud");
  if(!visor)return;
  const k=1-Math.exp(-Math.max(.001,dt)*7.5);
  titanVisorMotion.x=THREE.MathUtils.lerp(titanVisorMotion.x,titanVisorMotion.targetX,k);
  titanVisorMotion.y=THREE.MathUtils.lerp(titanVisorMotion.y,titanVisorMotion.targetY,k);
  visor.style.setProperty("--visor-x",`${(-titanVisorMotion.x*3.5).toFixed(2)}px`);
  visor.style.setProperty("--visor-y",`${(-titanVisorMotion.y*2.4).toFixed(2)}px`);
  visor.style.setProperty("--reflect-x",`${(-titanVisorMotion.x*10).toFixed(2)}px`);
  visor.style.setProperty("--reflect-y",`${(-titanVisorMotion.y*6).toFixed(2)}px`);
  if(hud)hud.style.transform=`translate(calc(-50% + ${(-titanVisorMotion.x*2).toFixed(2)}px),${(-titanVisorMotion.y*1.2).toFixed(2)}px)`;
}

function updateWeaponHud(dt){
  if(!weaponHud || !player?.weaponHudAnchor)return;

  const helmetHP=player.playerArmorZones?.helmet?.hp ?? 0;
  const visorOnline=helmetHP>0 && player.helmet?.visible!==false;
  weaponHud.classList.toggle("visor-linked",visorOnline);

  if(!visorOnline){
    weaponHud.classList.remove("visible");
    return;
  }

  const world=player.getWeaponHudWorldPosition();
  const projected=world.clone().project(camera);

  // Hide if anchor is behind the camera or offscreen by a large margin.
  const onScreen=
    projected.z>-1 &&
    projected.z<1 &&
    projected.x>-1.18 &&
    projected.x<1.18 &&
    projected.y>-1.18 &&
    projected.y<1.18;

  weaponHud.classList.toggle("visible",onScreen);

  if(!onScreen)return;

  const px=(projected.x*.5+.5)*innerWidth;
  const py=(-projected.y*.5+.5)*innerHeight;

  // Small presentation offset so the display floats just above the barrel/handguard.
  weaponHud.style.left=`${px+18}px`;
  weaponHud.style.top=`${py-24}px`;

  weaponHudAmmo.textContent=String(weapon.ammo).padStart(2,"0");
  weaponHudMagSize.textContent=weapon.magSize;
  weaponHudReserve.textContent=weapon.reserve;

  const ammoRatio=
    weapon.magSize>0
    ?weapon.ammo/weapon.magSize
    :0;

  weaponHud.classList.toggle("low-ammo",ammoRatio<=.25);
  weaponHud.classList.toggle("reloading",!!weapon.reloading);
  weaponHud.classList.toggle("firing",!!input.fire && !weapon.reloading);

  // Segment bars drain with magazine.
  const bars=[...weaponHudBars.children];
  const liveCount=Math.ceil(ammoRatio*bars.length);

  bars.forEach((bar,i)=>{
    bar.classList.toggle("live",i<liveCount);
    bar.classList.toggle("low",i<liveCount && ammoRatio<=.25);
  });

  // Reload progress from current timer / known reload duration.
  if(weapon.reloading){
    const total=1.55;
    const progress=THREE.MathUtils.clamp(
      1-(weapon.reloadTimer/total),
      0,
      1
    );

    weaponHudReloadFill.style.width=`${progress*100}%`;
    weaponHudReloadText.textContent="RELOAD";
  }else{
    weaponHudReloadFill.style.width="0%";
  }

  // Crisp little ammo-number punch every shot.
  if(weapon.ammo!==lastWeaponHudAmmo){
    lastWeaponHudAmmo=weapon.ammo;
    weaponHudAmmo.classList.remove("tick");
    // Force animation restart.
    void weaponHudAmmo.offsetWidth;
    weaponHudAmmo.classList.add("tick");
    weaponHudTickTimer=.11;
  }

  weaponHudTickTimer=Math.max(0,weaponHudTickTimer-dt);

  if(weaponHudTickTimer<=0){
    weaponHudAmmo.classList.remove("tick");
  }
}


const sandboxLocationEl=document.getElementById("sandboxLocation");
const sandboxContactsEl=document.getElementById("sandboxContacts");
const sandboxHintEl=document.getElementById("sandboxHint");

function updateSandboxIntel(){
 if(!sandbox)return;

 if(sandboxLocationEl){
   sandboxLocationEl.textContent=
     sandbox.getLocationName(player.group.position);
 }

 const alive=titans.filter(t=>t.alive).length;
 const nearby=titans.filter(t=>
   t.alive &&
   player.group.position.distanceTo(t.group.position)<65
 ).length;

 if(sandboxContactsEl){
   sandboxContactsEl.textContent=
     `CONTACTS // ${alive} ACTIVE • ${nearby} NEARBY`;
 }

 const hint=sandbox.getNearbyHint(player.group.position);

 if(sandboxHintEl){
   if(hint){
     sandboxHintEl.textContent=
       `${hint.title} — ${hint.text}`;
     sandboxHintEl.classList.add("visible");
   }else{
     sandboxHintEl.classList.remove("visible");
   }
 }
}


function updateWorldInteraction(){
 const playerPos=player.group.position;
 let nearest=null;
 let nearestDistance=2.75;

 // Posters.
 for(const poster of sandbox.collectiblePosters||[]){
   if(!poster.visible)continue;
   const wp=poster.getWorldPosition(new THREE.Vector3());
   const dist=playerPos.distanceTo(wp);
   if(dist<nearestDistance){
     nearestDistance=dist;
     nearest={type:"poster",object:poster,label:`TAKE ${poster.userData.collectiblePoster?.title||"POSTER"}`};
   }
 }

 // Greatsword.
 const sword=sandbox.swordPickup;
 if(sword?.parent && !sword.userData.picked){
   const wp=sword.getWorldPosition(new THREE.Vector3());
   const dist=playerPos.distanceTo(wp);
   if(dist<nearestDistance){
     nearestDistance=dist;
     nearest={type:"greatsword",object:sword,label:"TAKE TITAN GREATSWORD // MK I"};
   }
 }

 // VOIDROOM media screen.
 for(const screen of sandbox.mediaScreens||[]){
   const wp=screen.group.getWorldPosition(new THREE.Vector3());
   const dist=playerPos.distanceTo(wp);
   if(dist<4.8&&dist<nearestDistance+2.5){
     nearestDistance=dist;nearest={type:"media",object:screen,label:"USE VOIDROOM MEDIA REMOTE"};
   }
 }

 // Armor-tech merchant/service terminal.
 if(armorTechTerminal?.tech){
   const wp=armorTechTerminal.getPosition();
   const dist=playerPos.distanceTo(wp);
   if(dist<3.4 && dist<nearestDistance){
     const durability=player.getHelmetDurability();
     nearestDistance=dist;
     nearest={
       type:"armorTech",
       object:armorTechTerminal,
       label:`TALK TO MAREK VOSS // ARMOR TECH // HELMET ${durability}/100`
     };
   }
 }

 // Physical fitting rack. Strip/restore is only enabled here.
 if(armorFittingRack){
   const wp=armorFittingRack.getPosition();
   const dist=playerPos.distanceTo(wp);
   if(dist<3.2 && dist<nearestDistance){
     nearestDistance=dist;
     nearest={
       type:"armorFitting",
       object:armorFittingRack,
       label:"USE ARMOR FITTING RACK // STRIP / RESTORE / INSPECT"
     };
   }
 }

 // Dropped rifles.
 for(const t of titans){
   const d=t.droppedWeapon;
   if(!d || d.picked || !d.model)continue;
   const dist=playerPos.distanceTo(d.model.position);
   if(dist<nearestDistance){
     nearestDistance=dist;
     nearest={type:"rifle",titan:t,drop:d,label:`RECOVER ${d.label} // ${t.displayName}`};
   }
 }

 if(lootPrompt){
   lootPrompt.classList.toggle("visible",!!nearest);
   if(nearest && lootPromptText)lootPromptText.textContent=nearest.label;
 }

 const interactDown=!!input.keys.KeyE || !!input.interactPressed;

 if(nearest && interactDown && !lootInteractLatch){
   if(nearest.type==="armorTech"){
     openArmorTechMenu();
   }else if(nearest.type==="armorFitting"){
     armory.openFittingStation();
   }else if(nearest.type==="media"){
     toggleMediaRemote(nearest.object);
   }else if(nearest.type==="poster"){
     collections.collectPoster(nearest.object);
   }else if(nearest.type==="greatsword"){
     if(player.attachGreatsword(nearest.object)){
       nearest.object.userData.picked=true;
       collections.showToast("EQUIPPED // TITAN GREATSWORD MK I");
       oracle.observe("greatswordPickup",{
         itemId:"titan_greatsword_mk1",
         itemName:"TITAN GREATSWORD // MK I",
         location:sandbox.getLocationName?.(player.group.position)||"VOIDROOM"
       },68);
     }
   }else if(nearest.type==="rifle"){
     const accepted=player.attachRecoveredWeapon(
       nearest.drop.model,
       {ownerId:nearest.drop.ownerId,label:nearest.drop.label}
     );
     if(accepted){
       nearest.drop.picked=true;

       // Recovered rifles are useful ammunition sources immediately.
       const foundMag=Math.max(0,nearest.drop.magAmmo||0);
       const foundReserve=Math.max(0,nearest.drop.reserveAmmo||0);
       const magNeed=Math.max(0,weapon.magSize-weapon.ammo);
       const toMag=Math.min(magNeed,foundMag);
       weapon.ammo+=toMag;
       weapon.reserve+=Math.max(0,foundMag-toMag)+foundReserve;

       collections.showToast(
         `RIFLE RECOVERED // +${toMag} MAG · +${Math.max(0,foundMag-toMag)+foundReserve} RES`
       );
     }
   }
 }

 lootInteractLatch=interactDown;
}


const breachRaycaster=new THREE.Raycaster();
const breachDirection=new THREE.Vector3();
let breachCooldownUntil=0;

function updateQuietBreachMelee(){
 if(!input.meleePressed)return;
 input.meleePressed=false;
 const now=performance.now();
 if(now<breachCooldownUntil || player.health<=0)return;
 breachCooldownUntil=now+430;

 player.triggerMeleeStrike?.();

 // Event-based close strike: one ray only when X/MMB is pressed. No permanent
 // melee collider, physics body, projectile, or per-frame wall scan.
 camera.getWorldDirection(breachDirection);
 breachRaycaster.set(camera.position,breachDirection);
 breachRaycaster.near=.08;
 breachRaycaster.far=2.20;

 const candidates=[];
 const seen=new Set();
 const addCandidate=m=>{
   // Melee must use the SAME damageable wall surfaces the rifle sees.
   // Fractured children are not guaranteed to retain isBuildingWall, so requiring
   // that flag made v7.5.2 swings visually play but miss the destruction callback.
   if(!m?.isMesh || m.visible===false || !m.userData?.blocksBullets ||
      typeof m.userData?.onBulletHit!=="function" || seen.has(m))return;
   seen.add(m);candidates.push(m);
 };
 for(const m of weapon.worldBulletMeshes||[])addCandidate(m);
 for(const m of player.worldCollisionMeshes||[])addCandidate(m);
 for(const m of sandbox.root?.userData?.dynamicBulletMeshes||[])addCandidate(m);

 const wallHit=breachRaycaster.intersectObjects(candidates,false)[0] ?? null;

 // Same close strike can hit an enemy/corpse. This remains event-based: at most
 // one short ray test per target when the melee button is pressed.
 let titanHit=null,titanTarget=null;
 for(const t of titans){
   if(!t?.group?.visible)continue;
   const h=t.raycastCombat?.(breachRaycaster);
   if(h && (!titanHit || h.distance<titanHit.distance)){
     titanHit=h;titanTarget=t;
   }
 }

 if(!wallHit && !titanHit){
   collections.showToast?.("MELEE // NO CONTACT");
   return;
 }

 const hitTitanFirst=titanHit && (!wallHit || titanHit.distance<=wallHit.distance);
 let result=null;
 if(hitTitanFirst){
   const zone=titanHit.object?.userData?.zone||"body";
   result=titanTarget.takeHit(zone,42,{
     shotDirection:breachDirection.clone(),
     hitPoint:titanHit.point.clone(),
     hitObject:titanHit.object,
     armorPenetration:.02,
     melee:true,
     weaponId:"powered_gauntlet"
   });
   collections.showToast?.(`MELEE IMPACT // ${String(zone).toUpperCase()}`);
 }else{
   const material=wallHit.object.userData?.materialType||"concrete";
   // Brick/masonry can be quietly worked apart. Dense concrete resists improvised
   // strikes so weapon/tool progression still matters later.
   const damage=material==="brick"?1.18:.34;
   result=wallHit.object.userData?.onBulletHit?.({
     point:wallHit.point.clone(),
     direction:breachDirection.clone(),
     damage,
     source:"melee",
     damageType:"blunt_breach",
     energyJ:material==="brick"?165:105
   });
   if(result?.activated)collections.showToast?.("QUIET BREACH // MASONRY OPENING");
   else if(result?.chipped)collections.showToast?.("QUIET BREACH // BRICK CHIPPED");
   else collections.showToast?.("MELEE IMPACT");
 }

 // Melee is intentionally a much smaller acoustic event than gunfire. The
 // existing sensory system can consume this later without pretending it is silent.
 livingWeather.noteMelee?.();
 player.cameraImpact.z+=.025;
 player.cameraImpactRoll+=(Math.random()-.5)*.012;
}

const swordRaycaster=new THREE.Raycaster();
const swordHitBySerial=new Map();
const swordHitCooldown=new Map();

function raycastSwordSegment(a,b,titan){
 const dir=b.clone().sub(a);
 const length=dir.length();
 if(length<.001)return null;
 dir.divideScalar(length);
 swordRaycaster.set(a,dir);
 swordRaycaster.far=length+.10;
 return titan.raycastCombat(swordRaycaster);
}

function updateGreatswordCombat(){
 if(!player.swordEquipped)return;

 const sweep=player.getGreatswordSweep?.();
 if(!sweep?.active || !sweep.previousValid)return;

 for(const t of titans){
   if(!t.alive)continue;
   const now=performance.now();
   if((swordHitCooldown.get(t)||0)>now)continue;

   // Real swept-volume approximation: current blade + tip/mid/base travel.
   // This follows the actual animated metal instead of camera-center hitscan.
   const segments=[
     [sweep.base,sweep.tip],
     [sweep.prevTip,sweep.tip],
     [sweep.prevMid,sweep.mid],
     [sweep.prevBase,sweep.base]
   ];

   let hit=null;
   for(const [a,b] of segments){
     const h=raycastSwordSegment(a,b,t);
     if(h && (!hit || h.distance<hit.distance))hit=h;
   }

   if(!hit)continue;

   const zone=hit.object?.userData?.zone || "body";
   const swingDir=sweep.tip.clone().sub(sweep.prevTip);
   if(swingDir.lengthSq()<.0001){
     swingDir.copy(sweep.tip).sub(sweep.base);
   }
   swingDir.normalize();

   // Heavy melee has high blunt/cutting impulse but very low ballistic penetration.
   const speed=THREE.MathUtils.clamp(player.swordBladeSpeed||0,.42,8);
   const damage=Math.round(18+speed*14);
   t.takeHit(zone,damage,{
     shotDirection:swingDir,
     hitPoint:hit.point,
     hitObject:hit.object,
     armorPenetration:.04,
     melee:true,
     weaponId:"titan_greatsword_mk1"
   });

   swordHitBySerial.set(t,sweep.serial);
   swordHitCooldown.set(t,performance.now()+180);
   player.cameraImpactRoll+=THREE.MathUtils.degToRad(.35);
   collections.showToast(`GREATSWORD IMPACT // ${zone.toUpperCase()}`);
 }
}


let activeMediaScreen=null;
const mediaRemote=document.getElementById("mediaRemote");
function formatMediaTime(v){const s=Math.max(0,Math.floor(v||0));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
function toggleMediaRemote(screen=null){
 if(mediaRemote?.classList.contains("visible")){closeMediaRemote();return;}
 activeMediaScreen=screen||sandbox.mediaScreens?.[0]||null;if(!activeMediaScreen)return;
 mediaRemote?.classList.add("visible");
 input.setUiCaptured?.(true);
 input.fireHeld=false;input.firePressed=false;
 document.exitPointerLock?.();
 updateMediaRemoteHud();
}
function closeMediaRemote(){
 const wasOpen=!!mediaRemote?.classList.contains("visible");
 mediaRemote?.classList.remove("visible");
 activeMediaScreen=null;
 if(!armorTechOpen)input.setUiCaptured?.(false);
 if(wasOpen && !armorTechOpen)resumeWorldControl();
}
function updateMediaRemoteHud(){
 if(!activeMediaScreen||!mediaRemote?.classList.contains("visible"))return;
 const st=activeMediaScreen.getStatus();
 document.getElementById("mediaChannel").textContent=`CH ${String(st.channel).padStart(2,"0")}`;
 document.getElementById("mediaTitle").textContent=`VOIDROOM CHANNEL ${String(st.channel).padStart(2,"0")}`;
 document.getElementById("mediaVolume").textContent=`VOL ${Math.round(st.volume*100)}`;
 document.getElementById("mediaTime").textContent=`${formatMediaTime(st.time)} / ${formatMediaTime(st.duration)}`;
 document.getElementById("mediaPower").textContent=st.powered?"POWER ON":"POWER OFF";
 document.getElementById("mediaBass").textContent=st.bass?"BASS ON":"BASS OFF";
 document.getElementById("mediaPlay").textContent=st.paused?"▶":"Ⅱ";
}
async function mediaCommand(cmd){
 if(!activeMediaScreen)return;
 if(cmd==="next"){const ok=await activeMediaScreen.nextChannel();collections.showToast(ok?`CHANNEL ${String(activeMediaScreen.channel).padStart(2,"0")}`:"NO CHANNEL FILE");}
 else if(cmd==="prev")await activeMediaScreen.previousChannel();
 else if(cmd==="rewind"){
   const ok=activeMediaScreen.seek(-15);
   if(ok)collections.showToast("MEDIA // -15 SEC");
 }else if(cmd==="forward"){
   const ok=activeMediaScreen.seek(15);
   if(ok)collections.showToast("MEDIA // +15 SEC");
 }
 else if(cmd==="play")activeMediaScreen.togglePlay();else if(cmd==="volDown")activeMediaScreen.setVolume(activeMediaScreen.volume-.10);
 else if(cmd==="volUp")activeMediaScreen.setVolume(activeMediaScreen.volume+.10);else if(cmd==="bass")activeMediaScreen.toggleBass();else if(cmd==="power")activeMediaScreen.togglePower();else if(cmd==="close")closeMediaRemote();
 updateMediaRemoteHud();
}
mediaRemote?.addEventListener("pointerdown",e=>{
 e.stopPropagation();input.setUiCaptured?.(true);input.fireHeld=false;input.firePressed=false;
});
mediaRemote?.addEventListener("mousedown",e=>{
 e.preventDefault();e.stopPropagation();input.setUiCaptured?.(true);input.fireHeld=false;input.firePressed=false;
});
mediaRemote?.addEventListener("mouseup",e=>{
 e.stopPropagation();input.fireHeld=false;input.firePressed=false;
});
mediaRemote?.addEventListener("click",e=>{const cmd=e.target.closest("[data-media]")?.dataset.media;if(cmd)mediaCommand(cmd);});

function updateCigaretteControls(){
 const cDown=!!input.keys.KeyC;
 // V = cigarette drag. G is reserved exclusively for physical visor raise/lower.
 const vDown=!!input.keys.KeyV;

 // C is edge-triggered from Input's own key state, so it works regardless of
 // pointer lock, Electron focus, or ordering of separate keydown listeners.
 if(cDown&&!cigaretteToggleLatch){
   console.info("[CIG DEBUG] C detected", {
     build:"4.8.18",
     smoking:player.smoking,
     cigarettesBefore:player.cigarettes,
     startSmoking:typeof player.startSmoking
   });

   if(player.smoking){
     player.stopSmoking?.();
     console.info("[CIG DEBUG] cigarette put out");
     collections.showToast("CIGARETTE PUT OUT");
   }else{
     const started=player.startSmoking?.()===true;
     console.info("[CIG DEBUG] startSmoking result", {
       started,
       cigarettesAfter:player.cigarettes,
       rigVisible:player.cigaretteRig?.visible
     });

     if(started){
       collections.showToast("CIGARETTE LIT // HOLD V TO TAKE A DRAG");
     }else if(player.cigarettes<=0){
       collections.showToast("NO CIGARETTES");
     }else{
       collections.showToast("CIGARETTE INPUT ERROR // CHECK CONSOLE");
     }
   }
 }
 cigaretteToggleLatch=cDown;

 // V is a true hold action. Release generates the exhale plume and relief.
 if(vDown&&!cigaretteDragLatch&&player.smoking){
   player.beginCigaretteDrag?.();
 }
 if(!vDown&&cigaretteDragLatch&&player.smoking){
   const relief=player.endCigaretteDrag?.()||0;
   if(relief>0)collections.showToast(`EXHALE // NERVES -${Math.round(relief)}`);
 }
 cigaretteDragLatch=vDown;
}

let helmetHighlightEnabled=true;
let helmetNightVisionEnabled=false;
let helmetFeatureLatchH=false;
let helmetFeatureLatchN=false;
let helmetFeatureLatchV=false;
let playerFlashlightLatch=false;
const helmetTargetMaterials=new Map();
const helmetTargetCache=new Map();
let helmetHighlightAppliedState=null;
let helmetTargetHudTimer=0;
let helmetRangeTimer=0;
let helmetRangeCandidates=null;
const helmetRangeRaycaster=new THREE.Raycaster();
helmetRangeRaycaster.far=250;
const helmetCenterNdc=new THREE.Vector2(0,0);
const helmetWarmColor=new THREE.Color(0xf2c94c);

function getHelmetTargetCache(t){
 let cached=helmetTargetCache.get(t);
 if(cached)return cached;
 const materials=[];
 const meshes=[];
 t.group.traverse(o=>{
   if(!o.isMesh)return;
   meshes.push(o);
   const mats=Array.isArray(o.material)?o.material:[o.material];
   for(const mat of mats){
     if(!mat || !("color" in mat))continue;
     if(!helmetTargetMaterials.has(mat)){
       helmetTargetMaterials.set(mat,{
         emissive:mat.emissive?.clone?.()||null,
         emissiveIntensity:mat.emissiveIntensity??0,
         color:mat.color?.clone?.()||null
       });
     }
     materials.push(mat);
   }
 });
 cached={materials,meshes};
 helmetTargetCache.set(t,cached);
 return cached;
}

function primeHelmetCombatCaches(){
 for(const t of titans)getHelmetTargetCache(t);
 helmetRangeCandidates=[];
 for(const t of titans)helmetRangeCandidates.push(...getHelmetTargetCache(t).meshes);
 for(const m of player.worldCollisionMeshes||[])if(m?.isObject3D)helmetRangeCandidates.push(m);
 console.info("[TITAN PERF] opening combat caches primed",{
   enemies:titans.length,raycastObjects:helmetRangeCandidates.length
 });
}

function setHelmetFeatureToast(text){
 collections.showToast?.(text);
}

function updateHelmetFeatureInput(active){
 const hDown=!!input.keys.KeyH;
 const nDown=!!input.keys.KeyN;
 const vDown=!!input.keys.KeyG;
 const fDown=!!input.keys.KeyF;

 if(hDown&&!helmetFeatureLatchH){
   if(active && player.helmetProfile?.chips?.targetHighlight){
     helmetHighlightEnabled=!helmetHighlightEnabled;
     setHelmetFeatureToast(`VISOR TARGET HIGHLIGHT // ${helmetHighlightEnabled?"ON":"OFF"}`);
   }else if(!active){
     setHelmetFeatureToast("HELMET OFFLINE // TARGET LINK UNAVAILABLE");
   }
 }
 if(nDown&&!helmetFeatureLatchN){
   if(active && player.helmetProfile?.chips?.nightVision){
     helmetNightVisionEnabled=!helmetNightVisionEnabled;
     setHelmetFeatureToast(`STARTER NIGHT VISION // ${helmetNightVisionEnabled?"ON":"OFF"}`);
   }else if(!active){
     setHelmetFeatureToast("HELMET OFFLINE // NIGHT VISION UNAVAILABLE");
   }
 }
 if(vDown&&!helmetFeatureLatchV){
   if(active){
     player.visorRaised=!player.visorRaised;
     if(player.visorRaised)helmetNightVisionEnabled=false;
     setHelmetFeatureToast(player.visorRaised?"VISOR RAISED // RAW VIEW":"VISOR CLOSED // SYSTEMS ONLINE");
   }else{
     setHelmetFeatureToast("HELMET OFFLINE");
   }
 }
 if(fDown&&!playerFlashlightLatch){
   const on=player.toggleFlashlight();
   setHelmetFeatureToast(`CHEST LIGHT // ${on?"ON":"OFF"}`);
 }
 helmetFeatureLatchH=hDown;
 helmetFeatureLatchN=nDown;
 helmetFeatureLatchV=vDown;
 playerFlashlightLatch=fDown;
}

function getTargetLabel(titan,index){
 const layer=document.getElementById("visorTargetLayer");
 if(!layer)return null;
 let el=layer.querySelector(`[data-titan-label="${index}"]`);
 if(!el){
   el=document.createElement("div");
   el.className="visor-target-tag";
   el.dataset.titanLabel=String(index);
   layer.appendChild(el);
 }
 return el;
}

function updateHelmetTargeting(active,dt=0){
 const highlight=active && !player.visorRaised && helmetHighlightEnabled && !!player.helmetProfile?.chips?.targetHighlight;
 const layer=document.getElementById("visorTargetLayer");
 if(layer)layer.style.display=highlight?"block":"none";

 // Expensive material traversal/mutation now happens only when H/state changes.
 if(helmetHighlightAppliedState!==highlight){
   helmetHighlightAppliedState=highlight;
   titans.forEach(t=>{
     if(t.nameplate)t.nameplate.visible=!!(highlight && t.alive);
     const cached=getHelmetTargetCache(t);
     for(const mat of cached.materials){
       const base=helmetTargetMaterials.get(mat);
       if(highlight && t.alive){
         if(mat.emissive){
           mat.emissive.setRGB(.34,.23,.035);
           mat.emissiveIntensity=.46;
         }else if(mat.color && base?.color){
           mat.color.copy(base.color).lerp(helmetWarmColor,.16);
         }
       }else{
         if(mat.emissive && base?.emissive){
           mat.emissive.copy(base.emissive);
           mat.emissiveIntensity=base.emissiveIntensity;
         }
         if(mat.color && base?.color)mat.color.copy(base.color);
       }
     }
   });
 }

 helmetTargetHudTimer+=dt;
 if(helmetTargetHudTimer<1/30)return;
 helmetTargetHudTimer=0;

 titans.forEach((t,index)=>{
   if(t.nameplate){
     t.nameplate.visible=!!(highlight && t.alive);
   }

   if(!t.alive && !t.__helmetHighlightRestored){
     t.__helmetHighlightRestored=true;
     const cached=getHelmetTargetCache(t);
     for(const mat of cached.materials){
       const base=helmetTargetMaterials.get(mat);
       if(mat.emissive && base?.emissive){
         mat.emissive.copy(base.emissive);
         mat.emissiveIntensity=base.emissiveIntensity;
       }
       if(mat.color && base?.color)mat.color.copy(base.color);
     }
   }

   const el=getTargetLabel(t,index);
   if(!el)return;
   if(!highlight || !t.alive){
     el.style.display="none";
     return;
   }
   const p=t.group.position.clone();p.y+=4.45;
   const dist=player.group.position.distanceTo(t.group.position);
   p.project(camera);
   const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.15&&Math.abs(p.y)<1.15;
   el.style.display=visible?"block":"none";
   if(visible){
     el.style.left=`${(p.x*.5+.5)*100}%`;
     el.style.top=`${(-p.y*.5+.5)*100}%`;
     el.textContent=`${t.enemyName?.toUpperCase?.()??"CONTACT"} // ${dist.toFixed(1)}m`;
   }
 });
}

function updateHelmetRangefinder(active,dt=0){
 const data=document.getElementById("visorHudData");
 if(!data || !active || !player.helmetProfile?.chips?.rangefinder)return;

 helmetRangeTimer+=dt;
 if(helmetRangeTimer<1/20)return;
 helmetRangeTimer=0;

 if(!helmetRangeCandidates)primeHelmetCombatCaches();
 helmetRangeRaycaster.setFromCamera(helmetCenterNdc,camera);
 const hits=helmetRangeRaycaster.intersectObjects(helmetRangeCandidates,true);
 let d=null;
 for(const hit of hits){
   if(!player.group.getObjectById(hit.object.id)){
     d=hit.distance;break;
   }
 }
 data.textContent=d!=null?`LOS ${d.toFixed(1)}m`:"LOS >250m";
}

setTimeout(()=>{
 try{ primeHelmetCombatCaches(); }
 catch(err){ console.warn("[TITAN PERF] cache prewarm skipped",err); }
},0);

function updateHelmetDamageState(active,integrity){
 document.body.classList.remove("helmet-dmg-1","helmet-dmg-2","helmet-dmg-3","helmet-dmg-4","helmet-nv");
 if(!active)return;
 const damage=1-integrity;
 if(damage>=.90)document.body.classList.add("helmet-dmg-4");
 else if(damage>=.60)document.body.classList.add("helmet-dmg-3");
 else if(damage>=.30)document.body.classList.add("helmet-dmg-2");
 else if(damage>=.10)document.body.classList.add("helmet-dmg-1");
 if(helmetNightVisionEnabled)document.body.classList.add("helmet-nv");
}

let visorCodeTimer=0;
let visorCodeFrame=0;
function updateVisorCodeStream(dt,active){
  if(!active)return;
  visorCodeTimer+=dt;
  if(visorCodeTimer<.085)return;
  visorCodeTimer=0;
  visorCodeFrame++;

  const cols=document.querySelectorAll("[data-code-col]");
  const hex="0123456789ABCDEF";
  const token=(n=4)=>{
    let out="";
    for(let i=0;i<n;i++)out+=hex[(Math.random()*16)|0];
    return out;
  };
  const prefixes=["TRK","SYS","BAL","NET"];
  const suffixes=["LOCK","SYNC","LIVE","ARM"];

  cols.forEach((el,i)=>{
    el.textContent=
      `${prefixes[i]} ${token(4)} ${token(2)} // ${suffixes[(visorCodeFrame+i)%4]} `+
      `${String(((performance.now()/10)|0)+i*173).slice(-4)}`;
  });
}

function updateHelmetVisorHud(dt=0){
 const helmetHP=player.playerArmorZones?.helmet?.hp ?? 0;
 const helmetPresent=helmetHP>0 && player.helmet?.visible!==false;
 const active=helmetPresent;
 const visorActive=helmetPresent && !player.visorRaised;
 const maxHelmet=player.playerArmorZones?.helmet?.max||30;
 const integrity=THREE.MathUtils.clamp(helmetHP/maxHelmet,0,1);
 document.body.classList.toggle("helmet-off",!helmetPresent);
 document.body.classList.toggle("helmet-online",visorActive);
 document.body.classList.toggle("visor-raised",helmetPresent&&player.visorRaised);
 if(!active)helmetNightVisionEnabled=false;
 updateHelmetFeatureInput(helmetPresent);
 updateHelmetDamageState(visorActive,integrity);
 updateHelmetTargeting(visorActive,dt);

 const tint=document.getElementById("visorTint");
 const data=document.getElementById("visorHudData");
 if(tint){
   tint.style.setProperty("--visor-integrity",integrity.toFixed(3));
 }
 if(data){
   let range="--.-";
   let target=titans.find(t=>t.alive);
   if(target){
     range=player.group.position.distanceTo(target.group.position).toFixed(1);
   }
   const integrityPct=Math.round(integrity*100);
   const status=document.getElementById("visorHudStatus");
   if(status) status.textContent=visorActive?`OPTIC ${integrityPct}%`:(helmetPresent?"VISOR RAISED":"OPTIC OFFLINE");
   data.textContent=visorActive?`RNG ${range}m`:"";

   const ammo=document.getElementById("visorAmmo");
   const reserve=document.getElementById("visorReserve");
   const threat=document.getElementById("visorThreat");
   const helmet=document.getElementById("visorIntegrity");
   if(ammo)ammo.textContent=String(weapon.ammo).padStart(2,"0");
   if(reserve)reserve.textContent=`RES ${weapon.reserve}`;
   if(helmet)helmet.textContent=`HELMET DUR ${integrityPct}/100`;
   if(threat){
     const alive=titans.filter(t=>t.alive).length;
     threat.textContent=alive?`CONTACTS ${alive}`:"CLEAR";
   }
 }
}

function updateStressHud(){
 const hud=document.getElementById("stressHud");
 if(!hud)return;
 const n=THREE.MathUtils.clamp(player.stress/player.stressMax,0,1);
 const pct=Math.round(n*100);
 document.getElementById("stressValue").textContent=`${pct}%`;
 document.getElementById("stressFill").style.width=`${pct}%`;
 const state=player.smoking?"SMOKING // CALMING":n<.20?"SETTLED":n<.45?"ALERT":n<.70?"PRESSURED":n<.88?"SHAKEN":"OVERWHELMED";
 document.getElementById("stressState").textContent=state;
 document.getElementById("cigaretteCount").textContent=`CIGS ${player.cigarettes}`;
 hud.classList.toggle("is-smoking",player.smoking);
}


// ============================================================
// v7.3 — TITAN BOOT GATE
// The player never enters a live combat simulation while shaders/media/AI links
// are still warming. The game remains behind a black loading screen until ready.
// ============================================================
const titanBoot={
  overlay:document.getElementById("titanBoot"),
  bar:document.getElementById("titanBootBar"),
  pct:document.getElementById("titanBootPct"),
  phase:document.getElementById("titanBootPhase"),
  detail:document.getElementById("titanBootDetail")
};

function setBootProgress(value,phase,detail=""){
  const p=Math.max(0,Math.min(100,Math.round(value)));
  if(titanBoot.bar)titanBoot.bar.style.width=`${p}%`;
  if(titanBoot.pct)titanBoot.pct.textContent=`${p}%`;
  if(titanBoot.phase&&phase)titanBoot.phase.textContent=phase;
  if(titanBoot.detail)titanBoot.detail.textContent=detail||"";
}

function nextPaint(){
  return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}

function waitForWindowLoad(){
  if(document.readyState==="complete")return Promise.resolve();
  return new Promise(resolve=>window.addEventListener("load",resolve,{once:true}));
}

async function waitForMediaWarmup(timeoutMs=5000){
  const screens=sandbox?.mediaScreens||[];
  if(!screens.length)return;
  const jobs=screens.map(screen=>new Promise(resolve=>{
    const v=screen?.video;
    if(!v || v.readyState>=1)return resolve();
    let done=false;
    const finish=()=>{if(done)return;done=true;resolve();};
    v.addEventListener("loadedmetadata",finish,{once:true});
    v.addEventListener("canplay",finish,{once:true});
    setTimeout(finish,timeoutMs);
  }));
  await Promise.allSettled(jobs);
}

async function preloadOracleLinks(){
  // v7.4.3: deliberate no-op. ORACLE is excluded from the performance baseline.
  return;
}

async function warmRendererAndCombat(){
  // Compile shaders before the player can be shot.
  if(typeof renderer.compileAsync==="function"){
    await renderer.compileAsync(scene,camera);
  }else{
    renderer.compile?.(scene,camera);
  }

  // Prime authored caches and force a few upload/paint cycles.
  try{ primeHelmetCombatCaches(); }catch{}
  renderer.render(scene,camera);
  await nextPaint();
  renderer.render(scene,camera);
  await nextPaint();

  // Touch each enemy update-free render path without advancing AI/combat time.
  for(const t of titans){
    t.group?.updateMatrixWorld?.(true);
  }
  scene.updateMatrixWorld?.(true);
  camera.updateMatrixWorld?.(true);
  renderer.render(scene,camera);
  await nextPaint();
}

async function releaseBootGate(){
  input.setUiCaptured?.(false);

  // v7.3.1 HOTFIX:
  // startTitanRuntime used a 999999ms suppression while loading.
  // suppressCombatInput() intentionally uses Math.max(), so asking for 700ms here
  // could NOT shorten that existing timer. Clear the boot lock first.
  input.clearCombatInputSuppression?.();
  input.suppressCombatInput?.(700);

  input.fire=false;
  input.fireHeld=false;
  input.firePressed=false;
  input.aimHeld=false;
  if(titanBoot.overlay){
    titanBoot.overlay.classList.add("titan-boot-ready");
    await new Promise(r=>setTimeout(r,520));
    titanBoot.overlay.remove();
  }
  clock.getDelta(); // discard startup wall-time so first live dt cannot spike
}


// ============================================================
// v7.4 — COMBAT PERFORMANCE GOVERNOR
// Protect the renderer/main thread during fights. Visual fidelity is restored
// gradually after combat rather than allowing one expensive burst to freeze play.
// ============================================================
const titanPerfGovernor={
  combat:false,
  pressure:0,
  smoothMs:16.7,
  lastApply:0,
  savedPixelRatio:Math.min(window.devicePixelRatio||1,1.35),
  currentPixelRatio:Math.min(window.devicePixelRatio||1,1.35),
  targetPixelRatio:Math.min(window.devicePixelRatio||1,1.35),

  setCombat(active){
    this.combat=!!active;
    document.documentElement.classList.toggle("titan-combat-budget",this.combat);
  },

  sample(ms){
    this.smoothMs=this.smoothMs*.94+Math.min(ms,180)*.06;
    if(ms>42)this.pressure=Math.min(1,this.pressure+.09);
    else if(ms<24)this.pressure=Math.max(0,this.pressure-.018);

    // During combat we favor latency over supersampling.
    const native=Math.min(window.devicePixelRatio||1,1.35);
    const combatCap=this.combat?1.0:native;
    const pressureCap=this.pressure>.70?.82:this.pressure>.38?.92:combatCap;
    this.targetPixelRatio=Math.min(combatCap,pressureCap);

    const now=performance.now();
    if(now-this.lastApply>350 && Math.abs(this.currentPixelRatio-this.targetPixelRatio)>.04){
      this.currentPixelRatio += Math.sign(this.targetPixelRatio-this.currentPixelRatio)*.08;
      this.currentPixelRatio=Math.max(.78,Math.min(native,this.currentPixelRatio));
      renderer.setPixelRatio(this.currentPixelRatio);
      renderer.setSize(innerWidth,innerHeight,false);
      this.lastApply=now;
    }
  }
};

window.TITAN_PERF=()=>{
  const ri=renderer.info;
  return {
    frameMs:+titanPerfGovernor.smoothMs.toFixed(1),
    pressure:+titanPerfGovernor.pressure.toFixed(2),
    pixelRatio:+titanPerfGovernor.currentPixelRatio.toFixed(2),
    drawCalls:ri.render?.calls??ri.calls??0,
    triangles:ri.render?.triangles??0,
    geometries:ri.memory?.geometries??0,
    textures:ri.memory?.textures??0,
    dynamicWallMeshes:sandbox.root?.userData?.dynamicBulletMeshes?.length??0,
    fracture:sandbox.root?.userData?.fractureStats??null,
    titans:titans.length,
    combat:titanPerfGovernor.combat,
    jsHeapMB:performance.memory?{
      used:+(performance.memory.usedJSHeapSize/1048576).toFixed(1),
      total:+(performance.memory.totalJSHeapSize/1048576).toFixed(1)
    }:null,
    profilerHint:"Press F3 for live sampled profiler; F12 for Chrome Performance/Memory traces."
  };
};

function loop(){
  requestAnimationFrame(loop);

  // v7.3: measure wall-clock frame duration BEFORE any adaptive system reads it.
  // v7.2 accidentally referenced wallFrame before declaration, killing the loop.
  const wallNow=performance.now();
  const wallFrame=wallNow-lastLoopWallTime;
  lastLoopWallTime=wallNow;
  titanDevProfiler.frame(wallFrame);

  const dt=Math.min(
    clock.getDelta(),
    .033
  );

  // Combat budget: hostile proximity / recent incoming fire keeps expensive
  // background systems out of the renderer's critical path.
  let perfCombat=false;
  try{
    const now=performance.now();
    perfCombat=(now-(window.__titanLastCombatAt||0)<8500);
    if(!perfCombat){
      for(const t of titans){
        if(!t?.alive)continue;
        const d=t.group?.position?.distanceTo?.(camera.position);
        if(Number.isFinite(d) && d<48){perfCombat=true;break;}
      }
    }
    titanPerfGovernor.setCombat(perfCombat);
  }catch{}
  titanPerfGovernor.sample(wallFrame);

  let __pt=titanDevProfiler.active?performance.now():0;
  updateDayNight(dt);
  titanDevProfiler.mark("dayNight",__pt);
  __pt=titanDevProfiler.active?performance.now():0;
  player.update(dt);
  titanDevProfiler.mark("player.update",__pt);
  __pt=titanDevProfiler.active?performance.now():0;
  livingWeather.update(dt);
  titanDevProfiler.mark("weather",__pt);

  // Prestige adaptive budget: preserve look first, then quietly reduce secondary rain streak density
  // only under sustained renderer pressure. Recover automatically when frame pacing improves.
  if(wallFrame<28)perfRecovery+=dt;
  else perfRecovery=0;
  if(perfRecovery>8){perfPressure=Math.max(0,perfPressure-1);perfRecovery=0;}
  if(livingWeather?.streaks){
    livingWeather.streaks.visible=perfPressure<6 || ((frames&1)===0);
  }
  updateCigaretteControls();
  updateQuietBreachMelee();
  updateGreatswordCombat();
 document.body.classList.toggle("titan-aiming", !!player.aiming);
 document.body.classList.toggle("titan-firing", !!input.fire && !weapon.reloading);
  if(input.fire && !weapon.reloading)livingWeather.noteGunshot();
  if(player.swordControlActive && input.fire)livingWeather.noteMelee();
  __pt=titanDevProfiler.active?performance.now():0;
  for(const t of titans){t.update(dt);}
  graveNecromancer.update(dt,performance.now()/1000);
  titanDevProfiler.mark("titans.update",__pt);

  __pt=titanDevProfiler.active?performance.now():0;
  updateWorldInteraction();
  titanDevProfiler.mark("worldInteraction",__pt);

  titan=getActiveTitan();
  __pt=titanDevProfiler.active?performance.now():0;
  weapon.update(dt);
  titanDevProfiler.mark("weapon.update",__pt);
  if(ORACLE_ENABLED)oracle.update(dt);

  healthEl.textContent=
    `HEALTH ${Math.ceil(player.health)}`;

  playerArmorEl.textContent=
    `ARMOR ${Math.ceil(player.armor)}`;

  ammoEl.textContent=
    player.swordEquipped
    ?`GREATSWORD // ${player.swordControlActive?"BLADE CONTROL":"GUARD"}`
    :weapon.reloading
    ?`RELOADING ${weapon.ammo} / ${weapon.reserve}`
    :`${weapon.ammo} / ${weapon.reserve}`;

  enemyArmorEl.textContent=
    titan?.alive
    ?`${titan.displayName} ARMOR ${Math.ceil(titan.armor)}`
    :"NO ACTIVE CONTACT";

  enemyHealthEl.textContent=
    titan?.alive
    ?`CORE ${Math.ceil(titan.health)}`
    :"";

  const aliveCount=titans.filter(t=>t.alive).length;

  message.textContent=
    player.health<=0
    ?"YOU ARE DOWN — REFRESH TO RESTART"
    :aliveCount===0
    ?"DISTRICT CLEARED"
    :titan?.armor<=0
    ?"CORE EXPOSED — KEEP FIRING"
    :"ROAM. IDENTIFY. ENGAGE. SURVIVE.";

  updateReticles(dt);

  updateTitanVisorMotion(dt);
  updateHelmetVisorHud(dt);
  updateHelmetRangefinder(!document.body.classList.contains("helmet-off")&&!document.body.classList.contains("visor-raised"),dt);
  updateVisorCodeStream(dt,!document.body.classList.contains("helmet-off"));
  updateWeaponHud(dt);
 mediumHudTimer-=dt;
 slowHudTimer-=dt;

 if(mediumHudTimer<=0){
   mediumHudTimer=.10;
   updateSimulatorHUD();
   updatePlayerCombatStatus();
   updateStressHud();
   updateArmorTestReadout();
 }

 if(slowHudTimer<=0){
   slowHudTimer=.20;
   updateSandboxIntel();
 }

 __pt=titanDevProfiler.active?performance.now():0;
 sandbox.update?.(dt,player.group.position);
 titanDevProfiler.mark("sandbox.update",__pt);
 __pt=titanDevProfiler.active?performance.now():0;
 renderer.render(
    scene,
    camera
  );
 titanDevProfiler.mark("renderer.render",__pt);
 titanDevProfiler.update(wallNow);

 if(wallFrame>110 && wallNow-lastLongFrameReport>1500){
   lastLongFrameReport=wallNow;
   perfPressure=Math.min(10,perfPressure+1);
   perfRecovery=0;
   console.warn("[TITAN PERF] LONG FRAME",{
     ms:Math.round(wallFrame),
     activeTitans:titans.filter(t=>t.alive&&t.awake).length,
     drawCalls:renderer.info.render.calls,
     triangles:renderer.info.render.triangles,
     geometries:renderer.info.memory.geometries,
     textures:renderer.info.memory.textures,
     audioVoices:titanAudio?.activeVoices?.size ?? 0,
     weaponAmmo:weapon.ammo
   });
 }

  input.endFrame();

  frames++;
  fpsTime+=dt;

  if(fpsTime>=.5){
    fpsEl.textContent=
      `FPS ${Math.round(frames/fpsTime)}`;

    frames=0;
    fpsTime=0;
  }
}

async function startTitanRuntime(){
  // No gameplay loop exists until this function finishes.
  // That guarantees enemies cannot move/fire during shader/model/media warmup.
  input.setUiCaptured?.(true);
  // UI capture itself blocks combat input during preload.
  // Keep only a short safety suppression; never leave a giant timestamp behind.
  input.clearCombatInputSuppression?.();
  input.suppressCombatInput?.(500);
  setBootProgress(3,"INITIALIZING TITAN","holding simulation");

  try{
    setBootProgress(10,"LOADING WORLD","waiting for renderer document and fonts");
    await Promise.allSettled([
      waitForWindowLoad(),
      document.fonts?.ready||Promise.resolve()
    ]);

    setBootProgress(24,"LOADING WORLD","warming media surfaces");
    await waitForMediaWarmup();

    setBootProgress(38,"ORACLE OFF","performance baseline — AI and voice systems sleeping");
    await preloadOracleLinks();

    setBootProgress(48,"PREPARING AUDIO","decoding and prewarming first-shot audio path");
    const audioWarmStart=performance.now();
    try{
      await titanAudio?.preloadPromise;
      const playerAudioPos=player?.group?.position?.clone?.() ?? new THREE.Vector3();
      const enemyAudioPos=titans?.find?.(t=>t?.group)?.group?.position?.clone?.() ?? playerAudioPos;
      await titanAudio?.prewarmCombatAudio?.(playerAudioPos,enemyAudioPos);
      console.info(`[TITAN PERF] audio prewarm ${(performance.now()-audioWarmStart).toFixed(1)}ms`);
    }catch(err){
      console.warn("[TITAN BOOT] audio prewarm degraded",err);
    }

    setBootProgress(56,"PREPARING COMBAT","building target and collision caches");
    try{ primeHelmetCombatCaches(); }catch(err){
      console.warn("[TITAN BOOT] combat cache warmup skipped",err);
    }

    setBootProgress(66,"COMPILING GRAPHICS","precompiling scene shaders");
    console.info("[TITAN PERF] precompiling scene shaders...");
    await warmRendererAndCombat();
    console.info("[TITAN PERF] scene shaders precompiled");

    setBootProgress(86,"WARMING FRAME PIPELINE","uploading pooled effects and settling renderer");
    await new Promise(r=>setTimeout(r,220));
    renderer.render(scene,camera);
    await nextPaint();

    setBootProgress(96,"FINAL CHECK","arming controls after all warmup work");
    await new Promise(r=>setTimeout(r,120));

    setBootProgress(100,"READY","simulation synchronized");
    await releaseBootGate();

    lastLoopWallTime=performance.now();
    loop();
  }catch(err){
    console.error("[TITAN BOOT] startup gate error",err);
    setBootProgress(100,"BOOT DEGRADED","non-critical subsystem failed; entering simulation");
    await releaseBootGate();
    lastLoopWallTime=performance.now();
    loop();
  }
}
startTitanRuntime();

addEventListener(
  "resize",
  ()=>{
    camera.aspect=
      innerWidth/
      innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);


// v3.5 — Combat card never blocks gameplay.
// It auto-fades; K recalls/hides the most recent report.
window.addEventListener("keydown",e=>{
  const card=document.getElementById("afterActionCard");
  if(!card)return;

  if(e.code==="KeyK"){
    const hidden=card.classList.contains("aac-hidden");

    if(hidden){
      card.classList.remove("aac-hidden");
      sim.cardManualVisible=true;

      if(sim.cardHideTimer){
        clearTimeout(sim.cardHideTimer);
        sim.cardHideTimer=null;
      }
    }else{
      card.classList.add("aac-hidden");
      sim.cardManualVisible=false;
    }
  }

  // Enter remains a convenience hide key, never a required progression input.
  if(e.code==="Enter" && !card.classList.contains("aac-hidden")){
    card.classList.add("aac-hidden");
    sim.cardManualVisible=false;
  }
});




// v4.4.2 field inventory / poster collection.
window.addEventListener("keydown",e=>{
 if(mediaRemote?.classList.contains("visible")){
   if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","KeyJ","KeyL","KeyB","KeyP","Escape"].includes(e.code)){
     e.preventDefault();
     if(e.code==="ArrowLeft")mediaCommand("prev");else if(e.code==="ArrowRight")mediaCommand("next");
     else if(e.code==="ArrowUp")mediaCommand("volUp");else if(e.code==="ArrowDown")mediaCommand("volDown");
     else if(e.code==="KeyJ")mediaCommand("rewind");else if(e.code==="KeyL")mediaCommand("forward");
     else if(e.code==="Space")mediaCommand("play");else if(e.code==="KeyB")mediaCommand("bass");else if(e.code==="KeyP")mediaCommand("power");else closeMediaRemote();
     return;
   }
 }

 if(e.code==="Digit4" && !e.repeat){
   if(player.backSword){
     if(player.toggleGreatsword()){
       collections.showToast(
         player.swordEquipped
         ?"GREATSWORD DRAWN // HOLD RMB + MOVE MOUSE"
         :"GREATSWORD SHEATHED"
       );
     }
   }
 }
 if(e.code==="KeyI" && !e.repeat){e.preventDefault();armory.toggle();}
 if(e.code==="KeyO" && !e.repeat){e.preventDefault();collections.toggle();}
 if(e.code==="Escape"){if(armory.isOpen())armory.close();else collections.close();}
});
