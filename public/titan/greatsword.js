import * as THREE from "three";

export function createTitanGreatsword(){
 const g=new THREE.Group();
 g.name="TITAN_Greatsword";

 const bladeMat=new THREE.MeshPhysicalMaterial({
   color:0xb9c1c7,
   metalness:1,
   roughness:.16,
   clearcoat:.28,
   clearcoatRoughness:.12,
   envMapIntensity:1.7
 });
 const fullerMat=new THREE.MeshStandardMaterial({
   color:0x32393f,
   metalness:.96,
   roughness:.29
 });
 const darkSteel=new THREE.MeshStandardMaterial({
   color:0x242a2e,
   metalness:.94,
   roughness:.25
 });
 const edgeMat=new THREE.MeshPhysicalMaterial({
   color:0xe4e8ea,
   metalness:1,
   roughness:.09,
   clearcoat:.34,
   clearcoatRoughness:.08,
   envMapIntensity:2.0
 });
 const gripMat=new THREE.MeshStandardMaterial({
   color:0x171513,
   roughness:.72,
   metalness:.05
 });

 // Broad tapered blade with beveled edges that catch directional sunlight.
 const shape=new THREE.Shape();
 shape.moveTo(-.13,0);
 shape.lineTo(-.22,.26);
 shape.lineTo(-.18,2.34);
 shape.lineTo(0,2.72);
 shape.lineTo(.18,2.34);
 shape.lineTo(.22,.26);
 shape.lineTo(.13,0);
 shape.closePath();

 const bladeGeo=new THREE.ExtrudeGeometry(shape,{
   depth:.042,
   bevelEnabled:true,
   bevelSegments:3,
   bevelSize:.018,
   bevelThickness:.010,
   steps:1,
   curveSegments:2
 });
 bladeGeo.translate(0,0,-.021);
 bladeGeo.computeVertexNormals();

 const blade=new THREE.Mesh(bladeGeo,bladeMat);
 blade.position.y=.34;
 blade.castShadow=true;
 blade.receiveShadow=true;
 g.add(blade);

 // Dark fuller inset down the center.
 const fuller=new THREE.Mesh(
   new THREE.BoxGeometry(.070,2.05,.048),
   fullerMat
 );
 fuller.position.set(0,1.62,0);
 fuller.castShadow=true;
 g.add(fuller);

 // Bright edge strips amplify moving specular response.
 for(const side of [-1,1]){
   const edge=new THREE.Mesh(
     new THREE.BoxGeometry(.024,2.23,.050),
     edgeMat
   );
   edge.position.set(.185*side,1.56,0);
   edge.rotation.z=.018*side;
   g.add(edge);
 }

 // Guard.
 const guard=new THREE.Mesh(
   new THREE.BoxGeometry(1.18,.13,.18),
   darkSteel
 );
 guard.position.y=.24;
 guard.rotation.z=.02;
 guard.castShadow=true;
 g.add(guard);

 for(const side of [-1,1]){
   const quillon=new THREE.Mesh(
     new THREE.CylinderGeometry(.055,.075,.34,10),
     darkSteel
   );
   quillon.position.set(.56*side,.15,0);
   quillon.rotation.z=.34*side;
   g.add(quillon);
 }

 // Grip + wrapped ridges.
 const grip=new THREE.Mesh(
   new THREE.CylinderGeometry(.075,.085,.62,12),
   gripMat
 );
 grip.position.y=-.14;
 grip.castShadow=true;
 g.add(grip);

 for(let i=0;i<7;i++){
   const wrap=new THREE.Mesh(
     new THREE.TorusGeometry(.083,.009,6,12),
     darkSteel
   );
   wrap.rotation.x=Math.PI/2;
   wrap.position.y=-.40+i*.085;
   g.add(wrap);
 }

 const pommel=new THREE.Mesh(
   new THREE.IcosahedronGeometry(.14,1),
   darkSteel
 );
 pommel.position.y=-.51;
 pommel.scale.set(1,.86,.72);
 pommel.castShadow=true;
 g.add(pommel);

 // Invisible authored blade points used by the melee sweep solver.
 const bladeBaseMarker=new THREE.Object3D();
 bladeBaseMarker.name="bladeBaseMarker";
 bladeBaseMarker.position.set(0,.62,0);
 g.add(bladeBaseMarker);

 const bladeMidMarker=new THREE.Object3D();
 bladeMidMarker.name="bladeMidMarker";
 bladeMidMarker.position.set(0,1.82,0);
 g.add(bladeMidMarker);

 const bladeTipMarker=new THREE.Object3D();
 bladeTipMarker.name="bladeTipMarker";
 bladeTipMarker.position.set(0,3.00,0);
 g.add(bladeTipMarker);

 g.userData.bladeBaseMarker=bladeBaseMarker;
 g.userData.bladeMidMarker=bladeMidMarker;
 g.userData.bladeTipMarker=bladeTipMarker;

 g.userData.itemType="greatsword";
 g.userData.itemId="titan_greatsword_mk1";
 g.userData.label="TITAN GREATSWORD // MK I";

 return g;
}
