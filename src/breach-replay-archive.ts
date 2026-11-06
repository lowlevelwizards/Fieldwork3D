/** Replay R3: a complete, versioned, locally restorable playback film.
 * Not a playable mission checkpoint and not a small after-action JSON report.
 * IndexedDB's structured clone preserves internal Map/Set and frame sharing.
 */
import {MissionRecorder,type ReplayFrame} from './breach-replay.ts';
import type {ReplayManifest} from './breach-replay-manifest.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {ExecutionEvent} from './breach-execution-events.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import type {ReplayPlanRevision} from './breach-replay-plans.ts';
import type {ReplayMotionArchiveV1} from './breach-replay-motion.ts';

export type ReplayArchiveV1={
  format:'fieldwork-breach-replay';
  schemaVersion:1;
  id:string;createdAt:number;
  manifest:ReplayManifest;
  frames:ReplayFrame[];
  battleEvents:BattleEvent[];
  executionEvents:ExecutionEvent[];
  shots:RecordedShot[];
  planRevisions:ReplayPlanRevision[];
  motion:ReplayMotionArchiveV1;
  completeness:{complete:boolean;truncatedAt:number|null;reason:string|null};
};
const allowed=(id:string)=>id.length>0&&id.length<=128&&/^[\w-]+$/.test(id);
export function replayArchiveIsValid(input:unknown):input is ReplayArchiveV1{
  if(!input||typeof input!=='object')return false;
  const a=input as Partial<ReplayArchiveV1>;
  if(a.format!=='fieldwork-breach-replay'||a.schemaVersion!==1||
     typeof a.id!=='string'||!allowed(a.id)||
     !Number.isFinite(a.createdAt)||
     !a.manifest?.site||a.manifest.schemaVersion!==2||
     !Array.isArray(a.frames)||a.frames.length<2||a.frames.length>12000||
     !Array.isArray(a.battleEvents)||
     !Array.isArray(a.executionEvents)||
     !Array.isArray(a.shots)||!Array.isArray(a.planRevisions)||
     !a.motion||a.motion.schemaVersion!==1||
     !Array.isArray(a.motion.actors)||!Array.isArray(a.motion.doors)||
     !a.completeness||typeof a.completeness.complete!=='boolean')
    return false;
  let previous=-Infinity;
  for(const f of a.frames){
    if(!f||!Number.isFinite(f.t)||f.t<previous||!Array.isArray(f.actors)||
      !Array.isArray(f.doors))return false;
    previous=f.t;
  }
  return true;
}
export function captureReplayArchive(
  rec:MissionRecorder,id:string,createdAt:number
):ReplayArchiveV1{
  if(!allowed(id)||!Number.isFinite(createdAt)||
    !rec.manifest?.site||rec.frames.length<2)
    throw Error('Missing complete replay identity or recording');
  const out:ReplayArchiveV1={
    format:'fieldwork-breach-replay',schemaVersion:1,
    id,createdAt,
    manifest:rec.manifest,
    frames:rec.frames,
    battleEvents:rec.events,
    executionEvents:rec.executionEvents,
    shots:rec.ballistics.shots,
    planRevisions:rec.plans.revisions,
    motion:rec.motion.toArchive(),
    completeness:{...rec.completeness}
  };
  // One clone retains structural sharing in frequent world samples.
  return structuredClone(out);
}
export function restoreReplayArchive(input:unknown):MissionRecorder{
  if(!replayArchiveIsValid(input))throw Error('Unsupported or corrupt replay');
  const data=structuredClone(input);
  const rec=new MissionRecorder();
  rec.manifest=data.manifest;
  rec.frames.push(...data.frames);
  rec.events.push(...data.battleEvents);
  rec.executionEvents.push(...data.executionEvents);
  rec.ballistics.shots.push(...data.shots);
  rec.plans.revisions.push(...data.planRevisions);
  rec.motion.loadArchive(data.motion);
  Object.assign(rec.completeness,data.completeness);
  return rec;
}
