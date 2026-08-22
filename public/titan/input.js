export class Input{
constructor(){
 this.moveX=0;
 this.moveY=0;
 this.lookX=0;
 this.lookY=0;

 this.fire=false;
 this.fireHeld=false;
 this.firePressed=false;

 this.reload=false;
 this.sprint=false;
 this.peek=false;
 this.aimHeld=false;
 this.rmbHeld=false;

 this.keys={};
 this.gamepadIndex=null;

 this.touchMove=false;
 this.touchSprint=false;
 this.touchFire=false;
 this.touchAim=false;
 this.touchInspect=false;
 this.touchInteract=false;
 this.interactPressed=false;
 this.meleePressed=false;
 this.uiCaptured=false;

 // v5.3 — short safety gate used when UI hands control back to the world.
 // This prevents the same mouse click that closes/re-focuses a menu from
 // also becoming a weapon trigger.
 this.combatSuppressedUntil=0;

 window.addEventListener("keydown",e=>{
   this.keys[e.code]=true;
   // v7.4.9 — dedicated quiet breach/melee input. X is deliberate and does
   // not conflict with reload, interact, flashlight, visor, or cover.
   if(e.code==="KeyX" && !e.repeat)this.meleePressed=true;
 });

 window.addEventListener("keyup",e=>{
   this.keys[e.code]=false;
 });

 window.addEventListener("mousedown",e=>{
   if(performance.now()<this.combatSuppressedUntil){
     this.fire=false;
     this.fireHeld=false;
     this.firePressed=false;
     this.aimHeld=false;
     this.rmbHeld=false;
     return;
   }
   const interactive=e.target?.closest?.(
     ".armor-tech-menu,.media-remote,.collection-overlay,.armory-overlay,.poster-preview,button,input,select,textarea"
   );
   if(this.uiCaptured || interactive){
     if(e.button===0){
       this.fireHeld=false;
       this.firePressed=false;
     }
     if(e.button===2){
       this.rmbHeld=false;
       this.aimHeld=false;
     }
     return;
   }

   if(e.button===0){
     this.fireHeld=true;
     this.firePressed=true;
   }

   if(e.button===2){
     this.rmbHeld=true;
     this.aimHeld=true;
   }

   // Middle mouse mirrors X for fast close-combat access.
   if(e.button===1){
     this.meleePressed=true;
   }
 });

 window.addEventListener("mouseup",e=>{
   if(e.button===0){
     this.fireHeld=false;
   }

   if(e.button===2){
     this.rmbHeld=false;
     this.aimHeld=false;
   }
 });

 // Prevent browser context menu from stealing RMB.
 window.addEventListener("contextmenu",e=>{
   e.preventDefault();
 });

 window.addEventListener("blur",()=>{
   this.reset();
 });

 window.addEventListener("gamepadconnected",e=>{
   this.gamepadIndex=e.gamepad.index;
 });

 window.addEventListener("gamepaddisconnected",e=>{
   if(this.gamepadIndex===e.gamepad.index){
     this.gamepadIndex=null;
   }
 });

 this.bindTouch();
}

setUiCaptured(active){
 this.uiCaptured=!!active;
 if(this.uiCaptured){
   this.fire=false;
   this.fireHeld=false;
   this.firePressed=false;
   this.aimHeld=false;
   this.rmbHeld=false;
   this.touchFire=false;
   this.touchAim=false;
 }
}


suppressCombatInput(ms=320){
 this.combatSuppressedUntil=Math.max(
   this.combatSuppressedUntil,
   performance.now()+Math.max(0,ms)
 );
 this.fire=false;
 this.fireHeld=false;
 this.firePressed=false;
 this.aimHeld=false;
 this.rmbHeld=false;
 this.touchFire=false;
 this.touchAim=false;
}

clearCombatInputSuppression(){
 this.combatSuppressedUntil=0;
 this.fire=false;
 this.fireHeld=false;
 this.firePressed=false;
 this.aimHeld=false;
 this.rmbHeld=false;
 this.touchFire=false;
 this.touchAim=false;
}

reset(){
 this.keys={};

 this.moveX=0;
 this.moveY=0;
 this.lookX=0;
 this.lookY=0;

 this.fire=false;
 this.fireHeld=false;
 this.firePressed=false;

 this.reload=false;
 this.sprint=false;
 this.peek=false;
 this.aimHeld=false;
 this.rmbHeld=false;

 this.touchMove=false;
 this.touchSprint=false;
 this.touchFire=false;
 this.touchAim=false;
 this.touchInspect=false;
 this.touchInteract=false;
 this.interactPressed=false;
 this.meleePressed=false;
}

bindTouch(){
 const pad=document.getElementById("movePad");
 const stick=document.getElementById("moveStick");
 const look=document.getElementById("lookZone");
 const aimButton=document.getElementById("aimButton");
 const viewButton=document.getElementById("viewButton");
 const interactButton=document.getElementById("interactButton");

 let moveId=null;
 let lookId=null;
 let lastX=0;
 let lastY=0;

 const move=e=>{
   const r=pad.getBoundingClientRect();

   let dx=e.clientX-(r.left+r.width/2);
   let dy=e.clientY-(r.top+r.height/2);

   const max=42;
   const len=Math.hypot(dx,dy)||1;

   if(len>max){
     dx=dx/len*max;
     dy=dy/len*max;
   }

   this.moveX=dx/max;
   this.moveY=-dy/max;
   this.touchMove=true;

   if(stick){
     stick.style.transform=
       `translate(${dx}px,${dy}px)`;
   }
 };

 pad?.addEventListener("pointerdown",e=>{
   moveId=e.pointerId;
   pad.setPointerCapture(moveId);
   move(e);
 });

 pad?.addEventListener("pointermove",e=>{
   if(e.pointerId===moveId){
     move(e);
   }
 });

 const endMove=e=>{
   if(e.pointerId!==moveId)return;

   moveId=null;
   this.touchMove=false;
   this.moveX=0;
   this.moveY=0;

   if(stick){
     stick.style.transform="translate(0,0)";
   }
 };

 pad?.addEventListener("pointerup",endMove);
 pad?.addEventListener("pointercancel",endMove);

 look?.addEventListener("pointerdown",e=>{
   lookId=e.pointerId;
   lastX=e.clientX;
   lastY=e.clientY;
   look.setPointerCapture(lookId);
 });

 look?.addEventListener("pointermove",e=>{
   if(e.pointerId!==lookId)return;

   const scale=Math.max(.82,Math.min(1.15,window.innerWidth/430));
   this.lookX+=(e.clientX-lastX)*.00315*scale;
   // Mobile vertical look: drag UP to look UP, drag DOWN to look DOWN.
   // Previous sign made touch Y feel inverted.
   this.lookY-=(e.clientY-lastY)*.00285*scale;

   lastX=e.clientX;
   lastY=e.clientY;
 });

 const endLook=e=>{
   if(e.pointerId===lookId){
     lookId=null;
   }
 };
 look?.addEventListener("pointerup",endLook);
 look?.addEventListener("pointercancel",endLook);

 const fireButton=
   document.getElementById("fireButton");

 fireButton?.addEventListener("pointerdown",()=>{
   this.touchFire=true;
 });

 fireButton?.addEventListener("pointerup",()=>{
   this.touchFire=false;
 });

 fireButton?.addEventListener("pointercancel",()=>{
   this.touchFire=false;
 });

 // Hold AIM for shoulder/precision camera.
 aimButton?.addEventListener("pointerdown",e=>{
   e.preventDefault();
   this.touchAim=true;
   aimButton.setPointerCapture?.(e.pointerId);
 });
 const endAim=()=>{
   this.touchAim=false;
 };
 aimButton?.addEventListener("pointerup",endAim);
 aimButton?.addEventListener("pointercancel",endAim);

 // Hold VIEW, then drag the look side to orbit around the character.
 // Releasing VIEW returns the camera to combat position.
 viewButton?.addEventListener("pointerdown",e=>{
   e.preventDefault();
   this.touchInspect=true;
   viewButton.setPointerCapture?.(e.pointerId);
 });
 const endView=()=>{
   this.touchInspect=false;
 };
 viewButton?.addEventListener("pointerup",endView);
 viewButton?.addEventListener("pointercancel",endView);

 // E / USE is a tap action. The game consumes interactPressed for one frame.
 interactButton?.addEventListener("pointerdown",e=>{
   e.preventDefault();
   this.touchInteract=true;
   this.interactPressed=true;
   this.keys.KeyE=true;
 });
 const endInteract=()=>{
   this.touchInteract=false;
   this.keys.KeyE=false;
 };
 interactButton?.addEventListener("pointerup",endInteract);
 interactButton?.addEventListener("pointercancel",endInteract);

 document
   .getElementById("reloadButton")
   ?.addEventListener("pointerdown",()=>{
     this.reload=true;
   });

 const sprintButton=
   document.getElementById("sprintButton");

 sprintButton?.addEventListener("pointerdown",()=>{
   this.touchSprint=true;
 });

 sprintButton?.addEventListener("pointerup",()=>{
   this.touchSprint=false;
 });

 sprintButton?.addEventListener("pointercancel",()=>{
   this.touchSprint=false;
 });
}

update(){
 let mx=0;
 let my=0;

 if(this.keys.KeyA)mx-=1;
 if(this.keys.KeyD)mx+=1;
 if(this.keys.KeyW)my+=1;
 if(this.keys.KeyS)my-=1;

 if(mx||my){
   this.moveX=mx;
   this.moveY=my;
 }else if(!this.touchMove){
   this.moveX=0;
   this.moveY=0;
 }

 this.fire=
   this.fireHeld ||
   !!this.keys.Space ||
   this.touchFire;

 this.peek=
   !!this.keys.ShiftLeft ||
   !!this.keys.ShiftRight ||
   this.touchInspect;

 this.aimHeld=
   this.aimHeld ||
   this.touchAim;

 this.sprint=
   (!!this.keys.ShiftLeft || !!this.keys.ShiftRight) ||
   this.touchSprint;

 if(this.keys.KeyR){
   this.reload=true;
 }

 const pads=
   navigator.getGamepads?.() || [];

 const gp=
   this.gamepadIndex!==null
   ?pads[this.gamepadIndex]
   :pads.find(Boolean);

 if(gp){
   const dead=v=>Math.abs(v)<.14?0:v;

   const gx=dead(gp.axes[0]||0);
   const gy=dead(gp.axes[1]||0);
   const rx=dead(gp.axes[2]||0);
   const ry=dead(gp.axes[3]||0);

   if(gx||gy){
     this.moveX=gx;
     this.moveY=-gy;
   }

   this.lookX+=rx*.045;
   this.lookY+=ry*.034;

   this.fire=
     this.fire ||
     !!gp.buttons[7]?.pressed;

   // LT = aim for controller foundation.
   this.aimHeld=
     this.aimHeld ||
     !!gp.buttons[6]?.pressed;

   this.sprint=
     this.sprint ||
     !!gp.buttons[10]?.pressed;

   if(gp.buttons[2]?.pressed){
     this.reload=true;
   }
 }
}

endFrame(){
 this.lookX=0;
 this.lookY=0;
 this.reload=false;
 this.firePressed=false;
 this.interactPressed=false;
 this.meleePressed=false;
}
}
