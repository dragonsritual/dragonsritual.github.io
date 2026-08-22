import * as THREE from "three";

export class TitanAudioSystem{
 constructor(camera,worldRoot=null,existingListener=null){
  this.camera=camera;
  this.worldRoot=worldRoot;

  // Reuse the ONE listener already attached to the camera for TV/world media.
  // Multiple AudioListeners on the same camera/context were unnecessary and made
  // the audio graph harder to reason about.
  this.listener=existingListener||new THREE.AudioListener();
  if(!existingListener)camera.add(this.listener);

  this.ctx=this.listener.context;
  this.buffers=new Map();
  this.ready=false;
  this.raycaster=new THREE.Raycaster();
  this.blockers=[];
  this.activeVoices=new Set();
  this.maxVoices=28;
  this.voiceSerial=0;
  this.occlusionCache=new Map();

  if(worldRoot){
   worldRoot.traverse(o=>{
    if(o.isMesh&&o.userData?.blocksBullets)this.blockers.push(o);
   });
  }

  // One stable master/output graph for the entire session.
  this.master=this.ctx.createGain();
  this.master.gain.value=.78;
  this.master.connect(this.listener.getInput());

  // Reverb is a BUS, not something to instantiate per gunshot.
  this.reverbBuses={};
  const specs={
   street:[1.05,.42,.14,.40],
   indoor:[.72,.62,.08,.34],
   field:[.38,.22,.04,.18]
  };
  for(const [name,[seconds,decay,early,level]] of Object.entries(specs)){
   const input=this.ctx.createGain();
   const convolver=this.ctx.createConvolver();
   const output=this.ctx.createGain();
   convolver.buffer=this.makeIR(seconds,decay,early);
   output.gain.value=level;
   input.connect(convolver);
   convolver.connect(output);
   output.connect(this.master);
   this.reverbBuses[name]={input,convolver,output};
  }

  this.manifest={
   arShot:"./assets/audio/weapons/real_gun_sounds/08. AR 15 Shot.WAV",
   arCock:"./assets/audio/weapons/real_gun_sounds/07. AR15 Cock.WAV",
   arMag:"./assets/audio/weapons/real_gun_sounds/06. AR15 Clip.WAV",
   metalHit:"./assets/audio/weapons/real_gun_sounds/38. Metal Target Hit.WAV",
   akShot:"./assets/audio/weapons/real_gun_sounds/04. AK47 Shot.WAV"
  };

  this.ctx.addEventListener?.("statechange",()=>{
   console.info(`[TITAN AUDIO] context ${this.ctx.state} // voices ${this.activeVoices.size}`);
  });

  this.preloadPromise=this.preload();
 }

 makeIR(seconds,decay,early){
  const sr=this.ctx.sampleRate;
  const n=Math.max(1,Math.floor(sr*seconds));
  const b=this.ctx.createBuffer(2,n,sr);
  for(let ch=0;ch<2;ch++){
   const d=b.getChannelData(ch);
   for(let i=0;i<n;i++){
    const t=i/n;
    d[i]=(Math.random()*2-1)*Math.pow(1-t,decay*8)*(.16+early);
   }
  }
  return b;
 }

 async preload(){
  const jobs=Object.entries(this.manifest).map(async([k,url])=>{
   try{
    const r=await fetch(url);
    if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
    const ab=await r.arrayBuffer();
    this.buffers.set(k,await this.ctx.decodeAudioData(ab));
   }catch(e){
    console.warn("[TITAN AUDIO] load failed",k,e);
   }
  });
  await Promise.all(jobs);
  this.ready=true;
  console.info("[TITAN AUDIO] firearm bank ready",{
   buffers:this.buffers.size,
   state:this.ctx.state,
   sampleRate:this.ctx.sampleRate
  });
 }

 async prewarmCombatAudio(playerPos=null,enemyPos=null){
  // v7.4.7 FIRST-SHOT HITCH FIX:
  // Force the WebAudio device, decoded firearm buffers, filter graph, reverb
  // buses and HRTF panner path to initialize BEFORE live combat starts.
  await this.preloadPromise;
  await this.unlock();

  const warmOne=(key,position=null)=>{
   const b=this.buffers.get(key);
   if(!b)return;

   const source=this.ctx.createBufferSource();
   source.buffer=b;

   const input=this.ctx.createGain();
   input.gain.value=0; // absolutely silent warmup

   const hp=this.ctx.createBiquadFilter();
   hp.type="highpass";
   hp.frequency.value=42;

   const lp=this.ctx.createBiquadFilter();
   lp.type="lowpass";
   lp.frequency.value=19000;

   const dry=this.ctx.createGain();
   dry.gain.value=0;
   const wet=this.ctx.createGain();
   wet.gain.value=0;

   let panner=null;
   let destination=this.master;
   if(position){
    panner=this.ctx.createPanner();
    panner.panningModel="HRTF";
    panner.distanceModel="inverse";
    panner.refDistance=2.4;
    panner.maxDistance=240;
    panner.rolloffFactor=.72;
    panner.positionX.value=position.x;
    panner.positionY.value=position.y;
    panner.positionZ.value=position.z;
    panner.connect(this.master);
    destination=panner;
   }

   source.connect(input);
   input.connect(hp);
   hp.connect(lp);
   lp.connect(dry);
   dry.connect(destination);
   lp.connect(wet);
   wet.connect(this.reverbBuses.street.input);

   try{
    source.start(0,0,Math.min(.012,b.duration||.012));
    source.stop(this.ctx.currentTime+.014);
   }catch{}

   source.onended=()=>{
    for(const node of [source,input,hp,lp,dry,wet,...(panner?[panner]:[])]){
     try{node.disconnect();}catch{}
    }
   };
  };

  warmOne("arShot",playerPos);
  warmOne("akShot",enemyPos||playerPos);
  warmOne("metalHit",enemyPos||playerPos);

  // Give Chromium's audio thread one short scheduling window to finish device
  // and HRTF initialization while the boot screen is still covering gameplay.
  await new Promise(r=>setTimeout(r,55));
  console.info("[TITAN AUDIO] combat path prewarmed",{
   buffers:this.buffers.size,
   context:this.ctx.state
  });
 }

 async unlock(){
  if(this.ctx.state==="suspended"){
   try{await this.ctx.resume();}
   catch(e){console.warn("[TITAN AUDIO] resume failed",e);}
  }
 }

 environmentAt(pos){
  if(!pos)return "street";
  if(pos.x>9&&pos.x<51&&pos.z>-23&&pos.z<13)return "indoor";
  if(pos.x>135||pos.z>82)return "field";
  return "street";
 }

 isOccluded(sourcePos){
  if(!sourcePos||!this.camera)return false;

  const now=performance.now();
  const key=`${Math.round(sourcePos.x/3)},${Math.round(sourcePos.y/3)},${Math.round(sourcePos.z/3)}`;
  const cached=this.occlusionCache.get(key);
  if(cached && now-cached.time<140)return cached.value;

  const listenerPos=this.camera.getWorldPosition(new THREE.Vector3());
  const dir=sourcePos.clone().sub(listenerPos);
  const dist=dir.length();
  if(dist<.1)return false;
  dir.normalize();
  this.raycaster.set(listenerPos,dir);
  this.raycaster.far=Math.max(.01,dist-.25);

  const dynamic=this.worldRoot?.userData?.dynamicBulletMeshes||[];
  const meshes=dynamic.length?this.blockers.concat(dynamic):this.blockers;
  const value=this.raycaster.intersectObjects(meshes,false).some(h=>h.object.visible!==false);

  this.occlusionCache.set(key,{time:now,value});
  if(this.occlusionCache.size>64){
    for(const [k,v] of this.occlusionCache){
      if(now-v.time>1000)this.occlusionCache.delete(k);
    }
  }
  return value;
 }

 stopOldestVoice(){
  const oldest=this.activeVoices.values().next().value;
  if(!oldest)return;
  try{oldest.source.stop();}catch{}
  this.cleanupVoice(oldest);
 }

 cleanupVoice(voice){
  if(!voice||voice.cleaned)return;
  voice.cleaned=true;
  this.activeVoices.delete(voice);
  for(const node of voice.nodes){
   try{node.disconnect();}catch{}
  }
 }

 playBuffer(key,{position=null,volume=1,rate=1,environment=null,occlusion=true,tail=.34}={}){
  const b=this.buffers.get(key);
  if(!b)return;

  // Fire-and-forget BufferSourceNodes are cheap, but the processing graph around
  // them is explicitly cleaned on ended and globally voice-limited.
  if(this.activeVoices.size>=this.maxVoices)this.stopOldestVoice();

  this.unlock();

  const env=environment||this.environmentAt(position||this.camera.position);
  const blocked=!!(position&&occlusion&&this.isOccluded(position));

  const source=this.ctx.createBufferSource();
  source.buffer=b;
  source.playbackRate.value=rate;

  const input=this.ctx.createGain();
  input.gain.value=volume;

  const hp=this.ctx.createBiquadFilter();
  hp.type="highpass";
  hp.frequency.value=42;

  const lp=this.ctx.createBiquadFilter();
  lp.type="lowpass";
  lp.frequency.value=blocked?1250:19000;

  const dryGain=this.ctx.createGain();
  dryGain.gain.value=blocked?.48:1;

  const wetSend=this.ctx.createGain();
  const envScale=env==="street"?1:env==="indoor"?.78:.42;
  wetSend.gain.value=tail*envScale*(blocked?1.18:1);

  let panner=null;
  let dryDestination=this.master;

  if(position){
   panner=this.ctx.createPanner();
   panner.panningModel="HRTF";
   panner.distanceModel="inverse";
   panner.refDistance=2.4;
   panner.maxDistance=240;
   panner.rolloffFactor=.72;
   panner.positionX.value=position.x;
   panner.positionY.value=position.y;
   panner.positionZ.value=position.z;
   panner.connect(this.master);
   dryDestination=panner;
  }

  source.connect(input);
  input.connect(hp);
  hp.connect(lp);

  lp.connect(dryGain);
  dryGain.connect(dryDestination);

  // Shared environmental reverb bus. This was the critical stability change:
  // no new ConvolverNode for every automatic-rifle shot.
  lp.connect(wetSend);
  wetSend.connect(this.reverbBuses[env]?.input||this.reverbBuses.street.input);

  const voice={
   id:++this.voiceSerial,
   source,
   nodes:[source,input,hp,lp,dryGain,wetSend,...(panner?[panner]:[])],
   cleaned:false
  };
  this.activeVoices.add(voice);

  source.onended=()=>this.cleanupVoice(voice);

  try{
   source.start();
  }catch(e){
   this.cleanupVoice(voice);
   console.warn("[TITAN AUDIO] source start failed",key,e);
  }
 }

 playPlayerRifle(position){
  const env=this.environmentAt(position);
  this.playBuffer("arShot",{
   volume:.88,
   rate:.985+Math.random()*.025,
   environment:env,
   tail:env==="indoor"?.42:env==="street"?.48:.20,
   occlusion:false
  });
 }

 playEnemyRifle(position,distance=20){
  const env=this.environmentAt(position);
  this.playBuffer("akShot",{
   position,
   volume:.88,
   rate:.97+Math.random()*.045,
   environment:env,
   tail:env==="field"?.18:.40
  });
 }

 playMetalImpact(position){
  this.playBuffer("metalHit",{position,volume:.34,rate:.93+Math.random()*.12,tail:.12});
 }

 playReload(){
  this.playBuffer("arMag",{volume:.34,rate:.99+Math.random()*.02,tail:.05,occlusion:false});
 }

 playCock(){
  this.playBuffer("arCock",{volume:.30,rate:1,tail:.04,occlusion:false});
 }

 getDiagnostics(){
  return{
   contextState:this.ctx.state,
   activeVoices:this.activeVoices.size,
   maxVoices:this.maxVoices,
   loadedBuffers:this.buffers.size,
   ready:this.ready
  };
 }
}
