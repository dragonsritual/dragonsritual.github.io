import * as THREE from "three";
const SAVE_KEY="projectTitanArmory_v1";
function loadState(){try{const r=JSON.parse(localStorage.getItem(SAVE_KEY)||"{}");return{equipped:r.equipped||{chest:"grim_v2",leftShoulder:"siege",rightShoulder:"siege",helmet:"titan"},stash:Array.isArray(r.stash)?r.stash:["grim_v2","field_cuirass","siege","raider","titan","scout"]};}catch{return{equipped:{chest:"grim_v2",leftShoulder:"siege",rightShoulder:"siege",helmet:"titan"},stash:["grim_v2","field_cuirass","siege","raider","titan","scout"]};}}
const ITEMS=[
{id:"grim_v2",slot:"chest",name:"GRIM CUIRASS V2",armor:90,mass:"HEAVY",note:"Split breastplate / segmented abdomen"},
{id:"field_cuirass",slot:"chest",name:"FIELD CUIRASS",armor:72,mass:"MED",note:"Faster field-change shell"},
{id:"siege",slot:"shoulder",name:"SIEGE PAULDRON",armor:40,mass:"HEAVY",note:"Oversized layered shoulder plate"},
{id:"raider",slot:"shoulder",name:"RAIDER PAULDRON",armor:28,mass:"LIGHT",note:"Cut-down asymmetric plate"},
{id:"titan",slot:"helmet",name:"TITAN HELMET",armor:30,mass:"MED",note:"Optic link / combat telemetry"},
{id:"scout",slot:"helmet",name:"SCOUT HELMET",armor:18,mass:"LIGHT",note:"Wide optics / reduced protection"}];
export class RealtimeArmory{
constructor({player,input,toast,onClose=null}){this.player=player;this.input=input;this.toast=toast;this.onClose=onClose;this.state=loadState();this.overlay=document.getElementById("armoryOverlay");this.grid=document.getElementById("armoryGrid");this.slotLabel=document.getElementById("armorySlotLabel");this.itemName=document.getElementById("armoryItemName");this.itemStats=document.getElementById("armoryItemStats");this.itemNote=document.getElementById("armoryItemNote");this.risk=document.getElementById("armoryRisk");this.model=document.getElementById("armoryModel");this.equip=document.getElementById("armoryEquip");this.progress=document.getElementById("armoryEquipProgress");this.progressBar=document.getElementById("armoryEquipProgressBar");this.selected=ITEMS[0];this.rotation=0;this.drag=false;this.busy=false;this.fittingStation=false;this.previewRenderer=null;this.previewScene=null;this.previewCamera=null;this.previewGroup=null;this.previewRAF=0;
this.stripBtn=document.getElementById("armoryStripAll");this.restoreBtn=document.getElementById("armoryRestoreAll");
for(const evt of["pointerdown","mousedown","mouseup","click"])this.overlay?.addEventListener(evt,e=>{e.stopPropagation();this.input.fireHeld=false;this.input.firePressed=false;this.input.aimHeld=false;});
document.getElementById("armoryClose")?.addEventListener("click",()=>this.close());this.equip?.addEventListener("click",()=>this.beginEquip());
this.stripBtn?.addEventListener("click",()=>this.stripAll());this.restoreBtn?.addEventListener("click",()=>this.restoreAll());
this.model?.addEventListener("pointerdown",e=>{this.drag=true;this.dragX=e.clientX;this.model.setPointerCapture?.(e.pointerId);});
this.model?.addEventListener("pointermove",e=>{if(!this.drag)return;this.rotation+=(e.clientX-this.dragX)*.35;this.dragX=e.clientX;this.renderModel();});this.model?.addEventListener("pointerup",()=>this.drag=false);this.initPreview();this.render();}
isOpen(){return!!this.overlay?.classList.contains("visible");}save(){localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));}
open({fittingStation=false}={}){if(!this.overlay)return;this.fittingStation=!!fittingStation;this.overlay.classList.add("visible");this.refreshPreviewClone();this.startPreviewLoop();this.input.setUiCaptured?.(true);this.input.fireHeld=false;this.input.firePressed=false;this.input.aimHeld=false;document.exitPointerLock?.();this.render();}
close(){if(this.busy){this.toast?.("ARMOR CHANGE IN PROGRESS // CANNOT ABORT");return;}const wasOpen=this.isOpen();this.overlay?.classList.remove("visible");this.input.setUiCaptured?.(false);if(wasOpen)this.onClose?.();}
toggle(){this.isOpen()?this.close():this.open({fittingStation:false});}
openFittingStation(){this.open({fittingStation:true});this.toast?.("FITTING RACK // STRIP / RESTORE ENABLED");}
stripAll(){if(this.busy)return;if(!this.fittingStation){this.toast?.("STRIP ARMOR // FITTING STATION REQUIRED");return;}this.player.stripAllArmorForFitting?.();this.state.equipped={chest:null,leftShoulder:null,rightShoulder:null,helmet:null};this.save();this.toast?.("ARMOR STRIPPED // BODY EXPOSED");this.refreshPreviewClone();this.render();}
restoreAll(){if(this.busy)return;if(!this.fittingStation){this.toast?.("RESTORE ARMOR // FITTING STATION REQUIRED");return;}this.player.restoreAllArmorForFitting?.();this.state.equipped={chest:"grim_v2",leftShoulder:"siege",rightShoulder:"siege",helmet:"titan"};this.save();this.toast?.("TEST ARMOR RESTORED");this.refreshPreviewClone();this.render();}
render(){if(!this.grid)return;
if(this.stripBtn)this.stripBtn.disabled=!this.fittingStation||this.busy;
if(this.restoreBtn)this.restoreBtn.disabled=!this.fittingStation||this.busy;
this.grid.innerHTML="";for(const item of ITEMS.filter(i=>this.state.stash.includes(i.id))){const b=document.createElement("button");b.className="armory-piece"+(this.selected?.id===item.id?" selected":"");b.innerHTML=`<span>${item.slot.toUpperCase()}</span><b>${item.name}</b><small>ARM ${item.armor} // ${item.mass}</small>`;b.addEventListener("click",()=>{if(this.busy)return;this.selected=item;this.render();});this.grid.appendChild(b);}if(this.selected){this.slotLabel.textContent=this.selected.slot.toUpperCase();this.itemName.textContent=this.selected.name;this.itemStats.textContent=`ARMOR ${this.selected.armor} // MASS ${this.selected.mass}`;this.itemNote.textContent=this.selected.note;}this.renderModel();}
initPreview(){
 if(!this.model)return;
 const old=this.model.querySelector(".armory-silhouette");if(old)old.style.display="none";
 const canvas=document.createElement("canvas");canvas.className="armory-preview-canvas";this.model.prepend(canvas);
 this.previewRenderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
 this.previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.2));
 this.previewRenderer.outputColorSpace=THREE.SRGBColorSpace;
 this.previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;this.previewRenderer.toneMappingExposure=1.15;
 this.previewScene=new THREE.Scene();
 this.previewCamera=new THREE.PerspectiveCamera(27,1,.1,40);
this.previewCamera.position.set(0,0,6);this.previewCamera.lookAt(0,0,0);
 this.previewScene.add(new THREE.HemisphereLight(0xc7e5ef,0x15110e,2.2));
 const key=new THREE.DirectionalLight(0xffe2bd,4);key.position.set(3,5,4);this.previewScene.add(key);
 const rim=new THREE.DirectionalLight(0x6acbd4,2);rim.position.set(-4,3,-2);this.previewScene.add(rim);
 this.refreshPreviewClone();
}
refreshPreviewClone(){
 if(!this.previewScene||!this.player?.group)return;
 if(this.previewGroup)this.previewScene.remove(this.previewGroup);
 this.previewGroup=this.player.group.clone(true);
 this.previewGroup.position.set(0,0,0);this.previewGroup.rotation.set(0,0,0);this.previewGroup.scale.setScalar(1);
 this.previewGroup.traverse(o=>{
   const n=(o.name||"").toLowerCase();
   if(n.includes("rifle")||n.includes("muzzle")||n.includes("greatsword")||n.includes("recovered_weapon"))o.visible=false;
   if(o.isLight)o.visible=false;
 });
 this.previewScene.add(this.previewGroup);
 this.autoFramePreview();
}
autoFramePreview(){
 if(!this.previewGroup||!this.previewCamera)return;
 this.previewGroup.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(this.previewGroup);
 if(box.isEmpty())return;
 const size=box.getSize(new THREE.Vector3());
 const center=box.getCenter(new THREE.Vector3());
 this.previewGroup.position.sub(center);
 this.previewGroup.updateMatrixWorld(true);
 const vfov=THREE.MathUtils.degToRad(this.previewCamera.fov);
 const byHeight=(size.y*.5)/Math.tan(vfov*.5);
 const maxDim=Math.max(size.x,size.y,size.z);
 const dist=Math.max(byHeight*1.38,maxDim*1.82,5.5);
 this.previewCamera.position.set(0,0,dist);
 this.previewCamera.lookAt(0,0,0);
 this.previewCamera.near=.05;this.previewCamera.far=dist+maxDim*5;
 this.previewCamera.updateProjectionMatrix();
}
renderModel(){
 if(!this.model||!this.previewRenderer||!this.previewScene||!this.previewCamera)return;
 const w=Math.max(320,this.model.clientWidth),h=Math.max(320,this.model.clientHeight);
 this.previewRenderer.setSize(w,h,false);this.previewCamera.aspect=w/h;this.previewCamera.updateProjectionMatrix();
 if(this.previewGroup)this.previewGroup.rotation.y=THREE.MathUtils.degToRad(this.rotation);
 this.previewRenderer.render(this.previewScene,this.previewCamera);
}
startPreviewLoop(){
 if(this.previewRAF)return;
 const loop=()=>{if(!this.isOpen()){this.previewRAF=0;return;}this.renderModel();this.previewRAF=requestAnimationFrame(loop);};
 this.previewRAF=requestAnimationFrame(loop);
}
beginEquip(){if(this.busy||!this.selected)return;const item=this.selected,slot=item.slot==="shoulder"?"leftShoulder":item.slot,duration=({helmet:1600,leftShoulder:2400,chest:4200}[slot]||2400);this.busy=true;this.risk.textContent="EXPOSED // ARMOR REMOVED DURING CHANGE";this.progress.classList.add("active");this.equip.disabled=true;const start=performance.now();const tick=()=>{const p=Math.min(1,(performance.now()-start)/duration);this.progressBar.style.width=`${p*100}%`;this.progress.querySelector("span").textContent=`PHYSICAL EQUIP // ${Math.round(p*100)}%`;if(p<1){requestAnimationFrame(tick);return;}this.state.equipped[slot]=item.id;if(item.slot==="shoulder"){this.state.equipped.leftShoulder=item.id;this.state.equipped.rightShoulder=item.id;}this.player.applyArmoryItem?.(item);this.save();this.refreshPreviewClone();this.busy=false;this.equip.disabled=false;this.progress.classList.remove("active");this.progressBar.style.width="0%";this.risk.textContent="WORLD LIVE // NO PAUSE // ENEMIES CAN ENGAGE";this.toast?.(`EQUIPPED // ${item.name}`);this.render();};requestAnimationFrame(tick);}}
