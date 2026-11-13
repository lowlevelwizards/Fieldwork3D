/** Unified, time-sampled action windows and hand ownership.
 * The gameplay state determines whether an action exists. This reader is
 * presentation-only: it never consumes inventory or changes simulation.
 * One call per pose evaluation, shared by legacy/V3/V4 rig branches.
 */
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {resolvePoseContactOwners} from './breach-pose-contacts.ts';
import {doorGripWeight} from './breach-pose-door-hand.ts';

export type PoseActionSource=Pick<OperatorPose,
 'seconds'|'lastThrowAt'|'lastDoorAt'|'doorPoint'|'doorMethod'|
 'doorHandHold'|'doorHandHoldSince'|'doorGrip'|
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
 const gripWeight=doorGripWeight(p.doorGrip,p.seconds);
 const doorActive=gripWeight>0||!!p.doorPoint&&(
   (doorAge>=0&&doorAge<1.12&&p.doorMethod!=='kick')||
   !!p.lockpickActive||!!p.doorHandHold);
 const woundedGuard=!p.down&&p.injury>0&&p.hitRegion!=='leg'&&
   !p.aiming&&!p.firing&&p.hitAge!==undefined&&
   p.hitAge>=0&&p.hitAge<1.1;
 const handOwners=resolvePoseContactOwners({
   surrender:p.surrender,down:p.down,downProgress,
   treatmentActive,reloadActive,reloadProgress,reloadMode,
   throwActive,pushActive,woundedGuard,doorActive
 });
 return {treatmentActive,reloadActive,reloadProgress,reloadMode,
   throwAge,throwActive,doorAge,doorActive,gripWeight,woundedGuard,handOwners,
   // This is an audition exclusion, not a second hand-owner authority.
   interactionWindow:!!p.treatmentActive||throwActive||doorActive};
}
