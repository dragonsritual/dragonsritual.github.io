import * as THREE from "three";

// DRAGON CLOTH v0.1
// Lightweight local-space Verlet cloth for hero equipment.
// The top edge is pinned to the Titan's shoulders; the rest reacts to gravity,
// acceleration, turning, strafing, recoil and a small ambient wind field.
export class DragonCape{
 constructor(root,{width=1.34,height=1.72,cols=11,rows=15}={}){
  this.root=root;
  this.cols=cols;
  this.rows=rows;
  this.width=width;
  this.height=height;
  this.time=Math.random()*50;
  this.normalFrame=0;
  this.prevRootWorld=new THREE.Vector3();
  this.prevVelocity=new THREE.Vector3();
  this.velocity=new THREE.Vector3();
  this.acceleration=new THREE.Vector3();
  // v7.5.2 allocation-free cloth scratch vectors. The old cape created hundreds
  // of temporary Vector3 objects every frame, producing avoidable GC pressure.
  this._world=new THREE.Vector3();
  this._measured=new THREE.Vector3();
  this._invRoot=new THREE.Quaternion();
  this._localAccel=new THREE.Vector3();
  this._localVel=new THREE.Vector3();

  this.group=new THREE.Group();
  this.group.name="dragonCapeRig";
  this.group.position.set(0,2.16,.37);
  root.add(this.group);

  const texCanvas=document.createElement("canvas");
  texCanvas.width=128; texCanvas.height=128;
  const c=texCanvas.getContext("2d");
  c.fillStyle="#111516"; c.fillRect(0,0,128,128);
  // visible military cotton/ripstop weave
  for(let y=0;y<128;y+=4){
   c.fillStyle=(y%8===0)?"rgba(170,175,168,.10)":"rgba(0,0,0,.13)";
   c.fillRect(0,y,128,1);
  }
  for(let x=0;x<128;x+=4){
   c.fillStyle=(x%8===0)?"rgba(170,175,168,.08)":"rgba(0,0,0,.10)";
   c.fillRect(x,0,1,128);
  }
  c.strokeStyle="rgba(190,195,185,.12)";
  c.setLineDash([3,3]);
  for(let y=8;y<128;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(128,y);c.stroke();}
  this.texture=new THREE.CanvasTexture(texCanvas);
  this.texture.wrapS=this.texture.wrapT=THREE.RepeatWrapping;
  this.texture.repeat.set(2.2,3.0);
  this.texture.colorSpace=THREE.SRGBColorSpace;

  this.material=new THREE.MeshStandardMaterial({
   color:0x202526,
   map:this.texture,
   roughness:.98,
   metalness:0,
   side:THREE.DoubleSide
  });

  const positions=[];
  const uvs=[];
  const indices=[];
  this.points=[];
  this.prev=[];

  for(let y=0;y<rows;y++){
   const v=y/(rows-1);
   // slight taper toward the bottom, broad heroic shoulder line
   const rowWidth=width*(1-v*.13);
   for(let x=0;x<cols;x++){
    const u=x/(cols-1);
    const px=(u-.5)*rowWidth;
    const py=-v*height;
    const pz=.03 + Math.sin(u*Math.PI)*.035;
    positions.push(px,py,pz);
    uvs.push(u,1-v);
    const p=new THREE.Vector3(px,py,pz);
    this.points.push(p);
    this.prev.push(p.clone());
   }
  }

  for(let y=0;y<rows-1;y++){
   for(let x=0;x<cols-1;x++){
    const a=y*cols+x,b=a+1,c0=a+cols,d=c0+1;
    indices.push(a,c0,b,b,c0,d);
   }
  }

  this.geometry=new THREE.BufferGeometry();
  this.geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  this.geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  this.geometry.setIndex(indices);
  this.geometry.computeVertexNormals();

  this.mesh=new THREE.Mesh(this.geometry,this.material);
  this.mesh.name="dragonCapeMesh";
  this.mesh.castShadow=true;
  this.mesh.receiveShadow=true;
  this.group.add(this.mesh);

  // shoulder clasps make the attachment visually intentional
  const claspMat=new THREE.MeshStandardMaterial({color:0x343b3d,metalness:.78,roughness:.3});
  for(const x of [-width*.43,width*.43]){
   const clasp=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.055,12),claspMat);
   clasp.rotation.x=Math.PI/2;
   clasp.position.set(x,0,-.015);
   clasp.castShadow=true;
   this.group.add(clasp);
  }

  root.updateMatrixWorld(true);
  root.getWorldPosition(this.prevRootWorld);
 }

 idx(x,y){return y*this.cols+x;}

 satisfy(a,b,rest,stiffness=1){
  const pa=this.points[a],pb=this.points[b];
  const dx=pb.x-pa.x,dy=pb.y-pa.y,dz=pb.z-pa.z;
  const len=Math.hypot(dx,dy,dz);
  if(len<1e-5)return;
  const k=((len-rest)/len)*.5*stiffness;
  const cx=dx*k,cy=dy*k,cz=dz*k;
  const aPinned=a<this.cols,bPinned=b<this.cols;
  if(!aPinned){pa.x+=cx;pa.y+=cy;pa.z+=cz;}
  if(!bPinned){pb.x-=cx;pb.y-=cy;pb.z-=cz;}
 }


 getBackSurfaceDepth(){
  // Return the outermost simulated upper-cape depth in PLAYER local space.
  // Back-mounted equipment uses this as its physical resting surface.
  let maxZ=.03;

  const maxRow=Math.min(7,this.rows-1);
  for(let y=1;y<=maxRow;y++){
   for(let x=1;x<this.cols-1;x++){
    const p=this.points[this.idx(x,y)];
    if(p.z>maxZ)maxZ=p.z;
   }
  }

  return this.group.position.z+maxZ;
 }


 update(dt,externalVelocity=null,shotPulse=0,turnInput=0){
  dt=Math.min(dt,.033);
  this.time+=dt;

  const world=this._world;
  this.root.getWorldPosition(world);
  const measured=this._measured.copy(world).sub(this.prevRootWorld).divideScalar(Math.max(dt,.001));
  this.prevRootWorld.copy(world);
  const targetVel=externalVelocity||measured;
  this.velocity.lerp(targetVel,1-Math.exp(-9*dt));
  this.acceleration.copy(this.velocity).sub(this.prevVelocity).divideScalar(Math.max(dt,.001));
  this.prevVelocity.copy(this.velocity);

  const invRoot=this.root.getWorldQuaternion(this._invRoot).invert();
  const localAccel=this._localAccel.copy(this.acceleration).applyQuaternion(invRoot);
  const localVel=this._localVel.copy(this.velocity).applyQuaternion(invRoot);

  const posAttr=this.geometry.attributes.position;
  const dt2=dt*dt;
  const wind=Math.sin(this.time*.83)*.7+Math.sin(this.time*1.71)*.25;

  // Verlet integration. Top row is pinned.
  for(let y=1;y<this.rows;y++){
   const v=y/(this.rows-1);
   for(let x=0;x<this.cols;x++){
    const i=this.idx(x,y);
    const p=this.points[i],old=this.prev[i];
    const vx=(p.x-old.x)*.982;
    const vy=(p.y-old.y)*.982;
    const vz=(p.z-old.z)*.982;
    old.copy(p);

    // Directional cloth response: movement creates drag opposite acceleration and
    // velocity, while speed makes the lower cape trail behind the body. Strafing
    // now produces a readable sideways sweep instead of only vertical bobbing.
    const speedXZ=Math.hypot(localVel.x,localVel.z);
    const sideFlow=(-localVel.x*.095-localAccel.x*.022+wind*.028+turnInput*.070)*v;
    const rearFlow=(speedXZ*.050-localAccel.z*.018+shotPulse*.10)*v;
    const gravity=-4.15;
    p.x+=vx+sideFlow*dt2;
    p.y+=vy+gravity*dt2;
    p.z+=vz+rearFlow*dt2;

    // torso/back collision: cloth cannot pass through the character.
    const torsoHalf=.34;
    if(p.y>-.95 && Math.abs(p.x)<.54 && p.z<torsoHalf)p.z=torsoHalf;

    // v4.2.1 — BACK-GEAR LAYERING
    // Upper cape is physically trapped BETWEEN the back and carried equipment.
    // This keeps a rifle / sword / scabbard visually on top of the cape instead
    // of the cloth whipping through or over the weapon.
    if(p.y>-.92 && Math.abs(p.x)<.56){
      p.z=Math.min(p.z,.385);
    }

    // lower body keeps a smaller clearance and is free to trail dramatically.
    if(p.y<=-.95 && p.y> -1.45 && Math.abs(p.x)<.42 && p.z<.25)p.z=.25;
   }
  }

  // Re-pin top edge every frame.
  for(let x=0;x<this.cols;x++){
   const u=x/(this.cols-1);
   const px=(u-.5)*this.width;
   const i=this.idx(x,0);
   this.points[i].set(px,0,.03);
   this.prev[i].copy(this.points[i]);
  }

  const restX=this.width/(this.cols-1);
  const restY=this.height/(this.rows-1);
  const diag=Math.hypot(restX,restY);

  // Multiple cheap constraint iterations = fabric that keeps its shape but still whips.
  for(let iter=0;iter<4;iter++){
   for(let y=0;y<this.rows;y++){
    for(let x=0;x<this.cols;x++){
     const i=this.idx(x,y);
     if(x<this.cols-1)this.satisfy(i,this.idx(x+1,y),restX,.92);
     if(y<this.rows-1)this.satisfy(i,this.idx(x,y+1),restY,.96);
     if(x<this.cols-1&&y<this.rows-1)this.satisfy(i,this.idx(x+1,y+1),diag,.34);
     if(x>0&&y<this.rows-1)this.satisfy(i,this.idx(x-1,y+1),diag,.34);
    }
   }
  }

  for(let i=0;i<this.points.length;i++){
   const p=this.points[i];
   posAttr.setXYZ(i,p.x,p.y,p.z);
  }
  posAttr.needsUpdate=true;

  // Recomputing cloth normals every frame is unnecessary at phone/browser scale.
  // Every other frame keeps folds responsive while halving this CPU cost.
  this.normalFrame=(this.normalFrame+1)%3;
  if(this.normalFrame===0){
    this.geometry.computeVertexNormals();
  }
 }
}
