/** Player-facing Bodycam eligibility for archived replay data.
 * An empty recorded sight array is VALID negative evidence; missing observer
 * evidence (legacy film) is NOT license to re-run line of sight.
 */
import type {ReplayKnowledge} from './breach-replay-visibility.ts';
import type {PersonalGroundBatch} from './breach-replay-personal-ground.ts';

export function bodycamEligibleObserverIds(
  sample:ReplayKnowledge|null|undefined,friendlies:readonly string[]
):string[]{
  const observed=sample?.operatorVisibleActorIds;
  if(!observed)return [];
  return friendlies.filter(id=>
    Object.prototype.hasOwnProperty.call(observed,id));
}
export function bodycamHasPersonalGround(
  batches:readonly PersonalGroundBatch[],observerId:string
):boolean{
  return batches.some(batch=>batch.observerId===observerId&&
    batch.keys.some(key=>key.startsWith('fine:')||
      key.startsWith('micro:')));
}
/** All footage is reconstructed; historical geometry is still a shared
 * mission recording, not proof that each object was personally inspected.
 */
export function bodycamDisclosureLabel(
  observerId:string,mount:'chest'|'helmet',groundEvidence:boolean
):string{
  return 'RECONSTRUCTED BODYCAM · '+
    observerId.toUpperCase()+' · '+mount.toUpperCase()+
    (groundEvidence?
      ' · PERSONAL CONTACTS · SHARED ARCHITECTURE':
      ' · PERSONAL GROUND UNAVAILABLE · SHARED ARCHITECTURE');
}

/** Playback audio is relative to the recorded operator, not a teammate.
 * This is presentation-only: never rewrite simulator hearing or evidence.
 */
import type {Pt} from './breach-core.ts';
export type ReplayAudioObserver={id:string;p:Pt;heading:number};
export function replayAudioListener<T extends ReplayAudioObserver>(
  friendlies:readonly T[],selectedId:string,bodycamId:string|null
):T|null{
  const observer=friendlies.find(a=>a.id===(bodycamId??selectedId));
  if(!observer||!Number.isFinite(observer.p.x)||
    !Number.isFinite(observer.p.y)||!Number.isFinite(observer.heading))
    return null;
  return observer;
}
/** Positive pan is right of the observer's historically recorded facing. */
export function replayBodycamPan(source:Pt,observer:ReplayAudioObserver):number{
  if(!Number.isFinite(source.x)||!Number.isFinite(source.y)||
    !Number.isFinite(observer.heading))return 0;
  const dx=source.x-observer.p.x,dy=source.y-observer.p.y;
  const right=-Math.sin(observer.heading)*dx+
    Math.cos(observer.heading)*dy;
  return Math.max(-1,Math.min(1,right/210));
}
