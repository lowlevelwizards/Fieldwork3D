/** Cached-at-the-rig, deterministic two-handed idle rifle fitting.
 * The weapon and BOTH arm solutions are one atomic candidate. We never
 * approve grips merely because they are reachable through a torso plate.
 * Only applied during stationary passive AR/AK low ready: no gameplay aim,
 * ballistic geometry, weapon configuration or locomotion is changed.
 */
import * as THREE from 'three';
import {stockPocket} from './breach-anatomy.ts';
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
const direction=(from:THREE.Vector3,point:[number,number,number])=>
 new THREE.Vector3(point[0]-from.x,point[1]-from.y,point[2]-from.z);
const pointer=(v:THREE.Vector3):RiflePoint=>({x:v.x,y:v.y,z:v.z});
// Sub-pixel allowance for faceted sleeve/strap seam contact.
const EPS=.13;
/** Fixed candidate ordering and scalar ranking: no randomness or frame state.
 * A candidate is admissible only if the actual two-bone sleeves are clear.
 */
export function solveCoupledLowReady(input:CoupledInput):
 CoupledLowReadySolution|null{
 const contacts=riflePoseContacts(input.weapon,input.configuration);
 if(!contacts)return null;
 const [leftShoulder,rightShoulder]=input.shoulders;
 const pocket=stockPocket('low'),scale=contacts.scale;
 const levers=[.09,contacts.support.preferredFraction,.42,.70,.87];
 const yaws=[.18,.30,.42,.54,.66,.77];
 const pitches=[-.12,-.22,-.32];
 // Realistic shoulder translation, not independent grip offsets. Positive
 // X brings the receiver/trigger clear of a thick front rig.
 const dxs=[-.3,.25,.8,1.35],dzs=[-.12,.45,1.0];
 const supportPoles:readonly [number,number,number][]=[
  [9,-6.2,-12],[11.7,-7.7,-13.8],[7.5,-9.0,-10.5]];
 const firingPoles:readonly [number,number,number][]=[
  [9,-6.7,11],[11,-6.2,12.7],[7.4,-8.8,9.3]];
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
    let rightBest:LimbSolution|null=null,rightCost=Infinity;
    for(const polePoint of firingPoles){
     const right=solveTwoBone(rightShoulder,primary,10,10,
      direction(rightShoulder,polePoint),ARM_LIMITS);
     if(!right.reached)continue;
     const penetration=armArmorPenetration(pointer(rightShoulder),
      pointer(right.joint),pointer(right.effector),input.armor);
     const score=penetration*100+(polePoint===firingPoles[0]?0:.2);
     if(score<rightCost){rightCost=score;rightBest=right;}
    }
    if(!rightBest)continue;
    let leftBest:LimbSolution|null=null,leftCost=Infinity;
    for(const polePoint of supportPoles){
     const left=solveTwoBone(leftShoulder,support,10,10,
      direction(leftShoulder,polePoint),ARM_LIMITS);
     if(!left.reached)continue;
     const penetration=armArmorPenetration(pointer(leftShoulder),
      pointer(left.joint),pointer(left.effector),input.armor);
     const score=penetration*100+(polePoint===supportPoles[0]?0:.2);
     if(score<leftCost){leftCost=score;leftBest=left;}
    }
    if(!leftBest)continue;
    const depth=Math.max(rightCost/100,leftCost/100,receiverDepth);
    input.onCandidate?.({right:rightCost/100,left:leftCost/100,
     receiver:receiverDepth,depth,
     leftJoint:pointer(leftBest.joint),leftWrist:pointer(leftBest.effector),
     stock:pointer(stock)});
    // Stock and hands are constrained by the same *rigid* transform.
    // Only naturalness differentiates admissible candidates.
    const style=Math.abs(yawOffset-.42)*1.6+Math.abs(pitch+.27)*1.1+
     Math.abs(dx)*.4+Math.abs(dz)*.4+pref*.5;
    const proposed:CoupledLowReadySolution={status:'clear',
     fit,arms:[leftBest,rightBest],penetration:depth,
     supportFraction:f,candidates:evaluated};
    if(depth<=EPS&&style<bestCost){bestCost=style;best=proposed;}
    if(rightCost/100<=EPS&&receiverDepth<=EPS&&
       depth*5+style<backupCost){
     // If two-handed grip is physically impossible, the support hand
     // rests outside the left hip; it must NOT tunnel through a plate.
     const guard=new THREE.Vector3(2,-7.8,-10.4);
     const guardSolution=solveTwoBone(leftShoulder,guard,10,10,
      direction(leftShoulder,[2,-8.8,-12.5]),ARM_LIMITS);
     const guardDepth=armArmorPenetration(pointer(leftShoulder),
      pointer(guardSolution.joint),pointer(guardSolution.effector),input.armor);
     if(guardSolution.reached&&guardDepth<=EPS){
      backupCost=depth*5+style;
      backup={status:'guard-fallback',fit:{...fit,twoHanded:false,
        contactError:0},arms:[guardSolution,rightBest],
       penetration:Math.max(guardDepth,rightCost/100,receiverDepth),
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
