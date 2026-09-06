import * as THREE from "three";

/*
 PROJECT TITAN v7.2 — PRESTIGE RAIN / PERFORMANCE
 Design goals:
 - dense world rain without thousands of draw calls
 - near/mid/far precipitation layers
 - fast camera-relative rain volume
 - visor droplets that IMPACT, splash, merge, streak, bead and clear over time
 - zero DOM-per-drop work
 - no radial-gradient allocation inside the hot render loop
*/

export class TitanLivingWeather{
 constructor({scene,camera,player,sandbox,input,mediaScreens=[],toast=()=>{}}){
  this.scene=scene;this.camera=camera;this.player=player;this.sandbox=sandbox;this.input=input;
  this.mediaScreens=mediaScreens;this.toast=toast;

  this.time=0;
  this.intensity=0;
  this.target=0;
  this.weatherClock=28+Math.random()*28;
  this.visorWetness=0;
  this.lastWetToast=false;
  this.gunshotPulse=0;
  this.meleePulse=0;

  // ---------------- WORLD RAIN ----------------
  // One geometry, one draw call. Dense because point count is cheap relative to
  // individual mesh droplets. The volume follows the camera/player.
  this.dropCount=2400;
  this.positions=new Float32Array(this.dropCount*3);
  this.velocity=new Float32Array(this.dropCount);
  this.depthBand=new Uint8Array(this.dropCount);

  for(let i=0;i<this.dropCount;i++)this.resetWorldDrop(i,true);

  this.dropGeo=new THREE.BufferGeometry();
  const posAttr=new THREE.BufferAttribute(this.positions,3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  this.dropGeo.setAttribute("position",posAttr);

  this.rainMaterial=new THREE.PointsMaterial({
    color:0xc7dce4,
    size:.047,
    transparent:true,
    opacity:0,
    depthWrite:false,
    sizeAttenuation:true
  });

  this.rain=new THREE.Points(this.dropGeo,this.rainMaterial);
  this.rain.frustumCulled=false;
  this.rain.renderOrder=40;
  scene.add(this.rain);

  // Thin streak layer uses one LineSegments geometry / one draw call.
  this.streakCount=620;
  this.streakPositions=new Float32Array(this.streakCount*6);
  this.streakGeo=new THREE.BufferGeometry();
  const streakAttr=new THREE.BufferAttribute(this.streakPositions,3);
  streakAttr.setUsage(THREE.DynamicDrawUsage);
  this.streakGeo.setAttribute("position",streakAttr);
  this.streakMaterial=new THREE.LineBasicMaterial({
    color:0xcfe6ee,
    transparent:true,
    opacity:0,
    depthWrite:false
  });
  this.streaks=new THREE.LineSegments(this.streakGeo,this.streakMaterial);
  this.streaks.frustumCulled=false;
  this.streaks.renderOrder=41;
  scene.add(this.streaks);

  // ---------------- VISOR ----------------
  // Render at moderate internal resolution and let CSS scale it. This is visually
  // smoother than DOM drops and much cheaper than a full-window high-DPI canvas.
  this.canvas=document.createElement("canvas");
  this.canvas.width=720;
  this.canvas.height=405;
  Object.assign(this.canvas.style,{
    position:"fixed",inset:"0",width:"100%",height:"100%",
    pointerEvents:"none",zIndex:"37"
  });
  this.canvas.id="titanRainVisor";
  document.body.appendChild(this.canvas);
  this.ctx=this.canvas.getContext("2d",{alpha:true,desynchronized:true});

  // Pre-render bead/splash sprites once. Reusing images is much cheaper than creating
  // gradients for every drop every frame.
  this.beadSprite=this.makeBeadSprite(48);
  this.splashSprite=this.makeSplashSprite(64);

  this.visorDrops=[];
  this.splashes=[];
  this.impactAccumulator=0;
  this.maxVisorDrops=110;
  this.maxSplashes=22;
 }

 resetWorldDrop(i,initial=false){
  const band=Math.random()<.50?0:(Math.random()<.76?1:2); // near/mid/far
  this.depthBand[i]=band;
  const radius=band===0?18:(band===1?34:56);
  const height=band===0?18:(band===1?28:38);
  const o=i*3;
  this.positions[o]=(Math.random()-.5)*radius*2;
  this.positions[o+1]=initial?Math.random()*height:(height+Math.random()*8);
  this.positions[o+2]=(Math.random()-.5)*radius*2;
  this.velocity[i]=(band===0?30:(band===1?39:47))*(.78+Math.random()*.42);
 }

 makeBeadSprite(size){
  const c=document.createElement("canvas");c.width=c.height=size;
  const x=c.getContext("2d");
  const g=x.createRadialGradient(size*.40,size*.32,size*.04,size*.5,size*.52,size*.45);
  g.addColorStop(0,"rgba(255,255,255,.62)");
  g.addColorStop(.16,"rgba(215,238,246,.30)");
  g.addColorStop(.48,"rgba(102,145,160,.17)");
  g.addColorStop(.82,"rgba(22,45,54,.10)");
  g.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=g;x.beginPath();x.ellipse(size*.5,size*.53,size*.34,size*.43,0,0,Math.PI*2);x.fill();
  x.strokeStyle="rgba(225,245,250,.22)";x.lineWidth=1;
  x.beginPath();x.ellipse(size*.5,size*.53,size*.28,size*.36,0,0,Math.PI*2);x.stroke();
  return c;
 }

 makeSplashSprite(size){
  const c=document.createElement("canvas");c.width=c.height=size;
  const x=c.getContext("2d");
  x.translate(size/2,size/2);
  x.strokeStyle="rgba(220,242,250,.48)";
  x.lineCap="round";
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2+Math.random()*.18;
    const inner=size*(.08+Math.random()*.035);
    const outer=size*(.22+Math.random()*.15);
    x.lineWidth=.7+Math.random()*1.5;
    x.beginPath();x.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);
    x.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);x.stroke();
  }
  x.fillStyle="rgba(210,237,246,.23)";
  x.beginPath();x.arc(0,0,size*.11,0,Math.PI*2);x.fill();
  return c;
 }

 noteGunshot(){this.gunshotPulse=1;}
 noteMelee(){this.meleePulse=1;}

 getVoidroomMasking(){
  const screen=this.mediaScreens?.[0];
  if(!screen?.powered || screen?.video?.paused)return 0;
  const d=this.player.group.position.distanceTo(screen.group.getWorldPosition(new THREE.Vector3()));
  const near=1-THREE.MathUtils.clamp((d-4)/34,0,1);
  return THREE.MathUtils.clamp(near*(screen.volume??.9)*.78,0,.78);
 }

 sensory(){
  return {
    rainIntensity:this.intensity,
    voidroomMasking:this.getVoidroomMasking(),
    playerGunshot:this.gunshotPulse>.15,
    playerMelee:this.meleePulse>.15
  };
 }

 spawnVisorImpact(){
  if(this.visorDrops.length>=this.maxVisorDrops)return;
  const x=.08+Math.random()*.84;
  const y=.02+Math.random()*.58;
  const r=2.6+Math.random()*7.8;
  const d={
    x,y,r,
    vy:.005+Math.random()*.023,
    vx:(Math.random()-.5)*.0015,
    mass:r*r,
    age:0,
    wobble:Math.random()*Math.PI*2,
    moving:Math.random()<.42
  };
  this.visorDrops.push(d);

  if(this.splashes.length<this.maxSplashes){
    this.splashes.push({
      x,y,
      scale:.45+Math.random()*.95,
      age:0,
      life:.09+Math.random()*.12
    });
  }
 }

 mergeVisorDrops(){
  // Small bounded O(n^2) pass, only every few frames and only <=110 drops.
  for(let i=0;i<this.visorDrops.length;i++){
    const a=this.visorDrops[i];
    for(let j=i+1;j<this.visorDrops.length;j++){
      const b=this.visorDrops[j];
      const dx=a.x-b.x,dy=a.y-b.y;
      const rr=(a.r+b.r)/this.canvas.width*.72;
      if(dx*dx+dy*dy<rr*rr){
        const total=a.mass+b.mass;
        a.x=(a.x*a.mass+b.x*b.mass)/total;
        a.y=(a.y*a.mass+b.y*b.mass)/total;
        a.mass=total;
        a.r=Math.min(15,Math.sqrt(total));
        a.vy=Math.max(a.vy,b.vy)*1.08;
        this.visorDrops.splice(j,1);j--;
      }
    }
  }
 }

 update(dt){
  this.time+=dt;
  this.weatherClock-=dt;

  if(this.weatherClock<=0){
    this.target=this.target>.1?0:(.48+Math.random()*.52);
    this.weatherClock=this.target>0?85+Math.random()*125:55+Math.random()*100;
    this.toast(this.target>0?"WEATHER FRONT // RAIN MOVING IN":"WEATHER // RAIN BREAKING");
  }

  this.intensity=THREE.MathUtils.damp(
    this.intensity,this.target,this.target>this.intensity?.12:.055,dt
  );

  this.gunshotPulse=Math.max(0,this.gunshotPulse-dt*2.6);
  this.meleePulse=Math.max(0,this.meleePulse-dt*3.2);

  // Camera-relative dense rain field.
  this.rain.position.set(this.player.group.position.x,0,this.player.group.position.z);
  this.streaks.position.copy(this.rain.position);

  const windX=-3.6-this.intensity*4.2;
  const p=this.positions;
  for(let i=0;i<this.dropCount;i++){
    const o=i*3;
    p[o]+=windX*dt;
    p[o+1]-=this.velocity[i]*dt;

    const band=this.depthBand[i];
    const radius=band===0?18:(band===1?34:56);

    if(p[o+1]<0 || Math.abs(p[o])>radius || Math.abs(p[o+2])>radius){
      this.resetWorldDrop(i,false);
    }
  }
  this.dropGeo.attributes.position.needsUpdate=true;

  // Derive a lower-count streak representation from the first N drops.
  for(let i=0;i<this.streakCount;i++){
    const po=(i%this.dropCount)*3;
    const so=i*6;
    const x=p[po],y=p[po+1],z=p[po+2];
    const len=.38+this.intensity*1.05+(this.depthBand[i%this.dropCount]===0?.65:0);
    this.streakPositions[so]=x;
    this.streakPositions[so+1]=y;
    this.streakPositions[so+2]=z;
    this.streakPositions[so+3]=x+windX*.012;
    this.streakPositions[so+4]=y-len;
    this.streakPositions[so+5]=z;
  }
  this.streakGeo.attributes.position.needsUpdate=true;

  this.rainMaterial.opacity=this.intensity*.42;
  this.streakMaterial.opacity=this.intensity*.42;

  // Visor state.
  const helmetClosed=!this.player.visorRaised && this.player.helmet?.visible!==false;

  if(helmetClosed && this.intensity>.035){
    this.visorWetness=THREE.MathUtils.clamp(this.visorWetness+dt*this.intensity*.012,0,1);
    this.impactAccumulator+=dt*(3+this.intensity*27);
    while(this.impactAccumulator>=1){
      this.spawnVisorImpact();
      this.impactAccumulator-=1;
    }
  }else{
    this.visorWetness=Math.max(0,this.visorWetness-dt*(this.player.visorRaised?.16:.018));
  }

  // Drop physics: gravity/shear makes beads grow then run.
  for(let i=this.visorDrops.length-1;i>=0;i--){
    const d=this.visorDrops[i];
    d.age+=dt;d.wobble+=dt*(1.1+d.r*.08);
    if(d.r>5.5 || this.visorWetness>.58)d.moving=true;
    if(d.moving){
      d.vy+=dt*(.012+d.r*.0017);
      d.y+=d.vy*dt*(.65+this.visorWetness*1.8);
      d.x+=Math.sin(d.wobble)*dt*.0009+d.vx;
    }
    // Wind/head-motion bias gives streaks some life.
    d.x-=dt*this.intensity*.0007;
    if(d.y>1.10 || d.x<-.08 || d.x>1.08){
      this.visorDrops.splice(i,1);
    }
  }

  if((Math.floor(this.time*12)%4)===0 && this.visorDrops.length>1)this.mergeVisorDrops();

  for(let i=this.splashes.length-1;i>=0;i--){
    const s=this.splashes[i];s.age+=dt;
    if(s.age>s.life)this.splashes.splice(i,1);
  }

  if(this.visorWetness>.72&&!this.lastWetToast){
    this.lastWetToast=true;
    this.toast("VISOR WATER LOAD HIGH // G RAISES VISOR");
  }
  if(this.visorWetness<.35)this.lastWetToast=false;

  this.drawVisor(helmetClosed);
 }

 drawVisor(helmetClosed){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height;
  c.clearRect(0,0,w,h);
  if(!helmetClosed || this.intensity<.02 || this.visorWetness<.004)return;

  // Beads.
  for(const d of this.visorDrops){
    const x=d.x*w,y=d.y*h;
    const rw=d.r*2.2,rh=d.r*2.75;

    if(d.moving && d.vy>.012){
      c.globalAlpha=.10+this.visorWetness*.10;
      c.strokeStyle="rgba(190,220,230,.38)";
      c.lineWidth=Math.max(1,d.r*.34);
      c.beginPath();
      c.moveTo(x,y-rh*.4);
      c.lineTo(x-2.2,y-Math.min(54,12+d.vy*820));
      c.stroke();
    }

    c.globalAlpha=.36+Math.min(.42,this.visorWetness*.45);
    c.drawImage(this.beadSprite,x-rw,y-rh,rw*2,rh*2);
  }

  // Fresh impact splashes.
  for(const s of this.splashes){
    const a=1-s.age/s.life;
    const size=(25+55*s.scale)*(1+(1-a)*.4);
    c.globalAlpha=a*.76;
    c.drawImage(this.splashSprite,s.x*w-size/2,s.y*h-size/2,size,size);
  }

  // Heavy accumulation becomes a thin sheeting layer instead of simply darkening the screen.
  if(this.visorWetness>.58){
    const a=(this.visorWetness-.58)/.42;
    c.globalAlpha=a*.13;
    c.fillStyle="rgba(150,185,195,.42)";
    c.fillRect(0,0,w,h);

    // Uneven vertical runoff bands.
    c.globalAlpha=a*.09;
    c.fillStyle="rgba(210,232,238,.28)";
    for(let i=0;i<9;i++){
      const x=((i*.137+this.time*.003)%1)*w;
      const ww=7+(i%3)*5;
      c.fillRect(x,0,ww,h*(.35+((i*17)%37)/60));
    }
  }

  c.globalAlpha=1;
 }
}
