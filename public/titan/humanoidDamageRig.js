// PROJECT TITAN — Humanoid Damage Rig v1
// Anatomical classification layer for localized hit reactions/dismemberment.
// Keeps gameplay parent zones compatible with the existing Titan damage system.
export const TITAN_ANATOMY = Object.freeze({
  head:{parent:"head",label:"HEAD",severRoot:"head"},
  neck:{parent:"head",label:"NECK",severRoot:"head"},
  chest:{parent:"chest",label:"CHEST",severRoot:"torsoUpper"},
  abdomen:{parent:"body",label:"ABDOMEN",severRoot:"torsoLower"},
  pelvis:{parent:"body",label:"PELVIS",severRoot:"torsoLower"},
  leftUpperArm:{parent:"leftArm",label:"LEFT UPPER ARM",severRoot:"leftArm"},
  leftForearm:{parent:"leftArm",label:"LEFT FOREARM",severRoot:"leftArm"},
  leftHand:{parent:"leftArm",label:"LEFT HAND",severRoot:"leftArm"},
  rightUpperArm:{parent:"rightArm",label:"RIGHT UPPER ARM",severRoot:"rightArm"},
  rightForearm:{parent:"rightArm",label:"RIGHT FOREARM",severRoot:"rightArm"},
  rightHand:{parent:"rightArm",label:"RIGHT HAND",severRoot:"rightArm"},
  leftThigh:{parent:"leftLeg",label:"LEFT THIGH",severRoot:"leftLeg"},
  leftKnee:{parent:"leftKnee",label:"LEFT KNEE",severRoot:"leftLeg"},
  leftShin:{parent:"leftLeg",label:"LEFT SHIN",severRoot:"leftLeg"},
  leftFoot:{parent:"leftLeg",label:"LEFT FOOT",severRoot:"leftLeg"},
  rightThigh:{parent:"rightLeg",label:"RIGHT THIGH",severRoot:"rightLeg"},
  rightKnee:{parent:"rightKnee",label:"RIGHT KNEE",severRoot:"rightLeg"},
  rightShin:{parent:"rightLeg",label:"RIGHT SHIN",severRoot:"rightLeg"},
  rightFoot:{parent:"rightLeg",label:"RIGHT FOOT",severRoot:"rightLeg"},
  core:{parent:"core",label:"CORE",severRoot:"torsoUpper"}
});

export function classifyTitanHit(titan,hit){
  const object=hit?.object;
  const coarse=object?.userData?.zone||"body";
  const p=hit?.point;
  if(!p || !titan?.group)return {anatomicalZone:coarse,parentZone:coarse,label:coarse.toUpperCase()};

  const local=titan.group.worldToLocal(p.clone());
  const y=local.y;
  let anatomicalZone=coarse;

  if(coarse==="head") anatomicalZone=y<2.82?"neck":"head";
  else if(coarse==="chest") anatomicalZone="chest";
  else if(coarse==="core") anatomicalZone="core";
  else if(coarse==="body") anatomicalZone=y>1.82?"abdomen":"pelvis";
  else if(coarse==="leftArm"||coarse==="rightArm"){
    const side=coarse==="leftArm"?"left":"right";
    // Existing procedural arm meshes carry stable part names assigned by Titan.
    const part=String(object?.userData?.anatomyPart||object?.name||"").toLowerCase();
    if(part.includes("hand")||part.includes("glove")) anatomicalZone=`${side}Hand`;
    else if(part.includes("fore")||y<1.72) anatomicalZone=`${side}Forearm`;
    else anatomicalZone=`${side}UpperArm`;
  }else if(coarse==="leftKnee"||coarse==="rightKnee") anatomicalZone=coarse;
  else if(coarse==="leftLeg"||coarse==="rightLeg"){
    const side=coarse==="leftLeg"?"left":"right";
    const part=String(object?.userData?.anatomyPart||object?.name||"").toLowerCase();
    if(part.includes("boot")||part.includes("foot")||y<.34) anatomicalZone=`${side}Foot`;
    else if(part.includes("lower")||part.includes("shin")||y<.92) anatomicalZone=`${side}Shin`;
    else anatomicalZone=`${side}Thigh`;
  }

  const def=TITAN_ANATOMY[anatomicalZone];
  return {
    anatomicalZone,
    parentZone:def?.parent||coarse,
    label:def?.label||anatomicalZone.toUpperCase(),
    severRoot:def?.severRoot||null,
    localPoint:local
  };
}
