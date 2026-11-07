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

/** Exactly one pure policy for selecting the upper-body strategy.
 * Search implementations are internal to the unified fitter; this
 * policy preserves live/preview gates, action priority and ballistics.
 * It never reads previous-frame elbow state or mutates a game order.
 */
export type UpperBodyStrategyContext={
 handling:Handling;physicalSpeed:number;hasModularBuild:boolean;
 activeTransition:boolean;authoredLabSwitch:boolean;
 interactionWindow:boolean;
};
export type UpperBodyStrategy={
 previewReloadSeed:boolean;coupledEligible:boolean;
 supportEligible:boolean;coordinatedEligible:boolean;
 envelopeRequired:boolean;
};
export function planUpperBodyStrategy(p:OperatorPose,
 c:UpperBodyStrategyContext):UpperBodyStrategy{
 const previewReloadSeed=p.poseV3Preview===true&&
   p.reload>0&&p.reloadDuration>0;
 const coupledEligible=c.hasModularBuild&&c.handling==='low'&&
   p.posture==='stand'&&c.physicalSpeed<.45&&
   Math.abs(p.turning)<.28&&!p.down&&!p.surrender&&!p.firing&&
   !p.aiming&&(p.aimBlend??0)<.02&&
   (p.reload<=0||previewReloadSeed)&&
   !p.treatmentActive&&(!c.activeTransition||c.authoredLabSwitch)&&
   p.seconds-p.lastDoorAt>1.2&&p.seconds-p.lastThrowAt>.85&&
   (p.hitAge===undefined||p.hitAge<0||p.hitAge>1.1);
 const supportEligible=!!p.poseV3Preview&&c.hasModularBuild&&
   !p.firing&&!p.down&&!p.surrender&&p.reload<=0;
 const coordinatedEligible=!!p.poseV3Preview&&c.hasModularBuild&&
   !p.firing&&!p.down&&!p.surrender&&!p.unarmedPreview&&
   !c.interactionWindow&&(!c.activeTransition||c.authoredLabSwitch);
 return {previewReloadSeed,coupledEligible,supportEligible,
   coordinatedEligible,envelopeRequired:coupledEligible||!!p.poseV3Preview};
}
