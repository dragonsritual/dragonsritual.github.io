import * as THREE from "three";
export class Necromancer{
 constructor(scene,player,worldRoot){
  this.scene=scene;this.player=player;this.worldRoot=worldRoot;this.alive=true;this.health=520;this.maxHealth=520;this.radius=42;this.cooldown=1.5;this.drainTime=0;this.drainTick=0;this.los=new THREE.Raycaster();
  this.group=new THREE.Group();this.group.position.copy(worldRoot?.userData?.necromancerSpawn??new THREE.Vector3(325,0,99));scene.add(this.group);
  const robe=new THREE.MeshStandardMaterial({color:0x17121d,roughness:.9,emissive:0x17051f,emissiveIntensity:.5}),bone=new THREE.MeshStandardMaterial({color:0xb9b09a,roughness:.8}),violet=new THREE.MeshBasicMaterial({color:0xa63cff,toneMapped:false});
  const body=new THREE.Mesh(new THREE.ConeGeometry(.72,2.7,10),robe);body.position.y=1.35;this.group.add(body);
  const skull=new THREE.Mesh(new THREE.SphereGeometry(.39,12,9),bone);skull.position.y=2.95;this.group.add(skull);
  const eyeL=new THREE.Mesh(new THREE.SphereGeometry(.055,6,5),violet),eyeR=eyeL.clone();eyeL.position.set(-.14,3.02,-.35);eyeR.position.set(.14,3.02,-.35);this.group.add(eyeL,eyeR);
  this.hand=new THREE.Object3D();this.hand.position.set(.72,2.15,-.08);this.group.add(this.hand);
  const staff=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,3.0,7),new THREE.MeshStandardMaterial({color:0x38231d,roughness:1}));staff.position.set(.72,1.55,0);staff.rotation.z=-.12;this.group.add(staff);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),violet);orb.position.set(.9,3.0,0);this.group.add(orb);
  // one reusable beam, geometry updated in place
  this.beamPositions=new Float32Array(18);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.beamPositions,3));
  this.beam=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xc34dff,transparent:true,opacity:0,toneMapped:false,depthWrite:false}));this.beam.visible=false;scene.add(this.beam);
  this.light=new THREE.PointLight(0x8c31d6,0,18,2);scene.add(this.light);
 }
 hasLOS(from,to){const d=to.clone().sub(from),len=d.length();this.los.set(from,d.normalize());this.los.far=len-.3;const walls=[];this.worldRoot?.traverse(o=>{if(o.isMesh&&o.visible!==false&&(o.userData?.isBuildingWall||o.userData?.blocksBullets))walls.push(o)});return this.los.intersectObjects(walls,false).length===0;}
 updateBeam(a,b,time){const p=this.beamPositions;for(let i=0;i<6;i++){const q=i/5;p[i*3]=THREE.MathUtils.lerp(a.x,b.x,q)+(i>0&&i<5?Math.sin(time*18+i*4)*.09:0);p[i*3+1]=THREE.MathUtils.lerp(a.y,b.y,q)+(i>0&&i<5?Math.cos(time*15+i)*.08:0);p[i*3+2]=THREE.MathUtils.lerp(a.z,b.z,q)+(i>0&&i<5?Math.sin(time*13+i*2)*.09:0);}this.beam.geometry.attributes.position.needsUpdate=true;}
 update(dt,time=performance.now()/1000){if(!this.alive)return;const terrainY=this.worldRoot?.userData?.heightAt?.(this.group.position.x,this.group.position.z);if(Number.isFinite(terrainY))this.group.position.y=THREE.MathUtils.damp(this.group.position.y,terrainY,10,dt);const target=this.player.group.position.clone().add(new THREE.Vector3(0,1.35,0)),origin=this.group.position.clone().add(new THREE.Vector3(.65,2.35,0)),dist=origin.distanceTo(target);this.group.lookAt(target.x,this.group.position.y,target.z);this.cooldown-=dt;
  const canDrain=dist<this.radius&&dist>4&&this.hasLOS(origin,target);
  if(canDrain&&this.cooldown<=0&&this.drainTime<=0){this.drainTime=2.8;this.drainTick=0;}
  if(this.drainTime>0&&canDrain){this.drainTime-=dt;this.drainTick-=dt;this.beam.visible=true;this.beam.material.opacity=.72+Math.sin(time*24)*.18;this.updateBeam(origin,target,time);this.light.position.copy(origin);this.light.intensity=13;
   if(this.drainTick<=0){this.drainTick=.18;this.player.damage(5);this.health=Math.min(this.maxHealth,this.health+2);}
  }else{if(this.drainTime>0)this.drainTime=0;this.beam.visible=false;this.light.intensity=0;if(this.cooldown<=0)this.cooldown=1.4+Math.random()*1.5;}
 }
 takeHit(damage=35){if(!this.alive)return false;this.health=Math.max(0,this.health-damage);if(this.health<=0){this.alive=false;this.beam.visible=false;this.light.intensity=0;this.group.rotation.z=Math.PI/2;this.group.position.y=.55;}return true;}
}
