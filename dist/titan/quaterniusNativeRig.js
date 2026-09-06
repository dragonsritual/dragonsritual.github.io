import * as THREE from "three";
import { FBXLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/FBXLoader.js";

// PROJECT TITAN PASS 19 — native rig foot-ground calibration.
// No retargeting. No copied bone rotations. The Quaternius SWAT rig plays its own
// animation library and is fitted automatically to the already-proven TITAN body bounds.
export class QuaterniusNativeRig {
  constructor(parent,{modelUrl,animationsUrl,referenceObject=null,faceYaw=Math.PI,diagnostics=true}={}){
    this.parent=parent;
    this.modelUrl=modelUrl;
    this.animationsUrl=animationsUrl;
    this.referenceObject=referenceObject;
    this.faceYaw=faceYaw;
    this.diagnostics=diagnostics;
    this.root=new THREE.Group();
    this.root.name="QUATERNIUS_NATIVE_RIG_CALIBRATED";
    this.root.visible=false;
    parent.add(this.root);
    this.model=null;
    this.mixer=null;
    this.actions=new Map();
    this.currentAction=null;
    this.currentName="";
    this.ready=false;
    this.metrics={};
    this._diag=null;
  }

  _boundsInParent(object){
    this.parent.updateMatrixWorld(true);
    object.updateMatrixWorld(true);
    const worldBox=new THREE.Box3().setFromObject(object);
    if(worldBox.isEmpty()) return null;
    const inv=new THREE.Matrix4().copy(this.parent.matrixWorld).invert();
    const min=worldBox.min,max=worldBox.max;
    const points=[];
    for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
      points.push(new THREE.Vector3(x,y,z).applyMatrix4(inv));
    }
    return new THREE.Box3().setFromPoints(points);
  }

  _ensureDiagnostics(){
    if(!this.diagnostics||typeof document==="undefined"||this._diag)return;
    const el=document.createElement("div");
    el.id="titan-native-rig-diagnostic";
    Object.assign(el.style,{
      position:"fixed",left:"12px",bottom:"54px",zIndex:"99999",
      padding:"8px 10px",background:"rgba(4,12,16,.86)",color:"#83e9ff",
      border:"1px solid rgba(83,214,239,.55)",font:"700 11px/1.35 monospace",
      pointerEvents:"none",whiteSpace:"pre",textShadow:"0 1px 2px #000"
    });
    document.body.appendChild(el);this._diag=el;
  }

  _writeDiagnostics(extra=""){
    if(!this._diag)return;
    const m=this.metrics;
    this._diag.textContent=
`NATIVE RIG // PASS 19\nSTATUS  ${this.ready?"READY":"LOADING"}\nSRC H   ${(m.sourceHeight||0).toFixed(3)}\nTGT H   ${(m.targetHeight||0).toFixed(3)}\nSCALE   ${(m.scale||0).toFixed(5)}\nFOOT Y  ${(m.footY??0).toFixed(3)}\nGROUND  ${(m.groundY??0).toFixed(3)}\nCLIPS   ${this.actions.size}\nPLAY    ${this.currentName||"--"}${extra?"\n"+extra:""}`;
  }

  _findBone(names){
    if(!this.model)return null;
    const wanted=names.map(n=>n.toLowerCase());
    let found=null;
    this.model.traverse(o=>{
      if(found||!o.isBone)return;
      const n=(o.name||"").toLowerCase();
      if(wanted.includes(n))found=o;
    });
    return found;
  }

  _pointInParent(object,out=new THREE.Vector3()){
    object.getWorldPosition(out);
    return this.parent.worldToLocal(out);
  }

  _groundFromFeet(targetGroundY){
    const lf=this._findBone(["Foot.L","LeftFoot","mixamorigLeftFoot"]);
    const rf=this._findBone(["Foot.R","RightFoot","mixamorigRightFoot"]);
    if(!lf&&!rf)return false;
    this.parent.updateMatrixWorld(true);
    const ys=[];
    if(lf)ys.push(this._pointInParent(lf,new THREE.Vector3()).y);
    if(rf)ys.push(this._pointInParent(rf,new THREE.Vector3()).y);
    if(!ys.length)return false;
    // Foot bones sit slightly above the actual sole. Use a small character-scaled sole drop.
    const footY=Math.min(...ys);
    const soleDrop=(this.metrics.targetHeight||3.18)*0.035;
    this.model.position.y += targetGroundY-(footY-soleDrop);
    this.parent.updateMatrixWorld(true);
    this.metrics.footY=footY;
    this.metrics.groundY=targetGroundY;
    this.metrics.soleDrop=soleDrop;
    return true;
  }

  async load(){
    this._ensureDiagnostics();this._writeDiagnostics();
    const loader=new FBXLoader();
    const [model,animationSource]=await Promise.all([
      loader.loadAsync(this.modelUrl),loader.loadAsync(this.animationsUrl)
    ]);

    this.model=model; model.name="QUATERNIUS_SWAT_NATIVE";
    model.rotation.set(0,this.faceYaw,0);
    model.position.set(0,0,0); model.scale.setScalar(1);
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;
      // Slight proof-lighting lift so the native mesh cannot read as a black silhouette.
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const mat of mats){
        if(!mat)continue;
        if(mat.clone){
          const c=mat.clone();
          if(c.color)c.color.multiplyScalar(1.22);
          if("roughness" in c)c.roughness=Math.min(.9,c.roughness??.8);
          o.material=Array.isArray(o.material)?o.material.map((x,i)=>i===mats.indexOf(mat)?c:x):c;
        }
      }
    });
    this.root.add(model);
    this.root.visible=true;
    this.parent.updateMatrixWorld(true);

    // Measure source in parent-local coordinates AFTER authored facing rotation.
    let sourceBox=this._boundsInParent(model);
    const sourceHeight=Math.max(.0001,sourceBox?.getSize(new THREE.Vector3()).y||1);

    // Use the current working TITAN mannequin as the calibration volume. This removes
    // guessed "2.06m" assumptions and automatically matches the camera/body relationship.
    let targetBox=this.referenceObject?this._boundsInParent(this.referenceObject):null;
    if(!targetBox){
      targetBox=new THREE.Box3(new THREE.Vector3(-.55,.42,-.35),new THREE.Vector3(.55,3.05,.35));
    }
    const targetSize=targetBox.getSize(new THREE.Vector3());
    const targetHeight=Math.max(.1,targetSize.y);
    const scale=targetHeight/sourceHeight;
    model.scale.setScalar(scale);
    this.parent.updateMatrixWorld(true);

    // Re-measure, then align soles AND horizontal center to the proven mannequin.
    sourceBox=this._boundsInParent(model);
    const srcCenter=sourceBox.getCenter(new THREE.Vector3());
    const tgtCenter=targetBox.getCenter(new THREE.Vector3());
    model.position.x+=tgtCenter.x-srcCenter.x;
    model.position.z+=tgtCenter.z-srcCenter.z;
    model.position.y+=targetBox.min.y-sourceBox.min.y;
    this.parent.updateMatrixWorld(true);

    const finalBox=this._boundsInParent(model);
    this.metrics={
      sourceHeight,targetHeight,scale,
      finalHeight:finalBox?.getSize(new THREE.Vector3()).y||0,
      targetMinY:targetBox.min.y,finalMinY:finalBox?.min.y||0
    };

    this.mixer=new THREE.AnimationMixer(model);
    for(const sourceClip of animationSource.animations||[]){
      if(!sourceClip?.tracks?.length)continue;
      const clip=sourceClip.clone();
      // Player controller owns translation; keep the native authored rotations untouched.
      clip.tracks=clip.tracks.filter(track=>{
        const n=track.name.toLowerCase();
        return !(n.includes("characterarmature.position")||n.includes("root.position"));
      });
      const name=this._cleanName(sourceClip.name);
      const action=this.mixer.clipAction(clip,model);
      action.enabled=true;action.setLoop(THREE.LoopRepeat,Infinity);
      this.actions.set(name,action);
    }

    // PASS 19 deliberately proves ONE native idle first. Apply the actual pose once,
    // then ground from the animated foot bones instead of trusting FBX mesh bounds.
    this._playFirst(["Idle_Gun_Pointing","Idle_Gun","Idle_Neutral","Idle"],0,1);
    this.mixer.update(0);
    this.parent.updateMatrixWorld(true);
    this._groundFromFeet(targetBox.min.y);

    const groundedBox=this._boundsInParent(model);
    if(groundedBox){
      this.metrics.finalMinY=groundedBox.min.y;
      this.metrics.finalHeight=groundedBox.getSize(new THREE.Vector3()).y;
    }
    this.ready=true;this._writeDiagnostics();
    console.info("[TITAN PASS 19] Native rig calibrated",this.metrics,[...this.actions.keys()]);
    return this;
  }

  _cleanName(name=""){
    const p=name.lastIndexOf("|");
    return (p>=0?name.slice(p+1):name).replace(/\.tak$/i,"").trim();
  }
  _find(names){
    for(const n of names)if(this.actions.has(n))return [n,this.actions.get(n)];
    for(const n of names){
      const low=n.toLowerCase();
      const hit=[...this.actions.entries()].find(([key])=>key.toLowerCase().includes(low));
      if(hit)return hit;
    }
    return null;
  }
  _playFirst(names,fade=.14,timeScale=1){
    const hit=this._find(names);if(!hit)return false;
    const [name,next]=hit;
    if(this.currentAction===next){next.timeScale=timeScale;return true;}
    next.reset().setEffectiveWeight(1).play();next.timeScale=timeScale;
    if(this.currentAction){if(fade>0)this.currentAction.crossFadeTo(next,fade,false);else this.currentAction.stop();}
    this.currentAction=next;this.currentName=name;this._writeDiagnostics();return true;
  }
  update(dt){
    if(!this.ready||!this.mixer)return;
    this.mixer.update(Math.min(dt,.05));
    this._writeDiagnostics();
  }
}
