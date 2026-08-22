import * as THREE from "three";

// TITAN PROCEDURAL WEARABLES v2 — visible outer textile layer.
// Generated at runtime: woven cotton/nylon surface, military seam stitching,
// straps, cuffs, cords and secondary motion. No fixed character skin required.
export class ProceduralTitanGear{
 constructor(root,{scale=1,accent=0x9cff18,variant=0}={}){
  this.root=root; this.scale=scale; this.variant=variant;
  this.prevWorld=new THREE.Vector3(); this.velocity=new THREE.Vector3();
  this.swing=new THREE.Vector3(); this.swingVel=new THREE.Vector3(); this.time=Math.random()*20;
  this.group=new THREE.Group(); this.group.name="proceduralWearables"; root.add(this.group);

  const canvas=document.createElement("canvas"); canvas.width=128; canvas.height=128;
  const c=canvas.getContext("2d");
  c.fillStyle="#171a1b"; c.fillRect(0,0,128,128);
  // coarse military cotton/ballistic nylon weave
  for(let y=0;y<128;y+=3){c.fillStyle=(y%6===0)?"rgba(112,120,116,.16)":"rgba(0,0,0,.10)";c.fillRect(0,y,128,1);}
  for(let x=0;x<128;x+=4){c.fillStyle=(x%8===0)?"rgba(126,132,127,.10)":"rgba(0,0,0,.08)";c.fillRect(x,0,1,128);}
  for(let i=-128;i<128;i+=9){c.strokeStyle="rgba(190,195,185,.055)";c.beginPath();c.moveTo(i,0);c.lineTo(i+128,128);c.stroke();}
  this.weaveTex=new THREE.CanvasTexture(canvas); this.weaveTex.wrapS=this.weaveTex.wrapT=THREE.RepeatWrapping; this.weaveTex.repeat.set(5,5);
  this.weaveTex.colorSpace=THREE.SRGBColorSpace;

  this.fabric=new THREE.MeshStandardMaterial({color:0x252a28,map:this.weaveTex,roughness:1,metalness:0});
  this.fabricDark=this.fabric.clone(); this.fabricDark.color.setHex(0x0b0e0e);
  this.seamMat=new THREE.MeshStandardMaterial({color:0x6c7169,roughness:.95,metalness:0});
  this.accentMat=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.18,roughness:.72,metalness:0});
  this.hardware=new THREE.MeshStandardMaterial({color:0x252b2d,roughness:.38,metalness:.7});

  const box=(name,size,pos,mat,parent=this.group)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.name=name;m.position.set(...pos);m.castShadow=true;parent.add(m);return m;};
  const cyl=(name,r,h,pos,rot,mat,parent=this.group,seg=8)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat);m.name=name;m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;parent.add(m);return m;};

  // UNDER-LAYER: deliberately visible around the armor instead of buried inside it.
  box("combatShirtCenter",[.68,.78,.505],[0,1.68,0],this.fabric);
  box("combatShirtLower",[.77,.34,.49],[0,1.25,0],this.fabricDark);
  box("combatCollar",[.56,.13,.52],[0,2.11,0],this.fabricDark);
  // visible shoulder/sleeve textile outside the rigid torso shell
  box("leftSleeve",[.30,.49,.39],[-.63,1.72,0],this.fabric);
  box("rightSleeve",[.30,.49,.39],[.63,1.72,0],this.fabric);
  box("leftCuff",[.34,.18,.40],[-.64,1.43,0],this.fabricDark);
  box("rightCuff",[.34,.18,.40],[.64,1.43,0],this.fabricDark);
  box("waistWebbing",[.82,.14,.53],[0,1.05,0],this.fabricDark);

  // OUTER WEBBING — intentionally sits beyond the armor so the new pass is obvious.
  const strap=box("outerSlingStrap",[.105,1.18,.052],[.02,1.72,-.455],this.fabricDark);
  strap.rotation.z=-.57;
  for(const y of [1.42,1.98]) box("strapBuckle",[.15,.09,.075],[y<1.6?.20:-.19,y,-.49],this.hardware);

  // Military-style double stitch lines over the chest and waist.
  for(const x of [-.31,.31]){
   const seam=box("verticalDoubleStitch",[.018,.72,.012],[x,1.66,-.493],this.seamMat); seam.renderOrder=2;
  }
  for(const y of [1.34,2.00]) box("horizontalDoubleStitch",[.67,.018,.012],[0,y,-.493],this.seamMat);

  // Equipment sockets.
  this.sockets={};
  for(const [name,pos] of Object.entries({backHigh:[.28,2.18,.55],backLow:[-.28,1.12,.55],hipL:[-.48,1.02,.20],hipR:[.48,1.02,.20],cape:[0,2.12,.48]})){
   const s=new THREE.Group();s.name=`socket_${name}`;s.position.set(...pos);this.group.add(s);this.sockets[name]=s;
  }

  // Neon utility cord, visible over the outer chest webbing.
  this.cord=[];
  const points=[[-.37,1.98,-.525],[-.26,1.83,-.535],[-.08,1.70,-.54],[.12,1.57,-.535],[.33,1.43,-.52]];
  for(let i=0;i<points.length-1;i++){
   const a=new THREE.Vector3(...points[i]),b=new THREE.Vector3(...points[i+1]);
   const mid=a.clone().add(b).multiplyScalar(.5),len=a.distanceTo(b);
   const seg=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,len,8),this.accentMat);
   seg.position.copy(mid);seg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
   seg.castShadow=true;seg.userData.basePos=mid.clone();seg.userData.baseQuat=seg.quaternion.clone();this.group.add(seg);this.cord.push(seg);
  }

  // Flexible lower shirt tabs: visibly extend below rigid waist armor.
  this.tails=[];
  for(let i=-2;i<=2;i++){
   const tail=box("shirtTail",[.16,.34,.045],[i*.16,.91,.275],this.fabricDark);
   tail.geometry.translate(0,-.17,0);tail.position.y+=.17;tail.userData.phase=i*.7;this.tails.push(tail);
  }
  root.updateMatrixWorld(true);root.getWorldPosition(this.prevWorld);
 }
 update(dt,externalVelocity=null,shotPulse=0){
  this.time+=dt;const p=new THREE.Vector3();this.root.getWorldPosition(p);
  const measured=p.clone().sub(this.prevWorld).divideScalar(Math.max(.001,dt));this.prevWorld.copy(p);
  this.velocity.lerp(externalVelocity||measured,1-Math.exp(-8*dt));
  const q=this.root.getWorldQuaternion(new THREE.Quaternion()).invert();const local=this.velocity.clone().applyQuaternion(q);
  const targets=[THREE.MathUtils.clamp(-local.z*.012-shotPulse*.04,-.19,.19),0,THREE.MathUtils.clamp(local.x*.016,-.23,.23)];
  for(let i=0;i<3;i++){const e=targets[i]-this.swing.getComponent(i);this.swingVel.setComponent(i,(this.swingVel.getComponent(i)+e*36*dt)*Math.exp(-7.5*dt));this.swing.setComponent(i,this.swing.getComponent(i)+this.swingVel.getComponent(i)*dt);}
  this.tails.forEach((t,i)=>{t.rotation.x=this.swing.x*(.82+i*.06)+Math.sin(this.time*4+t.userData.phase)*.022;t.rotation.z=this.swing.z*(.75+i*.04);});
  this.cord.forEach((s,i)=>{const f=(i+1)/this.cord.length;s.position.copy(s.userData.basePos);s.position.x+=this.swing.z*f*.25;s.position.y-=Math.abs(this.swing.z)*f*.045;s.rotation.z+=this.swing.z*f*.42;});
 }
}
