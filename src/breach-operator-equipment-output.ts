/** B5: presentation-only direct firearm/attachment transform handoff.
 * Legacy rig nodes remain readable for morphology and world parent spaces,
 * but their registered transforms are not mutated until the B2 final commit.
 * Existing V3/V4/Workbench fitting, the gameplay muzzle and inventory do
 * not consume this module.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {
 OperatorPoseScratch,EquipmentPoseTransform,EquipmentPoseOutputSlot,
 OperatorEquipmentPoseScratch
} from './breach-operator-pose-scratch.ts';

export function beginOperatorEquipmentPose(r:OperatorRig,
 scratch:OperatorPoseScratch):OperatorEquipmentPoseScratch{
 const e=scratch.equipmentOutput;
 if(e.initialized)return e;
 const weapons=[r.weapon,r.droppedGun];
 const attachments=[r.magazineInserted,r.magazineHand,r.detachedMagazine,
  r.reloadControlMesh,r.medicalItem,r.pack,...r.slingStraps];
 if(attachments.length!==e.attachments.length)
  throw new Error('B5 equipment registry no longer matches B2 slots');
 for(let i=0;i<weapons.length;i++)copyFromNode(e.weapons[i],weapons[i]);
 for(let i=0;i<attachments.length;i++)
  copyFromNode(e.attachments[i],attachments[i]);
 e.weaponEuler.copy(r.weapon.rotation);
 e.packEuler.copy(r.pack.rotation);
 e.magHandEuler.copy(r.magazineHand.rotation);
 e.detachedEuler.copy(r.detachedMagazine.rotation);
 e.initialized=true;
 return e;
}
function copyFromNode(out:EquipmentPoseTransform,node:THREE.Object3D){
 out.position.copy(node.position);
 out.quaternion.copy(node.quaternion);
 out.scale.copy(node.scale);
 out.visible=node.visible;
}
function writeValues(transforms:readonly EquipmentPoseTransform[],
 outputs:readonly EquipmentPoseOutputSlot[]){
 if(transforms.length!==outputs.length)
  throw new Error('Incomplete B5 pose-output owner');
 for(let i=0;i<outputs.length;i++){
  const t=transforms[i],v=outputs[i].values;
  v[0]=t.position.x;v[1]=t.position.y;v[2]=t.position.z;
  v[3]=t.quaternion.x;v[4]=t.quaternion.y;
  v[5]=t.quaternion.z;v[6]=t.quaternion.w;
  v[7]=t.scale.x;v[8]=t.scale.y;v[9]=t.scale.z;
  v[10]=t.visible?1:0;
 }
}
export function finishOperatorEquipmentPose(scratch:OperatorPoseScratch){
 const e=scratch.equipmentOutput;
 if(!e.initialized)throw new Error('B5 equipment pose not initialized');
 writeValues(e.weapons,e.weaponOutputs);
 writeValues(e.attachments,e.attachmentOutputs);
 return e;
}
/** Existing drop logic, evaluated against the proposed *same-frame* held
 * weapon instead of last frame's scene child. We retain Three.js's own
 * parent world matrix and quaternion operations, not a new weapon physics
 * solver, so the old chest/legacy coordinate conventions remain exact.
 */
export function solveOperatorDroppedWeapon(r:OperatorRig,p:OperatorPose,
 scratch:OperatorPoseScratch,downProgress:number,
 smooth:(value:number)=>number):void{
 const e=scratch.equipmentOutput,held=e.weapons[0],drop=e.weapons[1];
 if(!drop.visible)return;
 r.root.updateMatrixWorld(true);
 const worldHeld=scratch.held.copy(held.position)
  .applyMatrix4(r.chest.matrixWorld);
 const orientation=r.chest.getWorldQuaternion(scratch.orientation)
  .multiply(held.quaternion);
 const origin=r.root.getWorldPosition(scratch.origin);
 const side=p.downPose==='left'?-1:1;
 const sling=p.weaponConfiguration?.slots.sling==='sling-two-point'&&
  !p.surrender;
 const rest=e.dropRest.set(origin.x+(sling?4:9),sling?6:1.8,
  origin.z+side*(sling?5:11));
 const t=smooth((downProgress-.30)/.70);
 const location=worldHeld.lerp(rest,t);
 drop.position.copy(r.legacyFrame.worldToLocal(location));
 const flat=scratch.flat.setFromAxisAngle(scratch.vertical,
  -p.heading+side*.18);
 orientation.slerp(flat,t);
 const inverse=r.legacyFrame.getWorldQuaternion(scratch.inverse).invert();
 drop.quaternion.copy(inverse.multiply(orientation));
}
