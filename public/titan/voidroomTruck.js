import * as THREE from "three";
import {FBXLoader} from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/FBXLoader.js";

/*
 PROJECT TITAN — VOIDROOM GARAGE TRUCK
 Loads the supplied Lightbody '90 MD Utility FBX and stages it as a grounded
 hideout vehicle. The source asset stays intact; TITAN upgrades are separate
 meshes so they can be replaced/refined without touching the purchased/free model.
*/

const TEX_BASE="./assets/vehicles/lightbody90/";

function box(parent,size,pos,material,rot=[0,0,0]){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
 m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;
 parent.add(m);return m;
}
function cyl(parent,r,depth,pos,material,rot=[Math.PI/2,0,0]){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,14),material);
 m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;
 parent.add(m);return m;
}

export function installVoidroomTruck(scene){
 const bay=new THREE.Group();
 bay.name="VOIDROOM_GARAGE_BAY";
 // Inside VOIDROOM, offset to the east wall, nose aimed toward the front entrance (+Z).
 bay.position.set(37.0,0,-3.0);
 scene.add(bay);

 const steel=new THREE.MeshStandardMaterial({color:0x171b1e,metalness:.82,roughness:.34});
 const black=new THREE.MeshStandardMaterial({color:0x080a0b,metalness:.48,roughness:.48});
 const rubber=new THREE.MeshStandardMaterial({color:0x050606,metalness:.05,roughness:.9});
 const lampMat=new THREE.MeshStandardMaterial({color:0xc9f4ff,emissive:0x9eeaff,emissiveIntensity:1.8,roughness:.18});

 // Garage-port staging: parking pad, wheel stops, ceiling/service light.
 const pad=new THREE.Mesh(new THREE.PlaneGeometry(15.5,18),new THREE.MeshStandardMaterial({color:0x151719,roughness:.95}));
 pad.rotation.x=-Math.PI/2;pad.position.y=.012;pad.receiveShadow=true;bay.add(pad);
 for(const x of [-4.3,4.3]){
   box(bay,[.18,.035,15.0],[x,.035,0],new THREE.MeshStandardMaterial({color:0xb5a44b,roughness:.8}));
 }
 box(bay,[9.4,.22,.32],[0,.11,-6.0],black);
 const overhead=box(bay,[4.4,.10,.22],[0,5.8,-.3],lampMat);
 const serviceLight=new THREE.PointLight(0xc8efff,7,15,2);serviceLight.position.set(0,5.3,0);bay.add(serviceLight);

 // A compact service cabinet makes the area read as a dedicated garage port.
 box(bay,[1.3,2.2,.65],[3.65,1.1,-5.3],steel);
 box(bay,[1.0,.08,.08],[3.65,1.75,-4.94],lampMat);

 const truckRoot=new THREE.Group();
 truckRoot.name="TITAN_UTILITY_TRUCK";

 // v5.2 — game-scale correction.
 // The source asset is real-world sized, but PROJECT TITAN's current world/player scale
 // reads much larger. Scale the ENTIRE truck assembly (base model + military upgrades)
 // together so it looks like a genuinely large crew-cab utility pickup in the hideout.
 const GAME_TRUCK_SCALE=1.90;
 truckRoot.scale.setScalar(GAME_TRUCK_SCALE);

 // Turn the entire vehicle 90° toward in-game LEFT.
 // Because the base FBX is already corrected by GARAGE_TRUCK_YAW below,
 // rotating the root keeps every military add-on perfectly aligned with the truck.
 const GAME_TRUCK_LEFT_TURN=Math.PI/2;
 truckRoot.rotation.y=GAME_TRUCK_LEFT_TURN;

 bay.add(truckRoot);

 const loader=new FBXLoader();
 loader.setResourcePath(TEX_BASE);
 loader.load(TEX_BASE+"UTLTRUCK90.fbx",(model)=>{
   model.name="Lightbody90_BaseTruck";
   model.traverse(o=>{
     if(o.isMesh){
       o.castShadow=true;o.receiveShadow=true;
       if(Array.isArray(o.material)){
         for(const m of o.material){if(m?.map)m.map.colorSpace=THREE.SRGBColorSpace}
       }else if(o.material?.map)o.material.map.colorSpace=THREE.SRGBColorSpace;
     }
   });

   // Normalize arbitrary FBX authoring units into a believable large pickup footprint.
   model.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(model);
   const s=b.getSize(new THREE.Vector3());
   const longest=Math.max(s.x,s.z);
   const scale=5.7/Math.max(longest,.001);
   model.scale.setScalar(scale);
   model.updateMatrixWorld(true);

   const b2=new THREE.Box3().setFromObject(model);
   const center=b2.getCenter(new THREE.Vector3());
   // Center horizontally and put tires/body on the floor.
   model.position.x-=center.x;
   model.position.z-=center.z;
   model.position.y-=b2.min.y;

   // Most automotive FBX exports use longitudinal X or Z. This orientation is staged
   // toward the VOIDROOM entrance; flip GARAGE_TRUCK_YAW below if the source faces rearward.
   const GARAGE_TRUCK_YAW=Math.PI;
   model.rotation.y=GARAGE_TRUCK_YAW;
   truckRoot.add(model);

   // TITAN field upgrades — intentionally restrained, not Mad Max.
   const upgrades=new THREE.Group();upgrades.name="TITAN_MILITARY_UPGRADES";
   truckRoot.add(upgrades);

   // Front brush/impact guard, visually at the entrance-facing end.
   box(upgrades,[3.05,.18,.16],[0,.78,3.02],steel);
   box(upgrades,[3.15,.24,.30],[0,.43,3.04],steel);
   for(const x of [-1.28,1.28])box(upgrades,[.15,1.0,.16],[x,.82,3.00],steel);
   box(upgrades,[2.55,.12,.12],[0,1.23,3.00],steel);

   // Two auxiliary lamps.
   for(const x of [-.62,.62]){
     const l=cyl(upgrades,.16,.12,[x,1.18,3.10],black,[Math.PI/2,0,0]);
     const face=new THREE.Mesh(new THREE.CircleGeometry(.125,16),lampMat);
     face.position.set(x,1.18,3.175);face.rotation.x=Math.PI/2;upgrades.add(face);
   }

   // Bed rack / equipment frame.
   for(const x of [-1.32,1.32]){
     box(upgrades,[.10,1.15,.10],[x,1.92,-1.55],steel);
     box(upgrades,[.10,1.15,.10],[x,1.92,-2.65],steel);
   }
   box(upgrades,[2.75,.10,.10],[0,2.47,-1.55],steel);
   box(upgrades,[2.75,.10,.10],[0,2.47,-2.65],steel);
   box(upgrades,[.10,.10,1.2],[-1.32,2.47,-2.10],steel);
   box(upgrades,[.10,.10,1.2],[1.32,2.47,-2.10],steel);

   // Ruggedized equipment cases in bed.
   const caseMat=new THREE.MeshStandardMaterial({color:0x34372d,metalness:.18,roughness:.8});
   box(upgrades,[1.35,.55,.75],[-.72,1.25,-2.1],caseMat);
   box(upgrades,[1.0,.43,.68],[.72,1.18,-2.2],caseMat);

   // Radio whip + small antenna base.
   cyl(upgrades,.07,.18,[1.05,2.55,-2.5],black,[0,0,0]);
   const ant=box(upgrades,[.025,1.65,.025],[1.05,3.42,-2.5],black);
   ant.rotation.z=-.08;

   // Subtle underbody skid plate.
   box(upgrades,[2.25,.09,2.0],[0,.34,.35],steel,[.04,0,0]);

   // Soft tactical work light from the truck bay.
   const glow=new THREE.PointLight(0x9bdfff,2.2,8,2);glow.position.set(0,2.2,-1.8);upgrades.add(glow);

   console.info("VOIDROOM utility truck loaded", {originalSize:s, normalizedScale:scale, gameScale:GAME_TRUCK_SCALE, rootYaw:GAME_TRUCK_LEFT_TURN});
 },undefined,(err)=>{
   console.error("VOIDROOM truck FBX failed to load:",err);
 });
 return {bay,truckRoot};
}
