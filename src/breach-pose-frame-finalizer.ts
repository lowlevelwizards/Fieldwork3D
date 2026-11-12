/** Post-IK operator pose finalization. The rig owns presentation,
 * never simulation damage or physical actor movement.
 */
import type * as THREE from 'three';
import {canonicalRootOrientation} from './operator-axis-convention.ts';
import {updateOperatorPoseCavity} from './operator-pose-cavity-lighting.ts';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {OperatorEquipmentPoseScratch} from './breach-operator-pose-scratch.ts';
import {EQUIPMENT_ATTACHMENT_INDEX as EAI} from './breach-operator-pose-scratch.ts';
export function applyOperatorTraumaPose(r:OperatorRig,p:OperatorPose,
 downProgress:number):void{
  // The pose system is the final writer for actor tilts and reactions.
  // The scene controls XY world placement only, not anatomy or weapon pose.
  if(p.flashActive&&!p.down){
    r.legacyRoll+=.10*Math.sin(p.seconds*24);
    r.root.quaternion.copy(
      canonicalRootOrientation(r.legacyPitch,r.legacyYaw,r.legacyRoll));
  }
  if(p.surrender)r.chest.rotation.x=.15;
  else if(p.down){
    // Spine and neck settle independently; the fall isn't a single
    // rigid mannequin tipping around the operator origin.
    r.chest.rotation.x=-.18*Math.sin(Math.PI*downProgress)-.05;
    r.head.rotation.z=.13*Math.sin(Math.PI*downProgress);
  }
  // Wounds do not leave an incapacitated actor standing in the old
  // locomotion/ready pose. Final angles are deterministic from the hit.
  if(p.down){
    r.chest.rotation.y=0;
    r.head.rotation.x=0;
  }
}
export function finishOperatorPoseFrame(r:OperatorRig,p:OperatorPose,
 leftUpper?:THREE.Quaternion,rightUpper?:THREE.Quaternion,
 equipment?:OperatorEquipmentPoseScratch):void{
  if(p.unarmedPreview){
    if(equipment){
      // B5: suppress all owned visuals in the same direct stage transaction;
      // no old weapon/magazine/strap scene node may leak a stale frame.
      equipment.weapons[0].visible=false;
      equipment.weapons[1].visible=false;
      for(const i of [EAI.inserted,EAI.hand,EAI.detached,
        EAI.sling0,EAI.sling1,EAI.sling2])
       equipment.attachments[i].visible=false;
    }else{
      // Compatibility path for stand-alone legacy finalizer callers.
      r.weapon.visible=false;r.droppedGun.visible=false;
      r.magazineHand.visible=false;r.magazineInserted.visible=false;
      r.detachedMagazine.visible=false;
      for(const sling of r.slingStraps)sling.visible=false;
    }
  }
  // Shader uniforms follow the existing IK without CPU ray tracing.
  updateOperatorPoseCavity(r.poseCavity,r.arms,r.elbowSpread,
   p.posture,p.stride,p.down,
   Number(r.root.userData.fieldworkCavityQuality??1),
   leftUpper,rightUpper);
  r.lastPose={...p};r.lastTime=p.seconds;
}
