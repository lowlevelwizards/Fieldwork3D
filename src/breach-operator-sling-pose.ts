/** Post-IK sling geometry: one span kernel for both the historical scene
 * adapter and B5 direct equipment transforms. Render-only. A strap never
 * changes shot-time muzzle, gameplay movement or ammunition state.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {OperatorPoseScratch,EquipmentPoseTransform}
 from './breach-operator-pose-scratch.ts';
const P=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
type SlingNode=Pick<THREE.Object3D,
 'visible'|'position'|'scale'|'quaternion'>;
type SlingPoseSource=Pick<OperatorPose,'weaponConfiguration'|'surrender'|'stride'>;
const equipped=(p:SlingPoseSource)=>
 p.weaponConfiguration?.slots.sling==='sling-two-point'&&!p.surrender;
/** The exact old segment positioning, scale clamp and quaternion rule.
 * Input endpoints are chest-local regardless of held or dropped weapon.
 */
function positionSlingStraps(straps:readonly SlingNode[],
 p:SlingPoseSource,physicalSpeed:number,vertical:THREE.Vector3,
 slingDelta:THREE.Vector3,rear:THREE.Vector3,front:THREE.Vector3,
 middle1:THREE.Vector3,middle2:THREE.Vector3):void{
 const sway=Math.sin(p.stride*Math.PI*2)*Math.min(1,physicalSpeed/80)*.6;
 middle1.set(-2.5,4.5,10.1);
 middle2.set(1.5+sway,-5.8,11.5);
 const points=[rear,middle1,middle2,front];
 for(let i=0;i<straps.length;i++){
  const start=points[i],end=points[i+1];
  const delta=slingDelta.copy(end).sub(start),length=delta.length();
  const mesh=straps[i];
  mesh.position.copy(start).addScaledVector(delta,.5);
  mesh.scale.set(1,Math.max(.1,length),1);
  mesh.quaternion.setFromUnitVectors(vertical,delta.normalize());
 }
}
/** Existing mesh-writing API retained for isolated tests and older callers.
 * Production poseOperator instead uses solveOperatorDirectSlingPose.
 */
export function updateOperatorSlingPose(
 r:Pick<OperatorRig,'slingStraps'|'droppedGun'|'weapon'|'root'|'chest'>,
 p:SlingPoseSource,physicalSpeed:number,
 vertical:THREE.Vector3,slingDelta:THREE.Vector3
):void{
 const on=equipped(p);
 for(const mesh of r.slingStraps)mesh.visible=!!on;
 if(!on)return;
 const gun=r.droppedGun.visible?r.droppedGun:r.weapon;
 const scale=r.weapon.scale.x;
 let rear:THREE.Vector3,front:THREE.Vector3;
 if(r.droppedGun.visible){
  r.root.updateMatrixWorld(true);
  rear=r.chest.worldToLocal(gun.localToWorld(P(-9,-.4,3)));
  front=r.chest.worldToLocal(gun.localToWorld(P(10,-.4,3)));
 }else{
  rear=P(-9*scale,-.4,3).applyEuler(gun.rotation).add(gun.position);
  front=P(10*scale,-.4,3).applyEuler(gun.rotation).add(gun.position);
 }
 positionSlingStraps(r.slingStraps,p,physicalSpeed,vertical,slingDelta,
  rear,front,P(0,0,0),P(0,0,0));
}
/** B5 direct route: no registered scene mesh writes, including for a
 * dropped gun. Build its world matrix from this frame's staged drop values.
 * Chest and legacy-frame world parents are still the live frame authority.
 */
export function solveOperatorDirectSlingPose(r:OperatorRig,p:SlingPoseSource,
 scratch:OperatorPoseScratch,physicalSpeed:number):void{
 const e=scratch.equipmentOutput;
 const straps=e.attachments.slice(6) as EquipmentPoseTransform[];
 const on=equipped(p);
 for(const strap of straps)strap.visible=!!on;
 if(!on)return;
 const held=e.weapons[0],drop=e.weapons[1];
 const rear=e.slingRear,front=e.slingFront;
 if(drop.visible){
  r.root.updateMatrixWorld(true);
  e.dropWorldMatrix.compose(drop.position,drop.quaternion,drop.scale);
  e.dropWorldMatrix.premultiply(r.legacyFrame.matrixWorld);
  rear.set(-9,-.4,3).applyMatrix4(e.dropWorldMatrix);
  front.set(10,-.4,3).applyMatrix4(e.dropWorldMatrix);
  r.chest.worldToLocal(rear);
  r.chest.worldToLocal(front);
 }else{
  rear.set(-9*held.scale.x,-.4,3).applyQuaternion(held.quaternion)
   .add(held.position);
  front.set(10*held.scale.x,-.4,3).applyQuaternion(held.quaternion)
   .add(held.position);
 }
 positionSlingStraps(straps,p,physicalSpeed,scratch.vertical,
  scratch.slingDelta,rear,front,e.slingPoints[0],e.slingPoints[1]);
}
