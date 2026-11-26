/** R6.1: pure, information-bounded requirements for authored interactions.
 * The caller supplies ALL facts. This module never obtains world geometry,
 * observes a hidden actor, authors a node, moves a body or commits an effect.
 * A valid verdict at authoring is not proof of GO-time success.
 */
import type {PlanNode} from './breach-plan.ts';

export type TacticalInteraction=NonNullable<PlanNode['interaction']>;
export type ActionModality='voice'|'person-contact'|'object-contact'|'release';
export type ActionAssessmentPhase='selection'|'authoring'|'go';
export type ActionDenial='actor-unavailable'|'target-unavailable'|
 'ineligible'|'not-observed'|'invalid-range'|'out-of-range'|'obstructed';

/** Exhaustive typed identity registry. Never infer action semantics from the
 * target id prefix or from distance to the selected PlanNode waypoint. */
export const TACTICAL_ACTION_MODALITY:Readonly<Record<TacticalInteraction,ActionModality>>={
 'push':'object-contact',
 'open-window':'object-contact',
 'close-window':'object-contact',
 'break-window':'object-contact',
 'secure-civilian':'person-contact',
 'follow-civilian':'voice',
 'stop-following-civilian':'voice',
 'restrain-civilian':'person-contact',
 'release-civilian':'release',
 'release-capture-target':'release',
 'challenge-suspect':'voice',
 'restrain-suspect':'person-contact',
 'search-suspect':'person-contact',
 'secure-firearm':'object-contact',
 'escort-suspect':'voice',
 'stop-escorting-suspect':'voice',
 'power-on':'object-contact',
 'power-off':'object-contact'
};

export type TacticalActionFacts={
 action:TacticalInteraction;
 phase:ActionAssessmentPhase;
 actorAvailable:boolean;
 targetAvailable:boolean;
 /** Domain state/policy, already checked by the caller (e.g. compliance). */
 domainEligible:boolean;
 /** Live/known knowledge requirement belongs to the caller, not the policy. */
 requireObserved?:boolean;
 observed?:boolean;
 /** Explicit distance and domain limit for any non-release interaction.
  * Deliberately NOT a universal reach constant: authoring and GO may differ.
  */
 distance?:number;
 maximumRange?:number;
 /** Existing Session-scoped world/collision sweep at the caller's radius. */
 unobstructed?:boolean;
};

export type TacticalActionVerdict=Readonly<{
 allowed:boolean;
 modality:ActionModality;
 needsContact:boolean;
 phase:ActionAssessmentPhase;
 denial:ActionDenial|null;
}>;

/** Pure verdict: fail closed on missing clearance or invalid spatial inputs.
 * Evaluation has no clock, random, DOM, Session or physical movement.
 * Failure order is stable for diagnostic and test purposes.
 */
export function assessTacticalAction(facts:TacticalActionFacts):TacticalActionVerdict{
 const modality=TACTICAL_ACTION_MODALITY[facts.action];
 const needsContact=modality==='person-contact'||modality==='object-contact';
 const denied=(denial:ActionDenial):TacticalActionVerdict=>
  ({allowed:false,modality,needsContact,phase:facts.phase,denial});
 if(!facts.actorAvailable)return denied('actor-unavailable');
 if(!facts.targetAvailable)return denied('target-unavailable');
 if(!facts.domainEligible)return denied('ineligible');
 if(facts.requireObserved&&facts.observed!==true)return denied('not-observed');
 if(modality!=='release'){
  const distance=facts.distance,limit=facts.maximumRange;
  if(!Number.isFinite(distance)||!Number.isFinite(limit)||
     distance!<0||limit!<0)
   return denied('invalid-range');
  if(distance!>limit!)return denied('out-of-range');
  if(facts.unobstructed!==true)return denied('obstructed');
 }
 return {allowed:true,modality,needsContact,phase:facts.phase,denial:null};
}
