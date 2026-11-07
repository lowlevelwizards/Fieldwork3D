/** Low-ready *presentation-only* anatomical limits.
 * Never change global IK bounds or any gameplay aim / animation state.
 * All points live in the existing chest-local +X-forward frame.
 */
import type * as THREE from 'three';
export type ArmSide=-1|1;
export type ArmQuality={
 valid:boolean;score:number;reasons:readonly string[];
 flexion:number;flare:number;drop:number;
};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const LOW_READY_ANATOMY={
 upperLength:10,lowerLength:10,
 minElbowFlex:.31,maxElbowFlex:2.42,
 maximumFlare:5.5,
 /** Downward elbows cannot rise into the shoulder plane. */
 minimumDrop:.35,
 /** No arm may cross deeply over the sternum while reaching. */
 maximumInwardCross:6.1,
 preferredFiringDrop:6.55,preferredSupportDrop:5.2,
 preferredFiringFlare:.65,preferredSupportFlare:1.9
} as const;
export function assessLowReadyArm(
 shoulder:THREE.Vector3,elbow:THREE.Vector3,wrist:THREE.Vector3,
 side:ArmSide,flexion:number):ArmQuality{
 const drop=shoulder.y-elbow.y;
 const flare=side*(elbow.z-shoulder.z);
 const crossing=Math.max(0,-flare);
 const reasons:string[]=[];
 if(!Number.isFinite(flexion)||!Number.isFinite(drop)||
    !Number.isFinite(flare))reasons.push('non-finite');
 if(drop<LOW_READY_ANATOMY.minimumDrop)reasons.push('elbow-up');
 if(flare>LOW_READY_ANATOMY.maximumFlare)reasons.push('elbow-wing');
 if(crossing>LOW_READY_ANATOMY.maximumInwardCross)reasons.push('cross-body');
 if(flexion<LOW_READY_ANATOMY.minElbowFlex)reasons.push('locked-arm');
 if(flexion>LOW_READY_ANATOMY.maxElbowFlex)reasons.push('folded-arm');
 // Prevent broken shoulder posture: never solve an elbow so far behind
 // the shoulder that the upper arm visibly reverses direction.
 if(elbow.x<shoulder.x-8.8)reasons.push('rear-break');
 const preferredDrop=side===1?
  LOW_READY_ANATOMY.preferredFiringDrop:
  LOW_READY_ANATOMY.preferredSupportDrop;
 const preferredFlare=side===1?
  LOW_READY_ANATOMY.preferredFiringFlare:
  LOW_READY_ANATOMY.preferredSupportFlare;
 const score=Math.abs(drop-preferredDrop)*.24+
  Math.max(0,flare-preferredFlare)*(side===1?.72:.52)+
  Math.max(0,-flare-1.0)*.25+
  Math.max(0,elbow.x-shoulder.x-5.4)*.25+
  Math.abs(clamp(flexion,.31,2.42)-1.03)*.23+
  Math.max(0,wrist.distanceTo(shoulder)-18.0)*.65;
 return {valid:reasons.length===0,score,reasons,flexion,flare,drop};
}
export function assessLowReadyPair(
 shoulders:readonly [THREE.Vector3,THREE.Vector3],
 elbows:readonly [THREE.Vector3,THREE.Vector3],
 wrists:readonly [THREE.Vector3,THREE.Vector3],
 flexions:readonly [number,number]){
 const left=assessLowReadyArm(shoulders[0],elbows[0],wrists[0],-1,
  flexions[0]);
 const right=assessLowReadyArm(shoulders[1],elbows[1],wrists[1],1,
  flexions[1]);
 const elbowSpacing=elbows[0].distanceTo(elbows[1]);
 const pairCollision=elbowSpacing<3.4;
 return {valid:left.valid&&right.valid&&!pairCollision,
  score:left.score+right.score+(pairCollision?100:0),
  left,right,elbowSpacing};
}
