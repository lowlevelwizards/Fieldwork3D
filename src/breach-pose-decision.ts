/** Package B1 — pure, read-only pose-decision assembly.
 *
 * NOT a new rig controller or an animation clock. It composes the existing
 * locomotion, action/handling, authored short-stock, and upper-body policy
 * into ONE typed decision for each visual frame.
 *
 * The two-phase interface deliberately leaves sampleHandlingTransition()
 * as the sole rig-owned mutable history owner, invoked once by poseOperator:
 *   prepare(p, previous presentation state) -> sample(r,p,handling)
 *   -> resolve(p, prepared, sample) -> render existing transforms.
 *
 * No motor/inventory/muzzle/replay/foot-contact writes occur here.
 */
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {resolvePoseLocomotionFrame} from './breach-pose-locomotion-frame.ts';
import {directOperatorPose,planUpperBodyStrategy,
 type PoseDirectorContext,type UpperBodyStrategy} from './breach-pose-director.ts';
import type {Handling} from './breach-weapon-pose.ts';
import {shortStockSourceHandling} from './breach-weapon-pose.ts';
import {blendedHandlingProfile,
 type HandlingTransition} from './breach-handling-transition.ts';
import type {HandlingProfile} from './breach-handling-profiles.ts';
import type {HandlingSample} from './breach-pose-transition-director.ts';

export type PoseDecisionPreparationContext=Omit<PoseDirectorContext,'moving'> & {
 /** Presentation history, never a gameplay-motor pose. */
 readonly previousPose?:Pick<OperatorPose,'x'|'z'>|null;
};

export type PreparedOperatorPoseDecision={
 readonly locomotion:ReturnType<typeof resolvePoseLocomotionFrame>;
 readonly handling:Handling;
 readonly action:ReturnType<typeof directOperatorPose>['action'];
 readonly downProgress:number;
};

export type OperatorPoseDecision={
 readonly locomotion:PreparedOperatorPoseDecision['locomotion'];
 readonly handling:Handling;
 readonly action:PreparedOperatorPoseDecision['action'];
 readonly posture:OperatorPose['posture'];
 readonly down:boolean;readonly surrender:boolean;readonly injury:number;
 readonly aiming:boolean;readonly firing:boolean;readonly aimBlend:number;
 /** Existing action clock is read-only and owns reload progress and hands. */
 readonly shortStock:{
  readonly manual:boolean;
  readonly proximityControlled:boolean;
  readonly rawProgress:number|undefined;
 };
 readonly transition:{
  readonly active:HandlingTransition|undefined;
  readonly authoredLabSwitch:boolean;
 };
 readonly profile:HandlingProfile;
 readonly upperBody:UpperBodyStrategy;
 readonly poseWeight:number;
};

/** Deterministic preparation: the only action + handling policy evaluation.
 * Caller supplies the already-sampled (non-mutating) bash/push facts; this
 * helper does not infer an action from a rig transform.
 */
export function prepareOperatorPoseDecision(
 p:OperatorPose,context:PoseDecisionPreparationContext
):PreparedOperatorPoseDecision{
 const locomotion=resolvePoseLocomotionFrame(p,context.previousPose);
 const choice=directOperatorPose(p,{
  moving:locomotion.moving,downProgress:context.downProgress,
  pushActive:context.pushActive,receivingBash:context.receivingBash,
  previousHandling:context.previousHandling,
  previousHandlingAt:context.previousHandlingAt
 });
 return {locomotion,handling:choice.handling,action:choice.action,
  downProgress:context.downProgress};
}

/** Final single-frame read-only decision. Preserves exactly the original
 * short-stock precedence and upper-body strategy. All transition history
 * mutation happened *before* this call, in the existing rig-owned sampler.
 */
export function resolveOperatorPoseDecision(
 p:OperatorPose,prepared:PreparedOperatorPoseDecision,
 sample:HandlingSample
):OperatorPoseDecision{
 const {handling,action}=prepared;
 const manual=handling==='short'&&!p.unarmedPreview&&!p.down&&
  !p.surrender&&!action.reloadActive&&!action.treatmentActive&&
  !action.throwActive&&!action.doorActive&&
  action.handOwners.left==='weapon'&&action.handOwners.right==='weapon';
 const proximityControlled=handling==='short'&&
  p.shortCompression!==undefined;
 const rawProgress=manual?
  p.shortCompression??(p.handlingOverride==='short'&&
   sample.active?.to==='short'?sample.active.alpha:1):undefined;
 // Proximity/manual progress owns the compression; a second independent
 // timed transition cannot also pull the M4A1 or its outboard firing elbow.
 const active=proximityControlled||manual?undefined:sample.active;
 const authoredLabSwitch=manual?false:sample.authoredLabSwitch;
 const profile=manual?
  blendedHandlingProfile(
   shortStockSourceHandling(p.aimBlend??(p.aiming?1:0),
    prepared.locomotion.moving,p.weapon,!!p.friendlyNear),
   'short',rawProgress!,p.weapon):
  proximityControlled?
   blendedHandlingProfile(
    shortStockSourceHandling(p.aimBlend??(p.aiming?1:0),
     prepared.locomotion.moving,p.weapon,!!p.friendlyNear),
    'short',p.shortCompression!,p.weapon):sample.profile;
 const upperBody=planUpperBodyStrategy(p,{
  handling,physicalSpeed:prepared.locomotion.physicalSpeed,
  hasModularBuild:!!(p.weaponConfiguration?.weapon===p.weapon&&
   p.weaponConfiguration.build),
  activeTransition:!!active,authoredLabSwitch,
  interactionWindow:action.interactionWindow
 });
 return {
  locomotion:prepared.locomotion,handling,action,
  posture:p.posture,down:p.down,surrender:p.surrender,injury:p.injury,
  aiming:p.aiming,firing:p.firing,
  aimBlend:p.aimBlend??(p.aiming?1:0),
  shortStock:{manual,proximityControlled,rawProgress},
  transition:{active,authoredLabSwitch},
  profile,upperBody,
  poseWeight:p.handlingOverride&&!p.down&&!p.surrender?1:0
 };
}
