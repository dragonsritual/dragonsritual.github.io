import * as THREE from "three";
import {WorldVideoScreen} from "./worldMedia.js?v=4.8.12";
import {createTitanGreatsword} from "./greatsword.js?v=4.8.12";

const sharedTextureLoader=new THREE.TextureLoader();

function loadTiledColorTexture(url,repeatX=2,repeatY=2){
 const tex=sharedTextureLoader.load(
   url,
   ()=>{
     tex.colorSpace=THREE.SRGBColorSpace;
     tex.wrapS=THREE.RepeatWrapping;
     tex.wrapT=THREE.RepeatWrapping;
     tex.repeat.set(repeatX,repeatY);
     tex.anisotropy=4;
     tex.needsUpdate=true;
   },
   undefined,
   ()=>{
     console.warn("PROJECT TITAN texture fallback:",url);
   }
 );

 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=THREE.RepeatWrapping;
 tex.wrapT=THREE.RepeatWrapping;
 tex.repeat.set(repeatX,repeatY);
 return tex;
}

const brickWall08Color=loadTiledColorTexture(
 "./assets/textures/brick_wall_08/brick_wall_08_diff_2k.jpg",
 1,
 1
);

const BRICK_TILE_WORLD_W=3.35;
const BRICK_TILE_WORLD_H=2.25;

function mat(color,opts={}){
 return new THREE.MeshStandardMaterial({
   color,
   roughness:opts.roughness ?? .82,
   metalness:opts.metalness ?? 0,
   emissive:opts.emissive ?? 0x000000,
   emissiveIntensity:opts.emissiveIntensity ?? 0
 });
}

function addBox(root,size,pos,material,rotY=0){
 const m=new THREE.Mesh(
   new THREE.BoxGeometry(...size),
   material
 );
 m.position.set(...pos);
 m.rotation.y=rotY;
 m.castShadow=true;
 m.receiveShadow=true;
 root.add(m);
 return m;
}

function titanSmoothstep(a,b,x){const t=THREE.MathUtils.clamp((x-a)/Math.max(.0001,b-a),0,1);return t*t*(3-2*t);}
function titanHash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453123;return s-Math.floor(s);}
function titanValueNoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf),a=titanHash(xi,zi),b=titanHash(xi+1,zi),c=titanHash(xi,zi+1),d=titanHash(xi+1,zi+1);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,u),THREE.MathUtils.lerp(c,d,u),v);}
function titanSeeded(seed=0x54A91){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

function applyContinuousWallUV(mesh){
 const geometry=mesh.geometry;
 const pos=geometry?.attributes?.position;
 const normal=geometry?.attributes?.normal;
 const uv=geometry?.attributes?.uv;

 if(!pos || !normal || !uv)return;

 for(let i=0;i<pos.count;i++){
   const vx=pos.getX(i)+mesh.position.x;
   const vy=pos.getY(i)+mesh.position.y;
   const vz=pos.getZ(i)+mesh.position.z;

   const nx=Math.abs(normal.getX(i));
   const ny=Math.abs(normal.getY(i));
   const nz=Math.abs(normal.getZ(i));

   let u=0,v=0;

   if(nz>=nx && nz>=ny){
     u=vx/BRICK_TILE_WORLD_W;
     v=vy/BRICK_TILE_WORLD_H;
   }else if(nx>=ny){
     u=vz/BRICK_TILE_WORLD_W;
     v=vy/BRICK_TILE_WORLD_H;
   }else{
     u=vx/BRICK_TILE_WORLD_W;
     v=vz/BRICK_TILE_WORLD_W;
   }

   uv.setXY(i,u,v);
 }

 uv.needsUpdate=true;
}

function canvasPoster(lines,accent="#ffbf3f"){
 const c=document.createElement("canvas");
 c.width=512;
 c.height=768;
 const x=c.getContext("2d");

 x.fillStyle="#111214";
 x.fillRect(0,0,c.width,c.height);

 // weathered bands
 x.fillStyle="#23262a";
 for(let i=0;i<12;i++){
   x.fillRect(
     Math.random()*512,
     Math.random()*768,
     40+Math.random()*180,
     3+Math.random()*12
   );
 }

 x.strokeStyle=accent;
 x.lineWidth=10;
 x.strokeRect(22,22,468,724);

 x.fillStyle=accent;
 x.font="900 34px Arial";
 x.fillText("VOIDROOM",44,82);

 x.fillStyle="#f4f4f4";
 x.font="900 58px Arial";
 x.fillText("NIGHT",44,165);
 x.fillText("SIGNAL",44,224);

 x.fillStyle=accent;
 x.font="800 28px Arial";
 x.fillText("DARK DNB // BASS",44,300);

 x.fillStyle="#d7d7d7";
 x.font="700 25px Arial";
 x.fillText("SATURDAY 23:00",44,365);
 x.fillText("WAREHOUSE DISTRICT",44,406);
 x.fillText("UNIT 09",44,447);

 x.fillStyle="#9fa6ab";
 x.font="600 19px Arial";
 x.fillText("NO CAMERAS // NO COLORS",44,520);
 x.fillText("ARMOR CHECK AT DOOR",44,555);

 x.fillStyle="#ffffff";
 x.font="800 17px Arial";
 let y=630;
 for(const line of lines){
   x.fillText(line,44,y);
   y+=28;
 }

 const tex=new THREE.CanvasTexture(c);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=4;
 return tex;
}

function addPoster(root,position,rotationY=0,id="voidroom_flyer"){
 const tex=canvasPoster([
   "VOIDROOM EVENT FLYER",
   "FOLLOW THE LOW BASS"
 ]);
 const poster=new THREE.Mesh(
   new THREE.PlaneGeometry(1.35,2.0),
   new THREE.MeshBasicMaterial({
     map:tex,
     side:THREE.DoubleSide
   })
 );
 poster.position.set(...position);
 poster.rotation.y=rotationY;
 poster.userData.hint={
   title:"VOIDROOM // NIGHT SIGNAL",
   text:"SATURDAY 23:00 — WAREHOUSE DISTRICT, UNIT 09. HEAVY SUITS SEEN OUTSIDE."
 };
 poster.userData.collectiblePoster={
   id,
   title:"VOIDROOM // NIGHT SIGNAL",
   preview:tex.image?.toDataURL?.("image/png")||""
 };
 root.add(poster);
 return poster;
}

function snapPaperToNearestWall(parent,paper,maxDistance=7){
 parent.updateMatrixWorld(true);

 const normal=new THREE.Vector3(0,0,1)
   .applyQuaternion(paper.getWorldQuaternion(new THREE.Quaternion()))
   .normalize();

 const origin=paper.getWorldPosition(new THREE.Vector3());
 const ray=new THREE.Raycaster();
 const candidates=[];

 for(const dir of [normal.clone(),normal.clone().negate()]){
   ray.set(origin.clone().addScaledVector(dir,-.03),dir);
   ray.far=maxDistance;
   const hits=ray.intersectObject(parent,true)
     .filter(h=>h.object!==paper && h.object?.isMesh);
   if(hits.length)candidates.push({hit:hits[0],dir});
 }

 if(!candidates.length)return;
 candidates.sort((a,b)=>a.hit.distance-b.hit.distance);
 const best=candidates[0];

 // Sit a paper-thin distance off the actual wall surface.
 const worldPoint=best.hit.point.clone().addScaledVector(best.dir,-.014);
 parent.worldToLocal(worldPoint);
 paper.position.copy(worldPoint);

 // Face away from the surface toward the room/street.
 const outward=best.dir.clone().negate();
 const yaw=Math.atan2(outward.x,outward.z);
 paper.rotation.set(0,yaw,0);
}

function addWallPoster(parent,url,position,rotation=[0,0,0],size=[.72,1.02],meta={}){
 const loader=new THREE.TextureLoader();
 const material=new THREE.MeshStandardMaterial({
   color:0xffffff,roughness:.82,metalness:0,side:THREE.DoubleSide,
   polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
 });
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),material);
 paper.position.set(...position);
 paper.rotation.set(...rotation);
 paper.castShadow=false;
 paper.receiveShadow=true;
 paper.renderOrder=3;
 paper.userData.collectiblePoster={
   id:meta.id||url,
   title:meta.title||"NIGHT DISTRICT POSTER",
   preview:url
 };
 parent.add(paper);

 loader.load(url,tex=>{
   tex.colorSpace=THREE.SRGBColorSpace;
   tex.anisotropy=4;
   material.map=tex;
   material.needsUpdate=true;
   // Snap only after world geometry exists and texture succeeded.
   requestAnimationFrame(()=>snapPaperToNearestWall(parent,paper,8));
 },undefined,()=>{paper.visible=false;});

 return paper;
}

export function buildWorld(scene,{audioListener=null}={}){
 const root=new THREE.Group();

 // =======================================================
 // v7.4.1 — LAZY MICROFRACTURE TEST
 //
 // Performance rule:
 // - intact walls stay coarse
 // - only the panel actually shot is promoted
 // - only the fine cell actually shot is promoted again into 8 micro-cells
 // - micro-cells have independent strength
 // - only detached chips borrow from a fixed debris pool
 // - no geometry creation/disposal in the hot debris path
 // =======================================================
 const MICRO_SPLIT=2;                  // 2 x 2 x 2 = 8 micro-cells
 const MICRO_COUNT=MICRO_SPLIT**3;
 const MAX_FRACTURE_DEPTH=2;            // coarse -> micro -> focused sub-micro only
 const FRACTURE_DEBRIS_POOL_SIZE=64;
 const sharedUnitCubeGeometry=new THREE.BoxGeometry(1,1,1);

 // v7.4.2: one shared triangular-prism chip shape for broken brick/debris silhouettes.
 // This keeps the loose-fragment pool cheap while avoiding an all-cube destruction look.
 function createTriangularPrismGeometry(){
   const geometry=new THREE.BufferGeometry();
   const vertices=new Float32Array([
     -.5,-.5,-.5,  .5,-.5,-.5,  -.5,.5,-.5,
     -.5,-.5, .5,  .5,-.5, .5,  -.5,.5, .5
   ]);
   const indices=[
     0,2,1, 3,4,5,
     0,1,4, 0,4,3,
     1,2,5, 1,5,4,
     2,0,3, 2,3,5
   ];
   geometry.setAttribute("position",new THREE.BufferAttribute(vertices,3));
   geometry.setIndex(indices);
   geometry.computeVertexNormals();
   geometry.computeBoundingBox();
   geometry.computeBoundingSphere();
   return geometry;
 }

 const sharedBrickChipGeometry=createTriangularPrismGeometry();

 const wallDebris=[];
 const wallDebrisPool=[];
 const activeWallDebris=[];

 // Pre-allocate the destruction reserve once. Invisible pooled pieces cost very little
 // compared with allocating/destroying meshes during automatic gunfire.
 for(let i=0;i<FRACTURE_DEBRIS_POOL_SIZE;i++){
   const mesh=new THREE.Mesh(
     i%3===0?sharedBrickChipGeometry:sharedUnitCubeGeometry,
     new THREE.MeshStandardMaterial({
       color:0x707070,
       roughness:.92,
       metalness:0
     })
   );
   mesh.visible=false;
   mesh.castShadow=false;
   mesh.receiveShadow=false;
   scene.add(mesh);

   wallDebrisPool.push({
     mesh,
     vel:new THREE.Vector3(),
     spin:new THREE.Vector3(),
     life:0,
     active:false
   });
 }

 root.userData.fractureStats={
   microCellsActivated:0,
   microCellsDestroyed:0,
   subMicroCellsActivated:0,
   debrisPoolSize:FRACTURE_DEBRIS_POOL_SIZE,
   debrisActive:0,
   ballisticProfile:"v7.4.5 service-rifle baseline"
 };

 // Lazy destruction registries.
 // Fine destruction geometry only exists for wall panels that have actually been hit.
 root.userData.dynamicBulletMeshes=[];
 root.userData.dynamicCollisionMeshes=[];

 function borrowWallDebris(){
   // Fast linear scan through a tiny fixed pool.
   // No new Mesh / Geometry / Material allocation during gunfire.
   for(const d of wallDebrisPool){
     if(!d.active)return d;
   }

   // Pool exhausted: recycle the oldest/closest-to-expiry piece instead of allocating.
   let best=wallDebrisPool[0];
   for(const d of wallDebrisPool){
     if(d.life<best.life)best=d;
   }
   best.active=false;
   best.mesh.visible=false;
   return best;
 }

 function spawnWallDebris(cell,point,direction,count=2){
   const dir=direction?.clone?.().normalize?.() ?? new THREE.Vector3(0,0,-1);
   const sourceColor=cell.material?.color ?? new THREE.Color(0x666666);

   for(let i=0;i<count;i++){
     const d=borrowWallDebris();
     if(!d)break;

     const size=.07+Math.random()*.10;
     d.mesh.material.color.copy(sourceColor);
     d.mesh.material.roughness=cell.material?.roughness ?? .9;
     d.mesh.material.metalness=cell.material?.metalness ?? 0;
     d.mesh.scale.set(
       size*(.75+Math.random()*.6),
       size*(.7+Math.random()*.7),
       size*(.65+Math.random()*.7)
     );

     d.mesh.position.copy(point);
     d.mesh.position.x+=(Math.random()-.5)*.16;
     d.mesh.position.y+=(Math.random()-.5)*.16;
     d.mesh.position.z+=(Math.random()-.5)*.16;
     d.mesh.rotation.set(
       Math.random()*Math.PI,
       Math.random()*Math.PI,
       Math.random()*Math.PI
     );

     d.vel.copy(dir)
       .multiplyScalar(2.2+Math.random()*2.8)
       .add(new THREE.Vector3(
         (Math.random()-.5)*2.5,
         1.0+Math.random()*2.7,
         (Math.random()-.5)*2.5
       ));

     d.spin.set(
       (Math.random()-.5)*7,
       (Math.random()-.5)*7,
       (Math.random()-.5)*7
     );

     // Short-lived active physics burst. The visual hole persists; the loose chips do not.
     d.life=.55+Math.random()*.55;
     d.active=true;
     d.mesh.visible=true;

     if(!activeWallDebris.includes(d))activeWallDebris.push(d);
   }

   root.userData.fractureStats.debrisActive=
     activeWallDebris.reduce((n,d)=>n+(d.active?1:0),0);
 }

 function refreshDynamicCollisionCache(mesh){
   mesh.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(mesh);
   const center=new THREE.Vector3();
   box.getCenter(center);
   mesh.userData.cachedCollisionBox=box;
   mesh.userData.cachedCollisionCenter=center;
 }

 function chipMicroCellDiagonally(mesh){
   if(mesh.userData.diagonalChipApplied)return;

   const pos=mesh.geometry?.attributes?.position;
   if(!pos)return;

   // Collapse one corner across front/back faces. The remaining solid becomes a
   // wedge-like brick half, producing a real diagonal silhouette instead of
   // shrinking the whole cube uniformly. Orientation is deterministic per piece.
   const sx=mesh.userData.chipSignX ?? 1;
   const sy=mesh.userData.chipSignY ?? 1;
   const sz=mesh.userData.chipSignZ ?? 1;
   const mode=mesh.userData.chipMode ?? 0;

   // Four diagonal families + front/back variation. This prevents the repeated
   // cookie-cutter notch orientation visible in 7.4.2.
   for(let i=0;i<pos.count;i++){
     const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
     if(x*sx>0 && y*sy>0 && z*sz>=0){
       if(mode===0)pos.setX(i,x*.08);
       else if(mode===1)pos.setY(i,y*.08);
       else if(mode===2){pos.setX(i,x*.22);pos.setY(i,y*.22);}
       else {pos.setX(i,x*.10);pos.setZ(i,z*.28);}
     }
   }

   pos.needsUpdate=true;
   mesh.geometry.computeVertexNormals();
   mesh.geometry.computeBoundingBox();
   mesh.geometry.computeBoundingSphere();
   mesh.userData.diagonalChipApplied=true;
   refreshDynamicCollisionCache(mesh);
 }

 function splitFocusedMicroCell(parentCell,hitPoint,direction,damage=1,source="bullet"){
   if(!parentCell.visible || (parentCell.userData.fractureDepth??1)>=MAX_FRACTURE_DEPTH)return false;

   parentCell.geometry.computeBoundingBox();
   const bb=parentCell.geometry.boundingBox;
   const size=new THREE.Vector3();
   bb.getSize(size);
   const sx=size.x/MICRO_SPLIT, sy=size.y/MICRO_SPLIT, sz=size.z/MICRO_SPLIT;
   const localHit=parentCell.worldToLocal(hitPoint.clone());
   const children=[];
   let closest=null, closestDist=Infinity;

   parentCell.visible=false;
   parentCell.userData.blocksBullets=false;
   parentCell.userData.isBuildingWall=false;
   parentCell.userData.subFractureActivated=true;

   for(let ix=0;ix<MICRO_SPLIT;ix++)for(let iy=0;iy<MICRO_SPLIT;iy++)for(let iz=0;iz<MICRO_SPLIT;iz++){
     const ox=-size.x/2+sx*(ix+.5), oy=-size.y/2+sy*(iy+.5), oz=-size.z/2+sz*(iz+.5);
     const geometry=new THREE.BoxGeometry(sx,sy,sz);
     const child=new THREE.Mesh(geometry,parentCell.material);
     child.position.copy(parentCell.position);
     child.rotation.copy(parentCell.rotation);
     child.position.add(new THREE.Vector3(ox,oy,oz).applyEuler(parentCell.rotation));
     child.castShadow=false; child.receiveShadow=true;
     if(parentCell.material?.userData?.wallTexture==='brick_wall_08')applyContinuousWallUV(child);

     const worldSeed=Math.abs(Math.floor(
       parentCell.position.x*193+parentCell.position.y*389+parentCell.position.z*571+
       ix*101+iy*211+iz*307
     ));
     const hp=(worldSeed%5===0)?1.00:.68;
     child.userData.materialType=parentCell.userData.materialType;
     child.userData.blocksBullets=true;
     child.userData.isBuildingWall=true;
     child.userData.microWallCell=true;
     child.userData.fractureDepth=2;
     child.userData.wallHP=hp;
     child.userData.wallMaxHP=hp;
     child.userData.supportLayer=iy;
     child.userData.chipSignX=(worldSeed&1)?1:-1;
     child.userData.chipSignY=(worldSeed&2)?1:-1;
     child.userData.chipSignZ=(worldSeed&4)?1:-1;
     child.userData.chipMode=(worldSeed>>3)%4;
     child.userData.diagonalChipApplied=false;

     child.userData.onBulletHit=({point,direction,damage=1,source="bullet"})=>{
       if(!child.visible)return {destroyed:false};
       child.userData.wallHP=Math.max(0,child.userData.wallHP-damage);
       if(child.userData.wallHP<=0){
         child.visible=false;
         child.userData.blocksBullets=false;
         child.userData.isBuildingWall=false;
         root.userData.fractureStats.microCellsDestroyed++;
         spawnWallDebris(child,point,direction,1+(Math.random()<.5?1:0));
         return {destroyed:true};
       }
       chipMicroCellDiagonally(child);
       return {destroyed:false};
     };

     parentCell.parent.add(child);
     refreshDynamicCollisionCache(child);
     root.userData.dynamicBulletMeshes.push(child);
     root.userData.dynamicCollisionMeshes.push(child);
     children.push(child);

     const d=(ox-localHit.x)**2+(oy-localHit.y)**2+(oz-localHit.z)**2;
     if(d<closestDist){closestDist=d;closest=child;}
   }

   for(const child of children)child.userData.microSiblings=children;
   root.userData.fractureStats.subMicroCellsActivated+=children.length;

   // Carry the bullet into only the exact sub-piece under the impact.
   closest?.userData?.onBulletHit?.({point:hitPoint.clone(),direction:direction.clone(),damage:Math.max(source==="melee"?.34:.75,damage*.72),source});
   return true;
 }

 function makeWallCell(mesh,hp=2){
   mesh.userData.materialType=mesh.userData.materialType ?? "concrete";
   mesh.userData.blocksBullets=true;
   mesh.userData.isBuildingWall=true;
   mesh.userData.wallHP=hp;
   mesh.userData.wallMaxHP=hp;
   mesh.userData.microFractureActivated=false;
   mesh.userData.meleeIntegrity=2.0;

   const activateMicroFracture=(hitPoint,direction,damage=1,source="bullet")=>{
     if(mesh.userData.microFractureActivated || !mesh.visible)return;

     mesh.userData.microFractureActivated=true;
     mesh.visible=false;
     mesh.userData.blocksBullets=false;
     mesh.userData.isBuildingWall=false;

     // Read this cell's actual world-aligned dimensions from geometry bounding box.
     mesh.geometry.computeBoundingBox();
     const bb=mesh.geometry.boundingBox;
     const size=new THREE.Vector3();
     bb.getSize(size);

     const sx=size.x/MICRO_SPLIT;
     const sy=size.y/MICRO_SPLIT;
     const sz=size.z/MICRO_SPLIT;

     const localHit=mesh.worldToLocal(hitPoint.clone());
     let firstMicro=null;
     let firstDist=Infinity;

     for(let ix=0;ix<MICRO_SPLIT;ix++){
       for(let iy=0;iy<MICRO_SPLIT;iy++){
         for(let iz=0;iz<MICRO_SPLIT;iz++){
           const ox=-size.x/2+sx*(ix+.5);
           const oy=-size.y/2+sy*(iy+.5);
           const oz=-size.z/2+sz*(iz+.5);

           // v7.4.2: micro cells use their real dimensions in geometry instead of
           // scaling a 1x1x1 cube. This lets the brick UVs remain at the SAME
           // world-space size as the intact wall after a hit.
           const microGeometry=new THREE.BoxGeometry(sx,sy,sz);
           const micro=new THREE.Mesh(microGeometry,mesh.material);
           micro.position.copy(mesh.position);
           micro.rotation.copy(mesh.rotation);

           // Convert cell-local micro offset into parent coordinates.
           const localOffset=new THREE.Vector3(ox,oy,oz)
             .applyEuler(mesh.rotation);
           micro.position.add(localOffset);

           micro.castShadow=false;
           micro.receiveShadow=true;

           if(mesh.material?.userData?.wallTexture==="brick_wall_08"){
             applyContinuousWallUV(micro);
           }

           const seed=(ix*17+iy*31+iz*47+Math.floor(Math.abs(mesh.position.x*13)))%100;
           // Independent resistance: 1–4 hits. Most pieces are 2–3.
           const microHP=seed<18?.82:seed<72?1.28:1.78;

           micro.userData.materialType=mesh.userData.materialType;
           micro.userData.blocksBullets=true;
           micro.userData.isBuildingWall=true;
           micro.userData.microWallCell=true;
           micro.userData.wallHP=microHP;
           micro.userData.wallMaxHP=microHP;
           micro.userData.supportLayer=iy;
           micro.userData.fractureDepth=1;
           const orientSeed=Math.abs(Math.floor(mesh.position.x*197+mesh.position.y*389+mesh.position.z*571+seed*17));
           micro.userData.chipSignX=(orientSeed&1)?1:-1;
           micro.userData.chipSignY=(orientSeed&2)?1:-1;
           micro.userData.chipSignZ=(orientSeed&4)?1:-1;
           micro.userData.chipMode=(orientSeed>>3)%4;
           micro.userData.diagonalChipApplied=false;

           micro.userData.onBulletHit=({point,direction,damage=1,source="bullet"})=>{
             if(!micro.visible)return {destroyed:false};

             micro.userData.wallHP=Math.max(0,micro.userData.wallHP-damage);

             if(micro.userData.wallHP<=0){
               // v7.4.4: focused recursive fracture. A destroyed first-level micro cell
               // does not simply disappear; ONLY that cell promotes into 8 smaller
               // independently shootable pieces. This is capped at depth 2.
               if(splitFocusedMicroCell(micro,point,direction,Math.max(source==="melee"?.32:.75,damage*.78),source)){
                 spawnWallDebris(micro,point,direction,1);
                 return {activated:true};
               }

               micro.visible=false;
               micro.userData.blocksBullets=false;
               micro.userData.isBuildingWall=false;

               root.userData.fractureStats.microCellsDestroyed++;
               spawnWallDebris(micro,point,direction,1+(Math.random()<.35?1:0));

               // Very cheap local support response:
               // upper neighboring micro pieces can be weakened, but they do NOT all
               // automatically fall out. Continued fire grows the hole naturally.
               if(micro.userData.supportLayer===0){
                 for(const sibling of micro.userData.microSiblings ?? []){
                   if(
                     sibling.visible &&
                     sibling.userData.supportLayer>0 &&
                     Math.random()<.22
                   ){
                     sibling.userData.wallHP=Math.max(
                       1,
                       sibling.userData.wallHP-1
                     );
                   }
                 }
               }

               return {destroyed:true};
             }

             // v7.4.2: surviving brick damage now chips into a diagonal wedge
             // instead of uniformly shrinking the texture/mesh. This gives the
             // broken edge an angled half-brick silhouette.
             chipMicroCellDiagonally(micro);
             return {destroyed:false};
           };

           mesh.parent.add(micro);
           refreshDynamicCollisionCache(micro);
           root.userData.dynamicBulletMeshes.push(micro);
           root.userData.dynamicCollisionMeshes.push(micro);

           const d=
             (ox-localHit.x)*(ox-localHit.x)+
             (oy-localHit.y)*(oy-localHit.y)+
             (oz-localHit.z)*(oz-localHit.z);

           if(d<firstDist){
             firstDist=d;
             firstMicro=micro;
           }

           (mesh.userData.microChildren ??= []).push(micro);
         }
       }
     }

     // Give every micro-cell the same sibling array for cheap support checks.
     for(const child of mesh.userData.microChildren){
       child.userData.microSiblings=mesh.userData.microChildren;
     }

     root.userData.fractureStats.microCellsActivated+=MICRO_COUNT;

     // The shot that promoted this cell is immediately applied to the closest micro-cell.
     firstMicro?.userData?.onBulletHit?.({
       point:hitPoint.clone(),
       direction:direction.clone(),
       damage,
       source
     });
   };

   mesh.userData.onBulletHit=({point,direction,damage=1,source="bullet"})=>{
     // Quiet melee must work the masonry instead of instantly promoting a whole
     // cell. Bullets retain the fast ballistic promotion path.
     if(source==="melee"){
       mesh.userData.meleeIntegrity=Math.max(0,(mesh.userData.meleeIntegrity??2.0)-damage);
       if(mesh.userData.meleeIntegrity>0){
         chipMicroCellDiagonally(mesh);
         spawnWallDebris(mesh,point,direction,Math.random()<.55?1:0);
         return {chipped:true,melee:true};
       }
     }
     // First penetrating/finished impact promotes only THIS local fine cell.
     activateMicroFracture(point,direction,damage,source);
     return {activated:true,melee:source==="melee"};
   };

   mesh.updateMatrixWorld(true);

   const cachedBox=new THREE.Box3().setFromObject(mesh);
   const cachedCenter=new THREE.Vector3();
   cachedBox.getCenter(cachedCenter);

   mesh.userData.cachedCollisionBox=cachedBox;
   mesh.userData.cachedCollisionCenter=cachedCenter;

   return mesh;
 }

 function wallGrid(
   parent,
   {
     width,
     height,
     thickness,
     center,
     material,
     axis="z",
     cellW=2.2,
     cellH=1.8,
     doorway=null
   }
 ){
   // -------------------------------------------------------
   // v3.4 LAZY WALL DESTRUCTION
   //
   // INTACT:
   // wall = a small number of large coarse panels.
   //
   // FIRST BULLET INTO A PANEL:
   // that ONE panel is promoted into fine destructible cells.
   //
   // RESULT:
   // the city does not carry thousands of destructible meshes
   // until combat actually happens in that specific wall area.
   // -------------------------------------------------------

   const panelW=Math.max(5.5,cellW*3);
   const panelH=Math.max(4.5,cellH*3);

   const cols=Math.max(1,Math.ceil(width/panelW));
   const rows=Math.max(1,Math.ceil(height/panelH));
   const actualPW=width/cols;
   const actualPH=height/rows;

   const activatePanel=(panel,hitPoint,direction,damage=1,source="bullet")=>{
     if(panel.userData.activated)return;

     panel.userData.activated=true;
     panel.visible=false;
     panel.userData.blocksBullets=false;
     panel.userData.isBuildingWall=false;

     const meta=panel.userData.lazyPanel;
     const fineW=Math.min(cellW,1.35);
     const fineH=Math.min(cellH,1.15);

     const fineCols=Math.max(1,Math.ceil(meta.width/fineW));
     const fineRows=Math.max(1,Math.ceil(meta.height/fineH));
     const actualW=meta.width/fineCols;
     const actualH=meta.height/fineRows;

     const localHit=parent.worldToLocal(hitPoint.clone());
     let firstCell=null;
     let firstDist=Infinity;

     for(let c=0;c<fineCols;c++){
       for(let r=0;r<fineRows;r++){
         const offsetX=-meta.width/2+actualW*(c+.5);
         const offsetY=-meta.height/2+actualH*(r+.5);

         let size,pos;

         if(meta.axis==="z"){
           size=[actualW,actualH,meta.thickness];
           pos=[
             meta.center[0]+offsetX,
             meta.center[1]+offsetY,
             meta.center[2]
           ];
         }else{
           size=[meta.thickness,actualH,actualW];
           pos=[
             meta.center[0],
             meta.center[1]+offsetY,
             meta.center[2]+offsetX
           ];
         }

         const cell=addBox(parent,size,pos,meta.material);
         cell.castShadow=false;
         cell.receiveShadow=true;

         if(meta.material?.userData?.wallTexture==="brick_wall_08"){
           applyContinuousWallUV(cell);
         }

         cell.userData.materialType=meta.material?.userData?.wallTexture==="brick_wall_08" ? "brick" : "concrete";
         makeWallCell(cell,1);

         root.userData.dynamicBulletMeshes.push(cell);
         root.userData.dynamicCollisionMeshes.push(cell);

         const dx=pos[0]-localHit.x;
         const dy=pos[1]-localHit.y;
         const dz=pos[2]-localHit.z;
         const d=dx*dx+dy*dy+dz*dz;

         if(d<firstDist){
           firstDist=d;
           firstCell=cell;
         }
       }
     }

     // The activation shot becomes the first damage event on the exact local cell.
     firstCell?.userData?.onBulletHit?.({
       point:hitPoint.clone(),
       direction:direction.clone(),
       damage,
       source
     });
   };

   for(let c=0;c<cols;c++){
     for(let r=0;r<rows;r++){
       const localX=-width/2+actualPW*(c+.5);
       const localY=actualPH*(r+.5);

       // Skip coarse panels fully centered inside the doorway.
       if(
         doorway &&
         localX>doorway.minX &&
         localX<doorway.maxX &&
         localY<doorway.maxY
       ){
         continue;
       }

       let size,pos;

       if(axis==="z"){
         size=[actualPW,actualPH,thickness];
         pos=[center[0]+localX,center[1]+localY,center[2]];
       }else{
         size=[thickness,actualPH,actualPW];
         pos=[center[0],center[1]+localY,center[2]+localX];
       }

       const panel=addBox(parent,size,pos,material);
       panel.castShadow=false;
       panel.receiveShadow=true;

       if(material?.userData?.wallTexture==="brick_wall_08"){
         applyContinuousWallUV(panel);
       }
       panel.userData.materialType=material?.userData?.wallTexture==="brick_wall_08" ? "brick" : "concrete";
       panel.userData.blocksBullets=true;
       panel.userData.isBuildingWall=true;
       panel.userData.lazyDestructiblePanel=true;
       panel.userData.activated=false;
       panel.userData.meleeIntegrity=3.6;
       panel.userData.lazyPanel={
         width:actualPW,
         height:actualPH,
         thickness,
         center:pos,
         axis,
         material
       };

       panel.userData.onBulletHit=({point,direction,damage=1,source="bullet"})=>{
         if(source==="melee"){
           panel.userData.meleeIntegrity=Math.max(0,(panel.userData.meleeIntegrity??3.0)-damage);
           if(panel.userData.meleeIntegrity>0){
             // Intact panels stay cheap while melee produces only tiny pooled chips.
             spawnWallDebris(panel,point,direction,Math.random()<.45?1:0);
             return {chipped:true,melee:true};
           }
         }
         activatePanel(panel,point,direction,damage,source);
         return {activated:true,melee:source==="melee"};
       };
     }
   }
 }

 function updateWallDebris(dt){
   for(let i=activeWallDebris.length-1;i>=0;i--){
     const d=activeWallDebris[i];
     if(!d.active){
       activeWallDebris.splice(i,1);
       continue;
     }

     d.life-=dt;
     d.vel.y-=9.8*dt;
     d.mesh.position.addScaledVector(d.vel,dt);
     d.mesh.rotation.x+=d.spin.x*dt;
     d.mesh.rotation.y+=d.spin.y*dt;
     d.mesh.rotation.z+=d.spin.z*dt;

     if(d.life<=0){
       d.active=false;
       d.mesh.visible=false;
       d.mesh.scale.set(1,1,1);
       activeWallDebris.splice(i,1);
     }
   }

   root.userData.fractureStats.debrisActive=activeWallDebris.length;
 }
 root.name="TitanSandboxDistrict";

 const asphalt=mat(0x272c30,{roughness:.96});
 const sidewalk=mat(0x686e72,{roughness:.92});
 const concrete=mat(0x5d6265,{roughness:.9});
 const concreteDark=mat(0x44494c,{roughness:.92});
 const brick=new THREE.MeshStandardMaterial({
   color:0xd0ccc4,
   map:brickWall08Color,
   roughness:.90,
   metalness:0
 });
 brick.userData.wallTexture="brick_wall_08";
 const metal=mat(0x343a3f,{roughness:.46,metalness:.62});
 const rust=mat(0x633d2a,{roughness:.74,metalness:.30});
 const glass=mat(0x263942,{roughness:.18,metalness:.18,emissive:0x071119,emissiveIntensity:.25});
 const grass=mat(0x526348,{roughness:1});
 const dirt=mat(0x665b47,{roughness:1});
 const treeGreen=mat(0x214b2a,{roughness:1});
 const trunk=mat(0x59402c,{roughness:1});
 const neon=mat(0xff9d28,{roughness:.25,metalness:.15,emissive:0xff5d0a,emissiveIntensity:1.8});

 // Large base.
 const ground=new THREE.Mesh(
   new THREE.PlaneGeometry(900,900),
   grass
 );
 ground.rotation.x=-Math.PI/2;
 ground.receiveShadow=true;
 root.add(ground);

 // CITY GRID — 5 north/south streets, 4 cross streets.
 const ns=[-120,-60,0,60,120];
 const ew=[-155,-95,-35,25];

 for(const x of ns){
   const road=new THREE.Mesh(
     new THREE.PlaneGeometry(13,390),
     asphalt
   );
   road.rotation.x=-Math.PI/2;
   road.position.set(x,.025,-55);
   root.add(road);
 }

 for(const z of ew){
   const road=new THREE.Mesh(
     new THREE.PlaneGeometry(300,13),
     asphalt
   );
   road.rotation.x=-Math.PI/2;
   road.position.set(0,.027,z);
   root.add(road);
 }

 // sidewalks define readable blocks
 for(let gx=-2;gx<=1;gx++){
   for(let gz=-3;gz<=0;gz++){
     const cx=-90+gx*60;
     const cz=-125+gz*60;
     addBox(root,[46,.14,46],[cx,.07,cz],sidewalk);
   }
 }

 function building(x,z,w,d,h,material=concrete,doorSide=1){
   const g=new THREE.Group();
   g.position.set(x,0,z);
   root.add(g);

   const wt=.68;
   const doorWidth=Math.max(3.2,w*.20);
   const doorHeight=Math.min(4.6,h*.50);
   const frontZ=doorSide*(d/2-wt/2);
   const backZ=-doorSide*(d/2-wt/2);

   const floor=addBox(g,[w,.24,d],[0,.12,0],concreteDark);
   floor.userData.blocksBullets=true;

   const roof=addBox(g,[w,.38,d],[0,h-.19,0],material);
   roof.userData.blocksBullets=true;

   wallGrid(g,{
     width:w,height:h,thickness:wt,
     center:[0,0,frontZ],
     material,
     axis:"z",
     doorway:{minX:-doorWidth/2,maxX:doorWidth/2,maxY:doorHeight}
   });

   wallGrid(g,{
     width:w,height:h,thickness:wt,
     center:[0,0,backZ],
     material,
     axis:"z"
   });

   wallGrid(g,{
     width:d,height:h,thickness:wt,
     center:[-(w/2-wt/2),0,0],
     material,
     axis:"x"
   });

   wallGrid(g,{
     width:d,height:h,thickness:wt,
     center:[(w/2-wt/2),0,0],
     material,
     axis:"x"
   });

   const frameDepth=wt+.16;
   const frameL=addBox(g,[.18,doorHeight,frameDepth],[-doorWidth/2,doorHeight/2,frontZ],metal);
   const frameR=addBox(g,[.18,doorHeight,frameDepth],[doorWidth/2,doorHeight/2,frontZ],metal);
   const frameT=addBox(g,[doorWidth,.18,frameDepth],[0,doorHeight,frontZ],metal);

   for(const f of [frameL,frameR,frameT]){
     f.userData.blocksBullets=true;
     f.userData.materialType="metal";
   }

   const roomLight=new THREE.PointLight(0xffe2b0,.48,Math.max(w,d)*.82,2);
   roomLight.position.set(0,Math.min(3.0,h*.33),0);
   g.add(roomLight);

   if(h>9){
     const unitA=addBox(g,[w*.18,1.1,d*.20],[-w*.22,h+.55,d*.12],metal);
     const unitB=addBox(g,[w*.13,.65,d*.13],[w*.24,h+.33,-d*.18],metal);
     unitA.userData.blocksBullets=true;
     unitB.userData.blocksBullets=true;
   }

   return g;
 }

 // Dense city blocks.
 building(-90,-125,38,34,16,brick);
 building(-30,-125,42,34,12,concrete);
 building(30,-125,38,36,19,concreteDark);
 building(90,-125,42,34,14,brick);

 building(-90,-65,40,36,11,concrete);
 building(-30,-65,40,36,17,concreteDark);
 building(30,-65,40,36,13,brick);
 building(90,-65,40,36,18,concrete);

 building(-90,-5,38,36,14,brick);
 building(-30,-5,42,36,10,concrete);
 building(90,-5,42,36,12,concreteDark);

 building(-90,55,40,36,11,concreteDark);
 building(-30,55,40,36,15,brick);
 building(30,55,40,36,12,concrete);
 building(90,55,40,36,10,brick);

 // VOIDROOM NIGHTCLUB — opens to central street.
 const club=new THREE.Group();

 // Hollow VOIDROOM shell with destructible cells.
 const cw=42, cd=36, ch=11, cwt=.72, cdoor=13, cdoorH=6.2;

 const cFloor=addBox(club,[cw,.24,cd],[0,.12,0],concreteDark);
 cFloor.userData.blocksBullets=true;
 const cRoof=addBox(club,[cw,.36,cd],[0,ch-.18,0],brick);
 cRoof.userData.blocksBullets=true;

 wallGrid(club,{
   width:cw,height:ch,thickness:cwt,
   center:[0,0,(cd/2-cwt/2)],
   material:brick,
   axis:"z",
   doorway:{minX:-cdoor/2,maxX:cdoor/2,maxY:cdoorH}
 });

 wallGrid(club,{
   width:cw,height:ch,thickness:cwt,
   center:[0,0,-(cd/2-cwt/2)],
   material:brick,
   axis:"z"
 });

 wallGrid(club,{
   width:cd,height:ch,thickness:cwt,
   center:[-(cw/2-cwt/2),0,0],
   material:brick,
   axis:"x"
 });

 wallGrid(club,{
   width:cd,height:ch,thickness:cwt,
   center:[(cw/2-cwt/2),0,0],
   material:brick,
   axis:"x"
 });

 const interiorAccent=addBox(
   club,[13,6,.35],[0,3.0,15.4],
   mat(0x08090a,{roughness:.7})
 );
 interiorAccent.userData.blocksBullets=true;
 addBox(club,[16,.65,.55],[0,7.6,18.4],neon);

 // sign
 const signCanvas=document.createElement("canvas");
 signCanvas.width=768; signCanvas.height=180;
 const sx=signCanvas.getContext("2d");
 sx.fillStyle="#08090a"; sx.fillRect(0,0,768,180);
 sx.strokeStyle="#ff9b20"; sx.lineWidth=8; sx.strokeRect(7,7,754,166);
 sx.fillStyle="#ffb234"; sx.font="900 78px Arial"; sx.textAlign="center";
 sx.fillText("VOIDROOM",384,116);
 const signTex=new THREE.CanvasTexture(signCanvas);
 signTex.colorSpace=THREE.SRGBColorSpace;

 const clubSign=new THREE.Mesh(
   new THREE.PlaneGeometry(8.6,2.0),
   new THREE.MeshBasicMaterial({map:signTex})
 );
 clubSign.position.set(0,8.0,18.72);
 club.add(clubSign);

 club.position.set(30,0,-5);
 root.add(club);

 // glowing entry lights
 for(const x of [-4.8,4.8]){
   const lamp=new THREE.PointLight(0xff6c1a,18,12,1.8);
   lamp.position.set(30+x,4.4,14.5);
   root.add(lamp);
 }

 // Posters on multiple walls, one is close to default route.
 addPoster(root,[-53,2.0,-106.7],0,"voidroom_flyer_01");
 addPoster(root,[8.0,2.0,-47.0],Math.PI,"voidroom_flyer_02");
 addPoster(root,[78.0,2.0,13.1],0,"voidroom_flyer_03");

 // Alley details: dumpsters, barriers, crates.
 for(const [x,z] of [
   [-55,-118],[-55,-83],[55,-112],[55,-74],
   [-116,-52],[-70,-42],[70,-42],[116,-22],
   [-20,12],[14,13],[48,13]
 ]){
   addBox(root,[3.4,1.6,1.8],[x,.8,z],metal,Math.random()*.5);
 }

 for(let i=0;i<28;i++){
   const x=-135+Math.random()*270;
   const z=-170+Math.random()*235;
   if(Math.abs(x%60)<9 || Math.abs((z+35)%60)<9)continue;
   addBox(root,[1.7+Math.random()*.9,1.6+Math.random()*.9,1.7+Math.random()*.9],
     [x,1.0,z],rust,Math.random());
 }

 // =======================================================
 // PASS 13 — ORGANIC COUNTRYSIDE / CURVED ROAD / OLD MERCY
 // Real heightfield + curved road. No rotated-box ramps.
 // =======================================================
 const worldRng=titanSeeded(0x0D4D4E);
 const countryCurve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(92,0,20),new THREE.Vector3(126,0,24),
  new THREE.Vector3(166,0,15),new THREE.Vector3(205,0,-8),
  new THREE.Vector3(250,0,-21),new THREE.Vector3(286,0,10),
  new THREE.Vector3(316,0,52),new THREE.Vector3(337,0,88),
  new THREE.Vector3(365,0,116)
 ],false,"catmullrom",.46);

 function countryRoadDistance(x,z){
  let best=999;
  for(let i=0;i<=100;i++){const p=countryCurve.getPoint(i/100);best=Math.min(best,Math.hypot(x-p.x,z-p.z));}
  return best;
 }
 function rawCountryHeight(x,z){
  if(x<96)return 0;
  const blend=titanSmoothstep(96,142,x);
  let h=((titanValueNoise(x*.021,z*.021)-.5)*6.6+(titanValueNoise(x*.052+7,z*.052-11)-.5)*2.4+Math.sin(x*.026)*1.25+Math.cos(z*.031)*.8)*blend;
  h+=titanSmoothstep(150,250,x)*Math.exp(-Math.pow((z-67)/62,2))*2.1;
  const cemeteryD=Math.hypot((x-327)/1.25,z-91);h-=Math.max(0,1-cemeteryD/70)*1.15;
  return h;
 }
 function organicHeightAt(x,z){
  let h=rawCountryHeight(x,z);
  const rd=countryRoadDistance(x,z);
  if(rd<8.2){
   let nearest=null,best=1e9;
   for(let i=0;i<=80;i++){const p=countryCurve.getPoint(i/80),d=Math.hypot(x-p.x,z-p.z);if(d<best){best=d;nearest=p;}}
   if(nearest){const roadH=rawCountryHeight(nearest.x,nearest.z)*.76;h=THREE.MathUtils.lerp(h,roadH,(1-titanSmoothstep(3.2,8.2,rd))*.86);}
  }
  const dx=(x-327)/48,dz=(z-91)/38,e=Math.sqrt(dx*dx+dz*dz);
  if(e<1.28){const center=rawCountryHeight(327,91)*.60-.55;h=THREE.MathUtils.lerp(h,center,(1-titanSmoothstep(.82,1.28,e))*.92);}
  return h;
 }
 root.userData.heightAt=organicHeightAt;
 root.userData.countryRoadDistance=countryRoadDistance;

 const terrainGeo=new THREE.PlaneGeometry(330,300,132,104);terrainGeo.rotateX(-Math.PI/2);
 const pos=terrainGeo.attributes.position,colors=[],cx=257,cz=25;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i)+cx,z=pos.getZ(i)+cz,h=organicHeightAt(x,z);pos.setY(i,h);
  const moisture=titanValueNoise(x*.062,z*.062),nearRoad=countryRoadDistance(x,z),c=new THREE.Color(nearRoad<7.5?0x625845:(moisture>.63?0x3d4937:0x4b543f));
  c.offsetHSL((moisture-.5)*.018,0,(moisture-.5)*.05);colors.push(c.r,c.g,c.b);
 }
 terrainGeo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.position.set(cx,0,cz);terrain.receiveShadow=true;root.add(terrain);

 const pts=countryCurve.getSpacedPoints(220),rv=[],ru=[],ri=[],half=5;
 for(let i=0;i<pts.length;i++){
  const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],tan=next.clone().sub(prev).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x);
  for(const s of [-1,1]){const q=p.clone().addScaledVector(side,half*s);q.y=organicHeightAt(q.x,q.z)+.045;rv.push(q.x,q.y,q.z);ru.push(i/10,(s+1)/2);}
 }
 for(let i=0;i<pts.length-1;i++){const a=i*2;ri.push(a,a+2,a+1,a+2,a+3,a+1);}
 const rg=new THREE.BufferGeometry();rg.setAttribute("position",new THREE.Float32BufferAttribute(rv,3));rg.setAttribute("uv",new THREE.Float32BufferAttribute(ru,2));rg.setIndex(ri);rg.computeVertexNormals();
 const road=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({color:0x34383a,roughness:.96}));road.receiveShadow=true;root.add(road);

 // Seeded organic forest clusters, instanced for performance.
 const tg=new THREE.CylinderGeometry(.22,.38,3.4,7),cg=new THREE.IcosahedronGeometry(1.35,1),tm=mat(0x493427,{roughness:1}),cm=new THREE.MeshStandardMaterial({color:0x344438,roughness:1,flatShading:true});
 const trees=[];let tries=0;
 while(trees.length<185&&tries++<2200){
  const x=110+worldRng()*285,z=-125+worldRng()*275;
  if(countryRoadDistance(x,z)<11||Math.hypot((x-327)/1.15,z-91)<63||(x>214&&x<278&&z>-68&&z<-20)||titanValueNoise(x*.035,z*.035)<.43)continue;
  trees.push({x,z,y:organicHeightAt(x,z),s:.78+worldRng()*.72,r:worldRng()*Math.PI*2});
 }
 const trunks=new THREE.InstancedMesh(tg,tm,trees.length),crowns=new THREE.InstancedMesh(cg,cm,trees.length*3),dummy=new THREE.Object3D();let ci=0;
 trees.forEach((p,i)=>{
  dummy.position.set(p.x,p.y+1.7*p.s,p.z);dummy.rotation.set(0,p.r,0);dummy.scale.setScalar(p.s);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(const [ox,oy,sc] of [[0,3.7,1.15],[-.58,4.25,.86],[.55,4.18,.82]]){dummy.position.set(p.x+ox*p.s,p.y+oy*p.s,p.z);dummy.rotation.set(0,p.r,0);dummy.scale.setScalar(sc*p.s);dummy.updateMatrix();crowns.setMatrixAt(ci++,dummy.matrix);}
 });
 trunks.castShadow=trunks.receiveShadow=true;crowns.castShadow=crowns.receiveShadow=true;root.add(trunks,crowns);

 // Rural checkpoint stays a landmark, but no artificial ramp/platform.
 const checkpointY=organicHeightAt(248,-44);
 const checkpointPad=new THREE.Mesh(new THREE.CylinderGeometry(25,29,Math.max(.4,checkpointY+.7),20),dirt);checkpointPad.position.set(248,Math.max(.1,checkpointY*.5-.12),-44);checkpointPad.scale.z=.72;checkpointPad.receiveShadow=true;root.add(checkpointPad);
 building(248,-44,34,28,10,concreteDark);

 // OLD MERCY follows terrain. No rectangular cemetery floor.
 const graveStone=mat(0x565a55,{roughness:1}),graveDark=mat(0x353936,{roughness:1}),deadWood=mat(0x3b2b24,{roughness:1});
 const cemeteryHeightAt=(lx,lz)=>organicHeightAt(327+lx,91+lz);
 for(let i=0;i<34;i++){
  const a=i/34*Math.PI*2;if(Math.abs(Math.sin(a))<.15||(a>2.50&&a<2.82))continue;
  const rx=43+(worldRng()-.5)*3,rz=31+(worldRng()-.5)*2.5,lx=Math.cos(a)*rx,lz=Math.sin(a)*rz;
  const m=addBox(root,[5.4,1.25,.85],[327+lx,cemeteryHeightAt(lx,lz)+.625,91+lz],graveStone,-a+Math.PI/2);m.userData.blocksBullets=true;m.userData.isBuildingWall=true;
 }
 for(let row=0;row<6;row++)for(let col=0;col<9;col++){
  if(worldRng()<.13)continue;
  const lx=-32+col*8+(row%2)*1.1+(worldRng()-.5)*1.2,lz=-22+row*8.4+Math.sin(col/8*Math.PI)*1.8+(worldRng()-.5);
  if(Math.hypot(lx,lz)<9)continue;
  const h=1+worldRng()*.65,wid=.55+worldRng()*.30,m=addBox(root,[wid,h,.30],[327+lx,cemeteryHeightAt(lx,lz)+h*.5,91+lz],(row+col)%4===0?graveDark:graveStone,(worldRng()-.5)*.26);
  m.rotation.z=(worldRng()-.5)*.12;m.userData.blocksBullets=true;
 }
 const mx=327,mz=98,my=organicHeightAt(mx,mz),maus=new THREE.Group();maus.position.set(mx,my,mz);root.add(maus);
 addBox(maus,[14,.32,11],[0,.16,0],graveDark);
 for(const [x,z,wid,dep] of [[0,-5.2,14,.65],[0,5.2,14,.65],[-6.7,0,.65,11],[6.7,0,.65,11]]){const wall=addBox(maus,[wid,5.2,dep],[x,2.6,z],graveStone);wall.userData.blocksBullets=true;wall.userData.isBuildingWall=true;}
 addBox(maus,[15,.65,12],[0,5.55,0],graveDark);
 for(const [lx,lz,sc] of [[-37,-23,1.1],[34,-19,.9],[-39,21,1.2],[30,27,1],[-17,28,.85],[21,-28,1.15]]){
  const y=cemeteryHeightAt(lx,lz),tr=addBox(root,[.48*sc,5.5*sc,.48*sc],[327+lx,y+2.75*sc,91+lz],deadWood,(worldRng()-.5)*.38);tr.rotation.z=(worldRng()-.5)*.10;
  for(const sx of [-1,1]){const br=addBox(root,[2.7*sc,.18,.18],[327+lx+sx*.9*sc,y+4.2*sc,91+lz],deadWood,sx*.42);br.rotation.z=sx*.42+(worldRng()-.5)*.12;}
 }
 const occultLight=new THREE.PointLight(0x6f24b8,18,38,2);occultLight.position.set(327,organicHeightAt(327,95)+4,95);root.add(occultLight);
 const moonWell=new THREE.PointLight(0x46668c,9,70,2);moonWell.position.set(309,organicHeightAt(309,81)+8,81);root.add(moonWell);
 root.userData.necromancerSpawn=new THREE.Vector3(327,organicHeightAt(327,99),99);
 root.userData.cemeteryCenter=new THREE.Vector3(327,organicHeightAt(327,91),91);

 // World hints used by the HUD.
 const hints=[];
 root.traverse(o=>{
   if(o.userData?.hint){
     hints.push({
       object:o,
       ...o.userData.hint
     });
   }
 });

 // Enemy/social spawn locations. Titans use these as hangout points.
 const spawnPoints=[
   {id:"VOIDROOM_DOOR",name:"VOIDROOM DOOR",position:new THREE.Vector3(24,0,17),yaw:Math.PI,behavior:"hangout"},
   {id:"VOIDROOM_ALLEY",name:"VOIDROOM ALLEY",position:new THREE.Vector3(49,0,-8),yaw:-Math.PI/2,behavior:"hangout"},
   {id:"BRICK_BLOCK",name:"BRICK BLOCK",position:new THREE.Vector3(-82,0,-45),yaw:.45,behavior:"patrol"},
   {id:"WAREHOUSE_09",name:"WAREHOUSE 09",position:new THREE.Vector3(85,0,-115),yaw:Math.PI*.8,behavior:"guard"},
   {id:"RURAL_CHECKPOINT",name:"RURAL CHECKPOINT",position:new THREE.Vector3(217,0,-17),yaw:-Math.PI/2,behavior:"guard"},
   {id:"TREE_LINE",name:"TREE LINE",position:new THREE.Vector3(184,0,98),yaw:Math.PI,behavior:"hangout"}
 ];

 // Place small orange "district beacons" on key locations for prototype navigation.
 for(const p of [
   {x:30,z:-5},
   {x:248,z:-44}
 ]){
   const light=new THREE.PointLight(0xff7a1a,10,22,2);
   light.position.set(p.x,6,p.z);
   root.add(light);
 }

 // Optional environmental paper flyers.
 addWallPoster(root,"./assets/posters/poster.png",
   [-9.4,2.35,-5.0],[0,Math.PI/2,0],[1.18,1.66],
   {id:"poster_01",title:"SURVEY CORPS // DEVOUR TITANS"});
 addWallPoster(root,"./assets/posters/poster01.jpg",
   [30.0,2.45,-21.7],[0,0,0],[1.18,1.66],
   {id:"poster_02",title:"NIGHT DISTRICT // POSTER 02"});

 // One grounded in-world media screen inside VOIDROOM.
 const mediaScreens=[
   new WorldVideoScreen(root,{
     id:"voidroom_screen_01",
     src:"",
     position:[30,3.65,-22.22],
     rotation:[0,0,0],
     size:[5.1,2.87],
     audioListener,
     activationRadius:34
   })
 ];

 // First physical PBR greatsword pickup.
 const swordPickup=createTitanGreatsword();
 swordPickup.scale.setScalar(.72);
 swordPickup.position.set(35.2,.62,-13.0);
 swordPickup.rotation.set(0,.45,Math.PI/2);
 swordPickup.userData.worldPickup={
   type:"greatsword",
   id:"titan_greatsword_mk1",
   label:"TITAN GREATSWORD // MK I"
 };
 root.add(swordPickup);

 const collectiblePosters=[];
 root.traverse(o=>{
   if(o.userData?.collectiblePoster)collectiblePosters.push(o);
 });

 scene.add(root);

 return{
   root,
   spawnPoints,
   hints,
   collectiblePosters,
   swordPickup,
   mediaScreens,
   update(dt,playerPosition=null){
     updateWallDebris(dt);
     if(playerPosition){
       for(const screen of mediaScreens)screen.update(playerPosition);
     }
   },
   locations:[
     {name:"VOIDROOM",position:new THREE.Vector3(30,0,-5),radius:34},
     {name:"WAREHOUSE DISTRICT",position:new THREE.Vector3(70,0,-105),radius:60},
     {name:"OLD BLOCKS",position:new THREE.Vector3(-75,0,-55),radius:78},
     {name:"COUNTRYSIDE",position:new THREE.Vector3(220,0,45),radius:120},
     {name:"OLD MERCY CEMETERY",position:new THREE.Vector3(325,0,92),radius:72}
   ],
   getLocationName(position){
     let best={name:"CITY EDGE",d:Infinity};
     for(const l of this.locations){
       const d=position.distanceTo(l.position);
       if(d<best.d && d<l.radius){
         best={name:l.name,d};
       }
     }
     return best.name;
   },
   getNearbyHint(position,maxDistance=5.2){
     let result=null;
     let best=maxDistance;
     for(const h of hints){
       const wp=new THREE.Vector3();
       h.object.getWorldPosition(wp);
       const d=wp.distanceTo(position);
       if(d<best){
         best=d;
         result=h;
       }
     }
     return result;
   }
 };
}
