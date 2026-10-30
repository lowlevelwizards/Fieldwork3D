/** Build 120: anatomical two-bone IK and stable rectangular-limb frames.
 * All positions, poles and orientation references are parent-local.
 */
import * as THREE from 'three';

export type JointLimits={
  /** External flexion in radians: zero is a fully straight limb. */
  minBend:number;maxBend:number;
};
export type LimbSolution={
  joint:THREE.Vector3;effector:THREE.Vector3;
  bendPlane:THREE.Vector3;angle:number;
  requestedReach:number;reached:boolean;
};
export const LEG_LIMITS:JointLimits={minBend:.08,maxBend:2.37};
export const ARM_LIMITS:JointLimits={minBend:.14,maxBend:2.55};
const EPS=1e-8;
const clamp=(x:number,low:number,high:number)=>
  Math.max(low,Math.min(high,x));
const axisY=new THREE.Vector3(0,1,0);
const localX=new THREE.Vector3(1,0,0);
const localZ=new THREE.Vector3(0,0,1);
const frame=new THREE.Matrix4();
const axis=new THREE.Vector3(),bend=new THREE.Vector3();
const right=new THREE.Vector3(),front=new THREE.Vector3();
const previousRight=new THREE.Vector3();

/** Stable pole projection, including fully extended and collinear targets. */
export function bendDirection(direction:THREE.Vector3,
  preferred:THREE.Vector3,previous?:THREE.Vector3,
  out=new THREE.Vector3()):THREE.Vector3{
  out.copy(preferred).addScaledVector(direction,-preferred.dot(direction));
  if(out.lengthSq()<EPS&&previous){
    out.copy(previous).addScaledVector(direction,-previous.dot(direction));
  }
  if(out.lengthSq()<EPS){
    const fallback=Math.abs(direction.dot(localX))<.85?localX:localZ;
    out.copy(fallback).addScaledVector(direction,-fallback.dot(direction));
  }
  return out.normalize();
}
/** The only authority for IK reach and bend planes. Never move a world foot
 * anchor to hide an unreachable leg; expose reached=false to diagnostics. */
export function solveTwoBone(start:THREE.Vector3,end:THREE.Vector3,
  upper:number,lower:number,pole:THREE.Vector3,
  limits:JointLimits=ARM_LIMITS,previousBend?:THREE.Vector3):LimbSolution{
  const delta=axis.copy(end).sub(start);
  const raw=delta.length();
  if(raw<EPS)axis.set(0,-1,0);
  else axis.multiplyScalar(1/raw);
  const low=clamp(limits.minBend,.001,Math.PI-.001);
  const high=clamp(limits.maxBend,low,Math.PI-.001);
  // Law of cosines; r is a function of the external joint flexion.
  const minReach=Math.sqrt(Math.max(EPS,
    upper*upper+lower*lower+2*upper*lower*Math.cos(high)));
  const maxReach=Math.sqrt(Math.max(EPS,
    upper*upper+lower*lower+2*upper*lower*Math.cos(low)));
  const reach=clamp(raw,minReach,maxReach);
  const effector=start.clone().addScaledVector(axis,reach);
  const along=(upper*upper+reach*reach-lower*lower)/(2*reach);
  const height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const plane=bendDirection(axis,pole,previousBend,bend).clone();
  const joint=start.clone().addScaledVector(axis,along)
    .addScaledVector(plane,height);
  const interior=Math.acos(clamp((upper*upper+lower*lower-reach*reach)/
    (2*upper*lower),-1,1));
  return {joint,effector,bendPlane:plane,
    angle:Math.PI-interior,requestedReach:raw,
    reached:Math.abs(raw-reach)<1e-4};
}
/** Historical helper kept for isolated lab callers. */
export function twoBoneJoint(start:THREE.Vector3,end:THREE.Vector3,
  upper:number,lower:number,pole:THREE.Vector3,out=new THREE.Vector3()){
  return out.copy(solveTwoBone(start,end,upper,lower,pole).joint);
}
/** A full, continuous orientation frame rather than shortest-arc Y alignment.
 * X points toward a stable anatomical side, Y along the segment, Z is derived.
 * The previous quaternion is used only for truly degenerate reference axes.
 * There is no frame-rate-dependent quaternion easing or arbitrary spin.
 */
export function alignSegment(mesh:THREE.Object3D,
  from:THREE.Vector3,to:THREE.Vector3,
  anatomicalSide:THREE.Vector3=localZ){
  axis.copy(to).sub(from);
  const length=axis.length();
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  if(length<EPS)return;
  axis.multiplyScalar(1/length);
  right.copy(anatomicalSide).addScaledVector(axis,
    -anatomicalSide.dot(axis));
  if(right.lengthSq()<EPS){
    previousRight.copy(localX).applyQuaternion(mesh.quaternion);
    right.copy(previousRight).addScaledVector(axis,
      -previousRight.dot(axis));
  }
  if(right.lengthSq()<EPS){
    const fallback=Math.abs(axis.dot(localX))<.85?localX:localZ;
    right.copy(fallback).addScaledVector(axis,-fallback.dot(axis));
  }
  right.normalize();front.crossVectors(right,axis).normalize();
  right.crossVectors(axis,front).normalize();
  frame.makeBasis(right,axis,front);
  mesh.quaternion.setFromRotationMatrix(frame);
  mesh.scale.y=length;
}
/** A broad torso avoidance volume in chest-local coordinates. */
export function intersectsTorso(point:THREE.Vector3,
  clearance=0):boolean{
  return point.x>-5.2-clearance&&point.x<6.7+clearance&&
    point.y>-6.7-clearance&&point.y<6.7+clearance&&
    Math.abs(point.z)<7+clearance;
}
