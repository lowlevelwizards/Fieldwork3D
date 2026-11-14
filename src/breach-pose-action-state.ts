/** Unified, time-sampled action windows and hand ownership.
 * The gameplay state determines whether an action exists. This reader is
 * presentation-only: it never consumes inventory or changes simulation.
 * One call per pose evaluation, shared by legacy/V3/V4 rig branches.
 */
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {resolvePoseContactOwners,woundedHandGuard} from './breach-pose-contacts.ts';
import {doorGripWeight} from './breach-pose-door-hand.ts';
import {physicalContactWeight,resolvePhysicalContactPose}
 from './breach-physical-contact-anchor.ts';

export type PoseActionSource=Pick<OperatorPose,
 'seconds'|'lastThrowAt'|'lastDoorAt'|'doorPoint'|'doorMethod'|'doorGrip'|'physicalContact'|
 'reload'|'reloadDuration'|'reloadMode'|'weapon'|'treatmentActive'|
 'down'|'surrender'|'injury'|'hitRegion'|'aiming'|'firing'|'hitAge'|
 'lockpickActive'>;
export function resolveOperatorActionState(
 p:PoseActionSource,downProgress:number,pushActive:boolean
){
 const treatmentActive=!!p.treatmentActive&&!p.down&&!p.surrender;
 const reloadActive=p.reload>0&&p.reloadDuration>0;
 const reloadProgress=reloadActive?
   Math.max(0,Math.min(1,1-p.reload/p.reloadDuration)):0;
 const reloadMode=p.reloadMode??(p.weapon==='shotgun'?'shells':'emergency');
 const throwAge=p.seconds-p.lastThrowAt;
 const throwActive=throwAge>=0&&throwAge<.70;
 const doorAge=p.seconds-p.lastDoorAt;
 const anchorWeight=p.physicalContact?.intent==='door'||
   p.physicalContact?.intent==='tool'?
   physicalContactWeight(p.physicalContact,p.seconds):0;
 const gripWeight=anchorWeight>0?anchorWeight:
   doorGripWeight(p.doorGrip,p.seconds);
 const doorActive=gripWeight>0||
   (doorAge>=0&&doorAge<1.12&&!!p.doorPoint&&
   p.doorMethod!=='kick')||!!p.lockpickActive&&!!p.doorPoint;
 const woundedGuard=woundedHandGuard({down:p.down,injury:p.injury,
  hitRegion:p.hitRegion,aiming:p.aiming,firing:p.firing,
  hitAge:p.hitAge});
 const originalOwners=resolvePoseContactOwners({
   surrender:p.surrender,down:p.down,downProgress,
   treatmentActive,reloadActive,reloadProgress,reloadMode,
   throwActive,pushActive,woundedGuard,doorActive
 });
 const physicalContact=resolvePhysicalContactPose(
   p.physicalContact,originalOwners,p.seconds);
 // Existing authored/medical/weapon actions outrank new surface contacts.
 // Only a valid, action-free support contact can borrow the support hand.
 const handOwners=physicalContact&&originalOwners.action==='hold'&&
   physicalContact.contact.limb==='support-hand'?
   {...originalOwners,left:physicalContact.contact.intent==='brace'?
     'brace' as const:'teammate' as const}:originalOwners;
 return {treatmentActive,reloadActive,reloadProgress,reloadMode,
   throwAge,throwActive,doorAge,doorActive,gripWeight,woundedGuard,
   handOwners,physicalContact,
   // Surface/teammate contacts are future A3.6/A3.7 actions. No new
   // action or world contact can be inferred from presentation alone.
   interactionWindow:!!p.treatmentActive||throwActive||doorActive||
     !!physicalContact};
}
