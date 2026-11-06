/** Cached-at-the-rig, deterministic two-handed idle rifle fitting.
 * The weapon and BOTH arm solutions are one atomic candidate. We never
 * approve grips merely because they are reachable through a torso plate.
 * Only applied during stationary passive AR/AK low ready: no gameplay aim,
 * ballistic geometry, weapon configuration or locomotion is changed.
 */
import * as THREE from 'three';
import {stockPocket} from './breach-anatomy.ts';
import {neutralMannequinWrist} from './operator-mannequin-pose.ts';
import {solveTwoBone,ARM_LIMITS,type LimbSolution} from './breach-ik.ts';
import {riflePoseContacts,supportContactAt,
 type RiflePoint} from './breach-weapon-contact-zones.ts';
import {armArmorPenetration,segmentArmorPenetration,
 type PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WeaponFit} from './breach-weapon-pose.ts';

export type CoupledStatus='clear'|'guard-fallback'|'unresolved';
export type CoupledLowReadySolution={
 status:CoupledStatus;fit:WeaponFit;
 arms:[LimbSolution,LimbSolution];penetration:number;
 supportFraction:number;candidates:number;
};
export type CoupledInput={
 weapon:WeaponId;configuration:WeaponConfiguration;
 shoulders:[THREE.Vector3,THREE.Vector3];
 armor:PoseClearanceEnvelope;nominalYaw:number;
 onCandidate?:(sample:{right:number;left:number;receiver:number;depth:number;
  leftJoint:RiflePoint;leftWrist:RiflePoint;stock:RiflePoint})=>void;
};
const pointer=(v:THREE.Vector3):RiflePoint=>({x:v.x,y:v.y,z:v.z});
// Sub-pixel allowance for faceted sleeve/strap seam contact.
const EPS=.13;
/** Sweep the WHOLE two-bone elbow circle around a real wrist target.
 * Discrete, deterministic 24-direction search avoids brittle hand-authored
 * pole guesses. Candidate geometry is evaluated before approval. */
function elbowPoleCircle(shoulder:THREE.Vector3,wrist:THREE.Vector3){
 const axis=wrist.clone().sub(shoulder).normalize();
 const reference=Math.abs(axis.y)<.9?
  new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);
 const basis=reference.addScaledVector(axis,-reference.dot(axis)).normalize();
 const perpendicular=new THREE.Vector3().crossVectors(axis,basis).normalize();
 const result:THREE.Vector3[]=[];
 for(let i=0;i<24;i++){
  const angle=2*Math.PI*i/24;
  result.push(basis.clone().multiplyScalar(Math.cos(angle))
   .addScaledVector(perpendicular,Math.sin(angle)));
 }
 return result;
}

/** Elbow silhouette: outboard flare, a raised elbow or a near-horizontal
 * upper arm is undesirable even if it technically avoids the plate. */
export function relaxedArmShapeCost(shoulder:THREE.Vector3,
 joint:THREE.Vector3,side:-1|1):number{
 const outward=side*(joint.z-shoulder.z);
 const elbowRise=joint.y-shoulder.y;
 const forward=joint.x-shoulder.x;
 return Math.max(0,outward-3.2)*1.4+
  Math.max(0,elbowRise+4)*2.0+
  Math.max(0,forward-6.7)*.60;
}
/** Fixed candidate ordering and scalar ranking: no randomness or frame state.
 * A candidate is admissible only if the actual two-bone sleeves are clear.
 */
export function solveCoupledLowReady(input:CoupledInput):
 CoupledLowReadySolution|null{
 const contacts=riflePoseContacts(input.weapon,input.configuration);
 if(!contacts)return null;
 const [leftShoulder,rightShoulder]=input.shoulders;
 const pocket=stockPocket('low'),scale=contacts.scale;
 const levers=[0,.08,contacts.support.preferredFraction,.32,.55,.82];
 const yaws=[.18,.30,.42,.54,.66,.77];
 const pitches=[-.12,-.22,-.32];
 // Realistic shoulder translation, not independent grip offsets. Positive
 // X brings the receiver/trigger clear of a thick front rig.
 const dxs=[-.3,.25,.8,1.35],dzs=[-.12,.45,1.0];
 // Deliberately DOWNWARD elbow hint rather than far-outboard chicken wings.
 // Solve the relaxed non-gun hand once per outfit, not per firearm candidate.
 const hanging=neutralMannequinWrist(-1);
 let hangingArm:LimbSolution|null=null,hangingCost=Infinity,
  hangingDepth=Infinity;
 for(const spread of [0,1.4,2.8,4.2]){
  for(const back of [0,1.2,2.4]){
   const wrist=hanging.clone();
   wrist.z-=spread;wrist.x-=back;wrist.y+=spread*.18;
   for(const pole of elbowPoleCircle(leftShoulder,wrist)){
    const arm=solveTwoBone(leftShoulder,wrist,10,10,pole,ARM_LIMITS);
    if(!arm.reached)continue;
    const depth=armArmorPenetration(pointer(leftShoulder),
     pointer(arm.joint),pointer(arm.effector),input.armor);
    if(depth>EPS)continue;
    const score=relaxedArmShapeCost(leftShoulder,arm.joint,-1)*.7+
     spread*.22+back*.15;
    if(score<hangingCost){hangingCost=score;hangingArm=arm;
     hangingDepth=depth;}
   }
  }
 }
 let best:CoupledLowReadySolution|null=null,bestCost=Infinity;
 let backup:CoupledLowReadySolution|null=null,backupCost=Infinity;
 let evaluated=0;
 for(const yawOffset of yaws)for(const pitch of pitches){
  const rot=new THREE.Euler(0,input.nominalYaw+yawOffset,pitch,'XYZ');
  const rotate=(p:RiflePoint)=>new THREE.Vector3(p.x*scale,p.y,p.z)
    .applyEuler(rot);
  const stockLocal=rotate(contacts.stock);
  const rightLocal=rotate(contacts.primary);
  for(const dx of dxs)for(const dz of dzs){
   if(Math.hypot(dx,dz)>1.7)continue;
   const stock=new THREE.Vector3(pocket.x+dx,pocket.y,pocket.z+dz);
   const origin=stock.clone().sub(stockLocal);
   const primary=origin.clone().add(rightLocal);
   const rightReach=primary.distanceTo(rightShoulder);
   if(rightReach>19.90||rightReach<2.9)continue;
   for(const f of levers){
    evaluated++;
    const support=origin.clone().add(rotate(supportContactAt(contacts.support,f)));
    const leftReach=support.distanceTo(leftShoulder);
    if(leftReach>19.90||leftReach<2.9)continue;
    const pref=Math.abs(f-contacts.support.preferredFraction);
    const fit:WeaponFit={
     origin,rotation:rot,stock,primary,support,
     twoHanded:true,primaryReachable:true,handling:'low',
     contactError:0,stockError:Math.hypot(dx,dz)
    };
    // Weapon receiver must also be outside the front carrier.
    // Buttplate/stock are allowed to meet the shoulder pocket.
    const receiverA=origin.clone().add(rotate({x:-5,y:0,z:0}));
    const receiverB=origin.clone().add(rotate({x:4,y:0,z:0}));
    const receiverDepth=segmentArmorPenetration(
     pointer(receiverA),pointer(receiverB),input.armor,1.20,.18);
    let rightBest:LimbSolution|null=null,rightCost=Infinity,rightDepth=Infinity;
    for(const pole of elbowPoleCircle(rightShoulder,primary)){
     const right=solveTwoBone(rightShoulder,primary,10,10,
      pole,ARM_LIMITS);
     if(!right.reached)continue;
     const penetration=armArmorPenetration(pointer(rightShoulder),
      pointer(right.joint),pointer(right.effector),input.armor);
     const score=penetration*100+
      relaxedArmShapeCost(rightShoulder,right.joint,1)*2;
     if(score<rightCost){rightCost=score;rightBest=right;
      rightDepth=penetration;}
    }
    if(!rightBest)continue;
    let leftBest:LimbSolution|null=null,leftCost=Infinity,leftDepth=Infinity;
    for(const pole of elbowPoleCircle(leftShoulder,support)){
     const left=solveTwoBone(leftShoulder,support,10,10,
      pole,ARM_LIMITS);
     if(!left.reached)continue;
     const penetration=armArmorPenetration(pointer(leftShoulder),
      pointer(left.joint),pointer(left.effector),input.armor);
     const score=penetration*100+
      relaxedArmShapeCost(leftShoulder,left.joint,-1)*2;
     if(score<leftCost){leftCost=score;leftBest=left;
      leftDepth=penetration;}
    }
    if(!leftBest)continue;
    const depth=Math.max(rightDepth,leftDepth,receiverDepth);
    input.onCandidate?.({right:rightDepth,left:leftDepth,
     receiver:receiverDepth,depth,
     leftJoint:pointer(leftBest.joint),leftWrist:pointer(leftBest.effector),
     stock:pointer(stock)});
    // Stock and hands are constrained by the same *rigid* transform.
    // Only naturalness differentiates admissible candidates.
    const style=Math.abs(yawOffset-.42)*1.6+Math.abs(pitch+.27)*1.1+
     Math.abs(dx)*.4+Math.abs(dz)*.4+pref*.5+
     relaxedArmShapeCost(leftShoulder,leftBest.joint,-1)*.18+
     relaxedArmShapeCost(rightShoulder,rightBest.joint,1)*.18;
    const proposed:CoupledLowReadySolution={status:'clear',
     fit,arms:[leftBest,rightBest],penetration:depth,
     supportFraction:f,candidates:evaluated};
    if(depth<=EPS&&style<bestCost){bestCost=style;best=proposed;}
    if(rightDepth<=EPS&&receiverDepth<=EPS&&hangingArm){
     // Explicit one-hand guard fallback: non-gun arm hangs naturally,
     // never a folded triangle through the chest-rig or cummerbund.
     const cost=rightDepth*100+style+hangingCost;
     if(cost<backupCost){
      backupCost=cost;
      backup={status:'guard-fallback',fit:{...fit,twoHanded:false,
        contactError:0},arms:[hangingArm,rightBest],
       penetration:Math.max(hangingDepth,rightDepth,receiverDepth),
       supportFraction:f,candidates:evaluated};
     }
    }
   }
  }
 }
 if(best)return {...best,candidates:evaluated};
 if(backup)return {...backup,candidates:evaluated};
 // Do not silently accept a mathematically reachable but penetrating arm.
 return null;
}
