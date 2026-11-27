/** WR11: conservative game-art envelope clearance. Computed from cached
 * installed silhouette/accessory bounds; no per-frame geometry traversal.
 * This is a presentation envelope, not a navigation collision shape. */
import * as THREE from 'three';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
export type RetentionClearanceInput=Readonly<{
 mode:RetentionPoseMode;bounds:THREE.Box3;position:THREE.Vector3;
 quaternion:THREE.Quaternion;scale:THREE.Vector3;chestHeight:number;
 armorPush:number;pack:boolean;rigDepth?:number;beltDepth?:number;
}>;
export function clearRetentionEnvelope(p:RetentionClearanceInput){
 const box=p.bounds.clone().applyMatrix4(new THREE.Matrix4().compose(
  p.position,p.quaternion,p.scale));
 const correction=new THREE.Vector3();
 if(box.isEmpty()||p.mode==='held-one')return {correction,box};
 const armor=Math.max(0,Math.min(2,p.armorPush));
 correction.y=Math.max(0,2-p.chestHeight-box.min.y);
 if(p.mode==='front-slung')
  correction.x=Math.max(0,6.5+armor+(p.rigDepth??0)-box.min.x);
 else if(p.mode==='side-slung')
  correction.z=Math.max(0,9+armor+(p.beltDepth??0)-box.min.z);
 else correction.x=-Math.max(0,box.max.x+(p.pack?13:7));
 box.translate(correction);
 return {correction,box};
}
