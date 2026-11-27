/** WR4: explicit visual retention pose library, in the existing chest-local
 * art frame (+X front,+Y up,+Z right). No world custody or combat changes.
 * A future action owner supplies the achieved location, never the renderer. */
import * as THREE from 'three';
import type {SlingKind} from './breach-weapon-retention.ts';
import type {WeaponRetentionSockets} from './weapons/geometry/weapon-retention-sockets.ts';
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
}>;
export function retentionPoseSupported(mode:RetentionPoseMode,sling:SlingKind){
 return mode==='held-one'||mode==='front-slung'&&sling!=='none'||
  (mode==='side-slung'||mode==='back-slung')&&sling==='two';
}
export function sampleRetentionPose(p:RetentionPoseInput):RetentionPoseSample|null{
 if(!retentionPoseSupported(p.mode,p.sling))return null;
 const armor=Math.max(0,Math.min(2,p.armorPush));
 const one=p.mode==='held-one',front=p.mode==='front-slung';
 const side=p.mode==='side-slung';
 // X axis is the long silhouette axis; side vector faces outboard.
 const axis=one?new THREE.Vector3(.42,-.88,.22):
  front?new THREE.Vector3(.08,-.78,p.sling==='single'?.20:.62):
  side?new THREE.Vector3(.38,-.90,.12):
  new THREE.Vector3(-.04,-.80,-.60);
 // A low stance flattens the long silhouette to avoid floor intersections.
 const extent=Math.max(1,p.muzzleX-p.balanceX,p.balanceX-p.stockX)*p.scale.x;
 if(p.chestHeight<extent+8)axis.y*=Math.max(.30,(p.chestHeight-5)/(extent+8));
 axis.normalize();
 const outward=one||side?new THREE.Vector3(0,0,1):
  new THREE.Vector3(front?1:-1,0,0);
 const z=outward.addScaledVector(axis,-outward.dot(axis)).normalize();
 const y=z.clone().cross(axis).normalize();
 const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis,y,z));
 if(!one&&p.motion){
  const m=sampleSuspensionMotion(p.sling,p.motion);
  q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(m.roll,m.yaw,m.pitch)));
 }
 const anchor=one?new THREE.Vector3(5.5,-5.2,9.6+armor):
  front?new THREE.Vector3(8.8+armor,-2.8,p.sling==='single'?2.8:0):
  side?new THREE.Vector3(1.0,-2.8,10.7+armor):
  new THREE.Vector3(p.pack?-13:-8.2,-.5,0);
 // The same rendered grip is used at the new pose, not a second socket.
 const localGrip=p.primaryGrip.clone().sub(p.heldPosition)
  .applyQuaternion(p.heldQuaternion.clone().invert());
 const socket=p.sling==='single'&&p.sockets?.single;
 const offset=one?localGrip:socket?
  new THREE.Vector3(socket.x,socket.y,socket.z+.15).multiply(p.scale):
  new THREE.Vector3(p.balanceX*p.scale.x,0,0);
 if(!one&&socket)anchor.y+=4;
 const position=anchor.clone().sub(offset.clone().applyQuaternion(q));
 if(!one){
  // Conservative silhouette centerline against body/ground. The exact
  // equipment envelope and world obstruction policy is WR11.
  const barrelAxis=new THREE.Vector3(1,0,0).applyQuaternion(q);
  const ends=[p.stockX*p.scale.x,p.muzzleX*p.scale.x];
  const min=(k:'x'|'y'|'z')=>position[k]+Math.min(ends[0]*barrelAxis[k],ends[1]*barrelAxis[k]);
  const max=(k:'x'|'y'|'z')=>position[k]+Math.max(ends[0]*barrelAxis[k],ends[1]*barrelAxis[k]);
  position.y+=Math.max(0,3-p.chestHeight-min('y'));
  if(front)position.x+=Math.max(0,6.5+armor-min('x'));
  else if(side)position.z+=Math.max(0,9.0+armor-min('z'));
  else position.x-=Math.max(0,max('x')+(p.pack?10.5:6.5));
 }
 const right=one?anchor.clone():new THREE.Vector3(3,-8.6,9);
 const left=new THREE.Vector3(3,-8.6,-9);
 return {mode:p.mode,position,quaternion:q,right,left};
}
