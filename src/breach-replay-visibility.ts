/** Replay R2: recorded player-visible knowledge, not a reconstructed AI sight check.
 * The authoritative live simulation owns acquisition. Playback only consumes
 * immutable samples. This module is intentionally presentation-only.
 */
import {isSeen,liveVisibility,type Session,type TeamActor} from './breach-game.ts';

export type ReplayKnowledge={
  /** Exactly which actors had player-visible models at capture time. */
  visibleActorIds:string[];
  /** Civilian model visibility at capture time. */
  visibleCivilianIds:string[];
  /** Bodies already discovered by the team, even if now outside the cone. */
  discoveredBodyIds:string[];
};

const playbackKnowledge=new WeakMap<Session,ReplayKnowledge|null>();

export function captureReplayKnowledge(
  s:Session,previouslyDiscovered:ReadonlySet<string>=new Set()
):ReplayKnowledge{
  const visibleActorIds:string[]=[];
  const visibleCivilianIds:string[]=[];
  const discovered=new Set(previouslyDiscovered);
  for(const a of s.operators){
    const visible=a.side==='blue'||(a.health>0?
      isSeen(s,a):liveVisibility(s,a.p));
    if(visible)visibleActorIds.push(a.id);
    if(a.health<=0&&visible)discovered.add(a.id);
  }
  for(const c of s.civilians)
    if(liveVisibility(s,c.p))visibleCivilianIds.push(c.id);
  return {visibleActorIds,visibleCivilianIds,
    discoveredBodyIds:[...discovered]};
}

export function applyReplayKnowledge(s:Session,
  sample:ReplayKnowledge|null|undefined):void{
  playbackKnowledge.set(s,sample??null);
}

export function recordedReplayKnowledge(s:Session):ReplayKnowledge|null{
  return playbackKnowledge.get(s)??null;
}

/** Shared live/replay visibility contract for both Floor Plan and 3D.
 * Old films without evidence retain the previous guarded live fallback.
 */
export function replayActorVisible(
  s:Session,a:TeamActor,omniscient=false):boolean{
  if(omniscient||a.side==='blue')return true;
  const sample=recordedReplayKnowledge(s);
  if(sample)return sample.visibleActorIds.includes(a.id);
  return a.health>0?isSeen(s,a):liveVisibility(s,a.p);
}

export function replayBodyDiscovered(s:Session,id:string):boolean{
  return recordedReplayKnowledge(s)?.discoveredBodyIds.includes(id)??false;
}
