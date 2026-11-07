/** Unified, observational pose intent director.
 * The motor and inventory remain authoritative. This resolver only selects
 * presentation handling and delegates time-sampled hand ownership; it does
 * not advance transitions, move limbs, or write weapon/muzzle transforms.
 */
import type {OperatorPose} from './breach-operator-rig.ts';
import {resolveOperatorActionState} from './breach-pose-action-state.ts';
import {handlingPose,type Handling} from './breach-weapon-pose.ts';

export type PoseDirectorContext={
  /** 0-1 tactical movement fraction, derived from motor velocity. */
  moving:number;
  /** Down/surrender progress, sampled from authoritative action state. */
  downProgress:number;
  /** Current melee push contributes to hand ownership only. */
  pushActive:boolean;
  /** Receiving a bash demands a compressed weapon position. */
  receivingBash:boolean;
  /** Explicit passive-history inputs, ignored in deterministic replay. */
  previousHandling?:Handling;
  previousHandlingAt:number;
};
export function directOperatorPose(p:OperatorPose,context:PoseDirectorContext){
  const action=resolveOperatorActionState(
    p,context.downProgress,context.pushActive);
  // Treatment has legacy priority over manual Lab handling overrides.
  // Active combat and obstruction still take the exact same selection path
  // as shot-time weapon handling, with no additional visual yaw authority.
  const handling:Handling=p.treatmentActive?'low':
    p.handlingOverride??handlingPose({
      aim:p.aimBlend??(p.aiming?1:0),
      moving:context.moving,
      obstruction:!!p.obstruction||context.receivingBash,
      friendlyNear:!!p.friendlyNear,
      intent:p.handlingIntent,threatRange:p.threatRange,
      weapon:p.weapon,
      previous:p.deterministic?undefined:context.previousHandling,
      heldFor:p.seconds-context.previousHandlingAt
    });
  return {handling,action};
}
