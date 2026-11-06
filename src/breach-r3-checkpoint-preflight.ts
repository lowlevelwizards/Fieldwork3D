/** Replay R3 checkpoint preflight — deliberately NOT a playable restore.
 * ReplayFrame represents observed history, not the complete live motor.
 * This probe identifies missing authoritative fields before fork support.
 */
import type {Session} from './breach-game.ts';
import type {ReplayFrame} from './breach-replay.ts';

export const CRITICAL_SESSION_FIELDS=[
  'rng','nextId','nextShotId','nextBattleId','nextExecutionId','nextEffectId',
  'nextNoiseId','nextReportId','noise','passageLeases','started','syncCode',
  'captureTarget','captureSecured','intelCarrierId',
  'squadEntryUndo','squadEntryRedo'
] as const;
export const CRITICAL_ACTOR_FIELDS=[
  'awareness','intent','nav','path','activeNode',
  'lastNavRepairAt','routeGoalKey','lastNoiseExaminedAt',
  'contact','heard','waitRemaining','actionTimer','blockedTime',
  'yieldTarget','yieldFor','yieldUntil','firePolicy','focusTargetId',
  'lastFireRepositionAt','encounterActivity','encounterRoutine'
] as const;
export const EXTERNAL_RUNTIME_DEPENDENCIES=[
  'session AI work scheduler (WeakMap)',
  'tactical route cache (WeakMap)',
  'perception pair cache (WeakMap)',
  'activated global wall/cover geometry',
  'complete deterministic input/decision sequencing'
] as const;
export type ReplayForkPreflight={
  resumable:false;
  tick:number;
  missingSessionFields:string[];
  missingActorFields:Record<string,string[]>;
  externalDependencies:readonly string[];
  reason:string;
};
/** A diagnostic only: never use applyReplayFrame to resume simulation. */
export function auditReplayFrameForFork(
  session:Session,frame:ReplayFrame
):ReplayForkPreflight{
  const source=session as unknown as Record<string,unknown>;
  const presented=frame as unknown as Record<string,unknown>;
  const missingSessionFields=CRITICAL_SESSION_FIELDS.filter(k=>
    k in source&&!(k in presented));
  const missingActorFields:Record<string,string[]>={};
  for(const actor of session.operators){
    const recorded=frame.actors.find(a=>a.id===actor.id);
    if(!recorded){
      missingActorFields[actor.id]=['actor missing from recording'];
      continue;
    }
    const a=actor as unknown as Record<string,unknown>;
    const b=recorded as unknown as Record<string,unknown>;
    const absent=CRITICAL_ACTOR_FIELDS.filter(k=>k in a&&!(k in b));
    if(absent.length)missingActorFields[actor.id]=absent;
  }
  return {
    resumable:false,tick:Math.round(frame.t*60),
    missingSessionFields,missingActorFields,
    externalDependencies:EXTERNAL_RUNTIME_DEPENDENCIES,
    reason:'Historical presentation frames lack authoritative motor, AI and RNG state'
  };
}
/** Serialization research only; copying an object is not restoration.
 * No production replay should call this on every tick.
 */
export function captureCheckpointPrototype(session:Session){
  return {schemaVersion:0,simulationTick:Math.round(session.seconds*60),
    safeToResume:false as const,copy:structuredClone(session)};
}
