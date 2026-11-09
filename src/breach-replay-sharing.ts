/** P7.3 — Lossless replay structural sharing at periodic full keyframes.
 *
 * Each public ReplayFrame remains a COMPLETE random-access frame, so review,
 * seek, motion interpolation and combat debrief need no decoder. Unchanged
 * actor records and effect/intel arrays reuse immutable previous snapshots
 * between keyframes; every 40th sample is an independent full keyframe.
 *
 * This is an incremental, deliberately reversible compression stage. No
 * lossy quantization, change to 20Hz capture, or simulation re-execution.
 */
import type {ReplayFrame,ReplayActorFrame} from './breach-replay.ts';

export const REPLAY_FULL_KEYFRAME_INTERVAL=40;

function sameValue(a:unknown,b:unknown):boolean{
  if(Object.is(a,b))return true;
  if(a===null||b===null||
     typeof a!=='object'||typeof b!=='object')return false;
  if(Array.isArray(a)||Array.isArray(b)){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
    for(let i=0;i<a.length;i++)
      if(!sameValue(a[i],b[i]))return false;
    return true;
  }
  // Only compare JSON-like plain snapshot values, never mutable Maps,
  // Sets, class instances, or typed buffers.
  if(Object.getPrototypeOf(a)!==Object.prototype||
     Object.getPrototypeOf(b)!==Object.prototype)return false;
  const aa=a as Record<string,unknown>,bb=b as Record<string,unknown>;
  let count=0;
  for(const key in aa){
    if(!Object.prototype.hasOwnProperty.call(aa,key))continue;
    if(!Object.prototype.hasOwnProperty.call(bb,key)||
       !sameValue(aa[key],bb[key]))return false;
    count++;
  }
  let otherCount=0;
  for(const key in bb)
    if(Object.prototype.hasOwnProperty.call(bb,key))otherCount++;
  return count===otherCount;
}

const shareableFields=[
  'doors','shots','casings','dropped','impactMarks','grenades',
  'flashBursts','intel','known','rescue','objective','knowledge'
] as const satisfies readonly (keyof ReplayFrame)[];

/** Actor state changes every step, but loadout, route and treatment facts
 * often remain identical for minutes. Share those immutable subtrees too;
 * otherwise every moving pose retains redundant deep copies in the film. */
const shareableActorFields=[
  'plan','spareMagazines','medical','medicalSupplies',
  'weaponConfiguration','skills','aimInstruction',
  'watch','defense','traversal'
] as const satisfies readonly (keyof ReplayActorFrame)[];

export type ReplaySharingStats={
  sharedActors:number;sharedFields:number;fullKeyframes:number;
};
export function shareUnchangedReplayFrame(
  prior:ReplayFrame|undefined,
  frame:ReplayFrame,
  frameIndex:number,
  stats?:ReplaySharingStats
):ReplayFrame{
  if(!prior||frameIndex%REPLAY_FULL_KEYFRAME_INTERVAL===0){
    if(stats)stats.fullKeyframes++;
    return frame;
  }
  for(let i=0;i<frame.actors.length;i++){
    const older=prior.actors[i],current=frame.actors[i];
    if(older?.id!==current.id)continue;
    // Compare values rather than live object identity: a route or kit can be
    // edited in place, and no previous frame may observe that future change.
    for(const key of shareableActorFields){
      if(sameValue(older[key],current[key])){
        (current as unknown as Record<string,unknown>)[key]=older[key];
        if(stats)stats.sharedFields++;
      }
    }
    if(sameValue(older,current)){
      frame.actors[i]=older;
      if(stats)stats.sharedActors++;
    }
  }
  for(const key of shareableFields){
    if(sameValue(prior[key],frame[key])){
      // The snapshots are internal immutable film data. Each frame still
      // presents all fields, and playback builds its own mutable state.
      (frame as unknown as Record<string,unknown>)[key]=prior[key];
      if(stats)stats.sharedFields++;
    }
  }
  return frame;
}
