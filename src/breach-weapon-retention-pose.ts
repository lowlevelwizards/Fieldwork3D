/** WR4: explicit visual retention pose library, in the existing chest-local
 * art frame (+X front,+Y up,+Z right). No world custody or combat changes.
 * A future action owner supplies the achieved location, never the renderer. */
import * as THREE from 'three';
import {packedRearSurface} from './operator-retention-pack.ts';
import {sampleRetentionFreeWrist,type RetentionLocomotion} from './operator-retention-locomotion.ts';
import type {RetentionShape} from './operator-retention-shape.ts';
import type {EquipmentExterior} from './operator-equipment-exterior.ts';
import type {SlingKind} from './breach-weapon-retention.ts';
import type {WeaponRetentionSockets} from './weapons/geometry/weapon-retention-sockets.ts';
import {clearRetentionEnvelope} from './breach-weapon-retention-clearance.ts';
import {sampleSuspensionMotion,type SuspensionMotion} from './breach-weapon-suspension.ts';
export type RetentionPoseMode='held-one'|'front-slung'|'side-slung'|'back-slung';
export type RetentionPoseSample=Readonly<{
 mode:RetentionPoseMode;
 position:THREE.Vector3;quaternion:THREE.Quaternion;
 right:THREE.Vector3;left:THREE.Vector3;
}>;
export type RetentionPoseInput=Readonly<{
 mode:RetentionPoseMode;sling:SlingKind;scale:THREE.Vector3;
 heldPosition:THREE.Vector3;heldQuaternion:THREE.Quaternion;
 primaryGrip:THREE.Vector3;supportGrip:THREE.Vector3;
 balanceX:number;armorPush:number;pack:boolean;chestHeight:number;
 muzzleX:number;stockX:number;
 sockets?:WeaponRetentionSockets|null;motion?:SuspensionMotion;
 bounds?:THREE.Box3;rigDepth?:number;beltDepth?:number;
 exterior?:EquipmentExterior;packBounds?:THREE.Box3;shape?:RetentionShape;
 locomotion?:RetentionLocomotion;
}>;
export function retentionPoseSupported(mode:RetentionPoseMode,sling:SlingKind){
 return mode==='held-one'||mode==='front-slung'&&sling!=='none'||
  (mode==='side-slung'||mode==='back-slung')&&sling==='two';
}
/** Swing the existing silhouette toward its resting long axis without
 * inventing a new longitudinal roll. The source twist is carried through
 * the shortest rotation, including high-ready and reversed presentation. */
export function retainedSwing(held:THREE.Quaternion,axis:THREE.Vector3){
 const source=new THREE.Vector3(1,0,0).applyQuaternion(held).normalize();
 return new THREE.Quaternion().setFromUnitVectors(source,axis)
  .multiply(held).normalize();
}
export function sampleRetentionPose(p:RetentionPoseInput):RetentionPoseSample|null{
 if(!retentionPoseSupported(p.mode,p.sling))return null;
 if(p.mode!=='held-one'&&(p.sockets===null||
   p.sockets&&!p.sockets.supported.includes(p.sling==='single'?'single':'two')))return null;
 const armor=Math.max(0,Math.min(2,p.armorPush));
 const one=p.mode==='held-one',front=p.mode==='front-slung';
 const side=p.mode==='side-slung';
 // X axis is the long silhouette axis; side vector faces outboard.
 const axis=one?new THREE.Vector3(.42,-.88,.22):
  front?new THREE.Vector3(.08,-.92,p.sling==='single'?.16:.38):
  side?new THREE.Vector3(.15,-.98,.05):
  new THREE.Vector3(-.04,-.89,-.45);
 // A low stance flattens the long silhouette to avoid floor intersections.
 const extent=Math.max(1,p.muzzleX-p.balanceX,p.balanceX-p.stockX)*p.scale.x;
 if(p.chestHeight<extent+8)axis.y*=Math.max(.30,(p.chestHeight-5)/(extent+8));
 axis.normalize();
 const outward=one||side?new THREE.Vector3(0,0,1):
  new THREE.Vector3(front?1:-1,0,0);
 const z=outward.addScaledVector(axis,-outward.dot(axis)).normalize();
 const y=z.clone().cross(axis).normalize();
 const swing=retainedSwing(p.heldQuaternion,axis);
 // Side/back should lie flat against the wearer. Choose the nearest broad
 // face rather than letting the stock or magazine point straight outward.
 // Front retains its source-preserving drop.
 if(!one&&!front&&new THREE.Vector3(0,0,1).applyQuaternion(swing).dot(z)<0){
  z.negate();y.negate();
 }
 const q=front?swing:
  new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis,y,z));
 const suspension=!one&&p.motion?sampleSuspensionMotion(p.sling,p.motion):null;
 if(suspension)
  q.premultiply(new THREE.Quaternion().setFromEuler(
    new THREE.Euler(suspension.roll,suspension.yaw,suspension.pitch)));
 const anchor=one?new THREE.Vector3(5.5,-5.2,9.6+armor):
  front?new THREE.Vector3((p.exterior?.front(-2.8,0)??(7.1+armor))+1.35,
    -3.3,p.sling==='single'?2.4:0):
  side?new THREE.Vector3(1.8,-3.4,
    (p.exterior?.side(-3.4,1.8,1)??(8.1+armor))+.9):
  new THREE.Vector3(packedRearSurface(p.exterior?.back(-1,0)??-6.5,-1,0,p.packBounds)-1.25,
    -1.6,0);
 // The same rendered grip is used at the new pose, not a second socket.
 const localGrip=p.primaryGrip.clone().sub(p.heldPosition)
  .applyQuaternion(p.heldQuaternion.clone().invert());
 const socket=p.sling==='single'&&p.sockets?.single;
 const offset=one?localGrip:socket?
  new THREE.Vector3(socket.x,socket.y,socket.z+.15).multiply(p.scale):
  new THREE.Vector3(p.balanceX*p.scale.x,0,0);
 if(!one&&socket)anchor.y+=4;
 const position=anchor.clone().sub(offset.clone().applyQuaternion(q));
 if(suspension){
  position.y+=suspension.lift;
  if(side)position.x+=suspension.foreAft+suspension.sway*.5;
  else position.z+=suspension.sway;
 }
 if(!one&&(!p.exterior||!p.bounds)){
  // Conservative silhouette centerline against body/ground. The exact
  // equipment envelope and world obstruction policy is WR11.
  const barrelAxis=new THREE.Vector3(1,0,0).applyQuaternion(q);
  const ends=[p.stockX*p.scale.x,p.muzzleX*p.scale.x];
  const min=(k:'x'|'y'|'z')=>position[k]+Math.min(ends[0]*barrelAxis[k],ends[1]*barrelAxis[k]);
  const max=(k:'x'|'y'|'z')=>position[k]+Math.max(ends[0]*barrelAxis[k],ends[1]*barrelAxis[k]);
  position.y+=Math.max(0,3-p.chestHeight-min('y'));
  if(front)position.x+=Math.max(0,6.5+armor-min('x'));
  else if(side)position.z+=Math.max(0,9.0+armor-min('z'));
  else if(!p.exterior)position.x-=Math.max(0,max('x')+(p.pack?10.5:6.5));
 }
 if(!one&&p.bounds){
  const {correction}=clearRetentionEnvelope({...p,bounds:p.bounds,position,quaternion:q});
  position.add(correction);
 }
 // Clearance is authoritative: add only a small outward excursion after
 // contact fit, never an inward penetration or floor-changing movement.
 if(suspension){
  if(front)position.x+=suspension.separation*.45;
  else if(side)position.z+=suspension.separation*.25;
  else position.x-=suspension.separation*.35;
 }
 const right=one?anchor.clone():sampleRetentionFreeWrist(1,p.mode,p.locomotion,p.exterior);
 const left=sampleRetentionFreeWrist(-1,p.mode,p.locomotion,p.exterior);
 if(side)fitSideCarryWrist(right,p,position,q);
 return {mode:p.mode,position,quaternion:q,right,left};
}

/** Fit the released right arm OUTSIDE the side-slung silhouette, using
 * the installed model's cached support points near the hanging arm.
 * Keep the hand reachable by allowing a little natural elbow flexion. */
export function fitSideCarryWrist(wrist:THREE.Vector3,p:RetentionPoseInput,
 position:THREE.Vector3,q:THREE.Quaternion){
 const axis=new THREE.Vector3(1,0,0).applyQuaternion(q);
 const atY=(target:number)=>position.x+axis.x*(target-position.y)/Math.min(-.25,axis.y);
 const x=atY(-7);
 wrist.x=Math.max(-4.5,Math.min(4.5,x+wrist.x*.35));
 const v=new THREE.Vector3();
 let edge=position.z;
 if(p.shape?.length){
  for(const point of p.shape){
   v.copy(point).multiply(p.scale).applyQuaternion(q).add(position);
   if(v.y>=-15&&v.y<=1&&Math.abs(v.x-wrist.x)<5)edge=Math.max(edge,v.z);
  }
 }else if(p.bounds){
  const b=p.bounds.clone().applyMatrix4(new THREE.Matrix4().compose(position,q,p.scale));
  edge=Math.max(edge,b.max.z);
 }else edge+=1.6;
 wrist.z=Math.max(wrist.z,edge+1.35);
 // Slightly flex the arm instead of stretching it to the outside target.
 // The unified IK retains exact bone lengths.
 const lateral=Math.hypot(wrist.x-1,wrist.z-7);
 wrist.y=Math.max(wrist.y,-12.3,4-Math.sqrt(Math.max(1,19.3**2-lateral**2)));
 return wrist;
}
