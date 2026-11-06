/** Low-ready 2.0: author-guided, presentation-only, three-pass rifle fit.
 * No change to combat muzzle authority, IK bone lengths or inventory.
 * Validity (anatomy, real contact, HARD protection) comes before aesthetics.
 */
import * as THREE from 'three';
import {stockPocket} from './breach-anatomy.ts';
import {neutralMannequinWrist} from './operator-mannequin-pose.ts';
import {solveTwoBone,ARM_LIMITS,type LimbSolution} from './breach-ik.ts';
import {assessLowReadyArm,assessLowReadyPair} from './breach-low-ready-anatomy.ts';
import {lowReadyArchetype,LOW_READY_PASSES,type LowReadyPass}
 from './breach-low-ready-archetypes.ts';
import {riflePoseContacts,supportContactAt,
 type RiflePoint} from './breach-weapon-contact-zones.ts';
import {evaluateSleeveArmorContact,segmentArmorPenetration,
 type PoseClearanceEnvelope,type SleeveContactResult}
 from './breach-pose-clearance-envelope.ts';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WeaponFit} from './breach-weapon-pose.ts';

export type CoupledStatus='clear'|'guard-fallback'|'unresolved';
export type LowReadyPoseMode='standard-two-hand'|'compressed-two-hand'|
 'deep-two-hand'|'one-hand-guard';
export type CoupledLowReadySolution={
 status:CoupledStatus;mode:LowReadyPoseMode;fit:WeaponFit;
 arms:[LimbSolution,LimbSolution];penetration:number;
 softContact:number;quality:number;
 supportFraction:number;candidates:number;
};
export type CoupledInput={
 weapon:WeaponId;configuration:WeaponConfiguration;
 shoulders:[THREE.Vector3,THREE.Vector3];
 armor:PoseClearanceEnvelope;nominalYaw:number;
 /** Optional explicit replay-recorded prior bend (never implicit frame state). */
 previousBends?:readonly [THREE.Vector3,THREE.Vector3];
 onDiagnostics?:(stats:Record<string,number>)=>void;
 onCandidate?:(sample:{right:number;left:number;receiver:number;depth:number;
  leftJoint:RiflePoint;leftWrist:RiflePoint;stock:RiflePoint})=>void;
};
type SolvedArm={pose:LimbSolution;quality:number;contact:SleeveContactResult};
const ptr=(v:THREE.Vector3):RiflePoint=>({x:v.x,y:v.y,z:v.z});
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
/** Even when shoulder-wrist separation is nearly straight, the local circle
 * is defined deterministically from a fixed basis, not previous render frame.
 */
function elbowCircle(shoulder:THREE.Vector3,wrist:THREE.Vector3){
 const axis=wrist.clone().sub(shoulder).normalize();
 const ref=Math.abs(axis.y)<.90?
  new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);
 ref.addScaledVector(axis,-ref.dot(axis)).normalize();
 const side=new THREE.Vector3().crossVectors(axis,ref).normalize();
 const result:THREE.Vector3[]=[];
 for(let i=0;i<24;i++){
  const a=2*Math.PI*i/24;
  result.push(ref.clone().multiplyScalar(Math.cos(a))
   .addScaledVector(side,Math.sin(a)));
 }
 return result;
}
/** Kept for callers that inspect legacy scalar elbow scores. Upward or
 * excessively winged elbows are invalid, not a soft scoring opportunity.
 */
export function relaxedArmShapeCost(
 shoulder:THREE.Vector3,joint:THREE.Vector3,side:-1|1):number{
 const drop=shoulder.y-joint.y,flare=side*(joint.z-shoulder.z);
 if(drop<.35||flare>5.5)return Infinity;
 return Math.abs(drop-(side===1?5.7:5.2))*.24+
  Math.max(0,flare-(side===1?1.6:1.9))*.52;
}
function selectArm(shoulder:THREE.Vector3,wrist:THREE.Vector3,
 side:-1|1,env:PoseClearanceEnvelope,softScale:number,
 previous?:THREE.Vector3,stats?:Record<string,number>):SolvedArm|null{
 // Evaluate every anatomically valid candidate when heavy gear is present:
 // culling after the eight prettiest elbow directions falsely made flak
 // wearers incapable of holding a rifle. The search is still pose-cached.
 const anatomical:{pose:LimbSolution;score:number}[]=[];
 for(const pole of elbowCircle(shoulder,wrist)){
  const limb=solveTwoBone(shoulder,wrist,10,10,pole,ARM_LIMITS);
  if(!limb.reached)continue;
  const shape=assessLowReadyArm(shoulder,limb.joint,limb.effector,
   side,limb.angle);
  if(!shape.valid)continue;
  if(stats)stats.rightAnatomical=(stats.rightAnatomical??0)+1;
  const continuity=previous?
   (1-clamp(limb.bendPlane.dot(previous),-1,1))*.12:0;
  anatomical.push({pose:limb,score:shape.score+continuity});
 }
 anatomical.sort((a,b)=>a.score-b.score);
 let best:SolvedArm|null=null,bestQuality=Infinity;
 for(const candidate of anatomical){
  const contact=evaluateSleeveArmorContact(shoulder,
   candidate.pose.joint,candidate.pose.effector,env,softScale);
  if(stats){
   stats.minimumRightHard=Math.min(stats.minimumRightHard??Infinity,
    contact.hardDepth);
   stats.minimumRightSoft=Math.min(stats.minimumRightSoft??Infinity,
    contact.softDepth);
   const worst=contact.contacts.reduce((m,c)=>Math.max(m,
    c.depth/Math.max(.001,c.allowed)),0);
   stats.minimumRightRatio=Math.min(stats.minimumRightRatio??Infinity,worst);
  }
  if(!contact.valid)continue;
  const quality=candidate.score+contact.quality*.09;
  if(quality<bestQuality){
   bestQuality=quality;
   best={pose:candidate.pose,quality,contact};
  }
 }
 return best;
}
function offsetSamples(cap:number):number[]{
 const values=[0,cap*.64,-cap*.48,cap];
 return cap<.01?[0]:values;
}
function hangingGuard(input:CoupledInput):SolvedArm|null{
 const shoulder=input.shoulders[0],base=neutralMannequinWrist(-1);
 let best:SolvedArm|null=null;
 for(const spread of [0,1.25,2.5,3.8]){
  for(const back of [0,1,2.0]){
   const wrist=base.clone().add(new THREE.Vector3(-back,spread*.15,-spread));
   const candidate=selectArm(shoulder,wrist,-1,input.armor,1.5,
    input.previousBends?.[0]);
   if(candidate&&(!best||candidate.quality+spread*.10<best.quality))
    best=candidate;
  }
 }
 return best;
}
export function solveCoupledLowReady(input:CoupledInput):
 CoupledLowReadySolution|null{
 const contacts=riflePoseContacts(input.weapon,input.configuration),
  reference=lowReadyArchetype(input.configuration);
 if(!contacts||!reference)return null;
 const [leftShoulder,rightShoulder]=input.shoulders;
 const pocket=stockPocket('low'),scale=contacts.scale;
 const refStock=new THREE.Vector3(
  pocket.x+reference.stock.x,
  pocket.y+reference.stock.y,
  pocket.z+reference.stock.z);
 let count=0;
 const rigidOnly={...input.armor,
  boxes:input.armor.boxes.filter(b=>b.material==='rigid')};
 const rejects={primaryReach:0,receiverRigid:0,
  rightAnatomyOrArmor:0,leftReach:0,leftAnatomyOrArmor:0,
  pairAnatomy:0,accepted:0};
 let bestGuard:CoupledLowReadySolution|null=null,guardQuality=Infinity;
 const guardArm=hangingGuard(input);
 const searchOrder:readonly [LowReadyPass,LowReadyPoseMode][]=[
  ['standard','standard-two-hand'],
  ['compressed','compressed-two-hand'],
  ['deep','deep-two-hand']
 ];
 for(const [passName,mode] of searchOrder){
  const budget=LOW_READY_PASSES[passName];
  let winning:CoupledLowReadySolution|null=null,winningScore=Infinity;
  // Fixed, bounded arrangement. Later passes explore soft compression,
  // but never weaken bone reach or rigid core rules.
  const yawSeeds=[0,-budget.yaw,budget.yaw];
  const pitchSeeds=[0,-budget.pitch,budget.pitch];
  const stockXs=offsetSamples(budget.stockX);
  const stockYs=[0,-budget.stockY];
  const stockZs=[0,budget.stockZ];
  for(const yawDelta of yawSeeds)for(const pitchDelta of pitchSeeds){
   const yaw=input.nominalYaw+reference.yaw+yawDelta;
   const pitch=reference.pitch+pitchDelta;
   const rotation=new THREE.Euler(0,yaw,pitch,'XYZ');
   const transform=(v:RiflePoint)=>new THREE.Vector3(
    v.x*scale,v.y,v.z).applyEuler(rotation);
   const stockLocal=transform(contacts.stock);
   const primaryLocal=transform(contacts.primary);
   for(const offsetX of stockXs)for(const offsetY of stockYs)
    for(const offsetZ of stockZs){
    const stock=refStock.clone().add(
     new THREE.Vector3(offsetX,offsetY,offsetZ));
    const origin=stock.clone().sub(stockLocal);
    const primary=origin.clone().add(primaryLocal);
    if(primary.distanceTo(rightShoulder)>19.55){rejects.primaryReach++;continue;}
    const receiverA=origin.clone().add(transform({x:-5,y:0,z:0}));
    const receiverB=origin.clone().add(transform({x:4,y:0,z:0}));
    const receiverDepth=segmentArmorPenetration(ptr(receiverA),
     ptr(receiverB),rigidOnly,1.06,.18);
    if(receiverDepth>.12){rejects.receiverRigid++;continue;}
    const right=selectArm(rightShoulder,primary,1,input.armor,
     budget.softScale,input.previousBends?.[1],rejects);
    if(!right){rejects.rightAnatomyOrArmor++;continue;}
    const rightDepth=right.contact.hardDepth;
    for(const fraction of budget.contactFractions){
     count++;
     const f=clamp((fraction+reference.supportFraction)*.5,0,1);
     const support=origin.clone().add(
      transform(supportContactAt(contacts.support,f)));
     if(support.distanceTo(leftShoulder)>19.55){rejects.leftReach++;continue;}
     const left=selectArm(leftShoulder,support,-1,input.armor,
      budget.softScale,input.previousBends?.[0]);
     if(!left){rejects.leftAnatomyOrArmor++;continue;}
     const geometry=assessLowReadyPair(
      [leftShoulder,rightShoulder],
      [left.pose.joint,right.pose.joint],
      [left.pose.effector,right.pose.effector],
      [left.pose.angle,right.pose.angle]);
     if(!geometry.valid){rejects.pairAnatomy++;continue;}
     rejects.accepted++;
     const hardDepth=Math.max(left.contact.hardDepth,
      right.contact.hardDepth,receiverDepth);
     const softDepth=Math.max(left.contact.softDepth,
      right.contact.softDepth);
     input.onCandidate?.({
      right:rightDepth,left:left.contact.hardDepth,
      receiver:receiverDepth,depth:hardDepth,
      leftJoint:ptr(left.pose.joint),leftWrist:ptr(left.pose.effector),
      stock:ptr(stock)});
     const distance=stock.distanceTo(refStock);
     const quality=budget.centerPenalty+geometry.score+
      left.contact.quality*.09+right.contact.quality*.09+
      distance*.15+Math.abs(yawDelta)*1.2+
      Math.abs(pitchDelta)*1.0+
      Math.abs(f-reference.supportFraction)*.40;
     if(quality>=winningScore)continue;
     const fit:WeaponFit={origin,rotation,stock,primary,support,
      twoHanded:true,primaryReachable:true,handling:'low',
      contactError:0,stockError:distance};
     winningScore=quality;
     winning={status:'clear',mode,fit,
      arms:[left.pose,right.pose],penetration:hardDepth,
      softContact:softDepth,quality,supportFraction:f,candidates:count};
    }
    // Reserve a one-handed pose only if all three two-handed passes fail.
    // It is never counted as a successful regular rifle fit.
    if(guardArm){
     const guardQualityCandidate=right.quality+guardArm.quality+
      budget.centerPenalty+.5*stock.distanceTo(refStock);
     if(guardQualityCandidate<guardQuality){
      guardQuality=guardQualityCandidate;
      const fit:WeaponFit={origin,rotation,stock,primary,
       support:guardArm.pose.effector.clone(),
       twoHanded:false,primaryReachable:true,handling:'low',
       contactError:0,stockError:stock.distanceTo(refStock)};
      bestGuard={status:'guard-fallback',mode:'one-hand-guard',
       fit,arms:[guardArm.pose,right.pose],
       penetration:Math.max(guardArm.contact.hardDepth,
        right.contact.hardDepth,receiverDepth),
       softContact:Math.max(guardArm.contact.softDepth,
        right.contact.softDepth),
       quality:guardQualityCandidate,
       supportFraction:0,candidates:count};
     }
    }
   }
  }
  if(winning){input.onDiagnostics?.(rejects);return {...winning,candidates:count};}
 }
 input.onDiagnostics?.(rejects);
 return bestGuard?{...bestGuard,candidates:count}:null;
}
