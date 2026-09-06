import * as THREE from "three";

// PROJECT TITAN browser compatibility layer for in-world media screens.
// Media is optional: a missing MP4 must never stop the combat simulation from booting.
export class WorldVideoScreen {
  constructor(parent,{id="world_video",src="",position=[0,0,0],rotation=[0,0,0],size=[4,2.25],audioListener=null,activationRadius=30}={}){
    this.id=id;
    this.src=src;
    this.channel=1;
    this.volume=.45;
    this.bass=false;
    this.powered=true;
    this.activationRadius=activationRadius;

    this.group=new THREE.Group();
    this.group.name=id;
    this.group.position.set(...position);
    this.group.rotation.set(...rotation);
    parent.add(this.group);

    const frame=new THREE.Mesh(
      new THREE.BoxGeometry(size[0]+.22,size[1]+.22,.12),
      new THREE.MeshStandardMaterial({color:0x07090b,metalness:.65,roughness:.3})
    );
    frame.position.z=-.07;
    this.group.add(frame);

    this.video=document.createElement("video");
    this.video.src=src;
    this.video.loop=true;
    this.video.muted=false;
    this.video.volume=this.volume;
    this.video.playsInline=true;
    this.video.preload="metadata";
    this.video.crossOrigin="anonymous";

    const c=document.createElement("canvas");
    c.width=640;c.height=360;
    const x=c.getContext("2d");
    x.fillStyle="#07090b";x.fillRect(0,0,c.width,c.height);
    x.strokeStyle="#384047";x.lineWidth=5;x.strokeRect(3,3,c.width-6,c.height-6);
    x.fillStyle="#d6b864";x.font="700 25px Arial";x.fillText("VOIDROOM // MEDIA",34,58);
    x.fillStyle="#8d989f";x.font="18px Arial";x.fillText("NO SIGNAL",34,100);
    this.fallbackTexture=new THREE.CanvasTexture(c);
    this.videoTexture=new THREE.VideoTexture(this.video);
    this.videoTexture.colorSpace=THREE.SRGBColorSpace;
    this.material=new THREE.MeshBasicMaterial({map:this.fallbackTexture,side:THREE.DoubleSide,toneMapped:false});
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),this.material);
    this.mesh.position.z=.01;
    this.mesh.userData.worldVideoScreen=this;
    this.group.add(this.mesh);

    this.video.addEventListener("loadeddata",()=>{
      this.material.map=this.videoTexture;
      this.material.needsUpdate=true;
    },{once:true});
    this.video.addEventListener("error",()=>{
      console.info(`PROJECT TITAN optional media unavailable: ${src}`);
    },{once:true});
    this.video.load();
  }

  update(playerPosition){
    if(!playerPosition||!this.powered)return;
    const d=this.group.getWorldPosition(new THREE.Vector3()).distanceTo(playerPosition);
    if(d<=this.activationRadius && this.video.paused) this.video.play().catch(()=>{});
    else if(d>this.activationRadius*1.35 && !this.video.paused) this.video.pause();
  }

  getStatus(){
    return {
      channel:this.channel,
      volume:this.volume,
      time:Number.isFinite(this.video.currentTime)?this.video.currentTime:0,
      duration:Number.isFinite(this.video.duration)?this.video.duration:0,
      powered:this.powered,
      bass:this.bass,
      paused:this.video.paused
    };
  }
  async nextChannel(){ return false; }
  async previousChannel(){ return false; }
  seek(seconds){
    if(!Number.isFinite(this.video.duration)||this.video.duration<=0)return false;
    this.video.currentTime=Math.max(0,Math.min(this.video.duration,this.video.currentTime+seconds));
    return true;
  }
  togglePlay(){
    if(!this.powered)return;
    if(this.video.paused)this.video.play().catch(()=>{});else this.video.pause();
  }
  setVolume(v){
    this.volume=THREE.MathUtils.clamp(Number(v)||0,0,1);
    this.video.volume=this.volume;
  }
  toggleBass(){ this.bass=!this.bass; }
  togglePower(){
    this.powered=!this.powered;
    this.mesh.visible=this.powered;
    if(!this.powered)this.video.pause();
  }
  dispose(){
    try{this.video.pause();this.video.removeAttribute("src");this.video.load();}catch{}
    this.videoTexture?.dispose?.();this.fallbackTexture?.dispose?.();
    this.mesh?.geometry?.dispose?.();this.material?.dispose?.();
    this.group?.traverse?.(o=>{if(o.isMesh&&o!==this.mesh){o.geometry?.dispose?.();o.material?.dispose?.();}});
    this.group?.removeFromParent?.();
  }
}
