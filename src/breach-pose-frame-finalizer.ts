/** Post-IK operator pose finalization. The rig owns presentation,
 * never simulation damage or physical actor movement.
 */
import {canonicalRootOrientation} from './operator-axis-convention.ts';
import {updateOperatorPoseCavity} from './operator-pose-cavity-lighting.ts';
import type {OperatorRig,OperatorPose} from './breach-operator-rig.ts';
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
export function finishOperatorPoseFrame(r:OperatorRig,p:OperatorPose):void{
  if(p.unarmedPreview){
    r.weapon.visible=false;r.droppedGun.visible=false;
    r.magazineHand.visible=false;r.magazineInserted.visible=false;
    r.detachedMagazine.visible=false;
    for(const sling of r.slingStraps)sling.visible=false;
  }
  // Shader uniforms follow the existing IK without CPU ray tracing.
  updateOperatorPoseCavity(r.poseCavity,r.arms,r.elbowSpread,
   p.posture,p.stride,p.down,
   Number(r.root.userData.fieldworkCavityQuality??1));
  r.lastPose={...p};r.lastTime=p.seconds;
}
