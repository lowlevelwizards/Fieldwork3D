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
import type {ReplayBookmark} from './breach-replay-chapters.ts';
import type {PersonalGroundBatch} from './breach-replay-personal-ground.ts';
import type {ReplayDoorObservation} from './breach-replay-door-knowledge.ts';

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
  bookmarks?:ReplayBookmark[];
  /** Sparse, authoritative per-operator terrain reveals. Optional for V1. */
  personalGround?:PersonalGroundBatch[];
  /** Per-observer door state transitions, absent in older replays. */
  personalDoors?:ReplayDoorObservation[];
  completeness:{complete:boolean;truncatedAt:number|null;reason:string|null};
};
const allowed=(id:string)=>id.length>0&&id.length<=128&&/^[\w-]+$/.test(id);

/** Optional per-observer evidence is validated without changing V1 archives. */
function validObserverEvidence(frame:ReplayFrame):boolean{
  const fields=[
    frame.knowledge?.operatorVisibleActorIds,
    frame.knowledge?.operatorVisibleCivilianIds,
    frame.knowledge?.operatorVisibleBodyIds,
    frame.knowledge?.operatorDiscoveredBodyIds
  ];
  for(const observed of fields){
    if(observed===undefined)continue; // legitimate old recording
    if(!observed||typeof observed!=='object'||Array.isArray(observed))
      return false;
    const keys=Object.keys(observed);
    if(keys.length>12)return false;
    for(const id of keys){
      const targets=observed[id];
      if(!allowed(id)||!Array.isArray(targets)||targets.length>128||
        targets.some(target=>typeof target!=='string'||!allowed(target)))
        return false;
    }
  }
  return true;
}

/** Strict caps prevent oversized/malformed optional ground journals. */
function validPersonalGround(batches:unknown,maxTime:number):boolean{
  if(batches===undefined)return true;
  if(!Array.isArray(batches)||batches.length>50000)return false;
  let last=-Infinity,total=0;
  for(const raw of batches){
    if(!raw||typeof raw!=='object')return false;
    const b=raw as Partial<PersonalGroundBatch>;
    if(!Number.isFinite(b.at)||b.at!<last||b.at!<0||
      b.at!>maxTime+.15||typeof b.observerId!=='string'||
      !allowed(b.observerId)||!Array.isArray(b.keys)||
      b.keys.length>30000)return false;
    last=b.at!;
    total+=b.keys.length;
    if(total>1000000||b.keys.some(k=>typeof k!=='string'||
      !/^(?:(?:fine|micro):)?-?\d+,-?\d+$/.test(k)))return false;
  }
  return true;
}
function validPersonalDoors(input:unknown,maxTime:number):boolean{
  if(input===undefined)return true;
  if(!Array.isArray(input)||input.length>100000)return false;
  let last=-Infinity;
  for(const raw of input){
    if(!raw||typeof raw!=='object')return false;
    const e=raw as Partial<ReplayDoorObservation>;
    if(!Number.isFinite(e.at)||e.at!<last||e.at!<0||
      e.at!>maxTime+.15||typeof e.observerId!=='string'||
      typeof e.doorId!=='string'||!allowed(e.observerId)||
      !allowed(e.doorId)||!Number.isFinite(e.openFraction)||
      e.openFraction!<-.01||e.openFraction!>1.6||
      typeof e.glassShattered!=='boolean'||
      typeof e.wedged!=='boolean'||typeof e.locked!=='boolean')
      return false;
    last=e.at!;
  }
  return true;
}
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
      !Array.isArray(f.doors)||!validObserverEvidence(f))return false;
    previous=f.t;
  }
  return validPersonalGround(a.personalGround,a.frames.at(-1)!.t)&&
    validPersonalDoors(a.personalDoors,a.frames.at(-1)!.t);
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
    personalGround:rec.personalGround,
    personalDoors:rec.doorKnowledge.observations,
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
  if(data.personalGround)rec.personalGround.push(...data.personalGround);
  if(data.personalDoors)
    rec.doorKnowledge.observations.push(...data.personalDoors);
  Object.assign(rec.completeness,data.completeness);
  return rec;
}
