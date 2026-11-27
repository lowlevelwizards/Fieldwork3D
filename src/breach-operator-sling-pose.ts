/** WR3: flat, reusable sling spans. Mesh hardware and cloth share the same
 * measured artwork seats. This is presentation only, not weapon custody. */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {OperatorPoseScratch} from './breach-operator-pose-scratch.ts';
import {readSlingKind,type SlingKind} from './breach-weapon-retention.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
import type {WeaponRetentionSockets} from './weapons/geometry/weapon-retention-sockets.ts';
type SlingNode=Pick<THREE.Object3D,'visible'|'position'|'scale'|'quaternion'>;
type SlingPoseSource=Pick<OperatorPose,'weaponConfiguration'|'surrender'|'stride'|'worldWeaponReleased'>;
const P=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const kind=(p:SlingPoseSource)=>p.surrender||p.worldWeaponReleased?'none':readSlingKind(p.weaponConfiguration?.slots.sling);
const fallback:WeaponRetentionSockets={rear:{x:-9,y:-.4,z:2.15},front:{x:10,y:-.4,z:2.15},single:{x:-5,y:1,z:2.15},supported:['single','two']};
function positionSpans(straps:readonly SlingNode[],p:SlingPoseSource,
 mode:SlingKind,physicalSpeed:number,vertical:THREE.Vector3,delta:THREE.Vector3,
 rear:THREE.Vector3,front:THREE.Vector3,mid1:THREE.Vector3,mid2:THREE.Vector3,retention?:RetentionPoseMode){
 const sway=Math.sin(p.stride*Math.PI*2)*Math.min(1,Math.max(0,physicalSpeed)/80)*.4;
 // Chest +X forward, +Z right. Two spans rise from the gun to opposite
 // shoulder/side regions and a broad shoulder bridge joins them.
 if(mode==='single'){
  mid1.set(1.8,6.6,-5.8);mid2.set(-1.4,5.9,5.8);
 }else{
  mid1.set(.8,6.6,-5.8);
  if(retention==='back-slung')mid2.set(-6.6,-4.5,7.6+sway);
  else if(retention==='side-slung')mid2.set(1.0,-4.5,9.6+sway);
  else mid2.set(4.8,-4.5,7.6+sway);
 }
 for(let i=0;i<straps.length;i++){
  const start=i===0?rear:i===1?mid1:mid2;
  const end=i===0?mid1:i===1?mid2:front;
  const length=delta.copy(end).sub(start).length();
  const mesh=straps[i];
  mesh.visible=length>.001;
  mesh.position.copy(start).addScaledVector(delta,.5);
  mesh.scale.set(1,Math.max(.1,length),1);
  mesh.quaternion.setFromUnitVectors(vertical,delta.normalize());
 }
}
function seatsFor(mode:SlingKind,sockets:WeaponRetentionSockets|null|undefined){
 const s=sockets??fallback;
 return mode==='single'?[s.single,s.single] as const:
  s.front?[s.rear,s.front] as const:null;
}
function writePoint(out:THREE.Vector3,p:{x:number;y:number;z:number}){
 return out.set(p.x,p.y,p.z+.15);
}
export function updateOperatorSlingPose(
 r:Pick<OperatorRig,'slingStraps'|'droppedGun'|'weapon'|'root'|'chest'>&
 Partial<Pick<OperatorRig,'weaponBody'|'droppedWeaponBody'>>,
 p:SlingPoseSource,physicalSpeed:number,vertical:THREE.Vector3,delta:THREE.Vector3
):void{
 const mode=kind(p),drop=r.droppedGun.visible;
 const points=seatsFor(mode,(drop?r.droppedWeaponBody:r.weaponBody)?.userData.retentionSockets);
 for(const mesh of r.slingStraps)mesh.visible=false;
 if(mode==='none'||!points||(!drop&&!r.weapon.visible))return;
 const gun=drop?r.droppedGun:r.weapon;
 r.root.updateMatrixWorld(true);
 const rear=r.chest.worldToLocal(gun.localToWorld(writePoint(P(0,0,0),points[0])));
 const front=r.chest.worldToLocal(gun.localToWorld(writePoint(P(0,0,0),points[1])));
 positionSpans(r.slingStraps,p,mode,physicalSpeed,vertical,delta,rear,front,P(0,0,0),P(0,0,0));
}
export function solveOperatorDirectSlingPose(r:OperatorRig,p:SlingPoseSource,
 scratch:OperatorPoseScratch,physicalSpeed:number,retention?:RetentionPoseMode):void{
 const e=scratch.equipmentOutput, straps=e.slingTargets;
 const mode=kind(p),held=e.weapons[0],drop=e.weapons[1];
 for(const strap of straps)strap.visible=false;
 if(mode==='none'||(!held.visible&&!drop.visible))return;
 const points=seatsFor(mode,(drop.visible?r.droppedWeaponBody:r.weaponBody).userData.retentionSockets);
 if(!points)return;
 const rear=writePoint(e.slingRear,points[0]),front=writePoint(e.slingFront,points[1]);
 if(drop.visible){
  r.root.updateMatrixWorld(true);
  e.dropWorldMatrix.compose(drop.position,drop.quaternion,drop.scale)
   .premultiply(r.legacyFrame.matrixWorld);
  r.chest.worldToLocal(rear.applyMatrix4(e.dropWorldMatrix));
  r.chest.worldToLocal(front.applyMatrix4(e.dropWorldMatrix));
 }else{
  rear.multiply(held.scale).applyQuaternion(held.quaternion).add(held.position);
  front.multiply(held.scale).applyQuaternion(held.quaternion).add(held.position);
 }
 positionSpans(straps,p,mode,physicalSpeed,scratch.vertical,scratch.slingDelta,
  rear,front,e.slingPoints[0],e.slingPoints[1],retention);
}
